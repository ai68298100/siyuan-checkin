/* T-1493 「X 年前的今天」回顾：同月日的往年打卡与事项锚点投影（benchmark 二十一·A 路）。
   纪律：
   - 只读投影：不写任何状态；输入是规范 store 的最小快照（事件/项目名/事项锚点）；
   - 低干扰：无历史（往年同日无记录）如实返回空条目数组，渲染层不渲染该卡；
   - 有界：最多回看 3 年、每年名称至多 3 个 + 溢出计数；当前年不计入（今日页本身即当下）；
   - 隐私口径与回顾页一致：只在本插件 UI 呈现项目名，不进导出/公开 API；
   - 零依赖、无时钟、确定性输出（年份降序，同年打卡在前、事项在后）。 */

export interface ThisDayEventSnapshot {
    itemId: string;
    localDate: string;
    value: number;
}

export interface ThisDayItemSnapshot {
    id: string;
    name: string;
}

export interface ThisDayOccasionSnapshot {
    name: string;
    /** 锚点日期（开始日）。 */
    date: string;
    enabled: boolean;
}

export type ThisDayEntryKind = "checkin" | "occasion";

export interface ThisDayEntry {
    year: number;
    kind: ThisDayEntryKind;
    /** 打卡条目：当年今天完成的记录数。 */
    completedCount: number;
    /** 打卡条目：至多 maxNames 个项目名（按事件顺序去重）。 */
    itemNames: readonly string[];
    /** 未展示的项目名数量。 */
    overflow: number;
    /** 事项条目：当年今天开始的名称。 */
    occasionName?: string;
}

export interface ThisDayHistory {
    /** 月-日（MM-DD）。 */
    monthDay: string;
    entries: readonly ThisDayEntry[];
}

export interface ThisDayHistoryOptions {
    maxYears?: number;
    maxNames?: number;
}

export function buildThisDayHistory(
    events: ReadonlyArray<ThisDayEventSnapshot>,
    items: ReadonlyArray<ThisDayItemSnapshot>,
    occasions: ReadonlyArray<ThisDayOccasionSnapshot>,
    localDate: string,
    options: ThisDayHistoryOptions = {},
): ThisDayHistory {
    const monthDay = typeof localDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate.slice(5) : "";
    if (!monthDay) return {monthDay: "", entries: []};
    const maxYears = Math.max(1, Math.min(5, Math.round(Number(options.maxYears) || 3)));
    const maxNames = Math.max(1, Math.min(8, Math.round(Number(options.maxNames) || 3)));
    const currentYear = Number(localDate.slice(0, 4));
    const nameById = new Map(items.map((item) => [item.id, item.name]));

    type YearBucket = {completedCount: number; names: string[]; seen: Set<string>; overflow: number; occasionName?: string};
    const buckets = new Map<number, YearBucket>();
    const bucket = (year: number): YearBucket => {
        let entry = buckets.get(year);
        if (!entry) {
            entry = {completedCount: 0, names: [], seen: new Set(), overflow: 0};
            buckets.set(year, entry);
        }
        return entry;
    };

    for (const event of events) {
        if (!event || typeof event.localDate !== "string" || event.localDate.length !== 10) continue;
        if (event.localDate.slice(5) !== monthDay) continue;
        const year = Number(event.localDate.slice(0, 4));
        if (!Number.isInteger(year) || year >= currentYear) continue;
        if (!(typeof event.value === "number" && event.value > 0)) continue;
        const entry = bucket(year);
        entry.completedCount += 1;
        const name = nameById.get(event.itemId);
        if (name && !entry.seen.has(name)) {
            if (entry.names.length < maxNames) {
                entry.names.push(name);
            } else {
                entry.overflow += 1;
            }
            entry.seen.add(name);
        }
    }

    for (const occasion of occasions) {
        if (!occasion || typeof occasion.date !== "string" || occasion.date.length !== 10) continue;
        if (occasion.date.slice(5) !== monthDay) continue;
        const year = Number(occasion.date.slice(0, 4));
        if (!Number.isInteger(year) || year >= currentYear) continue;
        const entry = bucket(year);
        if (!entry.occasionName && typeof occasion.name === "string" && occasion.name) entry.occasionName = occasion.name;
    }

    const entries: ThisDayEntry[] = [];
    for (const year of [...buckets.keys()].sort((left, right) => right - left).slice(0, maxYears)) {
        const entry = buckets.get(year)!;
        if (entry.completedCount > 0) {
            entries.push({year, kind: "checkin", completedCount: entry.completedCount, itemNames: entry.names, overflow: entry.overflow});
        }
        if (entry.occasionName) {
            entries.push({year, kind: "occasion", completedCount: 0, itemNames: [], overflow: 0, occasionName: entry.occasionName});
        }
    }
    return {monthDay, entries};
}
