const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1872 守门测试：打卡主观心流与精力轻量自评及交叉分析
   1. 模型与数据层：CheckinEvent 接受可选 energy (1~5)，normalizeEvent 严格校验非法值（0/6/字符串不物化）；
   2. 历史向前兼容：旧版无 energy 记录正常加载与序列化；
   3. 分析层：summarizeEnergyFlow 计算 1~5 分布、总样本与平均精力分，空事件安全兜底；
   4. UI 呈现：Today 展开面板包含 5 档自评单选，bind-today 收集并入账；Review analysis 包含能量看板；
   5. i18n：中英文双语词条对齐。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-energy-flow-"));
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
   一、模型与事件规范化校验
   --------------------------------------------------------- */

// 1. makeEventValue 接受并物化合法的 energy
const testItem = model.normalizeItem({
    id: "item-read",
    name: "深度阅读",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
    createdDate: "2026-10-20",
});

// 2. normalizeStore / normalizeEvent 对 energy 严格校验与容错
const rawStore = {
    version: 3,
    items: [testItem],
    events: [
        {id: "e1", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 4},
        {id: "e2", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 1},
        {id: "e3-legacy", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20"}, // 旧版无 energy
        {id: "e4-invalid-high", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 6}, // 超限
        {id: "e5-invalid-low", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 0}, // 低于下限
        {id: "e6-invalid-type", itemId: "item-read", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: "flow"}, // 非数字
    ],
};

const normalized = model.normalizeStore(rawStore);
const events = normalized.events;

assert.equal(events.find(e => e.id === "e1")?.energy, 4);
assert.equal(events.find(e => e.id === "e2")?.energy, 1);
assert.equal(events.find(e => e.id === "e3-legacy")?.energy, undefined, "旧数据未填 energy 保持 undefined");
assert.equal(events.find(e => e.id === "e4-invalid-high")?.energy, undefined, "超限 energy 过滤为 undefined");
assert.equal(events.find(e => e.id === "e5-invalid-low")?.energy, undefined, "低于下限 energy 过滤为 undefined");
assert.equal(events.find(e => e.id === "e6-invalid-type")?.energy, undefined, "非法类型 energy 过滤为 undefined");

/* ---------------------------------------------------------
   二、分析层 summarizeEnergyFlow 投影计算
   --------------------------------------------------------- */

// 1. 空事件集兜底
const emptySummary = analytics.summarizeEnergyFlow([]);
assert.equal(emptySummary.totalWithEnergy, 0);
assert.equal(emptySummary.averageEnergy, undefined);
assert.deepEqual(emptySummary.distribution, {1: 0, 2: 0, 3: 0, 4: 0, 5: 0});

// 2. 正常样本集计算
const testEvents = [
    {id: "1", itemId: "a", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 5},
    {id: "2", itemId: "a", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 5},
    {id: "3", itemId: "a", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 4},
    {id: "4", itemId: "a", value: 1, unit: "次", source: "manual", localDate: "2026-10-20", energy: 2},
    {id: "5", itemId: "a", value: 1, unit: "次", source: "manual", localDate: "2026-10-20"}, // 无精力
];

const flowSummary = analytics.summarizeEnergyFlow(testEvents);
assert.equal(flowSummary.totalWithEnergy, 4);
assert.equal(flowSummary.distribution[5], 2);
assert.equal(flowSummary.distribution[4], 1);
assert.equal(flowSummary.distribution[2], 1);
assert.equal(flowSummary.distribution[1], 0);
assert.equal(flowSummary.distribution[3], 0);
// (5 + 5 + 4 + 2) / 4 = 16 / 4 = 4.0
assert.equal(flowSummary.averageEnergy, 4.0);

/* ---------------------------------------------------------
   三、静态代码结构与 UI 钉
   --------------------------------------------------------- */

const srcFragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const srcBindToday = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. fragments.ts 包含精确录入面板中的心流/精力选项
assert.match(srcFragments, /lc-checkin__energy-selector/, "fragments.ts 必须渲染精力选择器容器");
assert.match(srcFragments, /data-energy="\$\{lvl\}"/, "fragments.ts 必须为 1~5 档位提供 data-energy 属性");

// 2. bind-today.ts 收集选中的精力并传递入库
assert.match(srcBindToday, /const energyEl = element\.querySelector<HTMLInputElement>\("input\[data-energy\]:checked"\);/, "bind-today.ts 必须读取被选中的精力选项");
assert.match(srcBindToday, /host\.recordEvent\(item, value, moment, expectedRevisionFingerprint, note, attachment, undefined, energy\)/, "bind-today.ts 必须向 recordEvent 传递 energy 参数");

// 3. review.ts 包含心流与精力分布看板卡片与折叠项
assert.match(srcReview, /fold\("energyFlow", t\("review\.energyFlowTitle"\), renderEnergyFlow\)/, "review.ts 必须挂载 energyFlow 折叠分节");
assert.match(srcReview, /data-energy-flow-card/, "review.ts 必须输出 data-energy-flow-card 标记");

// 4. components.scss 样式定义
assert.match(srcComponents, /\.lc-checkin__energy-selector/, "components.scss 必须包含 .lc-checkin__energy-selector 样式");
assert.match(srcComponents, /\.lc-checkin__energy-flow-card/, "components.scss 必须包含 .lc-checkin__energy-flow-card 样式");

// 5. i18n 词条覆盖
assert.match(srcI18n, /"item\.energyLabel":\s*"精力与心流"/, "i18n 中文包含精力与心流标签");
assert.match(srcI18n, /"item\.energyLabel":\s*"Energy & Flow"/, "i18n 英文包含精力与心流标签");
assert.match(srcI18n, /"review\.energyFlowTitle":\s*"心流与精力分布"/, "i18n 中文包含回顾看板标题");
assert.match(srcI18n, /"review\.energyFlowTitle":\s*"Energy & Flow Distribution"/, "i18n 英文包含回顾看板标题");

console.log("record-energy-flow: all assertions passed successfully.");
