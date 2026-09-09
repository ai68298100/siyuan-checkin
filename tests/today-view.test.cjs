const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-today-view-"));
for (const filename of ["model.ts", "analytics.ts", "export.ts", "quota.ts", "rules.ts", "types.ts"]) {
  const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
  fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js"),), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const store = model.createDefaultStore();
const makeItem = (id, name, sortOrder, complete = false) => ({ id, name, icon: "", kind: "count", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01", revisions: [], archivePeriods: [], group: "学习", sortOrder, ...(complete ? { } : {}) });
store.items = [makeItem("b", "阅读", 2), makeItem("a", "背单词", 1)];
store.events = [{id: "event-a", itemId: "a", occurredAt: "2026-09-10T08:00:00.000Z", localDate: "2026-09-10", value: 1, unit: "次", source: "manual"}];
assert.equal(typeof model.queryTodayItems, "function");
assert.deepEqual(model.queryTodayItems(store, new Date("2026-09-10T08:00:00+08:00"), {query: "阅读"}).map((item) => item.id), ["b"]);
assert.deepEqual(model.queryTodayItems(store, new Date("2026-09-10T08:00:00+08:00"), {}).map((item) => item.id), ["a", "b"]);
assert.deepEqual(model.queryTodayItems(store, new Date("2026-09-10T08:00:00+08:00"), {pendingOnly: true}).map((item) => item.id), ["b"]);
console.log("Today view query checks passed.");
