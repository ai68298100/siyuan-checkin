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

/**
 * T-1225（D-217）：弹性配额自动补全——当期配额达成后，达成日之后的期内剩余日
 * 推导为 AUTO 候选（mhabit 滑动窗口法的等价实现）。只存在于计算层：不落事件、
 * 不通知、不推导到 asOf 之后。真实完成优先（有非跳过事件的日期不产出）；
 * SKIP 日不在本函数排除（消费者按跳过冻结处理，跳过优先于 AUTO）。
 * 窗口为包含式本地日期 [windowStart, windowEnd]；周期数超 400 有护栏。
 */
export function deriveQuotaAutoDays(
    schedule: CheckinSchedule,
    events: readonly CheckinEvent[],
    itemId: string,
    windowStart: string,
    windowEnd: string,
    options: {asOf?: string; unit?: string} = {},
): Set<string> {
    const auto = new Set<string>();
    if (schedule.type !== "quota" || !schedule.quota || !schedule.quota.amount || schedule.quota.amount <= 0) return auto;
    const start = windowStart;
    const end = windowEnd;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return auto;
    const asOf = options.asOf && /^\d{4}-\d{2}-\d{2}$/.test(options.asOf) ? options.asOf : end;
    const realDates = new Set<string>();
    for (const event of events) {
        if (event.itemId !== itemId || event.kind === "skip") continue;
        const key = eventDateKey(event);
        if (key) realDates.add(key);
    }
    const contributingEvents = events.filter((event) => event.itemId === itemId && event.kind !== "skip");
    let cursor = dateFromKey(start);
    let guard = 0;
    while (guard < 400) {
        guard += 1;
        const bounds = getQuotaPeriodBounds(schedule.quota.period, cursor);
        if (bounds.startDate > end) break;
        if (bounds.endDate >= start) {
            const progress = evaluateQuotaSchedule(schedule, contributingEvents, itemId, dateFromKey(bounds.startDate), options.unit);
            if (progress?.complete && progress.contributingDates.length) {
                /* 达成日：dates 模式 = 第 N 个贡献日；value 模式 = 累计值首次达到 N 的日期。 */
                let metDate: string | undefined;
                if (schedule.quota.countMode === "dates") {
                    metDate = progress.contributingDates[schedule.quota.amount - 1];
                } else {
                    const unit = options.unit;
                    const valueByDate = new Map<string, number>();
                    for (const ev of contributingEvents) {
                        if (unit && ev.unit !== unit) continue;
                        const dayKey = eventDateKey(ev);
                        if (dayKey) valueByDate.set(dayKey, (valueByDate.get(dayKey) || 0) + ev.value);
                    }
                    let cumulative = 0;
                    for (const dayKey of [...valueByDate.keys()].sort()) {
                        cumulative += valueByDate.get(dayKey) || 0;
                        if (cumulative >= schedule.quota.amount) { metDate = dayKey; break; }
                    }
                }
                if (metDate) {
                    const autoEnd = [bounds.endDate, end, asOf].reduce((left, right) => left < right ? left : right);
                    for (let candidate = addCalendarDays(dateFromKey(metDate), 1); localDateKey(candidate) <= autoEnd; candidate = addCalendarDays(candidate, 1)) {
                        const candidateKey = localDateKey(candidate);
                        if (candidateKey > autoEnd) break;
                        if (!realDates.has(candidateKey)) auto.add(candidateKey);
                    }
                }
            }
        }
        cursor = addCalendarDays(dateFromKey(bounds.endDate), 1);
    }
    return auto;
}

function addCalendarDays(date: Date, amount: number): Date {
    const result = dateFromKey(localDateKey(date));
    result.setDate(result.getDate() + amount);
    return result;
}

function daysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
