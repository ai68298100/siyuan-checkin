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

/* 7.0 CSV 导入解析：表头须含 名称/日期（数值、单位可选）。
   数值为空视为一次二值打卡；返回无效行数便于导入报告。 */
export interface CsvImportRow {
    name: string;
    date: string;
    value: number;
    unit: string;
    binary: boolean;
}

export interface CsvImportResult {
    rows: CsvImportRow[];
    invalid: number;
}

function splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (quoted) {
            if (char === "\"" && line[index + 1] === "\"") { current += "\""; index += 1; }
            else if (char === "\"") quoted = false;
            else current += char;
        } else if (char === "\"") quoted = true;
        else if (char === ",") { cells.push(current); current = ""; }
        else current += char;
    }
    cells.push(current);
    return cells.map((cell) => cell.trim());
}

export function parseCheckinCsv(text: string): CsvImportResult {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (!lines.length) return {rows: [], invalid: 0};
    const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
    const nameIndex = header.findIndex((cell) => cell === "名称" || cell === "name");
    const dateIndex = header.findIndex((cell) => cell === "日期" || cell === "date" || cell === "localdate");
    const valueIndex = header.findIndex((cell) => cell === "数值" || cell === "value");
    const unitIndex = header.findIndex((cell) => cell === "单位" || cell === "unit");
    if (nameIndex < 0 || dateIndex < 0) return {rows: [], invalid: lines.length - 1};
    const rows: CsvImportRow[] = [];
    let invalid = 0;
    for (const line of lines.slice(1)) {
        const cells = splitCsvLine(line);
        const name = cells[nameIndex] || "";
        const date = cells[dateIndex] || "";
        const rawValue = valueIndex >= 0 ? cells[valueIndex] : "";
        const unit = (unitIndex >= 0 ? cells[unitIndex] : "") || "次";
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getTime());
        if (!name || !validDate) { invalid += 1; continue; }
        const numeric = rawValue === "" || rawValue === undefined ? 1 : Number(rawValue);
        if (!Number.isFinite(numeric) || numeric < 0) { invalid += 1; continue; }
        const binary = numeric === 1;
        rows.push({name: name.slice(0, 40), date, value: numeric, unit: unit.slice(0, 16), binary});
    }
    return {rows, invalid};
}
