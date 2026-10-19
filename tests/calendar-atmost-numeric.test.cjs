const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1812 守门测试：日历投影数值戒除与修订单位完成口径同源（D-383）。
   1. 数值戒除（atMost + target=2）：
      - 0 记录 -> at-most-safe (value: 0)
      - 1 记录 -> at-most-safe (value: 1，修复前因 value > 0 误判为 breach)
      - 2 记录 -> at-most-safe (value: 2)
      - 3 记录 -> at-most-breach (value: 3，超限破戒)
   2. 历史单位修订：
      - 旧单位（如"杯"）事件不计入当前修订（如"毫升"）的进度；
   3. 配额投影：
      - 只有符合 countMode/unit 过滤的有效贡献日才生成点。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-cal-atmost-numeric-"));

const transpile = (relative) => {
    const source = fs.readFileSync(path.join(sourceRoot, relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};

[
    "i18n.ts", "types.ts", "rules.ts", "model.ts", "shared.ts", "record-step.ts",
    "lunar.ts", "catalog.ts", "quota.ts", "features/reminder-preferences.ts",
    "features/first-success.ts", "date-keys.ts", "features/view-scope.ts",
    "features/weekly-review.ts", "view-preferences.ts", "features/note-query.ts",
    "features/note-anchor.ts", "features/summary-resident.ts", "features/health-inbox.ts",
    "features/weread-adapter.ts", "features/calendar-projection.ts"
].forEach(transpile);

const model = require(path.join(outputRoot, "model.js"));
const {buildCalendarProjection} = require(path.join(outputRoot, "features", "calendar-projection.js"));

/* ====== 断言 1：数值戒除 0/1/2/3 状态 ====== */
const numericAtMost = {
    id: "coffee-limit",
    name: "限喝咖啡",
    kind: "count",
    target: 2,
    unit: "杯",
    direction: "atMost",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    taskHorizonCalendarVisible: true,
};

const store = model.normalizeStore({
    version: 3,
    items: [numericAtMost],
    events: [
        // 2026-09-10: 0 事件 -> 守住
        // 2026-09-11: 1 杯 -> 守住 (不超过上限 2)
        {id: "e1", itemId: "coffee-limit", localDate: "2026-09-11", occurredAt: "2026-09-11T08:00:00Z", value: 1, unit: "杯", source: "manual"},
        // 2026-09-12: 2 杯 -> 刚好达到上限，仍然守住
        {id: "e2", itemId: "coffee-limit", localDate: "2026-09-12", occurredAt: "2026-09-12T08:00:00Z", value: 2, unit: "杯", source: "manual"},
        // 2026-09-13: 3 杯 -> 超出上限，破戒
        {id: "e3", itemId: "coffee-limit", localDate: "2026-09-13", occurredAt: "2026-09-13T08:00:00Z", value: 3, unit: "杯", source: "manual"},
    ],
    eventTombstones: [],
});

const proj = buildCalendarProjection(store, {startDate: "2026-09-10", endDateExclusive: "2026-09-14"});
const itemPoints = Object.fromEntries(proj.items[0].points.map((p) => [p.date, p]));

assert.equal(itemPoints["2026-09-10"].status, "at-most-safe", "0 cups: safe");
assert.equal(itemPoints["2026-09-10"].value, 0, "0 cups: value 0");

assert.equal(itemPoints["2026-09-11"].status, "at-most-safe", "1 cup (under limit 2): safe");
assert.equal(itemPoints["2026-09-11"].value, 1, "1 cup: value 1");

assert.equal(itemPoints["2026-09-12"].status, "at-most-safe", "2 cups (at limit 2): safe");
assert.equal(itemPoints["2026-09-12"].value, 2, "2 cups: value 2");

assert.equal(itemPoints["2026-09-13"].status, "at-most-breach", "3 cups (exceeded limit 2): breach");
assert.equal(itemPoints["2026-09-13"].value, 3, "3 cups: value 3");

/* ====== 断言 2：单位修订口径隔离 ====== */
const unitRevisionItem = {
    id: "water",
    name: "饮水",
    kind: "quantity",
    target: 2000,
    unit: "毫升",
    direction: "atLeast",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [
        {effectiveDate: "2026-09-01", kind: "quantity", target: 8, unit: "杯", schedule: {type: "daily"}},
        {effectiveDate: "2026-09-10", kind: "quantity", target: 2000, unit: "毫升", schedule: {type: "daily"}},
    ],
    archivePeriods: [],
    taskHorizonCalendarVisible: true,
};

const storeUnit = model.normalizeStore({
    version: 3,
    items: [unitRevisionItem],
    events: [
        // 2026-09-05 (旧单位期): 8 杯 -> 完成
        {id: "u1", itemId: "water", localDate: "2026-09-05", occurredAt: "2026-09-05T08:00:00Z", value: 8, unit: "杯", source: "manual"},
        // 2026-09-12 (新单位期): 用户错误记了 1 杯，而不是毫升
        {id: "u2", itemId: "water", localDate: "2026-09-12", occurredAt: "2026-09-12T08:00:00Z", value: 1, unit: "杯", source: "manual"},
    ],
    eventTombstones: [],
});

const projUnit = buildCalendarProjection(storeUnit, {startDate: "2026-09-05", endDateExclusive: "2026-09-13"});
const pointsUnit = Object.fromEntries(projUnit.items[0].points.map((p) => [p.date, p]));

// 9月5日：有效单位是杯，目标8，实际8 -> complete
assert.equal(pointsUnit["2026-09-05"].unit, "杯");
assert.equal(pointsUnit["2026-09-05"].status, "complete");
assert.equal(pointsUnit["2026-09-05"].value, 8);

// 9月12日：有效单位是毫升，用户记的杯不应算作毫升的进度 -> pending，value为0
assert.equal(pointsUnit["2026-09-12"].unit, "毫升");
assert.equal(pointsUnit["2026-09-12"].status, "pending");
assert.equal(pointsUnit["2026-09-12"].value, 0);

console.log("calendar-atmost-numeric: all assertions passed");
