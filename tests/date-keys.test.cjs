/* T-1419 · R-A7 日期契约纯函数矩阵：校验/解析/日序号/DST 格式化/闰日/跨午夜/半开区间/序列/确定性。
   全部用例不依赖当前时间——本模块契约之一就是"不读取隐式时钟"，测试因此完全可回放。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-date-keys-"));
const target = path.join(dir, "date-keys.js");
fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "date-keys.ts"), "utf8"), {compilerOptions}).outputText);
const dk = require(target);

/* —— 1. 严格校验：格式 + 真实日历 —— */
assert.equal(dk.isValidDateKey("2026-09-24"), true, "普通合法日期");
assert.equal(dk.isValidDateKey("2024-02-29"), true, "闰日合法");
assert.equal(dk.isValidDateKey("2026-02-29"), false, "平年 2 月 29 必须拒绝");
assert.equal(dk.isValidDateKey("2026-02-30"), false, "2 月 30 必须拒绝（格式合法但日历不存在）");
assert.equal(dk.isValidDateKey("2026-04-31"), false, "4 月 31 必须拒绝");
assert.equal(dk.isValidDateKey("2026-13-01"), false, "13 月拒绝");
assert.equal(dk.isValidDateKey("2026-00-10"), false, "0 月拒绝");
assert.equal(dk.isValidDateKey("2026-01-00"), false, "0 日拒绝");
assert.equal(dk.isValidDateKey("26-01-01"), false, "两位年份拒绝");
assert.equal(dk.isValidDateKey("2026-1-1"), false, "一位月日拒绝");
assert.equal(dk.isValidDateKey("2026/01/01"), false, "斜杠分隔拒绝");
assert.equal(dk.isValidDateKey("20260101"), false, "无分隔拒绝");
assert.equal(dk.isValidDateKey(""), false, "空串拒绝");
assert.equal(dk.isValidDateKey(undefined), false, "非字符串拒绝");
assert.equal(dk.isValidDateKey(20260924), false, "数字拒绝");
assert.equal(dk.isValidDateKey("2026-01-01T00:00:00"), false, "带时间后缀拒绝");

/* —— 2. splitDateKey：拆分与非法回退 —— */
assert.deepEqual(dk.splitDateKey("2026-09-24"), {year: 2026, month: 9, day: 24});
assert.equal(dk.splitDateKey("2026-02-30"), undefined);
assert.equal(dk.splitDateKey("bad"), undefined);

/* —— 3. calendarDayNumber：与 model.ts localCalendarDayNumber 同公式 —— */
assert.equal(dk.calendarDayNumber("1970-01-01"), 0, "纪元");
assert.equal(dk.calendarDayNumber("1970-01-02"), 1);
assert.equal(dk.calendarDayNumber("2026-09-24"), Math.floor(Date.UTC(2026, 8, 24) / 86400000), "与 model 公式逐位一致");
assert.equal(dk.calendarDayNumber("2024-03-01") - dk.calendarDayNumber("2024-02-28"), 2, "闰年 2 月占两天");
assert.equal(dk.calendarDayNumber("2023-03-01") - dk.calendarDayNumber("2023-02-28"), 1, "平年 2 月占一天");
assert.equal(dk.calendarDayNumber("nope"), undefined, "非法键 fail-closed");

/* —— 4. formatDateKey：本地路径与既有实现等价；显式时区路径可跨时区 —— */
assert.equal(dk.formatDateKey(new Date(2026, 8, 24)), "2026-09-24", "本地 Date 直接取字段");
assert.equal(dk.formatDateKey(new Date(2026, 8, 4)), "2026-09-04", "补零");
// Asia/Shanghai UTC+8：UTC 18:00 仍是当日，UTC 16:00 已是次日（跨午夜证据）。
assert.equal(dk.formatDateKey(new Date("2026-07-15T18:00:00Z"), "Asia/Shanghai"), "2026-07-16", "上海 UTC+8 已进入次日");
assert.equal(dk.formatDateKey(new Date("2026-07-15T16:00:00Z"), "Asia/Shanghai"), "2026-07-16", "上海 16:00Z 即次日 00:00");
// America/New_York 夏令时边界：7 月为 EDT（UTC-4），1 月为 EST（UTC-5）。
assert.equal(dk.formatDateKey(new Date("2026-07-15T03:30:00Z"), "America/New_York"), "2026-07-14", "EDT 下 03:30Z 还是前一日");
assert.equal(dk.formatDateKey(new Date("2026-07-15T04:00:00Z"), "America/New_York"), "2026-07-15", "EDT 下 04:00Z 起为当日");
assert.equal(dk.formatDateKey(new Date("2026-01-15T04:00:00Z"), "America/New_York"), "2026-01-14", "EST（标准时）下同一时刻仍是前一日——DST 改变键值");
assert.equal(dk.formatDateKey(new Date("2026-01-15T05:00:00Z"), "America/New_York"), "2026-01-15", "EST 下 05:00Z 为当日");
// 同一 Date 在两个时区得到不同键：日期归属必须显式指定时区才能解释。
assert.notEqual(
    dk.formatDateKey(new Date("2026-07-15T16:00:00Z"), "America/New_York"),
    dk.formatDateKey(new Date("2026-07-15T16:00:00Z"), "Asia/Shanghai"),
    "同一时刻在不同时区属于不同本地日"
);

/* —— 5. addDays / nextLocalDay：闰日与月末归位 —— */
assert.equal(dk.addDays("2024-02-28", 1), "2024-02-29", "闰日可达");
assert.equal(dk.addDays("2024-02-29", 1), "2024-03-01", "闰日后归位 3 月");
assert.equal(dk.addDays("2023-02-28", 1), "2023-03-01", "平年 2 月直接到 3 月");
assert.equal(dk.addDays("2026-01-01", -1), "2025-12-31", "跨年回退");
assert.equal(dk.addDays("2026-10-25", 10), "2026-11-04", "跨月推进");
assert.equal(dk.addDays("2026-03-01", 0), "2026-03-01", "零平移恒等");
assert.equal(dk.nextLocalDay("2026-12-31"), "2027-01-01", "下一本地日跨年");
assert.equal(dk.nextLocalDay("bad"), undefined, "非法键返回 undefined");
assert.equal(dk.addDays("bad", 1), undefined);
assert.equal(dk.addDays("2026-01-01", Number.NaN), undefined, "非有限天数 fail-closed");

/* —— 6. daysBetweenHalfOpen：半开区间与方向语义 —— */
assert.equal(dk.daysBetweenHalfOpen("2026-09-24", "2026-09-24"), 0, "同日为 0");
assert.equal(dk.daysBetweenHalfOpen("2026-09-24", "2026-09-25"), 1, "相邻日为 1");
assert.equal(dk.daysBetweenHalfOpen("2026-09-25", "2026-09-24"), -1, "方向保留（与旧毫秒差同号）");
assert.equal(dk.daysBetweenHalfOpen("2026-02-28", "2026-03-01"), 1, "平年跨月末 1 天");
assert.equal(dk.daysBetweenHalfOpen("2024-02-28", "2024-03-01"), 2, "闰年跨月末 2 天");
assert.equal(dk.daysBetweenHalfOpen("2025-12-31", "2026-01-01"), 1, "跨午夜跨年");
assert.equal(dk.daysBetweenHalfOpen("2026-09-24", "bad"), undefined, "任一端非法 fail-closed");
// 等价回放：与被替换的 Math.round 毫秒差公式在全样本上逐点一致（含 DST 月份）。
for (const [from, to] of [["2026-03-07", "2026-03-09"], ["2026-11-01", "2026-11-02"], ["2026-06-01", "2026-08-01"], ["2024-02-27", "2024-03-02"]]) {
    const legacy = Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
    assert.equal(dk.daysBetweenHalfOpen(from, to), legacy, `等价回放 ${from}→${to}（含 DST 月份）`);
}

/* —— 7. 日期序列：半开与闭区间 —— */
assert.deepEqual(dk.dateRangeHalfOpen("2026-09-24", "2026-09-24"), [], "半开同日为空");
assert.deepEqual(dk.dateRangeHalfOpen("2026-09-24", "2026-09-26"), ["2026-09-24", "2026-09-25"]);
assert.deepEqual(dk.dateRangeHalfOpen("2026-09-26", "2026-09-24"), [], "逆序半开为空");
assert.deepEqual(dk.dateRangeInclusive("2026-09-24", "2026-09-24"), ["2026-09-24"], "闭区间同日含自身");
assert.deepEqual(dk.dateRangeInclusive("2026-12-31", "2027-01-02"), ["2026-12-31", "2027-01-01", "2027-01-02"], "闭区间跨年");
assert.deepEqual(dk.dateRangeInclusive("2026-03-02", "2026-02-28"), [], "闭区间逆序为空");
assert.equal(dk.dateRangeHalfOpen("bad", "2026-01-02"), undefined);
assert.equal(dk.dateRangeInclusive("2026-02-30", "2026-03-01"), undefined, "日历非法端点 fail-closed");
// 序列连续性：半开区间首尾相接覆盖 [from,to)，相邻元素日序号差恒为 1。
const span = dk.dateRangeInclusive("2026-02-27", "2026-03-02");
assert.equal(span.length, 4, "平年 2 月末闭区间为 4 天");
for (let i = 1; i < span.length; i += 1) {
    assert.equal(dk.daysBetweenHalfOpen(span[i - 1], span[i]), 1, `序列连续性 @${span[i]}`);
}

/* —— 8. 确定性：纯度审计（无时钟读取、无宿主依赖；剥离注释后扫描代码本体） —— */
const source = fs.readFileSync(path.join(__dirname, "..", "src", "date-keys.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
assert.doesNotMatch(source, /Date\.now\(/, "禁止读取系统时钟（Date.now）");
assert.doesNotMatch(source, /new Date\(\)/, "禁止缺省 new Date() 隐式取当前时间");
assert.doesNotMatch(source, /\bwindow\.|\bdocument\.|\bfetch\(|setTimeout\(|from "siyuan"/, "纯函数不得触碰宿主能力");

console.log("date-keys tests passed: 校验/解析/日序号/DST 双时区/闰日/跨午夜/半开区间/序列/等价回放/纯度 全部通过");
