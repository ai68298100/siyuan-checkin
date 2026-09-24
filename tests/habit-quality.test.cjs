const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：成就徽章、洞察成熟度/超额字段与展示位齐全。 */
const achievementsSource = read("features", "achievements.ts");
assert.match(achievementsSource, /overachievedDays/, "achievements count overachieved days");
assert.match(achievementsSource, /overachieve-1/, "overachieve-1 badge registered");
assert.match(achievementsSource, /overachieve-10/, "overachieve-10 badge registered");
const insightsSource = read("features", "insights.ts");
assert.match(insightsSource, /maturity: number/, "insights expose maturity percentage");
assert.match(insightsSource, /overachievedDays: number/, "insights expose overachieved days");
assert.match(read("index.ts"), /insights\.maturity/, "insights view renders the maturity stat");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-habit-quality-"));
for (const filename of ["types.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "features/achievements.ts", "features/insights.ts", "features/habit-score.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const achievementsMod = require(path.join(outputRoot, "features", "achievements.js"));
const insightsMod = require(path.join(outputRoot, "features", "insights.js"));
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));

const asOf = new Date(2026, 8, 19, 12);
const key = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const wordItem = {
    id: "words", name: "背单词", icon: "📝", kind: "count", target: 20, unit: "个", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01", revisions: [], archivePeriods: [],
};
const store = model.createDefaultStore();
store.items = [wordItem];
const event = (id, day, value) => ({id, itemId: "words", occurredAt: `${key(day)}T01:00:00.000Z`, localDate: key(day), value, unit: "个", source: "manual"});
store.events = [
    event("a", 10, 20),  /* 正好达标 */
    event("b", 11, 30),  /* 150% 超额 */
    event("c", 12, 45),  /* 225% 超额 */
    event("d", 13, 29),  /* 145% 未达超额线 */
    event("e", 14, 20),
];

const achievements = achievementsMod.buildAchievements(store, asOf);
const first = achievements.find((entry) => entry.id === "overachieve-1");
const ten = achievements.find((entry) => entry.id === "overachieve-10");
assert.ok(first && first.achieved && first.progress === 1, "single overachieved day unlocks the first badge");
assert.ok(ten && !ten.achieved && ten.progress === 2, `ten-badge counts 2 overachieved days so far (got ${ten && ten.progress})`);

/* 洞察：超额日与成熟度（sigmoid，66 天参考线半程）。 */
const report = insightsMod.buildHabitInsights(store, "words", {days: 30, asOf});
assert.equal(report.overachievedDays, 2, "insights count the same overachieved days");
assert.ok(report.maturity > 0 && report.maturity < 100, "maturity stays in the open interval");
const emptyReport = insightsMod.buildHabitInsights(model.createDefaultStore(), "words", {days: 30, asOf});
assert.equal(emptyReport.maturity, 0, "no eligible days means zero maturity");

/* 成熟度随机会日单调上升（sigmoid）。 */
const bigger = insightsMod.buildHabitInsights(store, "words", {days: 84, asOf});
assert.ok(bigger.maturity >= report.maturity, "wider windows accumulate more eligible days");

/* i18n 双语。 */
setPluginLanguage("zh-CN");
const zh = t("insights.maturity");
setPluginLanguage("en-US");
const en = t("insights.maturity");
setPluginLanguage("zh-CN");
assert.equal(zh, "成熟度");
assert.equal(en, "Maturity");

console.log("Habit quality checks passed: 1.5x overachievement badges, insights parity, sigmoid maturity and i18n coverage.");
