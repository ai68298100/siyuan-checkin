const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-habit-score-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "features/habit-score.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const {buildHabitScoreSeries, collectHabitScoreDays, scheduleFrequency, scoreMultiplier} = require(path.join(outputRoot, "features", "habit-score.js"));

const daily = {numerator: 1, denominator: 1};
const m = scoreMultiplier(daily);
assert.ok(Math.abs(m - Math.pow(0.5, 1 / 13)) < 1e-12, "daily multiplier is 0.5^(1/13)");

/* 数学性质：全勤 30 天单调上升且收敛低于 100；中断只衰减不清零。 */
const days = (pattern) => pattern.map((completion, index) => ({date: `2026-01-${String(index + 1).padStart(2, "0")}`, scheduled: true, skipped: false, completion}));
const full = buildHabitScoreSeries(days(Array.from({length: 30}, () => 1)), daily);
for (let index = 1; index < full.length; index += 1) {
    assert.ok(full[index].score >= full[index - 1].score, `score is monotonic on completion runs (${index})`);
}
assert.ok(full[29].score > 79 && full[29].score < 80.5, `30 perfect days converge near 79.7 (got ${full[29].score})`);
assert.ok(full[29].score < 100, "score never saturates to 100 exactly");

const decay = buildHabitScoreSeries([...days(Array.from({length: 30}, () => 1)), ...days(Array.from({length: 30}, () => 0)).map((day, index) => ({...day, date: `2026-02-${String(index + 1).padStart(2, "0")}`}))], daily);
assert.equal(decay[29].score, full[29].score, "decay phase starts from the same peak");
assert.ok(decay[59].score > 0 && decay[59].score < full[29].score, "missed month decays but never reaches zero");
assert.ok(decay[44].score > decay[59].score, "decay is monotonic downward on misses");

/* 跳过冻结：跳过日既不加成也不衰减。[完成,跳,跳,完成] ≡ [完成,完成]。 */
const withSkips = buildHabitScoreSeries([
    {date: "2026-01-01", scheduled: true, skipped: false, completion: 1},
    {date: "2026-01-02", scheduled: true, skipped: true, completion: 0},
    {date: "2026-01-03", scheduled: true, skipped: true, completion: 0},
    {date: "2026-01-04", scheduled: true, skipped: false, completion: 1},
], daily);
const withoutSkips = buildHabitScoreSeries([
    {date: "2026-01-01", scheduled: true, skipped: false, completion: 1},
    {date: "2026-01-02", scheduled: true, skipped: false, completion: 1},
], daily);
assert.equal(withSkips[3].score, withoutSkips[1].score, "skip days freeze the score (neither gain nor decay)");

/* 非计划日冻结：每周 1 次的习惯在非计划日不衰减。 */
const off = buildHabitScoreSeries([
    {date: "2026-01-05", scheduled: true, skipped: false, completion: 1},
    {date: "2026-01-06", scheduled: false, skipped: false, completion: 0},
    {date: "2026-01-07", scheduled: false, skipped: false, completion: 0},
], {numerator: 1, denominator: 7});
assert.equal(off[2].score, off[0].score, "unscheduled days freeze the score for weekly habits");

/* 数值型按目标归一：5/10 折算 0.5。 */
const partial = buildHabitScoreSeries([{date: "2026-01-01", scheduled: true, skipped: false, completion: 0.5}], daily, {initial: 0});
const fullDay = buildHabitScoreSeries([{date: "2026-01-01", scheduled: true, skipped: false, completion: 1}], daily, {initial: 0});
assert.equal(partial[0].score, fullDay[0].score / 2, "partial completion earns proportional credit");

/* 排期到频率映射。 */
assert.deepEqual(scheduleFrequency({type: "daily"}), {numerator: 1, denominator: 1});
assert.deepEqual(scheduleFrequency({type: "weekly", weekdays: [1, 3, 5]}), {numerator: 3, denominator: 7});
assert.deepEqual(scheduleFrequency({type: "workdays"}), {numerator: 5, denominator: 7});
assert.deepEqual(scheduleFrequency({type: "interval", intervalDays: 14}), {numerator: 1, denominator: 14});
assert.deepEqual(scheduleFrequency({type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}), {numerator: 3, denominator: 7});
assert.deepEqual(scheduleFrequency({type: "quota", quota: {period: "month", amount: 5, countMode: "dates"}}), {numerator: 5, denominator: 30});
assert.equal(scoreMultiplier({numerator: 3, denominator: 7}) < scoreMultiplier({numerator: 1, denominator: 7}), true, "higher frequency means faster per-day decay (uhabits semantics)");

/* 采集器：真实 store 投影——事件/跳过/修订/闰日。 */
const store = model.createDefaultStore();
store.items = [
    {
        id: "count-item", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯",
        schedule: {type: "daily"}, createdAt: "2028-01-01T00:00:00.000Z", updatedAt: "2028-01-01T00:00:00.000Z",
        createdDate: "2028-01-01",
        revisions: [
            {effectiveDate: "2028-03-01", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}},
            {effectiveDate: "2028-03-10", kind: "count", target: 10, unit: "杯", schedule: {type: "daily"}},
        ],
        archivePeriods: [],
    },
];
store.events = [
    {id: "c1", itemId: "count-item", occurredAt: "2028-02-28T01:00:00.000Z", localDate: "2028-02-28", value: 4, unit: "杯", source: "manual"},
    {id: "c2", itemId: "count-item", occurredAt: "2028-02-29T01:00:00.000Z", localDate: "2028-02-29", value: 8, unit: "杯", source: "manual"},
    {id: "c3", itemId: "count-item", occurredAt: "2028-03-01T01:00:00.000Z", localDate: "2028-03-01", value: 3, unit: "杯", source: "manual"},
    {id: "c4s", itemId: "count-item", occurredAt: "2028-03-02T01:00:00.000Z", localDate: "2028-03-02", value: 0, unit: "杯", source: "manual", kind: "skip"},
    {id: "c5", itemId: "count-item", occurredAt: "2028-03-10T01:00:00.000Z", localDate: "2028-03-10", value: 10, unit: "杯", source: "manual"},
];
const collected = collectHabitScoreDays(store, store.items[0], "2028-02-28", "2028-03-03");
assert.deepEqual(collected.map((day) => day.date), ["2028-02-28", "2028-02-29", "2028-03-01", "2028-03-02"], "leap-day window iterates correctly");
assert.equal(collected[1].completion, 1, "8/8 cups completes the day");
assert.equal(collected[0].completion, 0.5, "4/8 cups is half credit");
assert.equal(collected[2].skipped, false);
assert.equal(collected[3].skipped, true, "skip day is flagged");
const revised = collectHabitScoreDays(store, store.items[0], "2028-03-10", "2028-03-11");
assert.equal(revised[0].completion, 1, "post-revision target 10 with progress 10 completes");
const revisedSeries = buildHabitScoreSeries(collectHabitScoreDays(store, store.items[0], "2028-03-01", "2028-03-11"), scheduleFrequency({type: "daily"}));
assert.ok(revisedSeries.length === 10 && revisedSeries.every((point) => point.score >= 0 && point.score <= 100), "series is bounded across revision boundary");

console.log("Habit score checks passed: half-life math, skip/off freezing, proportional credit, schedule frequency mapping, leap-day collection and revision-aware targets.");
