/* T-1353 摘要驻留守门：偏好归一（opt-in 默认关、docId 校验）、白名单行格式、
   幂等查询构造、SQL 响应收口、设置页结构与宿主接线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-summary-resident-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/view-preferences.ts", "src/render/settings.ts", "src/index.ts"].forEach(transpile);
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const resident = require(path.join(outputRoot, "src/features/summary-resident.js"));

/* 偏好归一：默认关；docId 走块 ID 校验；enabled 无合法 docId 不物化。 */
assert.deepEqual(normalizeViewPreferences({}).summaryResident, {enabled: false, docId: ""}, "summary resident defaults to off");
assert.equal(normalizeViewPreferences({summaryResident: {enabled: true, docId: ""}}).summaryResident.enabled, false, "enabled without a doc id must not materialize");
assert.equal(normalizeViewPreferences({summaryResident: {enabled: true, docId: "short"}}).summaryResident.enabled, false, "enabled with an invalid doc id must not materialize");
assert.deepEqual(normalizeViewPreferences({summaryResident: {enabled: true, docId: "20260101120000-abcdef1234"}}).summaryResident, {enabled: true, docId: "20260101120000-abcdef1234"});
assert.equal(normalizeViewPreferences({summaryResident: {enabled: false, docId: "20260101120000-abcdef1234"}}).summaryResident.enabled, false, "saved doc keeps enabled=false until the user opts in");
assert.deepEqual(normalizeViewPreferences({summaryResident: "bogus"}).summaryResident, {enabled: false, docId: ""}, "non-object payload falls back to off");
assert.deepEqual(resident.normalizeSummaryResidentPreference(undefined), {enabled: false, docId: ""}, "undefined payload falls back to off");

/* 白名单行：日期 + 完成比 + 记录数 + 非零来源计数 + ASCII 标记；零计数来源不出现。 */
const line = resident.buildDailySummaryLine({
    date: "2026-09-21",
    completed: 5,
    scheduled: 7,
    recordsText: "记录 9 次",
    sources: [
        {label: "手动记录", count: 5},
        {label: "番茄钟插件", count: 0},
        {label: "接口写入", count: 4},
        {label: "导入", count: 0},
    ],
});
assert.equal(line, "- 2026-09-21 · 5/7 · 记录 9 次 · 手动记录 5 · 接口写入 4 (lv-checkin-summary)", "summary line follows the whitelist format with zero-count sources omitted");
assert.ok(!/备注|note|externalRef/.test(line), "summary line must not contain note/identity fields");
const zeroLine = resident.buildDailySummaryLine({date: "2026-09-21", completed: 0, scheduled: 0, recordsText: "记录 0 次", sources: []});
assert.equal(zeroLine, "- 2026-09-21 · 0/0 · 记录 0 次 (lv-checkin-summary)", "empty day still yields a well-formed line");
const fractionalLine = resident.buildDailySummaryLine({date: "2026-09-21", completed: 2.6, scheduled: 4.2, recordsText: "3 records", sources: [{label: "Manual", count: 2.4}]});
assert.equal(fractionalLine, "- 2026-09-21 · 3/4 · 3 records · Manual 2 (lv-checkin-summary)", "numeric fields are rounded to integers");

/* 幂等查询：docId/日期不合法时拒绝生成；合法时按 root_id + 日期 + 标记三条件收敛。 */
assert.equal(resident.buildSummaryDuplicateQuery("bad id", "2026-09-21"), "", "invalid doc id must not produce a query");
assert.equal(resident.buildSummaryDuplicateQuery("20260101120000-abcdef1234", "2026/09/21"), "", "invalid date must not produce a query");
const query = resident.buildSummaryDuplicateQuery("20260101120000-abcdef1234", "2026-09-21");
assert.ok(query.includes("root_id = '20260101120000-abcdef1234'"), "query scopes to the bound document");
assert.ok(query.includes("LIKE '%2026-09-21%'") && query.includes("LIKE '%lv-checkin-summary%'"), "query matches date and marker");
assert.ok(query.includes("LIMIT 1"), "query is bounded");

/* SQL 响应收口：数组与 {rows} 包裹两种形态，其余一律空。 */
assert.equal(resident.extractSummaryRows({code: 0, data: [{id: "a"}]}).length, 1, "array data passes through");
assert.equal(resident.extractSummaryRows({code: 0, data: {rows: [{id: "a"}]}}).length, 1, "wrapped rows pass through");
assert.equal(resident.extractSummaryRows({code: 0}).length, 0, "missing data yields no rows");
assert.equal(resident.extractSummaryRows(null).length, 0, "null response yields no rows");

/* 设置页结构：三行控件与操作钩子齐备，与日记集成同构。 */
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
for (const hook of ["data-summary-resident", "data-summary-toggle", "data-summary-doc", "save-summary-doc", "write-summary-now"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}

/* i18n：新键中英双语齐备（沿用 i18n-parity 的行级计数口径）。 */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
const summaryKeys = [
    "set.summaryTitle", "set.summaryHint", "set.summaryToggle", "set.summaryDoc", "set.summaryDocHint",
    "set.summaryDocPending", "set.summarySave", "set.summaryWriteNow", "set.summaryWriteNowHint",
    "msg.summaryWritten", "msg.summaryWriteFailed", "msg.summaryNotBound", "msg.summaryNeedDoc",
    "msg.summaryDocSaved", "msg.summaryDocInvalid", "summary.residentRecords",
];
for (const key of summaryKeys) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} must exist in both zh and en dictionaries`);
}

/* 宿主接线：打卡完成路径挂旁路写入、SQL 幂等查询、审计通道、持久化与渲染上下文。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.ok(indexSource.includes("void this.writeSummaryResidentForDate(event.localDate);"), "record completion must trigger the resident summary bypass");
assert.ok(indexSource.includes('"/api/query/sql"'), "duplicate check must go through the kernel SQL endpoint");
assert.ok(indexSource.includes('channel: "summary-resident"'), "writes must land in the audit trail under the dedicated channel");
assert.ok(indexSource.includes("writeSummaryResidentForDate(event.localDate)") && indexSource.includes("writeSummaryResidentNow()"), "both automatic and manual paths must exist");
assert.ok(indexSource.includes("summaryResident: {...this.summaryResident}"), "preference persist and settings context must carry the field");

assert.ok(true);
console.log("summary-resident: all gates passed");
