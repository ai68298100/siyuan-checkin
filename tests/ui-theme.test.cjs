const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const liveStyles = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
const archivedSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "archived.ts"), "utf8");
const i18n = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.ok(!styles.includes("2.0 visual foundation"), "visual foundation must not return to legacy index.scss");
assert.match(liveStyles, /2\.0 visual foundation[\s\S]*\.lc-checkin__header,[\s\S]*\.lc-checkin__preview-card:hover/,
    "shared surface hierarchy belongs to the live component layer");
assert.match(liveStyles, /Semantic state tokens[\s\S]*data-status="missed"[\s\S]*data-status="partial"/,
    "semantic completion states belong to the live component layer");
assert.match(liveStyles, /@container lc5 \(min-width: 900px\) \{[\s\S]*\.lc-checkin--editor \.lc-checkin__form-scroll \{[\s\S]*grid-template-columns: minmax\(260px, \.8fr\) minmax\(0, 1\.4fr\)/,
    "desktop editor enhancement remains in the live component layer");
assert.ok(!styles.includes(".lc-checkin { --lc-checkin-border: var(--b3-theme-on-surface-light); }"),
    "the migrated contrast enhancement must not return to legacy index.scss");
assert.match(liveStyles, /@media \(prefers-contrast: more\) \{\s*\.lc-checkin \{ --lc-checkin-border: var\(--lc-checkin-muted\); \}[\s\S]*@media \(forced-colors: active\)/,
    "contrast and forced-color accessibility rules belong to the component layer");
assert.ok(!styles.includes("lc-checkin-dialog__resize-handle"), "dialog frame controls must not return to legacy index.scss");
assert.match(liveStyles, /Base plugin canvas and compact mobile shell[\s\S]*\.lc-checkin__progress/,
    "the base canvas, mobile shell and progress feedback belong to the component layer");
assert.match(styles, /--lc-checkin-control-height:\s*36px/);
assert.match(styles, /--lc-checkin-muted-surface:/);
assert.match(styles, /--lc-checkin-shadow:/);
assert.match(liveStyles, /\.lc-checkin__organize[\s\S]*background:\s*var\(--lc-checkin-muted-surface\)/);
assert.ok(!styles.includes("display: inline-flex !important"), "today search base primitive must not return to legacy index.scss");
assert.match(liveStyles, /Today organization, search, feedback and grouping primitives[\s\S]*\.lc-checkin__all-done/,
    "today organization and grouping primitives belong to the component layer");
assert.match(styles, /\.lc-checkin__item[\s\S]*box-shadow:\s*var\(--lc-checkin-shadow\)/);
/* 以下三条曾锁定 index.scss 里 @container lc-checkin 的死块（容器名被 tokens.scss 的 lc5 覆盖，从未生效）。
   现改锁 components.scss 中的现行活规则。 */
assert.match(liveStyles, /\.lc-checkin--editor \.lc-checkin__form-scroll \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\);/,
    "editor config area must stay single-column at every width");
assert.match(liveStyles, /\.lc-checkin--today \.lc-checkin__item-name \{[^}]*overflow: hidden[^}]*text-overflow: ellipsis[^}]*white-space: nowrap/,
    "long item names must truncate instead of widening cards");
assert.match(liveStyles, /@container lc5 \(max-width: 719px\) \{[\s\S]*\.lc-checkin--today \.lc-checkin__item \{ grid-template-columns: 34px minmax\(0, 1fr\) auto;/,
    "narrow containers must use the width-safe compact card grid");
assert.match(styles, /backdrop-filter:\s*blur\(12px\)/);
assert.match(styles, /\.lc-checkin__summary-stats[\s\S]*grid-template-columns:\s*repeat\(3/);
assert.match(styles, /\.lc-checkin--history \.lc-checkin__history-event \.lc-checkin__text-button[\s\S]*min-width:\s*36px/);
assert.match(reviewSource, /lc-checkin--review[\s\S]*lc-checkin__summary-stats/);
/* 归档视图外置到 render/archived.ts（15.0-A）：结构断言跟文件走，文案断言跟 i18n 走。 */
assert.match(archivedSource, /lc-checkin--archived[\s\S]*t\("archived\.eyebrow"\)/);
assert.match(i18n, /"archived\.eyebrow": "暂不参与今日计划"/);
assert.ok(reviewSource.includes('t("review.eyebrow")'), "review eyebrow uses the i18n dictionary");
assert.match(source, /surface\.dataset\.appearance = this\.resolvedAppearance\(\)/);
assert.match(source, /surface\.dataset\.appearance = this\.resolvedAppearance\(\)/);
assert.match(source, /surface\.dataset\.reducedMotion = String\(this\.reducedMotion\)/);
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /lc-checkin__settings-nav/);
assert.match(source, /window\.confirm\(t\("msg\.prefsResetConfirm"\)\)/);
assert.match(i18n, /"msg\.prefsResetConfirm": "确定恢复全部显示偏好吗？打卡数据不会受到影响。"/);
assert.match(styles, /\.lc-checkin\[data-reduced-motion="true"\]/);
assert.match(styles, /--lc-checkin-success:[^;]*#63c98d/);
assert.match(styles, /--lc-checkin-danger:[^;]*#b83232/);
/* radius-lg 的真实生效声明在 tokens.scss（20px）；index.scss 里曾有一份死块里的 16px 从未生效 */
assert.match(fs.readFileSync(path.join(__dirname, "..", "src", "ui", "tokens.scss"), "utf8"), /--lc-checkin-radius-lg:\s*20px/, "v5 tokens define the large radius");
assert.ok(!source.includes("cycleDensity"), "density cycler must be removed");
console.log("Modern responsive UI theme checks passed.");
