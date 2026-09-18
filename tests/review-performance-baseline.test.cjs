const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-performance-"));
for (const filename of ["types.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "analytics.ts", "charts.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const analytics = require(path.join(outputRoot, "analytics.js"));
const charts = require(path.join(outputRoot, "charts.js"));
const model = require(path.join(outputRoot, "model.js"));

function makeStore(eventCount) {
    const store = model.createDefaultStore();
    store.items = Array.from({length: 40}, (_, index) => ({
        id: `item-${index}`, name: `项目${index}`, icon: "✓", kind: index % 2 ? "count" : "binary", target: 1, unit: "次",
        schedule: {type: "daily"}, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
        createdDate: "2025-01-01", revisions: [], archivePeriods: [],
    }));
    const asOf = new Date(2026, 8, 18, 12);
    store.events = Array.from({length: eventCount}, (_, index) => {
        const date = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - (index % 730));
        const localDate = model.dateKey(date);
        return {id: `event-${index}`, itemId: `item-${index % 40}`, occurredAt: date.toISOString(), localDate, value: 1, unit: "次", source: "manual"};
    });
    return {store, asOf};
}

function elapsed(operation) {
    const start = process.hrtime.bigint();
    const result = operation();
    return {result, ms: Number(process.hrtime.bigint() - start) / 1e6};
}

const measurements = [];
for (const eventCount of [1000, 10000, 100000]) {
    const {store, asOf} = makeStore(eventCount);
    const range = elapsed(() => analytics.getEventsInRange(store, "month", asOf));
    const summary = elapsed(() => analytics.buildSummaryContext(store, "month", asOf));
    const snapshot = elapsed(() => charts.buildAnalyticsSnapshot(store, asOf));
    const exportInput = elapsed(() => JSON.stringify({version: 1, items: store.items, events: store.events}));
    assert.ok(range.result.length > 0, `${eventCount} events should produce a monthly range`);
    assert.equal(summary.result.totalEvents, range.result.length, `${eventCount} summary must match range selection`);
    assert.equal(snapshot.result.version, 1, `${eventCount} analytics snapshot must be versioned`);
    assert.ok(exportInput.result.length > 0, `${eventCount} export input must be serializable`);
    measurements.push({eventCount, rangeMs: range.ms, summaryMs: summary.ms, snapshotMs: snapshot.ms, exportMs: exportInput.ms});
}

const largest = measurements[measurements.length - 1];
assert.ok(largest.rangeMs < 3000, `100k range selection must stay under 3s (took ${Math.round(largest.rangeMs)}ms)`);
assert.ok(largest.summaryMs < 8000, `100k summary must stay under 8s (took ${Math.round(largest.summaryMs)}ms)`);
assert.ok(largest.snapshotMs < 8000, `100k analytics snapshot must stay under 8s (took ${Math.round(largest.snapshotMs)}ms)`);
assert.ok(largest.exportMs < 3000, `100k export serialization must stay under 3s (took ${Math.round(largest.exportMs)}ms)`);
console.log(`Review performance baseline passed: ${measurements.map((entry) => `${entry.eventCount} events range ${Math.round(entry.rangeMs)}ms/summary ${Math.round(entry.summaryMs)}ms/snapshot ${Math.round(entry.snapshotMs)}ms/export ${Math.round(entry.exportMs)}ms`).join("; ")}.`);
