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

export function getReminderPriority(items: readonly ReminderProjection[]): {count: number; first?: ReminderProjection} {
    const pending = sortReminders(items.filter((item) => item.status === "overdue" || item.status === "pending"));
    return {count: pending.length, first: pending[0]};
}

export function reminderStatusLabel(status: ReminderStatus): string { return ({pending: "待处理", completed: "已完成", skipped: "已跳过", snoozed: "已延期", overdue: "已逾期"} as Record<ReminderStatus, string>)[status]; }
export function reminderPriorityText(summary: {count: number; first?: ReminderProjection}): string { return summary.count ? (summary.first?.status === "overdue" ? `有 ${summary.count} 项逾期提醒` : `有 ${summary.count} 项待处理提醒`) : "暂无待处理提醒"; }
export type ReminderPriority = "urgent" | "today" | "upcoming";
export function reminderPriority(item: ReminderProjection, today: string): ReminderPriority { if (item.status === "overdue" || item.dueDate < today) return "urgent"; if (item.dueDate === today) return "today"; return "upcoming"; }
export function reminderPriorityLabel(priority: ReminderPriority): string { return ({urgent: "紧急", today: "今天", upcoming: "即将到期"} as Record<ReminderPriority, string>)[priority]; }
export function mergeReminders(...lists: ReadonlyArray<readonly ReminderProjection[]>): ReminderProjection[] {
    const byId = new Map<string, ReminderProjection>();
    lists.flat().forEach((item) => { const existing = byId.get(item.id); byId.set(item.id, existing?.status === "completed" ? existing : item); });
    return sortReminders([...byId.values()]);
}
export function serializeReminders(items: readonly ReminderProjection[]): string { return JSON.stringify(sortReminders(items).map(({id, source, dueDate, title, status, urgency}) => ({id, source, dueDate, title, status, urgency}))); }
export function deserializeReminders(value: string): ReminderProjection[] { try { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) return []; const valid = parsed.filter((item): item is ReminderProjection => Boolean(item && typeof item.id === "string" && (item.source === "occasion" || item.source === "schedule") && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) && typeof item.title === "string" && item.title.length <= 200 && ["pending", "completed", "skipped", "snoozed", "overdue"].includes(item.status) && typeof item.urgency === "number")); return mergeReminders(valid); } catch { return []; } }
export const REMINDER_SNAPSHOT_VERSION = 1;
export function serializeReminderSnapshot(items: readonly ReminderProjection[]): string { return JSON.stringify({version: REMINDER_SNAPSHOT_VERSION, reminders: JSON.parse(serializeReminders(items))}); }
export function deserializeReminderSnapshot(value: string): ReminderProjection[] { try { const parsed = JSON.parse(value); return parsed?.version === REMINDER_SNAPSHOT_VERSION ? deserializeReminders(JSON.stringify(parsed.reminders)) : []; } catch { return []; } }
export function reminderSnapshotSummary(items: readonly ReminderProjection[], today: string): {total: number; overdue: number; today: number; completed: number} { return {total: items.length, overdue: items.filter((item) => reminderPriority(item, today) === "urgent").length, today: items.filter((item) => reminderPriority(item, today) === "today").length, completed: items.filter((item) => item.status === "completed").length}; }
export function formatReminderSnapshotSummary(summary: {total: number; overdue: number; today: number; completed: number}): string { return `共 ${summary.total} 项提醒 · 今日 ${summary.today} 项 · 逾期 ${summary.overdue} 项 · 已完成 ${summary.completed} 项`; }
export function deserializeReminderSnapshotCompatible(value: string): ReminderProjection[] { try { const parsed = JSON.parse(value); if (!parsed || typeof parsed !== "object" || typeof parsed.version !== "number" || parsed.version > REMINDER_SNAPSHOT_VERSION) return []; return deserializeReminders(JSON.stringify(parsed.reminders)); } catch { return []; } }
export function migrateReminderSnapshot(value: string): string { const reminders = deserializeReminderSnapshotCompatible(value); return serializeReminderSnapshot(reminders); }
export interface ReminderMigrationReport { sourceVersion: number | null; targetVersion: number; reminderCount: number; changed: boolean; }
export function assessReminderMigration(value: string): ReminderMigrationReport { try { const parsed = JSON.parse(value); const reminders = deserializeReminderSnapshotCompatible(value); const sourceVersion = typeof parsed?.version === "number" ? parsed.version : null; return {sourceVersion, targetVersion: REMINDER_SNAPSHOT_VERSION, reminderCount: reminders.length, changed: sourceVersion !== REMINDER_SNAPSHOT_VERSION || serializeReminderSnapshot(reminders) !== value}; } catch { return {sourceVersion: null, targetVersion: REMINDER_SNAPSHOT_VERSION, reminderCount: 0, changed: true}; } }
export function formatReminderMigrationReport(report: ReminderMigrationReport): string { const source = report.sourceVersion === null ? "未知" : String(report.sourceVersion); return `提醒迁移：版本 ${source} → ${report.targetVersion} · ${report.reminderCount} 项${report.changed ? " · 需要更新" : " · 已是最新"}`; }
