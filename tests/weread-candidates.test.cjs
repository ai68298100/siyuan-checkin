/* T-1742 切片守门：微信读书三种映射的候选按指标过滤（D-366）。
   风险路径（审计点名 settings.ts:212-225,634-636）：三个下拉共用前 200 个活跃
   项目，单位不在候选层区分——阅读时长可选非分钟项目（启用时才失败）。
   契约：阅读时长只候选"分钟"单位（与写入校验同纪律）；完读候选二值；笔记候选
   数值；当前绑定项永远保留（retained 标记）；候选为空显示占位；不自动合并同一
   项目多指标。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-weread-candidates-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "weread-candidates.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "weread-candidates.ts"), "utf8"), {compilerOptions}).outputText);
const candidates = require(path.join(dir, "features", "weread-candidates.js"));

const item = (id, name, unit, kind) => ({id, name, unit, kind: kind || "count", archived: false});
const roster = [
    item("min1", "阅读分钟", "分钟"),
    item("min2", "冥想分钟", "分钟"),
    item("bin1", "读完一本书", "次", "binary"),
    item("num1", "笔记条数", "条"),
    item("arc", "已归档分钟", "分钟", undefined),
];
roster.find((entry) => entry.id === "arc").archived = true;

/* —— 夹具 1：阅读时长只候选分钟单位，归档排除。 —— */
const minutes = candidates.wereadCandidates(roster, "", "minutes");
assert.deepEqual(minutes.items.map((entry) => entry.id), ["min1", "min2"], "minutes metric only surfaces minute-unit active items");

/* —— 夹具 2：完读候选二值；笔记候选数值。 —— */
assert.deepEqual(candidates.wereadCandidates(roster, "", "binary").items.map((entry) => entry.id), ["bin1"], "binary metric surfaces binary items");
assert.deepEqual(candidates.wereadCandidates(roster, "", "numeric").items.map((entry) => entry.id), ["min1", "min2", "num1"], "numeric metric surfaces non-binary items");

/* —— 夹具 3：当前绑定项永远保留（哪怕单位/类型不匹配），retained 语义。 —— */
const retained = candidates.wereadCandidates(roster, "num1", "minutes");
assert.equal(retained.retained.id, "num1", "the current binding is retained even off-metric");
assert.equal(retained.items[0].id, "num1", "the retained item leads the list");
assert.equal(retained.items.length, 3, "retained + metric candidates");

/* —— 夹具 4：空候选 → 空列表（渲染层显示占位）。 —— */
const empty = candidates.wereadCandidates([{id: "bin-only", name: "二值", unit: "次", kind: "binary", archived: false}], "", "minutes");
assert.equal(empty.items.length, 0, "no matching items yields an empty candidate list");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 7565de5）。 —— */
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /wereadOptionsFor\(selectedId, "minutes"\)/, "duration candidates filter to minutes");
assert.match(settingsSource, /wereadOptionsFor\(selectedId, "binary"\)/, "finish candidates filter to binary");
assert.match(settingsSource, /wereadOptionsFor\(selectedId, "numeric"\)/, "notes candidates filter to numeric");
assert.match(settingsSource, /wereadCandidates\(ctx\.store\.items/, "the settings view uses the shared candidate projection");
assert.match(settingsSource, /set\.wereadNoMatching/, "an empty candidate list shows a placeholder instead of silence");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"set.wereadNoMatching":/g) || []).length, 2, "the placeholder exists in both dictionaries");
const preFixSettings = cp.execSync("git show 7565de5:src/render/settings.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixSettings, /wereadOptionsFor\(selectedId, "minutes"\)/, "the pre-fix settings used the unfiltered list (red evidence)");
assert.match(preFixSettings, /const wereadItemOptions = \(selectedId: string\): string => projectOptions\(selectedId\);/, "the pre-fix settings reused the unfiltered project options (red evidence)");

console.log("weread-candidates: all assertions passed");
