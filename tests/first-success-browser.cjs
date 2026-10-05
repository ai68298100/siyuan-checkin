/* T-1646: production dist bundle + mocked SiYuan storage/lifecycle.
   Browser evidence for the existing onboarding -> template -> actual record -> review journey.
   This does not certify a real SiYuan client, Android keyboard, or TalkBack.
   Run after the root agent's coordinated build: node tests/first-success-browser.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require("playwright");
const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || path.resolve(__dirname, "..");
const artifacts = path.join(projectRoot, ".artifacts", "t1646-first-success");
fs.mkdirSync(artifacts, {recursive: true});
const compilerOptions = {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020};
const i18n = {};
new Function("exports", ts.transpileModule(fs.readFileSync(path.join(projectRoot, "src/i18n.ts"), "utf8"), {compilerOptions}).outputText)(i18n);
const catalog = {};
new Function("require", "exports", ts.transpileModule(fs.readFileSync(path.join(projectRoot, "src/catalog.ts"), "utf8"), {compilerOptions}).outputText)(name => {
    assert.equal(name, "./i18n");
    return i18n;
}, catalog);

async function boot(page, storage, theme) {
    await page.setContent('<style>body{margin:0}#dock{width:100%;height:760px}</style><div id="dock"></div>');
    await page.addStyleTag({path: path.join(projectRoot, "dist/index.css")});
    await page.evaluate(storage => {
        window.__storage = storage;
        window.__messages = [];
        window.__failMainWrite = false;
        window.__mainWrites = 0;
        window.__failPreferenceWrite = false;
        window.__preferenceWrites = 0;
        window.__confirm = true;
        window.module = {exports: {}};
        window.confirm = () => window.__confirm;
        window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
        window.fetch = async () => new Response(JSON.stringify({code: 0, data: []}), {headers: {"Content-Type": "application/json"}});
        window.require = name => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {
                Plugin: class {
                    addIcons() {} addTopBar() {} addCommand() {} addTab() {}
                    addDock(options) { window.__dockOptions = options; }
                    async loadData(bucket) { return structuredClone(window.__storage[bucket] ?? ""); }
                    async saveData(bucket, value) {
                        if (bucket === "checkin-store") {
                            if (window.__failMainWrite) throw new Error("T-1646 controlled storage failure");
                            window.__mainWrites++;
                        }
                        if (bucket === "checkin-view-preferences") {
                            if (window.__failPreferenceWrite) throw new Error("T-1643 controlled preference failure");
                            window.__preferenceWrites++;
                        }
                        window.__storage[bucket] = structuredClone(value);
                    }
                },
                getFrontend: () => "desktop", openTab: async () => ({close() {}}),
                showMessage(message) { window.__messages.push(String(message)); },
                fetchSyncPost: async () => ({code: 0, data: []}),
            };
        };
    }, storage);
    await page.addScriptTag({path: path.join(projectRoot, "dist/index.js")});
    await page.evaluate(async theme => {
        const Plugin = window.module.exports.default || window.module.exports;
        const plugin = window.__plugin = new Plugin();
        plugin.onload();
        const ready = window.siyuanCheckin.whenReady();
        window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await plugin.onLayoutReady();
        await ready;
        plugin.appearance = theme;
        plugin.showToday(plugin.dockElement);
    }, theme);
    await page.locator("#dock .lc-checkin--today").waitFor();
}

const storageFor = (language, theme, items = [], events = [], skipped = false) => ({
    "checkin-store": {version: 3, items, events},
    "checkin-view-preferences": {pluginLanguage: language, appearance: theme, reducedMotion: true,
        completedCollapsed: false, firstSuccess: {stage: "not-started", skipped}},
});
const report = {scope: "production bundle in Chromium, mocked desktop SiYuan host; no real Android/client claim", cases: []};

const viewKeys = ["groupMode", "sortMode", "completedCollapsed", "collapsedGroups", "reviewFold", "reviewFoldTouched",
    "lastInsightsItemId", "todayQuery", "pendingOnly", "showWeekStrip"];
const displayKeys = [...viewKeys, "appearance", "palette", "pluginLanguage", "reducedMotion", "hapticFeedback",
    "defaultOpenMode", "dialogSizeMode", "dialogScale", "dialogFixedSize", "dialogRect", "dialogOffset", "avatar", "avatarImage"];
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const preferenceSnapshot = page => page.evaluate(() => ({memory: window.__plugin.collectViewPreferences(),
    stored: structuredClone(window.__storage["checkin-view-preferences"]), store: structuredClone(window.__storage["checkin-store"])}));

async function verifyPreferenceResets(browser, page, scope, width, language, theme) {
    const outcomes = [];
    for (const [action, resetKeys] of [["reset-view-preferences", viewKeys], ["reset-all-preferences", displayKeys]]) {
        await page.evaluate(async ({language, theme}) => {
            const plugin = window.__plugin;
            const itemId = plugin.store.items.find(item => item.name === "T1646-duration").id;
            const prefs = {...plugin.collectViewPreferences(), groupMode: "group", sortMode: "priority", completedCollapsed: false,
                collapsedGroups: ["阅读"], reviewFold: ["report"], reviewFoldTouched: true, lastInsightsItemId: itemId,
                todayQuery: "T1646-duration", pendingOnly: true, showWeekStrip: true,
                appearance: theme, palette: "forest", reducedMotion: true, hapticFeedback: false, pluginLanguage: language,
                defaultOpenMode: "tab", dialogSizeMode: "fixed", dialogScale: 75, dialogFixedSize: {width: 800, height: 600},
                dialogRect: {width: 820, height: 620}, dialogOffset: {x: 70, y: -30}, avatar: "🐴",
                avatarImage: "data:image/png;base64,iVBORw0KGgo=", focusTimerProvider: "docktomato", quickEntryNlp: false,
                lastExportAt: "2026-10-06T04:00:00.000Z", reportSource: "manual",
                reportSections: {events: false, completion: true, items: false, baseline: false, highlights: true, deviations: false},
                diaryReport: {enabled: true, docId: "20260927090000-abcd123"}, summaryResident: {enabled: true, docId: "20260927090000-efgh456"},
                sireaderIntegration: {enabled: true, itemId, thresholdMinutes: 20}, siplayerIntegration: {enabled: true, itemId, thresholdMinutes: 15},
                wereadIntegration: {enabled: true, itemId, thresholdMinutes: 30, apiKey: "wrk-fixture-never-real", finishItemId: "", notesItemId: ""},
                yeguifIntegration: {enabled: true, itemId, notebookId: "notebook", mappings: [{project: "工作", itemId}]},
                reminderQuietHours: {enabled: true, start: "20:00", end: "09:00"}, dailyReminder: {enabled: false, slots: []}, occasionRemindOnce: true,
                savedViews: [{id: "view-1", name: "我的阅读", scope: {version: 1, range: {kind: "relative-days", days: 7}, itemIds: [itemId], groups: [], sources: ["manual"], status: "all"}}],
                recentTemplates: ["阅读"], weeklyReviewDrafts: [{weekKey: "2026-10-05", friction: "私密阻力", adjustment: "保留调整", updatedAt: "2026-10-06T04:00:00.000Z"}],
            };
            plugin.applyViewPreferences(prefs);
            await plugin.persistViewPreferences();
        }, {language, theme});
        await scope.locator('[data-mobile-nav="settings"]:visible').click();
        await scope.locator(`[data-action="${action}"]`).waitFor();
        const before = await preferenceSnapshot(page);
        assert.equal(before.memory.wereadIntegration.enabled, true, "fixture has an enabled valid source");
        assert.equal(before.memory.weeklyReviewDrafts.length, 1);
        const writesBefore = await page.evaluate(() => window.__preferenceWrites);

        await page.evaluate(() => { window.__confirm = false; });
        await scope.locator(`[data-action="${action}"]`).click();
        assert.deepEqual(await preferenceSnapshot(page), before, `${action}: cancellation changes no data`);
        assert.equal(await page.evaluate(() => window.__preferenceWrites), writesBefore);

        await page.evaluate(() => { window.__confirm = true; window.__failPreferenceWrite = true; window.__messages = []; });
        await scope.locator(`[data-action="${action}"]`).click();
        await page.waitForFunction(() => window.__messages.some(message => message === "界面偏好保存失败" || message === "Failed to save preferences"));
        assert.deepEqual(await preferenceSnapshot(page), before, `${action}: failed save restores the whole preference bucket`);

        await page.evaluate(() => { window.__failPreferenceWrite = false; });
        await scope.locator(`[data-action="${action}"]`).click();
        await page.waitForFunction(previousWrites => window.__preferenceWrites > previousWrites, writesBefore);
        const after = await preferenceSnapshot(page);
        assert.deepEqual(after.memory, after.stored, `${action}: visible state and saved values agree`);
        assert.deepEqual(after.store, before.store, `${action}: check-in facts stay intact`);
        assert.deepEqual(without(after.memory, resetKeys), without(before.memory, resetKeys), `${action}: all values outside the declared display scope stay intact`);
        assert.equal(after.memory.groupMode, "none");
        assert.equal(after.memory.todayQuery, "");
        assert.equal(after.memory.wereadIntegration.apiKey, "wrk-fixture-never-real");
        assert.equal(after.memory.weeklyReviewDrafts[0].friction, "私密阻力");
        if (action === "reset-all-preferences") {
            assert.equal(after.memory.palette, "lavender");
            assert.equal(after.memory.avatarImage, undefined);
            assert.equal(after.memory.pluginLanguage, "zh-CN");
        } else {
            assert.equal(after.memory.palette, "forest");
            assert.equal(after.memory.avatar, "🐴");
            assert.equal(after.memory.pluginLanguage, language);
        }
        const saved = await page.evaluate(() => structuredClone(window.__storage));
        const reloaded = await browser.newPage({viewport: {width, height: 900}});
        await boot(reloaded, saved, after.memory.appearance);
        const recovered = await preferenceSnapshot(reloaded);
        assert.deepEqual(recovered.memory, after.memory, `${action}: reboot preserves exactly the successful reset and retained data`);
        assert.deepEqual(recovered.store, before.store);
        await reloaded.close();
        outcomes.push({action, cancelNoWrite: true, failureRollback: true, retainedSourceKeyAndDraft: true, restartVerified: true});
    }
    return outcomes;
}

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        for (const language of ["zh-CN", "en-US"]) {
            i18n.setPluginLanguage(language);
            for (const theme of ["light", "dark"]) {
                for (const width of [320, 980]) {
                    const page = await browser.newPage({viewport: {width, height: 900}});
                    const errors = [];
                    page.on("pageerror", error => errors.push(error.message));
                    await boot(page, storageFor(language, theme), theme);
                    const scope = page.locator("#dock");
                    assert.equal(await scope.locator(".lc-checkin__onboard-steps").count(), 1);
                    const guidance = i18n.t("today.step3Desc", {checkin: i18n.t("item.checkin"),
                        entry: i18n.t("item.exactShort"), duration: i18n.t("item.manualShort")});
                    assert.ok((await scope.innerText()).includes(guidance));
                    if (width === 320) await page.screenshot({path: path.join(artifacts, `${language}-${theme}-guidance.png`)});

                    await scope.locator('[data-action="skip-onboard"]').click();
                    await page.waitForFunction(() => window.__storage["checkin-view-preferences"]?.firstSuccess?.skipped === true);
                    await scope.locator(".lc-checkin__onboard-steps").waitFor({state: "detached"});
                    assert.ok((await scope.innerText()).includes(i18n.t("today.emptyNewDesc")));
                    assert.equal(await scope.locator('main [data-action="archived"]').count(), 0);

                    /* Skipping is persisted: the same empty library stays quiet on another boot. */
                    const savedSkip = await page.evaluate(() => structuredClone(window.__storage));
                    const reloaded = await browser.newPage({viewport: {width, height: 900}});
                    await boot(reloaded, savedSkip, theme);
                    assert.equal(await reloaded.locator(".lc-checkin__onboard-steps").count(), 0);
                    assert.ok((await reloaded.locator("#dock").innerText()).includes(i18n.t("today.emptyNewDesc")));
                    await reloaded.close();

                    /* Leaving a new draft does not create a project or advance the journey. */
                    await scope.locator('[data-action="add"]:visible').first().click();
                    await scope.locator('input[name="name"]').fill("T-1646 cancelled draft");
                    await page.evaluate(() => window.__plugin.showToday(window.__plugin.dockElement));
                    await scope.locator(".lc-checkin--today").waitFor();
                    await page.waitForFunction(() => window.__plugin.pageForRoot(window.__plugin.dockElement) === "today");
                    assert.equal(await page.evaluate(() => window.__plugin.store.items.length), 0);

                    const records = [];
                    for (const [kind, templateName] of [["binary", "早餐"], ["count", "背单词"], ["quantity", "喝水"], ["duration", "阅读"]]) {
                        await page.evaluate(() => {
                            const root = document.querySelector("#dock");
                            const isVisible = candidate => {
                                const rect = candidate.getBoundingClientRect();
                                const style = getComputedStyle(candidate);
                                return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
                            };
                            const button = [...root.querySelectorAll("[data-action='add']")].find(isVisible)
                                || [...root.querySelectorAll("[data-mobile-nav='add']")].find(isVisible);
                            if (!(button instanceof HTMLElement)) throw new Error("no visible editor entry on the current Today surface");
                            button.click();
                        });
                        const disclosure = scope.locator("[data-template-disclosure]");
                        if (!await disclosure.evaluate(element => element.open)) await disclosure.locator("summary").click();
                        await scope.locator('[data-template-query]').fill(catalog.templateName({name: templateName}));
                        const templateIndex = catalog.CHECKIN_TEMPLATES.findIndex(item => item.name === templateName);
                        assert.ok(templateIndex >= 0, `${templateName} is a real catalog template`);
                        await scope.locator(`[data-template-list] [data-template-index="${templateIndex}"]`).click();
                        const itemName = `T1646-${kind}`;
                        await scope.locator('input[name="name"]').fill(itemName);
                        const submit = scope.locator('.lc-checkin__save-button[type="submit"]');
                        if (kind === "binary") {
                            await page.evaluate(() => { window.__failMainWrite = true; });
                            await submit.click();
                            await page.waitForFunction(() => window.__messages.some(message => message.includes("保存失败") || message.includes("Save failed")));
                            assert.equal(await page.evaluate(() => window.__plugin.store.items.length), 0);
                            assert.equal(await scope.locator('input[name="name"]').inputValue(), itemName);
                            assert.equal(await page.evaluate(() => window.__plugin.firstSuccessState.stage), "not-started");
                            await page.evaluate(() => { window.__failMainWrite = false; });
                        }
                        await submit.click();
                        await scope.locator(".lc-checkin--today").waitFor();
                        const itemId = await page.evaluate(itemName => window.__plugin.store.items.find(item => item.name === itemName)?.id, itemName);
                        assert.ok(itemId);
                        const card = scope.locator(`article[data-item-id="${itemId}"]`);
                        const expected = kind === "binary" ? 1 : kind === "duration" ? 3.5
                            : Number(await card.locator('[data-action="quick-record"]').first().getAttribute("data-amount"));
                        if (kind === "binary") {
                            await card.locator('button.lc-checkin__item-icon[data-action="toggle"]').click();
                        } else if (kind === "duration") {
                            assert.equal(await card.locator('button.lc-checkin__item-icon').count(), 0);
                            await card.locator('[data-action="toggle-exact"]').click();
                            await card.locator('input.lc-checkin__amount').fill(String(expected));
                            await card.locator('[data-exact-entry] [data-action="record"]').click();
                        } else {
                            assert.equal(await card.locator('button.lc-checkin__item-icon').count(), 0);
                            await card.locator('[data-action="quick-record"]').first().click();
                        }
                        await page.waitForFunction(itemId => window.__storage["checkin-store"]?.events?.some(event => event.itemId === itemId), itemId);
                        const actual = await page.evaluate(itemId => window.__storage["checkin-store"].events.filter(event => event.itemId === itemId), itemId);
                        assert.equal(actual.length, 1, "one record action writes one fact");
                        assert.equal(actual[0].value, expected);
                        await page.evaluate(() => window.__plugin.showReview(window.__plugin.dockElement));
                        await page.waitForFunction(() => window.__plugin.pageForRoot(window.__plugin.dockElement) === "review");
                        assert.equal(await page.evaluate(() => window.__plugin.firstSuccessState.stage), "review-visited");
                        records.push({kind, value: actual[0].value, events: actual.length});
                        await page.evaluate(() => window.__plugin.showToday(window.__plugin.dockElement));
                        await scope.locator(".lc-checkin--today").waitFor();
                    }
                    const resets = await verifyPreferenceResets(browser, page, scope, width, language, theme);
                    const overflow = await scope.evaluate(root => root.scrollWidth - root.clientWidth);
                    assert.ok(overflow <= 1, `journey fits ${width}px: overflow ${overflow}`);
                    assert.deepEqual(errors, []);
                    report.cases.push({language, theme, width, skippedRestart: true, cancelWithoutCreate: true,
                        saveFailureRetainedDraft: true, records, resets, overflow});
                    console.log(`T-1646 bundle journey passed: ${language}/${theme}/${width}px; skip/restart/cancel/save-failure + four actual record types + review.`);
                    await page.close();
                }
            }
        }
        fs.writeFileSync(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
