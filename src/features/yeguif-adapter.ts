/* T-1457 叶归 LifeLog 适配器（本地读取用户文档，health-inbox 同型）——接入层纯核心。
   数据面（2026-09-25 e2e 实装叶归 v1.12.6 静态探测判定）：
   - LifeLog 段落 = 日记（DailyNote）文档中行首为时间的段落：`12:00 工作` /
     `12:00 工作：写日报` / `12:00:00 工作：写日报`（行首时间带样式则不标记）；
   - 时长 = 同文档内「上条记录 → 当前记录」起始时间差，时长归当前记录的项目与事项；
   - 落点 = 用户可见的普通段落块 + 渲染期 data-en_lifelog_* DOM 标注（红线内）。
   摄取纪律：只读用户自己的文档（local-only）；只摄取当日新建块（宁少记不回补）；
   当天第一条没有前置时间时长未知 → 不记；BlockId 天然幂等身份
   （yeguif:<blockId>:<localDate>），用户改写记录内容不产生重复记账。
   无时钟（日期由调用方注入）、fail-closed。 */
import {splitDateKey} from "../date-keys";
import type {ActionMoment} from "../shared";
import type {SourceIngestReport} from "./source-ingest-report";

export const YEGUIF_INGEST_INTERVAL_MS = 300_000;
/** 单轮摄取的块上限（有界 SQL）。 */
export const YEGUIF_MAX_BLOCKS = 200;
/** 单条记录文本上限。 */
const MARKER_TEXT_LIMIT = 300;
const MARKER_TYPE_LIMIT = 60;
const MARKER_PATTERN = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/;
const BLOCK_ID_PATTERN = /^[0-9A-Za-z-]{8,64}$/;

export interface YeguifMarker {
    blockId: string;
    /** 当日内起始分钟数（0~1439）。 */
    startMinutes: number;
    startSecond?: number;
    /** 类型 = 时间后的首段（全角/半角冒号前）。 */
    type: string;
    /** 冒号后的备注（可空）。 */
    text: string;
}

/** 解析一条 LifeLog Marker 段落；非时间开头/时间非法/类型为空 → undefined（fail-closed）。 */
export function parseYeguifMarker(blockId: string, content: string): YeguifMarker | undefined {
    if (typeof blockId !== "string" || !BLOCK_ID_PATTERN.test(blockId.trim())) return undefined;
    if (typeof content !== "string") return undefined;
    const match = content.trim().match(MARKER_PATTERN);
    if (!match) return undefined;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3] || 0);
    if (hours > 23 || minutes > 59 || seconds > 59) return undefined;
    const rest = match[4].trim();
    if (!rest) return undefined;
    const colon = rest.search(/[：:]/);
    const type = (colon >= 0 ? rest.slice(0, colon) : rest).trim().slice(0, MARKER_TYPE_LIMIT);
    if (!type) return undefined;
    const text = (colon >= 0 ? rest.slice(colon + 1) : "").trim().slice(0, MARKER_TEXT_LIMIT);
    return {blockId: blockId.trim().slice(0, 120), startMinutes: hours * 60 + minutes, ...(seconds ? {startSecond: seconds} : {}), type, text};
}

export interface YeguifEntry {
    blockId: string;
    localDate: string;
    startMinutes: number;
    startSecond?: number;
    endMinutes: number;
    minutes: number;
    type: string;
    text: string;
}

export interface YeguifProjectMapping {
    /** LifeLog 时间后的项目名（例如“工作”）。 */
    project: string;
    /** 小驴打卡项目 ID。 */
    itemId: string;
}

/** Explicit mapping wins; otherwise only one exact-name target may receive the entry. */
export function resolveYeguifItemId(project: string, mappings: readonly YeguifProjectMapping[], candidates: readonly {id: string; name: string}[] = []): string {
    const normalized = typeof project === "string" ? project.trim().toLocaleLowerCase() : "";
    if (!normalized) return "";
    const match = mappings.find((entry) => typeof entry?.project === "string" && typeof entry?.itemId === "string"
        && entry.project.trim().toLocaleLowerCase() === normalized && entry.itemId.trim());
    if (match) return match.itemId.trim();
    if (mappings.length) return "";
    const matching = candidates.filter((item) => item.name.trim().toLocaleLowerCase() === normalized);
    return matching.length === 1 ? matching[0].id : "";
}

/** 归一化设置输入；重复项目保留第一条，避免一条 LifeLog 同时写入多个项目。 */
export function normalizeYeguifMappings(value: unknown): YeguifProjectMapping[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: YeguifProjectMapping[] = [];
    for (const raw of value) {
        if (!raw || typeof raw !== "object") continue;
        const source = raw as Record<string, unknown>;
        const project = typeof source.project === "string" ? source.project.trim().slice(0, MARKER_TYPE_LIMIT) : "";
        const itemId = typeof source.itemId === "string" ? source.itemId.trim().slice(0, 160) : "";
        const key = project.toLocaleLowerCase();
        if (!project || !itemId || seen.has(key)) continue;
        seen.add(key);
        result.push({project, itemId});
    }
    return result;
}

/** 结算：同文档内按起始时间升序，时长 = 当前记录起始 − 上一记录起始（分钟），
    并归属当前记录；首条没有前置记录不产出（宁少记）；零时长/负时长（同分钟）跳过。
    输入应为同一 root 文档的全部 Marker；确定性输出（时间升序、blockId 稳定平局）。 */
export function settleYeguifEntries(markers: readonly YeguifMarker[], localDate: string): YeguifEntry[] {
    if (!splitDateKey(localDate)) return [];
    const sorted = [...markers].sort((left, right) => left.startMinutes - right.startMinutes || left.blockId.localeCompare(right.blockId));
    const entries: YeguifEntry[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        if (!Number.isInteger(previous.startMinutes) || previous.startMinutes < 0
            || !Number.isInteger(current.startMinutes) || current.startMinutes >= 1440) continue;
        const minutes = current.startMinutes - previous.startMinutes;
        if (minutes <= 0) continue;
        entries.push({blockId: current.blockId, localDate, startMinutes: previous.startMinutes, ...(previous.startSecond ? {startSecond: previous.startSecond} : {}), endMinutes: current.startMinutes, minutes, type: current.type, text: current.text});
    }
    return entries;
}

export function buildYeguifActionMoment(localDate: string, startMinutes: number, startSecond = 0): ActionMoment | undefined {
    const parts = splitDateKey(localDate);
    if (!parts || !Number.isInteger(startMinutes) || startMinutes < 0 || startMinutes >= 1440
        || !Number.isInteger(startSecond) || startSecond < 0 || startSecond > 59) return undefined;
    const hours = Math.floor(startMinutes / 60);
    const minutes = startMinutes % 60;
    const localTime = new Date(`${localDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(startSecond).padStart(2, "0")}`);
    if (!Number.isFinite(localTime.getTime()) || localTime.getFullYear() !== parts.year
        || localTime.getMonth() !== parts.month - 1 || localTime.getDate() !== parts.day
        || localTime.getHours() !== hours || localTime.getMinutes() !== minutes || localTime.getSeconds() !== startSecond) return undefined;
    return {occurredAt: localTime.toISOString(), localDate};
}

/** 写入身份：`yeguif:<blockId>:<localDate>`（与注册表格式一致；块 ID 天然防重）。 */
export function buildYeguifExternalRef(blockId: string, localDate: string): string {
    const safe = typeof blockId === "string" ? blockId.trim().slice(0, 120) : "";
    return safe && splitDateKey(localDate) ? `yeguif:${safe}:${localDate}` : "";
}

/** 事件备注：`类型：备注`（无备注时仅类型）。 */
export function buildYeguifEventNote(type: string, text: string): string {
    const safeType = typeof type === "string" ? type.trim().slice(0, MARKER_TYPE_LIMIT) : "";
    const safeText = typeof text === "string" ? text.trim().slice(0, MARKER_TEXT_LIMIT) : "";
    return safeText ? `${safeType}：${safeText}` : safeType;
}

export interface YeguifReadTarget {
    id: string;
    name: string;
    unit: string;
    archived?: boolean;
    available?: boolean;
}

export type YeguifWriteResult = "written" | "write-blocked" | "manual-conflict" | "storage-retryable" | "write-failed" | "not-attempted";
export type YeguifReadStatus = YeguifWriteResult | "writable" | "unmapped" | "ambiguous-target" | "missing-target"
    | "archived-target" | "non-minute-target" | "unavailable-target" | "invalid-entry" | "duplicate" | "tombstoned" | "result-unknown";

export interface YeguifReadAmount {
    records: number;
    minutes: number;
}

export interface YeguifReadTotals extends YeguifReadAmount {
    byStatus: Partial<Record<YeguifReadStatus, YeguifReadAmount>>;
}

export interface YeguifProjectReadGroup extends YeguifReadTotals {
    sourceName: string;
    targetId: string;
    targetName: string;
}

type YeguifReadCounter = "scanned" | "matched" | "planned" | "written" | "duplicate" | "tombstoned" | "manualConflict" | "invalid" | "blocked" | "storageRetryable";

export interface YeguifProjectReadReport {
    report: SourceIngestReport;
    groups: YeguifProjectReadGroup[];
    totals: YeguifReadTotals;
    unassigned: {invalid: number; unmatched: number};
    differences: Array<{counter: YeguifReadCounter; reported: number; projected: number}>;
}

export type PreviewReadReport = YeguifProjectReadReport;

export interface YeguifProjectReadOptions {
    report: Readonly<SourceIngestReport>;
    entries: readonly YeguifEntry[];
    mappings: readonly YeguifProjectMapping[];
    targets: readonly YeguifReadTarget[];
    existingRefs?: ReadonlySet<string>;
    tombstonedRefs?: ReadonlySet<string>;
    results?: ReadonlyMap<string, YeguifWriteResult>;
}

function addYeguifReadAmount(totals: YeguifReadTotals, status: YeguifReadStatus, minutes: number): void {
    totals.records += 1;
    totals.minutes += minutes;
    const amount = totals.byStatus[status] || {records: 0, minutes: 0};
    amount.records += 1;
    amount.minutes += minutes;
    totals.byStatus[status] = amount;
}

export function buildYeguifProjectReadReport(options: YeguifProjectReadOptions): YeguifProjectReadReport {
    const targets = new Map(options.targets.map(target => [target.id, target]));
    const candidates = options.targets.filter(target => !target.archived && target.unit === "分钟" && target.available !== false);
    const groups = new Map<string, YeguifProjectReadGroup>();
    const totals: YeguifReadTotals = {records: 0, minutes: 0, byStatus: {}};
    const seen = new Set<string>();
    for (const entry of options.entries) {
        const sourceName = entry.type.trim();
        const sourceKey = sourceName.toLocaleLowerCase();
        const targetId = resolveYeguifItemId(sourceName, options.mappings, candidates);
        const target = targets.get(targetId);
        const externalRef = buildYeguifExternalRef(entry.blockId, entry.localDate);
        const minutes = Number.isInteger(entry.minutes) && entry.minutes > 0 ? entry.minutes : 0;
        let status: YeguifReadStatus;
        if (!sourceName || !externalRef || !minutes || !Number.isInteger(entry.startMinutes) || entry.startMinutes < 0
            || !Number.isInteger(entry.endMinutes) || entry.endMinutes >= 1440 || entry.endMinutes - entry.startMinutes !== minutes
            || !Number.isInteger(entry.startSecond ?? 0) || (entry.startSecond ?? 0) < 0 || (entry.startSecond ?? 0) > 59) {
            status = "invalid-entry";
        } else if (!targetId) {
            const matching = options.mappings.length ? [] : candidates.filter(candidate => candidate.name.trim().toLocaleLowerCase() === sourceKey);
            status = matching.length > 1 ? "ambiguous-target" : "unmapped";
        } else if (!target) {
            status = "missing-target";
        } else if (target.archived) {
            status = "archived-target";
        } else if (target.unit !== "分钟") {
            status = "non-minute-target";
        } else if (target.available === false) {
            status = "unavailable-target";
        } else if (seen.has(externalRef)) {
            status = "duplicate";
        } else if (options.results?.has(externalRef)) {
            status = options.results.get(externalRef)!;
        } else if (options.existingRefs?.has(externalRef)) {
            status = "duplicate";
        } else if (options.tombstonedRefs?.has(externalRef)) {
            status = "tombstoned";
        } else if (!buildYeguifActionMoment(entry.localDate, entry.startMinutes, entry.startSecond)) {
            status = "invalid-entry";
        } else {
            status = options.report.mode === "preview" ? "writable" : "result-unknown";
        }
        if (externalRef) seen.add(externalRef);
        const groupKey = JSON.stringify([sourceKey, targetId]);
        let group = groups.get(groupKey);
        if (!group) {
            group = {sourceName, targetId, targetName: target?.name || "", records: 0, minutes: 0, byStatus: {}};
            groups.set(groupKey, group);
        }
        addYeguifReadAmount(group, status, minutes);
        addYeguifReadAmount(totals, status, minutes);
    }
    const count = (...statuses: YeguifReadStatus[]) => statuses.reduce((sum, status) => sum + (totals.byStatus[status]?.records || 0), 0);
    const unassigned = {invalid: Math.max(0, options.report.invalid - count("invalid-entry")), unmatched: options.report.unmatched};
    const invalidEntries = count("invalid-entry");
    const counters: Record<YeguifReadCounter, number> = {
        scanned: totals.records + unassigned.invalid + unassigned.unmatched,
        matched: totals.records - invalidEntries,
        planned: count("writable", "written", "write-blocked", "manual-conflict", "storage-retryable", "write-failed", "not-attempted", "result-unknown"),
        written: count("written"),
        duplicate: count("duplicate"),
        tombstoned: count("tombstoned"),
        manualConflict: count("manual-conflict"),
        invalid: count("invalid-entry") + unassigned.invalid,
        blocked: count("unmapped", "ambiguous-target", "missing-target", "archived-target", "non-minute-target", "unavailable-target", "write-blocked"),
        storageRetryable: count("storage-retryable"),
    };
    const differences = (Object.keys(counters) as YeguifReadCounter[]).filter(counter => counters[counter] !== options.report[counter])
        .map(counter => ({counter, reported: options.report[counter], projected: counters[counter]}));
    return {report: {...options.report}, groups: [...groups.values()], totals, unassigned, differences};
}

export const buildYeguifPreviewReadReport = buildYeguifProjectReadReport;
