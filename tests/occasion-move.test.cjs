/* T-1718 守门：单次改期的预览、冲突与撤销（D-359）。
   风险路径（表单增量）：行内改期只有新日输入，缺原日→新日可视核对、撞实例反馈
   和撤销入口。契约：move 行显原日标签并随选日更新（原日 → 新日可视核对）；新日
   撞已完成记录/其他覆盖实例时 confirm 反馈（允许但明确）；改期过的实例提供撤销
   （findOverrideOriginFor 解析撤销对象，setOccasionOverride 传 undefined 只清本次
   覆盖，恢复周期规则日期；不影响其他周期或历史）；保存失败恢复原规则（既有回滚）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-move-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const weekly = (overrides = {}, completedDates = []) => occasions.normalizeOccasion({
    id: "w", name: "周会", kind: "scheduled", date: "2026-09-15", recurrence: "weekly", weekday: 2,
    enabled: true, completedDates, overrides,
});
const originOf = (item, next) => occasions.findOverrideOriginFor(item, next);

/* —— 夹具 1：改期后撤销对象解析——9/15→9/20，当前发生日 9/20 的来源=9/15。 —— */
const rescheduled = weekly({"2026-09-15": {date: "2026-09-20"}});
assert.equal(originOf(rescheduled, "2026-09-20"), "2026-09-15", "the override origin resolves for the moved occurrence");
assert.equal(originOf(rescheduled, "2026-09-22"), undefined, "a plain recurrence date has no override origin");

/* —— 夹具 2：撤销=清本次覆盖——override 消失、周期规则日期回归、其他周期不受影响。 —— */
const store = {version: 1, occasions: [rescheduled, occasions.normalizeOccasion({id: "w2", name: "另一项", kind: "scheduled", date: "2026-09-16", recurrence: "weekly", weekday: 3, enabled: true, overrides: {"2026-09-17": {date: "2026-09-18"}}})]};
const undoneStore = occasions.setOccasionOverride(store, "w", "2026-09-15", undefined);
const undone = undoneStore.occasions.find((item) => item.id === "w");
assert.equal(undone.overrides, undefined, "undo clears only this override");
assert.equal(occasions.getOccurrenceDate(undone, "2026-09-21"), "2026-09-22", "the recurrence date is restored after undo");
const other = undoneStore.occasions.find((item) => item.id === "w2");
assert.ok(other.overrides && other.overrides["2026-09-17"], "another occasion's overrides are untouched");

/* —— 夹具 3：链式改期后撤销中间环——后续覆盖保留。 —— */
const chainedStore = {version: 1, occasions: [weekly({"2026-09-15": {date: "2026-09-20"}, "2026-09-22": {date: "2026-09-25"}})]};
const chainUndone = occasions.setOccasionOverride(chainedStore, "w", "2026-09-22", undefined).occasions[0];
assert.ok(chainUndone.overrides["2026-09-15"], "the earlier override survives an unrelated undo");

/* —— 夹具 4：冲突检测素材——新日撞已完成记录（bind 侧 confirm 反馈的判定素材）。 —— */
const withDone = weekly({"2026-09-15": {date: "2026-09-20"}}, ["2026-09-20"]);
assert.ok((withDone.completedDates || []).includes("2026-09-20"), "clash detection: the new date is already completed");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 2416791）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSource, /data-occasion-move-origin-label/, "the move row renders the origin label");
assert.match(bindSource, /occ\.moveTo/, "the label updates to the from → to preview");
assert.match(bindSource, /msg\.occasionMoveClash/, "a clashing date confirms before moving");
assert.match(bindSource, /\[data-occasion-move-undo\]/, "the undo entry is wired");
assert.match(bindSource, /host\.saveOccasionOverride!\(id, origin, undefined, root\)/, "undo clears only this override (undefined newDate) and keeps the surface root");
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /findOverrideOriginFor/, "the view resolves the undo target");
assert.match(viewSource, /occ\.moveUndo/, "the undo button is rendered");
assert.match(viewSource, /data-occasion-move-undo-next=\"\$\{escapeHtml\(next\)\}\"/, "undo confirmation receives the current moved date");
const preFixBind = cp.execSync("git show 2416791:src/render/bind-occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixBind, /occasionMoveClash/, "the pre-fix move had no clash feedback (red evidence)");
assert.doesNotMatch(preFixBind, /\[data-occasion-move-undo\]/, "the pre-fix row had no undo entry (red evidence)");

/* —— 夹具 6：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.moveFrom", "occ.moveTo", "occ.moveUndo", "msg.occasionMoveClash", "msg.occasionMoveUndoConfirm"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("occasion-move: all assertions passed");
