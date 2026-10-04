const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require(process.env.CHECKIN_PLAYWRIGHT_MODULE || "playwright");

const projectRoot = path.join(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const hostileText = '\"><img data-hostile-canary="1" src=x onerror="window.__hostileExecuted=1"><script>window.__hostileExecuted=2</script> & \'\n中文 ' + "long-text-".repeat(32);

async function verifyHostileContent() {
    const modules = {};
    for (const entry of fs.readdirSync(sourceRoot, {recursive: true})) {
        if (!entry.endsWith(".ts") || entry.endsWith(".d.ts")) continue;
        modules[entry.replace(/\\/g, "/")] = ts.transpileModule(fs.readFileSync(path.join(sourceRoot, entry), "utf8"), {
            compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        }).outputText;
    }
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    let scenarios = 0;
    try {
        for (const frontend of ["desktop", "mobile"]) {
            for (const language of ["zh-CN", "en-US"]) {
                const context = await browser.newContext({viewport: {width: 980, height: 900}, timezoneId: "Asia/Shanghai"});
                const page = await context.newPage();
                const pageErrors = [];
                page.on("pageerror", (error) => pageErrors.push(error.message));
                await page.route("**/*", (route) => route.abort());
                await page.setContent('<main id="frame"><div id="surface" style="width:100%;height:850px"></div></main>');
                await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
                await page.evaluate(async ({modules, hostileText, frontend, language}) => {
                    const now = new Date();
                    const localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
                    const createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 20, 12).toISOString();
                    window.__hostileText = hostileText;
                    window.__hostileExecuted = 0;
                    window.__messages = [];
                    window.__confirmations = [];
                    window.confirm = (message) => { window.__confirmations.push(String(message)); return false; };
                    window.__storage = {};
                    window.siyuan = {config: {appearance: {mode: 0}, lang: language, system: {appDir: "", os: "windows"}}};
                    const hostApi = {
                        Plugin: class {
                            addIcons() {} addTopBar() {} addCommand() {} addTab() {}
                            addDock(options) { window.__dockOptions = options; }
                            async loadData(name) { return window.__storage[name] === undefined ? "" : structuredClone(window.__storage[name]); }
                            async saveData(name, value) { window.__storage[name] = structuredClone(value); }
                        },
                        getFrontend: () => frontend,
                        openTab: async () => ({close() {}}),
                        showMessage(message) { window.__messages.push(String(message)); },
                        fetchSyncPost: async (url) => url.includes("lsNotebooks")
                            ? {code: 0, data: {notebooks: [{id: "notebook", name: hostileText}]}}
                            : {code: 0, data: []},
                        Dialog: class {
                            constructor(options) {
                                this.options = options;
                                this.element = document.createElement("div");
                                this.element.innerHTML = `<div class="b3-dialog__container"><div class="b3-dialog__header">${options.title || ""}</div><div class="b3-dialog__body">${options.content}</div></div>`;
                                this.element.querySelector(".b3-dialog__container").style.width = options.width || "100%";
                                document.body.append(this.element);
                                window.__dialogs = [...(window.__dialogs || []), this];
                            }
                            destroy() { this.element.remove(); this.options.destroyCallback?.(); }
                        },
                    };
                    const cache = new Map();
                    const load = (filename) => {
                        if (cache.has(filename)) return cache.get(filename).exports;
                        if (!modules[filename]) throw new Error(`Missing source module: ${filename}`);
                        const module = {exports: {}};
                        cache.set(filename, module);
                        const localRequire = (name) => {
                            if (name === "siyuan") return hostApi;
                            if (name.endsWith(".scss")) return {};
                            if (!name.startsWith(".")) throw new Error(`Unexpected external module: ${name}`);
                            const parts = filename.split("/").slice(0, -1);
                            for (const part of name.split("/")) {
                                if (part === "..") parts.pop();
                                else if (part !== ".") parts.push(part);
                            }
                            return load(parts.join("/") + ".ts");
                        };
                        new Function("require", "module", "exports", modules[filename])(localRequire, module, module.exports);
                        return module.exports;
                    };
                    const template = {id: "hostile-journal", name: hostileText, icon: "✓", period: "day", layout: "list", custom: true,
                        questions: [{text: hostileText, type: "text", required: false}, {text: hostileText, type: "textarea", required: false}]};
                    const model = load("model.ts");
                    window.__storage["checkin-store"] = model.normalizeStore({version: 3, items: [
                        {id: "active", name: hostileText, icon: "✓", kind: "quantity", target: 10, unit: hostileText, group: hostileText, schedule: {type: "daily"}, createdAt, journal: {templateId: template.id}},
                        {id: "manual", name: hostileText, icon: "✓", kind: "quantity", target: 10, unit: hostileText, group: hostileText, schedule: {type: "daily"}, createdAt},
                        {id: "archived", name: hostileText, icon: "✓", kind: "binary", target: 1, unit: hostileText, schedule: {type: "daily"}, createdAt, archived: true},
                    ], events: [{id: "event", itemId: "active", occurredAt: now.toISOString(), localDate, value: 1, unit: hostileText, source: "manual", note: hostileText,
                        attachment: "data:image/png;base64,iVBORw0KGgo="}], eventTombstones: []});
                    window.__storage["checkin-view-preferences"] = {pluginLanguage: language, quickEntryNlp: false};
                    window.__storage["checkin-user-templates"] = [{id: "personal", name: hostileText, icon: "✓", kind: "quantity", target: 10, unit: hostileText, group: hostileText, note: hostileText,
                        schedule: {type: "daily"}, priority: "medium", createdAt, updatedAt: createdAt}];
                    window.__storage["checkin-occasions"] = {version: 1, occasions: [{id: "occasion", name: hostileText, kind: "scheduled", date: localDate, recurrence: "once", remindBeforeDays: 0,
                        note: hostileText, enabled: true, completedDates: [], createdAt, updatedAt: createdAt}]};
                    const exported = load("index.ts");
                    const PluginClass = exported.default || exported;
                    const plugin = window.__plugin = new PluginClass();
                    plugin.onload();
                    window.__dockOptions.init.call({element: document.querySelector("#surface")});
                    await plugin.onLayoutReady();
                    await window.siyuanCheckin.whenReady();
                    plugin.userTemplates = [{id: "personal", name: hostileText, icon: "✓", kind: "quantity", target: 10, unit: hostileText, group: hostileText, note: hostileText,
                        schedule: {type: "daily"}, priority: "medium", createdAt, updatedAt: createdAt}];
                    plugin.occasionStore = {version: 1, occasions: [{id: "occasion", name: hostileText, kind: "scheduled", date: localDate, recurrence: "once", remindBeforeDays: 0,
                        note: hostileText, enabled: true, completedDates: [], createdAt, updatedAt: createdAt}]};
                    window.__journalModule = load("render/journal-dialog.ts");
                    window.__journalTemplate = template;
                    window.__localDate = localDate;
                    window.__language = load("i18n.ts").getPluginLocale();
                    window.__translate = load("i18n.ts").t;
                }, {modules, hostileText, frontend, language});
                assert.equal(await page.evaluate(() => window.__language), language, "the fixture must exercise the actual selected locale");
                for (const theme of ["light", "dark"]) {
                    for (const width of [320, 980]) {
                        await page.setViewportSize({width, height: 900});
                        for (const surface of ["today", "today-menu", "review", "archived", "archived-query", "editor", "templates", "occasions", "insights", "settings", "quick", "journal"]) {
                            const result = await page.evaluate(async ({surface, theme, width}) => {
                                const plugin = window.__plugin;
                                const root = document.querySelector("#surface");
                                plugin.closeQuickDialog();
                                (window.__dialogs || []).forEach((dialog) => dialog.destroy());
                                window.__dialogs = [];
                                plugin.appearance = theme;
                                document.querySelector("#frame").style.width = width + "px";
                                const item = plugin.store.items.find((entry) => entry.id === "active");
                                const translate = window.__translate;
                                const textChecks = [];
                                let scope = root;
                                if (surface === "today" || surface === "today-menu") plugin.showToday(root);
                                if (surface === "today-menu") {
                                    root.querySelector('.lc-checkin__item[data-item-id="active"]').dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, clientX: 12, clientY: 12}));
                                    textChecks.push({label: "menu text", actual: root.querySelector('[data-menu-action="edit"]')?.textContent, expected: translate("item.editAria", {name: item.name})});
                                }
                                if (surface === "review") {
                                    plugin.setReviewStateForRoot(root, {reviewWorkspace: "records", selectedHistoryDate: window.__localDate, historyScope: "day", historyQuery: ""});
                                    plugin.showReview(root);
                                }
                                if (surface === "archived") { plugin.setArchivedQueryForRoot(root, ""); plugin.showArchived(root); }
                                if (surface === "archived-query") {
                                    const query = window.__hostileText + "no-match";
                                    plugin.setArchivedQueryForRoot(root, query);
                                    plugin.showArchived(root);
                                    textChecks.push({label: "search field", actual: root.querySelector("[data-archived-search]")?.value, expected: query.replace(/[\r\n]/g, "")});
                                    textChecks.push({label: "empty search text", actual: root.querySelector(".lc-checkin__empty-description")?.textContent, expected: translate("archived.searchEmpty", {q: query.trim()})});
                                }
                                if (surface === "editor") plugin.showEditor(item, undefined, root);
                                if (surface === "templates") {
                                    plugin.showEditor(undefined, undefined, root);
                                    const templateButton = root.querySelector('[data-user-template-id="personal"]');
                                    textChecks.push({label: "template title", actual: templateButton?.getAttribute("title"), expected: window.__hostileText});
                                    textChecks.push({label: "template aria", actual: templateButton?.getAttribute("aria-label"), expected: translate("item.useMyTemplate", {name: window.__hostileText})});
                                    textChecks.push({label: "template data", actual: templateButton?.dataset.templateGroupValue, expected: window.__hostileText});
                                    root.querySelector('[data-user-template-delete="personal"]').click();
                                    textChecks.push({label: "cancelled confirmation", actual: window.__confirmations.at(-1), expected: translate("msg.templateDeleteConfirm", {name: window.__hostileText})});
                                }
                                if (surface === "occasions") plugin.showOccasions(root);
                                if (surface === "insights") plugin.showInsights(item, root);
                                if (surface === "settings") plugin.showSettings(root);
                                if (surface === "quick") { plugin.showToday(root); plugin.openQuickDialog(); scope = plugin.quickDialog.element; }
                                if (surface === "journal") {
                                    window.__journalModule.openJournalDialogFor({template: window.__journalTemplate, localDate: window.__localDate,
                                        integration: {mode: "doc", notebookId: "notebook", docId: window.__hostileText},
                                        notebooks: [{id: "notebook", name: window.__hostileText}], alreadyWritten: false,
                                        isMobileFrontend: plugin.isMobileFrontend, draft: [window.__hostileText, window.__hostileText],
                                        onPersistIntegration: async (integration) => integration, onSubmit: async () => false});
                                    scope = window.__dialogs[window.__dialogs.length - 1].element;
                                    textChecks.push({label: "journal header", actual: scope.querySelector(".b3-dialog__header")?.textContent, expected: `✓ ${translate("journal.dialogTitle")} · ${window.__hostileText}`});
                                }
                                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                                const unsafeAttributes = [...scope.querySelectorAll("*")].flatMap((element) => [...element.attributes]
                                    .filter((attribute) => /^on/i.test(attribute.name)).map((attribute) => ({tag: element.tagName, name: attribute.name, value: attribute.value})));
                                const unsafeImages = [...scope.querySelectorAll("img")].filter((image) => /^(?:javascript:|data:(?!image\/(?:png|jpeg|jpg|webp|gif);base64,))/i.test(image.getAttribute("src") || "")).length;
                                const evidence = {
                                    canaries: scope.querySelectorAll("[data-hostile-canary]").length,
                                    unsafeElements: scope.querySelectorAll("script,style,iframe,object,embed").length,
                                    unsafeAttributes,
                                    unsafeImages,
                                    textChecks,
                                    executed: window.__hostileExecuted,
                                    containsHostileText: scope.textContent.includes('<img data-hostile-canary="1"')
                                        || [...scope.querySelectorAll("input,textarea,select")].some((field) => field.value.includes('<img data-hostile-canary="1"')),
                                    appearance: scope.querySelector("[data-appearance]")?.dataset.appearance,
                                    page: plugin.pageForRoot(root),
                                    occasionCount: plugin.occasionStore.occasions.length,
                                    nameValue: surface === "editor" ? scope.querySelector('input[name="name"]')?.value : undefined,
                                    journalAnswer: surface === "journal" ? scope.querySelector("textarea[data-journal-answer]")?.value : undefined,
                                };
                                return evidence;
                            }, {surface, theme, width});
                            const label = `${frontend}/${language}/${theme}/${width}/${surface}`;
                            if (!["quick", "journal"].includes(surface)) assert.equal(result.page, surface === "templates" ? "editor" : surface.replace(/-(?:menu|query)$/, ""), `${label}: navigation must actually render the requested page`);
                            assert.equal(result.canaries, 0, `${label}: hostile content cannot add elements`);
                            assert.equal(result.unsafeElements, 0, `${label}: hostile content cannot add executable or embedded markup`);
                            assert.deepEqual(result.unsafeAttributes, [], `${label}: hostile content cannot create event attributes`);
                            assert.equal(result.unsafeImages, 0, `${label}: image protocols must pass the render boundary`);
                            assert.equal(result.executed, 0, `${label}: hostile content cannot execute`);
                            assert.equal(result.containsHostileText, true, `${label}: the fixture must render hostile data as text or a field value (${JSON.stringify(result)})`);
                            for (const check of result.textChecks) assert.equal(check.actual, check.expected, `${label}: ${check.label} must retain the complete plain text`);
                            if (result.appearance) assert.equal(result.appearance, theme, `${label}: the actual selected theme must render`);
                            if (surface === "editor") assert.equal(result.nameValue, hostileText.replace(/[\r\n]/g, ""), `${label}: the complete value follows native single-line input sanitization`);
                            if (surface === "journal") assert.equal(result.journalAnswer, hostileText, `${label}: drafts remain intact field values`);
                            scenarios += 1;
                        }
                    }
                }
                assert.deepEqual(pageErrors, [], `${frontend}/${language}: browser execution must stay free of errors`);
                await page.evaluate(() => window.__plugin.onunload());
                await context.close();
            }
        }
        console.log(`Hostile content browser checks passed: ${scenarios} scenarios across nine surfaces including menu/search/template states, desktop/mobile, both locales/themes and 320/980px.`);
    } finally {
        await browser.close();
    }
}

module.exports = {verifyHostileContent};

if (require.main === module) verifyHostileContent().catch((error) => { console.error(error); process.exitCode = 1; });
