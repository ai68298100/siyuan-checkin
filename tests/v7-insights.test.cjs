const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-v7-"));
process.env.TZ = "Asia/Shanghai";

for (const filename of ["model.ts", "record-step.ts", "quota.ts", "rules.ts", "charts.ts", "features/achievements.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const charts = require(path.join(outputRoot, "charts.js"));
const {buildAchievements} = require(path.join(outputRoot, "features", "achievements.js"));

function store() {
    const now = new Date();
    const today = (hour) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour).toISOString();
    return {
        version: 1,
        items: [
            {id: "a", name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", timeSlot: "morning", createdAt: now.toISOString()},
            {id: "b", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}, group: "健康", timeSlot: "afternoon", createdAt: now.toISOString()},
        ],
        events: [
            {id: "e1", itemId: "a", occurredAt: today(8), localDate: dateKey(now), value: 30, unit: "分钟", source: "manual"},
            {id: "e2", itemId: "b", occurredAt: today(9), localDate: dateKey(now), value: 8, unit: "杯", source: "manual"},
        ],
    };
    function dateKey(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }
}

// 趋势聚合：折线与柱状的点位数量和取值范围
const weekly = charts.buildWeeklyCompletionTrend(store(), 12);
assert.equal(weekly.points.length, 12, "weekly trend returns 12 points");
assert.ok(weekly.points.every((point) => point.value >= 0 && point.value <= 100), "completion rates stay within 0-100");
const monthly = charts.buildMonthlyEventTrend(store(), 6);
assert.equal(monthly.points.length, 6, "monthly trend returns 6 points");
assert.equal(monthly.points[monthly.points.length - 1].value, 2, "current month counts both seed events");

// SVG 渲染：折线含数据点，柱状含柱体，空数据处理安全
const line = charts.renderLineChart(weekly);
assert.match(line, /<svg class="lc-chart"/);
assert.match(line, /<polyline points="/);
assert.match(line, /lc-chart-grid/);
assert.match(line, /lc-chart-area/);
assert.ok(charts.renderLineChart({title: "空", unit: "%", points: []}) === "", "empty series renders nothing");
const bars = charts.renderBarChart(monthly);
assert.match(bars, /<rect /);
assert.match(bars, /lc-chart-value/);
assert.deepEqual(charts.summarizeTrend({title: "x", unit: "%", points: [{label: "a", value: 20}, {label: "b", value: 50}]}), {current: 50, average: 35, best: 50, delta: 30});
assert.equal(charts.renderBarChart({title: "空", unit: "条", points: []}), "");
const activityChart = charts.renderLineChart({title: "近30天活跃", unit: "天", points: [{label: "9/19", value: 0}, {label: "9/20", value: 1}]});
assert.match(activityChart, />0天<\/text>/, "activity axes start at zero days");
assert.match(activityChart, />1天<\/text>/, "activity axes show one day instead of 100 percent");
assert.doesNotMatch(activityChart, /\d+%<\/text>/, "non-percentage data never receives percentage ticks");
const topTick = Math.min(...[...activityChart.matchAll(/class="lc-chart-grid"[^>]+y1="([\d.]+)"/g)].map(match => Number(match[1])));
const activeDayY = [...activityChart.matchAll(/<circle[^>]+cy="([\d.]+)"/g)].at(-1);
assert.equal(Number(activeDayY[1]), topTick, "one active day reaches the graph top instead of collapsing to the zero line");
assert.match(line, />100%<\/text>/, "completion rate keeps its 0..100 percent scale");
const longSeries = {title: "strong", unit: "%", points: Array.from({length: 30}, (_, index) => ({label: `day-${index}`, value: index}))};
const sparseChart = charts.renderLineChart(longSeries, {labelStride: 7});
const visibleLabels = [...sparseChart.matchAll(/class="lc-chart-label">([^<]+)</g)].map(match => match[1]);
assert.deepEqual(visibleLabels, ["day-0", "day-7", "day-14", "day-29"], "dates are thinned to leave readable space before the final label");
assert.match(sparseChart, /preserveAspectRatio="xMidYMid meet"/, "capped chart height cannot stretch text horizontally");
const unsafeSeries = {title: 'custom "<title>', unit: '<unit>', points: [{label: '<label>&', value: 1}]};
for (const rendered of [charts.renderLineChart(unsafeSeries), charts.renderBarChart(unsafeSeries)]) {
    assert.doesNotMatch(rendered, /<unit>|<label>|aria-label="custom "<title>/, "custom chart strings are text, never markup");
    assert.match(rendered, /&lt;label&gt;&amp;/);
}
const heatmap = charts.buildYearHeatmap(store(), new Date().getFullYear());
const heatmapSvg = charts.renderYearHeatmap(heatmap);
assert.match(heatmapSvg, /class="lc-yearheatmap"/);
assert.equal((heatmapSvg.match(/月<\/text>/g) || []).length, 12, "year heatmap labels all months");
assert.match(heatmapSvg, /每格一天/);

// 成就引擎：从种子数据推导达成状态
const achievements = buildAchievements(store());
const first = achievements.find((entry) => entry.id === "first");
assert.ok(first && first.achieved, "first check-in achievement is earned");
assert.equal(achievements.length >= 20, true, "achievement catalog ships with a rich badge set");
assert.deepEqual(new Set(achievements.map((entry) => entry.category)), new Set(["milestone", "consistency", "quality", "reflection", "rhythm"]));
const perfect = achievements.find((entry) => entry.id === "perfect-1");
assert.ok(perfect && perfect.achieved, "a day where all scheduled items completed counts as a perfect day");
const events200 = achievements.find((entry) => entry.id === "events-200");
assert.ok(events200 && !events200.achieved && events200.progress === 2, "unearned badges expose honest progress");

const fragmentsSource = fs.readFileSync(path.join(sourceRoot, "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /class="lc-checkin__log-group"/);
assert.match(fragmentsSource, /review\.logEntries/);
assert.match(fragmentsSource, /events\.reduce\(\(sum, event\) => sum \+ event\.value/);
const reviewSource = fs.readFileSync(path.join(sourceRoot, "render", "review.ts"), "utf8");
assert.match(reviewSource, /lc-checkin__achievement-category/);
assert.match(reviewSource, /category === "milestone" \? " open"/);

console.log("7.0 trend chart and achievement engine checks passed.");
