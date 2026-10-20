const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* 顶栏图标稳定性与重绘防抖守门测试：
   验证：
   1. 顶栏在不同宽度（包括 < 720px）下，图标与导航项不被 display:none 粗暴抹除；
   2. 顶栏所有关键图标（avatar, tabs, actions）拥有显式可靠的 18px SVG 规则，杜绝重绘坍缩；
   3. bindNavOverflowHintFor 纯内部横向滚动，禁止调用 scrollIntoView 导致祖先容器纵向漂移；
   4. renderBackgroundUpdateFor 在用户输入时挂起全量重绘，杜绝暴力重绘打断与闪烁；
   5. renderInto 统一闭环绑定 bindDialogClose、bindMobileNav 与 normalizeUiIcons。 */

const root = path.join(__dirname, "..");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcPluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcWorkbench = fs.readFileSync(path.join(root, "src", "ui", "workbench.scss"), "utf8");

/* —— 断言 1：renderInto 统一闭环绑定与图标归一 —— */
assert.match(
    srcIndex,
    /this\.bindDialogClose\(root\);\s*this\.bindMobileNav\(root\);\s*this\.normalizeUiIcons\(root\);/,
    "renderInto 必须在所有页面收尾处统一绑定 bindDialogClose、bindMobileNav 与 normalizeUiIcons",
);

/* —— 断言 2：bindNavOverflowHintFor 禁止调用 scrollIntoView —— */
assert.doesNotMatch(
    srcPluginOps,
    /selected\?\.scrollIntoView/,
    "bindNavOverflowHintFor 绝不能调用 scrollIntoView，避免父容器被纵向滚动把顶栏推到屏幕外",
);
assert.match(
    srcPluginOps,
    /scroller\.scrollLeft = Math\.max\(0, right - scroller\.clientWidth\);/,
    "bindNavOverflowHintFor 必须使用局部 scroller.scrollLeft 计算保持选中项可见",
);

/* —— 断言 3：renderBackgroundUpdateFor 用户输入时挂起全量重绘 —— */
assert.match(
    srcPluginOps,
    /if \(active && root\.contains\(active\) && active\.matches\("input, textarea, select, \[contenteditable='true'\]"\)\)/,
    "renderBackgroundUpdateFor 必须在当前 root 包含活动输入控件时挂起后台重绘，避免用户输入时突然被重绘打断",
);

/* —— 断言 4：workbench.scss 中弹窗与页签顶栏在 < 720px 不被暴力隐藏 —— */
assert.doesNotMatch(
    srcWorkbench,
    /@container lc-dialog \(max-width: 719px\) \{\s*\.lc-checkin__topnav-brand, \.lc-checkin__topnav-tabs \{ display: none; \}/,
    "workbench.scss 不能在 719px 时将弹窗顶栏图标和导航暴力隐藏",
);
assert.doesNotMatch(
    srcWorkbench,
    /@container lc-tab \(max-width: 719px\) \{\s*\.lc-checkin-tab-host > \.lc-checkin__topnav \{ display: none; \}/,
    "workbench.scss 不能在 719px 时将分屏 Tab 顶栏直接 display: none 导致导航完全消失",
);

/* —— 断言 5：components.scss 中顶栏图标拥有确定尺寸与描边保护 —— */
assert.match(
    srcComponents,
    /\.lc-checkin__topnav-tabs button span svg,\s*\.lc-checkin__topnav-avatar svg,\s*\.lc-checkin__topnav-action svg \{\s*display: block;\s*width: 18px;\s*height: 18px;\s*fill: none;\s*stroke: currentColor;\s*stroke-width: 1\.8;\s*\}/,
    "components.scss 必须为顶栏所有 SVG 图标提供显式尺寸与描边规则，杜绝计算延迟坍缩为 0",
);

console.log("topnav-render-stability: all assertions passed successfully.");
