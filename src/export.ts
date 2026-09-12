import type {CheckinStore} from "./types";

export interface JsonBackupResult {
    store: CheckinStore;
    repaired: boolean;
    summary: JsonBackupSummary;
    warnings: string[];
}
export interface JsonMigrationReport extends JsonBackupResult {
    sourceVersion: number | string;
    targetVersion: number;
    audit?: JsonBackupAudit;
}
export interface JsonMigrationAssessment {
    requiresReview: boolean;
    reasons: string[];
}
export function validateJsonMigrationReport(report: JsonMigrationReport): string[] {
    const errors: string[] = [];
    if (!Number.isFinite(report.targetVersion) || report.targetVersion < 1) errors.push("目标版本无效");
    if (!report.store || report.store.version !== report.targetVersion) errors.push("目标版本与标准化数据不一致");
    if (report.summary.itemCount !== report.store.items.length || report.summary.eventCount !== report.store.events.length) errors.push("备份摘要与数据内容不一致");
    return errors;
}

export interface JsonBackupSummary {
    itemCount: number;
    eventCount: number;
    tombstoneCount: number;
    templateCount: number;
    archivedItemCount: number;
    dateRange?: {from: string; to: string};
}

export interface JsonBackupAudit {
    itemDelta: number;
    eventDelta: number;
    tombstoneDelta: number;
    templateDelta: number;
    archivedItemDelta: number;
    dateRangeChanged: boolean;
}

export function auditJsonBackup(before: JsonBackupSummary, after: JsonBackupSummary): JsonBackupAudit {
    return {
        itemDelta: after.itemCount - before.itemCount,
        eventDelta: after.eventCount - before.eventCount,
        tombstoneDelta: after.tombstoneCount - before.tombstoneCount,
        templateDelta: after.templateCount - before.templateCount,
        archivedItemDelta: after.archivedItemCount - before.archivedItemCount,
        dateRangeChanged: (before.dateRange?.from || "") !== (after.dateRange?.from || "") || (before.dateRange?.to || "") !== (after.dateRange?.to || ""),
    };
}

export function buildJsonMigrationReport(text: string, normalize: (value: unknown) => CheckinStore, before?: JsonBackupSummary): JsonMigrationReport {
    const result = parseJsonBackup(text, normalize);
    let sourceVersion: number | string = "unknown";
    try {
        const parsed = JSON.parse(text.replace(/^\uFEFF/, "")) as {version?: unknown};
        sourceVersion = typeof parsed.version === "number" || typeof parsed.version === "string" ? parsed.version : "unknown";
    } catch {
        sourceVersion = "invalid";
    }
    return { ...result, sourceVersion, targetVersion: result.store.version, audit: before ? auditJsonBackup(before, result.summary) : undefined };
}

export function assessJsonMigration(report: JsonMigrationReport): JsonMigrationAssessment {
    const reasons = [...report.warnings];
    if (report.repaired && !reasons.some((reason) => reason.includes("迁移"))) reasons.push("备份内容已标准化修复");
    if (report.audit && (report.audit.itemDelta < 0 || report.audit.eventDelta < 0 || report.audit.tombstoneDelta < 0)) reasons.push("恢复后数据数量减少，请确认删除项");
    return {requiresReview: reasons.length > 0, reasons};
}

export function summarizeJsonBackup(store: CheckinStore): JsonBackupSummary {
    const dates = store.events.map((event) => event.localDate).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return {
        itemCount: store.items.length,
        eventCount: store.events.length,
        tombstoneCount: store.eventTombstones.length,
        templateCount: store.templates?.length || 0,
        archivedItemCount: store.items.filter((item) => item.archived).length,
        dateRange: dates.length ? {from: dates[0], to: dates[dates.length - 1]} : undefined,
    };
}

/** Parse an exported backup and normalize legacy or partially malformed data safely. */
export function parseJsonBackup(text: string, normalize: (value: unknown) => CheckinStore = (value) => value as CheckinStore): JsonBackupResult {
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
    const warnings: string[] = [];
    if (!parsed || typeof parsed !== "object") throw new Error("备份必须是 JSON 对象");
    const candidate = parsed as Record<string, unknown>;
    if (!Array.isArray(candidate.items)) warnings.push("缺少项目列表，已按空列表处理");
    if (!Array.isArray(candidate.events)) warnings.push("缺少记录列表，已按空列表处理");
    if (candidate.version !== 2) warnings.push(`备份数据版本 ${String(candidate.version ?? "未知")} 将自动迁移到当前版本`);
    const store = normalize(parsed);
    return {store, repaired: JSON.stringify(parsed) !== JSON.stringify(store), summary: summarizeJsonBackup(store), warnings};
}

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
