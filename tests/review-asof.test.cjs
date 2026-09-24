const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const reviewSource = fs.readFileSync(path.join(sourceRoot, "render", "review.ts"), "utf8");
assert.match(reviewSource, /const asOf = calendarDateFromKey\(ctx\.analyticsSnapshot\.asOf\)/,
    "Review must derive one local calendar cutoff from the shared snapshot");
assert.doesNotMatch(reviewSource, /new Date\(\)/,
    "Review projections must not capture independent current instants");
assert.match(reviewSource, /buildSummaryContext\(ctx\.store, ctx\.summaryRange, asOf\)/,
    "preset summaries must use the shared cutoff");
assert.match(reviewSource, /buildCustomSummaryContext\(ctx\.store, ctx\.summaryCustomRange, asOf\)/,
    "custom summaries must use the shared cutoff");
assert.match(reviewSource, /buildAchievements\(ctx\.store, asOf\)/,
    "achievements must use the shared cutoff");
assert.match(reviewSource, /projectReminderCenter\(ctx\.store, ctx\.occasionStore, asOf, ctx\.reminderUserActions\)/,
    "reminders must use the shared cutoff");
assert.match(reviewSource, /projectOverdueOccurrenceHistory\(ctx\.occasionStore, asOf\)/,
    "overdue history must use the shared cutoff");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-asof-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "analytics.ts", "features/achievements.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const analytics = require(path.join(outputRoot, "analytics.js"));
const {buildAchievements} = require(path.join(outputRoot, "features", "achievements.js"));

for (let index = 1; index <= 25; index += 1) {
    const asOf = new Date(2026, index % 12, Math.min(index, 28), 12);
    const day = model.dateKey(asOf);
    const before = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 1, 12);
    const item = {
        id: `item-${index}`,
        name: `项目${index}`,
        icon: "✓",
        kind: "count",
        target: 1,
        unit: "次",
        schedule: {type: "daily"},
        createdAt: `${day}T00:00:00.000Z`,
        updatedAt: `${day}T00:00:00.000Z`,
        createdDate: day,
        revisions: [],
        archivePeriods: [],
        group: "测试",
        priority: "medium",
        sortOrder: index,
        timeSlot: "any",
    };
    const event = {id: `event-${index}`, itemId: item.id, occurredAt: `${day}T08:00:00.000Z`, localDate: day, value: 1, unit: "次", source: "manual"};
    const store = model.normalizeStore({version: 2, items: [item], events: [event], eventTombstones: []});
    const summary = analytics.buildSummaryContext(store, "day", asOf);
    const custom = analytics.buildCustomSummaryContext(store, {startDate: day, endDate: day}, asOf);
    const currentPerfect = buildAchievements(store, asOf).find((entry) => entry.id === "perfect-1");
    const previousPerfect = buildAchievements(store, before).find((entry) => entry.id === "perfect-1");
    assert.equal(summary.totalEvents, 1, `case ${index}: preset summary includes the captured day`);
    assert.equal(custom.totalEvents, 1, `case ${index}: custom summary includes the captured day`);
    assert.equal(currentPerfect.progress, 1, `case ${index}: current cutoff includes the perfect day`);
    assert.equal(previousPerfect.progress, 0, `case ${index}: earlier cutoff excludes the future perfect day`);
}
console.log("Review as-of checks passed: 25 cases, 100 matrix assertions plus shared-cutoff wiring guards.");
