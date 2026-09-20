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
    await page.evaluate((frontend) => {
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
    }, qaFrontend);
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

    const sizeHost = async (width, height = 720, viewportHeight = 1000) => {
        await page.setViewportSize({width: width + 40, height: viewportHeight});
        await page.locator("#frame").evaluate((element, size) => {
            element.style.width = `${size.width}px`;
            element.style.height = `${size.height}px`;
        }, {width, height});
    };
    const assertLayout = async (label) => {
        const layout = await page.locator("#dock").evaluate(host => {
            const bounds = host.getBoundingClientRect();
            const failures = [];
            const candidates = host.querySelectorAll('button, input:not([type="hidden"]), select, textarea, summary, h1, h2, .lc-checkin__item, .lc-checkin__occasion-manager-row, .lc-checkin__settings-card');
            for (const element of candidates) {
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height || !element.checkVisibility()) continue;
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
            return {width: host.clientWidth, scrollWidth: host.scrollWidth, failures: failures.slice(0, 12)};
        });
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
    const assertTextContrast = async (locator, label) => {
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

    for (const {surface, width, height = 720, viewportHeight = 1000} of cases) {
        const label = `${surface}-${width}${height !== 720 ? `x${height}` : ''}`;
        try {
        await sizeHost(width, height, viewportHeight);
        await goto(surface);
        await page.waitForTimeout(60);
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
            const comparison = page.locator('details.lc-checkin__compare');
            assert.equal(await comparison.getAttribute('open'), null, 'comparison starts folded so the calendar remains near the summary');
            const summary = comparison.locator(':scope > summary');
            await summary.focus();
            await page.keyboard.press('Enter');
            assert.equal(await comparison.locator('.lc-checkin__compare-stats > div:visible').count(), 3, 'keyboard expansion preserves all comparison metrics');
            assert.equal(await comparison.locator('.lc-checkin__compare-chart').isVisible(), true, 'comparison chart remains available on narrow surfaces');
            await assertLayout(`${label}/comparison-open`);
            if (width === 320 || width === 1180) await page.screenshot({path: path.join(outputRoot, `${label}-comparison-open.png`)});
            await summary.click();
            const disclosure = page.locator('.lc-checkin__review-guidance-disclosure');
            assert.equal(await disclosure.getAttribute('open'), null, 'secondary review guidance starts folded');
            await disclosure.locator('summary').click();
            assert.equal(await page.locator('[data-action="preview-agent-suggestion"]').isVisible(), true, 'guidance action remains accessible');
            await assertLayout(`${label}/guidance-open`);
            await disclosure.locator('summary').click();
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
            assert.ok(names.every(name => name.text.trim() && name.width > 20 && name.height >= 16), `names must stay readable at ${width}: ${JSON.stringify(names)}`);
            if (width < 720) {
                const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(elements => Math.max(...elements.map(element => element.getBoundingClientRect().height)));
                assert.ok(maxHeight <= 130, `${label}: even small lists must use compact phone cards (actual ${maxHeight}px)`);
            } else {
                const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(elements => Math.max(...elements.map(element => element.getBoundingClientRect().height)));
                assert.ok(maxHeight <= 200, `${label}: ordinary desktop cards must stay within 200px (actual ${maxHeight}px)`);
            }
        }
        if (surface === "editor") {
            if (width === 320 || width === 1180 || height < 500) {
                const summary = page.locator('[data-template-disclosure] > summary');
                assert.equal(await summary.isVisible(), true, 'template disclosure must not appear as an empty noninteractive pill');
                const summaryBox = await summary.boundingBox();
                assert.ok(summaryBox && summaryBox.height >= (width < 720 || qaFrontend === 'mobile' ? 43.75 : 35.75), `${label}: template disclosure target ${JSON.stringify(summaryBox)}`);
                await summary.click();
                const template = page.locator('[data-template-index]').first();
                await template.click();
                assert.notEqual(await page.locator('input[name="name"]').inputValue(), '', 'template selection fills the real editor');
                await goto('editor');
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
                await page.screenshot({path: path.join(outputRoot, `${label}-${theme}.png`)});
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
        await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
        const layout = await assertLayout(`${qaHost}/${qaTheme}/${label}`);
        console.log(`${label}: overflow ${layout.scrollWidth}/${layout.width} ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                assert.ok(maxHeight <= (size.width < 720 ? 120 : 200), `${label}: selecting must not inflate the habit cards (${maxHeight}px)`);
                await assertLayout(label);
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                await page.locator('[data-item-id="reading"] [data-action="focus"]').click();
                const panel = page.locator('[data-focus-timer]');
                assert.equal(await panel.getAttribute('role'), 'dialog');
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
                await panel.locator('[data-action="focus-toggle"]').click();
                assert.equal(await page.evaluate(() => window.__plugin.focusTimerState.running), true, 'resume updates live timer state');
                await panel.locator('[data-action="focus-abandon"]').click();
                assert.equal(await panel.count(), 0);
                assert.equal(await page.evaluate(() => window.__plugin.store.events.length), initialEvents, 'abandoning focus must not add a record');
            } else if (state === 'search-empty') {
                await page.locator('[data-today-search]').fill('NoSuchHabit-不存在的项目');
                await page.waitForSelector('.lc-checkin__today-search-empty');
                assert.equal(await page.locator('.lc-checkin__item:visible').count(), 0);
                const clear = page.locator('.lc-checkin__today-search-empty [data-action="clear-search"]');
                await assertControlReachable(clear, `${label}/clear`, size.width < 720 || qaFrontend === 'mobile' ? 44 : 36);
                await assertLayout(label);
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
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
                await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
                await add.click();
                assert.equal(await page.locator('.lc-checkin--editor input[name="name"]').inputValue(), '', 'first habit action opens a blank editor');
            }
            console.log(`${label}: interaction state ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
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
    await page.locator('#dock').screenshot({path: path.join(outputRoot, 'today-workbench.png')});
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
        await page.waitForTimeout(30);
        const density = await page.locator('.lc-checkin__group-items:not([hidden])').evaluateAll(groups => {
            const cards = groups.flatMap(group => [...group.querySelectorAll('.lc-checkin__item')]);
            const host = document.querySelector('#dock').getBoundingClientRect();
            return {count: cards.length, maxHeight: Math.max(...cards.map(card => card.getBoundingClientRect().height)), listHeight: groups.reduce((sum, group) => sum + group.getBoundingClientRect().height, 0), firstCardTop: Math.round(cards[0].getBoundingClientRect().top - host.top), columns: Math.max(...groups.map(group => getComputedStyle(group).gridTemplateColumns.split(/\s+/).length))};
        });
        assert.equal(density.count, 29, '30 scheduled habits include 29 pending and 1 completed');
        assert.ok(density.maxHeight <= 120, `30 habits at ${width}: card height budget 120px: ${JSON.stringify(density)}`);
        assert.ok(density.listHeight <= (width >= 720 ? 1800 : 3500), `30 habits at ${width}: scrolling budget: ${JSON.stringify(density)}`);
        if (width < 720) {
            const targets = await page.locator('.lc-checkin__group-items:not([hidden]) .lc-checkin__item-action > :is(.lc-checkin__quick-button, .lc-checkin__record-button, .lc-checkin__focus-button, .lc-checkin__more-button)').evaluateAll(elements => elements.map(element => element.getBoundingClientRect()).filter(rect => rect.width > 0).every(rect => rect.width >= 44 && rect.height >= 44));
            assert.equal(targets, true, 'compact phone controls must keep 44px touch targets');
            assert.ok(density.firstCardTop <= 380, `${label}: first habit must not be pushed below the first screen ${JSON.stringify(density)}`);
        }
        if (width >= 2000) assert.ok(density.columns >= 3, 'wide 30-item lists should use at least three columns');
        await assertLayout(label);
        console.log(`30 habits ${width}: ${JSON.stringify(density)}`);
        await page.locator('#dock').screenshot({path: path.join(outputRoot, `today-30-items-${width}${theme === qaTheme ? '' : `-${theme}`}.png`)});
        if (width === 320) {
            await page.locator('[data-action="toggle-bulk"]').click();
            await page.locator('[data-action="bulk-all"]').click();
            assert.equal(await page.locator('[data-bulk-check][aria-pressed="true"]').count(), 29, 'select all targets pending habits only');
            const maxHeight = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item').evaluateAll(cards => Math.max(...cards.map(card => card.getBoundingClientRect().height)));
            assert.ok(maxHeight <= 120, `${label}: 30-item selection must retain compact cards (${maxHeight}px)`);
            await assertLayout(`${label}/bulk`);
            await page.screenshot({path: path.join(outputRoot, `today-30-items-bulk-${theme}-${width}.png`)});
            await page.locator('[data-action="bulk-exit"]').click();
        }
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
        if (width === 320) await page.evaluate(() => {
            if (!window.__plugin.bulkMode) return;
            window.__plugin.bulkMode = false;
            window.__plugin.bulkSelected.clear();
            window.__plugin.showToday();
        });
      }
    }
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
        await page.waitForTimeout(30);
        assert.equal(await page.locator('.lc-checkin--today').evaluate(element => element.scrollWidth > element.clientWidth), false, `dense ${width} overflow`);
        const clipped = await page.locator('.lc-checkin__item').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1));
        assert.equal(clipped, false, `dense ${width} card overflow`);
        await assertLayout(label);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
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
            await page.waitForTimeout(30);
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
            await page.screenshot({path: path.join(outputRoot, `${label}.png`)});
            console.log(`${label}: populated content and controls ok`);
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
      }
    }
    await browser.close();
    assert.deepEqual(pageErrors, [], 'bundle must not raise page errors');
    assert.deepEqual(scenarioFailures, [], 'all responsive scenarios must pass');
    console.log(`Workbench: ${cases.length} surface scenarios + 32 interaction states + 16 populated maintenance/history scenarios; record/undo, focus, navigation ownership, both-theme 30-item and long-name cards passed.`);
})();
