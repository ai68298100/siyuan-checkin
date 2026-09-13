const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
const stylesSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(reviewSource, /buildLocalSummaryText/);
assert.match(reviewSource, /data-summary-source="local"/);
assert.match(reviewSource, /data-summary-source="agent"/);
assert.match(reviewSource, /ctx\.summaryText \? /);
assert.match(i18nSource, /"review\.localMeta"/);
assert.match(i18nSource, /"review\.localHeadlineHigh"/);
assert.match(i18nSource, /"review\.localHeadlineEmpty"/);
assert.match(stylesSource, /\.lc-checkin__summary-text\.is-local/);

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-local-summary-"));
for (const filename of ["i18n.ts", "features/local-summary.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}
const localSummary = require(path.join(outputRoot, "features", "local-summary.js"));
const summary = (overrides = {}) => ({range: "week", startDate: "2026-09-07", endDate: "2026-09-13", totalEvents: 8, completedItems: 2, scheduledItems: 3, items: [
    {itemId: "a", name: "阅读", eventCount: 5, totalsByUnit: [], scheduledDays: 3, completedDays: 3, completionRate: 100},
    {itemId: "b", name: "运动", eventCount: 2, totalsByUnit: [], scheduledDays: 3, completedDays: 1, completionRate: 33},
    {itemId: "c", name: "喝水", eventCount: 1, totalsByUnit: [], scheduledDays: 2, completedDays: 1, completionRate: 50},
], ...overrides});

const high = localSummary.buildLocalSummaryModel(summary({completedItems: 3, scheduledItems: 3}));
assert.equal(high.tone, "high");
assert.equal(high.rate, 100);
assert.equal(high.topItem.name, "阅读");
assert.equal(high.focusItem.name, "运动");
assert.match(localSummary.buildLocalSummaryText(summary({completedItems: 3, scheduledItems: 3})), /阅读/);

const steady = localSummary.buildLocalSummaryModel(summary({completedItems: 2, scheduledItems: 3}));
assert.equal(steady.tone, "steady");
assert.equal(steady.rate, 67);

const starting = localSummary.buildLocalSummaryModel(summary({completedItems: 1, scheduledItems: 3}));
assert.equal(starting.tone, "starting");
assert.equal(starting.focusItem.name, "运动");

const empty = localSummary.buildLocalSummaryModel({range: "day", startDate: "2026-09-14", endDate: "2026-09-14", totalEvents: 0, completedItems: 0, scheduledItems: 0, items: []});
assert.equal(empty.tone, "empty");
assert.equal(empty.topItem, undefined);
assert.equal(empty.focusItem, undefined);
assert.match(localSummary.buildLocalSummaryText({range: "day", startDate: "2026-09-14", endDate: "2026-09-14", totalEvents: 0, completedItems: 0, scheduledItems: 0, items: []}), /暂无打卡记录/);

const tie = localSummary.buildLocalSummaryModel(summary({items: [
    {itemId: "z", name: "乙", eventCount: 1, totalsByUnit: [], scheduledDays: 1, completedDays: 1, completionRate: 100},
    {itemId: "a", name: "甲", eventCount: 1, totalsByUnit: [], scheduledDays: 1, completedDays: 1, completionRate: 100},
]}));
assert.equal(tie.topItem.name, "甲");
assert.equal(tie.focusItem.name, "甲");
assert.equal(tie.topItem.itemId, tie.focusItem.itemId);

const rendered = localSummary.buildLocalSummaryText(summary({items: [{itemId: "x", name: "<script>", eventCount: 1, totalsByUnit: [], scheduledDays: 1, completedDays: 0, completionRate: 0}]}));
assert.match(rendered, /<script>/);
console.log("Local summary model checks passed: empty/high/steady/starting, ranking, tie-break and deterministic copy.");
fs.rmSync(outputRoot, {recursive: true, force: true});
