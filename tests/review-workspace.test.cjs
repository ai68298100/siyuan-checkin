const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-review-workspace-"));
const compiled = new Set();

// Execute the production renderer and its actual runtime dependency graph.
// Resolving the emitted requires avoids maintaining a hand-copied model list.
function compile(relative) {
    const filename = path.resolve(sourceRoot, relative);
    if (compiled.has(filename)) return;
    compiled.add(filename);
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const target = path.join(outputRoot, path.relative(sourceRoot, filename).replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, output);
    for (const [, request] of output.matchAll(/require\("(\.[^"]+)"\)/g)) {
        compile(path.relative(sourceRoot, path.resolve(path.dirname(filename), `${request}.ts`)));
    }
}

compile("render/review.ts");
const {renderReviewView} = require(path.join(outputRoot, "render/review.js"));
const model = require(path.join(outputRoot, "model.js"));
const charts = require(path.join(outputRoot, "charts.js"));
const {t, setPluginLanguage, getPluginLocale} = require(path.join(outputRoot, "i18n.js"));
setPluginLanguage("zh-CN");

const store = model.createDefaultStore();
store.items = Array.from({length: 12}, (_, index) => ({
    id: `item-${index}`, name: index < 2 ? "同名习惯" : `项目 ${String(index).padStart(2, "0")}`,
    icon: "✓", kind: "count", target: 1000, unit: "ml", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    createdDate: "2026-08-01", revisions: [], archivePeriods: [],
}));
const event = (id, day, index = 0) => ({
    id, itemId: `item-${index % 2}`, localDate: `2026-09-${day}`,
    occurredAt: `2026-09-${day}T02:${String(index % 60).padStart(2, "0")}:00.000Z`,
    value: index + 1, unit: "ml", source: ["manual", "tomato", "api"][index % 3],
    note: index % 5 === 0 ? "记录 needle <script>unsafe</script>" : "普通记录",
});
const periodEvents = Array.from({length: 65}, (_, index) => event(`event-${index}`, index < 35 ? "18" : "19", index));
store.events = [...periodEvents, event("outside-before", "13"), event("outside-after", "21")];
const asOf = new Date(2026, 8, 20, 12);
const snapshot = charts.buildAnalyticsSnapshot(store, asOf);
const ctx = {
    store, occasionStore: {version: 1, occasions: []}, appearance: "light",
    historyMonth: new Date(2026, 8, 1), selectedHistoryDate: "2026-09-18",
    historyQuery: "", historySource: "all", historyOrder: "newest", heatmapYearOffset: 0,
    reviewFoldSections: new Set(), reviewFoldTouched: false,
    summaryRange: "week", summaryCustomRange: {startDate: "2026-09-14", endDate: "2026-09-20"},
    reportSections: {events: true, completion: true, items: true, baseline: true, highlights: true},
    summaryRefreshing: false, summaryProvidersCount: 0,
    reminderFilter: "all", reminderUserActions: [], analyticsSnapshot: snapshot,
};
const render = (overrides = {}) => renderReviewView({...ctx, ...overrides});
const recordIds = (html) => [...html.matchAll(/data-history-event-id="([^"]+)"/g)].map(match => match[1]);
const projectIds = (html) => [...html.matchAll(/data-review-insights-id="([^"]+)"/g)].map(match => match[1]);
const svgCount = (html) => (html.match(/<svg\b/g) || []).length;

// Call-through probes prove expensive closed sections are not computed, as well
// as not being present in the DOM. They still execute the real implementation.
const calls = {};
for (const [file, names] of [
    ["charts.js", ["renderLineChart", "renderBarChart", "buildYearHeatmap"]],
    ["features/achievements.js", ["buildAchievements"]],
    ["features/habit-score.js", ["collectHabitScoreDays"]],
    ["reminders.js", ["projectReminderCenter"]],
    ["features/review-comparison.js", ["buildReviewComparison"]],
    ["features/local-summary.js", ["buildLocalSummaryText"]],
]) {
    const module = require(path.join(outputRoot, file));
    for (const name of names) {
        const original = module[name];
        calls[name] = 0;
        module[name] = (...args) => { calls[name] += 1; return original(...args); };
    }
}
const resetCalls = () => Object.keys(calls).forEach(name => { calls[name] = 0; });

const overview = render();
assert.match(overview, /data-review-workspace="overview" aria-pressed="true"/);
assert.match(overview, /data-review-workspace-panel="overview"/);
assert.match(overview, /data-review-fold="projects" open/);
assert.equal(projectIds(overview).length, 8, "overview bounds its initial project list to eight");
assert.equal(svgCount(overview), 0, "default overview must not produce chart DOM");
assert.doesNotMatch(overview, /lc-checkin__calendar-day|lc-checkin__history-event-main|lc-checkin__yearheatmap-cell|lc-checkin__strength-overview|lc-checkin__achievement-grid|lc-checkin__reminder-row/,
    "other workspaces and heavy closed sections must be absent, not just hidden");
assert.ok(Object.values(calls).every(value => value === 0), `default overview must not compute secondary analyses: ${JSON.stringify(calls)}`);
for (const id of ["compare", "report"]) {
    assert.match(overview, new RegExp(`data-review-fold="${id}" data-review-lazy="true"`));
}
const projectSecond = projectIds(render({reviewProjectPage: 1}));
assert.equal(projectSecond.length, 4);
assert.equal(new Set([...projectIds(overview), ...projectSecond]).size, 12, "project pagination must cover each item once");
assert.deepEqual(projectIds(render({reviewProjectPage: 99})), projectSecond, "stale project pages clamp to the last page");
const expectedNameOrder = [...store.items].sort((a, b) => a.name.localeCompare(b.name, getPluginLocale())).map(item => item.id);
assert.deepEqual(projectIds(render({reviewProjectOrder: "name"})), expectedNameOrder.slice(0, 8));

resetCalls();
const analysis = render({reviewWorkspace: "analysis"});
assert.equal(svgCount(analysis), 1, "analysis starts with one selected trend chart");
assert.equal(calls.renderLineChart, 1);
assert.equal(calls.renderBarChart, 0);
for (const name of ["buildYearHeatmap", "buildAchievements", "collectHabitScoreDays", "projectReminderCenter", "buildReviewComparison"]) {
    assert.equal(calls[name], 0, `${name} must remain lazy in the default analysis view`);
}
assert.match(analysis, /data-review-fold="trend" open/);
assert.doesNotMatch(analysis, /data-review-insights-id=|data-history-event-id=/);
for (const reviewTrend of ["weekly", "monthly", "daily", "yearly"]) {
    const html = render({reviewWorkspace: "analysis", reviewTrend});
    assert.equal(svgCount(html), 1, `${reviewTrend} replaces the active chart without generating other series`);
    assert.match(html, new RegExp(`<option value="${reviewTrend}" selected>`));
    assert.ok(html.includes(snapshot[reviewTrend].title));
}

resetCalls();
const closed = render({reviewWorkspace: "analysis", reviewFoldTouched: true});
assert.equal(svgCount(closed), 0, "stored manual closure overrides the default open trend");
assert.ok(Object.values(calls).every(value => value === 0));
const closedOverview = render({reviewFoldTouched: true});
assert.equal(projectIds(closedOverview).length, 0, "stored project closure also survives rendering");
const openedHeatmap = render({reviewWorkspace: "analysis", reviewFoldTouched: true, reviewFoldSections: new Set(["heatmap"])});
assert.match(openedHeatmap, /lc-checkin__yearheatmap-scroll/);
assert.equal(calls.buildYearHeatmap, 1, "explicitly opening heatmap builds only that secondary analysis");
assert.equal(calls.collectHabitScoreDays, 0);
const reopenedProjects = render({reviewFoldTouched: true, reviewFoldSections: new Set(["projects", "strength"])});
assert.equal(projectIds(reopenedProjects).length, 8);
assert.equal(svgCount(reopenedProjects), 0, "stored folds belonging to another workspace cannot generate hidden charts");

resetCalls();
const strength = render({reviewWorkspace: "analysis", reviewFoldTouched: true, reviewFoldSections: new Set(["strength"])});
assert.equal(svgCount(strength), 1, "average habit strength draws one chart for every project");
assert.equal(calls.collectHabitScoreDays, 12);
resetCalls();
const singleStrength = render({reviewWorkspace: "analysis", reviewFoldTouched: true, reviewFoldSections: new Set(["strength"]), reviewStrengthItemId: "item-3"});
assert.equal(svgCount(singleStrength), 1);
assert.equal(calls.collectHabitScoreDays, 1, "selecting an individual project avoids scoring other projects");
assert.match(singleStrength, /<option value="item-3" selected>/);

// Fixed-window strength must keep the same members, score and selection when
// the overview period moves before a newly created habit.
const recentItem = {...store.items[0], id: "recent", name: "近期创建项目", createdDate: "2026-09-18", createdAt: "2026-09-18T00:00:00.000Z"};
const strengthStore = {...store, items: [...store.items, recentItem], events: [...store.events, {...event("recent-event", "19"), itemId: "recent"}]};
const strengthContext = {store: strengthStore, reviewWorkspace: "analysis", reviewFoldTouched: true, reviewFoldSections: new Set(["strength"])};
const strengthBody = (html) => html.match(/<div class="lc-checkin__strength-overview">[\s\S]*?<\/svg>/)?.[0];
const recentStrength = render({...strengthContext, reviewStrengthItemId: "recent"});
const pastStrength = render({...strengthContext, reviewStrengthItemId: "recent", summaryCustomRange: {startDate: "2026-08-01", endDate: "2026-08-07"}});
assert.equal(svgCount(pastStrength), 1, "a valid strength selection cannot lose its chart when the overview period changes");
assert.match(pastStrength, /<option value="recent" selected>/);
assert.equal(strengthBody(pastStrength), strengthBody(recentStrength), "individual strength is independent of the overview period");
const averageNow = render(strengthContext);
const averagePast = render({...strengthContext, summaryCustomRange: {startDate: "2026-08-01", endDate: "2026-08-07"}});
assert.equal(strengthBody(averagePast), strengthBody(averageNow), "average strength uses the same 30-day members across overview periods");
for (const invalidId of ["deleted-id", "future-id"]) {
    const futureItem = {...recentItem, id: "future-id", createdDate: "2026-10-01", createdAt: "2026-10-01T00:00:00.000Z"};
    const invalidSelection = render({...strengthContext, store: {...strengthStore, items: [...strengthStore.items, futureItem]}, reviewStrengthItemId: invalidId});
    assert.match(invalidSelection, /<option value="" selected>/, "an unavailable selection visibly falls back to the average");
    assert.equal(svgCount(invalidSelection), 1);
    assert.equal(strengthBody(invalidSelection), strengthBody(averageNow), "invalid selections cannot display a misleading zero score");
}

const sortedEvents = (events, order = "newest") => [...events].sort((a, b) => (order === "oldest" ? 1 : -1) * (a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)));
const records = (overrides = {}) => render({reviewWorkspace: "records", historyScope: "period", ...overrides});
resetCalls();
const firstPage = records();
assert.deepEqual(recordIds(firstPage), sortedEvents(periodEvents).slice(0, 30).map(entry => entry.id));
assert.doesNotMatch(firstPage, /data-history-date=|data-review-fold=/, "period records exclude the day calendar and analytical folds");
assert.ok(Object.values(calls).every(value => value === 0), "record browsing must not calculate secondary analyses");

// Keep the first record reachable on narrow screens: search is always outside
// the advanced disclosure, which only auto-opens for active advanced filters.
const advancedFilter = (html) => {
    const match = html.match(/<details\b[^>]*class="[^"]*\blc-checkin__history-filter-disclosure\b[^"]*"[^>]*>[\s\S]*?<\/details>/);
    assert.ok(match, "records retain an accessible advanced-filter disclosure");
    const opening = match[0].slice(0, match[0].indexOf(">") + 1);
    assert.ok(html.indexOf("data-history-search") >= 0 && html.indexOf("data-history-search") < match.index,
        "search remains outside and before the advanced-filter disclosure");
    assert.doesNotMatch(match[0], /data-history-search/, "collapsing advanced filters must never hide search");
    for (const name of ["item", "source", "order"]) {
        assert.match(match[0], new RegExp(`data-history-${name}\\b`), `${name} remains available inside advanced filters`);
    }
    return /\sopen(?:\s|=|>)/.test(opening);
};
for (const historyScope of ["period", "day"]) {
    assert.equal(advancedFilter(records({historyScope})), false, `${historyScope}: default advanced filters are collapsed`);
    assert.equal(advancedFilter(records({historyScope, historyQuery: "needle"})), false,
        `${historyScope}: text search alone does not force advanced filters open`);
    for (const activeFilter of [{historyItemId: "item-1"}, {historySource: "tomato"}, {historyOrder: "oldest"}]) {
        assert.equal(advancedFilter(records({historyScope, ...activeFilter})), true,
            `${historyScope}: active ${Object.keys(activeFilter)[0]} stays visible after rerender`);
    }
}

const secondPage = records({historyPage: 1});
const thirdPage = records({historyPage: 2});
assert.equal(recordIds(secondPage).length, 30);
assert.equal(recordIds(thirdPage).length, 5);
assert.equal(new Set([...recordIds(firstPage), ...recordIds(secondPage), ...recordIds(thirdPage)]).size, 65);
assert.deepEqual(recordIds(records({historyPage: 99})), recordIds(thirdPage), "stale record pages clamp after result count changes");
assert.deepEqual(recordIds(records({historyPage: -1})), recordIds(firstPage));
const fullDate = new Date(periodEvents[40].occurredAt).toLocaleString(getPluginLocale(), {year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"});
assert.ok(firstPage.includes(fullDate), "period records retain their full date as well as time");

for (const source of ["manual", "tomato", "api"]) {
    const expected = sortedEvents(periodEvents.filter(entry => entry.source === source)).map(entry => entry.id);
    assert.deepEqual(recordIds(records({historySource: source})), expected, `${source} source filtering affects actual results`);
}
assert.deepEqual(recordIds(records({historyItemId: "item-1"})), sortedEvents(periodEvents.filter(entry => entry.itemId === "item-1")).slice(0, 30).map(entry => entry.id),
    "project filtering uses identity even for same-name projects");
const combinedExpected = sortedEvents(periodEvents.filter(entry => entry.itemId === "item-0" && entry.source === "manual" && entry.note.includes("needle")), "oldest").map(entry => entry.id);
assert.deepEqual(recordIds(records({historyItemId: "item-0", historySource: "manual", historyQuery: "needle", historyOrder: "oldest"})), combinedExpected,
    "project, source, search and order must compose before pagination");
const search = records({historyQuery: "needle"});
assert.ok(recordIds(search).length > 0);
assert.doesNotMatch(search, /<script>/, "record notes must be escaped in the result list");
assert.match(search, /&lt;script&gt;/);
const empty = records({historyQuery: "does-not-exist"});
assert.equal(recordIds(empty).length, 0);
assert.ok(empty.includes(t("review.historyFilterEmpty")));
assert.match(empty, /data-action="clear-history-filters"/, "empty filtered results retain an obvious recovery action");

const day = records({historyScope: "day", historyOrder: "oldest"});
const selectedDayEvents = sortedEvents(periodEvents.filter(entry => entry.localDate === "2026-09-18"), "oldest");
assert.deepEqual(recordIds(day), selectedDayEvents.slice(0, 30).map(entry => entry.id));
assert.deepEqual(recordIds(records({historyScope: "day", historyOrder: "oldest", historyPage: 1})), selectedDayEvents.slice(30).map(entry => entry.id));
assert.match(day, /data-history-date="2026-09-18"/);
assert.match(day, /data-history-date="2026-09-21"[^>]*disabled/, "calendar disallows dates after the shared cutoff");
assert.equal((day.match(/class="lc-checkin__history-row"/g) || []).length, 2, "same-name projects keep separate daily totals");
const narrowPeriod = records({summaryCustomRange: {startDate: "2026-09-19", endDate: "2026-09-19"}});
assert.deepEqual(recordIds(narrowPeriod), sortedEvents(periodEvents.filter(entry => entry.localDate === "2026-09-19")).map(entry => entry.id),
    "period filtering includes the selected end date and excludes adjacent dates");

// The same instant can fall on the next day in a different timezone. Dates in
// period rows must use persisted localDate, just like calendar/range selection.
const timezoneEvent = {...event("timezone-record", "19"), occurredAt: "2026-09-19T23:30:00.000Z", localDate: "2026-09-19"};
const timezoneRecords = records({store: {...store, events: [timezoneEvent]}, summaryCustomRange: {startDate: "2026-09-19", endDate: "2026-09-19"}});
assert.deepEqual(recordIds(timezoneRecords), ["timezone-record"]);
const timezoneRow = timezoneRecords.match(/class="lc-checkin__history-event-main">[\s\S]*?<\/div>/)?.[0];
assert.ok(timezoneRow?.includes("2026/09/19 07:30"), "stored calendar day remains 19 September even when the local clock reads 20 September");
assert.ok(!timezoneRow?.includes("2026/09/20"));

const reminders = render({reviewWorkspace: "analysis", reviewFoldTouched: true, reviewFoldSections: new Set(["reminders"])});
assert.match(reminders, /<article[^>]*data-reminder-id="checkin:item-0:2026-09-20"/);
assert.match(reminders, /<article[^>]*data-reminder-id="checkin:item-1:2026-09-20"/,
    "independent same-name habits must not be collapsed into one reminder");
const report = render({reviewFoldTouched: true, reviewFoldSections: new Set(["report"]), summaryProvidersCount: 1, summaryRefreshing: true});
assert.match(report, /data-summary-refresh-state="loading"/);
assert.match(report, /data-action="generate-summary"[^>]*disabled aria-busy="true"/);
assert.match(report, /data-summary-source="local"/);
assert.doesNotMatch(overview, /data-action="generate-summary"|data-summary-source=/, "report generation controls appear only inside the requested report");

// Guard the actual render path against reintroducing eager historical feeds.
// Prepare the shared analytics snapshot outside the renderer timing boundary.
const largeStore = {
    ...model.createDefaultStore(),
    items: Array.from({length: 30}, (_, index) => ({...store.items[0], id: `large-${index}`, name: `习惯 ${index}`, createdDate: "2026-06-01", createdAt: "2026-06-01T00:00:00.000Z"})),
    events: Array.from({length: 100000}, (_, index) => {
        const date = new Date(2026, 8, 20 - (Math.floor(index / 30) % 90), 10, index % 60);
        return {id: `large-event-${index}`, itemId: `large-${index % 30}`, localDate: model.dateKey(date), occurredAt: date.toISOString(), value: 1, unit: "ml", source: "manual"};
    }),
};
const largeSnapshot = charts.buildAnalyticsSnapshot(largeStore, asOf);
resetCalls();
const largeStarted = performance.now();
const largeOverview = render({store: largeStore, analyticsSnapshot: largeSnapshot});
const largeElapsed = performance.now() - largeStarted;
assert.equal(projectIds(largeOverview).length, 8);
assert.equal(svgCount(largeOverview), 0);
assert.ok(Buffer.byteLength(largeOverview) < 20000, "100k histories cannot inflate the default overview markup beyond 20 KB");
assert.ok(Object.values(calls).every(value => value === 0), "100k default rendering must not activate any secondary analyses");
assert.ok(largeElapsed < 5000, `100k HTML rendering exceeded the 5s regression budget: ${largeElapsed.toFixed(1)}ms`);
const largeRecords = records({store: largeStore, analyticsSnapshot: largeSnapshot, summaryCustomRange: {startDate: "2026-06-01", endDate: "2026-09-20"}});
assert.equal(recordIds(largeRecords).length, 30, "100k record results still produce only the current page");
assert.doesNotMatch(largeRecords, /class="lc-checkin__history-aggregate"/, "period browsing omits per-day aggregate markup");
assert.ok(Buffer.byteLength(largeRecords) < 60000, "100k filtered records cannot generate an eager hidden record list");
console.log(`100k review renderer: ${Buffer.byteLength(largeOverview)} overview bytes, 0 SVG, ${largeElapsed.toFixed(1)} ms (analytics snapshot and browser work excluded).`);

console.log("Review workspace rendering passed: lazy analyses, remembered disclosures, one-chart selectors, bounded projects/records, composed filters, dated rows, same-name identities and report refresh.");
