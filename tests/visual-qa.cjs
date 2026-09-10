const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
    const candidates = [
        process.env.CHECKIN_PLAYWRIGHT_MODULE,
        "playwright",
        "C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ].filter(Boolean);
    for (const candidate of candidates) {
        try { return require(candidate); } catch {}
    }
    throw new Error("Playwright is unavailable. Set CHECKIN_PLAYWRIGHT_MODULE to its module path.");
}
const {chromium} = loadPlaywright();

const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || "D:/AI/Codex/siyuan-checkin";
const outputRoot = path.resolve(process.env.CHECKIN_QA_OUTPUT_ROOT || path.join(projectRoot, ".artifacts", "visual-qa"));
fs.mkdirSync(outputRoot, {recursive: true});
const initialWidth = Number(process.env.CHECKIN_QA_INITIAL_WIDTH || 420);
const narrowWidth = Number(process.env.CHECKIN_QA_NARROW_WIDTH || 320);

(async () => {
    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHECKIN_BROWSER,
    });
    const page = await browser.newPage({viewport: {width: initialWidth, height: 760}, deviceScaleFactor: 1});
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setContent(`<style>:root{--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-font-family:Arial,sans-serif}body{margin:8px}</style><main id="frame" style="width:340px;height:720px;border:1px solid #ddd"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
    await page.evaluate(() => {
        const now = new Date();
        const previous = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10);
        const today = (hour, minute) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).toISOString();
        window.__store = {
            version: 1,
            items: [
                {id: "stretch", name: "晨间拉伸", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "morning", createdAt: now.toISOString()},
                {id: "reading", name: "深度阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening", createdAt: now.toISOString()},
                {id: "water", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "afternoon", createdAt: now.toISOString()},
                {id: "walk", name: "晚间散步", icon: "🚶", kind: "quantity", target: 5000, unit: "步", schedule: {type: "daily"}, createdAt: now.toISOString(), archived: true},
            ],
            events: [
                {id: "e1", itemId: "stretch", occurredAt: today(7, 30), value: 1, unit: "次", source: "manual"},
                {id: "e2", itemId: "reading", occurredAt: today(9, 0), value: 15, unit: "分钟", source: "manual"},
                {id: "e3", itemId: "water", occurredAt: today(10, 0), value: 2, unit: "杯", source: "manual"},
                {id: "e4", itemId: "reading", occurredAt: previous.toISOString(), value: 30, unit: "分钟", source: "manual"},
            ],
        };
        window.module = {exports: {}};
        window.require = (name) => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {
                Plugin: class {
                    addIcons() {}
                    addDock(options) { window.__dockOptions = options; }
                    addTab(options) { window.__tabOptions = options; }
                    addTopBar(options) { window.__topBarOptions = options; }
                    addCommand() {}
                    loadData() { return Promise.resolve(structuredClone(window.__store)); }
                    saveData(_name, value) {
                        return new Promise((resolve) => setTimeout(() => {
                            window.__store = structuredClone(value);
                            resolve();
                        }, 10));
                    }
                },
                getFrontend() { return "desktop"; },
                openTab(options) {
                    window.__openTabOptions = options;
                    return Promise.resolve({close() { window.__tabClosed = true; }});
                },
                showMessage(message) { window.__messages = [...(window.__messages || []), message]; },
            };
        };
    });
    await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
    await page.evaluate(async () => {
        const PluginClass = window.module.exports.default || window.module.exports;
        window.__plugin = new PluginClass();
        window.__plugin.onload();
        window.__readyBefore = window.siyuanCheckin.isReady();
        const readyPromise = window.siyuanCheckin.whenReady();
        window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await window.__plugin.onLayoutReady();
        window.__readyResult = await readyPromise;
        window.__readyAfter = window.siyuanCheckin.isReady();
    });

    const inspect = async (name) => {
        await page.screenshot({path: path.join(outputRoot, `${name}.png`), fullPage: true});
        return page.locator("#dock").evaluate((element) => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
        }));
    };
    const openSurface = async (surface, desktopSelector) => {
        const mobileButton = page.locator(`[data-mobile-nav="${surface}"]`);
        if (await mobileButton.count()) {
            if (!await mobileButton.isVisible().catch(() => false)) {
                const moreButton = page.locator('[data-mobile-nav="more"]');
                if (await moreButton.isVisible().catch(() => false)) await moreButton.click();
            }
            if (await mobileButton.isVisible().catch(() => false)) {
                await mobileButton.click();
                return;
            }
        }
        await page.locator(desktopSelector).evaluate((button) => button.click());
    };

    const results = {today: await inspect("today")};
    results.todayStructure = await page.evaluate(() => ({
        groupCount: document.querySelectorAll("[data-group-toggle]").length,
        completedCount: document.querySelectorAll(".lc-checkin__completed-section [data-item-id]").length,
        completedCollapsed: document.querySelector("[data-action='toggle-completed']")?.getAttribute("aria-expanded") === "false",
    }));
    const filterDisclosure = page.locator("[data-today-filters]");
    if (await filterDisclosure.count() && !await filterDisclosure.evaluate((element) => element.open)) {
        await filterDisclosure.locator(":scope > summary").click();
    }
    await page.selectOption("[data-group-mode]", "time");
    const timeGroupCount = await page.locator("[data-group-toggle]").count();
    await page.selectOption("[data-group-mode]", "priority");
    const priorityGroupCount = await page.locator("[data-group-toggle]").count();
    await page.selectOption("[data-group-mode]", "group");
    await page.click("[data-action='toggle-completed']");
    const completedExpanded = await page.locator(".lc-checkin__completed-section [data-item-id]").count();
    await page.click("[data-action='toggle-completed']");
    results.groupModes = {timeGroupCount, priorityGroupCount, completedExpanded};
    await openSurface("history", "[data-action='history']");
    results.history = await inspect("history");
    const currentMonthLabel = await page.locator(".lc-checkin__month-nav strong").textContent();
    const currentCalendarDays = await page.locator("[data-history-date]").count();
    const nextMonthDisabled = await page.locator("[data-history-month='1']").isDisabled();
    await page.click("[data-history-month='-1']");
    const previousMonthLabel = await page.locator(".lc-checkin__month-nav strong").textContent();
    await page.click("[data-history-month='1']");
    const restoredMonthLabel = await page.locator(".lc-checkin__month-nav strong").textContent();
    results.calendar = {currentMonthLabel, previousMonthLabel, restoredMonthLabel, currentCalendarDays, nextMonthDisabled};
    await page.click("[data-action='back']");
    await openSurface("summary", "[data-action='summary']");
    results.summary = await inspect("summary");
    await page.click("[data-action='back']");
    await openSurface("occasions", "[data-action='occasions']");
    results.occasions = await inspect("occasions");
    await page.click("[data-action='back']");
    await page.locator("[data-item-id='stretch'] [data-action='insights']").evaluate((button) => button.click());
    results.insights = await inspect("insights");
    await page.click("[data-action='back']");
    await openSurface("archived", "[data-action='archived']");
    results.archived = await inspect("archived");
    await page.click("[data-action='back']");
    await openSurface("settings", "[data-action='settings']");
    results.settings = await inspect("settings");
    await page.click("[data-action='back']");
    await openSurface("add", "[data-action='add']");
    const initialValueFieldsHidden = await page.locator("[data-value-fields]").evaluate((element) => element.hidden);
    const initialWeekdaysHidden = await page.locator("[data-weekdays]").evaluate((element) => element.hidden);
    await page.check("input[name='kind'][value='duration']", {force: true});
    await page.locator("[data-advanced]").evaluate((element) => { element.open = true; });
    await page.selectOption("select[name='schedule']", "weekly");
    const valueFieldsVisible = await page.locator("[data-value-fields]").evaluate((element) => !element.hidden);
    const weekdaysVisible = await page.locator("[data-weekdays]").evaluate((element) => !element.hidden);
    results.editor = await inspect("editor");
    results.editorState = {initialValueFieldsHidden, initialWeekdaysHidden, valueFieldsVisible, weekdaysVisible};
    results.editorCatalog = await page.evaluate(() => ({
        templateCount: document.querySelectorAll("[data-template-index]").length,
        iconCount: document.querySelectorAll("[data-icon]").length,
        iconGroupCount: document.querySelectorAll("[data-icon-group]").length,
    }));
    const readingTemplate = page.locator("[data-template-index='6']");
    await readingTemplate.evaluate((element) => element.scrollIntoView({block: "nearest", inline: "nearest"}));
    await readingTemplate.evaluate((element) => element.click());
    await page.click("[data-icon-group='health']");
    await page.click("[data-unit='小时']");
    results.templateApplied = await page.evaluate(() => ({
        name: document.querySelector("input[name='name']")?.value,
        kind: document.querySelector("input[name='kind']:checked")?.value,
        unit: document.querySelector("input[name='unit']")?.value,
        group: document.querySelector("input[name='group']")?.value,
        iconPanel: document.querySelector("[data-icon-panel='health']")?.hidden === false,
        targetStep: document.querySelector("input[name='target']")?.getAttribute("step"),
    }));
    await page.click("[data-action='back']");
    await page.locator("[data-action='open-tab']").evaluate((button) => button.click());
    await page.waitForTimeout(30);
    results.tab = await page.evaluate(() => ({
        opened: Boolean(window.__openTabOptions),
        stableId: window.__openTabOptions?.custom?.id,
        title: window.__openTabOptions?.custom?.title,
        registered: Boolean(window.__tabOptions),
    }));
    await page.setViewportSize({width: 1180, height: 760});
    await page.evaluate(() => {
        document.querySelector("#frame").style.display = "none";
        const tabFrame = document.createElement("main");
        tabFrame.id = "tab-frame";
        tabFrame.style.cssText = "width:1140px;height:720px;border:1px solid #ddd";
        tabFrame.innerHTML = '<div id="tab" style="width:100%;height:100%"></div>';
        document.body.append(tabFrame);
        const context = {element: tabFrame.querySelector("#tab"), tab: {close() {}}};
        window.__qaTabContext = context;
        window.__tabOptions.init.call(context);
    });
    results.wideTab = await page.locator("#tab").evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        itemColumns: getComputedStyle(element.querySelector(".lc-checkin__group-items")).gridTemplateColumns,
    }));
    await page.screenshot({path: path.join(outputRoot, "wide-tab.png"), fullPage: true});
    await page.evaluate(() => {
        window.__tabOptions.destroy.call(window.__qaTabContext);
        document.querySelector("#tab-frame").remove();
        document.querySelector("#frame").style.display = "block";
    });
    await page.setViewportSize({width: narrowWidth, height: 700});
    await page.locator("#frame").evaluate((element) => {
        element.style.width = "300px";
        element.style.height = "660px";
    });
    results.narrow = await inspect("narrow-today");
    await openSurface("history", "[data-action='history']");
    results.narrowHistory = await inspect("narrow-history");
    await page.click("[data-action='back']");
    await openSurface("summary", "[data-action='summary']");
    results.narrowSummary = await inspect("narrow-summary");
    await page.click("[data-action='back']");
    await openSurface("add", "[data-action='add']");
    results.narrowEditor = await inspect("narrow-editor");
    await page.click("[data-action='back']");
    results.mobileMatrix = {};
    for (const width of [320, 360, 390, 430]) {
        await page.setViewportSize({width, height: 700});
        await page.locator("#frame").evaluate((element, frameWidth) => { element.style.width = `${frameWidth}px`; }, Math.max(300, width - 20));
        results.mobileMatrix[width] = await inspect(`mobile-${width}`);
        /* fullPage screenshots place position:fixed elements at the document
           bottom, so also capture the real viewport to verify the nav and FAB. */
        await page.screenshot({path: path.join(outputRoot, `viewport-${width}.png`)});
        results.mobileMatrix[width].nav = await page.evaluate(() => {
            const nav = document.querySelector(".lc-checkin__mobile-nav");
            if (!nav) return {found: false};
            const box = nav.getBoundingClientRect();
            return {found: true, display: getComputedStyle(nav).display, visible: box.height > 0 && box.bottom > innerHeight - 90};
        });
    }
    await openSurface("add", "[data-action='add']");
    await page.locator("[data-advanced]").evaluate((element) => { element.open = true; });
    await page.fill("input[name='name']", "双击提交验证");
    await page.fill("input[name='group']", "测试");
    await page.selectOption("select[name='priority']", "high");
    await page.selectOption("select[name='timeSlot']", "evening");
    await page.evaluate(() => {
        const form = document.querySelector("form");
        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
    });
    await page.waitForSelector("[data-mobile-nav='add']");
    results.savedFields = await page.evaluate(() => {
        const item = window.siyuanCheckin.getItems().find((candidate) => candidate.name === "双击提交验证");
        return {group: item?.group, priority: item?.priority, timeSlot: item?.timeSlot, sortOrder: item?.sortOrder};
    });
    results.draftPreservation = await page.evaluate(async () => {
        const api = window.siyuanCheckin;
        const draftItem = api.getItems().find((item) => item.name === "双击提交验证");
        document.querySelector(`[data-item-id='${draftItem.id}'] [data-action='edit']`).click();
        const form = document.querySelector("form");
        const nameInput = document.querySelector("input[name='name']");
        nameInput.value = "尚未保存的草稿";
        nameInput.dispatchEvent(new Event("input", {bubbles: true}));

        await api.recordEvent({itemId: "water", value: 1, unit: "杯", source: "api", externalRef: "draft-preservation"});
        const survivedExternalRecord = nameInput.isConnected && nameInput.value === "尚未保存的草稿";

        const disposeFocus = api.registerFocusAdapter({
            id: "draft-focus",
            name: "Draft Focus",
            canStart() { return false; },
            async start() {},
            async stop() {},
        });
        const disposeSummary = api.registerSummaryProvider({
            id: "draft-summary",
            name: "Draft Summary",
            async summarize() { return "draft"; },
        });
        const survivedAdapterRegistration = nameInput.isConnected && nameInput.value === "尚未保存的草稿";
        disposeFocus();
        disposeSummary();
        const survivedAdapterDisposal = nameInput.isConnected && nameInput.value === "尚未保存的草稿";

        const remoteItem = window.__store.items.find((item) => item.id === draftItem.id);
        remoteItem.icon = "★";
        remoteItem.updatedAt = new Date(Date.now() + 60_000).toISOString();
        await window.__plugin.onDataChanged();
        const survivedDataChanged = nameInput.isConnected && nameInput.value === "尚未保存的草稿";

        form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
        await new Promise((resolve, reject) => {
            const startedAt = Date.now();
            const poll = () => {
                if (document.querySelector("[data-action='add']") && !document.querySelector("form")) return resolve();
                if (Date.now() - startedAt > 2_000) return reject(new Error("draft conflict submit did not finish"));
                setTimeout(poll, 10);
            };
            poll();
        });
        return {
            survivedExternalRecord,
            survivedAdapterRegistration,
            survivedAdapterDisposal,
            survivedDataChanged,
            remoteEditPreserved: api.getItems().find((item) => item.id === draftItem.id)?.icon === "★",
            conflictReported: (window.__messages || []).some((message) => message.includes("其他窗口更新")),
        };
    });
    await page.evaluate(() => {
        const button = document.querySelector("[data-item-id='stretch'] [data-action='record']");
        button.click();
        button.click();
    });
    await page.waitForFunction(() => !window.siyuanCheckin.getEvents().some((event) => event.itemId === "stretch"));
    await page.waitForFunction(() => {
        const item = document.querySelector("[data-item-id='stretch']");
        return item && !item.classList.contains("is-complete");
    });
    await page.evaluate(() => {
        const button = document.querySelector("[data-item-id='stretch'] [data-action='record']");
        button.click();
        button.click();
    });
    await page.waitForTimeout(500);
    results.binaryDoubleToggleCount = await page.evaluate(() => window.siyuanCheckin.getEvents().filter((event) => event.itemId === "stretch").length);
    results.api = await page.evaluate(async () => {
        const api = window.siyuanCheckin;
        const readyBefore = window.__readyBefore;
        const readyResult = window.__readyResult;
        const readyAfter = window.__readyAfter;
        const externalItem = api.getItems().find((item) => item.id === "reading");
        externalItem.revisions[0].target = 999;
        externalItem.archivePeriods.push({startDate: "2026-01-01"});
        const freshItem = api.getItems().find((item) => item.id === "reading");
        const nestedItemIsolated = freshItem.revisions[0].target !== 999 && freshItem.archivePeriods.length === 0;
        const duplicateFormItems = api.getItems().filter((item) => item.name === "双击提交验证").length;
        const initialEvents = api.getEvents().length;
        const [first, duplicate] = await Promise.all([
            api.recordEvent({itemId: "water", value: 1, unit: "杯", source: "tomato", externalRef: "qa-session"}),
            api.recordEvent({itemId: "water", value: 99, unit: "杯", source: "tomato", externalRef: "qa-session"}),
        ]);
        first.value = 999;
        const returnedEventIsolated = api.getEvents().find((event) => event.id === first.id)?.value === 1;
        const invalid = await api.recordEvent({itemId: "water", value: Number.NaN});
        const coercedInputs = await Promise.all([
            api.recordEvent({itemId: "water", value: null}),
            api.recordEvent({itemId: "water", value: ""}),
            api.recordEvent({itemId: "water", value: true}),
        ]);
        const mismatchedUnit = await api.recordEvent({itemId: "water", value: 500, unit: "毫升"});
        const afterEvents = api.getEvents().length;
        const mutableInput = {itemId: "water", value: 1, unit: "杯", source: "api", externalRef: "snapshot-original"};
        const mutablePromise = api.recordEvent(mutableInput);
        mutableInput.value = 99;
        mutableInput.externalRef = "snapshot-mutated";
        const mutableEvent = await mutablePromise;
        const inputSnapshotStable = mutableEvent?.value === 1 && mutableEvent?.externalRef === "snapshot-original";
        const invalidArchive = await api.setItemArchived("water", "false");
        const archived = await api.setItemArchived("water", true);
        const appearsArchived = api.getArchivedItems().some((item) => item.id === "water");
        const hiddenAfterArchive = !document.querySelector("[data-item-id='water']");
        const restored = await api.setItemArchived("water", false);
        const visibleAfterRestore = Boolean(document.querySelector("[data-item-id='water']"));
        let summaryInput;
        const disposeSummary = api.registerSummaryProvider({
            id: "qa-summary",
            name: "QA Summary",
            async summarize(input) {
                summaryInput = input;
                return "本周记录稳定。";
            },
        });
        const summary = await api.summarize("week", "qa-summary");
        let invalidRangeRejected = false;
        try { api.getSummaryContext("year"); } catch { invalidRangeRejected = true; }
        const invalidSummaryRange = await api.summarize("year", "qa-summary");
        if (summaryInput.events[0]) summaryInput.events[0].value = 777;
        const summaryEventsIsolated = !api.getEvents().some((event) => event.value === 777);
        disposeSummary();
        let resolveOldSummary;
        let oldSummaryStarted = false;
        const disposeOldSummary = api.registerSummaryProvider({
            id: "replacement-summary",
            name: "Old Summary",
            summarize() {
                oldSummaryStarted = true;
                return new Promise((resolve) => { resolveOldSummary = resolve; });
            },
        });
        const oldSummaryPromise = api.summarize("week", "replacement-summary");
        await Promise.resolve();
        const disposeNewSummary = api.registerSummaryProvider({
            id: "replacement-summary",
            name: "New Summary",
            async summarize() { return "新总结已生效。"; },
        });
        resolveOldSummary("不应返回的旧总结。");
        const oldSummaryResult = await oldSummaryPromise;
        disposeOldSummary();
        const replacementSummaryResult = await api.summarize("week", "replacement-summary");
        disposeNewSummary();
        const disposeBrokenFocus = api.registerFocusAdapter({
            id: "broken-focus",
            name: "Broken",
            canStart() { throw new Error("probe"); },
            async start() {},
            async stop() {},
        });
        let started = false;
        let stopped = false;
        let startCount = 0;
        const disposeFocus = api.registerFocusAdapter({
            id: "qa-focus",
            name: "QA Focus",
            canStart(item) { const matches = item.id === "reading"; item.name = "被外部修改"; return matches; },
            async start(item) { started = true; startCount += 1; item.name = "再次被外部修改"; await new Promise((resolve) => setTimeout(resolve, 20)); },
            async stop() { stopped = true; },
        });
        const [focusStarted, concurrentFocusStarted] = await Promise.all([api.startFocus("reading"), api.startFocus("reading")]);
        const focusStopped = await api.stopFocus();
        const focusItemIsolated = api.getItems().find((item) => item.id === "reading")?.name === "深度阅读";
        disposeFocus();
        disposeBrokenFocus();
        let resolvePendingFocus;
        let pendingFocusStarted = false;
        let pendingFocusStopCount = 0;
        const disposePendingFocus = api.registerFocusAdapter({
            id: "pending-focus",
            name: "Pending Focus",
            canStart(item) { return item.id === "reading"; },
            start() {
                pendingFocusStarted = true;
                return new Promise((resolve) => { resolvePendingFocus = resolve; });
            },
            stop() { pendingFocusStopCount += 1; },
        });
        const pendingFocusPromise = api.startFocus("reading");
        await Promise.resolve();
        const archivedDuringPendingFocus = await api.setItemArchived("reading", true);
        resolvePendingFocus();
        const pendingFocusResult = await pendingFocusPromise;
        const restoredAfterPendingFocus = await api.setItemArchived("reading", false);
        disposePendingFocus();
        const PluginClass = window.__plugin.constructor;
        const secondPlugin = new PluginClass();
        secondPlugin.onload();
        const secondApi = window.siyuanCheckin;
        await secondPlugin.onLayoutReady();
        const secondArchivedWater = await secondApi.setItemArchived("water", true);
        const firstDomWasStaleBeforeNoop = Boolean(document.querySelector("[data-item-id='water']"));
        const firstArchiveNoop = await api.setItemArchived("water", true);
        const firstDomRefreshedAfterArchiveNoop = !document.querySelector("[data-item-id='water']");
        const secondRestoredWater = await secondApi.setItemArchived("water", false);
        const firstRestoreNoop = await api.setItemArchived("water", false);
        const firstDomRefreshedAfterRestoreNoop = Boolean(document.querySelector("[data-item-id='water']"));
        await Promise.all([
            api.recordEvent({itemId: "reading", value: 1, unit: "分钟", source: "api", externalRef: "window-one"}),
            secondApi.recordEvent({itemId: "reading", value: 1, unit: "分钟", source: "api", externalRef: "window-two"}),
        ]);
        const crossInstanceWritesPreserved = ["window-one", "window-two"].every((ref) => window.__store.events.some((event) => event.externalRef === ref));
        const crossInstanceRefs = window.__store.events.filter((event) => event.externalRef?.startsWith("window-")).map((event) => event.externalRef);
        const localReconcileEvent = await api.recordEvent({itemId: "reading", value: 1, unit: "分钟", source: "api", externalRef: "reconcile-local"});
        window.__store.events = window.__store.events.filter((event) => event.externalRef !== "reconcile-local");
        window.__store.events.push({...localReconcileEvent, id: "qa-reconcile-remote", externalRef: "reconcile-remote"});
        await window.__plugin.onDataChanged();
        const dataChangedConverged = ["reconcile-local", "reconcile-remote"].every((ref) => window.__store.events.some((event) => event.externalRef === ref));
        const unloadProbePlugin = new PluginClass();
        unloadProbePlugin.onload();
        const unloadProbeApi = window.siyuanCheckin;
        await unloadProbePlugin.onLayoutReady();
        let throwingStopCount = 0;
        unloadProbeApi.registerFocusAdapter({
            id: "throwing-stop-focus",
            name: "Throwing Stop Focus",
            canStart(item) { return item.id === "reading"; },
            async start() {},
            stop() {
                throwingStopCount += 1;
                throw new Error("sync stop failure");
            },
        });
        const throwingStopFocusStarted = await unloadProbeApi.startFocus("reading");
        let throwingStopUnloadResolved = false;
        try {
            await unloadProbePlugin.onunload();
            throwingStopUnloadResolved = true;
        } catch {}
        await Promise.all([window.__plugin.onunload(), secondPlugin.onunload()]);
        const readyAfterUnload = api.isReady();
        const staleRecord = await api.recordEvent({itemId: "water", value: 1});
        return {
            readyBefore,
            readyResult,
            readyAfter,
            readyAfterUnload,
            staleRecordRejected: staleRecord === undefined,
            crossInstanceWritesPreserved,
            crossInstanceRefs,
            dataChangedConverged,
            nestedItemIsolated,
            initialEvents,
            afterEvents,
            duplicateFormItems,
            firstId: first?.id,
            duplicateId: duplicate?.id,
            returnedEventIsolated,
            invalidRejected: invalid === undefined,
            coercedInputsRejected: coercedInputs.every((value) => value === undefined),
            mismatchedUnitRejected: mismatchedUnit === undefined,
            inputSnapshotStable,
            invalidArchiveRejected: invalidArchive === false,
            archived,
            appearsArchived,
            hiddenAfterArchive,
            restored,
            visibleAfterRestore,
            summary,
            summaryHasContext: Boolean(summaryInput?.context?.startDate),
            summaryEventCount: summaryInput?.events?.length,
            summaryEventsIsolated,
            invalidRangeRejected,
            invalidSummaryRangeRejected: invalidSummaryRange === undefined,
            oldSummaryStarted,
            oldSummarySuppressed: oldSummaryResult === undefined,
            replacementSummaryResult,
            focusStarted,
            concurrentFocusRejected: concurrentFocusStarted === false,
            focusStopped,
            focusItemIsolated,
            startCount,
            started,
            stopped,
            pendingFocusStarted,
            archivedDuringPendingFocus,
            pendingFocusRejected: pendingFocusResult === false,
            pendingFocusStopCount,
            restoredAfterPendingFocus,
            secondArchivedWater,
            firstDomWasStaleBeforeNoop,
            firstArchiveNoop,
            firstDomRefreshedAfterArchiveNoop,
            secondRestoredWater,
            firstRestoreNoop,
            firstDomRefreshedAfterRestoreNoop,
            throwingStopFocusStarted,
            throwingStopCount,
            throwingStopUnloadResolved,
        };
    });
    results.pageErrors = pageErrors;

    for (const layout of [results.today, results.history, results.summary, results.occasions, results.insights, results.archived, results.settings, results.editor, results.narrow, results.narrowHistory, results.narrowSummary, results.narrowEditor]) {
        assert.equal(layout.scrollWidth, layout.clientWidth);
    }
    for (const width of [320, 360, 390, 430]) {
        assert.equal(results.mobileMatrix[width].scrollWidth, results.mobileMatrix[width].clientWidth);
    }
    assert.deepEqual(results.editorState, {initialValueFieldsHidden: true, initialWeekdaysHidden: true, valueFieldsVisible: true, weekdaysVisible: true});
    assert.equal(results.todayStructure.groupCount, 2);
    assert.equal(results.todayStructure.completedCount, 1);
    assert.equal(results.todayStructure.completedCollapsed, true);
    assert.deepEqual(results.groupModes, {timeGroupCount: 2, priorityGroupCount: 2, completedExpanded: 1});
    assert.ok(results.editorCatalog.templateCount >= 20);
    assert.ok(results.editorCatalog.iconCount >= 100);
    assert.equal(results.editorCatalog.iconGroupCount, 9);
    assert.deepEqual(results.templateApplied, {name: "阅读", kind: "duration", unit: "小时", group: "学习", iconPanel: true, targetStep: "0.25"});
    assert.equal(results.tab.opened && results.tab.registered && results.tab.title, "小驴打卡");
    assert.match(results.tab.stableId, /checkin$/);
    assert.equal(results.wideTab.scrollWidth, results.wideTab.clientWidth);
    assert.match(results.wideTab.itemColumns, /px .*px/);
    assert.notEqual(results.calendar.currentMonthLabel, results.calendar.previousMonthLabel);
    assert.equal(results.calendar.currentMonthLabel, results.calendar.restoredMonthLabel);
    assert.equal(results.calendar.nextMonthDisabled, true);
    assert.ok(results.calendar.currentCalendarDays >= 28 && results.calendar.currentCalendarDays <= 31);
    assert.equal(results.api.afterEvents, results.api.initialEvents + 1);
    assert.equal(results.api.readyBefore, false);
    assert.equal(results.api.readyResult && results.api.readyAfter, true);
    assert.equal(results.api.readyAfterUnload, false);
    assert.equal(results.api.staleRecordRejected, true);
    assert.equal(results.api.crossInstanceWritesPreserved, true, JSON.stringify(results.api.crossInstanceRefs));
    assert.equal(results.api.dataChangedConverged, true);
    assert.equal(results.api.nestedItemIsolated, true);
    assert.equal(results.api.duplicateFormItems, 1);
    assert.deepEqual(results.draftPreservation, {
        survivedExternalRecord: true,
        survivedAdapterRegistration: true,
        survivedAdapterDisposal: true,
        survivedDataChanged: true,
        remoteEditPreserved: true,
        conflictReported: true,
    });
    assert.deepEqual(results.savedFields, {group: "测试", priority: "high", timeSlot: "evening", sortOrder: 1});
    assert.equal(results.binaryDoubleToggleCount, 1);
    assert.equal(results.api.firstId, results.api.duplicateId);
    assert.equal(results.api.returnedEventIsolated, true);
    assert.equal(results.api.invalidRejected, true);
    assert.equal(results.api.coercedInputsRejected, true);
    assert.equal(results.api.mismatchedUnitRejected, true);
    assert.equal(results.api.inputSnapshotStable, true);
    assert.equal(results.api.invalidArchiveRejected, true);
    assert.equal(results.api.archived && results.api.appearsArchived && results.api.hiddenAfterArchive && results.api.restored && results.api.visibleAfterRestore, true);
    assert.equal(results.api.summary, "本周记录稳定。");
    assert.equal(results.api.summaryHasContext, true);
    assert.equal(results.api.summaryEventsIsolated, true);
    assert.equal(results.api.invalidRangeRejected && results.api.invalidSummaryRangeRejected, true);
    assert.equal(results.api.oldSummaryStarted && results.api.oldSummarySuppressed, true);
    assert.equal(results.api.replacementSummaryResult, "新总结已生效。");
    assert.equal(results.api.focusStarted && results.api.focusStopped && results.api.started && results.api.stopped, true);
    assert.equal(results.api.concurrentFocusRejected && results.api.startCount === 1, true);
    assert.equal(results.api.focusItemIsolated, true);
    assert.equal(results.api.pendingFocusStarted && results.api.archivedDuringPendingFocus && results.api.pendingFocusRejected, true);
    assert.equal(results.api.pendingFocusStopCount, 1);
    assert.equal(results.api.restoredAfterPendingFocus, true);
    assert.equal(results.api.secondArchivedWater && results.api.firstDomWasStaleBeforeNoop && results.api.firstArchiveNoop && results.api.firstDomRefreshedAfterArchiveNoop, true);
    assert.equal(results.api.secondRestoredWater && results.api.firstRestoreNoop && results.api.firstDomRefreshedAfterRestoreNoop, true);
    assert.equal(results.api.throwingStopFocusStarted && results.api.throwingStopUnloadResolved, true);
    assert.equal(results.api.throwingStopCount, 1);
    assert.deepEqual(pageErrors, []);

    fs.writeFileSync(path.join(outputRoot, "results.json"), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});


