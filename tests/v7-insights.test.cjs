const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-v7-"));
process.env.TZ = "Asia/Shanghai";

for (const filename of ["model.ts", "quota.ts", "rules.ts", "charts.ts", "features/achievements.ts"]) {
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
assert.ok(charts.renderLineChart({title: "空", unit: "%", points: []}) === "", "empty series renders nothing");
const bars = charts.renderBarChart(monthly);
assert.match(bars, /<rect /);
assert.equal(charts.renderBarChart({title: "空", unit: "条", points: []}), "");

// 成就引擎：从种子数据推导达成状态
const achievements = buildAchievements(store());
const first = achievements.find((entry) => entry.id === "first");
assert.ok(first && first.achieved, "first check-in achievement is earned");
assert.equal(achievements.length >= 9, true, "achievement catalog ships with at least nine badges");
const perfect = achievements.find((entry) => entry.id === "perfect-1");
assert.ok(perfect && perfect.achieved, "a day where all scheduled items completed counts as a perfect day");
const events200 = achievements.find((entry) => entry.id === "events-200");
assert.ok(events200 && !events200.achieved && events200.progress === 2, "unearned badges expose honest progress");

console.log("7.0 trend chart and achievement engine checks passed.");
