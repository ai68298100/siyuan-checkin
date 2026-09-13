#!/usr/bin/env node
/* 移动端视觉探针（诊断工具，非门槛）：按真机截图场景在 390px 渲染 今日/回顾/事项/编辑器 四页并截图。
   用法：CHECKIN_BROWSER=path/to/chrome node scripts/visual-probe.cjs [dark|light]
   输出：.artifacts/visual-probe/<页>-<主题>.png，用于人工核对布局问题。 */
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const theme = process.argv[2] === "light" ? "light" : "dark";
const outputDir = path.join(projectRoot, ".artifacts", "visual-probe");
fs.mkdirSync(outputDir, {recursive: true});

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const page = await browser.newPage({viewport: {width: 390, height: 844}, deviceScaleFactor: 2});
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.text().startsWith("probe:")) console.log(message.text()); });
    const themeTokens = theme === "dark"
        ? "--b3-theme-on-background:#dcdcdc;--b3-theme-on-surface-light:#9aa0a6;--b3-theme-background:#111112;--b3-theme-surface:#1c1c1f;--b3-theme-surface-lighter:#26262a;--b3-border-color:#313136;--b3-theme-primary:#8a70ff"
        : "--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#6b5ce7";
    await page.setContent(`<style>:root{${themeTokens};--b3-font-family:Arial,sans-serif}body{margin:0;background:${theme === "dark" ? "#111112" : "#fff"}}</style><main id="frame" style="width:390px;height:844px"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
    await page.evaluate((mode) => {
        const now = new Date();
        const day = (offset, hour, minute) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, hour, minute).toISOString();
        /* 场景对齐用户截图：重要组 3 个时长项、普通组含连续计数项与自定义项。 */
        window.__store = {
            version: 1,
            items: [
                {id: "deep", name: "深度工作", icon: "💻", kind: "duration", target: 90, unit: "分钟", schedule: {type: "daily"}, group: "重要", priority: "high", createdAt: now.toISOString()},
                {id: "read", name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "重要", priority: "high", createdAt: now.toISOString()},
                {id: "sport", name: "运动", icon: "🏃", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "重要", priority: "high", createdAt: now.toISOString()},
                {id: "read2", name: "阅读", icon: "📖", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "普通", priority: "medium", createdAt: now.toISOString()},
                {id: "draw", name: "画画", icon: "✏️", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "普通", priority: "medium", createdAt: now.toISOString()},
                {id: "run", name: "跑步", icon: "🏃", kind: "count", target: 4, unit: "次", schedule: {type: "daily"}, group: "普通", priority: "medium", createdAt: now.toISOString()},
                {id: "sleep", name: "早睡早起", icon: "☀️", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "普通", priority: "medium", createdAt: now.toISOString()},
                {id: "week", name: "周复盘", icon: "🧭", kind: "quantity", target: 30, unit: "单位", schedule: {type: "daily"}, group: "普通", priority: "medium", createdAt: now.toISOString()},
            ],
            events: [
                {id: "r1", itemId: "run", occurredAt: day(1, 8, 0), value: 1, unit: "次", source: "manual"},
                {id: "r2", itemId: "run", occurredAt: day(2, 8, 0), value: 2, unit: "次", source: "manual"},
            ],
        };
        window.module = {exports: {}};
        window.siyuan = {config: {appearance: {mode: mode === "dark" ? 1 : 0}, system: {appDir: "", os: "android"}}};
        window.require = (name) => {
            if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
            return {
                Dialog: class {
                    constructor(options) {
                        this.element = document.createElement("div");
                        this.element.className = "b3-dialog lc-checkin-dialog-host--mobile";
                        this.element.innerHTML = '<div class="b3-dialog__container lc-checkin-dialog" style="width:100%;height:100%"><div class="b3-dialog__body lc-checkin-dialog__body" style="height:100%"><div class="lc-checkin-dialog-host" style="width:100%;height:100%"></div></div></div>';
                        document.body.appendChild(this.element);
                    }
                    open() {}
                    destroy() { this.element.remove(); }
                    setDimensions() {}
                },
                Plugin: class {
                    addIcons() {}
                    addDock(options) { window.__dockOptions = options; }
                    addTab() {}
                    addTopBar() {}
                    addCommand() {}
                    loadData() { return Promise.resolve(structuredClone(window.__store)); }
                    saveData(_name, value) { window.__store = structuredClone(value); return Promise.resolve(); }
                },
                getFrontend() { return "mobile"; },
                openTab() { return Promise.resolve({close() {}}); },
                showMessage() {},
            };
        };
    }, theme);
    await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
    await page.evaluate(async () => {
        const PluginClass = window.module.exports.default || window.module.exports;
        window.__plugin = new PluginClass();
        await window.__plugin.onload();
        await window.__plugin.onLayoutReady();
        window.__plugin.toggleQuickDialog();
        await new Promise((resolve) => setTimeout(resolve, 600));
        console.log("probe: init state =", window.__plugin.initializationState, "| storageReady:", window.__plugin.storageReady);
    });
    const shots = [["today", ""], ["review", '[data-mobile-nav="review"]'], ["occasions", '[data-mobile-nav="occasions"]'], ["editor", '[data-mobile-nav="add"]']]; /* editor-fix */
    for (const [name, selector] of shots) {
        if (selector) {
            await page.evaluate((sel) => { document.querySelector(sel)?.dispatchEvent(new MouseEvent("click", {bubbles: true})); }, selector);
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        await page.screenshot({path: path.join(outputDir, `${name}-${theme}.png`), fullPage: false});
        /* 长页面再截一张全页，便于看折叠区以下的内容 */
        if (name === "review") await page.screenshot({path: path.join(outputDir, `${name}-${theme}-full.png`), fullPage: true});
    }
    await browser.close();
    if (errors.length) { console.error("页面错误:", errors); process.exit(1); }
    console.log(`探针完成 → ${outputDir} (${theme})`);
})().catch((error) => { console.error(error); process.exit(1); });
