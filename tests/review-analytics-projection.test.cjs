const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const reviewSource = fs.readFileSync(path.join(sourceRoot, "render", "review.ts"), "utf8");
assert.doesNotMatch(reviewSource, /buildWeeklyCompletionTrend|buildMonthlyEventTrend/,
    "Review must not rebuild trends already carried by the analytics snapshot");
assert.match(reviewSource, /summarizeAnalyticsSnapshot\(ctx\.analyticsSnapshot\)/,
    "analytics badge must derive from the same snapshot as trend cards");
assert.match(reviewSource, /weeklyTrend = ctx\.analyticsSnapshot\.weekly/,
    "weekly chart must reuse the snapshot projection");
assert.match(reviewSource, /monthlyTrend = ctx\.analyticsSnapshot\.monthly/,
    "monthly chart must reuse the snapshot projection");
assert.match(reviewSource, /heatmapYear = Number\(ctx\.analyticsSnapshot\.asOf\.slice\(0, 4\)\) \+ ctx\.heatmapYearOffset/,
    "heatmap navigation must use the same captured base year");
assert.match(indexSource, /const reviewAnalyticsSnapshot =[\s\S]*?buildAnalyticsSnapshot\(this\.store, currentCalendarDate\(\)\)[\s\S]*?roots\.forEach\(\(root\) => this\.renderInto\(root, reviewAnalyticsSnapshot\)\)/,
    "one render cycle must share one analytics snapshot across every active surface");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-analytics-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "charts.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const charts = require(path.join(outputRoot, "charts.js"));
const makeItem = (index) => ({
    id: `item-${index}`,
    name: `项目${index}`,
    icon: "✓",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: index % 3 === 0 ? "workdays" : "daily"},
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    createdDate: "2025-01-01",
    revisions: [],
    archivePeriods: [],
    group: "测试",
    priority: "medium",
    sortOrder: index,
    timeSlot: "any",
});
const makeEvent = (id, itemId, date, value = 1) => ({
    id,
    itemId,
    occurredAt: `${date}T08:00:00.000Z`,
    localDate: date,
    value,
    unit: "次",
    source: "manual",
});

for (let index = 1; index <= 25; index += 1) {
    const asOf = new Date(2026, index % 12, Math.min(28, index + 1), 12);
    const item = makeItem(index);
    const current = model.dateKey(asOf);
    const previous = model.dateKey(new Date(asOf.getFullYear(), asOf.getMonth() - 1, 15, 12));
    const store = model.normalizeStore({version: 2, items: [item], events: [
        makeEvent(`current-${index}`, item.id, current),
        makeEvent(`previous-${index}`, item.id, previous, 2),
    ], eventTombstones: []});
    const snapshot = charts.buildAnalyticsSnapshot(store, asOf);
    const summary = charts.summarizeAnalyticsSnapshot(snapshot);
    assert.deepEqual(snapshot.weekly, charts.buildWeeklyCompletionTrend(store, 12, asOf), `case ${index}: weekly projection remains equivalent`);
    assert.deepEqual(snapshot.monthly, charts.buildMonthlyEventTrend(store, 6, asOf), `case ${index}: monthly projection remains equivalent`);
    assert.equal(summary.weeklyCurrent, charts.summarizeTrend(snapshot.weekly).current, `case ${index}: badge weekly value uses the shared projection`);
    assert.equal(summary.monthlyCurrent, charts.summarizeTrend(snapshot.monthly).current, `case ${index}: badge monthly value uses the shared projection`);
}

const largeItem = makeItem(1000);
const baseTime = Date.UTC(2026, 8, 1, 0, 0, 0);
const largeEvents = Array.from({length: 100000}, (_, index) => {
    const occurredAt = new Date(baseTime + index * 1000).toISOString();
    return {...makeEvent(`large-${index}`, largeItem.id, occurredAt.slice(0, 10)), occurredAt};
});
const largeStore = model.normalizeStore({version: 2, items: [largeItem], events: largeEvents, eventTombstones: []});
const startedAt = performance.now();
const largeSnapshot = charts.buildAnalyticsSnapshot(largeStore, new Date(2026, 8, 17, 12));
const buildElapsed = performance.now() - startedAt;
const reuseStartedAt = performance.now();
const reused = [largeSnapshot.weekly, largeSnapshot.monthly, charts.summarizeAnalyticsSnapshot(largeSnapshot)];
const reuseElapsed = performance.now() - reuseStartedAt;
assert.equal(reused[0], largeSnapshot.weekly, "weekly projection is reused by identity");
assert.equal(reused[1], largeSnapshot.monthly, "monthly projection is reused by identity");
assert.equal(reused[2].asOf, largeSnapshot.asOf, "summary keeps the same captured cutoff");
assert.ok(buildElapsed < 5000, `100k analytics projection must finish within 5s, received ${buildElapsed.toFixed(1)}ms`);
assert.ok(reuseElapsed < 250, `100k projection reuse must stay below 250ms, received ${reuseElapsed.toFixed(1)}ms`);
console.log(`Review analytics projection checks passed: 25 cases, 100 matrix assertions; 100k build ${buildElapsed.toFixed(1)}ms, reuse ${reuseElapsed.toFixed(1)}ms.`);
