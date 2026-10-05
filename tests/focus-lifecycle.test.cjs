const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1596 专注计时跨页生命周期守门：
   - 跨页小条（renderFocusMiniStripFor）：非今日表面显示剩余时间/项目名/回到专注；
   - 会话标记（sessionStorage）：开始即写、结束即清、重载后明确失效提示；
   - tick 同步小条剩余时间。
   面板 DOM 交互（pause/finish/presets）由既有面板绑定承载，不重复。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

/* sessionStorage 桩（node 无此全局；语义：存活于本窗口/进程，重载模拟=同 stub 再读）。 */
const sessionStore = new Map();
globalThis.sessionStorage = {
    getItem: (key) => sessionStore.has(key) ? sessionStore.get(key) : null,
    setItem: (key, value) => { sessionStore.set(key, String(value)); },
    removeItem: (key) => { sessionStore.delete(key); },
};

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

/* CommonJS 语义加载 focus-timer.js：require 桩（i18n/shared/siyuan）+ 真转译 model。 */
function loadFocusTimer(dir) {
    const compiled = ts.transpileModule(read("src", "render", "focus-timer.ts"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const moduleShell = {exports: {}};
    const requireStub = (specifier) => {
        if (specifier === "../focus-clock") {
            const clockModule = {exports: {}};
            const clockSource = ts.transpileModule(read("src", "focus-clock.ts"), {
                compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
            }).outputText;
            new Function("exports", clockSource)(clockModule.exports);
            return clockModule.exports;
        }
        if (specifier === "../i18n") return {t: (key, params) => params ? `${key}:${JSON.stringify(params)}` : key};
        if (specifier === "../shared") return {
            captureActionMoment: () => ({occurredAt: "2026-09-29T12:00:00.000Z", localDate: "2026-09-29"}),
            calendarDateFromKey: (key) => new Date(2026, 8, 29, 12),
            escapeHtml: (value) => String(value),
            renderIconMarkup: () => "",
        };
        if (specifier === "siyuan") return {showMessage: () => undefined};
        if (specifier === "../model") return require(path.join(dir, "src", "model.js"));
        throw new Error("unexpected dependency " + specifier);
    };
    const windowStub = {
        setInterval: () => 1,
        clearInterval: () => undefined,
        setTimeout: () => 1,
        clearTimeout: () => undefined,
        sessionStorage: globalThis.sessionStorage,
    };
    const run = new Function("require", "exports", "module", "window", compiled);
    run(requireStub, moduleShell.exports, moduleShell, windowStub);
    return moduleShell.exports;
}

const storeStub = {
    items: [{id: "f1", name: "深呼吸", icon: "🌿", kind: "number", target: 25, unit: "分钟", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-01-01", revisions: []}],
    events: [], eventTombstones: [],
};
const item = storeStub.items[0];

try {
    /* —— 1. 跨页小条：渲染 + 会话标记生命周期 —— */
    check("mini strip renders name, remaining time and back entry; session marker lifecycle", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-focus-lifecycle-"));
        const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
        for (const filename of ["src/date-keys.ts", "src/record-step.ts", "src/quota.ts", "src/rules.ts", "src/model.ts"]) {
            const target = path.join(dir, filename.replace(/\.ts$/, ".js"));
            fs.mkdirSync(path.dirname(target), {recursive: true});
            fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, filename), "utf8"), {compilerOptions}).outputText);
        }
        const focus = loadFocusTimer(dir);
        const store = JSON.parse(JSON.stringify(storeStub));
        const host = {
            store, disposed: false, disposing: false,
            focusTimerMinutes: 25,
            render: () => undefined,
            revisionFingerprint: () => "fp",
            enqueueMutation: async (op) => op(),
            recordEvent: (it, value, moment) => ({recorded: value}),
        };
        focus.openFocusTimerFor(host, "f1");
        const strip = focus.renderFocusMiniStripFor(host);
        assert.match(strip, /data-focus-mini/, "小条容器在位");
        assert.match(strip, /深呼吸/, "项目名在位");
        assert.match(strip, /data-focus-mini-remaining/, "剩余时间在位");
        assert.match(strip, /data-focus-mini-back/, "回到专注入口在位");
        /* sessionStorage 标记生命周期（stub 全局）。 */
        assert.equal(globalThis.sessionStorage.getItem("lc-focus-session"), "f1", "开始即写会话标记");
        focus.stopFocusTimerFor(host);
        assert.equal(globalThis.sessionStorage.getItem("lc-focus-session"), null, "停止即清标记");
        assert.equal(focus.renderFocusMiniStripFor(host), "", "无会话不渲染小条");
        fs.rmSync(dir, {recursive: true, force: true});
    });

    /* —— 2. 重载后明确失效：标记仍在 → 提示键存在且 index 消费后清除 —— */
    check("reload-lost notice key is bilingual and index consumes then clears the marker", () => {
        const indexSource = read("src", "index.ts");
        assert.match(indexSource, /msg\.focusReloadLost/, "重载失效提示在位");
        assert.match(indexSource, /removeItem\("lc-focus-session"\)/, "提示后清除标记（不重复打扰）");
        assert.match(indexSource, /renderFocusMiniStripFor/, "跨页小条在 renderInto 接线");
        assert.match(indexSource, /data-focus-mini-back/, "小条回到专注绑定在位");
        const focusSource = read("src", "render", "focus-timer.ts");
        assert.match(focusSource, /lc-focus-session/, "会话标记键在位");
        assert.match(focusSource, /data-focus-mini-remaining/, "小条剩余时间同步在位");
        assert.doesNotMatch(focusSource, /document\.querySelector(?:All)?\s*\(/, "计时同步不能退回全局 document 查询而漏刷其他 surface");
        assert.match(focusSource, /function focusRootsFor[\s\S]*?host\.dockElement[\s\S]*?host\.tabElement[\s\S]*?host\.quickDialogElement/, "计时器必须按宿主 surface 收集更新范围");
        const i18nSource = read("src", "i18n.ts");
        for (const key of ["focus.miniAria", "focus.miniBack", "msg.focusReloadLost"]) {
            const count = i18nSource.split(`"${key}"`).length - 1;
            assert.ok(count >= 2, `${key} 必须中英双语齐备（当前 ${count}）`);
        }
    });

    console.log(`Focus lifecycle: ${checks} checks passed.`);
} finally {
    fs.rmSync(path.join(os.tmpdir(), "siyuan-focus-lifecycle-"), {recursive: true, force: true});
}

function behaviorHarness() {
    const clock = {wallMs: Date.parse("2026-10-04T23:59:00.000Z"), monotonicMs: 1000};
    const messages = [];
    const confirmations = [];
    const intervals = new Map();
    const timeouts = new Map();
    const markers = new Map();
    let timerSequence = 0;
    let confirmResult = true;
    function eventTarget() {
        const listeners = new Map();
        return {
            addEventListener: (type, listener) => {
                const callbacks = listeners.get(type) ?? new Set();
                callbacks.add(listener);
                listeners.set(type, callbacks);
            },
            removeEventListener: (type, listener) => listeners.get(type)?.delete(listener),
            dispatch: (type) => [...listeners.get(type) ?? []].forEach((listener) => listener()),
            listenerCount: () => [...listeners.values()].reduce((total, callbacks) => total + callbacks.size, 0),
        };
    }
    const documentStub = {...eventTarget(), hidden: false, visibilityState: "visible"};
    class TestDate extends Date {
        static now() { return clock.wallMs; }
    }
    const requireModule = (filename, stubs = {}) => {
        const moduleShell = {exports: {}};
        const compiled = ts.transpileModule(read(...filename.split("/")), {
            compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        }).outputText;
        new Function("require", "exports", "module", "window", "Date", "performance", "document", compiled)((specifier) => {
            if (stubs[specifier]) return stubs[specifier];
            throw new Error(`unexpected behavior dependency ${specifier}`);
        }, moduleShell.exports, moduleShell, windowStub, TestDate, {now: () => clock.monotonicMs}, documentStub);
        return moduleShell.exports;
    };
    const windowStub = {
        ...eventTarget(),
        setInterval: (callback) => { const timerId = ++timerSequence; intervals.set(timerId, callback); return timerId; },
        clearInterval: (timerId) => intervals.delete(timerId),
        setTimeout: (callback) => { const timerId = ++timerSequence; timeouts.set(timerId, callback); return timerId; },
        clearTimeout: (timerId) => timeouts.delete(timerId),
        confirm: (text) => { confirmations.push(text); return confirmResult; },
        sessionStorage: {
            setItem: (key, value) => markers.set(key, value),
            getItem: (key) => markers.get(key) ?? null,
            removeItem: (key) => markers.delete(key),
        },
    };
    const focus = requireModule("src/render/focus-timer.ts", {
        "../focus-clock": requireModule("src/focus-clock.ts"),
        "../i18n": {t: (key, params) => params ? `${key}:${JSON.stringify(params)}` : key},
        "../shared": {
            captureActionMoment: () => ({occurredAt: new Date(clock.wallMs).toISOString(), localDate: new Date(clock.wallMs).toISOString().slice(0, 10)}),
            calendarDateFromKey: (key) => new Date(`${key}T12:00:00.000Z`),
            escapeHtml: (value) => String(value), renderIconMarkup: () => "",
        },
        "../model": {
            getActiveItemById: (store, itemId) => store.items.find((entry) => entry.id === itemId && !entry.archived),
            getItemById: (store, itemId) => store.items.find((entry) => entry.id === itemId),
            getItemRevisionForDate: (entry) => ({...entry, unit: entry.effectiveUnit ?? entry.unit}),
        },
        "siyuan": {showMessage: (text) => messages.push(text)},
    });
    function makeHost(minutes = 25, unit = "分钟") {
        const calls = [];
        const host = {
            store: {items: [{id: "read", name: "阅读", kind: "duration", unit}], events: []},
            disposed: false, disposing: false, focusTimerMinutes: minutes, renders: 0, mutations: 0,
            render: () => { host.renders += 1; },
            revisionFingerprint: (entry) => `${entry.unit}:${entry.revision ?? 1}`,
            enqueueMutation: (operation) => { host.mutations += 1; return Promise.resolve().then(operation); },
            recordEvent: async (...args) => { calls.push(args); return {id: `event-${calls.length}`}; },
        };
        return {host, calls};
    }
    return {
        focus, clock, makeHost, messages, confirmations, intervals, timeouts, markers,
        window: windowStub, document: documentStub,
        advance: (wallMs, monotonicMs = wallMs) => { clock.wallMs += wallMs; clock.monotonicMs += monotonicMs; },
        progress: (milliseconds, host) => {
            for (let elapsed = 0; elapsed < milliseconds;) {
                const step = Math.min(10000, milliseconds - elapsed);
                clock.wallMs += step;
                clock.monotonicMs += step;
                if (host) focus.tickFocusTimerFor(host);
                else [...intervals.values()].forEach((callback) => callback());
                elapsed += step;
            }
        },
        setHidden: (hidden, dispatch = true) => {
            documentStub.hidden = hidden;
            documentStub.visibilityState = hidden ? "hidden" : "visible";
            if (dispatch) documentStub.dispatch("visibilitychange");
        },
        beat: () => { [...intervals.values()].forEach((callback) => callback()); },
        setConfirmResult: (value) => { confirmResult = value; },
    };
}

function controlNode(dataset = {}) {
    const listeners = new Map();
    const attributes = new Map();
    const classes = new Set();
    return {
        dataset, style: {}, textContent: "", disabled: false,
        addEventListener: (event, listener) => listeners.set(event, [...listeners.get(event) ?? [], listener]),
        click() { if (!this.disabled) (listeners.get("click") ?? []).forEach((listener) => listener()); },
        setAttribute: (key, value) => attributes.set(key, value),
        getAttribute: (key) => attributes.get(key),
        classList: {toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name)},
        hasClass: (name) => classes.has(name),
    };
}

function timerSurface(panelCount = 1, miniCount = 1) {
    const panels = Array.from({length: panelCount}, () => {
        const controls = {
            "[data-focus-remaining]": controlNode(),
            "[data-focus-progress] span": controlNode(),
            "[data-action='focus-toggle']": controlNode(),
            "[data-action='focus-finish']": controlNode(),
            "[data-action='focus-abandon']": controlNode(),
            "[data-focus-save-status]": controlNode(),
        };
        const presets = [15, 25, 45, 60].map((minutes) => controlNode({focusTimerMinutes: String(minutes)}));
        return {
            ...controlNode(), controls, presets,
            querySelector: (selector) => controls[selector] ?? null,
            querySelectorAll: (selector) => selector === "[data-focus-timer-minutes]" ? presets : [],
        };
    });
    const remainingNodes = Array.from({length: miniCount}, () => controlNode());
    const statusNodes = Array.from({length: miniCount}, () => controlNode());
    return {
        panels, remainingNodes, statusNodes, isConnected: true,
        querySelector: (selector) => selector === "[data-focus-timer]" ? panels[0] ?? null : null,
        querySelectorAll: (selector) => ({
            "[data-focus-timer]": panels,
            "[data-focus-mini-remaining]": remainingNodes,
            "[data-focus-mini-status]": statusNodes,
        })[selector] ?? [],
    };
}

function attachSurface(harness, host, surface, property = "dockElement") {
    host[property] = surface;
    harness.focus.bindFocusTimerPanelFor(host, surface);
    return surface.panels[0];
}

function deferredWrite() {
    let resolveWrite;
    let rejectWrite;
    const promise = new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; });
    return {promise, resolve: resolveWrite, reject: rejectWrite};
}

async function behaviorCheck(name, run) {
    await run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

(async () => {
    await behaviorCheck("throttled callback catches up elapsed time; extra callbacks do not advance time", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.advance(22500);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1478);
        for (let callbackIndex = 0; callbackIndex < 50; callbackIndex += 1) harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1478);
        harness.progress(40000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls[0][1], 1);
        assert.equal(calls[0][4], 'focus.noteMinutes:{"n":1}');
        assert.ok(host.celebration);
    });
    await behaviorCheck("sleep with a stopped monotonic clock excludes the gap, pauses and requires explicit resume", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(65000);
        harness.advance(5 * 60000, 0);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1435);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.pauseReason, "clock");
        assert.equal(panel.controls["[data-focus-save-status]"].textContent, "focus.pausedClock");
        harness.window.dispatch("focus");
        harness.progress(30 * 60000);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1435);
        assert.equal(calls.length, 0);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.progress(55000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls.length, 1);
        assert.equal(calls[0][1], 2);
        assert.equal(calls[0][4], 'focus.noteMinutes:{"n":2}');
        assert.equal(host.focusTimerState, undefined);
    });
    await behaviorCheck("pausing between callbacks excludes all paused time, including sleep", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(50000);
        harness.advance(9750);
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.remainingSec, 1441);
        harness.advance(60 * 60000, 0);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1441);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.advance(500);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls[0][1], 1);
    });
    await behaviorCheck("a backwards wall-clock jump freezes at the last confirmed interval", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(65000);
        harness.advance(-3600000, 65000);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1435);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.pauseReason, "clock");
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls[0][1], 1);
    });
    await behaviorCheck("a long gap pauses even when both clocks include sleep", () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost(1);
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(20000);
        harness.advance(5 * 60000);
        harness.beat();
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.pauseReason, "clock");
        assert.equal(host.focusTimerState.remainingSec, 40);
        assert.equal(calls.length, 0);
        assert.equal(host.celebration, undefined);
    });
    await behaviorCheck("clock divergence, a monotonic reversal and the visible-gap boundary have deterministic outcomes", () => {
        for (const sample of [
            {wall: 5000, monotonic: 1000, paused: true, remaining: 1500},
            {wall: 1000, monotonic: -1, paused: true, remaining: 1500},
            {wall: 30001, monotonic: 30001, paused: true, remaining: 1500},
            {wall: 30000, monotonic: 30000, paused: false, remaining: 1470},
            {wall: 10100, monotonic: 10000, paused: false, remaining: 1490},
        ]) {
            const harness = behaviorHarness();
            const {host} = harness.makeHost();
            harness.focus.openFocusTimerFor(host, "read");
            harness.advance(sample.wall, sample.monotonic);
            harness.beat();
            assert.equal(host.focusTimerState.running, !sample.paused);
            assert.equal(host.focusTimerState.remainingSec, sample.remaining);
        }
    });
    await behaviorCheck("visibilitychange pauses immediately, excludes hidden time and never resumes on return", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        const tab = timerSurface(0, 1);
        host.tabElement = tab;
        harness.progress(60000);
        harness.advance(5000);
        harness.setHidden(true);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.pauseReason, "inactive");
        assert.equal(host.focusTimerState.remainingSec, 1435);
        assert.equal(panel.controls["[data-focus-save-status]"].textContent, "focus.pausedInactive");
        assert.equal(tab.statusNodes[0].textContent, "focus.pausedAuto");
        harness.progress(10 * 60000);
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.running, false, "continue is refused while hidden");
        harness.setHidden(false);
        harness.beat();
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.remainingSec, 1435);
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.running, true);
        assert.equal(host.focusTimerState.pauseReason, undefined);
        assert.equal(panel.controls["[data-focus-save-status]"].hidden, true);
        harness.progress(55000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls[0][1], 2);
        assert.equal(calls[0][4], 'focus.noteMinutes:{"n":2}');
    });
    await behaviorCheck("pagehide and pageshow preserve the confirmed time and require manual continuation", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(20000);
        harness.advance(5000);
        harness.window.dispatch("pagehide");
        assert.equal(host.focusTimerState.remainingSec, 1475);
        assert.equal(host.focusTimerState.running, false);
        harness.advance(20 * 60000);
        harness.window.dispatch("pageshow");
        assert.equal(host.focusTimerState.remainingSec, 1475);
        assert.equal(host.focusTimerState.running, false);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.progress(10000);
        assert.equal(host.focusTimerState.remainingSec, 1465);
    });
    await behaviorCheck("window blur is a conservative lock-screen signal and focus alone does not continue", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(10000);
        harness.window.dispatch("blur");
        harness.advance(60 * 60000, 0);
        harness.window.dispatch("focus");
        harness.beat();
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.remainingSec, 1490);
        assert.equal(host.focusTimerState.pauseReason, "inactive");
        panel.controls["[data-action='focus-toggle']"].click();
        harness.progress(10000);
        assert.equal(host.focusTimerState.remainingSec, 1480);
    });
    await behaviorCheck("a hidden poll without a lifecycle event excludes the unconfirmed interval", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(10000);
        harness.setHidden(true, false);
        harness.advance(20000);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 1490);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.pauseReason, "inactive");
    });
    await behaviorCheck("starting while hidden creates a paused session and does not accrue or resume automatically", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.setHidden(true);
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(60000);
        assert.equal(host.focusTimerState.remainingSec, 1500);
        assert.equal(host.focusTimerState.running, false);
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.running, false);
        harness.setHidden(false);
        assert.equal(host.focusTimerState.running, false);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.progress(10000);
        assert.equal(host.focusTimerState.remainingSec, 1490);
    });
    await behaviorCheck("an anomaly detected by a pause click does not reinterpret that click as resume", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(10000);
        harness.advance(5 * 60000);
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.remainingSec, 1490);
        assert.equal(host.focusTimerState.pauseReason, "clock");
        panel.controls["[data-action='focus-toggle']"].click();
        assert.equal(host.focusTimerState.running, true);
        assert.equal(host.focusTimerState.pauseReason, undefined);
    });
    await behaviorCheck("session reveal never duplicates lifecycle listeners and teardown removes every listener", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.focus.openFocusTimerFor(host, "read");
        assert.equal(harness.document.listenerCount(), 1);
        assert.equal(harness.window.listenerCount(), 4);
        harness.focus.stopFocusTimerFor(host);
        assert.equal(harness.document.listenerCount(), 0);
        assert.equal(harness.window.listenerCount(), 0);
        harness.focus.openFocusTimerFor(host, "read");
        assert.equal(harness.document.listenerCount(), 1);
        assert.equal(harness.window.listenerCount(), 4);
        host.disposed = true;
        harness.beat();
        assert.equal(harness.document.listenerCount(), 0);
        assert.equal(harness.window.listenerCount(), 0);
    });
    await behaviorCheck("manual completion captures the final valid visible interval without a callback", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(120000);
        harness.advance(1000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls[0][1], 2);
        assert.equal(harness.intervals.size, 0);
        assert.equal(harness.markers.size, 0);
    });
    await behaviorCheck("automatic and manual completion share one pending write and celebrate only after acknowledgment", async () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost(1);
        const pending = deferredWrite();
        let writes = 0;
        host.recordEvent = () => { writes += 1; return pending.promise; };
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(60000);
        harness.beat();
        const completion = harness.focus.finishFocusTimerFor(host, true);
        assert.equal(harness.focus.finishFocusTimerFor(host, true), completion);
        assert.equal(host.focusTimerState.saveStatus, "saving");
        assert.equal(host.celebration, undefined);
        assert.equal(harness.timeouts.size, 0);
        assert.equal(harness.markers.get("lc-focus-session"), "read");
        harness.focus.paintFocusTimer(panel, host.focusTimerState);
        assert.equal(panel.controls["[data-action='focus-finish']"].disabled, true);
        assert.equal(panel.controls["[data-action='focus-toggle']"].disabled, true);
        panel.presets[0].click();
        panel.controls["[data-action='focus-abandon']"].click();
        await Promise.resolve();
        assert.equal(writes, 1);
        assert.equal(host.mutations, 1);
        assert.ok(host.focusTimerState);
        pending.resolve({id: "saved"});
        await completion;
        assert.equal(host.focusTimerState, undefined);
        assert.ok(host.celebration);
        assert.equal(harness.timeouts.size, 1);
        assert.equal(harness.markers.size, 0);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(writes, 1);
    });
    await behaviorCheck("undefined and rejected writes retain a frozen session and retry the identical date/value/revision", async () => {
        for (const failureMode of ["undefined", "reject", "enqueue-throw"]) {
            const harness = behaviorHarness();
            const {host, calls} = harness.makeHost();
            const saveEvent = host.recordEvent;
            const enqueue = host.enqueueMutation;
            if (failureMode === "enqueue-throw") host.enqueueMutation = () => { throw new Error("queue failed"); };
            else host.recordEvent = async (...args) => {
                calls.push(args);
                if (failureMode === "reject") throw new Error("disk failed");
                return undefined;
            };
            harness.focus.openFocusTimerFor(host, "read");
            harness.progress(60000);
            const state = host.focusTimerState;
            await harness.focus.finishFocusTimerFor(host, true);
            assert.equal(host.focusTimerState, state);
            assert.equal(state.saveStatus, "failed");
            assert.equal(state.running, false);
            assert.equal(harness.intervals.size, 0);
            assert.equal(host.celebration, undefined);
            assert.equal(harness.timeouts.size, 0);
            assert.equal(harness.markers.get("lc-focus-session"), "read");
            const failedSnapshot = calls[0];
            harness.advance(24 * 60 * 60000);
            harness.focus.renderFocusTimerPanelFor(host);
            assert.equal(state.remainingSec, 1440);
            host.recordEvent = saveEvent;
            host.enqueueMutation = enqueue;
            await harness.focus.finishFocusTimerFor(host, true);
            const retrySnapshot = calls[calls.length - 1];
            if (failedSnapshot) assert.deepEqual(retrySnapshot, failedSnapshot);
            assert.equal(retrySnapshot[1], 1);
            assert.equal(retrySnapshot[2].localDate, "2026-10-05");
            assert.equal(host.focusTimerState, undefined);
            assert.ok(host.celebration);
        }
    });
    await behaviorCheck("failure exposes a retry action and prevents resume or preset reset from destroying the snapshot", async () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        host.recordEvent = async () => undefined;
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(60000);
        await harness.focus.finishFocusTimerFor(host, true);
        harness.focus.paintFocusTimer(panel, host.focusTimerState);
        assert.equal(panel.controls["[data-action='focus-finish']"].textContent, "msg.retrySave");
        assert.equal(panel.controls["[data-focus-save-status]"].textContent, "focus.saveFailed");
        assert.equal(panel.controls["[data-focus-save-status]"].getAttribute("role"), "alert");
        panel.controls["[data-action='focus-toggle']"].click();
        panel.presets[0].click();
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerState.totalSec, 1500);
        panel.controls["[data-action='focus-abandon']"].click();
        assert.equal(host.focusTimerState, undefined);
        assert.equal(harness.markers.size, 0);
    });
    await behaviorCheck("preset cancel preserves time and pause; confirmation resets time while keeping pause", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        const panel = attachSurface(harness, host, timerSurface());
        harness.progress(75000);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.setConfirmResult(false);
        panel.presets[2].click();
        assert.equal(host.focusTimerState.remainingSec, 1425);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(host.focusTimerMinutes, 25);
        assert.match(harness.confirmations[0], /"elapsed":75/);
        panel.presets[1].click();
        assert.equal(harness.confirmations.length, 1);
        assert.equal(host.focusTimerState.remainingSec, 1425);
        harness.setConfirmResult(true);
        panel.presets[2].click();
        assert.equal(host.focusTimerState.totalSec, 2700);
        assert.equal(host.focusTimerState.remainingSec, 2700);
        assert.equal(host.focusTimerState.running, false);
        assert.equal(panel.presets[2].getAttribute("aria-pressed"), "true");
        assert.equal(panel.presets[1].getAttribute("aria-pressed"), "false");
        harness.advance(5 * 60000);
        panel.controls["[data-action='focus-toggle']"].click();
        harness.progress(60000);
        harness.beat();
        assert.equal(host.focusTimerState.remainingSec, 2640);
    });
    await behaviorCheck("all owned panels and mini strips synchronize pause, resume, presets and tick without touching another host", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        const dock = timerSurface(2, 2);
        const tab = timerSurface(0, 1);
        const dialog = timerSurface(1, 1);
        attachSurface(harness, host, dock, "dockElement");
        attachSurface(harness, host, tab, "tabElement");
        attachSurface(harness, host, dialog, "quickDialogElement");
        const foreign = harness.makeHost().host;
        const foreignSurface = timerSurface();
        attachSurface(harness, foreign, foreignSurface);
        harness.focus.openFocusTimerFor(foreign, "read");
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(65000, host);
        harness.focus.tickFocusTimerFor(host);
        for (const surface of [dock, tab, dialog]) {
            for (const remaining of surface.remainingNodes) assert.equal(remaining.textContent, "23:55");
            for (const panel of surface.panels) assert.equal(panel.controls["[data-focus-remaining]"].textContent, "23:55");
        }
        assert.equal(foreignSurface.remainingNodes[0].textContent, "");
        dialog.panels[0].controls["[data-action='focus-toggle']"].click();
        for (const surface of [dock, tab, dialog]) {
            for (const status of surface.statusNodes) assert.equal(status.textContent, "focus.pause");
            for (const panel of surface.panels) assert.equal(panel.controls["[data-action='focus-toggle']"].textContent, "focus.resume");
        }
        dialog.isConnected = false;
        host.focusTimerRoot = dialog;
        harness.focus.tickFocusTimerFor(host);
        assert.equal(host.focusTimerRoot, undefined);
        assert.equal(host.focusTimerState.running, false);
        const replacement = timerSurface();
        attachSurface(harness, host, replacement, "quickDialogElement");
        dock.panels[0].controls["[data-action='focus-toggle']"].click();
        replacement.panels[0].presets[0].click();
        assert.equal(host.focusTimerState.totalSec, 900);
        for (const panel of dock.panels) assert.equal(panel.presets[0].getAttribute("aria-pressed"), "true");
        harness.progress(61000, host);
        harness.focus.tickFocusTimerFor(host);
        assert.equal(replacement.remainingNodes[0].textContent, "13:59");
        assert.equal(tab.remainingNodes[0].textContent, "13:59");
        assert.equal(dialog.remainingNodes[0].textContent, "23:55");
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls.length, 1);
        assert.ok(foreign.focusTimerState);
    });
    await behaviorCheck("fractional hours retain one minute and use the effective action-date unit", async () => {
        for (const elapsedMinutes of [1, 25]) {
            const harness = behaviorHarness();
            const {host, calls} = harness.makeHost(25, "分钟");
            host.store.items[0].effectiveUnit = "小时";
            harness.focus.openFocusTimerFor(host, "read");
            harness.progress(elapsedMinutes * 60000);
            await harness.focus.finishFocusTimerFor(host, true);
            assert.equal(calls[0][1], elapsedMinutes / 60);
            assert.equal(calls[0][4], `focus.noteMinutes:{"n":${elapsedMinutes}}`);
            assert.ok(calls[0][1] > 0);
        }
    });
    await behaviorCheck("an acknowledged record stays successful if the surrounding queue fails afterwards", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        host.enqueueMutation = async (operation) => {
            await operation();
            throw new Error("post-write refresh failed");
        };
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(60000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(host.focusTimerState, undefined);
        assert.ok(host.celebration);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(calls.length, 1);
    });
    await behaviorCheck("retry revalidates the original revision and does not convert frozen minutes to a changed unit", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        let diskAvailable = false;
        host.recordEvent = async (...args) => {
            calls.push(args);
            if (!diskAvailable || args[3] !== host.revisionFingerprint(host.store.items[0])) return undefined;
            return {id: "revision-checked"};
        };
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(120000);
        await harness.focus.finishFocusTimerFor(host, true);
        diskAvailable = true;
        host.store.items[0].unit = "小时";
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(host.focusTimerState.saveStatus, "failed");
        assert.equal(host.celebration, undefined);
        assert.equal(calls[1][1], 2);
        assert.equal(calls[1][3], "分钟:1");
        host.store.items[0].unit = "分钟";
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(host.focusTimerState, undefined);
        assert.equal(calls.length, 3);
        assert.ok(host.celebration);
    });
    await behaviorCheck("starting a fresh session clears the previous celebration, including before a later failed save", async () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(60000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.ok(host.celebration);
        harness.focus.openFocusTimerFor(host, "read");
        assert.equal(host.celebration, undefined);
        assert.equal(harness.timeouts.size, 0);
        host.recordEvent = async () => undefined;
        harness.progress(60000);
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(host.focusTimerState.saveStatus, "failed");
        assert.equal(host.celebration, undefined);
    });
    await behaviorCheck("too-short and abandoned sessions never write or celebrate", async () => {
        for (const complete of [false, true]) {
            const harness = behaviorHarness();
            const {host, calls} = harness.makeHost();
            harness.focus.openFocusTimerFor(host, "read");
            harness.progress(59999);
            await harness.focus.finishFocusTimerFor(host, complete);
            assert.equal(calls.length, 0);
            assert.equal(host.focusTimerState, undefined);
            assert.equal(host.celebration, undefined);
            assert.equal(harness.intervals.size, 0);
            assert.equal(harness.markers.size, 0);
        }
    });
    await behaviorCheck("missing target retains a failed session without creating a record", async () => {
        const harness = behaviorHarness();
        const {host, calls} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        harness.progress(60000);
        host.store.items = [];
        await harness.focus.finishFocusTimerFor(host, true);
        assert.equal(host.focusTimerState.saveStatus, "failed");
        assert.equal(calls.length, 0);
        assert.equal(host.celebration, undefined);
        assert.deepEqual(harness.messages, ["set.itemMissing"]);
    });
    await behaviorCheck("unload queues the write synchronously before the host closes operations, with no late UI", async () => {
        for (const succeeds of [true, false]) {
            const harness = behaviorHarness();
            const {host} = harness.makeHost();
            const pending = deferredWrite();
            let accepting = true;
            let queued = 0;
            host.enqueueMutation = (operation) => {
                assert.equal(accepting, true);
                queued += 1;
                return operation();
            };
            host.recordEvent = () => pending.promise;
            harness.focus.openFocusTimerFor(host, "read");
            harness.progress(60000);
            host.disposing = true;
            const renders = host.renders;
            const completion = harness.focus.finishFocusTimerFor(host, true);
            harness.focus.stopFocusTimerFor(host);
            accepting = false;
            assert.equal(queued, 1);
            assert.equal(harness.markers.get("lc-focus-session"), "read");
            pending.resolve(succeeds ? {id: "saved-during-unload"} : undefined);
            await completion;
            assert.equal(host.renders, renders);
            assert.equal(host.celebration, undefined);
            assert.equal(harness.timeouts.size, 0);
            assert.equal(harness.markers.has("lc-focus-session"), !succeeds);
        }
    });
    await behaviorCheck("disposed timer releases heartbeats and cannot open a new session", () => {
        const harness = behaviorHarness();
        const {host} = harness.makeHost();
        harness.focus.openFocusTimerFor(host, "read");
        host.disposed = true;
        harness.beat();
        assert.equal(host.focusTimerState, undefined);
        assert.equal(harness.intervals.size, 0);
        harness.focus.openFocusTimerFor(host, "read");
        assert.equal(host.focusTimerState, undefined);
    });
    console.log(`Focus lifecycle: ${checks} checks passed, including elapsed time and persistence behavior.`);
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
