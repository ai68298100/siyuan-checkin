/* Real-bundle responsive acceptance: all main surfaces at desktop, tablet,
   narrow dock, portrait phone and short landscape sizes. */
const fs = require("node:fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const {chromium} = require("playwright");

const projectRoot = path.resolve(__dirname, "..");
const qaHost = process.env.CHECKIN_QA_HOST || "dock";
const qaTheme = process.env.CHECKIN_QA_THEME || "light";
const qaFrontend = process.env.CHECKIN_QA_FRONTEND || "desktop";
const outputRoot = path.join(projectRoot, ".artifacts", "width-walkthrough", `${qaHost}-${qaTheme}-${qaFrontend}`);
fs.mkdirSync(outputRoot, {recursive: true});

const surfaces = ["today", "review", "editor", "settings", "occasions", "insights", "archived"];
const cases = [
    {surface: "today", width: 2000},
    {surface: "review", width: 2000},
    {surface: "editor", width: 1600},
    {surface: "settings", width: 2000},
    {surface: "occasions", width: 2000},
    ...surfaces.flatMap(surface => [1180, 640, 360, 320].map(width => ({surface, width}))),
    {surface: "today", width: 330},
    {surface: "review", width: 330},
    ...surfaces.map(surface => ({surface, width: 844, height: 350, viewportHeight: 390})),
];

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    const page = await browser.newPage({viewport: {width: 2040, height: 1000}, deviceScaleFactor: 1});
    const pageErrors = [];
    const scenarioFailures = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setContent(`<style>:root{--b3-theme-on-background:#202124;--b3-theme-on-surface-light:#6f7378;--b3-theme-background:#fff;--b3-theme-surface:#f7f7f6;--b3-theme-surface-lighter:#eeeeec;--b3-border-color:#dededb;--b3-theme-primary:#3575f0;--b3-font-family:Arial}body{margin:8px}</style><main id="frame" style="width:340px;height:720px;border:1px solid #ddd"><div id="dock" style="width:100%;height:100%"></div></main>`);
    await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
    await page.evaluate(({frontend, language}) => {
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
        };
        // Occasions live in their own file; a field in checkin-store is ignored.
        window.__otherStores = {"checkin-occasions": {version: 1, occasions: [
            {id: "o1", name: "家人生日 — 一起准备礼物与晚餐 Family celebration", kind: "birthday", date: "2026-10-01", recurrence: "annual", remindBeforeDays: 30, note: "提前确认时间，并记录需要准备的事项。https://example.test/" + "long-reference-".repeat(8), enabled: true, completedDates: [], createdAt: now.toISOString(), updatedAt: now.toISOString()},
            {id: "o2", name: "每月账单核对与到期提醒", kind: "scheduled", date: "2026-01-01", recurrence: "monthly", remindBeforeDays: 3, note: "验证重复规则、日期、操作按钮在窄屏上都可读。", enabled: true, completedDates: [], createdAt: now.toISOString(), updatedAt: now.toISOString()},
            {id: "o3", name: "暂停中的纪念日", kind: "anniversary", date: "2026-11-03", recurrence: "annual", remindBeforeDays: 7, note: "", enabled: false, completedDates: [], createdAt: now.toISOString(), updatedAt: now.toISOString()},
        ]}};
        // T-1346：CHECKIN_QA_LANG=en-US 时以英文界面跑完整矩阵，审计英文文案布局。
        if (language) window.__otherStores["checkin-view-preferences"] = {pluginLanguage: language};
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
                    loadData(name) { return Promise.resolve(structuredClone(name === "checkin-store" ? window.__store : (window.__otherStores || {})[name] || "")); }
                    saveData(name, value) { return new Promise((resolve) => setTimeout(() => { if (name === "checkin-store") window.__store = structuredClone(value); else (window.__otherStores ||= {})[name] = structuredClone(value); resolve(); }, 10)); }
                },
                getFrontend() { return frontend; },
                openTab(options) { window.__openTabOptions = options; return Promise.resolve({close() {}}); },
                showMessage(message) { window.__messages = [...(window.__messages || []), message]; },
            };
        };
    }, {frontend: qaFrontend, language: process.env.CHECKIN_QA_LANG || ""});
    await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
    await page.evaluate(async ({host, theme}) => {
        const PluginClass = window.module.exports.default || window.module.exports;
        window.__plugin = new PluginClass();
        window.__plugin.onload();
        if (host === "tab") window.__tabOptions.init.call({element: document.querySelector("#dock"), tab: {close() {}}});
        else if (host === "dialog") {
            const root = document.querySelector("#dock");
            root.classList.add("lc-checkin-dialog-host");
            window.__plugin.quickDialogElement = root;
            window.__plugin.quickDialog = {destroy() {}};
            window.__plugin.render();
        }
        else window.__dockOptions.init.call({element: document.querySelector("#dock")});
        await window.__plugin.onLayoutReady();
        window.__plugin.appearance = theme;
        window.__plugin.render();
    }, {host: qaHost, theme: qaTheme});
    if (pageErrors.length) console.log("PAGE ERRORS:", pageErrors);

    const goto = (surface) => page.evaluate((name) => {
        const plugin = window.__plugin;
        if (name === "today") plugin.showToday();
        else if (name === "review") plugin.showReview();
        else if (name === "editor") plugin.showEditor();
        else if (name === "settings") plugin.showSettings();
        else if (name === "occasions") plugin.showOccasions();
        else if (name === "insights") plugin.showInsights(plugin.store.items.find(item => item.id === "reading"));
        else if (name === "archived") plugin.showArchived();
    }, surface);

    const waitForVisualStability = () => page.evaluate(() => new Promise((resolve, reject) => {
        const started = performance.now();
        let previousSurface;
        let previousSnapshot = '';
        let stableSince = started;
        const sample = () => {
            const now = performance.now();
            const host = document.querySelector('#dock');
            const surface = host?.querySelector('.lc-checkin');
            const nodes = [host, surface, ...(host?.querySelectorAll('.lc-checkin__group-items:not([hidden])') || [])].filter(Boolean);
            const bounds = nodes.map(node => {
                const box = node.getBoundingClientRect();
                return [box.x, box.y, box.width, box.height];
            });
            const painted = host && surface && surface.checkVisibility() && bounds.every(box => box[2] > 0 && box[3] > 0);
            const finiteAnimation = host?.getAnimations({subtree: true}).some(animation => animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime));
            const snapshot = JSON.stringify(bounds);
            if (!painted || finiteAnimation || surface !== previousSurface || snapshot !== previousSnapshot) stableSince = now;
            previousSurface = surface;
            previousSnapshot = snapshot;
            // Observe a quiet interval beyond the host's deferred resize work.
            // Replaced nodes and active finite transitions restart the interval.
            if (painted && !finiteAnimation && now - stableSince >= 120) return resolve();
            if (now - started >= 4000) return reject(new Error(`host did not reach a visible stable layout: ${JSON.stringify({painted, finiteAnimation, bounds})}`));
            requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
    }));
    const screenshot = async (options, target = page) => {
        // Failure artifacts should preserve even an unstable or blank result.
        if (!options.path.endsWith('-failed.png')) await waitForVisualStability();
        await target.screenshot({...options, animations: 'disabled'});
    };
    const waitForVisibleCards = async (expected) => {
        await page.waitForFunction(expectedCount => {
            const groups = [...document.querySelectorAll('.lc-checkin__group-items:not([hidden])')];
            const cards = groups.flatMap(group => [...group.querySelectorAll('.lc-checkin__item')]);
            return groups.length > 0 && cards.length === expectedCount && [...groups, ...cards].every(node => {
                const box = node.getBoundingClientRect();
                return node.checkVisibility() && box.width > 0 && box.height > 0;
            });
        }, expected, {timeout: 4000});
        await waitForVisualStability();
    };
    const sizeHost = async (width, height = 720, viewportHeight = 1000) => {
        await page.setViewportSize({width: width + 40, height: viewportHeight});
        await page.locator("#frame").evaluate((element, size) => {
            element.style.width = `${size.width}px`;
            element.style.height = `${size.height}px`;
        }, {width, height});
        await waitForVisualStability();
    };
    const assertLayout = async (label) => {
        const layout = await page.locator("#dock").evaluate(host => {
            const bounds = host.getBoundingClientRect();
            const failures = [];
            let visibleCandidates = 0;
            const candidates = host.querySelectorAll('button, input:not([type="hidden"]), select, textarea, summary, h1, h2, .lc-checkin__item, .lc-checkin__occasion-manager-row, .lc-checkin__settings-card');
            for (const element of candidates) {
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height || !element.checkVisibility()) continue;
                visibleCandidates += 1;
                // Pills, heatmaps and calendar strips may deliberately scroll
                // horizontally. Hidden overflow is NOT an exemption: an
                // oversized child clipped by its host is a real regression.
                let intentionalScroller = false;
                for (let parent = element.parentElement; parent && parent !== host; parent = parent.parentElement) {
                    const style = getComputedStyle(parent);
                    const box = parent.getBoundingClientRect();
                    if (/^(auto|scroll)$/.test(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1
                        && box.left >= bounds.left - 1 && box.right <= bounds.right + 1) {
                        intentionalScroller = true;
                        break;
                    }
                }
                if (!intentionalScroller && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)) {
                    failures.push({element: element.tagName.toLowerCase(), type: element.getAttribute('type'), name: element.getAttribute('name'), class: element.className, text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 60), left: Math.round(rect.left - bounds.left), right: Math.round(rect.right - bounds.left)});
                }
            }
            return {width: host.clientWidth, height: host.clientHeight, scrollWidth: host.scrollWidth, visibleCandidates, failures: failures.slice(0, 12)};
        });
        assert.ok(layout.width > 0 && layout.height > 0 && layout.visibleCandidates > 0, `${label}: layout must contain visible positive-size content ${JSON.stringify(layout)}`);
        assert.ok(layout.scrollWidth <= layout.width + 1, `${label}: host horizontal overflow ${JSON.stringify(layout)}`);
        assert.deepEqual(layout.failures, [], `${label}: content clipped beyond host ${JSON.stringify(layout)}`);
        return layout;
    };
    const assertEditorSaveReachable = async (label) => {
        const surface = page.locator('.lc-checkin--editor');
        for (const position of ['start', 'end']) {
            await surface.evaluate((element, edge) => {
                element.scrollTop = edge === 'end' ? element.scrollHeight : 0;
            }, position);
            await page.waitForTimeout(40);
            const geometry = await page.locator('.lc-checkin__save-button').evaluate(button => {
                const box = button.getBoundingClientRect();
                const host = document.querySelector('#dock').getBoundingClientRect();
                const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
                return {width: box.width, height: box.height, insideHost: box.left >= host.left - 1 && box.right <= host.right + 1 && box.top >= host.top - 1 && box.bottom <= host.bottom + 1, hit: hit === button || button.contains(hit)};
            });
            assert.ok(geometry.insideHost && geometry.hit && geometry.width >= 44 && geometry.height >= 36, `${label}/${position}: save must remain reachable ${JSON.stringify(geometry)}`);
        }
        await surface.evaluate(element => { element.scrollTop = 0; });
    };
    const showEditorPreview = async (preview, label) => {
        await waitForVisualStability();
        // A nearest-edge scroll can put the preview beneath the sticky save
        // rail. Center it in the scroll region before inspecting or capturing.
        await preview.evaluate(element => {
            element.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});
            const rail = document.querySelector('.lc-checkin__editor-actions').getBoundingClientRect();
            const surface = element.closest('.lc-checkin--editor');
            const remaining = element.getBoundingClientRect().bottom - rail.top + 12;
            if (remaining > 0) surface.scrollTop += remaining;
        });
        await waitForVisualStability();
        const visible = await preview.evaluate(element => {
            const box = element.getBoundingClientRect();
            const host = document.querySelector('#dock').getBoundingClientRect();
            const rail = document.querySelector('.lc-checkin__editor-actions').getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return {height: box.height, inside: box.top >= host.top && box.bottom <= Math.min(host.bottom, rail.top) + 1, hit: hit === element || element.contains(hit)};
        });
        assert.ok(visible.height > 0 && visible.inside && visible.hit, `${label}: the whole preview can be read above the save rail ${JSON.stringify(visible)}`);
    };
    const assertTextContrast = async (locator, label) => {
        await waitForVisualStability();
        const contrast = await locator.evaluate(element => {
            // Let the browser parse RGB/color-mix and composite the actual
            // ancestor backgrounds. This checks named controls, not a blanket
            // claim that every text/background pair has been audited.
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d', {willReadFrequently: true});
            const rgba = color => {
                ctx.clearRect(0, 0, 1, 1);
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, 1, 1);
                const pixel = ctx.getImageData(0, 0, 1, 1).data;
                return [pixel[0], pixel[1], pixel[2], pixel[3] / 255];
            };
            const composite = (front, back) => front.slice(0, 3).map((value, index) => value * front[3] + back[index] * (1 - front[3]));
            const layers = [];
            for (let node = element; node; node = node.parentElement) layers.push(rgba(getComputedStyle(node).backgroundColor));
            let background = [255, 255, 255];
            for (const layer of layers.reverse()) background = composite(layer, background);
            const foreground = composite(rgba(getComputedStyle(element).color), background);
            const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
            const light = luminance(foreground), dark = luminance(background);
            return {text: element.textContent, foreground, background, ratio: (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05)};
        });
        assert.ok(contrast.ratio >= 4.5, `${label}: text contrast must meet 4.5:1 ${JSON.stringify(contrast)}`);
    };

    if (process.env.CHECKIN_QA_CONTENT_AUDIT === '1') {
        await require('./ui-content-audit.cjs')({page, goto, sizeHost, waitForVisualStability, assertLayout, screenshot, outputRoot, qaTheme, qaHost, qaFrontend});
        await browser.close();
        assert.deepEqual(pageErrors, [], 'deep content audit must not raise page errors');
        return;
    }
    if (process.env.CHECKIN_QA_REVIEW_WORKSPACE === '1') {
        await require('./review-workspace-browser.cjs')({page, goto, sizeHost, waitForVisualStability, assertLayout, screenshot, outputRoot, qaTheme, qaHost, qaFrontend});
        await browser.close();
        assert.deepEqual(pageErrors, [], 'review workspaces must not raise page errors');
        return;
    }
    for (const {surface, width, height = 720, viewportHeight = 1000} of cases) {
        const label = `${surface}-${width}${height !== 720 ? `x${height}` : ''}`;
        try {
        await sizeHost(width, height, viewportHeight);
        await goto(surface);
        await waitForVisualStability();
        const topnav = page.locator('.lc-checkin__topnav');
        if (await topnav.count() && await topnav.isVisible()) {
            const chrome = await topnav.evaluate(element => {
                const bar = element.getBoundingClientRect();
                const host = document.querySelector('#dock').getBoundingClientRect();
                return {left: Math.abs(bar.left - host.left), right: Math.abs(bar.right - host.right)};
            });
            assert.ok(chrome.left <= 1 && chrome.right <= 1, `topbar must paint both corners ${JSON.stringify(chrome)}`);
        }
        const mobileMeta = page.locator('.lc-checkin__mobile-topbar .lc-checkin__topbar-meta');
        if (await mobileMeta.count() && await mobileMeta.isVisible()) {
            await assertTextContrast(mobileMeta, `${label}/mobile-topbar-progress`);
        }
        if (surface === 'review') {
            await page.locator('[data-review-workspace="overview"]').click();
            const comparison = page.locator('[data-review-fold="compare"]');
            if (await comparison.getAttribute('open') !== null) await comparison.locator(':scope > summary').click();
            assert.equal(await comparison.getAttribute('open'), null, 'comparison is secondary to the overview');
            const summary = comparison.locator(':scope > summary');
            await summary.focus();
            await page.keyboard.press('Enter');
            await page.waitForSelector('[data-review-fold="compare"]:not([data-review-lazy])');
            assert.equal(await comparison.locator('.lc-checkin__compare-stats > div:visible').count(), 3, 'keyboard expansion preserves all comparison metrics');
            assert.equal(await comparison.locator('.lc-checkin__compare-chart').isVisible(), true, 'comparison chart remains available on narrow surfaces');
            await assertLayout(`${label}/comparison-open`);
            if (width === 320 || width === 1180) await screenshot({path: path.join(outputRoot, `${label}-comparison-open.png`)});
            await summary.click();
            const disclosure = page.locator('[data-review-fold="report"]');
            assert.equal(await disclosure.getAttribute('open'), null, 'secondary review guidance starts folded');
            await disclosure.locator(':scope > summary').click();
            await page.waitForSelector('[data-review-fold="report"]:not([data-review-lazy])');
            assert.equal(await page.locator('[data-action="preview-agent-suggestion"]').isVisible(), true, 'guidance action remains accessible');
            await assertLayout(`${label}/guidance-open`);
            await disclosure.locator(':scope > summary').click();
        }
        if (surface === 'archived') {
            const selection = page.locator('[data-archived-select]').first();
            await selection.check();
            assert.equal(await page.locator('[data-archived-bulk-toolbar]').isVisible(), true, 'archive selection stays usable');
            await selection.uncheck();
            if (width < 720) {
                const sizes = await page.locator('.lc-checkin--archived .lc-checkin__history-row > button').evaluateAll(buttons => buttons.every(button => {
                    const box = button.getBoundingClientRect();
                    return box.width >= 44 && box.height >= 44;
                }));
                assert.equal(sizes, true, 'archive restore/delete touch targets stay reachable');
            }
        }
        if (surface === "today") {
            const names = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item-name').evaluateAll(elements => elements.map(element => ({text: element.textContent, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, parent: getComputedStyle(element.parentElement).cssText, flex: getComputedStyle(element).flex})));
            assert.ok(names.length > 0 && names.every(name => name.text.trim() && name.width > 20 && name.height >= 16), `names must stay readable at ${width}: ${JSON.stringify(names)}`);
            if (width < 720) {
                const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(elements => Math.max(...elements.map(element => element.getBoundingClientRect().height)));
                assert.ok(maxHeight > 0 && maxHeight <= 130, `${label}: even small lists must use visible compact phone cards (actual ${maxHeight}px)`);
            } else {
                const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(elements => Math.max(...elements.map(element => element.getBoundingClientRect().height)));
                assert.ok(maxHeight > 0 && maxHeight <= 200, `${label}: ordinary desktop cards must be visible and stay within 200px (actual ${maxHeight}px)`);
            }
        }
        if (surface === "editor") {
            if (width === 320 || width === 1180 || height < 500) {
                const summary = page.locator('[data-template-disclosure] > summary');
                assert.equal(await summary.isVisible(), true, 'template disclosure must not appear as an empty noninteractive pill');
                const summaryBox = await summary.boundingBox();
                assert.ok(summaryBox && summaryBox.height >= (width < 720 || qaFrontend === 'mobile' ? 43.75 : 35.75), `${label}: template disclosure target ${JSON.stringify(summaryBox)}`);
                await summary.click();
                /* T-1349/T-1346：分批显示与「最近使用」的运行时断言。 */
                const expander = page.locator('[data-action="template-show-all"]');
                assert.equal(await expander.isVisible(), true, 'batch expander must be visible before reveal');
                const visibleBefore = await page.locator('[data-template-list] [data-template-index]:not([hidden])').count();
                await expander.click();
                const visibleAfter = await page.locator('[data-template-list] [data-template-index]:not([hidden])').count();
                assert.ok(visibleAfter > visibleBefore, `${label}: show-all must reveal overflow templates (${visibleBefore} -> ${visibleAfter})`);
                assert.equal(await expander.isVisible(), false, 'expander must hide after reveal');
                const template = page.locator('[data-template-index]').first();
                const appliedIndex = await template.getAttribute('data-template-index');
                await template.click();
                assert.notEqual(await page.locator('input[name="name"]').inputValue(), '', 'template selection fills the real editor');
                const lazyRecent = page.locator('[data-template-recent] [data-template-index]');
                assert.ok(await lazyRecent.count() > 0, 'applying a template must surface the recent row');
                assert.equal(await lazyRecent.first().getAttribute('data-template-index'), appliedIndex, 'applied template must top the recent row');
                await goto('editor');
                await page.locator('[data-template-disclosure] > summary').click();
                const persistentRecent = page.locator('[data-template-recent] [data-template-index]').first();
                assert.equal(await persistentRecent.getAttribute('data-template-index'), appliedIndex, 'recent row must survive a full re-render');
            }
            await page.locator(".lc-checkin__field-check").evaluateAll((elements) => {
                for (const element of elements) {
                    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                        if (parent.tagName === "DETAILS") parent.open = true;
                    }
                }
            });
            for (const theme of ["light", "dark"]) {
                await page.locator(".lc-checkin--editor").evaluate((element, value) => { element.dataset.appearance = value; }, theme);
                const fields = page.locator(".lc-checkin__field-check");
                assert.equal(await fields.count(), 2);
                for (const field of await fields.all()) {
                    const input = field.locator('input[type="checkbox"]');
                    const box = await input.boundingBox();
                    assert.ok(box && box.width === 18 && box.height === 18, `${width}/${theme}: checkbox must stay 18px`);
                    const layout = await field.evaluate((element) => {
                        const label = element.querySelector("span");
                        const control = element.querySelector("input");
                        return {overflow: element.scrollWidth > element.clientWidth, wraps: getComputedStyle(label).whiteSpace, beside: label.getBoundingClientRect().left >= control.getBoundingClientRect().right};
                    });
                    assert.deepEqual(layout, {overflow: false, wraps: "normal", beside: true});
                }
                const direction = page.locator('input[name="directionAtMost"]');
                await direction.focus();
                await page.keyboard.press("Space");
                assert.equal(await direction.isChecked(), true);
                await page.keyboard.press("Space");
                assert.equal(await direction.isChecked(), false);
                assert.equal(await page.locator('input[name="anchorAppendNotes"]').isDisabled(), true);
                await assertEditorSaveReachable(`${label}/${theme}`);
                await screenshot({path: path.join(outputRoot, `${label}-${theme}.png`)});
                if (width === 320 || width === 1180 || height < 500) {
                    const chooseKind = kind => page.locator(`.lc-checkin__kind-option:has(input[value="${kind}"])`).click();
                    const preview = page.locator('[data-editor-preview]');
                    const action = preview.locator('[data-preview-action]');
                    const source = page.locator('select[name="completionSource"]');
                    await chooseKind('duration');
                    assert.match(await preview.innerText(), /专注|focus/i, `${label}/${theme}: duration preview exposes focus`);
                    assert.match(await preview.innerText(), /记录|log|record/i, `${label}/${theme}: duration preview exposes manual recording`);
                    await showEditorPreview(preview, `${label}/${theme}/duration-preview`);
                    await assertLayout(`${label}/${theme}/duration-preview`);
                    await screenshot({path: path.join(outputRoot, `${label}-${theme}-duration-preview.png`)}, preview);
                    await chooseKind('count');
                    await source.selectOption('tomato');
                    assert.match(await action.innerText(), /专注|focus/i, 'changing source refreshes the primary action immediately');
                    await direction.check();
                    assert.doesNotMatch(await action.innerText(), /专注|focus/i, 'limiting habits never preview a focus action');
                    assert.match(await preview.locator('[data-preview-meta]').innerText(), /上限|limit/i, 'limiting preview identifies its ceiling');
                    await direction.uncheck();
                    assert.match(await action.innerText(), /专注|focus/i, 'leaving the limiting direction restores eligible focus');
                    await source.selectOption('manual');
                    await chooseKind('quantity');
                    await page.locator('input[name="unit"]').fill('ml');
                    await page.locator('input[name="recordStep"]').fill('250');
                    assert.match(await action.innerText(), /\+250/, 'quantity preview shows the configured increment');
                    assert.match(await preview.innerText(), /填写|enter/i, 'quantity preview exposes direct entry');
                    await page.locator('input[name="target"]').fill('2500');
                    await page.locator('select[name="schedule"]').selectOption('quota');
                    await page.locator('input[name="quotaAmount"]').fill('3');
                    await page.locator('select[name="quotaCountMode"]').selectOption('dates');
                    assert.match(await preview.locator('[data-preview-meta]').innerText(), /0\s*\/\s*3\s*(天|days?)/i, 'date quota preview uses counted days instead of the daily numeric target');
                    await page.locator('select[name="quotaCountMode"]').selectOption('value');
                    await page.locator('input[name="quotaAmount"]').fill('5000');
                    assert.match(await preview.locator('[data-preview-meta]').innerText(), /0\s*\/\s*5,?000\s*ml/, 'value quota preview uses the period target and original unit');
                    await page.locator('select[name="schedule"]').selectOption('daily');
                    await chooseKind('custom');
                    await page.locator('input[name="unit"]').fill('自定义长单位');
                    await page.locator('input[name="recordStep"]').fill('1000000000');
                    assert.match(await preview.innerText(), /1,?000,?000,?000/, 'large increments remain fully readable in preview');
                    assert.match(await preview.innerText(), /自定义长单位/, 'preview preserves the complete custom unit');
                    await showEditorPreview(preview, `${label}/${theme}/custom-preview`);
                    await assertLayout(`${label}/${theme}/custom-preview`);
                    const geometry = await preview.evaluate(element => [...element.querySelectorAll('span, small')].filter(node => node.checkVisibility()).map(node => ({text: node.textContent, width: node.clientWidth, scroll: node.scrollWidth})));
                    assert.ok(geometry.every(node => node.scroll <= node.width + 1), `preview text must wrap without clipping ${JSON.stringify(geometry)}`);
                    await screenshot({path: path.join(outputRoot, `${label}-${theme}-custom-preview.png`)}, preview);
                    await chooseKind('binary');
                    assert.match(await action.innerText(), /打卡|check[- ]?in|record/i, 'binary preview restores the check-in action');
                    assert.match(await preview.innerText(), /备注|note/i, 'binary preview includes its note entry');
                    await direction.check();
                    assert.match(await action.innerText(), /破戒|lapse/i, 'binary limiting preview uses lapse semantics');
                    await direction.uncheck();
                    console.log(`${label}/${theme}: live preview matches focus/manual, source, limit, quantity and custom recording actions`);
                }
            }
            await page.locator(".lc-checkin--editor").evaluate((element, theme) => { element.dataset.appearance = theme; }, qaTheme);
        }
        if (surface === 'occasions') {
            assert.equal(await page.locator('.lc-checkin__occasion-manager-row').count(), 3, 'occasion fixture must exercise actual nonempty list');
            if (width === 320 || width === 1180 || height < 500) {
                const summary = page.locator('.lc-checkin__occasion-filter-fold > summary');
                assert.equal(await summary.isVisible(), true, 'occasion filtering must have a visible entry');
                await summary.click();
                await page.locator('[data-occasion-filter="status"]').selectOption('disabled');
                assert.equal(await page.locator('.lc-checkin__occasion-manager-row').count(), 1, 'occasion status filtering uses the actual selection');
                await page.locator('[data-occasion-clear-filters]').click();
                assert.equal(await page.locator('.lc-checkin__occasion-manager-row').count(), 3);
                if (width < 720 || qaFrontend === 'mobile') {
                    const entry = page.locator('[data-action="new-occasion"]:visible');
                    assert.equal(await entry.count(), 1, 'the active host exposes one visible new-occasion entry');
                    const target = await entry.boundingBox();
                    assert.ok(target && target.width >= 43.75 && target.height >= 43.75, `${label}: new occasion action needs a 44px target ${JSON.stringify(target)}`);
                }
            }
        }
        await screenshot({path: path.join(outputRoot, `${label}.png`)});
        const layout = await assertLayout(`${qaHost}/${qaTheme}/${label}`);
        console.log(`${label}: overflow ${layout.scrollWidth}/${layout.width} ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
    }
    /* Functional acceptance for the new composition, using actual plugin handlers. */
    await page.setViewportSize({width: 1220, height: 1000});
    await page.locator("#frame").evaluate(element => { element.style.width = "1180px"; element.style.height = "960px"; });
    await goto("today");
    const water = page.locator('.lc-checkin__item[data-item-id="water"]');
    await water.locator('[data-action="quick-record"]').click();
    await page.waitForFunction(() => document.querySelector('[data-item-id="water"] .lc-checkin__item-value strong')?.textContent === "3");
    assert.equal(await page.locator('.lc-checkin__overview-ring').textContent(), "33%", "partial progress must not count as completed");
    await page.locator('[data-action="undo-record"]').click();
    await page.waitForFunction(() => document.querySelector('[data-item-id="water"] .lc-checkin__item-value strong')?.textContent === "2");
    await water.locator('[data-edit-name]').click();
    assert.equal(await page.locator('.lc-checkin--editor input[name="name"]').inputValue(), '喝水', 'name opens the existing editor');
    await goto('today');
    await water.click({button: 'right'});
    await page.locator('[data-menu-action="insights"]').click();
    await page.waitForSelector('.lc-checkin--insights');
    await goto('today');
    if (qaFrontend === "desktop") {
        await page.locator('[data-overview-focus]').click();
        assert.equal(await page.locator('[data-focus-timer]').isVisible(), true, "overview reuses the real focus entry");
        await page.locator('[data-action="focus-abandon"]').click();
    }
    /* Expanded and empty states share the same constrained host as cards.
       Exercise their actual buttons/keyboard handlers, not only static HTML. */
    const stateCases = [
        {width: 1180, height: 720, viewportHeight: 1000},
        {width: 640, height: 720, viewportHeight: 1000},
        {width: 320, height: 720, viewportHeight: 1000},
        {width: 844, height: 350, viewportHeight: 390},
    ];
    await page.evaluate(async () => {
        await window.__plugin.mutationQueue;
        await window.__plugin.saveQueue;
        window.__stateBaseline = structuredClone(window.__plugin.store);
        window.__stateBaselineView = {group: window.__plugin.todayGroupMode, sort: window.__plugin.todaySortMode};
    });
    const resetState = () => page.evaluate(async () => {
        const plugin = window.__plugin;
        // A local DOM patch can precede persistence completion. Drain writes
        // before replacing test fixtures so an older write cannot restore them.
        await plugin.mutationQueue;
        await plugin.saveQueue;
        await plugin.finishFocusTimer(false);
        plugin.store = structuredClone(window.__stateBaseline);
        window.__store = structuredClone(plugin.store);
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        // Each scenario owns a fresh mocked storage baseline. A previous
        // failure stays in scenarioFailures but its error/toast must not change
        // a later scenario's measurements.
        plugin.saveState = 'idle';
        for (const key of ['recentRecordTimer', 'syncNoticeTimer']) {
            if (plugin[key] !== undefined) clearTimeout(plugin[key]);
            plugin[key] = undefined;
        }
        plugin.pendingFocusItemId = undefined;
        plugin.todayQuery = '';
        plugin.pendingOnly = false;
        plugin.completedCollapsed = true;
        plugin.todayGroupMode = window.__stateBaselineView.group;
        plugin.todaySortMode = window.__stateBaselineView.sort;
        plugin.bulkMode = false;
        plugin.bulkSelected.clear();
        plugin.collapsedTodayGroups.clear();
        plugin.recentRecord = undefined;
        plugin.celebration = undefined;
        plugin.showToday();
    });
    const assertControlReachable = async (control, label, minHeight = 36) => {
        await control.scrollIntoViewIfNeeded();
        const geometry = await control.evaluate(element => {
            const box = element.getBoundingClientRect();
            const host = document.querySelector('#dock').getBoundingClientRect();
            const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
            return {width: box.width, height: box.height, inside: box.left >= host.left - 1 && box.right <= host.right + 1 && box.top >= host.top - 1 && box.bottom <= host.bottom + 1, hit: element === hit || element.contains(hit)};
        });
        assert.ok(geometry.inside && geometry.hit && geometry.width >= 43.75 && geometry.height >= minHeight - .25, `${label}: control must remain reachable ${JSON.stringify(geometry)}`);
    };
    const assertFocusPrimary = async (label, itemId = 'reading') => {
        const card = page.locator(`[data-item-id="${itemId}"]`);
        const control = card.locator('[data-action="focus"]');
        assert.equal(await control.count(), 1, `${label}: duration habit exposes exactly one focus entry`);
        assert.equal(await card.locator('.lc-checkin__item-action > .lc-checkin__focus-primary').count(), 1, `${label}: focus is the labelled primary action`);
        assert.equal(await card.locator('.lc-checkin__item-action > [data-action="quick-record"]').count(), 0, `${label}: starting a timer cannot be confused with adding minutes immediately`);
        assert.equal(await card.locator('.lc-checkin__item-icon').evaluate(icon => icon.tagName), 'SPAN', `${label}: the habit icon remains a visual identifier`);
        await assertControlReachable(control, `${label}/focus-primary`, 44);
        const visual = await control.evaluate(button => {
            const clock = button.querySelector(':scope > svg');
            const clockBox = clock?.getBoundingClientRect();
            const labels = [...button.querySelectorAll(':scope > span')].filter(span => span.checkVisibility());
            return {name: button.getAttribute('aria-label'), labels: labels.map(span => ({text: span.textContent.trim(), width: span.getBoundingClientRect().width, scrollWidth: span.scrollWidth})), clockVisible: Boolean(clock?.checkVisibility() && clockBox.width > 0 && clockBox.height > 0)};
        });
        assert.ok(visual.clockVisible && visual.labels.length === 1 && visual.labels.every(span => /专注|计时|focus|timer/i.test(span.text) && span.width > 0 && span.scrollWidth <= span.width + 1) && /专注|计时|focus|timer/i.test(visual.name || ''), `${label}: normalization preserves the clock and visible, unclipped action label ${JSON.stringify(visual)}`);
        assert.match(await card.locator('[data-action="toggle-exact"]').getAttribute('aria-label'), /手动|manual/i, `${label}: manual recording remains a clearly named secondary action`);
        const manual = card.locator('[data-action="toggle-exact"]');
        assert.match((await manual.innerText()).trim(), /^(记录|Log)$/, `${label}: manual recording has a visible text entry`);
        await assertControlReachable(manual, `${label}/manual-entry`, 44);
        return control;
    };
    const assertMobileNav = async (current, label) => {
        const nav = page.locator('.lc-checkin__mobile-nav:visible');
        if (!await nav.count()) return;
        assert.equal(await nav.locator('button.is-selected').count(), 1, `${label}: only the current navigation item is selected`);
        assert.equal(await nav.locator('button.is-selected').getAttribute('data-mobile-nav'), current);
        assert.equal(await nav.locator('[aria-current="page"]').count(), 1, `${label}: only the current page is announced`);
        if (current !== 'settings') {
            const colors = await nav.locator('[data-mobile-nav="settings"]').evaluate(button => {
                const probe = document.createElement('span');
                probe.style.color = 'var(--lc-checkin-muted)';
                button.append(probe);
                const muted = getComputedStyle(probe).color;
                probe.remove();
                return {muted, icon: getComputedStyle(button.querySelector(':scope > span')).color, text: getComputedStyle(button.querySelector(':scope > small')).color};
            });
            assert.equal(colors.icon, colors.muted, `${label}: unselected settings icon uses the muted navigation color`);
            assert.equal(colors.text, colors.muted, `${label}: unselected settings label uses the muted navigation color`);
        }
    };
    for (const size of stateCases) {
      const suffix = `${size.width}${size.height < 500 ? `x${size.height}` : ''}`;
      for (const state of ['organize', 'bulk', 'exact', 'binary-note', 'focus', 'search-empty', 'all-done', 'onboarding']) {
        const label = `today-${state}-${suffix}`;
        try {
            await sizeHost(size.width, size.height, size.viewportHeight);
            await resetState();
            if (state === 'organize') {
                assert.equal(await page.evaluate(() => window.__plugin.todayGroupMode), 'none', 'default grouping is explicitly none');
                assert.equal(await page.locator('[data-group-toggle]').count(), 1, 'two custom groups share one default pending list');
                const group = page.locator('[data-group-toggle]').first();
                const groupId = await group.getAttribute('data-group-toggle');
                if (size.width < 720 || qaFrontend === 'mobile') await assertControlReachable(group, `${label}/group-toggle`, 44);
                await group.click();
                assert.equal(await page.locator('[data-group-toggle]').evaluateAll((buttons, id) => buttons.find(button => button.dataset.groupToggle === id)?.getAttribute('aria-expanded'), groupId), 'false', 'group toggle collapses its cards');
                assert.equal(await page.locator('.lc-checkin__group .lc-checkin__item:visible').count(), 0, 'collapsed cards leave the visible list');
                await page.locator('[data-group-toggle]').evaluateAll((buttons, id) => buttons.find(button => button.dataset.groupToggle === id)?.focus(), groupId);
                await page.keyboard.press('Enter');
                assert.equal(await page.locator('[data-group-toggle]').evaluateAll((buttons, id) => buttons.find(button => button.dataset.groupToggle === id)?.getAttribute('aria-expanded'), groupId), 'true', 'keyboard restores the group');
                assert.equal(await page.locator('.lc-checkin__group .lc-checkin__item:visible').count(), 2, 'restoring the group reveals both pending habits');
                const filters = page.locator('[data-today-filters]');
                await filters.locator(':scope > summary').click();
                for (const selector of ['[data-group-mode]', '[data-sort-mode]', '[data-action="toggle-pending-only"]']) {
                    await assertControlReachable(page.locator(selector), `${label}/${selector}`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 30);
                }
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await page.locator('[data-group-mode]').selectOption('group');
                assert.equal(await page.locator('[data-group-toggle]').count(), 2, 'custom grouping restores both fixture groups');
                if (await filters.getAttribute('open') === null) await filters.locator(':scope > summary').click();
                await page.locator('[data-group-mode]').selectOption('none');
                assert.equal(await page.locator('[data-group-toggle]').count(), 1, 'none returns to a single pending list');
                if (await filters.getAttribute('open') === null) await filters.locator(':scope > summary').click();
                await page.locator('[data-sort-mode]').selectOption('name');
                assert.equal(await page.evaluate(() => window.__plugin.todaySortMode), 'name');
            } else if (state === 'bulk') {
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    const store = structuredClone(plugin.store);
                    const water = store.items.find(item => item.id === 'water');
                    // Streaks count recording days, not only target completion:
                    // today's baseline 2/8 already counts as a third day. Start
                    // this isolated fixture with no water record today so the
                    // two historical recording days yield exactly two.
                    store.events = store.events.filter(event => event.itemId !== water.id);
                    for (let daysAgo = 1; daysAgo <= 2; daysAgo++) {
                        const date = new Date();
                        date.setDate(date.getDate() - daysAgo);
                        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        water.createdAt = date.toISOString();
                        water.createdDate = localDate;
                        for (const revision of water.revisions) revision.effectiveDate = localDate;
                        store.events.push({id: `bulk-streak-${daysAgo}`, itemId: water.id, value: 8, unit: '杯', occurredAt: date.toISOString(), localDate, source: 'manual'});
                    }
                    plugin.store = store;
                    window.__store = structuredClone(store);
                    plugin.showToday();
                });
                assert.match(await page.locator('[data-item-id="water"] .lc-checkin__streak-badge').textContent(), /2/, 'fixture has a real two-day streak while today remains pending');
                const originalEvents = await page.evaluate(() => JSON.stringify(window.__plugin.store.events));
                await page.locator('[data-action="toggle-bulk"]').click();
                const toolbar = page.locator('[data-bulk-toolbar]');
                const operations = toolbar.locator('[data-bulk-selection-action]');
                assert.equal(await operations.evaluateAll(buttons => buttons.every(button => button.disabled)), true, 'empty selection disables batch mutations');
                const select = page.locator('[data-bulk-check="water"]');
                assert.equal(await page.locator('.lc-checkin__item button:not([data-bulk-check])').count(), 0, 'including streak badges, cards offer only their selection button in bulk mode');
                assert.equal(await page.locator('[data-item-id="water"] .lc-checkin__streak-badge').evaluate(element => element.tagName), 'SPAN', 'streak text remains readable without a hidden navigation action');
                assert.equal(await page.locator('.lc-checkin__item [data-action="record"], .lc-checkin__item [data-action="quick-record"], .lc-checkin__item [data-action="toggle"]').count(), 0, 'batch selection must not retain record actions that could create accidental events');
                await page.locator('[data-item-id="water"] .lc-checkin__item-name').click();
                assert.equal(await page.locator('.lc-checkin--editor').count(), 0, 'habit names do not navigate into editing during selection');
                await page.locator('[data-item-id="water"]').click({button: 'right'});
                assert.equal(await page.locator('.lc-checkin__item-context-menu').count(), 0, 'right click cannot reopen single-item actions in selection mode');
                await select.focus();
                await page.keyboard.press('Alt+1');
                await page.keyboard.press('e');
                await page.evaluate(async () => { await window.__plugin.mutationQueue; await window.__plugin.saveQueue; });
                assert.equal(await page.evaluate(() => window.__plugin.currentPage), 'today', 'edit shortcut does not leave batch selection');
                assert.equal(await page.evaluate(() => JSON.stringify(window.__plugin.store.events)), originalEvents, 'quick-record shortcut does not mutate records in batch selection');
                await page.keyboard.press('Space');
                assert.equal(await select.getAttribute('aria-pressed'), 'true', 'keyboard selects a habit');
                assert.equal(await operations.evaluateAll(buttons => buttons.every(button => !button.disabled)), true, 'selection enables batch operations');
                if (size.width < 720 || qaFrontend === 'mobile') {
                    const targets = await toolbar.locator('button').evaluateAll(buttons => buttons.map(button => ({width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height})));
                    assert.ok(targets.every(box => box.width >= 43.75 && box.height >= 43.75), `${label}: toolbar keeps touch targets ${JSON.stringify(targets)}`);
                }
                const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(cards => Math.max(...cards.map(card => card.getBoundingClientRect().height)));
                assert.ok(maxHeight > 0 && maxHeight <= (size.width < 720 ? 120 : 200), `${label}: selecting must keep visible compact habit cards (${maxHeight}px)`);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await toolbar.locator('[data-action="bulk-exit"]').click();
                assert.equal(await page.locator('[data-bulk-toolbar]').count(), 0);
                assert.equal(await page.locator('[data-bulk-check]').count(), 0);
                assert.equal(await page.evaluate(() => JSON.stringify(window.__plugin.store.events)), originalEvents, 'selection and exit do not change events');
            } else if (state === 'exact') {
                const card = page.locator('.lc-checkin__item[data-item-id="water"]');
                const toggle = card.locator('[data-action="toggle-exact"]');
                await toggle.click();
                assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
                const entry = card.locator('[data-exact-entry]');
                assert.equal(await entry.isVisible(), true);
                assert.ok((await entry.locator('[data-attach-file]').getAttribute('aria-label'))?.trim(), 'photo upload keeps an accessible input label');
                assert.equal(await entry.locator('.lc-checkin__amount').evaluate(element => element === document.activeElement), true, 'opening exact entry focuses the amount');
                await entry.locator('.lc-checkin__amount').fill('3');
                const note = '走查备注 — Long note with a URL https://example.test/' + 'reference'.repeat(12);
                await entry.locator('.lc-checkin__record-note').fill(note);
                if (size.width < 720 || qaFrontend === 'mobile') {
                    for (const selector of ['.lc-checkin__amount', '.lc-checkin__record-note', '[data-attach-button]']) {
                        const box = await entry.locator(selector).boundingBox();
                        assert.ok(box && box.width >= 43.75 && box.height >= 43.75, `${label}: exact field ${selector} keeps a 44px touch target ${JSON.stringify(box)}`);
                    }
                }
                await assertControlReachable(entry.locator('[data-action="record"]'), `${label}/save`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertTextContrast(entry.locator('[data-action="record"]'), `${label}/save`);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await entry.locator('.lc-checkin__amount').press('Enter');
                await page.waitForFunction(value => window.__plugin.store.events.some(event => event.itemId === 'water' && event.value === 3 && event.note === value), note);
                await page.waitForFunction(() => document.querySelector('[data-item-id="water"] .lc-checkin__item-value strong')?.textContent === '5');
                await page.locator('[data-action="undo-record"]').click();
                await page.waitForFunction(() => document.querySelector('[data-item-id="water"] .lc-checkin__item-value strong')?.textContent === '2');
            } else if (state === 'binary-note') {
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.store = {...plugin.store, events: plugin.store.events.filter(event => event.itemId !== 'stretch')};
                    window.__store = structuredClone(plugin.store);
                    plugin.showToday();
                });
                const card = page.locator('.lc-checkin__item[data-item-id="stretch"]');
                await card.locator('[data-action="toggle-exact"]').click();
                const entry = card.locator('[data-exact-entry]');
                const note = '拉伸完成，记录今天的身体感受。';
                await entry.locator('.lc-checkin__record-note').fill(note);
                await assertControlReachable(entry.locator('[data-action="record"]'), `${label}/save`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertTextContrast(entry.locator('[data-action="record"]'), `${label}/save`);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await entry.locator('[data-action="record"]').click();
                await page.waitForFunction(value => window.__plugin.store.events.some(event => event.itemId === 'stretch' && event.value === 1 && event.note === value), note, {timeout: 3000});
                const saved = await page.evaluate(() => window.__plugin.store.events.filter(event => event.itemId === 'stretch'));
                assert.equal(saved.length, 1, 'binary expanded submit records once with its note');
                assert.equal(await page.locator('.lc-checkin__overview-ring').textContent(), '33%');
                const completed = page.locator('[data-action="toggle-completed"]');
                if (await completed.getAttribute('aria-expanded') === 'false') await completed.click();
                await page.locator('.lc-checkin__completed-section [data-item-id="stretch"] .lc-checkin__item-action [data-action="record"]').click();
                await page.waitForFunction(() => !window.__plugin.store.events.some(event => event.itemId === 'stretch'));
                assert.equal(await page.locator('.lc-checkin__overview-ring').textContent(), '0%', 'outer binary action keeps its existing undo behavior');
            } else if (state === 'focus') {
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.store = {...plugin.store, items: plugin.store.items.map(item => item.id === 'reading' ? {...item, name: '深度阅读与学习整理 — ' + 'LongReadingTitle'.repeat(6)} : item)};
                    window.__store = structuredClone(plugin.store);
                    plugin.showToday();
                });
                const initialEvents = await page.evaluate(() => window.__plugin.store.events.length);
                const focusPrimary = await assertFocusPrimary(label);
                await focusPrimary.click();
                const panel = page.locator('[data-focus-timer]');
                assert.equal(await panel.getAttribute('role'), 'dialog');
                assert.equal(await page.evaluate(() => window.__plugin.store.events.length), initialEvents, 'opening the timer does not immediately add duration');
                await panel.locator('[data-focus-timer-minutes="15"]').click();
                assert.equal(await panel.locator('[data-focus-timer-minutes][aria-pressed="true"]').count(), 1, 'one focus preset is announced as selected');
                assert.equal(await panel.locator('[data-focus-timer-minutes="15"]').getAttribute('aria-pressed'), 'true');
                const presetLabel = await panel.locator('[data-focus-timer-minutes="15"]').getAttribute('aria-label');
                assert.ok(presetLabel?.includes('15') && /分钟|minute/i.test(presetLabel), 'preset accessible label includes its time unit');
                if (size.width < 720 || qaFrontend === 'mobile') {
                    const presets = await panel.locator('[data-focus-timer-minutes]').evaluateAll(buttons => buttons.map(button => ({width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height})));
                    assert.ok(presets.every(box => box.width >= 43.75 && box.height >= 43.75), `${label}: focus presets keep 44px targets ${JSON.stringify(presets)}`);
                }
                await panel.locator('[data-action="focus-toggle"]').click();
                assert.equal(await page.evaluate(() => window.__plugin.focusTimerState.running), false, 'pause updates live timer state');
                assert.match(await panel.locator('[data-focus-remaining]').textContent(), /^1[45]:[0-5]\d$/);
                await assertControlReachable(panel.locator('[data-action="focus-finish"]'), `${label}/finish`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertControlReachable(panel.locator('[data-action="focus-abandon"]'), `${label}/abandon`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await panel.locator('[data-action="focus-toggle"]').click();
                assert.equal(await page.evaluate(() => window.__plugin.focusTimerState.running), true, 'resume updates live timer state');
                await panel.locator('[data-action="focus-abandon"]').click();
                assert.equal(await panel.count(), 0);
                assert.equal(await page.evaluate(() => window.__plugin.store.events.length), initialEvents, 'abandoning focus must not add a record');
                await assertFocusPrimary(`${label}/after-abandon`);
            } else if (state === 'search-empty') {
                await page.locator('[data-today-search]').fill('NoSuchHabit-不存在的项目');
                await page.waitForSelector('.lc-checkin__today-search-empty');
                assert.equal(await page.locator('.lc-checkin__item:visible').count(), 0);
                const clear = page.locator('.lc-checkin__today-search-empty [data-action="clear-search"]');
                await assertControlReachable(clear, `${label}/clear`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await clear.click();
                assert.equal(await page.locator('[data-today-search]').inputValue(), '');
                assert.equal(await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').count(), 2, 'clear restores pending habits');
            } else if (state === 'all-done') {
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    const now = new Date();
                    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    plugin.store = {...plugin.store, events: [...plugin.store.events, ...[['water', 6, '杯'], ['reading', 15, '分钟']].map(([itemId, value, unit]) => ({id: `qa-done-${itemId}`, itemId, value, unit, occurredAt: now.toISOString(), localDate, source: 'manual'}))]};
                    window.__store = structuredClone(plugin.store);
                    plugin.showToday();
                });
                assert.equal(await page.locator('.lc-checkin__overview-ring').textContent(), '100%');
                assert.equal(await page.locator('.lc-checkin__all-done').isVisible(), true);
                const toggle = page.locator('[data-action="toggle-completed"]');
                assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
                await assertControlReachable(toggle, `${label}/completed`);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await toggle.click();
                assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
                assert.equal(await page.locator('.lc-checkin__completed-section .lc-checkin__item:visible').count(), 3, 'all completed habits remain accessible');
                await assertLayout(label);
            } else {
                await page.evaluate(() => {
                    const plugin = window.__plugin;
                    plugin.store = {...plugin.store, items: [], events: []};
                    window.__store = structuredClone(plugin.store);
                    plugin.showToday();
                });
                assert.equal(await page.locator('.lc-checkin__empty--onboard').isVisible(), true);
                const add = page.locator('.lc-checkin__empty--onboard [data-action="add"]');
                await assertControlReachable(add, `${label}/add`, 44);
                const onboarding = await add.evaluate(button => {
                    const box = button.getBoundingClientRect();
                    const steps = button.closest('.lc-checkin__empty--onboard').querySelector('.lc-checkin__onboard-steps').getBoundingClientRect();
                    const position = getComputedStyle(button).position;
                    return {position, width: box.width, height: box.height, followsSteps: box.top >= steps.bottom - 1};
                });
                assert.ok(!['absolute', 'fixed'].includes(onboarding.position) && onboarding.followsSteps && onboarding.width > onboarding.height, `${label}: first-habit CTA belongs in the onboarding flow ${JSON.stringify(onboarding)}`);
                await assertLayout(label);
                await screenshot({path: path.join(outputRoot, `${label}.png`)});
                await add.click();
                assert.equal(await page.locator('.lc-checkin--editor input[name="name"]').inputValue(), '', 'first habit action opens a blank editor');
            }
            console.log(`${label}: interaction state ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    /* Main actions must stay legible in every supported theme/palette. Use the
       real narrow-page composition so action and host-nav overrides participate. */
    const originalPalette = await page.evaluate(() => window.__plugin.palette);
    for (const theme of ['light', 'dark']) {
      for (const palette of ['lavender', 'ocean', 'forest', 'sunset']) {
        const label = `action-colors-${theme}-${palette}`;
        try {
            await sizeHost(320);
            await page.evaluate(({theme, palette}) => { window.__plugin.appearance = theme; window.__plugin.palette = palette; }, {theme, palette});
            await resetState();
            await page.evaluate(() => {
                const plugin = window.__plugin;
                plugin.store = {...plugin.store, events: plugin.store.events.filter(event => event.itemId !== 'stretch')};
                window.__store = structuredClone(plugin.store);
                plugin.showToday();
            });
            await waitForVisualStability();
            await assertMobileNav('today', label);
            await assertTextContrast(page.locator('[data-item-id="water"] [data-action="quick-record"]'), `${label}/water-quick`);
            await assertTextContrast(page.locator('[data-item-id="reading"] [data-action="focus"]'), `${label}/reading-focus`);
            const binaryRecord = page.locator('[data-item-id="stretch"] .lc-checkin__item-action [data-action="record"]');
            await assertTextContrast(binaryRecord, `${label}/binary-record`);
            await binaryRecord.hover();
            await waitForVisualStability();
            await assertTextContrast(binaryRecord, `${label}/binary-record-hover`);
            await page.locator('[data-item-id="water"] [data-action="toggle-exact"]').click();
            const record = page.locator('[data-item-id="water"] [data-exact-entry] [data-action="record"]');
            await assertControlReachable(record, `${label}/exact`, 44);
            await assertTextContrast(record, `${label}/exact`);
            const nav = page.locator('.lc-checkin__mobile-nav:visible');
            if (await nav.count()) {
                await nav.locator('[data-mobile-nav="settings"]').click();
                await assertMobileNav('settings', `${label}/settings`);
                await nav.locator('[data-mobile-nav="today"]').click();
                await assertMobileNav('today', `${label}/return-today`);
            }
            await goto('editor');
            await assertEditorSaveReachable(label);
            await assertTextContrast(page.locator('.lc-checkin__save-button'), `${label}/editor-save`);
            console.log(`${label}: quick, binary record/default-hover, exact and editor-save contrast plus navigation state ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    await page.evaluate(({theme, palette}) => { window.__plugin.appearance = theme; window.__plugin.palette = palette; }, {theme: qaTheme, palette: originalPalette});
    /* Exercise real user configurations together: the row layout must survive
       different units, quotas, limits and tomato-backed count habits. */
    await resetState();
    await page.evaluate(async () => {
        const plugin = window.__plugin;
        const now = new Date();
        const stamp = now.toISOString();
        const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const imageIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="13" fill="#6259df"/></svg>');
        const definitions = [
            {id: 'binary', name: '晨间运动', kind: 'binary', target: 1, unit: '次', recordStep: 1},
            {id: 'count', name: '喝水', kind: 'count', target: 8, unit: '杯', recordStep: 1},
            {id: 'quantity', name: '饮水量', kind: 'quantity', target: 2500, unit: '毫升', recordStep: 250},
            {id: 'percent', name: '课程进度', kind: 'custom', target: 100, unit: '%', recordStep: 5},
            {id: 'long-unit', name: '自定义训练', kind: 'quantity', target: 500, unit: '完整训练动作计量单位Reps', recordStep: 10},
            {id: 'large', name: '累计数量', kind: 'quantity', target: 2000000000, unit: '点', recordStep: 1000000000},
            {id: 'fraction', name: '小数记录', kind: 'custom', target: 100, unit: '%', recordStep: 0.01},
            {id: 'image', name: '自定义图标', kind: 'count', target: 8, unit: '次', recordStep: 1, icon: imageIcon},
            {id: 'quota-dates', name: '每周四天', kind: 'count', target: 1, unit: '次', recordStep: 1, schedule: {type: 'quota', quota: {period: 'week', amount: 4, countMode: 'dates'}}},
            {id: 'quota-value', name: '每周累计', kind: 'quantity', target: 20, unit: '公里', recordStep: 1, schedule: {type: 'quota', quota: {period: 'week', amount: 20, countMode: 'value'}}},
            {id: 'limit-number', name: '限制饮用', kind: 'count', target: 2, unit: '杯', recordStep: 1, direction: 'atMost'},
            {id: 'limit-binary', name: '避免熬夜', kind: 'binary', target: 1, unit: '次', recordStep: 1, direction: 'atMost'},
            {id: 'tomato-count', name: '番茄计次', kind: 'count', target: 4, unit: '个', recordStep: 1, completionSource: 'tomato', tomatoMode: 'sessions'},
            {id: 'duration', name: '深度阅读', kind: 'duration', target: 30, unit: '分钟', recordStep: 5},
            {id: 'hours', name: '按小时专注', kind: 'duration', target: 2, unit: '小时', recordStep: 0.5},
        ];
        const items = definitions.map((definition, index) => {
            const item = {icon: '📖', priority: 'medium', timeSlot: 'any', group: '', completionSource: 'manual', schedule: {type: 'daily'}, createdAt: stamp, updatedAt: stamp, createdDate: day, archivePeriods: [], ...definition, id: `mixed-${definition.id}`, sortOrder: index};
            item.revisions = [{effectiveDate: day, kind: item.kind, target: item.target, unit: item.unit, recordStep: item.recordStep, schedule: structuredClone(item.schedule)}];
            return item;
        });
        const amounts = {'quota-dates': 2, 'quota-value': 2, 'limit-number': 3, 'limit-binary': 1, duration: 15};
        const events = Object.entries(amounts).map(([id, value]) => ({id: `mixed-event-${id}`, itemId: `mixed-${id}`, value, unit: items.find(item => item.id === `mixed-${id}`).unit, occurredAt: stamp, localDate: day, source: 'manual'}));
        // Load the fixture through the real storage reconciliation path so
        // optional defaults and revisions match the production persisted shape.
        window.__store = {...structuredClone(plugin.store), items, events, eventTombstones: []};
        plugin.store = {...plugin.store, items: [], events: [], eventTombstones: []};
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        await plugin.reconcileStore();
        await plugin.saveQueue;
        window.__mixedFixture = structuredClone(plugin.store);
        window.__store = structuredClone(plugin.store);
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        if (plugin.syncNoticeTimer !== undefined) clearTimeout(plugin.syncNoticeTimer);
        plugin.syncNoticeTimer = undefined;
        plugin.todaySortMode = 'manual';
        plugin.showToday();
    });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { window.__plugin.appearance = value; window.__plugin.showToday(); }, theme);
      for (const size of [{width: 1180}, {width: 640}, {width: 360}, {width: 320}, {width: 844, height: 350, viewportHeight: 390}]) {
        const label = `mixed-habits-${theme}-${size.width}${size.height ? 'x350' : ''}`;
        try {
            await sizeHost(size.width, size.height || 720, size.viewportHeight || 1000);
            await waitForVisibleCards(15);
            const rowGeometry = await page.locator('.lc-checkin__group-items:not([hidden]) .lc-checkin__item').evaluateAll(cards => cards.map(card => {
                const body = card.querySelector('.lc-checkin__item-body').getBoundingClientRect();
                const actions = card.querySelector('.lc-checkin__item-action').getBoundingClientRect();
                const main = card.querySelector('.lc-checkin__item-action > :is(.lc-checkin__quick-button, .lc-checkin__record-button, .lc-checkin__focus-primary)');
                const box = main.getBoundingClientRect();
                return {id: card.dataset.itemId, separate: body.right <= actions.left + 1, width: box.width, height: box.height, noClip: main.scrollWidth <= main.clientWidth + 1};
            }));
            assert.equal(rowGeometry.length, 15);
            assert.ok(rowGeometry.every(row => row.separate && row.noClip && row.width >= 43.75 && row.height >= (size.width < 720 || qaFrontend === 'mobile' ? 43.75 : 35.75)), `${label}: units and amounts cannot collide with primary actions ${JSON.stringify(rowGeometry)}`);
            for (const id of ['duration', 'hours', 'tomato-count']) await assertFocusPrimary(`${label}/${id}`, `mixed-${id}`);
            const tomatoMode = page.locator('[data-item-id="mixed-tomato-count"] .is-tomato');
            assert.equal(await tomatoMode.isVisible(), true, `${label}: external-timer measurement mode stays visible`);
            assert.match(await tomatoMode.textContent(), /次数|count/i, `${label}: session-based tomatoes are labelled as counts`);
            for (const [id, text] of [['count', /^(填写|Enter)$/], ['binary', /^(备注|Note)$/]]) {
                const entry = page.locator(`[data-item-id="mixed-${id}"] [data-action="toggle-exact"]`);
                assert.match((await entry.innerText()).trim(), text, `${label}/${id}: secondary entry explains its recording action`);
                await assertControlReachable(entry, `${label}/${id}-entry`, 44);
            }
            assert.match(await page.locator('[data-item-id="mixed-quota-dates"] .lc-checkin__item-value').textContent(), /1\s*\/\s*4\s*(天|days?)/i, 'date quotas show recorded days rather than event values');
            assert.match(await page.locator('[data-item-id="mixed-quota-value"] .lc-checkin__item-value').textContent(), /2\s*\/\s*20\s*公里/, 'value quotas retain their actual unit');
            const large = page.locator('[data-item-id="mixed-large"]');
            assert.match((await large.locator('[data-action="quick-record"]').textContent()).trim(), /^(记录|Record)$/);
            assert.match(await large.locator('.lc-checkin__item-step').textContent(), /1000000000.*点/, 'large quick amounts stay fully readable beside the compact action');
            assert.equal(await large.locator('[data-action="quick-record"]').getAttribute('data-amount'), '1000000000');
            const limit = page.locator('[data-item-id="mixed-limit-number"]');
            assert.match(await limit.locator('.lc-checkin__item-value').textContent(), /(?:上限|Limit)\s*2\s*杯/);
            assert.equal(await limit.locator('.lc-checkin__item-value small').count(), 0, 'limits do not encourage filling a remaining amount');
            for (const id of ['limit-number', 'limit-binary']) {
                const card = page.locator(`[data-item-id="mixed-${id}"]`);
                assert.equal(await card.locator('[data-action="focus"]').count(), 0);
                assert.equal(await card.evaluate(element => getComputedStyle(element).backgroundImage), 'none');
            }
            assert.match(await page.locator('[data-item-id="mixed-limit-binary"] .lc-checkin__item-action [data-action="record"]').textContent(), /破戒|lapse/i, 'binary limiting action names its lapse semantics');
            await page.locator('[data-item-id="mixed-image"] .lc-checkin__item-icon img').scrollIntoViewIfNeeded();
            await page.waitForFunction(() => { const img = document.querySelector('[data-item-id="mixed-image"] .lc-checkin__item-icon img'); return img?.complete && img.naturalWidth > 0; });
            await assertLayout(label);
            await page.locator('.lc-checkin--today').evaluate(surface => { surface.scrollTop = 0; });
            await screenshot({path: path.join(outputRoot, `${label}.png`)});
            console.log(`${label}: 15 recording forms, primary actions, units, quotas and limits ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    const mixedInteractionLabel = 'mixed-habits-real-recording';
    const assertRecorded = async (id, value, label) => {
        const result = await page.evaluate(async ({id, value}) => {
            const plugin = window.__plugin;
            await plugin.mutationQueue;
            await plugin.saveQueue;
            return {found: plugin.store.events.some(event => event.itemId === id && event.value === value), saveState: plugin.saveState, messages: (window.__messages || []).slice(-2)};
        }, {id, value});
        assert.ok(result.found && result.saveState !== 'error', `${label}: actual record must persist ${JSON.stringify(result)}`);
    };
    try {
        await sizeHost(320);
        await page.evaluate(async () => {
            const plugin = window.__plugin;
            await plugin.mutationQueue;
            await plugin.saveQueue;
            plugin.store = structuredClone(window.__mixedFixture);
            window.__store = structuredClone(plugin.store);
            plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
            plugin.showToday();
        });
        const duration = page.locator('[data-item-id="mixed-duration"]');
        const originalEvents = await page.evaluate(() => window.__plugin.store.events.length);
        await duration.locator('[data-action="focus"]').click();
        assert.equal(await page.locator('[data-focus-timer]').isVisible(), true);
        assert.equal(await page.evaluate(() => window.__plugin.store.events.length), originalEvents, 'focus starts a timer without inventing a duration record');
        await page.locator('[data-action="focus-abandon"]').click();
        for (const [id, value] of [['duration', '2.5'], ['fraction', '0.01']]) {
            const card = page.locator(`[data-item-id="mixed-${id}"]`);
            await card.locator('[data-action="toggle-exact"]').click();
            const amount = card.locator('.lc-checkin__amount');
            await amount.fill(value);
            assert.equal(await amount.evaluate(input => input.validity.valid), true, `${id}: supported decimals must pass native input validation`);
            await amount.press('Enter');
            await assertRecorded(`mixed-${id}`, Number(value), `${mixedInteractionLabel}/${id}-${value}`);
        }
        const millilitres = page.locator('[data-item-id="mixed-quantity"]');
        await millilitres.locator('[data-action="toggle-exact"]').click();
        await millilitres.locator('.lc-checkin__amount').fill('375');
        await millilitres.locator('[data-exact-entry] [data-action="record"]').click();
        await assertRecorded('mixed-quantity', 375, `${mixedInteractionLabel}/manual-375ml`);
        await millilitres.locator('[data-action="quick-record"]').click();
        await assertRecorded('mixed-quantity', 250, `${mixedInteractionLabel}/quick-250ml`);
        assert.equal(await page.evaluate(() => window.__plugin.store.events.filter(event => event.itemId === 'mixed-quantity' && event.unit === '毫升').reduce((sum, event) => sum + event.value, 0)), 625, 'manual 375ml followed by quick 250ml records exactly 625ml');
        assert.equal(await millilitres.locator('.lc-checkin__item-value strong').textContent(), '625', 'the row displays the same 625ml total after mixed recording methods');
        await page.locator('[data-item-id="mixed-large"] [data-action="quick-record"]').click();
        await assertRecorded('mixed-large', 1000000000, `${mixedInteractionLabel}/large-quick`);
        for (const [id, finishValue, extraValue] of [['duration', 12.5, 3.5], ['count', 8, 2]]) {
            const card = page.locator(`[data-item-id="mixed-${id}"]`);
            const entry = card.locator('[data-action="toggle-exact"]');
            if (await entry.getAttribute('aria-expanded') !== 'true') await entry.click();
            await card.locator('.lc-checkin__amount').fill(String(finishValue));
            await card.locator('[data-exact-entry] [data-action="record"]').click();
            await assertRecorded(`mixed-${id}`, finishValue, `${mixedInteractionLabel}/${id}-complete`);
            const completed = page.locator('[data-action="toggle-completed"]');
            if (await completed.getAttribute('aria-expanded') === 'false') await completed.click();
            assert.equal(await card.evaluate(element => element.classList.contains('is-complete')), true, `${id}: fixture has reached its target`);
            assert.equal(await entry.isVisible(), true, `${id}: manual entry remains after completion`);
            await entry.click();
            await card.locator('.lc-checkin__amount').fill(String(extraValue));
            await card.locator('[data-exact-entry] [data-action="record"]').click();
            await assertRecorded(`mixed-${id}`, extraValue, `${mixedInteractionLabel}/${id}-extra-after-completion`);
            assert.equal(await entry.isVisible(), true, `${id}: in-place updates preserve repeated manual recording`);
        }
        const limitBinary = page.locator('[data-item-id="mixed-limit-binary"]');
        await limitBinary.locator('.lc-checkin__item-action > [data-action="record"]').click();
        const afterUndoLapse = await page.evaluate(async () => { await window.__plugin.mutationQueue; await window.__plugin.saveQueue; return window.__plugin.store.events.filter(event => event.itemId === 'mixed-limit-binary').length; });
        assert.equal(afterUndoLapse, 0, 'undo lapse removes the actual binary event');
        assert.equal(await limitBinary.locator('.is-avoided').isVisible(), true, 'a day without a lapse keeps its visible avoided status');
        await limitBinary.locator('.lc-checkin__item-action > [data-action="record"]').click();
        await assertRecorded('mixed-limit-binary', 1, `${mixedInteractionLabel}/record-lapse`);
        await limitBinary.locator('.lc-checkin__item-action > [data-action="record"]').click();
        const afterSecondUndo = await page.evaluate(async () => { await window.__plugin.mutationQueue; await window.__plugin.saveQueue; return window.__plugin.store.events.filter(event => event.itemId === 'mixed-limit-binary').length; });
        assert.equal(afterSecondUndo, 0, 'record lapse followed by undo returns to no lapse without adding another event');
        assert.equal(await limitBinary.locator('.is-avoided').isVisible(), true, 'undo restores the visible avoided status');
        await limitBinary.locator('[data-action="toggle-exact"]').click();
        const lapseNote = '说明本次破戒原因，明天调整作息';
        await limitBinary.locator('.lc-checkin__record-note').fill(lapseNote);
        assert.match(await limitBinary.locator('[data-exact-entry] [data-action="record"]').innerText(), /破戒|lapse/i, 'expanded lapse submission uses the correct action label');
        await limitBinary.locator('[data-exact-entry] [data-action="record"]').click();
        await assertRecorded('mixed-limit-binary', 1, `${mixedInteractionLabel}/record-lapse-note`);
        assert.equal(await page.evaluate(() => window.__plugin.store.events.find(event => event.itemId === 'mixed-limit-binary')?.note), lapseNote, 'a first lapse can be recorded with its note');
        assert.equal(await limitBinary.locator('[data-action="toggle-exact"]').count(), 0, 'an already recorded binary lapse does not offer an inert note submission');
        await limitBinary.locator('.lc-checkin__item-action > [data-action="record"]').click();
        await page.evaluate(async () => { await window.__plugin.mutationQueue; await window.__plugin.saveQueue; });
        assert.equal(await limitBinary.locator('[data-action="toggle-exact"]').isVisible(), true, 'undoing a lapse restores the note entry for the next record');
        await page.evaluate(() => {
            const plugin = window.__plugin;
            const adapterId = 'siyuan-plugin-docktomato';
            window.__mixedOriginalAdapter = plugin.focusAdapters.get(adapterId);
            window.__mixedAdapterInstalled = true;
            window.__mixedFocusCalls = [];
            plugin.focusAdapters.set(adapterId, {id: adapterId, name: 'QA external timer', canStart: item => item.id === 'mixed-tomato-count', start: async item => { window.__mixedFocusCalls.push({id: item.id, kind: item.kind, tomatoMode: item.tomatoMode}); }, stop: async () => {}});
        });
        const beforeTomato = await page.evaluate(() => window.__plugin.store.events.length);
        await page.locator('[data-item-id="mixed-tomato-count"] [data-action="focus"]').click();
        await page.waitForFunction(() => window.__mixedFocusCalls.length === 1);
        await page.evaluate(async () => { await window.__plugin.focusOperation; });
        assert.deepEqual(await page.evaluate(() => window.__mixedFocusCalls), [{id: 'mixed-tomato-count', kind: 'count', tomatoMode: 'sessions'}], 'count-based tomato habits route through the external adapter with session semantics');
        assert.equal(await page.locator('[data-focus-timer]').count(), 0, 'a tomato-backed count habit does not accidentally open the built-in duration timer');
        assert.equal(await page.evaluate(() => window.__plugin.store.events.length), beforeTomato, 'starting an external tomato does not record a session before it completes');
        console.log(`${mixedInteractionLabel}: manual/quick 625ml, duration/manual decimal, 0.01, post-target recording, lapse undo, large quick value and tomato sessions route ok`);
    } catch (error) {
        scenarioFailures.push(`${mixedInteractionLabel}: ${error.message}`);
        console.error(`FAILED ${mixedInteractionLabel}: ${error.message}`);
        await screenshot({path: path.join(outputRoot, `${mixedInteractionLabel}-failed.png`)});
    } finally {
        await page.evaluate(async () => {
            const plugin = window.__plugin;
            await plugin.stopFocus();
            if (!window.__mixedAdapterInstalled) return;
            const adapterId = 'siyuan-plugin-docktomato';
            if (window.__mixedOriginalAdapter) plugin.focusAdapters.set(adapterId, window.__mixedOriginalAdapter);
            else plugin.focusAdapters.delete(adapterId);
        });
    }
    await page.evaluate(theme => { window.__plugin.appearance = theme; }, qaTheme);
    await resetState();
    await sizeHost(1180, 960);
    /* Capture a unified group like the user screenshot; this only changes the fixture. */
    await page.evaluate(() => {
        const plugin = window.__plugin;
        for (const item of plugin.store.items) { item.group = "日常"; item.timeSlot = "any"; }
        const stretch = plugin.store.items.find(item => item.id === 'stretch');
        for (let daysAgo = 1; daysAgo <= 2; daysAgo++) {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            stretch.createdAt = date.toISOString();
            stretch.createdDate = localDate;
            for (const revision of stretch.revisions) revision.effectiveDate = localDate;
            plugin.store.events = [...plugin.store.events, {id: `streak-${daysAgo}`, itemId: stretch.id, occurredAt: date.toISOString(), localDate, value: 1, unit: '次', source: 'manual'}];
        }
        plugin.store = structuredClone(plugin.store);
        plugin.showToday();
    });
    assert.match(await page.locator('.lc-checkin__overview-streak > strong').textContent(), /^3/, 'warm overview uses three actual completed days');
    await screenshot({path: path.join(outputRoot, 'today-workbench.png')}, page.locator('#dock'));
    if (qaHost === "tab" || qaHost === "dialog") {
        assert.equal(await page.locator('.lc-checkin__topnav-brand').isVisible(), true);
        assert.equal(await page.locator('.lc-checkin__topnav [data-action="close-dialog"]').count(), qaHost === "dialog" ? 1 : 0);
    }
    /* Thirty actual scheduled habits, with count, binary and duration controls. */
    await page.evaluate(() => {
        const plugin = window.__plugin;
        const seeds = ['stretch', 'reading', 'water'].map(id => plugin.store.items.find(item => item.id === id));
        for (let i = 0; i < 27; i++) plugin.store.items.push({...structuredClone(seeds[i % 3]), id: `dense-${i}`, name: ["晨间运动", "阅读练习", "补充水分"][i % 3] + ` ${i + 1}`, priority: 'medium'});
        plugin.store = structuredClone(plugin.store);
        plugin.showToday();
    });
    assert.equal(await page.locator('.lc-checkin--today').getAttribute('data-density'), 'compact');
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { window.__plugin.appearance = value; window.__plugin.showToday(); }, theme);
      for (const width of [2000, 1180, 640, 360, 320]) {
        const label = `30-habits-${theme}-${width}`;
        try {
        await sizeHost(width);
        await waitForVisibleCards(29);
        const density = await page.locator('.lc-checkin__group-items:not([hidden])').evaluateAll(groups => {
            const cards = groups.flatMap(group => [...group.querySelectorAll('.lc-checkin__item')]);
            const host = document.querySelector('#dock').getBoundingClientRect();
            return {count: cards.length, minHeight: Math.min(...cards.map(card => card.getBoundingClientRect().height)), maxHeight: Math.max(...cards.map(card => card.getBoundingClientRect().height)), minWidth: Math.min(...cards.map(card => card.getBoundingClientRect().width)), listHeight: groups.reduce((sum, group) => sum + group.getBoundingClientRect().height, 0), firstCardTop: Math.round(cards[0].getBoundingClientRect().top - host.top), columns: Math.max(...groups.map(group => getComputedStyle(group).gridTemplateColumns.split(/\s+/).length))};
        });
        assert.equal(density.count, 29, '30 scheduled habits include 29 pending and 1 completed');
        assert.ok(density.minWidth > 0 && density.minHeight > 0 && density.listHeight > 0 && density.firstCardTop > 0, `${label}: every measured row must have visible positive geometry ${JSON.stringify(density)}`);
        const heightBudget = width < 720 ? 94 : 120;
        assert.ok(density.maxHeight <= heightBudget, `30 habits at ${width}: ordinary-name row height budget ${heightBudget}px: ${JSON.stringify(density)}`);
        assert.ok(density.listHeight <= (width >= 720 ? 1800 : 3500), `30 habits at ${width}: scrolling budget: ${JSON.stringify(density)}`);
        const groupSurface = await page.locator('.lc-checkin__group-items:not([hidden])').first().evaluate(group => {
            const style = getComputedStyle(group);
            const rows = [...group.querySelectorAll('.lc-checkin__item')];
            return {background: style.backgroundColor, rowGap: style.rowGap, sideBorders: rows.map(row => { const rowStyle = getComputedStyle(row); return [rowStyle.borderLeftWidth, rowStyle.borderRightWidth]; })};
        });
        assert.notEqual(groupSurface.background, 'rgba(0, 0, 0, 0)', `${label}: rows share a visible group surface`);
        assert.equal(groupSurface.rowGap, '0px', `${label}: rows form a continuous list without vertical card gutters`);
        assert.ok(groupSurface.sideBorders.every(borders => borders.every(width => width === '0px')), `${label}: individual rows do not repeat the outer group border`);
        const readingProgress = await page.locator('[data-item-id="reading"]').evaluate(card => ({image: getComputedStyle(card).backgroundImage, progress: getComputedStyle(card).getPropertyValue('--item-progress').trim()}));
        assert.match(readingProgress.image, /linear-gradient/, `${label}: numeric at-least habits show their subtle progress wash`);
        assert.equal(readingProgress.progress, '50%', `${label}: progress wash reflects the actual 15/30 amount`);
        if (width < 720) {
            const targets = await page.locator('.lc-checkin__group-items:not([hidden]) .lc-checkin__item-action > :is(.lc-checkin__focus-primary, .lc-checkin__quick-button, .lc-checkin__record-button, .lc-checkin__more-button)').evaluateAll(elements => elements.length > 0 && elements.map(element => element.getBoundingClientRect()).every(rect => rect.width >= 44 && rect.height >= 44));
            assert.equal(targets, true, 'compact phone controls must keep 44px touch targets');
            assert.ok(density.firstCardTop <= 380, `${label}: first habit must not be pushed below the first screen ${JSON.stringify(density)}`);
        }
        if (width >= 2000) assert.ok(density.columns >= 3, 'wide 30-item lists should use at least three columns');
        await assertLayout(label);
        console.log(`30 habits ${width}: ${JSON.stringify(density)}`);
        await screenshot({path: path.join(outputRoot, `today-30-items-${width}${theme === qaTheme ? '' : `-${theme}`}.png`)}, page.locator('#dock'));
        if (width === 320) {
            await page.locator('[data-action="toggle-bulk"]').click();
            await page.locator('[data-action="bulk-all"]').click();
            assert.equal(await page.locator('[data-bulk-check][aria-pressed="true"]').count(), 29, 'select all targets pending habits only');
            await waitForVisibleCards(29);
            const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(cards => Math.max(...cards.map(card => card.getBoundingClientRect().height)));
            assert.ok(maxHeight > 0 && maxHeight <= 94, `${label}: 30-item selection must retain visible compact rows (${maxHeight}px)`);
            await assertLayout(`${label}/bulk`);
            await screenshot({path: path.join(outputRoot, `today-30-items-bulk-${theme}-${width}.png`)});
            await page.locator('[data-action="bulk-exit"]').click();
        }
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
        if (width === 320) await page.evaluate(() => {
            if (!window.__plugin.bulkMode) return;
            window.__plugin.bulkMode = false;
            window.__plugin.bulkSelected.clear();
            window.__plugin.showToday();
        });
      }
    }
    /* Limiting habits must not reward increasing a lapse with a progress wash,
       nor offer a timer that encourages more of the habit being limited. */
    await page.evaluate(() => {
        const plugin = window.__plugin;
        window.__denseBaseline = structuredClone(plugin.store);
        const store = structuredClone(plugin.store);
        const reading = store.items.find(item => item.id === 'reading');
        reading.direction = 'atMost';
        reading.target = 10;
        for (const revision of reading.revisions) revision.target = 10;
        plugin.store = store;
        plugin.showToday();
    });
    for (const theme of ['light', 'dark']) {
        const label = `limited-habit-${theme}`;
        try {
            await page.evaluate(value => { window.__plugin.appearance = value; window.__plugin.showToday(); }, theme);
            const limited = page.locator('[data-item-id="reading"]');
            assert.equal(await limited.getAttribute('data-direction'), 'atMost');
            assert.equal(await limited.isVisible(), true, '15/10 limiting fixture remains in the pending list');
            assert.equal(await limited.locator('[data-action="focus"]').count(), 0, `${label}: limiting duration has no focus action`);
            assert.equal(await limited.evaluate(card => getComputedStyle(card).backgroundImage), 'none', `${label}: increasing a lapse must not receive the progress background`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
    }
    await page.evaluate(() => { window.__plugin.store = structuredClone(window.__denseBaseline); window.__plugin.showToday(); });
    await page.evaluate(() => {
        for (const item of window.__plugin.store.items.filter(item => item.id.startsWith('dense-'))) {
            item.name += ' — 一个很长的打卡项目名称 Long habit name with units';
            item.unit = '自定义较长单位';
            for (const revision of item.revisions) revision.unit = item.unit;
        }
        window.__plugin.store = structuredClone(window.__plugin.store);
        window.__plugin.showToday();
    });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => { window.__plugin.appearance = value; window.__plugin.showToday(); }, theme);
      for (const width of [2000, 1180, 640, 360, 320]) {
        const label = `long-name-${theme}-${width}`;
        try {
        await sizeHost(width);
        await waitForVisibleCards(29);
        assert.equal(await page.locator('.lc-checkin--today').evaluate(element => element.scrollWidth > element.clientWidth), false, `dense ${width} overflow`);
        const clipped = await page.locator('.lc-checkin__item').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1));
        assert.equal(clipped, false, `dense ${width} card overflow`);
        await assertLayout(label);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    /* Long maintenance/history content must remain usable as the collection
       grows. Replace snapshots to invalidate the model's identity caches. */
    await page.evaluate(theme => {
        const plugin = window.__plugin;
        const reading = plugin.store.items.find(item => item.id === 'reading');
        reading.name = '长期阅读计划 — LongReadingReference'.repeat(3);
        plugin.store.events = plugin.store.events.map(event => ({...event, note: '回顾记录需要保留完整说明。https://example.test/' + 'long-unbroken-reference'.repeat(6)}));
        plugin.store = structuredClone(plugin.store);
        const occasions = plugin.occasionStore.occasions;
        plugin.occasionStore = {version: 1, occasions: Array.from({length: 30}, (_, index) => ({...structuredClone(occasions[index % occasions.length]), id: `many-occasion-${index}`, name: `事项 ${index + 1} — ${occasions[index % occasions.length].name}`}))};
        const now = new Date();
        const stamp = now.toISOString();
        const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        plugin.dockTomatoInbox = {schemaVersion: 1, items: Array.from({length: 12}, (_, index) => ({
            identity: `qa-inbox-${index}`, externalRef: `docktomato:qa-inbox-${index}`, itemId: 'reading', itemUnit: '分钟', tomatoMode: 'minutes', durationMinutes: 25,
            occurredAt: stamp, localDate, state: 'blocked', blockedReason: 'skipped-day', attempts: 0, receivedAt: stamp, updatedAt: stamp,
        }))};
        plugin.appearance = theme;
    }, qaTheme);
    for (const surface of ['settings', 'occasions', 'review', 'insights']) {
      for (const width of [1180, 640, 360, 320]) {
        const label = `${surface}-long-content-${width}`;
        try {
            await sizeHost(width);
            await goto(surface);
            await waitForVisualStability();
            if (surface === 'settings') {
                const entries = page.locator('[data-inbox-identity]');
                assert.equal(await entries.count(), 12, 'all pending entries must remain available');
                assert.equal(await entries.filter({visible: true}).count(), 5, 'inbox initially exposes a bounded first batch');
                for (const expectedCount of [10, 12]) {
                    await page.locator('.lc-checkin__settings-inbox-more:not([open]) > summary').filter({visible: true}).first().click();
                    assert.equal(await entries.filter({visible: true}).count(), expectedCount, 'each disclosure reveals the next batch without dropping entries');
                }
                await page.locator('[data-settings-nav="data"]').click();
                assert.equal(await page.locator('[data-settings-nav="data"]').getAttribute('aria-current'), 'true', 'settings category navigation works with long content');
            }
            if (surface === 'occasions') {
                assert.equal(await page.locator('.lc-checkin__occasion-manager-row').count(), 30);
                if (width < 720) {
                    const controls = await page.locator('.lc-checkin__occasion-row-actions button').evaluateAll(buttons => buttons.every(button => {
                        const box = button.getBoundingClientRect();
                        return box.width >= 44 && box.height >= 44;
                    }));
                    assert.equal(controls, true, 'occasion actions keep 44px touch targets');
                }
                if (width < 960) {
                    const list = await page.locator('.lc-checkin__occasion-manager-list').evaluate(element => ({height: element.clientHeight, scroll: element.scrollHeight, overflow: getComputedStyle(element).overflowY}));
                    assert.ok(list.height > 100 && list.height <= 550 && list.scroll > list.height && /auto|scroll/.test(list.overflow), `30 occasions must not push the editor below an unbounded list ${JSON.stringify(list)}`);
                }
                const note = page.locator('.lc-checkin__occasion-note-fold').first();
                assert.equal(await note.getAttribute('open'), null, 'long notes start folded');
                await note.locator('summary').click();
                assert.equal(await note.locator('.lc-checkin__occasion-row-note').isVisible(), true, 'long notes remain fully accessible');
                assert.match(await note.locator('.lc-checkin__occasion-row-note').textContent(), /long-reference-/);
                await page.locator('[data-occasion-form] button[type="submit"]').click({trial: true});
            }
            await assertLayout(label);
            await screenshot({path: path.join(outputRoot, `${label}.png`)});
            console.log(`${label}: populated content and controls ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    await browser.close();
    assert.deepEqual(pageErrors, [], 'bundle must not raise page errors');
    assert.deepEqual(scenarioFailures, [], 'all responsive scenarios must pass');
    console.log(`Workbench: ${cases.length} surface scenarios + 32 interaction states + 8 theme/palette action-contrast scenarios + 10 mixed-habit layouts + recording-form interactions + 16 populated maintenance/history scenarios; record/undo, labelled focus actions, navigation state, both-theme 30-item density, limiting-habit backgrounds and long-name cards passed.`);
})();
