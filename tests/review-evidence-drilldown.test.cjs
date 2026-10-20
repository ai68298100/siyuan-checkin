const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1877 守门测试：周复盘卡片证据链一键钻取与样本量守门（对标 M2 证据工作台）
   1. 样本充足判定：< 7 天如实返回 sufficient:false，>= 7 天返回 true；
   2. 证据样本统计：正确统计已完成、跳过、未完成天数与最新事件日期；
   3. 静态断言：index.ts 渲染 details[data-coaching-evidence] 面板与 .lc-checkin__coaching-evidence-row；
   4. i18n 覆盖：中英双语覆盖不足/充足/范围/空态说明。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-evidence-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "suggestion-adoption.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "suggestion-adoption.ts"), "utf8"), {compilerOptions}).outputText);

const model = require(path.join(dir, "model.js"));
const adoption = require(path.join(dir, "features", "suggestion-adoption.js"));

const item = model.normalizeItem({
    id: "it-med", name: "冥想", icon: "🧘", kind: "duration", target: 15, unit: "分钟",
    schedule: {type: "daily"},
    createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", createdDate: "2026-10-01",
});

let store = model.createDefaultStore();
store.items = [item];

/* ——— 1. 样本不足：窗口仅 3 天 ——— */
const sparse = adoption.buildCoachingEvidence(store, item, "2026-10-03", 3);
assert.equal(sparse.sufficient, false, "3 天计划日样本不足以支撑强推断");
assert.equal(sparse.eligibleDays, 3);
assert.equal(sparse.completedDays, 0);
assert.equal(sparse.missedDays, 3);
assert.equal(sparse.recent.length, 3);

/* ——— 2. 样本充足：28 天且包含真实打卡与跳过 ——— */
store = model.appendEvents(store, [
    {id: "e1", itemId: "it-med", value: 15, unit: "分钟", source: "manual", localDate: "2026-10-14"},
    {id: "e2", itemId: "it-med", value: 20, unit: "分钟", source: "manual", localDate: "2026-10-15"},
    {id: "e3", itemId: "it-med", value: 0, unit: "分钟", source: "manual", localDate: "2026-10-16", kind: "skip"},
]);
const full = adoption.buildCoachingEvidence(store, item, "2026-10-20", 14);
assert.equal(full.sufficient, true, "14 天连续计划日满足最低样本量");
assert.equal(full.eligibleDays, 14);
assert.equal(full.completedDays, 2);
assert.equal(full.skippedDays, 1);
assert.equal(full.missedDays, 11);
assert.equal(full.lastEventDate, "2026-10-16");
assert.equal(full.recent.length, 7, "recent 证据行最多呈现 7 条");
const skipSample = full.recent.find((s) => s.date === "2026-10-16");
assert.ok(skipSample && skipSample.skipped, "跳过事实如实标出");
const doneSample = full.recent.find((s) => s.date === "2026-10-15");
assert.ok(doneSample && doneSample.completed && doneSample.progress === 20, "超额完成事实如实记录");

/* ——— 3. 静态结构 ——— */
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
assert.match(srcIndex, /data-coaching-evidence/, "index.ts 必须挂载证据折叠面板");
assert.match(srcIndex, /lc-checkin__coaching-evidence-row/, "index.ts 必须渲染证据样本行");
assert.match(srcIndex, /COACHING_EVIDENCE_MIN_DAYS/, "index.ts 必须引用样本量下限常量");
assert.match(srcComponents, /\.lc-checkin__coaching-evidence/, "components.scss 必须包含证据面板样式");
assert.match(srcComponents, /\.lc-checkin__coaching-evidence-row/, "components.scss 必须包含证据行样式");
for (const key of ["insights.evidenceTitle", "insights.evidenceSufficient", "insights.evidenceInsufficient", "insights.evidenceRange"]) {
    assert.ok(srcI18n.split(`"${key}"`).length - 1 >= 2, `${key} 必须双语`);
}

console.log("review-evidence-drilldown: all assertions passed successfully.");
