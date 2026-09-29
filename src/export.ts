import type {CheckinStore} from "./types";
import {isValidDateKey} from "./date-keys";

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
    error?: string;
}
export interface JsonMigrationAssessment {
    requiresReview: boolean;
    reasons: string[];
}

export interface JsonRecoveryPreflight {
    report: JsonMigrationReport;
    assessment: JsonMigrationAssessment;
    validationErrors: string[];
}

export type JsonRecoverySource = "json-import" | "local-snapshot";
export type JsonRecoveryStatus = "accepted" | "rejected";

export function buildRecoveryAuditDetails(source: JsonRecoverySource, preflight: JsonRecoveryPreflight, status: JsonRecoveryStatus, errors: readonly string[] = []): Record<string, unknown> {
    const {report} = preflight;
    return {
        status,
        source,
        sourceVersion: report.sourceVersion,
        targetVersion: report.targetVersion,
        repaired: report.repaired,
        warnings: report.warnings.length,
        audit: report.audit,
        ...(errors.length ? {errors: [...errors]} : {}),
    };
}
export function validateJsonMigrationReport(report: JsonMigrationReport): string[] {
    const errors: string[] = [];
    if (!Number.isFinite(report.targetVersion) || report.targetVersion < 1) errors.push("目标版本无效");
    if (!report.store || report.store.version !== report.targetVersion) errors.push("目标版本与标准化数据不一致");
    if (report.summary.itemCount !== report.store.items.length || report.summary.eventCount !== report.store.events.length) errors.push("备份摘要与数据内容不一致");
    return errors;
}

export function preflightJsonRecovery(text: string, normalize: (value: unknown) => CheckinStore, before?: JsonBackupSummary): JsonRecoveryPreflight {
    const report = buildJsonMigrationReport(text, normalize, before);
    return {report, assessment: assessJsonMigration(report), validationErrors: validateJsonMigrationReport(report)};
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
    let sourceVersion: number | string = "unknown";
    try {
        const parsed = JSON.parse(text.replace(/^\uFEFF/, "")) as {version?: unknown};
        sourceVersion = typeof parsed.version === "number" || typeof parsed.version === "string" ? parsed.version : "unknown";
    } catch {
        sourceVersion = "invalid";
        throw new Error("备份 JSON 无法解析");
    }
    const result = parseJsonBackup(text, normalize);
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
    /* D-216：v3 起为当前版本；v2 及更早的备份自动迁移到当前版本。 */
    if (candidate.version !== 2 && candidate.version !== 3) warnings.push(`备份数据版本 ${String(candidate.version ?? "未知")} 将自动迁移到当前版本`);
    const store = normalize(parsed);
    return {store, repaired: JSON.stringify(parsed) !== JSON.stringify(store), summary: summarizeJsonBackup(store), warnings};
}

export function serializeJson(store: CheckinStore): string {
    return JSON.stringify(store, null, 2);
}

export function serializeJsonMigrationReport(report: JsonMigrationReport): string {
    return JSON.stringify({sourceVersion: report.sourceVersion, targetVersion: report.targetVersion, repaired: report.repaired, warnings: report.warnings, summary: report.summary, audit: report.audit}, null, 2);
}


/* T-1628：电子表格公式中和——与 insight-records.spreadsheetText 同一策略：
   以 = + - @ 或控制字符开头的文本列加前导 `'`，防止被电子表格当公式执行。 */
function spreadsheetText(value: string): string {
    return /^\s*[=+\-@\u0000-\u001f\u007f-\u009f]/.test(value) ? `'${value}` : value;
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
    /* T-1628：公式中和只作用于自由文本列（itemName/note）——数值列可能是负数
       （如记录详情对比值），全列中和会篡改数据（insight-records 守门抓住）。 */
    const textColumns = new Set([2, 8]);
    return "\uFEFF" + rows.map((row) => row.map((cell, index) => csvCell(textColumns.has(index) ? spreadsheetText(cell) : cell)).join(",")).join("\n");
}

function csvCell(value: string): string {
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}

/* ===== T-1628 CSV 导入：与导出同一 RFC 4180 语义（引号/换行字段跨物理行），
   表头识别导出表头全集并兼容既有中英文别名；日期走 date-keys 真实日历校验。 ===== */
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
    /** T-1628：超出解析上限被截断时为 true（已解析部分照常返回，不静默丢弃标记）。 */
    truncated: boolean;
    /** T-1628：逐行错误明细（行号从 1 起，不含表头；上限前 10 条）。 */
    errors: Array<{line: number; reason: string}>;
}

const CSV_IMPORT_MAX_ROWS = 20000;
const CSV_IMPORT_MAX_CHARS = 2_000_000;

/** RFC 4180 状态机：整段文本解析（引号字段可含逗号/换行/双写引号），物理换行才结束一行；
    空行跳过；超行数/超字符上限停止并标记 truncated。带引号单元格保留原文，不带引号的裁剪首尾空白。 */
function parseCsvRows(text: string): {rows: string[][]; truncated: boolean} {
    const source = text.replace(/^\uFEFF/, "");
    let truncated = source.length > CSV_IMPORT_MAX_CHARS;
    const limit = Math.min(source.length, CSV_IMPORT_MAX_CHARS);
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    let cellQuoted = false;
    for (let index = 0; index < limit; index += 1) {
        const char = source[index];
        if (quoted) {
            if (char === "\"") {
                if (source[index + 1] === "\"") { cell += "\""; index += 1; }
                else quoted = false;
            } else cell += char;
        } else if (char === "\"") {
            quoted = true;
            cellQuoted = true;
        } else if (char === ",") {
            row.push(cellQuoted ? cell : cell.trim());
            cell = "";
            cellQuoted = false;
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && source[index + 1] === "\n") index += 1;
            row.push(cellQuoted ? cell : cell.trim());
            cell = "";
            cellQuoted = false;
            if (row.some((value) => value !== "")) rows.push(row);
            row = [];
            if (rows.length > CSV_IMPORT_MAX_ROWS) { truncated = true; break; }
        } else cell += char;
    }
    if (rows.length <= CSV_IMPORT_MAX_ROWS) {
        row.push(cellQuoted ? cell : cell.trim());
        if (row.some((value) => value !== "")) rows.push(row);
    }
    return {rows, truncated};
}

export function parseCheckinCsv(text: string): CsvImportResult {
    const {rows: table, truncated} = parseCsvRows(text);
    if (!table.length) return {rows: [], invalid: 0, truncated, errors: []};
    /* 表头别名：导出表头全集（T-1628）+ 既有中英文别名（旧文件不断）。 */
    const header = table[0].map((cell) => cell.toLowerCase());
    const nameIndex = header.findIndex((cell) => cell === "名称" || cell === "name" || cell === "itemname");
    const dateIndex = header.findIndex((cell) => cell === "日期" || cell === "date" || cell === "localdate");
    const valueIndex = header.findIndex((cell) => cell === "数值" || cell === "value");
    const unitIndex = header.findIndex((cell) => cell === "单位" || cell === "unit");
    if (nameIndex < 0 || dateIndex < 0) return {rows: [], invalid: table.length - 1, truncated, errors: []};
    const rows: CsvImportRow[] = [];
    const errors: Array<{line: number; reason: string}> = [];
    let invalid = 0;
    for (let rowIndex = 1; rowIndex < table.length; rowIndex += 1) {
        const cells = table[rowIndex];
        const name = cells[nameIndex] || "";
        const date = cells[dateIndex] || "";
        const rawValue = valueIndex >= 0 ? cells[valueIndex] : "";
        const unit = (unitIndex >= 0 ? cells[unitIndex] : "") || "次";
        const line = rowIndex;
        /* 真实日历校验：2026-02-30 这类被 JS Date 归一的键必须拒绝（T-1628）。 */
        if (!name || !isValidDateKey(date)) {
            invalid += 1;
            errors.push({line, reason: !name ? "名称缺失" : !isValidDateKey(date) ? "日期无效" : ""});
            continue;
        }
        const numeric = rawValue === "" || rawValue === undefined ? 1 : Number(rawValue);
        if (!Number.isFinite(numeric) || numeric < 0) {
            invalid += 1;
            errors.push({line, reason: "数值无效"});
            continue;
        }
        const binary = numeric === 1;
        rows.push({name: name.slice(0, 40), date, value: numeric, unit: unit.slice(0, 16), binary});
    }
    return {rows, invalid, truncated, errors: errors.slice(0, 10)};
}
