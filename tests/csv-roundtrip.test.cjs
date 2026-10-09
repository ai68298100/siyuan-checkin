/* T-1628 守门：CSV 自导出→回导无损往返 + 严格日历 + RFC 解析 + 公式中和 + 上限。
   - 导出表头全集被导入识别（此前回导 0 行）；
   - 引号字段（含逗号/双引号/换行）跨物理行不拆散；
   - 2026-02-30 等被 JS Date 归一的日期拒绝（date-keys 真实日历校验）；
   - 文本列公式中和（=+-@ 开头加前导引号）；
   - 行数上限截断标记；旧中英文别名文件不断。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-csv-roundtrip-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "export.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
const exporter = require(path.join(dir, "export.js"));

const store = {
    version: 3,
    items: [
        {id: "read", name: "深度阅读", archived: false},
        {id: "water", name: "喝水", archived: false},
        {id: "gone", name: "已删除项目", archived: false},
    ],
    events: [
        {id: "e1", itemId: "read", occurredAt: "2026-09-01T08:00:00.000Z", localDate: "2026-09-01", value: 30, unit: "分钟", source: "manual", note: "普通备注"},
        {id: "e2", itemId: "water", occurredAt: "2026-09-02T09:10:00.000Z", localDate: "2026-09-02", value: 1, unit: "次", source: "api", externalRef: "ext://abc"},
        {id: "e3", itemId: "gone", occurredAt: "2026-09-03T10:20:00.000Z", localDate: "2026-09-03", value: 5, unit: "页", source: "import", note: "带,逗号、\"双引\"与\n换行的备注"},
    ],
    eventTombstones: [],
};

/* —— 自导出→回导无损往返（行级：name/date/value/unit） —— */
const csv = exporter.serializeCsv(store);
const parsed = exporter.parseCheckinCsv(csv);
assert.equal(parsed.truncated, false, "normal exports are not truncated");
assert.equal(parsed.invalid, 0, "own export must re-import with zero invalid rows (previously 0 rows parsed at all)");
assert.equal(parsed.rows.length, 3, "every exported event row round-trips");
const byDate = new Map(parsed.rows.map((row) => [row.date, row]));
assert.equal(byDate.get("2026-09-01").name, "深度阅读");
assert.equal(byDate.get("2026-09-01").value, 30);
assert.equal(byDate.get("2026-09-01").unit, "分钟");
assert.equal(byDate.get("2026-09-02").value, 1);
assert.equal(byDate.get("2026-09-02").binary, true, "value 1 stays binary");
assert.equal(byDate.get("2026-09-03").value, 5);
assert.equal(byDate.get("2026-09-03").binary, false, "value 5 stays numeric");

/* —— RFC 4180：引号字段跨物理行不拆散 —— */
assert.ok(csv.includes("\"带,逗号、\"\"双引\"\"与\n换行的备注\""), "quoted field with comma/quote/newline is RFC-escaped on export");
const multiline = exporter.parseCheckinCsv(csv);
assert.equal(multiline.rows.length, 3, "embedded newlines must not split rows");

/* —— 严格日历校验 —— */
const hostileDates = exporter.parseCheckinCsv("名称,日期\n阅读,2026-02-30\n阅读,2026-13-01\n阅读,2026-09-01");
assert.equal(hostileDates.invalid, 2, "non-calendar dates (02-30, 13-01) are rejected");
assert.equal(hostileDates.rows.length, 1);
const leapOk = exporter.parseCheckinCsv("名称,日期\n阅读,2028-02-29");
assert.equal(leapOk.rows.length, 1, "leap-day 2028-02-29 is accepted");

/* —— 公式中和（导出侧） —— */
const formulaStore = {version: 3, items: [{id: "x", name: "=SUM(A1)", archived: false}], events: [{id: "f1", itemId: "x", occurredAt: "2026-09-04T00:00:00.000Z", localDate: "2026-09-04", value: 1, unit: "次", source: "manual", note: "+cmd|'/../etc"}], eventTombstones: []};
const formulaCsv = exporter.serializeCsv(formulaStore);
assert.ok(formulaCsv.includes("'=SUM(A1)"), "item names starting with = get a leading apostrophe");
assert.ok(formulaCsv.includes("'+cmd"), "notes starting with + get neutralized too");
const formulaBack = exporter.parseCheckinCsv(formulaCsv);
assert.equal(formulaBack.invalid, 0, "neutralized names still round-trip as rows");

/* —— 公式中和只作用于文本列：负数值不得被篡改（insight-records 守门同款回归）。 —— */
const negativeStore = {version: 3, items: [{id: "x", name: "对比", archived: false}], events: [{id: "n1", itemId: "x", occurredAt: "2026-09-04T00:00:00.000Z", localDate: "2026-09-04", value: -2.5, unit: "次", source: "manual"}], eventTombstones: []};
assert.ok(exporter.serializeCsv(negativeStore).includes(", -2.5,") || exporter.serializeCsv(negativeStore).includes(",-2.5,"), "negative numeric values must pass through untouched");

/* —— 旧别名文件兼容 —— */
const legacy = exporter.parseCheckinCsv("名称,日期,数值,单位\n跑步,2026-09-05,3,公里\n冥想,2026-09-05,,");
assert.equal(legacy.rows.length, 2, "legacy zh alias files keep importing");
assert.equal(legacy.rows[1].binary, true, "empty value stays binary");
const legacyEn = exporter.parseCheckinCsv("name,date\nrun,2026-09-05");
assert.equal(legacyEn.rows.length, 1, "legacy en alias files keep importing");

/* —— 行数上限截断标记 —— */
const many = ["名称,日期"];
for (let index = 0; index < 20002; index += 1) many.push(`项目${index},2026-09-06`);
const truncated = exporter.parseCheckinCsv(many.join("\n"));
assert.equal(truncated.truncated, true, "over-cap files are marked truncated");
assert.ok(truncated.rows.length <= 20000, "row cap enforced");
const small = exporter.parseCheckinCsv("名称,日期\n项目,2026-09-06");
assert.equal(small.truncated, false, "under-cap files are not truncated");

/* —— 不导入半行：未闭合引号必须整行拒绝，并给出可见错误 —— */
const incomplete = exporter.parseCheckinCsv("名称,日期\n\"未闭合,2026-09-06");
assert.equal(incomplete.rows.length, 0, "unterminated quoted rows must not be imported partially");
assert.equal(incomplete.invalid, 1, "unterminated quoted rows count as invalid");
assert.match(incomplete.errors[0]?.reason || "", /不完整|未闭合/, "incomplete row exposes a useful reason");
const incompleteAfterValid = exporter.parseCheckinCsv("名称,日期\n项目,2026-09-06\n\"未闭合,2026-09-07");
assert.equal(incompleteAfterValid.rows.length, 1, "complete rows before an incomplete row remain importable");
assert.equal(incompleteAfterValid.invalid, 1, "trailing incomplete row is included in the skip count");
assert.equal(incompleteAfterValid.errors[0]?.line, 2, "incomplete row error identifies its CSV record line");

/* 行上限的结果只包含上限内记录，不把第 20001 行混入确认计数。 */
assert.equal(truncated.rows.length, 19999, "row cap excludes the first row beyond the limit (header counts toward the cap)");

/* —— 表头互通反断言：导入识别导出表头（itemName/localDate 别名在档）。 —— */
const exportSource = fs.readFileSync(path.join(root, "src", "export.ts"), "utf8");
assert.match(exportSource, /"itemname"/, "itemName export header alias must be recognized");
assert.match(exportSource, /isValidDateKey/, "date validation must use the real-calendar gate");

fs.rmSync(dir, {recursive: true, force: true});
console.log("CSV round-trip checks passed: header interop, RFC fields, strict calendar, formula neutralization, caps, legacy aliases.");
