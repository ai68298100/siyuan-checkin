/* 纯数据助手：从 index.ts 外置（T-022）。
   克隆/指纹/连续天数/事件构造/范围事件——均无插件实例状态依赖。 */
import {dateKey, getItemRevisionForDate, makeId} from "./model";
import {currentCalendarDate, captureActionMoment} from "./shared";
import {getEventsInRange, type SummaryRange} from "./analytics";
import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";

export function cloneStoreValue(store: CheckinStore): CheckinStore {
    return {
        version: store.version,
        items: store.items.map((item) => cloneItemValue(item)),
        events: store.events.map((event) => ({...event})),
        eventTombstones: store.eventTombstones.map((tombstone) => ({...tombstone})),
    };
}

export function cloneItemValue(item: CheckinItem): CheckinItem {
    return {
        ...item,
        schedule: {...item.schedule, weekdays: item.schedule.weekdays ? [...item.schedule.weekdays] : undefined},
        revisions: item.revisions.map((revision) => ({
            ...revision,
            schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
        })),
        archivePeriods: item.archivePeriods.map((period) => ({...period})),
    };
}

export function itemFingerprintValue(item: CheckinItem): string {
    return JSON.stringify(cloneItemValue(item));
}

export function revisionFingerprintValue(item: CheckinItem, date: Date): string {
    const revision = getItemRevisionForDate(item, date);
    return JSON.stringify({
        ...revision,
        schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
    });
}

export function cloneItemForDateValue(item: CheckinItem, date: Date): CheckinItem {
    const clone = cloneItemValue(item);
    const revision = getItemRevisionForDate(item, date);
    return {
        ...clone,
        kind: revision.kind,
        target: revision.target,
        unit: revision.unit,
        schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
    };
}

export function makeEventValue(item: CheckinItem, value: number, source: CheckinEvent["source"], unit: string, note?: string, externalRef?: string, moment = captureActionMoment(), attachment?: string): CheckinEvent {
    const safeValue = Number(value);
    return {
        id: makeId("event"),
        itemId: item.id,
        occurredAt: moment.occurredAt,
        localDate: moment.localDate,
        value: Number.isFinite(safeValue) ? Math.max(0, safeValue) : 0,
        unit,
        source,
        note,
        externalRef,
        attachment: typeof attachment === "string" && attachment.startsWith("data:image/") && attachment.length <= 700000 ? attachment : undefined,
    };
}

export function getSummaryEventsValue(store: CheckinStore, range: SummaryRange, date = new Date()): CheckinEvent[] {
    return getEventsInRange(store, range, date).map((event) => ({...event}));
}

/* 8.6 连续记录：按项目统计当前连续打卡天数（自然日粒度，从事件推导）。 */
export function computeStreaksValue(store: CheckinStore): Map<string, number> {
    const streaks = new Map<string, number>();
    const itemDays = new Map<string, Set<string>>();
    for (const event of store.events) {
        if (!itemDays.has(event.itemId)) itemDays.set(event.itemId, new Set());
        itemDays.get(event.itemId)!.add(event.localDate);
    }
    const today = dateKey(currentCalendarDate());
    const yesterdayDate = new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() - 1);
    const yesterday = dateKey(yesterdayDate);
    for (const item of store.items) {
        if (item.archived) { streaks.set(item.id, 0); continue; }
        const days = itemDays.get(item.id);
        if (!days || !days.size) { streaks.set(item.id, 0); continue; }
        let startKey = today;
        if (!days.has(startKey)) startKey = yesterday;
        if (!days.has(startKey)) { streaks.set(item.id, 0); continue; }
        let streak = 0;
        const check = new Date(Number(startKey.slice(0, 4)), Number(startKey.slice(5, 7)) - 1, Number(startKey.slice(8, 10)));
        while (days.has(dateKey(check))) {
            streak += 1;
            check.setDate(check.getDate() - 1);
        }
        streaks.set(item.id, streak);
    }
    return streaks;
}
