const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-comparison-"));
fs.mkdirSync(path.join(outputRoot, "features"));
for (const filename of ["date-keys.ts", "analytics.ts", "types.ts", "rules.ts", "model.ts", "record-step.ts", "quota.ts", "review-comparison.ts"]) {
    const sourcePath = filename === "review-comparison.ts" ? path.join(sourceRoot, "features", filename) : path.join(sourceRoot, filename);
    const target = filename === "review-comparison.ts" ? path.join(outputRoot, "features", "review-comparison.js") : path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(sourcePath, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {buildReviewComparison, getPreviousReviewRange} = require(path.join(outputRoot, "features", "review-comparison.js"));

const item = (itemId, name) => ({itemId, name, eventCount: 0, scheduledDays: 0, completedDays: 0, completionRate: 0});
const context = (overrides = {}) => ({
    range: "week", startDate: "2026-09-01", endDate: "2026-09-07", items: [], totalEvents: 0, completedItems: 0, scheduledItems: 0, ...overrides,
});

const current = context({
    totalEvents: 9,
    completedItems: 2,
    scheduledItems: 3,
    items: [
        {...item("a", "Alpha"), eventCount: 4, scheduledDays: 5, completedDays: 3, completionRate: 60},
        {...item("new", "New"), eventCount: 2, scheduledDays: 2, completedDays: 1, completionRate: 50},
    ],
});
const baseline = context({
    range: "month", startDate: "2026-08-01", endDate: "2026-08-31", totalEvents: 5, completedItems: 1, scheduledItems: 2,
    items: [
        {...item("a", "Alpha old"), eventCount: 1, scheduledDays: 4, completedDays: 1, completionRate: 25},
        {...item("old", "Old"), eventCount: 3, scheduledDays: 6, completedDays: 2, completionRate: 33},
    ],
});
const comparison = buildReviewComparison(current, baseline);
assert.deepEqual(comparison.delta, {totalEvents: 4, completedItems: 1, scheduledItems: 1});
assert.deepEqual(comparison.items.map((entry) => entry.itemId), ["a", "new", "old"]);
assert.deepEqual(comparison.items[0].delta, {eventCount: 3, scheduledDays: 1, completedDays: 2, completionRate: 35});
assert.deepEqual(comparison.items[1].baseline, {eventCount: 0, scheduledDays: 0, completedDays: 0, completionRate: 0});
assert.deepEqual(comparison.items[2].current, {eventCount: 0, scheduledDays: 0, completedDays: 0, completionRate: 0});
assert.equal(comparison.items[0].name, "Alpha");
current.items[0].eventCount = 999;
assert.equal(comparison.items[0].current.eventCount, 4, "comparison detaches scalar projections");
assert.equal(buildReviewComparison(context(), context()).items.length, 0);
assert.deepEqual(getPreviousReviewRange({startDate: "2026-09-01", endDate: "2026-09-07"}), {startDate: "2026-08-25", endDate: "2026-08-31"});
assert.deepEqual(getPreviousReviewRange({startDate: "2026-03-01", endDate: "2026-03-01"}), {startDate: "2026-02-28", endDate: "2026-02-28"});
assert.deepEqual(getPreviousReviewRange({startDate: "2028-03-01", endDate: "2028-03-01"}), {startDate: "2028-02-29", endDate: "2028-02-29"});
assert.deepEqual(getPreviousReviewRange({startDate: "2026-01-30", endDate: "2026-02-02"}), {startDate: "2026-01-26", endDate: "2026-01-29"});
assert.equal(getPreviousReviewRange({startDate: "2026-02-30", endDate: "2026-03-01"}), undefined);
assert.equal(getPreviousReviewRange({startDate: "2026-09-07", endDate: "2026-09-01"}), undefined);
console.log("Review comparison checks passed: range deltas, item union, missing-side zeros and detached projections.");
