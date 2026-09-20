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
            const stats = await measure(`overview-${count}-${width}`);
            assert.equal(stats.svg, 0, 'default overview must not generate charts');
            assert.deepEqual(stats.open, ['projects'], 'every container opens only project summary');
            assert.equal(await page.locator('[data-review-insights-id]').count(), Math.min(count, 8));
            assert.equal(await page.locator('.lc-checkin__calendar-day, .lc-checkin__history-event').count(), 0, 'inactive record pane has no DOM');
            await workspace('records');
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
    fs.writeFileSync(path.join(folder, 'evidence.json'), JSON.stringify(evidence, null, 2));
    console.log(`Review workspaces: ${evidence.length} layouts; empty/3/30 items, paging, lazy rendering, combined filters, note edit, custom range and heatmap year passed.`);
};
