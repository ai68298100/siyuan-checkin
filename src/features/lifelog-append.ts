// @ts-check

export interface LifelogFormatInput {
    timeStr: string; // HH:mm
    itemName: string;
    value?: number;
    unit?: string;
    kind?: "checkin" | "skip";
    note?: string;
    energy?: 1 | 2 | 3 | 4 | 5;
    style?: "standard" | "compact";
}

/**
 * 将打卡/跳过事件转化为符合 LifeLog 规范的时间线段落文本：
 * 行首必须是时间（HH:mm），后接项目名与内容，兼容叶归及主流日记格式。
 * 例：
 *   - 08:30 晨跑：完成
 *   - 10:15 编程学习 (45分钟)：#深度专注 算法两题 ⚡5
 *   - 21:00 力量训练 (跳过)：#主动休息 今天早睡
 */
export function formatLifelogEntry(input: LifelogFormatInput): string {
    const isSkip = input.kind === "skip";
    const statusPart = isSkip
        ? " (跳过)"
        : (input.value !== undefined && input.value > 0 && input.unit && input.unit !== "次"
            ? ` (${input.value}${input.unit})`
            : "");
    const noteClean = (input.note || "").trim();
    const notePart = noteClean
        ? `：${noteClean}`
        : (isSkip ? "：主动跳过" : "：完成");
    const energyPart = input.energy && input.energy >= 1 && input.energy <= 5
        ? ` ⚡${input.energy}`
        : "";
    return `${input.timeStr} ${input.itemName}${statusPart}${notePart}${energyPart}`;
}

/** 从 ISO 8601 或时间戳毫秒提取宿主本地 HH:mm 格式时间 */
export function formatTimeOnly(isoOrMs: string | number): string {
    const date = new Date(isoOrMs);
    if (Number.isNaN(date.getTime())) return "00:00";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}
