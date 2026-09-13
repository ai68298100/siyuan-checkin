/* 分析历史对比守门：历史正文必须来自受校验的独立缓存，并保持只读。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");

const navigation = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const diff = fs.readFileSync("src/render/analysis-diff.ts", "utf8");
const suggestions = fs.readFileSync("src/agent-suggestions.ts", "utf8");
const review = fs.readFileSync("src/render/review.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
const styles = fs.readFileSync("src/ui/components.scss", "utf8");

assert.match(navigation, /analysisHistory: import\("\.\.\/agent-suggestions"\)\.AgentAnalysisSnapshot\[\]/);
assert.match(navigation, /host\.analysisHistory\.filter/);
assert.doesNotMatch(navigation, /JSON\.parse\(button\.dataset\.analysisHistory/);
assert.match(navigation, /agent\.historyTitle/);
assert.match(navigation, /agent\.historyBase/);
assert.match(navigation, /agent\.historyTarget/);
assert.match(navigation, /agent\.historySwap/);
assert.match(navigation, /agent\.historyCompare/);
assert.match(navigation, /agent\.historyReadOnly/);
assert.match(navigation, /agent\.historySameVersion/);
assert.match(navigation, /agent\.historyInvalid/);
assert.match(navigation, /Number\.isInteger\(baseIndex\)/);
assert.match(navigation, /renderAnalysisDiffPanel\(left\.text/);
assert.match(navigation, /aria-live="polite"/);
assert.match(navigation, /selected/);
assert.match(diff, /t\("agent\.diffSummary"/);
assert.match(diff, /renderAnalysisDiff\(before, after\)/);
assert.match(suggestions, /import \{t\} from "\.\/i18n"/);
assert.match(suggestions, /t\("agent\.diffEmpty"\)/);
assert.match(review, /analysisHistoryCount\?: number/);
assert.doesNotMatch(review, /data-analysis-history/);
assert.match(i18n, /"agent\.historyMeta"/);
assert.match(i18n, /"agent\.diffEmpty"/);
assert.match(styles, /\.lc-agent-compare-meta/);

console.log("Analysis history comparison structure checks passed.");
