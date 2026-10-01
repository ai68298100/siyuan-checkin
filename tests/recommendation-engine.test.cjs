/* T-1735 首切片守门：本地确定性推荐规则引擎——阅读时长映射（D-371）。
   契约（沿 template-linkage「建议不等于启用」）：
   - 唯一分钟单位活跃项目 → 推荐绑定（evidence=unique-minute-unit）；
   - 多项分钟项目 → needs-choice（引擎不猜，choiceCount 如实）；
   - 无分钟项目 → no-candidate（rec.noMinuteItem）；
   - 已启用且已绑定 → 不重复推荐（rec.alreadyConfigured）；
   - 阈值建议恒为通用默认 30（evidence=general-default，如实标注非个性化）；
   - 版本化 RECOMMENDATION_VERSION；纯函数零写入；确定性（同输入同输出）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-rec-engine-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
for (const filename of ["weread-candidates.ts", "recommendation-engine.ts"]) {
    fs.writeFileSync(path.join(dir, "features", filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", filename), "utf8"), {compilerOptions}).outputText);
}
const engine = require(path.join(dir, "features", "recommendation-engine.js"));

const item = (id, name, unit) => ({id, name, unit, kind: unit === "分钟" ? "count" : "binary", archived: false});
const input = (items, wereadIntegration) => ({items, wereadIntegration: {enabled: false, itemId: "", thresholdMinutes: 30, apiKey: "", ...wereadIntegration}});

/* —— 夹具 1：唯一分钟项目 → 推荐绑定。 —— */
const unique = engine.recommendWereadDuration(input([item("only", "阅读分钟", "分钟")], {}));
assert.equal(unique.candidates.length, 1, "the unique minute item is recommended");
assert.equal(unique.candidates[0].value, "only", "the recommendation carries the item id");
assert.equal(unique.candidates[0].evidence, "unique-minute-unit", "the evidence names the uniqueness rule");
assert.equal(unique.noRecommendation, undefined, "no no-candidate conclusion");

/* —— 夹具 2：多项分钟项目 → needs-choice（引擎不猜）。 —— */
const multiple = engine.recommendWereadDuration(input([item("a", "阅读分钟", "分钟"), item("b", "冥想分钟", "分钟")], {}));
const multipleCandidate = multiple.candidates[0];
assert.equal(multipleCandidate.needsChoice, true, "multiple candidates demand a user choice");
assert.equal(multipleCandidate.choiceCount, 2, "the choice count is surfaced");
assert.equal(multipleCandidate.value, "", "the engine does not guess a value");

/* —— 夹具 3：无分钟项目 → no-candidate。 —— */
const none = engine.recommendWereadDuration(input([item("bin", "读完", "次", ), item("num", "笔记", "条")], {}));
assert.equal(none.candidates.length, 0, "no candidates without a minute item");
assert.equal(none.noRecommendation.reasonKey, "rec.noMinuteItem", "the no-candidate conclusion names the reason");

/* —— 夹具 4：已启用且已绑定 → 不重复推荐。 —— */
const configured = engine.recommendWereadDuration(input([item("only", "阅读分钟", "分钟")], {enabled: true, itemId: "only"}));
assert.equal(configured.candidates.length, 0, "a configured source is not re-recommended");
assert.equal(configured.noRecommendation.reasonKey, "rec.alreadyConfigured", "the already-configured conclusion is explicit");

/* —— 夹具 5：阈值建议恒为通用默认 30。 —— */
const threshold = engine.recommendWereadThreshold();
assert.equal(threshold.candidates.length, 1, "the threshold recommendation is a single-candidate batch");
assert.equal(threshold.candidates[0].value, 30, "the threshold recommendation is the general default");
assert.equal(threshold.candidates[0].evidence, "general-default", "the evidence honestly marks it non-personalized");

/* —— 夹具 6：确定性（同输入同输出）与版本化。 —— */
const again = engine.recommendWereadDuration(input([item("only", "阅读分钟", "分钟")], {}));
assert.deepEqual(again, unique, "the engine is deterministic for identical input");
assert.equal(engine.RECOMMENDATION_VERSION, 1, "the recommendation version is tracked");

/* —— 夹具 7：结构钉——纯投影零写入（模块不 import 持久化/宿主）。 —— */
const engineSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "recommendation-engine.ts"), "utf8");
assert.doesNotMatch(engineSource, /persist|saveData|enqueueMutation|applyPreference/, "the engine is a pure projection with zero writes");
assert.match(engineSource, /RECOMMENDATION_VERSION = 1/, "the recommendation version is a tracked constant");

console.log("recommendation-engine: all assertions passed");
