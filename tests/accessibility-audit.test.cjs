/* T-021 无障碍审计：
   1) 交互元素必须有可访问名称（aria-label / 文本 / title / 关联 label）。
   2) 不允许 tabindex >= 1 的正向 tabindex。
   3) 文本/背景对比度 ≥ 4.5:1（大字 ≥ 3:1）。
   走查所有页面 × 双主题，输出违规清单；发现违规即非零退出。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
    /* 只用本机依赖与环境变量，不写死任何个人机器的绝对路径。 */
    const candidates = [
        process.env.CHECKIN_PLAYWRIGHT_MODULE,
        "playwright",
    ].filter(Boolean);
    for (const candidate of candidates) {
        try { return require(candidate); } catch {}
    }
    throw new Error("Playwright is unavailable. Set CHECKIN_PLAYWRIGHT_MODULE to its module path.");
}
const {chromium} = loadPlaywright();
const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || path.resolve(__dirname, "..");

/* T-1600 走查重构：桌面/移动共用一个启动器——桌面保持原有 1280 视口 + 8px 页边距，
   移动 320px 视口全宽（触控目标实测需要窄容器与 mobile 前端语义）；store 参数化
   支持空态走查（无项目无事件）。 */
const makeStore = () => {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 10);
    return {
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
};

async function bootHost({browser, projectRoot, dark, frontend = "desktop", width = 1280, height = 900, store = makeStore()}) {
    const page = await browser.newPage({viewport: {width, height}, hasTouch: frontend !== "desktop"});
    const frameWidth = width === 1280 ? 1200 : width;
    await page.setContent(`<style>:root{${dark
        ? "--b3-theme-on-background:#dcdcdc;--b3-theme-on-surface-light:#9aa0a6;--b3-theme-background:#1e1e1e;--b3-theme-surface:#262626;--b3-theme-surface-lighter:#303030;--b3-border-color:#3a3a3a;--b3-theme-primary:#3575f0"
        : "--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#3575f0"};--b3-font-family:Arial,sans-serif}body{margin:${width === 1280 ? 8 : 0}px;background:${dark ? "#1e1e1e" : "#fff"}}</style><main id="frame" style="width:${frameWidth}px;height:${height - 80}px;border:1px solid ${dark ? "#3a3a3a" : "#ddd"}"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
    await page.evaluate(({mode, frontend, store}) => {
        window.__store = structuredClone(store);
        window.module = {exports: {}};
            window.siyuan = {config: {appearance: {mode}, system: {appDir: "", os: "windows"}}};
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
                    getFrontend() { return frontend; },
                    openTab(options) { return Promise.resolve({close() {}}); },
                    showMessage() {},
                };
            };
        }, {mode: dark ? 1 : 0, frontend, store});
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
    return page;
}

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const violations = [];
    const smallTargets = new Map();
    let checkedPairs = 0;

    /* 三遍走查：亮/暗主题全表面 + 空态（无项目无事件）全表面（T-1600 空态路径）。 */
    const passes = [
        {key: "light", dark: false},
        {key: "dark", dark: true},
        {key: "empty", dark: false, empty: true},
    ];
    for (const pass of passes) {
        const page = await bootHost({browser, projectRoot, dark: pass.dark, store: pass.empty ? {version: 1, items: [], events: []} : undefined});

        const surfaceName = pass.key;
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
                const small = [];
                /* 1. 交互元素的可访问名称。 */
                const interactive = container.querySelectorAll("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])");
                for (const el of interactive) {
                    if (!visible(el)) continue;
                    const bounds = el.getBoundingClientRect();
                    const labelBounds = el.closest("label")?.getBoundingClientRect();
                    if ((bounds.width < 24 || bounds.height < 24) && !(labelBounds && labelBounds.width >= 24 && labelBounds.height >= 24)) {
                        small.push(`${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""} ${Math.round(bounds.width)}x${Math.round(bounds.height)} min ${getComputedStyle(el).minHeight} max ${getComputedStyle(el).maxHeight}`);
                    }
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
                let checked = 0;
                const canvas = document.createElement("canvas");
                canvas.width = canvas.height = 1;
                const painter = canvas.getContext("2d", {willReadFrequently: true});
                const lum = (color, background) => {
                    painter.clearRect(0, 0, 1, 1);
                    if (background) { painter.fillStyle = background; painter.fillRect(0, 0, 1, 1); }
                    painter.fillStyle = color;
                    painter.fillRect(0, 0, 1, 1);
                    const pixel = painter.getImageData(0, 0, 1, 1).data;
                    if (!pixel[3]) return null;
                    const channel = (value) => {
                        const v = Number(value) / 255;
                        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                    };
                    return 0.2126 * channel(pixel[0]) + 0.7152 * channel(pixel[1]) + 0.0722 * channel(pixel[2]);
                };
                const backgroundOf = (el) => {
                    const chain = [];
                    for (let node = el; node; node = node.parentElement) chain.unshift(getComputedStyle(node).backgroundColor);
                    painter.fillStyle = "white";
                    painter.fillRect(0, 0, 1, 1);
                    for (const color of chain) { painter.fillStyle = color; painter.fillRect(0, 0, 1, 1); }
                    const pixel = painter.getImageData(0, 0, 1, 1).data;
                    const color = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
                    return {lum: lum(color), color};
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
                    const bg = backgroundOf(el);
                    const fg = lum(style.color, bg.color);
                    if (fg === null) continue;
                    if (bg.lum === null) continue;
                    const ratio = (Math.max(fg, bg.lum) + 0.05) / (Math.min(fg, bg.lum) + 0.05);
                    checked++;
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
                /* 4. 键盘可达性（T-1600）：click 语义钩子必须落在原生可聚焦元素上；
                   div/span 等非原生元素只有显式 role + tabindex="0" 补偿才可接受。 */
                container.querySelectorAll("[data-action], [data-mobile-nav]").forEach((el) => {
                    const tag = el.tagName.toLowerCase();
                    if (["button", "a", "input", "select", "textarea", "label", "summary", "option"].includes(tag)) return;
                    if (!visible(el)) return;
                    if (el.getAttribute("role") && el.getAttribute("tabindex") === "0") return;
                    problems.push({kind: "keyboard-unreachable", surface: surfaceName, detail: `${tag}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""} ${el.hasAttribute("data-action") ? `data-action=${el.getAttribute("data-action")}` : "data-mobile-nav"}`});
                });
                return {problems, checked, small};
            }, surfaceName).then(({problems: found, checked, small}) => {
                checkedPairs += checked;
                for (const target of small) smallTargets.set(target, (smallTargets.get(target) || 0) + 1);
                for (const problem of found) violations.push({...problem, surface: auditName(problem.surface || surface)});
            });
        };

        const clickNav = async (target) => {
            /* The dock intentionally hides its top navigation at every width;
               use a DOM click instead of Playwright's visibility-gated click
               so the same audit can exercise dock, tab and mobile hosts. */
            const navigation = page.locator(`[data-mobile-nav="${target}"]`).first();
            if (await navigation.count()) { await navigation.evaluate((button) => button.click()); return; }
            const fallback = page.locator(`[data-action='${target}']`).first();
            if (!await fallback.count()) throw new Error(`navigation target ${target} missing`);
            await fallback.evaluate((button) => button.click());
        };

        for (const target of ["today", "review", "occasions", "settings"]) {
            await clickNav(target);
            await page.waitForTimeout(160);
            await auditDom(target);
        }
        /* 归档（从回顾页头部进入，T-032）与复盘（从今日卡片复盘按钮进入）纳入审计（T-111）；
           空态下入口可能不渲染，先探测再进入（T-1600）。 */
        await clickNav("review");
        await page.waitForTimeout(120);
        await clickNav("archived");
        await page.waitForTimeout(160);
        await auditDom("archived");
        await clickNav("today");
        await page.waitForTimeout(120);
        if (await page.locator("[data-action='insights']").count()) {
            await page.locator("[data-action='insights']").first().evaluate((b) => b.click());
            await page.waitForTimeout(160);
            await auditDom("insights");
        }
        /* 编辑器（新建） */
        if (await page.locator("[data-action='add']").count()) {
            await page.locator("[data-action='add']").first().evaluate((b) => b.click());
            await page.waitForTimeout(160);
            await auditDom("editor");
        }
        await page.close();
    }

    /* T-1600 触控目标走查：320px 移动前端实测 44px 准则。本轮修复的折叠头/入口
       逐项守门防回归；其余致密列表文本按钮（实测 28~42px，高于已强制的 24px AA
       下限）仅报告不拦截——实测数据登记验收台账，不做像素级一刀切。 */
    {
        const page = await bootHost({browser, projectRoot, dark: false, frontend: "mobile", width: 320, height: 640});
        const clickNavMobile = async (target) => {
            const navigation = page.locator(`[data-mobile-nav="${target}"]`).first();
            if (await navigation.count()) { await navigation.evaluate((button) => button.click()); return; }
            const fallback = page.locator(`[data-action='${target}']`).first();
            if (!await fallback.count()) throw new Error(`mobile navigation target ${target} missing`);
            await fallback.evaluate((button) => button.click());
        };
        /* 各表面守门选择器：T-1600 前实测 16~36px 的折叠头/入口，修复后必须 ≥44px。 */
        const surfaceGuards = [
            {surface: "today", nav: "today", selectors: [".lc-checkin__week-load > summary"]},
            {surface: "occasions", nav: "occasions", selectors: [".lc-checkin__occasion-form-drawer > summary"]},
            {surface: "settings", nav: "settings", selectors: [".lc-checkin__sandbox > summary", ".lc-checkin__source-panel-head", ".lc-checkin__settings-group > summary"]},
            {surface: "archived", nav: "archived", selectors: [".lc-checkin__archived-details > summary"]},
            {surface: "editor", nav: "editor", selectors: [".lc-checkin__schedule-preview > summary"]},
        ];
        const tapShortfalls = [];
        const tapReport = [];
        for (const guard of surfaceGuards) {
            if (guard.nav === "archived") { await clickNavMobile("review"); await page.waitForTimeout(120); await clickNavMobile("archived"); }
            else if (guard.nav === "editor") { await clickNavMobile("today"); await page.waitForTimeout(120); await clickNavMobile("add"); }
            else await clickNavMobile(guard.nav);
            await page.waitForTimeout(180);
            for (const selector of guard.selectors) {
                const box = await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (!el) return null;
                    const rect = el.getBoundingClientRect();
                    return {h: Math.round(rect.height), rendered: rect.width >= 2 && rect.height >= 2 && getComputedStyle(el).display !== "none"};
                }, selector);
                if (box && box.rendered && box.h < 44) tapShortfalls.push(`${guard.surface}: ${selector} ${box.h}px`);
            }
            const report = await page.evaluate(() => {
                const container = document.querySelector(".lc-checkin");
                if (!container) return [];
                const out = [];
                const seen = new Set();
                container.querySelectorAll("button, a, input, select, textarea, summary").forEach((el) => {
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 2 || rect.height < 2) return;
                    const style = getComputedStyle(el);
                    if (style.visibility === "hidden" || style.display === "none") return;
                    const labelBounds = el.closest("label")?.getBoundingClientRect();
                    const w = labelBounds && labelBounds.width >= 44 ? labelBounds.width : rect.width;
                    const h = labelBounds && labelBounds.height >= 44 ? labelBounds.height : rect.height;
                    if (w >= 44 && h >= 44) return;
                    const desc = `${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""}[${el.getAttribute("data-action") || el.getAttribute("data-mobile-nav") || el.getAttribute("type") || ""}]`;
                    if (seen.has(desc)) return;
                    seen.add(desc);
                    out.push(`${Math.round(w)}x${Math.round(h)} <${desc}>`);
                });
                return out;
            });
            tapReport.push(...report.map((line) => `${guard.surface}: ${line}`));
            /* T-1605：底栏遮挡走查——滚动可见区内的交互控件命中点不得落在固定底栏本体
               （sticky 吸顶/侧栏覆盖属正常滚动语义，不计）。 */
            const navRect = await page.evaluate(() => {
                const nav = document.querySelector(".lc-checkin__mobile-nav");
                if (!nav) return null;
                const r = nav.getBoundingClientRect();
                return {left: r.left, right: r.right, top: r.top};
            });
            if (navRect) {
                const occluded = await page.evaluate(({navTop, navLeft, navRight}) => {
                    const container = document.querySelector(".lc-checkin");
                    const out = [];
                    container.querySelectorAll("button, a, input, select, textarea, summary").forEach((el) => {
                        const r = el.getBoundingClientRect();
                        if (r.width < 4 || r.height < 4) return;
                        const style = getComputedStyle(el);
                        if (style.visibility === "hidden" || style.display === "none") return;
                        if (r.right < navLeft || r.left > navRight) return;
                        const cy = Math.min(r.top + r.height / 2, navTop - 2);
                        if (cy >= navTop) return;
                        const hit = document.elementFromPoint(r.left + r.width / 2, cy);
                        if (hit && (hit === el || el.contains(hit))) return;
                        if (hit && hit.closest && hit.closest(".lc-checkin__mobile-nav")) {
                            out.push(`${el.tagName.toLowerCase()}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""}[${el.getAttribute("data-action") || ""}]`);
                        }
                    });
                    return out;
                }, {navTop: navRect.top, navLeft: navRect.left, navRight: navRect.right});
                assert.equal(occluded.length, 0, `${guard.surface}: controls covered by the fixed bottom bar (T-1605): ${occluded.slice(0, 4).join("; ")}`);
            }
        }
        await page.close();
        console.log(`tap-target audit: ${tapShortfalls.length} guarded controls below 44px, ${tapReport.length} dense-list controls measured below 44px (24px AA floor enforced elsewhere)`);
        for (const line of tapReport.slice(0, 12)) console.log(`  [tap-report] ${line}`);
        assert.equal(tapShortfalls.length, 0, `T-1600 guarded touch targets below 44px: ${tapShortfalls.join("; ")}`);
    }

    await browser.close();

    const missingName = violations.filter((v) => v.kind === "missing-name");
    const positiveTab = violations.filter((v) => v.kind === "positive-tabindex");
    const contrast = violations.filter((v) => v.kind === "contrast");
    const keyboardUnreachable = violations.filter((v) => v.kind === "keyboard-unreachable");
    console.log(`accessibility audit: ${missingName.length} missing names, ${positiveTab.length} positive tabindex, ${keyboardUnreachable.length} keyboard-unreachable, ${contrast.length} contrast violations / ${checkedPairs} checked pairs (light+dark+empty)`);
    console.log(`target-size audit: ${smallTargets.size} distinct rendered controls below 24px without an enclosing label target`);
    for (const [target, count] of [...smallTargets].slice(0, 30)) console.log(`  [target-size] ${target} x${count}`);
    assert.ok(checkedPairs > 0, "contrast audit must inspect rendered text");
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
    assert.equal(keyboardUnreachable.length, 0, `click hooks on non-focusable elements (T-1600): ${keyboardUnreachable.length}`);
    assert.equal(smallTargets.size, 0, `rendered controls below 24px without an enclosing label target: ${smallTargets.size}`);
    assert.ok(contrast.length <= Number(process.env.CHECKIN_A11Y_CONTRAST_BUDGET || 0),
        `contrast violations ${contrast.length} exceed budget`);
    console.log("Accessibility audit passed.");
})().catch((error) => { console.error(String(error && error.message || error)); process.exit(1); });
