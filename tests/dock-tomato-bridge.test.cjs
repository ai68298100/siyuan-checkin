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
    runNextTimer() {
        const next = this.timers.entries().next().value;
        if (!next) return false;
        const [id, callback] = next;
        this.timers.delete(id);
        callback();
        return true;
    }
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
const storedExternalRef = (entry) => Object.getOwnPropertyDescriptor(entry, "externalRef")?.value;
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
    let writeBehavior = "success";
    let deferredWriteResolve;
    let adapterDisposals = 0, stopCalls = 0, refreshes = 0;
    const api = {
        getItems: () => items,
        getEvents: () => events,
        async recordEvent(input) {
            writes.push(input);
            if (writeBehavior === "empty") return undefined;
            if (writeBehavior === "throw") throw new Error("storage unavailable");
            if (writeBehavior === "deferred") {
                return new Promise((resolve) => {
                    deferredWriteResolve = () => {
                        const record = {...input, id: `event-${writes.length}`};
                        events.push(record);
                        resolve(record);
                    };
                });
            }
            const record = {...input, id: `event-${writes.length}`}; events.push(record); return record;
        },
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

    clearDockTomatoCompletionIssues();
    const invalidDurations = [0, -1, -25, 1441, 2000, Infinity, -Infinity, NaN, 0, -2, 1441, 9999, NaN, Infinity, -3, 0, 1442, 5000, -100, NaN];
    const writesBeforeInvalidMatrix = writes.length;
    for (let index = 0; index < invalidDurations.length; index += 1) {
        const identity = `invalid-${index}`;
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: identity, durationMinutes: invalidDurations[index]}));
        await flush();
        const snapshot = getDockTomatoCompletionIssues();
        const latest = snapshot[snapshot.length - 1];
        assert.equal(writes.length, writesBeforeInvalidMatrix);
        assert.equal(latest.reason, "invalid-duration");
        assert.equal(latest.itemId, "read");
        assert.equal(latest.identity, identity);
    }
    assert.equal(getDockTomatoCompletionIssues().length, 20);

    clearDockTomatoCompletionIssues();
    writeBehavior = "empty";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-empty"})); await flush();
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "write-failed");
    assert.equal(getDockTomatoCompletionIssues().at(-1).itemId, "read");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "retry-empty");
    const writesAfterEmpty = writes.length;
    writeBehavior = "success";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-empty"})); await flush(); await flush();
    assert.equal(writes.length, writesAfterEmpty + 1);
    assert.ok(events.some((entry) => entry.externalRef === "docktomato:retry-empty"));

    writeBehavior = "throw";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-throw"})); await flush();
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "write-failed");
    assert.equal(getDockTomatoCompletionIssues().at(-1).itemId, "read");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "retry-throw");
    const writesAfterThrow = writes.length;
    writeBehavior = "success";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-throw"})); await flush(); await flush();
    assert.equal(writes.length, writesAfterThrow + 1);
    assert.ok(events.some((entry) => entry.externalRef === "docktomato:retry-throw"));

    clearDockTomatoCompletionIssues();
    writeBehavior = "deferred";
    const concurrentBaseline = writes.length;
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "concurrent-session"}));
    await flush();
    assert.equal(writes.length, concurrentBaseline + 1);
    assert.equal(typeof deferredWriteResolve, "function");
    for (let index = 0; index < 25; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "concurrent-session"}));
        await flush();
        assert.equal(writes.length, concurrentBaseline + 1, `in-flight replay ${index + 1} must not write`);
        assert.equal(getDockTomatoCompletionIssues().length, 0, `in-flight replay ${index + 1} must stay quiet`);
    }
    deferredWriteResolve();
    await flush(); await flush();
    assert.equal(events.filter((entry) => storedExternalRef(entry) === "docktomato:concurrent-session").length, 1);

    clearDockTomatoCompletionIssues();
    const persistedMatrixBaseline = writes.length;
    const persistedIdentities = Array.from({length: 25}, (_, index) => `persisted-${index}`);
    for (const identity of persistedIdentities) events.push({id: `seed-${identity}`, externalRef: `docktomato:${identity}`});
    let hostileExternalRefReads = 0;
    const hostileStoredEvent = {id: "hostile-event"};
    Object.defineProperty(hostileStoredEvent, "externalRef", {get() { hostileExternalRefReads += 1; throw new Error("must not execute"); }});
    events.push(hostileStoredEvent);
    for (let index = 0; index < persistedIdentities.length; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: persistedIdentities[index]}));
        await flush();
        assert.equal(writes.length, persistedMatrixBaseline, `stored replay ${index + 1} must not write`);
        assert.equal(getDockTomatoCompletionIssues().length, 0, `stored replay ${index + 1} must stay quiet`);
    }
    assert.equal(hostileExternalRefReads, 0);
    assert.equal(events.filter((entry) => typeof storedExternalRef(entry) === "string" && storedExternalRef(entry).startsWith("docktomato:persisted-")).length, 25);
    writeBehavior = "success";
    for (let index = 0; index < 25; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "concurrent-session"}));
        await flush();
        assert.equal(writes.length, concurrentBaseline + 1, `persisted replay ${index + 1} must not write`);
        assert.equal(getDockTomatoCompletionIssues().length, 0, `persisted replay ${index + 1} must stay quiet`);
    }
    assert.equal(events.filter((entry) => storedExternalRef(entry) === "docktomato:concurrent-session").length, 1);

    const beforeLifecycleRefresh = refreshes;
    fakeWindow.dispatch("tomato:focus-session-started"); fakeWindow.dispatch("tomato:focus-session-paused"); await flush();
    assert.equal(refreshes, beforeLifecycleRefresh + 1);
    status = {ready: true, active: false};
    const beforeEndedStops = stopCalls;
    fakeWindow.dispatch("tomato:focus-ended"); await flush();
    assert.equal(stopCalls, beforeEndedStops + 1);

    const availabilityRefreshBaseline = refreshes;
    for (let index = 0; index < 25; index += 1) {
        fakeWindow.dispatch("tomato:focus-api-availability-changed");
        assert.equal(adapters.length, 1, `same facade availability ${index + 1} must not register twice`);
        assert.equal(adapterDisposals, 0, `same facade availability ${index + 1} must not dispose the adapter`);
    }
    await flush();
    assert.equal(refreshes, availabilityRefreshBaseline + 1);

    const replacementStarts = [];
    let replacementStatus = {ready: true, active: false};
    const replacementFacade = {
        version: 1,
        capabilities: ["status", "start", "pause", "completion-event"],
        getStatus() { return replacementStatus; },
        async start(input) { replacementStarts.push(input); replacementStatus = {ready: true, active: true, running: true}; return replacementStatus; },
        async pause() { replacementStatus = {ready: true, active: true, paused: true}; return replacementStatus; },
    };
    fakeWindow.__dockTomato = {focus: replacementFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed"); await flush();
    assert.equal(adapterDisposals, 1);
    assert.equal(adapters.length, 2);
    assert.equal(adapters[1].id, "siyuan-plugin-docktomato");
    assert.equal(adapters[1].canStart(items[0]), true);
    await adapters[1].start(items[0]);
    assert.equal(replacementStarts.length, 1);
    assert.equal(replacementStarts[0].context.itemId, "read");

    fakeWindow.__dockTomato = {};
    fakeWindow.dispatch("tomato:focus-api-availability-changed"); await flush();
    assert.equal(adapterDisposals, 2);
    assert.equal(adapters.length, 2);
    fakeWindow.__dockTomato = {focus: {...replacementFacade, version: 2}};
    fakeWindow.dispatch("tomato:focus-api-availability-changed"); await flush();
    assert.equal(adapterDisposals, 2);
    assert.equal(adapters.length, 2);
    fakeWindow.__dockTomato = {focus: replacementFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed"); await flush();
    assert.equal(adapters.length, 3);
    assert.equal(adapterDisposals, 2);

    replacementStatus = {ready: true, active: true, running: true};
    const boundedPollingStops = stopCalls;
    const boundedPollingRefreshes = refreshes;
    fakeWindow.dispatch("tomato:focus-ended");
    await flush();
    assert.equal(fakeWindow.timers.size, 1);
    for (let index = 0; index < 20; index += 1) {
        assert.equal(fakeWindow.runNextTimer(), true, `release poll ${index + 1} must execute`);
        assert.equal(stopCalls, boundedPollingStops, `release poll ${index + 1} must not release active focus`);
        assert.equal(refreshes, boundedPollingRefreshes + 1, `release poll ${index + 1} must not spam refreshes`);
    }
    assert.equal(fakeWindow.timers.size, 0);
    assert.equal(stopCalls, boundedPollingStops);
    replacementStatus = {ready: true, active: false};
    fakeWindow.dispatch("tomato:focus-ended");
    await flush();
    assert.equal(stopCalls, boundedPollingStops + 1);
    assert.equal(fakeWindow.timers.size, 0);

    const listenerTypes = ["tomato:focus-api-availability-changed", "tomato:focus-session-started", "tomato:focus-session-paused", "tomato:focus-session-completed", "tomato:focus-ended"];
    for (const type of listenerTypes) assert.equal(fakeWindow.listeners.get(type)?.size, 1);
    dispose();
    assert.equal(adapterDisposals, 3);
    for (const type of listenerTypes) assert.equal(fakeWindow.listeners.get(type)?.size, 0);
    const beforeDisposedWrites = writes.length, beforeDisposedRefreshes = refreshes;
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "after-dispose"})); fakeWindow.runTimers(); await flush();
    assert.equal(writes.length, beforeDisposedWrites);
    assert.equal(refreshes, beforeDisposedRefreshes);
    assert.equal(fakeWindow.timers.size, 0);
    console.log("Dock Tomato executable bridge lifecycle checks passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
