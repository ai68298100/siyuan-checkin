/* Multi-width layout walkthrough: today/review/editor/settings/occasions at
   full-screen, 80% dialog, medium, narrow-dock widths. */
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
    {surface: "editor", width: 640},
    {surface: "editor", width: 360},
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
    }, surface);

    for (const {surface, width} of cases) {
        await page.setViewportSize({width: Math.max(width, 320) + 40, height: 1000});
        await page.locator("#frame").evaluate((element, w) => { element.style.width = `${w}px`; }, Math.max(width, 320));
        await goto(surface);
        await page.waitForTimeout(60);
        if (surface === "today") {
            const names = await page.locator('.lc-checkin__group:not([hidden]) .lc-checkin__item-name').evaluateAll(elements => elements.map(element => ({text: element.textContent, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, parent: getComputedStyle(element.parentElement).cssText, flex: getComputedStyle(element).flex})));
            assert.ok(names.every(name => name.text.trim() && name.width > 20 && name.height >= 16), `names must stay readable at ${width}: ${JSON.stringify(names)}`);
        }
        if (surface === "editor") {
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
                await page.screenshot({path: path.join(outputRoot, `editor-${width}-${theme}.png`)});
            }
            await page.locator(".lc-checkin--editor").evaluate((element) => { element.dataset.appearance = "light"; });
        }
        const overflow = await page.evaluate(() => {
            const host = document.querySelector("#dock");
            return host ? {sw: host.scrollWidth, cw: host.clientWidth} : null;
        });
        await page.screenshot({path: path.join(outputRoot, `${surface}-${width}.png`)});
        assert.ok(overflow && overflow.sw <= overflow.cw, `${qaHost}/${surface}/${width} must not overflow`);
        console.log(`${surface}-${width}: overflow ${overflow ? overflow.sw + "/" + overflow.cw + (overflow.sw > overflow.cw ? " ⚠ H-OVERFLOW" : " ok") : "no layout"}`);
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
    for (const width of [1180, 640, 360, 320]) {
        await page.setViewportSize({width: width + 40, height: 1000});
        await page.locator('#frame').evaluate((element, w) => { element.style.width = `${w}px`; }, width);
        await page.waitForTimeout(30);
        const density = await page.locator('.lc-checkin__group-items:not([hidden])').evaluateAll(groups => {
            const cards = groups.flatMap(group => [...group.querySelectorAll('.lc-checkin__item')]);
            return {count: cards.length, maxHeight: Math.max(...cards.map(card => card.getBoundingClientRect().height)), listHeight: groups.reduce((sum, group) => sum + group.getBoundingClientRect().height, 0)};
        });
        assert.equal(density.count, 29, '30 scheduled habits include 29 pending and 1 completed');
        assert.ok(density.maxHeight <= 120, `30 habits at ${width}: card height budget 120px: ${JSON.stringify(density)}`);
        assert.ok(density.listHeight <= (width >= 720 ? 1800 : 3500), `30 habits at ${width}: scrolling budget: ${JSON.stringify(density)}`);
        if (width < 720) {
            const targets = await page.locator('.lc-checkin__group-items:not([hidden]) .lc-checkin__item-action > :is(.lc-checkin__quick-button, .lc-checkin__record-button, .lc-checkin__focus-button, .lc-checkin__more-button)').evaluateAll(elements => elements.map(element => element.getBoundingClientRect()).filter(rect => rect.width > 0).every(rect => rect.width >= 44 && rect.height >= 44));
            assert.equal(targets, true, 'compact phone controls must keep 44px touch targets');
        }
        console.log(`30 habits ${width}: ${JSON.stringify(density)}`);
        await page.locator('#dock').screenshot({path: path.join(outputRoot, `today-30-items-${width}.png`)});
    }
    await page.evaluate(() => {
        for (const item of window.__plugin.store.items.filter(item => item.id.startsWith('dense-'))) {
            item.name += ' — 一个很长的打卡项目名称 Long habit name with units';
            item.unit = '自定义较长单位';
            for (const revision of item.revisions) revision.unit = item.unit;
        }
        window.__plugin.showToday();
    });
    for (const width of [1180, 640, 360, 320]) {
        await page.setViewportSize({width: width + 40, height: 1000});
        await page.locator('#frame').evaluate((element, w) => { element.style.width = `${w}px`; }, width);
        await page.waitForTimeout(30);
        assert.equal(await page.locator('.lc-checkin--today').evaluate(element => element.scrollWidth > element.clientWidth), false, `dense ${width} overflow`);
        const clipped = await page.locator('.lc-checkin__item').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth + 1));
        assert.equal(clipped, false, `dense ${width} card overflow`);
    }
    assert.deepEqual(pageErrors, []);
    console.log('Workbench: record/undo, focus, navigation ownership, dense long-name cards passed.');
    await browser.close();
})();
