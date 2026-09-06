import {dateKey, getEventDateKey, getItemRevisionForDate, isItemAvailableOnDate, isScheduledToday} from "../model";
import type {CheckinEvent, CheckinItem, CheckinKind, CheckinStore} from "../types";

export type HabitDayStatus = "complete" | "partial" | "missed" | "pending" | "off" | "unavailable";

export interface HabitInsightOptions {
    asOf?: Date;
    days?: number;
}

export interface HabitUnitTotal {
    unit: string;
    value: number;
    recordCount: number;
}

export interface HabitDayObservation {
    date: string;
    status: HabitDayStatus;
    unavailableReason?: "not-started" | "paused";
    isToday: boolean;
    available: boolean;
    scheduled: boolean;
    closed: boolean;
    kind: CheckinKind;
    progress: number;
    target: number;
    unit: string;
    events: CheckinEvent[];
    totalsByUnit: HabitUnitTotal[];
}

export interface HabitInsightCounts {
    completedDays: number;
    scheduledDays: number;
    closedCompletedDays: number;
    closedScheduledDays: number;
    eligibleScheduledDays: number;
    /** Percentage in [0, 100]; null when no completed or closed opportunity exists. */
    completionRate: number | null;
}

export interface HabitWeekTrend extends HabitInsightCounts {
    /** Monday and Sunday of the containing calendar week, possibly outside the selected window. */
    startDate: string;
    endDate: string;
    label: string;
    observationStartDate: string;
    observationEndDate: string;
    totalsByUnit: HabitUnitTotal[];
}

export interface HabitInsights {
    item: CheckinItem | null;
    itemId: string;
    startDate: string;
    endDate: string;
    days: HabitDayObservation[];
    aggregates: HabitInsightCounts;
    currentStreak: number;
    longestStreak: number;
    streakScope: "window";
    weeklyTrend: HabitWeekTrend[];
    totalsByUnit: HabitUnitTotal[];
    records: CheckinEvent[];
}

/** Builds a detached, read-only report from a normalized store. */
export function buildHabitInsights(store: CheckinStore, itemId: string, options: HabitInsightOptions = {}): HabitInsights {
    const asOf = options.asOf || new Date();
    if (!Number.isFinite(asOf.getTime())) throw new RangeError("asOf must be a valid date");
    const requestedDays = options.days === undefined || !Number.isFinite(options.days) ? 84 : Math.trunc(options.days);
    const windowDays = Math.max(7, Math.min(366, requestedDays));
    const end = localCalendarDate(asOf);
    const start = shiftDay(end, 1 - windowDays);
    const startDate = dateKey(start);
    const endDate = dateKey(end);
    const originalItem = store.items.find((candidate) => candidate.id === itemId);
    const item = originalItem ? cloneItem(originalItem) : null;
    const eventsByDate = indexEvents(store, itemId, startDate, endDate);
    const days: HabitDayObservation[] = [];

    for (let offset = 0; offset < windowDays; offset += 1) {
        const date = shiftDay(start, offset);
        const key = dateKey(date);
        const events = item ? eventsByDate.get(key) || [] : [];
        const revision = item ? getItemRevisionForDate(item, date) : null;
        const available = Boolean(item && isItemAvailableOnDate(item, date));
        const scheduled = Boolean(available && item && isScheduledToday(item, date));
        const unit = revision?.unit || "";
        const target = revision?.target || 1;
        const progress = sumValues(events.filter((event) => event.unit === unit).map((event) => event.value));
        const isToday = key === endDate;
        const complete = progress > 0 && target > 0 && atLeast(progress, target);
        const status: HabitDayStatus = !available ? "unavailable"
            : !scheduled ? "off"
                : complete ? "complete"
                    : progress > 0 ? "partial"
                        : isToday ? "pending" : "missed";
        days.push({
            date: key,
            status,
            ...(!available ? {unavailableReason: item && item.createdDate <= key ? "paused" as const : "not-started" as const} : {}),
            isToday,
            available,
            scheduled,
            closed: key < endDate,
            kind: revision?.kind || "binary",
            progress,
            target,
            unit,
            events,
            totalsByUnit: unitTotals(events),
        });
    }

    let currentStreak = 0;
    let longestStreak = 0;
    for (const day of days) {
        if (!day.scheduled) continue;
        if (day.status === "complete") {
            currentStreak += 1;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else if (day.closed) {
            currentStreak = 0;
        }
    }
    const records = days.flatMap((day) => day.events);
    return {
        item,
        itemId,
        startDate,
        endDate,
        days,
        aggregates: countsForDays(days),
        currentStreak,
        longestStreak,
        streakScope: "window",
        weeklyTrend: buildWeeklyTrend(days),
        totalsByUnit: unitTotals(records),
        records,
    };
}

function indexEvents(store: CheckinStore, itemId: string, startDate: string, endDate: string): Map<string, CheckinEvent[]> {
    const deletedIds = new Set(store.eventTombstones.map((entry) => entry.eventId));
    const deletedIdentities = new Set(store.eventTombstones
        .filter((entry) => entry.itemId && entry.source && entry.externalRef)
        .map((entry) => JSON.stringify([entry.itemId, entry.source, entry.externalRef])));
    const byDate = new Map<string, CheckinEvent[]>();
    for (const event of store.events) {
        if (event.itemId !== itemId || deletedIds.has(event.id)) continue;
        if (event.externalRef && deletedIdentities.has(JSON.stringify([event.itemId, event.source, event.externalRef]))) continue;
        const key = getEventDateKey(event);
        if (key < startDate || key > endDate) continue;
        const bucket = byDate.get(key) || [];
        bucket.push({...event});
        byDate.set(key, bucket);
    }
    return byDate;
}

function countsForDays(days: readonly HabitDayObservation[]): HabitInsightCounts {
    const scheduledDays = days.filter((day) => day.scheduled).length;
    const completedDays = days.filter((day) => day.status === "complete").length;
    const closedScheduledDays = days.filter((day) => day.scheduled && day.closed).length;
    const closedCompletedDays = days.filter((day) => day.status === "complete" && day.closed).length;
    const eligibleScheduledDays = closedScheduledDays + completedDays - closedCompletedDays;
    return {
        completedDays,
        scheduledDays,
        closedCompletedDays,
        closedScheduledDays,
        eligibleScheduledDays,
        completionRate: eligibleScheduledDays ? Math.round(completedDays / eligibleScheduledDays * 1000) / 10 : null,
    };
}

function buildWeeklyTrend(days: readonly HabitDayObservation[]): HabitWeekTrend[] {
    const byMonday = new Map<string, HabitDayObservation[]>();
    for (const day of days) {
        const [year, month, date] = day.date.split("-").map(Number);
        const local = new Date(year, month - 1, date, 12);
        const monday = dateKey(shiftDay(local, -((local.getDay() + 6) % 7)));
        const bucket = byMonday.get(monday) || [];
        bucket.push(day);
        byMonday.set(monday, bucket);
    }
    return [...byMonday].map(([startDate, observations]) => {
        const [year, month, date] = startDate.split("-").map(Number);
        const endDate = dateKey(shiftDay(new Date(year, month - 1, date, 12), 6));
        return {
            startDate,
            endDate,
            label: `${startDate} - ${endDate}`,
            observationStartDate: observations[0].date,
            observationEndDate: observations[observations.length - 1].date,
            ...countsForDays(observations),
            totalsByUnit: unitTotals(observations.flatMap((day) => day.events)),
        };
    });
}

function unitTotals(events: readonly CheckinEvent[]): HabitUnitTotal[] {
    const byUnit = new Map<string, number[]>();
    for (const event of events) {
        const values = byUnit.get(event.unit) || [];
        values.push(event.value);
        byUnit.set(event.unit, values);
    }
    return [...byUnit].map(([unit, values]) => ({unit, value: sumValues(values), recordCount: values.length}));
}

function sumValues(values: readonly number[]): number {
    let total = 0;
    let correction = 0;
    for (const value of values) {
        const adjusted = value - correction;
        const next = total + adjusted;
        correction = (next - total) - adjusted;
        total = next;
    }
    return total === 0 ? 0 : Number(total.toPrecision(15));
}

function atLeast(progress: number, target: number): boolean {
    const tolerance = Number.EPSILON * Math.max(Math.abs(progress), Math.abs(target)) * 8;
    return progress >= target || target - progress <= tolerance;
}

function localCalendarDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function shiftDay(date: Date, days: number): Date {
    const shifted = localCalendarDate(date);
    shifted.setDate(shifted.getDate() + days);
    return shifted;
}

function cloneItem(item: CheckinItem): CheckinItem {
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
