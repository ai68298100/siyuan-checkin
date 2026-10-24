// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1909 ~ T-1911 守门测试：月份快速穿梭、微信读书一键绑定与物理按压防抖
   1. review.ts 与 plugin-ops.ts 中 Today Anchor 快速穿梭断言
   2. settings.ts 与 index.ts 中微信读书 quick-create-weread 绑定断言
   3. action-busy.ts 中 250ms 物理连击防抖断言 */

console.log("Starting review-nav-and-action-debounce tests...");

const root = path.join(__dirname, "..");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcPluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcActionBusy = fs.readFileSync(path.join(root, "src", "render", "action-busy.ts"), "utf8");

// 1. T-1909 回顾页 Today 锚点
assert.ok(srcReview.includes('data-history-month="0"'), "review.ts must render data-history-month='0' for today anchor");
assert.ok(srcReview.includes("todayMonthBtn"), "review.ts must compute todayMonthBtn conditionally");
assert.ok(srcPluginOps.includes("const candidate = offset === 0 ? currentMonth :"), "plugin-ops.ts must reset candidate to currentMonth when offset === 0");

// 2. T-1910 微信读书一键绑定
assert.ok(srcSettings.includes('data-action="quick-create-weread"'), "settings.ts must provide quick-create-weread button");
assert.ok(srcIndex.includes('data-action=\'quick-create-weread\''), "index.ts must listen to quick-create-weread");
assert.ok(srcIndex.includes('this.wereadIntegration.finishItemId = ids.finish;'), "index.ts must assign finishItemId");
assert.ok(srcIndex.includes('this.wereadIntegration.notesItemId = ids.notes;'), "index.ts must assign notesItemId");

// 3. T-1911 物理防抖门禁
assert.ok(srcActionBusy.includes("ACTION_DEBOUNCE_MS = 250;"), "action-busy.ts must define 250ms debounce constant");
assert.ok(srcActionBusy.includes("Date.now() - last < ACTION_DEBOUNCE_MS"), "action-busy.ts must guard within debounce window");
assert.ok(srcActionBusy.includes("lastSettledKeys.set(resolvedKey, Date.now())"), "action-busy.ts must record settlement timestamp");

console.log("review-nav-and-action-debounce: all assertions passed successfully!");
