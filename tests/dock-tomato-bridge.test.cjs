/* Dock Tomato 桥可执行生命周期守门（PR #5 评审第二~五节）：
   会话归属、按会话停止、available:false 即时解绑、纯解绑注销、
   完成事件经宿主收件箱通道回写并按结果分类。 */
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
    if (id === "./features/docktomato-inbox") return {
        completionClock: (value) => {
            if (typeof value !== "string" || !value || !Number.isFinite(Date.parse(value))) return undefined;
            const date = new Date(value);
            const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            return {occurredAt: new Date(date.getTime()).toISOString(), localDate};
        },
    };
    throw new Error(`Unexpected dependency: ${id}`);
}, moduleUnderTest, moduleUnderTest.exports);

const {clearDockTomatoCompletionIssues, getDockTomatoCompletionIssues, installDockTomatoBridge, inspectDockTomatoProvider} = moduleUnderTest.exports;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const storedExternalRef = (entry) => Object.getOwnPropertyDescriptor(entry, "externalRef")?.value;
const completion = (overrides = {}) => ({apiVersion: 1, sessionId: "session-1", durationMinutes: 25, completedAt: "2026-09-19T10:00:00.000Z", context: {consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes"}, ...overrides});

function makeFacade(name, options = {}) {
    const facade = {
        version: 1,
        capabilities: options.capabilities || ["status", "start", "pause", "completion-event"],
        status: {ready: true, active: false, running: false, paused: false, sessionId: undefined, mode: undefined},
        starts: [],
        pauses: [],
        getStatus() { return facade.status; },
        async start(input) {
            facade.starts.push(input);
            facade.status = {ready: true, active: true, running: true, paused: false, sessionId: `${name}-session-${facade.starts.length}`, mode: "countdown"};
            return facade.status;
        },
        async pause(sessionOptions) {
            facade.pauses.push(sessionOptions === undefined ? null : sessionOptions);
            if (facade.pauseBehavior === "throw") throw new Error("transport down");
            facade.status = {...facade.status, active: false, running: false, paused: true};
            return facade.status;
        },
    };
    return facade;
}

(async () => {
    clearDockTomatoCompletionIssues();
    const facade = makeFacade("bridge");
    fakeWindow.__dockTomato = {focus: facade};
    const items = [
        {id: "read", name: "阅读", kind: "duration", unit: "分钟", tomatoMode: "minutes", archived: false},
        {id: "hour", name: "深度工作", kind: "duration", unit: "小时", tomatoMode: "minutes", archived: false},
        {id: "sessions", name: "番茄", kind: "count", unit: "次", tomatoMode: "sessions", archived: false},
    ];
    const events = [], processed = [], adapters = [];
    const archivedItems = [{id: "archived-read", name: "旧阅读", kind: "duration", unit: "分钟", tomatoMode: "minutes", archived: true}];
    const tombstoned = new Set();
    let processBehavior = "recorded";
    let deferredProcessResolve;
    let adapterDisposals = 0, stopFocusCalls = 0, refreshes = 0, recordEventCalls = 0;
    const releasedAdapters = [];
    const api = {
        getItems: () => items,
        getArchivedItems: () => archivedItems,
        getEvents: () => events,
        async recordEvent() { recordEventCalls += 1; return {}; },
        registerFocusAdapter(adapter) { adapters.push(adapter); return () => { adapterDisposals += 1; }; },
        async stopFocus() { stopFocusCalls += 1; return true; },
    };
    const host = {
        releaseFocusAdapter(adapter) { releasedAdapters.push(adapter); },
        dockTomatoTombstonedIdentities: () => tombstoned,
        async processDockTomatoCompletion(entry) {
            processed.push(entry);
            if (processBehavior === "undef") return undefined;
            if (processBehavior === "throw") throw new Error("storage unavailable");
            if (processBehavior === "retry") return {kind: "retry", reason: "persist-failed"};
            if (processBehavior === "blocked") return {kind: "blocked", reason: "skipped-day"};
            if (processBehavior === "deferred") {
                return new Promise((resolve) => {
                    deferredProcessResolve = () => {
                        const record = {id: `event-${processed.length}`, itemId: entry.itemId, source: "tomato", externalRef: entry.externalRef};
                        events.push(record);
                        resolve({kind: "recorded", eventId: record.id});
                    };
                });
            }
            if (processBehavior === "duplicate") return {kind: "duplicate", eventId: "existing"};
            const record = {id: `event-${processed.length}`, itemId: entry.itemId, source: "tomato", externalRef: entry.externalRef};
            events.push(record);
            return {kind: "recorded", eventId: record.id};
        },
    };

    const dispose = installDockTomatoBridge(api, () => { refreshes += 1; }, host);
    assert.equal(adapters.length, 1);
    assert.equal(adapters[0].id, "siyuan-plugin-docktomato");
    assert.equal(adapters[0].name, "底栏番茄钟");
    for (const [candidate, expected] of [[{...items[0]}, true], [{...items[0], kind: "binary"}, false], [{...items[0], archived: true}, false], [{...items[0], direction: "atMost"}, false], [{...items[0], kind: "count"}, true], [{...items[0], kind: "quantity"}, true]]) assert.equal(adapters[0].canStart(candidate), expected);
    const invalidStartItems = Array.from({length: 25}, (_, index) => {
        if (index % 6 === 0) return {...items[0], id: ""};
        if (index % 6 === 1) return {...items[0], id: " padded-id "};
        if (index % 6 === 2) return {...items[0], id: "i".repeat(161)};
        if (index % 6 === 3) return {...items[0], unit: ""};
        if (index % 6 === 4) return {...items[0], unit: " padded-unit "};
        return {...items[0], unit: "u".repeat(81)};
    });
    for (let index = 0; index < invalidStartItems.length; index += 1) {
        assert.equal(adapters[0].canStart(invalidStartItems[index]), false, `invalid start context ${index + 1} must be rejected`);
        assert.equal(facade.starts.length, 0, `invalid start context ${index + 1} must not call provider`);
    }
    await assert.rejects(adapters[0].start(invalidStartItems[0]), (error) => error?.code === "DOCK_TOMATO_INVALID_CONTEXT");
    assert.equal(facade.starts.length, 0);
    for (const blocked of [{ready: false, active: false}, {ready: true, active: true}, {ready: false, active: true}]) { facade.status = {...blocked}; assert.equal(adapters[0].canStart(items[0]), false); }
    facade.status = {ready: true, active: false};

    /* 启动：记录会话归属；停止：守门后暂停本会话。 */
    await adapters[0].start(items[0]);
    assert.equal(facade.starts.length, 1);
    assert.equal(facade.starts[0].confirm, true);
    for (const [key, value] of Object.entries({consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes"})) assert.equal(facade.starts[0].context[key], value);
    await adapters[0].stop();
    assert.equal(facade.pauses.length, 1, "owned session stop pauses once");
    assert.equal(facade.pauses[0], null, "without pause-session capability the legacy pause stays argument-free");
    assert.equal(stopFocusCalls, 0, "bridge must never route stops through api.stopFocus");

    /* 停止的守门边界：非本会话、休息阶段、空闲态都只释放归属。 */
    await adapters[0].start(items[0]);
    facade.status = {...facade.status, sessionId: "manual-b"};
    await adapters[0].stop();
    assert.equal(facade.pauses.length, 1, "a foreign session must not be paused");
    await adapters[0].start(items[0]);
    facade.status = {...facade.status, mode: "break"};
    await adapters[0].stop();
    assert.equal(facade.pauses.length, 1, "a break phase sharing the parent id must not be paused");
    await adapters[0].start(items[0]);
    facade.status = {...facade.status, active: false};
    await adapters[0].stop();
    assert.equal(facade.pauses.length, 1, "an already idle provider must not be paused again");

    /* 有 pause-session 能力时必须携带 sessionId。 */
    const capableFacade = makeFacade("capable", {capabilities: ["status", "start", "pause", "pause-session", "completion-event"]});
    fakeWindow.__dockTomato = {focus: capableFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    assert.equal(adapters.length, 2, "capability upgrade replaces the bound adapter");
    await adapters[1].start(items[0]);
    await adapters[1].stop();
    assert.deepEqual(capableFacade.pauses[0], {sessionId: "capable-session-1"}, "pause-session capability must scope the pause to the owned session");

    /* 启动结果无法确认(空/缺失 sessionId):不接管、不暂停、给出稳定错误。 */
    const anonymousFacade = makeFacade("anonymous");
    anonymousFacade.start = async (input) => {
        anonymousFacade.starts.push(input);
        anonymousFacade.status = {ready: true, active: true, running: true, paused: false};
        return anonymousFacade.status;
    };
    fakeWindow.__dockTomato = {focus: anonymousFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    await assert.rejects(adapters[adapters.length - 1].start(items[0]), (error) => error?.code === "DOCK_TOMATO_START_UNCONFIRMED");
    await adapters[adapters.length - 1].stop();
    assert.equal(anonymousFacade.pauses.length, 0, "unconfirmed start must never grab control");

    /* 停止传输失败:归属保留,可重试;恢复后按会话暂停成功。 */
    const flakyFacade = makeFacade("flaky");
    flakyFacade.pauseBehavior = "throw";
    fakeWindow.__dockTomato = {focus: flakyFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    const flakyAdapter = adapters[adapters.length - 1];
    await flakyAdapter.start(items[0]);
    await assert.rejects(flakyAdapter.stop(), /transport down/);
    flakyFacade.pauseBehavior = "success";
    await flakyAdapter.stop();
    assert.equal(flakyFacade.pauses.length, 2, "a failed stop must keep ownership for retry");

    /* facade 替换:旧归属清除,旧适配器不能控制新 facade 的会话。 */
    fakeWindow.__dockTomato = {focus: makeFacade("replacement")};
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    const replacementAdapter = adapters[adapters.length - 1];
    const replacementFacadeRef = fakeWindow.__dockTomato.focus;
    await replacementAdapter.start(items[0]);
    fakeWindow.__dockTomato = {focus: makeFacade("third")};
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    await replacementAdapter.stop();
    assert.equal(replacementFacadeRef.pauses.length, 0, "a replaced facade must not be controlled through stale ownership");

    /* 启动等待期间换绑:旧调用不得登记归属,新 facade 也不得被旧调用接管。 */
    const lateFacade = makeFacade("late");
    fakeWindow.__dockTomato = {focus: lateFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    const lateAdapter = adapters[adapters.length - 1];
    let resolveLateStart;
    lateFacade.start = (input) => new Promise((resolve) => {
        resolveLateStart = () => resolve({ready: true, active: true, running: true, paused: false, sessionId: "late-session-1", mode: "countdown"});
        void input;
    });
    const pendingLateStart = lateAdapter.start(items[0]);
    const nextFacade = makeFacade("next");
    fakeWindow.__dockTomato = {focus: nextFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    resolveLateStart?.();
    await pendingLateStart;
    await lateAdapter.stop();
    assert.equal(lateFacade.pauses.length, 0, "an unbound start must not claim ownership or pause");
    assert.equal(nextFacade.pauses.length, 0, "the replacement facade must not be taken over by a stale start");

    /* 完成通知:经宿主收件箱通道回写,载荷完整、completedAt 固定;stopFocus/recordEvent 不被调用。 */
    fakeWindow.dispatch("tomato:focus-session-completed", completion());
    await flush(); await flush();
    assert.equal(processed.length, 1);
    assert.equal(processed[0].identity, "session-1");
    assert.equal(processed[0].externalRef, "docktomato:session-1");
    assert.equal(processed[0].itemId, "read");
    assert.equal(processed[0].itemUnit, "分钟");
    assert.equal(processed[0].tomatoMode, "minutes");
    assert.equal(processed[0].durationMinutes, 25);
    assert.equal(processed[0].occurredAt, "2026-09-19T10:00:00.000Z");
    assert.equal(processed[0].state, "pending");
    assert.equal(stopFocusCalls, 0, "completion cleanup must not call stopFocus");
    assert.equal(recordEventCalls, 0, "completion write must not go through the public recordEvent");
    assert.equal(releasedAdapters.length, 0, "identity outside ownership must not release the active adapter");
    fakeWindow.dispatch("tomato:focus-session-completed", completion()); await flush();
    assert.equal(processed.length, 1, "duplicate replay must stay quiet before the stored record exists too");
    assert.equal(getDockTomatoCompletionIssues().length, 0);
    processBehavior = "recorded";

    /* 墓碑身份:用户撤销过的完成不补回。 */
    tombstoned.add("removed-session");
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "removed-session"}));
    await flush(); await flush();
    assert.equal(processed.length, 1, "a tombstoned completion must not reach the writer");
    const removedIssue = getDockTomatoCompletionIssues().at(-1);
    assert.equal(removedIssue.reason, "user-removed");
    assert.equal(removedIssue.identity, "removed-session");
    tombstoned.delete("removed-session");
    clearDockTomatoCompletionIssues();

    /* 归档且从未入账的项目:archived-item,不因 getItems 过滤归档而误报 missing-item。 */
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "archived-norecord", context: {consumer: "siyuan-checkin", itemId: "archived-read", itemUnit: "分钟", tomatoMode: "minutes"}}));
    await flush();
    assert.equal(processed.length, 1, "an archived-item completion must not reach the writer");
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "archived-item");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "archived-norecord");
    clearDockTomatoCompletionIssues();

    /* 宿主 blocked(skipped-day):诊断可见,不标 write-failed。 */
    processBehavior = "blocked";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "skipped-day-1"}));
    await flush(); await flush();
    assert.equal(processed.length, 2);
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "skipped-day");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "skipped-day-1");
    clearDockTomatoCompletionIssues();

    /* 宿主 retry(persist 失败):write-failed 诊断;恢复后重放成功。 */
    processBehavior = "retry";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-persist"}));
    await flush(); await flush();
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "write-failed");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "retry-persist");
    processBehavior = "recorded";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "retry-persist"}));
    await flush(); await flush();
    assert.equal(processed.length, 4);
    assert.equal(getDockTomatoCompletionIssues().some((issue) => issue.identity === "retry-persist"), false, "successful retry resolves its write diagnostic");

    /* 宿主通道返回 undefined(排队器刷新失败被吞):不得误判为已入账。 */
    clearDockTomatoCompletionIssues();
    processBehavior = "undef";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "undef-result"}));
    await flush(); await flush();
    assert.equal(processed.length, 5);
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "write-failed");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "undef-result");
    processBehavior = "recorded";
    clearDockTomatoCompletionIssues();

    /* in-flight 合并:首个通知未落定前,重复通知安静;落定后只入账一次。 */
    clearDockTomatoCompletionIssues();
    processBehavior = "deferred";
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "concurrent-session"}));
    await flush();
    assert.equal(processed.length, 6);
    assert.equal(typeof deferredProcessResolve, "function");
    for (let index = 0; index < 25; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "concurrent-session"}));
        await flush();
        assert.equal(processed.length, 6, `in-flight replay ${index + 1} must not reach the writer`);
    }
    deferredProcessResolve();
    await flush(); await flush();
    assert.equal(events.filter((entry) => storedExternalRef(entry) === "docktomato:concurrent-session").length, 1);
    processBehavior = "recorded";

    /* 已入账身份(含归档项目的事件):duplicate,不触发 missing-item。 */
    const persistedIdentities = Array.from({length: 25}, (_, index) => `persisted-${index}`);
    for (const identity of persistedIdentities) events.push({id: `seed-${identity}`, itemId: "read", source: "tomato", externalRef: `docktomato:${identity}`});
    let hostileExternalRefReads = 0;
    const hostileStoredEvent = {id: "hostile-event"};
    Object.defineProperty(hostileStoredEvent, "externalRef", {get() { hostileExternalRefReads += 1; throw new Error("must not execute"); }});
    events.push(hostileStoredEvent);
    const processedBaseline = processed.length;
    for (let index = 0; index < persistedIdentities.length; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: persistedIdentities[index]}));
        await flush();
        assert.equal(processed.length, processedBaseline, `stored replay ${index + 1} must not reach the writer`);
    }
    assert.equal(hostileExternalRefReads, 0);
    clearDockTomatoCompletionIssues();

    /* completedAt 缺失/无效:invalid-completion-time,不得回退为当前时间。 */
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "no-clock", completedAt: undefined}));
    await flush();
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "invalid-completion-time");
    assert.equal(getDockTomatoCompletionIssues().at(-1).identity, "no-clock");
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "bad-clock", completedAt: "not-a-date"}));
    await flush();
    assert.equal(getDockTomatoCompletionIssues().at(-1).reason, "invalid-completion-time");
    clearDockTomatoCompletionIssues();

    /* 跨午夜:完成时间属于昨日,localDate 固定为完成日。 */
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "midnight", completedAt: "2026-09-18T15:59:59.000Z"}));
    await flush(); await flush();
    assert.equal(processed[processed.length - 1].localDate, "2026-09-18", "completedAt before local midnight keeps its completion date");
    clearDockTomatoCompletionIssues();

    /* 完成时若归属匹配:立即释放归属并通知宿主纯清理。 */
    await adapters[adapters.length - 1].start(items[0]);
    const ownedSessionId = fakeWindow.__dockTomato.focus.status.sessionId;
    const releasesBefore = releasedAdapters.length;
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: ownedSessionId, context: {consumer: "siyuan-checkin", itemId: "read", itemUnit: "分钟", tomatoMode: "minutes"}}));
    await flush(); await flush();
    assert.equal(releasedAdapters.length, releasesBefore + 1, "a completed owned session must release the active adapter immediately");
    const pausesAfterCompletion = fakeWindow.__dockTomato.focus.pauses.length;
    fakeWindow.dispatch("tomato:focus-ended");
    await flush();
    assert.equal(fakeWindow.__dockTomato.focus.pauses.length, pausesAfterCompletion, "focus-ended must not pause anything");

    /* focus-ended:仅重读状态并清理归属;重复事件幂等;休息不被暂停。 */
    await adapters[adapters.length - 1].start(items[0]);
    const endedFacade = fakeWindow.__dockTomato.focus;
    const releasesBeforeEnded = releasedAdapters.length;
    endedFacade.status = {...endedFacade.status, mode: "break"};
    fakeWindow.dispatch("tomato:focus-ended");
    await flush();
    assert.equal(releasedAdapters.length, releasesBeforeEnded + 1, "break after focus must release the focus registration");
    const releasesAfterBreak = releasedAdapters.length;
    fakeWindow.dispatch("tomato:focus-ended");
    await flush();
    assert.equal(releasedAdapters.length, releasesAfterBreak, "repeated focus-ended must stay idempotent");
    assert.equal(endedFacade.pauses.length, 0, "focus-ended must never pause the break");

    /* 诊断优先级:ready:false 时即使 active/paused 也不可用。 */
    const diagFacade = makeFacade("diag");
    fakeWindow.__dockTomato = {focus: diagFacade};
    diagFacade.status = {ready: false, active: true, running: true, paused: false, sessionId: "diag-1", mode: "countdown"};
    assert.equal(inspectDockTomatoProvider().state, "not-ready", "not-ready must outrank running/paused");

    /* available:false 先于全局删除:立即解绑,无暂停副作用,不重复注册旧对象。 */
    clearDockTomatoCompletionIssues();
    const unavailableFacade = makeFacade("unavailable");
    fakeWindow.__dockTomato = {focus: unavailableFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    const unavailableAdapter = adapters[adapters.length - 1];
    await unavailableAdapter.start(items[0]);
    const pausesBeforeUnavailable = unavailableFacade.pauses.length;
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: false});
    await flush();
    assert.equal(unavailableFacade.pauses.length, pausesBeforeUnavailable, "unavailable must not pause the running timer");
    const adapterCountBeforeInvalid = adapters.length;
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    assert.equal(adapters.length, adapterCountBeforeInvalid, "an invalidated facade must not re-register without a fresh available notice");
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    assert.equal(adapters.length, adapterCountBeforeInvalid + 1, "an explicit available:true notice may re-enable the same object idempotently");
    fakeWindow.dispatch("tomato:focus-api-availability-changed", {available: true});
    await flush();
    assert.equal(adapters.length, adapterCountBeforeInvalid + 1, "repeated available:true must not register twice");
    const freshFacade = makeFacade("fresh");
    fakeWindow.__dockTomato = {focus: freshFacade};
    fakeWindow.dispatch("tomato:focus-api-availability-changed");
    await flush();
    assert.equal(adapters[adapters.length - 1] !== unavailableAdapter, true, "a new facade object binds again");

    /* 诊断折叠矩阵。 */
    const repeatedFailureBaseline = processed.length;
    for (let index = 0; index < 25; index += 1) {
        fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "repeated-invalid", durationMinutes: 0}));
        await flush();
        const repeated = getDockTomatoCompletionIssues();
        assert.equal(repeated.length, 1, `repeat ${index + 1} must stay folded`);
        assert.equal(repeated[0].count, index + 1, `repeat ${index + 1} must increment count`);
    }
    assert.equal(processed.length, repeatedFailureBaseline);
    assert.equal(getDockTomatoCompletionIssues()[0].identity, "repeated-invalid");
    clearDockTomatoCompletionIssues();

    /* 卸载:纯解绑——不暂停当前会话,监听器清空,迟到事件被忽略。 */
    const teardownFacade = fakeWindow.__dockTomato.focus;
    await adapters[adapters.length - 1].start(items[0]);
    const teardownPauses = teardownFacade.pauses.length;
    dispose();
    assert.equal(teardownFacade.pauses.length, teardownPauses, "unload must not pause the running timer");
    const listenerTypes = ["tomato:focus-api-availability-changed", "tomato:focus-session-started", "tomato:focus-session-paused", "tomato:focus-session-completed", "tomato:focus-ended"];
    for (const type of listenerTypes) assert.equal(fakeWindow.listeners.get(type)?.size, 0);
    const beforeDisposedProcessed = processed.length, beforeDisposedRefreshes = refreshes;
    fakeWindow.dispatch("tomato:focus-session-completed", completion({sessionId: "after-dispose"})); fakeWindow.runTimers(); await flush();
    assert.equal(processed.length, beforeDisposedProcessed);
    assert.equal(refreshes, beforeDisposedRefreshes);
    assert.equal(fakeWindow.timers.size, 0);
    assert.equal(stopFocusCalls, 0, "the bridge must never call api.stopFocus in any scenario");
    assert.equal(recordEventCalls, 0, "the bridge must never call api.recordEvent in any scenario");
    console.log("Dock Tomato executable bridge lifecycle checks passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
