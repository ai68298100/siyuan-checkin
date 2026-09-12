/* 桌面端弹窗结构守门：
   �?内容列宽必须走「弹窗自身宽度」的容器查询阶梯，而不是被 700px 基础上限压死
      （历史上 @media 版本写在该上限之前，同特异性被覆盖成死规则，宽弹窗恒为单列）；
   �?尺寸策略含自适应默认值，且拖�?缩放/双击最大化与记忆链路完整�?*/
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (...segments) => fs.readFileSync(path.join(__dirname, "..", ...segments), "utf8");
const scss = read("src", "index.scss");
const quickDialog = read("src", "render", "quick-dialog.ts");
const preferences = read("src", "view-preferences.ts");
const settings = read("src", "render", "settings.ts");
const i18n = read("src", "i18n.ts");

// �?弹窗容器查询阶梯
assert.match(scss, /\.lc-checkin-dialog-host \{ container: lc-dialog \/ inline-size; \}/,
    "the dialog host must expose its own container so the content ladder measures the dialog, not the window");
const ladder = scss.slice(scss.indexOf("container: lc-dialog / inline-size"));
assert.match(ladder, /@container lc-dialog \(min-width: 900px\)[\s\S]*?lc-checkin__layout \{ max-width: 950px; \}/,
    ">=900px dialogs must widen the layout cap to 950px (covers the ~950 CSS-px real-device dialog)");
assert.match(ladder, /@container lc-dialog \(min-width: 1100px\)[\s\S]*?lc-checkin__layout \{ max-width: 1150px; \}/,
    ">=1100px dialogs must widen the layout cap to 1150px");
assert.match(ladder, /@container lc-dialog \(min-width: 1300px\)[\s\S]*?lc-checkin__layout \{ max-width: 1400px; \}/,
    ">=1300px dialogs must widen the layout cap to 1400px");
assert.match(ladder, /@container lc-dialog \(min-width: 2000px\)[\s\S]*?lc-checkin__layout \{ max-width: 1780px; \}/,
    ">=2000px dialogs must widen the layout cap to 1780px");
const baseCapIndex = scss.indexOf("width: min(100%, 700px)");
const ladderIndex = scss.indexOf("container: lc-dialog / inline-size");
assert.ok(baseCapIndex >= 0 && ladderIndex > baseCapIndex,
    "the ladder must be declared after the 700px base cap, otherwise equal specificity makes it a dead rule");
assert.ok(!/@media \(min-width: 1[0-9]{3}px\) \{\s*\.lc-checkin-dialog-host/.test(scss),
    "viewport media queries must not size the dialog content (they measured the window, not the dialog)");

// �?尺寸策略 + 窗体操作
assert.match(preferences, /DialogSizeMode = "auto" \| "percent" \| "fullscreen" \| "fixed"/,
    "auto must be a dialog size mode");
assert.match(preferences, /dialogSizeMode: "auto",/, "auto must be the default dialog size mode");
assert.match(preferences, /dialogRect: readRect\(source\.dialogRect/, "the dragged dialog size must persist");
assert.match(preferences, /dialogOffset: readOffset\(source\.dialogOffset\)/, "the dragged dialog position must persist");
assert.match(quickDialog, /host\.dialogSizeMode === "auto"[\s\S]*?host\.dialogRect\?\.width \?\? autoDialogWidth/,
    "auto mode must use the remembered size before falling back to the content-driven width");
assert.match(quickDialog, /AUTO_DIALOG_MIN_WIDTH = 760[\s\S]*?AUTO_DIALOG_MAX_WIDTH = 1600/,
    "the adaptive width must stay inside a readable 760�?600px band");
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

// �?设置面板入口
assert.match(settings, /<option value="auto" \$\{ctx\.dialogSizeMode === "auto" \? "selected" : ""\}>/,
    "settings must offer the adaptive size mode");
assert.match(settings, /data-action="reset-dialog-frame"/, "settings must offer resetting a remembered size");
assert.match(i18n, /"set\.dialogAuto": "自适应（推荐）"/, "zh copy for the adaptive mode");
assert.match(i18n, /"set\.dialogAuto": "Adaptive \(recommended\)"/, "en copy for the adaptive mode");

// �?宽容器下的页面级桌面布局
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

// �?打卡按钮对齐：操作区用固定轨道，缺按钮的类型留空轨道而不是让主按钮左�?
assert.match(components, /\.lc-checkin--today \.lc-checkin__item-action \{[\s\S]*?--lc-action-slot: 34px;[\s\S]*?--lc-action-primary: 92px;[\s\S]*?grid-template-columns: var\(--lc-action-slot\) minmax\(64px, var\(--lc-action-primary\)\) var\(--lc-action-slot\);/,
    "the action cell must use fixed tracks so every card kind shares one primary-button column");
assert.match(components, /\.lc-checkin__item-action :is\(\.lc-checkin__record-button, \.lc-checkin__quick-button\) \{ grid-column: 2;/,
    "the primary check-in button must be pinned to the middle track");
assert.match(components, /\.lc-checkin__item-action \.lc-checkin__more-button \{ grid-column: 3;/,
    "the exact-entry toggle must be pinned to the trailing track");
assert.match(components, /\.lc-checkin__item:has\(\.lc-checkin__drag-handle\) \.lc-checkin__item-action \{/,
    "the drag handle gets its own track only when present");
assert.match(components, /grid-template-columns: repeat\(auto-fill, minmax\(min\(380px, 100%\), 1fr\)\)/,
    "the shelf minimum card width must protect the name column (380px)");
const fragments = read("src", "render", "fragments.ts");
assert.match(fragments, /isBinary && complete \? "" : `<button class="lc-checkin__more-button"/,
    "binary cards must expose the same exact-entry menu (note/photo) as the other kinds");
assert.match(fragments, /isBinary \? "" : `<label><span>本次记录<\/span><input class="lc-checkin__amount"/,
    "binary items omit the amount field but keep note and photo in the exact-entry panel");

// �?弹窗宽度档位必须覆盖小弹窗（真机 80% 弹窗�?CSS 宽度可能只有 ~950�?
for (const threshold of [760, 900, 1100, 1300, 1560, 2000]) {
    assert.match(scss, new RegExp(`@container lc-dialog \\(min-width: ${threshold}px\\)`),
        `the dialog ladder must include the ${threshold}px step`);
}

// �?手机端固定顶�?底栏：结构在滚动容器之外 + 几何�?!important 收口
const plugin = read("src", "index.ts");
assert.match(plugin, /root\.insertAdjacentHTML\("afterbegin", this\.renderMobileTopbar\(\)\)/,
    "the mobile top bar must be attached to the host, not inside the scrolling container");
/* T-034 �ں϶������ر� + ��ҳ���� tabs + ����/���� ���У��ƶ�ǰ�˲�����Ⱦ�� topnav */
assert.match(plugin, /private renderMobileTopbar\(\): string \{[\s\S]*?lc-checkin__topbar-tabs[\s\S]*?data-mobile-nav="\$\{page\}"/,
    "the mobile top bar must fuse the four navigation tabs into one row");
assert.match(plugin, /renderTopNav\(\)\);/,
    "the desktop top nav keeps its render path");
assert.doesNotMatch(plugin, /if \(layout\) \{\s*\/\*[^*]*\*\/\s*layout\.insertAdjacentHTML\("afterbegin", this\.renderTopNav\(\)\)/,
    "the top nav must not render unconditionally (mobile now owns its fused top bar)");
assert.match(plugin, /if \(!this\.isMobileFrontend\) layout\.insertAdjacentHTML\("afterbegin", this\.renderTopNav\(\)\)/,
    "the top nav must be skipped on the mobile frontend");
assert.match(plugin, /root\.insertAdjacentHTML\("beforeend", this\.renderMobileNav\(\)\)/,
    "the mobile bottom bar must be attached to the host as well");
assert.match(plugin, /private todayProgressLabel\(\): string \{/,
    "the mobile top bar shows today progress from the same rule set as the page");
assert.match(components, /\.lc-checkin-dialog-host--mobile,[\s\S]*?display: flex !important;[\s\S]*?flex-direction: column !important;/,
    "the mobile host must be a flex column so the bars can never move with scrolling");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin,[\s\S]*?flex: 1 1 auto !important;[\s\S]*?overflow: auto !important;/,
    "the scrolling area must be the middle flex item only");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin__mobile-nav,[\s\S]*?position: static !important;/,
    "the bottom bar must sit in the flex flow (never 'fixed' relative to an unknown ancestor)");
assert.match(components, /\.lc-checkin-dialog-host--mobile \.lc-checkin__mobile-nav,[\s\S]*?animation: none !important;[\s\S]*?transform: none !important;/,
    "the entrance animation must be cancelled: its fill-mode left the bars translated by 6-8px and replayed on every render");

// �?侧边栏面板（dock）：窄面板要有自己的导航与结构，否则进去出不�?
assert.match(plugin, /plugin\.dockElement\.classList\.add\("lc-checkin-dock-host"\)/,
    "the dock panel needs its own host class for narrow-panel layout");
assert.match(plugin, /if \(!root\.querySelector\("\.lc-checkin__mobile-nav"\)\) \{\s*root\.insertAdjacentHTML\("beforeend", this\.renderMobileNav\(\)\);/,
    "the bottom navigation must be rendered on every surface (wide containers hide it in CSS)");
assert.match(plugin, /size: \{width: 380, height: 0\}/, "the dock default width must fit a readable card column");
assert.match(components, /\.lc-checkin-dock-host \{[\s\S]*?container: lc-dock \/ inline-size;[\s\S]*?display: flex;/,
    "the dock host must be a sized container and a flex column so its bars can be pinned");
assert.match(components, /@container lc-dock \(max-width: 719px\) \{[\s\S]*?\.lc-checkin-dock-host > \.lc-checkin__mobile-nav \{[\s\S]*?display: grid;/,
    "narrow dock panels must show the bottom navigation");
assert.match(read("src", "render", "review.ts"), /data-action="archived"/, "�鵵 entry button stays in the �ع� page header");
assert.doesNotMatch(plugin, /\["archived", t\("nav\.archived"\), "archive"\]/, "�鵵 stays out of the top navigation (reached from �ع�, T-032 user feedback)");

// �?事项页：模板折叠 + 列表卡片化（行高曾被按钮折行撑到 219px�?
assert.match(read("src", "render", "occasions.ts"), /<details class="lc-checkin__occasion-templates-fold" \$\{ctx\.occasionTemplatesOpen \? "open" : ""\}>/,
    "the 21 template chips must live behind a fold");
assert.match(read("src", "render", "occasions.ts"), /class="lc-checkin__occasion-row-actions"><button class="lc-checkin__small-button" type="button" data-occasion-toitem=/,
    "occasion rows must use icon buttons in a fixed action column instead of wrapping text buttons");
assert.match(components, /\.lc-checkin--occasions \.lc-checkin__occasion-manager-row \{\s*grid-template-columns: 34px minmax\(0, 1fr\) 128px;/,
    "occasion rows must reserve a fixed action column so the row height stays stable");
assert.match(components, /\.lc-checkin--occasions \.lc-checkin__occasion-row-actions \{\s*display: grid;\s*grid-template-columns: repeat\(4, 30px\);/,
    "the four occasion actions must sit in one 30px icon row");
assert.match(components, /\.lc-checkin--occasions \.lc-checkin__occasion-form-panel \.lc-checkin__form-row \{\s*grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\);/,
    "form rows must collapse to one column when the form panel is narrow");
assert.match(components, /@container lc5 \(min-width: 900px\) \{\s*\.lc-checkin--occasions \.lc-checkin__occasion-manager \{\s*grid-template-columns: minmax\(260px, 320px\) minmax\(0, 1fr\);/,
    "the occasion form must own the remaining width (it is the work area)");
assert.match(read("src", "render", "bind-occasions.ts"), /host\.occasionTemplatesOpen = \(event\.currentTarget as HTMLDetailsElement\)\.open;/,
    "the template fold state must survive re-renders");

// �ع�ҳ�鵵���Ψһ��T-032������ťֻ��Ⱦһ�Σ����� aria �� {date} ռλ�����봫ֵ
const reviewSource = read("src", "render", "review.ts");
assert.equal((reviewSource.match(/data-action="archived"/g) || []).length, 1,
    "the review header must render exactly one archive entry");
assert.match(reviewSource, /t\("review\.catchUpAria", \{name: entry\.name, date: entry\.occurrenceDate\}\)/,
    "the catch-up aria label must interpolate both {name} and {date}");

// T-034 �ֻ��˽����ո壺խ�������� topnav������������ֺ��š��ո�����
assert.doesNotMatch(components, /@container lc5 \(max-width: 719px\)[^@]*?flex-direction: column;\s*\}\s*\.lc-checkin--today \.lc-checkin__item-action/s,
    "the narrow-container action column must never stack buttons vertically again");
assert.match(components, /@container lc5 \(max-width: 719px\) \{[\s\S]*?\.lc-checkin__topnav \{ display: none !important; \}/,
    "narrow containers must hide the desktop top nav (mobile fused top bar owns navigation)");
assert.match(components, /@container lc5 \(max-width: 719px\) \{[\s\S]*?\.lc-checkin--today \.lc-checkin__item-action \{\s*--lc-action-slot: 26px;[\s\S]*?display: grid;/,
    "the mobile final layer must keep the horizontal fixed-track action grid");
assert.match(components, /@container lc5 \(max-width: 719px\) \{[\s\S]*?\.lc-checkin__topbar-tabs \{ display: flex;/,
    "the fused top bar tabs must have their compact row styles");

console.log("Desktop dialog structure checks passed.");

