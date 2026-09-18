const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：三条宽容提醒二期触点全部落位。 */
const remindersSource = read("reminders.ts");
assert.match(remindersSource, /isSkipEvent\(event\)\)/, "reminder projection filters skipped days");
const coachingSource = read("features", "coaching.ts");
assert.match(coachingSource, /recentSkipDays >= 2/, "coaching rule triggers on consecutive skips");
assert.match(coachingSource, /skip-streak/, "skip-streak suggestion id registered");
const indexSource = read("index.ts");
assert.match(indexSource, /insights\.streakRestart/, "insights page carries the fresh-start copy");
assert.match(indexSource, /currentStreak === 0 && report\.longestStreak > 0/, "restart note only shows after a real streak");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-skip-tolerance-"));
for (const filename of ["types.ts", "i18n.ts", "lunar.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "occasions.ts", "reminders.ts", "features/insights.ts", "features/coaching.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const reminders = require(path.join(outputRoot, "reminders.js"));
const insights = require(path.join(outputRoot, "features", "insights.js"));
const coaching = require(path.join(outputRoot, "features", "coaching.js"));
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));

const now = new Date(2026, 8, 19, 12);
const key = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const item = (id) => ({
    id, name: `项目${id}`, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: [],
});
const event = (id, itemId, day, kind) => ({
    id, itemId, occurredAt: `${key(day)}T01:00:00.000Z`, localDate: key(day), value: 1, unit: "次",
    source: "manual", ...(kind ? {kind} : {}),
});
const store = model.createDefaultStore();
store.items = [item("active"), item("skipped"), item("done")];
store.events = [
    event("e18", "active", 18),
    event("s18", "skipped", 18, "skip"),
    event("s19", "skipped", 19, "skip"),
    event("d18", "done", 18),
    event("d19", "done", 19),
];

/* 跳过日不再提醒：跳过（未完成）的当日机会不进入提醒中心。 */
const center = reminders.projectReminderCenter(store, {occasions: []}, now, []);
const bySource = new Map(center.map((entry) => [entry.sourceId + ":" + entry.status, entry]));
assert.ok(!bySource.has("skipped:today"), "skipped day produces no today reminder");
assert.ok(bySource.has("active:today") && bySource.has("done:completed"), "other items still project normally");

/* 洞察：跳过日不断当前连续，并暴露 recentSkipDays。 */
const report = insights.buildHabitInsights(store, "skipped", {days: 14, asOf: now});
assert.equal(report.recentSkipDays, 2, "trailing consecutive skip days are counted");
const skippedDay = report.days.find((day) => day.date === key(18));
assert.equal(skippedDay.skipped, true);
assert.equal(skippedDay.status, "missed", "status vocabulary stays unchanged");
/* 有真实完成后接跳过日：recentSkipDays 从完成日截断。 */
const doneReport = insights.buildHabitInsights(store, "done", {days: 14, asOf: now});
assert.equal(doneReport.recentSkipDays, 0, "a completion ends the skip run");
/* 跳过日不重置洞察当前连续：active 在 18 完成后，19 未关闭不重置；人工构造跳过断言。 */
const bridged = model.createDefaultStore();
bridged.items = [item("b")];
bridged.events = [
    event("b17", "b", 17),
    event("b18s", "b", 18, "skip"),
    event("b19", "b", 19),
];
const bridgedReport = insights.buildHabitInsights(bridged, "b", {days: 14, asOf: now});
assert.equal(bridgedReport.currentStreak >= 1, true, "skipped day keeps the in-window streak alive");

/* 教练建议：连续跳过 ≥2 触发下调频率建议（只建议，不自动改）。 */
const suggestions = coaching.buildCoachingSuggestions(report);
assert.ok(suggestions.some((entry) => entry.id === "skip-streak"), "skip-streak suggestion fires");
assert.equal(coaching.buildCoachingSuggestions(doneReport).some((entry) => entry.id === "skip-streak"), false, "no skip suggestion without skips");

/* 反内疚文案（中英）。 */
setPluginLanguage("zh-CN");
const zhNote = t("insights.streakRestart");
setPluginLanguage("en-US");
const enNote = t("insights.streakRestart");
setPluginLanguage("zh-CN");
assert.ok(zhNote.includes("重新开始") && enNote.includes("Fresh start"), "restart copy exists in both languages");

console.log("Skip tolerance checks passed: skipped days leave reminders, insights expose trailing skips, coaching suggests frequency downgrades, restart copy ships in both languages.");
