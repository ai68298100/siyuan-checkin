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
        if (surface === 'review') {
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
            }
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
                await assertEditorSaveReachable(`${label}/${theme}`);
                await page.screenshot({path: path.join(outputRoot, `${label}-${theme}.png`)});
            }
            await page.locator(".lc-checkin--editor").evaluate((element, theme) => { element.dataset.appearance = theme; }, qaTheme);
        }
        if (surface === 'occasions') assert.equal(await page.locator('.lc-checkin__occasion-manager-row').count(), 3, 'occasion fixture must exercise actual nonempty list');
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
        } catch (error) {
            scenarioFailures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await page.screenshot({path: path.join(outputRoot, `${label}-failed.png`)});
        }
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
    console.log(`Workbench: ${cases.length} surface scenarios + 16 populated maintenance/history scenarios; record/undo, focus, navigation ownership, both-theme 30-item and long-name cards passed.`);
})();
