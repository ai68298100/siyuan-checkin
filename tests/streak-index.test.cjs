const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-streak-index-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const helperSource = fs.readFileSync(path.join(sourceRoot, "model-helpers.ts"), "utf8");
assert.match(helperSource, /computeStreaksValue[\s\S]*?return computeEventStreaks\(store, currentCalendarDate\(\)\)/,
    "Today streak helper must consume the shared indexed projection");

const asOf = new Date(2026, 8, 17, 12);
const dateAtOffset = (offset, base = asOf) => {
    const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset, 12);
    return model.dateKey(date);
};
const makeItem = (id, overrides = {}) => ({
    id,
    name: id,
    icon: "📌",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    createdDate: "2025-01-01",
    revisions: [],
    archivePeriods: [],
    group: "测试",
    priority: "medium",
    sortOrder: 1,
    timeSlot: "any",
    ...overrides,
});
const makeEvent = (id, itemId, localDate) => ({
    id,
    itemId,
    occurredAt: `${localDate}T08:00:00.000Z`,
    localDate,
    value: 1,
    unit: "次",
    source: "manual",
});

for (let index = 1; index <= 25; index += 1) {
    const active = makeItem(`active-${index}`);
    const isolated = makeItem(`isolated-${index}`, {sortOrder: 2});
    const archived = makeItem(`archived-${index}`, {archived: true, sortOrder: 3});
    const expected = (index % 12) + 1;
    const startOffset = index % 2;
    const activeEvents = Array.from({length: expected}, (_, day) => makeEvent(
        `active-event-${index}-${day}`,
        active.id,
        dateAtOffset(startOffset + day),
    ));
    activeEvents.push(makeEvent(`active-duplicate-${index}`, active.id, dateAtOffset(startOffset)));
    const store = model.normalizeStore({
        version: 2,
        items: [active, isolated, archived],
        events: [
            ...activeEvents,
            makeEvent(`isolated-event-${index}`, isolated.id, dateAtOffset(0)),
            makeEvent(`archived-event-${index}`, archived.id, dateAtOffset(0)),
        ],
        eventTombstones: [],
    });
    const streaks = model.computeEventStreaks(store, asOf);
    assert.equal(streaks.get(active.id), expected, `case ${index}: current or yesterday streak remains consecutive`);
    assert.equal(streaks.get(isolated.id), 1, `case ${index}: another item keeps an isolated streak`);
    assert.equal(streaks.get(archived.id), 0, `case ${index}: archived item remains zero`);
    assert.equal(model.getEventDatesForItem(store, active.id).size, expected, `case ${index}: duplicate records share one natural day`);
}

const gapItem = makeItem("gap");
const gapStore = model.normalizeStore({version: 2, items: [gapItem], events: [makeEvent("gap-event", gapItem.id, dateAtOffset(2))], eventTombstones: []});
assert.equal(model.computeEventStreaks(gapStore, asOf).get(gapItem.id), 0, "a streak older than yesterday is no longer current");
const yearBoundary = new Date(2026, 0, 1, 12);
const yearItem = makeItem("year-boundary");
const yearStore = model.normalizeStore({version: 2, items: [yearItem], events: [
    makeEvent("year-current", yearItem.id, dateAtOffset(0, yearBoundary)),
    makeEvent("year-previous", yearItem.id, dateAtOffset(1, yearBoundary)),
], eventTombstones: []});
assert.equal(model.computeEventStreaks(yearStore, yearBoundary).get(yearItem.id), 2, "calendar stepping crosses a year boundary");
assert.equal(model.getEventDatesForItem(yearStore, "missing"), model.getEventDatesForItem(yearStore, "missing"), "missing items reuse a stable empty projection");

const largeItems = Array.from({length: 100}, (_, itemIndex) => makeItem(`large-${itemIndex}`, {sortOrder: itemIndex}));
const largeEvents = largeItems.flatMap((item, itemIndex) => Array.from({length: 1000}, (_, eventIndex) =>
    makeEvent(`large-event-${itemIndex}-${eventIndex}`, item.id, "2020-01-01")));
const largeStore = model.normalizeStore({version: 2, items: largeItems, events: largeEvents, eventTombstones: []});
model.getStoreIndex(largeStore);
const cachedDates = model.getEventDatesForItem(largeStore, largeItems[0].id);
const startedAt = performance.now();
const largeStreaks = model.computeEventStreaks(largeStore, asOf);
const elapsed = performance.now() - startedAt;
assert.equal(largeStreaks.size, largeItems.length, "100k projection returns every item");
assert.equal([...largeStreaks.values()].every((value) => value === 0), true, "historical-only events do not create current streaks");
assert.equal(model.getEventDatesForItem(largeStore, largeItems[0].id), cachedDates, "warmed date projection is reused by identity");
assert.ok(elapsed < 250, `warmed 100k streak projection must finish within 250ms, received ${elapsed.toFixed(1)}ms`);
console.log(`Streak index checks passed: 25 cases, 100 matrix assertions; warmed 100k projection ${elapsed.toFixed(1)}ms.`);
