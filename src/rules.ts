import type {CheckinItem, CheckinSchedule} from "./types";

export type RuleStatus = "scheduled" | "off" | "unavailable";

export interface RuleWindow {
    status: RuleStatus;
    periodKey: string;
    remaining?: number;
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
