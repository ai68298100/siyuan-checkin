/* 一次性 UI 走查：全页面 × 宽度 × 主题 × 色板 截图，供逐张人工审查。 */
const path = require("node:path");
const fs = require("node:fs");

function loadPlaywright() {
    const candidates = [
        process.env.CHECKIN_PLAYWRIGHT_MODULE,
        "playwright",
        "C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ].filter(Boolean);
    for (const candidate of candidates) {
        try { return require(candidate); } catch {}
    }
    throw new Error("Playwright is unavailable.");
}
const {chromium} = loadPlaywright();
const projectRoot = "D:/AI/Codex/siyuan-checkin";
const outDir = path.join(projectRoot, ".artifacts", "ui-sweep");
fs.mkdirSync(outDir, {recursive: true});

const now = new Date();
const previous = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10);
const daysAgo3 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 15);
const SEEDED = {
    version: 1,
    items: [
        {id: "stretch", name: "晨间拉伸", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "morning", createdAt: now.toISOString()},
        {id: "reading", name: "深度阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening", createdAt: now.toISOString()},
        {id: "water", name: "喝水", icon: "💧", kind: "count", target: 8, unit: "杯", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "afternoon", createdAt: now.toISOString()},
        {id: "walk", name: "晚间散步", icon: "🚶", kind: "quantity", target: 5000, unit: "步", schedule: {type: "daily"}, group: "健康", priority: "low", timeSlot: "evening", createdAt: now.toISOString()},
        {id: "meditate", name: "冥想十分钟", icon: "🧘", kind: "duration", target: 10, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "medium", createdAt: now.toISOString()},
    ],
    events: [
        {id: "e1", itemId: "stretch", occurredAt: now.toISOString(), value: 1, unit: "次", source: "manual"},
        {id: "e2", itemId: "water", occurredAt: now.toISOString(), value: 3, unit: "杯", source: "manual"},
        {id: "e3", itemId: "reading", occurredAt: now.toISOString(), value: 25, unit: "分钟", source: "manual", note: "第四章"},
        {id: "e4", itemId: "reading", occurredAt: previous.toISOString(), value: 30, unit: "分钟", source: "manual"},
        {id: "e5", itemId: "meditate", occurredAt: daysAgo3.toISOString(), value: 10, unit: "分钟", source: "manual"},
        {id: "e6", itemId: "walk", occurredAt: daysAgo3.toISOString(), value: 5200, unit: "步", source: "manual"},
    ],
};

const SHIM = `
        window.__store = ${JSON.stringify(SEEDED)};
        window.module = {exports: {}};
        window.siyuan = {config: {appearance: {mode: __DARK__}, system: {appDir: "", os: "windows"}}};
        window.require = (name) => {
            if (name !== "siyuan") throw new Error("Unexpected external: " + name);
            return {
                Plugin: class {
                    addIcons() {}
                    addDock(options) { window.__dockOptions = options; }
                    addTab(options) { window.__tabOptions = options; }
                    addTopBar(options) { window.__topBarOptions = options; }
                    addCommand() {}
                    loadData() { return Promise.resolve(structuredClone(window.__store)); }
                    saveData(_name, value) { return new Promise((resolve) => setTimeout(() => { window.__store = structuredClone(value); resolve(); }, 10)); }
                },
                getFrontend() { return "desktop"; },
                openTab(options) { return Promise.resolve({close() {}}); },
                showMessage(message) { window.__messages = [...(window.__messages || []), message]; },
            };
        };`;

const THEME_TOKENS = (dark) => (dark
    ? "--b3-theme-on-background:#dcdcdc;--b3-theme-on-surface-light:#9aa0a6;--b3-theme-background:#1e1e1e;--b3-theme-surface:#262626;--b3-theme-surface-lighter:#303030;--b3-border-color:#3a3a3a;--b3-theme-primary:#3575f0"
    : "--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#3575f0");

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const jobs = [];
    for (const dark of [false, true]) {
        for (const width of [1280, 768, 390]) {
            jobs.push({dark, width});
        }
    }
    for (const palette of ["ocean", "forest", "sunset"]) {
        jobs.push({dark: false, width: 1280, palette});
    }

    for (const job of jobs) {
        const {dark, width} = job;
        const palette = job.palette || "lavender";
        const page = await browser.newPage({viewport: {width, height: 880}});
        const themeTag = dark ? "dark" : "light";
        const namePrefix = palette === "lavender" ? `${themeTag}-${width}` : `${themeTag}-${width}-${palette}`;
        await page.setContent(`<style>:root{${THEME_TOKENS(dark)};--b3-font-family:Arial,sans-serif}body{margin:8px;background:${dark ? "#1e1e1e" : "#fff"}}</style><main id="frame" style="width:${width}px;height:840px;border:1px solid ${dark ? "#3a3a3a" : "#ddd"}"><div id="dock" style="width:100%;height:100%"></div></main>`);
        await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
        await page.evaluate(SHIM.replace("__DARK__", dark ? "1" : "0"));
        await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
        await page.evaluate(async () => {
            const PluginClass = window.module.exports.default || window.module.exports;
            window.__plugin = new PluginClass();
            window.__plugin.onload();
            const readyPromise = window.siyuanCheckin.whenReady();
            window.__dockOptions.init.call({element: document.querySelector("#dock")});
            await window.__plugin.onLayoutReady();
            await readyPromise;
        });
        await page.waitForTimeout(180);

        const nav = async (target) => {
            await page.evaluate((target) => {
                const btn = document.querySelector(`.lc-checkin__rail [data-mobile-nav="${target}"]`)
                    || document.querySelector(`.lc-checkin__mobile-nav [data-mobile-nav="${target}"]`);
                if (btn) btn.click();
                else {
                    const action = document.querySelector(`[data-action='${target}']`);
                    if (action) action.click();
                }
            }, target);
            await page.waitForTimeout(170);
        };
        const shot = async (label) => {
            await page.screenshot({path: path.join(outDir, `${namePrefix}-${label}.png`)});
        };

        if (palette !== "lavender") {
            // 仅走查今日页的色板
            await page.evaluate((palette) => {
                document.querySelector(".lc-checkin").dataset.palette = palette;
            }, palette);
            await page.waitForTimeout(80);
            await shot("today");
            await page.close();
            continue;
        }

        await shot("today");
        // 完成第一项后再截一张（已完成折叠区）
        await page.evaluate(() => {
            const btn = document.querySelector(".lc-checkin--today .lc-checkin__item [data-action='toggle']");
            if (btn) btn.click();
        });
        await page.waitForTimeout(200);
        await shot("today-mixed");

        await nav("add");
        await shot("editor");
        await page.evaluate(() => {
            const popup = document.querySelector("[data-icon-popup] summary");
            if (popup) popup.click();
        });
        await page.waitForTimeout(120);
        await shot("editor-icon-popup");
        await nav("today");

        await nav("review");
        await shot("review-top");
        await page.evaluate(() => {
            document.querySelectorAll("details[data-review-fold]").forEach((d) => { d.open = true; });
        });
        await page.waitForTimeout(150);
        await shot("review-folds-open");
        await page.evaluate(() => {
            const fold = document.querySelector("details[data-review-fold]");
            if (fold) fold.scrollIntoView({block: "center"});
        });
        await page.waitForTimeout(120);
        await shot("review-folds-scrolled");

        await nav("occasions");
        await shot("occasions");

        await nav("settings");
        await shot("settings");
        await page.evaluate(() => {
            const navButton = document.querySelector("[data-settings-nav='shortcuts']");
            if (navButton) navButton.click();
        });
        await page.waitForTimeout(120);
        await shot("settings-shortcuts");

        await page.evaluate(() => {
            const archived = document.querySelector(".lc-checkin__rail [data-mobile-nav='archived'], [data-action='archived']");
            if (archived) archived.click();
        });
        await page.waitForTimeout(150);
        await shot("archived");

        await page.close();
    }
    await browser.close();
    console.log(`sweep done: ${fs.readdirSync(outDir).length} screenshots in .artifacts/ui-sweep`);
})().catch((error) => { console.error(String(error)); process.exit(1); });
