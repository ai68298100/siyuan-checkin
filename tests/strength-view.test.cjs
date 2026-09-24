const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：回顾页折叠卡、洞察字段、教练规则与 API 边界全部落位。 */
const reviewSource = read("render", "review.ts");
assert.match(reviewSource, /fold\("strength"/, "review exposes the strength fold");
assert.match(reviewSource, /data-review-strength-item/, "one selector switches the average and individual project strength");
assert.match(reviewSource, /selectedStrength \? selectedChart : strengthOverview/,
    "strength renders exactly the selected plot rather than every project chart");
assert.match(reviewSource, /buildHabitScoreSeries\(/, "review consumes the shared score implementation");
assert.equal((reviewSource.match(/width: 320, height: 150, labelStride: 7/g) || []).length, 2, "overview and per-item plots share a readable narrow chart coordinate system");
assert.match(reviewSource, /renderIconMarkup\(iconsById.get/, "review project icons use the same safe image/text rendering as Today");
const insightsSource = read("features", "insights.ts");
assert.match(insightsSource, /strengthScore: number \| null/, "insights expose bounded strength fields");
assert.match(insightsSource, /collectHabitScoreDays\(store, item/, "insights reuse the shared collector");
const coachingSource = read("features", "coaching.ts");
assert.match(coachingSource, /strength-decline/, "coaching consumes strength decline");
assert.match(coachingSource, /report\.strengthScore !== null && report\.strengthDelta !== null && report\.strengthDelta <= -15 && report\.strengthScore < 60/, "decline rule keeps bounded thresholds");
const apiSource = read("api.ts");
assert.match(apiSource, /getStrengthSummary: \(options\)/, "api exposes the strength summary");
assert.match(apiSource, /Math\.min\(366, Math\.max\(7, Math\.floor\(requested\)\)\)/, "strength window is clamped to 7..366");
assert.match(apiSource, /\.slice\(0, 200\)/, "strength summary caps at 200 active items");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-strength-view-"));
for (const filename of ["types.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "features/habit-score.ts", "features/insights.ts", "features/coaching.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const insights = require(path.join(outputRoot, "features", "insights.js"));
const coaching = require(path.join(outputRoot, "features", "coaching.js"));
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));

const asOf = new Date(2026, 8, 19, 12);
const key = (month, day) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const dailyItem = (id) => ({
    id, name: `项目${id}`, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01", revisions: [], archivePeriods: [],
});
const store = model.createDefaultStore();
store.items = [dailyItem("steady"), dailyItem("decayed")];
const event = (id, itemId, month, day) => ({id, itemId, occurredAt: `${key(month, day)}T01:00:00.000Z`, localDate: key(month, day), value: 1, unit: "次", source: "manual"});
/* steady：近 30 天全勤；decayed：仅 8 月底完成 10 天后中断。 */
const events = [];
for (let day = 21; day <= 31; day += 1) events.push(event(`s8${day}`, "steady", 8, day));
for (let day = 1; day <= 19; day += 1) events.push(event(`s9${day}`, "steady", 9, day));
for (let day = 21; day <= 30; day += 1) events.push(event(`d8${day}`, "decayed", 8, day));
store.events = events;

const steadyReport = insights.buildHabitInsights(store, "steady", {days: 30, asOf});
assert.ok(steadyReport.strengthScore !== null && steadyReport.strengthScore > 70, `steady item scores high (${steadyReport.strengthScore})`);
assert.ok((steadyReport.strengthDelta || 0) > 0, "steady item trend is upward");
const decayedReport = insights.buildHabitInsights(store, "decayed", {days: 30, asOf});
assert.ok(decayedReport.strengthScore !== null && decayedReport.strengthScore < 60, `decayed item score dropped (${decayedReport.strengthScore})`);
assert.ok((decayedReport.strengthDelta || 0) <= -15, "decayed item delta crosses the decline threshold");

const decliningSuggestions = coaching.buildCoachingSuggestions(decayedReport);
assert.ok(decliningSuggestions.some((entry) => entry.id === "strength-decline"), "strength-decline suggestion fires on decline");
assert.ok(!coaching.buildCoachingSuggestions(steadyReport).some((entry) => entry.id === "strength-decline"), "healthy rhythm gets no decline warning");

/* i18n：强度键中英齐全。 */
setPluginLanguage("zh-CN");
assert.ok(t("review.foldStrength").includes("强度"));
assert.ok(t("review.strengthPoints", {n: 42}).includes("42"));
setPluginLanguage("en-US");
assert.equal(t("review.foldStrength"), "Habit strength");
setPluginLanguage("zh-CN");

console.log("Strength view checks passed: shared score path in insights/review/api, decline coaching rule, bounded API summary and i18n coverage.");
