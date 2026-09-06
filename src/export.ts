import type {CheckinStore} from "./types";

export function serializeJson(store: CheckinStore): string {
    return JSON.stringify(store, null, 2);
}

export function serializeCsv(store: CheckinStore): string {
    const rows = [["eventId", "itemId", "itemName", "occurredAt", "localDate", "value", "unit", "source", "note", "externalRef"]];
    const names = new Map(store.items.map((item) => [item.id, item.name]));
    store.events.forEach((event) => rows.push([
        event.id,
        event.itemId,
        names.get(event.itemId) || "",
        event.occurredAt,
        event.localDate,
        String(event.value),
        event.unit,
        event.source,
        event.note || "",
        event.externalRef || "",
    ]));
    return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: string): string {
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}
