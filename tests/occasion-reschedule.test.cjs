/* T-1705 守门：改期实例的错过提示与完成状态（D-351）。
   风险路径（静态缺口）：getMissedOccurrence 逆推原周期日期后只查 completedDates
   是否含原日——9/15 改到 9/20 且在新日完成，9/21 仍提示原日漏记（误报）；
   反向场景改期日未完成时补标对象也指向原日（造成重复完成）。
   契约：原日被单次改期时，完成/补标都落在实际发生日（跟随覆盖链有界防环）；
   无覆盖时行为与旧版逐值一致；once/农历/第 N 周/停用早退不变。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-reschedule-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const weekly = (overrides, completedDates = []) => occasions.normalizeOccasion({
    id: "w1",
    name: "周会",
    kind: "scheduled",
    date: "2026-09-15",
    recurrence: "weekly",
    weekday: 2,
    enabled: true,
    completedDates,
    overrides,
});

/* —— 夹具 1：9/15 改到 9/20 且在新日完成——9/21 不再误报原日漏记（红→绿核心）。 —— */
const doneAtNewDate = weekly({"2026-09-15": {date: "2026-09-20"}}, ["2026-09-20"]);
assert.equal(occasions.getMissedOccurrence(doneAtNewDate, "2026-09-21"), undefined,
    "a rescheduled-and-completed instance is not flagged as a missed original date");

/* —— 夹具 2：改期日未完成——提示实际发生日（补标对象=改期日）。 —— */
const pendingAtNewDate = weekly({"2026-09-15": {date: "2026-09-20"}}, []);
assert.equal(occasions.getMissedOccurrence(pendingAtNewDate, "2026-09-21"), "2026-09-20",
    "an uncompleted rescheduled instance surfaces the actual occurrence date for catch-up");

/* —— 夹具 3：覆盖链跟随（9/15→9/20→9/22）。 —— */
const chained = weekly({"2026-09-15": {date: "2026-09-20"}, "2026-09-20": {date: "2026-09-22"}}, []);
assert.equal(occasions.getMissedOccurrence(chained, "2026-09-23"), "2026-09-22",
    "chained reschedules resolve to the final actual date");
const chainedDone = weekly({"2026-09-15": {date: "2026-09-20"}, "2026-09-20": {date: "2026-09-22"}}, ["2026-09-22"]);
assert.equal(occasions.getMissedOccurrence(chainedDone, "2026-09-23"), undefined,
    "completing the final chained date clears the miss");

/* —— 夹具 4：无覆盖时行为与旧版逐值一致（已完成不报、未完成报原日）。 —— */
const plain = weekly({}, ["2026-09-15"]);
assert.equal(occasions.getMissedOccurrence(plain, "2026-09-20"), undefined, "a marked previous cycle is not flagged");
const plainPending = weekly({}, []);
assert.equal(occasions.getMissedOccurrence(plainPending, "2026-09-20"), "2026-09-15", "an unmarked previous cycle surfaces as before");

/* —— 夹具 5：早退口径不变（once/停用）。 —— */
assert.equal(occasions.getMissedOccurrence({...weekly({}, []), recurrence: "once"}, "2026-09-21"), undefined);
assert.equal(occasions.getMissedOccurrence({...weekly({}, []), enabled: false}, "2026-09-21"), undefined);

/* —— 夹具 6：红证对照——修复前（aa183bd）改期完成实例仍误报原日。 —— */
const preFixDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-reschedule-red-"));
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts"]) {
    fs.writeFileSync(path.join(preFixDir, filename.replace(/\.ts$/, ".js")), fs.readFileSync(path.join(dir, filename.replace(/\.ts$/, ".js"))));
}
fs.writeFileSync(path.join(preFixDir, "occasions.js"), ts.transpileModule(cp.execSync("git show aa183bd:src/occasions.ts", {encoding: "utf8"}), {compilerOptions}).outputText);
const preFixOccasions = require(path.join(preFixDir, "occasions.js"));
const preFixDone = preFixOccasions.normalizeOccasion({
    id: "w1", name: "周会", kind: "scheduled", date: "2026-09-15", recurrence: "weekly", weekday: 2,
    enabled: true, completedDates: ["2026-09-20"], overrides: {"2026-09-15": {date: "2026-09-20"}},
});
assert.equal(preFixOccasions.getMissedOccurrence(preFixDone, "2026-09-21"), "2026-09-15",
    "pre-fix reference: the completed reschedule still flagged the original date (red evidence)");

console.log("occasion-reschedule: all assertions passed");
