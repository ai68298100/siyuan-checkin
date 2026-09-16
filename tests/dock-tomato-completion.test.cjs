const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("src/dock-tomato.ts", "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
}).outputText;
const moduleUnderTest = {exports: {}};
const localRequire = (id) => {
    if (id === "./integrations") return {DOCK_TOMATO_ADAPTER_ID: "siyuan-plugin-docktomato"};
    if (id === "./types") return {};
    throw new Error(`Unexpected dependency: ${id}`);
};
new Function("require", "module", "exports", compiled)(localRequire, moduleUnderTest, moduleUnderTest.exports);

const {evaluateDockTomatoCompletion, clearDockTomatoCompletionIssues, getDockTomatoCompletionIssues} = moduleUnderTest.exports;
const item = {id: "read", name: "阅读", kind: "count", unit: "分钟", tomatoMode: "minutes", archived: false};
const detail = (overrides = {}, contextOverrides = {}) => ({
    apiVersion: 1,
    sessionId: "session-1",
    durationMinutes: 25,
    context: {consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes", ...contextOverrides},
    ...overrides,
});

assert.equal(evaluateDockTomatoCompletion(detail(), [item]).accepted, true);
assert.equal(evaluateDockTomatoCompletion(detail(), [item]).value, 25);
assert.equal(evaluateDockTomatoCompletion(detail(), [item]).identity, "session-1");
assert.equal(evaluateDockTomatoCompletion(detail({sessionId: "", recordId: "record-1"}), [item]).identity, "record-1");
assert.equal(evaluateDockTomatoCompletion(null, [item]).reason, "invalid-event");
assert.equal(evaluateDockTomatoCompletion(detail({apiVersion: 2}), [item]).reason, "unsupported-version");
assert.equal(evaluateDockTomatoCompletion(detail({context: null}), [item]).reason, "invalid-context");
assert.equal(evaluateDockTomatoCompletion(detail({}, {consumer: "another-plugin"}), [item]).ignored, true);
assert.equal(evaluateDockTomatoCompletion(detail({}, {itemId: ""}), [item]).reason, "invalid-context");
assert.equal(evaluateDockTomatoCompletion(detail({}, {itemUnit: ""}), [item]).reason, "invalid-context");
assert.equal(evaluateDockTomatoCompletion(detail({}, {tomatoMode: "other"}), [item]).reason, "invalid-context");
assert.equal(evaluateDockTomatoCompletion(detail({}, {itemId: "deleted"}), [item]).reason, "missing-item");
assert.equal(evaluateDockTomatoCompletion(detail(), [{...item, archived: true}]).reason, "archived-item");
assert.equal(evaluateDockTomatoCompletion(detail(), [{...item, unit: "小时"}]).reason, "mapping-changed");
assert.equal(evaluateDockTomatoCompletion(detail(), [{...item, tomatoMode: "sessions"}]).reason, "mapping-changed");
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: 0}), [item]).reason, "invalid-duration");
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: -1}), [item]).reason, "invalid-duration");
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: 1441}), [item]).reason, "invalid-duration");
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: Number.NaN}), [item]).reason, "invalid-duration");
assert.equal(evaluateDockTomatoCompletion(detail({sessionId: "", recordId: ""}), [item]).reason, "missing-identity");
assert.equal(evaluateDockTomatoCompletion(detail(), [item], new Set(["session-1"])).reason, "duplicate");
assert.equal(evaluateDockTomatoCompletion(detail({}, {tomatoMode: "sessions"}), [{...item, tomatoMode: "sessions"}]).value, 1);
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: 0}, {tomatoMode: "sessions"}), [{...item, tomatoMode: "sessions"}]).reason, "invalid-duration");
assert.equal(evaluateDockTomatoCompletion(detail({durationMinutes: 30}, {itemUnit: "小时"}), [{...item, unit: "小时"}]).value, 0.5);

const accessorDetail = {};
Object.defineProperty(accessorDetail, "apiVersion", {get() { throw new Error("must not execute"); }});
assert.equal(evaluateDockTomatoCompletion(accessorDetail, [item]).reason, "unsupported-version");
const accessorContext = {consumer: "siyuan-checkin"};
Object.defineProperty(accessorContext, "itemId", {get() { throw new Error("must not execute"); }});
assert.equal(evaluateDockTomatoCompletion(detail({context: accessorContext}), [item]).reason, "invalid-context");

clearDockTomatoCompletionIssues();
assert.deepEqual(getDockTomatoCompletionIssues(), []);
assert.ok(Object.isFrozen(getDockTomatoCompletionIssues()));

console.log("Dock Tomato completion decision checks passed.");
