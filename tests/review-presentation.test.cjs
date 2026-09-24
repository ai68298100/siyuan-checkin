const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-presentation-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "analytics.ts", "charts.ts", "features/review-presentation.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const analytics = require(path.join(outputRoot, "analytics.js"));
const charts = require(path.join(outputRoot, "charts.js"));
const {buildReviewRhythm, projectPresentation} = require(path.join(outputRoot, "features/review-presentation.js"));
const asOf = new Date(2026, 8, 20, 12);
const week = {startDate: "2026-09-14", endDate: "2026-09-20"};
const item = (id, overrides = {}) => ({
    id, name: id, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdDate: "2026-08-01", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    revisions: [], archivePeriods: [], ...overrides,
});
const event = (id, itemId, date, overrides = {}) => ({
    id, itemId, localDate: date, occurredAt: `${date}T01:00:00.000Z`, value: 1, unit: "次", source: "manual", ...overrides,
});
const store = (items, events = []) => ({...model.createDefaultStore(), items, events});
const totals = (rhythm) => rhythm.points.reduce((sum, point) => ({completed: sum.completed + point.completed, scheduled: sum.scheduled + point.scheduled, skipped: sum.skipped + point.skipped}), {completed: 0, scheduled: 0, skipped: 0});

const fiveAndSkip = store([item("daily")], Array.from({length: 7}, (_, index) => event(`e${index}`, "daily", `2026-09-${14 + index}`, index >= 5 ? {kind: "skip"} : {})));
const rhythm = buildReviewRhythm(fiveAndSkip, week, asOf);
assert.equal(rhythm.hasDailyItems, true);
assert.deepEqual(totals(rhythm), {completed: 5, scheduled: 5, skipped: 2});
assert.deepEqual(rhythm.points.at(-1), {date: "2026-09-20", completed: 0, scheduled: 0, skipped: 1}, "skip-only day stays neutral instead of appearing failed");
assert.equal(charts.buildWeeklyCompletionTrend(fiveAndSkip, 1, asOf).points[0].value, 100, "weekly trend excludes skipped opportunities like the daily summary");
assert.equal(analytics.buildSummaryContext(fiveAndSkip, "week", asOf).items[0].completionRate, 100);
const duplicateSkip = store(fiveAndSkip.items, [...fiveAndSkip.events, event("duplicate-skip", "daily", "2026-09-20", {kind: "skip"})]);
assert.equal(buildReviewRhythm(duplicateSkip, week, asOf).points.at(-1).skipped, 1, "skip counts item-days, not skip events");
const completedAndSkip = store(fiveAndSkip.items, [...fiveAndSkip.events, event("real-completion", "daily", "2026-09-20")]);
assert.deepEqual(totals(buildReviewRhythm(completedAndSkip, week, asOf)), {completed: 6, scheduled: 6, skipped: 1}, "real completion on a skip date takes precedence");
assert.equal(charts.buildWeeklyCompletionTrend(completedAndSkip, 1, asOf).points[0].value, 100);

const empty = store([]);
const bounded = buildReviewRhythm(empty, {startDate: "2020-01-01", endDate: "2030-01-01"}, asOf);
assert.equal(bounded.points.length, 14);
assert.equal(bounded.startDate, "2026-09-07");
assert.equal(bounded.endDate, "2026-09-20");
assert.equal(bounded.hasDailyItems, false);
assert.ok(bounded.points.every(point => point.completed === 0 && point.scheduled === 0));
assert.deepEqual(buildReviewRhythm(empty, {startDate: "2026-09-18", endDate: "2026-09-19"}, asOf).points.map(point => point.date), ["2026-09-18", "2026-09-19"]);
for (const invalid of [
    {startDate: "2026-09-21", endDate: "2026-10-01"},
    {startDate: "2026-09-20", endDate: "2026-09-19"},
    {startDate: "2026-02-30", endDate: "2026-09-20"},
]) assert.equal(buildReviewRhythm(empty, invalid, asOf).points.length, 0, "invalid/future ranges do not fabricate past opportunities");

const workdays = store([item("work", {schedule: {type: "workdays"}})]);
const weekend = buildReviewRhythm(workdays, {startDate: "2026-09-19", endDate: "2026-09-20"}, asOf);
assert.equal(weekend.hasDailyItems, true, "non-quota habits remain distinguishable from an all-quota workspace on off-days");
assert.deepEqual(totals(weekend), {completed: 0, scheduled: 0, skipped: 0});
const customDays = store([item("custom", {schedule: {type: "custom", weekdays: [1, 3]}})]);
assert.equal(totals(buildReviewRhythm(customDays, week, asOf)).scheduled, 2);
const interval = store([item("interval", {schedule: {type: "interval", intervalDays: 3, anchorDate: "2026-09-14"}})]);
assert.equal(totals(buildReviewRhythm(interval, week, asOf)).scheduled, 3);

const lifecycle = store([item("old", {archived: true, createdDate: "2026-09-17", archivePeriods: [{startDate: "2026-09-19"}]})]);
assert.equal(totals(buildReviewRhythm(lifecycle, week, asOf)).scheduled, 2, "historical availability uses actual creation/archive dates rather than today's archived flag");
const targetRevision = item("changed", {target: 2, revisions: [
    {effectiveDate: "2026-08-01", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}},
    {effectiveDate: "2026-09-19", kind: "count", target: 2, unit: "次", schedule: {type: "daily"}},
]});
const revisedStore = store([targetRevision], [event("old-target", "changed", "2026-09-18"), event("new-target", "changed", "2026-09-19")]);
assert.deepEqual(buildReviewRhythm(revisedStore, {startDate: "2026-09-18", endDate: "2026-09-19"}, asOf).points.map(point => point.completed), [1, 0], "daily completion replays the effective target revision");
const quotaSchedule = {type: "quota", quota: {period: "week", amount: 2, countMode: "dates"}};
const quota = store([item("quota", {schedule: quotaSchedule})], [event("q14", "quota", "2026-09-14"), event("q15", "quota", "2026-09-15")]);
assert.equal(buildReviewRhythm(quota, week, asOf).hasDailyItems, false);
assert.deepEqual(totals(buildReviewRhythm(quota, week, asOf)), {completed: 0, scheduled: 0, skipped: 0}, "period completion must not masquerade as seven daily completions");
assert.equal(charts.buildWeeklyCompletionTrend(quota, 1, asOf).points[0].value, 100, "the denominator fix preserves existing quota/AUTO semantics in the legacy weekly trend");
const changedSchedule = store([item("to-quota", {schedule: quotaSchedule, revisions: [
    {effectiveDate: "2026-08-01", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}},
    {effectiveDate: "2026-09-19", kind: "binary", target: 1, unit: "次", schedule: quotaSchedule},
]})]);
assert.deepEqual(buildReviewRhythm(changedSchedule, {startDate: "2026-09-18", endDate: "2026-09-20"}, asOf).points.map(point => point.scheduled), [1, 0, 0], "quota exclusion follows historical schedule revisions");

const atMost = store([item("quit", {direction: "atMost"})]);
assert.deepEqual(totals(buildReviewRhythm(atMost, week, asOf)), {completed: 7, scheduled: 7, skipped: 0}, "at-most successes require no events");
assert.equal(charts.buildWeeklyCompletionTrend(atMost, 1, asOf).points[0].value, 100);
const withLapse = store(atMost.items, [event("lapse", "quit", "2026-09-19"), event("skip", "quit", "2026-09-20", {kind: "skip"})]);
assert.deepEqual(totals(buildReviewRhythm(withLapse, week, asOf)), {completed: 5, scheduled: 6, skipped: 1});
assert.equal(charts.buildWeeklyCompletionTrend(withLapse, 1, asOf).points[0].value, 83);
const numericLimit = store([item("sugar", {direction: "atMost", kind: "quantity", target: 20, unit: "g"})], [event("under", "sugar", "2026-09-19", {value: 15, unit: "g"}), event("over", "sugar", "2026-09-20", {value: 25, unit: "g"})]);
assert.deepEqual(buildReviewRhythm(numericLimit, {startDate: "2026-09-19", endDate: "2026-09-20"}, asOf).points.map(point => point.completed), [1, 0]);
const allSkip = store([item("daily")], Array.from({length: 7}, (_, index) => event(`skip-${index}`, "daily", `2026-09-${14 + index}`, {kind: "skip"})));
assert.equal(charts.buildWeeklyCompletionTrend(allSkip, 1, asOf).points[0].value, 0, "an empty denominator remains finite");

const summaryItem = (overrides = {}) => ({itemId: "sample", name: "Sample", eventCount: 0, totalsByUnit: [], scheduledDays: 0, completedDays: 0, completionRate: 0, ...overrides});
assert.deepEqual(projectPresentation(summaryItem({scheduledDays: 5, completedDays: 3, completionRate: 60})), {mode: "daily", rate: 60, completed: 3, total: 5});
assert.deepEqual(projectPresentation(summaryItem({eventCount: 3})), {mode: "noSchedule", rate: null, completed: 0, total: 0}, "unscheduled recorded activity is not shown as 0% failure");
const currentQuota = {period: "week", elapsedPeriods: 2, completedPeriods: 1, completionRate: 50, current: {progress: 3, quota: 2}};
assert.deepEqual(projectPresentation(summaryItem({quota: currentQuota})), {mode: "currentQuota", rate: 100, completed: 3, total: 2}, "current progress takes priority; visual fill clamps without discarding overachievement");
const closedQuota = {period: "week", elapsedPeriods: 4, completedPeriods: 3, completionRate: 75};
assert.deepEqual(projectPresentation(summaryItem({quota: closedQuota})), {mode: "closedQuota", rate: 75, completed: 3, total: 4});
assert.deepEqual(projectPresentation(summaryItem({quota: {...closedQuota, elapsedPeriods: 0, completedPeriods: 0}})), {mode: "noSchedule", rate: null, completed: 0, total: 0});
const quotaSummary = analytics.buildSummaryContext(quota, "week", asOf).items[0];
assert.equal(quotaSummary.completionRate, 0, "public summary shape and its day-rate contract stay unchanged");
assert.deepEqual(projectPresentation(quotaSummary), {mode: "currentQuota", rate: 100, completed: 2, total: 2});
const duplicateDate = store(quota.items, [...quota.events, event("q15-again", "quota", "2026-09-15")]);
assert.equal(projectPresentation(analytics.buildSummaryContext(duplicateDate, "week", asOf).items[0]).completed, 2, "date-based quota keeps distinct-date counting");
const valueQuota = store([item("volume", {kind: "quantity", unit: "ml", schedule: {type: "quota", quota: {period: "week", amount: 1000, countMode: "value"}}})], [
    event("ml", "volume", "2026-09-19", {unit: "ml", value: 250}),
    event("wrong-unit", "volume", "2026-09-20", {unit: "g", value: 900}),
]);
assert.deepEqual(projectPresentation(analytics.buildSummaryContext(valueQuota, "week", asOf).items[0]), {mode: "currentQuota", rate: 25, completed: 250, total: 1000}, "quantity quota keeps unit-specific totals");

// Summary quota progress must have the same neutral-skip semantics as Today.
for (const scenario of [
    {name: "distinct dates with a skip-only day", base: quota, events: [event("date-real", "quota", "2026-09-14"), event("date-skip", "quota", "2026-09-15", {kind: "skip"})], expected: 1},
    {name: "duplicate skip plus real record on one day", base: quota, events: [event("same-real", "quota", "2026-09-15"), event("same-skip", "quota", "2026-09-15", {kind: "skip"}), event("another-skip", "quota", "2026-09-16", {kind: "skip"})], expected: 1},
    {name: "value quota ignores nonzero skip values", base: valueQuota, events: [...valueQuota.events, event("value-skip", "volume", "2026-09-18", {kind: "skip", unit: "ml", value: 800})], expected: 250},
    {name: "same-day value skip and real contributions", base: valueQuota, events: [event("same-ml", "volume", "2026-09-18", {unit: "ml", value: 375}), event("same-ml-skip", "volume", "2026-09-18", {kind: "skip", unit: "ml", value: 800})], expected: 375},
]) {
    const candidate = store(scenario.base.items, scenario.events);
    const candidateSummary = analytics.buildSummaryContext(candidate, "week", asOf).items[0];
    assert.equal(candidateSummary.quota.current.progress, scenario.expected, scenario.name);
    assert.equal(candidateSummary.quota.current.progress, model.getProgress(candidate, candidate.items[0], asOf), `${scenario.name}: summary and Today agree`);
    assert.equal(candidateSummary.quota.current.complete, model.isComplete(candidate, candidate.items[0], asOf), `${scenario.name}: completion and Today agree`);
}
const previousQuotaPeriod = store(quota.items, [event("prior-real", "quota", "2026-09-14"), event("prior-skip", "quota", "2026-09-15", {kind: "skip"})]);
const closedPeriodSummary = analytics.buildCustomSummaryContext(previousQuotaPeriod, {startDate: "2026-09-14", endDate: "2026-09-27"}, new Date(2026, 8, 27, 12)).items[0];
assert.equal(closedPeriodSummary.quota.elapsedPeriods, 1);
assert.equal(closedPeriodSummary.quota.completedPeriods, 0, "skip-only dates cannot manufacture a completed historical quota period");

const previousTZ = process.env.TZ;
process.env.TZ = "America/New_York";
const dst = buildReviewRhythm(empty, {startDate: "2026-03-01", endDate: "2026-03-14"}, new Date(2026, 2, 14, 12));
assert.equal(dst.points.length, 14, "a daylight-saving transition does not shorten the daily series");
assert.equal(new Set(dst.points.map(point => point.date)).size, 14);
assert.equal(dst.points[7].date, "2026-03-08");
process.env.TZ = previousTZ;

console.log("Review presentation passed: bounded calendar rhythm, skip neutrality, historical schedules, quotas, at-most goals, DST and weekly-trend denominator parity.");
