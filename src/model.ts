import type {CheckinArchivePeriod, CheckinEvent, CheckinEventTombstone, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot} from "./types";
import {normalizeQuota} from "./quota";
import {evaluateQuotaSchedule} from "./rules";

export const STORE_VERSION = 2 as const;

export interface StoreConflictReport {
    conflicted: boolean;
    baselineFingerprint: string;
    currentFingerprint: string;
    changedItemIds: string[];
    changedEventIds: string[];
}
export type StoreConflictStrategy = "local" | "remote" | "merge";
export interface StoreConflictResolution { strategy: StoreConflictStrategy; store: CheckinStore; report: StoreConflictReport; }
export interface StoreAuditEntry { type: "conflict" | "merge" | "restore" | "migration"; at: string; details: Record<string, unknown>; }

export function appendStoreAudit(entries: readonly StoreAuditEntry[], entry: StoreAuditEntry, limit = 50): StoreAuditEntry[] {
    return [...entries, {type: entry.type, at: entry.at, details: {...entry.details}}].slice(-Math.max(1, limit));
}

function storeFingerprint(store: CheckinStore): string {
    return JSON.stringify({items: store.items, events: store.events, eventTombstones: store.eventTombstones, templates: store.templates || []});
}

/** Compare a saved baseline with the latest store to detect another window's write. */
export function detectStoreConflict(baseline: unknown, current: unknown): StoreConflictReport {
    const before = normalizeStore(baseline);
    const after = normalizeStore(current);
    const beforeItems = new Map(before.items.map((item) => [item.id, JSON.stringify(item)]));
    const afterItems = new Map(after.items.map((item) => [item.id, JSON.stringify(item)]));
    const beforeEvents = new Map(before.events.map((event) => [event.id, JSON.stringify(event)]));
    const afterEvents = new Map(after.events.map((event) => [event.id, JSON.stringify(event)]));
    const changedItemIds = [...new Set([...beforeItems.keys(), ...afterItems.keys()])].filter((id) => beforeItems.get(id) !== afterItems.get(id)).sort();
    const changedEventIds = [...new Set([...beforeEvents.keys(), ...afterEvents.keys()])].filter((id) => beforeEvents.get(id) !== afterEvents.get(id)).sort();
    const baselineFingerprint = storeFingerprint(before);
    const currentFingerprint = storeFingerprint(after);
    return {conflicted: baselineFingerprint !== currentFingerprint, baselineFingerprint, currentFingerprint, changedItemIds, changedEventIds};
}
export function resolveStoreConflict(baseline: unknown, local: unknown, remote: unknown, strategy: StoreConflictStrategy = "merge"): StoreConflictResolution {
    const report = detectStoreConflict(baseline, remote);
    const localStore = normalizeStore(local);
    const remoteStore = normalizeStore(remote);
    const store = strategy === "local" ? localStore : strategy === "remote" ? remoteStore : mergeStores(localStore, remoteStore);
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
    const eventsById = new Map<string, CheckinEvent>();
    if (Array.isArray(candidate.events)) {
        candidate.events.forEach((value) => {
            const event = normalizeEvent(value);
            if (!event || !itemIds.has(event.itemId) || isEventTombstoned(event, eventTombstones)) return;
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
    const itemIds = new Set(itemsById.keys());
    const eventsById = new Map<string, CheckinEvent>();
    [...localStore.events, ...remoteStore.events].forEach((event) => {
        if (!itemIds.has(event.itemId) || isEventTombstoned(event, eventTombstones)) return;
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

export function getItemRevisionForDate(item: CheckinItem, date = new Date()): CheckinItemRevision {
    const key = dateKey(date);
    const revisions = [...(item.revisions || [])]
        .filter((candidate) => candidate.effectiveDate <= key)
        .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
    const revision = revisions[revisions.length - 1];
    return revision ? cloneRevision(revision) : {
        effectiveDate: isValidDateKey(item.createdDate) ? item.createdDate : key,
        kind: item.kind,
        target: item.target,
        unit: item.unit,
        schedule: cloneSchedule(item.schedule),
    };
}

/* ============================================================
   9.0 性能优化：WeakMap 事件索引
   以 store 对象为 key 自动缓存/失效，O(E) 建索引一次，
   后续所有 getEventsForDay 调用变 O(1)。
   ============================================================ */

interface StoreEventIndex {
    byItemDate: Map<string, CheckinEvent[]>;
}

const storeIndexes = new WeakMap<CheckinStore, StoreEventIndex>();

export function getStoreIndex(store: CheckinStore): StoreEventIndex {
    let index = storeIndexes.get(store);
    if (!index) {
        index = { byItemDate: new Map() };
        for (const event of store.events) {
            const key = event.itemId + ":" + event.localDate;
            const list = index.byItemDate.get(key);
            if (list) list.push(event);
            else index.byItemDate.set(key, [event]);
        }
        storeIndexes.set(store, index);
    }
    return index;
}

export function getEventsForDay(store: CheckinStore, itemId: string, date = new Date()): CheckinEvent[] {
    const index = getStoreIndex(store);
    return index.byItemDate.get(itemId + ":" + dateKey(date)) || EMPTY_EVENTS;
}

const EMPTY_EVENTS: CheckinEvent[] = [];

export function getProgress(store: CheckinStore, item: CheckinItem, date = new Date()): number {
    const revision = getItemRevisionForDate(item, date);
    if (revision.schedule.type === "quota") {
        return evaluateQuotaSchedule(revision.schedule, store.events, item.id, date, revision.schedule.quota?.countMode === "value" ? revision.unit : undefined)?.progress || 0;
    }
    const unit = revision.unit;
    return getEventsForDay(store, item.id, date).filter((event) => event.unit === unit).reduce((total, event) => total + event.value, 0);
}

export function isComplete(store: CheckinStore, item: CheckinItem, date = new Date()): boolean {
    const revision = getItemRevisionForDate(item, date);
    const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || 0 : revision.target;
    return target > 0 && getProgress(store, item, date) >= target;
}

export function appendEvent(store: CheckinStore, event: CheckinEvent): CheckinStore {
    if (isEventTombstoned(event, store.eventTombstones || [])) {
        return store;
    }
    if (store.events.some((candidate) => candidate.id === event.id || hasSameExternalRef(candidate, event))) return store;
    return {
        ...store,
        events: [...store.events, event],
    };
}

/** Replace only the user-editable note while preserving event identity and time. */
export function updateEventNote(store: CheckinStore, eventId: string, note: string | undefined): CheckinStore {
    const index = store.events.findIndex((event) => event.id === eventId);
    if (index < 0) return store;
    const events = [...store.events];
    const current = events[index];
    const normalized = typeof note === "string" ? note.trim().slice(0, 2000) : undefined;
    events[index] = normalized ? {...current, note: normalized} : (() => {
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
    const ids = new Set(removals.map((removal) => typeof removal === "string" ? removal : removal.id));
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
    const fallbackRevision: CheckinItemRevision = {effectiveDate: createdDate, kind, target, unit, schedule: cloneSchedule(schedule)};
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
    };
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
            const revision: CheckinItemRevision = {
                effectiveDate: candidate.effectiveDate,
                kind,
                target,
                unit,
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

function isEventTombstoned(event: CheckinEvent, tombstones: CheckinEventTombstone[]): boolean {
    return tombstones.some((tombstone) => tombstone.eventId === event.id
        || Boolean(tombstone.externalRef
            && tombstone.itemId === event.itemId
            && tombstone.source === event.source
            && tombstone.externalRef === event.externalRef));
}

function hasTombstoneIdentity(tombstone: CheckinEventTombstone): boolean {
    return Boolean(tombstone.itemId && tombstone.source && tombstone.externalRef);
}

function hasSameExternalRef(left: CheckinEvent, right: CheckinEvent): boolean {
    const leftIdentity = getExternalRefIdentity(left);
    return Boolean(leftIdentity && leftIdentity === getExternalRefIdentity(right));
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
