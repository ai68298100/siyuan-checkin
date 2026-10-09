const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const sass = require("sass");
const {chromium} = require(process.env.CHECKIN_PLAYWRIGHT_MODULE || "playwright");

const projectRoot = path.join(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const compiled = relative => ts.transpileModule(fs.readFileSync(path.join(sourceRoot, relative), "utf8"), {compilerOptions}).outputText;
const sharedSource = ts.createSourceFile("shared.ts", fs.readFileSync(path.join(sourceRoot, "shared.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const shared = ts.transpileModule(sharedSource.statements.filter(statement => ts.isFunctionDeclaration(statement)
    && ["escapeHtml", "matchesSearch"].includes(statement.name?.text)).map(statement => statement.getText(sharedSource)).join("\n"), {compilerOptions}).outputText;
const modules = {"../i18n": compiled("i18n.ts"), "../shared": shared, "../features/diagnostics": compiled("features/diagnostics.ts"), editor: compiled("render/yeguif-mappings.ts"), choices: compiled("render/project-choice.ts")};
const stylesheet = sass.compile(path.join(sourceRoot, "ui/yeguif-mappings.scss")).css + sass.compile(path.join(sourceRoot, "ui/project-choice.scss")).css;

async function verifyMappings() {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    let scenarios = 0;
    try {
        for (const language of ["zh-CN", "en-US"]) {
            for (const theme of ["light", "dark"]) {
                for (const width of [320, 980]) {
                    const page = await browser.newPage({viewport: {width, height: 850}});
                    await page.setContent('<main id="primary" style="container-type:inline-size;container-name:lc5"></main><main id="secondary"></main>');
                    await page.addStyleTag({content: `body{margin:12px;font:14px Arial;--lc-checkin-border:#aaa;--lc-checkin-muted:#666;color:${theme === "dark" ? "#eee" : "#111"};background:${theme === "dark" ? "#17151c" : "#fff"}}main{max-width:100%}button,input,select{font:inherit}[data-yeguif-mapping-rows]{max-height:550px;overflow:auto}.lc-checkin__settings-inline{display:flex;flex-wrap:wrap;gap:8px}${stylesheet}`});
                    await page.evaluate(({modules, language}) => {
                        const cache = new Map();
                        const load = name => {
                            if (cache.has(name)) return cache.get(name).exports;
                            const loaded = {exports: {}};
                            cache.set(name, loaded);
                            new Function("require", "module", "exports", modules[name])(load, loaded, loaded.exports);
                            return loaded.exports;
                        };
                        load("../i18n").setPluginLanguage(language);
                        window.__editor = load("editor");
                        window.__savedMappings = Array.from({length: 60}, (_, index) => ({project: `Project ${index}`, itemId: `target-${index}`}));
                        window.__targets = Array.from({length: 275}, (_, index) => ({id: `target-${index}`, name: `Target ${index}`, available: true}));
                        window.__saveCalls = 0;
                        window.__failSave = false;
                        window.__mountMapping = id => {
                            const root = document.getElementById(id);
                            root.innerHTML = window.__editor.renderYeguifMappings();
                            window.__editor.bindYeguifMappings(root, {
                                mappings: window.__savedMappings,
                                readMappings: () => window.__savedMappings,
                                targets: window.__targets,
                                save: async (mappings, baseline) => {
                                    window.__saveCalls += 1;
                                    if (window.__deferSave) await new Promise(resolve => { window.__releaseSave = resolve; });
                                    if (window.__failSave) throw new Error("Injected save failure");
                                    if (JSON.stringify(window.__savedMappings) !== baseline) throw new Error("Mappings changed");
                                    window.__savedMappings = structuredClone(mappings);
                                },
                            });
                        };
                        window.__mountMapping("primary");
                        window.__mountMapping("secondary");
                        window.__choices = load("choices");
                        window.__choiceChanges = 0;
                        window.__choiceMarkup = ["sireader-item", "siplayer-item", "weread-item", "weread-finish-item", "weread-notes-item", "health-binding-item", "note-query-item"].map(hook => `<select data-${hook} aria-label="${hook}"><option value=""></option>${window.__targets.map(target => `<option value="${target.id}">${target.name}</option>`).join("")}<option value="archived-target" selected>Archived target</option></select>`).join("");
                        const choiceRoot = document.createElement("main");
                        choiceRoot.id = "choices";
                        choiceRoot.innerHTML = window.__choiceMarkup;
                        document.body.append(choiceRoot);
                        choiceRoot.addEventListener("change", event => { if (event.target instanceof HTMLSelectElement) window.__choiceChanges += 1; });
                        window.__choices.bindProjectChoices(choiceRoot);
                    }, {modules, language});
                    const primary = page.locator("#primary");
                    assert.equal(await primary.locator("[data-yeguif-mapping-row]").count(), 60, "all saved mappings remain visible");
                    await primary.locator("[data-yeguif-mapping-add]").click();
                    const added = primary.locator("[data-yeguif-mapping-row]").last();
                    await added.locator("[data-yeguif-project]").fill("Project 0");
                    await added.locator("[data-yeguif-target-search]").fill("target-274");
                    assert.equal(await added.locator("option[value='target-274']").count(), 1, "search reaches projects after the old 200 cap");
                    await added.locator("[data-yeguif-target]").selectOption("target-274");
                    assert.equal(await primary.locator("[data-yeguif-mapping-save]").isDisabled(), true, "duplicate sources cannot save");
                    assert.equal(await page.evaluate(() => window.__saveCalls), 0, "editing and validation do not write preferences");
                    const hostileName = '<img src=x onerror="window.__canary=1">';
                    await added.locator("[data-yeguif-project]").fill(hostileName);
                    await page.evaluate(() => { window.__failSave = true; });
                    await primary.locator("[data-yeguif-mapping-save]").click();
                    await page.waitForFunction(() => document.querySelector("#primary [data-yeguif-mapping-status]").textContent === "Injected save failure");
                    assert.equal(await primary.locator("[data-yeguif-mapping-row]").last().locator("[data-yeguif-project]").inputValue(), hostileName, "failed save retains draft input");
                    assert.equal(await page.evaluate(() => window.__savedMappings.length), 60, "failed write retains saved mappings");
                    await page.evaluate(() => { window.__failSave = false; window.__deferSave = true; });
                    await primary.locator("[data-yeguif-mapping-save]").click();
                    await page.waitForFunction(() => Boolean(window.__releaseSave));
                    await page.evaluate(() => { window.__mountMapping("primary"); window.__releaseSave(); });
                    await page.waitForFunction(() => window.__savedMappings.length === 61 && !document.querySelector("#primary [data-yeguif-mapping-add]").disabled);
                    assert.equal(await page.locator("#secondary [data-yeguif-mapping-row]").count(), 60, "another surface retains its own draft");
                    assert.equal(await primary.locator("img,script").count(), 0, "hostile project names remain plain text");
                    assert.equal(await page.evaluate(() => window.__canary), undefined);
                    await page.evaluate(() => { window.__deferSave = false; });
                    await primary.locator("[data-yeguif-mapping-row]").first().locator("[data-yeguif-project]").fill("Unsaved change");
                    await primary.locator("[data-yeguif-mapping-reset]").click();
                    assert.equal(await primary.locator("[data-yeguif-mapping-row]").first().locator("[data-yeguif-project]").inputValue(), "Project 0", "reset returns to persisted mappings");
                    await page.evaluate(() => { window.__targets[0].available = false; window.__mountMapping("primary"); });
                    assert.equal(await primary.locator("[data-yeguif-mapping-save]").isDisabled(), true);
                    assert.ok(await primary.locator("[data-yeguif-mapping-row]").first().locator("[data-yeguif-mapping-error]").textContent(), "invalid targets explain why re-binding is needed");
                    const geometry = await primary.evaluate(element => ({width: element.clientWidth, scrollWidth: element.scrollWidth,
                        minimumControlHeight: Math.min(...[...element.querySelectorAll("input,select,button")].map(control => control.getBoundingClientRect().height))}));
                    assert.ok(geometry.scrollWidth <= geometry.width + 1, `${language}/${theme}/${width} mapping editor must fit`);
                    assert.ok(geometry.minimumControlHeight >= 44, "mapping controls retain touch targets");
                    const choiceRoot = page.locator("#choices");
                    assert.equal(await choiceRoot.locator("[data-project-choice-search]").count(), 7, "all source project fields offer full search");
                    for (const hook of ["sireader-item", "siplayer-item", "weread-item", "weread-finish-item", "weread-notes-item", "health-binding-item", "note-query-item"]) {
                        await choiceRoot.locator(`[data-project-choice-search='data-${hook}']`).fill("target-274");
                        const select = choiceRoot.locator(`[data-${hook}]`);
                        assert.equal(await select.locator("option[value='target-274']").count(), 1, `${hook} searches past the old 200 cap`);
                        assert.equal(await select.inputValue(), "archived-target", "search never clears an existing unavailable binding");
                    }
                    assert.equal(await page.evaluate(() => window.__choiceChanges), 0, "candidate searches do not trigger persistence handlers");
                    const projectSearch = choiceRoot.locator("[data-project-choice-search='data-weread-item']");
                    await projectSearch.dispatchEvent("compositionstart");
                    await projectSearch.fill("Target 0");
                    assert.equal(await choiceRoot.locator("[data-weread-item] option[value='target-274']").count(), 1, "unfinished IME text does not replace candidates");
                    await projectSearch.dispatchEvent("compositionend");
                    assert.equal(await choiceRoot.locator("[data-weread-item] option[value='target-0']").count(), 1);
                    await choiceRoot.locator("[data-weread-item]").selectOption("target-0");
                    assert.equal(await page.evaluate(() => window.__choiceChanges), 1, "only choosing a target emits its existing change action");
                    await page.evaluate(() => {
                        const root = document.getElementById("choices");
                        root.innerHTML = window.__choiceMarkup;
                        window.__choices.bindProjectChoices(root);
                        window.__choices.bindProjectChoices(root);
                    });
                    assert.equal(await choiceRoot.locator("[data-project-choice-search]").count(), 7, "rebinding never duplicates the search controls");
                    assert.equal(await choiceRoot.locator("[data-project-choice-search='data-weread-item']").inputValue(), "Target 0", "search state stays with its root through redraw");
                    scenarios += 1;
                    await page.close();
                }
            }
        }
    } finally {
        await browser.close();
    }
    console.log(`LifeLog mapping editor passed ${scenarios} browser scenarios: full candidates, drafts, duplicate/target validation, failure retry, rerender during save, safe names, and narrow touch geometry.`);
}

verifyMappings().catch(error => { console.error(error); process.exitCode = 1; });
