const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-event-range-"));
for (const filename of ["analytics.ts", "date-keys.ts", "model.ts", "rules.ts", "quota.ts", "types.ts", "record-step.ts", "i18n.ts", "lunar.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const analytics = require(path.join(outputRoot, "analytics.js"));
const events = [
    {id: "a", itemId: "item", occurredAt: "2026-09-01T01:00:00Z", localDate: "2026-09-01", value: 2, unit: "次", source: "manual"},
    {id: "b", itemId: "item", occurredAt: "2026-09-01T02:00:00Z", localDate: "2026-09-01", value: 3, unit: "次", source: "manual", note: "private"},
    {id: "c", itemId: "item", occurredAt: "2026-09-02T01:00:00Z", localDate: "2026-09-02", value: 5, unit: "页", source: "api", externalRef: "private-ref"},
];
const store = {version: 2, items: [], events, eventTombstones: []};
const summary = analytics.getEventRangeSummary(store, {startDate: "2026-09-01", endDateExclusive: "2026-09-03"});
assert.deepEqual(summary.points, [
    {localDate: "2026-09-01", eventCount: 2, totalValue: 5, totalsByUnit: [{unit: "次", totalValue: 5, eventCount: 2}]},
    {localDate: "2026-09-02", eventCount: 1, totalValue: 5, totalsByUnit: [{unit: "页", totalValue: 5, eventCount: 1}]},
]);
assert.equal(summary.totalEvents, 3);
assert.equal(summary.truncated, false);
assert.equal("note" in summary.points[0], false, "summary must not expose private event fields");
summary.points[0].totalsByUnit[0].totalValue = 999;
assert.equal(events[0].value, 2, "summary must be a defensive projection");
assert.equal(analytics.getEventRangeSummary(store, {startDate: "2026-09-01", endDateExclusive: "2026-09-03"}, {maxEvents: 2}).truncated, true);
assert.throws(() => analytics.getEventRangeSummary(store, {startDate: "2026-01-01", endDateExclusive: "2027-01-03"}), RangeError);
assert.throws(() => analytics.getEventRangeSummary(store, {startDate: "2026-09-03", endDateExclusive: "2026-09-01"}), TypeError);
console.log("Event range summary checks passed.");
