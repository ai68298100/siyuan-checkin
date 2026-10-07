const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const moduleCache = new Map();
function loadTs(filename) {
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const loaded = {exports: {}};
    moduleCache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = (name) => name.startsWith(".")
        ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}

assert.equal(fs.existsSync(path.join(sourceRoot, "features", "template-manager.ts")), false,
    "the unwired template manager prototype must stay retired");
const retiredExports = new Set(["TemplateManagerState", "selectTemplates", "renderTemplateManager", "saveManagedTemplate", "removeManagedTemplate"]);
for (const entry of fs.readdirSync(sourceRoot, {recursive: true})) {
    if (!entry.endsWith(".ts")) continue;
    const filename = path.join(sourceRoot, entry);
    const sourceFile = ts.createSourceFile(filename, fs.readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = (node) => {
        if (ts.isStringLiteralLike(node)) assert.ok(!node.text.includes("template-manager"), `${entry} must not refer to the retired module or DOM`);
        if (ts.isIdentifier(node)) assert.ok(!retiredExports.has(node.text), `${entry} must not depend on the retired exports`);
        ts.forEachChild(node, visit);
    };
    visit(sourceFile);
}

const {normalizeUserTemplate, upsertUserTemplate, deleteUserTemplate} = loadTs(path.join(sourceRoot, "features", "templates.ts"));
const {createDefaultStore} = loadTs(path.join(sourceRoot, "model.ts"));
const {renderEditorView} = loadTs(path.join(sourceRoot, "render", "editor.ts"));
const {t: translate, setPluginLanguage} = loadTs(path.join(sourceRoot, "i18n.ts"));
const {escapeHtml} = loadTs(path.join(sourceRoot, "shared.ts"));
const firstTemplate = normalizeUserTemplate({
    id: "read", name: "Read <safe> \"quoted\"", icon: "📖", kind: "duration", target: 20, unit: "min",
    schedule: {type: "daily"}, group: "Study <safe>", priority: "medium", note: "<script>alert('safe')</script>",
    createdAt: "2026-09-12T00:00:00Z", updatedAt: "2026-09-12T00:00:00Z",
});
const store = upsertUserTemplate(upsertUserTemplate([], firstTemplate), {
    id: "stretch", name: "Evening stretch", icon: "🧘", kind: "duration", target: 10, unit: "min",
    schedule: {type: "daily"}, group: "Health", priority: "low", note: "Before bed",
});
const updated = upsertUserTemplate(store, {...firstTemplate, note: "Second version", updatedAt: "2026-09-13T00:00:00Z"});
assert.equal(updated.length, store.length, "editing a template preserves its identity");
assert.equal(updated.find((template) => template.id === "read").createdAt, firstTemplate.createdAt);
assert.equal(updated.find((template) => template.id === "read").updatedAt, "2026-09-13T00:00:00Z");
assert.deepEqual(upsertUserTemplate(updated, updated.find((template) => template.id === "read")), updated,
    "repeated saves cannot create duplicate templates");
assert.notEqual(updated, store, "template updates leave the previous snapshot available for rollback");
assert.equal(store.find((template) => template.id === "read").note, firstTemplate.note);
const missingDelete = deleteUserTemplate(store, "missing");
assert.deepEqual(missingDelete, store);
assert.notEqual(missingDelete, store, "missing deletes still return an independent collection");
const deleted = deleteUserTemplate(store, "read");
assert.equal(deleted.length, 1);
assert.equal(store.length, 2);
assert.ok(!deleted.some((template) => template.id === "read"));
for (const tomatoMode of ["minutes", "sessions"]) {
    const template = normalizeUserTemplate({...firstTemplate, completionSource: "tomato", tomatoMode});
    assert.equal(template.completionSource, "tomato");
    assert.equal(template.tomatoMode, tomatoMode);
}
assert.equal(normalizeUserTemplate({id: "legacy", name: "Legacy"}).kind, "binary");

for (const language of ["zh-CN", "en-US"]) {
    setPluginLanguage(language);
    const context = {
        store: createDefaultStore(), userTemplates: store, customIconLibrary: [], appearance: "light",
        todayGroupMode: "none", saveState: "idle", syncNoticeActive: false, appliedTemplateNote: "Applied <safe>",
    };
    const html = renderEditorView(context);
    assert.match(html, /data-user-template-list/);
    assert.equal((html.match(/data-user-template-id="read"/g) || []).length, 1);
    assert.equal((html.match(/data-user-template-delete="read"/g) || []).length, 1);
    assert.match(html, /Read &lt;safe&gt; &quot;quoted&quot;/);
    assert.match(html, /&lt;script&gt;alert\(&#39;safe&#39;\)&lt;\/script&gt;/);
    assert.ok(!html.includes(firstTemplate.note), "user notes cannot become executable markup");
    assert.ok(html.includes('aria-label="' + escapeHtml(translate("item.deleteTemplate", {name: firstTemplate.name})) + '"'),
        "dynamic delete labels must remain present and escaped before entering attributes");
    assert.ok(html.includes('aria-label="' + escapeHtml(translate("item.useMyTemplate", {name: firstTemplate.name})) + '"'),
        "applying a personal template must retain its localized accessible name");
    assert.ok(html.includes(translate("item.myTemplates")), "the live personal-template heading must follow the locale");
    assert.match(html, /data-template-count aria-live="polite"/);
    assert.match(html, /data-template-applied-note role="status">Applied &lt;safe&gt;/);
    assert.match(html, /type="search" data-template-query/);
    assert.match(html, /data-template-empty hidden/);
    assert.match(html, /data-action="clear-template-filter"/);
    assert.ok(!html.includes("template-manager-title"), "the old fixed DOM ids cannot return");
    const emptyHtml = renderEditorView({...context, userTemplates: []});
    assert.doesNotMatch(emptyHtml, /data-user-template-list|data-user-template-delete/);
    assert.match(emptyHtml, /data-template-list/);
    const updatedHtml = renderEditorView({...context, userTemplates: updated});
    assert.equal((updatedHtml.match(/data-user-template-id="read"/g) || []).length, 1);
    assert.match(updatedHtml, /Second version/);
    const deletedHtml = renderEditorView({...context, userTemplates: deleted});
    assert.doesNotMatch(deletedHtml, /data-user-template-id="read"|data-user-template-delete="read"/);
    assert.match(deletedHtml, /data-user-template-id="stretch"/);
}

const bindingSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-editor.ts"), "utf8");
const bindingFile = ts.createSourceFile("bind-editor.ts", bindingSource, ts.ScriptTarget.Latest, true);
const bindingFunction = bindingFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "bindEditorHandlers");
assert.ok(bindingFunction?.body, "the live editor binding function must exist");
const deleteStatement = bindingFunction.body.statements.find((statement) => ts.isExpressionStatement(statement)
    && statement.getText(bindingFile).startsWith('root.querySelectorAll<HTMLButtonElement>("[data-user-template-delete]")'));
assert.ok(deleteStatement, "the live editor must wire template deletion");
const compiledDeletion = ts.transpileModule(deleteStatement.getText(bindingFile), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const wireDeletion = new Function("root", "host", "window", "t", "deleteUserTemplate", "showMessage", "USER_TEMPLATES_NAME", "isCurrentSession", compiledDeletion);
const saveStatement = bindingFunction.body.statements.find((statement) => ts.isExpressionStatement(statement)
    && statement.getText(bindingFile).startsWith('root.querySelector<HTMLButtonElement>("[data-action=\'save-template\']")'));
assert.ok(saveStatement, "the live editor must wire template saving");
assert.match(saveStatement.getText(bindingFile), /existing\?\.id \|\| makeId\("template"\)/,
    "saving by the same name reuses its existing template identity");
assert.match(saveStatement.getText(bindingFile), /\.catch\(\(\) => \{[\s\S]*host\.userTemplates = previousTemplates;[\s\S]*t\("msg\.templateSaveFail"\)/,
    "save failures must restore the previous collection and report the failure");
assert.match(bindingSource, /if \(count\) count\.textContent = t\("editor\.templateCount", \{n: matchCount\}\)/,
    "the live search count must keep its localized announcement");
assert.match(bindingSource, /templateQuery\?\.addEventListener\("input", applyTemplateFilter\)/);

async function verifyDeleteBinding() {
    setPluginLanguage("en-US");
    for (const scenario of ["cancel", "missing", "success", "failure"]) {
        const messages = [];
        const confirmations = [];
        let listener;
        let finishPersistence;
        let persistenceCalls = 0;
        let renderCalls = 0;
        const host = {
            userTemplates: store,
            persistUserTemplates(nextTemplates) {
                persistenceCalls += 1;
                return new Promise((resolve, reject) => {
                    finishPersistence = () => scenario === "failure" ? reject(new Error("save failed")) : resolve();
                }).then(() => { host.userTemplates = nextTemplates; });
            },
            render() { renderCalls += 1; },
        };
        const button = {
            dataset: {userTemplateDelete: scenario === "missing" ? "missing" : "read"},
            addEventListener(event, callback) { assert.equal(event, "click"); listener = callback; },
        };
        const surface = {querySelectorAll(selector) { assert.equal(selector, "[data-user-template-delete]"); return [button]; }};
        const windowMock = {confirm(message) { confirmations.push(message); return scenario !== "cancel"; }};
        wireDeletion(surface, host, windowMock, translate, deleteUserTemplate, (message) => messages.push(message), "templates", () => true);
        listener();
        assert.equal(host.userTemplates, store, "the collection cannot change before persistence settles");
        if (scenario === "cancel" || scenario === "missing") {
            assert.equal(persistenceCalls, 0);
            assert.equal(renderCalls, 0);
            assert.deepEqual(messages, []);
            assert.equal(confirmations.length, scenario === "cancel" ? 1 : 0);
        } else {
            assert.equal(persistenceCalls, 1);
            assert.equal(confirmations[0], translate("msg.templateDeleteConfirm", {name: firstTemplate.name}));
            finishPersistence();
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(renderCalls, scenario === "success" ? 1 : 0);
            assert.deepEqual(messages, [translate(scenario === "success" ? "msg.templateDeleted" : "msg.templateDeleteFail")]);
            if (scenario === "success") assert.deepEqual(host.userTemplates, deleted);
            else assert.equal(host.userTemplates, store, "failed deletion preserves the original collection");
        }
    }
    console.log("Template manager retirement checks passed: live bilingual editor, escaped content, stable saves and confirmed delete rollback.");
}

verifyDeleteBinding().catch((error) => { console.error(error); process.exitCode = 1; });
