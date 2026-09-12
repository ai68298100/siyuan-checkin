/* T-021 无障碍审计：
   1) 交互元素必须有可访问名称（aria-label / 文本 / title / 关联 label）。
   2) 不允许 tabindex >= 1 的正向 tabindex。
   3) 文本/背景对比度 ≥ 4.5:1（大字 ≥ 3:1）。
   走查所有页面 × 双主题，输出违规清单；发现违规即非零退出。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
    const candidates = [
        process.env.CHECKIN_PLAYWRIGHT_MODULE,
        "playwright",
        "C:/Users/sunku/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ].filter(Boolean);
    for (const candidate of candidates) {
        try { return require(candidate); } catch {}
    }
    throw new Error("Playwright is unavailable. Set CHECKIN_PLAYWRIGHT_MODULE to its module path.");
}
const {chromium} = loadPlaywright();
const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || "D:/AI/Codex/siyuan-checkin";

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const violations = [];

    for (const dark of [false, true]) {
        const page = await browser.newPage({viewport: {width: 1280, height: 900}});
        await page.setContent(`<style>:root{${dark
            ? "--b3-theme-on-background:#dcdcdc;--b3-theme-on-surface-light:#9aa0a6;--b3-theme-background:#1e1e1e;--b3-theme-surface:#262626;--b3-theme-surface-lighter:#303030;--b3-border-color:#3a3a3a;--b3-theme-primary:#3575f0"
            : "--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#3575f0"};--b3-font-family:Arial,sans-serif}body{margin:8px;background:${dark ? "#1e1e1e" : "#fff"}}</style><main id="frame" style="width:1200px;height:820px;border:1px solid ${dark ? "#3a3a3a" : "#ddd"}"><div id="dock" style="width:100%;height:100%"></div></main>`);
        await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
        await page.evaluate((hostDark) => {
            const now = new Date();
            const previous = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10);
            window.__store = {
                version: 1,
                items: [
                    {id: "stretch", name: "晨间拉伸", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "morning", createdAt: now.toISOString()},
                    {id: "reading", name: "深度阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening", createdAt: now.toISOString()},
                    {id: "walk", name: "晚间散步", icon: "🚶", kind: "quantity", target: 5000, unit: "步", schedule: {type: "daily"}, createdAt: now.toISOString(), archived: true},
                ],
                events: [
                    {id: "e1", itemId: "stretch", occurredAt: now.toISOString(), value: 1, unit: "次", source: "manual"},
                    {id: "e2", itemId: "reading", occurredAt: now.toISOString(), value: 25, unit: "分钟", source: "manual", note: "第四章"},
                    {id: "e3", itemId: "reading", occurredAt: previous.toISOString(), value: 30, unit: "分钟", source: "manual"},
                ],
            };
            window.module = {exports: {}};
            window.siyuan = {config: {appearance: {mode: hostDark ? 1 : 0}, system: {appDir: "", os: "windows"}}};
            window.require = (name) => {
                if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
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
                    showMessage() {},
                };
            };
        }, dark ? 1 : 0);
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
        await page.waitForTimeout(200);

        const surfaceName = dark ? "dark" : "light";
        const auditName = (label) => `${surfaceName}: ${label}`;

        /* 收集当前 DOM 的可访问性违规。 */
        const auditDom = (surface) => {
            return page.evaluate((surfaceName) => {
                const container = document.querySelector(".lc-checkin");
                if (!container) return [{kind: "fatal", detail: "no .lc-checkin root"}];
                const visible = (el) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 2 || rect.height < 2) return false;
                    const style = getComputedStyle(el);
                    return style.visibility !== "hidden" && style.display !== "none";
                };
                const problems = [];
                /* 1. 交互元素的可访问名称。 */
                const interactive = container.querySelectorAll("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])");
                for (const el of interactive) {
                    if (!visible(el)) continue;
                    const tag = el.tagName.toLowerCase();
                    let name = el.getAttribute("aria-label") || "";
                    if (!name) {
                        const labelledby = el.getAttribute("aria-labelledby");
                        if (labelledby) name = labelledby.split(" ").map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
                    }
                    if (!name && tag === "input" && ["button", "submit", "reset"].includes(el.getAttribute("type") || "")) name = el.value || "";
                    if (!name) {
                        const label = el.closest("label");
                        if (label) name = label.textContent.trim();
                    }
                    if (!name && ["button", "a"].includes(tag)) name = (el.textContent || "").trim();
                    if (!name && el.getAttribute("title")) name = el.getAttribute("title");
                    if (!name && tag === "input" && ["checkbox", "radio", "range", "search", "text", "number", "date"].includes(el.getAttribute("type") || "")) {
                        /* switch/checkbox 由外层 label 提供名称，上面已覆盖；到这里仍未命名的才是问题。 */
                        name = "";
                    }
                    if (!name) {
                        problems.push({kind: "missing-name", tag, surface: surfaceName, detail: `${tag}.${el.className && typeof el.className === "string" ? el.className.split(" ")[0] : ""}`});
                    }
                }
                /* 2. 正向 tabindex。 */
                container.querySelectorAll("[tabindex]").forEach((el) => {
                    const value = Number(el.getAttribute("tabindex"));
                    if (value > 0) problems.push({kind: "positive-tabindex", surface: surfaceName, detail: `${el.tagName.toLowerCase()}[${value}]`});
                });
                /* 3. 对比度。 */
                const lum = (color) => {
                    const match = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
                    if (!match) return null;
                    if (match[4] !== undefined && Number(match[4]) === 0) return null;
                    const channel = (value) => {
                        const v = Number(value) / 255;
                        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                    };
                    return 0.2126 * channel(match[1]) + 0.7152 * channel(match[2]) + 0.0722 * channel(match[3]);
                };
                const backgroundOf = (el) => {
                    let node = el;
                    while (node && node !== document.documentElement) {
                        const style = getComputedStyle(node);
                        const bg = lum(style.backgroundColor);
                        if (bg !== null) return {lum: bg, node};
                        node = node.parentElement;
                    }
                    return {lum: 1, node: null};
                };
                const textEls = container.querySelectorAll("h1, h2, h3, strong, small, em, p, span, label, button, div:not(:has(*))");
                const seen = new Set();
                for (const el of textEls) {
                    if (!visible(el)) continue;
                    const own = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
                    if (!own) continue;
                    const text = (el.textContent || "").trim();
                    if (!text) continue;
                    const style = getComputedStyle(el);
                    const fg = lum(style.color);
                    if (fg === null) continue;
                    const bg = backgroundOf(el);
                    if (bg.lum === null) continue;
                    const ratio = (Math.max(fg, bg.lum) + 0.05) / (Math.min(fg, bg.lum) + 0.05);
                    const size = parseFloat(style.fontSize);
                    const bold = Number(style.fontWeight) >= 600;
                    const large = size >= 24 || (size >= 18.66 && bold);
                    const threshold = large ? 3 : 4.5;
                    if (ratio < threshold) {
                        const key = `${Math.round(ratio * 100)}|${style.color}|${style.fontSize}|${text.slice(0, 12)}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        problems.push({kind: "contrast", surface: surfaceName, detail: `${ratio.toFixed(2)}:1 @${size}px ${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""} "${text.slice(0, 16)}"`});
                    }
                }
                return problems;
            }, surfaceName).then((found) => {
                for (const problem of found) violations.push({...problem, surface: auditName(problem.surface || surface)});
            });
        };

        const clickNav = async (target) => {
            const rail = page.locator(`.lc-checkin__topnav [data-mobile-nav="${target}"]`);
            if (await rail.count() && await rail.isVisible().catch(() => false)) { await rail.click(); return; }
            const mobile = page.locator(`.lc-checkin__mobile-nav [data-mobile-nav="${target}"]`);
            if (await mobile.count() && await mobile.isVisible().catch(() => false)) { await mobile.click(); return; }
            await page.locator(`[data-action='${target}']`).first().evaluate((b) => b.click());
        };

        for (const target of ["today", "review", "occasions", "settings"]) {
            await clickNav(target);
            await page.waitForTimeout(160);
            await auditDom(target);
        }
        /* 归档（从回顾页头部进入，T-032）与复盘（从今日卡片复盘按钮进入）纳入审计（T-111）。 */
        await clickNav("review");
        await page.waitForTimeout(120);
        await clickNav("archived");
        await page.waitForTimeout(160);
        await auditDom("archived");
        await clickNav("today");
        await page.waitForTimeout(120);
        await page.locator("[data-action='insights']").first().evaluate((b) => b.click());
        await page.waitForTimeout(160);
        await auditDom("insights");
        /* 编辑器（新建） */
        await clickNav("today");
        await page.locator("[data-action='add']").first().evaluate((b) => b.click());
        await page.waitForTimeout(160);
        await auditDom("editor");
        await page.close();
    }

    await browser.close();

    const missingName = violations.filter((v) => v.kind === "missing-name");
    const positiveTab = violations.filter((v) => v.kind === "positive-tabindex");
    const contrast = violations.filter((v) => v.kind === "contrast");
    console.log(`accessibility audit: ${missingName.length} missing names, ${positiveTab.length} positive tabindex, ${contrast.length} contrast pairs (light+dark)`);
    for (const item of [...missingName, ...positiveTab].slice(0, 40)) console.log(`  [${item.kind}] ${item.surface} ${item.detail}`);
    const contrastSeen = new Set();
    for (const item of contrast) {
        const key = item.detail.replace(/"\S*"$/, "");
        if (contrastSeen.has(key)) continue;
        contrastSeen.add(key);
        console.log(`  [contrast] ${item.surface} ${item.detail}`);
        if (contrastSeen.size > 24) break;
    }
    /* 名称与 tabindex 必须零违规；对比度问题允许已知豁免数量内通过由阈值控制。 */
    assert.equal(missingName.length, 0, `interactive elements without accessible names: ${missingName.length}`);
    assert.equal(positiveTab.length, 0, `positive tabindex values: ${positiveTab.length}`);
    assert.ok(contrast.length <= Number(process.env.CHECKIN_A11Y_CONTRAST_BUDGET || 0),
        `contrast violations ${contrast.length} exceed budget`);
    console.log("Accessibility audit passed.");
})().catch((error) => { console.error(String(error && error.message || error)); process.exit(1); });
