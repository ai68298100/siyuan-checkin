const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1793 & T-1811 守门测试：日历投影、排期预演、周负荷共用真实日期契约与有界范围。
   核心纪律：
   1. 必须使用 isValidDateKey 真实公历校验，严禁 Date.parse 或 Date.UTC 自动把 2026-02-30 滚入三月；
   2. 跨度判定使用 UTC 日序号差值（calendarDayNumber）O(1) 完成，消除无界扫描；
   3. 私有松散校验清零，源码统一收拢至 date-keys.ts。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-date-contracts-"));

for (const filename of [
    "date-keys.ts",
    "model.ts",
    "record-step.ts",
    "quota.ts",
    "rules.ts",
    "features/calendar-projection.ts",
    "features/schedule-preview.ts",
    "features/week-load.ts",
]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {buildCalendarProjection, CALENDAR_PROJECTION_LIMITS} = require(path.join(outputRoot, "features", "calendar-projection.js"));
const {buildSchedulePreview} = require(path.join(outputRoot, "features", "schedule-preview.js"));
const {buildWeekLoadPreview} = require(path.join(outputRoot, "features", "week-load.js"));
const {isValidDateKey} = require(path.join(outputRoot, "date-keys.js"));

/* 断言 1：源码私有松散校验清零，统一导入 date-keys.ts */
const schedulePreviewSrc = fs.readFileSync(path.join(sourceRoot, "features", "schedule-preview.ts"), "utf8");
const weekLoadSrc = fs.readFileSync(path.join(sourceRoot, "features", "week-load.ts"), "utf8");
const calendarProjSrc = fs.readFileSync(path.join(sourceRoot, "features", "calendar-projection.ts"), "utf8");

assert.match(schedulePreviewSrc, /from "\.\.\/date-keys"/, "schedule-preview imports from date-keys");
assert.doesNotMatch(schedulePreviewSrc, /day <= 31/, "schedule-preview removed local loose date check");

assert.match(weekLoadSrc, /from "\.\.\/date-keys"/, "week-load imports from date-keys");
assert.doesNotMatch(weekLoadSrc, /day <= 31/, "week-load removed local loose date check");

assert.match(calendarProjSrc, /isValidDateKey\(range\.startDate\)/, "calendar-projection validates startDate strictly");
assert.match(calendarProjSrc, /isValidDateKey\(range\.endDateExclusive\)/, "calendar-projection validates endDateExclusive strictly");
assert.doesNotMatch(calendarProjSrc, /function eachDayCount/, "calendar-projection eliminated unbound loop count");

/* 断言 2：buildCalendarProjection 严格拒绝非法日期、反向区间、超界区间 */
const dummyStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [],
    events: [],
    eventTombstones: [],
};

const invalidDates = ["2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "not-a-date"];
for (const badDate of invalidDates) {
    assert.throws(
        () => buildCalendarProjection(dummyStore, {startDate: badDate, endDateExclusive: "2026-03-05"}),
        TypeError,
        `startDate=${badDate} must throw TypeError`,
    );
    assert.throws(
        () => buildCalendarProjection(dummyStore, {startDate: "2026-02-01", endDateExclusive: badDate}),
        TypeError,
        `endDateExclusive=${badDate} must throw TypeError`,
    );
}

// 反向与相等半开区间
assert.throws(
    () => buildCalendarProjection(dummyStore, {startDate: "2026-03-05", endDateExclusive: "2026-03-05"}),
    TypeError,
    "equal start and end must throw",
);
assert.throws(
    () => buildCalendarProjection(dummyStore, {startDate: "2026-03-10", endDateExclusive: "2026-03-05"}),
    TypeError,
    "inverted range must throw",
);

// 超过 366 天的合法范围截断并标 truncated
const wideProjection = buildCalendarProjection(dummyStore, {startDate: "2026-01-01", endDateExclusive: "2027-05-01"});
assert.equal(wideProjection.truncated, true, "over 366 days marks truncated: true");

/* 断言 3：buildSchedulePreview 拒绝非法日期并不滚日 */
const invalidDraft = {type: "daily"};
const previewWithBadDate = buildSchedulePreview(invalidDraft, "2026-02-31");
assert.equal(previewWithBadDate.days.length, 0, "invalid date yields zero days");
assert.equal(previewWithBadDate.invalidReasonKey, "editor.schedulePreviewInvalid", "invalid date gives invalidReasonKey");

/* 断言 4：buildWeekLoadPreview 拒绝非法日期并不滚日 */
const loadWithBadDate = buildWeekLoadPreview([], "2026-02-30");
assert.equal(loadWithBadDate.dates.length, 0, "invalid date yields zero dates");
assert.equal(loadWithBadDate.items.length, 0, "invalid date yields zero items");

console.log("strict-date-contracts: all assertions passed");
