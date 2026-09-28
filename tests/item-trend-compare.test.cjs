/* T-1517 选定项目横向趋势比较守门：
   逐日序列与内核同口径（当日生效修订单位聚合、完成判定复用 model 函数）、
   单位分组（组内才比原始数值，不同单位分图分表）、配额项目单列、
   稀疏数据明确提示、选择 2~4 键盘可用、表格与图一致、只读与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-item-trend-"));
const load = (relative) => {
    const target = path.join(dir, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
["date-keys.ts", "quota.ts", "record-step.ts", "rules.ts", "model.ts", "features/item-trend-compare.ts"].forEach(load);
const compare = require(path.join(dir, "features", "item-trend-compare.js"));

const baseItem = (overrides = {}) => ({id: "a", name: "拉伸", icon: "✓", kind: "number", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", archived: false, revisions: [], ...overrides});
const store = (items, events) => ({version: 3, items, events, eventTombstones: []});
const event = (itemId, localDate, value, unit) => ({id: `${itemId}-${localDate}-${value}`, itemId, occurredAt: `${localDate}T01:00:00.000Z`, localDate, value, unit, source: "manual"});

/* —— 1. 逐日序列：分钟/次数/数量混选各保留自身单位；稀疏与空数据提示。 —— */
{
    const items = [
        baseItem({id: "stretch", name: "拉伸", unit: "分钟"}),
        baseItem({id: "water", name: "喝水", kind: "count", unit: "次", target: 8, schedule: {type: "daily"}}),
        baseItem({id: "empty", name: "冥想", unit: "分钟"}),
    ];
    const events = [
        event("stretch", "2026-09-21", 30, "分钟"),
        event("stretch", "2026-09-22", 15, "分钟"),
        event("water", "2026-09-21", 8, "次"),
    ];
    const series = compare.buildItemTrendSeries(store(items, events), "stretch", "2026-09-21", 7);
    assert.equal(series.unit, "分钟");
    assert.equal(series.values[0], 30);
    assert.equal(series.values[1], 15);
    assert.equal(series.recordDays, 2);
    assert.equal(series.scheduledDays, 7);
    assert.equal(series.completionRate, 14, "1 of 7 qualifying days at target 30 (kernel parity)");
    const empty = compare.buildItemTrendSeries(store(items, events), "empty", "2026-09-21", 7);
    assert.equal(empty.sparse, true, "no records → sparse hint");
}

/* —— 2. 单位分组：不同单位分图分表；配额项目单列不比较。 —— */
{
    const items = [
        baseItem({id: "min", name: "拉伸", unit: "分钟"}),
        baseItem({id: "cnt", name: "喝水", kind: "count", unit: "次", schedule: {type: "daily"}}),
        baseItem({id: "q", name: "跑步", schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}}),
    ];
    const series = ["min", "cnt", "q"].map((id) => compare.buildItemTrendSeries(store(items, []), id, "2026-09-21", 7));
    const comparison = compare.groupItemTrendsByUnit(series);
    assert.equal(comparison.groups.length, 2, "分钟 and 次 are grouped separately");
    assert.equal(comparison.quotaSeries.length, 1, "quota items are listed separately");
    assert.deepEqual(comparison.quotaSeries[0].quota, {period: "week", amount: 3, countMode: "dates"});
}

/* —— 3. 归档/缺失项目返回 undefined；确定性。 —— */
{
    const items = [baseItem({id: "archived", archived: true})];
    assert.equal(compare.buildItemTrendSeries(store(items, []), "archived", "2026-09-21", 7), undefined);
    assert.equal(compare.buildItemTrendSeries(store([], []), "ghost", "2026-09-21", 7), undefined);
    const one = compare.buildItemTrendSeries(store([baseItem()], [event("a", "2026-09-21", 10, "分钟")]), "a", "2026-09-21", 7);
    assert.deepEqual(one, compare.buildItemTrendSeries(store([baseItem()], [event("a", "2026-09-21", 10, "分钟")]), "a", "2026-09-21", 7));
}

/* —— 4. 接线：2~4 选择、键盘原生复选框、表格与图同源、单位分组标题。 —— */
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /fold\("itemCompare", t\("review\.itemCompareTitle"\), renderItemCompare\)/, "analysis hosts the item comparison fold");
assert.match(reviewSource, /data-item-compare-toggle=/, "picker uses native checkboxes (keyboard available)");
assert.match(reviewSource, /review\.itemCompareUnitGroup/, "groups are labelled by unit");
assert.match(reviewSource, /lc-checkin__item-compare-table/, "a table mirrors the charts");
assert.match(reviewSource, /review\.itemCompareSparse/, "sparse series show an explicit hint");
assert.match(reviewSource, /review\.itemCompareQuotaNote/, "quota items show a separate note");
assert.match(reviewSource, /groupItemTrendsByUnit\(seriesList\)/, "series are grouped by unit before rendering");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindSource, /"\[data-item-compare-toggle\]"/, "selection toggles are bound");
assert.match(bindSource, /selection\.size >= 4/, "selection is capped at four items");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private itemCompareSelection = new Set<string>\(\)/, "host holds the selection");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["review.itemCompareTitle", "review.itemCompareHint", "review.itemCompareUnitGroup", "review.itemCompareSparse", "review.itemCompareRate", "review.itemCompareRecords", "review.itemCompareQuotaNote"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

/* —— T-1578 比较器可搜索化：全量候选不再截断前 12，IME 安全防抖，已选恒显示，归档排除有守门。 —— */
const reviewCompareSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const batchBackfillSource = fs.readFileSync(path.join(root, "src", "features", "batch-backfill.ts"), "utf8");
const compareBody = reviewCompareSource.slice(reviewSource.indexOf("renderItemCompare"));
assert.ok(!compareBody.includes(".slice(0, 12)"), "比较器候选不得再截断前 12");
assert.match(compareBody, /data-item-compare-search/, "比较器必须提供搜索输入");
assert.match(compareBody, /itemCompareQuery/, "比较器查询走会话态");
assert.match(compareBody, /selection\?\.has\(candidate\.id\) \?\? false/, "已选项目不受查询过滤（恒显示便于取消）");
assert.match(bindSource, /data-item-compare-search/, "比较器搜索绑定在位");
assert.match(bindSource, /compareComposing/, "搜索必须 IME 安全（组合态不打断）");
assert.match(bindSource, /data-action='clear-item-compare-query'/, "搜索清除入口在位");
assert.match(indexSource, /scheduled: !item.archived && isItemAvailableOnDate/, "批量补记快照排除归档/不可用项目（计划层分类前即排除）");
assert.match(batchBackfillSource, /atMost/, "限额/戒除不批量制造成功事实的纯函数守门在位");
for (const key of ["review.itemCompareSearchAria", "review.itemCompareShowing"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("item trend compare gates passed: kernel-parity series, unit grouping, quota separation, sparse hints, 2-4 selection cap, table-chart parity and bilingual copy.");
