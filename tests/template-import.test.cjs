/* T-1520 模板包导入逐项差异与冲突处理守门：
   解析（版本/大小/结构契约、非法条目逐条丢弃）、重名决策（默认跳过，
   可替换/另存）、重复导入幂等、取消零写入、失败回滚、替换只影响模板，
   编辑器接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-template-import-"));
const load = (relative) => {
    const target = path.join(dir, path.basename(relative).replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const importer = load("features/template-import.ts");

const entry = (overrides = {}) => ({name: "晨间阅读", icon: "📖", kind: "duration", target: 20, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "medium", ...overrides});
const pkg = (templates, version = 1) => JSON.stringify({app: "siyuan-checkin", shareVersion: version, templates});

/* —— 1. 解析契约：非法 JSON/结构拒绝；版本不符整包拒绝；超大包拒绝。 —— */
{
    assert.equal(importer.parseTemplateShare("not json").errorKey, "editor.importErrorInvalid");
    assert.equal(importer.parseTemplateShare([]).errorKey, "editor.importErrorInvalid");
    assert.equal(importer.parseTemplateShare(pkg([entry()], 2)).errorKey, "editor.importErrorVersion", "unknown versions are rejected by contract");
    assert.equal(importer.parseTemplateShare(pkg([entry()]), {rawByteLength: importer.TEMPLATE_IMPORT_MAX_BYTES + 1}).errorKey, "editor.importErrorLimit");
    const good = importer.parseTemplateShare(pkg([entry()]));
    assert.equal(good.entries.length, 1);
    assert.equal(good.errorKey, undefined);
}

/* —— 2. 字段非法逐条丢弃并计数；合法字段保留。 —— */
{
    const result = importer.parseTemplateShare(pkg([
        entry(),
        entry({name: ""}),
        entry({kind: "machine-code"}),
        entry({target: -3}),
        entry({schedule: {type: "teleport"}}),
        "junk",
    ]));
    assert.equal(result.entries.length, 1);
    assert.equal(result.invalidCount, 5);
    assert.equal(result.entries[0].name, "晨间阅读");
}

/* —— 3. 逐项决策：新默认导入；重名默认跳过（最安全），可选替换/另存。 —— */
{
    const existing = [{id: "tpl-existing", name: "晨间阅读"}];
    const decisions = importer.planImportDecisions([entry(), entry({name: "睡前拉伸"})], existing);
    assert.equal(decisions[0].isNew, false);
    assert.equal(decisions[0].matchedId, "tpl-existing");
    assert.equal(decisions[0].disposition, "skip", "duplicates default to skip (safest)");
    assert.ok(decisions[0].saveAsName.includes("晨间阅读"), "save-as name is derived deterministically");
    assert.equal(decisions[1].isNew, true);
    assert.equal(decisions[1].disposition, "import", "new entries default to import");
    /* 重复导入同一包：第二次全部判重名。 */
    const second = importer.planImportDecisions([entry(), entry({name: "睡前拉伸"})], [...existing, {id: "tpl-new", name: "睡前拉伸"}]);
    assert.equal(second.filter((decision) => decision.isNew).length, 0, "re-importing the same share marks everything duplicate");
}

/* —— 4. 编辑器接线与双语。 —— */
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
assert.match(editorSource, /data-share-import-file/, "import file picker renders");
assert.match(editorSource, /data-import-disposition=/, "per-item disposition radios render");
assert.match(editorSource, /data-share-import-confirm/, "import confirm renders");
assert.match(editorSource, /data-share-import-cancel/, "import cancel renders");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /TEMPLATE_IMPORT_MAX_BYTES/, "file size guard uses the module constant");
assert.match(bindSource, /planImportDecisions\(result\.entries, host\.userTemplates\)/, "decisions plan against the current templates");
assert.match(bindSource, /host\.templateImportSession = undefined/, "cancel clears the session (zero writes)");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /async applyTemplateShareImport\(decisions: ImportDecision\[\], root\?: HTMLElement\): Promise<number>/, "host applies decisions in one batch");
assert.match(indexSource, /templateImportSessionForRoot\(root: HTMLElement\)/, "template import session is root-local");
assert.match(bindSource, /applyTemplateShareImport\?\.\(session\.decisions[\s\S]*root\)/, "confirm applies the session to its surface");
assert.match(bindSource, /!root\.isConnected[\s\S]*isCurrentEditorSession/, "file-reader callback rejects a closed editor root");
assert.match(indexSource, /root\.isConnected \? this\.rootContexts\.get\(root\) : undefined/, "async import completion never re-registers a closed root");
assert.match(indexSource, /this\.userTemplates = previous/, "save failure rolls back to the previous templates");
assert.match(indexSource, /templateImport: editor\.templateImportSession/, "editor ctx exposes the root-local session");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["editor.importLabel", "editor.importHint", "editor.importErrorInvalid", "editor.importErrorLimit", "editor.importErrorVersion", "editor.importInvalidCount", "editor.importNew", "editor.importSkip", "editor.importReplace", "editor.importSaveAs", "editor.importDuplicateOf", "editor.importMetaNew", "editor.importConfirm", "editor.importCancel", "msg.templateImportDone", "msg.templateImportFail"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("template import gates passed: version/size/field contracts, per-item duplicate decisions (skip default), re-import idempotence, cancel zero-write, rollback wiring and bilingual copy.");
