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

/* ===== v5-2：幂等批量写（events.record.batch, D-240 切分第二批）=====
   单遍规划,结果与输入严格 1:1。判定顺序固定（与 D-227 内部写入器同源）：
   duplicate → discarded → blocked → recorded；批内重复 externalRef 的条目
   不得重复入账。落盘/持久化/广播由宿主在单一受保护单元内完成。 */

import {dateKey, getItemById, getItemRevisionForDate, isItemAvailableOnDate} from "../model";
import type {CheckinStore} from "../types";

export interface BatchRecordInput {
    itemId?: unknown;
    value?: unknown;
    unit?: unknown;
    source?: unknown;
    externalRef?: unknown;
    note?: unknown;
    occurredAt?: unknown;
}

export interface BatchEntryPlan {
    itemId: string;
    value: number;
    unit: string;
    externalRef?: string;
    note?: string;
    occurredAt: string;
    localDate: string;
}

export interface BatchEntryResult {
    kind: "recorded" | "duplicate" | "discarded" | "blocked" | "rejected";
    eventId?: string;
    reason?: string;
    usedFallbackTime?: boolean;
}

function normalizeValidIso(value: unknown): string | undefined {
    if (typeof value !== "string" || !value || value.length > 40) return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

/** 纯规划：结构校验(→rejected)与时钟注入(缺省 now→usedFallbackTime)合并进单遍分类,
    按固定顺序 duplicate → tombstone discarded → 项目/映射 blocked → recorded;
    批内相同 itemId+source+externalRef 只入账一次,后续条目回显首条结果。
    返回 recorded 条目的写入计划(unit 解析为完成日期修订值)与 recorded 结果下标(供宿主追加后回填 eventId)。 */
export function planBatchRecord(store: CheckinStore, inputs: readonly unknown[], nowIso: string): {results: BatchEntryResult[]; planned: BatchEntryPlan[]; recordedIndices: number[]} {
    const results: BatchEntryResult[] = [];
    const planned: BatchEntryPlan[] = [];
    const recordedIndices: number[] = [];
    const seenRefs = new Map<string, number>();
    for (let index = 0; index < inputs.length; index += 1) {
        const raw = inputs[index];
        const pushRejected = (reason: string) => results.push({kind: "rejected", reason});
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            pushRejected("invalid-input");
            continue;
        }
        const input = raw as Record<string, unknown>;
        const itemId = typeof input.itemId === "string" ? input.itemId.trim().slice(0, 160) : "";
        if (!itemId) {
            pushRejected("invalid-item-id");
            continue;
        }
        if (input.source !== undefined && input.source !== "api") {
            pushRejected("invalid-source");
            continue;
        }
        let value = 1;
        if (input.value !== undefined) {
            if (typeof input.value !== "number" || !Number.isFinite(input.value) || input.value < 0) {
                pushRejected("invalid-value");
                continue;
            }
            value = input.value;
        }
        let unit: string | undefined;
        if (input.unit !== undefined) {
            if (typeof input.unit !== "string" || !input.unit.trim() || input.unit.trim().length > 16) {
                pushRejected("invalid-unit");
                continue;
            }
            unit = input.unit.trim();
        }
        let externalRef: string | undefined;
        if (input.externalRef !== undefined) {
            if (typeof input.externalRef !== "string" || !input.externalRef.trim() || input.externalRef.trim().length > 251) {
                pushRejected("invalid-external-ref");
                continue;
            }
            externalRef = input.externalRef.trim();
        }
        let note: string | undefined;
        if (input.note !== undefined) {
            if (typeof input.note !== "string" || input.note.length > 2000) {
                pushRejected("invalid-note");
                continue;
            }
            note = input.note;
        }
        let usedFallbackTime = false;
        let occurredAt = normalizeValidIso(input.occurredAt);
        if (!occurredAt) {
            if (input.occurredAt !== undefined) {
                pushRejected("invalid-occurred-at");
                continue;
            }
            occurredAt = nowIso;
            usedFallbackTime = true;
        }
        const entry: Omit<BatchEntryPlan, "unit"> = {itemId, value, externalRef, note, occurredAt, localDate: dateKey(new Date(occurredAt))};
        /* 批内去重:同 refKey 回显首条结果(recorded 的 eventId 在宿主追加后回填,此处未定)。 */
        const refKey = externalRef ? `${itemId}\u0000api\u0000${externalRef}` : undefined;
        if (refKey) {
            const firstIndex = seenRefs.get(refKey);
            if (firstIndex !== undefined) {
                const first = results[firstIndex];
                results.push(first.kind === "recorded" ? {kind: "duplicate"} : {...first});
                continue;
            }
        }
        if (externalRef) {
            const existing = store.events.find((event) => event.itemId === itemId && event.source === "api" && event.externalRef === externalRef);
            if (existing) {
                if (refKey) seenRefs.set(refKey, results.length);
                results.push({kind: "duplicate", eventId: existing.id});
                continue;
            }
            if ((store.eventTombstones || []).some((tombstone) => tombstone.source === "api" && tombstone.externalRef === externalRef && (!tombstone.itemId || tombstone.itemId === entry.itemId))) {
                if (refKey) seenRefs.set(refKey, results.length);
                results.push({kind: "discarded"});
                continue;
            }
        }
        const item = getItemById(store, itemId);
        if (!item) {
            results.push({kind: "blocked", reason: "missing-item"});
            continue;
        }
        if (item.archived) {
            results.push({kind: "blocked", reason: "archived-item"});
            continue;
        }
        if (item.direction === "atMost") {
            results.push({kind: "blocked", reason: "at-most-item"});
            continue;
        }
        const completionDate = new Date(Number(entry.localDate.slice(0, 4)), Number(entry.localDate.slice(5, 7)) - 1, Number(entry.localDate.slice(8, 10)));
        if (!isItemAvailableOnDate(item, completionDate)) {
            results.push({kind: "blocked", reason: "not-scheduled"});
            continue;
        }
        const revision = getItemRevisionForDate(item, completionDate);
        if (unit !== undefined && unit !== revision.unit) {
            results.push({kind: "blocked", reason: "mapping-changed"});
            continue;
        }
        if (refKey) seenRefs.set(refKey, results.length);
        planned.push({...entry, unit: revision.unit});
        recordedIndices.push(results.length);
        results.push(usedFallbackTime ? {kind: "recorded", usedFallbackTime: true} : {kind: "recorded"});
    }
    return {results, planned, recordedIndices};
}
