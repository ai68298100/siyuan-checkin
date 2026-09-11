import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";
import {evaluateQuotaSchedule, getQuotaPeriodBounds} from "./rules";
import {dateKey, getEventDateKey, getItemRevisionForDate, isComplete, isItemAvailableOnDate, isScheduledToday} from "./model";

export type SummaryRange = "day" | "week" | "month";

export interface DateRange {
    start: Date;
    end: Date;
}

export interface CustomSummaryRange {
    startDate: string;
    endDate: string;
}

export interface ItemSummary {
    itemId: string;
    name: string;
    eventCount: number;
    totalsByUnit: Array<{unit: string; totalValue: number; eventCount: number}>;
    scheduledDays: number;
    completedDays: number;
    completionRate: number;
    quota?: QuotaSummary;
}

export interface QuotaSummary {
    period: "week" | "month";
    elapsedPeriods: number;
    completedPeriods: number;
    completionRate: number;
    current?: ReturnType<typeof evaluateQuotaSchedule>;
}

export interface SummaryContext {
    range: SummaryRange;
    startDate: string;
    endDate: string;
    items: ItemSummary[];
    totalEvents: number;
    completedItems: number;
    scheduledItems: number;
}

export function getDateRange(range: SummaryRange, date = new Date()): DateRange {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (range === "day") {
        return {start, end: addDays(start, 1)};
    }
    if (range === "week") {
        const mondayOffset = (start.getDay() + 6) % 7;
        const weekStart = addDays(start, -mondayOffset);
        return {start: weekStart, end: addDays(weekStart, 7)};
    }
    return {
        start: new Date(start.getFullYear(), start.getMonth(), 1),
        end: new Date(start.getFullYear(), start.getMonth() + 1, 1),
    };
}

export function getEventsInRange(store: CheckinStore, range: SummaryRange, date = new Date()): CheckinEvent[] {
    const bounds = getDateRange(range, date);
    const elapsedEnd = getElapsedEnd(bounds, date);
    const startKey = dateKey(bounds.start);
    const endKey = dateKey(elapsedEnd);
    return store.events.filter((event) => {
        const eventKey = getEventDateKey(event);
        return eventKey >= startKey && eventKey < endKey;
    });
}

export function getEventsInCustomRange(store: CheckinStore, range: CustomSummaryRange): CheckinEvent[] {
    const start = dateFromKey(range.startDate);
    const end = dateFromKey(range.endDate);
    if (!start || !end || range.startDate > range.endDate) return [];
    const endExclusive = dateKey(addDays(end, 1));
    return store.events.filter((event) => {
        const key = getEventDateKey(event);
        return key >= range.startDate && key < endExclusive;
    });
}

export function buildSummaryContext(store: CheckinStore, range: SummaryRange, date = new Date()): SummaryContext {
    const bounds = getDateRange(range, date);
    return buildSummaryForBounds(store, range, bounds, date);
}

export function buildCustomSummaryContext(store: CheckinStore, range: CustomSummaryRange, asOf = new Date()): SummaryContext {
    const start = dateFromKey(range.startDate);
    const end = dateFromKey(range.endDate);
    if (!start || !end || start > end) {
        return buildSummaryContext(store, "day", asOf);
    }
    return buildSummaryForBounds(store, "day", {start, end: addDays(end, 1)}, asOf);
}

function buildSummaryForBounds(store: CheckinStore, range: SummaryRange, bounds: DateRange, date: Date): SummaryContext {
    const elapsedBounds = {...bounds, end: getElapsedEnd(bounds, date)};
    const itemIds = new Set(store.items.map((item) => item.id));
    const events = getEventsInRange(store, range, date).filter((event) => itemIds.has(event.itemId));
    const items = store.items.map((item) => summarizeItem(store, item, elapsedBounds, events))
        .filter((item) => item.scheduledDays > 0 || item.eventCount > 0 || Boolean(item.quota));
    return {
        range,
        startDate: dateKey(elapsedBounds.start),
        endDate: dateKey(addDays(elapsedBounds.end, -1)),
        items,
        totalEvents: events.length,
        completedItems: items.filter((item) => item.completedDays > 0 || Boolean(item.quota?.completedPeriods)).length,
        scheduledItems: items.filter((item) => item.scheduledDays > 0 || Boolean(item.quota?.elapsedPeriods)).length,
    };
}

function dateFromKey(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return dateKey(date) === value ? date : undefined;
}

function summarizeItem(store: CheckinStore, item: CheckinItem, bounds: DateRange, events: CheckinEvent[]): ItemSummary {
    const quota = summarizeQuota(store, item, bounds, events);
    let scheduledDays = 0;
    let completedDays = 0;
    for (let day = new Date(bounds.start); day < bounds.end && !quota; day.setDate(day.getDate() + 1)) {
        if (!isItemAvailableOnDate(item, day) || !isScheduledToday(item, day)) {
            continue;
        }
        scheduledDays += 1;
        if (isComplete(store, item, day)) {
            completedDays += 1;
        }
    }
    const itemEvents = events.filter((event) => event.itemId === item.id);
    const totals = new Map<string, {unit: string; totalValue: number; eventCount: number}>();
    itemEvents.forEach((event) => {
        const current = totals.get(event.unit);
        totals.set(event.unit, {
            unit: event.unit,
            totalValue: (current?.totalValue || 0) + event.value,
            eventCount: (current?.eventCount || 0) + 1,
        });
    });
    return {
        itemId: item.id,
        name: item.name,
        eventCount: itemEvents.length,
        totalsByUnit: [...totals.values()],
        scheduledDays,
        completedDays,
        completionRate: scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : 0,
        ...(quota ? {quota} : {}),
    };
}

function summarizeQuota(store: CheckinStore, item: CheckinItem, bounds: DateRange, events: CheckinEvent[]): QuotaSummary | undefined {
    const asOf = new Date(bounds.end.getTime() - 86400000);
    const revision = getItemRevisionForDate(item, asOf);
    if (revision.schedule.type !== "quota" || !revision.schedule.quota) return undefined;
    const period = revision.schedule.quota.period;
    const elapsedEndKey = dateKey(new Date(bounds.end.getTime() - 86400000));
    const periods = new Map<string, Date>();
    for (let day = new Date(bounds.start); day < bounds.end; day.setDate(day.getDate() + 1)) {
        const key = getQuotaPeriodBounds(period, day).periodKey;
        if (!periods.has(key)) periods.set(key, new Date(day));
    }
    let elapsedPeriods = 0;
    let completedPeriods = 0;
    let current: ReturnType<typeof evaluateQuotaSchedule>;
    for (const representative of periods.values()) {
        if (!isItemAvailableOnDate(item, representative)) continue;
        const progress = evaluateQuotaSchedule(revision.schedule, events, item.id, representative, revision.schedule.quota.countMode === "value" ? revision.unit : undefined);
        if (!progress) continue;
        if (progress.endDate < elapsedEndKey) {
            elapsedPeriods += 1;
            if (progress.complete) completedPeriods += 1;
        } else {
            current = progress;
        }
    }
    return {
        period,
        elapsedPeriods,
        completedPeriods,
        completionRate: elapsedPeriods ? Math.round((completedPeriods / elapsedPeriods) * 100) : 0,
        ...(current ? {current} : {}),
    };
}

function addDays(date: Date, amount: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + amount);
    return result;
}

function getElapsedEnd(bounds: DateRange, date: Date): Date {
    const tomorrow = addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), 1);
    return tomorrow < bounds.end ? tomorrow : bounds.end;
}
