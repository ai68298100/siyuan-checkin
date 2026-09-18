import type {CheckinArchivePeriod, CheckinEvent, CheckinEventTombstone, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot} from "./types";
import {normalizeRecordStep} from "./record-step";
import {normalizeQuota} from "./quota";
import {deriveQuotaAutoDays, evaluateQuotaSchedule, evaluateRule, getItemRevisionForDate, type RuleProgress} from "./rules";

export {getItemRevisionForDate} from "./rules";

/* D-216：v3 引入跳过事件（CheckinEvent.kind）。normalizeStore 读入时重打当前
   版本号，v2 数据在「加载→归一→下次持久化」中自动升级，无需独立迁移器。 */
export const STORE_VERSION = 3 as const;
export const STORE_SNAPSHOT_FORMAT = "siyuan-checkin-snapshot" as const;
export const STORE_SNAPSHOT_HISTORY_FORMAT = "siyuan-checkin-snapshot-history" as const;

export interface StoreSnapshotEnvelope {
    format: typeof STORE_SNAPSHOT_FORMAT;
    version: 1;
    capturedAt: string;
    store: CheckinStore;
}

export interface ReadStoreSnapshotResult {
    store: unknown;
    capturedAt?: string;
    legacy: boolean;
}

export interface StoreSnapshotHistory {
    format: typeof STORE_SNAPSHOT_HISTORY_FORMAT;
    version: 1;
    snapshots: StoreSnapshotEnvelope[];
}

export function createStoreSnapshotEnvelope(store: CheckinStore, capturedAt = new Date().toISOString()): StoreSnapshotEnvelope {
    if (!Number.isFinite(Date.parse(capturedAt))) throw new Error("invalid-snapshot-time");
    return {format: STORE_SNAPSHOT_FORMAT, version: 1, capturedAt: new Date(capturedAt).toISOString(), store: normalizeStore(store)};
}

export function readStoreSnapshot(value: unknown): ReadStoreSnapshotResult {
    if (value && typeof value === "object") {
        const candidate = value as Partial<StoreSnapshotEnvelope>;
        if (candidate.format === STORE_SNAPSHOT_FORMAT && candidate.version === 1 && candidate.store && typeof candidate.store === "object") {
            const capturedAt = typeof candidate.capturedAt === "string" && Number.isFinite(Date.parse(candidate.capturedAt))
                ? new Date(candidate.capturedAt).toISOString() : undefined;
            return {store: candidate.store, capturedAt, legacy: false};
        }
    }
    return {store: value, legacy: true};
}

export function readStoreSnapshotHistory(value: unknown, limit = 3): ReadStoreSnapshotResult[] {
    const boundedLimit = Math.max(1, limit);
    if (value && typeof value === "object") {
        const candidate = value as Partial<StoreSnapshotHistory>;
        if (candidate.format === STORE_SNAPSHOT_HISTORY_FORMAT && candidate.version === 1 && Array.isArray(candidate.snapshots)) {
            return candidate.snapshots.map(readStoreSnapshot).filter((entry) => !entry.legacy).slice(-boundedLimit);
        }
    }
    return value === undefined || value === null ? [] : [readStoreSnapshot(value)];
}

export function appendStoreSnapshotHistory(value: unknown, snapshot: StoreSnapshotEnvelope, limit = 3): StoreSnapshotHistory {
    const existing = readStoreSnapshotHistory(value).flatMap((entry) => entry.capturedAt
        ? [createStoreSnapshotEnvelope(normalizeStore(entry.store), entry.capturedAt)] : []);
    return {
        format: STORE_SNAPSHOT_HISTORY_FORMAT,
        version: 1,
        snapshots: [...existing, createStoreSnapshotEnvelope(snapshot.store, snapshot.capturedAt)].slice(-Math.max(1, limit)),
    };
}

export function createEmptyStoreSnapshotHistory(): StoreSnapshotHistory {
    return {format: STORE_SNAPSHOT_HISTORY_FORMAT, version: 1, snapshots: []};
}

export function serializeStoreSnapshotHistory(value: unknown, generatedAt = new Date().toISOString()): string {
    const snapshots = readStoreSnapshotHistory(value).flatMap((entry) => entry.capturedAt
        ? [createStoreSnapshotEnvelope(normalizeStore(entry.store), entry.capturedAt)] : []);
    return JSON.stringify({format: "siyuan-checkin-snapshot-export", version: 1, generatedAt, snapshots}, null, 2);
}

export function parseStoreSnapshotHistoryExport(text: string, limit = 3): StoreSnapshotHistory {
    const parsed = JSON.parse(text) as {format?: unknown; version?: unknown; snapshots?: unknown};
    if (!parsed || parsed.format !== "siyuan-checkin-snapshot-export" || parsed.version !== 1 || !Array.isArray(parsed.snapshots)) {
        throw new Error("invalid-snapshot-export");
    }
    const snapshots = parsed.snapshots.flatMap((value): StoreSnapshotEnvelope[] => {
        const entry = readStoreSnapshot(value);
        const store = entry.store as Partial<CheckinStore> | undefined;
        const validStoreShape = Boolean(store && typeof store === "object" && Number.isFinite(store.version)
            && Array.isArray(store.items) && Array.isArray(store.events) && Array.isArray(store.eventTombstones));
        return !entry.legacy && entry.capturedAt && validStoreShape
            ? [createStoreSnapshotEnvelope(normalizeStore(entry.store), entry.capturedAt)] : [];
    });
    if (!snapshots.length) throw new Error("empty-snapshot-export");
    return {format: STORE_SNAPSHOT_HISTORY_FORMAT, version: 1, snapshots: snapshots.slice(-Math.max(1, limit))};
}

export interface StoreConflictReport {
    conflicted: boolean;
    baselineFingerprint: string;
    currentFingerprint: string;
    changedItemIds: string[];
    changedEventIds: string[];
}
export type StoreConflictStrategy = "local" | "remote" | "merge";
export interface StoreConflictResolution { strategy: StoreConflictStrategy; store: CheckinStore; report: StoreConflictReport; }
export interface StoreAuditEntry { type: "conflict" | "merge" | "restore" | "migration" | "anchor"; at: string; details: Record<string, unknown>; }

const STORE_AUDIT_TYPES = new Set<StoreAuditEntry["type"]>(["conflict", "merge", "restore", "migration", "anchor"]);

export function normalizeStoreAudit(value: unknown, limit = 50): StoreAuditEntry[] {
    if (!Array.isArray(value)) return [];
    const normalized = value.flatMap((candidate): StoreAuditEntry[] => {
        if (!candidate || typeof candidate !== "object") return [];
        const entry = candidate as Partial<StoreAuditEntry>;
        if (!STORE_AUDIT_TYPES.has(entry.type as StoreAuditEntry["type"])) return [];
        if (typeof entry.at !== "string" || !Number.isFinite(Date.parse(entry.at))) return [];
        const details = entry.details && typeof entry.details === "object" && !Array.isArray(entry.details)
            ? {...entry.details} : {};
        return [{type: entry.type as StoreAuditEntry["type"], at: new Date(entry.at).toISOString(), details}];
    });
    return normalized.slice(-Math.max(1, limit));
}

export function serializeStoreAudit(entries: readonly StoreAuditEntry[], generatedAt = new Date().toISOString()): string {
    return JSON.stringify({format: "siyuan-checkin-audit", version: 1, generatedAt, entries: normalizeStoreAudit(entries)}, null, 2);
}

export function appendStoreAudit(entries: readonly StoreAuditEntry[], entry: StoreAuditEntry, limit = 50): StoreAuditEntry[] {
    return normalizeStoreAudit([...entries, entry], limit);
}

const normalizedStoreFingerprints = new WeakMap<CheckinStore, string>();

/** Cache only lifecycle-owned snapshots whose identity and nested collections stay immutable. */
function fingerprintNormalizedStore(store: CheckinStore): string {
    let fingerprint = normalizedStoreFingerprints.get(store);
    if (!fingerprint) {
        fingerprint = JSON.stringify({items: store.items, events: store.events, eventTombstones: store.eventTombstones, templates: store.templates || []});
        normalizedStoreFingerprints.set(store, fingerprint);
    }
    return fingerprint;
}

export function areNormalizedStoresEqual(left: CheckinStore, right: CheckinStore): boolean {
    return left === right || fingerprintNormalizedStore(left) === fingerprintNormalizedStore(right);
}

export function detectNormalizedStoreConflict(before: CheckinStore, after: CheckinStore): StoreConflictReport {
    const baselineFingerprint = fingerprintNormalizedStore(before);
    const currentFingerprint = fingerprintNormalizedStore(after);
    if (baselineFingerprint === currentFingerprint) {
        return {conflicted: false, baselineFingerprint, currentFingerprint, changedItemIds: [], changedEventIds: []};
    }
    const beforeItems = new Map(before.items.map((item) => [item.id, JSON.stringify(item)]));
    const afterItems = new Map(after.items.map((item) => [item.id, JSON.stringify(item)]));
    const beforeEvents = new Map(before.events.map((event) => [event.id, JSON.stringify(event)]));
    const afterEvents = new Map(after.events.map((event) => [event.id, JSON.stringify(event)]));
    const changedItemIds = [...new Set([...beforeItems.keys(), ...afterItems.keys()])].filter((id) => beforeItems.get(id) !== afterItems.get(id)).sort();
    const changedEventIds = [...new Set([...beforeEvents.keys(), ...afterEvents.keys()])].filter((id) => beforeEvents.get(id) !== afterEvents.get(id)).sort();
    return {conflicted: true, baselineFingerprint, currentFingerprint, changedItemIds, changedEventIds};
}

/** Compare a saved baseline with the latest store to detect another window's write. */
export function detectStoreConflict(baseline: unknown, current: unknown): StoreConflictReport {
    const before = normalizeStore(baseline);
    const after = normalizeStore(current);
    return detectNormalizedStoreConflict(before, after);
}
export function resolveStoreConflict(baseline: unknown, local: unknown, remote: unknown, strategy: StoreConflictStrategy = "merge"): StoreConflictResolution {
    const report = detectStoreConflict(baseline, remote);
    const localStore = normalizeStore(local);
    const remoteStore = normalizeStore(remote);
    const store = strategy === "local" ? localStore : strategy === "remote" ? remoteStore : mergeNormalizedStores(localStore, remoteStore);
    return {strategy, store, report};
}

export function createDefaultStore(): CheckinStore {
    return {
        version: STORE_VERSION,
        items: [],
        events: [],
        eventTombstones: [],
    };
}

export function normalizeStore(value: unknown): CheckinStore {
    if (!value || typeof value !== "object") {
        return createDefaultStore();
    }
    const candidate = value as Partial<CheckinStore>;
    const itemsById = new Map<string, CheckinItem>();
    if (Array.isArray(candidate.items)) {
        candidate.items.forEach((value) => {
            const item = normalizeItem(value);
            if (!item) return;
            const existing = itemsById.get(item.id);
            itemsById.set(item.id, existing ? selectItemWinner(existing, item) : item);
        });
    }
    let items = [...itemsById.values()].sort(compareItems);
    const itemIds = new Set(items.map((item) => item.id));
    const eventTombstones = normalizeEventTombstones(candidate.eventTombstones);
    const tombstoneLookup = buildTombstoneLookup(eventTombstones);
    const eventsById = new Map<string, CheckinEvent>();
    if (Array.isArray(candidate.events)) {
        candidate.events.forEach((value) => {
            const event = normalizeEvent(value);
            if (!event || !itemIds.has(event.itemId) || isEventTombstonedByLookup(event, tombstoneLookup)) return;
            const existing = eventsById.get(event.id);
            eventsById.set(event.id, existing ? selectCanonical(existing, event) : event);
        });
    }
    const events = deduplicateExternalRefs([...eventsById.values()]).sort(compareEvents);
    items = items.map(migrateArchivedItem);
    return {
        version: STORE_VERSION,
        items,
        events,
        eventTombstones,
    };
}

/** Return a stable rank for display and priority sorting. */
export function getCheckinPriorityRank(priority?: CheckinPriority): number {
    return priority === "high" ? 3 : priority === "low" ? 1 : 2;
}

/** Normalize legacy/string/number priority values into the persisted vocabulary. */
export function normalizeCheckinPriority(value: unknown): CheckinPriority {
    if (typeof value === "number" && Number.isFinite(value)) {
        if (value >= 2) return "high";
        if (value >= 1) return "medium";
        return "low";
    }
    if (typeof value !== "string") return "medium";
    const normalized = value.trim().toLowerCase();
    if (["high", "urgent", "critical", "最高", "高", "2", "3"].includes(normalized)) return "high";
    if (["low", "minor", "最低", "低", "0"].includes(normalized)) return "low";
    if (["medium", "normal", "default", "中", "1"].includes(normalized)) return "medium";
    return "medium";
}

export function normalizeCheckinGroup(value: unknown): string {
    return typeof value === "string" ? value.trim().slice(0, 32) : "";
}

export function normalizeCheckinSortOrder(value: unknown): number {
    const candidate = Number(value);
    return Number.isFinite(candidate)
        ? Math.max(-1000000000, Math.min(1000000000, Math.round(candidate)))
        : 0;
}

export function normalizeCheckinTimeSlot(value: unknown): CheckinTimeSlot {
    if (typeof value !== "string") return "any";
    const normalized = value.trim().toLowerCase();
    if (["morning", "am", "晨间", "早晨", "上午"].includes(normalized)) return "morning";
    if (["afternoon", "pm", "午后", "下午"].includes(normalized)) return "afternoon";
    if (["evening", "night", "晚间", "晚上", "夜间"].includes(normalized)) return "evening";
    return "any";
}

/** Compare normalized items using a deterministic user-facing sort mode. */
export function compareCheckinItems(left: CheckinItem, right: CheckinItem, mode: CheckinItemSortMode = "manual"): number {
    if (mode === "priority") {
        const priorityComparison = getCheckinPriorityRank(right.priority || "medium") - getCheckinPriorityRank(left.priority || "medium");
        if (priorityComparison !== 0) return priorityComparison;
    }
    if (mode === "group") {
        const groupComparison = compareGroups(left.group || "", right.group || "");
        if (groupComparison !== 0) return groupComparison;
    } else if (mode === "createdAt") {
        const createdComparison = compareText(left.createdAt, right.createdAt);
        if (createdComparison !== 0) return createdComparison;
    } else if (mode === "updatedAt") {
        const updatedComparison = compareText(right.updatedAt, left.updatedAt);
        if (updatedComparison !== 0) return updatedComparison;
    } else if (mode === "name") {
        const nameComparison = compareText(left.name, right.name);
        if (nameComparison !== 0) return nameComparison;
    }
    return compareNumber(left.sortOrder || 0, right.sortOrder || 0)
        || compareText(left.createdAt, right.createdAt)
        || compareText(left.id, right.id);
}

export function sortCheckinItems(items: readonly CheckinItem[], mode: CheckinItemSortMode = "manual"): CheckinItem[] {
    return [...items].sort((left, right) => compareCheckinItems(left, right, mode));
}

/** Sort active items with completed entries at the end of the current day. */
export function sortCheckinItemsForDate(store: CheckinStore, items: readonly CheckinItem[], date = new Date(), mode: CheckinItemSortMode = "manual"): CheckinItem[] {
    return [...items].sort((left, right) => {
        const completionComparison = Number(isComplete(store, left, date)) - Number(isComplete(store, right, date));
        return completionComparison || compareCheckinItems(left, right, mode);
    });
}

/** Group items by their normalized group name while keeping each bucket sorted. */
export function groupCheckinItems(items: readonly CheckinItem[], mode: CheckinItemSortMode = "group"): Map<string, CheckinItem[]> {
    const groups = new Map<string, CheckinItem[]>();
    sortCheckinItems(items, mode).forEach((item) => {
        const group = item.group || "";
        const bucket = groups.get(group);
        if (bucket) bucket.push(item);
        else groups.set(group, [item]);
    });
    return groups;
}

export function mergeStores(local: unknown, remote: unknown): CheckinStore {
    const localStore = normalizeStore(local);
    const remoteStore = normalizeStore(remote);
    return mergeNormalizedStores(localStore, remoteStore);
}

export function mergeNormalizedStores(localStore: CheckinStore, remoteStore: CheckinStore): CheckinStore {
    const itemsById = new Map<string, CheckinItem>();
    [...localStore.items, ...remoteStore.items].forEach((item) => {
        const existing = itemsById.get(item.id);
        itemsById.set(item.id, existing ? selectItemWinner(existing, item) : item);
    });

    const tombstonesByEventId = new Map<string, CheckinEventTombstone>();
    [...localStore.eventTombstones, ...remoteStore.eventTombstones].forEach((tombstone) => {
        const existing = tombstonesByEventId.get(tombstone.eventId);
        tombstonesByEventId.set(tombstone.eventId, existing ? selectTombstoneWinner(existing, tombstone) : tombstone);
    });
    const eventTombstones = [...tombstonesByEventId.values()].sort(compareTombstones);
    const tombstoneLookup = buildTombstoneLookup(eventTombstones);
    const itemIds = new Set(itemsById.keys());
    const eventsById = new Map<string, CheckinEvent>();
    [...localStore.events, ...remoteStore.events].forEach((event) => {
        if (!itemIds.has(event.itemId) || isEventTombstonedByLookup(event, tombstoneLookup)) return;
        const existing = eventsById.get(event.id);
        eventsById.set(event.id, existing ? selectCanonical(existing, event) : event);
    });

    return {
        version: STORE_VERSION,
        items: [...itemsById.values()].sort(compareItems),
        events: deduplicateExternalRefs([...eventsById.values()]).sort(compareEvents),
        eventTombstones,
    };
}

export function dateKey(date = new Date()): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function getEventDateKey(event: CheckinEvent): string {
    if (isValidDateKey(event.localDate)) {
        return event.localDate;
    }
    const occurredAt = new Date(event.occurredAt);
    return Number.isNaN(occurredAt.getTime()) ? event.occurredAt.slice(0, 10) : dateKey(occurredAt);
}

export function isScheduledToday(item: CheckinItem, date = new Date()): boolean {
    const revision = getItemRevisionForDate(item, date);
    const schedule = revision.schedule;
    if (schedule.type === "daily") {
        return true;
    }
    if (schedule.type === "workdays") {
        const day = date.getDay();
        return day >= 1 && day <= 5;
    }
    if (schedule.type === "weekly") {
        return (schedule.weekdays || []).includes(date.getDay());
    }
    if (schedule.type === "interval") {
        const anchorDate = schedule.anchorDate || revision.effectiveDate || item.createdDate;
        const difference = localCalendarDayNumber(dateKey(date)) - localCalendarDayNumber(anchorDate);
        return difference >= 0 && difference % (schedule.intervalDays || 1) === 0;
    }
    if (schedule.type === "quota") {
        return Boolean(schedule.quota);
    }
    return (schedule.weekdays || []).includes(date.getDay());
}

export function queryTodayItems(store: CheckinStore, date = new Date(), options: {query?: string; pendingOnly?: boolean; sort?: CheckinItemSortMode} = {}): CheckinItem[] {
    const query = options.query?.trim().toLocaleLowerCase() || "";
    const visible = store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date))
        .filter((item) => !query || `${item.name} ${item.group || ""}`.toLocaleLowerCase().includes(query))
        .filter((item) => !options.pendingOnly || !isComplete(store, item, date));
    return sortCheckinItemsForDate(store, visible, date, options.sort || "manual");
}

export function isItemAvailableOnDate(item: CheckinItem, date: Date): boolean {
    const createdDate = isValidDateKey(item.createdDate) ? item.createdDate : dateKey(new Date(item.createdAt));
    const key = dateKey(date);
    if (createdDate > key) {
        return false;
    }
    return !(item.archivePeriods || []).some((period) => period.startDate <= key && (!period.endDate || key < period.endDate));
}

/* ============================================================
   9.0 性能优化：WeakMap 事件索引
   以 store 对象为 key 自动缓存/失效，O(E) 建索引一次，
   后续所有 getEventsForDay 调用变 O(1)。
   ============================================================ */

interface StoreEventIndex {
    byItem: Map<string, CheckinEvent[]>;
    eventDatesByItem: Map<string, Set<string>>;
    /** D-216：每个项目存在跳过事件的本地日期集（T-1221 统计口径使用）。 */
    skipDatesByItem: Map<string, Set<string>>;
    byItemDate: Map<string, CheckinEvent[]>;
    byDate: Map<string, CheckinEvent[]>;
    byId: Map<string, CheckinEvent>;
    ordinalById: Map<string, number>;
    byExternalIdentity: Set<string>;
    tombstones: TombstoneLookup;
    byDateOrdered?: Array<{date: string; event: CheckinEvent; ordinal: number}>;
    itemById: Map<string, CheckinItem>;
}

const storeIndexes = new WeakMap<CheckinStore, StoreEventIndex>();

export function getStoreIndex(store: CheckinStore): StoreEventIndex {
    let index = storeIndexes.get(store);
    if (!index) {
        index = {
            byItem: new Map(),
            eventDatesByItem: new Map(),
            skipDatesByItem: new Map(),
            byItemDate: new Map(),
            byDate: new Map(),
            byId: new Map(),
            ordinalById: new Map(),
            byExternalIdentity: new Set(),
            tombstones: buildTombstoneLookup(store.eventTombstones || []),
            itemById: new Map(),
        };
        for (const item of store.items) {
            if (!index.itemById.has(item.id)) index.itemById.set(item.id, item);
        }
        for (let ordinal = 0; ordinal < store.events.length; ordinal += 1) {
            const event = store.events[ordinal];
            const itemEvents = index.byItem.get(event.itemId);
            if (itemEvents) itemEvents.push(event);
            else index.byItem.set(event.itemId, [event]);
            const itemDates = index.eventDatesByItem.get(event.itemId);
            if (itemDates) itemDates.add(event.localDate);
            else index.eventDatesByItem.set(event.itemId, new Set([event.localDate]));
            if (isSkipEvent(event)) {
                const skipDates = index.skipDatesByItem.get(event.itemId);
                if (skipDates) skipDates.add(event.localDate);
                else index.skipDatesByItem.set(event.itemId, new Set([event.localDate]));
            }
            const day = getEventDateKey(event);
            const itemDateKey = event.itemId + ":" + day;
            const itemDateEvents = index.byItemDate.get(itemDateKey);
            if (itemDateEvents) itemDateEvents.push(event);
            else index.byItemDate.set(itemDateKey, [event]);
            const dateEvents = index.byDate.get(day);
            if (dateEvents) dateEvents.push(event);
            else index.byDate.set(day, [event]);
            if (!index.byId.has(event.id)) {
                index.byId.set(event.id, event);
                index.ordinalById.set(event.id, ordinal);
            }
            const externalIdentity = getExternalRefIdentity(event);
            if (externalIdentity) index.byExternalIdentity.add(externalIdentity);
        }
        storeIndexes.set(store, index);
    }
    return index;
}

export function getEventsForDay(store: CheckinStore, itemId: string, date = new Date()): CheckinEvent[] {
    const index = getStoreIndex(store);
    return index.byItemDate.get(itemId + ":" + dateKey(date)) || EMPTY_EVENTS;
}

export function getEventsForItem(store: CheckinStore, itemId: string): CheckinEvent[] {
    return getStoreIndex(store).byItem.get(itemId) || EMPTY_EVENTS;
}

export function getEventDatesForItem(store: CheckinStore, itemId: string): ReadonlySet<string> {
    return getStoreIndex(store).eventDatesByItem.get(itemId) || EMPTY_EVENT_DATES;
}

/** D-216/T-1221：项目存在跳过事件的本地日期集（跳过态统计口径的唯一来源）。 */
export function getSkipDatesForItem(store: CheckinStore, itemId: string): ReadonlySet<string> {
    return getStoreIndex(store).skipDatesByItem.get(itemId) || EMPTY_EVENT_DATES;
}

export function getEventsForDate(store: CheckinStore, date: Date | string = new Date()): CheckinEvent[] {
    const key = typeof date === "string" ? date : dateKey(date);
    return getStoreIndex(store).byDate.get(key) || EMPTY_EVENTS;
}

/** D-216：跳过判定的唯一入口——kind 缺省与 "checkin" 同义，历史数据不受影响。 */
export function isSkipEvent(event: Pick<CheckinEvent, "kind"> | undefined): boolean {
    return event?.kind === "skip";
}

export function getEventById(store: CheckinStore, eventId: string | undefined): CheckinEvent | undefined {
    return eventId ? getStoreIndex(store).byId.get(eventId) : undefined;
}

export function getItemById(store: CheckinStore, itemId: string | undefined): CheckinItem | undefined {
    return itemId ? getStoreIndex(store).itemById.get(itemId) : undefined;
}

/** Current natural-day recording streaks; an absent today may continue from yesterday.
    T-1226：统一状态序列 manual(auto 含) − skip——真实完成日与 AUTO 日（弹性配额
    达成后的期内剩余日，D-217）各计 1 天，跳过日中性桥接，其余断链。AUTO 按需在
    断链日惰性推导（仅 quota 项、单周期窗口），无跳过/配额数据时行为与旧版一致。 */
export function computeEventStreaks(store: CheckinStore, asOf = new Date()): Map<string, number> {
    const streaks = new Map<string, number>();
    const todayDate = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 12);
    const today = dateKey(todayDate);
    const yesterdayDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1, 12);
    const yesterday = dateKey(yesterdayDate);
    for (const item of store.items) {
        if (item.archived) {
            streaks.set(item.id, 0);
            continue;
        }
        const days = getEventDatesForItem(store, item.id);
        const skipDays = getSkipDatesForItem(store, item.id);
        if (!days.size && !skipDays.size) {
            streaks.set(item.id, 0);
            continue;
        }
        /* eventDates 含跳过日，真实完成日需剔除跳过日（同日并存按完成计）。 */
        const realDays = new Set([...days].filter((key) => !skipDays.has(key)));
        const autoCache = new Map<string, boolean>();
        const isAuto = (key: string): boolean => {
            if (autoCache.has(key)) return autoCache.get(key) as boolean;
            let result = false;
            const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)), 12);
            const schedule = getItemRevisionForDate(item, date).schedule;
            if (schedule.type === "quota") {
                result = deriveQuotaAutoDays(schedule, store.events, item.id, key, key, {asOf: today}).has(key);
            }
            autoCache.set(key, result);
            return result;
        };
        /* 锚点从「今天有完成/跳过/自动补全」开始；全部为空的链条 streak 为 0。 */
        const startKey = realDays.has(today) || skipDays.has(today) || isAuto(today) ? today : yesterday;
        if (!realDays.has(startKey) && !skipDays.has(startKey) && !isAuto(startKey)) {
            streaks.set(item.id, 0);
            continue;
        }
        let streak = 0;
        let guard = 0;
        const check = new Date(Number(startKey.slice(0, 4)), Number(startKey.slice(5, 7)) - 1, Number(startKey.slice(8, 10)), 12);
        while (guard < 36500) {
            guard += 1;
            const key = dateKey(check);
            if (realDays.has(key)) streak += 1;
            else if (skipDays.has(key)) {
                /* 跳过日中性桥接：不加成、不断链。 */
            } else if (isAuto(key)) streak += 1;
            else break;
            check.setDate(check.getDate() - 1);
        }
        streaks.set(item.id, streak);
    }
    return streaks;
}

export function getActiveItemById(store: CheckinStore, itemId: string | undefined): CheckinItem | undefined {
    const item = getItemById(store, itemId);
    return item && !item.archived ? item : undefined;
}

export function getEventsInDateRange(store: CheckinStore, startDate: string, endDateExclusive: string): CheckinEvent[] {
    if (startDate >= endDateExclusive) return [];
    const index = getStoreIndex(store);
    const entries = index.byDateOrdered || store.events.map((event, ordinal) => ({
        date: getEventDateKey(event),
        event,
        ordinal,
    })).sort((left, right) => left.date.localeCompare(right.date) || left.ordinal - right.ordinal);
    index.byDateOrdered = entries;
    const lowerBound = (target: string): number => {
        let low = 0;
        let high = entries.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (entries[middle].date < target) low = middle + 1;
            else high = middle;
        }
        return low;
    };
    const start = lowerBound(startDate);
    const end = lowerBound(endDateExclusive);
    return entries.slice(start, end).sort((left, right) => left.ordinal - right.ordinal).map((entry) => entry.event);
}

const EMPTY_EVENTS: CheckinEvent[] = [];
const EMPTY_EVENT_DATES: ReadonlySet<string> = new Set<string>();

export function getProgress(store: CheckinStore, item: CheckinItem, date = new Date()): number {
    const revision = getItemRevisionForDate(item, date);
    /* D-216/T-1221：跳过事件不贡献进度——跳过日不完成、配额不吃量（计算层口径）。 */
    if (revision.schedule.type === "quota") {
        return evaluateQuotaSchedule(revision.schedule, getEventsForItem(store, item.id).filter((event) => !isSkipEvent(event)), item.id, date, revision.schedule.quota?.countMode === "value" ? revision.unit : undefined)?.progress || 0;
    }
    const unit = revision.unit;
    return getEventsForDay(store, item.id, date).filter((event) => event.unit === unit && !isSkipEvent(event)).reduce((total, event) => total + event.value, 0);
}

export function evaluateItemRule(store: CheckinStore, item: CheckinItem, date = new Date()): RuleProgress {
    return evaluateRule(item, getEventsForItem(store, item.id).filter((event) => !isSkipEvent(event)), date);
}

export function isComplete(store: CheckinStore, item: CheckinItem, date = new Date()): boolean {
    const revision = getItemRevisionForDate(item, date);
    const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || 0 : revision.target;
    return target > 0 && getProgress(store, item, date) >= target;
}

/** Append several events against one warmed index and clone the event array once.
    Candidates still honor ID/externalRef tombstones and are deduplicated both
    against the store and within the incoming batch. */
export function appendEvents(store: CheckinStore, candidates: readonly CheckinEvent[]): CheckinStore {
    if (!candidates.length) return store;
    const index = getStoreIndex(store);
    const accepted: CheckinEvent[] = [];
    const candidateIds = new Set<string>();
    const candidateExternalIdentities = new Set<string>();
    for (const event of candidates) {
        if (isEventTombstonedByLookup(event, index.tombstones)) continue;
        const externalIdentity = getExternalRefIdentity(event);
        if (index.byId.has(event.id) || candidateIds.has(event.id)) continue;
        if (externalIdentity && (index.byExternalIdentity.has(externalIdentity) || candidateExternalIdentities.has(externalIdentity))) continue;
        accepted.push(event);
        candidateIds.add(event.id);
        if (externalIdentity) candidateExternalIdentities.add(externalIdentity);
    }
    if (!accepted.length) return store;
    return {
        ...store,
        events: [...store.events, ...accepted],
    };
}

export function appendEvent(store: CheckinStore, event: CheckinEvent): CheckinStore {
    return appendEvents(store, [event]);
}

/** Replace only the user-editable note while preserving event identity and time. */
export function updateEventNote(store: CheckinStore, eventId: string, note: string | undefined): CheckinStore {
    const eventIndex = getStoreIndex(store).ordinalById.get(eventId);
    if (eventIndex === undefined) return store;
    const current = store.events[eventIndex];
    if (!current) return store;
    const normalized = typeof note === "string" ? note.trim().slice(0, 2000) || undefined : undefined;
    const currentNote = current.note?.trim() || undefined;
    if (normalized === currentNote) return store;
    const events = [...store.events];
    events[eventIndex] = normalized ? {...current, note: normalized} : (() => {
        const {note: _note, ...withoutNote} = current;
        return withoutNote;
    })();
    return {...store, events};
}

export function removeEventsForDay(store: CheckinStore, itemId: string, date = new Date(), deletedAt = new Date().toISOString()): CheckinStore {
    return removeEvents(store, getEventsForDay(store, itemId, date), deletedAt);
}

export function removeEvents(store: CheckinStore, removals: readonly (string | CheckinEvent)[], deletedAt = new Date().toISOString()): CheckinStore {
    if (!removals.length) return store;
    const eventSnapshots = removals.filter((removal): removal is CheckinEvent => typeof removal !== "string");
    const ids = new Set(removals.map((removal) => typeof removal === "string" ? removal.trim() : removal.id).filter(Boolean));
    if (!ids.size && !eventSnapshots.length) return store;
    const externalIdentities = new Set(eventSnapshots.map(getExternalRefIdentity).filter((identity): identity is string => Boolean(identity)));
    const matchesSnapshot = (event: CheckinEvent) => ids.has(event.id)
        || Boolean(getExternalRefIdentity(event) && externalIdentities.has(getExternalRefIdentity(event)!));
    const deletedEvents = store.events.filter(matchesSnapshot);
    const normalizedDeletedAt = normalizeTimestamp(deletedAt, new Date().toISOString());
    const tombstonesByEventId = new Map((store.eventTombstones || []).map((tombstone) => [tombstone.eventId, tombstone]));
    const tombstoneEventsById = new Map<string, CheckinEvent>();
    [...eventSnapshots, ...deletedEvents].forEach((event) => {
        const existing = tombstoneEventsById.get(event.id);
        tombstoneEventsById.set(event.id, existing ? selectCanonical(existing, event) : event);
    });
    tombstoneEventsById.forEach((event) => {
        const tombstone: CheckinEventTombstone = {
            eventId: event.id,
            deletedAt: normalizedDeletedAt,
            ...(event.externalRef ? {itemId: event.itemId, source: event.source, externalRef: event.externalRef} : {}),
        };
        const existing = tombstonesByEventId.get(event.id);
        tombstonesByEventId.set(event.id, existing ? selectTombstoneWinner(existing, tombstone) : tombstone);
    });
    // A queued undo can reach this store after another window has temporarily
    // removed the event. Keep an ID-only tombstone so a stale replay cannot
    // resurrect it merely because its full snapshot was no longer available.
    ids.forEach((eventId) => {
        if (tombstonesByEventId.has(eventId)) return;
        tombstonesByEventId.set(eventId, {eventId, deletedAt: normalizedDeletedAt});
    });
    return {
        ...store,
        events: store.events.filter((event) => !matchesSnapshot(event)),
        eventTombstones: [...tombstonesByEventId.values()].sort(compareTombstones),
    };
}

export function makeId(prefix: string): string {
    const random = Math.random().toString(36).slice(2, 9);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function normalizeItem(value: unknown): CheckinItem | undefined {
    if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim() || typeof value.name !== "string" || !value.name.trim()) {
        return undefined;
    }
    const kind = isCheckinKind(value.kind) ? value.kind : "binary";
    const targetValue = Number(value.target);
    const schedule = normalizeSchedule(value.schedule);
    const now = new Date();
    const createdAtCandidate = typeof value.createdAt === "string" ? new Date(value.createdAt) : now;
    const createdAt = Number.isNaN(createdAtCandidate.getTime()) ? now.toISOString() : createdAtCandidate.toISOString();
    const updatedAt = normalizeTimestamp(value.updatedAt, createdAt);
    const createdDate = isValidDateKey(value.createdDate) ? value.createdDate : dateKey(new Date(createdAt));
    const target = kind === "binary" ? 1 : Number.isFinite(targetValue) && targetValue > 0 ? targetValue : 1;
    const unit = typeof value.unit === "string" && value.unit.trim() ? value.unit.trim().slice(0, 16) : "次";
    const group = normalizeCheckinGroup(value.group ?? value.category);
    const sortOrder = normalizeCheckinSortOrder(value.sortOrder ?? value.order ?? value.position);
    const priority = normalizeCheckinPriority(value.priority);
    const timeSlot = normalizeCheckinTimeSlot(value.timeSlot ?? value.timeOfDay);
    const completionSource = value.completionSource === "tomato" ? "tomato" as const : "manual" as const;
    const tomatoMode = value.tomatoMode === "sessions" ? "sessions" as const : "minutes" as const;
    const recordStep = normalizeRecordStep(kind, value.recordStep);
    const fallbackRevision: CheckinItemRevision = {effectiveDate: createdDate, kind, target, unit, ...(recordStep ? {recordStep} : {}), schedule: cloneSchedule(schedule)};
    const archivePeriods = normalizeArchivePeriods(value.archivePeriods);
    archivePeriods.sort((left, right) => compareText(left.startDate, right.startDate)
        || compareText(left.endDate || "", right.endDate || ""));
    return {
        id: value.id,
        name: value.name.trim(),
        icon: typeof value.icon === "string" && value.icon ? value.icon : "✓",
        kind,
        target,
        unit,
        ...(recordStep ? {recordStep} : {}),
        schedule,
        createdAt,
        updatedAt,
        createdDate,
        revisions: normalizeRevisions(value.revisions, fallbackRevision),
        archivePeriods,
        archived: value.archived === true,
        group,
        priority,
        sortOrder,
        timeSlot,
        completionSource,
        tomatoMode,
        linkedOccasionId: typeof value.linkedOccasionId === "string" && value.linkedOccasionId.trim() ? value.linkedOccasionId.trim().slice(0, 64) : undefined,
        ...(normalizeNoteAnchor(value.noteAnchor) ? {noteAnchor: normalizeNoteAnchor(value.noteAnchor)} : {}),
        ...(normalizeAutoArchive(value.autoArchive) ? {autoArchive: normalizeAutoArchive(value.autoArchive)} : {}),
    };
}

/** 自动归档口径（D-165）：仅 when afterDays ≥ 1 视为启用，其余一律视为关闭；
    规范字段集合必须与插件侧构造的条目完全一致（写后校验指纹按 JSON 比较）。 */
function normalizeAutoArchive(value: unknown): {afterDays: number} | undefined {
    const days = value && typeof value === "object" ? Math.round(Number((value as {afterDays?: unknown}).afterDays)) : 0;
    return Number.isFinite(days) && days >= 1 ? {afterDays: Math.min(1_000_000, days)} : undefined;
}

/** T-1231：笔记锚点规范化——块 ID 只留安全字符，appendNotes 仅在真值时物化。 */
function normalizeNoteAnchor(value: unknown): {blockId: string; appendNotes?: boolean} | undefined {
    if (!isRecord(value) || typeof value.blockId !== "string") return undefined;
    const blockId = value.blockId.trim();
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(blockId)) return undefined;
    const appendNotes = value.appendNotes === true;
    return {blockId, ...(appendNotes ? {appendNotes: true} : {})};
}

/** 达成天数（自动归档口径）：从可考最早日期逐自然日到 today，按 isComplete 计数。
    封顶 3660 天防异常日期；多记录同日只计 1。 */
export function countCompletedDays(store: CheckinStore, item: CheckinItem, today: Date): number {
    const startCandidates = [item.createdDate, ...item.revisions.map((revision) => revision.effectiveDate)]
        .filter((key) => isValidDateKey(key))
        .sort(compareText);
    const startKey = startCandidates[0];
    if (!startKey) return 0;
    const [year, month, day] = startKey.split("-").map(Number);
    const cursor = new Date(year, month - 1, day);
    const endKey = dateKey(today);
    let count = 0;
    for (let guard = 0; guard < 3660; guard += 1) {
        const key = dateKey(cursor);
        if (key > endKey) break;
        if (isComplete(store, item, cursor)) count += 1;
        cursor.setDate(cursor.getDate() + 1);
    }
    return count;
}

function normalizeEvent(value: unknown): CheckinEvent | undefined {
    if (!isRecord(value) || typeof value.itemId !== "string" || !value.itemId.trim()) {
        return undefined;
    }
    const numericValue = Number(value.value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
        return undefined;
    }
    const source = value.source === "tomato" || value.source === "import" || value.source === "api" ? value.source : "manual";
    const occurredAt = typeof value.occurredAt === "string" && value.occurredAt
        ? normalizeTimestamp(value.occurredAt)
        : new Date().toISOString();
    if (!occurredAt) {
        return undefined;
    }
    const eventWithoutId = {
        itemId: value.itemId,
        occurredAt,
        localDate: isValidDateKey(value.localDate) ? value.localDate : dateKey(new Date(occurredAt)),
        value: numericValue,
        unit: typeof value.unit === "string" && value.unit ? value.unit : "次",
        source,
        note: typeof value.note === "string" ? value.note : undefined,
        externalRef: typeof value.externalRef === "string" ? value.externalRef : undefined,
        attachment: typeof value.attachment === "string" && value.attachment.startsWith("data:image/") && value.attachment.length <= 700000 ? value.attachment : undefined,
        /* D-216：kind 只接受精确词表，缺省不物化（checkin 语义由 isSkipEvent 统一判定）。 */
        kind: value.kind === "skip" || value.kind === "checkin" ? value.kind : undefined,
    };
    const legacyIdentity = isValidDateKey(value.localDate) ? eventWithoutId : {...eventWithoutId, localDate: undefined};
    return {
        id: typeof value.id === "string" && value.id.trim() ? value.id.trim() : makeStableLegacyEventId(legacyIdentity),
        ...eventWithoutId,
    };
}

function normalizeEventTombstones(value: unknown): CheckinEventTombstone[] {
    if (!Array.isArray(value)) return [];
    const tombstonesByEventId = new Map<string, CheckinEventTombstone>();
    value.forEach((candidate) => {
        if (!isRecord(candidate) || typeof candidate.eventId !== "string" || !candidate.eventId.trim()) return;
        const deletedAt = normalizeTimestamp(candidate.deletedAt);
        if (!deletedAt) return;
        const tombstone: CheckinEventTombstone = {eventId: candidate.eventId.trim(), deletedAt};
        if (typeof candidate.itemId === "string" && candidate.itemId.trim()
            && (candidate.source === "manual" || candidate.source === "tomato" || candidate.source === "import" || candidate.source === "api")
            && typeof candidate.externalRef === "string" && candidate.externalRef) {
            Object.assign(tombstone, {
                itemId: candidate.itemId,
                source: candidate.source,
                externalRef: candidate.externalRef,
            });
        }
        const existing = tombstonesByEventId.get(tombstone.eventId);
        tombstonesByEventId.set(tombstone.eventId, existing ? selectTombstoneWinner(existing, tombstone) : tombstone);
    });
    return [...tombstonesByEventId.values()].sort(compareTombstones);
}

function normalizeSchedule(value: unknown): CheckinSchedule {
    const schedule = isRecord(value) ? value : {};
    const type = schedule.type === "weekly" || schedule.type === "workdays" || schedule.type === "custom" || schedule.type === "interval" || schedule.type === "quota" ? schedule.type : "daily";
    const weekdays = Array.isArray(schedule.weekdays)
        ? [...new Set(schedule.weekdays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right)
        : undefined;
    if (type === "interval") {
        const numericInterval = Number(schedule.intervalDays ?? schedule.everyDays ?? schedule.interval);
        const intervalDays = Number.isFinite(numericInterval) ? Math.max(1, Math.min(3650, Math.round(numericInterval))) : 1;
        return {type, intervalDays, ...(isValidDateKey(schedule.anchorDate) ? {anchorDate: schedule.anchorDate} : {})};
    }
    if (type === "quota") {
        const quota = normalizeQuota(schedule.quota);
        return quota ? {type, quota} : {type: "daily"};
    }
    return {type, weekdays: type === "daily" || type === "workdays" ? undefined : weekdays?.length ? weekdays : [1, 2, 3, 4, 5]};
}

function normalizeRevisions(value: unknown, fallback: CheckinItemRevision): CheckinItemRevision[] {
    const revisions = new Map<string, CheckinItemRevision>();
    if (Array.isArray(value)) {
        value.forEach((candidate) => {
            if (!isRecord(candidate) || !isValidDateKey(candidate.effectiveDate)) return;
            const kind = isCheckinKind(candidate.kind) ? candidate.kind : "binary";
            const numericTarget = Number(candidate.target);
            const target = kind === "binary" ? 1 : Number.isFinite(numericTarget) && numericTarget > 0 ? numericTarget : 1;
            const unit = typeof candidate.unit === "string" && candidate.unit.trim() ? candidate.unit.trim().slice(0, 16) : "次";
            const recordStep = normalizeRecordStep(kind, candidate.recordStep);
            const revision: CheckinItemRevision = {
                effectiveDate: candidate.effectiveDate,
                kind,
                target,
                unit,
                ...(recordStep ? {recordStep} : {}),
                schedule: normalizeSchedule(candidate.schedule),
            };
            const existing = revisions.get(revision.effectiveDate);
            revisions.set(revision.effectiveDate, existing ? selectCanonical(existing, revision) : revision);
        });
    }
    if (!revisions.size) {
        revisions.set(fallback.effectiveDate, cloneRevision(fallback));
    } else if (![...revisions.keys()].some((date) => date <= fallback.effectiveDate)) {
        revisions.set(fallback.effectiveDate, cloneRevision(fallback));
    }
    return [...revisions.values()].sort((left, right) => compareText(left.effectiveDate, right.effectiveDate));
}

function normalizeArchivePeriods(value: unknown): CheckinArchivePeriod[] {
    if (!Array.isArray(value)) return [];
    const periods = value.flatMap((candidate): CheckinArchivePeriod[] => {
        if (!isRecord(candidate) || !isValidDateKey(candidate.startDate)) return [];
        if (candidate.endDate !== undefined && (!isValidDateKey(candidate.endDate) || candidate.endDate <= candidate.startDate)) return [];
        return [candidate.endDate === undefined
            ? {startDate: candidate.startDate}
            : {startDate: candidate.startDate, endDate: candidate.endDate}];
    });
    return [...new Map(periods.map((period) => [stableSerialize(period), period])).values()]
        .sort((left, right) => compareText(left.startDate, right.startDate)
            || compareText(left.endDate || "", right.endDate || ""));
}

function migrateArchivedItem(item: CheckinItem): CheckinItem {
    if (!item.archived || item.archivePeriods.some((period) => !period.endDate)) return item;
    const closedDates = item.archivePeriods.map((period) => period.endDate || period.startDate).sort(compareText);
    const lastClosedDate = closedDates[closedDates.length - 1];
    const candidates = [item.createdDate, lastClosedDate]
        .filter((value): value is string => Boolean(value))
        .sort(compareText);
    const startDate = candidates[candidates.length - 1] || item.createdDate;
    const archivePeriods: CheckinArchivePeriod[] = [...item.archivePeriods, {startDate}];
    return {
        ...item,
        archivePeriods: archivePeriods.sort((left, right) => compareText(left.startDate, right.startDate)
            || compareText(left.endDate || "", right.endDate || "")),
    };
}

/** 批量删除打卡项：项目、事件和墓碑都只扫描/构造一次，避免逐项删除在长历史上退化为 O(I×E)。
    幂等：没有匹配项目或事件时原样返回。调用方负责确认层与删除前的恢复点。 */
export function deleteItemsCascade(store: CheckinStore, itemIds: readonly string[], deletedAt: string): CheckinStore {
    const ids = new Set(itemIds.filter((itemId) => typeof itemId === "string" && itemId.trim()).map((itemId) => itemId.trim()));
    if (!ids.size) return store;
    const removed = store.events.filter((event) => ids.has(event.itemId));
    if (!store.items.some((candidate) => ids.has(candidate.id)) && !removed.length) return store;
    return {
        ...store,
        items: store.items.filter((candidate) => !ids.has(candidate.id)),
        events: store.events.filter((event) => !ids.has(event.itemId)),
        eventTombstones: [...store.eventTombstones, ...removed.map((event) => ({
            eventId: event.id,
            deletedAt,
            itemId: event.itemId,
            source: event.source,
            ...(event.externalRef ? {externalRef: event.externalRef} : {}),
        }))],
    };
}

/** 单项目兼容入口继续复用批量线性实现。 */
export function deleteItemCascade(store: CheckinStore, itemId: string, deletedAt: string): CheckinStore {
    return deleteItemsCascade(store, [itemId], deletedAt);
}

function cloneSchedule(schedule: CheckinSchedule): CheckinSchedule {
    return {...schedule, weekdays: schedule.weekdays ? [...schedule.weekdays] : undefined, ...(schedule.quota ? {quota: {...schedule.quota}} : {})};
}

function localCalendarDayNumber(key: string): number {
    const [year, month, day] = key.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function cloneRevision(revision: CheckinItemRevision): CheckinItemRevision {
    return {...revision, schedule: cloneSchedule(revision.schedule)};
}

function selectItemWinner(left: CheckinItem, right: CheckinItem): CheckinItem {
    const timestampComparison = compareText(left.updatedAt, right.updatedAt);
    if (timestampComparison !== 0) return timestampComparison > 0 ? left : right;
    return selectCanonical(left, right);
}

function selectTombstoneWinner(left: CheckinEventTombstone, right: CheckinEventTombstone): CheckinEventTombstone {
    const timestampComparison = compareText(left.deletedAt, right.deletedAt);
    const winner = timestampComparison === 0 ? selectCanonical(left, right) : timestampComparison > 0 ? left : right;
    const identity = [left, right].filter(hasTombstoneIdentity).reduce<CheckinEventTombstone | undefined>((selected, candidate) => {
        return selected ? selectCanonical(selected, candidate) : candidate;
    }, undefined);
    return identity ? {...winner, itemId: identity.itemId, source: identity.source, externalRef: identity.externalRef} : winner;
}

function selectCanonical<T>(left: T, right: T): T {
    return compareText(stableSerialize(left), stableSerialize(right)) >= 0 ? left : right;
}

function stableSerialize(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (isRecord(value)) {
        return `{${Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value) ?? "undefined";
}

function compareItems(left: CheckinItem, right: CheckinItem): number {
    return compareCheckinItems(left, right, "manual");
}

function compareEvents(left: CheckinEvent, right: CheckinEvent): number {
    return compareText(left.occurredAt, right.occurredAt) || compareText(left.id, right.id);
}

function compareTombstones(left: CheckinEventTombstone, right: CheckinEventTombstone): number {
    return compareText(left.deletedAt, right.deletedAt) || compareText(left.eventId, right.eventId);
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function compareGroups(left: string, right: string): number {
    if (!left && right) return -1;
    if (left && !right) return 1;
    return compareText(left, right);
}

function compareNumber(left: number, right: number): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function deduplicateExternalRefs(events: CheckinEvent[]): CheckinEvent[] {
    const withoutExternalRef: CheckinEvent[] = [];
    const eventsByExternalRef = new Map<string, CheckinEvent>();
    events.forEach((event) => {
        const identity = getExternalRefIdentity(event);
        if (!identity) {
            withoutExternalRef.push(event);
            return;
        }
        const existing = eventsByExternalRef.get(identity);
        eventsByExternalRef.set(identity, existing ? selectCanonical(existing, event) : event);
    });
    return [...withoutExternalRef, ...eventsByExternalRef.values()];
}

interface TombstoneLookup {
    eventIds: Set<string>;
    externalIdentities: Set<string>;
}

function buildTombstoneLookup(tombstones: readonly CheckinEventTombstone[]): TombstoneLookup {
    const eventIds = new Set<string>();
    const externalIdentities = new Set<string>();
    tombstones.forEach((tombstone) => {
        eventIds.add(tombstone.eventId);
        if (hasTombstoneIdentity(tombstone)) {
            externalIdentities.add(stableSerialize([tombstone.itemId, tombstone.source, tombstone.externalRef]));
        }
    });
    return {eventIds, externalIdentities};
}

function isEventTombstonedByLookup(event: CheckinEvent, lookup: TombstoneLookup): boolean {
    if (lookup.eventIds.has(event.id)) return true;
    const identity = getExternalRefIdentity(event);
    return Boolean(identity && lookup.externalIdentities.has(identity));
}

function hasTombstoneIdentity(tombstone: CheckinEventTombstone): boolean {
    return Boolean(tombstone.itemId && tombstone.source && tombstone.externalRef);
}

function getExternalRefIdentity(event: CheckinEvent): string | undefined {
    return event.externalRef ? stableSerialize([event.itemId, event.source, event.externalRef]) : undefined;
}

function makeStableLegacyEventId(event: Omit<CheckinEvent, "id" | "localDate"> & {localDate?: string}): string {
    const value = stableSerialize(event);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193);
        second = Math.imul(second ^ code, 0x85ebca6b);
    }
    return `event-legacy-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

function normalizeTimestamp(value: unknown, fallback?: string): string {
    if (typeof value === "string" && value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    return fallback || "";
}

function isCheckinKind(value: unknown): value is CheckinItem["kind"] {
    return value === "binary" || value === "count" || value === "duration" || value === "quantity" || value === "custom";
}

function isValidDateKey(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isRecord(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === "object";
}
