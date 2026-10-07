const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const artifactRoot = path.join(projectRoot, ".artifacts", "surface-session");

(async () => {
    fs.mkdirSync(artifactRoot, {recursive: true});
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        for (const theme of ["light", "dark"]) {
            for (const width of [320, 980]) {
                const page = await browser.newPage({viewport: {width: width * 2 + 20, height: 900}});
                const errors = [];
                page.on("pageerror", error => errors.push(error.message));
                await page.setContent(`<style>body{margin:0;display:flex;gap:20px}#dock,#secondary{width:${width}px;height:850px}</style><div id="dock"></div><div id="secondary"></div>`);
                await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
                await page.evaluate(() => {
                    const createdAt = new Date(Date.now() - 120 * 86400000).toISOString();
                    const items = [
                        {id: "water", name: "喝水", kind: "quantity", target: 2, unit: "杯", icon: "💧"},
                        {id: "stretch", name: "拉伸", kind: "duration", target: 10, unit: "分钟", icon: "🧘"},
                        ...Array.from({length: 8}, (_, index) => ({id: `extra-${index}`, name: `额外项目 ${index}`, kind: "binary", target: 1, unit: "次", icon: "✓"})),
                    ].map(item => ({...item, schedule: {type: "daily"}, createdAt}));
                    window.__buckets = new Map([["checkin-store", {version: 1, items, events: []}]]);
                    window.__buckets.set("checkin-occasions", {version: 1, occasions: [{id: "birthday", name: "生日提醒", kind: "birthday", date: "2026-12-20", recurrence: "annual", calendar: "solar", remindBeforeDays: 3, enabled: true, completedDates: []}]});
                    window.__messages = [];
                    window.module = {exports: {}};
                    window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
                    window.confirm = () => true;
                    window.fetch = async () => new Response(JSON.stringify({code: 0, data: []}), {headers: {"Content-Type": "application/json"}});
                    window.require = name => {
                        if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
                        return {
                            Plugin: class {
                                addIcons() {} addTopBar() {} addCommand() {}
                                addTab(options) { window.__tabOptions = options; }
                                addDock(options) { window.__dockOptions = options; }
                                async loadData(bucket) { return structuredClone(window.__buckets.get(bucket) ?? ""); }
                                async saveData(bucket, value) { window.__buckets.set(bucket, structuredClone(value)); }
                            },
                            getFrontend: () => "desktop", openTab: async () => ({close() {}}),
                            showMessage(message) { window.__messages.push(message); },
                        };
                    };
                });
                await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
                await page.evaluate(async theme => {
                    const Plugin = window.module.exports.default || window.module.exports;
                    const plugin = window.__plugin = new Plugin();
                    plugin.onload();
                    window.__dockOptions.init.call({element: document.querySelector("#dock")});
                    await plugin.onLayoutReady();
                    plugin.appearance = theme;
                    plugin.tabElement = document.querySelector("#secondary");
                    plugin.showToday(plugin.dockElement);
                    plugin.showReview(plugin.tabElement);
                    window.__nativePersist = plugin.persist.bind(plugin);
                    window.__gateNextSave = () => {
                        window.__saveStarted = false;
                        window.__persistCalls = 0;
                        plugin.persist = async () => {
                            window.__persistCalls += 1;
                            window.__saveStarted = true;
                            await new Promise((resolve, reject) => { window.__releaseSave = fail => fail ? reject(new Error("controlled persistence failure")) : resolve(); });
                            return window.__nativePersist();
                        };
                    };
                }, theme);
                const freshSurfaces = await page.evaluate(async () => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    const savedPreferences = plugin.collectViewPreferences();
                    const secondaryInsights = plugin.insightsStateForRoot(secondary);
                    plugin.applyViewPreferences({...savedPreferences, palette: "ocean", reviewFold: ["projects"], reviewFoldTouched: true, lastInsightsItemId: "stretch"});
                    await plugin.persistViewPreferences();
                    plugin.showSettings(primary);
                    const slots = primary.querySelector("[data-setting-reminder-slots]");
                    slots.value = "06:35";
                    slots.dispatchEvent(new Event("input", {bubbles: true}));
                    const settings = plugin.settingsStateForRoot(primary);
                    settings.sourceSandboxTexts.yeguif = "primary-only sandbox";
                    settings.searchSession.query = "primary-only settings query";
                    plugin.syncSettingsCompatibilityForRoot(primary);
                    plugin.setReviewStateForRoot(primary, {reviewWorkspace: "records", summaryRange: "month", summaryCustomRange: {startDate: "2026-01-01", endDate: "2026-02-01"}, historyQuery: "primary-only history", historyPage: 3, historyBatchSelected: new Set(["water"]), historyBatchValues: {water: "3"}, itemCompareSelection: new Set(["water", "stretch"]), itemCompareQuery: "primary-only compare"});
                    plugin.setInsightsStateForRoot(primary, {insightsItemId: "water", insightsRange: "custom", insightsCustomRange: {startDate: "2026-01-01", endDate: "2026-02-01"}, insightsItemQuery: "primary-only insight", insightsReturnPage: "review"});
                    plugin.setOccasionStateForRoot(primary, {editingOccasionId: "birthday", occasionSearchQuery: "primary-only occasion", formDraft: {values: {name: "primary-only draft"}}, submitting: true, deletingOccasionIds: new Set(["birthday"])});
                    plugin.setTodayQueryForRoot(primary, "primary-only today");
                    plugin.setArchivedQueryForRoot(primary, "primary-only archive");
                    plugin.showEditor(plugin.store.items.find(item => item.id === "water"), "review", primary);
                    primary.querySelector('input[name="name"]').value = "primary-only editor draft";
                    plugin.editorStateForRoot(primary).submitting = true;
                    const inspect = root => {
                        const context = plugin.rootContexts.get(root);
                        return {
                            page: context.page, todayQuery: context.todayQuery, archivedQuery: context.archivedQuery,
                            review: {workspace: context.review.reviewWorkspace, range: context.review.summaryRange, custom: context.review.summaryCustomRange, query: context.review.historyQuery, page: context.review.historyPage, selected: [...context.review.historyBatchSelected], batchValues: context.review.historyBatchValues, compare: [...context.review.itemCompareSelection], compareQuery: context.review.itemCompareQuery, refreshing: context.review.summarySession.refreshing, fold: [...context.review.reviewFoldSections], foldTouched: context.review.reviewFoldTouched},
                            insights: {item: context.insights.insightsItemId, range: context.insights.insightsRange, custom: context.insights.insightsCustomRange, query: context.insights.insightsItemQuery, returnTo: context.insights.insightsReturnPage},
                            editor: {id: context.editor.editingId, submitting: context.editor.submitting, draft: context.editor.draft, import: context.editor.templateImportSession},
                            settings: {drafts: [...context.settings.drafts], baselines: [...context.settings.savedBaselines], query: context.settings.searchSession.query, sandbox: context.settings.sourceSandboxTexts, import: context.settings.importConflictSession},
                            occasions: {id: context.occasions.editingOccasionId, query: context.occasions.occasionSearchQuery, draft: context.occasions.formDraft, submitting: context.occasions.submitting, deleting: [...context.occasions.deletingOccasionIds]},
                        };
                    };
                    const open = () => {
                        const root = document.createElement("div");
                        root.style.cssText = "width:400px;height:850px";
                        document.body.append(root);
                        // Observe registration before the host's explicit Today navigation.
                        plugin.ensureRootContext(root);
                        const initial = inspect(root);
                        const host = {element: root, tab: {close() {}}};
                        window.__tabOptions.init.call(host);
                        return {root, host, initial, rendered: root.querySelector(".lc-checkin").classList.contains("lc-checkin--today"), palette: root.querySelector(".lc-checkin").dataset.palette};
                    };
                    const close = surface => {
                        window.__tabOptions.destroy.call(surface.host);
                        surface.root.remove();
                        plugin.tabElement = secondary;
                    };
                    const first = open();
                    plugin.settingsStateForRoot(first.root).drafts.set("data-setting-reminder-slots", "19:55");
                    plugin.setTodayQueryForRoot(first.root, "closed-only query");
                    close(first);
                    const firstRemoved = !plugin.rootContexts.has(first.root);
                    const recreated = open();
                    const result = {first: first.initial, recreated: recreated.initial, firstRemoved, rendered: [first.rendered, recreated.rendered], palettes: [first.palette, recreated.palette], primary: {page: plugin.pageForRoot(primary), editorId: plugin.editorStateForRoot(primary).editingId, submitting: plugin.editorStateForRoot(primary).submitting, draft: primary.querySelector('input[name="name"]').value, occasionSubmitting: plugin.occasionStateForRoot(primary).submitting}};
                    close(recreated);
                    plugin.applyViewPreferences(savedPreferences);
                    plugin.forgetSurfaceRoot(primary);
                    window.__dockOptions.init.call({element: primary});
                    Object.assign(plugin.reviewStateForRoot(secondary), {reviewFoldSections: new Set(savedPreferences.reviewFold), reviewFoldTouched: savedPreferences.reviewFoldTouched});
                    Object.assign(secondaryInsights, {insightsItemId: savedPreferences.lastInsightsItemId});
                    plugin.showToday(secondary);
                    return result;
                });
                const freshState = {
                    page: "today", todayQuery: "", archivedQuery: "",
                    review: {workspace: "overview", range: "week", custom: undefined, query: "", page: 0, selected: [], batchValues: {}, compare: [], compareQuery: "", refreshing: false, fold: ["projects"], foldTouched: true},
                    insights: {item: "stretch", range: "84", custom: undefined, query: "", returnTo: "today"},
                    editor: {id: undefined, submitting: false, draft: undefined, import: undefined},
                    settings: {drafts: [], baselines: [], query: "", sandbox: {}, import: undefined},
                    occasions: {id: undefined, query: "", draft: undefined, submitting: false, deleting: []},
                };
                assert.deepEqual(freshSurfaces, {first: freshState, recreated: freshState, firstRemoved: true, rendered: [true, true], palettes: ["ocean", "ocean"], primary: {page: "editor", editorId: "water", submitting: true, draft: "primary-only editor draft", occasionSubmitting: true}}, "new and recreated host surfaces start with fresh transient state while retaining approved persisted view choices");
                assert.deepEqual(await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showEditor(plugin.store.items.find(item => item.id === "water"), "review");
                    const result = [plugin.dockElement, plugin.tabElement].map(root => ({page: plugin.pageForRoot(root), item: plugin.editorStateForRoot(root).editingId, returnTo: plugin.editorStateForRoot(root).editorReturnPage}));
                    plugin.showToday(plugin.dockElement);
                    plugin.showReview(plugin.tabElement);
                    return result;
                }), [{page: "editor", item: "water", returnTo: "review"}, {page: "editor", item: "water", returnTo: "review"}], "the legacy no-root editor entry still intentionally applies to both registered surfaces");
                const insights = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    plugin.showInsights(plugin.store.items.find(item => item.id === "water"), primary);
                    plugin.showInsights(plugin.store.items.find(item => item.id === "stretch"), secondary);
                    primary.querySelector('[data-insight-range="28"]').click();
                    secondary.querySelector('[data-insight-range="365"]').click();
                    const search = primary.querySelector("[data-insight-item-search]");
                    search.value = "额外";
                    search.dispatchEvent(new Event("input", {bubbles: true}));
                    plugin.render(primary);
                    plugin.render(secondary);
                    const read = root => ({item: root.querySelector("[data-insight-item]").value,
                        range: root.querySelector('[data-insight-range][aria-pressed="true"]').dataset.insightRange,
                        query: root.querySelector("[data-insight-item-search]").value,
                        returnTo: plugin.insightsStateForRoot(root).insightsReturnPage});
                    const isolated = {primary: read(primary), secondary: read(secondary)};
                    plugin.insightsRange = "84";
                    plugin.render();
                    const legacy = {primary: read(primary), secondary: read(secondary)};
                    primary.querySelector('[data-action="back"]').click();
                    secondary.querySelector('[data-action="back"]').click();
                    return {isolated, legacy, returns: [plugin.pageForRoot(primary), plugin.pageForRoot(secondary)]};
                });
                assert.deepEqual(insights, {
                    isolated: {primary: {item: "water", range: "28", query: "额外", returnTo: "today"}, secondary: {item: "stretch", range: "365", query: "", returnTo: "review"}},
                    legacy: {primary: {item: "water", range: "28", query: "额外", returnTo: "today"}, secondary: {item: "stretch", range: "84", query: "", returnTo: "review"}},
                    returns: ["today", "review"],
                });
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showInsights(plugin.store.items.find(item => item.id === "water"), plugin.dockElement);
                    plugin.showInsights(plugin.store.items.find(item => item.id === "stretch"), plugin.tabElement);
                });
                const primaryDay = page.locator("#dock [data-insight-day]").last();
                const primaryDayLabel = await primaryDay.getAttribute("aria-label");
                const primaryDayDate = await primaryDay.getAttribute("data-insight-day");
                assert.match(primaryDayLabel, new RegExp(primaryDayDate), "accessible day name contains the full date");
                assert.match(primaryDayLabel, /未完成|部分完成|已完成|未安排|未记录/, "accessible day name contains completion status");
                assert.match(primaryDayLabel, /点击查看当日记录/, "accessible day name explains record navigation");
                assert.equal(await page.locator("#dock").getByRole("button", {name: primaryDayLabel, exact: true}).count(), 1,
                    "the accessibility tree exposes a native day button by its complete name");
                await page.locator("#dock").getByRole("button", {name: primaryDayLabel, exact: true}).focus();
                await page.keyboard.press("Enter");
                assert.deepEqual(await page.evaluate(() => ({pages: [window.__plugin.pageForRoot(window.__plugin.dockElement), window.__plugin.pageForRoot(window.__plugin.tabElement)],
                    date: window.__plugin.reviewStateForRoot(window.__plugin.dockElement).selectedHistoryDate,
                    scope: window.__plugin.reviewStateForRoot(window.__plugin.dockElement).historyScope})),
                    {pages: ["review", "insights"], date: primaryDayDate, scope: "day"}, "Enter drills into only the triggering root's records");
                await page.evaluate(() => window.__plugin.showInsights(window.__plugin.store.items.find(item => item.id === "water"), window.__plugin.dockElement));
                const secondaryDay = page.locator("#secondary [data-insight-day]").last();
                const secondaryDayLabel = await secondaryDay.getAttribute("aria-label");
                const secondaryDayDate = await secondaryDay.getAttribute("data-insight-day");
                await page.locator("#secondary").getByRole("button", {name: secondaryDayLabel, exact: true}).focus();
                await page.keyboard.press("Space");
                assert.deepEqual(await page.evaluate(() => ({pages: [window.__plugin.pageForRoot(window.__plugin.dockElement), window.__plugin.pageForRoot(window.__plugin.tabElement)],
                    date: window.__plugin.reviewStateForRoot(window.__plugin.tabElement).selectedHistoryDate,
                    scope: window.__plugin.reviewStateForRoot(window.__plugin.tabElement).historyScope})),
                    {pages: ["insights", "review"], date: secondaryDayDate, scope: "day"}, "Space drills into only the triggering root's records");
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    for (const root of [plugin.dockElement, plugin.tabElement]) plugin.setReviewStateForRoot(root, {reviewWorkspace: "overview", historyScope: "period"});
                });
                const todaySessions = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    plugin.showToday(primary);
                    plugin.showToday(secondary);
                    secondary.querySelector('[data-item-id="water"] [data-action="toggle-exact"]')?.click();
                    plugin.todayStateForRoot(secondary).quickEntryCancelled.add("secondary-token");
                    plugin.todayStateForRoot(secondary).priorityReminderExpanded = true;
                    primary.querySelector('[data-action="toggle-bulk"]')?.click();
                    primary.querySelector('[data-bulk-check="water"]')?.click();
                    const read = root => ({
                        bulkMode: plugin.todayStateForRoot(root).bulkMode,
                        bulkSelected: [...plugin.todayStateForRoot(root).bulkSelected],
                        expandedExactEntries: [...plugin.todayStateForRoot(root).expandedExactEntries],
                        quickEntryCancelled: [...plugin.todayStateForRoot(root).quickEntryCancelled],
                        priorityReminderExpanded: plugin.todayStateForRoot(root).priorityReminderExpanded,
                        hasBulkCard: Boolean(root.querySelector('[data-bulk-check="water"]')),
                        exactExpanded: root.querySelector('[data-item-id="water"] [data-exact-entry]')?.hidden === false,
                    });
                    const result = {primary: read(primary), secondary: read(secondary)};
                    plugin.todayStateForRoot(primary).bulkMode = false;
                    plugin.todayStateForRoot(primary).bulkSelected.clear();
                    plugin.render(primary);
                    return result;
                });
                assert.deepEqual(todaySessions, {
                    primary: {bulkMode: true, bulkSelected: ["water"], expandedExactEntries: [], quickEntryCancelled: [], priorityReminderExpanded: false, hasBulkCard: true, exactExpanded: false},
                    secondary: {bulkMode: false, bulkSelected: [], expandedExactEntries: ["water"], quickEntryCancelled: ["secondary-token"], priorityReminderExpanded: true, hasBulkCard: false, exactExpanded: true},
                });
                const settings = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    plugin.showSettings(primary);
                    plugin.showSettings(secondary);
                    const primarySlots = primary.querySelector("[data-setting-reminder-slots]");
                    const secondarySlots = secondary.querySelector("[data-setting-reminder-slots]");
                    primary.querySelector('[data-source-panel="journal"]').open = true;
                    secondary.querySelector('[data-source-panel="yeguif"]').open = true;
                    primarySlots.value = "07:30";
                    primarySlots.dispatchEvent(new Event("input", {bubbles: true}));
                    secondarySlots.value = "22:15";
                    secondarySlots.dispatchEvent(new Event("input", {bubbles: true}));
                    const primarySandbox = primary.querySelector('[data-sandbox-text="yeguif"]');
                    const secondarySandbox = secondary.querySelector('[data-sandbox-text="health"]');
                    primarySandbox.value = "08:30 拉伸：主表面";
                    primarySandbox.dispatchEvent(new Event("input", {bubbles: true}));
                    secondarySandbox.value = "health:steps:2026-10-04 12";
                    secondarySandbox.dispatchEvent(new Event("input", {bubbles: true}));
                    plugin.runSourceSandbox("yeguif", plugin.settingsStateForRoot(primary).sourceSandboxTexts.yeguif, primary);
                    plugin.runSourceSandbox("health", plugin.settingsStateForRoot(secondary).sourceSandboxTexts.health, secondary);
                    plugin.render(primary);
                    plugin.render(secondary);
                    const read = root => ({slots: root.querySelector("[data-setting-reminder-slots]").value,
                        drafts: [...plugin.settingsStateForRoot(root).drafts.entries()],
                        openSourcePanels: [...plugin.settingsStateForRoot(root).openSourcePanels].sort(),
                        renderedPanels: [...root.querySelectorAll("[data-source-panel][open]")].map(panel => panel.dataset.sourcePanel).sort(),
                        sandboxText: plugin.settingsStateForRoot(root).sourceSandboxTexts,
                        sandboxSource: Object.values(plugin.settingsStateForRoot(root).sourceSandboxOutcomes)[0]?.source});
                    return {primary: read(primary), secondary: read(secondary)};
                });
                assert.deepEqual(settings, {
                    primary: {slots: "07:30", drafts: [["data-setting-reminder-slots", "07:30"]], openSourcePanels: ["journal"], renderedPanels: ["journal"], sandboxText: {yeguif: "08:30 拉伸：主表面"}, sandboxSource: "yeguif"},
                    secondary: {slots: "22:15", drafts: [["data-setting-reminder-slots", "22:15"]], openSourcePanels: ["yeguif"], renderedPanels: ["yeguif"], sandboxText: {health: "health:steps:2026-10-04 12"}, sandboxSource: "health"},
                });
                const settingsReturn = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    plugin.showToday(primary);
                    const secondaryBefore = [...secondary.querySelectorAll("[data-source-panel][open]")].map(panel => panel.dataset.sourcePanel).sort();
                    plugin.showSettings(primary);
                    const primaryAfter = [...primary.querySelectorAll("[data-source-panel][open]")].map(panel => panel.dataset.sourcePanel).sort();
                    plugin.showToday(secondary);
                    plugin.showSettings(secondary);
                    return {primaryAfter, secondaryBefore, secondaryAfter: [...secondary.querySelectorAll("[data-source-panel][open]")].map(panel => panel.dataset.sourcePanel).sort(), slots: [primary.querySelector("[data-setting-reminder-slots]").value, secondary.querySelector("[data-setting-reminder-slots]").value]};
                });
                assert.deepEqual(settingsReturn, {primaryAfter: ["journal"], secondaryBefore: ["yeguif"], secondaryAfter: ["yeguif"], slots: ["07:30", "22:15"]}, "Settings → Today → Settings preserves each root's own open panels and drafts");
                const projectDrafts = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    const base = {icon: "✓", kind: "binary", target: 1, unit: "次", group: "", priority: "medium", timeSlot: "any", note: "", schedule: {type: "daily"}};
                    plugin.projectDrafts = [
                        {...base, name: "主表面草案"},
                        {...base, name: "副表面草案"},
                    ];
                    plugin.showReview(primary);
                    plugin.showReview(secondary);
                    plugin.reviewStateForRoot(primary).reviewFoldSections.add("report");
                    plugin.reviewStateForRoot(secondary).reviewFoldSections.add("report");
                    plugin.render(primary);
                    plugin.render(secondary);
                    primary.querySelector('[data-action="edit-project-draft"][data-draft-index="0"]').click();
                    secondary.querySelector('[data-action="edit-project-draft"][data-draft-index="1"]').click();
                    const read = root => ({page: plugin.pageForRoot(root), name: root.querySelector('input[name="name"]')?.value,
                        pending: plugin.pendingProjectDraftForRoot(root)?.name});
                    const result = {primary: read(primary), secondary: read(secondary)};
                    plugin.showSettings(primary);
                    plugin.showSettings(secondary);
                    return result;
                });
                assert.deepEqual(projectDrafts, {
                    primary: {page: "editor", name: "主表面草案", pending: undefined},
                    secondary: {page: "editor", name: "副表面草案", pending: undefined},
                });
                    const templateImportSessions = await page.evaluate(() => {
                        const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                        const entry = name => ({id: `import-${name}`, name, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "", priority: "medium", timeSlot: "any", note: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()});
                        const session = name => ({fileName: `${name}.json`, decisions: [{index: 0, entry: entry(name), isNew: true, disposition: "import"}]});
                        plugin.showEditor(undefined, "review", primary);
                        plugin.showEditor(undefined, "review", secondary);
                        plugin.setTemplateImportSessionForRoot(primary, session("主模板"));
                        plugin.setTemplateImportSessionForRoot(secondary, session("副模板"));
                        plugin.render(primary);
                        plugin.render(secondary);
                        const read = root => ({file: plugin.templateImportSessionForRoot(root)?.fileName,
                            page: plugin.pageForRoot(root)});
                        const isolated = {primary: read(primary), secondary: read(secondary)};
                        plugin.setTemplateImportSessionForRoot(primary, undefined);
                        plugin.render(primary);
                        const result = {isolated, afterPrimaryClear: {primary: read(primary), secondary: read(secondary)}};
                        plugin.showReview(primary);
                        plugin.showSettings(secondary);
                        return result;
                    });
                    assert.deepEqual(templateImportSessions, {
                        isolated: {primary: {file: "主模板.json", page: "editor"}, secondary: {file: "副模板.json", page: "editor"}},
                        afterPrimaryClear: {primary: {file: undefined, page: "editor"}, secondary: {file: "副模板.json", page: "editor"}},
                    });
                assert.deepEqual(await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.dockElement.querySelector("[data-action='review']")?.click();
                    return [plugin.pageForRoot(plugin.dockElement), plugin.pageForRoot(plugin.tabElement)];
                }), ["review", "settings"]);
                const occasions = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    plugin.showOccasions(primary);
                    plugin.showOccasions(secondary);
                    /* T-1621：同一事项的改期草稿必须留在触发它的 root。
                       过滤/重绘后两个表面仍保留各自展开态和日期。 */
                    primary.querySelector('[data-occasion-move-toggle="birthday"]').click();
                    const primaryMoveDate = primary.querySelector('[data-occasion-move-date="birthday"]');
                    primaryMoveDate.value = "2026-12-25";
                    primaryMoveDate.dispatchEvent(new Event("change", {bubbles: true}));
                    secondary.querySelector('[data-occasion-move-toggle="birthday"]').click();
                    const secondaryMoveDate = secondary.querySelector('[data-occasion-move-date="birthday"]');
                    secondaryMoveDate.value = "2026-12-26";
                    secondaryMoveDate.dispatchEvent(new Event("change", {bubbles: true}));
                    plugin.render(primary);
                    plugin.render(secondary);
                    const readMove = root => ({
                        state: plugin.occasionStateForRoot(root).occurrenceMoves.birthday,
                        date: root.querySelector('[data-occasion-move-date="birthday"]').value,
                        open: root.querySelector('[data-occasion-move-row="birthday"]').hidden === false,
                    });
                    const moveSessions = {primary: readMove(primary), secondary: readMove(secondary)};
                    const firstSearch = primary.querySelector("[data-occasion-search]");
                    const secondSearch = secondary.querySelector("[data-occasion-search]");
                    firstSearch.value = "生日";
                    firstSearch.dispatchEvent(new Event("input", {bubbles: true}));
                    secondSearch.value = "不存在";
                    secondSearch.dispatchEvent(new Event("input", {bubbles: true}));
                    const primaryStatus = primary.querySelector('[data-occasion-filter="status"]');
                    primaryStatus.value = "enabled";
                    primaryStatus.dispatchEvent(new Event("change", {bubbles: true}));
                    const secondaryStatus = secondary.querySelector('[data-occasion-filter="status"]');
                    secondaryStatus.value = "disabled";
                    secondaryStatus.dispatchEvent(new Event("change", {bubbles: true}));
                    primary.querySelector('[data-occasion-template-category="birthday"]').click();
                    plugin.render(primary);
                    plugin.render(secondary);
                    const primaryName = primary.querySelector("[data-action='new-occasion']");
                    primaryName.click();
                    const primaryForm = primary.querySelector("[data-occasion-form]");
                    primaryForm.querySelector("[name='name']").value = "主表面草稿";
                    primaryForm.querySelector("[name='date']").value = "2026-12-21";
                    const secondaryForm = secondary.querySelector("[data-occasion-form]");
                    secondaryForm.querySelector("[name='name']").value = "副表面草稿";
                    secondaryForm.querySelector("[name='date']").value = "2026-12-22";
                    plugin.render(primary);
                    plugin.render(secondary);
                    const read = root => ({query: root.querySelector("[data-occasion-search]").value,
                        status: plugin.occasionStateForRoot(root).occasionStatusFilter,
                        category: plugin.occasionStateForRoot(root).occasionTemplateCategory,
                        name: root.querySelector("[data-occasion-form] [name='name']").value,
                        state: plugin.occasionStateForRoot(root).formDraft?.values.name,
                        page: plugin.pageForRoot(root),
                        list: root.querySelector("[name='remindBeforeDays']")?.getAttribute("list"),
                        datalist: root.querySelector("datalist")?.id});
                    return {primary: read(primary), secondary: read(secondary), ids: [primary.querySelector(".lc-checkin")?.dataset.occasionRootInstance, secondary.querySelector(".lc-checkin")?.dataset.occasionRootInstance], moveSessions};
                });
                assert.equal(occasions.primary.query, "生日");
                assert.equal(occasions.secondary.query, "不存在");
                assert.equal(occasions.primary.status, "enabled");
                assert.equal(occasions.secondary.status, "disabled");
                assert.equal(occasions.primary.category, "birthday");
                assert.equal(occasions.secondary.category, "recommended");
                assert.equal(occasions.primary.name, "主表面草稿");
                assert.equal(occasions.secondary.name, "副表面草稿");
                assert.equal(occasions.primary.list, occasions.primary.datalist);
                assert.equal(occasions.secondary.list, occasions.secondary.datalist);
                assert.notEqual(occasions.primary.list, occasions.secondary.list);
                assert.notEqual(occasions.ids[0], occasions.ids[1]);
                assert.deepEqual(occasions.moveSessions, {
                    primary: {state: {open: true, date: "2026-12-25"}, date: "2026-12-25", open: true},
                    secondary: {state: {open: true, date: "2026-12-26"}, date: "2026-12-26", open: true},
                });
                const conflictLifecycle = await page.evaluate(async () => {
                    const plugin = window.__plugin, primary = plugin.dockElement;
                    plugin.showSettings(primary);
                    const settings = plugin.settingsStateForRoot(primary);
                    settings.importConflictSession = {
                        format: "loop-csv",
                        loopPlan: {
                            habits: [{name: "额外项目 0", measurable: false, unit: "次", target: 1, archived: false, schedule: {type: "daily"}, scheduleDegraded: false}],
                            rows: [{name: "额外项目 0", date: "2026-10-08", value: 1, unit: "次", binary: true}],
                            measurableNames: [], skipDays: 0, unknownCells: 0, unmappableFrequency: [], unknownColumns: [],
                        },
                        decisions: [{name: "额外项目 0", sourceKind: "binary", sourceUnit: "次", dateCount: 1, existingId: "extra-0", existingKind: "binary", existingUnit: "次", mergeCompatible: true, disposition: "merge", createNewName: "额外项目 0 · 导入"}],
                    };
                    plugin.syncSettingsCompatibilityForRoot(primary);
                    plugin.render(primary);
                    const before = structuredClone(plugin.store);
                    const button = primary.querySelector("[data-import-conflict-confirm]");
                    window.__gateNextSave();
                    button.click();
                    await new Promise(resolve => setTimeout(resolve, 0));
                    const during = {disabled: button.disabled, busy: button.getAttribute("aria-busy"), calls: window.__persistCalls};
                    button.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}));
                    const duplicate = window.__persistCalls;
                    window.__releaseSave(true);
                    await plugin.mutationQueue;
                    await new Promise(resolve => setTimeout(resolve, 0));
                    const currentButton = primary.querySelector("[data-import-conflict-confirm]");
                    return {
                        during,
                        duplicate,
                        after: {disabled: currentButton.disabled, busy: currentButton.getAttribute("aria-busy"), focused: document.activeElement === currentButton, feedback: Boolean(primary.querySelector("[data-settings-feedback]"))},
                        rolledBack: JSON.stringify(plugin.store) === JSON.stringify(before),
                    };
                });
                assert.deepEqual(conflictLifecycle.during, {disabled: true, busy: "true", calls: 1}, "conflict confirmation exposes a single gated persistence while pending");
                assert.equal(conflictLifecycle.duplicate, 1, "a pending conflict confirmation ignores duplicate clicks");
                assert.deepEqual(conflictLifecycle.after, {disabled: false, busy: null, focused: true, feedback: true}, "conflict persistence failure restores retry state and focus");
                assert.equal(conflictLifecycle.rolledBack, true, "conflict persistence failure restores the pre-import store");
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showInsights(plugin.store.items.find(item => item.id === "water"), plugin.dockElement);
                    plugin.showEditor(plugin.store.items.find(item => item.id === "water"), "insights", plugin.dockElement);
                    plugin.showEditor(plugin.store.items.find(item => item.id === "stretch"), "review", plugin.tabElement);
                });
                await page.locator('#dock input[name="name"]').fill("喝水草稿");
                await page.locator('#secondary input[name="name"]').fill("拉伸草稿");
                const drafts = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    const field = primary.querySelector('input[name="name"]');
                    field.focus();
                    field.setSelectionRange(1, 3);
                    primary.querySelector("form details").open = true;
                    plugin.markTemplateApplied("primary template", primary);
                    plugin.markTemplateApplied("secondary template", secondary);
                    plugin.render(primary);
                    const focus = {name: document.activeElement.name, start: document.activeElement.selectionStart, end: document.activeElement.selectionEnd};
                    plugin.render(secondary);
                    const read = root => ({name: root.querySelector('input[name="name"]').value, item: plugin.editorStateForRoot(root).editingId,
                        returnTo: plugin.editorStateForRoot(root).editorReturnPage, template: plugin.editorStateForRoot(root).appliedTemplateNote});
                    return {primary: read(primary), secondary: read(secondary), focus, open: primary.querySelector("form details").open};
                });
                assert.deepEqual(drafts, {
                    primary: {name: "喝水草稿", item: "water", returnTo: "insights", template: "primary template"},
                    secondary: {name: "拉伸草稿", item: "stretch", returnTo: "review", template: "secondary template"},
                    focus: {name: "name", start: 1, end: 3}, open: true,
                });
                await page.evaluate(() => window.__gateNextSave());
                await page.locator("#dock form").evaluate(form => form.requestSubmit());
                await page.waitForFunction(() => window.__saveStarted);
                const freshDuringSave = await page.evaluate(() => {
                    const plugin = window.__plugin, primary = plugin.dockElement, secondary = plugin.tabElement;
                    const root = document.createElement("div");
                    root.style.cssText = "width:400px;height:850px";
                    document.body.append(root);
                    const host = {element: root, tab: {close() {}}};
                    window.__tabOptions.init.call(host);
                    const result = {page: plugin.pageForRoot(root), newSubmitting: plugin.editorStateForRoot(root).submitting,
                        newEditingId: plugin.editorStateForRoot(root).editingId, primarySubmitting: plugin.editorStateForRoot(primary).submitting,
                        primaryDraft: primary.querySelector('input[name="name"]').value};
                    window.__tabOptions.destroy.call(host);
                    root.remove();
                    plugin.tabElement = secondary;
                    return result;
                });
                assert.deepEqual(freshDuringSave, {page: "today", newSubmitting: false, newEditingId: undefined, primarySubmitting: true, primaryDraft: "喝水草稿"},
                    "a host tab opened during an actual gated editor save starts idle and leaves the submitting root intact");
                assert.equal(await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.render(plugin.dockElement);
                    const form = plugin.dockElement.querySelector("form");
                    form.requestSubmit();
                    return plugin.editorStateForRoot(plugin.dockElement).submitting && form.querySelector('button[type="submit"]').disabled;
                }), true);
                await page.evaluate(async () => { window.__releaseSave(true); await window.__plugin.mutationQueue; });
                await page.waitForFunction(() => !window.__plugin.editorStateForRoot(window.__plugin.dockElement).submitting);
                assert.deepEqual(await page.evaluate(() => ({pages: [window.__plugin.pageForRoot(window.__plugin.dockElement), window.__plugin.pageForRoot(window.__plugin.tabElement)],
                    draft: document.querySelector('#dock input[name="name"]').value,
                    persisted: window.__buckets.get("checkin-store").items.find(item => item.id === "water").name})), {pages: ["editor", "editor"], draft: "喝水草稿", persisted: "喝水"});
                await page.evaluate(() => { window.__plugin.persist = window.__nativePersist; });
                await page.locator("#dock form").evaluate(form => form.requestSubmit());
                await page.waitForFunction(() => window.__plugin.pageForRoot(window.__plugin.dockElement) === "insights");
                assert.deepEqual(await page.evaluate(() => ({saved: window.__buckets.get("checkin-store").items.find(item => item.id === "water").name,
                    otherDraft: document.querySelector('#secondary input[name="name"]').value,
                    otherId: window.__plugin.editorStateForRoot(window.__plugin.tabElement).editingId,
                    returnTo: window.__plugin.insightsStateForRoot(window.__plugin.dockElement).insightsReturnPage})), {saved: "喝水草稿", otherDraft: "拉伸草稿", otherId: "stretch", returnTo: "today"});
                await page.evaluate(() => window.__gateNextSave());
                await page.locator("#secondary form").evaluate(form => form.requestSubmit());
                await page.waitForFunction(() => window.__saveStarted);
                await page.evaluate(async () => {
                    const plugin = window.__plugin;
                    plugin.showEditor(plugin.store.items.find(item => item.id === "extra-0"), undefined, plugin.tabElement);
                    plugin.tabElement.querySelector('input[name="name"]').value = "替换会话草稿";
                    window.__releaseSave(false);
                    await plugin.mutationQueue;
                });
                assert.deepEqual(await page.evaluate(() => ({page: window.__plugin.pageForRoot(window.__plugin.tabElement),
                    item: window.__plugin.editorStateForRoot(window.__plugin.tabElement).editingId,
                    draft: document.querySelector('#secondary input[name="name"]').value,
                    saved: window.__buckets.get("checkin-store").items.find(item => item.id === "stretch").name})), {page: "editor", item: "extra-0", draft: "替换会话草稿", saved: "拉伸草稿"});
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.persist = window.__nativePersist;
                    const remote = window.__buckets.get("checkin-store");
                    const item = remote.items.find(entry => entry.id === "extra-0");
                    item.name = "另一窗口已修改";
                    item.updatedAt = new Date(Date.now() + 2000).toISOString();
                });
                await page.locator("#secondary form").evaluate(form => form.requestSubmit());
                await page.waitForFunction(() => !window.__plugin.editorStateForRoot(window.__plugin.tabElement).submitting);
                assert.deepEqual(await page.evaluate(() => ({page: window.__plugin.pageForRoot(window.__plugin.tabElement),
                    draft: document.querySelector('#secondary input[name="name"]').value,
                    saved: window.__buckets.get("checkin-store").items.find(item => item.id === "extra-0").name})), {page: "editor", draft: "替换会话草稿", saved: "另一窗口已修改"});
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showEditor(undefined, undefined, plugin.dockElement);
                    plugin.dockElement.querySelector('input[name="name"]').value = "保存并继续";
                    window.__gateNextSave();
                });
                await page.locator("#dock form").evaluate(form => form.requestSubmit(form.querySelector("[data-save-continue]")));
                await page.waitForFunction(() => window.__saveStarted);
                await page.evaluate(async () => { window.__releaseSave(false); await window.__plugin.mutationQueue; });
                await page.waitForFunction(() => document.querySelector('#dock input[name="name"]').value === "");
                assert.deepEqual(await page.evaluate(() => ({page: window.__plugin.pageForRoot(window.__plugin.dockElement),
                    otherDraft: document.querySelector('#secondary input[name="name"]').value,
                    created: window.__buckets.get("checkin-store").items.filter(item => item.name === "保存并继续").length})), {page: "editor", otherDraft: "替换会话草稿", created: 1});
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.dockElement.querySelector('input[name="name"]').value = "继续时的新输入";
                    window.__gateNextSave();
                });
                await page.locator("#dock form").evaluate(form => form.requestSubmit(form.querySelector("[data-save-continue]")));
                await page.waitForFunction(() => window.__saveStarted);
                await page.evaluate(async () => {
                    window.__plugin.dockElement.querySelector('input[name="name"]').value = "下一条草稿";
                    window.__releaseSave(false);
                    await window.__plugin.mutationQueue;
                });
                await page.waitForFunction(() => !window.__plugin.editorStateForRoot(window.__plugin.dockElement).submitting);
                assert.equal(await page.locator('#dock input[name="name"]').inputValue(), "下一条草稿");
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.persist = window.__nativePersist;
                    plugin.showEditor(plugin.store.items.find(item => item.id === "extra-0"), undefined, plugin.tabElement);
                    plugin.tabElement.querySelector('[data-action="archive"]').click();
                });
                await page.waitForFunction(() => window.__plugin.pageForRoot(window.__plugin.tabElement) === "today");
                assert.equal(await page.locator('#dock input[name="name"]').inputValue(), "下一条草稿");
                assert.equal(await page.evaluate(() => window.__buckets.get("checkin-store").items.find(item => item.id === "extra-0").archived), true);
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showEditor(plugin.store.items.find(item => item.id === "extra-1"), undefined, plugin.tabElement);
                    plugin.tabElement.querySelector('[data-action="delete-item"]').click();
                });
                await page.waitForFunction(() => window.__plugin.pageForRoot(window.__plugin.tabElement) === "today");
                assert.equal(await page.evaluate(() => window.__buckets.get("checkin-store").items.some(item => item.id === "extra-1")), false);
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.showEditor(plugin.store.items.find(item => item.id === "extra-2"), undefined, plugin.tabElement);
                    plugin.tabElement.querySelector('input[name="name"]').value = "剩余表面草稿";
                });
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.persist = window.__nativePersist;
                    plugin.showEditor(undefined, undefined, plugin.dockElement);
                    plugin.dockElement.querySelector('input[name="name"]').value = "保存后关闭";
                    window.__gateNextSave();
                });
                await page.locator("#dock form").evaluate(form => form.requestSubmit());
                await page.waitForFunction(() => window.__saveStarted);
                await page.evaluate(async () => {
                    const plugin = window.__plugin, root = plugin.dockElement;
                    plugin.dockElement = undefined;
                    plugin.forgetSurfaceRoot(root);
                    root.remove();
                    window.__closedRoot = root;
                    window.__releaseSave(false);
                    await plugin.mutationQueue;
                });
                assert.deepEqual(await page.evaluate(() => ({closed: window.__plugin.rootContexts.has(window.__closedRoot),
                    otherPage: window.__plugin.pageForRoot(window.__plugin.tabElement),
                    otherDraft: document.querySelector('#secondary input[name="name"]').value,
                    created: window.__buckets.get("checkin-store").items.filter(item => item.name === "保存后关闭").length})), {closed: false, otherPage: "editor", otherDraft: "剩余表面草稿", created: 1});
                fs.writeFileSync(path.join(artifactRoot, `${theme}-${width}.json`), JSON.stringify({theme, width, freshSurfaces, freshDuringSave, settingsReturn,
                    accessibleDayButtons: {primary: {date: primaryDayDate, label: primaryDayLabel, activation: "Enter"}, secondary: {date: secondaryDayDate, label: secondaryDayLabel, activation: "Space"}}, errors}, null, 2));
                assert.deepEqual(errors, [], `${theme}/${width}px has no unhandled browser errors`);
                assert.equal(await page.evaluate(async () => { await window.__plugin.onunload(); return window.__plugin.rootContexts.size; }), 0);
                await page.close();
            }
        }
        console.log("Surface sessions passed 4 production-bundle scenarios: fresh/recreated roots, legacy entry, Settings leave/return, accessible day buttons, Insights isolation/return, Editor drafts/focus, failed retry/conflict, continue, replacement/close, archive and delete.");
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
