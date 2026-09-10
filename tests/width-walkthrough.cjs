/* Multi-width layout walkthrough: today/review/editor/settings/occasions at
   full-screen, 80% dialog, medium, narrow-dock widths. */
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, ".artifacts", "width-walkthrough");
fs.mkdirSync(outputRoot, {recursive: true});

const cases = [
    {surface: "today", width: 2000},
    {surface: "review", width: 2000},
    {surface: "editor", width: 1600},
    {surface: "settings", width: 2000},
    {surface: "occasions", width: 2000},
    {surface: "today", width: 1180},
    {surface: "review", width: 1180},
    {surface: "today", width: 640},
    {surface: "review", width: 640},
    {surface: "editor", width: 1180},
    {surface: "today", width: 330},
    {surface: "review", width: 330},
];

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const page = await browser.newPage({viewport: {width: 2040, height: 1000}, deviceScaleFactor: 1});
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setContent(`<style>:root{--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#3575f0;--b3-font-family:Arial}body{margin:8px}</style><main id="frame" style="width:340px;height:720px;border:1px solid #ddd"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
    await page.evaluate(() => {
        const now = new Date();
        const today = (hour, minute) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).toISOString();
        window.__store = {
            version: 1,
            items: [
                {id: "stretch", name: "晨间拉伸", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "morning", createdAt: now.toISOString()},
                {id: "reading", name: "深度阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening", createdAt: now.toISOString()},
                {id: "water", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "afternoon", createdAt: now.toISOString()},
                {id: "walk", name: "晚间散步", icon: "🚶", kind: "quantity", target: 5000, unit: "步", schedule: {type: "daily"}, createdAt: now.toISOString(), archived: true},
            ],
            events: [
                {id: "e1", itemId: "stretch", occurredAt: today(7, 30), value: 1, unit: "次", source: "manual"},
                {id: "e2", itemId: "reading", occurredAt: today(9, 0), value: 15, unit: "分钟", source: "manual"},
                {id: "e3", itemId: "water", occurredAt: today(10, 0), value: 2, unit: "杯", source: "manual"},
            ],
            occasions: [{id: "o1", name: "妈妈生日", kind: "birthday", date: "2026-10-01", recurrence: "annual", remindBeforeDays: 30}],
        };
        window.module = {exports: {}};
        window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
        window.require = (name) => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {
                Plugin: class {
                    addIcons() {}
                    addDock(options) { window.__dockOptions = options; }
                    addTab(options) { window.__tabOptions = options; }
                    addTopBar() {}
                    addCommand() {}
                    loadData() { return Promise.resolve(structuredClone(window.__store)); }
                    saveData(_name, value) { return new Promise((resolve) => setTimeout(() => { window.__store = structuredClone(value); resolve(); }, 10)); }
                },
                getFrontend() { return "desktop"; },
                openTab(options) { window.__openTabOptions = options; return Promise.resolve({close() {}}); },
                showMessage(message) { window.__messages = [...(window.__messages || []), message]; },
            };
        };
    });
    await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
    await page.evaluate(async () => {
        const PluginClass = window.module.exports.default || window.module.exports;
        window.__plugin = new PluginClass();
        window.__plugin.onload();
        window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await window.__plugin.onLayoutReady();
    });
    if (pageErrors.length) console.log("PAGE ERRORS:", pageErrors);

    const goto = (surface) => page.evaluate((name) => {
        const plugin = window.__plugin;
        if (name === "today") plugin.showToday();
        else if (name === "review") plugin.showReview();
        else if (name === "editor") plugin.showEditor();
        else if (name === "settings") plugin.showSettings();
        else if (name === "occasions") plugin.showOccasions();
    }, surface);

    for (const {surface, width} of cases) {
        await page.setViewportSize({width: Math.max(width, 360) + 40, height: 1000});
        await page.locator("#frame").evaluate((element, w) => { element.style.width = `${w}px`; }, Math.max(width, 360));
        await goto(surface);
        await page.waitForTimeout(60);
        const overflow = await page.evaluate(() => {
            const layout = document.querySelector(".lc-checkin__layout");
            return layout ? {sw: layout.scrollWidth, cw: layout.clientWidth} : null;
        });
        await page.screenshot({path: path.join(outputRoot, `${surface}-${width}.png`)});
        console.log(`${surface}-${width}: overflow ${overflow ? overflow.sw + "/" + overflow.cw + (overflow.sw > overflow.cw ? " ⚠ H-OVERFLOW" : " ok") : "no layout"}`);
    }
    await browser.close();
})();
