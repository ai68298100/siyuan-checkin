/* T-1514 规则修改前后影响对照守门：
   字段级差异（类型/目标/单位/频率/排期参数）、只改名称等展示字段不触发、
   未来 30 天安排差集（复用 T-1513 内核口径）、单位不自动换算、
   非法草稿无日级差异可算、确定性与编辑器保存拦截接线、双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-rule-change-"));
const load = (relative) => {
    /* 按源码相对路径落盘，保持 ./schedule-preview 与 ../date-keys 可解析。 */
    const target = path.join(dir, "src", relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
/* rule-change-diff 在模块加载时 require ./schedule-preview，须先落盘。 */
load("date-keys.ts");
load("features/schedule-preview.ts");
const diff = load("features/rule-change-diff.ts");

const BASE = {kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}};
const START = "2026-09-21"; // Monday

/* —— 1. 名称等展示字段不在对照范围：规则相同即 changed=false。 —— */
assert.equal(diff.buildRuleChangeDiff(BASE, BASE, START).changed, false, "display-only edits never trigger the comparison");

/* —— 2. 目标/单位/类型变化：字段级正确；单位不自动换算（原样呈现 from/to）。 —— */
{
    const target = diff.buildRuleChangeDiff(BASE, {...BASE, target: 20}, START);
    assert.equal(target.changed, true);
    assert.deepEqual(target.targetChanged, {from: 30, to: 20});
    assert.equal(target.addedDays.length, 0, "target-only change has no schedule day diff");
    const unit = diff.buildRuleChangeDiff(BASE, {...BASE, unit: "小时"}, START);
    assert.deepEqual(unit.unitChanged, {from: "分钟", to: "小时"}, "units are presented verbatim, never converted");
    assert.equal(unit.removedDays.length, 0);
    const kind = diff.buildRuleChangeDiff(BASE, {...BASE, kind: "binary", unit: "次", target: 1}, START);
    assert.equal(kind.changed, true);
    assert.deepEqual(kind.kindChanged, {from: "duration", to: "binary"});
}

/* —— 3. 频率变化：daily→workdays 的未来 30 天差集 = 全部周末。 —— */
{
    const result = diff.buildRuleChangeDiff(BASE, {...BASE, schedule: {type: "workdays"}}, START);
    assert.deepEqual(result.frequencyChanged, {from: "daily", to: "workdays"});
    const expectedRemoved = ["2026-09-26", "2026-09-27", "2026-10-03", "2026-10-04", "2026-10-10", "2026-10-11", "2026-10-17", "2026-10-18"];
    assert.deepEqual(result.removedDays, expectedRemoved);
    assert.equal(result.addedDays.length, 0);
}

/* —— 4. 同类型参数变化：星期 [1,3]→[2,4]；配额 3→5 无日级差集。 —— */
{
    const weekdays = diff.buildRuleChangeDiff({...BASE, schedule: {type: "custom", weekdays: [1, 3]}}, {...BASE, schedule: {type: "custom", weekdays: [2, 4]}}, START);
    assert.equal(weekdays.detailChanged, true);
    assert.deepEqual(weekdays.addedDays, ["2026-09-22", "2026-09-24", "2026-09-29", "2026-10-01", "2026-10-06", "2026-10-08", "2026-10-13", "2026-10-15", "2026-10-20"]);
    assert.deepEqual(weekdays.removedDays, ["2026-09-21", "2026-09-23", "2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07", "2026-10-12", "2026-10-14", "2026-10-19"]);
    const quota = diff.buildRuleChangeDiff({...BASE, schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}}, {...BASE, schedule: {type: "quota", quota: {period: "week", amount: 5, countMode: "dates"}}}, START);
    assert.equal(quota.detailChanged, true);
    assert.equal(quota.addedDays.length, 0, "quota flexibility keeps no fabricated day diff");
    assert.deepEqual(diff.buildRuleChangeDiff(BASE, {...BASE, schedule: {type: "daily"}}, START), diff.buildRuleChangeDiff(BASE, {...BASE, schedule: {type: "daily"}}, START), "deterministic");
}

/* —— 5. 非法新排期：previewUnavailable，无日级差集可算。 —— */
{
    const invalid = diff.buildRuleChangeDiff(BASE, {...BASE, schedule: {type: "custom", weekdays: []}}, START);
    assert.equal(invalid.changed, true);
    assert.equal(invalid.previewUnavailable, true);
    assert.equal(invalid.addedDays.length, 0);
}

/* —— 6. 编辑器保存拦截接线与双语。 —— */
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /buildRuleChangeDiff\(/, "save flow computes the rule change diff");
assert.match(bindSource, /editor\.ruleChangeConfirm/, "saving changed rules asks for explicit confirmation");
assert.match(bindSource, /ruleChangeHost\.hidden = false/, "the comparison panel renders before confirmation");
assert.match(bindSource, /readRuleSideFromForm\(data, submittedAt\.localDate\)/, "the after side reads the current form");
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
assert.match(editorSource, /data-rule-change hidden/, "editor hosts a hidden comparison panel");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["editor.ruleChangeTitle", "editor.ruleChangeNote", "editor.ruleChangeKind", "editor.ruleChangeTarget", "editor.ruleChangeUnit", "editor.ruleChangeFrequency", "editor.ruleChangeDetailChanged", "editor.ruleChangeAddedDays", "editor.ruleChangeRemovedDays", "editor.ruleChangeConfirm"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("rule change diff gates passed: field-level comparison, display-only edits exempt, kernel-parity day diff, verbatim units, invalid drafts, save interception and bilingual copy.");
