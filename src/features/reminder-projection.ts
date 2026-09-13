export type ReminderStatus = "pending" | "completed" | "skipped" | "snoozed" | "overdue";
export type ReminderSource = "occasion" | "schedule";
export interface ReminderProjection { id: string; source: ReminderSource; dueDate: string; title: string; status: ReminderStatus; urgency: number; }

export function reminderId(source: ReminderSource, ref: string, dueDate: string): string { return `${source}:${ref}:${dueDate}`; }
export function sortReminders(items: readonly ReminderProjection[]): ReminderProjection[] {
    return [...items].sort((a, b) => (a.status === "completed" ? 1 : 0) - (b.status === "completed" ? 1 : 0) || a.urgency - b.urgency || a.dueDate.localeCompare(b.dueDate) || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
}
export function transitionReminder(item: ReminderProjection, status: ReminderStatus): ReminderProjection { return item.status === "completed" ? item : {...item, status}; }
