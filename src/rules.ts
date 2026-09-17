import type {CheckinEvent, CheckinItem, CheckinItemRevision, CheckinSchedule} from "./types";

const orderedRevisionCache = new WeakMap<CheckinItemRevision[], readonly CheckinItemRevision[]>();

function cloneSchedule(schedule: CheckinSchedule): CheckinSchedule {
    return {...schedule, weekdays: schedule.weekdays ? [...schedule.weekdays] : undefined, ...(schedule.quota ? {quota: {...schedule.quota}} : {})};
}

function getOrderedItemRevisions(item: CheckinItem): readonly CheckinItemRevision[] {
    const revisions = item.revisions || [];
    const cached = orderedRevisionCache.get(revisions);
    if (cached) return cached;
    let ordered: readonly CheckinItemRevision[] = revisions;
    for (let index = 1; index < revisions.length; index += 1) {
        if (revisions[index - 1].effectiveDate <= revisions[index].effectiveDate) continue;
        ordered = [...revisions].sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
        break;
    }
    orderedRevisionCache.set(revisions, ordered);
    return ordered;
}

/** Resolve the effective item revision through a cached, ordered projection. */
export function getItemRevisionForDate(item: CheckinItem, date = new Date()): CheckinItemRevision {
    const key = localDateKey(date);
    const revisions = getOrderedItemRevisions(item);
    let low = 0;
    let high = revisions.length;
    while (low < high) {
        const middle = (low + high) >>> 1;
        if (revisions[middle].effectiveDate <= key) low = middle + 1;
        else high = middle;
    }
    const revision = low > 0 ? revisions[low - 1] : undefined;
    return revision ? {...revision, schedule: cloneSchedule(revision.schedule)} : {
        effectiveDate: /^\d{4}-\d{2}-\d{2}$/.test(item.createdDate) ? item.createdDate : key,
        kind: item.kind,
        target: item.target,
        unit: item.unit,
        schedule: cloneSchedule(item.schedule),
    };
}

export type RuleStatus = "scheduled" | "off" | "unavailable";

export interface RuleWindow {
    status: RuleStatus;
    periodKey: string;
    remaining?: number;
}

export interface RuleProgress extends RuleWindow {
    target: number;
    progress: number;
    complete: boolean;
    unit: string;
}

/** Pure schedule helpers kept separate so UI and future insights share one contract. */
export function getRuleStatus(item: CheckinItem, date: Date): RuleStatus {
    return getRuleStatusForRevision(item, date, getItemRevisionForDate(item, date));
}

function getRuleStatusForRevision(item: CheckinItem, date: Date, revision: ReturnType<typeof getItemRevisionForDate>): RuleStatus {
    const key = localDateKey(date);
    const created = item.createdDate || localDateKey(new Date(item.createdAt));
    if (created > key || (item.archivePeriods || []).some((period) => period.startDate <= key && (!period.endDate || key < period.endDate))) return "unavailable";
    return isScheduled(revision.schedule, date, revision.effectiveDate) ? "scheduled" : "off";
}

export type QuotaPeriod = "week" | "month";

export interface PeriodQuotaRule {
    period: QuotaPeriod;
    quota: number;
    /** Count at most one qualifying completion per local date. */
    distinctDates?: boolean;
}

export interface PeriodQuotaProgress {
    period: QuotaPeriod;
    periodKey: string;
    startDate: string;
    endDate: string;
    quota: number;
    progress: number;
    remaining: number;
    complete: boolean;
    contributingDates: string[];
}

export interface QuotaPeriodBounds {
    periodKey: string;
    startDate: string;
    endDate: string;
}

export function isScheduled(schedule: CheckinSchedule, date: Date, fallbackAnchorDate?: string): boolean {
    if (schedule.type === "daily") return true;
    if (schedule.type === "workdays") return date.getDay() >= 1 && date.getDay() <= 5;
    if (schedule.type === "quota") return Boolean(schedule.quota);
    if (schedule.type === "interval") {
        const anchorDate = schedule.anchorDate || fallbackAnchorDate;
        if (!anchorDate) return false;
        const difference = calendarDayNumber(localDateKey(date)) - calendarDayNumber(anchorDate);
        return difference >= 0 && difference % (schedule.intervalDays || 1) === 0;
    }
    return (schedule.weekdays || []).includes(date.getDay());
}

export function localDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekKey(date: Date): string {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
    copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
    return localDateKey(copy);
}

export function monthKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }

function calendarDayNumber(key: string): number {
    const [year, month, day] = key.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/** Evaluate one item's current period using only immutable item and event data. */
export function evaluateRule(item: CheckinItem, events: readonly CheckinEvent[], date: Date): RuleProgress {
    const revision = getItemRevisionForDate(item, date);
    const status = getRuleStatusForRevision(item, date, revision);
    const target = revision.target;
    const unit = revision.unit;
    const schedule = revision.schedule;
    const periodKey = periodKeyForSchedule(schedule, date);
    const quotaProgress = status === "scheduled" ? evaluateQuotaSchedule(schedule, events, item.id, date, schedule.type === "quota" && schedule.quota?.countMode === "value" ? unit : undefined) : undefined;
    const progress = quotaProgress?.progress ?? (status === "scheduled" ? events.filter((event) => event.itemId === item.id && event.unit === unit && localDateKey(new Date(event.localDate || event.occurredAt)) === localDateKey(date)).reduce((total, event) => total + event.value, 0) : 0);
    const effectiveTarget = quotaProgress?.quota ?? target;
    const complete = status === "scheduled" && progress >= effectiveTarget && effectiveTarget > 0;
    return {status, periodKey, target: effectiveTarget, progress, complete, unit, remaining: status === "scheduled" ? Math.max(0, effectiveTarget - progress) : undefined};
}

export function periodKeyForSchedule(schedule: CheckinSchedule, date: Date): string {
    if (schedule.type === "daily" || schedule.type === "interval") return localDateKey(date);
    if (schedule.type === "weekly" || schedule.type === "workdays") return weekKey(date);
    if (schedule.type === "quota") return schedule.quota?.period === "week" ? weekKey(date) : monthKey(date);
    return monthKey(date);
}

/** Evaluate a persisted quota schedule using the same result shape as the legacy helper. */
export function evaluateQuotaSchedule(schedule: CheckinSchedule, events: readonly CheckinEvent[], itemId: string, date: Date, unit?: string): PeriodQuotaProgress | undefined {
    if (schedule.type !== "quota" || !schedule.quota) return undefined;
    const quota = schedule.quota;
    return evaluatePeriodQuota({
        period: quota.period,
        quota: quota.amount,
        distinctDates: quota.countMode === "dates",
    }, events, itemId, date, unit);
}

/** Evaluate a future weekly/monthly quota without changing persisted schedule types. */
export function evaluatePeriodQuota(rule: PeriodQuotaRule, events: readonly CheckinEvent[], itemId: string, date: Date, unit?: string): PeriodQuotaProgress {
    const bounds = getQuotaPeriodBounds(rule.period, date);
    const {periodKey, startDate, endDate} = bounds;
    const candidates = events
        .filter((event) => event.itemId === itemId && (!unit || event.unit === unit))
        .map((event) => ({event, date: eventDateKey(event)}))
        .filter((entry): entry is {event: CheckinEvent; date: string} => Boolean(entry.date))
        .filter((entry) => entry.date >= startDate && entry.date <= endDate)
        .sort((left, right) => left.date.localeCompare(right.date) || left.event.id.localeCompare(right.event.id));
    const contributingDates = [...new Set(candidates.map((entry) => entry.date))];
    const progress = rule.distinctDates ? contributingDates.length : candidates.reduce((total, entry) => total + entry.event.value, 0);
    const quota = Number.isFinite(rule.quota) && rule.quota > 0 ? rule.quota : 0;
    return {period: rule.period, periodKey, startDate, endDate, quota, progress, remaining: Math.max(0, quota - progress), complete: quota > 0 && progress >= quota, contributingDates};
}

export function getQuotaPeriodBounds(period: QuotaPeriod, date: Date): QuotaPeriodBounds {
    const periodKey = period === "week" ? weekKey(date) : monthKey(date);
    const startDate = period === "week" ? periodKey : `${periodKey}-01`;
    const endDate = period === "week"
        ? localDateKey(addCalendarDays(dateFromKey(startDate), 6))
        : localDateKey(addCalendarDays(dateFromKey(startDate), daysInMonth(dateFromKey(startDate)) - 1));
    return {periodKey, startDate, endDate};
}

function eventDateKey(event: CheckinEvent): string | undefined {
    if (/^\d{4}-\d{2}-\d{2}$/.test(event.localDate)) return event.localDate;
    const occurredAt = new Date(event.occurredAt);
    return Number.isNaN(occurredAt.getTime()) ? undefined : localDateKey(occurredAt);
}

function dateFromKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

function addCalendarDays(date: Date, amount: number): Date {
    const result = dateFromKey(localDateKey(date));
    result.setDate(result.getDate() + amount);
    return result;
}

function daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
