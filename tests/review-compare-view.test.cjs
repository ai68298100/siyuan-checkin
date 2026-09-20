const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const reviewSource = fs.readFileSync(path.join(sourceRoot, "render", "review.ts"), "utf8");

/* 结构守门：比较必须消费共享 asOf 推导的基线上下文，不得另取当前时刻。 */
assert.match(reviewSource, /getPreviousReviewRange\(\{startDate: summary\.startDate, endDate: summary\.endDate\}\)/,
    "review must derive the baseline range from the active summary range");
assert.match(reviewSource, /const previous = previousRange \? buildCustomSummaryContext\(ctx\.store, previousRange, asOf\)/,
    "comparison must consume the shared cutoff when projecting the baseline context");
assert.match(reviewSource, /buildReviewComparison\(viewSummary, coverage\(previous\)\)/,
    "both sides of the comparison use the same presentation coverage projection");
assert.match(reviewSource, /renderReviewCompareSection\(comparison, true\)/,
    "review embeds comparison without a redundant nested disclosure");
assert.match(reviewSource, /fold\("compare", t\("review\.compareTitle"\), renderComparison\)/,
    "comparison is generated only after its overview disclosure opens");
assert.doesNotMatch(reviewSource, /new Date\(\)/,
    "review must not capture independent current instants");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-compare-"));
const plainFiles = ["types.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "analytics.ts", "shared.ts"];
for (const filename of plainFiles) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
for (const filename of ["features/record-notes.ts", "features/review-comparison.ts", "ui/labels.ts", "render/review-compare.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {setPluginLanguage, t} = require(path.join(outputRoot, "i18n.js"));
const {buildReviewComparison} = require(path.join(outputRoot, "features", "review-comparison.js"));
const {renderReviewCompareSection, renderReviewCompareItems} = require(path.join(outputRoot, "render", "review-compare.js"));

const item = (itemId, name) => ({itemId, name, eventCount: 0, scheduledDays: 0, completedDays: 0, completionRate: 0});
const context = (overrides = {}) => ({
    range: "week", startDate: "2026-09-01", endDate: "2026-09-07", items: [], totalEvents: 0, completedItems: 0, scheduledItems: 0, ...overrides,
});

/* 空数据：两侧均无记录时给明确空态，而不是一排零。 */
const emptySection = renderReviewCompareSection(buildReviewComparison(context(), context()));
assert.match(emptySection, /lc-checkin__compare is-empty/);
assert.ok(emptySection.includes(t("review.compareEmpty")));
assert.ok(!emptySection.includes("lc-checkin__compare-stat"), "empty comparison must not render stat blocks");
assert.equal(renderReviewCompareItems(buildReviewComparison(context(), context())), "");

const current = context({
    totalEvents: 9,
    completedItems: 2,
    scheduledItems: 3,
    items: [
        {...item("a", "Alpha"), eventCount: 4, scheduledDays: 5, completedDays: 3, completionRate: 60},
        {...item("new", "New"), eventCount: 2, scheduledDays: 2, completedDays: 1, completionRate: 50},
        {...item("same", "Same"), eventCount: 1, scheduledDays: 2, completedDays: 1, completionRate: 50},
    ],
});
const baseline = context({
    startDate: "2026-08-25",
    endDate: "2026-08-31",
    totalEvents: 5,
    completedItems: 3,
    scheduledItems: 2,
    items: [
        {...item("a", "Alpha old"), eventCount: 1, scheduledDays: 4, completedDays: 1, completionRate: 25},
        {...item("old", "Old"), eventCount: 3, scheduledDays: 6, completedDays: 2, completionRate: 33},
        {...item("same", "Same"), eventCount: 1, scheduledDays: 2, completedDays: 1, completionRate: 50},
    ],
});
const comparison = buildReviewComparison(current, baseline);

const section = renderReviewCompareSection(comparison);
assert.ok(section.includes(t("review.compareTitle")), "section must carry the compare title");
assert.ok(section.includes("2026-08-25 ~ 2026-08-31"), "section must show the concrete baseline range");
assert.match(section, /^<details class="lc-checkin__compare"[^>]*><summary>/, "comparison should start with a native, initially collapsed disclosure");
assert.doesNotMatch(section.match(/^<details[^>]*>/)?.[0] || "", /\bopen\b/, "secondary comparison data must not occupy the initial screen");
assert.match(section, /<\/summary><div class="lc-checkin__compare-body">/, "all comparison data stays behind the summary");
assert.match(section, /lc-checkin__compare-chart[^>]*role="img"/, "comparison must lead with one summary chart");
assert.match(section, /lc-checkin__compare-chart-bars/, "summary chart must pair current and baseline bars");
assert.match(section, /class="is-current"/, "summary chart must label the current series");
assert.match(section, /class="is-baseline"/, "summary chart must label the previous series");
assert.ok(section.includes(`>${t("review.statEvents")}</small>`), "stats reuse the range-stat labels");
assert.match(section, /lc-checkin__compare-stat is-up/, "event growth must be marked up");
assert.match(section, /lc-checkin__compare-stat is-down/, "item drop must be marked down");
assert.match(section, /lc-checkin__compare-stat is-flat/, "scheduled delta must stay neutral");
assert.ok(section.includes(">+4</em>"), "event delta must be signed");
assert.ok(section.includes(`>${t("review.compareBaselineLabel")} 5</span>`), "baseline value must be labelled");

const embedded = renderReviewCompareSection(comparison, true);
assert.match(embedded, /^<section class="lc-checkin__compare">/,
    "the workspace's already-open comparison fold must embed a section");
assert.doesNotMatch(embedded, /<details|<summary/,
    "users must not need a second expansion to see the selected comparison");
assert.ok(embedded.includes("2026-08-25 ~ 2026-08-31"), "embedded comparison retains its baseline dates");
assert.match(embedded, /lc-checkin__compare-chart/, "embedded comparison retains the chart");
assert.match(embedded, /lc-checkin__compare-stat is-up/, "embedded comparison retains signed statistics");

const rows = renderReviewCompareItems(comparison);
const rowOrder = [...rows.matchAll(/<strong>([^<]+)<\/strong>/g)].map((match) => match[1]);
assert.deepEqual(rowOrder, ["New", "Alpha", "Old", "Same"], "items sort by absolute rate delta first");
assert.match(rows, /lc-checkin__compare-item is-up[^>]*><strong>Alpha<\/strong>/, "improving item must be marked up");
assert.ok(rows.includes("+35pp"), "rate delta renders as signed percentage points");
assert.ok(rows.includes("-33pp"), "negative rate delta renders signed");
assert.ok(rows.includes(">±0</em>"), "zero rate delta renders neutral without pp");
assert.ok(rows.includes("+3 条记录"), "event delta line keeps the shared record label");
assert.match(rows, /class="is-base" style="width:25%"/, "baseline bar mirrors the previous completion rate");
assert.match(rows, /style="width:60%"/, "current bar mirrors the current completion rate");
assert.ok(!rows.includes("<script>"), "item names must be html-escaped");

/* 周期目标只比较可比的记录数；同数量也不能退化为空行或误导的 0%。 */
const quotaComparison = buildReviewComparison(context({items: [
    {...item("quota", "周目标 <ml>"), eventCount: 2, completionRate: 100},
]}), context({items: [
    {...item("quota", "周目标 <ml>"), eventCount: 2, completionRate: 0},
]}));
const quotaRows = renderReviewCompareItems(quotaComparison, {nonComparableRateIds: new Set(["quota"])});
assert.match(quotaRows, /lc-checkin__compare-item is-flat is-uncomparable/);
assert.ok(quotaRows.includes("周目标 &lt;ml&gt;"));
assert.ok(quotaRows.includes(t("review.compareQuotaRate")));
assert.ok(quotaRows.includes(`${t("review.compareCurrentLabel")} 2 / ${t("review.compareBaselineLabel")} 2 ${t("review.statEvents")}`), "equal counts remain visible on both sides");
assert.match(quotaRows, /class="lc-checkin__compare-item-rate"[^>]*>—<\/span>/);
assert.doesNotMatch(quotaRows, /%|pp|<em|lc-checkin__compare-item-bar/,
    "incomparable quota completion rates must not create a fake percentage, delta, or progress bar");
assert.ok(renderReviewCompareItems(quotaComparison).includes("100%"), "without quota metadata the renderer retains its existing daily-rate contract");
const mixedComparison = buildReviewComparison(context({items: [
    {...item("quota", "Quota"), eventCount: 2, completionRate: 100},
    {...item("daily", "Daily"), eventCount: 1, completionRate: 50},
]}), context({items: [
    {...item("quota", "Quota"), eventCount: 2, completionRate: 0},
    {...item("daily", "Daily"), eventCount: 1, completionRate: 40},
]}));
const mixedRows = renderReviewCompareItems(mixedComparison, {nonComparableRateIds: new Set(["quota"])});
assert.deepEqual([...mixedRows.matchAll(/<strong>([^<]+)<\/strong>/g)].map(match => match[1]), ["Daily", "Quota"], "incomparable quota rates cannot influence daily-rate ordering");
assert.equal((mixedRows.match(/lc-checkin__compare-item-bar/g) || []).length, 1, "ordinary daily projects retain their comparable bar");

/* 项目很多时首屏只显示 8 项，其余按最多 8 项分批展开，并明确本批/剩余数量。 */
const manyCurrent = context({
    totalEvents: 18,
    completedItems: 9,
    scheduledItems: 18,
    items: Array.from({length: 18}, (_, index) => ({...item(`item-${index}`, `Item ${index + 1}`), eventCount: index + 1, scheduledDays: 7, completedDays: index % 7, completionRate: index * 5})),
});
const manyRows = renderReviewCompareItems(buildReviewComparison(manyCurrent, context()));
assert.equal((manyRows.match(/lc-checkin__compare-item-batch/g) || []).length, 2, "18 items should produce two bounded expansion batches after the first eight");
assert.ok(manyRows.includes(t("review.compareMoreItems", {n: 8, remaining: 10})), "first expansion must state its batch and remaining counts");
assert.ok(manyRows.includes(t("review.compareMoreItems", {n: 2, remaining: 2})), "last expansion must state the final count");

/* 嵌入名字的恶意输入必须转义后再进入 title/aria。 */
const hostile = context({
    totalEvents: 1,
    items: [{...item("x", '<script>alert("x")</script>'), eventCount: 1, scheduledDays: 1, completedDays: 1, completionRate: 100}],
});
const hostileRows = renderReviewCompareItems(buildReviewComparison(hostile, context({items: []})));
assert.ok(!hostileRows.includes("<script>"), "hostile names must be escaped in item rows");
assert.ok(hostileRows.includes("&lt;script&gt;"), "escaped name is rendered as text");

/* en-US 字典键齐全。 */
setPluginLanguage("en-US");
const enSection = renderReviewCompareSection(buildReviewComparison(current, baseline));
assert.ok(enSection.includes("vs previous period"), "en dictionary must cover the compare title");
assert.ok(enSection.includes("prev 5"), "en baseline label must render");
const enRows = renderReviewCompareItems(comparison);
assert.ok(enRows.includes("+3 records"), "en event delta keeps its label");
const enQuotaRows = renderReviewCompareItems(quotaComparison, {nonComparableRateIds: new Set(["quota"])});
assert.ok(enQuotaRows.includes("Period quota"));
assert.ok(enQuotaRows.includes(`${t("review.compareCurrentLabel")} 2 / prev 2 records`));
setPluginLanguage("zh-CN");

console.log("Review compare view checks passed: shared-cutoff baseline, delta tones, union sorting, empty state and i18n coverage.");
