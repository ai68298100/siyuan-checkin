// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1915 ~ T-1917 守门测试：笔记推导一键创建绑定、午夜生命周期清理与进度环硬件加速
   1. settings.ts 与 index.ts 笔记推导 quick-create-notequery 快速创建与绑定断言
   2. index.ts refreshDateBoundary 跨午夜清理 recentLifelogBlocks / recentRecord 断言
   3. workbench.scss 环形进度条 translateZ 与 will-change 断言 */

console.log("Starting integration-quickcreate-and-midnight tests...");

const root = path.join(__dirname, "..");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcWorkbench = fs.readFileSync(path.join(root, "src", "ui", "workbench.scss"), "utf8");

// 1. T-1915 笔记推导快速创建与绑定
assert.ok(srcSettings.includes('data-action="quick-create-notequery"'), "settings.ts must provide quick-create-notequery button");
assert.ok(srcIndex.includes('data-action=\'quick-create-notequery\''), "index.ts must listen to quick-create-notequery");
assert.ok(srcIndex.includes('type === "notequery"'), "index.ts quickCreateAndBindIntegrationItem must handle notequery");
assert.ok(srcIndex.includes('this.noteQuery.itemId = item!.id;'), "index.ts must bind noteQuery.itemId");

// 2. T-1916 跨午夜清理
assert.ok(srcIndex.includes("this.recentLifelogBlocks.clear();"), "index.ts refreshDateBoundary must clear recentLifelogBlocks");
assert.ok(srcIndex.includes("this.recentRecord = undefined;"), "index.ts refreshDateBoundary must reset recentRecord");

// 3. T-1917 环形进度条硬件加速
assert.ok(srcWorkbench.includes("transform: translateZ(0);"), "overview-ring must declare translateZ(0)");
assert.ok(srcWorkbench.includes("will-change: transform;"), "overview-ring must declare will-change: transform");

console.log("integration-quickcreate-and-midnight: all assertions passed successfully!");
