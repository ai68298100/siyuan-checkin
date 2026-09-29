/* T-1541：LifeLog 时间轴投影（回顾页折叠区）——yeguif 事件的时间轴串联投影，纯渲染零写入。
   数据源=既有 yeguif 事件（source="yeguif"，note=`类型：备注`，value=结算分钟数）。
   无时钟：时间读数来自事件自身的 ISO 串，不引用当前时刻。 */

export interface LifelogTimelineEntry {
    occurredAt: string;
    /** HH:MM（本地时区，取自事件 occurredAt）。 */
    time: string;
    /** 类型 = note 冒号前首段；空则渲染层回退项目名。 */
    type: string;
    /** 冒号后的备注（可空）。 */
    text: string;
    /** 结算时长分钟数（≤0 或非数归零——首条无前置时长的记录不产出，此处兜底）。 */
    minutes: number;
    itemName: string;
    /** 类型→6 色板索引（-1=空类型中性色；确定性哈希，同类型恒同色）。 */
    colorIndex: number;
}

export interface LifelogTimelineRawEvent {
    occurredAt: string;
    value: number;
    note?: string;
    itemId: string;
}

export function buildLifelogTimeline(events: readonly LifelogTimelineRawEvent[], itemNames: ReadonlyMap<string, string>): LifelogTimelineEntry[] {
    return events
        .map((event) => {
            const date = new Date(event.occurredAt);
            if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
            const note = typeof event.note === "string" ? event.note : "";
            const colon = note.search(/[：:]/);
            const type = (colon >= 0 ? note.slice(0, colon) : note).trim().slice(0, 60);
            const text = (colon >= 0 ? note.slice(colon + 1) : "").trim().slice(0, 300);
            const minutes = Number.isFinite(event.value) && event.value > 0 ? Math.round(event.value) : 0;
            const hh = String(date.getHours()).padStart(2, "0");
            const mm = String(date.getMinutes()).padStart(2, "0");
            return {
                occurredAt: event.occurredAt,
                time: `${hh}:${mm}`,
                type,
                text,
                minutes,
                itemName: itemNames.get(event.itemId) || "",
                colorIndex: lifelogTypeColorIndex(type),
            };
        })
        .filter((entry): entry is LifelogTimelineEntry => Boolean(entry))
        .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.time.localeCompare(right.time));
}

/** 类型→6 色板索引（31 进制确定性哈希；同类型恒同色，未知/空类型=-1 中性）。 */
export function lifelogTypeColorIndex(type: string): number {
    const safe = typeof type === "string" ? type.trim() : "";
    if (!safe) return -1;
    let hash = 0;
    for (let index = 0; index < safe.length; index += 1) hash = (hash * 31 + safe.charCodeAt(index)) >>> 0;
    return hash % 6;
}
