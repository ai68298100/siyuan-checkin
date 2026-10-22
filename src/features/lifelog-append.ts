// @ts-check

export interface LifelogFormatInput {
    timeStr: string; // HH:mm
    itemName: string;
    value?: number;
    unit?: string;
    kind?: "checkin" | "skip";
    note?: string;
    energy?: 1 | 2 | 3 | 4 | 5;
    attachment?: string;
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
    const valuePart = !isSkip && input.value !== undefined && input.value > 0 && input.unit && input.unit !== "次"
        ? `${input.value}${input.unit}`
        : "";
    const noteClean = (input.note || "").trim();
    const parts: string[] = [];
    if (isSkip) {
        parts.push("(跳过)");
    } else if (valuePart) {
        parts.push(valuePart);
    }
    if (noteClean) {
        parts.push(noteClean);
    } else if (isSkip) {
        parts.push("主动跳过");
    } else if (!valuePart) {
        parts.push("完成");
    }
    const energyPart = input.energy && input.energy >= 1 && input.energy <= 5
        ? ` ⚡${input.energy}`
        : "";
    const content = parts.join(" ");
    return `${input.timeStr} ${input.itemName}：${content}${energyPart}`;
}

/** 生成写入思源块的完整 Markdown，若包含合法图片附件则追加 Markdown 图片语法 */
export function formatLifelogMarkdownBlock(input: LifelogFormatInput): string {
    const mainLine = formatLifelogEntry(input);
    if (!input.attachment || typeof input.attachment !== "string") {
        return `${mainLine}\n`;
    }
    const safeUrl = input.attachment.trim();
    if (safeUrl.startsWith("data:image/") || safeUrl.startsWith("http://") || safeUrl.startsWith("https://") || safeUrl.startsWith("assets/")) {
        return `${mainLine}\n\n![${input.itemName}](${safeUrl})\n`;
    }
    return `${mainLine}\n`;
}

/** 从 ISO 8601 或时间戳毫秒提取宿主本地 HH:mm 格式时间 */
export function formatTimeOnly(isoOrMs: string | number): string {
    const date = new Date(isoOrMs);
    if (Number.isNaN(date.getTime())) return "00:00";
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

/** 预览生成今日全部打卡/跳过事件的 LifeLog Markdown 时间线文本 */
export function previewTodayLifelogMarkdown(
    events: readonly {occurredAt: string; value: number; unit?: string; kind?: "checkin" | "skip"; note?: string; energy?: 1 | 2 | 3 | 4 | 5; itemId: string}[],
    itemNames: ReadonlyMap<string, string>,
    sectionHeader?: string,
): string {
    if (!events.length) return "今日暂无打卡事实。";
    const lines: string[] = [];
    if (sectionHeader?.trim()) {
        lines.push(`### ${sectionHeader.trim()}`);
    }
    const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    for (const event of sorted) {
        const itemName = itemNames.get(event.itemId);
        if (!itemName) continue;
        const timeStr = formatTimeOnly(event.occurredAt);
        lines.push(formatLifelogEntry({
            timeStr,
            itemName,
            value: event.value,
            unit: event.unit,
            kind: event.kind,
            note: event.note,
            energy: event.energy,
        }));
    }
    return lines.join("\n");
}
