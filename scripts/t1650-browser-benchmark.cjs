/* T-1650 offline production-bundle benchmark.
 *
 * This script never talks to a SiYuan kernel.  It boots the built plugin with
 * an in-memory host and measures the same render() path used by dock/tab
 * surfaces.  Run after `pnpm run build:check` (or `pnpm run build`):
 *
 *   node scripts/t1650-browser-benchmark.cjs
 *   T1650_EVENT_COUNT=100000 node scripts/t1650-browser-benchmark.cjs
 *
 * CHECKIN_BROWSER may point at Chromium/Edge.  The JSON report is written to
 * .artifacts/t1650-browser-benchmark.json (or T1650_OUTPUT).  No package
 * script is added so this opt-in measurement cannot make the regular test
 * chain depend on a particular browser installation.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const distCss = path.join(projectRoot, "dist", "index.css");
const distJs = path.join(projectRoot, "dist", "index.js");
const outputPath = process.env.T1650_OUTPUT
    ? path.resolve(process.env.T1650_OUTPUT)
    : path.join(projectRoot, ".artifacts", "t1650-browser-benchmark.json");
const requestedEventCount = Number(process.env.T1650_EVENT_COUNT || 10_000);
const eventCount = Number.isSafeInteger(requestedEventCount) && requestedEventCount > 0 && requestedEventCount <= 250_000
    ? requestedEventCount
    : 10_000;

function findBrowser() {
    if (process.env.CHECKIN_BROWSER && fs.existsSync(process.env.CHECKIN_BROWSER)) return process.env.CHECKIN_BROWSER;
    return [
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    ].find((candidate) => fs.existsSync(candidate));
}

function makeStore(totalEvents = eventCount) {
    const base = new Date("2026-10-06T12:00:00");
    const item = {
        id: "insight-item", name: "基准事项", icon: "✓", kind: "binary", target: 1, unit: "次",
        schedule: {type: "daily"}, group: "基准", createdAt: "2025-01-01T00:00:00.000Z",
        createdDate: "2025-01-01", revisions: [], archivePeriods: [],
    };
    const events = Array.from({length: totalEvents}, (_, index) => {
        const date = new Date(base);
        date.setDate(date.getDate() - (index % 450));
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return {id: `event-${index}`, itemId: item.id, occurredAt: date.toISOString(), localDate, value: 1, unit: "次", source: "manual"};
    });
    return {version: 1, items: [item], events, eventTombstones: []};
}

function loadPlaywright() {
    try { return require("playwright"); } catch {
        console.log("T-1650 browser benchmark skipped: playwright unavailable.");
        process.exit(0);
    }
}

const browserPath = findBrowser();
if (!browserPath) {
    console.log("T-1650 browser benchmark skipped: no Chromium/Edge found (set CHECKIN_BROWSER).");
    process.exit(0);
}
assert.ok(fs.existsSync(distCss) && fs.existsSync(distJs), "run pnpm run build:check before the T-1650 benchmark");
const {chromium} = loadPlaywright();

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)] || 0;
}

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: browserPath});
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const store = makeStore(eventCount);
    await page.setContent(`<style>:root{--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb}body{margin:0}#dock,#tab{width:620px;height:860px;display:inline-block;vertical-align:top;overflow:hidden}</style><main><div id="dock"></div><div id="tab"></div></main>`);
    await page.addStyleTag({path: distCss});
    await page.evaluate((initialStore) => {
        window.__t1650Store = initialStore;
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
                    loadData() { return Promise.resolve(JSON.parse(JSON.stringify(window.__t1650Store))); }
                    saveData() { return Promise.resolve(); }
                },
                getFrontend: () => "desktop",
                openTab: () => Promise.resolve({close() {}}),
                showMessage() {},
                fetchSyncPost: async () => ({code: 0, data: []}),
                Dialog: class {
                    constructor(options) { this.element = document.createElement("div"); this.element.innerHTML = options.content || ""; document.body.append(this.element); }
                    destroy() { this.element.remove(); }
                },
            };
        };
    }, store);
    await page.addScriptTag({path: distJs});
    const boot = await page.evaluate(async () => {
        const PluginClass = window.module.exports.default || window.module.exports;
        const plugin = new PluginClass();
        plugin.onload();
        const dock = document.querySelector("#dock");
        window.__dockOptions.init.call({element: dock});
        await plugin.onLayoutReady();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.__t1650Plugin = plugin;
        window.__t1650Dock = dock;
        window.__t1650Tab = document.querySelector("#tab");
        return {eventCount: plugin.store.events.length, itemCount: plugin.store.items.length};
    });
    assert.equal(boot.eventCount, eventCount, `benchmark fixture must load ${eventCount} events`);
    assert.equal(boot.itemCount, 1, "benchmark fixture must load the single insight item");

    const metrics = await page.evaluate(async (expectedEventCount) => {
        const plugin = window.__t1650Plugin;
        const dock = window.__t1650Dock;
        const tab = window.__t1650Tab;
        const waitTwoFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const medianInPage = (values) => {
            const sorted = [...values].sort((left, right) => left - right);
            return sorted[Math.floor(sorted.length / 2)] || 0;
        };
        const run = async (label, setup, renderAll = false) => {
            setup();
            if (renderAll) plugin.render(); else plugin.render(dock);
            await waitTwoFrames();
            const longTasks = [];
            const observer = PerformanceObserver.supportedEntryTypes.includes("longtask")
                ? new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((entry) => entry.duration))) : undefined;
            observer?.observe({type: "longtask"});
            const samples = [];
            for (let index = 0; index < 5; index += 1) {
                const start = performance.now();
                if (renderAll) plugin.render(); else plugin.render(dock);
                const renderMs = performance.now() - start;
                await waitTwoFrames();
                samples.push({renderMs, frameMs: performance.now() - start});
            }
            observer?.disconnect();
            const gridDays = dock.querySelectorAll("[data-insight-day]").length;
            const reviewRoots = document.querySelectorAll(".lc-checkin--review").length;
            return {
                label,
                renderMs: medianInPage(samples.map((sample) => sample.renderMs)),
                samples,
                maxLongTask: Math.max(0, ...longTasks),
                longTasks,
                gridDays,
                reviewRoots,
            };
        };
        const insights = await run("insights-366", () => {
            plugin.tabElement = undefined;
            plugin.setInsightsStateForRoot(dock, {insightsItemId: "insight-item", insightsReturnPage: "today", insightsRange: "custom", insightsCustomRange: {startDate: "2025-10-06", endDate: "2026-10-06"}, insightsItemQuery: ""});
            plugin.setPageForRoot("insights", dock);
        });
        const review = await run(`review-${expectedEventCount}`, () => {
            plugin.tabElement = undefined;
            plugin.setPageForRoot("review", dock);
            plugin.setReviewStateForRoot(dock, {reviewWorkspace: "overview", summaryRange: "month", historyPage: 0, historyQuery: ""});
        });
        const dualRoot = await run("dual-root", () => {
            plugin.tabElement = tab;
            plugin.setPageForRoot("insights", dock);
            plugin.setInsightsStateForRoot(dock, {insightsItemId: "insight-item", insightsRange: "custom", insightsCustomRange: {startDate: "2025-10-06", endDate: "2026-10-06"}});
            plugin.setPageForRoot("review", tab);
            plugin.setReviewStateForRoot(tab, {reviewWorkspace: "overview", summaryRange: "month", historyPage: 0});
        }, true);
        return {insights, review, dualRoot};
    }, eventCount);
    assert.equal(metrics.insights.gridDays, 366, `Insights fixture must render 366 day cells (got ${metrics.insights.gridDays})`);
    assert.equal(metrics.review.reviewRoots, 1, "review fixture must render one review root");
    assert.equal(metrics.dualRoot.gridDays, 366, "dual-root fixture must retain 366 insight cells");
    assert.equal(metrics.dualRoot.reviewRoots, 1, "dual-root fixture must render one review root");
    assert.equal(pageErrors.length, 0, `production bundle must not emit page errors: ${pageErrors.join("; ")}`);
    const report = {
        task: "T-1650",
        reportSchema: 1,
        measuredAt: new Date().toISOString(),
        environment: {node: process.version, platform: process.platform, arch: process.arch, cpuCount: os.cpus().length},
        browser: {
            executable: browserPath,
            userAgent: await page.evaluate(() => navigator.userAgent),
            hardwareConcurrency: await page.evaluate(() => navigator.hardwareConcurrency),
            deviceMemoryGiB: await page.evaluate(() => navigator.deviceMemory ?? null),
            viewport: {width: 1280, height: 900},
        },
        bundleBytes: {js: fs.statSync(distJs).size, css: fs.statSync(distCss).size},
        fixture: {events: store.events.length, items: store.items.length, insightsDays: 366},
        metrics,
        pageErrors,
        methodology: "production dist bundle; in-memory SiYuan host; five warmed synchronous render samples; two RAF waits between samples; median is sorted middle sample; longtask is diagnostic only",
    };
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`T-1650 browser benchmark passed (${eventCount} events): ${metrics.insights.renderMs.toFixed(1)}ms insights-366, ${metrics.review.renderMs.toFixed(1)}ms ${metrics.review.label}, ${metrics.dualRoot.renderMs.toFixed(1)}ms dual-root; report ${path.relative(projectRoot, outputPath)}.`);
    await browser.close();
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
