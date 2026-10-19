const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1809 & T-1810 守门测试：事项返回、关联编辑与历史/Today 导航统一传递 owning root（D-382）。
   T-1809: bind-occasions 事项页返回调用 showToday(root)、关联项目编辑调用 showEditorForLinkedItem(id, root)，
           避免在多 surface 同屏（dock/tab/quick）时切错最后活跃表面；
   T-1810: bind-page-navigation 的 [data-history-insights-id] 调 showInsights(item, root)，
           today-bindings 的键盘 'e' 键与右键菜单编辑/洞察入口统一传入 root 参数，确保跨表面导航与返回栈严格隔离。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：bind-occasions.ts 源码结构钉 */
const occasionsSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-occasions.ts"), "utf8");
assert.match(
    occasionsSource,
    /showToday\(root\?: HTMLElement\): void;/,
    "T-1809: BindOccasionsHost.showToday accepts optional root parameter",
);
assert.match(
    occasionsSource,
    /showEditorForLinkedItem\?\(itemId: string, root\?: HTMLElement\): void;/,
    "T-1809: BindOccasionsHost.showEditorForLinkedItem accepts optional root parameter",
);
assert.match(
    occasionsSource,
    /data-action='occasion-back'[\s\S]*?host\.showToday\(root\)/,
    "T-1809: occasion back action passes root to showToday",
);
assert.match(
    occasionsSource,
    /data-occasion-linked-edit[\s\S]*?host\.showEditorForLinkedItem\(id, root\)/,
    "T-1809: linked item edit passes root to showEditorForLinkedItem",
);

/* 断言 2：index.ts showEditorForLinkedItem 实现接线钉 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(
    indexSource,
    /private showEditorForLinkedItem\(itemId: string, root\?: HTMLElement\)/,
    "T-1809: index.ts showEditorForLinkedItem accepts root parameter",
);
assert.match(
    indexSource,
    /this\.showEditor\(item, undefined, root \?\? this\.rootPages\.lastActiveRoot\(\) \?\? undefined\)/,
    "T-1809: index.ts showEditor prioritizes explicit root over fallback",
);

/* 断言 3：bind-page-navigation.ts 历史钻取洞察传递 root 钉 */
const navSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-page-navigation.ts"), "utf8");
assert.match(
    navSource,
    /data-history-insights-id[\s\S]*?host\.showInsights\(item, root\)/,
    "T-1810: history insights navigation passes root",
);

/* 断言 4：today-bindings.ts 键盘与菜单导航传递 root 钉 */
const todaySource = fs.readFileSync(path.join(sourceRoot, "render", "today-bindings.ts"), "utf8");
assert.match(
    todaySource,
    /key === "e"[\s\S]*?host\.showEditor\(item, undefined, root\)/,
    "T-1810: 'e' key shortcut passes root to showEditor",
);
assert.match(
    todaySource,
    /action === "edit"[\s\S]*?host\.showEditor\(item, undefined, root\)/,
    "T-1810: context menu edit passes root to showEditor",
);
assert.match(
    todaySource,
    /action === "insights"[\s\S]*?host\.showInsights\(item, root\)/,
    "T-1810: context menu insights passes root to showInsights",
);

console.log("cross-root-navigation: all assertions passed");
