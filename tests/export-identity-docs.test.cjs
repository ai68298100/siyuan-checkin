const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

/* 文档存在且随代码演进（生态文档守门模式：文档引用必须与实现一致）。 */
const identityDoc = read("docs", "identity-and-merge.md");
const formatsDoc = read("docs", "export-formats.md");
const readme = read("README.md");
const modelSource = read("src", "model.ts");
const exportSource = read("src", "export.ts");
const anchorSource = read("src", "features", "note-anchor.ts");

/* T-1237 身份文档与实现交叉核对。 */
assert.match(identityDoc, /event-legacy-/, "legacy deterministic id scheme documented");
assert.ok(modelSource.includes("event-legacy-"), "legacy id scheme exists in code");
assert.match(identityDoc, /\[itemId, source, externalRef\]/, "externalRef identity triple documented");
assert.ok(modelSource.includes("[event.itemId, event.source, event.externalRef]"), "identity triple matches implementation");
assert.match(identityDoc, /mergeNormalizedStores/, "merge entry point documented");
assert.match(identityDoc, /taskhorizon:<blockId>:<localDate>/, "Task Horizon externalRef example documented");
assert.ok(indexOrEcosystemHasTaskhorizon(), "taskhorizon prefix exists in code");
function indexOrEcosystemHasTaskhorizon() {
    return read("src", "index.ts").includes("taskhorizon:") || read("src", "ecosystem.ts").includes("taskhorizon:") || read("src", "api-contract.ts").includes("taskhorizon:");
}

/* T-1238 导出格式文档与实现交叉核对：CSV 表头逐字段一致。 */
const headerMatch = exportSource.match(/\["eventId", "itemId", "itemName", "occurredAt", "localDate", "value", "unit", "source", "note", "externalRef"\]/);
assert.ok(headerMatch, "serializeCsv header unchanged");
assert.ok(formatsDoc.includes("eventId,itemId,itemName,occurredAt,localDate,value,unit,source,note,externalRef"), "documented CSV header matches implementation");
for (const channel of ["JSON 全量备份", "CSV 记录导出", "Markdown 报告", "Loop Habit Tracker CSV 迁出"]) {
    assert.ok(formatsDoc.includes(channel), `export channel documented: ${channel}`);
}
for (const docTest of ["tests/backup.test.cjs", "tests/loop-csv.test.cjs", "tests/report-sections.test.cjs", "tests/api-contract.test.cjs"]) {
    assert.ok(fs.existsSync(path.join(root, docTest)), `referenced test exists: ${docTest}`);
}

/* README 指向两份文档。 */
assert.ok(readme.includes("docs/export-formats.md"), "README links the export formats doc");
assert.ok(readme.includes("docs/identity-and-merge.md"), "README links the identity doc");

/* 锚点属性键文档与实现一致。 */
assert.match(anchorSource, /ANCHOR_ATTR_KEY = "custom-lv-checkin"/, "anchor attr key unchanged");

console.log("Export & identity docs checks passed: docs track implementation facts and README links both contracts.");
