/* T-1701 守门：编辑事项保留单次改期与历史事实（D-348）。
   风险路径（源码确认 P0）：saveOccasionForm 重建对象只传 completedDates/启用态/
   时间戳，遗漏 existing.overrides——normalizeOccasion 只从输入保留改期，编辑名称、
   备注或提醒天数都会清除单次改期。契约：
   - 编辑非规则字段（名称/备注/提醒天数）→ overrides 原样保留，完成历史不丢；
   - 日期或重复规则变更 → 旧覆盖随旧规则失效：显式清空 + 提示（不静默保留死覆盖，
     也不静默丢弃）；无效覆盖由 normalizeOccasion 校验（不静默保留）；
   - 持久化失败回滚原对象（既有 catch 通道，结构钉）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-edit-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const existing = occasions.normalizeOccasion({
    id: "occ-1",
    name: "周会",
    kind: "scheduled",
    date: "2026-09-01",
    recurrence: "weekly",
    enabled: true,
    completedDates: ["2026-09-08"],
    overrides: {"2026-09-29": {date: "2026-09-30"}},
});
assert.ok(existing, "the fixture occasion normalizes");
assert.ok(existing.overrides && existing.overrides["2026-09-29"], "the reschedule is present before editing");

/* —— 夹具 1：编辑非规则字段（改名）——overrides 原样保留、完成历史不丢。 —— */
const renamed = occasions.normalizeOccasion({...existing, name: "周会（改名）", note: "带备注", remindBeforeDays: 2});
assert.ok(renamed);
assert.ok(renamed.overrides && renamed.overrides["2026-09-29"].date === "2026-09-30", "editing non-rule fields keeps the one-off reschedule (T-1701)");
assert.deepEqual(renamed.completedDates, ["2026-09-08"], "the completion history survives");

/* —— 夹具 2：规则变更路径（改 recurrence）——保存装配显式传 undefined → 覆盖清空。 —— */
const ruleChanged = occasions.normalizeOccasion({...existing, recurrence: "monthly", overrides: undefined});
assert.ok(ruleChanged);
assert.equal(ruleChanged.overrides, undefined, "a rule change clears the stale overrides via the assembly");

/* —— 夹具 3：无效覆盖不静默保留（normalize 校验既有纪律）——有效项保留、非法项剔除。 —— */
const invalid = occasions.normalizeOccasion({...existing, overrides: {
    "2026-09-29": {date: "2026-09-30"},
    "2026-02-30": {date: "2026-03-01"},
    "2026-10-01": {date: "2026-10-01"},
}});
assert.ok(invalid.overrides, "valid overrides survive normalization");
assert.equal(invalid.overrides["2026-09-29"].date, "2026-09-30", "the valid override is kept");
assert.equal(invalid.overrides["2026-02-30"], undefined, "an impossible base date is dropped, not silently kept");
assert.equal(invalid.overrides["2026-10-01"], undefined, "a no-op override is dropped");
const allInvalid = occasions.normalizeOccasion({...existing, overrides: {"2026-02-30": {date: "2026-03-01"}}});
assert.ok(!allInvalid.overrides || !Object.keys(allInvalid.overrides || {}).length, "all-invalid overrides normalize to none");

/* —— 夹具 4：保存装配结构钉 + 红证对照（钉修复前提交 cd5e23c）。 —— */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const saveStart = indexSource.indexOf("private async saveOccasionForm");
assert.ok(saveStart > 0, "saveOccasionForm exists");
const saveBody = indexSource.slice(saveStart, indexSource.indexOf("private async updateOccasion", saveStart));
assert.match(saveBody, /overrides: ruleChanged \? undefined : existing\?\.overrides/, "the assembly preserves overrides unless the rule changed");
assert.match(saveBody, /existing\?\.date !== date \|\| existing\?\.recurrence !== recurrence/, "the rule-change predicate covers date and recurrence");
assert.match(saveBody, /msg\.occasionOverridesCleared/, "clearing stale overrides surfaces a notice");
assert.match(saveBody, /this\.occasionStore = previous/, "persist failure rolls back to the previous store");
const preFixIndex = cp.execSync("git show cd5e23c:src/index.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixIndex, /overrides: ruleChanged/, "the pre-fix assembly dropped overrides entirely (red evidence)");
const preFixOccasionBody = preFixIndex.slice(preFixIndex.indexOf("private async saveOccasionForm"), preFixIndex.indexOf("private async updateOccasion"));
assert.doesNotMatch(preFixOccasionBody, /overrides:/, "the pre-fix assembly never passed overrides (red evidence)");

/* —— 夹具 5：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"msg\.occasionOverridesCleared":/g) || []).length, 2, "the notice exists in both dictionaries");

console.log("occasion-edit: all assertions passed");
