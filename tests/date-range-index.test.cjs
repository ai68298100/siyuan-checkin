const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-range-index-"));
for (const filename of ["model.ts", "quota.ts", "rules.ts", "types.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), output, "utf8");
}

const {getEventsInDateRange, getStoreIndex} = require(path.join(outputRoot, "model.js"));
const chronological = Array.from({length: 25}, (_, index) => ({
    id: `range-${index}`,
    itemId: `item-${index % 4}`,
    occurredAt: `2026-09-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
    localDate: `2026-09-${String(index + 1).padStart(2, "0")}`,
    value: 1,
    unit: "次",
    source: "manual",
}));
const events = chronological.filter((_, index) => index % 2 === 1).concat(
    chronological.filter((_, index) => index % 2 === 0),
);
const store = {version: 2, items: [], events, eventTombstones: []};
assert.equal(getStoreIndex(store).byDateOrdered, undefined, "range ordering stays lazy before the first range query");

for (let index = 0; index < 25; index += 1) {
    const day = `2026-09-${String(index + 1).padStart(2, "0")}`;
    const next = index === 24 ? "2026-09-26" : `2026-09-${String(index + 2).padStart(2, "0")}`;
    const result = getEventsInDateRange(store, day, next);
    assert.deepEqual(result.map((event) => event.id), [`range-${index}`], `half-open range case ${index + 1}`);
    assert.equal(result[0], chronological[index], `range identity case ${index + 1}`);
}

assert.deepEqual(getEventsInDateRange(store, "2026-09-10", "2026-09-10"), [], "empty half-open range stays empty");
assert.deepEqual(getEventsInDateRange(store, "2026-09-11", "2026-09-10"), [], "reversed range stays empty");
assert.deepEqual(
    getEventsInDateRange(store, "2026-09-01", "2026-10-01").map((event) => event.id),
    events.map((event) => event.id),
    "range results preserve persistent event order",
);
assert.deepEqual(getEventsInDateRange(store, "2025-01-01", "2025-02-01"), [], "outside range stays empty");
const cachedRangeIndex = getStoreIndex(store).byDateOrdered;
assert.ok(Array.isArray(cachedRangeIndex), "the first range query builds the ordered projection");
getEventsInDateRange(store, "2026-09-05", "2026-09-08");
assert.equal(getStoreIndex(store).byDateOrdered, cachedRangeIndex, "later range queries reuse the ordered projection");

console.log("Date range index checks passed: 25 half-open ranges + 25 identity checks and order boundaries.");
