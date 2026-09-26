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
        for (const [name, file] of [["bindings", "features/note-bindings.ts"], ["journal", "features/journal-templates.ts"], ["dialog", "render/journal-dialog.ts"], ["navigation", "render/settings-navigation.ts"]]) {
            const js = ts.transpileModule(fs.readFileSync(path.join(root, "src", file), "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
            await page.addScriptTag({content: `{const exports = {}; ${js}; window.modules[${JSON.stringify(name)}] = exports;}`});
        }
        const index = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");

        const bindingMethods = index.slice(index.indexOf("    private async readBindingBlocks("), index.indexOf("    private async listNotebooksForJournal("));
        const idValidator = fs.readFileSync(path.join(root, "src/features/note-anchor.ts"), "utf8").match(/export function validateAnchorBlockId[\s\S]*?\n}/)[0].replace("export ", "");
        const bindingHostSource = ts.transpileModule(`${idValidator}\nclass BindingHost {${bindingMethods}}`, {compilerOptions: {target: ts.ScriptTarget.ES2020}}).outputText;
        await page.addScriptTag({content: `(() => {const t = key => key; const resolveBindingDocument = modules.bindings.resolveBindingDocument; ${bindingHostSource}; window.BindingHost = BindingHost;})();`});
        const bindingChecks = await page.evaluate(async () => {
            const host = new BindingHost();
            const child = "20260926120000-abcdef0", doc = "20260926120000-abcdef1", book = "20260926120000-abcdef2";
            const calls = [];
            host.kernelPost = async (url, payload) => {
                calls.push({url, payload});
                return {code: 0, data: payload.stmt.includes(child) ? [{id: child, type: "p", root_id: doc}] : [{id: doc, type: "d", content: "My journal", hpath: "/Personal/My journal"}]};
            };
            const resolved = await host.validateBindingTarget("doc", child);
            const previous = {mode: "doc", docId: child, notebookId: ""};
            host.journalIntegrationPref = previous;
            host.saveJournalData = async () => {throw Error("disk");};
            let persistenceError;
            try { await host.saveJournalIntegration(previous); } catch (error) { persistenceError = error.message; }
            const rolledBack = host.journalIntegrationPref === previous;
            let writes = 0;
            host.saveJournalData = async () => {writes++;};
            const failures = [];
            for (const response of [{code: 0, data: []}, {code: -1, data: []}, {code: 0, data: null}, {code: 0, data: [{id: doc, type: "p"}]}]) {
                host.kernelPost = async () => response;
                try { await host.saveJournalIntegration({mode: "doc", docId: doc, notebookId: ""}); failures.push("accepted"); }
                catch (error) { failures.push(error.message); }
            }
            const notebookFailures = [];
            for (const response of [
                {code: 0, data: {notebooks: [{id: book, name: "closed", closed: true}]}},
                {code: 0, data: {notebooks: [{id: doc, name: "other", closed: false}]}},
                {code: -1, data: {notebooks: []}},
            ]) {
                host.kernelPost = async () => response;
                try { await host.saveJournalIntegration({mode: "daily", notebookId: book, docId: ""}); notebookFailures.push("accepted"); }
                catch (error) { notebookFailures.push(error.message); }
            }
            const rejectedWrites = writes;
            host.kernelPost = async () => ({code: 0, data: [{id: doc, type: "d", content: "Good"}]});
            await host.saveJournalIntegration({mode: "doc", docId: doc, notebookId: ""});
            let staleRejected = false;
            try { await host.saveJournalIntegration(previous, () => false); } catch {staleRejected = true;}
            return {resolved, calls, persistenceError, rolledBack, failures, notebookFailures, rejectedWrites, writes, staleRejected};
        });
        assert.equal(bindingChecks.resolved.id, "20260926120000-abcdef1");
        assert.equal(bindingChecks.resolved.name, "My journal");
        assert.equal(bindingChecks.persistenceError, "msg.prefSaveFail");
        assert.equal(bindingChecks.rolledBack, true);
        assert.deepEqual(bindingChecks.failures, ["bind.targetMissing", "bind.statusError", "bind.statusError", "bind.targetInvalid"]);
        assert.deepEqual(bindingChecks.notebookFailures, ["bind.notebookClosed", "bind.targetMissing", "bind.statusError"]);
        assert.equal(bindingChecks.rejectedWrites, 0, "failed validation cannot persist or create documents");
        assert.equal(bindingChecks.writes, 1);
        assert.equal(bindingChecks.staleRejected, true);
        assert.ok(bindingChecks.calls.every(call => call.url === "/api/query/sql"), "document validation is read-only");
        await page.evaluate(() => {
            const root = document.querySelector("#root");
            root.innerHTML = '<input data-target aria-label="Target" value="original" />';
            window.searchRequests = [];
            modules.dialog.bindDocumentTargetPickerFor(root.querySelector("[data-target]"), query => new Promise((resolve, reject) => searchRequests.push({query, resolve, reject})));
        });
        const picker = page.locator(".lc-checkin__document-picker");
        await picker.locator('input[type="search"]').fill("older");
        await page.waitForFunction(() => searchRequests.length === 1);
        await picker.locator('input[type="search"]').fill("newer");
        await page.waitForFunction(() => searchRequests.length === 2);
        await page.evaluate(() => searchRequests[1].resolve([{id: "new-doc", hPath: "/New journal"}]));
        await page.waitForFunction(() => document.querySelector(".lc-checkin__document-picker select").options.length === 2);
        await page.evaluate(() => searchRequests[0].resolve([{id: "old-doc", hPath: "/Old journal"}]));
        assert.equal(await picker.locator('option[value="old-doc"]').count(), 0, "late results cannot replace a newer query");
        await picker.locator("select").selectOption("new-doc");
        assert.equal(await page.locator("[data-target]").inputValue(), "new-doc");
        assert.equal(await page.locator("[data-target]").evaluate(el => el === document.activeElement), true);
        await picker.locator('input[type="search"]').fill("failure");
        await page.waitForFunction(() => searchRequests.length === 3);
        await page.evaluate(() => searchRequests[2].reject(Error("offline")));
        await picker.locator("button").waitFor({state: "visible"});
        assert.equal(await page.locator("[data-target]").inputValue(), "new-doc", "search failure preserves the configured ID");
        await picker.locator("button").click();
        await page.waitForFunction(() => searchRequests.length === 4);
        await page.locator("[data-target]").fill("manual");
        await page.evaluate(() => searchRequests[3].resolve([{id: "stale", hPath: "/Late"}]));
        assert.equal(await picker.locator("option").count(), 1, "manual edits invalidate outstanding searches");
        await picker.locator('input[type="search"]').fill("removed");
        await page.waitForFunction(() => searchRequests.length === 5);
        await page.evaluate(() => {document.querySelector("#root").replaceChildren(); searchRequests[4].reject(Error("detached"));});
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
                onPersistIntegration: async integration => {if (persistFails) throw Error("disk"); return {...integration, docId: "20260926120000-abcdef1"};},
                onSubmit: async (answers, integration) => {window.submittedTarget = integration.docId; window.submits++; return succeeds;},
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
        assert.equal(await page.evaluate(() => submittedTarget), "20260926120000-abcdef1", "submission uses the verified document root returned by persistence");
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
        await page.locator('[data-builder-action="duplicate-question"]').first().click();
        assert.equal(await page.locator('[data-builder-text]').count(), 3);
        await page.locator('[data-builder-action="down"]').first().click();
        await page.locator('[data-builder-text]').first().press("Control+ArrowDown");
        assert.equal(await page.locator('[data-builder-text]').nth(1).evaluate(el => el === document.activeElement), true, "keyboard move follows the moved question");
        const parsed = await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value));
        assert.equal(parsed.templates[0].questions[0].text, "Second question");
        assert.ok(parsed.templates[0].questions.some(question => question.required));
        assert.match(parsed.templates[0].id, /^custom-[a-z0-9]+-[a-z0-9]+$/);
        await page.locator('[data-builder-action="preview"]').click();
        assert.equal(await page.locator('[data-builder-preview] textarea').count(), 3);
        await page.locator('[data-builder-action="remove-template"]').click();
        await page.locator('[data-builder-action="undo"]').click();
        assert.equal(await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value).templates[0].id), parsed.templates[0].id, "undo preserves identity");
        await page.locator('[data-builder-action="remove-template"]').click();
        await page.locator('[data-builder-action="add-template"]').click();
        assert.notEqual(await page.evaluate(() => modules.journal.parseCustomJournalTemplatesText(document.querySelector('[data-journal-custom]').value).templates[0].id), parsed.templates[0].id, "new forms cannot inherit bindings of deleted forms");
        await page.evaluate(() => {
            document.querySelector("#root").innerHTML = '<div class="lc-checkin--settings"><input data-settings-search /><div data-settings-search-status></div><nav class="lc-checkin__settings-nav"><button data-settings-nav="a">A</button><button data-settings-nav="b">B</button></nav><section data-settings-group="a"><details><summary>Journal</summary><div class="lc-checkin__settings-row"><span>Notebook target</span><input /></div><div class="lc-checkin__settings-row"><span>Other setting</span><input /></div></details></section><section data-settings-group="b">Appearance</section></div>';
            window.cleanupNav = modules.navigation.bindSettingsNavigationFor(document.querySelector("#root"));
        });
        await page.locator('[data-settings-search]').fill("Notebook");
        assert.equal(await page.locator('[data-settings-group="b"]').isVisible(), false);
        assert.equal(await page.locator('details').evaluate(el => el.open), true);
        await page.locator('[data-settings-search]').fill("");
        assert.equal(await page.locator('[data-settings-group="b"]').isVisible(), true);
        assert.equal(await page.locator('details').evaluate(el => el.open), false);
        await page.locator('[data-settings-search]').fill("Notebook target");
        assert.equal(await page.locator('.lc-checkin__settings-row').nth(0).isVisible(), true);
        assert.equal(await page.locator('.lc-checkin__settings-row').nth(1).isVisible(), false);
        await page.locator('[data-settings-search]').press("Enter");
        assert.equal(await page.locator('.lc-checkin__settings-row').nth(0).locator('input').evaluate(el => el === document.activeElement), true);
        await page.locator('[data-settings-search]').fill("");
        await page.evaluate(() => cleanupNav());
        assert.deepEqual(errors, []);
        console.log("Journal experience: required focus, failure/retry/drafts, builder roundtrip, settings search passed.");
    } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
