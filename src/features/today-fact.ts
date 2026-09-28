/* T-1610：今日行动台单项目事实切片——只读投影（D-307 正确性修正）。
   纪律：target/unit/kind/schedule 一律取当日生效修订（getItemRevisionForDate），
   不读 item 级现值——未来生效的修订或导入数据会让首屏「目标取修订、单位取现值」
   两种口径混用。既有事件单位与历史事实原样保留，不做任何单位换算；
   完成与进度判断全部委托 model.ts 单一实现（与 today-dashboard 编排层分工一致）。 */

import {getEventsForDay, getItemRevisionForDate, getProgress, isComplete, isSkipEvent} from "../model";
import type {TodayDashboardItemFact} from "./today-dashboard";
import type {CheckinItem, CheckinStore} from "../types";

export interface TodayItemFactInput {
    item: CheckinItem;
    date: Date;
    store: CheckinStore;
    streak?: number;
}

/** 构建今日行动台的单项目事实切片。只读；输出只由输入决定。 */
export function buildTodayItemFact({item, date, store, streak}: TodayItemFactInput): TodayDashboardItemFact {
    const revision = getItemRevisionForDate(item, date);
    const progress = getProgress(store, item, date);
    const quota = revision.schedule.type === "quota" ? revision.schedule.quota : undefined;
    return {
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        ...(item.group ? {group: item.group} : {}),
        completed: isComplete(store, item, date),
        skippedToday: getEventsForDay(store, item.id, date).some((event) => isSkipEvent(event)),
        progress,
        target: revision.target,
        unit: revision.unit,
        ...(quota ? {quota: {contributed: progress, amount: quota.amount}} : {}),
        ...(item.direction === "atMost" ? {atMost: {breached: revision.kind === "binary" ? progress > 0 : progress > revision.target}} : {}),
        streak,
    };
}
