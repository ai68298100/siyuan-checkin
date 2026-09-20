/* T-1360/T-1359 共用的排期结构校验：建议执行白名单与项目草案同源单一实现。
   白名单纪律——非法排期返回 undefined，由调用方 fail-closed 处理。 */

import type {CheckinSchedule, ScheduleType} from "../types";

const SCHEDULE_TYPES = new Set<ScheduleType>(["daily", "weekly", "workdays", "custom", "interval", "quota"]);

export function normalizeSuggestionSchedule(value: unknown): CheckinSchedule | undefined {
    if (!value || typeof value !== "object") return undefined;
    const source = value as Record<string, unknown>;
    if (typeof source.type !== "string" || !SCHEDULE_TYPES.has(source.type as ScheduleType)) return undefined;
    const schedule: CheckinSchedule = {type: source.type as ScheduleType};
    if (Array.isArray(source.weekdays)) {
        const weekdays = [...new Set(source.weekdays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort((left, right) => left - right);
        if (weekdays.length) schedule.weekdays = weekdays;
    }
    if (Number.isFinite(source.intervalDays) && (source.intervalDays as number) >= 1) schedule.intervalDays = Math.floor(source.intervalDays as number);
    if (typeof source.anchorDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(source.anchorDate)) schedule.anchorDate = source.anchorDate;
    if (source.quota && typeof source.quota === "object") {
        const quota = source.quota as Record<string, unknown>;
        if ((quota.period === "week" || quota.period === "month") && (quota.countMode === "dates" || quota.countMode === "value") && Number.isFinite(quota.amount) && (quota.amount as number) > 0) {
            schedule.quota = {period: quota.period as "week" | "month", countMode: quota.countMode as "dates" | "value", amount: Number(quota.amount)};
        }
    }
    if (schedule.type === "weekly" && !schedule.weekdays?.length) return undefined;
    if (schedule.type === "interval" && !schedule.intervalDays) return undefined;
    if (schedule.type === "quota" && !schedule.quota) return undefined;
    return schedule;
}
