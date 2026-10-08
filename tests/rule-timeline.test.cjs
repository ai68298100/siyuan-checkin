/* T-1777 守门：项目规则变更历史时间线（D-347）。
   风险路径（2026-09-30 审计）：页面缺少 revisions 可浏览时间线——用户看不到
   每次生效日/类型/目标/单位/排期/方向变化与新旧统计为何不同。
   契约：buildRuleTimeline 纯投影（相邻修订 diff 六字段、生效区间至下一修订前一日、
   末条=至今、解释键按变化字段映射）；createdDate 早于首个修订的区间如实标
   "无法还原"；渲染层只读（editor 高级区 details，不触发重算或保存）；
   从回顾/洞察「编辑规则」进编辑器即达（间接跨页跳入）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-rule-timeline-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "rule-timeline.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "rule-timeline.ts"), "utf8"), {compilerOptions}).outputText);
const ruleTimeline = require(path.join(dir, "features", "rule-timeline.js"));

const revision = (effectiveDate, overrides = {}) => ({
    effectiveDate,
    kind: "count",
    target: 3,
    unit: "杯",
    direction: "atLeast",
    schedule: {type: "daily"},
    ...overrides,
});
const baseItem = (revisions, createdDate = "2026-09-01") => ({
    id: "p1",
    name: "咖啡",
    icon: "☕",
    kind: "count",
    target: 3,
    unit: "杯",
    schedule: {type: "daily"},
    createdAt: `${createdDate}T08:00:00.000Z`,
    updatedAt: `${createdDate}T08:00:00.000Z`,
    createdDate,
    revisions,
    archivePeriods: [],
    archived: false,
});

/* —— 夹具 1：单修订 = 初始规则，无变化点、至今区间。 —— */
const single = ruleTimeline.buildRuleTimeline(baseItem([revision("2026-09-01")]));
assert.equal(single.entries.length, 1);
assert.equal(single.entries[0].changes.length, 0, "the initial rule has no change rows");
assert.equal(single.entries[0].isCurrent, true);
assert.equal(single.entries[0].endDate, undefined, "the last revision runs ongoing");
assert.equal(single.unknownBefore, undefined, "aligned createdDate leaves no unknown range");

/* —— 夹具 2：类型+目标变化与方向切换，解释键按字段映射，区间到下一修订前一日。 —— */
const mixed = ruleTimeline.buildRuleTimeline(baseItem([
    revision("2026-09-01", {kind: "binary", target: 1, unit: "次"}),
    revision("2026-09-10", {kind: "count", target: 3, unit: "杯", direction: "atMost"}),
]));
assert.equal(mixed.entries.length, 2);
const initial = mixed.entries[0];
assert.equal(initial.changes.length, 0, "the initial revision carries no change rows");
assert.equal(initial.endDate, "2026-09-09", "the range ends the day before the next revision");
const changed = mixed.entries[1];
assert.deepEqual(changed.changes.map((change) => change.field), ["kind", "target", "unit", "direction"], "all changed fields are listed on the later entry");
assert.ok(changed.explanationKeys.includes("editor.timelineExplainKind"), "kind changes carry the completion-semantics explanation");
assert.ok(changed.explanationKeys.includes("editor.timelineExplainDirection"), "direction switches carry the no-rewrite explanation");
assert.equal(changed.isCurrent, true, "the last revision is current");

/* —— 夹具 3：排期类型与细节分别成点。 —— */
const scheduleMix = ruleTimeline.buildRuleTimeline(baseItem([
    revision("2026-09-01"),
    revision("2026-09-15", {schedule: {type: "weekly", weekdays: [1, 3]}}),
]));
const scheduleChanges = scheduleMix.entries[1].changes.map((change) => change.field);
assert.ok(scheduleChanges.includes("scheduleType"), "a schedule type change is its own row");
assert.equal(scheduleChanges.filter((field) => field === "scheduleDetail").length, 1, "the weekday detail is one row");

/* —— 夹具 4：createdDate 早于首个修订 → 未知区间如实标出。 —— */
const withGap = ruleTimeline.buildRuleTimeline(baseItem([revision("2026-09-10")], "2026-09-01"));
assert.deepEqual(withGap.unknownBefore, {from: "2026-09-01", until: "2026-09-09"}, "the unrestorable range is reported verbatim");
const aligned = ruleTimeline.buildRuleTimeline(baseItem([revision("2026-09-01")], "2026-09-01"));
assert.equal(aligned.unknownBefore, undefined);

/* —— 夹具 5：渲染与接线结构钉 + 红证对照（钉 3bdef3b）。 —— */
const editorSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "editor.ts"), "utf8");
assert.match(editorSource, /renderRuleTimelineView\(item\)/, "the editor advanced area renders the timeline");
assert.match(editorSource, /data-rule-timeline/, "the timeline is a details section");
assert.match(editorSource, /editor\.timelineUnknown/, "unknown ranges surface the unrestorable copy");
assert.match(editorSource, /explanationKeys\.map/, "the timeline renders the statistics explanations");
const projectionSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "rule-timeline.ts"), "utf8");
for (const field of ["kind", "target", "unit", "direction", "scheduleType", "scheduleDetail"]) {
    assert.match(projectionSource, new RegExp(`${field}: "editor\\.timelineExplain`), `the ${field} change maps to its statistics explanation`);
}
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["editor.timelineTitle", "editor.timelineUntil", "editor.timelineCurrent", "editor.timelineInitial", "editor.timelineUnknown", "editor.timelineHint", "editor.timelineField.kind", "editor.timelineField.target", "editor.timelineField.unit", "editor.timelineField.direction", "editor.timelineField.scheduleType", "editor.timelineField.scheduleDetail", "editor.timelineDirectionAtLeast", "editor.timelineExplainKind", "editor.timelineExplainTarget", "editor.timelineExplainUnit", "editor.timelineExplainDirection", "editor.timelineExplainSchedule", "editor.timelineExplainScheduleDetail"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}
const preFixEditor = cp.execSync("git show 3bdef3b:src/render/editor.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixEditor, /data-rule-timeline/, "the pre-fix editor had no timeline (red evidence)");
const cssSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
assert.match(cssSource, /rule-timeline-entry/, "the timeline ships with its styles");

console.log("rule-timeline: all assertions passed");
