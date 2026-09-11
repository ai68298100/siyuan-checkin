import {serializeCsv} from "../export";
import type {CheckinEvent, CheckinItem} from "../types";

export interface InsightRecordOptions {
    query?: string;
    source?: CheckinEvent["source"] | "all";
    order?: "newest" | "oldest";
}

const sourceLabels: Record<CheckinEvent["source"], string> = {
    manual: "手动记录",
    tomato: "专注记录",
    import: "导入记录",
    api: "外部记录",
};

/** Expects normalized events; the caller selects the item and date range first. */
export function selectInsightRecords(records: readonly CheckinEvent[], options: InsightRecordOptions = {}): CheckinEvent[] {
    const terms = (options.query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    const direction = options.order === "oldest" ? 1 : -1;
    return records.filter((record) => {
        if (options.source && options.source !== "all" && record.source !== options.source) return false;
        if (!terms.length) return true;
        const text = [record.note || "", record.unit, String(record.value), record.localDate, record.source, sourceLabels[record.source]]
            .join(" ").toLowerCase();
        return terms.every((term) => text.includes(term));
    }).map((record) => ({...record})).sort((left, right) => direction * (
        compareText(left.localDate, right.localDate)
        || compareText(left.occurredAt, right.occurredAt)
        || compareText(left.id, right.id)
    ));
}

export function serializeInsightRecordsCsv(item: CheckinItem, records: readonly CheckinEvent[]): string {
    return serializeCsv({
        version: 2,
        items: [{...item, id: spreadsheetText(item.id), name: spreadsheetText(item.name)}],
        events: records.map((record) => ({
            ...record,
            id: spreadsheetText(record.id),
            itemId: spreadsheetText(record.itemId),
            occurredAt: spreadsheetText(record.occurredAt),
            localDate: spreadsheetText(record.localDate),
            unit: spreadsheetText(record.unit),
            note: record.note === undefined ? undefined : spreadsheetText(record.note),
            externalRef: record.externalRef === undefined ? undefined : spreadsheetText(record.externalRef),
        })),
        eventTombstones: [],
    });
}

function compareText(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function spreadsheetText(value: string): string {
    // CSV quoting alone does not prevent spreadsheet formula evaluation.
    return /^\s*[=+\-@\u0000-\u001f\u007f-\u009f]/.test(value) ? `'${value}` : value;
}
