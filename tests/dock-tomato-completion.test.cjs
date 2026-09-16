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

const {evaluateDockTomatoCompletion, clearDockTomatoCompletionIssues, getDockTomatoCompletionIssues, readDockTomatoRuntimeStatus, restoreDockTomatoCompletionIssues, serializeDockTomatoCompletionIssues, serializeDockTomatoDiagnostics} = moduleUnderTest.exports;
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

const reasons = ["invalid-event", "unsupported-version", "invalid-context", "missing-item", "archived-item", "mapping-changed", "invalid-duration", "missing-identity", "duplicate", "write-failed"];
const persisted = reasons.map((reason, index) => ({reason, at: `2026-09-17T00:${String(index).padStart(2, "0")}:00.000Z`, itemId: ` item-${index} `, identity: ` session-${index} `}));
const restored = restoreDockTomatoCompletionIssues(JSON.stringify({schemaVersion: 1, issues: persisted}));
assert.equal(restored.length, 10);
for (let index = 0; index < reasons.length; index += 1) {
    assert.equal(restored[index].reason, reasons[index]);
    assert.equal(restored[index].itemId, `item-${index}`);
    assert.equal(restored[index].identity, `session-${index}`);
    assert.match(restored[index].at, /^2026-09-17T00:/);
}
assert.ok(Object.isFrozen(restored));
assert.ok(Object.isFrozen(restored[0]));

assert.deepEqual(restoreDockTomatoCompletionIssues("not json"), []);
assert.deepEqual(restoreDockTomatoCompletionIssues({schemaVersion: 2, issues: persisted}), []);
assert.deepEqual(restoreDockTomatoCompletionIssues({schemaVersion: 1, issues: [{reason: "unknown", at: persisted[0].at}]}), []);
assert.deepEqual(restoreDockTomatoCompletionIssues({schemaVersion: 1, issues: [{reason: "write-failed", at: "not-a-date"}]}), []);
assert.deepEqual(restoreDockTomatoCompletionIssues(null), []);

const oversized = Array.from({length: 27}, (_, index) => ({reason: "write-failed", at: `2026-09-17T01:${String(index).padStart(2, "0")}:00.000Z`, itemId: "x".repeat(300), identity: "y".repeat(400)}));
const bounded = restoreDockTomatoCompletionIssues(oversized);
assert.equal(bounded.length, 20);
assert.equal(bounded[0].at, "2026-09-17T01:07:00.000Z");
assert.equal(bounded[19].at, "2026-09-17T01:26:00.000Z");
assert.equal(bounded[0].itemId.length, 160);
assert.equal(bounded[0].identity.length, 240);

const storagePayload = JSON.parse(serializeDockTomatoCompletionIssues());
assert.equal(storagePayload.schemaVersion, 1);
assert.equal(storagePayload.issues.length, 20);
assert.equal(storagePayload.issues[0].itemId.length, 160);

const diagnostics = JSON.parse(serializeDockTomatoDiagnostics({state: "ready", available: true, ready: true, active: false, apiVersion: 1, capabilities: ["status", "start", 42, "z".repeat(100)]}, "2026-09-17T02:00:00.000Z"));
assert.equal(diagnostics.schemaVersion, 1);
assert.equal(diagnostics.exportedAt, "2026-09-17T02:00:00.000Z");
assert.equal(diagnostics.provider.state, "ready");
assert.equal(diagnostics.provider.available, true);
assert.equal(diagnostics.provider.ready, true);
assert.equal(diagnostics.provider.active, false);
assert.equal(diagnostics.provider.apiVersion, 1);
assert.deepEqual(diagnostics.provider.capabilities.slice(0, 2), ["status", "start"]);
assert.equal(diagnostics.provider.capabilities.length, 3);
assert.equal(diagnostics.provider.capabilities[2].length, 80);
assert.equal(diagnostics.issues.length, 20);
assert.equal(JSON.stringify(diagnostics).includes("x".repeat(161)), false);
assert.equal(JSON.stringify(diagnostics).includes("y".repeat(241)), false);

clearDockTomatoCompletionIssues();
assert.equal(JSON.parse(serializeDockTomatoCompletionIssues()).issues.length, 0);

const falseStatus = {readable: false, ready: false, active: false, running: false, paused: false};
assert.deepEqual(readDockTomatoRuntimeStatus(null), falseStatus);
assert.deepEqual(readDockTomatoRuntimeStatus({}), falseStatus);
assert.deepEqual(readDockTomatoRuntimeStatus({getStatus: () => null}), falseStatus);
assert.deepEqual(readDockTomatoRuntimeStatus({getStatus() { throw new Error("offline"); }}), falseStatus);
assert.deepEqual(readDockTomatoRuntimeStatus({getStatus: 1}), falseStatus);

const statusCases = [
    [{}, {ready: true, active: false, running: false, paused: false}],
    [{ready: false}, {ready: false, active: false, running: false, paused: false}],
    [{active: true}, {ready: true, active: true, running: false, paused: false}],
    [{running: true}, {ready: true, active: false, running: true, paused: false}],
    [{paused: true}, {ready: true, active: false, running: false, paused: true}],
    [{ready: false, active: true, running: true, paused: true}, {ready: false, active: true, running: true, paused: true}],
];
for (const [input, expected] of statusCases) {
    const actual = readDockTomatoRuntimeStatus({getStatus() { return input; }});
    assert.equal(actual.readable, true);
    assert.equal(actual.ready, expected.ready);
    assert.equal(actual.active, expected.active);
    assert.equal(actual.running, expected.running);
    assert.equal(actual.paused, expected.paused);
}

for (const field of ["ready", "active", "running", "paused", "sessionId"]) {
    const hostileStatus = {};
    Object.defineProperty(hostileStatus, field, {get() { throw new Error("must not execute"); }});
    const safe = readDockTomatoRuntimeStatus({getStatus() { return hostileStatus; }});
    assert.equal(safe.readable, true);
    assert.equal(safe.ready, true);
    assert.equal(safe.active, false);
    assert.equal(safe.running, false);
    assert.equal(safe.paused, false);
}

let receiver;
const provider = {getStatus() { receiver = this; return {sessionId: `  ${"s".repeat(300)}  `}; }};
const receiverStatus = readDockTomatoRuntimeStatus(provider);
assert.equal(receiver, provider);
assert.equal(receiverStatus.sessionId.length, 240);
assert.equal(receiverStatus.sessionId, "s".repeat(240));

console.log("Dock Tomato completion decision checks passed.");
