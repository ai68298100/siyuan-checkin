import type {CheckinEvent, CheckinItem, CheckinSchedule} from "./types";

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
    const key = localDateKey(date);
    const created = item.createdDate || localDateKey(new Date(item.createdAt));
    if (created > key || (item.archivePeriods || []).some((period) => period.startDate <= key && (!period.endDate || key < period.endDate))) return "unavailable";
    return isScheduled(item.schedule, date) ? "scheduled" : "off";
}

export function isScheduled(schedule: CheckinSchedule, date: Date): boolean {
    if (schedule.type === "daily") return true;
    if (schedule.type === "workdays") return date.getDay() >= 1 && date.getDay() <= 5;
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

/** Evaluate one item's current period using only immutable item and event data. */
export function evaluateRule(item: CheckinItem, events: readonly CheckinEvent[], date: Date): RuleProgress {
    const status = getRuleStatus(item, date);
    const revision = [...(item.revisions || [])].sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate)).reverse().find((candidate) => candidate.effectiveDate <= localDateKey(date));
    const target = revision?.target ?? item.target;
    const unit = revision?.unit ?? item.unit;
    const periodKey = periodKeyForSchedule(revision?.schedule ?? item.schedule, date);
    const progress = status === "scheduled" ? events.filter((event) => event.itemId === item.id && event.unit === unit && localDateKey(new Date(event.localDate || event.occurredAt)) === localDateKey(date)).reduce((total, event) => total + event.value, 0) : 0;
    const complete = status === "scheduled" && progress >= target;
    return {status, periodKey, target, progress, complete, unit, remaining: status === "scheduled" ? Math.max(0, target - progress) : undefined};
}

export function periodKeyForSchedule(schedule: CheckinSchedule, date: Date): string {
    if (schedule.type === "daily") return localDateKey(date);
    if (schedule.type === "weekly" || schedule.type === "workdays") return weekKey(date);
    return monthKey(date);
}
