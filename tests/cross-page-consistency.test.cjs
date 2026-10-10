const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1583 跨页交互与视觉规范守门（阶段 4 收官一致性专项）：
   - 危险区三页统一标记（编辑器/归档/设置重置）；
   - IME 组合态守卫覆盖全部四类搜索面（今日/设置/历史/比较器）；
   - reduced-motion 传递到全部滚动模块（设置/导航/事项/今日绑定）；
   - 会话态恢复模式在位（设置搜索/回顾视图/行动台）。
   视觉层（双主题/320px~宽屏/对比度）由 width-walkthrough + visual-qa + accessibility-audit
   既有守门承载，本文件不重复断言像素。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const editor = read("src", "render", "editor.ts");
const archived = read("src", "render", "archived.ts");
const settings = read("src", "render", "settings.ts");
const fragments = read("src", "render", "fragments.ts");
const todayBind = read("src", "render", "bind-today.ts");
const todayBindings = read("src", "render", "today-bindings.ts");
const settingsNav = read("src", "render", "settings-navigation.ts");
const reviewBind = read("src", "render", "bind-page-navigation.ts");
const occasionsBind = read("src", "render", "bind-occasions.ts");
const navigation = read("src", "navigation.ts");
const editorBind = read("src", "render", "bind-editor.ts");
const pluginOps = read("src", "plugin-ops.ts");
const quickDialog = read("src", "render", "quick-dialog.ts");
const pageShell = read("src", "render", "page-shell.ts");
const occasionSession = read("src", "render", "occasion-session.ts");
const occasions = read("src", "render", "occasions.ts");
const review = read("src", "render", "review.ts");
const indexSrc = read("src", "index.ts");

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("danger zones carry unified markers across editor, archived and settings", () => {
        assert.match(editor, /data-editor-section="danger"/, "编辑器页尾操作栏危险区标记");
        assert.match(archived, /data-archived-danger/, "归档危险区标记");
        assert.match(settings, /data-data-section="reset"/, "设置重置分区标记");
    });

    check("IME composition guards cover all four search surfaces", () => {
        assert.match(todayBind, /compositionstart/, "今日搜索 IME 守卫");
        assert.match(settingsNav, /compositionstart/, "设置搜索 IME 守卫");
        assert.match(reviewBind, /compositionstart/, "回顾历史/比较器搜索 IME 守卫");
        assert.match(reviewBind, /compareComposing/, "比较器独立组合态标记");
    });

    check("review more-menu toggle binding stays one-per-root across redraws (T-1790)", () => {
        /* 回顾页 root 在重绘时复用；重复绑定会让每次展开菜单重复执行滚动修正，
           最终表现为移动端菜单跳动/过滚。WeakMap + removeEventListener 保证幂等。 */
        assert.match(reviewBind, /const reviewMoreMenuToggleListeners = new WeakMap<HTMLElement, EventListener>\(\)/);
        assert.match(reviewBind, /const previousToggleListener = reviewMoreMenuToggleListeners\.get\(root\)/);
        assert.match(reviewBind, /root\.removeEventListener\("toggle", previousToggleListener, true\)/);
        assert.match(reviewBind, /const toggleListener: EventListener = \(event\) =>/);
        assert.match(reviewBind, /root\.addEventListener\("toggle", toggleListener, true\)/);
        assert.match(reviewBind, /reviewMoreMenuToggleListeners\.set\(root, toggleListener\)/);
    });

    check("today drag keyboard binding stays one-per-root across redraws", () => {
        /* Today root 复用而卡片节点替换；Alt+方向键委托监听必须有一次性守门，
           否则一次重排会重复写入顺序。 */
        assert.match(todayBindings, /if \(root\.dataset\.itemDragKeyboardBound === "true"\) return;/);
        assert.match(todayBindings, /root\.dataset\.itemDragKeyboardBound = "true";/);
        assert.match(todayBindings, /root\.addEventListener\("keydown", \(event\) => \{[\s\S]*host\.todaySortMode !== "manual"/);
    });

    check("reduced-motion reaches occasion drawer scrolling", () => {
        /* T-1613：滚动改 instant 消除 smooth 动画感知（方案 A），reducedMotion 仍在宿主接口。 */
        assert.match(occasionsBind, /behavior: "instant"/, "事项表单滚动使用 instant（消除 smooth 位移感知）");
        assert.match(occasionsBind, /reducedMotion\?: boolean/, "事项宿主接口声明 reducedMotion");
    });

    check("session-restore patterns exist for settings search, review views and today console", () => {
        assert.match(settingsNav, /searchSession\?: SettingsSearchSession/, "设置搜索会话由调用方 root context 提供");
        assert.match(indexSrc, /searchSession: this\.settingsStateForRoot\(root\)\.searchSession/, "设置搜索绑定使用所属 root 会话");
        assert.match(reviewBind, /renderReviewPreservingView\("/, "回顾视图保持焦点/选择恢复");
        assert.match(navigation, /insightsReturnPage/, "洞察返回页会话态");
    });

    check("shared page shell prototype covers every detail page (T-1576)", () => {
        assert.match(pageShell, /export function renderPageShellHead/, "页面壳头部单一构造点");
        assert.match(pageShell, /export function defaultReturnPage/, "契约 3 默认返回表");
        assert.match(pageShell, /export interface SurfaceContext/, "契约 1 SurfaceContext 形状");
        assert.match(pageShell, /export function readSurfaceContext/, "SurfaceContext 读侧");
        for (const [name, source] of [["editor", editor], ["archived", archived], ["occasions", occasions], ["settings", settings]]) {
            assert.ok(source.includes("renderPageShellHead("), `${name} 头部走共享壳`);
            assert.doesNotMatch(source, /<header class="lc-checkin__editor-header">/, `${name} 无内联头部残留`);
        }
        assert.ok(indexSrc.includes("renderPageShellHead("), "洞察两处头部走共享壳（index.ts）");
        assert.doesNotMatch(indexSrc, /lc-checkin__editor-header"><button class="lc-checkin__back-button"/, "洞察无内联头部残留");
        /* 兼容映射：DOM 钩子与类名保持原名，绑定与样式零改动（契约 4）。 */
        assert.match(pageShell, /data-action="back"/, "返回键钩子原名");
        assert.match(pageShell, /lc-checkin__back-button/, "返回键类名原名");
        assert.match(pageShell, /lc-checkin__eyebrow/, "上下文行类名原名");
        assert.match(pageShell, /lc-checkin__title/, "标题类名原名");
        /* 返回路径分派统一走 SurfaceContext 读侧。 */
        assert.match(reviewBind, /const context = readSurfaceContext\(\{\.\.\.host, \.\.\.insightsState, currentPage: pageForRoot\(\)/, "通用返回分派读取目标表面上下文");
        assert.match(reviewBind, /context\.page === "insights" && context\.returnTo === "review"/, "insights 会话返回栈优先");
    });

    check("SurfaceContext read side aggregates the full contract-1 param shape (T-1621 slice)", () => {
        /* 读侧扩参：只聚合既有会话态，字段可增不可改义（契约 1）。 */
        assert.match(pageShell, /export interface SurfaceContextParams/, "params 形状独立导出");
        for (const key of ["itemId", "date", "range", "workspace", "query", "filters"]) {
            assert.match(pageShell, new RegExp(key + "\\?:"), `params.${key} 在读侧形状内`);
        }
        for (const field of ["selectedHistoryDate", "summaryRange", "summaryCustomRange", "reviewWorkspace",
            "todayQuery", "historyQuery", "archivedQuery", "historyScope", "historySource", "historyOrder",
            "historyPage", "reminderFilter"]) {
            assert.match(pageShell, new RegExp(field + "\\?:"), `snapshot 聚合 ${field}`);
        }
        /* 聚合纪律：日期仅在 review day 钻取携带；过滤器默认值（all/newest/0）不进上下文。 */
        assert.match(pageShell, /historyScope === "day" && snapshot\.selectedHistoryDate/, "date 仅 day 钻取携带");
        assert.match(pageShell, /historySource !== "all"/, "source 默认值不进上下文");
        assert.match(pageShell, /historyOrder !== "newest"/, "order 默认值不进上下文");
        assert.match(pageShell, /snapshot\.historyPage\) filters\.page/, "page 0 不进上下文");
        /* 既有消费方（返回分派）不受扩参影响。 */
        assert.match(reviewBind, /const context = readSurfaceContext\(\{\.\.\.host, \.\.\.insightsState, currentPage: pageForRoot\(\)/, "读侧仍是返回分派单一入口");
    });

    check("fixed DOM ids are uniquified per render for multi-root isolation (T-1621 slice)", () => {
        /* 提醒中心标题：id 与 aria-labelledby 同源变量，按渲染次序唯一（settings settingsViewId 同法）。 */
        assert.doesNotMatch(review, /id="lc-reminder-center-title"/, "提醒中心标题不再使用固定 id");
        assert.match(review, /let reminderCenterSequence = 0;/, "渲染次序计数器在位");
        assert.match(review, /const reminderTitleId = `lc-reminder-center-title-\$\{\+\+reminderCenterSequence\}`;/, "标题 id 按次序生成");
        assert.match(review, /aria-labelledby="\$\{reminderTitleId\}"[\s\S]*?id="\$\{reminderTitleId\}"/, "aria 关联与 id 同源");
        /* 事项提醒预设：datalist id 与 input[list] 同源变量。 */
        assert.doesNotMatch(occasions, /list="lc-occasion-remind-presets"/, "事项预设不再引用固定 datalist id");
        assert.match(occasions, /const presetId = `lc-occasion-remind-presets-\$\{renderId\}`;/, "预设 id 绑定 root 实例");
        assert.match(occasions, /list="\$\{presetId\}"/, "input[list] 使用 root 实例 id");
        assert.match(occasions, /datalist id="\$\{presetId\}"/, "datalist id 与 list 同源");
    });

    check("visible copy goes through t() at the audit-named sites (T-1623)", () => {
        const i18nSource = read("src", "i18n.ts");
        /* t() 全量替换：split/join 而非单次 replace（重复占位符全替换）。 */
        assert.match(i18nSource, /text = text\.split\(`\{\$\{name\}\}`\)\.join\(String\(value\)\)/, "t() 必须全量替换占位符");
        assert.doesNotMatch(i18nSource, /text = text\.replace\(`\{\$\{name\}\}`/, "单次替换必须退役");
        /* 审计定位的硬编码点全部键化。 */
        assert.match(fragments, /t\("today\.focusCelebration"/, "专注庆祝走 t()");
        assert.doesNotMatch(fragments, /已完成 · \$\{ctx\.celebration/, "庆祝串无中文残留");
        const focusTimer = read("src", "render", "focus-timer.ts");
        assert.match(focusTimer, /t\("focus\.defaultItemName"\)/, "专注默认名走 t()");
        assert.match(focusTimer, /t\("focus\.noteMinutes"/, "专注备注走 t()");
        assert.doesNotMatch(focusTimer, /`专注 \$\{/, "专注备注无中文字面量残留");
        const editorBind = read("src", "render", "bind-editor.ts");
        assert.match(editorBind, /t\("editor\.quotaDatesLabel"\)/, "配额天数标签走 t()");
        assert.match(editorBind, /t\("editor\.quotaValueLabel"/, "配额数值标签走 t()");
        assert.match(editorBind, /t\("editor\.quotaDatesHelp"\)/, "配额天数帮助走 t()");
        assert.match(editorBind, /t\("editor\.quotaValueHelp"\)/, "配额数值帮助走 t()");
        const journalDialog = read("src", "render", "journal-dialog.ts");
        assert.match(journalDialog, /t\("common\.emptyValue"\)/, "问卷空值走 t()");
        const quickDialog = read("src", "render", "quick-dialog.ts");
        assert.match(quickDialog, /t\("quick\.openCheckin"\)/, "快捷动作打卡走 t()");
        assert.match(indexSrc, /t\("msg\.recordedToast"/, "已记录提示走 t()");
        assert.equal((indexSrc.match(/已记录 \$\{/g) || []).length, 0, "已记录无中文字面量残留");
        assert.match(review, /t\("review\.reminderTimes"/, "提醒次数摘要走 t()");
        /* 趋势标题/单位是持久化快照数据：呈现层映射本地化，存储标题原样回退。 */
        assert.match(review, /const presentTrend = \(key: "weekly" \| "monthly" \| "daily" \| "yearly"\)/, "趋势呈现层映射在位");
        assert.match(review, /近12周完成率/, "存储标题识别表覆盖周趋势");
        assert.match(review, /charts\.unitRecords/, "单位条/天映射本地化");
    });

    check("target cards opt out of the two-column row grid at every width (T-1615)", () => {
        const components = read("src", "ui", "components.scss");
        /* T-1616 批次二：卡片退役 settings-row 复用类——行栅格规则不再与卡竞争，
           卡自有类规则在所有容器宽度天然单列（D-322 豁免规则随之退役）。 */
        assert.doesNotMatch(settings, /lc-checkin__settings-row lc-checkin__document-target-card/, "doc cards must not reuse the settings-row class");
        assert.doesNotMatch(settings, /lc-checkin__settings-row lc-checkin__journal-target-card/, "journal card must not reuse the settings-row class");
        assert.doesNotMatch(settings, /lc-checkin__settings-row lc-checkin__notebook-target-card/, "notebook card must not reuse the settings-row class");
        assert.doesNotMatch(components, /settings-row:is\(\.lc-checkin__document-target-card/, "the D-322 exemption rule stays retired");
        /* 长目标摘要附 title 全值。 */
        assert.match(settings, /data-target-summary-label="\$\{escapeHtml\(docId\)\}" title="\$\{escapeHtml\(label\)\}"/, "target summary exposes full value via title");
        /* 缺失键改接既有键：今日清除筛选复用 today.clearFilter（不再引用不存在的 common.clearFilter）。 */
        assert.match(fragments, /t\("today\.clearFilter"\)/, "today clear-search reuses the existing key");
        assert.doesNotMatch(fragments, /common\.clearFilter/, "the phantom key must stay retired");
    });

    check("settings typography collapses onto shared tokens (T-1617)", () => {
        const tokens = read("src", "ui", "tokens.scss");
        const componentsSheet = read("src", "ui", "components.scss");
        const maintenance = read("src", "ui", "maintenance-responsive.scss");
        /* 三档令牌在档：标题 720 / 次级强调 650 / 帮助 11px（主题无关）。 */
        for (const token of ["--lc-checkin-settings-title-weight: 720", "--lc-checkin-settings-strong-weight: 650", "--lc-checkin-settings-help-size: 11px"]) {
            assert.ok(tokens.includes(token), `typography token must exist: ${token}`);
        }
        /* 设置面规则消费令牌（散布字重 620/640/660/700 在设置面退役）。 */
        for (const [pattern, prop] of [
            [/settings-card h2 \{[^}]*var\(--lc-checkin-settings-title-weight\)/, "title"],
            [/external-overview strong \{[^}]*var\(--lc-checkin-settings-title-weight\)/, "title"],
            [/settings-label > span \{ font-weight: var\(--lc-checkin-settings-strong-weight\)/, "strong"],
            [/source-panel-head > strong \{[^}]*var\(--lc-checkin-settings-strong-weight\)/, "strong"],
            [/settings-value \{[^}]*var\(--lc-checkin-settings-strong-weight\)/, "strong"],
            [/settings-fold > summary \{[^}]*var\(--lc-checkin-settings-strong-weight\)/, "strong"],
            [/settings-link \{[^}]*var\(--lc-checkin-settings-strong-weight\)/, "strong"],
            [/settings-group > summary \{[^}]*var\(--lc-checkin-settings-strong-weight\)/, "strong"],
        ]) {
            assert.match(componentsSheet, pattern, `rule must consume the ${prop} token: ${pattern.source.slice(0, 60)}`);
        }
        assert.match(componentsSheet, /\.lc-checkin \.lc-checkin--settings \.lc-checkin__settings-label small \{ color: var\(--lc-checkin-muted\); font-size: var\(--lc-checkin-settings-help-size\);/, "label help must consume the help-size token");
        /* 帮助字号单一来源：(0,3,0) 规则压过维护层基线，双档一致 11px。 */
        assert.match(componentsSheet, /\.lc-checkin \.lc-checkin--settings \.lc-checkin__settings-label small/, "label help must win the cascade deterministically");
        assert.match(maintenance, /font-size: var\(--lc-checkin-settings-help-size\)/, "maintenance baseline consumes the same token");
        assert.doesNotMatch(maintenance, /font-weight: 6[246]0;/, "stray 620/640/660 weights must leave maintenance too");
        /* 非设置面的 620 字重（日历/区块眉标/文件按钮等）不在本批范围。 */
    });

    check("unified document choice replaces the old dual boxes on all three target cards (T-1616)", () => {
        const indexSource = read("src", "index.ts");
        /* 统一选择器：三卡各有 per-point 搜索输入 + 候选行列表（combobox/listbox 关联）。 */
        assert.match(settings, /data-choice-search="\$\{point\}"/, "per-point search input");
        assert.match(settings, /data-choice-list="\$\{point\}"/, "per-point choice list");
        for (const point of ["diary", "summary", "health", "journal"]) {
            assert.match(settings, new RegExp(`documentChoiceBlock\\("${point}"`), `${point} card exposes the unified document choice`);
        }
        /* 候选行：名称 strong + 路径 small 双行预览（escapeHtml 由 host 接线保证）。 */
        assert.match(indexSource, /<strong>\$\{escapeHtml\(row\.name\)\}<\/strong><small>\$\{escapeHtml\(row\.path \|\| row\.id\)\}<\/small>/, "choice rows carry two-line metadata preview");
        /* 键盘与 IME：↓ 聚焦首项、列表内 ↑/↓ 环选、组合态冻结输入。 */
        assert.match(indexSource, /if \(event\.key !== "ArrowDown"\) return;/, "search input ArrowDown focuses the first option");
        assert.match(indexSource, /event\.key !== "ArrowDown" && event\.key !== "ArrowUp"\) return;/, "list ArrowUp/Down cycle is wired");
        assert.match(indexSource, /choiceComposing/, "IME composition guard is wired");
        /* 旧双框退役反向断言。 */
        assert.doesNotMatch(settings, /data-diary-search|data-diary-choice/, "old dual boxes stay retired");
        assert.doesNotMatch(indexSource, /runDiarySearchRequest/, "the select-filling request flow stays retired");
    });

    check("keyboard and screen-reader baseline paths stay wired (T-1606)", () => {
        /* j/k/方向键页面级导航：可见卡片过滤 + 主操作聚焦 + 输入聚焦守卫（today-bindings bindPageKeyboardFor）。 */
        assert.match(todayBindings, /const pageForRoot = \(\) => host\.pageForRoot \? host\.pageForRoot\(root\) : host\.currentPage;/, "键盘导航按所属 root 判断今日页");
        assert.doesNotMatch(todayBindings, /if \(host\.currentPage !== "today"\) return;/, "键盘导航不得读取宿主共享页面");
        assert.match(todayBindings, /target\?\.matches\("input, textarea, select, \[contenteditable='true'\]"\)/, "输入聚焦时 j/k 不劫持");
        assert.match(todayBindings, /\.lc-checkin__item\[data-item-id\]/, "j/k 在可见卡片间移动");
        assert.match(todayBindings, /visiblePrimaryAction\(cards\[next\], today\.bulkMode\) \?\? cards\[next\]\)\.focus\(\)/, "j/k 聚焦主操作按钮");
        /* 上下文菜单：Escape 收口并归还触发器焦点；菜单内方向键/Home/End/Tab 全路径。 */
        assert.match(todayBindings, /event\.key === "Escape" && root\.querySelector\("\.lc-checkin__item-context-menu"\)/, "Escape 关闭上下文菜单");
        assert.match(todayBindings, /if \(restoreFocus && trigger\?\.isConnected\) trigger\.focus\(\)/, "菜单收口归还触发器焦点");
        assert.match(todayBindings, /"ArrowDown", "ArrowUp"\]\.includes\(event\.key\)/, "菜单内方向键移动");
        /* 读屏状态：导航 aria-current 与选中态绑定（底栏/rail/topnav 三形态同构，T-1621 起按 root 当前页）、折叠 aria-expanded 渲染在位。 */
        assert.match(indexSrc, /const isSelected = \(navPage: string\) =>[\s\S]*?aria-current="\$\{isSelected\(navPage\) \? "page" : "false"\}"/, "导航 aria-current 绑定（per-root 页）");
        assert.match(indexSrc, /const isSelected = \(navPage: string\) =>[\s\S]*?aria-current="\$\{isSelected\(railPage\) \? "page" : "false"\}"/, "rail aria-current 绑定（per-root 页）");
        assert.match(fragments, /aria-expanded="\$\{!collapsed\}"/, "分组折叠 aria-expanded");
        assert.match(fragments, /aria-expanded="\$\{!ctx\.completedCollapsed\}"/, "已完成折叠 aria-expanded");
        /* IME 组合态四搜索面与 reduced-motion=既有块 2/3 承载，此处不重复。 */
    });

    check("navigation entry points stay on the shared showXxxFor single path", () => {
        assert.match(navigation, /editorReturnPage\?: "today" \| "review" \| "insights" \| "more"/, "编辑器单级返回栈字段在位（T-1599）");
        assert.match(navigation, /showEditorReturnFor/, "返回回放函数在位");
        assert.match(navigation, /returnTo === "review" \|\| returnTo === "insights" \|\| returnTo === "more" \? returnTo : "today"/, "返回页白名单校验（未知回落 today）");
        assert.match(editorBind, /host\.showEditorReturn\(root\)/, "编辑器返回走返回栈并保留表面上下文（不再固定 showToday）");
        assert.match(reviewBind, /host\.showEditor\(item, "insights", root\)/, "洞察编辑规则 CTA 携带返回页与表面上下文");
        assert.match(indexSrc, /private rootContexts = new Map<HTMLElement, RootContext>/, "宿主按 root 保存页面上下文");
        assert.match(indexSrc, /const page = (?:this\.pageForRoot\(root\)|this\.rootPages\.ensure\(root\)\.page)/, "渲染按 root 读取当前页");
        assert.match(pageShell, /scrollTops: Partial<Record<PageId, number>>/, "RootContext 持有 root 级滚动槽");
        assert.match(pageShell, /today\?: TodayRootContext/, "RootContext 持有 Today 会话态");
        assert.match(indexSrc, /public todayStateForRoot\(root: HTMLElement\): TodayRootContext/, "Today 会话态按 root 暴露");
        assert.match(todayBind, /host\.todayStateForRoot\?\.\(root\)/, "今日绑定器从所属 root 读取精确录入与附件会话");
        assert.match(todayBind, /const boundPage = pageForRoot\(\);[\s\S]*?const isCurrentSurface = \(\) => Boolean\(root\.isConnected\) && !host\.disposed && !host\.disposing && boundPage === "today" && pageForRoot\(\) === boundPage;/, "Today 绑定器捕获页面并复核 surface 生命周期");
        assert.match(todayBind, /reader\.onload = \(\) => \{[\s\S]*?if \(!isCurrentSurface\(\) \|\| !getActiveItemById\(host\.store, itemId\)\) return;/, "附件读取完成后不得写入过期 Today surface");
        assert.match(todayBind, /const currentElement = root\.querySelector<HTMLElement>\(`\[data-item-id=\"\$\{CSS\.escape\(itemId\)\}\"\]`\);/, "附件成功状态写入当前条目节点");
        assert.match(todayBind, /reader\.onerror = \(\) => \{[\s\S]*?if \(!isCurrentSurface\(\) \|\| !getActiveItemById\(host\.store, itemId\)\) return;/, "附件读取失败也不得向过期 Today surface 提示");
        assert.match(occasionsBind, /const boundPage = host\.pageForRoot \? host\.pageForRoot\(root\) : "occasions";[\s\S]*?const isCurrentSurface = \(\) => !host\.disposed && !host\.disposing[\s\S]*?host\.isSurfaceRoot\(root, "occasions"\)/, "事项绑定器捕获页面并复核 surface 生命周期");
        assert.match(occasionsBind, /const renderRoot = \(\) => \{ if \(isCurrentSurface\(\)\) host\.render\(root\); \};/, "事项旧 surface 不得重新渲染");
        assert.match(occasionsBind, /const id = button\.dataset\.occasionToitem \|\| "";[\s\S]*?createOccasionLinkedItem\(id, root\)/, "转打卡异步动作携带来源 root");
        assert.match(occasionsBind, /setOccasionCompleted\(id, missedDate, true, root\)/, "事项补记异步动作携带来源 root");
        assert.match(reviewBind, /setOccasionCompleted\(occasionId, date, false, root\)/, "回顾补记撤销异步动作携带来源 root");
        assert.match(reviewBind, /setOccasionCompleted\(id, occurrenceDate, true, root\)/, "回顾补记异步动作携带来源 root");
        assert.match(todayBind, /setOccasionCompleted\(id, occurrenceDate, !isOccasionCompleted\(item, occurrenceDate\), root\)/, "今日事项完成异步动作携带来源 root");
        assert.match(occasionsBind, /saveOccasionOverride!\(id, confirmButton\.dataset\.occasionMoveOrigin \|\| "", dateInput\.value, root\)/, "事项改期异步动作携带来源 root");
        assert.match(occasionsBind, /persistOccasions\(root\)/, "事项删除持久化携带来源 root");
        assert.match(indexSrc, /private async persistOccasions\(root\?: HTMLElement\): Promise<void>;[\s\S]*?private async persistOccasions\(store: OccasionStore, root\?: HTMLElement\): Promise<void>;[\s\S]*?storeOrRoot: OccasionStore \| HTMLElement/, "事项持久化保留来源 root 以过滤迟到提示");
        assert.match(indexSrc, /this\.saveQueue = write\.catch\(\(error\) => \{[\s\S]*?surfaceRoot[\s\S]*?this\.isCurrentOccasionSurface\(surfaceRoot\)/, "事项持久化失败只向当前 surface 提示");
        assert.match(indexSrc, /private async createOccasionLinkedItem\(occasionId: string, root\?: HTMLElement\)/, "事项转打卡支持来源 root 生命周期守门");
        assert.match(indexSrc, /private async setOccasionCompleted\(id: string, occurrenceDate: string, completed: boolean, root\?: HTMLElement\)/, "事项完成回调支持来源 root 生命周期守门");
        assert.match(indexSrc, /private saveOccasionOverride\(id: string, originalDate: string, newDate: string, root\?: HTMLElement\)/, "事项改期回调支持来源 root 生命周期守门");
        assert.match(todayBind, /quickEntryCancelled = todayState\?\.quickEntryCancelled/, "快速录入取消令牌按 root 保存");
        assert.match(todayBind, /setPriorityReminderExpanded/, "优先提醒展开态按 root 保存");
        assert.match(todayBindings, /todayBulkStateFor\(host, root\)/, "批量与键盘绑定器从所属 root 读取批量会话");
        assert.match(todayBindings, /host\.render\(root\)/, "Today 批量动作只重绘所属 root");
        assert.match(todayBindings, /host\.showEditor\(item, undefined, root\)/, "Today 键盘/上下文编辑入口携带 root");
        assert.match(todayBindings, /host\.showInsights\(item, root\)/, "Today 上下文洞察入口携带 root");
        assert.doesNotMatch(todayBind, /host\.insightsReturnPage\s*=/, "Today 洞察入口不得写宿主共享返回页");
        assert.doesNotMatch(reviewBind, /host\.insightsReturnPage\s*=\s*"review"/, "洞察记录入口不得写宿主共享返回页");
        assert.match(indexSrc, /this\.showInsights\(item, root\)/, "局部 Today 刷新后的洞察入口保留所属 root");
        assert.match(indexSrc, /context\.renderedPage/, "渲染页标记归 root context");
        assert.match(indexSrc, /public setPendingFocusItem\(root: HTMLElement, itemId: string\)/, "焦点恢复登记要求显式 root");
        assert.match(indexSrc, /private renderBackgroundUpdate\(\)[\s\S]*?clearPendingFocusItems\(localItemId\)/, "局部 Today 刷新只消费当前事项的焦点请求");
        assert.match(indexSrc, /public clearPendingFocusItems\(itemId\?: string\)/, "焦点清理支持按事项隔离多 root 请求");
        assert.doesNotMatch(todayBind, /host\.pendingFocusItemId\s*=/, "今日绑定器不得再写全局焦点字段");
        assert.match(todayBind, /host\.setPendingFocusItem\(root, item\.id\)/, "今日记录动作写入所属 root");
        assert.match(navigation, /host\.setPageForRoot\(page, root\)/, "导航按 root 写入当前页");
        assert.match(navigation, /host\.render\(root\)/, "导航只重绘目标 root");
        assert.match(todayBind, /host\.showInsights\(item, root\)/, "今日页洞察入口携带 root");
        assert.match(reviewBind, /host\.showReview\(root\)/, "回顾页返回入口携带 root");
        assert.match(indexSrc, /public isSurfaceRoot\(root: HTMLElement, page\?: PageId\)/, "root 生命周期检查入口在位");
        assert.match(indexSrc, /this\.rootContexts\.clear\(\);[\s\S]{0,140}this\.activeRoot = undefined;/, "重载清理旧 root 会话");
        assert.match(indexSrc, /if \(this\.rootContexts\.get\(root\)\?\.page === "review"\) this\.cancelReviewSummary\(root\)/, "关闭 root 取消回顾异步请求");
        assert.match(indexSrc, /if \(!this\.rootContexts\.has\(root\)\) return;/, "关闭 root 拒绝重新渲染");
        assert.match(indexSrc, /root\.isConnected[\s\S]{0,80}all\.indexOf\(root\) === index/, "root registry excludes detached surfaces");
        assert.match(indexSrc, /this\.rootContexts\.has\(root\) && root\.isConnected/, "targeted render rejects detached surfaces");
        assert.match(indexSrc, /if \(!root\.isConnected\) return;/, "renderInto rejects a detached root before mutating it");
        assert.match(occasionSession, /host\.isSurfaceRoot && !host\.isSurfaceRoot\(root, "occasions"\)/, "事项异步回调不重新注册关闭 root");
        assert.match(editorBind, /if \(!isCurrentSession\(\) \|\| !selectedButton\.isConnected\) return;[\s\S]{0,500}if \(created > 0\) \{[\s\S]{0,120}host\.showToday\(root\)/, "编辑器组合包异步成功只导航当前 root");
        assert.match(editorBind, /if \(!isCurrentSession\(\) \|\| !bulkButton\.isConnected\) return;[\s\S]{0,500}if \(created > 0\) \{[\s\S]{0,120}host\.showToday\(root\);/, "编辑器批量组合包不唤醒过期 root");
        assert.match(editorBind, /if \(!isCurrentSession\(\) \|\| !anchorInput\?\.isConnected \|\| root\.querySelector\("input\[name='anchorBlockId'\]"\) !== anchorInput\) return;[\s\S]*?anchorInput\.value = blockId/, "锚点创建成功后不得写入过期编辑器控件");
        const ensureVisibleBlock = editorBind.match(/const ensureEditorVisible[\s\S]*?\n    \};/);
        assert.ok(ensureVisibleBlock, "编辑器可见性辅助函数应保持有界回调");
        assert.match(ensureVisibleBlock[0], /isCurrentSession\(\)/, "延迟滚动必须复核当前编辑器会话");
        assert.match(ensureVisibleBlock[0], /element\.isConnected/, "延迟滚动不得操作 detached 控件");
        assert.match(ensureVisibleBlock[0], /root\.contains\(element\)/, "延迟滚动必须留在原 surface 内");
        assert.match(editorBind, /inferenceTimer = setTimeout\(\(\) => \{[\s\S]*?isCurrentSession\(\)[\s\S]*?renderNameInference\(\);/, "名称联想 debounce 必须服从编辑器会话生命周期");
        assert.match(editorBind, /const icon = await readImageBlob\(file\);[\s\S]*?if \(!isCurrentSession\(\)\) return;[\s\S]*?applyLocalIcon\(icon, t\("msg\.upload"\)\)/, "本地图标读取完成后必须复核编辑器会话");
        assert.match(editorBind, /const icon = await readImageBlob\(blob\);[\s\S]*?if \(!isCurrentSession\(\)\) return;[\s\S]*?applyLocalIcon\(icon, t\("msg\.download"\)\)/, "远程图标读取完成后必须复核编辑器会话");
        assert.match(editorBind, /if \(!isCurrentSession\(\)\) return;[\s\S]*?msg\.iconImported[\s\S]*?host\.render\(\)/, "图标库导入完成后仅活跃会话可触发共享重绘");
        assert.match(editorBind, /if \(isCurrentSession\(\)\) showMessage\(t\("msg\.templateDeleted"\)\);[\s\S]*?host\.render\(\)/, "模板删除只在当前会话提示，成功后保持共享重绘");
        assert.match(editorBind, /if \(isCurrentSession\(\)\) showMessage\(t\("msg\.templateSaved"\)\);[\s\S]*?host\.render\(\)/, "模板保存只在当前会话提示，成功后保持共享重绘");
        assert.match(navigation, /\.catch\(\(error\) => \{[\s\S]*?if \(host\.disposed \|\| host\.disposing\) return;[\s\S]*?showMessage/, "tab 打开失败在卸载后不得重新打开 UI");
        assert.match(reviewBind, /const boundPage = pageForRoot\(\);[\s\S]*?const isCurrentSurface = \(\) => root\.isConnected && !host\.disposed && !host\.disposing && pageForRoot\(\) === boundPage;/, "回顾绑定器捕获页面并复核 surface 生命周期");
        assert.match(reviewBind, /if \(ok && isCurrentSurface\(\)\) showCatchUpToast/, "逾期补记完成后只向当前 surface 显示撤销提示");
        assert.match(reviewBind, /runWeeklyTool\(\(\) => host\.saveWeeklyReviewDraft\?\.\(weekKey, friction, adjustment\)[\s\S]*?review\.weeklySaved/, "周复盘保存完成不得写入过期状态行");
        assert.match(reviewBind, /runWeeklyTool\(\(\) => host\.clearWeeklyReviewDraft\?\.\(weekKey\)[\s\S]*?review\.weeklyClearFail/, "周复盘清除完成不得清空过期输入框");
        assert.match(reviewBind, /recordHistoryBatch\([^\n]+\);[\s\S]*?if \(!isCurrentSurface\(\)\) return;[\s\S]*?review\.batchDone/, "批量补记完成后不得向过期回顾页提示或重绘");
        assert.match(reviewBind, /try \{ await host\.persist\(\); \} catch \{[\s\S]*?if \(isCurrentSurface\(\)\) showMessage\(t\("msg\.undoFail"\)\)/, "记录删除失败只在当前 surface 提示");
        assert.match(reviewBind, /Promise\.resolve\(\)\.then\(operation\)\.catch\(\(\) => undefined\)\.finally\(\(\) => \{[\s\S]*?if \(!isCurrentSurface\(\)\) return;/, "归档异步动作完成后不得恢复过期控件状态");
        assert.match(reviewBind, /await navigator\.clipboard\.writeText\(markdown\);[\s\S]*?if \(isCurrentSurface\(\)\) showMessage\(t\("msg\.reportCopied"\)\)/, "报告复制完成后只在当前 surface 提示");
        assert.match(indexSrc, /openReviewRecordsForSource\(source: string, root\?: HTMLElement\)/, "设置来源跳转携带 root");
        assert.match(indexSrc, /this\.showReview\(root\)/, "设置来源跳转只作用于所属 root");
        for (const fn of ["showTodayFor", "showReviewFor", "showArchivedFor", "showEditorFor", "showInsightsFor"]) {
            assert.match(navigation, new RegExp(`export function ${fn}`), `导航单一路径 ${fn} 在 navigation.ts`);
        }
    });

    check("multi-root pages stay independent via the RootContext proxy (T-1621 step 1)", () => {
        /* 存储模块与宿主代理层：每 root 独立上下文，宿主 currentPage 为读写代理。 */
        assert.match(indexSrc, /import \{createRootPageStore, type CheckinPageId, type RootPageStore\} from "\.\/features\/root-page-store";/, "root-page-store 模块导入");
        assert.match(indexSrc, /private readonly rootPages: RootPageStore = createRootPageStore\(\);/, "宿主持有 per-root 存储");
        assert.match(indexSrc, /private get currentPage\(\): CheckinPageId \{[\s\S]*?active\?\.page \?\? this\.rootPages\.activePage\(\);/, "currentPage 读代理=最后活跃 root");
        assert.match(indexSrc, /private set currentPage\(page: CheckinPageId\) \{[\s\S]*?this\.rootPages\.navigate\(undefined, page\);/, "currentPage 写代理保留无 root 的全局兼容语义");
        assert.match(indexSrc, /applyNavigation\(root: HTMLElement \| undefined, page: CheckinPageId\): boolean \{[\s\S]*?this\.setPageForRoot\(page, root\);/, "导航落点 host 方法（含草稿守卫结果）");
        assert.match(indexSrc, /releaseRootContext\(root: HTMLElement\): void/, "root 销毁释放入口");
        assert.match(indexSrc, /const fallback = this\.dockElement \?\? this\.tabElement \?\? null;/, "最后活跃释放回落 dock→页签");
        /* renderInto 注册点与按 root 取页。 */
        assert.match(indexSrc, /const page = (?:this\.rootPages\.ensure\(root\)\.page|this\.pageForRoot\(root\));/, "renderInto 按 root 注册并取页");
        assert.match(indexSrc, /roots\.some\(\(surface\) => this\.pageForRoot\(surface\) === "review"\)/, "回顾快照按任一回顾 root 判定");
        assert.doesNotMatch(indexSrc, /root\.innerHTML = this\.currentPage === "editor"/, "页面选择不再读宿主代理页");
        /* 导航 chrome 按 root 页高亮。 */
        assert.match(indexSrc, /this\.renderMobileTopbar\(page\)/, "移动顶栏按 root 页");
        assert.match(indexSrc, /this\.renderRail\(page(?:, context\.moreActive)?\)/, "rail 按 root 页");
        assert.match(indexSrc, /this\.renderTopNav\(root, page(?:, context\.moreActive)?\)/, "桌面顶栏按 root 页");
        assert.match(indexSrc, /this\.renderMobileNav\(page(?:, context\.moreActive)?\)/, "底栏按 root 页");
        assert.match(indexSrc, /this\.getPageTitle\(page\)/, "页标题按 root 页");
        assert.doesNotMatch(indexSrc, /aria-current="\$\{this\.currentPage === page/, "导航高亮不再读宿主代理页");
        /* dock/页签销毁释放上下文。 */
        assert.match(indexSrc, /plugin\.releaseRootContext\(plugin\.dockElement\);/, "dock 卸载释放上下文");
        assert.match(indexSrc, /plugin\.releaseRootContext\(plugin\.tabElement\);/, "页签卸载释放上下文");
        /* 渲染块跳转走 primaryRoot（dock 优先、页签回落）。 */
        assert.match(indexSrc, /this\.jumpToHistoryDate\(date, this\.primaryRoot\(\)\)/, "渲染块日期跳转按 primaryRoot");
        assert.match(indexSrc, /this\.showInsights\(item, this\.primaryRoot\(\)\)/, "渲染块项目跳转按 primaryRoot");
        /* 导航函数：可选 root + applyNavigation 单一落点；导航函数不再写宿主代理页。 */
        assert.match(navigation, /applyNavigation\(root: HTMLElement \| undefined, page: CheckinPageId\): boolean;/, "NavigationHost 导航落点契约");
        assert.match(navigation, /pageOfRoot\(root: HTMLElement\): CheckinPageId;/, "NavigationHost per-root 读页契约");
        for (const fn of ["showTodayFor", "showReviewFor", "showArchivedFor", "showOccasionsFor", "showSettingsFor"]) {
            assert.match(navigation, new RegExp(`export function ${fn}\\(host: NavigationHost, root\\?: HTMLElement\\): void`), `${fn} 接受可选 root`);
        }
        assert.match(navigation, /export function showInsightsFor\(host: NavigationHost, item\?: CheckinItem, root\?: HTMLElement\): void/, "showInsightsFor 接受可选 root");
        assert.match(navigation, /export function showEditorFor\(host: NavigationHost, item\?: CheckinItem, returnTo\?: NavigationHost\["editorReturnPage"\], root\?: HTMLElement\): void/, "showEditorFor 接受可选 root");
        assert.match(navigation, /const currentPage = root && host\.pageForRoot \? host\.pageForRoot\(root\) : host\.currentPage;/, "洞察返回页读取发起表面");
        assert.match(navigation, /const returnPage = currentPage === "review" \? "review"/, "洞察返回页按发起表面判定");
        assert.match(navigation, /if \(!setPage\(host, "insights", root\)\) return;/, "洞察导航走统一落点");
        const navWrites = navigation.match(/host\.currentPage = "/g) || [];
        assert.equal(navWrites.length, 1, "导航函数仅 openTabPageFor 保留宿主级写（页签继承孤儿页）");
        /* 分发层：rail/底栏/顶栏导航只落在发起表面。 */
        assert.match(pluginOps, /if \(page === "today"\) host\.showToday\(root\);/, "底栏今日按发起表面");
        assert.match(pluginOps, /else if \(page === "record"\) \{[\s\S]*host\.quickDialogElement === root[\s\S]*host\.showEditor\(undefined, undefined, root\)[\s\S]*else host\.openQuickDialog\(\);/, "底栏记录在快速弹窗内进入编辑器，其他表面打开快速弹窗");
        /* T-1805：后台来源必须按每个注册 surface 的页面刷新；最后活跃
           currentPage 只是兼容代理，不能让 dock Today 与 tab Editor 串台。 */
        assert.match(pluginOps, /const roots = host\.roots\?\.\(\) \|\| \[\];/, "后台刷新枚举已注册 surfaces");
        assert.match(pluginOps, /roots\.filter\(\(root\) => pageForRoot\(root\) !== "editor"\)\.forEach\(\(root\) => host\.render\(root\)\)/, "后台刷新逐 root 跳过编辑器并重绘其他页面");
        assert.match(pluginOps, /host\.render\(typingRoot\)/, "输入失焦只刷新触发该事件的 Today root");
        assert.match(indexSrc, /public isTypingInTodayInputFor\(root: HTMLElement\)/, "宿主提供 root-aware Today 输入检测");
        /* bind 层抽查：返回/跳转携带 root。 */
        assert.match(todayBind, /host\.showSettings\(root\)/, "今日→设置按发起表面");
        assert.match(reviewBind, /host\.jumpToHistoryDate\(date, root\)/, "回顾日历跳转按发起表面");
        assert.match(occasionsBind, /showEditorForLinkedItem\?\(itemId: string, root\?: HTMLElement\)/, "事项关联编辑入口接受发起 root");
        assert.match(occasionsBind, /host\.showEditorForLinkedItem\(id, root\)/, "事项关联编辑入口按发起表面");
        assert.match(indexSrc, /private showEditorForLinkedItem\(itemId: string, root\?: HTMLElement\)/, "宿主关联编辑入口接受 root");
        assert.match(indexSrc, /this\.showEditor\(item, undefined, root \|\| this\.rootPages\.lastActiveRoot\(\) \|\| undefined\)/, "关联编辑回退到最后活跃 root");
        assert.match(editorBind, /host\.showEditorReturn\(root\)/, "编辑器返回按发起表面");
        /* 快速弹窗页记忆归弹窗 root（行为断言在 mobile-dialog）。 */
        assert.match(quickDialog, /host\.applyNavigation\(host\.quickDialogElement, "today"\);/, "弹窗重置只落弹窗 root");
        assert.doesNotMatch(quickDialog, /host\.currentPage = lastQuickPage;/, "弹窗关闭不再写宿主代理页");
    });

    console.log(`Cross-page consistency: ${checks} checks passed.`);
} finally {
    /* 无时区/临时目录副作用。 */
}
