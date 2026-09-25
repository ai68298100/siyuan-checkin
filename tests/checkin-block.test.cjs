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
assert.match(glueSource, /getAnchorIndex/, "glue must read the host anchor index synchronously (T-1292)");
assert.match(glueSource, /resolveAnchorDocs/, "glue must delegate missing anchor resolution to the host");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-block-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "features/pace-projection.ts", "features/checkin-block.ts"]) {
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

/* T-1412：today 视图——itemIds 必填（fail-closed 多项目寻址）。 */
const todayNoItems = block.parseCheckinBlockConfig('{"view":"today"}');
assert.equal(todayNoItems.ok, false, "today view requires explicit itemIds");
assert.equal(todayNoItems.ok ? "" : todayNoItems.error, t("block.errorItems"));
const todayConfig = block.parseCheckinBlockConfig('{"view":"today","itemIds":["a","b"]}');
assert.equal(todayConfig.ok, true);

/* 作用域解析。 */
const all = block.resolveBlockItems(store, {view: "summary"});
assert.equal(all.length, 3, "archived items are excluded");
const byGroup = block.resolveBlockItems(store, {view: "summary", group: "健康"});
assert.deepEqual(byGroup.map((entry) => entry.id), ["b", "c"]);
const byIds = block.resolveBlockItems(store, {view: "summary", itemIds: ["a"]});
assert.deepEqual(byIds.map((entry) => entry.id), ["a"]);

/* 月视图：跳过中性格、today 环、色阶、跳转属性。 */
const monthHtml = block.buildMonthViewHtml(store, {view: "month", thresholds: [0.25, 0.5, 0.75, 1]}, asOf);
assert.match(monthHtml, /data-jump-date="2026-09-15"[^>]*title="[^"]*3\/3/, "aggregate completion fraction shown in title");
assert.match(monthHtml, /is-level-4[^>]*data-jump-date="2026-09-15"/, "full-completion day hits top level");
assert.match(monthHtml, /is-today[^>]*data-jump-date="2026-09-19"/, "today ring present");
assert.ok(monthHtml.includes(t("block.monthMeta", {year: 2026, month: 9, done: 5})));
const emptyMonth = block.buildMonthViewHtml(store, {view: "month", group: "不存在"}, asOf);
assert.ok(emptyMonth.includes(t("block.empty")));
/* itemIds 作用域 + 跳过中性格：仅项目 a 时，16 日（跳过）是中性 skip 格。 */
const monthA = block.buildMonthViewHtml(store, {view: "month", itemIds: ["a"]}, asOf);
assert.match(monthA, /is-skip[^>]*data-jump-date="2026-09-16"/, "skip-only day renders neutral");
assert.match(monthA, /is-level-4[^>]*data-jump-date="2026-09-15"/, "done day renders top level for single scope");

/* T-1412：today 视图渲染——完成项祝贺态、未完成项按钮、streak 单一实现、最近漏卡日。 */
const todayHtml = block.buildTodayViewHtml(store, {view: "today", itemIds: ["a", "b"]}, asOf);
assert.match(todayHtml, /data-block-record="b"/, "pending item renders a record button");
assert.doesNotMatch(todayHtml, /data-block-record="a"/, "completed item shows congrats instead of a button");
assert.ok(todayHtml.includes(t("block.todayCongrats")), "congrats state uses the localized text");
const todayRows = block.buildTodayRows(store, [store.items[0], store.items[1]], asOf);
assert.equal(todayRows[0].complete, true, "item a is complete on 09-19");
assert.equal(todayRows[0].streak, model.computeEventStreaks(store, asOf).get("a"), "streak rides the single implementation");
assert.equal(todayRows[0].lastMissedDate, undefined, "multi-row view omits last-missed");
const singleRow = block.buildTodayRows(store, [store.items[0]], asOf)[0];
assert.equal(singleRow.lastMissedDate, "2026-09-18", "yesterday's missed scheduled day is the last miss even though today is done");
const pendingSingle = block.buildTodayRows(store, [store.items[1]], asOf)[0];
assert.equal(pendingSingle.lastMissedDate, "2026-09-18", "scan starts from yesterday: today's incompleteness is the status cell's job");
/* 接线：胶水节流 + 宿主回调 + i18n。 */
assert.match(glueSource, /data-block-record/, "glue routes today record buttons");
assert.match(glueSource, /data-record-pending/, "record button throttles double clicks");
assert.match(glueSource, /onBlockTodayRecord/, "record buttons delegate to the host write path");
assert.match(read("index.ts"), /onBlockTodayRecord: \(itemId: string, amount\?: number\) => void this\.recordBlockToday\(itemId, amount\)/, "host must wire the block record callback (T-1462: optional chip amount)");
assert.match(read("index.ts"), /private async recordBlockToday/, "host implements the block record path via recordEvent");
for (const key of ["block.todayDone", "block.todayStreak", "block.todayLastMissed", "block.todayCongrats", "block.todayRecord"]) {
    assert.equal(read("i18n.ts").split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

/* 热力视图：today 标记；跳过日混有真实完成时不标中性。 */
const heatmapHtml = block.buildHeatmapViewHtml(store, {view: "heatmap", year: 2026}, asOf);
assert.match(heatmapHtml, /is-today[^>]*data-jump-date="2026-09-19"/, "heatmap rings today");
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
block.buildGroupsViewHtml(perfStore, {view: "groups"}, asOf);
const perfMs = Number(process.hrtime.bigint() - perfStart) / 1e6;
/* T-1355 渲染块性能门禁（1k/10k/100k 三档；健康机基线 10k≈30ms，门槛只捕灾难退化）。 */
const tierFixture = (eventCount) => {
    const tierStore = model.createDefaultStore();
    tierStore.items = Array.from({length: 40}, (_, index) => dailyItem(`t${index}`));
    tierStore.events = Array.from({length: eventCount}, (_, index) => {
        const month = (index % 12) + 1;
        const day = (index % 28) + 1;
        return {id: `tier-${index}`, itemId: `t${index % 40}`, occurredAt: `${perfKey(month, day)}T01:00:00.000Z`, localDate: perfKey(month, day), value: 1, unit: "次", source: "manual"};
    });
    return tierStore;
};
const tierResults = [1000, 10000, 100000].map((count) => {
    const tierStore = tierFixture(count);
    const start = process.hrtime.bigint();
    block.buildMonthViewHtml(tierStore, {view: "month"}, asOf);
    block.buildSummaryViewHtml(tierStore, {view: "summary"}, asOf);
    block.buildHeatmapViewHtml(tierStore, {view: "heatmap", year: 2026}, asOf);
    block.buildGroupsViewHtml(tierStore, {view: "groups"}, asOf);
    return {count, ms: Number(process.hrtime.bigint() - start) / 1e6};
});
assert.ok(tierResults[0].ms < 500, `1k tier must stay under 500ms (took ${Math.round(tierResults[0].ms)}ms)`);
assert.ok(tierResults[1].ms < 2000, `10k tier must stay under 2000ms (took ${Math.round(tierResults[1].ms)}ms)`);
assert.ok(tierResults[2].ms < 8000, `100k tier must stay under 8000ms (took ${Math.round(tierResults[2].ms)}ms)`);
/* 健康机基线 73ms；整机慢速时按 T-1172 哲学保留 25 倍级灾难退化捕获。 */
assert.ok(perfMs < 2000, `three views over ~10k events must render under 2000ms (took ${Math.round(perfMs)}ms)`);

/* ===== doc/notebook 维度（T-1292）===== */
const goodDocScope = block.parseCheckinBlockConfig('{"view":"summary","docId":"20260920120000-abcdef1234"}');
assert.equal(goodDocScope.ok, true);
if (goodDocScope.ok) assert.equal(goodDocScope.config.docId, '20260920120000-abcdef1234');
const goodNotebook = block.parseCheckinBlockConfig('{"view":"summary","notebook":"20260815110000-notebookid"}');
assert.equal(goodNotebook.ok, true);
const badDocId = block.parseCheckinBlockConfig('{"view":"summary","docId":"short"}');
assert.equal(badDocId.ok, false, 'docId shorter than kernel ids must be rejected');

/* 锚点索引解析:fail-closed——无索引返回空;命中/未命中按 doc 与 notebook 过滤。 */
const anchorIndex = new Map([
  ["block-1", {doc: "doc-A", notebook: "nb-1"}],
  ["block-2", {doc: "doc-B", notebook: "nb-2"}],
]);
const anchorItems = [
  {...dailyItem("anchA"), noteAnchor: {blockId: "block-1"}},
  {...dailyItem("anchB"), noteAnchor: {blockId: "block-2"}},
  dailyItem("plain"),
];
const docStore = model.createDefaultStore();
docStore.items = anchorItems;
assert.deepEqual(block.resolveBlockItems(docStore, {view: "summary", docId: "doc-A"}, anchorIndex).map((entry) => entry.id), ["anchA"]);
assert.deepEqual(block.resolveBlockItems(docStore, {view: "summary", notebook: "nb-2"}, anchorIndex).map((entry) => entry.id), ["anchB"]);
assert.equal(block.resolveBlockItems(docStore, {view: "summary", docId: "doc-C"}, anchorIndex).length, 0, "unknown doc must fail closed");
assert.equal(block.resolveBlockItems(docStore, {view: "summary", docId: "doc-A"}, undefined).length, 0, "missing index must fail closed");
assert.equal(block.resolveBlockItems(docStore, {view: "summary"}, anchorIndex).length, 3, "no scope keeps all-active behavior");

/* i18n 双语。 */
setPluginLanguage("en-US");
assert.equal(t("block.errorConfig"), "Render block config must be a JSON object");
setPluginLanguage("zh-CN");

/* ---------- T-1351 渲染块二期：groups 视图 / minRate 表达式 / 锚点行跳转数据 ---------- */

const groupsView = block.parseCheckinBlockConfig('{"view":"groups","groups":["健康","运动"],"minRate":50}');
assert.equal(groupsView.ok, true);
if (groupsView.ok) assert.deepEqual(groupsView.config.groups, ["健康", "运动"]);

const overGroups = block.parseCheckinBlockConfig(`{"view":"summary","groups":${JSON.stringify(Array.from({length: 17}, (_, index) => `g${index}`))}}`);
assert.equal(overGroups.ok, false, "more than 16 groups must be rejected");
const dupGroups = block.parseCheckinBlockConfig('{"view":"summary","groups":["健康","健康"]}');
assert.equal(dupGroups.ok && dupGroups.config.groups?.length, 1, "duplicate groups dedupe");
const badMinRate = block.parseCheckinBlockConfig('{"view":"summary","minRate":180}');
assert.equal(badMinRate.ok && "minRate" in badMinRate.config, false, "out-of-range minRate is ignored");

const groupsStore = model.createDefaultStore();
groupsStore.items = [
    dailyItem("g1", "健康"), dailyItem("g2", "健康"), dailyItem("g3", "运动"), dailyItem("g4"),
];
const noScopeGroups = block.buildGroupsViewHtml(groupsStore, {view: "groups"}, asOf);
assert.match(noScopeGroups, /健康/);
assert.match(noScopeGroups, /未分组|Ungrouped/, "ungrouped items must aggregate under the explicit ungrouped label");
const g2Events = [{id: "g2-event", itemId: "g2", occurredAt: `${key(19)}T01:00:00.000Z`, localDate: key(19), value: 1, unit: "次", source: "manual"}];
const groupsStoreWithEvents = model.appendEvents(groupsStore, g2Events);
const multiGroup = block.buildGroupsViewHtml(groupsStoreWithEvents, {view: "groups"}, asOf);
assert.ok(multiGroup.indexOf("健康") < multiGroup.indexOf("运动"), "groups with higher completion rank first");

/* minRate 表达式：summary 与 groups 都过滤；全部被滤掉时给明确空态。 */
const filteredSummary = block.buildSummaryViewHtml(groupsStoreWithEvents, {view: "summary", minRate: 100}, asOf);
assert.match(filteredSummary, /g2/, "fully completed item survives minRate=100");
assert.doesNotMatch(filteredSummary, /g1/, "pending item is filtered out by minRate=100");
const emptyMinRate = block.buildGroupsViewHtml(groupsStoreWithEvents, {view: "groups", minRate: 100}, asOf);
assert.match(emptyMinRate, /没有完成率|No entries/, "fully filtered groups must show a readable empty state");
const unfiltered = block.buildSummaryViewHtml(groupsStore, {view: "summary"}, asOf);
assert.match(unfiltered, /g1/, "without minRate nothing is filtered");

/* 锚点行：索引命中的项目携带 data-jump-anchor-block。 */
const anchoredHtml = block.buildSummaryViewHtml(docStore, {view: "summary"}, asOf, anchorIndex);
assert.match(anchoredHtml, /data-jump-anchor-block="block-1"/, "resolved anchors must expose the anchor jump hook");
const plainHtml = block.buildSummaryViewHtml(docStore, {view: "summary"}, asOf);
assert.doesNotMatch(plainHtml, /data-jump-anchor-block/, "unresolved anchors must not fake the anchor hook");

/* 结构守门：渲染层绑定新跳转回调并分发 groups 视图；宿主接线齐全。 */
assert.match(glueSource, /config\.view === "groups"/, "glue must dispatch the groups view");
assert.match(glueSource, /onJumpItem\?\./, "glue must delegate item jumps to the host");
assert.match(glueSource, /onJumpItemAnchor\?\./, "glue must delegate anchor jumps to the host");
assert.match(glueSource, /data-jump-anchor-block/, "glue must handle the anchor jump hook first");
assert.match(read("index.ts"), /onJumpItem: \(itemId: string\) => this\.jumpToItemInsights\(itemId\)/, "host must wire the item jump");
assert.match(read("index.ts"), /onJumpItemAnchor: \(blockId: string\) => void this\.jumpToItemAnchorDoc\(blockId\)/, "host must wire the anchor doc jump");
assert.match(read("index.ts"), /openTab\(\{app: this\.app, doc: \{id: doc\}\}\)/, "anchor jump opens the freshly re-resolved root doc (v18.1.x: moves are followed)");
assert.match(read("index.ts"), /const fresh = await resolveAnchorBlock\(/, "anchor jump must re-resolve the block before opening");

/* —— T-1453 组合卡片：白名单编排 1~3 个子视图，禁嵌套，逐段校验 —— */
{
    /* 合法：summary + month 两段编排，子配置各自携带作用域。 */
    const combo = block.parseCheckinBlockConfig(JSON.stringify({
        view: "combo",
        parts: [{view: "summary", group: "健康", minRate: 50}, {view: "month"}],
    }));
    assert.equal(combo.ok, true, "合法组合可解析");
    if (combo.ok) {
        assert.equal(combo.config.view, "combo");
        assert.equal(combo.config.parts?.length, 2);
        assert.equal(combo.config.parts?.[0]?.view, "summary");
        assert.equal(combo.config.parts?.[0]?.minRate, 50);
    }
    /* 渲染：按配置顺序输出各段子视图，段外包 combo 容器。 */
    if (combo.ok) {
        const html = block.buildComboViewHtml(store, combo.config, asOf);
        assert.ok(html.includes("lc-checkin__renderblock-combo"), "combo 容器在位");
        assert.ok(html.includes("lc-checkin__renderblock-part"), "分段包裹在位");
        assert.ok(html.indexOf("data-part-view=\"summary\"") < html.indexOf("data-part-view=\"month\""), "按配置顺序渲染");
    }
    /* 拒绝：嵌套 combo / 超量 / parts 非数组 / 子段坏视图（错误回子段文案）。 */
    const nested = block.parseCheckinBlockConfig(JSON.stringify({view: "combo", parts: [{view: "combo", parts: []}]}));
    assert.equal(nested.ok ? "" : nested.error, t("block.errorParts"), "嵌套 combo 拒绝");
    const over = block.parseCheckinBlockConfig(JSON.stringify({view: "combo", parts: [{view: "month"}, {view: "summary"}, {view: "groups"}, {view: "heatmap"}]}));
    assert.equal(over.ok ? "" : over.error, t("block.errorParts"), "超过 3 段拒绝");
    const notArray = block.parseCheckinBlockConfig('{"view":"combo","parts":"month"}');
    assert.equal(notArray.ok ? "" : notArray.error, t("block.errorParts"), "parts 非数组拒绝");
    const badPart = block.parseCheckinBlockConfig(JSON.stringify({view: "combo", parts: [{view: "summary"}, {view: "today"}]}));
    assert.equal(badPart.ok ? "" : badPart.error, t("block.errorItems"), "子段沿用同一字段校验（today 缺 itemIds）");
    /* 空数据段正常降级为空态而不影响其他段。 */
    const withToday = block.parseCheckinBlockConfig(JSON.stringify({view: "combo", parts: [{view: "today", itemIds: ["a"]}, {view: "summary", group: "健康"}]}));
    if (withToday.ok) {
        const html = block.buildComboViewHtml(store, withToday.config, asOf);
        assert.ok(html.includes("data-part-view=\"today\"") && html.includes("data-part-view=\"summary\""), "today+summary 两段并存");
    }
    /* 纯度：同输入两次渲染同输出。 */
    if (combo.ok) assert.equal(block.buildComboViewHtml(store, combo.config, asOf), block.buildComboViewHtml(store, combo.config, asOf));
}

console.log(`Checkin block checks passed: config parsing, scopes, month/heatmap/summary/groups views, combo cards, minRate, anchor jumps, neutrality, security and perf tiers 1k=${Math.round(tierResults[0].ms)}ms / 10k=${Math.round(tierResults[1].ms)}ms / 100k=${Math.round(tierResults[2].ms)}ms (+base ${Math.round(perfMs)}ms).`);
