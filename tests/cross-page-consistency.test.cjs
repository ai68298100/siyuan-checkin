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
const pageShell = read("src", "render", "page-shell.ts");
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

    check("reduced-motion reaches occasion drawer scrolling", () => {
        /* T-1613：滚动改 instant 消除 smooth 动画感知（方案 A），reducedMotion 仍在宿主接口。 */
        assert.match(occasionsBind, /behavior: "instant"/, "事项表单滚动使用 instant（消除 smooth 位移感知）");
        assert.match(occasionsBind, /reducedMotion\?: boolean/, "事项宿主接口声明 reducedMotion");
    });

    check("session-restore patterns exist for settings search, review views and today console", () => {
        assert.match(settingsNav, /searchSessionState/, "设置搜索会话恢复（WeakMap）");
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
        assert.match(reviewBind, /const context = readSurfaceContext\(host\)/, "通用返回分派走读侧");
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
        assert.match(reviewBind, /const context = readSurfaceContext\(host\)/, "读侧仍是返回分派单一入口");
    });

    check("fixed DOM ids are uniquified per render for multi-root isolation (T-1621 slice)", () => {
        /* 提醒中心标题：id 与 aria-labelledby 同源变量，按渲染次序唯一（settings settingsViewId 同法）。 */
        assert.doesNotMatch(review, /id="lc-reminder-center-title"/, "提醒中心标题不再使用固定 id");
        assert.match(review, /let reminderCenterSequence = 0;/, "渲染次序计数器在位");
        assert.match(review, /const reminderTitleId = `lc-reminder-center-title-\$\{\+\+reminderCenterSequence\}`;/, "标题 id 按次序生成");
        assert.match(review, /aria-labelledby="\$\{reminderTitleId\}"[\s\S]*?id="\$\{reminderTitleId\}"/, "aria 关联与 id 同源");
        /* 事项提醒预设：datalist id 与 input[list] 同源变量。 */
        assert.doesNotMatch(occasions, /list="lc-occasion-remind-presets"/, "事项预设不再引用固定 datalist id");
        assert.match(occasions, /let remindPresetsSequence = 0;/, "预设计数器在位");
        assert.match(occasions, /list="lc-occasion-remind-presets-\$\{\+\+remindPresetsSequence\}"/, "input[list] 按次序生成");
        assert.match(occasions, /datalist id="lc-occasion-remind-presets-\$\{remindPresetsSequence\}"/, "datalist id 与 list 同源");
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
        assert.match(todayBindings, /if \(host\.currentPage !== "today"\) return;/, "j/k 仅今日页生效");
        assert.match(todayBindings, /target\?\.matches\("input, textarea, select, \[contenteditable='true'\]"\)/, "输入聚焦时 j/k 不劫持");
        assert.match(todayBindings, /\.lc-checkin__item\[data-item-id\]/, "j/k 在可见卡片间移动");
        assert.match(todayBindings, /visiblePrimaryAction\(cards\[next\], host\.bulkMode\) \?\? cards\[next\]\)\.focus\(\)/, "j/k 聚焦主操作按钮");
        /* 上下文菜单：Escape 收口并归还触发器焦点；菜单内方向键/Home/End/Tab 全路径。 */
        assert.match(todayBindings, /event\.key === "Escape" && root\.querySelector\("\.lc-checkin__item-context-menu"\)/, "Escape 关闭上下文菜单");
        assert.match(todayBindings, /if \(restoreFocus && trigger\?\.isConnected\) trigger\.focus\(\)/, "菜单收口归还触发器焦点");
        assert.match(todayBindings, /"ArrowDown", "ArrowUp"\]\.includes\(event\.key\)/, "菜单内方向键移动");
        /* 读屏状态：导航 aria-current 与选中态绑定（底栏/rail/topnav 三形态同构）、折叠 aria-expanded 渲染在位。 */
        assert.match(indexSrc, /aria-current="\$\{this\.currentPage === page \? "page" : "false"\}"/, "导航 aria-current 绑定");
        assert.match(fragments, /aria-expanded="\$\{!collapsed\}"/, "分组折叠 aria-expanded");
        assert.match(fragments, /aria-expanded="\$\{!ctx\.completedCollapsed\}"/, "已完成折叠 aria-expanded");
        /* IME 组合态四搜索面与 reduced-motion=既有块 2/3 承载，此处不重复。 */
    });

    check("navigation entry points stay on the shared showXxxFor single path", () => {
        assert.match(navigation, /editorReturnPage\?: "today" \| "review" \| "insights"/, "编辑器单级返回栈字段在位（T-1599）");
        assert.match(navigation, /showEditorReturnFor/, "返回回放函数在位");
        assert.match(navigation, /returnTo === "review" \|\| returnTo === "insights" \? returnTo : "today"/, "返回页白名单校验（未知回落 today）");
        assert.match(editorBind, /host\.showEditorReturn\(\)/, "编辑器返回走返回栈（不再固定 showToday）");
        assert.match(reviewBind, /host\.showEditor\(item, "insights"\)/, "洞察编辑规则 CTA 携带返回页");
        for (const fn of ["showTodayFor", "showReviewFor", "showArchivedFor", "showEditorFor", "showInsightsFor"]) {
            assert.match(navigation, new RegExp(`export function ${fn}`), `导航单一路径 ${fn} 在 navigation.ts`);
        }
    });

    console.log(`Cross-page consistency: ${checks} checks passed.`);
} finally {
    /* 无时区/临时目录副作用。 */
}
