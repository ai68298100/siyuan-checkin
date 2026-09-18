const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-batch-lifecycle-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));

const makeItem = (index) => ({
    id: `item-${index}`, name: `项目 ${index}`, icon: "✓", kind: "binary", target: 1, unit: "次",
    schedule: {type: "daily"}, createdDate: "2026-01-01", createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z", revisions: [], archivePeriods: [], archived: false,
    group: "", priority: "medium", sortOrder: index, timeSlot: "any",
});
const itemCount = 100;
const eventCount = 100000;
const items = Array.from({length: itemCount}, (_, index) => makeItem(index));
const events = Array.from({length: eventCount}, (_, index) => ({
    id: `event-${index}`,
    itemId: `item-${index % itemCount}`,
    occurredAt: "2026-09-18T04:00:00.000Z",
    localDate: "2026-09-18",
    value: 1,
    unit: "次",
    source: index % 2 ? "manual" : "api",
    ...(index % 2 ? {} : {externalRef: `external-${index}`}),
}));
const store = {version: 2, items, events, eventTombstones: []};
const removedIds = items.filter((_, index) => index % 2 === 0).map((item) => item.id);

const startedAt = performance.now();
const next = model.deleteItemsCascade(store, removedIds, "2026-09-18T05:00:00.000Z");
const elapsed = performance.now() - startedAt;

assert.equal(next.items.length, 50, "only requested items are removed");
assert.equal(next.events.length, 50000, "events for retained items stay intact");
assert.equal(next.eventTombstones.length, 50000, "every removed event receives a tombstone");
assert.ok(next.items.every((item) => Number(item.id.slice(5)) % 2 === 1));
assert.ok(next.events.every((event) => Number(event.itemId.slice(5)) % 2 === 1));
const externalTombstone = next.eventTombstones.find((entry) => entry.externalRef);
assert.ok(externalTombstone, "external identities survive in deletion tombstones");
assert.equal(externalTombstone.source, "api");
assert.equal(model.deleteItemsCascade(next, removedIds, "2026-09-18T06:00:00.000Z"), next, "replaying the same batch is idempotent");
assert.ok(elapsed < 500, `100k-event batch deletion must finish within 500ms, received ${elapsed.toFixed(1)}ms`);

console.log(`Batch lifecycle performance checks passed: 100 items / 100k events in ${elapsed.toFixed(1)}ms.`);
