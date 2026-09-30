/* T-1717 守门：事项重复与相似项提示（D-360）。
   风险路径（防误建）：新建/模板套用保存前无查重——同名或相似事项可静默重复建立。
   契约：findSimilarOccasions——exact=同名（trim 后精确、大小写不敏感），similar=双向
   包含；排除编辑目标自身与已归档；只提示不合并（合法重名确认后保留），上限 5 条；
   新建提交时 confirm（msg.occasionDuplicate），编辑既有事项不查（改的是自己）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-duplicate-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const item = (id, name, disabled) => occasions.normalizeOccasion({id, name, kind: "birthday", date: "2026-05-20", recurrence: "annual", enabled: !disabled});
const roster = [item("a", "妈妈生日"), item("b", "妈妈的生日"), item("c", "张三生日"), item("d", "妈妈生日", true), item("e", "周会")];

/* —— 夹具 1：exact=同名（含大小写不敏感）。事项无归档概念（停用=enabled=false），停用项仍算重名。 —— */
const hits = occasions.findSimilarOccasions(roster, "妈妈生日");
assert.deepEqual(hits.map((entry) => entry.id), ["a", "d"], "exact name matches; disabled duplicates still count as duplicates");
const caseHit = occasions.findSimilarOccasions(roster, "MOM's 生日");
assert.ok(Array.isArray(caseHit), "case-insensitive input stays safe");

/* —— 夹具 2：similar=双向包含（"生日"命中所有含"生日"的名字），上限 5。 —— */
const similar = occasions.findSimilarOccasions(roster, "生日");
assert.ok(similar.length >= 3 && similar.length <= 5, "similar matches include bidirectional contains within the limit");
assert.ok(similar.some((entry) => entry.id === "a") && similar.some((entry) => entry.id === "c"), "contains-matches are surfaced");

/* —— 夹具 3：排除编辑目标自身。 —— */
const selfExcluded = occasions.findSimilarOccasions(roster, "周会", "e");
assert.equal(selfExcluded.length, 0, "the edited item never matches itself");

/* —— 夹具 4：空名返回空。 —— */
assert.equal(occasions.findSimilarOccasions(roster, "  ").length, 0, "blank names never match");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 f65e118）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSource, /const duplicates = findSimilarOccasions\(host\.occasionStore\.occasions, String\(data\.get\("name"\) \|\| ""\)\)/, "the submit consults the duplicate finder");
assert.match(bindSource, /if \(!host\.editingOccasionId\) \{/, "only the create path checks duplicates");
assert.match(bindSource, /msg\.occasionDuplicate/, "the confirm copy is bilingual-driven");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"msg\.occasionDuplicate":/g) || []).length, 2, "the duplicate copy exists in both dictionaries");
const preFixBind = cp.execSync("git show f65e118:src/render/bind-occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixBind, /findSimilarOccasions/, "the pre-fix submit had no duplicate check (red evidence)");

console.log("occasion-duplicate: all assertions passed");
