import type {CheckinEvent} from "../types";

export type HistorySourceFilter = CheckinEvent["source"] | "all";
export type HistorySortOrder = "newest" | "oldest";
/* T-1512 渠道细筛：同属 api 的登记渠道单独可筛；未登记前缀归 api:other，
   不用自由字符串猜插件名。只是 UI 筛选值，公开 source 枚举不变。 */
export type HistoryChannelFilter = HistorySourceFilter | "api:health" | "api:notequery" | "api:taskhorizon" | "api:other";
export type HistoryMeteringFilter = "all" | "session" | "daily" | "other";

export interface HistoryRecord {
    event: CheckinEvent;
    itemName: string;
}

export interface HistoryFilterOptions {
    query?: string;
    source?: HistoryChannelFilter;
    /** T-1512 计量方式筛选：会话片段 / 日汇总 / 其他。 */
    metering?: HistoryMeteringFilter;
    order?: HistorySortOrder;
}

export const HISTORY_SOURCE_LABELS: Readonly<Record<CheckinEvent["source"], string>> = {
    manual: "手动记录",
    tomato: "专注记录",
    import: "导入记录",
    api: "外部记录",
    sireader: "思阅阅读",
    siplayer: "思播观看",
    weread: "微信读书",
    yeguif: "叶归 LifeLog",
};

/** 渠道派生（只读）：非 api 来源即渠道本身；api 按登记前缀细分，
    无 externalRef 或未登记前缀如实归入 api:other。 */
export function historyEventChannel(event: CheckinEvent): HistoryChannelFilter {
    if (event.source !== "api") return event.source;
    const ref = typeof event.externalRef === "string" ? event.externalRef : "";
    if (ref.startsWith("health:")) return "api:health";
    if (ref.startsWith("notequery:")) return "api:notequery";
    if (ref.startsWith("taskhorizon:")) return "api:taskhorizon";
    return "api:other";
}

/** 计量方式派生（只读）：会话片段（思阅/思播/番茄按会话写入）、
    日汇总（微信读书时长日汇总、健康按日聚合），其余（手动/导入/笔记推导/
    Task Horizon/完读与笔记合计/未知接口）归其他。与 T-1510 计量描述同一证据口径。 */
export function historyMeteringBucket(event: CheckinEvent): Exclude<HistoryMeteringFilter, "all"> {
    if (event.source === "sireader" || event.source === "siplayer" || event.source === "tomato") return "session";
    const ref = typeof event.externalRef === "string" ? event.externalRef : "";
    if (event.source === "weread" && !ref.includes(":finish:") && !ref.includes(":notes:")) return "daily";
    if (ref.startsWith("health:")) return "daily";
    return "other";
}

/** Filters normalized history records without mutating the supplied records or events. */
export function filterHistoryRecords(records: readonly HistoryRecord[], options: HistoryFilterOptions = {}): HistoryRecord[] {
    const terms = normalizeSearchText(options.query || "").trim().split(/\s+/).filter(Boolean);
    const direction = options.order === "oldest" ? 1 : -1;

    return records.map((record, index) => ({record, index})).filter(({record}) => {
        if (options.source && options.source !== "all") {
            /* "api" 是伞选项：匹配全部 api 渠道（含健康/笔记推导/Task Horizon/未知）。 */
            const channelMatches = options.source === "api"
                ? record.event.source === "api"
                : historyEventChannel(record.event) === options.source;
            if (!channelMatches) return false;
        }
        if (options.metering && options.metering !== "all" && historyMeteringBucket(record.event) !== options.metering) return false;
        if (!terms.length) return true;

        const searchableText = normalizeSearchText([
            record.itemName,
            record.event.note || "",
            record.event.unit,
            String(record.event.value),
            record.event.localDate,
            record.event.occurredAt,
            record.event.source,
            HISTORY_SOURCE_LABELS[record.event.source],
        ].join(" "));
        return terms.every((term) => searchableText.includes(term));
    }).sort((left, right) => direction * (
        compareText(left.record.event.occurredAt, right.record.event.occurredAt)
        || compareText(left.record.event.id, right.record.event.id)
    ) || left.index - right.index).map(({record}) => ({
        itemName: record.itemName,
        event: {...record.event},
    }));
}

function normalizeSearchText(value: string): string {
    return value.normalize("NFKC").toLocaleLowerCase();
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}
