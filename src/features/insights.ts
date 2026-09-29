import {dateKey, evaluateDayCompletion, getEventDateKey, getEventsForItem, getItemRevisionForDate, isItemAvailableOnDate, isScheduledToday, isSkipEvent} from "../model";
import {evaluateQuotaSchedule, periodKeyForSchedule} from "../rules";
import {buildHabitScoreSeries, collectHabitScoreDays, scheduleFrequency} from "./habit-score";
import type {CheckinEvent, CheckinItem, CheckinKind, CheckinSchedule, CheckinStore} from "../types";

export type HabitDayStatus = "complete" | "partial" | "missed" | "pending" | "off" | "unavailable";

export interface HabitInsightOptions {
    asOf?: Date;
    days?: number;
    /** T-1590 自定义范围结束日（dateKey）；非法/缺省回落 asOf 当日。跨度仍受 7~366 天钳制。 */
    endDate?: string;
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
    /** T-1223：仅跳过（有跳过记录且无真实进度）的计划日；streak 中性处理。 */
    skipped?: boolean;
    kind: CheckinKind;
    /** T-1609：戒除类方向标记（与 calendar-projection 同词表），供文案与建议分支使用。 */
    direction?: "atMost";
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
    /** T-1223：以窗口末尾收尾的连续跳过计划日数（0 = 最近没有连续跳过）。 */
    recentSkipDays: number;
    /** T-1241：习惯成熟度百分比——sigmoid(计划机会日)，以 66 天参考线为半程（mhabit 成熟曲线的参考实现）。 */
    maturity: number;
    /** T-1240：窗口内超额日（完成量 ≥ 目标 150% 的数值型天数）。 */
    overachievedDays: number;
    /** T-1227：30 天强度分数现值与相对两周前的变化（数据不足时为 null）。 */
    strengthScore: number | null;
    strengthDelta: number | null;
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
    /* T-1590：自定义范围结束日——仅接受合法 dateKey，否则回落 asOf 当日（fail-closed）。
       key→本地日解析与 shared.calendarDateFromKey 同语义；内联以避免拖入 i18n 依赖链（纯核心模块纪律）。 */
    const customEnd = typeof options.endDate === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(options.endDate) && !Number.isNaN(new Date(options.endDate).getTime())
        ? parseDateKeyToLocal(options.endDate) : localCalendarDate(asOf);
    const end = customEnd;
    const start = shiftDay(end, 1 - windowDays);
    const startDate = dateKey(start);
    const endDate = dateKey(end);
    const originalItem = store.items.find((candidate) => candidate.id === itemId);
    const item = originalItem ? cloneItem(originalItem) : null;
    const itemEvents = getEventsForItem(store, itemId);
    /* T-1223：跳过事件不贡献进度（与 getProgress 的计算层口径一致）。 */
    const activeItemEvents = itemEvents.filter((event) => !isSkipEvent(event));
    const eventsByDate = indexEvents(store, itemId, startDate, endDate);
    const days: HabitDayObservation[] = [];

    for (let offset = 0; offset < windowDays; offset += 1) {
        const date = shiftDay(start, offset);
        const key = dateKey(date);
        const events = item ? eventsByDate.get(key) || [] : [];
        const revision = item ? getItemRevisionForDate(item, date) : null;
        const available = Boolean(item && isItemAvailableOnDate(item, date));
        const unit = revision?.unit || "";
        const quotaSchedule: CheckinSchedule | undefined = revision?.schedule.type === "quota" ? revision.schedule : undefined;
        const quotaProgress = quotaSchedule && item
            ? evaluateQuotaSchedule(quotaSchedule, activeItemEvents, item.id, date, quotaSchedule.quota?.countMode === "value" ? unit : undefined)
            : undefined;
        const scheduled = Boolean(available && item && (quotaSchedule ? isQuotaOpportunityDay(quotaSchedule, date, endDate) : isScheduledToday(item, date)));
        const target = revision?.target || 1;
        const progress = quotaProgress?.progress ?? sumValues(events.filter((event) => event.unit === unit && !isSkipEvent(event)).map((event) => event.value));
        const isToday = key === endDate;
        const effectiveTarget = quotaProgress?.quota ?? target;
        const atMost = item?.direction === "atMost";
        const skippedToday = events.some((event) => isSkipEvent(event));
        /* T-1609：完成判定走 model.evaluateDayCompletion 唯一公式（与 isComplete 同源）——
           戒除类二值零事件即守住、数值不超上限即守住、跳过日不算成功。 */
        const complete = evaluateDayCompletion({
            direction: item?.direction,
            kind: revision?.kind || "binary",
            progress,
            target: effectiveTarget,
            skipped: skippedToday,
        });
        const skipped = scheduled && !complete && progress === 0 && skippedToday;
        /* 戒除类没有「部分完成」：一旦有真实事件即破戒（含数值超限），与回顾日历
           at-most-breach 的立即呈现一致；跳过日沿用 pending/missed + skipped 中性标记。 */
        const status: HabitDayStatus = !available ? "unavailable"
            : !scheduled ? "off"
                : complete ? "complete"
                    : atMost && progress > 0 ? "missed"
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
            ...(skipped ? {skipped: true} : {}),
            kind: revision?.kind || "binary",
            ...(atMost ? {direction: "atMost" as const} : {}),
            progress,
            target: effectiveTarget,
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
        } else if (day.closed && !day.skipped) {
            /* T-1223：跳过日中性——不断开洞察窗口内的当前连续。 */
            currentStreak = 0;
        }
    }
    /* 以窗口末尾收尾的连续跳过计划日数（供教练建议判断是否下调频率）。 */
    let recentSkipDays = 0;
    for (let index = days.length - 1; index >= 0; index -= 1) {
        const day = days[index];
        if (!day.scheduled) continue;
        if (day.skipped) { recentSkipDays += 1; continue; }
        break;
    }
    const records = days.flatMap((day) => day.events);
    /* T-1240：超额日（数值型完成量 ≥ 目标 150%）。戒除类的「超额」就是破戒，
        与 achievements 的方向守卫一致，不计入超额日。 */
    const overachievedDays = days.reduce((total, day) => {
        if (day.status !== "complete" || day.direction === "atMost") return total;
        const progress = day.events.filter((event) => !isSkipEvent(event)).reduce((sum, event) => sum + event.value, 0);
        const target = day.target > 0 ? day.target * 1.5 : Number.POSITIVE_INFINITY;
        return total + (day.kind !== "binary" && progress >= target ? 1 : 0);
    }, 0);
    /* T-1241：成熟度 sigmoid——66 天参考线为半程（习惯养成的常用参考周期）。 */
    const eligibleDays = countsForDays(days).eligibleScheduledDays;
    const maturity = eligibleDays > 0 ? Math.round((1 / (1 + Math.exp(-0.2 * (eligibleDays - 33)))) * 1000) / 10 : 0;
    /* T-1227：30 天强度分数——与回顾页强度曲线共用 habit-score 单一实现。 */
    let strengthScore: number | null = null;
    let strengthDelta: number | null = null;
    if (item) {
        const revision = getItemRevisionForDate(item, end);
        const series = buildHabitScoreSeries(
            collectHabitScoreDays(store, item, dateKey(shiftDay(end, -29)), dateKey(shiftDay(end, 1))),
            scheduleFrequency(revision.schedule),
        );
        if (series.length) {
            strengthScore = series[series.length - 1].score;
            strengthDelta = Math.round((strengthScore - series[Math.max(0, series.length - 15)].score) * 10) / 10;
        }
    }
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
        recentSkipDays,
        maturity,
        overachievedDays,
        strengthScore,
        strengthDelta,
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
    for (const event of getEventsForItem(store, itemId)) {
        if (deletedIds.has(event.id)) continue;
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

function isQuotaOpportunityDay(schedule: CheckinSchedule, date: Date, asOfKey: string): boolean {
    const periodKey = periodKeyForSchedule(schedule, date);
    const asOfPeriod = periodKeyForSchedule(schedule, new Date(`${asOfKey}T12:00:00`));
    if (periodKey === asOfPeriod) return dateKey(date) === asOfKey;
    if (schedule.quota?.period === "week") return date.getDay() === ((schedule.quota.weekStartsOn || 1) + 6) % 7;
    return date.getDate() === new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function localCalendarDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function parseDateKeyToLocal(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
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
