import type {ItemSummary} from "../analytics";
import type {CheckinStore} from "../types";
import {dateKey, getItemRevisionForDate, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";

export interface ReviewRhythmPoint {
    date: string;
    completed: number;
    /** Scheduled opportunities excluding skipped, uncompleted item-days. */
    scheduled: number;
    skipped: number;
}

export interface ReviewRhythm {
    startDate: string;
    endDate: string;
    points: ReviewRhythmPoint[];
    hasDailyItems: boolean;
}

function localDate(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12);
    return dateKey(date) === value ? date : undefined;
}

/** A bounded calendar-day view. Period quotas remain separate from daily
 * opportunities: meeting a weekly quota must not color seven days complete. */
export function buildReviewRhythm(store: CheckinStore, range: {startDate: string; endDate: string}, asOf: Date): ReviewRhythm {
    const empty = (): ReviewRhythm => ({...range, points: [], hasDailyItems: false});
    const start = localDate(range.startDate);
    const requestedEnd = localDate(range.endDate);
    if (!start || !requestedEnd || !Number.isFinite(asOf.getTime()) || start > requestedEnd) return empty();
    const cutoff = localDate(dateKey(asOf))!;
    const end = requestedEnd < cutoff ? requestedEnd : cutoff;
    if (start > end) return empty();
    const boundedStart = new Date(end);
    boundedStart.setDate(boundedStart.getDate() - 13);
    const effectiveStart = start > boundedStart ? start : boundedStart;
    const points: ReviewRhythmPoint[] = [];
    let hasDailyItems = false;
    const skipsByItem = new Map(store.items.map(item => [item.id, getSkipDatesForItem(store, item.id)]));
    for (let day = new Date(effectiveStart); day <= end; day.setDate(day.getDate() + 1)) {
        const point: ReviewRhythmPoint = {date: dateKey(day), completed: 0, scheduled: 0, skipped: 0};
        for (const item of store.items) {
            if (!isItemAvailableOnDate(item, day) || getItemRevisionForDate(item, day).schedule.type === "quota") continue;
            hasDailyItems = true;
            if (!isScheduledToday(item, day)) continue;
            const complete = isComplete(store, item, day);
            if (!complete && skipsByItem.get(item.id)?.has(point.date)) {
                point.skipped += 1;
                continue;
            }
            point.scheduled += 1;
            if (complete) point.completed += 1;
        }
        points.push(point);
    }
    return {startDate: dateKey(effectiveStart), endDate: dateKey(end), points, hasDailyItems};
}

export interface ReviewProjectPresentation {
    mode: "daily" | "currentQuota" | "closedQuota" | "noSchedule";
    /** A bounded visual fill, independent of unbounded real progress. */
    rate: number | null;
    completed: number;
    total: number;
}

/** UI-only projection: preserves the public summary's distinction between
 * item-days, completed quota periods, and an in-progress quota period. */
export function projectPresentation(item: ItemSummary): ReviewProjectPresentation {
    const measure = (mode: ReviewProjectPresentation["mode"], completed: number, total: number): ReviewProjectPresentation => ({
        mode,
        rate: total > 0 ? Math.min(100, Math.max(0, Math.round(completed / total * 100))) : null,
        completed,
        total,
    });
    if (item.quota?.current) return measure("currentQuota", item.quota.current.progress, item.quota.current.quota);
    if (item.quota?.elapsedPeriods) return measure("closedQuota", item.quota.completedPeriods, item.quota.elapsedPeriods);
    if (!item.quota && item.scheduledDays > 0) return measure("daily", item.completedDays, item.scheduledDays);
    return {mode: "noSchedule", rate: null, completed: 0, total: 0};
}
