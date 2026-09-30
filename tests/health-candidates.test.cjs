/* T-1745 切片守门：健康文档与步数/体重映射候选（D-369）。
   风险路径：健康收件箱映射下拉与写入校验脱节——steps 可选非"步"单位项目、weight
   可选非公斤项目，摄取时才失败（hasHealthTarget 拦截）。
   契约：healthCandidates 纯投影——steps 只候选"步/步数"单位、weight 只候选
   "公斤/千克/kg"单位的活跃项目（与写入校验同纪律，失败提前到候选层）；
   当前绑定项永远保留（retained）；同项目多指标语义保持（metric 逐绑定传入）；
   空候选渲染占位（set.healthNoMatching ×2）不静默。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-health-candidates-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "health-candidates.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "health-candidates.ts"), "utf8"), {compilerOptions}).outputText);
const candidates = require(path.join(dir, "features", "health-candidates.js"));

const item = (id, name, unit, archived) => ({id, name, unit, kind: "count", archived: archived === true});
const roster = [
    item("steps1", "每日步数", "步"),
    item("steps2", "健走步数", "步数"),
    item("weight1", "体重记录", "公斤"),
    item("weight2", "体重kg", "kg"),
    item("count1", "次数项", "次"),
    item("arc", "归档步数", "步", true),
];

/* —— 夹具 1：steps 只候选步/步数，归档排除。 —— */
const steps = candidates.healthCandidates(roster, "", "steps");
assert.deepEqual(steps.items.map((entry) => entry.id), ["steps1", "steps2"], "steps metric only surfaces step-unit active items");

/* —— 夹具 2：weight 候选公斤/千克/kg，次数项排除。 —— */
const weight = candidates.healthCandidates(roster, "", "weight");
assert.deepEqual(weight.items.map((entry) => entry.id), ["weight1", "weight2"], "weight metric surfaces kg-family items only");

/* —— 夹具 3：retained——当前绑定项不在候选单位内也保留置顶。 —— */
const retained = candidates.healthCandidates(roster, "count1", "steps");
assert.equal(retained.retained.id, "count1", "the current binding is retained even off-metric");
assert.equal(retained.items[0].id, "count1", "the retained item leads the list");
assert.ok(retained.items.some((entry) => entry.id === "steps1"), "metric candidates follow the retained item");

/* —— 夹具 4：空候选 → 空列表。 —— */
const empty = candidates.healthCandidates([{id: "weight-only", name: "体重kg", unit: "kg", kind: "count", archived: false}], "", "steps");
assert.equal(empty.items.length, 0, "no matching items yields an empty list");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 7e2b523）。 —— */
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /const healthItemOptions = \(selectedId: string, metric: "steps" | "weight" = "steps"\)/, "the health options take the metric");
assert.match(settingsSource, /healthCandidates\(ctx\.store\.items/, "the settings view uses the shared candidate projection");
assert.match(settingsSource, /healthItemOptions\(binding\.itemId, binding\.metric\)/, "each binding filters by its own metric");
assert.match(settingsSource, /healthItemOptions\("", "steps"\)/, "the new-binding template defaults to steps");
assert.match(settingsSource, /set\.healthNoMatching/, "an empty candidate list shows a placeholder instead of silence");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"set\.healthNoMatching":/g) || []).length, 2, "the placeholder exists in both dictionaries");
const preFixSettings = cp.execSync("git show 7e2b523:src/render/settings.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixSettings, /healthCandidates\(ctx\.store\.items/, "the pre-fix settings used the unfiltered list (red evidence)");
const preFixHealthOptions = preFixSettings.match(/const healthItemOptions = \(selectedId: string\) => projectOptions\(selectedId\);/);
assert.ok(preFixHealthOptions, "the pre-fix health options reused the unfiltered project options (red evidence)");

console.log("health-candidates: all assertions passed");
