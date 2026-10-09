import type {CheckinStore} from "./types";
import {isValidDateKey} from "./date-keys";

/**
 * JSON 主档导入的字符上限。主档可以包含图片 data URL，不能沿用 CSV 的
 * 行数限制；8 MiB 能容纳单个合法附件和常规长期记录，同时在 JSON.parse
 * 前阻止异常文件占满 WebView 内存。
 */
export const JSON_BACKUP_MAX_CHARS = 8 * 1024 * 1024;
const JSON_BACKUP_VERSION_MAX_CHARS = 80;
const JSON_BACKUP_WARNING_MAX_CHARS = 240;
const JSON_BACKUP_WARNING_LIMIT = 64;

function boundedMigrationText(value: unknown, maxLength = JSON_BACKUP_VERSION_MAX_CHARS): string {
    const text = typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : "unknown";
    const cleaned = text.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").trim();
    const points = [...cleaned];
    return points.length <= maxLength ? cleaned : `${points.slice(0, Math.max(0, maxLength - 1)).join("")}…`;
}

function boundedMigrationWarnings(warnings: readonly unknown[]): string[] {
    return warnings.slice(0, JSON_BACKUP_WARNING_LIMIT).map((warning) => boundedMigrationText(warning, JSON_BACKUP_WARNING_MAX_CHARS)).filter(Boolean);
}

function boundedMigrationVersion(value: unknown): number | string {
    return typeof value === "number" && Number.isFinite(value) ? value : boundedMigrationText(value);
}

export interface JsonBackupInspection {
    duplicateItemIds: number;
    duplicateEventIds: number;
    duplicateTombstoneIds: number;
    missingEventItemIds: number;
    unitConflicts: number;
}

export interface JsonBackupResult {
    store: CheckinStore;
    repaired: boolean;
    summary: JsonBackupSummary;
    warnings: string[];
    inspection: JsonBackupInspection;
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
export type JsonRecoveryFailureKind = "json-too-large" | "json-parse" | "json-shape" | "json-normalize";

/** Convert parser/normalizer failures into a bounded diagnostic category. */
export function classifyJsonRecoveryError(error: unknown): JsonRecoveryFailureKind {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("必须是 JSON 对象") || message.includes("不是文本")) return "json-shape";
    if (message.includes("超过") || message.includes("上限")) return "json-too-large";
    if (message.includes("无法解析") || message.includes("Unexpected") || message.includes("JSON")) return "json-parse";
    return "json-normalize";
}

export function buildRecoveryAuditDetails(source: JsonRecoverySource, preflight: JsonRecoveryPreflight, status: JsonRecoveryStatus, errors: readonly string[] = []): Record<string, unknown> {
    const {report} = preflight;
    const auditErrors = errors.length ? {errors: [...errors]} : {};
    if (auditErrors.errors) auditErrors.errors = boundedMigrationWarnings(auditErrors.errors);
    return {
        status,
        source,
        sourceVersion: boundedMigrationVersion(report.sourceVersion),
        targetVersion: report.targetVersion,
        repaired: report.repaired,
        warnings: report.warnings.length,
        inspection: report.inspection,
        audit: report.audit,
        ...auditErrors,
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
    if (typeof text !== "string") throw new Error("备份内容不是文本");
    if (text.length > JSON_BACKUP_MAX_CHARS) throw new Error(`备份文件超过 ${JSON_BACKUP_MAX_CHARS / (1024 * 1024)} MiB 上限`);
    let sourceVersion: number | string = "unknown";
    try {
        const parsed = JSON.parse(text.replace(/^\uFEFF/, "")) as {version?: unknown};
        sourceVersion = typeof parsed.version === "number" && Number.isFinite(parsed.version)
            ? parsed.version
            : typeof parsed.version === "string" ? boundedMigrationText(parsed.version) : "unknown";
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

function duplicateIdCount(values: readonly unknown[]): number {
    const counts = new Map<string, number>();
    values.forEach((value) => {
        if (typeof value !== "string" || !value) return;
        counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.values()].filter((count) => count > 1).length;
}

function inspectJsonBackup(value: unknown): JsonBackupInspection {
    if (!value || typeof value !== "object") {
        return {duplicateItemIds: 0, duplicateEventIds: 0, duplicateTombstoneIds: 0, missingEventItemIds: 0, unitConflicts: 0};
    }
    const candidate = value as {items?: unknown; events?: unknown; eventTombstones?: unknown};
    const items = Array.isArray(candidate.items) ? candidate.items : [];
    const events = Array.isArray(candidate.events) ? candidate.events : [];
    const tombstones = Array.isArray(candidate.eventTombstones) ? candidate.eventTombstones : [];
    const itemIds = new Set(items.flatMap((item) => item && typeof item === "object" && typeof (item as {id?: unknown}).id === "string" ? [(item as {id: string}).id] : []));
    const itemUnits = new Map(items.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as {id?: unknown; unit?: unknown};
        return typeof record.id === "string" && record.id && typeof record.unit === "string" ? [[record.id, record.unit] as const] : [];
    }));
    let missingEventItemIds = 0;
    let unitConflicts = 0;
    events.forEach((event) => {
        if (!event || typeof event !== "object") return;
        const record = event as {itemId?: unknown; unit?: unknown};
        if (typeof record.itemId !== "string" || !itemIds.has(record.itemId)) missingEventItemIds += 1;
        else if (typeof record.unit === "string" && itemUnits.get(record.itemId) !== undefined && record.unit !== itemUnits.get(record.itemId)) unitConflicts += 1;
    });
    return {
        duplicateItemIds: duplicateIdCount(items.map((item) => item && typeof item === "object" ? (item as {id?: unknown}).id : undefined)),
        duplicateEventIds: duplicateIdCount(events.map((event) => event && typeof event === "object" ? (event as {id?: unknown}).id : undefined)),
        duplicateTombstoneIds: duplicateIdCount(tombstones.map((tombstone) => tombstone && typeof tombstone === "object" ? (tombstone as {eventId?: unknown}).eventId : undefined)),
        missingEventItemIds,
        unitConflicts,
    };
}

function appendInspectionWarnings(warnings: string[], inspection: JsonBackupInspection): void {
    if (inspection.duplicateItemIds) warnings.push(`发现 ${inspection.duplicateItemIds} 个重复项目 ID，导入时按规范化规则合并`);
    if (inspection.duplicateEventIds) warnings.push(`发现 ${inspection.duplicateEventIds} 个重复记录 ID，导入时按规范化规则合并`);
    if (inspection.duplicateTombstoneIds) warnings.push(`发现 ${inspection.duplicateTombstoneIds} 个重复删除标记，导入时按规范化规则合并`);
    if (inspection.missingEventItemIds) warnings.push(`发现 ${inspection.missingEventItemIds} 条记录指向不存在的项目，导入时将跳过`);
    if (inspection.unitConflicts) warnings.push(`发现 ${inspection.unitConflicts} 条记录的单位与项目当前单位不一致，请复核历史数据`);
}

/** Parse an exported backup and normalize legacy or partially malformed data safely. */
export function parseJsonBackup(text: string, normalize: (value: unknown) => CheckinStore = (value) => value as CheckinStore): JsonBackupResult {
    if (typeof text !== "string") throw new Error("备份内容不是文本");
    if (text.length > JSON_BACKUP_MAX_CHARS) throw new Error(`备份文件超过 ${JSON_BACKUP_MAX_CHARS / (1024 * 1024)} MiB 上限`);
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ""));
    const warnings: string[] = [];
    if (!parsed || typeof parsed !== "object") throw new Error("备份必须是 JSON 对象");
    const candidate = parsed as Record<string, unknown>;
    if (!Array.isArray(candidate.items)) warnings.push("缺少项目列表，已按空列表处理");
    if (!Array.isArray(candidate.events)) warnings.push("缺少记录列表，已按空列表处理");
    const inspection = inspectJsonBackup(parsed);
    appendInspectionWarnings(warnings, inspection);
    /* D-216：v3 起为当前版本；v2 及更早的备份自动迁移到当前版本。 */
    if (candidate.version !== 2 && candidate.version !== 3) warnings.push(`备份数据版本 ${boundedMigrationText(candidate.version, JSON_BACKUP_VERSION_MAX_CHARS)} 将自动迁移到当前版本`);
    const store = normalize(parsed);
    return {store, repaired: JSON.stringify(parsed) !== JSON.stringify(store), summary: summarizeJsonBackup(store), warnings, inspection};
}

export function serializeJson(store: CheckinStore): string {
    return JSON.stringify(store, null, 2);
}

export function serializeJsonMigrationReport(report: JsonMigrationReport): string {
    return JSON.stringify({sourceVersion: boundedMigrationVersion(report.sourceVersion), targetVersion: report.targetVersion, repaired: report.repaired, warnings: boundedMigrationWarnings(report.warnings), inspection: report.inspection, summary: report.summary, audit: report.audit}, null, 2);
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
function parseCsvRows(text: string): {rows: string[][]; truncated: boolean; incompleteRows: number} {
    const source = text.replace(/^\uFEFF/, "");
    let truncated = source.length > CSV_IMPORT_MAX_CHARS;
    const limit = Math.min(source.length, CSV_IMPORT_MAX_CHARS);
    const rows: string[][] = [];
    let incompleteRows = 0;
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    let cellQuoted = false;
    let stoppedAtRowLimit = false;
    const pushCompletedRow = (): boolean => {
        if (!row.some((value) => value !== "")) {
            row = [];
            return true;
        }
        /* 不把上限之外的第一行也放入结果：调用方的计数和提示必须与实际可导入行一致。 */
        if (rows.length >= CSV_IMPORT_MAX_ROWS) {
            truncated = true;
            stoppedAtRowLimit = true;
            return false;
        }
        rows.push(row);
        row = [];
        return true;
    };
    for (let index = 0; index < limit && !stoppedAtRowLimit; index += 1) {
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
            if (!pushCompletedRow()) break;
        } else cell += char;
    }
    const hitCharLimit = limit < source.length;
    if (!stoppedAtRowLimit && (quoted || hitCharLimit)) {
        /* 文件被截断或引号未闭合时，尾部只能是半行；丢弃整行并计为无效，
           避免把用户粘贴到一半的记录静默导入。 */
        if (quoted || row.length > 0 || cell !== "") incompleteRows += 1;
    } else if (!stoppedAtRowLimit) {
        row.push(cellQuoted ? cell : cell.trim());
        pushCompletedRow();
    }
    return {rows, truncated, incompleteRows};
}

export function parseCheckinCsv(text: string): CsvImportResult {
    const {rows: table, truncated, incompleteRows} = parseCsvRows(text);
    if (!table.length) {
        return {
            rows: [],
            invalid: incompleteRows,
            truncated,
            errors: incompleteRows ? [{line: 1, reason: "CSV 行不完整或引号未闭合"}] : [],
        };
    }
    /* 表头别名：导出表头全集（T-1628）+ 既有中英文别名（旧文件不断）。 */
    const header = table[0].map((cell) => cell.toLowerCase());
    const nameIndex = header.findIndex((cell) => cell === "名称" || cell === "name" || cell === "itemname");
    const dateIndex = header.findIndex((cell) => cell === "日期" || cell === "date" || cell === "localdate");
    const valueIndex = header.findIndex((cell) => cell === "数值" || cell === "value");
    const unitIndex = header.findIndex((cell) => cell === "单位" || cell === "unit");
    if (nameIndex < 0 || dateIndex < 0) return {rows: [], invalid: table.length - 1 + incompleteRows, truncated, errors: []};
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
    if (incompleteRows) errors.push({line: table.length, reason: "CSV 行不完整或引号未闭合"});
    return {rows, invalid: invalid + incompleteRows, truncated, errors: errors.slice(0, 10)};
}
