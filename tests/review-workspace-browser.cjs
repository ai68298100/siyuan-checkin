const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Real production bundle + real event handlers, via width-walkthrough host.
module.exports = async function reviewWorkspaceBrowser({page, goto, sizeHost, waitForVisualStability, assertLayout, screenshot, outputRoot}) {
    const evidence = [];
    const folder = path.join(outputRoot, 'review-workspaces');
    fs.mkdirSync(folder, {recursive: true});
    const seed = async (count, days = 45) => page.evaluate(async ({count, days}) => {
        const plugin = window.__plugin;
        const now = new Date();
        const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
        const definitions = Array.from({length: count}, (_, index) => ({
            id: `review-${index}`, name: `项目 ${String(index).padStart(2, '0')} ${index === 3 ? '长名称与自定义计量单位 LongCustomHabit'.repeat(3) : ''}`,
            kind: index % 3 === 0 ? 'duration' : index % 3 === 1 ? 'quantity' : 'count', target: 10,
            unit: index === 3 ? '自定义长计量单位完整展示' : index % 3 === 0 ? '分钟' : index % 3 === 1 ? 'ml' : '次',
            icon: index % 3 === 0 ? '📖' : '💧', group: index % 2 ? '健康' : '学习', priority: 'medium',
            schedule: {type: 'daily'}, createdAt: start.toISOString(), createdDate: key(start), updatedAt: now.toISOString(),
        }));
        const events = [];
        for (let offset = days - 1; offset >= 0; offset--) {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, 8);
            for (const [index, item] of definitions.entries()) {
                events.push({id: `workspace-${offset}-${index}`, itemId: item.id, occurredAt: date.toISOString(), localDate: key(date), value: index % 3 ? 10 : 5, unit: item.unit,
                    source: offset % 2 ? 'manual' : 'api', note: index === 3 ? '长备注保证完整阅读，组合筛选。https://example.test/' + 'LongUnbrokenText'.repeat(6) : '日常记录'});
            }
        }
        window.__store = {...structuredClone(plugin.store), items: definitions, events, eventTombstones: []};
        plugin.store = {...plugin.store, items: [], events: [], eventTombstones: []};
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        await plugin.reconcileStore();
        await plugin.saveQueue;
        window.__store = structuredClone(plugin.store);
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        plugin.summaryRange = 'month'; plugin.summaryCustomRange = undefined;
        plugin.reviewWorkspace = 'overview'; plugin.historyScope = 'period';
        plugin.historyQuery = ''; plugin.historySource = 'all'; plugin.historyItemId = ''; plugin.historyOrder = 'newest';
        plugin.historyPage = 0; plugin.reviewProjectPage = 0;
        plugin.reviewFoldSections = new Set(); plugin.reviewFoldTouched = false;
        plugin.historyMonth = now; plugin.selectedHistoryDate = key(now);
        plugin.summaryText = undefined;
        if (plugin.syncNoticeTimer !== undefined) clearTimeout(plugin.syncNoticeTimer);
        plugin.syncNoticeTimer = undefined;
    }, {count, days});
    const workspace = async value => {
        await page.locator(`[data-review-workspace="${value}"]`).click();
        await page.waitForSelector(`[data-review-workspace-panel="${value}"]`);
        await waitForVisualStability();
    };
    const openFold = async id => {
        const selector = `[data-review-fold="${id}"]`;
        if (!await page.locator(selector).evaluate(el => el.open)) await page.locator(selector + ' > summary').click();
        await page.waitForSelector(selector + ':not([data-review-lazy])');
        await waitForVisualStability();
    };
    const measure = async label => {
        await assertLayout(label);
        const result = await page.evaluate(() => {
            const root = document.querySelector('.lc-checkin--review');
            return {nodes: root.querySelectorAll('*').length, svg: root.querySelectorAll('svg').length, scrollHeight: root.scrollHeight,
                open: [...root.querySelectorAll('[data-review-fold][open]')].map(el => el.dataset.reviewFold)};
        });
        evidence.push({label, ...result});
        await screenshot({path: path.join(folder, label + '.png')});
        return result;
    };
    for (const count of [0, 3, 30]) {
        await seed(count);
        for (const width of [320, 640, 1180]) {
            await sizeHost(width);
            await page.evaluate(() => { const p = window.__plugin; p.reviewWorkspace = 'overview'; p.reviewFoldTouched = false; p.reviewFoldSections = new Set(); p.reviewProjectPage = 0; });
            await goto('review');
            await waitForVisualStability();
            await page.locator('.lc-checkin--review').evaluate(element => { element.scrollTop = 0; });
            const stats = await measure(`overview-${count}-${width}`);
            assert.equal(stats.svg, 0, 'default overview must not generate charts');
            assert.deepEqual(stats.open, ['projects'], 'every container opens only project summary');
            assert.equal(await page.locator('[data-review-insights-id]').count(), Math.min(count, 8));
            assert.ok(await page.locator('[data-review-rhythm-date]').count() <= 14, 'overview keeps its daily rhythm bounded');
            if (count) assert.ok(await page.locator('[data-review-rhythm-date]').count() > 0);
            assert.equal(await page.locator('.lc-checkin__calendar-day, .lc-checkin__history-event').count(), 0, 'inactive record pane has no DOM');
            await workspace('records');
            assert.equal(await page.locator('[data-review-rhythm-date]').count(), 0);
            await measure(`records-${count}-${width}`);
            assert.ok(await page.locator('.lc-checkin__history-event').count() <= 30, 'only current record page is rendered');
            await page.locator('[data-history-scope="day"]').click();
            await waitForVisualStability();
            await measure(`calendar-${count}-${width}`);
            assert.ok(await page.locator('[data-history-date]').count() >= 28);
            await workspace('analysis');
            const analysis = await measure(`analysis-${count}-${width}`);
            assert.deepEqual(analysis.open, ['trend']);
            assert.equal(await page.locator('.lc-checkin__trend-card').count(), 1);
            assert.equal(await page.locator('[data-review-rhythm-date]').count(), 0);
            await page.locator('.review-chart-data > summary').click();
            assert.ok(await page.locator('.review-chart-data tbody tr').count() > 0, 'selected chart has readable exact values');
            assert.equal(await page.locator('.lc-yearheatmap, .lc-checkin__achievement, .lc-checkin__reminder-row').count(), 0);
            await page.locator('[data-review-trend]').selectOption('daily');
            assert.equal(await page.locator('[data-review-trend]').inputValue(), 'daily');
            await openFold('strength');
            assert.ok(await page.locator('[data-review-fold="strength"] svg').count() <= 1);
            if (count) {
                await page.locator('[data-review-strength-item]').selectOption('review-0');
                assert.equal(await page.locator('[data-review-fold="strength"] svg').count(), 1);
            }
            await measure(`strength-${count}-${width}`);
        }
    }
    await seed(30);
    await sizeHost(360);
    await goto('review');
    await page.locator('[data-review-project-page="1"]').click();
    assert.equal(await page.locator('[data-review-insights-id]').count(), 8);
    assert.equal(await page.evaluate(() => window.__plugin.reviewProjectPage), 1);
    await page.locator('[data-review-project-order]').selectOption('name');
    assert.equal(await page.evaluate(() => window.__plugin.reviewProjectPage), 0);
    await openFold('compare');
    assert.equal(await page.locator('.lc-checkin__compare-chart').isVisible(), true);
    assert.equal(await page.locator('.lc-checkin__compare-stats > div:visible').count(), 3);
    await openFold('report');
    assert.equal(await page.locator('[data-summary-source="local"]').isVisible(), true);
    assert.equal(await page.locator('[data-action="preview-agent-suggestion"]').isVisible(), true);
    await measure('overview-expanded-30-360');
    await workspace('records');
    const firstIds = await page.locator('[data-history-event-id]').evaluateAll(nodes => nodes.map(n => n.dataset.historyEventId));
    await page.locator('[data-history-page="1"]').click();
    const secondIds = await page.locator('[data-history-event-id]').evaluateAll(nodes => nodes.map(n => n.dataset.historyEventId));
    assert.equal(secondIds.length, 30);
    assert.ok(secondIds.every(id => !firstIds.includes(id)), 'next page contains new records');
    await page.locator('.review-more-filters > summary').click();
    await page.locator('[data-history-item]').selectOption('review-3');
    assert.equal(await page.evaluate(() => window.__plugin.historyPage), 0);
    await page.locator('[data-history-source]').selectOption('manual');
    await page.locator('[data-history-search]').fill('组合筛选');
    await page.waitForFunction(() => window.__plugin.historyQuery === '组合筛选');
    const filtered = await page.locator('.lc-checkin__history-event').allTextContents();
    assert.ok(filtered.length > 0 && filtered.every(text => text.includes('项目 03') && text.includes('组合筛选')));
    assert.equal(await page.locator('[data-history-search]').evaluate(el => el === document.activeElement), true);
    await measure('records-filtered-30-360');
    await page.locator('[data-edit-history-event-id]').first().click();
    await page.locator('[data-history-note-input]').fill('本轮浏览器验证备注');
    await page.locator('[data-save-history-note-id]').click();
    await page.waitForFunction(() => window.__plugin.store.events.some(e => e.note === '本轮浏览器验证备注'));
    await page.locator('[data-action="clear-history-filters"]').click();
    assert.equal(await page.locator('[data-history-item]').inputValue(), '');
    assert.equal(await page.locator('[data-history-source]').inputValue(), 'all');
    assert.equal(await page.locator('[data-history-search]').inputValue(), '');
    await page.locator('.lc-checkin__custom-range-disclosure > summary').click();
    const today = await page.evaluate(() => window.__plugin.selectedHistoryDate);
    await page.locator('[name="customStartDate"]').fill(today);
    await page.locator('[name="customEndDate"]').fill(today);
    await page.locator('[data-custom-range] button[type="submit"]').click();
    assert.equal(await page.evaluate(() => window.__plugin.summaryCustomRange?.startDate), today, 'custom period actually applies');
    assert.equal(await page.locator('.lc-checkin__history-event').count(), 30);
    await workspace('analysis');
    await openFold('heatmap');
    const oldYear = await page.locator('.lc-checkin__heatmap-nav strong').textContent();
    await page.locator('[data-heatmap-year="-1"]').click();
    assert.equal(Number(await page.locator('.lc-checkin__heatmap-nav strong').textContent()), Number(oldYear) - 1);
    for (const id of ['balance', 'achievements', 'reminders', 'upcoming']) await openFold(id);
    await measure('analysis-expanded-30-360');
    await sizeHost(844, 350, 390);
    await measure('analysis-expanded-30-844x350');

    // Drill down from the overview must clear leftover record filters, so the
    // visible rhythm count and the opened day describe the same population.
    await sizeHost(360);
    await workspace('overview');
    await page.evaluate(() => {
        const plugin = window.__plugin;
        plugin.historyQuery = 'a query that excludes everything';
        plugin.historyItemId = 'review-3'; plugin.historySource = 'manual'; plugin.historyOrder = 'oldest';
        plugin.historyPage = 4;
    });
    const rhythmDate = await page.locator('[data-review-rhythm-date]').last().getAttribute('data-review-rhythm-date');
    await page.locator('[data-review-rhythm-date]').last().click();
    await page.waitForSelector('[data-review-workspace-panel="records"]');
    assert.deepEqual(await page.evaluate(() => {
        const p = window.__plugin;
        return {workspace: p.reviewWorkspace, scope: p.historyScope, date: p.selectedHistoryDate, query: p.historyQuery, item: p.historyItemId, source: p.historySource, order: p.historyOrder, page: p.historyPage};
    }), {workspace: 'records', scope: 'day', date: rhythmDate, query: '', item: '', source: 'all', order: 'newest', page: 0});
    assert.equal(await page.locator('.lc-checkin__history-event').count(), 30);

    // Agent registration and a summary provider are separate capabilities. The
    // simulated providers below are local functions and never make requests.
    await workspace('overview');
    await page.evaluate(() => {
        const p = window.__plugin;
        p.agentCapabilityState = 'registered';
        p.agentCapabilityIds = ['read-summary', 'read-records'];
        p.summaryProviders.clear(); p.analysisHistory = []; p.summaryError = undefined;
        p.render();
        window.__reviewClipboardWrites = [];
        window.__reviewClipboardFail = true;
        window.__reviewClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {
            writeText: async text => {
                if (window.__reviewClipboardFail) throw new Error('Clipboard unavailable in this test host');
                window.__reviewClipboardWrites.push(text);
            },
        }});
    });
    await page.locator('[data-action="review-assistant"]:visible').click();
    assert.equal(await page.locator('[data-review-fold="report"]').evaluate(node => node.open), true);
    assert.equal(await page.locator('[data-review-assistant-goal]').evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('[data-action="generate-summary"]').count(), 0, 'registered host capabilities alone do not expose provider generation');
    assert.equal(await page.locator('[data-action="copy-review-prompt"]').isVisible(), true);
    await page.locator('[data-action="copy-review-prompt"]').click();
    await page.waitForFunction(() => {
        const prompt = document.querySelector('[data-review-assistant-prompt]');
        return prompt && document.activeElement === prompt && prompt.selectionStart === 0 && prompt.selectionEnd === prompt.value.length;
    });
    assert.equal(await page.locator('.review-assistant-prompt').evaluate(node => node.open), true, 'clipboard failure opens a selectable prompt fallback');
    const summaryPrompt = await page.locator('[data-review-assistant-prompt]').inputValue();
    await page.locator('[data-review-assistant-goal]').selectOption('plan');
    assert.equal(await page.evaluate(() => window.__plugin.reviewAssistantGoal), 'plan');
    const planPrompt = await page.locator('[data-review-assistant-prompt]').inputValue();
    assert.notEqual(planPrompt, summaryPrompt, 'changing the requested review goal changes the actual copyable prompt');
    assert.ok(planPrompt.includes(rhythmDate));
    await page.evaluate(() => { window.__reviewClipboardFail = false; });
    await page.locator('[data-action="copy-review-prompt"]').click();
    await page.waitForFunction(() => window.__reviewClipboardWrites.length === 1);
    assert.equal(await page.evaluate(() => window.__reviewClipboardWrites[0]), planPrompt);
    await measure('assistant-registered-no-provider-360');

    await page.evaluate(() => {
        window.__reviewProviderMode = 'pending';
        window.__reviewProviderCalls = [];
        window.__reviewProviderOff = window.siyuanCheckin.registerSummaryProvider({
            id: 'review-browser-provider', name: '本地回归适配器',
            summarize(request) {
                window.__reviewProviderCalls.push(structuredClone(request));
                if (window.__reviewProviderMode === 'fail') return Promise.reject(new Error('<img src=x onerror="boom">'));
                return new Promise(resolve => { window.__reviewProviderFinish = resolve; });
            },
        });
    });
    await page.waitForSelector('[data-action="generate-summary"]');
    assert.equal(await page.evaluate(() => window.__reviewProviderCalls.length), 0, 'rendering and registering never auto-generate');
    await page.locator('[data-action="generate-summary"]').click();
    await page.waitForSelector('[data-summary-refresh-state="loading"]');
    assert.equal(await page.locator('[data-action="generate-summary"]').isDisabled(), true);
    assert.equal(await page.locator('[data-action="copy-review-prompt"]').isEnabled(), true);
    await page.evaluate(() => { window.__reviewProviderFinish('CURRENT_BROWSER_ANALYSIS'); });
    await page.waitForSelector('[data-summary-source="agent"]');
    assert.ok((await page.locator('[data-summary-source="agent"]').textContent()).includes('CURRENT_BROWSER_ANALYSIS'));
    assert.equal(await page.evaluate(() => window.__reviewProviderCalls.length), 1);
    assert.equal(await page.locator('[data-action="view-analysis-history"]').isVisible(), true);
    await measure('assistant-generated-360');

    await page.evaluate(() => { window.__reviewProviderMode = 'fail'; });
    await page.locator('[data-action="generate-summary"]').click();
    await page.waitForSelector('.review-assistant [role="alert"]');
    assert.ok((await page.locator('.review-assistant [role="alert"]').textContent()).includes('<img src=x onerror="boom">'));
    assert.equal(await page.locator('.review-assistant [role="alert"] img').count(), 0, 'provider errors are rendered as escaped text');
    assert.equal(await page.locator('[data-action="generate-summary"]').isEnabled(), true);

    // A late response from another selected period must not replace current
    // local facts or be added to history as if it were a fresh result.
    await page.evaluate(() => { window.__reviewProviderMode = 'pending'; });
    const historyBefore = await page.evaluate(() => window.__plugin.analysisHistory.length);
    await page.locator('[data-action="generate-summary"]').click();
    await page.waitForSelector('[data-summary-refresh-state="loading"]');
    await page.locator('[data-summary-range="week"]').click();
    await page.waitForSelector('[data-summary-cache-state="stale"]');
    await page.evaluate(async () => {
        window.__reviewProviderFinish('LATE_OLD_PERIOD_ANALYSIS');
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.equal(await page.locator('[data-summary-source="agent"]').count(), 0);
    assert.equal(await page.locator('[data-summary-source="local"]').isVisible(), true);
    assert.equal(await page.evaluate(() => window.__plugin.analysisHistory.length), historyBefore);
    assert.ok(!(await page.locator('[data-review-fold="report"]').textContent()).includes('LATE_OLD_PERIOD_ANALYSIS'));
    await measure('assistant-stale-period-360');
    await page.evaluate(() => {
        window.__reviewProviderOff();
        if (window.__reviewClipboardDescriptor) Object.defineProperty(navigator, 'clipboard', window.__reviewClipboardDescriptor);
        else delete navigator.clipboard;
    });
    // Real quota rows retain their own unit/period and never show a fake daily
    // completion delta, including at the narrowest supported container.
    await seed(3);
    await page.evaluate(() => {
        const p = window.__plugin;
        p.store = {...p.store, items: p.store.items.map((item, index) => {
            if (index > 1) return item;
            const schedule = {type: 'quota', quota: {period: 'week', amount: index === 0 ? 20 : 3, countMode: index === 0 ? 'value' : 'dates'}};
            return {...item, schedule, revisions: [{effectiveDate: item.createdDate, kind: item.kind, target: item.target, unit: item.unit, schedule}]};
        })};
        p.render();
    });
    await sizeHost(320);
    assert.equal(await page.locator('[data-review-project-mode="currentQuota"]').count(), 2);
    await openFold('compare');
    assert.equal(await page.locator('.lc-checkin__compare-item.is-uncomparable').count(), 2);
    assert.equal(await page.locator('.is-uncomparable .lc-checkin__compare-item-bar, .is-uncomparable em').count(), 0);
    for (const text of await page.locator('.is-uncomparable .lc-checkin__compare-item-counts').allTextContents()) {
        assert.match(text, /\d+.*\/.*\d+/, 'both current and baseline quota record counts remain readable');
    }
    await measure('quota-comparison-320');
    // These two disclosures used to escape the ordinary first-screen matrix:
    // quota rows inside balance inherited a 320px grid minimum, while the
    // expanded custom date form could shrink each native input to 16px.
    // Collect both diagnostics before failing so one regression cannot hide
    // the other when validating an older production bundle.
    const narrowDisclosureFailures = [];
    const checkNarrowDisclosure = async (label, check) => {
        try {
            await check();
            await measure(label);
        } catch (error) {
            await screenshot({path: path.join(folder, label + '-failed.png')});
            narrowDisclosureFailures.push(`${label}: ${error.message}`);
        }
    };
    await workspace('analysis');
    await openFold('balance');
    await page.locator('[data-review-fold="balance"] .lc-checkin__review-project-list').scrollIntoViewIfNeeded();
    await checkNarrowDisclosure('quota-balance-320', async () => {
        const list = page.locator('[data-review-fold="balance"] .lc-checkin__review-project-list');
        assert.equal(await list.locator('[data-review-project-mode="currentQuota"]').count(), 2,
            'balance must actually contain both value and distinct-date quota revisions');
        const geometry = await list.evaluate(element => {
            const box = element.getBoundingClientRect();
            const parent = element.parentElement;
            const parentBox = parent.getBoundingClientRect();
            return {width: element.clientWidth, scrollWidth: element.scrollWidth,
                parent: {width: parent.clientWidth, scrollWidth: parent.scrollWidth, left: box.left - parentBox.left, right: box.right - parentBox.left},
                children: [...element.children].map(child => {
                const rect = child.getBoundingClientRect();
                return {width: child.clientWidth, scrollWidth: child.scrollWidth, left: rect.left - box.left, right: rect.right - box.left};
            })};
        });
        assert.ok(geometry.width > 0 && geometry.scrollWidth <= geometry.width + 1,
            `quota list content must fit its own container: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.parent.scrollWidth <= geometry.parent.width + 1 && geometry.parent.left >= -1 && geometry.parent.right <= geometry.parent.width + 1,
            `quota list must not expand or overflow its disclosure body: ${JSON.stringify(geometry)}`);
        for (const row of geometry.children) assert.ok(row.width > 0 && row.scrollWidth <= row.width + 1 && row.left >= -1 && row.right <= geometry.width + 1,
            `quota row and long labels must fit their parent: ${JSON.stringify({listWidth: geometry.width, row})}`);
    });
    const customDisclosure = page.locator('.lc-checkin__custom-range-disclosure');
    for (const size of [{width: 320}, {width: 640}, {width: 720}, {width: 844, height: 350, viewportHeight: 390}, {width: 1180}]) {
        if (await customDisclosure.evaluate(element => element.open)) await customDisclosure.locator('summary').click();
        await sizeHost(size.width, size.height || 720, size.viewportHeight || 1000);
        // Repeat the real scrolled-content -> header -> open path at every
        // breakpoint. A fresh top-only fixture misses stale fixed offsets.
        await page.locator('[data-review-fold="balance"] .lc-checkin__review-project-list').scrollIntoViewIfNeeded();
        await customDisclosure.locator('summary').scrollIntoViewIfNeeded();
        await customDisclosure.locator('summary').click();
        await waitForVisualStability();
        const label = `custom-range-${size.width}${size.height ? `x${size.height}` : ''}`;
        await checkNarrowDisclosure(label, async () => {
            const panel = await page.locator('[data-custom-range]').evaluate(element => {
                const box = element.getBoundingClientRect();
                const host = document.querySelector('#dock').getBoundingClientRect();
                return {left: box.left - host.left, right: box.right - host.left, top: box.top - host.top, bottom: box.bottom - host.top,
                    width: box.width, height: box.height, hostWidth: host.width, hostHeight: host.height};
            });
            assert.ok(panel.width > 0 && panel.height > 0 && panel.left >= -1 && panel.right <= panel.hostWidth + 1
                && panel.top >= -1 && panel.bottom <= panel.hostHeight + 1,
                `expanded date panel must stay inside its host: ${JSON.stringify(panel)}`);
            const controls = await page.locator('[data-custom-range] input, [data-custom-range] button').evaluateAll(elements => elements.map(element => {
                const box = element.getBoundingClientRect();
                const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
                return {tag: element.tagName, name: element.getAttribute('name'), left: box.left, top: box.top, bottom: box.bottom,
                    width: box.width, height: box.height, visible: element.checkVisibility(), hit: element === hit || element.contains(hit),
                    hitTarget: hit?.className, headerBottom: document.documentElement.style.getPropertyValue('--lc-checkin-review-header-bottom')};
            }));
            assert.equal(controls.filter(control => control.tag === 'INPUT').length, 2);
            for (const control of controls) assert.ok(control.visible && control.hit && control.width >= (control.tag === 'INPUT' ? 140 : 44) && control.height >= 44,
                `expanded dates must be readable and every form control reachable: ${JSON.stringify(control)}`);
        });
    }
    assert.deepEqual(narrowDisclosureFailures, [], 'narrow expanded review disclosures must remain usable');
    await page.locator('[name="customStartDate"]').fill(today);
    await page.locator('[name="customEndDate"]').fill(today);
    await page.locator('[data-custom-range] button[type="submit"]').click();
    assert.deepEqual(await page.evaluate(() => window.__plugin.summaryCustomRange), {startDate: today, endDate: today},
        'the readable responsive date controls still apply a real custom range');
    fs.writeFileSync(path.join(folder, 'evidence.json'), JSON.stringify(evidence, null, 2));
    console.log(`Review workspaces: ${evidence.length} layouts; bounded rhythm, chart data, paging, filters, note edit, custom dates, assistant handoff, clipboard fallback and local provider lifecycle passed.`);
};
