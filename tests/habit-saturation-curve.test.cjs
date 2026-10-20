const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1873 守门测试：习惯稳固度 Sigmoid 饱和成长曲线与阶段化成熟模型（对标 Table Habit / 掌控习惯）
   1. 纯函数数学收敛：computeHabitSaturation 在 0 天得分为 0，33 天（半程拐点）约为 50，66 天达标为 100，超量封顶不越界；
   2. 三阶段生命周期映射：1~21 天为 seed (萌芽)，22~45 天为 climb (爬坡)，46~66+ 天为 root (扎根)；
   3. buildHabitInsights 集成：返回完整的 saturation 结构；
   4. UI 静态断言：index.ts 渲染饱和度 banner，components.scss 样式定义，i18n 双语覆盖。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-habit-saturation-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}

fs.mkdirSync(path.join(dir, "features"), {recursive: true});
for (const filename of ["habit-score.ts", "insights.ts"]) {
    fs.writeFileSync(
        path.join(dir, "features", filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", filename), "utf8"), {compilerOptions}).outputText
    );
}

const habitScore = require(path.join(dir, "features", "habit-score.js"));
const insights = require(path.join(dir, "features", "insights.js"));
const model = require(path.join(dir, "model.js"));

/* ---------------------------------------------------------
   一、纯函数逻辑斯蒂饱和曲线数学断言
   --------------------------------------------------------- */

// 1. 边界值
const zeroDays = habitScore.computeHabitSaturation(0, 66);
assert.equal(zeroDays.saturationScore, 0, "0 天时稳固度得分必须为 0");
assert.equal(zeroDays.stage, "seed", "0 天属于萌芽期");

// 负数输入保护
const negativeDays = habitScore.computeHabitSaturation(-10, 66);
assert.equal(negativeDays.saturationScore, 0);
assert.equal(negativeDays.effectiveDays, 0);

// 2. 半程拐点（33 天）
const halfDays = habitScore.computeHabitSaturation(33, 66);
assert.equal(halfDays.saturationScore, 50, "半程（33天）稳固度得分应恰好为 50");
assert.equal(halfDays.stage, "climb", "33 天属于爬坡期");

// 3. 目标达成（66 天）
const fullDays = habitScore.computeHabitSaturation(66, 66);
assert.equal(fullDays.saturationScore, 100, "达标（66天）稳固度得分应为 100");
assert.equal(fullDays.stage, "root", "66 天属于扎根期");

// 4. 超额完成封顶防刷单（例如 120 天）
const overDays = habitScore.computeHabitSaturation(120, 66);
assert.ok(overDays.saturationScore <= 100, "超额完成得分封顶不超过 100");
assert.equal(overDays.effectiveDays, 99, "超额天数封顶为 66 * 1.5 = 99 天");
assert.equal(overDays.stage, "root");

/* ---------------------------------------------------------
   二、三阶段成熟度映射与科学指导
   --------------------------------------------------------- */

// 萌芽期：1~21 天
const day10 = habitScore.computeHabitSaturation(10, 66);
assert.equal(day10.stage, "seed");
assert.equal(day10.stageHintKey, "habit.stageSeedHint");
assert.ok(day10.saturationScore < 30);

// 爬坡期：22~45 天
const day25 = habitScore.computeHabitSaturation(25, 66);
assert.equal(day25.stage, "climb");
assert.equal(day25.stageHintKey, "habit.stageClimbHint");

// 扎根期：46~66+ 天
const day50 = habitScore.computeHabitSaturation(50, 66);
assert.equal(day50.stage, "root");
assert.equal(day50.stageHintKey, "habit.stageRootHint");

/* ---------------------------------------------------------
   三、buildHabitInsights 洞察集成验证
   --------------------------------------------------------- */

const testItem = model.normalizeItem({
    id: "item-math",
    name: "数学思考",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    createdDate: "2026-10-01",
});

const testStore = model.createDefaultStore();
testStore.items = [testItem];
testStore.events = [
    {id: "e1", itemId: "item-math", value: 1, unit: "次", source: "manual", localDate: "2026-10-18"},
    {id: "e2", itemId: "item-math", value: 1, unit: "次", source: "manual", localDate: "2026-10-19"},
    {id: "e3", itemId: "item-math", value: 1, unit: "次", source: "manual", localDate: "2026-10-20"},
];

const report = insights.buildHabitInsights(testStore, "item-math", {asOf: new Date(2026, 9, 20)});
assert.ok(report.saturation, "洞察报告必须包含 saturation 结构");
assert.equal(typeof report.saturation.saturationScore, "number");
assert.equal(report.saturation.stage, "seed");

/* ---------------------------------------------------------
   四、UI 静态结构与样式断言
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. index.ts 渲染饱和度 banner 与阶段徽标
assert.match(srcIndex, /lc-checkin__habit-saturation-banner/, "index.ts 必须渲染习惯稳固度 banner");
assert.match(srcIndex, /lc-checkin__habit-stage-badge/, "index.ts 必须渲染阶段徽标");
assert.match(srcIndex, /report\.saturation\.saturationScore/, "index.ts 必须渲染饱和稳固度得分");

// 2. components.scss 样式定义
assert.match(srcComponents, /\.lc-checkin__habit-saturation-banner/, "components.scss 包含饱和度 banner 样式");
assert.match(srcComponents, /\.lc-checkin__habit-stage-badge/, "components.scss 包含阶段徽标样式");
assert.match(srcComponents, /is-seed/, "components.scss 包含萌芽期阶段色");
assert.match(srcComponents, /is-climb/, "components.scss 包含爬坡期阶段色");
assert.match(srcComponents, /is-root/, "components.scss 包含扎根期阶段色");

// 3. i18n 双语覆盖
assert.match(srcI18n, /"habit\.saturationScore":\s*"稳固度分"/);
assert.match(srcI18n, /"habit\.saturationScore":\s*"Solidness"/);
assert.match(srcI18n, /"habit\.stage\.seed":\s*"🌱 萌芽期"/);
assert.match(srcI18n, /"habit\.stage\.seed":\s*"🌱 Sprouting"/);

console.log("habit-saturation-curve: all assertions passed successfully.");
