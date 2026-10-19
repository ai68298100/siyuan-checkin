const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1794 守门测试：配额摘要末日与 DST 日期算术（D-376）。
   根因：bounds.end.getTime() - 86400000 在美东等夏令时春季转换日（23小时天）
   从周一 00:00 减 24 小时会漂移到周六 23:00（前两日），取错末日修订与周期键。
   修复：淘汰 86400000 物理毫秒减法，统一经 date-keys.addDays 整数日序号推导上一民历日。 */

const sourceRoot = path.join(__dirname, "..", "src");
const analyticsSrc = fs.readFileSync(path.join(sourceRoot, "analytics.ts"), "utf8");

/* 断言 1：物理毫秒减法清零 */
assert.doesNotMatch(
    analyticsSrc,
    /bounds\.end\.getTime\(\)\s*-\s*86400000/,
    "T-1794: bounds.end - 86400000 is eliminated from summarizeQuota",
);
assert.match(
    analyticsSrc,
    /addDaysKey\(endKey,\s*-1\)/,
    "T-1794: elapsedEndKey is computed via day-ordinal addDaysKey(-1)",
);
assert.doesNotMatch(
    analyticsSrc,
    /Math\.round\(\(new Date\(ey, em - 1, ed\)\.getTime\(\) - new Date\(sy, sm - 1, sd\)\.getTime\(\)\) \/ 86400000\)/,
    "T-1794: localDaySpan eliminated loose Math.round division",
);
assert.match(
    analyticsSrc,
    /daysBetweenHalfOpen\(startDate,\s*endDateExclusive\)/,
    "T-1794: localDaySpan delegates to shared daysBetweenHalfOpen",
);

/* 断言 2：日序号计算与 DST 23 小时跨度推导准确性 */
const {addDays, daysBetweenHalfOpen} = require(path.join(sourceRoot, "date-keys.ts"));

// 2026-03-08 是美东春令时转换日（前一天是 03-07，后一天是 03-09）
assert.equal(addDays("2026-03-09", -1), "2026-03-08", "addDays(2026-03-09, -1) correctly yields 2026-03-08");
assert.equal(addDays("2026-03-08", -1), "2026-03-07", "addDays(2026-03-08, -1) correctly yields 2026-03-07");

// 闰年 2028-03-01 的前一日是 2028-02-29
assert.equal(addDays("2028-03-01", -1), "2028-02-29", "leap year preceding day is 2028-02-29");

// 平年 2026-03-01 的前一日是 2026-02-28
assert.equal(addDays("2026-03-01", -1), "2026-02-28", "common year preceding day is 2026-02-28");

// 跨年 2027-01-01 的前一日是 2026-12-31
assert.equal(addDays("2027-01-01", -1), "2026-12-31", "cross-year preceding day is 2026-12-31");

// daysBetweenHalfOpen 严格整天数
assert.equal(daysBetweenHalfOpen("2026-03-01", "2026-03-08"), 7, "exactly 7 days across DST week");

console.log("quota-dst-endday: all assertions passed");
