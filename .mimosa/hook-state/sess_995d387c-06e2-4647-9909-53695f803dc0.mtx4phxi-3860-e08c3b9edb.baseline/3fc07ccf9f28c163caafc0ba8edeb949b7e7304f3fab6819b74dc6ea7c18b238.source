import type {CheckinQuota, CheckinSchedule} from "./types";

export function normalizeQuota(value: unknown): CheckinQuota | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Record<string, unknown>;
    const period = candidate.period === "week" || candidate.period === "month" ? candidate.period : undefined;
    const countMode = candidate.countMode === "dates" || candidate.countMode === "value" ? candidate.countMode : undefined;
    const amount = Number(candidate.amount);
    if (!period || !countMode || !Number.isFinite(amount) || amount <= 0) return undefined;
    return {period, amount: Math.round(amount * 100) / 100, countMode, ...(period === "week" ? {weekStartsOn: 1 as const} : {})};
}

export function normalizeQuotaSchedule(value: unknown): CheckinSchedule | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Record<string, unknown>;
    if (candidate.type !== "quota") return undefined;
    const quota = normalizeQuota(candidate.quota);
    return quota ? {type: "quota", quota} : undefined;
}
