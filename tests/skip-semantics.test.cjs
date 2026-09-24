const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：回顾页跳过徽章/月历中性态/聚合排除与热力图 skip 标记都落在渲染层。 */
const reviewSource = read("render", "review.ts");
assert.match(reviewSource, /lc-checkin__history-skip-badge/, "history log renders a skip badge");
assert.match(reviewSource, /isSkipEvent\(event\)\) return;/, "skip events stay out of the day aggregate totals");
assert.match(reviewSource, /is-skip/, "calendar and legend carry the neutral skip state");
const chartsSource = read("charts.ts");
assert.match(chartsSource, /skip\?: boolean/, "heatmap day carries the optional skip marker");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-skip-semantics-"));
for (const filename of ["types.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "analytics.ts", "charts.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const analytics = require(path.join(outputRoot, "analytics.js"));
const charts = require(path.join(outputRoot, "charts.js"));

const asOf = new Date(2026, 8, 19, 12);
const key = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const item = (id, schedule) => ({
    id, name: `项目${id}`, icon: "✓", kind: "binary", target: 1, unit: "次", schedule,
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: [],
});
const daily = {type: "daily"};
const store = model.createDefaultStore();
store.items = [
    item("done", daily),
    item("skipped", daily),
    item("bridge", daily),
    item("gap", daily),
    item("skiptoday", daily),
    item("water", {type: "quota", quota: {period: "week", amount: 2, countMode: "dates"}}),
];
const event = (id, itemId, day, kind) => ({
    id, itemId, occurredAt: `${key(day)}T01:00:00.000Z`, localDate: key(day), value: 1, unit: "次",
    source: "manual", ...(kind ? {kind} : {}),
});
store.events = [
    event("e14", "done", 14),
    event("e15s", "done", 15, "skip"),
    event("e16", "done", 16),
    event("s15", "skipped", 15, "skip"),
    event("b17", "bridge", 17),
    event("b18s", "bridge", 18, "skip"),
    event("b19", "bridge", 19),
    event("g16", "gap", 16),
    event("g18s", "gap", 18, "skip"),
    event("g19", "gap", 19),
    event("st18", "skiptoday", 18),
    event("st19s", "skiptoday", 19, "skip"),
    event("w14", "water", 14),
    event("w15s", "water", 15, "skip"),
    event("w16", "water", 16),
];

/* 进度与完成：跳过事件不贡献进度——跳过日不完成。 */
const skippedItem = store.items[1];
assert.equal(model.getProgress(store, skippedItem, asOf), 0, "skip-only day contributes no progress");
assert.equal(model.isComplete(store, skippedItem, asOf), false);
const doneItem = store.items[0];
assert.equal(model.isComplete(store, doneItem, new Date(2026, 8, 15, 12)), false, "skip event alone never completes a day");
assert.equal(model.isComplete(store, doneItem, new Date(2026, 8, 14, 12)), true);

/* quota：跳过日不吃配额。 */
const water = store.items[5];
assert.equal(model.getProgress(store, water, new Date(2026, 8, 16, 12)), 2, "quota counts only real completions");
assert.equal(model.isComplete(store, water, new Date(2026, 8, 16, 12)), true, "two real days meet the weekly quota");
const oneReal = model.createDefaultStore();
oneReal.items = [store.items[5]];
oneReal.events = [event("w14", "water", 14), event("w15s", "water", 15, "skip")];
assert.equal(model.getProgress(oneReal, oneReal.items[0], new Date(2026, 8, 15, 12)), 1, "skip day does not consume quota");
assert.equal(model.isComplete(oneReal, oneReal.items[0], new Date(2026, 8, 15, 12)), false);

/* streak：跳过日中性桥接——不算完成也不断链；纯跳过链条为 0；真实空缺仍然断链。 */
const streaks = model.computeEventStreaks(store, asOf);
assert.equal(streaks.get("done"), 0, "today and yesterday are both empty — the chain ends regardless of skips");
assert.equal(streaks.get("skipped"), 0, "a chain of only skips is zero");
assert.equal(streaks.get("bridge"), 2, "skip on 09-18 bridges 09-17 and 09-19");
assert.equal(streaks.get("gap"), 1, "a real gap on 09-17 breaks the chain even across skips");
assert.equal(streaks.get("skiptoday"), 1, "skip today keeps yesterday's chain alive");

/* 完成率分母：跳过日剔除（完成优先——同日有真实完成则照常计入）。 */
const summary = analytics.buildSummaryContext(store, "week", asOf);
const skippedSummary = summary.items.find((entry) => entry.itemId === "skipped");
assert.equal(skippedSummary.scheduledDays, 5, "skip-only day leaves the completion-rate denominator (elapsed week has 6 days)");
assert.equal(skippedSummary.completedDays, 0);
const bridgeSummary = summary.items.find((entry) => entry.itemId === "bridge");
assert.equal(bridgeSummary.scheduledDays, 5, "skip day with no completion is excluded");
assert.equal(bridgeSummary.completedDays, 2);

/* 热力图：仅跳过的日子标记中性 skip，不参与热度层级；总数仍含跳过记录。 */
const heatmap = charts.buildYearHeatmap(store, 2026);
const skipDay = heatmap.days.find((day) => day.date === key(15));
assert.equal(skipDay.skip, true, "skip-only day is marked");
assert.equal(skipDay.level, 0);
const realDay = heatmap.days.find((day) => day.date === key(14));
assert.equal(realDay.level >= 1, true);
assert.equal(realDay.skip, undefined);
assert.equal(heatmap.total >= store.events.filter((entry) => entry.localDate.startsWith("2026-09")).length, true);

console.log("Skip semantics checks passed: progress, quota, streak bridging, completion-rate denominator and heatmap neutrality.");
