/* 设置页分类导航行为守门：
   - 绑定实际滚动的设置页表面，而不是外层宿主；
   - 点击分类、内容滚动与 aria-current 保持双向同步；
   - Observer 只负责请求重算，缺失时仍由 scroll 事件工作；
   - 重渲染/卸载 cleanup 必须释放所有监听与观察器；
   - 导航按钮、section 和标题的 ARIA 引用必须一一对应。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

function loadTypeScriptModule(filename, dependencies = {}, globals = {}) {
    const source = read(...filename.split("/"));
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        fileName: filename,
    }).outputText;
    const module = {exports: {}};
    const context = vm.createContext({
        module,
        exports: module.exports,
        require(specifier) {
            if (Object.prototype.hasOwnProperty.call(dependencies, specifier)) return dependencies[specifier];
            throw new Error(`Unexpected dependency ${specifier} while loading ${filename}`);
        },
        console,
        setTimeout,
        clearTimeout,
        ...globals,
    });
    vm.runInContext(output, context, {filename});
    return {exports: module.exports, context};
}

class FakeClassList {
    constructor(initial = []) {
        this.values = new Set(initial);
    }

    contains(name) {
        return this.values.has(name);
    }

    toggle(name, force) {
        const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
        if (enabled) this.values.add(name);
        else this.values.delete(name);
        return enabled;
    }
}

class FakeElement {
    constructor(name) {
        this.name = name;
        this.dataset = {};
        this.classList = new FakeClassList();
        this.attributes = new Map();
        this.listeners = new Map();
        this.listenerOptions = new Map();
        this.queryResults = new Map();
        this.queryLog = [];
        this.scrollCalls = [];
        this.scrollLeft = 0;
        this.scrollTop = 0;
        this.scrollWidth = 100;
        this.scrollHeight = 100;
        this.clientWidth = 100;
        this.clientHeight = 100;
        this.flexDirection = "column";
        this.flexWrap = "nowrap";
        this.rectFactory = () => ({top: 0, left: 0, width: 100, height: 40});
        this.parent = undefined;
    }

    setQuery(selector, value) {
        this.queryResults.set(selector, value);
    }

    querySelector(selector) {
        this.queryLog.push(selector);
        const value = this.queryResults.get(selector);
        return Array.isArray(value) ? value[0] : value;
    }

    querySelectorAll(selector) {
        this.queryLog.push(selector);
        const value = this.queryResults.get(selector);
        if (value === undefined) return [];
        return Array.isArray(value) ? value : [value];
    }

    addEventListener(type, listener, options) {
        const listeners = this.listeners.get(type) || new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
        this.listenerOptions.set(type, options);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    emit(type, event = {}) {
        for (const listener of [...(this.listeners.get(type) || [])]) listener({type, target: this, ...event});
    }

    contains(element) {
        for (let current = element; current; current = current.parent) {
            if (current === this) return true;
        }
        return false;
    }

    closest(selector) {
        if (selector === "[data-settings-nav]" && this.dataset.settingsNav) return this;
        return this.parent?.closest(selector);
    }

    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        return this.attributes.has(name) ? this.attributes.get(name) : null;
    }

    getBoundingClientRect() {
        const rect = this.rectFactory();
        const width = rect.width ?? Math.max(0, (rect.right ?? 0) - (rect.left ?? 0));
        const height = rect.height ?? Math.max(0, (rect.bottom ?? 0) - (rect.top ?? 0));
        return {
            top: rect.top ?? 0,
            left: rect.left ?? 0,
            width,
            height,
            right: rect.right ?? (rect.left ?? 0) + width,
            bottom: rect.bottom ?? (rect.top ?? 0) + height,
        };
    }

    scrollTo(options) {
        this.scrollCalls.push({...options});
        if (Number.isFinite(options.left)) this.scrollLeft = options.left;
        if (Number.isFinite(options.top)) this.scrollTop = options.top;
    }
}

function createFrameScheduler() {
    let nextId = 1;
    const callbacks = new Map();
    const cancelled = new Set();
    return {
        requestAnimationFrame(callback) {
            const id = nextId++;
            callbacks.set(id, callback);
            return id;
        },
        cancelAnimationFrame(id) {
            cancelled.add(id);
            callbacks.delete(id);
        },
        flush() {
            const pending = [...callbacks.entries()];
            callbacks.clear();
            for (const [, callback] of pending) callback(16);
        },
        get pending() {
            return callbacks.size;
        },
        cancelled,
    };
}

function observerHarness() {
    class FakeIntersectionObserver {
        static instances = [];
        constructor(callback, options) {
            this.callback = callback;
            this.options = options;
            this.observed = [];
            this.disconnected = false;
            FakeIntersectionObserver.instances.push(this);
        }
        observe(element) { this.observed.push(element); }
        disconnect() { this.disconnected = true; }
        trigger() { this.callback([]); }
    }
    class FakeResizeObserver {
        static instances = [];
        constructor(callback) {
            this.callback = callback;
            this.observed = [];
            this.disconnected = false;
            FakeResizeObserver.instances.push(this);
        }
        observe(element) { this.observed.push(element); }
        disconnect() { this.disconnected = true; }
        trigger() { this.callback([]); }
    }
    return {FakeIntersectionObserver, FakeResizeObserver};
}

function createNavigationFixture({horizontal = false, wrapped = false, nativeScrollTo = true} = {}) {
    const root = new FakeElement("root");
    const scroller = new FakeElement("settings-scroller");
    const nav = new FakeElement("settings-nav");
    const ids = ["appearance", "today", "dialog"];
    const naturalTops = [20, 180, 340];
    const groups = ids.map((id, index) => {
        const group = new FakeElement(`group-${id}`);
        group.dataset.settingsGroup = id;
        group.parent = scroller;
        group.rectFactory = () => ({top: naturalTops[index] - scroller.scrollTop, left: 140, width: 400, height: 120});
        return group;
    });
    const buttons = ids.map((id, index) => {
        const button = new FakeElement(`button-${id}`);
        button.dataset.settingsNav = id;
        button.parent = nav;
        button.classList = new FakeClassList(index === 0 ? ["is-active"] : []);
        button.setAttribute("aria-current", index === 0 ? "true" : "false");
        button.rectFactory = () => horizontal
            ? {top: 4, left: index * 82, width: 76, height: 36}
            : {top: index * 40, left: 4, width: 112, height: 36};
        return button;
    });

    scroller.clientHeight = 300;
    scroller.scrollHeight = 600;
    scroller.clientWidth = 600;
    scroller.scrollWidth = 600;
    scroller.rectFactory = () => ({top: 0, left: 120, width: 600, height: 300});
    nav.clientHeight = horizontal ? 44 : 120;
    nav.clientWidth = horizontal ? 190 : 120;
    nav.scrollHeight = horizontal ? 44 : 120;
    nav.scrollWidth = horizontal ? 246 : 120;
    nav.flexDirection = horizontal ? "row" : "column";
    nav.flexWrap = wrapped ? "wrap" : "nowrap";
    nav.rectFactory = () => ({top: 0, left: 0, width: nav.clientWidth, height: nav.clientHeight});
    if (!nativeScrollTo) {
        scroller.scrollTo = undefined;
        nav.scrollTo = undefined;
    }

    root.setQuery(".lc-checkin--settings", scroller);
    root.setQuery(".lc-checkin--settings .lc-checkin__settings-nav", nav);
    scroller.setQuery("[data-settings-group]", groups);
    nav.setQuery("[data-settings-nav]", buttons);
    return {root, scroller, nav, groups, buttons};
}

function assertActive(fixture, expectedId) {
    for (const button of fixture.buttons) {
        const selected = button.dataset.settingsNav === expectedId;
        assert.equal(button.classList.contains("is-active"), selected, `${button.name} active class`);
        assert.equal(button.getAttribute("aria-current"), selected ? "true" : "false", `${button.name} aria-current`);
    }
}

// Full observer environment: exercise deterministic scroll syncing, click scrolling and cleanup.
{
    const scheduler = createFrameScheduler();
    const {FakeIntersectionObserver, FakeResizeObserver} = observerHarness();
    const loaded = loadTypeScriptModule("src/render/settings-navigation.ts", {}, {
        Element: FakeElement,
        IntersectionObserver: FakeIntersectionObserver,
        ResizeObserver: FakeResizeObserver,
        requestAnimationFrame: scheduler.requestAnimationFrame,
        cancelAnimationFrame: scheduler.cancelAnimationFrame,
        window: {getComputedStyle: (element) => ({flexDirection: element.flexDirection, flexWrap: element.flexWrap})},
    });
    const fixture = createNavigationFixture();
    const cleanup = loaded.exports.bindSettingsNavigationFor(fixture.root);

    assert.deepEqual(fixture.root.queryLog, [
        ".lc-checkin--settings",
        ".lc-checkin--settings .lc-checkin__settings-nav",
        "[data-settings-search]",
        "[data-settings-search-status]",
    ], "the helper must select the page scroller and the nav inside that page");
    assert.equal(fixture.scroller.listenerOptions.get("scroll")?.passive, true, "scroll tracking must be passive");
    assert.equal(FakeIntersectionObserver.instances.length, 1);
    assert.equal(FakeIntersectionObserver.instances[0].options.root, fixture.scroller, "intersection root must be the settings scroller");
    assert.equal(FakeIntersectionObserver.instances[0].options.threshold.join(","), "0,0.5,1");
    assert.deepEqual(FakeIntersectionObserver.instances[0].observed, fixture.groups);
    assert.equal(FakeResizeObserver.instances.length, 1);
    assert.deepEqual(FakeResizeObserver.instances[0].observed, [fixture.scroller, fixture.nav, ...fixture.groups]);

    assert.equal(scheduler.pending, 1, "initial geometry sync should be deferred by one frame");
    scheduler.flush();
    assertActive(fixture, "appearance");

    fixture.scroller.scrollTop = 190;
    fixture.scroller.emit("scroll");
    scheduler.flush();
    assertActive(fixture, "today");

    // A short last section must still become active when the scroll surface reaches its end.
    fixture.scroller.scrollTop = fixture.scroller.scrollHeight - fixture.scroller.clientHeight;
    fixture.scroller.emit("scroll");
    scheduler.flush();
    assertActive(fixture, "dialog");

    fixture.scroller.scrollTop = 0;
    fixture.nav.emit("click", {target: fixture.buttons[1]});
    assertActive(fixture, "today");
    assert.deepEqual(fixture.scroller.scrollCalls.at(-1), {left: 0, top: 168, behavior: "smooth"},
        "clicking a category should scroll the settings surface to that card with the desktop inset");

    FakeIntersectionObserver.instances[0].trigger();
    FakeResizeObserver.instances[0].trigger();
    assert.equal(scheduler.pending, 1, "observer bursts should coalesce into one animation frame");
    cleanup();
    assert.equal(fixture.scroller.listeners.get("scroll")?.size, 0);
    assert.equal(fixture.nav.listeners.get("click")?.size, 0);
    assert.equal(FakeIntersectionObserver.instances[0].disconnected, true);
    assert.equal(FakeResizeObserver.instances[0].disconnected, true);
    assert.equal(scheduler.pending, 0, "cleanup must cancel a queued frame");
    assert.equal(scheduler.cancelled.size, 1);
    cleanup(); // idempotent during both rerender and final unload paths
}

// Older embedded WebViews: no observers and no scrollTo(options), but click and scroll sync still work.
{
    const scheduler = createFrameScheduler();
    const loaded = loadTypeScriptModule("src/render/settings-navigation.ts", {}, {
        Element: FakeElement,
        IntersectionObserver: undefined,
        ResizeObserver: undefined,
        requestAnimationFrame: scheduler.requestAnimationFrame,
        cancelAnimationFrame: scheduler.cancelAnimationFrame,
        window: {getComputedStyle: (element) => ({flexDirection: element.flexDirection, flexWrap: element.flexWrap})},
    });
    const fixture = createNavigationFixture({horizontal: true, nativeScrollTo: false});
    const cleanup = loaded.exports.bindSettingsNavigationFor(fixture.root, {reducedMotion: true});
    scheduler.flush();

    fixture.scroller.scrollTop = 190;
    fixture.scroller.emit("scroll");
    scheduler.flush();
    assertActive(fixture, "today");

    fixture.scroller.scrollTop = 0;
    fixture.nav.emit("click", {target: fixture.buttons[2]});
    assertActive(fixture, "dialog");
    assert.equal(fixture.scroller.scrollTop, 288,
        "the property-assignment fallback must account for the horizontal mobile rail and clamp to the scroll range");
    cleanup();
}

// Rendered settings markup: every category button controls one section, and every section is named by its own heading.
// Wrapped mobile rail: active group can be on a lower row, so reveal it vertically.
{
    const scheduler = createFrameScheduler();
    const loaded = loadTypeScriptModule("src/render/settings-navigation.ts", {}, {
        Element: FakeElement,
        IntersectionObserver: undefined,
        ResizeObserver: undefined,
        requestAnimationFrame: scheduler.requestAnimationFrame,
        cancelAnimationFrame: scheduler.cancelAnimationFrame,
        window: {getComputedStyle: (element) => ({flexDirection: element.flexDirection, flexWrap: element.flexWrap})},
    });
    const fixture = createNavigationFixture({horizontal: true, wrapped: true});
    fixture.nav.clientHeight = 44;
    fixture.nav.scrollHeight = 140;
    fixture.buttons[2].rectFactory = () => ({top: 100, left: 8, width: 76, height: 36});
    const cleanup = loaded.exports.bindSettingsNavigationFor(fixture.root, {reducedMotion: true});
    scheduler.flush();
    fixture.nav.emit("click", {target: fixture.buttons[2]});
    assert.ok(fixture.nav.scrollTop > 0, "wrapped rail should scroll vertically to reveal its active lower-row button");
    cleanup();
}

// Rendered settings markup: every category button controls one section, and every section is named by its own heading.
{
    const inbox = loadTypeScriptModule("src/features/docktomato-inbox.ts", {"../model": {}}).exports;
    const anchorPicker = loadTypeScriptModule("src/features/note-anchor-picker.ts").exports;
    const noteBindings = loadTypeScriptModule("src/features/note-bindings.ts").exports;
    const {exports} = loadTypeScriptModule("src/render/settings.ts", {
        "../i18n": {t: (key) => key},
        "../shared": {escapeHtml: (value) => String(value), formatNumber: String},
        "../ui/labels": {SORT_LABELS: {manual: "sort.manual"}},
        "../version": {PLUGIN_VERSION: "test-version"},
        "../features/docktomato-inbox": inbox,
        "../features/note-anchor-picker": anchorPicker,
        "../features/note-bindings": noteBindings,
    });
    const context = {
        store: {items: [], events: []},
        auditEntries: [],
        snapshots: [],
        customIconLibrary: [],
        agentCapability: {state: "pending", count: 0},
        appearance: "system",
        reducedMotion: false,
        hapticFeedback: true,
        focusTimerProvider: "builtin",
        focusTimerAdapterCount: 0,
        focusTimerAdapterIds: [],
        focusTimerBusy: false,
        palette: "lavender",
        avatar: "star",
        avatarImage: undefined,
        todayGroupMode: "none",
        todaySortMode: "manual",
        completedCollapsed: false,
        weekStripVisible: true,
        dialogSizeMode: "auto",
        dialogScale: 90,
        dialogFixedSize: {width: 1000, height: 760},
        dialogHasCustomFrame: false,
        resolvedAppearanceValue: "light",
    };
    const html = exports.renderSettingsView(context);
    const localOnly = exports.projectIntegrationStatus({enabled: true, configured: true, todayCount: 2});
    assert.equal(localOnly.configuration, "enabled", "saved opt-in remains a configuration fact");
    assert.equal(localOnly.runtime, "unprobed", "saved opt-in does not prove the host is available");
    assert.equal(localOnly.activity.todayCount, 2, "today's persisted events are independent of live host state");
    const unavailable = exports.projectIntegrationStatus({enabled: true, configured: true, hostAvailable: false});
    assert.equal(unavailable.runtime, "missing", "a failed host probe is distinct from local opt-in");
    assert.equal(unavailable.configuration, "enabled");
    const failedRead = exports.projectIntegrationStatus({enabled: true, configured: true, lastReadOk: false});
    assert.equal(failedRead.problem, "last-read-failed", "last read failure must remain visible without claiming live host status");
    assert.equal(failedRead.runtime, "unprobed");
    assert.equal(exports.projectIntegrationStatus({enabled: true, configured: true, lastReadOk: true, lastWriteFailed: true}).problem, "last-write-failed", "a failed write remains a separate problem even after a successful read");
    assert.equal(exports.projectIntegrationStatus({enabled: true, configured: false}).configuration, "setup");
    assert.equal(exports.projectIntegrationStatus({enabled: true, configured: true, targetAvailable: false}).configuration, "rebind");
    assert.match(html, /data-source-panel="sireader"[^>]*data-source-state="setup"[\s\S]*?data-runtime-state="unprobed"/, "an unconfigured listener must show an unprobed runtime");
    const categoryOrder = ["plugin-event", "official-pull", "shared-doc"].map((category) => html.indexOf(`data-source-category="${category}"`));
    assert.ok(categoryOrder.every((position) => position >= 0) && categoryOrder[0] < categoryOrder[1] && categoryOrder[1] < categoryOrder[2], "external sources follow their actual trigger channels");
    assert.ok(html.indexOf('data-source-panel="siplayer"') < categoryOrder[1] && html.indexOf('data-source-panel="weread"') < categoryOrder[2], "listener and official pull panels stay within their category");
    assert.equal((html.match(/data-source-panel="weread"/g) || []).length, 1, "reordering must not duplicate a source panel");
    const readingTarget = {id: "reading", name: "Reading", archived: false};
    const sharedReading = exports.renderSettingsView({...context, store: {items: [readingTarget], events: []},
        sireaderIntegration: {enabled: true, itemId: "reading", thresholdMinutes: 30},
        wereadIntegration: {enabled: true, itemId: "reading", thresholdMinutes: 30, finishItemId: "", notesItemId: ""}, wereadKeySet: true});
    assert.match(sharedReading, /data-source-conflict="reading-duration"/, "two enabled reading-minute sources sharing a target need a visible warning");
    assert.match(sharedReading, /data-sireader-toggle checked/, "the warning must leave the original source enabled");
    assert.match(sharedReading, /data-weread-toggle checked/, "the warning must leave the other source enabled");
    const separateReading = exports.renderSettingsView({...context, store: {items: [readingTarget, {id: "other", name: "Other", archived: false}], events: []},
        sireaderIntegration: {enabled: true, itemId: "reading", thresholdMinutes: 30},
        wereadIntegration: {enabled: true, itemId: "other", thresholdMinutes: 30, finishItemId: "", notesItemId: ""}, wereadKeySet: true});
    assert.doesNotMatch(separateReading, /data-source-conflict="reading-duration"/, "separate targets do not imply double counting");
    const reportOnly = exports.renderSettingsView({...context, sourceIngestReports: {health: {mode: "preview", outcome: "ok", scanned: 5, matched: 2, unmatched: 1, planned: 1, written: 0, duplicate: 1, tombstoned: 0, manualConflict: 0, invalid: 1, blocked: 0, windowFull: true}}});
    assert.match(reportOnly, /data-source-report="health" data-report-mode="preview" data-report-outcome="ok"/, "preview result is visible in its source panel");
    assert.match(reportOnly, /data-runtime-state="unprobed"/, "a successful document read does not prove another plugin host is connected");
    assert.match(reportOnly, /set\.sourceReportWindowFull/, "a full bounded scan warns that more rows may remain");
    assert.match(reportOnly, /data-action="preview-source" data-source="health"/, "health source exposes read-only preview");
    assert.match(reportOnly, /data-action="preview-source" data-source="notequery"/, "note query source exposes read-only preview");
    assert.match(reportOnly, /data-action="preview-source" data-source="yeguif"/, "LifeLog source exposes read-only preview");
    assert.doesNotMatch(reportOnly, /data-action="preview-source" data-source="weread"/, "official pull uses its existing pull action");
    const ingestSource = read("src", "index.ts");
    for (const [method, nextMethod] of [["ingestHealthInbox", "ingestNoteQuery"], ["ingestNoteQuery", "wereadGateway"], ["ingestYeguif", "recordBlockToday"]]) {
        const start = ingestSource.indexOf(`private async ${method}(preview = false)`);
        const end = ingestSource.indexOf(`private async ${nextMethod}(`, start);
        assert.ok(start >= 0 && end > start, `${method} preview boundary remains identifiable`);
        const body = ingestSource.slice(start, end);
        assert.match(body, /report\.planned \+= 1;\s*if \(preview\) continue;[\s\S]*?enqueueMutation\(/, `${method} must leave preview before enqueueing an event mutation`);
        assert.doesNotMatch(body.slice(0, body.indexOf("if (preview) continue;")), /enqueueMutation\(|recordExternalEvent\(/, `${method} must not write before the preview gate`);
    }
    const contracts = exports.renderSettingsView({...context, publicApiContract: {version: 5, capabilities: ["items.query", "events.record", "calendar.read"], taskHorizonVersion: 1},
        dockTomatoDiagnostics: {state: "missing"}, diagnosticsCount: 2});
    assert.match(contracts, /data-contract-center="api" data-contract-state="provided"[\s\S]*?set\.apiContractDetail/, "public API version and capability count are visible");
    assert.match(contracts, /data-contract-center="taskhorizon" data-contract-state="waiting"/, "unconfirmed consumer is explicitly waiting");
    assert.match(contracts, /data-contract-center="docktomato" data-contract-state="missing"/, "provider state comes from the real probe");
    assert.match(contracts, /data-contract-center="docktomato"[\s\S]*?data-action="export-diagnostics"/, "the contract center exposes the existing diagnostic export action");
    const secondSurfaceHtml = exports.renderSettingsView(context);
    const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
    const buttonTags = [...html.matchAll(/<button\b[^>]*\bdata-settings-nav="[^"]+"[^>]*>/g)].map((match) => match[0]);
    const sectionMatches = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)]
        .filter((match) => /\bdata-settings-group=/.test(match[1]));
    assert.ok(buttonTags.length >= 5, "settings should expose its category navigation");
    assert.equal(sectionMatches.length, buttonTags.length, "each settings category must have exactly one section");
    assert.match(html, /data-settings-nav="documents"/, "settings navigation must expose a dedicated SiYuan document-write group");
    assert.match(html, /data-settings-nav="external"/, "settings navigation must expose a dedicated third-party-source group");

    const buttonsByGroup = new Map(buttonTags.map((tag) => [attribute(tag, "data-settings-nav"), tag]));
    const controlledIds = new Set();
    for (const [, sectionAttributes, body] of sectionMatches) {
        const groupId = attribute(sectionAttributes, "data-settings-group");
        const sectionId = attribute(sectionAttributes, "id");
        const labelledBy = attribute(sectionAttributes, "aria-labelledby");
        const button = buttonsByGroup.get(groupId);
        assert.ok(button, `settings group ${groupId} needs a matching navigation button`);
        assert.equal(attribute(button, "aria-controls"), sectionId, `${groupId} button must control its section`);
        assert.match(body, new RegExp(`<h2\\b[^>]*\\bid="${labelledBy}"[^>]*>`), `${groupId} section must reference its heading`);
        assert.ok(!controlledIds.has(sectionId), `${sectionId} must be unique`);
        controlledIds.add(sectionId);
    }
    assert.equal(buttonTags.filter((tag) => attribute(tag, "aria-current") === "true").length, 1,
        "exactly one category should be current on first render");
    assert.match(html, /<option value="star" selected>set\.avatarPresetStar<\/option>/,
        "the avatar preset select must preserve the active preset after a re-render");
    assert.match(html, /<option value="">set\.avatarCustomOption<\/option>/,
        "the avatar select must expose a localized custom-text state");
    assert.doesNotMatch(html, /✓ 勾选|★ 星标|🐴 小驴|🌿 绿叶|☀ 太阳|🎯 目标/,
        "avatar preset labels must not bypass the i18n dictionary");
    const indexSource = read("src", "index.ts");
    assert.match(indexSource, /openAvatarEditor\(file, root,/, "avatar uploads must open the interactive crop editor");
    assert.match(indexSource, /await this\.persistViewPreferences\(\{avatarImage\}\);[\s\S]*?this\.avatarImage = avatarImage;/, "visible avatars change only after successful persistence");
    assert.match(html, /data-setting-avatar-custom[^>]*value=""/, "preset ids must not appear as custom avatar text");
    const firstSurfaceIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    const secondSurfaceIds = new Set([...secondSurfaceHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
    assert.equal(firstSurfaceIds.size, [...html.matchAll(/\bid="([^"]+)"/g)].length,
        "one settings surface must not contain duplicate ids");
    assert.equal(secondSurfaceIds.size, [...secondSurfaceHtml.matchAll(/\bid="([^"]+)"/g)].length,
        "a second settings surface must not contain duplicate ids");
    for (const id of firstSurfaceIds) {
        assert.ok(!secondSurfaceIds.has(id), `simultaneous settings surfaces must not reuse ${id}`);
    }
    const pending = exports.renderSettingsView({...context, dockTomatoInbox: {capacity: 200, entries: [
        {identity: "hours", itemName: "小时阅读", itemId: "h", itemUnit: "小时", tomatoMode: "minutes", durationMinutes: 30, localDate: "2026-09-20", state: "pending", attempts: 0},
        {identity: "minutes", itemName: "分钟阅读", itemId: "m", itemUnit: "分钟", tomatoMode: "minutes", durationMinutes: 30, localDate: "2026-09-20", state: "pending", attempts: 0},
        {identity: "sessions", itemName: "番茄数量", itemId: "s", itemUnit: "个番茄", tomatoMode: "sessions", durationMinutes: 30, localDate: "2026-09-20", state: "pending", attempts: 0},
    ]}});
    assert.match(pending, /小时阅读 · 2026-09-20 · 0\.5 小时<\/small>/, "pending hours use the same converted value as the eventual record");
    assert.match(pending, /分钟阅读 · 2026-09-20 · 30 分钟<\/small>/, "minute mapping remains in minutes");
    assert.match(pending, /番茄数量 · 2026-09-20 · 1 个番茄<\/small>/, "session mapping preserves its custom unit");
    const configuredYeguif = exports.renderSettingsView({...context, store: {items: [{id: "y", name: "拉伸", unit: "分钟", archived: false}], events: []}, yeguifIntegration: {enabled: false, itemId: "", notebookId: "notebook-1", mappings: []}});
    assert.match(configuredYeguif, /data-source-panel="yeguif" data-source-state="ready"/, "叶归绑定完整但未启用时应显示待启用状态");
    assert.match(configuredYeguif, /data-yeguif-mappings/, "叶归可按同名自动匹配并为异名项目配置显式映射");
}

// Integration lifecycle: the plugin owns one cleanup per surface and releases it before replacement and unload.
{
    const plugin = read("src", "index.ts");
    assert.match(plugin, /settingsNavigationCleanups = new WeakMap<HTMLElement, \(\) => void>\(\)/);
    assert.match(plugin, /const cleanupSettingsNavigation = this\.settingsNavigationCleanups\.get\(root\);[\s\S]*?cleanupSettingsNavigation\(\);[\s\S]*?this\.settingsNavigationCleanups\.delete\(root\);/,
        "rendering over a surface must release its previous settings navigation binding");
    assert.match(plugin, /async onunload\(\)[\s\S]*?const cleanup = this\.settingsNavigationCleanups\.get\(root\);[\s\S]*?cleanup\?\.\(\);[\s\S]*?this\.settingsNavigationCleanups\.delete\(root\);/,
        "plugin unload must release bindings for every live surface");
    assert.match(plugin, /this\.settingsNavigationCleanups\.set\(root, bindSettingsNavigationFor\(root, \{reducedMotion: this\.reducedMotion\}\)\)/,
        "settings binding must receive the current motion preference");
}

/* —— T-1442 · R-A10 来源子面板：每个外部来源独立面板（头部徽标 + 编号步骤） —— */
const settingsSourceT1442 = read("src", "render", "settings.ts");
const documentsGroupIndex = settingsSourceT1442.indexOf('id: "documents"');
const externalGroupIndex = settingsSourceT1442.indexOf('id: "external"');
assert.ok(documentsGroupIndex >= 0 && externalGroupIndex > documentsGroupIndex, "document writes must be a separate group before third-party sources");
assert.match(settingsSourceT1442, /data-document-writes open/, "document writes must have their own disclosure");
assert.match(settingsSourceT1442, /data-external-sources open/, "third-party sources must retain their disclosure");
assert.ok(settingsSourceT1442.indexOf('data-source-panel="diary"') > documentsGroupIndex && settingsSourceT1442.indexOf('data-source-panel="diary"') < externalGroupIndex, "diary writes must stay in the document-write group");
assert.ok(settingsSourceT1442.indexOf('data-source-panel="summary"') > documentsGroupIndex && settingsSourceT1442.indexOf('data-source-panel="summary"') < externalGroupIndex, "summary writes must stay in the document-write group");
assert.ok(settingsSourceT1442.indexOf('data-source-panel="sireader"') > externalGroupIndex, "third-party source panels must stay after the document-write group");
assert.ok(settingsSourceT1442.indexOf('data-source-panel="notequery"') > externalGroupIndex, "note-derived source panel must stay after the document-write group");
for (const source of ["diary", "summary", "sireader", "health", "notequery", "siplayer", "weread", "yeguif"]) {
    assert.match(settingsSourceT1442, new RegExp(`data-source-panel="${source}"`), `来源 ${source} 必须有独立子面板`);
}
assert.equal((settingsSourceT1442.match(/<details class="lc-checkin__source-panel"/g) || []).length, 10, "来源面板必须使用可折叠 details（8 来源 + 总览 + 问卷日记 2 能力面板）");
assert.match(settingsSourceT1442, /sourcePanelOpen\("weread"\)/, "保存联动设置时应能恢复当前展开卡片");
assert.match(settingsSourceT1442, /data-action="clear-weread-key"/, "微信读书应提供本地 Key 清除入口");
assert.equal((settingsSourceT1442.match(/lc-checkin__source-panel-head/g) || []).length, 10, "十个面板头部（8 来源 + 总览 + 问卷日记）");
assert.equal((settingsSourceT1442.match(/lc-checkin__source-steps/g) || []).length, 8, "八个编号步骤列表（总览/问卷日记面板无来源步骤，属能力配置）");
/* T-1553 来源卡动作语义统一：摄取型=立即读取、拉取型=立即拉取（唯一入口）、
   含义模糊的「立即刷新」（set.sourceRetry）全量退役；步骤+边界长文折入
   data-source-advanced（搜索过滤会自动展开命中的 details，可达性不降级）。 */
const i18nSourceT1553 = read("src", "i18n.ts");
assert.equal((i18nSourceT1553.match(/"set\.sourceRetry"/g) || []).length, 0, "set.sourceRetry 键必须退役（中英词典均删除）");
for (const key of ["set.sourceReadNow", "set.sourceAdvanced"]) {
    assert.ok((i18nSourceT1553.match(new RegExp(`"${key}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
}
assert.equal((settingsSourceT1442.match(/data-action="refresh-source"/g) || []).length, 3, "refresh-source 仅剩三个摄取型来源（health/notequery/yeguif）");
assert.ok(!settingsSourceT1442.includes('data-action="refresh-source" data-source="weread"'), "微信读书拉取统一走 weread-pull，不得保留第二入口");
assert.equal((settingsSourceT1442.match(/data-action="weread-pull"/g) || []).length, 1, "微信读书唯一拉取动作在位");
assert.equal((settingsSourceT1442.match(/t\("set\.sourceReadNow"\)/g) || []).length, 3, "三个摄取卡使用「立即读取」动作词");
assert.equal((settingsSourceT1442.match(/data-source-advanced/g) || []).length, 6, "六张来源卡的步骤与边界折入高级折叠");
const indexSourceT1553 = read("src", "index.ts");
assert.ok(!indexSourceT1553.includes("set.sourceRetry"), "refresh 分发不得再引用退役键");
assert.equal((indexSourceT1553.match(/else if \(source === "weread"\) await this\.ingestWeread\(\);/g) || []).length, 0, "refresh-source 分发移除 weread 分支");
/* T-1557/T-1558 文档目标卡：三卡摘要行+四动作；换绑/清除确认；会话缓存不持久化。 */
for (const point of ["diary", "summary", "health"]) {
    assert.match(settingsSourceT1442, new RegExp(`targetSummaryRow\\("${point}"`), `${point} 目标卡必须渲染摘要行动作组`);
}
assert.match(settingsSourceT1442, /data-target-summary="\$\{point\}"/, "摘要行容器属性在位");
assert.match(settingsSourceT1442, /data-target-summary-label="\$\{escapeHtml\(docId\)\}"/, "摘要标签携带已存 docId（水合锚点）");
for (const action of ["data-target-recheck", "data-target-edit", "data-target-clear", "data-open-binding"]) {
    assert.match(settingsSourceT1442, new RegExp(action), `目标卡动作 ${action} 在位`);
}
for (const key of ["set.targetSummaryTitle", "set.targetNone", "set.targetOpen", "set.targetRecheck", "set.targetEdit", "set.targetClear", "set.targetCleared", "set.rebindConfirm", "set.targetClearConfirm"]) {
    assert.ok((i18nSourceT1553.match(new RegExp(`"${key}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
}
assert.match(indexSourceT1553, /set\.rebindConfirm/, "换绑保存必须先经确认弹窗（旧/新目标+范围+保留说明）");
assert.match(indexSourceT1553, /set\.targetClearConfirm/, "清除目标必须先经确认弹窗");
assert.match(indexSourceT1553, /private targetSummaries = new Map/, "目标摘要为会话内存缓存（不落存储桶）");
assert.match(indexSourceT1553, /readBindingBlocks\(docIds\)/, "摘要水合复用既有块查询单一实现");
assert.match(indexSourceT1553, /data-target-edit="\$\{card\.point\}"\]`\)\?\.addEventListener\("click", \(\) => \{\s*root\.querySelector<HTMLElement>\(`\[\$\{card\.attribute\}\]`\)\?\.focus\(\)/s, "重新选择必须聚焦对应输入框");
/* T-1552 五段式：三张写入卡显式声明触发方式并呈现最近写入（审计单一事实）；摘要常驻开关保留。 */
for (const point of ["diary", "summary", "journal"]) {
    assert.match(settingsSourceT1442, new RegExp(`writeTriggerRow\\("${point}"`), `${point} 写入卡必须声明触发方式`);
    assert.match(settingsSourceT1442, new RegExp(`writeResultRow\\("${point}"`), `${point} 写入卡必须呈现最近写入`);
}
assert.match(settingsSourceT1442, /data-summary-resident/, "摘要常驻开关必须保留（自动触发语义）");
assert.ok(!settingsSourceT1442.includes("data-diary-toggle"), "diary 手动报告开关必须保持退役");
for (const key of ["set.writeTriggerTitle", "set.writeTriggerManual", "set.writeTriggerResident", "set.writeTriggerJournal", "set.writeResultTitle", "set.writeResultNone", "set.writeResultOk", "set.writeResultFail"]) {
    assert.ok((i18nSourceT1553.match(new RegExp(`"${key}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
}
/* T-1547 来源→项目闭环：六卡事实三行 + 查看记录跳转 + 思播真实探测（思阅无探测面不伪造）。 */
for (const source of ["sireader", "siplayer", "weread", "health", "notequery", "yeguif"]) {
    assert.match(settingsSourceT1442, new RegExp(`sourceFactsBlock\\("${source}"`), `${source} 卡必须有三行事实块`);
}
assert.match(settingsSourceT1442, /data-review-records-for="\$\{source\}"/, "事实块必须带查看记录跳转（六卡共用助手）");
assert.match(settingsSourceT1442, /data-action="probe-siplayer"/, "思播卡提供真实宿主探测按钮");
assert.ok(!settingsSourceT1442.includes("probe-sireader"), "思阅无可靠探测面，不得伪造探测按钮");
for (const key of ["set.sourceFactProduces", "set.sourceFactProjects", "set.sourceFactTrigger", "set.sourceViewRecords", "set.siplayerProbe", "msg.siplayerProbeFound", "msg.siplayerProbeMissing", "set.sourceProduces.sireader", "set.sourceTrigger.weread"]) {
    assert.ok((i18nSourceT1553.match(new RegExp(`"${key.replace(/\./g, "\\.")}"`, "g")) || []).length >= 2, `${key} 必须中英双语齐备`);
}
assert.match(indexSourceT1553, /openReviewRecordsForSource/, "回顾跳转方法必须在位");
assert.match(indexSourceT1553, /health: "api:health"/, "health 事件用登记渠道 api:health 过滤");
assert.match(indexSourceT1553, /detectSiplayerController\(window\)/, "思播探测走真实特征检测");
/* T-1548 融合：写入前内容预览（与写入同一构建路径、零写入）。 */
for (const channel of ["diary", "summary"]) {
    assert.match(settingsSourceT1442, new RegExp(`data-output-preview-generate="${channel}"`), `${channel} 写入卡必须有预览按钮`);
    assert.match(settingsSourceT1442, new RegExp(`data-output-preview-body="${channel}"`), `${channel} 必须有预览内容容器`);
}
assert.ok((i18nSourceT1553.match(/"set\.outputPreview"/g) || []).length >= 2, "set.outputPreview 必须中英双语齐备");
assert.match(indexSourceT1553, /previewOutputMarkdown\(channel/, "预览经单一入口生成");
assert.match(indexSourceT1553, /const markdown = this\.buildSummaryResidentMarkdown\(localDate\);/, "驻留写入与预览共用同一构建方法（零分歧）");
assert.match(settingsSourceT1442, /data-source-panel="journal"/, "问卷日记面板在位（T-1465）");
assert.match(settingsSourceT1442, /data-journal-custom/, "问卷日记自建模板编辑区在位");
assert.match(settingsSourceT1442, /data-source-panel="bindings"/, "笔记联动总览面板在位（T-1470）");
assert.match(settingsSourceT1442, /data-action="check-note-bindings"/, "联动总览体检按钮在位");
/* 文档/笔记本目标统一使用独立卡片，避免目标输入、保存和启用开关混成一行。 */
for (const target of ["diary", "journal", "summary", "health", "yeguif"]) {
    assert.match(settingsSourceT1442, new RegExp(`data-document-target-card="${target}"`), `${target} 目标卡片必须保留`);
}
for (const className of ["lc-checkin__document-target-heading", "lc-checkin__document-target-field", "lc-checkin__document-target-actions"]) {
    assert.match(settingsSourceT1442, new RegExp(className), `目标卡片必须包含 ${className}`);
}
const targetStyle = read("src", "ui", "components.scss");
assert.match(targetStyle, /\.lc-checkin__document-target-card[\s\S]*min-height: 44px/, "目标卡片控件必须保留 44px 触控高度");
assert.match(targetStyle, /\.lc-checkin__document-target-copy small[\s\S]*overflow-wrap: anywhere/, "目标说明必须允许长文案换行");
const panelI18n = read("src", "i18n.ts");
const stepKeys = [];
for (const source of ["Diary", "Summary", "Sireader", "Health", "Siplayer", "Weread", "Yeguif"]) {
    for (let step = 1; step <= 4; step += 1) stepKeys.push(`set.steps${source}${step}`);
}
for (let step = 1; step <= 3; step += 1) stepKeys.push(`set.stepsNoteQuery${step}`);
stepKeys.push("set.noteQueryIntegration", "set.noteQueryBoundary", "set.noteQuerySave", "set.noteQueryToggle");
stepKeys.push("set.sourceBadgeOn", "set.sourceBadgeOff", "set.groupHost", "set.groupDocuments", "set.groupExternal", "set.extSourcesListTitle", "set.extPrivacyHint", "set.docWritesTitle", "set.docWritesSetupHint", "set.docWritesListTitle", "set.docWritesSummary", "set.thirdPartySourcesTitle", "set.thirdPartySourcesSetupHint", "set.thirdPartySourcesListTitle", "set.thirdPartySourcesSummary", "set.wereadClearKey", "msg.wereadClearKeyConfirm", "msg.wereadClearKeyDone", "msg.healthNeedMapping");
for (const key of stepKeys) {
    const occurrences = panelI18n.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("Settings navigation behavior and accessibility checks passed.");
