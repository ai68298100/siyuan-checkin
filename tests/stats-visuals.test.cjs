/* R-A16（2026-09-26）轻量 SVG 视觉件守门：完成度环（dash 数学/钳制/完成态/aria）、
   行动台接线、i18n 双语、静态零动效（D-263）与单色 accent 阶梯（T-1461）在位。
   D-292（2026-09-27）：概览统计区迷你趋势线（R-16.2 sparkline）按用户反馈移除，
   趋势呈现由分析工作区既有趋势图唯一承载；本文件不再守门 sparkline。 */
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

/* —— 2. 接线：行动台摘要条带环，复用既有数据投影。 —— */
const fragmentsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /renderCompletionRing\(dashboard\.totals\.completionRate/, "console ring consumes the existing dashboard projection");
assert.match(fragmentsSource, /today\.consoleRingAria/, "ring aria uses the i18n key");

/* D-292：概览统计区不再渲染任何图表（含旧 sparkline）。 */
const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
assert.doesNotMatch(reviewSource, /renderSparkline|stat-spark|statsSpark/, "overview stats render no sparkline (D-292)");
const chartsSource = fs.readFileSync(path.join(__dirname, "..", "src", "charts.ts"), "utf8");
assert.doesNotMatch(chartsSource, /renderSparkline|lc-checkin__spark/, "sparkline helper is fully retired");

/* —— 3. i18n 双语 + 样式在位（accent 单色、零动效）。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["today.consoleRingAria"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}
assert.ok(!i18nSource.includes("statsSpark"), "retired sparkline i18n keys are removed");
const scss = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(scss, /\.lc-checkin__ring-value \{ stroke: var\(--lc-checkin-accent\); \}/, "ring value stays on the accent ladder");
assert.match(scss, /\.lc-checkin__completion-ring\.is-complete \.lc-checkin__ring-value \{ stroke: var\(--lc-checkin-success\); \}/, "complete state uses success color");
assert.ok(!/\.lc-checkin__completion-ring[^]*transition/.test(scss.split(".lc-checkin__renderblock-today-summary")[0].split("R-A16（2026-09-26）")[1] || ""), "ring stays static (D-263 no motion)");
assert.ok(!scss.includes("lc-checkin__spark"), "sparkline styles are removed (zero dead classes)");

console.log("stats visuals guard tests passed.");
