const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-auto-archive-performance-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const start = new Date(2016, 8, 20, 12);
const dayKey = (offset) => {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    return model.dateKey(date);
};
const item = {
    id: "long-history", name: "长期项目", icon: "✓", kind: "binary", target: 1, unit: "次",
    schedule: {type: "daily"}, createdDate: dayKey(0), createdAt: "2016-09-20T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z", revisions: [], archivePeriods: [], archived: false,
    group: "", priority: "medium", sortOrder: 0, timeSlot: "any",
};
const events = Array.from({length: 100000}, (_, index) => {
    const localDate = dayKey(index % 3650);
    return {id: `event-${index}`, itemId: item.id, occurredAt: `${localDate}T04:00:00.000Z`, localDate, value: 1, unit: "次", source: "manual"};
});
const store = {version: 2, items: [item], events, eventTombstones: []};
const today = new Date(start);
today.setDate(today.getDate() + 3649);
const startedAt = performance.now();
const completedDays = model.countCompletedDays(store, item, today);
const elapsed = performance.now() - startedAt;
assert.equal(completedDays, 3650, "every represented daily opportunity is complete exactly once");
assert.ok(elapsed < 500, `100k-event auto-archive projection must finish within 500ms, received ${elapsed.toFixed(1)}ms`);
console.log(`Auto-archive performance checks passed: 100k events across 3650 days in ${elapsed.toFixed(1)}ms.`);
