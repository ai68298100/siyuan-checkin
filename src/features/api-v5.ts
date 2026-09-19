/* API v5 只读批次的纯过滤边界（T-1275 / D-240 实施切分 v5-1）：
   事件范围读与项目统一投影的过滤、限量、截断判定。
   输入校验(TypeError)在 api.ts 完成；本模块只做纯数据投影，不执行 getter 之外的副作用。 */
import {CHECKIN_EVENTS_READ_LIMITS, CHECKIN_ITEMS_QUERY_LIMITS} from "../api-contract";
import type {CheckinEvent, CheckinItem, CheckinKind} from "../types";

const CHECKIN_KINDS: readonly CheckinKind[] = ["binary", "count", "duration", "quantity", "custom"];
const VALID_SOURCES: readonly CheckinEvent["source"][] = ["manual", "tomato", "import", "api"];

export function isValidEventSource(value: unknown): value is CheckinEvent["source"] {
    return (VALID_SOURCES as readonly string[]).includes(value as string);
}

/** 事件范围读过滤：itemIds(消毒+限量)/source/includeSkips 过滤，limit 截断并给出 truncated 标记。
    输入数组通常来自日期范围索引（升序），保持原顺序输出；元素为输入数组的引用，调用方负责克隆。 */
export function filterEventsInRange(events: readonly CheckinEvent[], options: {itemIds?: string[]; source?: CheckinEvent["source"]; includeSkips?: boolean; limit?: number} = {}): {events: CheckinEvent[]; truncated: boolean} {
    let itemIds: Set<string> | undefined;
    if (Array.isArray(options.itemIds) && options.itemIds.length) {
        itemIds = new Set(options.itemIds
            .slice(0, CHECKIN_EVENTS_READ_LIMITS.maxItemIds)
            .filter((id) => typeof id === "string" && id.length > 0 && id.length <= 160));
    }
    const source = isValidEventSource(options.source) ? options.source : undefined;
    const includeSkips = options.includeSkips !== false;
    const requested = typeof options.limit === "number" && Number.isFinite(options.limit) ? Math.floor(options.limit) : CHECKIN_EVENTS_READ_LIMITS.defaultLimit;
    const limit = Math.max(1, Math.min(CHECKIN_EVENTS_READ_LIMITS.maxLimit, requested));
    const selected: CheckinEvent[] = [];
    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (!event || typeof event !== "object") continue;
        if (itemIds && !itemIds.has(event.itemId)) continue;
        if (source && event.source !== source) continue;
        if (!includeSkips && event.kind === "skip") continue;
        if (selected.length >= limit) return {events: selected, truncated: true};
        selected.push(event);
    }
    return {events: selected, truncated: false};
}

/** 项目统一投影：归档语义二选一（archivedOnly 优先于 includeArchived），kinds 白名单，限量截断。
    kinds 提供但全部非法时按 fail-closed 返回空——不把拼写错误放大成"未过滤"。 */
export function projectItems(items: readonly CheckinItem[], options: {includeArchived?: boolean; archivedOnly?: boolean; kinds?: CheckinKind[]; limit?: number} = {}): CheckinItem[] {
    const archivedOnly = options.archivedOnly === true;
    const includeArchived = options.includeArchived === true;
    let kinds: Set<CheckinKind> | undefined;
    if (Array.isArray(options.kinds) && options.kinds.length) {
        kinds = new Set(options.kinds.filter((kind): kind is CheckinKind => (CHECKIN_KINDS as readonly string[]).includes(kind)));
        if (!kinds.size) return [];
    }
    const requested = typeof options.limit === "number" && Number.isFinite(options.limit) ? Math.floor(options.limit) : CHECKIN_ITEMS_QUERY_LIMITS.defaultLimit;
    const limit = Math.max(1, Math.min(CHECKIN_ITEMS_QUERY_LIMITS.maxLimit, requested));
    const selected: CheckinItem[] = [];
    for (let index = 0; index < items.length && selected.length < limit; index += 1) {
        const item = items[index];
        if (!item || typeof item !== "object") continue;
        if (archivedOnly) {
            if (item.archived !== true) continue;
        } else if (!includeArchived && item.archived === true) {
            continue;
        }
        if (kinds && !kinds.has(item.kind)) continue;
        selected.push(item);
    }
    return selected;
}
