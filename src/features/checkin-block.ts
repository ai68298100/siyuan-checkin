/* 17.2 T-1234 声明式渲染块：文档内 ```checkin``` 代码块 → 打卡数据视图。
   配置为代码块内的 JSON：
     {"view":"month","itemIds":["id"],"group":"健康","thresholds":[.25,.5,.75,1]}
     {"view":"heatmap","year":2026}
     {"view":"summary","group":"健康"}
     {"view":"combo","parts":[{"view":"summary","group":"健康"},{"view":"month"}]}
   作用域（v17.2 落地范围）：项目 itemIds / 分组 group / 全部活跃项目；
   笔记本/文档维度经由笔记锚点间接可查（内核异步解析），本期不做。
   T-1453 组合卡片：view=combo 编排 1~3 个既有视图（子配置走同一白名单校验、
   禁止嵌套 combo），纯拼装不引入新渲染语义。
   渲染层规则（T-1236 安全边界）：
   - 纯数据驱动：只输出本模块构造的 HTML；用户内容（项目名）一律 escapeHtml；
   - 配置解析失败返回固定可读错误文案，不回显用户原文（防注入）；
   - 跳过日中性色（is-skip）、今日环（is-today）、强度色阶经 thresholds 配置。 */

import {escapeHtml, formatNumber} from "../shared";
import {t} from "../i18n";
import {abstinenceMilestones} from "./pace-projection";
import {dateKey, getEventsForDay, getItemRevisionForDate, getProgress, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "../model";
import {computeEventStreaks, computeLongestStreaks} from "../model";
import type {CheckinItem, CheckinSchedule, CheckinStore} from "../types";

export type CheckinBlockView = "month" | "heatmap" | "summary" | "groups" | "today" | "combo";

export interface CheckinBlockConfig {
    view: CheckinBlockView;
    /** T-1453 组合卡片：1~3 个子视图配置（子视图不可再嵌套 combo）。 */
    parts?: CheckinBlockConfig[];
    itemIds?: string[];
    group?: string;
    /** T-1351：多分组并集作用域（与 group 互斥时 groups 优先级更低）。 */
    groups?: string[];
    /** month 视图目标月（YYYY-MM），缺省 = asOf 所在月。 */
    month?: string;
    /** heatmap 视图目标年，缺省 = asOf 年份。 */
    year?: number;
    /** month/heatmap 单元格色阶阈值（完成比例切分点，升序）。 */
    thresholds?: [number, number, number, number];
    /** T-1351：白名单表达式——只看今日完成率 ≥ minRate（1~100 整数）的行；summary/groups 生效。 */
    minRate?: number;
    /** T-1292：文档维度——只统计锚点块位于该文档的项目（思源文档 id）。 */
    docId?: string;
    /** T-1292：笔记本维度——只统计锚点块位于该笔记本的项目（思源笔记本 id）。 */
    notebook?: string;
}

/** 锚点→文档归属索引：键 = noteAnchor.blockId。由宿主经内核 getBlockInfo 解析并缓存。 */
export type AnchorDocIndex = Map<string, {doc: string; notebook: string}>;

export type CheckinBlockParseResult = {ok: true; config: CheckinBlockConfig} | {ok: false; error: string};

const MAX_BLOCK_ITEMS = 50;
const MAX_BLOCK_GROUPS = 16;
const MAX_BLOCK_PARTS = 3;
const DEFAULT_THRESHOLDS: [number, number, number, number] = [0.25, 0.5, 0.75, 1];

/** 字段级校验（view 已判定）；顶层与组合子配置共用同一白名单语义。 */
function parseBlockConfigFields(source: Record<string, unknown>): CheckinBlockParseResult {
    const view = source.view;
    if (view !== "month" && view !== "heatmap" && view !== "summary" && view !== "groups" && view !== "today") return {ok: false, error: t("block.errorView")};
    const config: CheckinBlockConfig = {view};
    if (Array.isArray(source.itemIds)) {
        const itemIds = source.itemIds.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()).slice(0, MAX_BLOCK_ITEMS);
        if (source.itemIds.length > MAX_BLOCK_ITEMS) return {ok: false, error: t("block.errorItems")};
        if (itemIds.length) config.itemIds = itemIds;
    }
    /* T-1412：today 视图必须显式指定项目（多项目寻址必选，不做隐式全量）。 */
    if (view === "today" && !config.itemIds?.length) return {ok: false, error: t("block.errorItems")};
    if (typeof source.group === "string" && source.group.trim()) config.group = source.group.trim().slice(0, 32);
    /* T-1351：多分组并集；超量与非法输入 fail-closed，不静默放大范围。 */
    if (Array.isArray(source.groups)) {
        const groups = source.groups.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim().slice(0, 32));
        if (source.groups.length > MAX_BLOCK_GROUPS) return {ok: false, error: t("block.errorGroups")};
        const unique = [...new Set(groups)];
        if (unique.length) config.groups = unique;
    }
    /* T-1351：白名单表达式 minRate（1~100 整数）；越界或非法输入忽略，不猜测语义。 */
    const minRate = Number(source.minRate);
    if (Number.isFinite(minRate) && minRate >= 1 && minRate <= 100) config.minRate = Math.floor(minRate);
    if (typeof source.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(source.month)) config.month = source.month;
    const year = Number(source.year);
    if (Number.isFinite(year) && year >= 1970 && year <= 9999) config.year = Math.floor(year);
    if (Array.isArray(source.thresholds) && source.thresholds.length === 4 && source.thresholds.every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0 && entry <= 1)) {
        const thresholds = source.thresholds as [number, number, number, number];
        if (thresholds[0] < thresholds[1] && thresholds[1] < thresholds[2] && thresholds[2] < thresholds[3]) config.thresholds = thresholds;
    }
    if (!config.thresholds) config.thresholds = [...DEFAULT_THRESHOLDS] as [number, number, number, number];
    const docId = typeof source.docId === "string" ? source.docId.trim() : "";
    const notebook = typeof source.notebook === "string" ? source.notebook.trim() : "";
    if (docId) {
        if (!/^[0-9A-Za-z-]{8,64}$/.test(docId)) return {ok: false, error: t("block.errorConfig")};
        config.docId = docId;
    }
    if (notebook) {
        if (!/^[0-9A-Za-z-]{8,64}$/.test(notebook)) return {ok: false, error: t("block.errorConfig")};
        config.notebook = notebook;
    }
    return {ok: true, config};
}

export function parseCheckinBlockConfig(text: string): CheckinBlockParseResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return {ok: false, error: t("block.errorConfig")};
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {ok: false, error: t("block.errorConfig")};
    const source = parsed as Record<string, unknown>;
    /* T-1453 组合卡片：view=combo 编排 1~3 个既有视图；子配置走同一字段校验、禁止嵌套。 */
    if (source.view === "combo") {
        if (!Array.isArray(source.parts) || source.parts.length < 1 || source.parts.length > MAX_BLOCK_PARTS) return {ok: false, error: t("block.errorParts")};
        const parts: CheckinBlockConfig[] = [];
        for (const entry of source.parts) {
            if (!entry || typeof entry !== "object" || Array.isArray(entry) || (entry as Record<string, unknown>).view === "combo") return {ok: false, error: t("block.errorParts")};
            const part = parseBlockConfigFields(entry as Record<string, unknown>);
            if (!part.ok) return part;
            parts.push(part.config);
        }
        return {ok: true, config: {view: "combo", parts}};
    }
    return parseBlockConfigFields(source);
}

/* 作用域解析优先级：itemIds > group > groups（多分组并集） > docId/notebook（锚点索引） > 全部活跃项目。 */
export function resolveBlockItems(store: CheckinStore, config: CheckinBlockConfig, anchorIndex?: AnchorDocIndex): CheckinItem[] {
    const active = store.items.filter((item) => !item.archived);
    if (config.itemIds) {
        const ids = new Set(config.itemIds);
        return active.filter((item) => ids.has(item.id));
    }
    if (config.group) return active.filter((item) => (item.group || "") === config.group);
    if (config.groups?.length) {
        const groups = new Set(config.groups);
        return active.filter((item) => groups.has(item.group || ""));
    }
    if (config.docId || config.notebook) {
        if (!anchorIndex) return [];
        return active.filter((item) => {
            const blockId = item.noteAnchor?.blockId;
            if (!blockId) return false;
            const location = anchorIndex.get(blockId);
            if (!location) return false;
            if (config.docId && location.doc !== config.docId) return false;
            if (config.notebook && location.notebook !== config.notebook) return false;
            return true;
        });
    }
    return active;
}

export interface CheckinBlockDayCell {
    date: string;
    dayOfMonth: number;
    scheduledCount: number;
    completedCount: number;
    /** 完成比例 [0,1]；无计划日为 0。 */
    fraction: number;
    /** 仅跳过（有跳过且无完成）→ 中性格。 */
    skipOnly: boolean;
    /** 当日未完成的项目名列表（供 tooltip 展示）。 */
    incompleteNames: string[];
    isToday: boolean;
    future: boolean;
    /** R-17.2：当日存在至少一个数值项目完成量超过目标（超额日，正向表达）。 */
    overage: boolean;
}

/** month 视图：按选中项目聚合的逐日状态（跳过日中性、完成比例驱动色阶）。 */
export function buildMonthCells(store: CheckinStore, items: CheckinItem[], year: number, monthIndex: number, asOf: Date): CheckinBlockDayCell[] {
    const today = dateKey(asOf);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const cells: CheckinBlockDayCell[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, monthIndex, day);
        const key = dateKey(date);
        let scheduledCount = 0;
        let completedCount = 0;
        let skipCount = 0;
        let overage = false;
        for (const item of items) {
            if (!isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) continue;
            scheduledCount += 1;
            if (isComplete(store, item, date)) completedCount += 1;
            else if (getSkipDatesForItem(store, item.id).has(key)) skipCount += 1;
            /* R-17.2：超额日——数值项目当日总量超过目标（正向表达，不改色阶口径）。 */
            if (!overage && item.direction !== "atMost" && revisionKindNumeric(item, date)) {
                const revision = getItemRevisionForDate(item, date);
                let dayTotal = 0;
                for (const event of getEventsForDay(store, item.id, date)) {
                    if (isSkipEvent(event)) continue;
                    dayTotal += event.value;
                }
                if (revision.target > 0 && dayTotal > revision.target) overage = true;
            }
        }
        const incompleteNames = items
            .filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date) && !isComplete(store, item, date))
            .map((item) => item.name);
        cells.push({
            date: key,
            dayOfMonth: day,
            scheduledCount,
            completedCount,
            fraction: scheduledCount ? completedCount / scheduledCount : 0,
            skipOnly: scheduledCount > 0 && completedCount === 0 && skipCount > 0,
            incompleteNames,
            isToday: key === today,
            future: key > today,
            overage,
        });
    }
    return cells;
}

/** R-17.2：数值/时长项目才有「超额」概念（二值 0/1、quota 天数模式不适用）。 */
function revisionKindNumeric(item: CheckinItem, date: Date): boolean {
    const kind = getItemRevisionForDate(item, date).kind;
    return kind === "count" || kind === "duration";
}

function levelFor(fraction: number, thresholds: [number, number, number, number]): number {
    if (fraction >= thresholds[3]) return 4;
    if (fraction >= thresholds[2]) return 3;
    if (fraction >= thresholds[1]) return 2;
    if (fraction > 0) return fraction >= thresholds[0] ? 2 : 1;
    return 0;
}

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

/** T-1453 组合卡片：把既有视图按白名单子配置纵向编排——纯拼装，不引入新渲染语义；
    子视图各自的交互（日期跳转/锚点行/打卡按钮）由块渲染器的统一点击通道承接。 */
export function buildComboViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const parts = config.parts || [];
    const sections = parts.map((part) => {
        const html = part.view === "month" ? buildMonthViewHtml(store, part, asOf, anchorIndex)
            : part.view === "heatmap" ? buildHeatmapViewHtml(store, part, asOf, anchorIndex)
            : part.view === "summary" ? buildSummaryViewHtml(store, part, asOf, anchorIndex)
            : part.view === "groups" ? buildGroupsViewHtml(store, part, asOf, anchorIndex)
            : buildTodayViewHtml(store, part, asOf);
        return `<section class="lc-checkin__renderblock-part" data-part-view="${part.view}">${html}</section>`;
    });
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-combo">${sections.join("")}</div>`;
}

export function buildMonthViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const items = resolveBlockItems(store, config, anchorIndex);
    if (!items.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const now = asOf;
    const year = config.month ? Number(config.month.slice(0, 4)) : now.getFullYear();
    const monthIndex = config.month ? Number(config.month.slice(5, 7)) - 1 : now.getMonth();
    const thresholds = config.thresholds || DEFAULT_THRESHOLDS;
    const cells = buildMonthCells(store, items, year, monthIndex, asOf);
    const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
    const today = dateKey(now);
    const headers = weekdayOrder.map((index) => `<span class="lc-checkin__renderblock-wd">${escapeHtml(t(`date.wd${index}`))}</span>`).join("");
    const body: string[] = Array.from({length: leading}, () => `<span class="lc-checkin__renderblock-cell is-empty"><i></i></span>`);
    for (const cell of cells) {
        const level = levelFor(cell.fraction, thresholds);
        const classes = ["lc-checkin__renderblock-cell", cell.skipOnly ? "is-skip" : `is-level-${level}`, cell.isToday ? "is-today" : "", cell.future ? "is-future" : "", cell.overage ? "is-overage" : ""].filter(Boolean).join(" ");
        const stateText = cell.skipOnly
            ? ` · ${t("anchor.stateSkip")}`
            : cell.scheduledCount
                ? ` · ${cell.completedCount}/${cell.scheduledCount}${cell.overage ? ` · ${t("block.overageTag")}` : ""}${cell.incompleteNames.length ? `（缺：${cell.incompleteNames.join("、")}）` : ""}`
                : "";
        body.push(`<span class="${classes}" role="button" tabindex="0" data-jump-date="${cell.date}" aria-label="${escapeHtml(`${cell.date}${stateText}`)}" title="${escapeHtml(`${cell.date}${stateText}`)}"><i>${cell.dayOfMonth}</i></span>`);
    }
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-month" data-renderblock-month="${year}-${String(monthIndex + 1).padStart(2, "0")}"><div class="lc-checkin__renderblock-grid" role="list">${headers}${body.join("")}</div><small class="lc-checkin__renderblock-meta">${escapeHtml(t("block.monthMeta", {year, month: monthIndex + 1, done: cells.reduce((total, cell) => total + cell.completedCount, 0)}))}</small></div>`;
}

/** T-1351：今日完成率（0~100 整数）；完成 = 100，进行中按进度比折算。单一实现供 summary/groups 消费。 */
export function todayCompletionRate(store: CheckinStore, item: CheckinItem, asOf: Date): number {
    if (isComplete(store, item, asOf)) return 100;
    const revision = getItemRevisionForDate(item, asOf);
    const progress = getProgress(store, item, asOf);
    const target = revision.target > 0 ? revision.target : 1;
    return Math.min(100, Math.round((progress / target) * 100));
}

export function buildSummaryViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const items = resolveBlockItems(store, config, anchorIndex);
    if (!items.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const minRate = config.minRate;
    const filtered = minRate ? items.filter((item) => todayCompletionRate(store, item, asOf) >= minRate) : items;
    if (minRate && !filtered.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.minRateEmpty", {rate: minRate}))}</div>`;
    const streaks = computeEventStreaks(store, asOf);
    const longestMap = computeLongestStreaks(store, asOf);
    /* 汇总行直接复用模型单一路径（getProgress/isComplete），避免在渲染块里重写完成口径。 */
    const lines = filtered.map((item) => {
        const progress = getProgress(store, item, asOf);
        const revision = getItemRevisionForDate(item, asOf);
        const complete = isComplete(store, item, asOf);
        const streak = streaks.get(item.id) || 0;
        const longest = longestMap.get(item.id) || 0;
        const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
        const stateText = complete ? t("anchor.stateDone") : progress > 0 ? t("block.summaryPartial") : t("block.summaryPending");
        const streakParts: string[] = [];
        if (streak > 0) streakParts.push(escapeHtml(t("anchor.streakSuffix", {n: streak})));
        if (longest > 1) streakParts.push(escapeHtml(t("block.longestSuffix", {n: longest})));
        /* T-1415：at-most 项目附戒断里程碑（与今日卡片/API getStreaks 同口径）。 */
        if (item.direction === "atMost" && streak > 0) {
            const milestones = abstinenceMilestones(streak);
            streakParts.push(escapeHtml(t("today.abstinenceDay", {n: streak})));
            if (milestones.next) streakParts.push(escapeHtml(t("today.abstinenceNext", {n: milestones.next})));
        }
        const streakHtml = streakParts.length ? `<em>${streakParts.join(" · ")}</em>` : "";
        /* T-1351：有已解析锚点的项目行额外携带 data-jump-anchor-block，点击打开锚点所在文档。 */
        const anchorBlockId = item.noteAnchor?.blockId;
        const anchorAttr = anchorBlockId && anchorIndex?.has(anchorBlockId) ? ` data-jump-anchor-block="${escapeHtml(anchorBlockId)}"` : "";
        return `<div class="lc-checkin__renderblock-row" role="listitem" tabindex="0" data-jump-item="${escapeHtml(item.id)}"${anchorAttr} aria-label="${escapeHtml(`${item.name} ${stateText}`)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(stateText)} · ${escapeHtml(formatNumber(progress))}/${escapeHtml(formatNumber(target))} ${escapeHtml(revision.unit)}</span>${streakHtml}</div>`;
    }).join("");
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-summary" role="list">${lines}</div>`;
}

/** today 视图（T-1412，第二轮采纳）：极简今日概览——每项目一行的状态/连续/漏卡信息
    与一键打卡按钮（完成后祝贺态）。状态与连续复用模型层单一实现。
    按钮仅输出 data-block-record 标记，写回由宿主经既有 recordEvent 通道完成（幂等/审计不变）。 */
export interface TodayViewRow {
    itemId: string;
    name: string;
    icon: string;
    complete: boolean;
    progressText: string;
    streak: number;
    lastMissedDate?: string;
    /** T-1462：数值项目的附加快捷步长（与 unit 成对出现；缺省=单按钮行为不变）。 */
    quickSteps?: number[];
    unit?: string;
    /** R-17.3：当日 ≥2 条记录时按早/午/晚分组计数（高频记录一览）。 */
    slots?: {morning: number; afternoon: number; evening: number};
}

/** 单项目回溯找「最近漏卡日」：从昨天向前扫，命中第一个完成日即停（更早的缺口不再算漏卡）。 */
export function findLastMissedDate(store: CheckinStore, item: CheckinItem, asOf: Date): string | undefined {
    const skipDays = getSkipDatesForItem(store, item.id);
    const check = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 12);
    let guard = 0;
    while (guard < 365) {
        guard += 1;
        check.setDate(check.getDate() - 1);
        if (!isItemAvailableOnDate(item, check) || !isScheduledToday(item, check)) continue;
        if (isComplete(store, item, check)) return undefined;
        if (skipDays.has(dateKey(check))) continue;
        return dateKey(check);
    }
    return undefined;
}

export function buildTodayRows(store: CheckinStore, items: CheckinItem[], asOf: Date): TodayViewRow[] {
    const streaks = computeEventStreaks(store, asOf);
    const rows: TodayViewRow[] = [];
    for (const item of items.filter((entry) => !entry.archived).slice(0, 5)) {
        const complete = isComplete(store, item, asOf);
        const revision = getItemRevisionForDate(item, asOf);
        const progress = getProgress(store, item, asOf);
        const progressText = complete
            ? t("block.todayDone")
            : revision.schedule.type === "quota"
                ? `${Math.round(progress * 100)}%`
                : `${formatNumber(progress)}/${formatNumber(revision.target)} ${revision.unit}`;
        /* R-17.3：当日 ≥2 条有效记录 → 早/午/晚分组计数（<12 早、12-18 午、≥18 晚）。 */
        const slots = buildTodaySlotCounts(store, item.id, asOf);
        rows.push({
            itemId: item.id,
            name: item.name,
            icon: item.icon,
            complete,
            progressText,
            streak: streaks.get(item.id) || 0,
            lastMissedDate: items.length === 1 ? findLastMissedDate(store, item, asOf) : undefined,
            /* T-1462：仅数值项目物化 chips 行；complete 行不渲染按钮组（祝贺态优先）。 */
            ...(item.quickSteps?.length && !complete ? {quickSteps: item.quickSteps, unit: revision.unit} : {}),
            ...(slots ? {slots} : {}),
        });
    }
    return rows;
}

/** R-17.3：当日 ≥2 条有效（非跳过）记录时返回早/午/晚计数，否则 undefined（不做单条噪音）。 */
export function buildTodaySlotCounts(store: CheckinStore, itemId: string, asOf: Date): {morning: number; afternoon: number; evening: number} | undefined {
    const events = getEventsForDay(store, itemId, asOf).filter((event) => !isSkipEvent(event));
    if (events.length < 2) return undefined;
    const slots = {morning: 0, afternoon: 0, evening: 0};
    for (const event of events) {
        const hour = new Date(event.occurredAt).getHours();
        if (hour < 12) slots.morning += 1;
        else if (hour < 18) slots.afternoon += 1;
        else slots.evening += 1;
    }
    return slots;
}

export function buildTodayViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date): string {
    const items = resolveBlockItems(store, config);
    const rows = buildTodayRows(store, items, asOf);
    if (!rows.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const body = rows.map((row) => {
        let action = `<button class="lc-checkin__text-button lc-checkin__renderblock-today-record" type="button" data-block-record="${escapeHtml(row.itemId)}">${escapeHtml(t("block.todayRecord"))}</button>`;
        if (row.complete) {
            action = `<span class="lc-checkin__renderblock-today-done">${escapeHtml(t("block.todayCongrats"))}</span>`;
        } else if (row.quickSteps?.length) {
            /* T-1462：chips 组一次点击=一条增量事件；写回仍走既有 recordEvent 通道（宿主读 amount）。 */
            action = `<span class="lc-checkin__renderblock-today-steps">${row.quickSteps.map((value) => `<button class="lc-checkin__text-button lc-checkin__renderblock-today-record" type="button" data-block-record="${escapeHtml(row.itemId)}" data-block-record-amount="${formatNumber(value)}" aria-label="${escapeHtml(t("item.recordStep", {value: formatNumber(value), unit: row.unit || ""}))}" title="${escapeHtml(t("item.recordStep", {value: formatNumber(value), unit: row.unit || ""}))}">+${escapeHtml(formatNumber(value))}</button>`).join("")}</span>`;
        }
        const missed = row.lastMissedDate ? `<small class="lc-checkin__renderblock-today-missed">${escapeHtml(t("block.todayLastMissed", {date: row.lastMissedDate}))}</small>` : "";
        /* R-17.3：时段分组计数（早/午/晚），仅当日 ≥2 条记录时出现。 */
        const slots = row.slots ? `<span class="lc-checkin__renderblock-today-slots" aria-label="${escapeHtml(t("block.todaySlotsAria"))}">${t("block.slotMorning")} ${row.slots.morning} · ${t("block.slotAfternoon")} ${row.slots.afternoon} · ${t("block.slotEvening")} ${row.slots.evening}</span>` : "";
        return `<div class="lc-checkin__renderblock-today-row" data-item-id="${escapeHtml(row.itemId)}"><span class="lc-checkin__renderblock-today-icon" aria-hidden="true">${escapeHtml(row.icon)}</span><span class="lc-checkin__renderblock-today-name">${escapeHtml(row.name)}</span><span class="lc-checkin__renderblock-today-status">${escapeHtml(row.progressText)}</span><span class="lc-checkin__renderblock-today-streak">${escapeHtml(t("block.todayStreak", {n: row.streak}))}</span>${missed}${slots}${action}</div>`;
    }).join("");
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-today">${body}</div>`;
}

/** groups 视图（T-1351）：按分组聚合的今日完成率汇总；minRate 过滤低完成率分组。 */
export function buildGroupsViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const items = resolveBlockItems(store, config, anchorIndex);
    if (!items.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const groups = new Map<string, {scheduled: number; completed: number; items: number}>();
    for (const item of items) {
        const entry = groups.get(item.group || "") || {scheduled: 0, completed: 0, items: 0};
        entry.items += 1;
        if (isItemAvailableOnDate(item, asOf) && isScheduledToday(item, asOf)) {
            entry.scheduled += 1;
            if (isComplete(store, item, asOf)) entry.completed += 1;
        }
        groups.set(item.group || "", entry);
    }
    const minRate = config.minRate;
    const rows = [...groups.entries()]
        .map(([name, entry]) => ({name, ...entry, rate: entry.scheduled ? Math.round((entry.completed / entry.scheduled) * 100) : 0}))
        .sort((left, right) => right.rate - left.rate || left.name.localeCompare(right.name));
    const visible = minRate ? rows.filter((row) => row.rate >= minRate) : rows;
    if (!visible.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.minRateEmpty", {rate: minRate || 0}))}</div>`;
    const lines = visible.map((row) => `<div class="lc-checkin__renderblock-row" role="listitem"><strong>${escapeHtml(row.name || t("review.ungrouped"))}</strong><span>${t("block.groupsMeta", {items: row.items, done: row.completed, total: row.scheduled, rate: row.rate})}</span></div>`).join("");
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-groups" role="list">${lines}</div>`;
}

export function buildHeatmapViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const items = resolveBlockItems(store, config, anchorIndex);
    if (!items.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const year = config.year || asOf.getFullYear();
    const prefix = `${year}-`;
    const ids = new Set(items.map((item) => item.id));
    const counts = new Map<string, number>();
    const skips = new Set<string>();
    let total = 0;
    let max = 0;
    for (const event of store.events) {
        if (!event.localDate.startsWith(prefix) || !ids.has(event.itemId)) continue;
        total += 1;
        if (event.kind === "skip") {
            skips.add(event.localDate);
            continue;
        }
        const count = (counts.get(event.localDate) || 0) + 1;
        counts.set(event.localDate, count);
        max = Math.max(max, count);
    }
    const today = dateKey(asOf);
    const days: Array<{date: string; count: number; level: number; skip?: boolean; today?: boolean}> = [];
    const cursor = new Date(year, 0, 1);
    while (cursor.getFullYear() === year) {
        const key = dateKey(cursor);
        const count = counts.get(key) || 0;
        let level = 0;
        if (count > 0) level = count >= Math.max(6, Math.ceil(max * 0.75)) ? 4 : count >= Math.max(3, Math.ceil(max * 0.5)) ? 3 : count >= 2 ? 2 : 1;
        days.push({date: key, count, level, ...(level === 0 && skips.has(key) ? {skip: true} : {}), ...(key === today ? {today: true} : {})});
        cursor.setDate(cursor.getDate() + 1);
    }
    const headers = weekdayOrder.map((index) => `<span class="lc-checkin__renderblock-wd">${escapeHtml(t(`date.wd${index}`))}</span>`).join("");
    const leading = (new Date(year, 0, 1).getDay() + 6) % 7;
    const body: string[] = Array.from({length: leading}, () => `<span class="lc-checkin__renderblock-cell is-empty"><i></i></span>`);
    for (const day of days) {
        const classes = ["lc-checkin__renderblock-cell", day.skip ? "is-skip" : `is-level-${day.level}`, day.today ? "is-today" : ""].filter(Boolean).join(" ");
        body.push(`<span class="${classes}" role="button" tabindex="0" data-jump-date="${day.date}" aria-label="${escapeHtml(day.date)}" title="${escapeHtml(day.date)}"><i></i></span>`);
    }
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-heatmap" data-renderblock-year="${year}"><div class="lc-checkin__renderblock-grid is-year">${headers}${body.join("")}</div><small class="lc-checkin__renderblock-meta">${escapeHtml(t("block.heatmapMeta", {year, n: total}))}</small></div>`;
}
