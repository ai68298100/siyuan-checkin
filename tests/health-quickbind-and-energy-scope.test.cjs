// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1912 ~ T-1914 守门测试：健康收件箱一键绑定、精力看板区间契约与进度环硬件加速
   1. settings.ts 与 index.ts 中健康收件箱 quick-create-health 绑定断言
   2. review.ts 中 renderEnergyFlow / renderSkipFriction 区间守卫断言
   3. workbench.scss 中 overview-ring 独立合成层断言 */

console.log("Starting health-quickbind-and-energy-scope tests...");

const root = path.join(__dirname, "..");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcWorkbench = fs.readFileSync(path.join(root, "src", "ui", "workbench.scss"), "utf8");

// 1. T-1912 健康收件箱一键绑定
assert.ok(srcSettings.includes('data-action="quick-create-health"'), "settings.ts must provide quick-create-health button");
assert.ok(srcIndex.includes('data-action=\'quick-create-health\''), "index.ts must bind quick-create-health action");
assert.ok(srcIndex.includes('type === "health"'), "index.ts quickCreateAndBindIntegrationItem must handle health");
assert.ok(srcIndex.includes('name: "健康步数"'), "index.ts must define 健康步数 fallback item");
assert.ok(srcIndex.includes('name: "健康体重"'), "index.ts must define 健康体重 fallback item");

// 2. T-1913 精力与跳过阻力区间守卫
assert.ok(srcReview.includes("const inScopeEvents = ctx.store.events.filter(e => e.localDate >= summary.startDate && e.localDate <= summary.endDate);"), "review.ts must filter events by summary range in energy and friction rendering");

// 3. T-1914 环形进度条合成层加速
assert.ok(srcWorkbench.includes("transform: translateZ(0);"), "workbench.scss must promote overview-ring to composite layer");
assert.ok(srcWorkbench.includes("will-change: transform;"), "workbench.scss must hint transform will-change for overview-ring");

console.log("health-quickbind-and-energy-scope: all assertions passed successfully!");
