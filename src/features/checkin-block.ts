/* 17.2 T-1234 声明式渲染块：文档内 ```checkin``` 代码块 → 打卡数据视图。
   配置为代码块内的 JSON：
     {"view":"month","itemIds":["id"],"group":"健康","thresholds":[.25,.5,.75,1]}
     {"view":"heatmap","year":2026}
     {"view":"summary","group":"健康"}
   作用域（v17.2 落地范围）：项目 itemIds / 分组 group / 全部活跃项目；
   笔记本/文档维度经由笔记锚点间接可查（内核异步解析），本期不做。
   渲染层规则（T-1236 安全边界）：
   - 纯数据驱动：只输出本模块构造的 HTML；用户内容（项目名）一律 escapeHtml；
   - 配置解析失败返回固定可读错误文案，不回显用户原文（防注入）；
   - 跳过日中性色（is-skip）、今日环（is-today）、强度色阶经 thresholds 配置。 */

import {escapeHtml, formatNumber} from "../shared";
import {t} from "../i18n";
import {dateKey, getItemRevisionForDate, getProgress, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import {computeEventStreaks, computeLongestStreaks} from "../model";
import type {CheckinItem, CheckinSchedule, CheckinStore} from "../types";

export type CheckinBlockView = "month" | "heatmap" | "summary";

export interface CheckinBlockConfig {
    view: CheckinBlockView;
    itemIds?: string[];
    group?: string;
    /** month 视图目标月（YYYY-MM），缺省 = asOf 所在月。 */
    month?: string;
    /** heatmap 视图目标年，缺省 = asOf 年份。 */
    year?: number;
    /** month/heatmap 单元格色阶阈值（完成比例切分点，升序）。 */
    thresholds?: [number, number, number, number];
    /** T-1292：文档维度——只统计锚点块位于该文档的项目（思源文档 id）。 */
    docId?: string;
    /** T-1292：笔记本维度——只统计锚点块位于该笔记本的项目（思源笔记本 id）。 */
    notebook?: string;
}

/** 锚点→文档归属索引：键 = noteAnchor.blockId。由宿主经内核 getBlockInfo 解析并缓存。 */
export type AnchorDocIndex = Map<string, {doc: string; notebook: string}>;

export type CheckinBlockParseResult = {ok: true; config: CheckinBlockConfig} | {ok: false; error: string};

const MAX_BLOCK_ITEMS = 50;
const DEFAULT_THRESHOLDS: [number, number, number, number] = [0.25, 0.5, 0.75, 1];

export function parseCheckinBlockConfig(text: string): CheckinBlockParseResult {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return {ok: false, error: t("block.errorConfig")};
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {ok: false, error: t("block.errorConfig")};
    const source = parsed as Record<string, unknown>;
    const view = source.view;
    if (view !== "month" && view !== "heatmap" && view !== "summary") return {ok: false, error: t("block.errorView")};
    const config: CheckinBlockConfig = {view};
    if (Array.isArray(source.itemIds)) {
        const itemIds = source.itemIds.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()).slice(0, MAX_BLOCK_ITEMS);
        if (source.itemIds.length > MAX_BLOCK_ITEMS) return {ok: false, error: t("block.errorItems")};
        if (itemIds.length) config.itemIds = itemIds;
    }
    if (typeof source.group === "string" && source.group.trim()) config.group = source.group.trim().slice(0, 32);
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

/* 作用域解析优先级：itemIds > group > docId/notebook（锚点索引） > 全部活跃项目。
   docId/notebook 需要 anchorIndex（宿主经内核 getBlockInfo 解析并缓存）；
   无锚点或索引未命中该项目时，视为不在该维度范围内——fail-closed，不静默放大范围。 */
export function resolveBlockItems(store: CheckinStore, config: CheckinBlockConfig, anchorIndex?: AnchorDocIndex): CheckinItem[] {
    const active = store.items.filter((item) => !item.archived);
    if (config.itemIds) {
        const ids = new Set(config.itemIds);
        return active.filter((item) => ids.has(item.id));
    }
    if (config.group) return active.filter((item) => (item.group || "") === config.group);
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
        for (const item of items) {
            if (!isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) continue;
            scheduledCount += 1;
            if (isComplete(store, item, date)) completedCount += 1;
            else if (getSkipDatesForItem(store, item.id).has(key)) skipCount += 1;
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
        });
    }
    return cells;
}

function levelFor(fraction: number, thresholds: [number, number, number, number]): number {
    if (fraction >= thresholds[3]) return 4;
    if (fraction >= thresholds[2]) return 3;
    if (fraction >= thresholds[1]) return 2;
    if (fraction > 0) return fraction >= thresholds[0] ? 2 : 1;
    return 0;
}

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

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
        const classes = ["lc-checkin__renderblock-cell", cell.skipOnly ? "is-skip" : `is-level-${level}`, cell.isToday ? "is-today" : "", cell.future ? "is-future" : ""].filter(Boolean).join(" ");
        const stateText = cell.skipOnly ? ` · ${t("anchor.stateSkip")}` : cell.scheduledCount ? ` · ${cell.completedCount}/${cell.scheduledCount}${cell.incompleteNames.length ? `（缺：${cell.incompleteNames.join("、")}）` : ""}` : "";
        body.push(`<span class="${classes}" data-jump-date="${cell.date}" title="${escapeHtml(`${cell.date}${stateText}`)}"><i>${cell.dayOfMonth}</i></span>`);
    }
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-month" data-renderblock-month="${year}-${String(monthIndex + 1).padStart(2, "0")}"><div class="lc-checkin__renderblock-grid">${headers}${body.join("")}</div><small class="lc-checkin__renderblock-meta">${escapeHtml(t("block.monthMeta", {year, month: monthIndex + 1, done: cells.reduce((total, cell) => total + cell.completedCount, 0)}))}</small></div>`;
}

export function buildSummaryViewHtml(store: CheckinStore, config: CheckinBlockConfig, asOf: Date, anchorIndex?: AnchorDocIndex): string {
    const items = resolveBlockItems(store, config, anchorIndex);
    if (!items.length) return `<div class="lc-checkin__renderblock-empty">${escapeHtml(t("block.empty"))}</div>`;
    const streaks = computeEventStreaks(store, asOf);
    const longestMap = computeLongestStreaks(store, asOf);
    /* 汇总行直接复用模型单一路径（getProgress/isComplete），避免在渲染块里重写完成口径。 */
    const lines = items.map((item) => {
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
        const streakHtml = streakParts.length ? `<em>${streakParts.join(" · ")}</em>` : "";
        return `<div class="lc-checkin__renderblock-row" data-jump-item="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(stateText)} · ${escapeHtml(formatNumber(progress))}/${escapeHtml(formatNumber(target))} ${escapeHtml(revision.unit)}</span>${streakHtml}</div>`;
    }).join("");
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-summary">${lines}</div>`;
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
        body.push(`<span class="${classes}" data-jump-date="${day.date}" title="${escapeHtml(day.date)}"><i></i></span>`);
    }
    return `<div class="lc-checkin__renderblock lc-checkin__renderblock-heatmap" data-renderblock-year="${year}"><div class="lc-checkin__renderblock-grid is-year">${headers}${body.join("")}</div><small class="lc-checkin__renderblock-meta">${escapeHtml(t("block.heatmapMeta", {year, n: total}))}</small></div>`;
}
