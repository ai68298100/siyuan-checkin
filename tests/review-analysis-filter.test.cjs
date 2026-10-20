const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1879 守门测试：回顾分析看板多维度筛选与趋势下钻联动（M2 差异化复盘）
   1. 上下文协议：ReviewRootContext 与 ReviewViewContext 支持 analysisFilterGroupId 与 analysisFilterItemId；
   2. 分析看板渲染：workspace === "analysis" 模式下输出 .lc-checkin__analysis-filter-bar；
   3. 联动过滤计算：按项目或分组过滤时，精力心流 (summarizeEnergyFlow) 正确按所选子集事件统计；
   4. 交互绑定：bind-page-navigation.ts 包含 analysis-filter-group、analysis-filter-item 与 clear-analysis-filter 监听；
   5. 多语言词条与样式完整性。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-filter-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "analytics.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}

const model = require(path.join(dir, "model.js"));
const analytics = require(path.join(dir, "analytics.js"));

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcPageShell = fs.readFileSync(path.join(root, "src", "render", "page-shell.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcBindNav = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcWorkspaceScss = fs.readFileSync(path.join(root, "src", "ui", "review-workspace.scss"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. 上下文协议字段
assert.match(srcPageShell, /analysisFilterGroupId\?: string;/, "ReviewRootContext 必须包含 analysisFilterGroupId");
assert.match(srcPageShell, /analysisFilterItemId\?: string;/, "ReviewRootContext 必须包含 analysisFilterItemId");
assert.match(srcReview, /analysisFilterGroupId\?: string;/, "ReviewViewContext 必须包含 analysisFilterGroupId");
assert.match(srcReview, /analysisFilterItemId\?: string;/, "ReviewViewContext 必须包含 analysisFilterItemId");

// 2. 分析看板筛选栏与下钻标记
assert.match(srcReview, /lc-checkin__analysis-filter-bar/, "review.ts 必须渲染分析看板多维度筛选栏");
assert.match(srcReview, /data-action="analysis-filter-group"/, "review.ts 必须提供分组筛选下拉框");
assert.match(srcReview, /data-action="analysis-filter-item"/, "review.ts 必须提供项目筛选下拉框");
assert.match(srcReview, /data-action="clear-analysis-filter"/, "review.ts 必须提供清除筛选按钮");

// 3. 事件绑定
assert.match(srcBindNav, /\[data-action='analysis-filter-group'\]/, "bind-page-navigation 必须监听 analysis-filter-group");
assert.match(srcBindNav, /\[data-action='analysis-filter-item'\]/, "bind-page-navigation 必须监听 analysis-filter-item");
assert.match(srcBindNav, /\[data-action='clear-analysis-filter'\]/, "bind-page-navigation 必须监听 clear-analysis-filter");

// 4. index.ts 状态透传
assert.match(srcIndex, /analysisFilterGroupId: review\.analysisFilterGroupId/, "index.ts 必须透传 analysisFilterGroupId");
assert.match(srcIndex, /analysisFilterItemId: review\.analysisFilterItemId/, "index.ts 必须透传 analysisFilterItemId");

// 5. 样式与国际化
assert.match(srcWorkspaceScss, /\.lc-checkin__analysis-filter-bar/, "review-workspace.scss 必须包含筛选栏样式");
assert.match(srcI18n, /"review\.analysisFilterGroup":\s*"分组聚焦"/);
assert.match(srcI18n, /"review\.analysisFilterGroup":\s*"Group"/);
assert.match(srcI18n, /"review\.analysisFilterReset":\s*"重置聚焦"/);
assert.match(srcI18n, /"review\.analysisFilterReset":\s*"Reset focus"/);

/* ---------------------------------------------------------
   二、多维度下钻过滤与精力分布计算验证
   --------------------------------------------------------- */

const itemA = model.normalizeItem({
    id: "item-study",
    name: "编程学习",
    group: "学习",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    createdDate: "2026-10-20",
});

const itemB = model.normalizeItem({
    id: "item-sport",
    name: "晨跑锻炼",
    group: "健康",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    createdDate: "2026-10-20",
});

const allEvents = [
    {id: "e1", itemId: "item-study", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 5},
    {id: "e2", itemId: "item-study", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 4},
    {id: "e3", itemId: "item-sport", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 2},
];

// 全局精力分布
const globalFlow = analytics.summarizeEnergyFlow(allEvents);
assert.equal(globalFlow.totalWithEnergy, 3);
assert.equal(globalFlow.distribution[5], 1);
assert.equal(globalFlow.distribution[4], 1);
assert.equal(globalFlow.distribution[2], 1);
// (5 + 4 + 2) / 3 = 3.666... => 3.7
assert.equal(globalFlow.averageEnergy, 3.7);

// 按项目 item-study 下钻
const studyEvents = allEvents.filter(e => e.itemId === "item-study");
const studyFlow = analytics.summarizeEnergyFlow(studyEvents);
assert.equal(studyFlow.totalWithEnergy, 2);
assert.equal(studyFlow.distribution[5], 1);
assert.equal(studyFlow.distribution[4], 1);
assert.equal(studyFlow.distribution[2], 0);
assert.equal(studyFlow.averageEnergy, 4.5);

// 按项目 item-sport 下钻
const sportEvents = allEvents.filter(e => e.itemId === "item-sport");
const sportFlow = analytics.summarizeEnergyFlow(sportEvents);
assert.equal(sportFlow.totalWithEnergy, 1);
assert.equal(sportFlow.distribution[2], 1);
assert.equal(sportFlow.averageEnergy, 2.0);

console.log("review-analysis-filter: all assertions passed successfully.");
