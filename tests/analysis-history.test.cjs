/* 分析历史对比守门：历史正文必须来自受校验的独立缓存，并保持只读。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* Load the pure analysis-history helpers so the merge contract is exercised
   with real normalization, rather than only protected by source-shape checks. */
const modules = new Map();
function load(relativeOrAbsolute) {
    const filename = path.resolve(relativeOrAbsolute);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = {exports: {}};
    modules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    new Function("require", "module", "exports", code)(request => {
        assert.ok(request.startsWith("."), `unexpected runtime dependency: ${request}`);
        return load(path.resolve(path.dirname(filename), `${request}.ts`));
    }, module, module.exports);
    return module.exports;
}

const navigation = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const diff = fs.readFileSync("src/render/analysis-diff.ts", "utf8");
const suggestions = fs.readFileSync("src/agent-suggestions.ts", "utf8");
const review = fs.readFileSync("src/render/review.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
const styles = fs.readFileSync("src/ui/components.scss", "utf8");
const analysis = load(path.resolve("src/agent-suggestions.ts"));

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

const makeSnapshot = (text, generatedAt) => ({
    asOf: "2026-09-20", range: "week", source: "agent", generatedAt,
    startDate: "2026-09-14", endDate: "2026-09-20", contextKey: "v1:aa:bb:1", text,
});
const local = [makeSnapshot("local", "2026-09-20T04:00:00.000Z")];
const remote = [makeSnapshot("remote", "2026-09-20T04:00:00.000Z"), {...local[0]}];
const merged = analysis.mergeAnalysisSnapshots(local, remote);
assert.deepEqual(merged.map(entry => entry.text), ["local", "remote"],
    "analysis cache union keeps both windows' entries and removes exact duplicates");
assert.deepEqual(analysis.mergeAnalysisSnapshots(local, remote), analysis.mergeAnalysisSnapshots(remote, local),
    "analysis cache merge is deterministic and commutative");

console.log("Analysis history comparison structure checks passed.");
