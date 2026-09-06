import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";
import {dateKey, getEventDateKey, isComplete, isItemAvailableOnDate, isScheduledToday} from "./model";

export type SummaryRange = "day" | "week" | "month";

export interface DateRange {
    start: Date;
    end: Date;
}

export interface ItemSummary {
    itemId: string;
    name: string;
    eventCount: number;
    totalsByUnit: Array<{unit: string; totalValue: number; eventCount: number}>;
    scheduledDays: number;
    completedDays: number;
    completionRate: number;
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

export function buildSummaryContext(store: CheckinStore, range: SummaryRange, date = new Date()): SummaryContext {
    const bounds = getDateRange(range, date);
    const elapsedBounds = {...bounds, end: getElapsedEnd(bounds, date)};
    const itemIds = new Set(store.items.map((item) => item.id));
    const events = getEventsInRange(store, range, date).filter((event) => itemIds.has(event.itemId));
    const items = store.items.map((item) => summarizeItem(store, item, elapsedBounds, events))
        .filter((item) => item.scheduledDays > 0 || item.eventCount > 0);
    return {
        range,
        startDate: dateKey(elapsedBounds.start),
        endDate: dateKey(addDays(elapsedBounds.end, -1)),
        items,
        totalEvents: events.length,
        completedItems: items.filter((item) => item.completedDays > 0).length,
        scheduledItems: items.filter((item) => item.scheduledDays > 0).length,
    };
}

function summarizeItem(store: CheckinStore, item: CheckinItem, bounds: DateRange, events: CheckinEvent[]): ItemSummary {
    let scheduledDays = 0;
    let completedDays = 0;
    for (let day = new Date(bounds.start); day < bounds.end; day.setDate(day.getDate() + 1)) {
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
