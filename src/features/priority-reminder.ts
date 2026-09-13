import type {ReminderEntry, ReminderStatus} from "../reminders";

export interface PriorityReminderSummary {
    count: number;
    first?: ReminderEntry;
}

const PRIORITY_STATUSES: ReadonlySet<ReminderStatus> = new Set(["overdue", "today"]);

export function selectPriorityReminders(entries: readonly ReminderEntry[]): ReminderEntry[] {
    return entries.filter((entry) => PRIORITY_STATUSES.has(entry.status)).slice().sort((left, right) => {
        const rank = (status: ReminderStatus) => status === "overdue" ? 0 : status === "today" ? 1 : 2;
        return rank(left.status) - rank(right.status) || left.daysUntil - right.daysUntil || left.title.localeCompare(right.title, "zh-CN") || left.id.localeCompare(right.id);
    });
}

export function summarizePriorityReminders(entries: readonly ReminderEntry[]): PriorityReminderSummary {
    const selected = selectPriorityReminders(entries);
    return {count: selected.length, ...(selected[0] ? {first: {...selected[0]}} : {})};
}

export function priorityReminderStatus(entry: ReminderEntry | undefined): "overdue" | "today" | "none" {
    if (!entry) return "none";
    if (entry.status === "overdue" || entry.status === "today") return entry.status;
    return "none";
}
