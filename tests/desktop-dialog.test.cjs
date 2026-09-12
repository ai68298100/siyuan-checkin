/* 桌面端弹窗结构守门：
   ① 内容列宽必须走「弹窗自身宽度」的容器查询阶梯，而不是被 700px 基础上限压死
      （历史上 @media 版本写在该上限之前，同特异性被覆盖成死规则，宽弹窗恒为单列）；
   ② 尺寸策略含自适应默认值，且拖动/缩放/双击最大化与记忆链路完整。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (...segments) => fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8");
const scss = read("src", "index.scss");
const quickDialog = read("src", "render", "quick-dialog.ts");
const preferences = read("src", "view-preferences.ts");
const settings = read("src", "render", "settings.ts");
const i18n = read("src", "i18n.ts");

// ① 弹窗容器查询阶梯
assert.match(scss, /\.lc-checkin-dialog-host \{ container: lc-dialog \/ inline-size; \}/,
    "the dialog host must expose its own container so the content ladder measures the dialog, not the window");
const ladder = scss.slice(scss.indexOf("container: lc-dialog / inline-size"));
assert.match(ladder, /@container lc-dialog \(min-width: 1000px\)[\s\S]*?lc-checkin__layout \{ max-width: 1040px; \}/,
    ">=1000px dialogs must widen the layout cap to 1040px");
assert.match(ladder, /@container lc-dialog \(min-width: 1400px\)[\s\S]*?lc-checkin__layout \{ max-width: 1400px; \}/,
    ">=1400px dialogs must widen the layout cap to 1400px");
assert.match(ladder, /@container lc-dialog \(min-width: 2000px\)[\s\S]*?lc-checkin__layout \{ max-width: 1780px; \}/,
    ">=2000px dialogs must widen the layout cap to 1780px");
const baseCapIndex = scss.indexOf("width: min(100%, 700px)");
const ladderIndex = scss.indexOf("container: lc-dialog / inline-size");
assert.ok(baseCapIndex >= 0 && ladderIndex > baseCapIndex,
    "the ladder must be declared after the 700px base cap, otherwise equal specificity makes it a dead rule");
assert.ok(!/@media \(min-width: 1[0-9]{3}px\) \{\s*\.lc-checkin-dialog-host/.test(scss),
    "viewport media queries must not size the dialog content (they measured the window, not the dialog)");

// ② 尺寸策略 + 窗体操作
assert.match(preferences, /DialogSizeMode = "auto" \| "percent" \| "fullscreen" \| "fixed"/,
    "auto must be a dialog size mode");
assert.match(preferences, /dialogSizeMode: "auto",/, "auto must be the default dialog size mode");
assert.match(preferences, /dialogRect: readRect\(source\.dialogRect/, "the dragged dialog size must persist");
assert.match(preferences, /dialogOffset: readOffset\(source\.dialogOffset\)/, "the dragged dialog position must persist");
assert.match(quickDialog, /host\.dialogSizeMode === "auto"[\s\S]*?host\.dialogRect\?\.width \?\? autoDialogWidth/,
    "auto mode must use the remembered size before falling back to the content-driven width");
assert.match(quickDialog, /AUTO_DIALOG_MIN_WIDTH = 760[\s\S]*?AUTO_DIALOG_MAX_WIDTH = 1440/,
    "the adaptive width must stay inside a readable 760–1440px band");
assert.match(quickDialog, /export function bindQuickDialogFrameFor/, "the dialog must be framed on desktop");
assert.match(quickDialog, /container\.style\.transform = offsetX \|\| offsetY \? `translate/, "dragging must offset the dialog");
assert.match(quickDialog, /RESIZE_EDGES = \["n", "s", "e", "w", "ne", "nw", "se", "sw"\] as const/,
    "all eight resize directions must be available");
assert.match(quickDialog, /addEventListener\("dblclick", onHeaderDoubleClick\)/, "double-clicking the header must toggle fullscreen");
assert.match(quickDialog, /export function toggleQuickDialogFullscreenFor/, "fullscreen must have a single shared implementation");
assert.match(quickDialog, /host\.quickDialogFrameCleanup\?\.\(\)/, "frame listeners must be released when the dialog closes");
assert.match(scss, /\.lc-checkin-dialog__resize-handle\.is-se \{/, "resize handles need corner hit areas");
assert.match(scss, /\.lc-checkin-dialog--fullscreen \.lc-checkin-dialog__resize-handle \{ display: none; \}/,
    "fullscreen must not expose resize handles");

// ③ 设置面板入口
assert.match(settings, /<option value="auto" \$\{ctx\.dialogSizeMode === "auto" \? "selected" : ""\}>/,
    "settings must offer the adaptive size mode");
assert.match(settings, /data-action="reset-dialog-frame"/, "settings must offer resetting a remembered size");
assert.match(i18n, /"set\.dialogAuto": "自适应（推荐）"/, "zh copy for the adaptive mode");
assert.match(i18n, /"set\.dialogAuto": "Adaptive \(recommended\)"/, "en copy for the adaptive mode");

// ④ 宽容器下的页面级桌面布局
const components = read("src", "ui", "components.scss");
assert.match(components, /@container lc5 \(min-width: 900px\) \{\s*\.lc-checkin--occasions \.lc-checkin__occasion-manager \{\s*grid-template-columns: minmax\(300px, 420px\) minmax\(0, 1fr\)/,
    "the occasions page must become a list-left / form-right master-detail layout");
assert.match(components, /\.lc-checkin--occasions \.lc-checkin__occasion-list-panel \{ grid-row: 1; grid-column: 1; \}[\s\S]*?\.lc-checkin--occasions \.lc-checkin__occasion-form-panel \{ grid-row: 1; grid-column: 2; \}/,
    "the occasion list must be placed before the form on desktop");
assert.match(components, /@container lc5 \(min-width: 1180px\) \{\s*\.lc-checkin__review-sections \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); align-items: start; \}/,
    "wide review pages must lay their secondary sections out in two columns");
assert.match(read("src", "render", "review.ts"), /const wideDefaultOpen = typeof window !== "undefined" && window\.innerWidth >= 1200 && !ctx\.reviewFoldTouched;/,
    "wide windows must open the two informative review sections by default");
assert.match(read("src", "render", "review.ts"), /ctx\.reviewFoldSections\.has\(id\) \|\| \(wideDefaultOpen && \(id === "trend" \|\| id === "log"\)\)/,
    "only trend and log are opened by the wide default");
assert.match(read("src", "render", "bind-today.ts"), /host\.reviewFoldTouched = true;/, "a manual fold toggle must win over the wide default");
assert.match(scss, /@container lc5 \(min-width: 900px\) \{\s*\.lc-checkin:not\(\.lc-checkin--editor\) \.lc-checkin__back-button \{ display: none; \}/,
    "the desktop rail replaces the per-page back button");

console.log("Desktop dialog structure checks passed.");
