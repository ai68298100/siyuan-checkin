/* T-1654: search the production settings renderer/binder in a real DOM.
   CSS comes from the current build; behavior comes directly from source so the
   card-only regression cannot be hidden by a hand-built settings-row fixture. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require(process.env.CHECKIN_PLAYWRIGHT_MODULE || "playwright");

const projectRoot = path.join(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const artifactRoot = process.env.CHECKIN_SETTINGS_SEARCH_ARTIFACT_DIR || path.join(projectRoot, ".artifacts", "settings-search");

function sourceModules() {
    const modules = {};
    const visit = (filename) => {
        if (modules[filename]) return;
        const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
        modules[filename] = ts.transpileModule(source, {
            compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        }).outputText;
        for (const {fileName: name} of ts.preProcessFile(source).importedFiles) {
            if (!name.startsWith(".") || name.endsWith(".scss")) continue;
            const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(filename), name)) + ".ts";
            if (fs.existsSync(path.join(sourceRoot, dependency))) visit(dependency);
        }
    };
    visit("render/settings.ts");
    visit("render/settings-navigation.ts");
    return modules;
}

async function verifySettingsSearch() {
    fs.mkdirSync(artifactRoot, {recursive: true});
    const modules = sourceModules();
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const scenarios = [];
    try {
        for (const language of ["zh-CN", "en-US"]) {
            for (const width of [980, 390]) {
                const page = await browser.newPage({viewport: {width, height: 900}});
                const pageErrors = [];
                page.on("pageerror", error => pageErrors.push(error.message));
                await page.route("**/*", route => route.abort());
                await page.setContent('<main id="primary" style="height:880px"></main><main id="secondary" style="height:880px"></main>');
                await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
                await page.evaluate(({modules, language}) => {
                    const cache = new Map();
                    const load = filename => {
                        if (cache.has(filename)) return cache.get(filename).exports;
                        if (!modules[filename]) throw new Error(`Missing source module: ${filename}`);
                        const module = {exports: {}};
                        cache.set(filename, module);
                        const localRequire = name => {
                            if (!name.startsWith(".")) throw new Error(`Unexpected module: ${name}`);
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
                    const i18n = load("i18n.ts");
                    i18n.setPluginLanguage(language);
                    const renderer = load("render/settings.ts");
                    const navigation = load("render/settings-navigation.ts");
                    const ctx = {
                        store: {items: [], events: []}, auditEntries: [], snapshots: [], customIconLibrary: [],
                        agentCapability: {state: "pending", count: 0}, appearance: "light", pluginLanguage: language,
                        defaultOpenMode: "quick", quickEntryNlp: false, reducedMotion: true, hapticFeedback: true,
                        focusTimerProvider: "builtin", focusTimerAdapterCount: 0, focusTimerAdapterIds: [], focusTimerBusy: false,
                        palette: "lavender", avatar: "star", todayGroupMode: "none", todaySortMode: "manual",
                        completedCollapsed: false, weekStripVisible: true, dialogSizeMode: "auto", dialogScale: 90,
                        dialogFixedSize: {width: 1000, height: 760}, dialogHasCustomFrame: false, resolvedAppearanceValue: "light",
                        diaryReport: {enabled: false, docId: "20261006000001-diary01"},
                        summaryResident: {enabled: false, docId: "20261006000002-summary"},
                        healthInbox: {enabled: false, docId: "20261006000003-health1", metricBindings: []},
                        journalIntegration: {mode: "doc", notebookId: "journal-notebook-unique", docId: "20261006000004-journal"},
                        yeguifIntegration: {enabled: false, itemId: "", notebookId: "yeguif-selected-notebook-unique", mappings: []},
                        targetSummaries: new Map([
                            ["20261006000001-diary01", {name: "diary-name-unique", hpath: "/daily/diary-path-unique"}],
                            ["20261006000002-summary", {name: "summary-name-unique", hpath: "/daily/summary-path-unique"}],
                            ["20261006000003-health1", {name: "health-name-unique", hpath: "/daily/health-path-unique"}],
                        ]),
                    };
                    const sessions = [{query: "", activeIndex: 0, hadFocus: false}, {query: "", activeIndex: 0, hadFocus: false}];
                    const roots = [document.querySelector("#primary"), document.querySelector("#secondary")];
                    const cleanups = [];
                    const render = index => {
                        roots[index].innerHTML = renderer.renderSettingsView(ctx);
                        cleanups[index] = navigation.bindSettingsNavigationFor(roots[index], {reducedMotion: true, searchSession: sessions[index]});
                    };
                    roots.forEach((_, index) => render(index));
                    window.__settingsSearch = {ctx, roots, sessions, cleanups, render, t: i18n.t};
                }, {modules, language});

                const checks = await page.evaluate(() => {
                    const {roots, sessions, cleanups, render, t} = window.__settingsSearch;
                    const root = roots[0];
                    const search = root.querySelector("[data-settings-search]");
                    const status = root.querySelector("[data-settings-search-status]");
                    const checks = [];
                    const check = (name, passed, detail = {}) => checks.push({name, passed: Boolean(passed), ...detail});
                    const query = value => { search.value = value; search.dispatchEvent(new Event("input", {bubbles: true})); };
                    const key = value => search.dispatchEvent(new KeyboardEvent("keydown", {key: value, bubbles: true, cancelable: true}));
                    const card = point => root.querySelector(`[data-document-target-card="${point}"]`);
                    const visible = element => {
                        for (let current = element; current && current !== root; current = current.parentElement) {
                            if (current.hidden || (current.tagName === "DETAILS" && !current.open)) return false;
                        }
                        return true;
                    };
                    const expectCard = (point, name) => {
                        const target = card(point);
                        check(name, visible(target) && target.classList.contains("is-search-active"), {
                            groupHidden: target.closest("[data-settings-group]").hidden,
                            cardHidden: target.hidden, activeCard: target.classList.contains("is-search-active"),
                            status: status.textContent,
                        });
                        check(`${name}: nested summary/scope remain available`,
                            [...target.querySelectorAll(".lc-checkin__settings-row")].every(row => !row.hidden));
                    };
                    const initialPanels = [...root.querySelectorAll("details")].map(panel => [panel, panel.open]);
                    const initiallyHidden = root.querySelector("[data-diary-create]");
                    const initiallyHiddenRow = root.querySelector("[data-settings-group=\"about\"] .lc-checkin__settings-row");
                    initiallyHiddenRow.hidden = true;
                    check("the fixture has a pre-existing hidden create panel", initiallyHidden.hidden);

                    // Use real localized heading/help text absent from every legacy row.
                    // A short translated title can legitimately recur in another row.
                    const legacyRows = [...root.querySelectorAll("[data-settings-group] .lc-checkin__settings-row")];
                    const heading = [...root.querySelectorAll("[data-document-target-card] .lc-checkin__document-target-copy strong, [data-document-target-card] .lc-checkin__document-target-copy small")]
                        .find(element => !legacyRows.some(row => row.textContent.toLocaleLowerCase().includes(element.textContent.toLocaleLowerCase())));
                    check("card heading/help reproducer has no legacy-row matches", Boolean(heading), {query: heading?.textContent});
                    const headingPoint = heading?.closest("[data-document-target-card]").dataset.documentTargetCard || "journal";
                    query(heading?.textContent || t("journal.configTitle"));
                    expectCard(headingPoint, "card-only localized heading/help is searchable");
                    const outline = getComputedStyle(card(headingPoint));
                    check("active target card has a visible search outline", outline.outlineStyle !== "none" && parseFloat(outline.outlineWidth) >= 2,
                        {style: outline.outlineStyle, width: outline.outlineWidth});
                    key("Enter");
                    check("Enter on a card heading focuses its document chooser", document.activeElement === card(headingPoint).querySelector("[data-choice-search]"));

                    for (const point of ["diary", "summary", "health"]) {
                        for (const term of [`${point}-name-unique`, `${point}-path-unique`]) {
                            query(term);
                            expectCard(point, `${point} selected target ${term.includes("path") ? "path" : "name"} is searchable as one card`);
                        }
                    }
                    const idSelectors = {diary: "[data-diary-doc]", summary: "[data-summary-doc]", health: "[data-health-doc]", journal: "[data-journal-target-doc]"};
                    for (const [point, selector] of Object.entries(idSelectors)) {
                        const input = card(point).querySelector(selector);
                        input.value = `draft-current-${point}-id-unique`;
                        check(`${point} input-only reproducer has no legacy-row matches`, !legacyRows.some(row => row.textContent.includes(input.value)));
                        query(input.value);
                        expectCard(point, `${point} current target ID value is searchable`);
                        key("Enter");
                        check(`${point} ID match focuses that exact input`, document.activeElement === input);
                    }
                    query("yeguif-selected-notebook-unique");
                    expectCard("yeguif", "selected LifeLog notebook ID is searchable");
                    key("Enter");
                    check("notebook match focuses its chooser", document.activeElement === card("yeguif").querySelector("[data-choice-search]"));
                    query("journal-notebook-unique");
                    expectCard("journal", "current journal notebook ID is searchable");

                    // Transient candidate searches and credentials must not become searchable settings values.
                    const keyInput = root.querySelector("[data-weread-key]");
                    keyInput.value = "secret-key-value-unique";
                    query(keyInput.value);
                    check("credential values are excluded", [...root.querySelectorAll("[data-settings-group]")].every(group => group.hidden));
                    const choice = card("diary").querySelector("[data-choice-search]");
                    choice.value = "temporary-choice-query-unique";
                    query(choice.value);
                    check("temporary chooser text is excluded", card("diary").closest("[data-settings-group]").hidden);
                    const candidates = card("diary").querySelector("[data-choice-list]");
                    candidates.innerHTML = '<button role="option">unselected-candidate-unique</button>';
                    query("unselected-candidate-unique");
                    check("unselected candidates are excluded", card("diary").closest("[data-settings-group]").hidden);

                    query("draft-current-diary-id-unique");
                    search.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}));
                    search.value = "draft-current-health-id-unique";
                    search.dispatchEvent(new Event("input", {bubbles: true}));
                    key("ArrowDown"); key("Enter");
                    check("IME composition freezes the current match", card("diary").classList.contains("is-search-active") && card("health").hidden);
                    search.dispatchEvent(new CompositionEvent("compositionend", {bubbles: true}));
                    expectCard("health", "IME completion applies the committed query");

                    query("draft-current-");
                    const first = root.querySelector(".is-search-active");
                    key("ArrowDown");
                    const second = root.querySelector(".is-search-active");
                    check("ArrowDown advances between matching cards", first !== second && second?.hasAttribute("data-document-target-card"));
                    key("ArrowUp");
                    check("ArrowUp returns to the preceding matching card", root.querySelector(".is-search-active") === first);
                    key("ArrowUp");
                    check("ArrowUp wraps from the first card to the last", root.querySelector(".is-search-active") === card("health"));
                    key("ArrowDown");
                    check("ArrowDown wraps back to the first card", root.querySelector(".is-search-active") === first);
                    key("Escape");
                    check("Escape clears query, status and every active highlight", search.value === "" && status.textContent === "" && !root.querySelector(".is-search-active"));
                    check("clear restores every panel expansion state", initialPanels.every(([panel, open]) => panel.open === open));
                    check("clear preserves the initially hidden create panel", initiallyHidden.hidden);
                    check("clear restores a pre-existing hidden settings row", initiallyHiddenRow.hidden);
                    check("clear restores all target cards", [...root.querySelectorAll("[data-document-target-card]")].every(target => !target.hidden));

                    // A settings rerender replaces DOM; the root-owned session restores only its own surface.
                    query("diary-path-unique");
                    search.focus();
                    cleanups[0]();
                    render(0);
                    const restoredSearch = roots[0].querySelector("[data-settings-search]");
                    check("rerender restores this root query and focus", restoredSearch.value === "diary-path-unique" && document.activeElement === restoredSearch && sessions[0].query === "diary-path-unique");
                    check("a second root keeps an independent empty search session", roots[1].querySelector("[data-settings-search]").value === "" && sessions[1].query === "" && [...roots[1].querySelectorAll("[data-settings-group]")].every(group => !group.hidden));
                    const secondSearch = roots[1].querySelector("[data-settings-search]");
                    secondSearch.value = "summary-path-unique";
                    secondSearch.dispatchEvent(new Event("input", {bubbles: true}));
                    check("both roots keep independent nonempty search sessions", restoredSearch.value === "diary-path-unique" && sessions[0].query === "diary-path-unique" && sessions[1].query === "summary-path-unique" && roots[0].querySelector(".is-search-active")?.dataset.documentTargetCard === "diary" && roots[1].querySelector(".is-search-active")?.dataset.documentTargetCard === "summary");
                    restoredSearch.value = "";
                    restoredSearch.dispatchEvent(new Event("input", {bubbles: true}));
                    check("clearing one root preserves the other root's query and match", !roots[0].querySelector(".is-search-active") && secondSearch.value === "summary-path-unique" && roots[1].querySelector(".is-search-active")?.dataset.documentTargetCard === "summary");
                    cleanups.forEach(cleanup => cleanup());
                    return checks;
                });
                scenarios.push({language, width, pageErrors, checks});
                await page.screenshot({path: path.join(artifactRoot, `${language}-${width}.png`), fullPage: true});
                await page.close();
            }
        }
        fs.writeFileSync(path.join(artifactRoot, "results.json"), JSON.stringify({scenarios}, null, 2));
        const failures = scenarios.flatMap(scenario => [
            ...scenario.pageErrors.map(error => `${scenario.language}/${scenario.width}: browser error ${error}`),
            ...scenario.checks.filter(check => !check.passed).map(check => `${scenario.language}/${scenario.width}: ${check.name}`),
        ]);
        assert.deepEqual(failures, [], "production settings search acceptance failed");
        console.log(`settings-search-browser: ${scenarios.length} locale/width scenarios; ${scenarios.reduce((sum, scenario) => sum + scenario.checks.length, 0)} checks passed`);
    } finally {
        await browser.close();
    }
}

verifySettingsSearch().catch(error => { console.error(error); process.exitCode = 1; });
