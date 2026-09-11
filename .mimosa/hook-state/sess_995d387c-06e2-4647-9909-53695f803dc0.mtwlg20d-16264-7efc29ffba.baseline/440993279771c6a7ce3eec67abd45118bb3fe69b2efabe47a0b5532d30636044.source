import type {CheckinEvent} from "../types";

export type HistorySourceFilter = CheckinEvent["source"] | "all";
export type HistorySortOrder = "newest" | "oldest";

export interface HistoryRecord {
    event: CheckinEvent;
    itemName: string;
}

export interface HistoryFilterOptions {
    query?: string;
    source?: HistorySourceFilter;
    order?: HistorySortOrder;
}

export const HISTORY_SOURCE_LABELS: Readonly<Record<CheckinEvent["source"], string>> = {
    manual: "手动记录",
    tomato: "专注记录",
    import: "导入记录",
    api: "外部记录",
};

/** Filters normalized history records without mutating the supplied records or events. */
export function filterHistoryRecords(records: readonly HistoryRecord[], options: HistoryFilterOptions = {}): HistoryRecord[] {
    const terms = normalizeSearchText(options.query || "").trim().split(/\s+/).filter(Boolean);
    const direction = options.order === "oldest" ? 1 : -1;

    return records.map((record, index) => ({record, index})).filter(({record}) => {
        if (options.source && options.source !== "all" && record.event.source !== options.source) return false;
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
