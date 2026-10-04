const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "output", "playwright", "reminder-delivery");
fs.mkdirSync(output, {recursive: true});

async function boot(page, options) {
    await page.setContent('<style>body{margin:0}#dock{width:100%;height:760px}</style><div id="dock"></div>');
    await page.addStyleTag({path: path.join(root, "dist", "index.css")});
    await page.evaluate(({appearance, language, frontend}) => {
        const now = new Date();
        const createdAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 8).toISOString();
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        window.__stores = {
            "checkin-store": {version: 1, items: [{id: "reading", name: "Reading 阅读 <script>unsafe</script>", icon: "📖", kind: "duration", target: 25, unit: "分钟", schedule: {type: "daily"}, createdAt}], events: []},
            "checkin-view-preferences": {pluginLanguage: language, appearance, dailyReminder: {enabled: true, slots: []}},
            "checkin-occasions": {version: 1, occasions: [{id: "bill", name: "Monthly bill 每月账单", kind: "scheduled", recurrence: "once", date: dueDate, enabled: true, remindBeforeDays: 0, completedDates: [], createdAt, updatedAt: createdAt}]},
        };
        window.__messages = [];
        window.module = {exports: {}};
        window.siyuan = {config: {appearance: {mode: appearance === "dark" ? 1 : 0}, system: {appDir: "", os: "windows"}}};
        window.require = (name) => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {
                Plugin: class {
                    addIcons() {}
                    addDock(options) { window.__dock = options; }
                    addTab(options) { window.__tab = options; }
                    addTopBar() {}
                    addCommand() {}
                    async loadData(key) { return structuredClone(window.__stores[key] ?? ""); }
                    async saveData(key, value) {
                        if (key === "checkin-reminder-delivery" && window.__failReminderWrite) {
                            window.__failReminderWrite = false;
                            throw new Error("Injected reminder write failure");
                        }
                        window.__stores[key] = structuredClone(value);
                    }
                },
                getFrontend: () => frontend,
                showMessage: (message) => window.__messages.push(message),
                openTab: async () => ({close() {}}),
                fetchSyncPost: async () => ({code: 0, data: []}),
            };
        };
    }, options);
    await page.addScriptTag({path: path.join(root, "dist", "index.js")});
    await page.evaluate(async () => {
        const Plugin = window.module.exports.default ?? window.module.exports;
        window.__plugin = new Plugin();
        await window.__plugin.onload();
        window.__dock.init.call({element: document.querySelector("#dock")});
        await window.__plugin.onLayoutReady();
    });
    await page.locator("[data-daily-reminder-notice]").waitFor();
}

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    let scenarios = 0;
    try {
        for (const width of [320, 360, 720, 1180]) {
            for (const appearance of ["light", "dark"]) {
                for (const language of ["zh-CN", "en-US"]) {
                    const frontend = width < 400 ? "mobile" : "desktop";
                    const page = await browser.newPage({viewport: {width, height: 860}});
                    const pageErrors = [];
                    page.on("pageerror", (error) => pageErrors.push(error.message));
                    try {
                        await boot(page, {appearance, language, frontend});
                        const initialFacts = await page.evaluate(() => JSON.stringify(window.__plugin.store));
                        const geometry = await page.evaluate(() => {
                            const notice = document.querySelector("[data-daily-reminder-notice]");
                            const box = notice.getBoundingClientRect();
                            const card = document.querySelector("[data-priority-reminder]");
                            const tools = card.querySelector(".lc-checkin__priority-reminder-tools");
                            const row = tools.closest(".lc-checkin__priority-reminder-row");
                            return {
                                left: box.left, right: box.right, scrollWidth: notice.scrollWidth, clientWidth: notice.clientWidth,
                                height: box.height, contentHeight: [...notice.children].reduce((height, child) => height + child.getBoundingClientRect().height, 0),
                                minHeight: getComputedStyle(notice).minHeight, padding: getComputedStyle(notice).padding, tracks: getComputedStyle(notice).gridTemplateRows,
                                appearance: notice.dataset.appearance, cardRole: card.getAttribute("role"), cardLive: card.getAttribute("aria-live"),
                                buttons: [...notice.querySelectorAll("button"), ...tools.querySelectorAll("button")].map((button) => ({height: button.getBoundingClientRect().height, width: button.getBoundingClientRect().width})),
                                rowHeight: row.getBoundingClientRect().height, toolsHeight: tools.getBoundingClientRect().height,
                                executableMarkup: Boolean(notice.querySelector("script")),
                                pageRoots: document.querySelectorAll(".lc-checkin").length,
                            };
                        });
                        assert.ok(geometry.left >= 0 && geometry.right <= width + 1, `${width}: notification fits viewport`);
                        assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${width}: no horizontal notification overflow`);
                        assert.ok(geometry.height <= geometry.contentHeight + 50, `notification height follows its content without inherited page minimums: ${JSON.stringify(geometry)}`);
                        assert.equal(geometry.appearance, appearance);
                        assert.equal(geometry.cardRole, "region");
                        assert.equal(geometry.cardLive, null, "redrawn priority content is ordinary readable content");
                        assert.equal(geometry.executableMarkup, false);
                        assert.equal(geometry.pageRoots, 1, "notification has its own structure and does not masquerade as a page root");
                        assert.ok(geometry.buttons.every((button) => button.height >= 43.9 && button.width >= 43.9), "all notice and priority actions are 44px targets");
                        assert.ok(geometry.rowHeight < 120 && geometry.toolsHeight < 50, `entry shares the primary row without a separate action line: ${JSON.stringify(geometry)}`);
                        if (width === 320 || width === 1180) await page.screenshot({path: path.join(output, `${width}-${appearance}-${language}.png`)});
                        await page.locator("[data-daily-reminder-close]").focus();
                        await page.keyboard.press("Enter");
                        assert.equal(await page.locator("[data-daily-reminder-notice]").count(), 0);
                        await page.evaluate(async () => { await window.__plugin.maybeSendDailyReminder("slot"); });
                        assert.equal(await page.locator("[data-daily-reminder-notice]").count(), 0, "close keeps the durable sent identity");
                        await page.evaluate(() => {
                            window.__announcer = document.querySelector(".lc-checkin__reminder-announcer");
                            window.__announcements = 0;
                            window.__observer = new MutationObserver((records) => { window.__announcements += records.length; });
                            window.__observer.observe(window.__announcer, {childList: true, characterData: true, subtree: true});
                            window.__plugin.render();
                            window.__plugin.render();
                        });
                        assert.equal(await page.evaluate(() => window.__announcements), 0, "ordinary redraws do not mutate the live region");
                        await page.evaluate(() => {
                            window.__plugin.store.items[0].name = "Updated 阅读";
                            window.__plugin.render();
                        });
                        assert.ok(await page.evaluate(() => window.__announcements) > 0, "changed digest updates the existing live region");
                        assert.equal(await page.evaluate(() => window.__announcer === document.querySelector(".lc-checkin__reminder-announcer")), true);
                        await page.locator("[data-reminder-center-link]").focus();
                        await page.keyboard.press("Enter");
                        const focusEvidence = await page.evaluate(() => {
                            const heading = document.querySelector(".lc-checkin__reminder-center h2");
                            return {matches: Boolean(heading && document.activeElement === heading), active: document.activeElement?.outerHTML.slice(0, 240), heading: heading?.outerHTML, fold: document.querySelector('[data-review-fold="reminders"]')?.outerHTML.slice(0, 260), state: [...window.__plugin.reviewStateForRoot(document.querySelector("#dock")).reviewFoldSections]};
                        });
                        assert.equal(focusEvidence.matches, true, `reminder center heading receives keyboard focus: ${JSON.stringify(focusEvidence)}`);
                        const actions = await page.evaluate(() => [...document.querySelectorAll(".lc-checkin__reminder-actions")].map((group) => {
                            const buttons = [...group.querySelectorAll("button")];
                            const boxes = buttons.map((button) => button.getBoundingClientRect());
                            return {buttons: boxes.map((box) => ({height: box.height, width: box.width, top: box.top})), rowHeight: group.closest(".lc-checkin__reminder-row").getBoundingClientRect().height};
                        }));
                        assert.ok(actions.length > 0, "real reminder center actions exist");
                        assert.ok(actions.every((group) => group.buttons.every((button) => button.height >= 43.9 && button.width >= 43.9)), "center actions retain touch targets");
                        if (width >= 720) assert.ok(actions.every((group) => new Set(group.buttons.map((button) => Math.round(button.top))).size === 1), "wide card actions stay horizontal");
                        if (width === 320 || width === 1180) await page.screenshot({path: path.join(output, `center-${width}-${appearance}-${language}.png`)});
                        await page.evaluate(async () => {
                            window.__plugin.showToday(document.querySelector("#dock"));
                            window.__stores["checkin-reminder-delivery"] = "";
                            await window.__plugin.maybeSendDailyReminder("launch");
                            window.__failReminderWrite = true;
                        });
                        await page.locator("[data-daily-reminder-mute]").click();
                        assert.equal(await page.locator("[data-daily-reminder-error]").isVisible(), true);
                        assert.equal(await page.locator("[data-daily-reminder-mute]").isEnabled(), true);
                        await page.locator("[data-daily-reminder-mute]").focus();
                        await page.keyboard.press("Enter");
                        await page.locator("[data-daily-reminder-notice]").waitFor({state: "detached"});
                        const muted = await page.evaluate(() => JSON.parse(window.__stores["checkin-reminder-delivery"]));
                        assert.equal(muted.mutedDates.length, 1);
                        await page.evaluate(async () => {
                            window.__plugin.store.items[0].name = "Reading 阅读 <script>unsafe</script>";
                            window.__plugin.render();
                            await window.__plugin.maybeSendDailyReminder("slot");
                        });
                        assert.equal(await page.locator("[data-daily-reminder-notice]").count(), 0);
                        assert.equal(await page.evaluate(() => JSON.stringify(window.__plugin.store)), initialFacts, "presentation and mute never alter facts");
                        await page.evaluate(async () => { window.__observer.disconnect(); await window.__plugin.onunload(); });
                        assert.equal(await page.locator(".lc-checkin__reminder-announcer").count(), 0, "unload removes persistent live regions");
                        assert.deepEqual(pageErrors, []);
                        scenarios += 1;
                        console.log(`ok ${scenarios} - ${width} ${appearance} ${language} ${frontend}: layout, keyboard, mute retry, announcement and teardown`);
                    } finally { await page.close(); }
                }
            }
        }
        for (const width of [320, 1180]) {
            const page = await browser.newPage({viewport: {width, height: 860}});
            try {
                await boot(page, {appearance: "dark", language: "en-US", frontend: "desktop"});
                await page.evaluate(() => {
                    const tab = document.createElement("div");
                    tab.id = "tab";
                    tab.style.height = "760px";
                    document.body.appendChild(tab);
                    window.__tab.init.call({element: tab, tab: {close() {}}});
                });
                assert.equal(await page.locator("[data-daily-reminder-notice]").count(), 1, "adding a tab never duplicates the notification");
                assert.equal(await page.locator(".lc-checkin__reminder-announcer").count(), 1, "two roots share one persistent live region");
                await page.locator("[data-daily-reminder-close]").click();
                await page.locator("#tab [data-reminder-center-link]").focus();
                await page.keyboard.press("Enter");
                assert.equal(await page.locator("#dock [data-priority-reminder]").count(), 1, "tab navigation preserves the dock's Today page");
                assert.equal(await page.locator("#tab .lc-checkin__reminder-center").count(), 1);
                assert.equal(await page.evaluate(() => document.querySelector("#tab .lc-checkin__reminder-center").contains(document.activeElement)), true);
                await page.screenshot({path: path.join(output, `tab-center-${width}-dark-en-US.png`)});
                await page.evaluate(async () => { await window.__plugin.onunload(); });
                assert.equal(await page.locator(".lc-checkin__reminder-announcer").count(), 0);
                scenarios += 1;
                console.log(`ok ${scenarios} - ${width} simultaneous dock/tab: originating root, notification singleton and teardown`);
            } finally { await page.close(); }
        }
    } finally { await browser.close(); }
    console.log(`Reminder browser acceptance: ${scenarios} real-bundle scenarios passed. Screenshots: ${output}`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
