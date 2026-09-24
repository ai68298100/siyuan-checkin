const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const modelSource = fs.readFileSync(path.join(sourceRoot, "model.ts"), "utf8");
const rulesSource = fs.readFileSync(path.join(sourceRoot, "rules.ts"), "utf8");
assert.match(rulesSource, /orderedRevisionCache = new WeakMap/,
    "revision ordering must be cached by immutable revisions-array identity");
assert.match(rulesSource, /const middle = \(low \+ high\) >>> 1/,
    "revision lookup must use an upper-bound binary search");
assert.doesNotMatch(rulesSource, /const revisions = \[\.\.\.\(item\.revisions \|\| \[\]\)\][\s\S]{0,160}\.filter/,
    "each lookup must not copy and filter the complete revision history");
assert.match(modelSource, /export \{getItemRevisionForDate\} from "\.\/rules"/,
    "model must preserve its public revision helper through a compatible re-export");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-revision-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {getItemRevisionForDate} = require(path.join(outputRoot, "model.js"));
const revision = (effectiveDate, target, unit = "次", schedule = {type: "daily"}) => ({
    effectiveDate, kind: "count", target, unit, schedule,
});
const makeItem = (id, revisions) => ({
    id, name: id, icon: "✓", kind: "count", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01",
    revisions, archivePeriods: [], group: "测试", priority: "medium", sortOrder: 0, timeSlot: "all",
});
const at = (month, day) => new Date(2026, month - 1, day, 12);

for (let index = 1; index <= 25; index += 1) {
    const revisions = [
        revision("2026-03-01", index + 20, "分钟", {type: "weekly", weekdays: [1, 3, 5]}),
        revision("2026-01-01", index, "次"),
        revision("2026-02-01", index + 10, "毫升", {type: "interval", intervalDays: 2, anchorDate: "2026-02-01"}),
    ];
    const originalOrder = revisions.map((entry) => entry.effectiveDate);
    const item = makeItem(`item-${index}`, revisions);
    const january = getItemRevisionForDate(item, at(1, 15));
    const february = getItemRevisionForDate(item, at(2, 15));
    const march = getItemRevisionForDate(item, at(3, 15));
    assert.equal(january.target, index, `case ${index}: earliest effective revision is selected`);
    assert.deepEqual([february.target, february.unit, february.schedule.type], [index + 10, "毫升", "interval"], `case ${index}: middle revision remains exact`);
    assert.deepEqual([march.target, march.unit, march.schedule.type], [index + 20, "分钟", "weekly"], `case ${index}: latest revision remains exact`);
    assert.deepEqual(revisions.map((entry) => entry.effectiveDate), originalOrder, `case ${index}: lookup does not reorder caller data`);
}

const replaceable = makeItem("replaceable", [revision("2026-01-01", 1)]);
assert.equal(getItemRevisionForDate(replaceable, at(3, 1)).target, 1);
const replaced = {...replaceable, revisions: [revision("2026-01-01", 1), revision("2026-02-01", 9)]};
assert.equal(getItemRevisionForDate(replaced, at(3, 1)).target, 9, "replacing the revisions array invalidates the projection naturally");

const manyRevisions = Array.from({length: 1000}, (_, index) => {
    const date = new Date(2020, 0, 1, 12);
    date.setDate(date.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return revision(key, index + 1);
});
const largeItem = makeItem("large", manyRevisions);
getItemRevisionForDate(largeItem, new Date(2022, 8, 26, 12));
const startedAt = performance.now();
for (let index = 0; index < 100000; index += 1) {
    const result = getItemRevisionForDate(largeItem, new Date(2020 + index % 3, index % 12, index % 28 + 1, 12));
    assert.ok(result.target > 0);
}
const elapsed = performance.now() - startedAt;
assert.ok(elapsed < 1500, `100k cached revision lookups must finish within 1.5s, received ${elapsed.toFixed(1)}ms`);
console.log(`Revision index checks passed: 25 cases, 100 matrix assertions; 100k cached lookups ${elapsed.toFixed(1)}ms.`);
