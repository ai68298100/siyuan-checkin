import type {CheckinTemplate,} from "../catalog";
import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot, UserTemplate} from "../types";

export function normalizeUserTemplate(value: unknown, now = new Date().toISOString()): UserTemplate | undefined {
    if (!value || typeof value !== "object") return undefined;
    const raw = value as Partial<UserTemplate>;
    const kind: CheckinKind = ["binary", "count", "duration", "quantity", "custom"].includes(raw.kind as string) ? raw.kind as CheckinKind : "binary";
    const priority: CheckinPriority = ["low", "medium", "high"].includes(raw.priority as string) ? raw.priority as CheckinPriority : "medium";
    const rawSchedule = raw.schedule && typeof raw.schedule === "object" ? raw.schedule : undefined;
    const rawQuota = rawSchedule?.quota;
    const quota = rawQuota && typeof rawQuota === "object" && (rawQuota.period === "week" || rawQuota.period === "month") && (rawQuota.countMode === "dates" || rawQuota.countMode === "value") && Number.isFinite(rawQuota.amount) && Number(rawQuota.amount) > 0 ? {...rawQuota, amount: Number(rawQuota.amount)} : undefined;
    const schedule: CheckinSchedule = rawSchedule ? (({quota: _ignoredQuota, ...scheduleWithoutQuota}) => ({...scheduleWithoutQuota, weekdays: rawSchedule.weekdays ? [...rawSchedule.weekdays] : undefined, ...(quota ? {quota} : {})}))(rawSchedule) : {type: "daily"};
    const id = String(raw.id || "").trim();
    const name = String(raw.name || "").trim();
    if (!id || !name) return undefined;
    const completionSource = raw.completionSource === "tomato" ? "tomato" as const : "manual" as const;
    const tomatoMode = raw.tomatoMode === "sessions" ? "sessions" as const : "minutes" as const;
    return {id, name, icon: String(raw.icon || "✓"), kind, target: Number.isFinite(raw.target) ? Math.max(0, Number(raw.target)) : 1, unit: String(raw.unit || "次"), schedule, group: String(raw.group || ""), priority, ...(raw.timeSlot ? {timeSlot: raw.timeSlot as CheckinTimeSlot} : {}), completionSource, tomatoMode, note: String(raw.note || ""), createdAt: String(raw.createdAt || now), updatedAt: String(raw.updatedAt || now)};
}

export function mergeTemplates(builtins: readonly CheckinTemplate[], users: readonly unknown[] = []): Array<CheckinTemplate | UserTemplate> {
    const result: Array<CheckinTemplate | UserTemplate> = [...builtins];
    for (const value of users) { const template = normalizeUserTemplate(value); if (template && !result.some((candidate) => "id" in candidate && candidate.id === template.id)) result.push(template); }
    return result;
}

export function upsertUserTemplate(users: readonly UserTemplate[], value: unknown): UserTemplate[] {
    const template = normalizeUserTemplate(value); if (!template) return users.map((entry) => ({...entry}));
    const index = users.findIndex((entry) => entry.id === template.id); const next = users.map((entry) => ({...entry}));
    if (index < 0) next.push(template); else next[index] = template; return next;
}

export function deleteUserTemplate(users: readonly UserTemplate[], id: string): UserTemplate[] { return users.filter((entry) => entry.id !== id).map((entry) => ({...entry})); }
