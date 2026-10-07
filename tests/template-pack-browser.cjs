/* T-1632 production bundle matrix: partial pack application, conflicts and rollback. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const {chromium} = require("playwright");
const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || path.resolve(__dirname, "..");
const artifacts = path.join(projectRoot, ".artifacts", "t1632-template-pack");
fs.mkdirSync(artifacts, {recursive: true});

const compile = relative => ts.transpileModule(fs.readFileSync(path.join(projectRoot, relative), "utf8"), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}
}).outputText;
const i18n = {};
new Function("exports", compile("src/i18n.ts"))(i18n);
const catalog = {};
new Function("require", "exports", compile("src/catalog.ts"))(name => { assert.equal(name, "./i18n"); return i18n; }, catalog);
const localTemplateName = catalog.templateName;

const template = name => catalog.CHECKIN_TEMPLATES.find(entry => entry.name === name);
const itemFor = (name, suffix = "") => {
    const source = template(name);
    assert.ok(source, `catalog contains ${name}`);
    return {id: `fixture-${name}-${suffix || "base"}`, name: localTemplateName(source),
        icon: source.icon, kind: source.kind, target: source.target, unit: source.unit,
        schedule: {...source.schedule, weekdays: source.schedule.weekdays ? [...source.schedule.weekdays] : undefined},
        group: source.group, priority: source.priority, ...(source.timeSlot ? {timeSlot: source.timeSlot} : {}),
        ...(source.completionSource ? {completionSource: source.completionSource} : {}), ...(source.tomatoMode ? {tomatoMode: source.tomatoMode} : {}),
        ...(source.direction ? {direction: source.direction} : {}), createdDate: "2026-10-01", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"};
};
const storageFor = (items, pluginLanguage = "zh-CN") => ({"checkin-store": {version: 3, items, events: []}, "checkin-view-preferences": {pluginLanguage, appearance: "light", reducedMotion: true}});

async function boot(page, storage, width = 980) {
    await page.setViewportSize({width, height: 820});
    await page.setContent('<style>body{margin:0}#dock{width:100%;height:780px}</style><div id="dock"></div>');
    await page.addStyleTag({path: path.join(projectRoot, "dist/index.css")});
    await page.evaluate(storageValue => {
        window.__storage = structuredClone(storageValue);
        window.__messages = [];
        window.__failMainWrite = false;
        window.__mainWrites = 0;
        window.__confirm = true;
        window.confirm = () => window.__confirm;
        window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
        window.fetch = async () => new Response(JSON.stringify({code: 0, data: []}), {headers: {"Content-Type": "application/json"}});
        window.module = {exports: {}};
        window.require = name => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {Plugin: class {
                addIcons() {} addTopBar() {} addCommand() {} addTab() {}
                addDock(options) { window.__dockOptions = options; }
                async loadData(bucket) { return structuredClone(window.__storage[bucket] ?? ""); }
                async saveData(bucket, value) {
                    if (bucket === "checkin-store") {
                        window.__mainWrites++;
                        if (window.__failMainWrite) throw new Error("T-1632 controlled storage failure");
                    }
                    window.__storage[bucket] = structuredClone(value);
                }
            }, getFrontend: () => "desktop", openTab: async () => ({close() {}}), showMessage(message) { window.__messages.push(String(message)); }, fetchSyncPost: async () => ({code: 0, data: []})};
        };
    }, storage);
    await page.addScriptTag({path: path.join(projectRoot, "dist/index.js")});
    await page.evaluate(async () => {
        const Plugin = window.module.exports.default || window.module.exports;
        const plugin = window.__plugin = new Plugin();
        plugin.onload();
        const ready = window.siyuanCheckin.whenReady();
        window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await plugin.onLayoutReady();
        await ready;
        plugin.showEditor(undefined, undefined, plugin.dockElement);
    });
    await page.locator("#dock .lc-checkin--editor").waitFor();
}

async function openPack(page, packId = "study") {
    const disclosure = page.locator('#dock [data-template-disclosure]');
    if (await disclosure.count() && !(await disclosure.evaluate(element => element.open))) await disclosure.locator("summary").click();
    const chip = page.locator(`#dock [data-pack-chip="${packId}"]`);
    await chip.focus();
    await page.keyboard.press("Enter");
    if (await page.locator("#dock [data-pack-preview]").isHidden()) await chip.click();
    await page.locator("#dock [data-pack-preview]").waitFor({state: "visible"});
    return page.locator("#dock [data-pack-preview]");
}

async function inspect(page) {
    return page.evaluate(() => ({
        items: window.__plugin.store.items.map(item => ({name: item.name, target: item.target, unit: item.unit, templateAnchor: item.templateAnchor})),
        storage: structuredClone(window.__storage["checkin-store"]), writes: window.__mainWrites,
        messages: [...window.__messages], overflow: document.querySelector("#dock").scrollWidth - document.querySelector("#dock").clientWidth,
    }));
}

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const report = {scope: "production dist bundle in Chromium with mocked SiYuan storage; no real client/Android claim", cases: []};
    try {
        /* Empty library: keyboard opens the pack; unchecking one row and applying creates only the remainder. */
        const page = await browser.newPage({viewport: {width: 980, height: 820}});
        await boot(page, storageFor([]));
        const keyboardChip = page.locator('#dock [data-pack-chip="study"]');
        await keyboardChip.focus();
        await page.keyboard.press("Enter");
        await page.locator("#dock [data-pack-preview]").waitFor({state: "visible"});
        const panel = page.locator("#dock [data-pack-preview]");
        const rows = panel.locator("[data-pack-entry]");
        assert.equal(await rows.count(), 5);
        const first = rows.first().locator("[data-pack-select]");
        await first.uncheck();
        const beforeCancel = await inspect(page);
        await page.locator("#dock [data-pack-chip='study']").press("Enter");
        assert.deepEqual((await inspect(page)).storage, beforeCancel.storage, "closing preview never writes");
        await openPack(page);
        await panel.locator("[data-pack-select]").first().uncheck();
        const selected = panel.locator("[data-pack-apply-selected]");
        assert.equal(await selected.count(), 1);
        assert.match(await selected.textContent(), /4/);
        const writesBeforePartial = (await inspect(page)).writes;
        await selected.click();
        await page.waitForFunction(() => window.__plugin.store.items.length === 4);
        const afterPartial = await inspect(page);
        assert.equal(afterPartial.writes, writesBeforePartial + 1, "partial application persists once");
        assert.equal(afterPartial.storage.events.length, 0, "template application creates no check-in events");
        assert.equal(afterPartial.items.every(item => item.templateAnchor), true, "built-in pack items persist a stable template anchor");
        assert.equal(await page.locator("#dock .lc-checkin--today").count(), 1, "successful apply returns to Today");
        report.cases.push({case: "empty-partial", created: 4, cancelNoWrite: true, keyboardOpen: true});
        await page.close();

        /* Existing library: exact match is skipped; different rule is shown with a diff/edit action. */
        const same = itemFor("阅读");
        const different = {...itemFor("背单词", "different"), target: itemFor("背单词").target + 15};
        const conflictPage = await browser.newPage({viewport: {width: 980, height: 820}});
        await boot(conflictPage, storageFor([same, different]));
        const conflictPanel = await openPack(conflictPage);
        const conflictRows = conflictPanel.locator("[data-pack-entry]");
        assert.equal(await conflictRows.count(), 5);
        const conflictText = await conflictPanel.innerText();
        assert.match(conflictText, /规则有差异|规则相同|Different rules|Same rules/);
        assert.ok(await conflictPanel.locator("[data-pack-edit]").count() >= 1, "different-rule row offers edit path");
        assert.ok(await conflictPanel.locator("[data-pack-select]:disabled").count() >= 2, "same-name rows stay visible but cannot be selected for creation");
        const beforeApply = await inspect(conflictPage);
        const selectedConflict = conflictPanel.locator("[data-pack-apply-selected]");
        assert.equal(await selectedConflict.count(), 1, "new entries keep a partial-apply action in a non-empty library");
        await selectedConflict.click();
        await conflictPage.waitForFunction(count => window.__plugin.store.items.length >= count + 2, beforeApply.items.length);
        const afterConflict = await inspect(conflictPage);
        assert.equal(afterConflict.writes, beforeApply.writes + 1);
        assert.equal(afterConflict.items.filter(item => item.name === same.name).length, 1, "existing same-name entries are not duplicated by pack apply");
        assert.ok(afterConflict.items.length >= beforeApply.items.length + 2, "new entries are applied in a single batch");
        report.cases.push({case: "existing-conflicts", sameRuleVisible: true, differentRuleVisible: true, editVisible: true, created: afterConflict.items.length - beforeApply.items.length});
        await conflictPage.close();

        /* Legacy cross-locale item: an old Chinese item must block the English pack entry. */
        const switchedPage = await browser.newPage({viewport: {width: 980, height: 820}});
        await boot(switchedPage, storageFor([itemFor("阅读", "legacy-locale")], "en-US"));
        const switchedPanel = await openPack(switchedPage);
        const switchedReading = switchedPanel.locator("[data-pack-entry]").filter({hasText: "Reading"});
        assert.equal(await switchedReading.count(), 1, "English preview keeps the legacy Chinese item as one conflict");
        assert.match(await switchedReading.innerText(), /same rule|same name|规则相同|同名/);
        const switchedBefore = await inspect(switchedPage);
        await switchedPanel.locator("[data-pack-apply-selected]").click();
        await switchedPage.waitForFunction(count => window.__plugin.store.items.length >= count + 4, switchedBefore.items.length);
        const switchedAfter = await inspect(switchedPage);
        assert.equal(switchedAfter.items.filter(item => item.name === "Reading").length, 0, "language switch does not create a duplicate");
        assert.equal(switchedAfter.writes, switchedBefore.writes + 1);
        report.cases.push({case: "legacy-cross-locale", duplicateBlocked: true, created: 4});
        await switchedPage.close();

        /* Every pack member already exists: no apply button and no write. */
        const allExisting = ["阅读", "背单词", "朗读", "听播客", "写日记"].map((name, index) => itemFor(name, `all-${index}`));
        const skipPage = await browser.newPage({viewport: {width: 320, height: 820}});
        await boot(skipPage, storageFor(allExisting), 320);
        const skipPanel = await openPack(skipPage);
        assert.equal(await skipPanel.locator("[data-pack-apply-selected]").count(), 0);
        assert.equal(await skipPanel.locator("[data-pack-apply-all]").count(), 0);
        const skippedBefore = await inspect(skipPage);
        await skipPanel.locator("[data-pack-entry]").first().locator("[data-template-apply]").focus();
        await skipPage.keyboard.press("Enter");
        assert.deepEqual((await inspect(skipPage)).storage, skippedBefore.storage, "all-skip/preview row never writes implicitly");
        assert.ok((await inspect(skipPage)).overflow <= 1, "pack preview fits narrow viewport");
        report.cases.push({case: "all-skip-narrow", noApply: true, noWrite: true, overflow: 0});
        await skipPage.close();

        /* Persistence failure: host restores the whole store and leaves no partial items. */
        const failurePage = await browser.newPage({viewport: {width: 980, height: 820}});
        await boot(failurePage, storageFor([]));
        const failurePanel = await openPack(failurePage);
        await failurePage.evaluate(() => { window.__failMainWrite = true; });
        await failurePanel.locator("[data-pack-apply-selected]").click();
        await failurePage.waitForFunction(() => window.__messages.length > 0, undefined, {timeout: 5000});
        const failed = await inspect(failurePage);
        assert.equal(failed.items.length, 0, "failed batch restores in-memory store");
        assert.equal(failed.storage.items.length, 0, "failed batch never changes persisted store");
        assert.ok(failed.messages.length > 0, "failed batch gives visible feedback");
        report.cases.push({case: "save-failure", rollback: true, visibleFeedback: true});
        await failurePage.close();
        fs.writeFileSync(path.join(artifacts, "report.json"), JSON.stringify(report, null, 2));
        console.log(`T-1632 template pack browser checks passed: ${report.cases.length} cases (partial, conflicts, all-skip narrow, rollback).`);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });

