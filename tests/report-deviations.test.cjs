/* T-1343 回顾导出增强守门：目标偏差解释纯函数、报告来源筛选线程、批量导出与报告区块接线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* ---------- 运行时：偏差解释与报告渲染（转译真实模块） ---------- */

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-report-deviations-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
    return target;
};
["src/i18n.ts", "src/record-step.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/catalog.ts", "src/features/templates.ts", "src/features/review-comparison.ts", "src/features/report.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {buildReviewDeviationNotes} = require(path.join(outputRoot, "src/features/review-comparison.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {buildWeeklyReportMarkdown} = require(path.join(outputRoot, "src/features/report.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));

const item = (name, rateDelta, completedDelta) => ({
    itemId: `id-${name}`, name,
    current: {eventCount: 5, scheduledDays: 10, completedDays: 5, completionRate: 50},
    baseline: {eventCount: 5, scheduledDays: 10, completedDays: 5, completionRate: 50 - rateDelta},
    delta: {eventCount: 0, scheduledDays: 0, completedDays: completedDelta, completionRate: rateDelta},
});
const comparison = (items) => ({
    current: {range: "week", startDate: "2026-09-14", endDate: "2026-09-20", totalEvents: 10, completedItems: 5, scheduledItems: 6},
    baseline: {range: "week", startDate: "2026-09-07", endDate: "2026-09-13", totalEvents: 10, completedItems: 5, scheduledItems: 6},
    delta: {totalEvents: 0, completedItems: 0, scheduledItems: 0},
    items,
});

const notes = buildReviewDeviationNotes(comparison([
    item("持平", 0, 0), item("小幅", 3, 1), item("下滑", -12, -2), item("大幅", 20, 3),
]));
assert.deepEqual(notes.map((note) => [note.name, note.kind]), [["大幅", "improve"], ["下滑", "decline"]],
    "notes below the 5-point threshold are dropped and sorted by magnitude");
assert.equal(notes[0].rateDelta, 20);
assert.deepEqual(buildReviewDeviationNotes(comparison([item("a", 4, 1)])), [], "changes under the threshold stay silent");
assert.deepEqual(buildReviewDeviationNotes(comparison([])), [], "no items means no notes");
assert.equal(buildReviewDeviationNotes(comparison([item("甲", 6, 1), item("乙", 8, 1), item("丙", 10, 1), item("丁", 12, 1)])).length, 3, "notes cap at three by default");
assert.deepEqual(buildReviewDeviationNotes(comparison([item("甲", 9, 1), item("乙", 8, 1)]), {minRateDelta: 10}), [], "custom threshold applies");
assert.deepEqual(buildReviewDeviationNotes(comparison([item("甲", 9, 1)]), {limit: 0}), [], "non-positive limit is rejected");

const summary = {range: "week", startDate: "2026-09-14", endDate: "2026-09-20", items: [], totalEvents: 3, completedItems: 1, scheduledItems: 2};
const sections = {events: true, completion: true, items: true, baseline: true, highlights: false, deviations: true};
const withNotes = buildWeeklyReportMarkdown(summary, "周报", sections, comparison([item("阅读", -9, -2)]));
assert.match(withNotes, /### .*(偏差解释|Deviation notes)/, "deviation section must render");
assert.match(withNotes, /阅读/, "deviation lines must name the item");
assert.doesNotMatch(buildWeeklyReportMarkdown(summary, "周报", {...sections, deviations: false}, comparison([item("阅读", -9, -2)])), /偏差解释|Deviation notes/, "deviations toggle must remove the section");
const flatReport = buildWeeklyReportMarkdown(summary, "周报", sections, comparison([item("小幅", 2, 1)]));
assert.match(flatReport, /持平|flat/i, "flat periods must be stated explicitly");
const emptyReport = buildWeeklyReportMarkdown(summary, "周报", sections, undefined);
assert.match(emptyReport, /数据不足|Not enough data/i, "missing comparison must be stated explicitly");
const sourceReport = buildWeeklyReportMarkdown(summary, "周报", sections, undefined, {source: "tomato"});
assert.match(sourceReport, /来源筛选|Source filter/i, "filtered reports must declare their source scope");

/* 偏好：deviations 缺省开启；reportSource 仅接受登记值 */
const prefs = normalizeViewPreferences({});
assert.equal(prefs.reportSections.deviations, true, "deviations default to on for legacy preferences");
assert.equal(prefs.reportSource, "");
assert.equal(normalizeViewPreferences({reportSource: "tomato"}).reportSource, "tomato");
assert.equal(normalizeViewPreferences({reportSource: "bogus"}).reportSource, "", "unknown source values fall back to all");
assert.equal(normalizeViewPreferences({reportSections: {deviations: false}}).reportSections.deviations, false, "explicit off stays off");

/* ---------- 源码接线断言 ---------- */

const analytics = fs.readFileSync("src/analytics.ts", "utf8");
const bind = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const reviewView = fs.readFileSync("src/render/review.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");

assert.match(analytics, /export interface SummarySourceOptions/, "analytics must expose the source options type");
assert.match(analytics, /filter\(\(event\) => !options\?\.source \|\| event\.source === options\.source\)/, "summary builder must filter events by the requested source");
assert.match(analytics, /buildCustomSummaryContext\(store: CheckinStore, range: CustomSummaryRange, asOf = new Date\(\), options\?: SummarySourceOptions\)/, "custom summary must thread the source option");
assert.match(bind, /const sourceOptions = host\.reportSource \? \{source: host\.reportSource/, "report builder must apply the selected source");
assert.match(bind, /host\.reportSections\.baseline \|\| host\.reportSections\.deviations/, "deviations need the baseline comparison even when the baseline block is off");
assert.match(bind, /buildWeeklyReportMarkdown\(summary, title, host\.reportSections, comparison, sourceOptions\)/, "report builder must receive the source option");
assert.match(bind, /data-report-source/, "source select must be bound");
assert.match(bind, /\["manual", "tomato", "api", "import"\]\.includes\(value\)/, "source values must be validated against the registry");
assert.match(bind, /data-action='export-all'/, "export-all must be bound");
assert.match(bind, /host\.downloadExport\("json"\)[\s\S]{0,120}host\.downloadExport\("csv"\)[\s\S]{0,160}host\.downloadReportMarkdown\(buildCurrentReport\(\)\)/, "export-all must run JSON, CSV and report in order");
assert.match(reviewView, /deviations: "report\.optDeviations"/, "report settings must expose the deviations toggle");
assert.match(reviewView, /data-report-source/, "report settings must render the source select");
assert.match(reviewView, /data-action="export-all"/, "review tools must render the export-all entry");
assert.match(indexSource, /reportSource = "";/, "plugin keeps the report source state");
assert.match(indexSource, /this\.reportSource = preferences\.reportSource;/, "applyViewPreferences restores the report source");
assert.match(indexSource, /reportSource: this\.reportSource,/s, "persist and render contexts must carry the report source");

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("report deviation & source filter gates passed: notes, flat/insufficient notes, source scope, export-all, preference normalization");
