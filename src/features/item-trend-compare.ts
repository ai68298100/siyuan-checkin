/* T-1517 选定项目横向趋势比较——纯函数投影（无时钟；日期由调用方注入）。
   纪律（承接产品计划批次 B，复用 T-1516 同口径判定）：
   - 兼容单位才比较原始数值：分组按单位进行，不同单位分图分表，绝不换算；
   - 完成率仅在适用口径下比较：配额项目不产出日级完成率（单列提示）；
   - 数据不足明确提示（sparse），渲染按选择顺序呈现，不排名、不施压；
   - 只读：不修改事件，历史修订按当日生效修订取单位（与 evaluateRule 同口径）。 */
import type {CheckinItem, CheckinKind, CheckinStore, QuotaPeriod} from "../types";
import {getItemRevisionForDate, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";

export interface ItemTrendSeries {
    itemId: string;
    name: string;
    kind: CheckinKind;
    unit: string;
    /** 逐日标签（MM/DD）与数值（按当日生效修订单位聚合）。 */
    labels: string[];
    values: number[];
    scheduledDays: number;
    completedDays: number;
    completionRate: number;
    recordDays: number;
    /** 数据不足：范围内无任何记录或无应做日。 */
    sparse: boolean;
    quota?: {period: QuotaPeriod; amount: number; countMode: "dates" | "value"};
}

export interface ItemTrendGroup {
    unit: string;
    series: ItemTrendSeries[];
}

export interface ItemTrendComparison {
    /** 按单位分组（组内原始数值可比）。 */
    groups: ItemTrendGroup[];
    /** 配额项目单列提示（无日级完成率）。 */
    quotaSeries: ItemTrendSeries[];
}

const MAX_TREND_DAYS = 31;

function dayDateKey(base: Date, offset: number): string {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** 单项目逐日趋势：日期区间 [startDate, startDate+days) 有界 31 天；项目缺失/归档返回 undefined。 */
export function buildItemTrendSeries(store: CheckinStore, itemId: string, startDate: string, days: number): ItemTrendSeries | undefined {
    const item = store.items.find((candidate) => candidate.id === itemId);
    if (!item || item.archived) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return undefined;
    const boundedDays = Math.max(1, Math.min(MAX_TREND_DAYS, Math.floor(days) || 1));
    const base = new Date(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)));
    const eventsByDay = new Map<string, number>();
    for (const event of store.events) {
        if (event.itemId !== itemId) continue;
        const key = typeof event.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.localDate) ? event.localDate : "";
        if (!key) continue;
        eventsByDay.set(key, (eventsByDay.get(key) || 0) + event.value);
    }
    const labels: string[] = [];
    const values: number[] = [];
    let scheduledDays = 0;
    let completedDays = 0;
    let recordDays = 0;
    let quota: ItemTrendSeries["quota"];
    for (let index = 0; index < boundedDays; index += 1) {
        const key = dayDateKey(base, index);
        const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + index);
        labels.push(key.slice(5).replace("-", "/"));
        const revision = getItemRevisionForDate(item, day);
        let dayValue = 0;
        if (revision.schedule.type === "quota" && revision.schedule.quota) {
            quota = {period: revision.schedule.quota.period, amount: revision.schedule.quota.amount, countMode: revision.schedule.quota.countMode};
        }
        const events = store.events.filter((event) => event.itemId === itemId && event.localDate === key);
        for (const event of events) {
            if (event.unit === revision.unit) dayValue += event.value;
        }
        values.push(dayValue);
        if (dayValue > 0 || events.length) recordDays += 1;
        if (!isItemAvailableOnDate(item, day) || !isScheduledToday(item, day)) continue;
        scheduledDays += 1;
        if (isComplete(store, item, day)) completedDays += 1;
    }
    const isQuota = Boolean(quota);
    const sparse = recordDays === 0 || (!isQuota && scheduledDays === 0);
    return {
        itemId,
        name: item.name,
        kind: item.kind,
        unit: item.unit,
        labels,
        values,
        scheduledDays,
        completedDays,
        completionRate: scheduledDays ? Math.round((completedDays / scheduledDays) * 100) : 0,
        recordDays,
        sparse,
        ...(quota ? {quota} : {}),
    };
}

/** 按单位分组：组内原始数值可比；配额项目单列（无日级完成率）。 */
export function groupItemTrendsByUnit(series: readonly ItemTrendSeries[]): ItemTrendComparison {
    const groups = new Map<string, ItemTrendGroup>();
    const quotaSeries: ItemTrendSeries[] = [];
    for (const entry of series) {
        if (entry.quota) {
            quotaSeries.push(entry);
            continue;
        }
        const group = groups.get(entry.unit) || {unit: entry.unit, series: []};
        group.series.push(entry);
        groups.set(entry.unit, group);
    }
    return {groups: [...groups.values()], quotaSeries};
}
