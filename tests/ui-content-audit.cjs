/* Full-content production-bundle audit. Invoked by width-walkthrough with
   CHECKIN_QA_CONTENT_AUDIT=1; CHECKIN_QA_AUDIT_BASELINE=1 reports before fixes. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

module.exports = async function auditContent({page, goto, sizeHost, waitForVisualStability, assertLayout, screenshot, outputRoot, qaTheme, qaHost, qaFrontend}) {
    const baseline = process.env.CHECKIN_QA_AUDIT_BASELINE === '1';
    const failures = [];
    const report = [];
    const out = path.join(outputRoot, 'content-audit');
    fs.mkdirSync(out, {recursive: true});
    await page.evaluate(async () => {
        const plugin = window.__plugin;
        const now = new Date();
        const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 110);
        const imageIcon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#6259df"/></svg>');
        const definitions = [
            {id: 'reading', name: '深度阅读与长期学习计划', icon: imageIcon, kind: 'duration', target: 30, unit: '分钟', group: '学习'},
            {id: 'water', name: '饮水量', icon: '💧', kind: 'quantity', target: 2000, unit: '毫升', recordStep: 250, group: '健康'},
            {id: 'stretch', name: '晨间拉伸', icon: '☀', kind: 'binary', target: 1, unit: '次', group: '健康'},
            {id: 'custom', name: '自定义阅读进度 LongReferenceName自定义长名称', icon: '📚', kind: 'custom', target: 100, unit: '完整学习单元', recordStep: 0.5, group: '学习'},
            {id: 'walk', name: '每周散步', icon: '🚶', kind: 'quantity', target: 5, unit: '公里', schedule: {type: 'quota', quota: {period: 'week', amount: 3, countMode: 'dates', weekStartsOn: 1}}, group: '健康'},
            {id: 'archived', name: '已归档的长期练习项目', icon: '✓', kind: 'count', target: 3, unit: '次', archived: true},
        ];
        const items = definitions.map((definition, index) => {
            const item = {priority: 'medium', timeSlot: 'any', completionSource: 'manual', schedule: {type: 'daily'}, createdAt: start.toISOString(), updatedAt: now.toISOString(), createdDate: key(start), archivePeriods: [], sortOrder: index, ...definition};
            item.revisions = [{effectiveDate: key(start), kind: item.kind, target: item.target, unit: item.unit, recordStep: item.recordStep, schedule: structuredClone(item.schedule)}];
            return item;
        });
        const events = [];
        for (let day = 89; day >= 0; day--) {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 8);
            for (let index = 0; index < items.length - 1; index++) {
                if (day > 0 && (day + index) % 5 === 0) continue;
                const item = items[index];
                events.push({id: `audit-${day}-${index}`, itemId: item.id, localDate: key(date), occurredAt: date.toISOString(), value: item.target * (day % 3 ? 1 : .5), unit: item.unit, source: 'manual', note: day < 2 ? '实际记录说明，保留内容和计量单位。https://example.test/' + 'LongReference'.repeat(8) : '持续练习，记录真实投入。'});
                if (day === 0 && index === 0) events.push({id: 'audit-extra', itemId: item.id, localDate: key(date), occurredAt: new Date(date.getTime() + 3600000).toISOString(), value: 5, unit: item.unit, source: 'manual', note: '同日第二次记录，验证日志分组。'});
            }
        }
        window.__store = {...structuredClone(plugin.store), items, events, eventTombstones: []};
        plugin.store = {...plugin.store, items: [], events: [], eventTombstones: []};
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        await plugin.reconcileStore();
        await plugin.saveQueue;
        window.__store = structuredClone(plugin.store);
        plugin.lastPersistedStore = plugin.cloneStore(plugin.store);
        plugin.summaryRange = 'month';
        plugin.summaryText = '本月记录保持稳定。下阶段建议优先安排短时段练习，并保留每次真实投入的时长与备注。';
        plugin.selectedHistoryDate = key(now);
        plugin.historyMonth = now;
        if (plugin.syncNoticeTimer !== undefined) clearTimeout(plugin.syncNoticeTimer);
        plugin.syncNoticeTimer = undefined;
    });

    const inventory = () => page.evaluate(() => {
        const host = document.querySelector('#dock');
        const rows = [];
        const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            const text = node.textContent.trim();
            const element = node.parentElement;
            if (!text || !element?.checkVisibility() || element.closest('svg, style, script, option')) continue;
            const box = element.getBoundingClientRect();
            if (box.width <= 0 || box.height <= 0) continue;
            const style = getComputedStyle(element);
            const section = element.closest('[data-review-fold], [data-settings-group], section, article');
            const micro = !!element.closest('[aria-hidden="true"], .lc-checkin__calendar-day b, .lc-checkin__priority-reminder-row-mark, .lc-checkin__chevron') || box.width <= 2 || box.height <= 2 || !/[\p{L}\p{N}]/u.test(text);
            rows.push({text: text.slice(0, 110), tag: element.tagName, class: element.className, section: section?.getAttribute('data-review-fold') || section?.getAttribute('data-settings-group') || section?.className || '', font: parseFloat(style.fontSize), line: style.lineHeight, weight: style.fontWeight, color: style.color, width: Math.round(box.width), height: Math.round(box.height), overflow: element.scrollWidth > element.clientWidth + 1, micro});
        }
        return rows;
    });
    const roles = {
        today: [
            ['.lc-checkin__item-name', 14], ['.lc-checkin__item-value > span', 12],
            ['.lc-checkin__item-step', 12], ['.lc-checkin__overview-label', 12], ['.lc-checkin__priority-reminder-row-text small', 12],
            ['.lc-checkin__group-header > span:first-child', 13],
        ],
        'review-overview': [
            ['.lc-checkin__review-fold > summary', 14], ['.lc-checkin__review-item > strong', 13],
            ['.lc-checkin__review-item-meta', 12], ['.lc-checkin__summary-text', 13],
            ['.lc-checkin__review-hero-actions .lc-checkin__text-button', 12],
            ['.lc-checkin__compare-item > strong', 13],
        ],
        'review-records': [
            ['.lc-checkin__history-event-main > strong', 13], ['.lc-checkin__history-event-main > span', 12],
            ['.lc-checkin__history-event-note', 13], ['.lc-checkin__history-event-value', 13],
            ['.lc-checkin__history-date > strong', 14], ['.lc-checkin__history-filter-row label > span', 12],
        ],
        'review-analysis': [
            ['.lc-checkin__review-fold > summary', 14], ['.lc-checkin__yearheatmap-meta small', 12],
            ['.lc-checkin__trend-card small', 12], ['.lc-checkin__strength-overview strong', 13],
            ['.lc-checkin__upcoming-row em', 12], ['.lc-checkin__achievement strong', 13],
        ],
        editor: [['.lc-checkin__field > small', 12], ['.lc-checkin__preview-body small', 12], ['.lc-checkin__preview-action', 12], ['.lc-checkin__group-options button', 12]],
        insights: [['.lc-checkin__insight-legend', 12], ['.lc-checkin__insight-grid-range', 12], ['.lc-checkin__coaching-item small', 12]],
        archived: [['.lc-checkin__history-row strong', 14], ['.lc-checkin__archived-select-all', 13]],
        settings: [['.lc-checkin__settings-card h2', 14], ['.lc-checkin__settings-label small', 12], ['.lc-checkin__settings-value', 13], ['kbd', 12], ['.lc-checkin__audit-list small', 12]],
        occasions: [['.lc-checkin__occasion-template-name', 13], ['.lc-checkin__occasion-template-category-label', 12], ['.lc-checkin__occasion-template-categories button em', 12], ['.lc-checkin__occasion-template-browser-head', 12], ['.lc-checkin__occasion-form-panel .lc-checkin__field > small', 12]],
    };
    const checkRoles = async surface => {
        const checks = [];
        for (const [selector, min] of [...roles[surface], ['.lc-checkin__mobile-nav small', 12]]) {
            const values = await page.locator(selector).evaluateAll(elements => elements.filter(element => element.checkVisibility() && element.getBoundingClientRect().height > 0).map(element => ({text: element.textContent.slice(0, 60), font: parseFloat(getComputedStyle(element).fontSize)})));
            checks.push({selector, min, values});
            if (surface.startsWith('review-') && selector !== '.lc-checkin__mobile-nav small') assert.ok(values.length > 0, `${surface} must contain visible ${selector}; absent roles must not silently pass`);
            if (!baseline) for (const value of values) assert.ok(value.font >= min - .1, `${surface} ${selector}: expected >=${min}px, got ${JSON.stringify(value)}`);
        }
        assert.ok(checks.some(check => check.values.length > 0), `${surface} must expose populated text roles`);
        return checks;
    };
    const captureSection = async (locator, label) => {
        if (!await locator.count() || !await locator.first().isVisible()) return;
        await locator.first().evaluate(element => element.scrollIntoView({block: 'start', behavior: 'instant'}));
        await waitForVisualStability();
        await screenshot({path: path.join(out, `${label}.png`)});
    };
    const expandReviewWorkspace = async workspace => {
        await page.locator(`[data-review-workspace="${workspace}"]`).click();
        await page.waitForSelector(`[data-review-workspace-panel="${workspace}"]`);
        if (workspace === 'records') {
            await page.locator('[data-history-scope="day"]').click();
            await page.waitForSelector('[data-history-scope="day"][aria-pressed="true"]');
        }
        const expected = {
            overview: ['projects', 'compare', 'report'], records: [],
            analysis: ['trend', 'heatmap', 'strength', 'balance', 'achievements', 'reminders', 'upcoming'],
        }[workspace];
        const ids = await page.locator('[data-review-fold]').evaluateAll(elements => elements.map(element => element.dataset.reviewFold));
        assert.deepEqual(ids, expected, `${workspace} must expose every planned section`);
        // A lazy fold replaces the review DOM. Resolve each locator afresh and
        // wait for materialization before opening the next fold.
        for (const id of expected) {
            const selector = `[data-review-fold="${id}"]`;
            if (!await page.locator(selector).evaluate(element => element.open)) {
                await page.locator(`${selector} > summary`).click();
            }
            await page.waitForFunction(sectionId => {
                const section = document.querySelector(`[data-review-fold="${sectionId}"]`);
                return section?.open && section.dataset.reviewLazy !== 'true';
            }, id);
            await waitForVisualStability();
        }
        // Inner disclosures do not lazy render, but only become available after
        // their parent fold has materialized. Menus are tested independently.
        await page.locator('[data-review-workspace-panel] details:not([data-review-fold])').evaluateAll(elements => elements.forEach(element => { element.open = true; }));
        await waitForVisualStability();
    };
    const sizes = [{width: 1180}, {width: 640}, {width: 360}, {width: 320}, {width: 844, height: 350, viewportHeight: 390}];
    const scenarios = ['today', 'review-overview', 'review-records', 'review-analysis', 'editor', 'insights', 'archived', 'settings', 'occasions'];
    for (const scenario of scenarios) {
      const workspace = scenario.startsWith('review-') ? scenario.slice('review-'.length) : undefined;
      const surface = workspace ? 'review' : scenario;
      for (const size of sizes) {
        const label = `${scenario}-${size.width}${size.height ? 'x350' : ''}`;
        try {
            await sizeHost(size.width, size.height || 720, size.viewportHeight || 1000);
            if (workspace) await page.evaluate(() => {
                const plugin = window.__plugin;
                plugin.reviewWorkspace = 'overview';
                plugin.reviewFoldSections = new Set();
                plugin.reviewFoldTouched = false;
                plugin.historyScope = 'period';
                plugin.historyPage = 0;
                plugin.historyItemId = '';
                plugin.historyQuery = '';
                plugin.historySource = 'all';
                plugin.historyOrder = 'newest';
                plugin.reviewProjectPage = 0;
                plugin.reviewTrend = 'weekly';
                plugin.reviewStrengthItemId = '';
            });
            await goto(surface);
            if (surface === 'review') {
                await expandReviewWorkspace(workspace);
            } else if (surface === 'editor') {
                await page.locator('[data-advanced]').evaluate(element => { element.open = true; });
            } else if (surface === 'settings' || surface === 'occasions' || surface === 'insights') {
                await page.locator(`.lc-checkin--${surface} details`).evaluateAll(nodes => nodes.forEach(element => { element.open = true; }));
            }
            await waitForVisualStability();
            const rows = await inventory();
            report.push({label, rows, roles: await checkRoles(scenario)});
            fs.writeFileSync(path.join(out, `${label}-fonts.json`), JSON.stringify(rows, null, 2));
            if (!baseline) assert.deepEqual(rows.filter(row => !row.micro && row.font < 11.9).map(row => ({text: row.text, font: row.font, class: row.class})), [], 'all visible non-decorative text must be at least 12px');
            await assertLayout(`content/${label}`);
            if (!baseline && workspace === 'records') {
                const geometry = await page.evaluate(() => {
                    const actions = [...document.querySelectorAll('.lc-checkin__history-event-actions')].filter(e => e.checkVisibility()).map(e => [...e.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return {y: r.y, h: r.height}; }));
                    const recordWidths = [...document.querySelectorAll('.lc-checkin__history-event-main')].filter(e => e.checkVisibility()).map(e => e.getBoundingClientRect().width);
                    const longNotes = [...document.querySelectorAll('.lc-checkin__history-event-note')].filter(e => e.checkVisibility()).map(e => ({text: e.textContent, overflow: e.scrollWidth > e.clientWidth + 1}));
                    return {actions, recordWidths, longNotes};
                });
                assert.ok(geometry.actions.length > 0, 'history must have populated actions');
                for (const buttons of geometry.actions) {
                    assert.equal(buttons.length, 3, 'history exposes three actions');
                    assert.ok(buttons.every(b => b.h >= 44 && Math.abs(b.y - buttons[0].y) < 1), 'history actions stay in one reachable row');
                }
                assert.ok(geometry.recordWidths.length > 0 && geometry.recordWidths.every(width => width >= 60), `record body must not collapse into a vertical strip: ${geometry.recordWidths}`);
                assert.ok(geometry.longNotes.some(note => note.text.includes('LongReference'.repeat(8))), 'the long-note fixture must remain fully present');
                assert.ok(geometry.longNotes.every(note => !note.overflow), 'long record notes must wrap without horizontal clipping');
            }
            if (!baseline && workspace === 'analysis') {
                const svgFonts = await page.locator('.lc-chart text, .lc-yearheatmap__label').evaluateAll(elements => elements.filter(element => element.checkVisibility()).map(element => parseFloat(getComputedStyle(element).fontSize) * element.getScreenCTM().d));
                assert.ok(svgFonts.length > 20, 'populated charts must expose real axis labels');
                /* SVG axes may scale below the 12px DOM role floor inside a
                   narrow chart card; 7.5px is the documented visual minimum
                   for axis/date micro-labels, while normal text is checked
                   separately above. */
                assert.ok(svgFonts.every(font => font >= 7.5 && font <= 20), `chart text must stay readable after SVG scaling: ${svgFonts}`);
            }
            if (!baseline && workspace === 'overview') {
                assert.ok(await page.locator('.lc-checkin__review-item-icon img').count() > 0, 'custom review icon renders as an image');
                assert.ok(await page.locator('.lc-checkin__review-item > strong').filter({hasText: 'LongReferenceName'}).count() > 0, 'overview must include the long custom project name');
            }
            if (!baseline && surface === 'insights') {
                const cells = await page.locator('.lc-checkin__insight-grid > *').evaluateAll(nodes => nodes.map(e => {const r = e.getBoundingClientRect(); return {x: r.x, y: r.y};}));
                assert.equal(cells.length, 84, '12 weeks of day cells');
                assert.ok(cells.slice(0, 7).every(c => c.x === cells[0].x), 'seven weekdays occupy the first column');
                assert.ok(cells[7].x > cells[0].x && cells[7].y === cells[0].y, 'each next week starts a new column');
            }
            await captureSection(page.locator(`.lc-checkin--${surface} .lc-checkin__layout`), `${label}-top`);
            if (surface === 'review' && [320, 1180].includes(size.width)) {
                for (const section of await page.locator('[data-review-fold]').all()) {
                    const id = await section.getAttribute('data-review-fold');
                    await captureSection(section, `${label}-${id}`);
                }
                if (workspace === 'records') await captureSection(page.locator('.lc-checkin__review-detail'), `${label}-history`);
                if (workspace === 'analysis') await captureSection(page.locator('.lc-checkin__year-heatmap'), `${label}-heatmap`);
            }
            if (surface === 'settings' && [320, 1180].includes(size.width)) {
                for (const section of await page.locator('[data-settings-group]').all()) await captureSection(section, `${label}-${await section.getAttribute('data-settings-group')}`);
            }
            if (surface === 'today') {
                assert.equal(await page.locator('.lc-checkin--today').getAttribute('data-density'), 'comfortable', 'six-item fixture keeps the quantity rule independent of width');
            }
            console.log(`${label}: ${rows.length} visible text fragments; expanded content, roles and geometry checked`);
        } catch (error) {
            failures.push(`${label}: ${error.message}`);
            console.error(`FAILED ${label}: ${error.message}`);
            await screenshot({path: path.join(out, `${label}-failed.png`)});
        }
      }
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({qaHost, qaTheme, qaFrontend, baseline, failures, report}, null, 2));
    if (!baseline) assert.deepEqual(failures, [], 'full-content audit must pass');
    console.log(`Content audit: ${report.length}/${scenarios.length * sizes.length} populated page layouts; ${failures.length} issues${baseline ? ' (baseline, not acceptance)' : ''}.`);
};
