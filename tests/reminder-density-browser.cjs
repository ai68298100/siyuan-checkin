const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const sass = require("sass");
const {createRequire} = require("node:module");
const esbuild = createRequire(require.resolve("esbuild-loader"))("esbuild");
const {chromium} = require(process.env.CHECKIN_PLAYWRIGHT_MODULE || "playwright");
const {cssAudit} = require("../scripts/css-audit.cjs");

const projectRoot = path.join(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const outputRoot = process.env.CHECKIN_QA_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-density-"));
const cache = new Map();

function loadTs(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = {exports: {}};
    cache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = (name) => name.startsWith(".")
        ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}

function compileStyles() {
    const sourceFile = ts.createSourceFile("index.ts", fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
    const compiled = sourceFile.statements.filter((statement) => ts.isImportDeclaration(statement) && statement.moduleSpecifier.text.endsWith(".scss"))
        .map((statement) => sass.compile(path.resolve(sourceRoot, statement.moduleSpecifier.text), {style: "compressed"}).css).join("\n");
    return esbuild.transformSync(compiled, {loader: "css", minify: true}).code;
}

const {normalizeStore} = loadTs(path.join(sourceRoot, "model.ts"));
const {buildAnalyticsSnapshot} = loadTs(path.join(sourceRoot, "charts.ts"));
const {renderPriorityReminderView} = loadTs(path.join(sourceRoot, "render", "fragments.ts"));
const {renderReviewView} = loadTs(path.join(sourceRoot, "render", "review.ts"));
const {t: translate, setPluginLanguage} = loadTs(path.join(sourceRoot, "i18n.ts"));
const asOf = new Date(2026, 9, 4, 12);
const localDate = "2026-10-04";

function renderFixture(language, theme, long = false) {
    setPluginLanguage(language);
    const english = language === "en-US";
    const names = english ? ["Drink water", "Read a page", "Stretch"] : ["喝水", "读一页书", "拉伸"];
    if (long) names[0] = '<img data-hostile-canary="1" onerror="alert(1)"> ' + "LongUnbrokenName中文".repeat(35);
    const store = normalizeStore({version: 3, items: names.map((name, index) => ({id: `habit-${index}`, name, icon: "✓", kind: "binary", target: 1,
        unit: english ? "times" : "次", schedule: {type: "daily"}, createdAt: "2026-10-01T00:00:00.000Z"})), events: [], eventTombstones: []});
    const occasion = (id, name, date, note = "") => ({id, name, kind: "scheduled", date, recurrence: "once", remindBeforeDays: 3, note,
        enabled: true, completedDates: [], createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z"});
    const occasionStore = {version: 1, occasions: [
        occasion("bill", english ? "Pay the bill" : "缴费", "2026-10-03", english ? "Original due date retained" : "保留原定日期"),
        occasion("upcoming", english ? "Visit a friend" : "探望朋友", "2026-10-05"),
        occasion("skipped", english ? "Skipped occurrence" : "已跳过事项", "2026-10-03"),
        occasion("snoozed", english ? "Snoozed occurrence" : "已延期事项", "2026-10-03"),
    ]};
    const reminderUserActions = [
        {id: "occasion:skipped:2026-10-03", action: "skip", at: "2026-10-04T01:00:00.000Z"},
        {id: "occasion:snoozed:2026-10-03", action: "snooze", at: "2026-10-04T01:00:00.000Z"},
    ];
    const snapshot = buildAnalyticsSnapshot(store, asOf);
    const priority = renderPriorityReminderView(store, occasionStore, asOf, reminderUserActions);
    const review = renderReviewView({store, occasionStore, appearance: theme, reviewWorkspace: "analysis", historyMonth: asOf,
        selectedHistoryDate: localDate, historyQuery: "", historySource: "all", historyOrder: "newest", heatmapYearOffset: 0,
        reviewFoldSections: new Set(["reminders"]), reviewFoldTouched: true, summaryRange: "week",
        reportSections: {events: true, completion: true, items: true, baseline: true, highlights: true},
        summaryRefreshing: false, summaryProvidersCount: 0, reminderFilter: "all", reminderUserActions, analyticsSnapshot: snapshot});
    return {html: `<div class="lc-checkin lc-checkin--today" data-appearance="${theme}" style="height:auto;min-height:0">${priority}</div>${review}`,
        viewAll: translate("today.priorityViewAll"), title: names[0], actionLabels: [translate("review.reminderSnooze"), translate("review.reminderDefer"), translate("review.reminderSkip")]};
}

async function verifyReminderDensity() {
    fs.mkdirSync(outputRoot, {recursive: true});
    const css = compileStyles();
    const cssPath = path.join(outputRoot, "styles.css");
    fs.writeFileSync(cssPath, css);
    const styleAudit = cssAudit(cssPath);
    assert.deepEqual(styleAudit.dead, [], "the new compiled component layer cannot introduce unused classes");
    assert.ok(styleAudit.duplicateRuleBytes < 10000, "the compiled styles must retain the existing duplicate-rule guard");
    assert.ok(styleAudit.bytes <= 640 * 1024, "the compiled styles must retain the existing CSS size budget");
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const evidence = [];
    const errors = [];
    try {
        const page = await browser.newPage({viewport: {width: 1200, height: 960}, deviceScaleFactor: 1});
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setContent('<style>body{margin:0;font-family:Arial}#frame{height:950px;overflow:auto}</style><main id="frame"></main>');
        await page.addStyleTag({content: css});
        for (const host of [
            {name: "tab", className: "lc-checkin-tab-host"},
            {name: "dock", className: "lc-checkin-dock-host"},
            {name: "dialog", className: "lc-checkin-dialog-host"},
            {name: "mobile", className: "lc-checkin-dialog-host lc-checkin-dialog-host--mobile"},
        ]) {
            for (const language of ["zh-CN", "en-US"]) {
                for (const theme of ["light", "dark"]) {
                    for (const width of [320, 390, 640, 980, 1180]) {
                        const fixture = renderFixture(language, theme);
                        await page.setViewportSize({width, height: 960});
                        await page.evaluate(({host, width, html}) => {
                            const frame = document.querySelector("#frame");
                            frame.className = host.className;
                            frame.style.width = width + "px";
                            frame.style.height = "950px";
                            frame.style.overflow = "auto";
                            frame.innerHTML = html;
                        }, {host, width, html: fixture.html});
                        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                        const result = await page.evaluate(() => {
                            const box = (element) => { const rect = element.getBoundingClientRect(); return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height}; };
                            const priority = document.querySelector("[data-priority-reminder]");
                            const viewAll = priority.querySelector("[data-reminder-center-link]");
                            const primary = priority.querySelector(".is-primary");
                            const center = document.querySelector(".lc-checkin__reminder-center");
                            const rows = [...center.querySelectorAll(".lc-checkin__reminder-row")].filter((row) => !row.closest("[hidden]"));
                            const habit = rows.find((row) => row.dataset.reminderId === "checkin:habit-0:2026-10-04");
                            return {width: document.querySelector("#frame").clientWidth, frameScrollWidth: document.querySelector("#frame").scrollWidth,
                                todayAppearance: priority.closest("[data-appearance]").dataset.appearance,
                                reviewAppearance: center.closest("[data-appearance]").dataset.appearance,
                                toolbar: Boolean(viewAll.closest(".lc-checkin__priority-reminder-tools")),
                                standalone: priority.querySelectorAll(':scope > [data-action="summary"]').length,
                                viewAll: box(viewAll), viewAllAria: viewAll.getAttribute("aria-label"), viewAllTitle: viewAll.title,
                                banner: box(priority), primary: box(primary), primaryAction: box(primary.querySelector("[data-priority-reminder-action]")),
                                reminderWidth: center.clientWidth - parseFloat(getComputedStyle(center).paddingLeft) - parseFloat(getComputedStyle(center).paddingRight),
                                row: box(habit), content: box(habit.querySelector(".lc-checkin__reminder-content")),
                                timing: box(habit.querySelector(".lc-checkin__reminder-timing")), actions: box(habit.querySelector(".lc-checkin__reminder-actions")),
                                actionLabels: [...habit.querySelectorAll("[data-reminder-action]")].map((button) => button.textContent),
                                titles: [...habit.querySelectorAll("[data-reminder-action]")].map((button) => button.title),
                                dates: rows.filter((row) => row.dataset.reminderId).map((row) => ({identity: row.dataset.reminderId, date: row.querySelector("time")?.getAttribute("datetime")})),
                                actionKinds: [...center.querySelectorAll("[data-reminder-action]")].map((button) => button.dataset.reminderAction),
                                catchUp: [...center.querySelectorAll("[data-occasion-complete]")].map((button) => ({opacity: getComputedStyle(button).opacity, visibility: getComputedStyle(button).visibility, ...box(button)})),
                                targets: [...priority.querySelectorAll("button"), ...center.querySelectorAll("button,select")].filter((button) => button.getBoundingClientRect().height > 0).map(box),
                                actionBoxes: [...habit.querySelectorAll("[data-reminder-action]")].map(box),
                                overflowRows: rows.filter((row) => row.scrollWidth > row.clientWidth + 1 || row.scrollHeight > row.clientHeight + 1).length,
                                rowSizes: rows.map((row) => ({width: row.clientWidth, scrollWidth: row.scrollWidth, height: row.clientHeight, scrollHeight: row.scrollHeight, ...box(row)})),
                                escapedControls: rows.flatMap((row) => [...row.querySelectorAll("button")].filter((button) => {
                                    const control = box(button);
                                    const parent = box(row);
                                    return control.left < parent.left - 1 || control.right > parent.right + 1 || control.top < parent.top - 1 || control.bottom > parent.bottom + 1;
                                })).length,
                            };
                        });
                        const label = `${host.name}/${language}/${theme}/${width}`;
                        assert.equal(result.todayAppearance, theme, `${label}: Today applies the selected theme`);
                        assert.equal(result.reviewAppearance, theme, `${label}: Review applies the selected theme`);
                        assert.equal(result.toolbar, true, `${label}: View all belongs to the primary toolbar`);
                        assert.equal(result.standalone, 0, `${label}: View all cannot create a standalone banner row`);
                        assert.equal(result.viewAllAria, fixture.viewAll, `${label}: the compact icon keeps the full accessible name`);
                        assert.equal(result.viewAllTitle, fixture.viewAll);
                        assert.ok(Math.abs(result.viewAll.top - result.primaryAction.top) < 1, `${label}: both banner actions share one line`);
                        assert.ok(result.viewAll.top >= result.primary.top - 1 && result.viewAll.bottom <= result.primary.bottom + 1);
                        assert.ok(result.viewAll.top >= result.banner.top - 1 && result.viewAll.bottom <= result.banner.bottom + 1, `${label}: the toolbar cannot extend beyond the banner`);
                        assert.ok(result.frameScrollWidth <= result.width + 1, `${label}: no horizontal frame overflow`);
                        assert.equal(result.overflowRows, 0, `${label}: reminder cards do not overflow (${JSON.stringify(result.rowSizes)})`);
                        assert.equal(result.escapedControls, 0, `${label}: controls stay within their reminder card`);
                        assert.deepEqual(result.actionLabels, fixture.actionLabels, `${label}: action labels remain localized`);
                        assert.ok(result.titles.every((title) => title.length > 0), `${label}: action scope descriptions remain available`);
                        for (const entry of result.dates) assert.ok(entry.identity.endsWith(entry.date), `${label}: each reminder retains its original occurrence date`);
                        for (const kind of ["snooze", "defer", "skip", "restore"]) assert.ok(result.actionKinds.includes(kind), `${label}: ${kind} hooks remain intact`);
                        assert.equal(result.catchUp.length, 3, `${label}: overdue history retains its catch-up actions`);
                        assert.ok(result.catchUp.every((button) => button.opacity === "1" && button.visibility === "visible"), `${label}: catch-up text actions cannot inherit invisible icon-button styles`);
                        for (const target of result.targets) assert.ok(target.width >= 43.9 && target.height >= 43.9, `${label}: controls retain 44px targets (${JSON.stringify(target)})`);
                        if (result.reminderWidth >= 760) {
                            assert.ok(result.content.right <= result.timing.left + 1 && result.timing.right <= result.actions.left + 1, `${label}: content, date and actions use separate horizontal columns`);
                            assert.ok(result.row.height <= 54, `${label}: an ordinary reminder remains compact (${result.row.height}px)`);
                            assert.ok(result.actionBoxes.every((button) => Math.abs(button.top - result.actionBoxes[0].top) < 1), `${label}: wide actions stay on one line`);
                        } else {
                            assert.ok(result.actions.top >= result.content.bottom - 1, `${label}: narrow actions move below content`);
                        }
                        await page.locator("[data-reminder-center-link]").focus();
                        await page.keyboard.press("Tab");
                        assert.ok(await page.evaluate(() => document.activeElement?.tagName === "SUMMARY"), `${label}: the expansion remains next in keyboard order`);
                        await page.locator('.lc-checkin__reminder-row[data-reminder-id="checkin:habit-0:2026-10-04"] [data-reminder-action="snooze"]').focus();
                        await page.keyboard.press("Tab");
                        assert.equal(await page.evaluate(() => document.activeElement?.dataset.reminderAction), "defer", `${label}: reminder actions keep keyboard order`);
                        evidence.push({label, ...result});
                        if ((host.name === "tab" && language === "en-US" && width === 1180) || (host.name === "mobile" && language === "zh-CN" && width === 320)) {
                            await page.setViewportSize({width, height: 2200});
                            await page.evaluate(() => {
                                const frame = document.querySelector("#frame");
                                frame.style.height = "auto";
                                frame.style.overflow = "visible";
                                for (const section of frame.querySelectorAll("[data-priority-reminder], .lc-checkin__reminder-center")) {
                                    for (let ancestor = section.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
                                        ancestor.style.height = "auto";
                                        ancestor.style.maxHeight = "none";
                                        ancestor.style.minHeight = "0";
                                        ancestor.style.overflow = "visible";
                                        ancestor.scrollTop = 0;
                                    }
                                }
                                frame.scrollTop = 0;
                            });
                            await page.locator(".lc-checkin__reminder-center").screenshot({path: path.join(outputRoot, `${host.name}-${language}-${theme}-${width}.png`)});
                            await page.locator("[data-priority-reminder]").screenshot({path: path.join(outputRoot, `${host.name}-${language}-${theme}-${width}-today.png`)});
                        }
                    }
                }
            }
        }
        for (const width of [320, 1180]) {
            const fixture = renderFixture("en-US", "dark", true);
            await page.setViewportSize({width, height: 960});
            await page.evaluate(({width, html}) => { const frame = document.querySelector("#frame"); frame.className = "lc-checkin-tab-host"; frame.style.width = width + "px"; frame.innerHTML = html; }, {width, html: fixture.html});
            const result = await page.evaluate(() => ({canaries: document.querySelectorAll("[data-hostile-canary], [onerror]").length,
                title: document.querySelector('.lc-checkin__reminder-row[data-reminder-id="checkin:habit-0:2026-10-04"] strong')?.title,
                overflow: document.querySelector("#frame").scrollWidth > document.querySelector("#frame").clientWidth + 1}));
            assert.equal(result.canaries, 0, "hostile long names remain plain text");
            assert.equal(result.title, fixture.title, "clamped titles retain the complete user name");
            assert.equal(result.overflow, false, `${width}px: long names cannot enlarge the host`);
        }
        assert.deepEqual(errors, [], "reminder rendering must stay free of browser errors");
        fs.writeFileSync(path.join(outputRoot, "evidence.json"), JSON.stringify(evidence, null, 2));
        console.log(`Reminder density browser checks passed: ${evidence.length} layouts across tab/dock/dialog/mobile, both locales/themes and 320/390/640/980/1180px; long-name boundaries passed.`);
        console.log(`Reminder density artifacts: ${outputRoot}`);
        console.log(`Reminder density CSS audit: ${styleAudit.total} classes, ${styleAudit.dead.length} dead, ${styleAudit.bytes} characters, ~${styleAudit.duplicateRuleBytes} duplicated characters.`);
    } finally {
        await browser.close();
    }
}

if (require.main === module) verifyReminderDensity().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = {verifyReminderDensity};
