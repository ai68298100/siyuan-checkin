const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "template-manager-"));
for (const [name, file] of [["templates", "features/templates.ts"], ["template-manager", "features/template-manager.ts"]]) { const source = fs.readFileSync(path.join(__dirname, "..", "src", file), "utf8"); fs.writeFileSync(path.join(dir, name + ".js"), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); }
const templates = require(path.join(dir, "templates.js")); const api = require(path.join(dir, "template-manager.js"));
let store = templates.upsertUserTemplate([], {id: "u1", name: "晨间阅读", icon: "📖", kind: "duration", target: 20, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "medium", note: "安静阅读"});
store = templates.upsertUserTemplate(store, {...store[0], id: "u2", name: "晚间拉伸", group: "健康"});
assert.equal(api.selectTemplates(store, "健康").length, 1); const html = api.renderTemplateManager(store, {query: "", editingId: store[0].id}); assert.match(html, /编辑模板/); assert.match(html, /晨间阅读/); assert(!html.includes("<script"));
assert.match(api.renderTemplateManager(api.saveManagedTemplate(store, {...store[0], name: "安全 <模板>"}), {query: "安全"}), /安全 &lt;模板&gt;/); assert.equal(api.selectTemplates(api.removeManagedTemplate(store, "u1")).length, 1); console.log("Template manager checks passed"); fs.rmSync(dir, {recursive: true, force: true});
