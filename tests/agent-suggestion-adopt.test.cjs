const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1876 守门：习惯进化建议「一键采纳」——纯函数计划 + 宿主原子写入 + UI/bind 接线。
   1. 采纳修订从「明日起」生效，绝不追溯历史；
   2. 已归档 / 不需改规则 / 已是同值弹性配额 / 目标未变化 → 如实拒绝，不产生噪声修订；
   3. 二值项目不得被改成非 1 目标；周配额越界拒绝；
   4. mergeAdoptedRevision 不修改入参，同日修订原位替换并保持升序；
   5. 宿主 applySuggestionRevision 在 mutation 内落盘，失败回滚并抛出。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-adopt-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "suggestion-adoption.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "suggestion-adoption.ts"), "utf8"), {compilerOptions}).outputText);

const model = require(path.join(dir, "model.js"));
const adoption = require(path.join(dir, "features", "suggestion-adoption.js"));

const makeItem = (overrides = {}) => model.normalizeItem({
    id: "it-1", name: "晨跑", icon: "🏃", kind: "count", target: 5, unit: "公里",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01",
    ...overrides,
});
const TODAY = "2026-10-20";

/* ——— 1. 采纳计划：明日起生效，排期转为弹性周配额 ——— */
const daily = makeItem();
const plan = adoption.planSuggestionAdoption(daily, {suggestionId: "reduce-friction", kind: "relax-schedule", weeklyTarget: 4}, TODAY);
assert.ok(plan.revision, "弹性排期建议应产出修订");
assert.equal(plan.revision.effectiveDate, "2026-10-21", "必须明日起生效");
assert.equal(plan.revision.schedule.type, "quota");
assert.equal(plan.revision.schedule.quota.period, "week");
assert.equal(plan.revision.schedule.quota.amount, 4);
assert.equal(plan.revision.target, 5, "仅调整排期时目标值不变");
assert.equal(plan.summary.scheduleFrom, "daily");
assert.equal(plan.summary.scheduleTo, "quota:week:4");
assert.equal(daily.schedule.type, "daily", "计划函数不得修改入参项目");
assert.equal(adoption.adoptionInputForSuggestion("reduce-friction").kind, "relax-schedule");
assert.equal(adoption.adoptionInputForSuggestion("keep-rhythm").kind, "raise-target");
assert.equal(adoption.adoptionInputForSuggestion("totally-unknown").kind, "none");

/* ——— 2. 拒绝路径 ——— */
assert.equal(adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "none"}, TODAY).refusal, "unsupported-suggestion");
assert.equal(adoption.planSuggestionAdoption(makeItem({archived: true}), {suggestionId: "x", kind: "relax-schedule", weeklyTarget: 4}, TODAY).refusal, "item-archived");
const alreadyFlexible = makeItem({schedule: {type: "quota", quota: {period: "week", amount: 4, countMode: "dates"}}});
assert.equal(adoption.planSuggestionAdoption(alreadyFlexible, {suggestionId: "x", kind: "relax-schedule", weeklyTarget: 4}, TODAY).refusal, "already-flexible");
assert.equal(adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "relax-schedule", weeklyTarget: 0}, TODAY).refusal, "invalid-target");
assert.equal(adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "relax-schedule", weeklyTarget: 9}, TODAY).refusal, "invalid-target");
assert.equal(adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "reduce-target", targetValue: 5}, TODAY).refusal, "no-change");
assert.equal(adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "reduce-target", targetValue: -1}, TODAY).refusal, "invalid-target");

/* ——— 3. 二值项目不得改成非 1 目标 ——— */
const binary = makeItem({kind: "binary", target: 1, unit: "次"});
assert.equal(adoption.planSuggestionAdoption(binary, {suggestionId: "x", kind: "raise-target", targetValue: 3}, TODAY).refusal, "invalid-target");
const reducePlan = adoption.planSuggestionAdoption(daily, {suggestionId: "x", kind: "reduce-target", targetValue: 4}, TODAY);
assert.ok(reducePlan.revision);
assert.equal(reducePlan.revision.target, 4);
assert.equal(reducePlan.revision.schedule.type, "daily", "仅调整目标时排期不变");

/* ——— 4. 合并进修订时间线 ——— */
const withRevisions = {...daily, revisions: [
    {effectiveDate: "2026-09-01", kind: "count", target: 5, unit: "公里", direction: "atLeast", schedule: {type: "daily"}},
]};
const merged = adoption.mergeAdoptedRevision(withRevisions, plan.revision);
assert.equal(merged.length, 2, "不同生效日追加一条");
assert.equal(merged[1].effectiveDate, "2026-10-21");
assert.equal(withRevisions.revisions.length, 1, "合并函数不得修改入参");
assert.equal(withRevisions.revisions[0].schedule.type, "daily");
const itemWithSame = {...daily, revisions: [plan.revision]};
const replaced = adoption.mergeAdoptedRevision(itemWithSame, {...plan.revision, target: 9});
assert.equal(replaced.length, 1, "同生效日原位替换");
assert.equal(replaced[0].target, 9);

/* ——— 5. 宿主与 UI 接线 ——— */
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcBind = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
assert.match(srcIndex, /async applySuggestionRevision\(itemId: string, suggestionId: string\): Promise<boolean>/, "宿主必须暴露 applySuggestionRevision");
assert.match(srcIndex, /catch \{ this\.store = previous; showMessage\(t\("msg\.saveFail"\)\); throw new Error\("suggestion-adopt-failed"\); \}/, "持久化失败必须回滚并抛出");
assert.match(srcIndex, /source: "suggestion-adopt"/, "采纳动作必须留下审计条目");
assert.match(srcBind, /data-adopt-suggestion/, "建议卡必须渲染采纳按钮");
assert.match(srcBind, /window\.confirm\(t\("insights\.adoptConfirm"/, "采纳前必须确认生效日期与变更");
assert.match(srcBind, /target\.setAttribute\("aria-busy", "true"\)/, "采纳必须单飞并暴露 aria-busy");
for (const key of ["insights.adoptAction", "insights.adoptConfirm", "insights.adoptDone", "insights.adoptFailed"]) {
    assert.ok(srcI18n.split(`"${key}"`).length - 1 >= 2, `${key} 必须中英双语`);
}

console.log("agent-suggestion-adopt: all assertions passed successfully.");
