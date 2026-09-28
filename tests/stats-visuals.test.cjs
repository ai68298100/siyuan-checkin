/* R-A16（2026-09-26）轻量 SVG 视觉件守门 → T-1577（2026-09-29）退役守门。
   今日完成度环随行动台收束退役：进度展示唯一归 overview 大环（计数+环+节奏说明），
   行动台收束为「下一步」行动条（下一步/跳过/专注警告）。
   D-292（2026-09-27）：概览统计区迷你趋势线（R-16.2 sparkline）按用户反馈移除；
   D-263 零动效、T-1461 文字冗余基线继续有效。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fragmentsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "fragments.ts"), "utf8");
const chartsSource = fs.readFileSync(path.join(__dirname, "..", "src", "charts.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
const scss = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
const workbench = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "workbench.scss"), "utf8");

/* —— 1. 环视觉件全链退役：charts 助手、fragments 接线、样式零残留。 —— */
assert.doesNotMatch(chartsSource, /renderCompletionRing|lc-checkin__completion-ring|lc-checkin__ring-track|lc-checkin__ring-value/, "ring helper is fully retired from charts");
assert.doesNotMatch(fragmentsSource, /renderCompletionRing|completion-ring/, "fragments no longer renders the console ring");
assert.ok(!scss.includes("lc-checkin__completion-ring") && !scss.includes("lc-checkin__ring-track") && !scss.includes("lc-checkin__ring-value"), "ring styles are removed (zero dead classes)");
assert.ok(!workbench.includes("lc-checkin__console-totals"), "console totals style removed with the merged progress");

/* —— 2. 行动台收束为「下一步」行动条：进度不重复，跳过/专注独有信息保留。 —— */
assert.doesNotMatch(fragmentsSource, /today\.consoleTotals|today\.consoleRingAria/, "retired console i18n keys are removed from wiring");
assert.match(fragmentsSource, /today\.consoleNext/, "next-up copy stays on the console");
assert.match(fragmentsSource, /today\.consoleSkipped/, "skipped count stays on the console");
assert.match(fragmentsSource, /today\.consoleFocusMissing/, "focus warning stays on the console");
assert.match(fragmentsSource, /today\.consoleNextAria/, "console keeps an i18n aria label");
assert.match(fragmentsSource, /if \(!parts\.length\) return "";/, "an empty console renders nothing (no empty bar)");

/* —— 3. 进度展示唯一归 overview：大环计数、最佳连击、专注候选。 —— */
assert.match(fragmentsSource, /lc-checkin__overview-ring/, "overview ring is the single progress ring");
assert.match(fragmentsSource, /lc-checkin__overview-streak/, "best streak stays on the overview");
assert.match(fragmentsSource, /lc-checkin__overview-focus/, "focus candidate stays on the overview");

/* —— 4. i18n：新行动条 aria 双语齐备，退役键零残留。 —— */
for (const key of ["today.consoleNextAria"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}
assert.ok(!i18nSource.includes("today.consoleTotals"), "retired consoleTotals key removed");
assert.ok(!i18nSource.includes("today.consoleRingAria"), "retired consoleRingAria key removed");

/* D-292：概览统计区不再渲染任何图表（含旧 sparkline）。 */
const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
assert.doesNotMatch(reviewSource, /renderSparkline|stat-spark|statsSpark/, "overview stats render no sparkline (D-292)");
assert.doesNotMatch(chartsSource, /renderSparkline|lc-checkin__spark/, "sparkline helper is fully retired");
assert.ok(!i18nSource.includes("statsSpark"), "retired sparkline i18n keys are removed");
assert.ok(!scss.includes("lc-checkin__spark"), "sparkline styles are removed (zero dead classes)");

console.log("stats visuals guard tests passed.");
