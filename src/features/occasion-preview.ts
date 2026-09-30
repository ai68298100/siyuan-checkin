/* T-1716（D-358）：事项规则预览——只读纯投影。
   展示接下来 N 次发生日与提醒出现日（发生日 - remindBeforeDays），全部经
   getOccurrenceDate 单一实现迭代（不新建第二套规则计算）；once 已过、农历无法
   换算等边界如实返回 reason 键由渲染层 i18n。零写入。 */
import {addDays} from "../date-keys";
import {dateKey} from "../model";
import {getOccurrenceDate} from "../occasions";
import type {Occasion} from "../occasions";

export interface OccurrencePreviewEntry {
    occurrenceDate: string;
    /** 提醒出现日（发生日提前 remindBeforeDays 天）；0 提前时与发生日相同。 */
    remindDate: string;
}

export interface OccurrencePreview {
    entries: OccurrencePreviewEntry[];
    /** 无未来发生日的边界说明键（渲染层 i18n）。 */
    reasonKey?: string;
}

/** 从 fromDate（含）起向后找 count 次未来发生日；预览只读不落任何状态。
    游标推进与 getMissedOccurrence 同模式：找到发生日后从次日起再查（同日不重复）。 */
export function buildOccurrencePreview(item: Occasion, fromDate: Date, count = 5): OccurrencePreview {
    const todayKey = dateKey(fromDate);
    const lead = Math.max(0, Math.min(365, Math.round(Number(item.remindBeforeDays) || 0)));
    const entries: OccurrencePreviewEntry[] = [];
    let cursor = todayKey;
    let guard = 0;
    while (entries.length < count && guard < 1500) {
        guard += 1;
        const next = getOccurrenceDate(item, cursor);
        if (!next) break;
        cursor = addDays(next, 1) || next;
        entries.push({
            occurrenceDate: next,
            remindDate: addDays(next, -lead) || next,
        });
    }
    if (!entries.length) {
        const reasonKey = item.recurrence === "once" && item.date < todayKey
            ? "occ.previewOncePast"
            : "occ.previewNone";
        return {entries, reasonKey};
    }
    return {entries};
}
