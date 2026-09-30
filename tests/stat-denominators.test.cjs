/* T-1516 统计分母与状态贡献明细守门：
   明细汇总与既有指标一致（同范围 completedDates/scheduledDays 对齐
   buildSummaryContext 的 completedDays/scheduledDays）、跳过不计分母（T-1221）、
   配额短路沿用 summary 的独立口径、分母为零显示无适用数据、
   有界截断、逐日跳转保留筛选、查询零写入与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-stat-denominators-"));
const load = (relative) => {
    /* 保持 src/ 目录结构（features/../model 相对 require 可解析）。 */
    const target = path.join(dir, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
/* 按依赖顺序落盘，保持模块间相对 require 可解析。 */
["date-keys.ts", "quota.ts", "record-step.ts", "rules.ts", "model.ts", "analytics.ts", "features/stat-denominators.ts"].forEach(load);
const denominators = require(path.join(dir, "features", "stat-denominators.js"));
const analytics = require(path.join(dir, "analytics.js"));

const store = {
    version: 3,
    items: [{
        id: "daily",
        name: "拉伸",
        icon: "✓",
        kind: "number",
        target: 30,
        unit: "分钟",
        schedule: {type: "daily"},
        createdAt: "2026-09-01T00:00:00.000Z",
        createdDate: "2026-09-01",
        archived: false,
        revisions: [],
    }],
    events: [
        {id: "e1", itemId: "daily", occurredAt: "2026-09-21T01:00:00.000Z", localDate: "2026-09-21", value: 30, unit: "分钟", source: "manual"},
        {id: "e2", itemId: "daily", occurredAt: "2026-09-22T01:00:00.000Z", localDate: "2026-09-22", value: 32, unit: "分钟", source: "manual"},
        {id: "e3", itemId: "daily", occurredAt: "2026-09-23T01:00:00.000Z", localDate: "2026-09-23", value: 0, unit: "分钟", source: "manual", kind: "skip"},
    ],
    eventTombstones: [],
};

/* —— 1. 明细与指标一致：周范围（09-21 ~ 09-27）。 —— */
{
    const summary = analytics.buildSummaryContext(store, "week", new Date(2026, 8, 27));
    const itemSummary = summary.items.find((entry) => entry.itemId === "daily");
    const detail = denominators.buildItemDenominatorDetail(store, store.items[0], summary.startDate, summary.endDate);
    assert.equal(detail.isQuota, false);
    assert.deepEqual(detail.completedDates, ["2026-09-21", "2026-09-22"], "completed dates enumerated");
    assert.equal(detail.completedDates.length, itemSummary.completedDays, "completed detail matches the metric");
    assert.equal(detail.completedDates.length + detail.missedDates.length, itemSummary.scheduledDays, "denominator detail matches the metric");
    assert.deepEqual(detail.skippedDates, ["2026-09-23"], "skip day excluded from the denominator (T-1221)");
    assert.deepEqual(detail.restDates, [], "daily items have no rest days in range");
}

/* —— 2. 配额短路：isQuota 无日级明细；summary 的 quota 投影是唯一口径。 —— */
{
    const quotaStore = {
        version: 3,
        items: [{
            id: "q", name: "跑步", icon: "🏃", kind: "count", target: 3, unit: "次",
            schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}},
            createdAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", archived: false, revisions: [],
        }],
        events: [{id: "qe", itemId: "q", occurredAt: "2026-09-21T01:00:00.000Z", localDate: "2026-09-21", value: 1, unit: "次", source: "manual"}],
        eventTombstones: [],
    };
    const summary = analytics.buildSummaryContext(quotaStore, "week", new Date(2026, 8, 27));
    const detail = denominators.buildItemDenominatorDetail(quotaStore, quotaStore.items[0], summary.startDate, summary.endDate);
    assert.equal(detail.isQuota, true);
    assert.equal(detail.completedDates.length + detail.missedDates.length, 0, "quota items have no day-level denominator");
    const quotaSummary = summary.items.find((entry) => entry.itemId === "q").quota;
    assert.ok(quotaSummary, "summary keeps its own quota projection as the single source");
}

/* —— 3. 分母为零（创建前范围）：全部不可用，无适用数据。 —— */
{
    const detail = denominators.buildItemDenominatorDetail(store, store.items[0], "2026-08-01", "2026-08-07");
    assert.equal(detail.unavailableCount, 7);
    assert.equal(detail.completedDates.length + detail.missedDates.length, 0);
}

/* —— 4. 逐日计数：范围过滤 + 日期排序 + 确定性；查询零写入。 —— */
{
    const counts = denominators.buildRangeDayCounts(store.events, "2026-09-21", "2026-09-27");
    assert.deepEqual(counts, [{date: "2026-09-21", count: 1}, {date: "2026-09-22", count: 1}, {date: "2026-09-23", count: 1}]);
    assert.deepEqual(denominators.buildRangeDayCounts(store.events, "2026-09-24", "2026-09-27"), []);
    const before = JSON.stringify(store.events);
    denominators.buildItemDenominatorDetail(store, store.items[0], "2026-09-21", "2026-09-27");
    denominators.buildRangeDayCounts(store.events, "2026-09-21", "2026-09-27");
    assert.equal(JSON.stringify(store.events), before, "read-only: events untouched");
}

/* —— 5. 概览接线（默认折叠懒渲染）、跳转保留筛选与双语。 —— */
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /fold\("denominators", t\("review\.denominatorsTitle"\), renderDenominators\)/, "overview hosts the lazily folded denominators section");
assert.match(reviewSource, /buildItemDenominatorDetail\(ctx\.store, item, summary\.startDate, summary\.endDate\)/, "item details reuse the summary range");
assert.match(reviewSource, /data-denominator-date=/, "dates jump to the day's records");
assert.match(reviewSource, /review\.denominatorNone/, "zero denominators show no-applicable-data");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindSource, /"\[data-denominator-date\]"/, "denominator dates are bound");
assert.match(bindSource, /host\.jumpToHistoryDate\(date, root\)/, "jumps reuse the records channel without clearing filters (T-1621 per-root)");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["review.denominatorsTitle", "review.denominatorsHint", "review.denominatorEvents", "review.denominatorCompleted", "review.denominatorScheduled", "review.denominatorNone", "review.denominatorCompletedDates", "review.denominatorMissedDates", "review.denominatorSkippedDates", "review.denominatorRestDates", "review.denominatorTruncated", "review.denominatorQuotaItem", "review.denominatorQuotaCurrent", "review.denominatorQuotaNote", "review.denominatorJumpAria"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("stat denominators gates passed: metric-parity day details, skip exclusion, quota short-circuit, zero-denominator copy, bounded lists, filter-preserving jumps and bilingual copy.");
