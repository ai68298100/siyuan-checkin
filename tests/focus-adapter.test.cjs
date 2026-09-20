/* 专注适配器生命周期守门：启动成功后不得复检 canStart（docktomato PR #5 评审第二节），
   启动等待期间的业务变化（删除/修订/方向/番茄模式）仍回滚本次会话。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

function loadModule(path, stubs, globals = {}) {
    const source = fs.readFileSync(path, "utf8");
    const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
    const module = {exports: {}};
    new Function("require", "module", "exports", ...Object.keys(globals), compiled)((id) => {
        if (stubs[id]) return stubs[id];
        throw new Error(`Unexpected dependency: ${id}`);
    }, module, module.exports, ...Object.values(globals));
    return module.exports;
}

const modelStub = {
    getActiveItemById: (store, itemId) => (store.items || []).find((item) => item.id === itemId && !item.archived),
    isItemAvailableOnDate: () => true,
    getItemRevisionForDate: (item) => ({kind: item.kind || "count", target: item.target || 1, unit: item.unit || "次", schedule: {type: "daily"}}),
};

const {startFocusFor, focusMappingFingerprint, focusStartErrorMessage} = loadModule("src/render/focus-adapter.ts", {
    "../i18n": {t: (key) => key},
    "../model": modelStub,
    "../shared": {currentCalendarDate: () => new Date()},
    "siyuan": {showMessage: () => undefined},
});

function makeHost(items) {
    const host = {
        store: {items},
        acceptingOperations: true,
        disposed: false,
        disposing: false,
        initializationState: "ready",
        focusBusy: false,
        focusAdapters: new Map(),
        activeFocusAdapter: undefined,
        focusOperation: Promise.resolve(),
        revisionFingerprint: (item) => `rev:${item.rev || 1}`,
        cloneItemForDate: (item) => ({...item}),
        renderBackgroundUpdate: () => undefined,
    };
    return host;
}

function makeTimerAdapter() {
    const adapter = {
        id: "fake-timer",
        name: "计时器",
        started: 0,
        stops: 0,
        status: {active: false},
        canStart() { return !adapter.status.active; },
        async start() { adapter.started += 1; adapter.status.active = true; },
        async stop() { adapter.stops += 1; adapter.status.active = false; },
    };
    return adapter;
}

(async () => {
    assert.equal(focusStartErrorMessage({code: "DOCK_TOMATO_INVALID_DURATION"}), "msg.focusDockInvalidDuration");
    assert.equal(focusStartErrorMessage({code: "DOCK_TOMATO_UNSUPPORTED_TIME_UNIT"}), "msg.focusDockUnsupportedTimeUnit");
    /* The start boundary must pass today's projection, not the raw future goal or remaining amount. */
    for (const target of [45, 60]) {
        const item = {id: "read", kind: "duration", target: 90, unit: "分钟"};
        const host = makeHost([item]);
        host.store.events = [{itemId: "read", value: 20}];
        host.cloneItemForDate = value => ({...value, target});
        const adapter = makeTimerAdapter();
        let received;
        adapter.start = async value => { received = value; };
        host.focusAdapters.set(adapter.id, adapter);
        assert.equal(await startFocusFor(host, item.id), true);
        assert.equal(received.target, target);
        assert.equal(item.target, 90, "start must not mutate stored goal");
    }
    /* 1. 启动成功后 canStart 因 active 变 false，不得触发停止或登记失败。 */
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const started = await startFocusFor(host, "read");
        assert.equal(started, true, "start should succeed");
        assert.equal(adapter.started, 1);
        assert.equal(adapter.stops, 0, "successful start must not call stop/pause");
        assert.equal(host.activeFocusAdapter, adapter);
        assert.equal(host.focusBusy, false);
    }

    /* 2. 启动等待期间项目被删除：回滚本次会话（stop 一次），返回失败。 */
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const originalStart = adapter.start.bind(adapter);
        adapter.start = async () => {
            await originalStart();
            host.store.items = [];
        };
        const started = await startFocusFor(host, "read");
        assert.equal(started, false, "removed item must fail validation");
        assert.equal(adapter.stops, 1, "rollback stops the session it just started");
        assert.equal(host.activeFocusAdapter, undefined);
    }

    /* 3. 启动等待期间项目改为戒除类（direction）：专注业务指纹识别变化并回滚。 */
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const originalStart = adapter.start.bind(adapter);
        adapter.start = async () => {
            await originalStart();
            item.direction = "atMost";
        };
        const started = await startFocusFor(host, "read");
        assert.equal(started, false, "direction flip must fail focus validation");
        assert.equal(adapter.stops, 1);
    }

    /* 4. 启动等待期间番茄模式变化：识别变化并回滚。 */
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1, tomatoMode: "minutes"};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const originalStart = adapter.start.bind(adapter);
        adapter.start = async () => {
            await originalStart();
            item.tomatoMode = "sessions";
        };
        const started = await startFocusFor(host, "read");
        assert.equal(started, false, "tomatoMode flip must fail focus validation");
        assert.equal(adapter.stops, 1);
    }

    /* 5. 日期修订变化仍回滚；无关字段（名称）变化不回滚。 */
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const originalStart = adapter.start.bind(adapter);
        adapter.start = async () => {
            await originalStart();
            item.rev = 2;
        };
        const started = await startFocusFor(host, "read");
        assert.equal(started, false, "revision flip must fail focus validation");
        assert.equal(adapter.stops, 1);
    }
    {
        const item = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const host = makeHost([item]);
        const adapter = makeTimerAdapter();
        host.focusAdapters.set(adapter.id, adapter);
        const originalStart = adapter.start.bind(adapter);
        adapter.start = async () => {
            await originalStart();
            item.name = "深度阅读";
        };
        const started = await startFocusFor(host, "read");
        assert.equal(started, true, "cosmetic change keeps the session");
        assert.equal(adapter.stops, 0);
    }

    /* 6. focusMappingFingerprint 纳入 direction/tomatoMode，且与宿主修订指纹区分。 */
    {
        const host = makeHost([]);
        const base = {id: "read", name: "阅读", kind: "duration", unit: "分钟", rev: 1};
        const plain = focusMappingFingerprint(host, base, new Date());
        const atMost = focusMappingFingerprint(host, {...base, direction: "atMost"}, new Date());
        const sessions = focusMappingFingerprint(host, {...base, tomatoMode: "sessions"}, new Date());
        assert.notEqual(plain, atMost, "direction must change focus fingerprint");
        assert.notEqual(plain, sessions, "tomatoMode must change focus fingerprint");
        assert.equal(plain, focusMappingFingerprint(host, {...base, name: "改名"}, new Date()), "cosmetic change keeps fingerprint");
    }

    /* Reopening the prominent built-in entry must preserve time already spent.
       A different habit cannot silently steal either a running or paused session. */
    {
        const timerCalls = {created: 0, cleared: [], rendered: 0, scrolled: 0};
        const messages = [];
        const shared = loadModule("src/shared.ts", {
            "./i18n": {t: key => key}, "./model": modelStub,
            "./features/record-notes": {}, "./ui/labels": {}, "./record-step": {},
        });
        const timer = loadModule("src/render/focus-timer.ts", {
            "../i18n": {t: key => key},
            "../model": {...modelStub, getItemById: modelStub.getActiveItemById},
            "../shared": shared,
            "siyuan": {showMessage: text => messages.push(text)},
        }, {window: {
            setInterval: () => ++timerCalls.created,
            clearInterval: id => timerCalls.cleared.push(id),
            clearTimeout: () => undefined,
        }});
        const reading = {id: "read", name: "阅读", kind: "duration", icon: "📖"};
        const writing = {id: "write", name: "写作", kind: "duration", icon: "✎"};
        const host = {
            store: {items: [reading, writing]}, focusTimerMinutes: 25,
            focusTimerRoot: {querySelector: () => ({scrollIntoView: options => {
                assert.equal(options.block, "nearest"); timerCalls.scrolled += 1;
            }})},
            render: () => { timerCalls.rendered += 1; },
            recordEvent: () => assert.fail("opening/revealing a timer must not create a record"),
        };
        timer.openFocusTimerFor(host, reading.id);
        const originalState = host.focusTimerState;
        const originalInterval = host.focusTimerInterval;
        originalState.remainingSec = 1337;
        timer.openFocusTimerFor(host, reading.id);
        assert.equal(host.focusTimerState, originalState);
        assert.equal(host.focusTimerState.remainingSec, 1337);
        assert.equal(host.focusTimerState.running, true);
        assert.equal(host.focusTimerInterval, originalInterval);
        assert.deepEqual(messages, [], "same-item reopen needs no warning");
        originalState.running = false;
        timer.openFocusTimerFor(host, reading.id);
        assert.equal(host.focusTimerState.running, false, "reveal must not resume a paused timer implicitly");
        assert.equal(host.focusTimerState.remainingSec, 1337);
        for (const running of [false, true]) {
            originalState.running = running;
            timer.openFocusTimerFor(host, writing.id);
            assert.equal(host.focusTimerState, originalState);
            assert.equal(host.focusTimerState.itemId, reading.id);
            assert.equal(host.focusTimerState.remainingSec, 1337);
            assert.equal(host.focusTimerState.running, running);
            assert.equal(host.focusTimerInterval, originalInterval);
        }
        assert.deepEqual(messages, ["focus.switchPending", "focus.switchPending"]);
        assert.equal(timerCalls.created, 1, "repeated entries keep exactly the original heartbeat");
        assert.deepEqual(timerCalls.cleared, [], "revealing a session never clears its heartbeat");
        assert.equal(timerCalls.rendered, 5);
        assert.equal(timerCalls.scrolled, 5, "each entry reveals the existing panel");
        timer.stopFocusTimerFor(host);
        assert.deepEqual(timerCalls.cleared, [originalInterval]);
        timer.openFocusTimerFor(host, writing.id);
        assert.equal(host.focusTimerState.itemId, writing.id, "another habit can start after explicit session cleanup");
        assert.equal(timerCalls.created, 2);

        writing.icon = 'https://example.test/icon.png?title=" onerror="alert(1)';
        writing.name = '<img src=x onerror="alert(2)">';
        const imagePanel = timer.renderFocusTimerPanelFor(host);
        assert.match(imagePanel, /<img src="https:\/\/example\.test\/icon\.png\?title=&quot; onerror=&quot;alert\(1\)" alt=""/,
            "custom image uses the shared escaped image renderer");
        assert.doesNotMatch(imagePanel, / onerror="|<img src=x/, "user text cannot create executable attributes or markup");
        writing.icon = '<svg onload="alert(3)">';
        const textPanel = timer.renderFocusTimerPanelFor(host);
        assert.match(textPanel, /&lt;svg onload=&quot;alert\(3\)&quot;&gt;/);
        assert.doesNotMatch(textPanel, /<svg onload=/, "non-image custom icons are escaped text");
    }

    console.log("focus-adapter.test: all assertions passed (including built-in reopen and custom icons)");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
