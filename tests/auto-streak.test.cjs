const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：连击走统一状态序列，AUTO 惰性推导仅对 quota 项。 */
const modelSource = read("model.ts");
assert.match(modelSource, /deriveQuotaAutoDays\(schedule, store\.events, item\.id, key, key, \{asOf: today\}\)/, "streak walk derives AUTO lazily per break day");
assert.match(modelSource, /else if \(skipDays\.has\(key\)\)/, "skip days remain neutral bridges in the unified walk");
const achievementsSource = read("features", "achievements.ts");
assert.match(achievementsSource, /getSkipDatesForItem\(store, item\.id\)\.has\(dateKey\(date\)\)/, "perfect-day denominator excludes skipped items");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-auto-streak-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "features/achievements.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const {buildAchievements} = require(path.join(outputRoot, "features", "achievements.js"));

const key = (month, day) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const quotaItem = {
    id: "flex", name: "弹性运动", icon: "🏃", kind: "binary", target: 1, unit: "次",
    schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01", revisions: [], archivePeriods: [],
};
const store = model.createDefaultStore();
store.items = [quotaItem];
const event = (id, month, day) => ({id, itemId: "flex", occurredAt: `${key(month, day)}T01:00:00.000Z`, localDate: key(month, day), value: 1, unit: "次", source: "manual"});
/* 第 1 周（09-14 周一）：周一/二/三完成 → 周四~周日为 AUTO；第 2 周同样周一~三完成。 */
store.events = [
    event("w1a", 9, 14), event("w1b", 9, 15), event("w1c", 9, 16),
    event("w2a", 9, 21), event("w2b", 9, 22), event("w2c", 9, 23),
];

const asOf = new Date(2026, 8, 23, 12);
const streaks = model.computeEventStreaks(store, asOf);
assert.equal(streaks.get("flex"), 10, "week2 (3) + week1 AUTO Thu-Sun (4) + week1 (3) = 10");

/* asOf 在中途：只有本周真实完成计连击（上周链不跨越未满足周）。 */
const early = model.computeEventStreaks(store, new Date(2026, 8, 16, 12));
assert.equal(early.get("flex"), 3, "mid-week streak counts only real completions so far");

/* 一个月未动后连击归零（AUTO 不跨未满足周期伪造连续）。 */
const stale = model.createDefaultStore();
stale.items = [quotaItem];
stale.events = [event("old1", 8, 3), event("old2", 8, 4), event("old3", 8, 5)];
assert.equal(model.computeEventStreaks(stale, asOf).get("flex"), 0, "a satisfied period long past does not keep the streak alive");

/* 成就对齐：跳过的项目不破坏完美日连续。 */
const pairStore = model.createDefaultStore();
pairStore.items = [
    {...quotaItem, id: "a", name: "A", schedule: {type: "daily"}},
    {...quotaItem, id: "b", name: "B", schedule: {type: "daily"}},
];
pairStore.events = [
    {id: "p1", itemId: "a", occurredAt: "2026-09-20T01:00:00.000Z", localDate: "2026-09-20", value: 1, unit: "次", source: "manual"},
    {id: "p2", itemId: "a", occurredAt: "2026-09-21T01:00:00.000Z", localDate: "2026-09-21", value: 1, unit: "次", source: "manual"},
    {id: "p3", itemId: "b", occurredAt: "2026-09-20T01:00:00.000Z", localDate: "2026-09-20", value: 1, unit: "次", source: "manual"},
    {id: "p4", itemId: "b", occurredAt: "2026-09-21T01:00:00.000Z", localDate: "2026-09-21", value: 0, unit: "次", source: "manual", kind: "skip"},
];
const achievements = buildAchievements(pairStore, new Date(2026, 8, 21, 12));
const perfect = achievements.find((entry) => entry.id === "perfect-1");
const streak = achievements.find((entry) => entry.id === "streak-3");
assert.ok(perfect && perfect.progress >= 2, "both days count as perfect (skip is neutral)");
assert.ok(streak.progress >= 2, `skip day keeps the perfect streak alive (progress ${streak.progress})`);

console.log("Auto streak checks passed: AUTO bridges flexible-quota streaks across satisfied periods, stale periods stay dead, and achievements treat skips as neutral.");
