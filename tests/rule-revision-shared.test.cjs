const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const rulesSource = fs.readFileSync(path.join(sourceRoot, "rules.ts"), "utf8");
assert.doesNotMatch(rulesSource, /\[\.\.\.\(item\.revisions \|\| \[\]\)\]\.sort/,
    "rule evaluation must not maintain a second revision sorting implementation");
assert.match(rulesSource, /const revision = getItemRevisionForDate\(item, date\);\s*const status = getRuleStatusForRevision\(item, date, revision\);/,
    "one rule evaluation must resolve and reuse exactly one effective revision");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-rule-revision-"));
for (const filename of ["types.ts", "rules.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {evaluateRule, getRuleStatus} = require(path.join(outputRoot, "rules.js"));
const revision = (effectiveDate, target, unit, schedule) => ({effectiveDate, kind: "count", target, unit, schedule});
const makeItem = (id, revisions) => ({
    id, name: id, icon: "✓", kind: "count", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01",
    revisions, archivePeriods: [], group: "测试", priority: "medium", sortOrder: 0, timeSlot: "all",
});
const makeEvent = (id, itemId, localDate, value, unit) => ({
    id, itemId, occurredAt: `${localDate}T08:00:00.000Z`, localDate, value, unit, source: "manual",
});

for (let index = 1; index <= 25; index += 1) {
    const item = makeItem(`rule-${index}`, [
        revision("2026-03-01", index + 2, "分钟", {type: "weekly", weekdays: [1, 3, 5]}),
        revision("2026-01-01", index, "次", {type: "daily"}),
        revision("2026-02-01", index + 1, "毫升", {type: "interval", intervalDays: 2, anchorDate: "2026-02-01"}),
    ]);
    const date = new Date(2026, 2, 2, 12);
    const events = [makeEvent(`event-${index}`, item.id, "2026-03-02", index + 2, "分钟")];
    const result = evaluateRule(item, events, date);
    assert.equal(getRuleStatus(item, date), "scheduled", `case ${index}: shared revision drives schedule status`);
    assert.equal(result.target, index + 2, `case ${index}: shared revision drives target`);
    assert.equal(result.unit, "分钟", `case ${index}: shared revision drives unit`);
    assert.deepEqual([result.progress, result.complete], [index + 2, true], `case ${index}: shared revision drives completion`);
}

const manyRevisions = Array.from({length: 1000}, (_, index) => {
    const date = new Date(2020, 0, 1, 12);
    date.setDate(date.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return revision(key, index + 1, "次", {type: "daily"});
});
const largeItem = {
    ...makeItem("large-rule", manyRevisions),
    createdAt: "2020-01-01T00:00:00.000Z",
    createdDate: "2020-01-01",
};
evaluateRule(largeItem, [], new Date(2022, 8, 26, 12));
const startedAt = performance.now();
for (let index = 0; index < 100000; index += 1) {
    const result = evaluateRule(largeItem, [], new Date(2020 + index % 3, index % 12, index % 28 + 1, 12));
    assert.equal(result.status, "scheduled");
}
const elapsed = performance.now() - startedAt;
assert.ok(elapsed < 2000, `100k shared rule revision evaluations must finish within 2s, received ${elapsed.toFixed(1)}ms`);
console.log(`Shared rule revision checks passed: 25 cases, 100 matrix assertions; 100k evaluations ${elapsed.toFixed(1)}ms.`);
