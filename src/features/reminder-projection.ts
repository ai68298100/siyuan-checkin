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
export function serializeReminderMigrationReport(report: ReminderMigrationReport): string { return JSON.stringify({version: 1, report}); }
export function deserializeReminderMigrationReport(value: string): ReminderMigrationReport | null { try { const parsed = JSON.parse(value); const report = parsed?.report; return parsed?.version === 1 && report && typeof report.targetVersion === "number" && typeof report.reminderCount === "number" && typeof report.changed === "boolean" ? {sourceVersion: typeof report.sourceVersion === "number" ? report.sourceVersion : null, targetVersion: report.targetVersion, reminderCount: report.reminderCount, changed: report.changed} : null; } catch { return null; } }
export function validateReminderMigrationReport(report: ReminderMigrationReport): boolean { return Number.isInteger(report.targetVersion) && report.targetVersion >= 1 && Number.isInteger(report.reminderCount) && report.reminderCount >= 0 && typeof report.changed === "boolean" && (report.sourceVersion === null || (Number.isInteger(report.sourceVersion) && report.sourceVersion >= 1)); }
export function assessReminderMigrationRisk(report: ReminderMigrationReport): "none" | "review" { if (!validateReminderMigrationReport(report)) return "review"; return report.changed || report.reminderCount === 0 || report.sourceVersion === null || report.sourceVersion !== report.targetVersion ? "review" : "none"; }
export function reminderMigrationRiskReason(report: ReminderMigrationReport): string { if (!validateReminderMigrationReport(report)) return "迁移报告字段无效，需要重新生成。"; if (report.sourceVersion === null) return "缺少源版本信息，需要确认数据来源。"; if (report.sourceVersion !== report.targetVersion) return `版本 ${report.sourceVersion} 将升级到 ${report.targetVersion}。`; if (report.reminderCount === 0) return "快照中没有提醒条目，请确认是否为空数据。"; if (report.changed) return "快照内容将被规范化，需要确认变更。"; return "无需额外复核。"; }
export function formatReminderMigrationDiagnostic(report: ReminderMigrationReport): string { const risk = assessReminderMigrationRisk(report); return `${formatReminderMigrationReport(report)} · 风险：${risk === "review" ? "需复核" : "无"} · ${reminderMigrationRiskReason(report)}`; }
export function reminderMigrationDelta(beforeCount: number, report: ReminderMigrationReport): number { return report.reminderCount - Math.max(0, Math.floor(beforeCount)); }
export function formatReminderMigrationDelta(delta: number): string { return delta > 0 ? `增加 ${delta} 项提醒` : delta < 0 ? `减少 ${Math.abs(delta)} 项提醒` : "提醒数量未变化"; }
export function formatReminderMigrationImpact(beforeCount: number, report: ReminderMigrationReport): string { const delta = reminderMigrationDelta(beforeCount, report); const risk = assessReminderMigrationRisk(report) === "review" ? "需复核" : "无风险"; return `${formatReminderMigrationDelta(delta)} · ${risk} · ${reminderMigrationRiskReason(report)}`; }
export interface ReminderMigrationImpact { delta: number; risk: "none" | "review"; reason: string; }
export function summarizeReminderMigrationImpact(beforeCount: number, report: ReminderMigrationReport): ReminderMigrationImpact { return {delta: reminderMigrationDelta(beforeCount, report), risk: assessReminderMigrationRisk(report), reason: reminderMigrationRiskReason(report)}; }
export function serializeReminderMigrationImpact(impact: ReminderMigrationImpact): string { return JSON.stringify({version: 1, impact}); }
export function deserializeReminderMigrationImpact(value: string): ReminderMigrationImpact | null { try { const parsed = JSON.parse(value); const impact = parsed?.impact; return parsed?.version === 1 && impact && Number.isInteger(impact.delta) && (impact.risk === "none" || impact.risk === "review") && typeof impact.reason === "string" ? {delta: impact.delta, risk: impact.risk, reason: impact.reason.slice(0, 300)} : null; } catch { return null; } }
export function deserializeReminderMigrationImpactCompatible(value: string): ReminderMigrationImpact | null { try { const parsed = JSON.parse(value); if (!parsed || typeof parsed.version !== "number" || parsed.version > 1) return null; return deserializeReminderMigrationImpact(JSON.stringify({version: 1, impact: parsed.impact})); } catch { return null; } }
export function migrateReminderMigrationImpact(value: string): string { const impact = deserializeReminderMigrationImpactCompatible(value); return serializeReminderMigrationImpact(impact || {delta: 0, risk: "review", reason: "迁移影响摘要无效，需要重新评估。"}); }
export function canAutoApplyReminderMigration(impact: ReminderMigrationImpact): boolean { return impact.risk === "none" && impact.delta >= 0; }
export function reminderMigrationDecisionText(impact: ReminderMigrationImpact): string { return canAutoApplyReminderMigration(impact) ? "此迁移可安全自动应用。" : impact.delta < 0 ? "提醒数量将减少，需要你确认后再继续。" : `当前风险为${impact.risk === "review" ? "需复核" : "未知"}，请确认后再继续。`; }
export interface ReminderMigrationDecision { canAutoApply: boolean; risk: "none" | "review"; delta: number; message: string; }
export function evaluateReminderMigration(impact: ReminderMigrationImpact): ReminderMigrationDecision { return {canAutoApply: canAutoApplyReminderMigration(impact), risk: impact.risk, delta: impact.delta, message: reminderMigrationDecisionText(impact)}; }
export function serializeReminderMigrationDecision(decision: ReminderMigrationDecision): string { return JSON.stringify({version: 1, decision}); }
export function deserializeReminderMigrationDecision(value: string): ReminderMigrationDecision | null { try { const parsed = JSON.parse(value); const d = parsed?.decision; return parsed?.version === 1 && d && typeof d.canAutoApply === "boolean" && (d.risk === "none" || d.risk === "review") && Number.isInteger(d.delta) && typeof d.message === "string" ? {canAutoApply: d.canAutoApply, risk: d.risk, delta: d.delta, message: d.message.slice(0, 300)} : null; } catch { return null; } }
export function serializeReminderMigrationDiagnostic(report: ReminderMigrationReport): string { return JSON.stringify({version: 1, report, risk: assessReminderMigrationRisk(report), reason: reminderMigrationRiskReason(report)}); }
export function deserializeReminderMigrationDiagnostic(value: string): {report: ReminderMigrationReport; risk: "none" | "review"; reason: string} | null { try { const parsed = JSON.parse(value); const report = parsed?.report; if (parsed?.version !== 1 || !report || (parsed.risk !== "none" && parsed.risk !== "review") || typeof parsed.reason !== "string") return null; if (!validateReminderMigrationReport(report)) return null; const risk = assessReminderMigrationRisk(report); const reason = reminderMigrationRiskReason(report); if (parsed.risk !== risk || parsed.reason !== reason) return null; return {report, risk, reason: reason.slice(0, 300)}; } catch { return null; } }
