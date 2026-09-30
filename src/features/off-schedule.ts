/* T-1772（D-343）：今日页"其他活跃项目"管理入口的纯投影。
   今日列表只呈现当日排期项（fragments 的 scheduledItems 同一口径），未来才开始、
   归档暂停期或非今日排期的活跃项目会从今日列表消失——本投影按同一谓词取补集，
   为每个离场项目给出原因（未到开始日/暂停中/今日不排期）与下次排期日（有界扫描），
   供管理分节呈现编辑/归档动作；不改变今日列表与日级分母。 */
import {dateKey, getItemRevisionForDate, isItemAvailableOnDate, isScheduledToday} from "../model";
import type {CheckinItem, CheckinStore} from "../types";

export type OffScheduleReason = "not-started" | "paused" | "off-schedule";

export interface OffScheduleEntry {
    item: CheckinItem;
    reason: OffScheduleReason;
    /** 下次可排期日（YYYY-MM-DD）；开归档期等不可见未来时缺省。 */
    nextDate?: string;
}

const MANAGE_LIMIT = 50;

export function collectOffScheduleItems(store: CheckinStore, date: Date, horizonDays = 366): OffScheduleEntry[] {
    const today = dateKey(date);
    const entries: OffScheduleEntry[] = [];
    for (const item of store.items) {
        if (item.archived) continue;
        if (isItemAvailableOnDate(item, date) && isScheduledToday(item, date)) continue;
        const reason: OffScheduleReason = item.createdDate > today
            ? "not-started"
            : (item.archivePeriods || []).some((period) => period.startDate <= today && (!period.endDate || today < period.endDate))
                ? "paused"
                : "off-schedule";
        let nextDate: string | undefined;
        for (let offset = 1; offset <= horizonDays; offset += 1) {
            const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
            if (isItemAvailableOnDate(item, day) && isScheduledToday(item, day)) {
                nextDate = dateKey(day);
                break;
            }
        }
        entries.push({item, reason, nextDate});
        if (entries.length >= MANAGE_LIMIT) break;
    }
    return entries;
}

/** 管理行的排期摘要：单位/类型上下文（下次排期 + 当前修订类型），供 UI 直接消费。 */
export function offScheduleMeta(item: CheckinItem, date: Date): {kind: string; unit: string} {
    const revision = getItemRevisionForDate(item, date);
    return {kind: revision.kind, unit: revision.unit};
}
