/* Geometric acceptance for R01–R03, against the actual production bundle.
 * Run pnpm run build:check first (no ZIP), then this file with CHECKIN_BROWSER.
 * Real SVG matrices, glyph bounds and observer disposal are measured: a
 * width:100% wrapper or a matching CSS selector alone cannot pass. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {chromium} = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const theme = process.env.CHECKIN_QA_THEME || "light";
const output = path.join(projectRoot, ".artifacts", theme === "dark" ? "review-layout-regression-dark" : "review-layout-regression");
const evidence = [];

(async () => {
    fs.mkdirSync(output, {recursive: true});
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const page = await browser.newPage({viewport: {width: 2040, height: 1100}});
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
        await page.setContent('<style>body{margin:0;font-family:Arial}#dock{height:100%;width:100%}</style><main id="frame" style="width:2000px;height:1000px"><div id="dock"></div></main>');
        await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
        await page.evaluate(() => {
            const NativeResizeObserver = window.ResizeObserver;
            window.__chartTargets = new Set();
            window.ResizeObserver = class extends NativeResizeObserver {
                targets = new Set();
                observe(target, options) { super.observe(target, options); this.targets.add(target); if (target.matches("svg[data-responsive-chart]")) window.__chartTargets.add(target); }
                unobserve(target) { super.unobserve(target); this.targets.delete(target); window.__chartTargets.delete(target); }
                disconnect() { super.disconnect(); this.targets.forEach(target => window.__chartTargets.delete(target)); this.targets.clear(); }
            };
            const now = new Date();
            const createdAt = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
            const items = [
                {id: "water", name: "喝水", kind: "quantity", target: 2000, unit: "ml", icon: "💧"},
                {id: "stretch", name: "拉伸", kind: "duration", target: 10, unit: "分钟", icon: "🧘"},
            ].map(item => ({...item, schedule: {type: "daily"}, createdAt}));
            const events = [];
            for (let day = 0; day < 90; day++) {
                const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 12);
                items.forEach((item, index) => events.push({id: `record-${day}-${index}`, itemId: item.id,
                    occurredAt: date.toISOString(), value: index ? 10 : 300, unit: item.unit, source: "manual",
                    note: index ? "带两行说明的记录，用于验证不同高度行的垂直居中。" : ""}));
            }
            window.__store = {version: 1, items, events};
            window.module = {exports: {}};
            window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
            window.require = name => {
                if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
                return {
                    Plugin: class {
                        addIcons() {} addTopBar() {} addCommand() {} addTab() {}
                        addDock(options) { window.__dockOptions = options; }
                        async loadData(name) { return name === "checkin-store" ? structuredClone(window.__store) : ""; }
                        async saveData() {}
                    },
                    getFrontend: () => "desktop", openTab: async () => ({close() {}}), showMessage() {},
                };
            };
        });
        await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
        await page.evaluate(async theme => {
            const Plugin = window.module.exports.default || window.module.exports;
            const plugin = window.__plugin = new Plugin();
            plugin.onload();
            window.__dockOptions.init.call({element: document.querySelector("#dock")});
            await plugin.onLayoutReady();
            plugin.appearance = theme;
            plugin.summaryRange = "month";
            plugin.historyScope = "period";
            plugin.showReview();
        }, theme);
        const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const render = async (workspace, trend = "weekly") => {
            await page.evaluate(({workspace, trend}) => {
                const plugin = window.__plugin;
                plugin.reviewWorkspace = workspace;
                plugin.reviewTrend = trend;
                plugin.reviewFoldTouched = true;
                plugin.reviewFoldSections = new Set(["trend", "heatmap", "strength", "projects"]);
                plugin.render();
            }, {workspace, trend});
            await settle();
        };
        const measure = label => page.evaluate(label => {
            const rect = element => element.getBoundingClientRect();
            const root = document.querySelector(".lc-checkin--review");
            const panel = root.querySelector("[data-review-workspace-panel]");
            const period = root.querySelector(".lc-checkin__layout > .review-scope-note");
            const panelBox = rect(panel), periodBox = rect(period);
            const rowOffsets = [...root.querySelectorAll(".lc-checkin__history-event")].map(row => {
                const value = row.querySelector(".lc-checkin__history-event-value");
                const actions = row.querySelector(".lc-checkin__history-event-actions");
                const v = rect(value), a = rect(actions);
                const sameRow = getComputedStyle(actions).gridRowStart === "1";
                return {sameRow, offset: Math.abs(v.y + v.height / 2 - a.y - a.height / 2)};
            });
            const charts = [...root.querySelectorAll("svg[data-responsive-chart]")].map(svg => {
                const box = rect(svg), matrix = svg.getScreenCTM();
                const scale = Math.hypot(matrix.a, matrix.b);
                const hostScale = box.width / parseFloat(getComputedStyle(svg).width);
                const labels = [...svg.querySelectorAll("text")].map(text => {
                    const r = rect(text);
                    return {text: text.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                        font: parseFloat(getComputedStyle(text).fontSize) * scale / hostScale};
                });
                const dates = [...svg.querySelectorAll(".lc-chart-label")].map(rect);
                const grid = svg.querySelector(".lc-chart-grid");
                const plot = svg.querySelector("polyline");
                return {width: box.width, height: box.height, viewWidth: svg.viewBox.baseVal.width,
                    cssWidth: parseFloat(getComputedStyle(svg).width), scale: scale / hostScale,
                    fillRatio: box.width / rect(svg.parentElement).width,
                    rightGap: grid ? box.right - rect(grid).right : null, hostScale,
                    plotEdgeError: plot && grid ? Math.max(Math.abs(rect(plot).left - rect(grid).left), Math.abs(rect(plot).right - rect(grid).right)) : 0,
                    fonts: labels.map(label => label.font),
                    overflow: labels.filter(label => label.left < box.left - 1 || label.right > box.right + 1 || label.top < box.top - 1 || label.bottom > box.bottom + 1),
                    overlaps: dates.slice(1).filter((date, index) => date.left < dates[index].right + 4).length};
            });
            const heatmap = root.querySelector(".lc-yearheatmap");
            const heatmapScroll = root.querySelector(".lc-checkin__yearheatmap-scroll");
            return {label, workspace: panel.dataset.reviewWorkspacePanel, periodOffset: Math.abs(periodBox.left - panelBox.left), periodWidthOffset: Math.abs(periodBox.width - panelBox.width),
                rowOffsets, charts, observed: window.__chartTargets.size,
                heatmap: heatmap ? {width: rect(heatmap).width, available: rect(heatmapScroll).width, months: heatmap.querySelectorAll("text").length,
                    bodyOverflow: document.documentElement.scrollWidth > innerWidth} : null};
        }, label);
        const check = result => {
            evidence.push(result);
            assert.ok(result.periodOffset <= 1, `${result.label}: period left offset ${result.periodOffset}`);
            assert.ok(result.periodWidthOffset <= 1, `${result.label}: period width offset ${result.periodWidthOffset}`);
            if (result.workspace === "records") assert.ok(result.rowOffsets.length > 0, "record checks need populated rows");
            if (result.workspace === "analysis") assert.equal(result.charts.length, 2, "trend and average/individual strength charts are both measured");
            for (const row of result.rowOffsets.filter(row => row.sameRow)) assert.ok(row.offset <= 1, `${result.label}: record value vertical offset ${row.offset}`);
            for (const chart of result.charts) {
                assert.ok(Math.abs(chart.viewWidth - chart.cssWidth) <= 1, `${result.label}: coordinate width must track actual SVG width`);
                assert.ok(Math.abs(chart.scale - 1) < .01, `${result.label}: glyphs must not scale with viewBox`);
                assert.ok(chart.fillRatio > .85, `${result.label}: chart must fill card width`);
                if (chart.rightGap !== null) assert.ok(chart.rightGap / chart.hostScale <= 13, `${result.label}: graph right gap ${chart.rightGap}`);
                assert.ok(chart.plotEdgeError / chart.hostScale <= .1, `${result.label}: data must span the entire axis width`);
                assert.ok(chart.fonts.every(font => font >= 11.5 && font <= 12.5), `${result.label}: readable stable fonts ${chart.fonts}`);
                assert.deepEqual(chart.overflow, [], `${result.label}: glyphs remain inside chart`);
                assert.equal(chart.overlaps, 0, `${result.label}: date labels must not overlap`);
            }
            assert.equal(result.observed, result.charts.length, `${result.label}: old chart observers must be disposed`);
            if (result.heatmap) {
                assert.ok(result.heatmap.width >= result.heatmap.available - 1, `${result.label}: year heatmap fills wide cards`);
                assert.equal(result.heatmap.months, 16, "all twelve months and four weekday labels remain");
                assert.equal(result.heatmap.bodyOverflow, false, "narrow heatmap scroll stays inside host");
            }
        };
        for (const width of [2000, 1180, 720, 640, 360, 320, 280]) {
            await page.setViewportSize({width: width + 40, height: 1100});
            await page.locator("#frame").evaluate((frame, width) => { frame.style.width = `${width}px`; }, width);
            for (const workspace of ["overview", "records", "analysis"]) {
                await render(workspace);
                check(await measure(`${workspace}-${width}`));
                if ([2000, 720, 280].includes(width)) {
                    await page.screenshot({path: path.join(output, `${workspace}-${width}.png`)});
                    if (workspace === "analysis") {
                        await page.locator(".lc-checkin__year-heatmap").screenshot({path: path.join(output, `heatmap-${width}.png`)});
                        await page.locator(".lc-checkin__strength-overview").screenshot({path: path.join(output, `strength-${width}.png`)});
                    }
                }
            }
            for (const trend of ["monthly", "daily", "yearly"]) {
                await render("analysis", trend);
                check(await measure(`${trend}-${width}`));
            }
            await page.evaluate(() => { window.__plugin.reviewStrengthItemId = "water"; });
            await render("analysis");
            check(await measure(`individual-strength-${width}`));
            await page.evaluate(() => { window.__plugin.reviewStrengthItemId = ""; });
        }
        // Resize the same SVG rather than re-rendering: this proves the observer
        // updates coordinates for dock resizing, including a zoomed host.
        for (const width of [1180, 320, 2000]) {
            await page.setViewportSize({width: Math.ceil(width * 1.25) + 40, height: 1100});
            await page.locator("#frame").evaluate((frame, width) => { frame.style.zoom = "1.25"; frame.style.width = `${width}px`; }, width);
            await settle();
            check(await measure(`live-resize-zoom-${width}`));
        }
        await page.evaluate(() => window.__plugin.showToday());
        await settle();
        assert.equal(await page.evaluate(() => window.__chartTargets.size), 0, "leaving review disposes every chart observer");
        assert.deepEqual(errors, [], "no browser errors");
        console.log(`Review layout regression passed: ${evidence.length} real-bundle geometry scenarios; R01–R03, font/label bounds, live zoomed resizing and observer cleanup.`);
    } finally {
        fs.writeFileSync(path.join(output, "geometry.json"), JSON.stringify({theme, evidence, errors}, null, 2));
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
