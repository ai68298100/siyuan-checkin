const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

class FakeWindow {
    constructor() { this.listeners = new Map(); this.timers = new Map(); this.nextTimer = 1; }
    addEventListener(type, listener) { const set = this.listeners.get(type) || new Set(); set.add(listener); this.listeners.set(type, set); }
    removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
    dispatch(type, detail) { for (const listener of [...(this.listeners.get(type) || [])]) listener({type, detail}); }
    setTimeout(callback) { const id = this.nextTimer++; this.timers.set(id, callback); return id; }
    clearTimeout(id) { this.timers.delete(id); }
    runTimers() { const pending = [...this.timers.values()]; this.timers.clear(); for (const callback of pending) callback(); }
}

const fakeWindow = new FakeWindow();
global.window = fakeWindow;
const source = fs.readFileSync("src/dock-tomato.ts", "utf8");
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const moduleUnderTest = {exports: {}};
new Function("require", "module", "exports", compiled)((id) => {
    if (id === "./integrations") return {DOCK_TOMATO_ADAPTER_ID: "siyuan-plugin-docktomato"};
    if (id === "./types") return {};
    throw new Error(`Unexpected dependency: ${id}`);
}, moduleUnderTest, moduleUnderTest.exports);

const {clearDockTomatoCompletionIssues, getDockTomatoCompletionIssues, installDockTomatoBridge} = moduleUnderTest.exports;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const completion = (overrides = {}) => ({apiVersion: 1, sessionId: "session-1", durationMinutes: 25, context: {consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes"}, ...overrides});

(async () => {
    clearDockTomatoCompletionIssues();
    let status = {ready: true, active: false, running: false, paused: false};
    const starts = [];
    let pauses = 0;
    const facade = {
        version: 1,
        capabilities: ["status", "start", "pause", "completion-event"],
        getStatus() { return status; },
        async start(input) { starts.push(input); status = {ready: true, active: true, running: true, paused: false}; return status; },
        async pause() { pauses += 1; status = {ready: true, active: true, running: false, paused: true}; return status; },
    };
    fakeWindow.__dockTomato = {focus: facade};
    const items = [
        {id: "read", name: "阅读", kind: "duration", unit: "分钟", tomatoMode: "minutes", archived: false},
        {id: "hour", name: "深度工作", kind: "duration", unit: "小时", tomatoMode: "minutes", archived: false},
        {id: "sessions", name: "番茄", kind: "count", unit: "次", tomatoMode: "sessions", archived: false},
    ];
    const events = [], writes = [], adapters = [];
    let adapterDisposals = 0, stopCalls = 0, refreshes = 0;
    const api = {
        getItems: () => items,
        getEvents: () => events,
        async recordEvent(input) { writes.push(input); const record = {...input, id: `event-${writes.length}`}; events.push(record); return record; },
        registerFocusAdapter(adapter) { adapters.push(adapter); return () => { adapterDisposals += 1; }; },
        async stopFocus() { stopCalls += 1; return true; },
    };

    const dispose = installDockTomatoBridge(api, () => { refreshes += 1; });
    assert.equal(adapters.length, 1);
    assert.equal(adapters[0].id, "siyuan-plugin-docktomato");
    assert.equal(adapters[0].name, "底栏番茄钟");
    assert.equal(typeof adapters[0].start, "function");
    assert.equal(typeof adapters[0].stop, "function");
    for (const [candidate, expected] of [[{...items[0]}, true], [{...items[0], kind: "binary"}, false], [{...items[0], archived: true}, false], [{...items[0], kind: "count"}, true], [{...items[0], kind: "quantity"}, true]]) assert.equal(adapters[0].canStart(candidate), expected);
    for (const blocked of [{ready: false, active: false}, {ready: true, active: true}, {ready: false, active: true}]) { status = blocked; assert.equal(adapters[0].canStart(items[0]), false); }
    status = {ready: true, active: false};
    facade.getStatus = () => { throw new Error("unreadable"); };
    assert.equal(adapters[0].canStart(items[0]), false);
    facade.getStatus = function () { return status; };

    await adapters[0].start(items[0]);
    assert.equal(starts.length, 1);
    assert.equal(starts[0].confirm, true);
    for (const [key, value] of Object.entries({consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes"})) assert.equal(starts[0].context[key], value);
    await adapters[0].stop();
    assert.equal(pauses, 1);

    status = {ready: true, active: false};
    fakeWindow.dispatch("tomato:focus-session-completed", completion());
    await flush(); await flush();
    assert.equal(writes.length, 1);
    for (const [key, value] of Object.entries({itemId: "read", value: 25, unit: "分钟", source: "tomato", externalRef: "docktomato:session-1", note: "来自底栏番茄钟"})) assert.equal(writes[0][key], value);
    assert.equal(stopCalls, 1);
    assert.ok(refreshes >= 1);

    fakeWindow.dispatch("tomato:focus-session-completed", completion()); await flush();
    assert.equal(writes.length, 1);
    assert.equal(getDockTomatoCompletionIssues().length, 0);
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "foreign", context: {...completion().context, consumer: "other"}})); await flush();
    assert.equal(writes.length, 1);
    assert.equal(getDockTomatoCompletionIssues().length, 0);
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "bad", durationMinutes: 0})); await flush();
    assert.equal(writes.length, 1);
    const issues = getDockTomatoCompletionIssues();
    assert.equal(issues.length, 1);
    for (const [key, value] of Object.entries({reason: "invalid-duration", itemId: "read", identity: "bad"})) assert.equal(issues[0][key], value);

    const beforeLifecycleRefresh = refreshes;
    fakeWindow.dispatch("tomato:focus-session-started"); fakeWindow.dispatch("tomato:focus-session-paused"); await flush();
    assert.equal(refreshes, beforeLifecycleRefresh + 1);
    status = {ready: true, active: false};
    const beforeEndedStops = stopCalls;
    fakeWindow.dispatch("tomato:focus-ended"); await flush();
    assert.equal(stopCalls, beforeEndedStops + 1);

    const listenerTypes = ["tomato:focus-api-availability-changed", "tomato:focus-session-started", "tomato:focus-session-paused", "tomato:focus-session-completed", "tomato:focus-ended"];
    for (const type of listenerTypes) assert.equal(fakeWindow.listeners.get(type)?.size, 1);
    dispose();
    assert.equal(adapterDisposals, 1);
    for (const type of listenerTypes) assert.equal(fakeWindow.listeners.get(type)?.size, 0);
    const beforeDisposedWrites = writes.length, beforeDisposedRefreshes = refreshes;
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "after-dispose"})); fakeWindow.runTimers(); await flush();
    assert.equal(writes.length, beforeDisposedWrites);
    assert.equal(refreshes, beforeDisposedRefreshes);
    assert.equal(fakeWindow.timers.size, 0);
    console.log("Dock Tomato executable bridge lifecycle checks passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
