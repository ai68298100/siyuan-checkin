// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1881 守门测试：跳过理由与阻力归因轻量记录及复盘看板（M2 证据与解释，对标 TickTick / Loop Habit Tracker）
   1. 静态代码与架构规范断言：
      - analytics.ts 包含 summarizeSkipFriction 与 detectFrictionCategory；
      - review.ts 挂载 data-skip-friction-card 与 renderSkipFriction；
      - today-bindings.ts 包含 data-menu-action="skip-quick" 快捷跳过交互；
      - i18n.ts 包含完整的双语词条；
      - components.scss 包含相关类名与高亮；
   2. 纯函数算法与分类逻辑动态验证：
      - 各类情境关键词的精确归因分类；
      - 阻力分布统计、总数与首要阻力计算；
      - 过滤子集事件的下钻联动计算。 */

console.log("Starting skip-friction-analysis tests...");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-skip-friction-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "analytics.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}

const analytics = require(path.join(dir, "analytics.js"));

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcAnalytics = fs.readFileSync(path.join(root, "src", "analytics.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcTodayBindings = fs.readFileSync(path.join(root, "src", "render", "today-bindings.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const srcComponentsScss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

// 1. analytics 导出
assert.ok(srcAnalytics.includes("export function summarizeSkipFriction"), "analytics.ts must export summarizeSkipFriction");
assert.ok(srcAnalytics.includes("export function detectFrictionCategory"), "analytics.ts must export detectFrictionCategory");
assert.ok(srcAnalytics.includes("skipFriction?: SkipFrictionSummary;"), "SummaryContext must include skipFriction");

// 2. review.ts 渲染
assert.ok(srcReview.includes("data-skip-friction-card"), "review.ts must render data-skip-friction-card");
assert.ok(srcReview.includes("renderSkipFriction"), "review.ts must define renderSkipFriction");
assert.ok(srcReview.includes("lc-checkin__friction-bar-fill"), "review.ts must use lc-checkin__friction-bar-fill");

// 3. today-bindings.ts 快捷跳过交互
assert.ok(srcTodayBindings.includes('data-menu-action="skip-quick"'), "today-bindings.ts must provide skip-quick menu action");
assert.ok(srcTodayBindings.includes('data-skip-reason="#时间冲突"'), "today-bindings.ts must include time conflict reason");
assert.ok(srcTodayBindings.includes('data-skip-reason="#身体不适"'), "today-bindings.ts must include health reason");
assert.ok(srcTodayBindings.includes('data-skip-reason="#主动休息"'), "today-bindings.ts must include rest reason");

// 4. i18n
assert.ok(srcI18n.includes('"review.skipFrictionTitle": "跳过与阻力归因"'), "zhCN must have review.skipFrictionTitle");
assert.ok(srcI18n.includes('"review.skipFrictionTitle": "Skip & Friction Insights"'), "enUS must have review.skipFrictionTitle");
assert.ok(srcI18n.includes('"review.frictionTime": "时间冲突"'), "zhCN must have review.frictionTime");
assert.ok(srcI18n.includes('"review.frictionTime": "Time Conflict"'), "enUS must have review.frictionTime");

// 5. components.scss
assert.ok(srcComponentsScss.includes(".lc-checkin__friction-bar-fill"), "components.scss must style .lc-checkin__friction-bar-fill");
assert.ok(srcComponentsScss.includes(".lc-checkin__menu-quick-skip"), "components.scss must style .lc-checkin__menu-quick-skip");

/* ---------------------------------------------------------
   二、纯函数算法与分类逻辑验证
   --------------------------------------------------------- */

// 1. detectFrictionCategory
assert.equal(analytics.detectFrictionCategory(""), "other");
assert.equal(analytics.detectFrictionCategory(undefined), "other");
assert.equal(analytics.detectFrictionCategory("加班太忙，改天再补"), "time");
assert.equal(analytics.detectFrictionCategory("#时间冲突 晚班"), "time");
assert.equal(analytics.detectFrictionCategory("#time busy"), "time");
assert.equal(analytics.detectFrictionCategory("今天感冒头痛，身体不适"), "health");
assert.equal(analytics.detectFrictionCategory("#health sick"), "health");
assert.equal(analytics.detectFrictionCategory("暴雨天气下雨无法外出"), "environment");
assert.equal(analytics.detectFrictionCategory("#environment 场地装修"), "environment");
assert.equal(analytics.detectFrictionCategory("本周达成目标，今天主动休息放空"), "rest");
assert.equal(analytics.detectFrictionCategory("#rest 充电日"), "rest");
assert.equal(analytics.detectFrictionCategory("行程冲突，日程顺延到明天"), "reschedule");
assert.equal(analytics.detectFrictionCategory("#reschedule 临时有事"), "reschedule");
assert.equal(analytics.detectFrictionCategory("一些奇奇怪怪的事情"), "other");

// 2. summarizeSkipFriction 空数据场景
const emptyRes = analytics.summarizeSkipFriction([]);
assert.equal(emptyRes.totalSkips, 0);
assert.equal(emptyRes.withReasonCount, 0);
assert.equal(emptyRes.topFriction, undefined);

// 3. 混合打卡事件场景
const mockEvents = [
    {id: "e1", itemId: "i1", value: 1, kind: "checkin", note: "正常打卡"},
    {id: "e2", itemId: "i1", value: 0, kind: "skip", note: "#时间冲突 加班"},
    {id: "e3", itemId: "i1", value: 0, kind: "skip", note: "今天太忙没有时间"},
    {id: "e4", itemId: "i1", value: 0, kind: "skip", note: "身体不适"},
    {id: "e5", itemId: "i2", value: 0, kind: "skip", note: "下雨环境受限"},
    {id: "e6", itemId: "i2", value: 0, kind: "skip", note: ""}, // 无备注跳过
    {id: "e7", itemId: "i2", value: 0, kind: "skip", note: "想不起来原因"}, // other
];

const summaryAll = analytics.summarizeSkipFriction(mockEvents);
assert.equal(summaryAll.totalSkips, 6);
assert.equal(summaryAll.withReasonCount, 5);
assert.equal(summaryAll.distribution.time, 2);
assert.equal(summaryAll.distribution.health, 1);
assert.equal(summaryAll.distribution.environment, 1);
assert.equal(summaryAll.distribution.rest, 0);
assert.equal(summaryAll.distribution.reschedule, 0);
assert.equal(summaryAll.distribution.other, 1);
assert.equal(summaryAll.topFriction, "time");

// 4. 按项目过滤下钻计算
const item1Events = mockEvents.filter(e => e.itemId === "i1");
const summaryI1 = analytics.summarizeSkipFriction(item1Events);
assert.equal(summaryI1.totalSkips, 3);
assert.equal(summaryI1.withReasonCount, 3);
assert.equal(summaryI1.distribution.time, 2);
assert.equal(summaryI1.distribution.health, 1);
assert.equal(summaryI1.distribution.environment, 0);
assert.equal(summaryI1.topFriction, "time");

const item2Events = mockEvents.filter(e => e.itemId === "i2");
const summaryI2 = analytics.summarizeSkipFriction(item2Events);
assert.equal(summaryI2.totalSkips, 3);
assert.equal(summaryI2.withReasonCount, 2);
assert.equal(summaryI2.distribution.environment, 1);
assert.equal(summaryI2.distribution.other, 1);
assert.equal(summaryI2.distribution.time, 0);

console.log("skip-friction-analysis tests passed successfully!");
