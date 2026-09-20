import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";
import {evaluateQuotaSchedule, getQuotaPeriodBounds} from "./rules";
import {dateKey, getEventsInDateRange, getSkipDatesForItem, getItemRevisionForDate, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "./model";
const EVENT_RANGE_LIMITS = {maxDays: 366, maxPoints: 366, maxEvents: 5000} as const;

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
    return getEventsInDateRange(store, startKey, endKey);
}

/** A compact, local-only projection suitable for calendar integrations. */
export interface EventRangePoint {
    localDate: string;
    eventCount: number;
    totalValue: number;
    totalsByUnit: Array<{unit: string; totalValue: number; eventCount: number}>;
}

export interface EventRangeSummary {
    startDate: string;
    /** Exclusive upper bound (YYYY-MM-DD). */
    endDateExclusive: string;
    points: EventRangePoint[];
    totalEvents: number;
    /** True when maxEvents or maxPoints prevented a complete projection. */
    truncated: boolean;
}

export interface EventRangeSummaryOptions {
    maxEvents?: number;
    maxPoints?: number;
}

/**
 * Build a bounded event projection without exposing the store or event objects.
 * The range is half-open: [startDate, endDateExclusive), and dates are local
 * calendar dates (never derived from UTC timestamps).
 */
export function getEventRangeSummary(
    store: CheckinStore,
    range: {startDate: string; endDateExclusive: string},
    options: EventRangeSummaryOptions = {},
): EventRangeSummary {
    if (!range || !isLocalDateKey(range.startDate) || !isLocalDateKey(range.endDateExclusive) || range.startDate >= range.endDateExclusive) {
        throw new TypeError("事件日期范围无效，需使用半开区间 [startDate, endDateExclusive)");
    }
    const span = localDaySpan(range.startDate, range.endDateExclusive);
    if (span > EVENT_RANGE_LIMITS.maxDays) {
        throw new RangeError(`事件日期范围最多 ${EVENT_RANGE_LIMITS.maxDays} 天`);
    }
    const maxEvents = boundedLimit(options.maxEvents, EVENT_RANGE_LIMITS.maxEvents);
    const maxPoints = boundedLimit(options.maxPoints, EVENT_RANGE_LIMITS.maxPoints);
    const candidates = getEventsInDateRange(store, range.startDate, range.endDateExclusive);
    const selected = candidates.slice(0, maxEvents);
    const byDate = new Map<string, EventRangePoint>();
    for (const event of selected) {
        const date = event.localDate;
        let point = byDate.get(date);
        if (!point) {
            point = {localDate: date, eventCount: 0, totalValue: 0, totalsByUnit: []};
            byDate.set(date, point);
        }
        point.eventCount += 1;
        point.totalValue += event.value;
        const unit = point.totalsByUnit.find((entry) => entry.unit === event.unit);
        if (unit) {
            unit.totalValue += event.value;
            unit.eventCount += 1;
        } else {
            point.totalsByUnit.push({unit: event.unit, totalValue: event.value, eventCount: 1});
        }
    }
    const points = [...byDate.values()].slice(0, maxPoints).map((point) => ({
        localDate: point.localDate,
        eventCount: point.eventCount,
        totalValue: point.totalValue,
        totalsByUnit: point.totalsByUnit.map((entry) => ({...entry})),
    }));
    return {
        startDate: range.startDate,
        endDateExclusive: range.endDateExclusive,
        points,
        totalEvents: candidates.length,
        truncated: candidates.length > maxEvents || byDate.size > maxPoints,
    };
}

function boundedLimit(value: number | undefined, maximum: number): number {
    if (value === undefined) return maximum;
    if (!Number.isFinite(value) || value <= 0) throw new RangeError("事件摘要限制必须为正数");
    return Math.min(Math.floor(value), maximum);
}

function isLocalDateKey(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return dateKey(date) === value;
}

function localDaySpan(startDate: string, endDateExclusive: string): number {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDateExclusive.split("-").map(Number);
    return Math.round((new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000);
}

export function getEventsInCustomRange(store: CheckinStore, range: CustomSummaryRange): CheckinEvent[] {
    const start = dateFromKey(range.startDate);
    const end = dateFromKey(range.endDate);
    if (!start || !end || range.startDate > range.endDate) return [];
    const endExclusive = dateKey(addDays(end, 1));
    return getEventsInDateRange(store, range.startDate, endExclusive);
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
    const events = getEventsInDateRange(store, dateKey(elapsedBounds.start), dateKey(elapsedBounds.end))
        .filter((event) => itemIds.has(event.itemId));
    const eventsByItem = new Map<string, CheckinEvent[]>();
    events.forEach((event) => {
        const bucket = eventsByItem.get(event.itemId);
        if (bucket) bucket.push(event);
        else eventsByItem.set(event.itemId, [event]);
    });
    const items = store.items.map((item) => summarizeItem(store, item, elapsedBounds, eventsByItem.get(item.id) || EMPTY_EVENTS))
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
    const skipDates = getSkipDatesForItem(store, item.id);
    let scheduledDays = 0;
    let completedDays = 0;
    for (let day = new Date(bounds.start); day < bounds.end && !quota; day.setDate(day.getDate() + 1)) {
        if (!isItemAvailableOnDate(item, day) || !isScheduledToday(item, day)) {
            continue;
        }
        /* T-1221：跳过日不计入完成率分母（跳过 ≠ 缺席）；若同日也有真实完成则按完成计。 */
        if (skipDates.has(dateKey(day)) && !isComplete(store, item, day)) {
            continue;
        }
        scheduledDays += 1;
        if (isComplete(store, item, day)) {
            completedDays += 1;
        }
    }
    const totals = new Map<string, {unit: string; totalValue: number; eventCount: number}>();
    events.forEach((event) => {
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
        eventCount: events.length,
        totalsByUnit: [...totals.values()],
        scheduledDays,
        completedDays,
        completionRate: scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : 0,
        ...(quota ? {quota} : {}),
    };
}

const EMPTY_EVENTS: CheckinEvent[] = [];

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
    const contributingEvents = events.filter(event => !isSkipEvent(event));
    for (const representative of periods.values()) {
        if (!isItemAvailableOnDate(item, representative)) continue;
        const progress = evaluateQuotaSchedule(revision.schedule, contributingEvents, item.id, representative, revision.schedule.quota.countMode === "value" ? revision.unit : undefined);
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
