const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const modules = new Map();
function loadSource(relative) {
    const filename = path.join(sourceRoot, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = {exports: {}};
    modules.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions}).outputText;
    new Function("require", "module", "exports", compiled)(name => name.startsWith(".")
        ? loadSource(path.relative(sourceRoot, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name), loaded, loaded.exports);
    return loaded.exports;
}

const adapter = loadSource("features/yeguif-adapter.ts");
const report = {
    mode: "preview",
    outcome: "ok",
    scanned: 8,
    matched: 8,
    unmatched: 0,
    planned: 2,
    written: 0,
    duplicate: 1,
    tombstoned: 1,
    manualConflict: 0,
    invalid: 0,
    blocked: 4,
    storageRetryable: 0,
    windowFull: false,
};
const entries = [
    {blockId: "run-000001", localDate: "2026-10-04", startMinutes: 540, endMinutes: 570, minutes: 30, type: "跑步", text: ""},
    {blockId: "run-000002", localDate: "2026-10-04", startMinutes: 570, endMinutes: 585, minutes: 15, type: "跑步", text: "间歇"},
    {blockId: "stretch-001", localDate: "2026-10-04", startMinutes: 585, endMinutes: 600, minutes: 15, type: "拉伸", text: ""},
    {blockId: "missing-01", localDate: "2026-10-04", startMinutes: 600, endMinutes: 610, minutes: 10, type: "缺失目标", text: ""},
    {blockId: "archived-1", localDate: "2026-10-04", startMinutes: 610, endMinutes: 620, minutes: 10, type: "归档项目", text: ""},
    {blockId: "binary-001", localDate: "2026-10-04", startMinutes: 620, endMinutes: 630, minutes: 10, type: "非分钟项目", text: ""},
    {blockId: "duplicate1", localDate: "2026-10-04", startMinutes: 630, endMinutes: 640, minutes: 10, type: "已存在", text: ""},
    {blockId: "tombstone", localDate: "2026-10-04", startMinutes: 640, endMinutes: 650, minutes: 10, type: "已删除", text: ""},
];
const mappings = [
    {project: "跑步", itemId: "run-target"},
    {project: "缺失目标", itemId: "missing-target"},
    {project: "归档项目", itemId: "archived-target"},
    {project: "非分钟项目", itemId: "binary-target"},
    {project: "已存在", itemId: "existing-target"},
    {project: "已删除", itemId: "deleted-target"},
];
const targets = [
    {id: "run-target", name: "跑步", unit: "分钟"},
    {id: "archived-target", name: "归档跑步", unit: "分钟", archived: true},
    {id: "binary-target", name: "二值项目", unit: "次"},
    {id: "existing-target", name: "已存在目标", unit: "分钟"},
    {id: "deleted-target", name: "已删除目标", unit: "分钟"},
];
const externalRef = blockId => adapter.buildYeguifExternalRef(blockId, "2026-10-04");
const result = adapter.buildYeguifPreviewReadReport({
    report,
    entries,
    mappings,
    targets,
    existingRefs: new Set([externalRef("duplicate1")]),
    tombstonedRefs: new Set([externalRef("tombstone")]),
    results: new Map(),
});

assert.equal(result.groups.length, 7, "all source projects have independent groups, including blocked routes");
assert.deepEqual(result.groups.find(group => group.sourceName === "跑步"), {
    sourceName: "跑步", targetId: "run-target", targetName: "跑步", records: 2, minutes: 45,
    byStatus: {writable: {records: 2, minutes: 45}},
});
assert.deepEqual(result.groups.find(group => group.sourceName === "拉伸"), {
    sourceName: "拉伸", targetId: "", targetName: "", records: 1, minutes: 15,
    byStatus: {unmapped: {records: 1, minutes: 15}},
});
assert.equal(result.groups.find(group => group.sourceName === "归档项目").targetId, "archived-target");
assert.equal(result.groups.find(group => group.sourceName === "归档项目").byStatus["archived-target"].minutes, 10);
assert.equal(result.groups.find(group => group.sourceName === "非分钟项目").byStatus["non-minute-target"].records, 1);
assert.equal(result.groups.find(group => group.sourceName === "缺失目标").byStatus["missing-target"].records, 1);
assert.equal(result.groups.find(group => group.sourceName === "已存在").byStatus.duplicate.records, 1);
assert.equal(result.groups.find(group => group.sourceName === "已删除").byStatus.tombstoned.records, 1);
assert.deepEqual(result.totals, {
    records: 8,
    minutes: 110,
    byStatus: {
        writable: {records: 2, minutes: 45},
        unmapped: {records: 1, minutes: 15},
        "missing-target": {records: 1, minutes: 10},
        "archived-target": {records: 1, minutes: 10},
        "non-minute-target": {records: 1, minutes: 10},
        duplicate: {records: 1, minutes: 10},
        tombstoned: {records: 1, minutes: 10},
    },
}, "the total is the exact sum of the same source groups");
assert.deepEqual(result.differences, [], "projected groups reconcile with the existing read report");

const recent = adapter.buildYeguifPreviewReadReport({
    report: {...report, planned: 1, written: 1, duplicate: 0, tombstoned: 0, blocked: 6},
    entries: [entries[0]],
    mappings,
    targets,
    results: new Map([[externalRef("run-000001"), "written"]]),
});
assert.deepEqual(recent.groups[0].byStatus.written, {records: 1, minutes: 30}, "recent write result is visible in the source group");
assert.deepEqual(recent.totals.byStatus.written, {records: 1, minutes: 30}, "recent result totals use the same status partition");

const fullCandidates = Array.from({length: 275}, (_, index) => ({id: `target-${index}`, name: `Project ${index}`, unit: "分钟"}));
const full = adapter.buildYeguifPreviewReadReport({
    report: {...report, scanned: 1, matched: 1, planned: 1, written: 0, duplicate: 0, tombstoned: 0, blocked: 0},
    entries: [{...entries[0], blockId: "full-0001", type: "Project 274", minutes: 9, endMinutes: 549}],
    mappings: [],
    targets: fullCandidates,
});
assert.equal(full.groups[0].targetId, "target-274", "automatic matching searches the complete candidate set");
assert.equal(full.groups[0].targetName, "Project 274");

console.log("LifeLog preview projection passed: source groups, target identity, writable/skip reasons, recent result status, reconciled totals and 275 complete candidates.");
