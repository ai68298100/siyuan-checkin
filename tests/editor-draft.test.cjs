/* T-1773 守门：编辑器草稿的离开保护（D-344）。
   风险路径（2026-09-30 审计）：bind-editor 返回直接导航、表单值只在 DOM——
   未保存的名称/目标/排期/规则修改在离开时静默丢失。
   契约：绑定期把表单签名写入 root dataset（新建与编辑同法）；离开（返回/切页/
   跳洞察）经 applyNavigation 单一咽喉点比对，dirty 时 confirm（取消=留编辑器，
   离开=丢弃并明示不跨重载）；文件附件不进签名；保存失败本就不重绘编辑器页
   （renderBackgroundUpdateFor 对 editor 页 no-op），表单天然保留。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-editor-draft-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "editor-draft.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "editor-draft.ts"), "utf8"), {compilerOptions}).outputText);
const editorDraft = require(path.join(dir, "features", "editor-draft.js"));

/* Node 的 FormData 不支持克隆构造——手动复制条目。 */
const cloneFormData = (source) => {
    const copy = new FormData();
    source.forEach((value, key) => copy.append(key, value));
    return copy;
};

/* —— 夹具 1：签名与序无关、跳过文件、判定准确。 —— */
const first = new FormData();
first.set("name", "晨读");
first.set("target", "30");
first.set("schedule", "daily");
const second = new FormData();
second.set("schedule", "daily");
second.set("target", "30");
second.set("name", "晨读");
assert.equal(editorDraft.formSignatureFromData(first), editorDraft.formSignatureFromData(second), "the signature is order-insensitive");
const baseline = editorDraft.formSignatureFromData(first);
assert.equal(editorDraft.isEditorFormDirty(cloneFormData(first), baseline), false, "unchanged form is clean");
const edited = cloneFormData(first);
edited.set("target", "45");
assert.equal(editorDraft.isEditorFormDirty(edited, baseline), true, "an edited field is dirty");
assert.equal(editorDraft.isEditorFormDirty(undefined, baseline), false, "a missing form never blocks navigation");
assert.equal(editorDraft.isEditorFormDirty(cloneFormData(first), undefined), false, "a missing baseline never blocks (global nav)");

/* —— 夹具 2：文件输入跳过（附件走独立管线）。 —— */
const withFile = cloneFormData(first);
if (typeof File === "function") {
    withFile.set("attachment", new File(["x"], "a.png", {type: "image/png"}));
    assert.equal(editorDraft.isEditorFormDirty(withFile, baseline), false, "file inputs do not affect the signature");
}

/* —— 夹具 3：接线结构钉 + 红证对照（钉修复前提交 3999773）。 —— */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const applyStart = indexSource.indexOf("applyNavigation(root: HTMLElement | undefined, page: CheckinPageId)");
assert.ok(applyStart > 0, "applyNavigation exists");
const applyBody = indexSource.slice(applyStart, indexSource.indexOf("pageOfRoot(root: HTMLElement): CheckinPageId", applyStart));
assert.match(applyBody, /isEditorFormDirty\(/, "the navigation choke point checks draft dirtiness");
assert.match(applyBody, /editor\.dirtyLeaveConfirm/, "leaving a dirty editor confirms first");
assert.match(applyBody, /page !== "editor"/, "entering the editor is never blocked");
assert.match(applyBody, /pageOfRoot\(root\) === "editor"/, "only editor roots are guarded");
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /root\.dataset\.editorDraftBaseline = formSignatureFromData\(new FormData\(draftForm\)\)/,
    "binding captures the baseline signature onto the root");
const preFixIndex = cp.execSync("git show 3999773:src/index.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixIndex, /isEditorFormDirty\(/, "the pre-fix tree had no draft guard (red evidence)");
const preFixBind = cp.execSync("git show 3999773:src/render/bind-editor.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixBind, /editorDraftBaseline/, "the pre-fix tree had no baseline capture (red evidence)");

/* —— 夹具 4：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"editor\.dirtyLeaveConfirm":/g) || []).length, 2, "the confirm copy exists in zh-CN and en-US");

console.log("editor-draft: all assertions passed");
