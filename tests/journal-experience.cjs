const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        const page = await browser.newPage({viewport: {width: 360, height: 760}});
        const errors = [];
        page.on("pageerror", error => errors.push(error.message));
        await page.setContent('<main id="root"></main>');
        await page.evaluate(() => {
            window.modules = {};
            window.messages = [];
            window.require = name => {
                if (name === "../i18n") return {t: key => key};
                if (name === "../shared") return {escapeHtml: text => String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")};
                if (name === "siyuan") return {showMessage: message => messages.push(message), Dialog: class {
                    constructor(options) { this.element = document.createElement("div"); this.element.innerHTML = options.content; document.body.append(this.element); }
                    destroy() { this.element.remove(); }
                }};
                throw Error(name);
            };
        });
        for (const [name, file] of [["journal", "features/journal-templates.ts"], ["dialog", "render/journal-dialog.ts"], ["navigation", "render/settings-navigation.ts"]]) {
            const js = ts.transpileModule(fs.readFileSync(path.join(root, "src", file), "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
            await page.addScriptTag({content: `{const exports = {}; ${js}; window.modules[${JSON.stringify(name)}] = exports;}`});
        }
        const index = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
        const methods = index.slice(index.indexOf("    private async resolveJournalTarget("), index.indexOf("    private async openJournalEntry("));
        const hostSource = ts.transpileModule(`class JournalHost {${methods}}`, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
        await page.addScriptTag({content: `(() => {const t = key => key; const buildJournalLookupQuery = modules.journal.buildJournalLookupQuery; const currentCalendarDate = () => new Date(2026, 8, 26); const dateKey = () => "2026-09-26"; ${hostSource}; window.JournalHost = JournalHost;})();`});
        const outcomes = await page.evaluate(async () => {
            const host = new JournalHost();
            host.journalIntegrationPref = {mode: "doc", docId: "20260926120000-abcdef0"};
            host.kernelPost = async () => ({code: 0, data: [{id: "child-block", root_id: "document-root"}]});
            const blockTarget = await host.resolveJournalTarget();
            host.kernelPost = async url => url.includes("sql") ? {code: 0, data: url ? [{id: "existing"}] : []} : {code: -1};
            const failedUpdate = await host.writeJournalEntry({id: "test"}, "2026-09-26", "entry");
            const calls = [];
            host.kernelPost = async (url, payload) => {calls.push(url); return {code: -1};};
            const failedLookup = await host.writeJournalEntry({id: "test"}, "2026-09-26", "entry");
            host.journalIntegrationPref = {mode: "daily", notebookId: "selected-book"};
            host.listNotebooksForJournal = async () => [{id: "other-book"}, {id: "selected-book"}];
            const queries = [];
            let creates = 0;
            host.kernelPost = async (url, payload) => {
                if (url.includes("getNotebookConf")) return {code: 0, data: {conf: {dailyNoteSavePath: "/daily"}}};
                if (url.includes("renderSprig")) return {code: 0, data: "/daily"};
                if (url.includes("sql")) {queries.push(payload.stmt); return {code: 0, data: []};}
                if (url.includes("createDoc")) {creates++; return {code: 0, data: "new-doc"};}
            };
            await host.resolveJournalTarget(host.journalIntegrationPref, false);
            return {blockTarget, failedUpdate, failedLookup, calls, queries, creates};
        });
        assert.equal(outcomes.failedUpdate.ok, false, "nonzero kernel update code must fail");
        assert.equal(outcomes.blockTarget.docId, "document-root", "block IDs resolve to their owning document");
        assert.equal(outcomes.failedLookup.ok, false);
        assert.equal(outcomes.calls.length, 1, "failed lookup cannot append/create");
        assert.equal(outcomes.creates, 0, "opening the questionnaire does not create a daily note");
        assert.equal(outcomes.queries.length, 2);
        assert.ok(outcomes.queries.every(sql => sql.includes("box = 'selected-book'")), "both daily lookup strategies scope to the selected notebook");
        await page.evaluate(() => {
            window.submits = 0; window.persistFails = false; window.succeeds = false; window.draft = [];
            window.openForm = () => modules.dialog.openJournalDialogFor({
                template: {id: "test", icon: "", name: "Test", questions: [{text: "Answer", type: "text", required: true}]},
                integration: {mode: "doc", docId: "20260926120000-abcdef0", notebookId: ""}, notebooks: [], alreadyWritten: false, isMobileFrontend: true,
                draft, onDraft: answers => {window.draft = answers;},
                onPersistIntegration: async () => {if (persistFails) throw Error("disk");},
                onSubmit: async () => {window.submits++; return succeeds;},
            });
            openForm();
        });
        await page.locator('[data-journal-submit]').click();
        assert.equal(await page.locator('[data-journal-answer]').evaluate(el => el === document.activeElement && el.getAttribute("aria-invalid") === "true"), true);
        await page.locator('[data-journal-answer]').fill("Retain this answer");
        await page.evaluate(() => {window.persistFails = true;});
        await page.locator('[data-journal-submit]').click();
        assert.equal(await page.evaluate(() => submits), 0, "persistence failure prevents recording");
        assert.equal(await page.locator('[data-journal-answer]').inputValue(), "Retain this answer");
        await page.evaluate(() => {window.persistFails = false;});
        await page.locator('[data-journal-submit]').click();
        assert.equal(await page.locator('[data-journal-form]').count(), 1, "failed write leaves form open");
        await page.locator('[data-journal-cancel]').click();
        await page.evaluate(() => openForm());
        assert.equal(await page.locator('[data-journal-answer]').inputValue(), "Retain this answer", "reopen restores draft");
        await page.evaluate(() => {window.succeeds = true;});
        await page.locator('[data-journal-submit]').click();
        assert.equal(await page.locator('[data-journal-form]').count(), 0);
        assert.deepEqual(await page.evaluate(() => draft), []);
        await page.evaluate(() => {
            document.querySelector("#root").innerHTML = '<div data-journal-builder></div><textarea data-journal-custom></textarea>';
            modules.dialog.bindJournalBuilder(document.querySelector("#root"), {presets: [], parse: modules.journal.parseCustomJournalTemplatesText, serialize: modules.journal.serializeCustomJournalTemplatesText});
        });
        await page.locator('[data-builder-action="add-template"]').click();
        await page.locator('[data-builder-name]').fill("My journal");
        await page.locator('[data-builder-required]').check();
        await page.locator('[data-builder-action="add-question"]').click();
        await page.locator('[data-builder-text]').nth(1).fill("Second question");
        await page.locator('[data-builder-action="up"]').nth(1).click();
        const parsed = await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value));
        assert.equal(parsed.templates[0].questions[0].text, "Second question");
        assert.equal(parsed.templates[0].questions[1].required, true);
        assert.match(parsed.templates[0].id, /^custom-[a-z0-9]+-[a-z0-9]+$/);
        await page.locator('[data-builder-action="preview"]').click();
        assert.equal(await page.locator('[data-builder-preview] textarea').count(), 2);
        await page.locator('[data-builder-action="remove-template"]').click();
        await page.locator('[data-builder-action="undo"]').click();
        assert.equal(await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value).templates[0].id), parsed.templates[0].id, "undo preserves identity");
        await page.locator('[data-builder-action="remove-template"]').click();
        await page.locator('[data-builder-action="add-template"]').click();
        assert.notEqual(await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value).templates[0].id), parsed.templates[0].id, "new forms cannot inherit bindings of deleted forms");
        await page.evaluate(() => {
            document.querySelector("#root").innerHTML = '<div class="lc-checkin--settings"><input data-settings-search /><div data-settings-search-status></div><nav class="lc-checkin__settings-nav"><button data-settings-nav="a">A</button><button data-settings-nav="b">B</button></nav><section data-settings-group="a"><details><summary>Journal</summary>Notebook</details></section><section data-settings-group="b">Appearance</section></div>';
            window.cleanupNav = modules.navigation.bindSettingsNavigationFor(document.querySelector("#root"));
        });
        await page.locator('[data-settings-search]').fill("Notebook");
        assert.equal(await page.locator('[data-settings-group="b"]').isVisible(), false);
        assert.equal(await page.locator('details').evaluate(el => el.open), true);
        await page.locator('[data-settings-search]').fill("");
        assert.equal(await page.locator('[data-settings-group="b"]').isVisible(), true);
        assert.equal(await page.locator('details').evaluate(el => el.open), false);
        await page.evaluate(() => cleanupNav());
        assert.deepEqual(errors, []);
        console.log("Journal experience: required focus, failure/retry/drafts, builder roundtrip, settings search passed.");
    } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
