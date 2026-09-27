/* T-1513 单项目未来 30 天排期预演——纯函数投影（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 B）：
   - 只读使用编辑器当前草稿：改草稿即时重算且绝不落库，不写入任何事件/排期；
   - 与 src/rules.ts 的 isScheduled 同一口径（daily/workdays/weekly/custom 按
     星期、interval 按锚点+间隔、quota 恒为灵活应做）；不新增第二套排期语义；
   - 配额只展示周期窗口与剩余次数——窗口内不编造固定执行日；
   - 非法草稿 fail-closed：显示错误原因，绝不静默回落默认排期。 */
import type {QuotaPeriod, ScheduleType} from "../types";

export interface SchedulePreviewDraft {
    type: ScheduleType;
    weekdays?: number[];
    intervalDays?: number;
    anchorDate?: string;
    quota?: {period: QuotaPeriod; amount: number; countMode: "dates" | "value"};
}

export interface SchedulePreviewDay {
    date: string;
    /** 应做日（quota 的灵活应做也算 scheduled）。 */
    scheduled: boolean;
    /** 应做/休息原因 i18n 键（editor.scheduleReason.*）。 */
    reasonKey: string;
    reasonParams?: Record<string, string | number>;
}

export interface SchedulePreviewQuotaWindow {
    period: QuotaPeriod;
    startDate: string;
    endDate: string;
    amount: number;
    countMode: "dates" | "value";
    /** 剩余次数：当期窗口扣减已用量；未来窗口无事件可扣，即等于 amount。 */
    remaining: number;
}

export interface SchedulePreviewResult {
    days: SchedulePreviewDay[];
    quotaWindows: SchedulePreviewQuotaWindow[];
    /** 非法草稿原因 i18n 键：days/quotaWindows 为空，显示错误而非回落默认排期。 */
    invalidReasonKey?: string;
}

const REASON_DAILY = "editor.scheduleReason.daily";
const REASON_WORKDAYS = "editor.scheduleReason.workdays";
const REASON_WEEKDAY = "editor.scheduleReason.weekday";
const REASON_INTERVAL = "editor.scheduleReason.interval";
const REASON_QUOTA_FLEX = "editor.scheduleReason.quotaFlex";
const REASON_REST = "editor.scheduleReason.rest";
const INVALID = "editor.schedulePreviewInvalid";

const MAX_PREVIEW_DAYS = 30;

function isValidDateKey(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 && Number.isFinite(Date.UTC(year, month - 1, day));
}

function dateFromKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

function dayNumber(value: string): number {
    const [year, month, day] = value.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function addDays(value: string, amount: number): string {
    const date = dateFromKey(value);
    date.setDate(date.getDate() + amount);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizedWeekdays(weekdays: unknown): number[] | undefined {
    if (!Array.isArray(weekdays) || !weekdays.length) return undefined;
    const normalized = weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    return normalized.length === weekdays.length ? [...new Set(normalized)].sort((left, right) => left - right) : undefined;
}

function quotaWindow(period: QuotaPeriod, dateKey: string): {startDate: string; endDate: string} {
    if (period === "week") {
        const anchor = dateFromKey(dateKey);
        const start = addDays(dateKey, -((anchor.getDay() + 6) % 7));
        return {startDate: start, endDate: addDays(start, 6)};
    }
    const startDate = `${dateKey.slice(0, 7)}-01`;
    const [year, month] = dateKey.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {startDate, endDate: `${dateKey.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`};
}

/** 未来排期预演：从 startDate 起逐日投影（含 startDate，默认 30 天，有界）。 */
export function buildSchedulePreview(draft: SchedulePreviewDraft, startDate: string, options: {days?: number; quotaCurrentCount?: number} = {}): SchedulePreviewResult {
    const days = Math.max(1, Math.min(MAX_PREVIEW_DAYS, Math.floor(options.days ?? MAX_PREVIEW_DAYS) || MAX_PREVIEW_DAYS));
    if (!draft || typeof draft !== "object" || !isValidDateKey(startDate)) return {days: [], quotaWindows: [], invalidReasonKey: INVALID};
    const type = draft.type;
    const weekdayList = type === "weekly" || type === "custom" ? normalizedWeekdays(draft.weekdays) : undefined;
    if ((type === "weekly" || type === "custom") && !weekdayList) return {days: [], quotaWindows: [], invalidReasonKey: INVALID};
    let intervalDays: number | undefined;
    if (type === "interval") {
        intervalDays = typeof draft.intervalDays === "number" && Number.isInteger(draft.intervalDays) && draft.intervalDays >= 1 && draft.intervalDays <= 3650 ? draft.intervalDays : undefined;
        if (intervalDays === undefined || !isValidDateKey(draft.anchorDate)) return {days: [], quotaWindows: [], invalidReasonKey: INVALID};
    }
    let quota: (typeof draft)["quota"];
    if (type === "quota") {
        const candidate = draft.quota;
        const amountValid = candidate && Number.isInteger(candidate.amount) && candidate.amount >= 1 && candidate.amount <= 366;
        if (!amountValid || (candidate!.period !== "week" && candidate!.period !== "month") || (candidate!.countMode !== "dates" && candidate!.countMode !== "value")) {
            return {days: [], quotaWindows: [], invalidReasonKey: INVALID};
        }
        quota = candidate;
    }
    const anchorNumber = type === "interval" ? dayNumber(draft.anchorDate as string) : 0;
    const quotaCurrent = typeof options.quotaCurrentCount === "number" && Number.isFinite(options.quotaCurrentCount) && options.quotaCurrentCount >= 0 ? Math.floor(options.quotaCurrentCount) : 0;
    const previewDays: SchedulePreviewDay[] = [];
    for (let index = 0; index < days; index += 1) {
        const dateKey = addDays(startDate, index);
        const weekday = dateFromKey(dateKey).getDay();
        let scheduled = false;
        let reasonKey = REASON_REST;
        let reasonParams: Record<string, string | number> | undefined;
        if (type === "daily") {
            scheduled = true;
            reasonKey = REASON_DAILY;
        } else if (type === "workdays") {
            scheduled = weekday >= 1 && weekday <= 5;
            reasonKey = scheduled ? REASON_WORKDAYS : REASON_REST;
        } else if (type === "weekly" || type === "custom") {
            scheduled = (weekdayList as number[]).includes(weekday);
            reasonKey = scheduled ? REASON_WEEKDAY : REASON_REST;
            if (scheduled) reasonParams = {days: (weekdayList as number[]).map((day) => `${day}`).join(",")};
        } else if (type === "interval") {
            const difference = dayNumber(dateKey) - anchorNumber;
            scheduled = difference >= 0 && difference % (intervalDays as number) === 0;
            reasonKey = scheduled ? REASON_INTERVAL : REASON_REST;
            reasonParams = {n: intervalDays as number};
        } else {
            /* quota：灵活应做——窗口内任意日都可完成，不编造固定执行日。 */
            scheduled = true;
            reasonKey = REASON_QUOTA_FLEX;
        }
        previewDays.push({date: dateKey, scheduled, reasonKey, ...(reasonParams ? {reasonParams} : {})});
    }
    const quotaWindows: SchedulePreviewQuotaWindow[] = [];
    if (type === "quota" && quota) {
        let cursor = startDate;
        const lastDate = addDays(startDate, days - 1);
        let guard = 0;
        while (guard < 10) {
            guard += 1;
            const bounds = quotaWindow(quota.period, cursor);
            const endDate = bounds.endDate < lastDate ? bounds.endDate : lastDate;
            const isCurrentWindow = bounds.startDate <= startDate && startDate <= bounds.endDate;
            quotaWindows.push({
                period: quota.period,
                startDate: bounds.startDate,
                endDate,
                amount: quota.amount,
                countMode: quota.countMode,
                remaining: Math.max(0, quota.amount - (isCurrentWindow ? quotaCurrent : 0)),
            });
            if (bounds.endDate >= lastDate) break;
            cursor = addDays(bounds.endDate, 1);
        }
    }
    return {days: previewDays, quotaWindows};
}
