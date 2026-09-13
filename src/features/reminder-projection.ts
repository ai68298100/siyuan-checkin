export type ReminderStatus = "pending" | "completed" | "skipped" | "snoozed" | "overdue";
export type ReminderSource = "occasion" | "schedule";
export interface ReminderProjection { id: string; source: ReminderSource; dueDate: string; title: string; status: ReminderStatus; urgency: number; }

export function reminderId(source: ReminderSource, ref: string, dueDate: string): string { return `${source}:${ref}:${dueDate}`; }
export function sortReminders(items: readonly ReminderProjection[]): ReminderProjection[] {
    return [...items].sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) || a.urgency - b.urgency || a.dueDate.localeCompare(b.dueDate) || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
}
export function transitionReminder(item: ReminderProjection, status: ReminderStatus): ReminderProjection { return item.status === "completed" ? item : {...item, status}; }

export function projectOccasionReminder(id: string, title: string, dueDate: string, status: ReminderStatus = "pending"): ReminderProjection {
    return {id: reminderId("occasion", id, dueDate), source: "occasion", dueDate, title, status, urgency: status === "overdue" ? 0 : 1};
}

export function projectScheduleReminder(id: string, title: string, dueDate: string, status: ReminderStatus = "pending"): ReminderProjection {
    return {id: reminderId("schedule", id, dueDate), source: "schedule", dueDate, title, status, urgency: status === "overdue" ? 0 : 2};
}

export function filterReminders(items: readonly ReminderProjection[], options: {status?: ReminderStatus; source?: ReminderSource; from?: string; to?: string} = {}): ReminderProjection[] {
    return sortReminders(items.filter((item) => (!options.status || item.status === options.status) && (!options.source || item.source === options.source) && (!options.from || item.dueDate >= options.from) && (!options.to || item.dueDate <= options.to)));
}

export function summarizeReminders(items: readonly ReminderProjection[]): Record<ReminderStatus, number> {
    const summary: Record<ReminderStatus, number> = {pending: 0, completed: 0, skipped: 0, snoozed: 0, overdue: 0};
    items.forEach((item) => { summary[item.status] += 1; });
    return summary;
}

export function normalizeReminderStatus(item: ReminderProjection, today: string): ReminderProjection {
    if (item.status === "pending" && item.dueDate < today) return {...item, status: "overdue", urgency: 0};
    return item;
}

export function prepareReminders(items: readonly ReminderProjection[], today: string): ReminderProjection[] {
    return sortReminders(items.map((item) => normalizeReminderStatus(item, today)));
}
