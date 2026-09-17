const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-range-index-"));
for (const filename of ["model.ts", "record-step.ts", "quota.ts", "rules.ts", "types.ts"]) {
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

const largeEvents = Array.from({length: 100000}, (_, index) => {
    const day = (index % 1000) + 1;
    const date = new Date(Date.UTC(2024, 0, day));
    const localDate = date.toISOString().slice(0, 10);
    return {id:`large-${index}`,itemId:`item-${index % 100}`,occurredAt:date.toISOString(),localDate,value:1,unit:"次",source:"manual"};
});
const largeStore = {version:2,items:[],events:largeEvents,eventTombstones:[]};
const largeStart = performance.now();
const firstLargeRange = getEventsInDateRange(largeStore,"2026-01-01","2026-02-01");
const firstLargeMs = performance.now() - largeStart;
assert.equal(firstLargeRange.length,3100,"100k range query returns the exact January bucket");
assert.ok(firstLargeMs < 5000,`100k lazy range index must build within 5s (took ${Math.round(firstLargeMs)}ms)`);
const cachedLargeProjection = getStoreIndex(largeStore).byDateOrdered;
for (let index = 0; index < 25; index += 1) {
    const month = (index % 12) + 1;
    const start = `2025-${String(month).padStart(2,"0")}-01`;
    const endDate = new Date(Date.UTC(2025,month,1)).toISOString().slice(0,10);
    const queryStart = performance.now();
    const result = getEventsInDateRange(largeStore,start,endDate);
    const queryMs = performance.now() - queryStart;
    assert.ok(result.length > 0,`100k cached range ${index + 1} returns events`);
    assert.ok(queryMs < 1000,`100k cached range ${index + 1} stays under 1s (took ${Math.round(queryMs)}ms)`);
    assert.equal(getStoreIndex(largeStore).byDateOrdered,cachedLargeProjection,`100k cached range ${index + 1} reuses projection`);
    assert.equal(result.every((event)=>event.localDate >= start && event.localDate < endDate),true,`100k cached range ${index + 1} respects half-open bounds`);
}

console.log(`Date range index checks passed: 25 half-open ranges, 25 identities and 100k stress (${Math.round(firstLargeMs)}ms initial).`);
