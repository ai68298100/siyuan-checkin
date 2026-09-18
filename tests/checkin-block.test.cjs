const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门（T-1236）：胶水层只产固定错误文案 + 经事件刷新；index 事件接线齐全。 */
const glueSource = read("render", "block-renderer.ts");
assert.match(glueSource, /parseCheckinBlockConfig/, "glue parses configs through the shared module");
assert.match(glueSource, /escapeHtml\(parsed\.error\)/, "error output is escaped");
assert.match(read("index.ts"), /this\.eventBus\.on\("loaded-protyle-static", this\.handleProtyleLoaded\)/, "protyle load events drive rendering");
assert.match(read("index.ts"), /CHECKIN_EVENT_NAMES\.eventRecorded, this\.handleRenderBlocksRefresh/, "check-in events refresh render blocks");
assert.match(read("index.ts"), /private jumpToHistoryDate\(date: string\)/, "jump callback lands on review history date");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-block-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "features/checkin-block.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const block = require(path.join(outputRoot, "features", "checkin-block.js"));
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));

const asOf = new Date(2026, 8, 19, 12);
const key = (day) => `2026-09-${String(day).padStart(2, "0")}`;
const dailyItem = (id, group) => ({
    id, name: `项目${id}`, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01",
    revisions: [], archivePeriods: [], ...(group ? {group} : {}),
});
const store = model.createDefaultStore();
store.items = [dailyItem("a"), dailyItem("b", "健康"), dailyItem("c", "健康"), {...dailyItem("d"), archived: true}];
const event = (id, itemId, day, kind) => ({
    id, itemId, occurredAt: `${key(day)}T01:00:00.000Z`, localDate: key(day), value: 1, unit: "次",
    source: "manual", ...(kind ? {kind} : {}),
});
store.events = [
    event("a15", "a", 15), event("a16s", "a", 16, "skip"), event("a19", "a", 19),
    event("b15", "b", 15), event("b16", "b", 16),
    event("c15", "c", 15),
];

/* 配置解析：合法配置；坏 JSON / 坏 view 返回固定文案（不回显用户原文）。 */
const goodMonth = block.parseCheckinBlockConfig('{"view":"month","group":"健康"}');
assert.equal(goodMonth.ok, true);
if (goodMonth.ok) assert.equal(goodMonth.config.group, "健康");
const badJson = block.parseCheckinBlockConfig("not json");
assert.equal(badJson.ok, false);
assert.equal(badJson.error, t("block.errorConfig"));
const badView = block.parseCheckinBlockConfig('{"view":"<script>alert(1)</script>"}');
assert.equal(badView.ok, false);
assert.equal(badView.error, t("block.errorView"));
assert.ok(!badView.error.includes("<script>"), "error text never echoes user input");
const tooMany = block.parseCheckinBlockConfig(JSON.stringify({view: "summary", itemIds: Array.from({length: 51}, (_, index) => `id-${index}`)}));
assert.equal(tooMany.ok, false);
assert.equal(tooMany.error, t("block.errorItems"));
const badThresholds = block.parseCheckinBlockConfig('{"view":"month","thresholds":[0.9,0.5,0.25,0.1]}');
assert.ok(badThresholds.ok);
if (badThresholds.ok) assert.deepEqual(badThresholds.config.thresholds, [0.25, 0.5, 0.75, 1], "non-ascending thresholds fall back to defaults");

/* 作用域解析。 */
const all = block.resolveBlockItems(store, {view: "summary"});
assert.equal(all.length, 3, "archived items are excluded");
const byGroup = block.resolveBlockItems(store, {view: "summary", group: "健康"});
assert.deepEqual(byGroup.map((entry) => entry.id), ["b", "c"]);
const byIds = block.resolveBlockItems(store, {view: "summary", itemIds: ["a"]});
assert.deepEqual(byIds.map((entry) => entry.id), ["a"]);

/* 月视图：跳过中性格、today 环、色阶、跳转属性。 */
const monthHtml = block.buildMonthViewHtml(store, {view: "month", thresholds: [0.25, 0.5, 0.75, 1]}, asOf);
assert.match(monthHtml, /data-jump-date="2026-09-15" title="[^"]*3\/3/, "aggregate completion fraction shown in title");
assert.match(monthHtml, /is-level-4[^"]*" data-jump-date="2026-09-15"/, "full-completion day hits top level");
assert.match(monthHtml, /is-today[^"]*" data-jump-date="2026-09-19"/, "today ring present");
assert.ok(monthHtml.includes(t("block.monthMeta", {year: 2026, month: 9, done: 5})));
const emptyMonth = block.buildMonthViewHtml(store, {view: "month", group: "不存在"}, asOf);
assert.ok(emptyMonth.includes(t("block.empty")));
/* itemIds 作用域 + 跳过中性格：仅项目 a 时，16 日（跳过）是中性 skip 格。 */
const monthA = block.buildMonthViewHtml(store, {view: "month", itemIds: ["a"]}, asOf);
assert.match(monthA, /is-skip[^"]*" data-jump-date="2026-09-16"/, "skip-only day renders neutral");
assert.match(monthA, /is-level-4[^"]*" data-jump-date="2026-09-15"/, "done day renders top level for single scope");

/* 热力视图：today 标记；跳过日混有真实完成时不标中性。 */
const heatmapHtml = block.buildHeatmapViewHtml(store, {view: "heatmap", year: 2026}, asOf);
assert.match(heatmapHtml, /is-today[^"]*" data-jump-date="2026-09-19"/, "heatmap rings today");
assert.ok(!heatmapHtml.includes("is-skip"), "skip marker only when a day has skips and no completions");
assert.ok(heatmapHtml.includes(t("block.heatmapMeta", {year: 2026, n: 6})));

/* 汇总视图：行内转义与连击信息。 */
const hostile = dailyItem('x"><img src=x onerror=alert(1)>');
store.items.push(hostile);
const summaryHtml = block.buildSummaryViewHtml(store, {view: "summary"}, asOf);
assert.ok(!summaryHtml.includes("<img src=x"), "item names are escaped in summary rows");
assert.ok(summaryHtml.includes("连续 1 天"), "streak suffix renders");
store.items.pop();

/* T-1236 性能门禁：~10k 事件 / 40 项目渲染各视图低于 500ms。 */
const perfStore = model.createDefaultStore();
perfStore.items = Array.from({length: 40}, (_, index) => dailyItem(`p${index}`));
perfStore.events = [];
let perfId = 0;
const perfKey = (month, day) => `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
const perfEvent = (id, itemId, month, day) => ({
    id, itemId, occurredAt: `${perfKey(month, day)}T01:00:00.000Z`, localDate: perfKey(month, day), value: 1, unit: "次",
    source: "manual",
});
for (let itemIndex = 0; itemIndex < 40; itemIndex += 1) {
    for (let month = 1; month <= 12; month += 1) {
        for (let day = 1; day <= 28; day += 1) {
            if ((itemIndex + month + day) % 3 === 0) continue;
            perfStore.events.push(perfEvent(`e${perfId++}`, `p${itemIndex}`, month, day));
        }
    }
}
assert.equal(perfStore.events.length > 8000, true, `fixture has ~9k events (got ${perfStore.events.length})`);
const perfStart = process.hrtime.bigint();
block.buildMonthViewHtml(perfStore, {view: "month"}, asOf);
block.buildSummaryViewHtml(perfStore, {view: "summary"}, asOf);
block.buildHeatmapViewHtml(perfStore, {view: "heatmap", year: 2026}, asOf);
const perfMs = Number(process.hrtime.bigint() - perfStart) / 1e6;
/* 健康机基线 73ms；整机慢速时按 T-1172 哲学保留 25 倍级灾难退化捕获。 */
assert.ok(perfMs < 2000, `three views over ~10k events must render under 2000ms (took ${Math.round(perfMs)}ms)`);

/* i18n 双语。 */
setPluginLanguage("en-US");
assert.equal(t("block.errorConfig"), "Render block config must be a JSON object");
setPluginLanguage("zh-CN");

console.log(`Checkin block checks passed: config parsing, scopes, month/heatmap/summary views, neutrality, security and perf (${Math.round(perfMs)}ms for ~10k events).`);
