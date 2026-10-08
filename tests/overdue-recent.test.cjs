/* T-1771 守门：长期周期事项的最近错过记录有界准确性（D-338）。
   风险路径（2026-09-30 审计）：projectOverdueOccurrenceHistory 从最早锚点向前枚举并在
   1000 次停止——超过 1000 次发生的稠密事项（如 interval:1）永远枚举不到近期，回顾
   「最近 12 条」实际是约 1000 次发生处的旧账，近期错过全部缺席。
   修复后契约：整史枚举 ≤1000 次即完整覆盖（稀疏/年轻事项与旧版逐条一致）；预算耗尽
   仍未到今日时改从「今日-1000 天」近窗重投影——最近的错过永远在列；补记排除、单次
   改期、混合稀疏事项行为不变。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-overdue-recent-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "occasions.ts", "reminders.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));
const reminders = require(path.join(dir, "reminders.js"));

const asOf = new Date(2026, 9, 1, 12);
const yesterday = "2026-09-30";
const addDaysKey = (key, days) => {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d + days, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
/* 旧算法参照（HEAD 行为）：从最早锚点向前、guard 1000。 */
const legacyProject = (occasion, today) => {
    const missed = [];
    let cursor = occasion.date;
    let guard = 0;
    while (cursor < today && guard < 1000) {
        guard += 1;
        if (!occasions.isOccasionCompleted(occasion, cursor)) missed.push(cursor);
        const nextDate = occasions.getOccurrenceDate(occasion, addDaysKey(cursor, 1));
        if (!nextDate || nextDate <= cursor) break;
        cursor = nextDate;
    }
    return missed;
};

/* —— 夹具 1：interval:1、发生 1017 次、零补记。最近 12 条必须是 asOf 前的 12 个连续日。 —— */
const denseStart = addDaysKey("2026-10-01", -1017);
const dense = occasions.normalizeOccasion({id: "dense", name: "每日巡逻", kind: "scheduled", date: denseStart, recurrence: "interval", intervalDays: 1, intervalUnit: "day", enabled: true, completedDates: []});
const denseHistory = reminders.projectOverdueOccurrenceHistory({occasions: [dense]}, asOf);
const denseDates = denseHistory.map((entry) => entry.occurrenceDate);
assert.equal(denseDates[0], yesterday, "the most recent occurrence is yesterday");
const expectedRecent = Array.from({length: 12}, (_, index) => addDaysKey("2026-10-01", -(index + 1))).sort((a, b) => b.localeCompare(a));
assert.deepEqual(denseDates.slice(0, 12), expectedRecent, "review's most-recent 12 are the actual latest misses");
assert.ok(denseDates.length > 12, "the window carries more history than the visible slice");
const legacyDense = legacyProject(dense, "2026-10-01");
assert.notEqual(legacyDense[legacyDense.length - 1], yesterday, "pre-fix reference stops ~1000 occurrences short of today (red evidence)");

/* —— 夹具 2：年轻事项（50 天）与旧算法逐条一致。 —— */
const youngStart = addDaysKey("2026-10-01", -50);
const young = occasions.normalizeOccasion({id: "young", name: "新习惯", kind: "scheduled", date: youngStart, recurrence: "interval", intervalDays: 2, intervalUnit: "day", enabled: true, completedDates: []});
const youngHistory = reminders.projectOverdueOccurrenceHistory({occasions: [young]}, asOf);
assert.deepEqual(youngHistory.map((entry) => entry.occurrenceDate), legacyProject(young, "2026-10-01").reverse(),
    "young sparse items keep the exact legacy enumeration");

/* —— 夹具 3：稀疏旧 once 事项（3 年前）仍被投影（第一遍整史覆盖）。 —— */
const oldOnce = occasions.normalizeOccasion({id: "old-once", name: "旧约诊", kind: "once", date: "2023-10-01", recurrence: "once", enabled: true, completedDates: []});
const onceHistory = reminders.projectOverdueOccurrenceHistory({occasions: [oldOnce]}, asOf);
assert.deepEqual(onceHistory.map((entry) => entry.occurrenceDate), ["2023-10-01"], "sparse old one-shot occasions stay projected");

/* —— 夹具 4：补记排除 + 单次改期。 —— */
const withCatchUp = occasions.normalizeOccasion({
    id: "catchup", name: "交报告", kind: "scheduled", date: "2026-09-20", recurrence: "interval", intervalDays: 1, intervalUnit: "day",
    enabled: true, completedDates: ["2026-09-21", "2026-09-25"],
});
const catchUpHistory = reminders.projectOverdueOccurrenceHistory({occasions: [withCatchUp]}, asOf);
const catchUpDates = catchUpHistory.map((entry) => entry.occurrenceDate);
assert.ok(!catchUpDates.includes("2026-09-21") && !catchUpDates.includes("2026-09-25"), "caught-up dates are excluded");
assert.ok(catchUpDates.includes("2026-09-22") && catchUpDates.includes(yesterday), "missed dates around catch-ups stay");
const shifted = occasions.normalizeOccasion({
    id: "shifted", name: "周会", kind: "scheduled", date: "2026-09-01", recurrence: "weekly",
    enabled: true, completedDates: [], overrides: {"2026-09-29": {date: "2026-09-30"}},
});
const shiftedHistory = reminders.projectOverdueOccurrenceHistory({occasions: [shifted]}, asOf);
const shiftedDates = shiftedHistory.map((entry) => entry.occurrenceDate);
assert.ok(shiftedDates.includes("2026-09-30"), "a rescheduled occurrence appears at its target date");
assert.ok(!shiftedDates.includes("2026-09-29"), "the overridden base date is suppressed");

/* —— 夹具 5：混合稠密+稀疏同投影，互不影响。 —— */
const mixed = reminders.projectOverdueOccurrenceHistory({occasions: [dense, oldOnce]}, asOf);
assert.ok(mixed.some((entry) => entry.occasionId === "old-once"), "the sparse item survives in a mixed projection");
assert.equal(mixed.filter((entry) => entry.occasionId === "dense")[0].occurrenceDate, yesterday, "the dense item still surfaces its latest miss first");

console.log("overdue-recent: all assertions passed");
