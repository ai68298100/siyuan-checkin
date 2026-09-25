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

function createNavigationFixture({horizontal = false, nativeScrollTo = true} = {}) {
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
        window: {getComputedStyle: (element) => ({flexDirection: element.flexDirection})},
    });
    const fixture = createNavigationFixture();
    const cleanup = loaded.exports.bindSettingsNavigationFor(fixture.root);

    assert.deepEqual(fixture.root.queryLog, [
        ".lc-checkin--settings",
        ".lc-checkin--settings .lc-checkin__settings-nav",
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
        window: {getComputedStyle: (element) => ({flexDirection: element.flexDirection})},
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
{
    const inbox = loadTypeScriptModule("src/features/docktomato-inbox.ts", {"../model": {}}).exports;
    const anchorPicker = loadTypeScriptModule("src/features/note-anchor-picker.ts").exports;
    const {exports} = loadTypeScriptModule("src/render/settings.ts", {
        "../i18n": {t: (key) => key},
        "../shared": {escapeHtml: (value) => String(value), formatNumber: String},
        "../ui/labels": {SORT_LABELS: {manual: "sort.manual"}},
        "../version": {PLUGIN_VERSION: "test-version"},
        "../features/docktomato-inbox": inbox,
        "../features/note-anchor-picker": anchorPicker,
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
    const secondSurfaceHtml = exports.renderSettingsView(context);
    const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
    const buttonTags = [...html.matchAll(/<button\b[^>]*\bdata-settings-nav="[^"]+"[^>]*>/g)].map((match) => match[0]);
    const sectionMatches = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)]
        .filter((match) => /\bdata-settings-group=/.test(match[1]));
    assert.ok(buttonTags.length >= 5, "settings should expose its category navigation");
    assert.equal(sectionMatches.length, buttonTags.length, "each settings category must have exactly one section");

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
for (const source of ["diary", "summary", "sireader", "health", "siplayer", "weread"]) {
    assert.match(settingsSourceT1442, new RegExp(`data-source-panel="${source}"`), `来源 ${source} 必须有独立子面板`);
}
assert.equal((settingsSourceT1442.match(/lc-checkin__source-panel-head/g) || []).length, 7, "七个面板头部");
assert.equal((settingsSourceT1442.match(/lc-checkin__source-steps/g) || []).length, 7, "七个编号步骤列表");
const panelI18n = read("src", "i18n.ts");
const stepKeys = [];
for (const source of ["Diary", "Summary", "Sireader", "Health", "Siplayer", "Weread"]) {
    for (let step = 1; step <= 4; step += 1) stepKeys.push(`set.steps${source}${step}`);
}
stepKeys.push("set.sourceBadgeOn", "set.sourceBadgeOff");
for (const key of stepKeys) {
    const occurrences = panelI18n.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("Settings navigation behavior and accessibility checks passed.");
