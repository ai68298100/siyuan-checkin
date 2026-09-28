const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1609：洞察页 atMost（戒除/上限）日状态必须与主模型 isComplete 同一公式。
   修复前 insights 自用 progress > 0 && progress >= target，导致二值零破戒日显示
   missed、破戒日反而 complete、数值超限也算完成。本守门用固定日期夹具钉死：
   二值零事件/一次破戒/跳过、数值上限 2 时进度 0/1/2/3、今日未结束、历史修订、
   周趋势/完成率/连击，并逐日与 isComplete 交叉核对。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-insights-atmost-"));
const previousTimeZone = process.env.TZ;
process.env.TZ = "Asia/Shanghai";

for (const filename of ["date-keys.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "features/habit-score.ts", "features/insights.ts", "features/coaching.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const model = require(path.join(outputRoot, "model.js"));
const {buildHabitInsights} = require(path.join(outputRoot, "features", "insights.js"));
const {buildCoachingSuggestions} = require(path.join(outputRoot, "features", "coaching.js"));

/* 单一公式纪律：洞察投影不得再私藏第二套完成比较。 */
const insightsSource = fs.readFileSync(path.join(sourceRoot, "features", "insights.ts"), "utf8");
assert.match(insightsSource, /evaluateDayCompletion\(/, "insights delegate completion to the shared model formula");
assert.doesNotMatch(insightsSource, /progress > 0 && effectiveTarget > 0/, "the old inverted completion expression is gone");

const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");
for (const [key, zh, en] of [
    ["insights.atMostKept", "守住", "Kept"],
    ["insights.atMostBreach", "破戒", "Lapsed"],
    ["insights.noRecord", "未记录", "No record"],
]) {
    assert.match(i18nSource, new RegExp(`"${key}": "${zh}"`), `zh copy for ${key}`);
    assert.match(i18nSource, new RegExp(`"${key}": "${en}"`), `en copy for ${key}`);
}
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(indexSource, /insights\.atMostKept/, "insight grid labels carry the kept wording");
assert.match(indexSource, /insights\.atMostBreach/, "insight grid labels carry the breach wording");

const item = (overrides = {}) => ({
    id: "quit",
    name: "Quit",
    icon: "🚭",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atMost",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    ...overrides,
});

const event = (localDate, value = 1, overrides = {}) => ({
    id: `${localDate}-${value}-${overrides.kind || "checkin"}`,
    itemId: overrides.itemId || "quit",
    occurredAt: `${localDate}T04:00:00.000Z`,
    localDate,
    value,
    unit: "次",
    source: "manual",
    ...overrides,
});

const store = (habit, events = []) => ({version: 2, items: [habit], events, eventTombstones: []});
const report = (data, days = 7) => buildHabitInsights(data, "quit", {asOf: new Date(2026, 8, 7, 9), days});
const statuses = (result) => result.days.map((day) => day.status);

/* 逐日与主模型核对：complete 状态 ⟺ isComplete（排除不可用/非排期日）。 */
function assertMatchesMainModel(result, data) {
    for (const day of result.days) {
        if (!day.available || !day.scheduled) continue;
        const [year, month, date] = day.date.split("-").map(Number);
        const complete = model.isComplete(data, result.item, new Date(year, month - 1, date, 12));
        assert.equal(day.status === "complete", complete, `${day.date}: insight status must agree with isComplete`);
    }
}

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("binary abstinence: zero-event days are kept, a lapse breaks, skip stays neutral", () => {
        const habit = item();
        const events = [
            event("2026-09-02", 1, {id: "lapse"}),
            event("2026-09-03", 1, {id: "skip", kind: "skip"}),
        ];
        const data = store(habit, events);
        const result = report(data);
        assert.deepEqual(statuses(result), ["complete", "missed", "missed", "complete", "complete", "complete", "complete"]);
        assert.equal(result.days[0].progress, 0);
        assert.equal(result.days[1].progress, 1);
        assert.equal(result.days[2].skipped, true, "skip day keeps its neutral flag");
        assert.equal(result.days[6].status, "complete", "today with no record is kept, not pending");
        /* 破戒断连、跳过中性、守住日重新累计。 */
        assert.equal(result.currentStreak, 4);
        assert.equal(result.longestStreak, 4);
        assert.equal(result.aggregates.completedDays, 5);
        assert.equal(result.aggregates.scheduledDays, 7);
        assert.equal(result.aggregates.closedCompletedDays, 4);
        assert.equal(result.aggregates.eligibleScheduledDays, 7);
        assert.equal(result.aggregates.completionRate, 71.4);
        assertMatchesMainModel(result, data);
    });

    check("numeric cap target 2: progress 0/1/2 all kept, 3 is a lapse", () => {
        const habit = item({id: "limit", kind: "quantity", target: 2, unit: "杯"});
        const events = [
            event("2026-09-05", 1, {itemId: "limit", unit: "杯"}),
            event("2026-09-06", 2, {itemId: "limit", unit: "杯"}),
            event("2026-09-07", 3, {itemId: "limit", unit: "杯"}),
        ];
        const data = {version: 2, items: [habit], events, eventTombstones: []};
        const result = buildHabitInsights(data, "limit", {asOf: new Date(2026, 8, 7, 9), days: 7});
        assert.deepEqual(statuses(result).slice(3), ["complete", "complete", "complete", "missed"]);
        assert.deepEqual(result.days.slice(3).map((day) => day.progress), [0, 1, 2, 3]);
        assert.equal(result.days[6].status, "missed", "going over the cap today is reported immediately");
        assert.equal(result.overachievedDays, 0, "an atMost over-cap day never counts as overachievement");
        assert.equal(result.currentStreak, 6, "today keeps the running streak until the day closes");
        assertMatchesMainModel(result, data);
    });

    check("skip today stays pending and neutral without a start-now suggestion", () => {
        const habit = item();
        const events = [
            event("2026-09-01", 1, {id: "s1", kind: "skip"}),
            event("2026-09-07", 1, {id: "s7", kind: "skip"}),
        ];
        const data = store(habit, events);
        const result = report(data);
        assert.equal(result.days[6].status, "pending");
        assert.equal(result.days[6].skipped, true);
        assert.equal(result.currentStreak, 5, "skip today neither extends nor breaks the run of kept days");
        const suggestions = buildCoachingSuggestions(result);
        assert.equal(suggestions.some((suggestion) => suggestion.id === "start-today"), false, "abstinence never gets a start-today nudge");
        assert.equal(suggestions.some((suggestion) => suggestion.id === "finish-today"), false, "abstinence has no remaining-amount framing");
    });

    check("lapse today never asks the user to finish the remaining amount", () => {
        const habit = item();
        const data = store(habit, [event("2026-09-07", 1, {id: "today-lapse"})]);
        const result = report(data);
        assert.equal(result.days[6].status, "missed");
        const suggestions = buildCoachingSuggestions(result);
        assert.equal(suggestions.some((suggestion) => suggestion.id === "start-today"), false);
        assert.equal(suggestions.some((suggestion) => suggestion.id === "finish-today"), false);
    });

    check("historical revision switches unit and kind with per-date semantics", () => {
        const habit = item({
            kind: "duration",
            target: 20,
            unit: "分钟",
            revisions: [
                {effectiveDate: "2026-09-04", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}},
                {effectiveDate: "2026-09-01", kind: "duration", target: 20, unit: "分钟", schedule: {type: "daily"}},
            ],
        });
        const events = [
            event("2026-09-01", 20, {unit: "分钟"}),
            event("2026-09-02", 10, {unit: "分钟"}),
            event("2026-09-03", 30, {unit: "分钟"}),
        ];
        const data = store(habit, events);
        const result = report(data);
        assert.deepEqual(statuses(result), ["complete", "complete", "missed", "complete", "complete", "complete", "complete"]);
        assert.equal(result.days[0].unit, "分钟");
        assert.equal(result.days[2].status, "missed", "30/20 minutes is over the cap even under the old revision");
        assert.equal(result.days[3].unit, "次");
        assert.equal(result.days[3].progress, 0);
        assert.equal(result.days[3].status, "complete", "binary revision counts a silent day as kept");
        assert.equal(result.currentStreak, 4);
        assertMatchesMainModel(result, data);
    });

    check("weekly trend and completion rate follow the kept-day semantics", () => {
        const habit = item();
        const events = [
            event("2026-09-02", 1, {id: "lapse"}),
            event("2026-09-03", 1, {id: "skip", kind: "skip"}),
        ];
        const result = report(store(habit, events));
        const firstWeek = result.weeklyTrend[0];
        assert.equal(firstWeek.startDate, "2026-08-31");
        assert.equal(firstWeek.scheduledDays, 6);
        assert.equal(firstWeek.completedDays, 4);
        assert.equal(firstWeek.eligibleScheduledDays, 6);
        assert.equal(firstWeek.completionRate, 66.7);
        const lastWeek = result.weeklyTrend[1];
        assert.equal(lastWeek.scheduledDays, 1);
        assert.equal(lastWeek.completedDays, 1);
        assert.equal(lastWeek.completionRate, 100);
        assert.equal(result.totalsByUnit[0].value, 2);
        assert.equal(result.totalsByUnit[0].recordCount, 2);
    });

    check("at-least items keep their original statuses and agree with isComplete", () => {
        const habit = item({direction: undefined, kind: "duration", target: 20, unit: "分钟"});
        const events = [
            event("2026-09-01", 20, {unit: "分钟"}),
            event("2026-09-02", 20, {unit: "分钟"}),
            event("2026-09-03", 5, {unit: "分钟"}),
            event("2026-09-07", 20, {unit: "分钟"}),
        ];
        const data = store(habit, events);
        const result = buildHabitInsights(data, "quit", {asOf: new Date(2026, 8, 7, 9), days: 7});
        assert.deepEqual(statuses(result), ["complete", "complete", "partial", "missed", "missed", "missed", "complete"]);
        assertMatchesMainModel(result, data);
    });

    console.log(`Insights atMost alignment: ${checks} checks passed.`);
} finally {
    if (previousTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimeZone;
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
