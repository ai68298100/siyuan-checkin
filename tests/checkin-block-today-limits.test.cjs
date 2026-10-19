const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1801 & T-1802 守门测试：渲染块 today 视图显式截断与时段时区契约（D-385）。
   T-1801: >5 个活跃项目时显式输出截断提示（block.todayTruncated），
           提供可达的 [data-jump-today] 直达打卡工作台，click/keydown (Enter/Space) 均触发 onJumpToday；
   T-1802: getEventLocalHour 优先识别显式时区偏移字面时刻或按 timeZone 参数换算，
           buildTodaySlotCounts 早/午/晚统计与本地日期事实严格对齐，消除跨时区漂移。 */

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");

/* 断言 1：源码静态钉 */
const blockSource = fs.readFileSync(path.join(sourceRoot, "features", "checkin-block.ts"), "utf8");
const rendererSource = fs.readFileSync(path.join(sourceRoot, "render", "block-renderer.ts"), "utf8");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");

assert.match(blockSource, /block\.todayTruncated/, "T-1801: checkin-block uses block.todayTruncated key");
assert.match(blockSource, /data-jump-today/, "T-1801: checkin-block marks data-jump-today for direct navigation");
assert.match(rendererSource, /deps\.onJumpToday\?\.()/, "T-1801: block-renderer delegates onJumpToday on click");
assert.match(rendererSource, /if \(todayTarget\) \{[\s\S]*?deps\.onJumpToday\?\.()/, "T-1801: block-renderer delegates onJumpToday on Enter/Space keydown");
assert.match(indexSource, /onJumpToday: \(\) => this\.showToday\(this\.primaryRoot\(\)\)/, "T-1801: index.ts wires onJumpToday to primary root");

assert.match(blockSource, /export function getEventLocalHour/, "T-1802: exports getEventLocalHour helper");
assert.match(blockSource, /getEventLocalHour\(event, options\?\.timeZone\)/, "T-1802: buildTodaySlotCounts uses getEventLocalHour");

for (const key of ["block.todayTruncated", "block.todayViewAll"]) {
    assert.match(i18nSource, new RegExp(`"${key}":`), `i18n zh contains ${key}`);
}

/* 断言 2：转译运行测试 */
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-block-limits-"));
for (const filename of [
    "types.ts",
    "i18n.ts",
    "shared.ts",
    "record-step.ts",
    "quota.ts",
    "rules.ts",
    "date-keys.ts",
    "model.ts",
    "model-helpers.ts",
    "features/record-notes.ts",
    "ui/labels.ts",
    "features/pace-projection.ts",
    "features/checkin-block.ts",
]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8").replace(/from "siyuan"/g, 'from "./siyuan-stub.js"'), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
fs.writeFileSync(path.join(outputRoot, "features", "siyuan-stub.js"), "module.exports = {};\n");
fs.writeFileSync(path.join(outputRoot, "siyuan-stub.js"), "module.exports = {};\n");

const {buildTodayViewHtml, buildTodaySlotCounts, getEventLocalHour} = require(path.join(outputRoot, "features", "checkin-block.js"));
const model = require(path.join(outputRoot, "model.js"));

const makeItem = (id) => ({
    id,
    name: `习惯-${id}`,
    icon: "📌",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atLeast",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [{
        effectiveDate: "2026-09-01",
        kind: "binary",
        target: 1,
        unit: "次",
        direction: "atLeast",
        schedule: {type: "daily"},
    }],
    archivePeriods: [],
});

const asOf = new Date(2026, 8, 20, 12);

// 1. 5 个以内项目：不截断
const smallStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [makeItem("1"), makeItem("2"), makeItem("3")],
    events: [],
    eventTombstones: [],
};
const smallHtml = buildTodayViewHtml(smallStore, {view: "today"}, asOf);
assert.ok(!smallHtml.includes("lc-checkin__renderblock-today-truncated"), "3 items: no truncation notice");

// 2. 7 个项目：仅展示 5 行，且包含截断提示与直达按钮
const largeStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [makeItem("1"), makeItem("2"), makeItem("3"), makeItem("4"), makeItem("5"), makeItem("6"), makeItem("7")],
    events: [],
    eventTombstones: [],
};
const largeHtml = buildTodayViewHtml(largeStore, {view: "today"}, asOf);
assert.ok(largeHtml.includes("lc-checkin__renderblock-today-truncated"), "7 items: renders truncation notice");
assert.ok(largeHtml.includes("data-jump-today"), "7 items: renders data-jump-today button");
const rowMatches = largeHtml.match(/lc-checkin__renderblock-today-row/g) || [];
assert.equal(rowMatches.length, 5, "renders exactly top 5 item rows");

// 3. T-1802 getEventLocalHour 严格提取字面时刻
assert.equal(getEventLocalHour({occurredAt: "2026-09-20T08:15:00+08:00"}), 8, "extracts morning hour 8 from +08:00");
assert.equal(getEventLocalHour({occurredAt: "2026-09-20T14:30:00+08:00"}), 14, "extracts afternoon hour 14 from +08:00");
assert.equal(getEventLocalHour({occurredAt: "2026-09-20T21:45:00+08:00"}), 21, "extracts evening hour 21 from +08:00");

// 4. T-1802 buildTodaySlotCounts
const slotStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [makeItem("slot-test")],
    events: [
        {id: "s1", itemId: "slot-test", value: 1, unit: "次", localDate: "2026-09-20", occurredAt: "2026-09-20T09:00:00+08:00", source: "manual"},
        {id: "s2", itemId: "slot-test", value: 1, unit: "次", localDate: "2026-09-20", occurredAt: "2026-09-20T15:00:00+08:00", source: "manual"},
        {id: "s3", itemId: "slot-test", value: 1, unit: "次", localDate: "2026-09-20", occurredAt: "2026-09-20T20:00:00+08:00", source: "manual"},
    ],
    eventTombstones: [],
};
const slots = buildTodaySlotCounts(slotStore, "slot-test", asOf);
assert.deepEqual(slots, {morning: 1, afternoon: 1, evening: 1}, "slot counts grouped into morning 1, afternoon 1, evening 1");

console.log("checkin-block-today-limits: all assertions passed");
