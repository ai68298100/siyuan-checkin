/* 8.0 P2 performance baseline: render the today surface against a 10k-event
   store and assert the render completes quickly with no horizontal overflow.
   Skips gracefully when no browser is available (structural tests still run). */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

function findBrowser() {
    if (process.env.CHECKIN_BROWSER && fs.existsSync(process.env.CHECKIN_BROWSER)) return process.env.CHECKIN_BROWSER;
    const candidates = [
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ];
    return candidates.find((candidate) => fs.existsSync(candidate));
}

const browserPath = findBrowser();
if (!browserPath) {
    console.log("8.0 performance benchmark skipped: no Chromium/Edge found (set CHECKIN_BROWSER).");
    process.exit(0);
}

let chromium;
try {
    chromium = require("C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright").chromium;
} catch {
    try { chromium = require("playwright").chromium; } catch { console.log("8.0 performance benchmark skipped: playwright unavailable."); process.exit(0); }
}

const distCss = path.join(projectRoot, "dist", "index.css");
const distJs = path.join(projectRoot, "dist", "index.js");
assert.ok(fs.existsSync(distCss) && fs.existsSync(distJs), "run pnpm run build before the performance benchmark");

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: browserPath});
    const page = await browser.newPage({viewport: {width: 420, height: 760}});
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setContent(`<style>:root{--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb}body{margin:8px}</style><main id="frame" style="width:400px;height:720px"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: distCss});
    await page.evaluate(() => {
        window.module = {exports: {}};
        window.require = (name) => name === "siyuan" ? {
            Plugin: class {
                addIcons() {}
                addDock(options) { window.__dockOptions = options; }
                addTab() {}
                addTopBar() {}
                addCommand() {}
                loadData() {
                    const now = Date.now();
                    const items = [];
                    for (let index = 0; index < 40; index += 1) {
                        items.push({id: `item-${index}`, name: `项目${index}`, icon: "✓", kind: index % 2 ? "count" : "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: index % 3 === 0 ? "健康" : index % 3 === 1 ? "学习" : "生活", createdAt: new Date(now - index * 86400000).toISOString()});
                    }
                    const events = [];
                    for (let index = 0; index < 10000; index += 1) {
                        const day = index % 400;
                        const date = new Date(now - day * 86400000);
                        const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
                        events.push({id: `event-${index}`, itemId: `item-${index % 40}`, occurredAt: date.toISOString(), localDate: key, value: 1, unit: "次", source: "manual"});
                    }
                    return Promise.resolve({version: 1, items, events});
                }
                saveData() { return Promise.resolve(); }
            },
            getFrontend: () => "desktop",
            openTab() {},
            showMessage() {},
            Dialog: class {},
        } : (() => { throw new Error(name); })();
    });
    await page.addScriptTag({path: distJs});
    const renderMs = await page.evaluate(async () => {
        const PluginClass = window.module.exports.default || window.module.exports;
        const plugin = new PluginClass();
        plugin.onload();
        window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await plugin.onLayoutReady();
        const start = performance.now();
        plugin.render();
        return performance.now() - start;
    });
    const overflow = await page.evaluate(() => {
        const layout = document.querySelector(".lc-checkin__layout");
        return layout ? layout.scrollWidth - layout.clientWidth : -1;
    });
    const eventCount = await page.evaluate(() => window.siyuanCheckin.getEvents().length);
    await page.screenshot({path: path.join(projectRoot, ".artifacts", "perf-10k.png")});
    await browser.close();

    assert.equal(eventCount, 10000, "fixture loads 10k events");
    assert.ok(renderMs < 3000, `today render with 10k events must stay under 3s (took ${Math.round(renderMs)}ms)`);
    assert.ok(overflow <= 0, `no horizontal overflow under load (overflow=${overflow}px)`);
    assert.equal(pageErrors.length, 0, "no page errors under load");
    console.log(`8.0 performance benchmark passed: 10k events, full render ${Math.round(renderMs)}ms, overflow ${overflow}px.`);
})().catch((error) => { console.error(error); process.exit(1); });
