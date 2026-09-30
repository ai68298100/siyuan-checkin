/* T-1704 守门：周期起点、闰日与"第 5 个星期"语义矩阵（D-350）。
   审计要求先形成预期表再修证实偏差。本夹具即预期表的执行形态：
   - 闰日（02-29）annual：非闰年顺延至当年 02-28（与月度/interval 的月末 clamp
     纪律一致）；修复前平年直接 undefined（生日/年检消失两个年度，红证）；
   - 月末 clamp：月度 31 号在 2 月落 02-28；interval 年单位闰日锚同纪律；
   - 第 5 周：该月不存在第 5 个星期X → 跳至下一个存在该周的月份（跳过策略）；
   - 未来锚点：2027 年起的年检从今日看下一发生=2027-05-10（"从锚点 MM-DD 每年"）；
   - 农历 annual 正常换算。验收下一发生日/倒计时/今日分组/提醒/预览同源
     （全部消费 getOccurrenceDate 单一实现）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-calendar-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));
const norm = (overrides = {}) => occasions.normalizeOccasion({
    id: "x",
    name: "事项",
    kind: "scheduled",
    date: "2024-05-10",
    recurrence: "annual",
    enabled: true,
    ...overrides,
});
const next = (item, from) => occasions.getOccurrenceDate(norm(item), from);

/* —— 闰日矩阵（修复核心）。 —— */
const leapBirthday = {date: "2024-02-29", recurrence: "annual"};
assert.equal(next(leapBirthday, "2026-01-01"), "2026-02-28", "a leap-day birthday defers to Feb 28 in a common year (was undefined before the fix)");
assert.equal(next(leapBirthday, "2026-03-01"), "2027-02-28", "after the deferred day passes, the next common year defers again");
assert.equal(next(leapBirthday, "2028-01-01"), "2028-02-29", "a leap year still prefers the true Feb 29");
assert.equal(next(leapBirthday, "2024-03-01"), "2025-02-28", "walking forward from the anchor lands on the next common-year deferral (2025)");

/* —— 月末 clamp 与第 5 周策略（现状语义，文档化钉住）。 —— */
assert.equal(next({date: "2024-01-31", recurrence: "monthly"}, "2026-02-01"), "2026-02-28", "a monthly 31st clamps to the month end");
assert.equal(next({date: "2024-01-05", recurrence: "monthly", monthlySubtype: "nthweek", nthWeek: 5, weekday: 1}, "2026-02-01"), "2026-03-30", "a missing 5th weekday skips to the next month that has one");
assert.equal(next({date: "2024-06-05", recurrence: "annual", annualSubtype: "nthweek", month: 6, nthWeek: 5, weekday: 1}, "2026-01-01"), "2026-06-29", "an annual 5th-weekday resolves within its month when it exists");

/* —— 未来锚点与农历。 —— */
assert.equal(next({date: "2027-05-10", recurrence: "annual"}, "2026-10-01"), "2027-05-10", "a future anchor counts from its own month-day every year");
assert.equal(next({date: "2024-02-29", recurrence: "interval", intervalCount: 1, intervalUnit: "year"}, "2026-01-01"), "2026-02-28", "an interval-year leap anchor follows the same clamp discipline");
assert.ok(next({date: "2024-02-10", recurrence: "annual", calendar: "lunar"}, "2026-01-01"), "a lunar birthday resolves to a solar date");

/* —— 红证对照：修复前（3bdef3b）平年闰日为 undefined。 —— */
const preFixDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-calendar-red-"));
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts"]) {
    fs.writeFileSync(path.join(preFixDir, filename.replace(/\.ts$/, ".js")), fs.readFileSync(path.join(dir, filename.replace(/\.ts$/, ".js"))));
}
fs.writeFileSync(path.join(preFixDir, "occasions.js"), ts.transpileModule(cp.execSync("git show 3bdef3b:src/occasions.ts", {encoding: "utf8"}), {compilerOptions}).outputText);
const preFixOccasions = require(path.join(preFixDir, "occasions.js"));
const preFixNext = (item, from) => preFixOccasions.getOccurrenceDate(preFixOccasions.normalizeOccasion({...{id: "x", name: "事项", kind: "scheduled", date: "2024-05-10", recurrence: "annual", enabled: true, ...item}}), from);
assert.equal(preFixNext(leapBirthday, "2026-01-01"), undefined, "pre-fix reference: a leap-day birthday in a common year had no next occurrence (red evidence)");

console.log("occasion-calendar: all assertions passed");
