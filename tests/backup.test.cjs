const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const compiledCache = new Map();
function loadTs(filename) {
    if (compiledCache.has(filename)) return compiledCache.get(filename).exports;
    const loaded = {exports: {}};
    compiledCache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
    const localRequire = (name) => name.startsWith(".")
        ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}

const {normalizeStore} = loadTs(path.join(__dirname, "..", "src", "model.ts"));
const {parseJsonBackup, JSON_BACKUP_MAX_CHARS, classifyJsonRecoveryError, preflightJsonRecovery, serializeJson, summarizeJsonBackup: summarizeProductionBackup} = loadTs(path.join(__dirname, "..", "src", "export.ts"));
function summarizeJsonBackup(store) {
    const dates = store.events.map((event) => event.localDate).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return {itemCount: store.items.length, eventCount: store.events.length, tombstoneCount: store.eventTombstones.length, templateCount: store.templates?.length || 0, archivedItemCount: store.items.filter((item) => item.archived).length, dateRange: dates.length ? {from: dates[0], to: dates[dates.length - 1]} : undefined};
}
function auditJsonBackup(before, after) {
    return {itemDelta: after.itemCount - before.itemCount, eventDelta: after.eventCount - before.eventCount, tombstoneDelta: after.tombstoneCount - before.tombstoneCount, templateDelta: after.templateCount - before.templateCount, archivedItemDelta: after.archivedItemCount - before.archivedItemCount, dateRangeChanged: (before.dateRange?.from || "") !== (after.dateRange?.from || "") || (before.dateRange?.to || "") !== (after.dateRange?.to || "")};
}
function buildJsonMigrationReport(text, normalize, before) {
    const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    const normalized = normalize(parsed);
    const summary = summarizeJsonBackup(normalized);
    return {sourceVersion: parsed.version ?? "unknown", targetVersion: normalized.version, audit: before ? auditJsonBackup(before, summary) : undefined};
}
function assessJsonMigration(report) {
    const reasons = [...report.warnings || []];
    if (report.repaired && !reasons.some((reason) => reason.includes("迁移"))) reasons.push("备份内容已标准化修复");
    if (report.audit && (report.audit.itemDelta < 0 || report.audit.eventDelta < 0 || report.audit.tombstoneDelta < 0)) reasons.push("恢复后数据数量减少，请确认删除项");
    return {requiresReview: reasons.length > 0, reasons};
}
function validateJsonMigrationReport(report) {
    const errors = [];
    if (!Number.isFinite(report.targetVersion) || report.targetVersion < 1) errors.push("invalid target");
    if (!report.store || report.store.version !== report.targetVersion) errors.push("version mismatch");
    if (report.summary && report.store && report.summary.itemCount !== report.store.items.length) errors.push("summary mismatch");
    return errors;
}
const store = {version: 2, items: [{archived: true}, {archived: false}], events: [{localDate: "2026-09-10"}, {localDate: "2026-09-02"}, {localDate: "invalid"}], eventTombstones: [{}], templates: [{}]};
assert.deepEqual(summarizeJsonBackup(store), {itemCount: 2, eventCount: 3, tombstoneCount: 1, templateCount: 1, archivedItemCount: 1, dateRange: {from: "2026-09-02", to: "2026-09-10"}});
assert.deepEqual(auditJsonBackup({itemCount: 1, eventCount: 2, tombstoneCount: 0, templateCount: 0, archivedItemCount: 0, dateRange: {from: "2026-09-01", to: "2026-09-10"}}, summarizeJsonBackup(store)), {itemDelta: 1, eventDelta: 1, tombstoneDelta: 1, templateDelta: 1, archivedItemDelta: 1, dateRangeChanged: true});
assert.deepEqual(buildJsonMigrationReport(JSON.stringify({version: 1}), (value) => ({...value, version: 2, items: [], events: [], eventTombstones: []}), undefined), {sourceVersion: 1, targetVersion: 2, audit: undefined});
assert.deepEqual(buildJsonMigrationReport("\uFEFF" + JSON.stringify({items: []}), (value) => ({...value, version: 2, items: [], events: [], eventTombstones: []}), undefined), {sourceVersion: "unknown", targetVersion: 2, audit: undefined});
const auditedMigration = buildJsonMigrationReport(JSON.stringify({version: "legacy", items: []}), (value) => ({version: 2, items: [], events: [], eventTombstones: [], templates: []}), {itemCount: 0, eventCount: 0, tombstoneCount: 0, templateCount: 0, archivedItemCount: 0});
assert.equal(typeof auditedMigration.audit, "object");
assert.deepEqual(auditedMigration.audit, {itemDelta: 0, eventDelta: 0, tombstoneDelta: 0, templateDelta: 0, archivedItemDelta: 0, dateRangeChanged: false});
assert.throws(() => buildJsonMigrationReport("{broken", (value) => value), /JSON/);
assert.deepEqual(assessJsonMigration({warnings: [], repaired: false}), {requiresReview: false, reasons: []});
assert.equal(assessJsonMigration({warnings: [], repaired: true}).requiresReview, true);
assert.equal(assessJsonMigration({warnings: [], repaired: false, audit: {itemDelta: -1, eventDelta: 0, tombstoneDelta: 0}}).requiresReview, true);
assert.deepEqual(validateJsonMigrationReport({targetVersion: 2, store: {version: 2, items: [], events: []}, summary: {itemCount: 0, eventCount: 0}}), []);
assert.equal(validateJsonMigrationReport({targetVersion: 0, store: {version: 0, items: [], events: []}, summary: {itemCount: 0, eventCount: 0}}).length, 1);
assert.match(JSON.stringify({sourceVersion: 1, targetVersion: 2, repaired: true, warnings: ["legacy"]}), /sourceVersion/);
const exporter = fs.readFileSync("src/export.ts", "utf8");
assert.match(exporter, /JSON_BACKUP_MAX_CHARS = 8 \* 1024 \* 1024/, "JSON 主档必须有明确的字符上限");
assert.match(exporter, /duplicateItemIds/);
assert.match(exporter, /duplicateEventIds/);
assert.match(exporter, /duplicateTombstoneIds/);
assert.match(exporter, /missingEventItemIds/);
assert.match(exporter, /unitConflicts/);
assert.match(exporter, /appendInspectionWarnings\(warnings, inspection\)/, "导入前结构检查必须进入用户可见的兼容性提示");
assert.match(exporter, /inspection: report\.inspection/, "恢复审计必须保留结构检查结果");
const rawInspection = {
    version: 3,
    items: [{id: "item-1", unit: "次"}, {id: "item-1", unit: "次"}],
    events: [{id: "event-1", itemId: "item-1", unit: "分钟"}, {id: "event-1", itemId: "item-1", unit: "次"}, {id: "event-2", itemId: "missing", unit: "次"}],
    eventTombstones: [{eventId: "event-1"}, {eventId: "event-1"}],
};
const inspected = parseJsonBackup(JSON.stringify(rawInspection), () => ({version: 3, items: rawInspection.items, events: rawInspection.events, eventTombstones: rawInspection.eventTombstones}));
assert.deepEqual(inspected.inspection, {duplicateItemIds: 1, duplicateEventIds: 1, duplicateTombstoneIds: 1, missingEventItemIds: 1, unitConflicts: 1});
assert.equal(inspected.warnings.length, 5, "每类结构损耗都必须进入恢复前提示");
assert.throws(() => parseJsonBackup("x".repeat(JSON_BACKUP_MAX_CHARS + 1), () => ({version: 3, items: [], events: [], eventTombstones: []})), /8 MiB/);
assert.equal(classifyJsonRecoveryError(new Error("备份文件超过 8 MiB 上限")), "json-too-large");
assert.equal(classifyJsonRecoveryError(new Error("备份 JSON 无法解析")), "json-parse");
assert.equal(classifyJsonRecoveryError(new Error("备份必须是 JSON 对象")), "json-shape");
assert.equal(classifyJsonRecoveryError(new Error("normalizer failed")), "json-normalize");

// T-1647：用生产模型和导出/预检模块走一遍“备份 → 受控改动 → 恢复复核”。
const item = (id, name, unit = "次") => ({
    id, name, icon: "check", kind: "binary", target: 1, unit,
    schedule: {type: "daily"}, createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
    createdDate: "2026-10-01", revisions: [], archivePeriods: [], archived: false,
});
const seededRaw = {
    version: 3,
    items: [item("item-reading", "阅读")],
    events: [{id: "event-reading", itemId: "item-reading", occurredAt: "2026-10-01T08:00:00.000Z", localDate: "2026-10-01", value: 1, unit: "次", source: "manual"}],
    eventTombstones: [{eventId: "event-removed", deletedAt: "2026-10-01T09:00:00.000Z", itemId: "item-reading", source: "manual"}],
};
const seededStore = normalizeStore(seededRaw);
const independentConfig = {theme: "dark", sourceKey: "must-stay-outside-main-store"};
const exportedMainStore = serializeJson(seededStore);
assert.match(exportedMainStore, /event-reading/);
assert.doesNotMatch(exportedMainStore, /must-stay-outside-main-store/, "独立配置不能混入 JSON 主档");

const changedStore = normalizeStore({
    ...seededRaw,
    items: [...seededRaw.items, item("item-running", "跑步")],
    events: [...seededRaw.events, {id: "event-running", itemId: "item-running", occurredAt: "2026-10-02T08:00:00.000Z", localDate: "2026-10-02", value: 1, unit: "次", source: "manual"}],
});
const preflight = preflightJsonRecovery(exportedMainStore, normalizeStore, summarizeProductionBackup(changedStore));
assert.deepEqual(preflight.validationErrors, []);
assert.deepEqual(preflight.report.store, seededStore, "恢复结果必须回到导出时的主档快照");
assert.equal(preflight.report.store.eventTombstones.length, 1, "恢复必须保留墓碑");
assert.equal(preflight.report.audit.itemDelta, -1, "受控改动应在恢复预检中显示项目减少");
assert.equal(preflight.report.audit.eventDelta, -1, "受控改动应在恢复预检中显示记录减少");
assert.equal(preflight.assessment.requiresReview, true, "恢复后数据减少必须要求用户复核");
assert.deepEqual(independentConfig, {theme: "dark", sourceKey: "must-stay-outside-main-store"}, "独立配置在恢复旅程中保持原值");
console.log("Backup summary checks passed.");
