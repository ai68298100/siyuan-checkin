/* T-1516 统计分母与状态贡献明细——只读投影（无时钟；日期由调用方注入）。
   纪律（承接产品计划批次 B）：
   - 不复制第二套公式：buildItemDenominatorDetail 逐日分类与
     analytics.summarizeItem 的分母循环完全同序同谓词
     （可用性 → 排期 → 跳过豁免 → 完成判定，复用同一批 model 函数）；
     配额项目沿用 summary.items 里既有的 quota 投影，本模块不做第二次配额计算；
   - 有界输出：每个日期列表至多 62 项，超出以 truncated 如实标注；
   - 跳转是既有「按日跳记录」通道，查询不修改任何事件。 */
import type {CheckinEvent, CheckinItem, CheckinStore} from "../types";
import {dateKey, getItemRevisionForDate, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";

export type DenominatorDayState = "completed" | "missed" | "skipped" | "rest";

export interface ItemDenominatorDetail {
    itemId: string;
    /** 分母内日期（完成+未完成；跳过日按 T-1221 不计分母）。 */
    completedDates: string[];
    missedDates: string[];
    skippedDates: string[];
    restDates: string[];
    /** 不可用日（创建前/归档期）数量，不计入分母。 */
    unavailableCount: number;
    truncated: boolean;
    /** 配额项目：分母不在日级，解释交给 summary.items 既有 quota 投影。 */
    isQuota: boolean;
}

const MAX_DATES_PER_LIST = 62;

class BoundedDateList {
    readonly dates: string[] = [];
    truncated = false;
    push(key: string): void {
        if (this.dates.length < MAX_DATES_PER_LIST) this.dates.push(key);
        else this.truncated = true;
    }
}

/** 与 summarizeItem 的分母循环同序同谓词的日期级明细；只读不修改。 */
export function buildItemDenominatorDetail(store: CheckinStore, item: CheckinItem, startDate: string, endDate: string): ItemDenominatorDetail {
    const detail: ItemDenominatorDetail = {itemId: item.id, completedDates: [], missedDates: [], skippedDates: [], restDates: [], unavailableCount: 0, truncated: false, isQuota: false};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) return detail;
    const start = new Date(Number(startDate.slice(0, 4)), Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)));
    const endExclusive = new Date(Number(endDate.slice(0, 4)), Number(endDate.slice(5, 7)) - 1, Number(endDate.slice(8, 10)));
    endExclusive.setDate(endExclusive.getDate() + 1);
    const skipDates = getSkipDatesForItem(store, item.id);
    const completed = new BoundedDateList();
    const missed = new BoundedDateList();
    const skipped = new BoundedDateList();
    const rest = new BoundedDateList();
    /* 与 summarizeItem 相同的配额短路：配额项目分母不在日级
       （配额判定同 summarizeQuota：按区间末日的生效修订）。 */
    const asOf = new Date(Number(endDate.slice(0, 4)), Number(endDate.slice(5, 7)) - 1, Number(endDate.slice(8, 10)));
    detail.isQuota = getItemRevisionForDate(item, asOf).schedule.type === "quota";
    if (detail.isQuota) return detail;
    for (let day = new Date(start); day < endExclusive; day.setDate(day.getDate() + 1)) {
        const key = dateKey(day);
        if (!isItemAvailableOnDate(item, day)) {
            detail.unavailableCount += 1;
            continue;
        }
        if (!isScheduledToday(item, day)) {
            rest.push(key);
            continue;
        }
        if (skipDates.has(key) && !isComplete(store, item, day)) {
            skipped.push(key);
            continue;
        }
        if (isComplete(store, item, day)) completed.push(key);
        else missed.push(key);
    }
    detail.completedDates = completed.dates;
    detail.missedDates = missed.dates;
    detail.skippedDates = skipped.dates;
    detail.restDates = rest.dates;
    detail.truncated = completed.truncated || missed.truncated || skipped.truncated || rest.truncated;
    return detail;
}

/** 汇总指标「条记录」的逐日贡献：只聚合传入事件，不读时钟、不修改事件。 */
export function buildRangeDayCounts(events: readonly CheckinEvent[], startDate: string, endDate: string): Array<{date: string; count: number}> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) return [];
    const counts = new Map<string, number>();
    for (const event of events) {
        const key = typeof event.localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.localDate) ? event.localDate : "";
        if (!key || key < startDate || key > endDate) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0])).map(([date, count]) => ({date, count}));
}
