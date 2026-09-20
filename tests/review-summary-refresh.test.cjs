const assert = require("node:assert/strict");
const fs = require("node:fs");

const review = fs.readFileSync("src/render/review.ts", "utf8");
const index = fs.readFileSync("src/index.ts", "utf8");
const navigation = fs.readFileSync("src/navigation.ts", "utf8");
const bind = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
const components = fs.readFileSync("src/ui/components.scss", "utf8");

assert.match(review, /summaryRefreshing: boolean/);
assert.match(review, /data-summary-refresh-state=/);
assert.match(review, /data-analytics-as-of/);
assert.match(review, /analyticsSummary \?/);
assert.match(review, /yearlyCurrent/);
assert.match(review, /escapeHtml\(analyticsSummary\.asOf\)/);
assert.match(review, /analyticsSummary\.weeklyCurrent/);
assert.match(review, /analyticsSummary\.activeDays/);
assert.match(components, /lc-checkin__analytics-badge/);
assert.match(review, /review\.agentRefreshing/);
assert.match(review, /review\.assistantGenerate/,
    "the generation button retains an accessible text name in the assistant panel");
assert.match(review, /disabled aria-busy/);
assert.match(review, /review\.assistantScope/,
    "assistant generation exposes the exact statistics period");
assert.match(review, /review\.assistantGenerated/);
assert.match(review, /ctx\.analysisLastGeneratedAt/,
    "generated output retains its timestamp");
assert.match(review, /ctx\.analysisHistoryCount/);
assert.match(review, /data-action="view-analysis-history"/,
    "stored analysis history remains reachable from the assistant panel");
assert.match(review, /review\.customStart/);
assert.match(review, /review\.customEnd/);
assert.match(review, /review\.customSeparator/);
assert.match(review, /review\.customApply/);
assert.match(index, /private summaryRefreshing = false/);
assert.match(index, /this\.summaryRefreshing = true/);
assert.match(index, /this\.summaryRefreshing = false/);
assert.match(index, /if \(this\.summaryRefreshing\) return/);
assert.match(bind, /if \(!host\.summaryRefreshing\)/);
assert.match(bind, /host\.summaryRefreshing = false/);
assert.match(navigation, /summaryRefreshing\?: boolean/);
assert.match(navigation, /host\.summaryRefreshing = false/);
assert.match(i18n, /"review\.agentRefreshing"/);
assert.match(i18n, /"review\.assistantGenerate"/);
assert.match(i18n, /"review\.assistantScope"/);
assert.match(i18n, /"review\.customApply"/);
console.log("Review summary refresh and cutoff structure checks passed.");
