/* R-A16（2026-09-26）轻量 SVG 视觉件守门：完成度环（dash 数学/钳制/完成态/aria）、
   sparkline（点数映射/空序列/确定性）、行动台与回顾页接线、i18n 双语、
   静态零动效（D-263）与单色 accent 阶梯（T-1461）在位。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-stats-visuals-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/date-keys.ts", "src/charts.ts"].forEach(transpile);
const charts = require(path.join(outputRoot, "src/charts.js"));

/* —— 1. 完成度环：dash 周长按百分比裁剪，越界钳制，100% 切完成态。 —— */
{
    const ring = charts.renderCompletionRing(50, {size: 40, ariaLabel: "半程"});
    assert.match(ring, /class="lc-checkin__completion-ring"/, "ring renders with its class");
    assert.ok(!ring.includes("is-complete"), "50% is not the complete state");
    assert.match(ring, /stroke-dasharray="56\.55 113\.10"/, "50% of a r=18 circle is half the circumference");
    assert.match(ring, /aria-label="半程"/, "aria label passes through (text channel)");
    assert.match(charts.renderCompletionRing(100), /is-complete/, "100% toggles the complete color hook");
    assert.match(charts.renderCompletionRing(100), /stroke-dasharray="94\.25 94\.25"/, "100% fills the whole circumference (default size 34, r=15)");
    assert.match(charts.renderCompletionRing(150), /is-complete/, "values above 100 clamp to complete");
    const empty = charts.renderCompletionRing(0);
    assert.match(empty, /stroke-dasharray="0\.00 /, "0% renders an empty ring");
    assert.match(charts.renderCompletionRing(Number.NaN), /stroke-dasharray="0\.00 /, "non-finite input fails closed to 0");
}

/* —— 2. sparkline：点序列映射为 polyline 坐标，空序列占位，确定性。 —— */
{
    const spark = charts.renderSparkline([0, 5, 10], {width: 100, height: 20, ariaLabel: "trend"});
    assert.match(spark, /aria-label="trend"/, "aria label passes through");
    assert.match(spark, /points="2\.0,18\.0 50\.0,10\.0 98\.0,2\.0"/, "points normalize to the box (max=10, 2px padding)");
    assert.match(charts.renderSparkline([7]), /points="2\.0,2\.0"/, "single point at the max sits on the top edge");
    assert.match(charts.renderSparkline([0.5]), /points="2\.0,12\.0"/, "sub-1 values use the max floor of 1 (half-height)");
    assert.equal(charts.renderSparkline([]), `<span class="lc-checkin__spark is-empty" aria-hidden="true"></span>`, "empty series renders a placeholder");
    assert.equal(charts.renderSparkline([1, 2, 3]), charts.renderSparkline([1, 2, 3]), "deterministic output");
    assert.doesNotMatch(charts.renderSparkline([NaN, 3]).match(/points="([^"]+)"/)[1], /NaN/, "non-finite values fail closed to 0");
}

/* —— 3. 接线：行动台摘要条带环、回顾页统计带 sparkline，均复用既有数据投影。 —— */
const fragmentsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /renderCompletionRing\(dashboard\.totals\.completionRate/, "console ring consumes the existing dashboard projection");
assert.match(fragmentsSource, /today\.consoleRingAria/, "ring aria uses the i18n key");

const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /ctx\.analyticsSnapshot\.daily\.points\.slice\(-30\)/, "sparkline reuses the daily analytics series (no new metric)");
assert.match(reviewSource, /renderSparkline\(sparkValues/, "review renders the sparkline");

/* —— 4. i18n 双语 + 样式在位（accent 单色、零动效）。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["today.consoleRingAria", "review.statsSparkAria", "review.statsSparkLabel"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}
const scss = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(scss, /\.lc-checkin__ring-value \{ stroke: var\(--lc-checkin-accent\); \}/, "ring value stays on the accent ladder");
assert.match(scss, /\.lc-checkin__completion-ring\.is-complete \.lc-checkin__ring-value \{ stroke: var\(--lc-checkin-success\); \}/, "complete state uses success color");
assert.ok(!/\.lc-checkin__completion-ring[^]*transition/.test(scss.split(".lc-checkin__stat-spark")[0].split("R-A16（2026-09-26）")[1] || ""), "ring stays static (D-263 no motion)");
assert.match(scss, /\.lc-checkin__spark-line \{ stroke: var\(--lc-checkin-accent\); \}/, "sparkline stays on the accent ladder");

console.log("stats visuals guard tests passed.");
