const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1774 守门测试：戒除类“今日暂时守住”与闭合日统计表达（D-373）。
   核心原则：
   1. 底层承诺不动（D-219）：isComplete(store, item, now) 零破戒仍为 true，不破坏连击与历史模型；
   2. 呈现层消歧：
      - 洞察日格 tooltip：今日尚在进行中显示 insights.atMostHolding（今日守住中），历史闭合日显示 insights.atMostKept（守住）；
      - 今日页已完成区分节头：纯戒除项显示 today.atMostHoldingTitle，混合显示 today.completedHolding；
   3. 双语词表 100% 对齐。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-atmost-holding-"));

for (const filename of ["date-keys.ts", "model.ts", "record-step.ts", "quota.ts", "rules.ts", "features/habit-score.ts", "features/insights.ts", "features/coaching.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const model = require(path.join(outputRoot, "model.js"));
const {buildHabitInsights} = require(path.join(outputRoot, "features", "insights.js"));

/* 断言 1：i18n 双语完整性 */
const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");
const expectedKeys = [
    ["today.atMostHoldingTitle", "目前守住的项目", "Items holding today"],
    ["today.completedHolding", "{done} 项完成 · {holding} 项守住中", "{done} completed · {holding} holding"],
    ["today.holdingCount", "{n} 项守住中", "{n} holding"],
    ["insights.atMostHolding", "今日守住中", "Holding today"],
];
for (const [key, zh, en] of expectedKeys) {
    assert.match(i18nSource, new RegExp(`"${key}": "${zh.replace(/\{/g, "\\{").replace(/\}/g, "\\}")}"`), `zh copy for ${key}`);
    assert.match(i18nSource, new RegExp(`"${key}": "${en.replace(/\{/g, "\\{").replace(/\}/g, "\\}")}"`), `en copy for ${key}`);
}

/* 断言 2：src/index.ts 中 tooltip 区分今日暂守与历史守住 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(indexSource, /day\.isToday \? t\("insights\.atMostHolding"\) : t\("insights\.atMostKept"\)/, "index.ts separates today holding from historical kept");

/* 断言 3：src/render/fragments.ts 中已完成区分节头语义与计数 */
const fragmentsSource = fs.readFileSync(path.join(sourceRoot, "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /holdingCount > 0 && doneCount === 0[\s\S]*?today\.atMostHoldingTitle/, "pure holding section renders holding title");
assert.match(fragmentsSource, /today\.completedHolding/, "mixed section renders completedHolding count");
assert.match(fragmentsSource, /today\.holdingCount/, "pure holding renders holdingCount");

/* 断言 4：数据层与洞察模型行为验证 */
const quitItem = {
    id: "quit-smoking",
    name: "戒烟",
    icon: "🚭",
    kind: "binary",
    target: 1,
    unit: "次",
    direction: "atMost",
    schedule: {type: "daily"},
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    createdDate: "2026-10-01",
    revisions: [{
        effectiveDate: "2026-10-01",
        kind: "binary",
        target: 1,
        unit: "次",
        direction: "atMost",
        schedule: {type: "daily"},
    }],
    archivePeriods: [],
};

const store = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [quitItem],
    events: [],
    eventTombstones: [],
};

const today = new Date();
assert.equal(model.isComplete(store, quitItem, today), true, "isComplete returns true when unlapsed today (data layer unchanged)");

const insights = buildHabitInsights(store, quitItem.id, {days: 7, asOf: today});
const lastDay = insights.days[insights.days.length - 1];
assert.equal(lastDay.isToday, true, "last day is today");
assert.equal(lastDay.status, "complete", "status is complete in habit model");

console.log("atmost-holding: all assertions passed");
