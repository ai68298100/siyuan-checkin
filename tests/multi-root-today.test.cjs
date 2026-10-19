const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1804 & T-1805 守门测试：多 root Today 搜索/焦点隔离与后台刷新草稿保护（D-384）。
   T-1804: focusTodaySearchFor 支持传入发起 root 定向聚焦，避免 dock 抢走 tab/quick 搜索焦点；
           setPendingFocusFor 按 root 隔离 pendingFocusItemId，避免 dock 消费掉 quick/tab 的打卡归位焦点；
   T-1805: renderBackgroundUpdateFor 逐 root 检查 pageOfRoot(root)，非编辑页正常刷新，
           编辑页跳过重绘以保护 DOM 表单草稿。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：plugin-ops.ts 源码结构钉 */
const opsSource = fs.readFileSync(path.join(sourceRoot, "plugin-ops.ts"), "utf8");
assert.match(
    opsSource,
    /export function focusTodaySearchFor\(host: PluginOpsHost, selection\?: number, root\?: HTMLElement\): void/,
    "T-1804: focusTodaySearchFor accepts optional root parameter",
);
assert.match(
    opsSource,
    /const roots = root \? \[root\] : \[host\.dockElement, host\.tabElement, host\.quickDialogElement\]/,
    "T-1804: focusTodaySearchFor restricts candidates to root if provided",
);
assert.match(
    opsSource,
    /pageOfRoot\?\(root: HTMLElement\): "today" \| "editor" \| "review" \| "archived" \| "insights" \| "occasions" \| "settings"/,
    "T-1805: PluginOpsHost declares pageOfRoot contract",
);
assert.match(
    opsSource,
    /const page = host\.pageOfRoot \? host\.pageOfRoot\(root\) : host\.currentPage;[\s\S]*?if \(page === "editor"\) return;[\s\S]*?host\.renderInto\(root\);/,
    "T-1805: renderBackgroundUpdateFor protects editor roots and updates non-editor roots",
);

/* 断言 2：bind-today.ts 接线钉 */
const todayBindSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-today.ts"), "utf8");
assert.match(
    todayBindSource,
    /focusTodaySearch\(cursor\?: number, root\?: HTMLElement\): void;/,
    "T-1804: BindTodayHost.focusTodaySearch accepts optional root",
);
assert.match(
    todayBindSource,
    /setPendingFocusFor\?\(itemId: string, root: HTMLElement\): void;/,
    "T-1804: BindTodayHost declares setPendingFocusFor",
);
assert.match(
    todayBindSource,
    /host\.focusTodaySearch\(value\.length, root\);/,
    "T-1804: today search input passes root to focusTodaySearch",
);
assert.match(
    todayBindSource,
    /host\.setPendingFocusFor\?\.?\(itemId,\s*root\);/,
    "T-1804: markPendingFocus delegates to host.setPendingFocusFor with root",
);

/* 断言 3：index.ts 接线钉 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(
    indexSource,
    /private pendingFocusByRoot = new WeakMap<HTMLElement, string>\(\);/,
    "T-1804: index.ts declares pendingFocusByRoot WeakMap",
);
assert.match(
    indexSource,
    /private setPendingFocusFor\(itemId: string, root: HTMLElement\): void/,
    "T-1804: index.ts implements setPendingFocusFor",
);
assert.match(
    indexSource,
    /const focusItemId = this\.pendingFocusByRoot\.get\(root\) \?\? \(root === this\.rootPages\.lastActiveRoot\(\) \? this\.pendingFocusItemId : undefined\);/,
    "T-1804: renderInto checks pendingFocusByRoot first",
);

/* 断言 4：行为级模拟测试 */
const ts = require("typescript");
const fnMatch = opsSource.match(/export function renderBackgroundUpdateFor\(host: PluginOpsHost\): void \{[\s\S]*?\n\}/);
assert.ok(fnMatch, "found renderBackgroundUpdateFor in source");
const transpiled = ts.transpileModule(fnMatch[0], {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const renderBackgroundUpdateFor = new Function("exports", `${transpiled}; return renderBackgroundUpdateFor;`)({});

const dockEl = {name: "dock"};
const dialogEl = {name: "dialog"};
const renderedRoots = [];

const mockHost = {
    dockElement: dockEl,
    quickDialogElement: dialogEl,
    pageOfRoot: (root) => root === dialogEl ? "editor" : "today",
    renderInto: (root) => { renderedRoots.push(root); },
    render: () => { renderedRoots.push("global"); },
};

renderBackgroundUpdateFor(mockHost);
assert.equal(renderedRoots.length, 1, "only 1 root is updated");
assert.equal(renderedRoots[0], dockEl, "dock (today) is updated, dialog (editor) is skipped");

console.log("multi-root-today: all assertions passed");
