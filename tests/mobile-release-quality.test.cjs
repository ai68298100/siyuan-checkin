const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const plugin = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const browserEntry = fs.readFileSync(path.join(root, "tests", "mobile-visual-browser.cjs"), "utf8");

assert.equal(manifest.version, packageJson.version, "plugin and package versions must match");
assert.ok(fs.existsSync(path.join(root, manifest.icon)), "manifest icon must exist");
if (manifest.preview) assert.ok(fs.existsSync(path.join(root, manifest.preview)), "manifest preview must exist");
assert.match(packageJson.scripts["test:mobile:visual"], /test:mobile/,
    "mobile visual regression must be part of the release scripts");
assert.match(packageJson.scripts["test:mobile:visual:browser"], /mobile-visual-browser/,
    "browser visual entry must be discoverable from package scripts");
assert.match(browserEntry, /CHECKIN_QA_HARNESS/,
    "browser visual entry must support an explicit QA harness path");
assert.match(browserEntry, /CHECKIN_QA_PROJECT_ROOT/,
    "browser visual entry must pass the current worktree to the QA harness");
assert.match(browserEntry, /spawnSync\(process\.execPath/,
    "browser visual entry must execute the maintained QA harness");
assert.match(packageJson.scripts["test:ui"], /responsive-layout\.test\.cjs/,
    "4.0 UI verification must be discoverable from package scripts");

assert.match(components, /@media \(hover:\s*none\), \(pointer:\s*coarse\)/,
    "release must include a touch-specific layout tier");
assert.match(components, /env\(safe-area-inset-bottom\)/,
    "release must include bottom safe-area handling");
assert.match(components, /:focus-visible/,
    "release must include keyboard-visible focus styling");
assert.match(components, /overflow-x:\s*hidden|touch-action:\s*pan-y/,
    "release must guard against horizontal touch overflow");
assert.match(components, /height:\s*calc\(38px \+ env\(safe-area-inset-top\)\)/,
    "mobile top bar must stay compact while accounting for the safe-area inset");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin__mobile-topbar[\s\S]*?box-sizing:\s*border-box;/,
    "mobile top bar must include padding inside its measured height");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin__mobile-topbar[\s\S]*?background:\s*var\(--lc-checkin-bg\)/,
    "mobile top bar must share the canvas background instead of an unrelated color");
const mobileSettingsNavLayer = components.slice(components.lastIndexOf("/* 手机设置页分类栏"));
assert.match(mobileSettingsNavLayer, /\.lc-checkin--settings \.lc-checkin__settings-nav[\s\S]*?position:\s*sticky;[\s\S]*?overflow-x:\s*auto;/,
    "mobile settings navigation must stay in flow and scroll horizontally when labels do not fit");
assert.match(mobileSettingsNavLayer, /touch-action:\s*pan-x(?:\s+pan-y)?;[\s\S]*?scroll-snap-type:\s*x proximity;/,
    "mobile settings navigation must expose a deliberate horizontal touch rail without blocking vertical page scroll");
assert.match(mobileSettingsNavLayer, /background:\s*var\(--lc-checkin-bg\)/,
    "mobile settings navigation must use an opaque canvas background while sticky");
assert.match(mobileSettingsNavLayer, /\.lc-checkin--settings \.lc-checkin__settings-nav button[\s\S]*?min-width:\s*max-content;/,
    "mobile settings navigation labels must not be ellipsized into unavailable sections");
assert.match(mobileSettingsNavLayer, /\.lc-checkin--settings \.lc-checkin__settings-card[\s\S]*?scroll-margin-top:\s*52px;/,
    "mobile settings category targets must remain visible below the sticky rail");
assert.match(plugin, /root\.dataset\.appearance\s*=\s*appearance/,
    "window host must carry the resolved independent appearance");
assert.match(plugin, /this\.syncHostThemeTokens\(root, surface\)/,
    "window-level chrome must inherit the surface theme tokens");
assert.match(plugin, /hostThemeSignatures = new WeakMap<HTMLElement, string>/,
    "theme token synchronization should be cached per host surface");
assert.match(plugin, /if \(this\.hostThemeSignatures\.get\(root\) === signature\) return/,
    "unchanged appearance and palette should skip repeated computed-style work");
assert.match(plugin, /class=\"lc-checkin__mobile-topbar\" data-appearance=\"\$\{this\.resolvedAppearance\(\)\}\"/,
    "mobile top bar must expose its resolved appearance for deterministic styling");
assert.match(plugin, /private startHostMessageOffsetWatcher\(\)/,
    "mobile host must watch SiYuan message geometry instead of assuming a fixed snackbar height");
assert.match(plugin, /getBoundingClientRect\(\)[\s\S]*--lc-checkin-host-message-offset/,
    "visible message bounds must drive the review toolbar offset");
assert.match(plugin, /availableOffset = Math\.max\(0, window\.innerHeight - naturalBottom - 120\)/,
    "host message avoidance must preserve usable viewport space even for unusually tall banners");
assert.match(plugin, /settleFrames = 30/,
    "host message avoidance must follow CSS snackbar animation frames");
assert.match(plugin, /private stopHostMessageOffsetWatcher\(\)/,
    "host message observer must expose lifecycle cleanup");
assert.match(components, /\.lc-checkin--review \.lc-checkin__editor-header[\s\S]*margin-top:\s*var\(--lc-checkin-host-message-offset, 0px\)/,
    "mobile review toolbar must consume the measured host message offset");
assert.match(components, /\.lc-checkin__custom-range-disclosure\[open\][\s\S]*top:\s*calc\(var\(--lc-checkin-review-header-bottom, 40px\) \+ 8px\)/,
    "custom range popover must start below the complete shifted toolbar");
assert.match(components, /@container lc5 \(max-width: 380px\)/,
    "sub-380px content layout should respond to the surface container width");
assert.match(components, /@container lc5 \(max-width: 360px\)/,
    "sub-360px content density should respond to the surface container width");
assert.match(components, /@container lc-dock \(max-width: 719px\)/,
    "dock must have a dedicated narrow-container layout tier");
assert.match(components, /@container lc-dock \(max-width: 320px\)/,
    "dock must guard ultra-narrow widths");
assert.match(components, /grid-column: 1 \/ -1/,
    "dock card actions must occupy a dedicated row");
assert.match(components, /scroll-padding-bottom: 16px/,
    "dock content must preserve bottom scroll safety space");

/* ---- 真机截图核对修复守门(B-006,2026-09-14) ---- */
/* 今日操作轨道:窄档 flex-end 溢出向左压正文——主按钮必须可收缩省略,图标钮 26px */
assert.match(components, /\.lc-checkin--today \.lc-checkin__item-action \{ min-width: 0; max-width: 100%; \}/,
    "today action rail must be allowed to shrink instead of overflowing onto text");
assert.match(components, /:is\(\.lc-checkin__record-button, \.lc-checkin__quick-button\) \{\s*flex: 0 1 auto;\s*min-width: 0;/,
    "record/quick buttons must shrink with ellipsis on narrow cards");
assert.match(components, /:is\(\.lc-checkin__focus-button, \.lc-checkin__more-button, \.lc-checkin__drag-handle\) \{\s*width: 26px;\s*height: 26px;/,
    "rail icon buttons must stay 26px inline");
/* 连续徽章不再撑高标题行 */
assert.match(components, /\.lc-checkin__item-topline \.lc-checkin__streak-badge \{\s*height: 22px;/,
    "streak badge must stay inline height");
/* 移动端页内标题与顶栏重复:窄档隐藏文字保留按钮 */
assert.match(components, /:is\(\.lc-checkin-host--mobile, \.lc-checkin-dialog-host--mobile, \.lc-checkin-tab-host:has\(\.lc-checkin__mobile-topbar\)\)[\s\S]*?\.lc-checkin__editor-header \.lc-checkin__title,[\s\S]*?\.lc-checkin__editor-header \.lc-checkin__eyebrow \{ display: none; \}/,
    "duplicate in-page titles must hide only on hosts that provide a mobile topbar");
/* 无记录的正向目标不生成最佳/优先建议；戒除目标无记录仍可能真实达成。
   语义由实际 renderer fixtures 验证，不绑定已退役的 hero 局部变量名。 */
assert.match(packageJson.scripts["test:ui"], /review-workspace\.test\.cjs/,
    "release UI checks must execute empty-positive and achieved-avoidance review fixtures");
/* 思源移动端悬浮钮避让 */
assert.match(components, /\.lc-checkin-dialog-host--mobile \.lc-checkin__list \{ padding-bottom: 64px; \}/,
    "mobile list must reserve bottom space for the host floating button");
/* 编辑器模板 chips 可见 + 预览限高放宽 */
assert.match(components, /\.lc-checkin--editor \.lc-checkin__filter-row \{\s*height: auto;\s*overflow: visible;/,
    "template group chips must not be clipped by the row");
assert.match(components, /\.lc-checkin--editor \.lc-checkin__template-section \{ max-height: 380px; overflow: auto; \}/,
    "template preview must show a full card row at narrow widths");
/* 自定义范围 chip 未激活降权 */
assert.match(components, /\.lc-checkin__custom-range-disclosure > summary \{\s*color: var\(--lc-checkin-muted\);/,
    "custom range chip must look neutral when inactive");
assert.match(components, /data-action="copy-weekly-report"[\s\S]*?white-space:\s*nowrap;[\s\S]*?word-break:\s*keep-all;/,
    "mobile review toolbar labels must stay horizontal instead of wrapping one glyph per line");
/* 死 FAB 样式不得回潮 */
assert.ok(!components.includes("lc-checkin__mobile-fab"), "dead mobile-fab styles must stay removed");

console.log("Mobile release quality checks passed.");
