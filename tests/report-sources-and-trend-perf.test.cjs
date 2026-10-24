// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

console.log("Starting report-sources-and-trend-perf tests...");

const root = path.join(__dirname, "..");
const srcReport = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
const srcTrend = fs.readFileSync(path.join(root, "src", "features", "item-trend-compare.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcNav = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");

// 1. T-1919 REPORT_SOURCES 覆盖所有生态联动来源
for (const src of ["manual", "tomato", "api", "import", "sireader", "siplayer", "weread", "yeguif"]) {
    assert.ok(srcReport.includes(`"${src}"`), `report.ts REPORT_SOURCES must include '${src}'`);
}
assert.ok(srcIndex.includes('sourceOptions = this.reportSource ? {source: this.reportSource as CheckinEvent["source"]} : undefined;'), "index.ts must cast reportSource safely");
assert.ok(srcNav.includes('sourceOptions = host.reportSource ? {source: host.reportSource as import("../types").CheckinEvent["source"]} : undefined;'), "bind-page-navigation.ts must cast reportSource safely");

// 2. T-1920 item-trend-compare 预索引算法优化
assert.ok(srcTrend.includes("const eventsByDay = new Map<string, CheckinEvent[]>();"), "item-trend-compare.ts must pre-index events by day in a hash map");
assert.ok(!srcTrend.includes("store.events.filter((event) => event.itemId === itemId && event.localDate === key)"), "item-trend-compare.ts must not filter store.events inside the day loop");

console.log("report-sources-and-trend-perf: all assertions passed successfully!");
