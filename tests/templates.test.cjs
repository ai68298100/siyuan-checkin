const assert = require("node:assert/strict"); const fs = require("node:fs"); const os = require("node:os"); const path = require("node:path"); const ts = require("typescript");
const root = path.join(__dirname, "..", "src"); const out = fs.mkdtempSync(path.join(os.tmpdir(), "templates-"));
for (const file of ["types.ts", "catalog.ts", "features/templates.ts"]) { const dest = path.join(out, file.replace(/\.ts$/, ".js")); fs.mkdirSync(path.dirname(dest), {recursive:true}); fs.writeFileSync(dest, ts.transpileModule(fs.readFileSync(path.join(root,file), "utf8"), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText); }
const {normalizeUserTemplate, mergeTemplates, upsertUserTemplate, deleteUserTemplate} = require(path.join(out, "features/templates.js"));
const builtin = [{name:"内置", icon:"✓", kind:"binary", target:1, unit:"次", schedule:{type:"daily"}, group:"", priority:"medium", note:""}];
const user = normalizeUserTemplate({id:"u1", name:"自定义", kind:"bad", target:"x", schedule:{type:"daily"}}, "2026-01-01T00:00:00Z");
assert.equal(user.kind, "binary"); assert.equal(user.target, 1); assert.equal(mergeTemplates(builtin, [user]).length, 2); assert.equal(mergeTemplates(builtin, [user, user]).length, 2);
assert.equal(upsertUserTemplate([], user).length, 1); assert.equal(upsertUserTemplate([user], {...user, name:"更新"})[0].name, "更新"); assert.equal(deleteUserTemplate([user], "u1").length, 0); console.log("User template model checks passed.");

const persisted = [
    {...user, id: "persisted", name: "持久化模板", updatedAt: "2026-09-08T00:00:00Z"},
    {...user, id: "persisted", name: "重复 ID 的最新版本", updatedAt: "2026-09-09T00:00:00Z"},
    null,
    {id: "", name: "没有 ID"},
    {id: "invalid-kind", name: "非法类型", kind: "unknown", target: -4},
];
const normalizedPersisted = persisted.map((entry) => normalizeUserTemplate(entry, "2026-09-10T00:00:00Z")).filter(Boolean);
const deduped = normalizedPersisted.reduce((entries, entry) => upsertUserTemplate(entries, entry), []);
assert.equal(deduped.filter((entry) => entry.id === "persisted").length, 1);
assert.equal(deduped.find((entry) => entry.id === "persisted").name, "重复 ID 的最新版本");
assert.equal(deduped.find((entry) => entry.id === "invalid-kind").kind, "binary");
assert.equal(deduped.find((entry) => entry.id === "invalid-kind").target, 0);

const isolatedBuiltin = mergeTemplates(builtin, deduped);
const afterDelete = deleteUserTemplate(deduped, "persisted");
assert.equal(afterDelete.some((entry) => entry.id === "persisted"), false);
assert.equal(isolatedBuiltin.some((entry) => entry.name === "内置"), true);
assert.equal(isolatedBuiltin.filter((entry) => entry.name === "内置").length, 1);
assert.notEqual(afterDelete, deduped);
console.log("User template persistence, duplicate IDs, invalid filtering and builtin isolation checks passed.");
