/* T-1515 全项目未来一周负荷预览——纯函数投影（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 B，复用 T-1513 排期投影）：
   - 只读预览：不写事件、不改排期、不做任何智能自动排程；
   - 计量分开：每行保留自身单位，不做任何单位换算（分钟只来自明确配置为
     时长单位的项目，绝不把次数/数量折算成分钟）；
   - 配额单列：灵活周期任务不重复摊派到每天，单独列出其周期与额度；
   - 归档项目不参与；排期草稿非法的项目如实排除（不伪造应做日）。 */
import {buildSchedulePreview, type SchedulePreviewDraft} from "./schedule-preview";
import {isValidDateKey} from "../date-keys";
import type {CheckinItem, CheckinKind, QuotaPeriod} from "../types";

export interface WeekLoadQuotaInfo {
    period: QuotaPeriod;
    amount: number;
    countMode: "dates" | "value";
}

export interface WeekLoadItem {
    itemId: string;
    name: string;
    kind: CheckinKind;
    unit: string;
    target: number;
    /** 未来 7 天逐日应做标记（quota 项目不产出逐日标记）。 */
    days: Array<{date: string; scheduled: boolean}>;
    /** 配额项目单列（与逐日项目互斥）。 */
    quota?: WeekLoadQuotaInfo;
}

export interface WeekLoadPreview {
    startDate: string;
    dates: string[];
    /** 未来 7 天有逐日应做的项目（含部分应做日），配额项目不在此列。 */
    items: WeekLoadItem[];
    /** 灵活周期任务单列。 */
    quotaItems: WeekLoadItem[];
    /** 排期非法被如实排除的项目数（不伪造应做日）。 */
    invalidCount: number;
}

const WINDOW_DAYS = 7;
const MAX_ITEMS = 30;

/** 未来一周负荷：从 startDate 起按日投影全部活跃项目的排期（含 startDate，7 天）。 */
export function buildWeekLoadPreview(items: readonly CheckinItem[], startDate: string): WeekLoadPreview {
    if (!isValidDateKey(startDate)) return {startDate, dates: [], items: [], quotaItems: [], invalidCount: 0};
    const dates = Array.from({length: WINDOW_DAYS}, (_, index) => {
        const date = new Date(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)) + index);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    });
    const result: WeekLoadPreview = {startDate, dates, items: [], quotaItems: [], invalidCount: 0};
    for (const item of items) {
        if (item.archived) continue;
        if (result.items.length + result.quotaItems.length >= MAX_ITEMS) break;
        const schedule = item.schedule as SchedulePreviewDraft;
        const isQuota = schedule?.type === "quota" && schedule.quota && Number.isInteger(schedule.quota.amount) && schedule.quota.amount >= 1;
        if (isQuota) {
            result.quotaItems.push({
                itemId: item.id,
                name: item.name,
                kind: item.kind,
                unit: item.unit,
                target: item.target,
                days: [],
                quota: {period: schedule.quota!.period, amount: schedule.quota!.amount, countMode: schedule.quota!.countMode},
            });
            continue;
        }
        const preview = buildSchedulePreview(schedule, startDate, {days: WINDOW_DAYS});
        if (preview.invalidReasonKey) {
            result.invalidCount += 1;
            continue;
        }
        const days = preview.days.map((day) => ({date: day.date, scheduled: day.scheduled}));
        if (!days.some((day) => day.scheduled)) continue;
        result.items.push({itemId: item.id, name: item.name, kind: item.kind, unit: item.unit, target: item.target, days});
    }
    return result;
}
