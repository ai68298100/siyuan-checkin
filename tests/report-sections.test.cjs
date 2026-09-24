const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");
const reviewSource = read("render", "review.ts");
const navigationSource = read("render", "bind-page-navigation.ts");
const opsSource = read("plugin-ops.ts");
const prefsSource = read("view-preferences.ts");

/* 结构守门：导出走下载边界，设置面板与开关绑定齐全，基线复用共享推导。 */
assert.match(reviewSource, /data-action="export-report"/, "review exposes the report export action");
assert.match(reviewSource, /data-report-option=/, "review renders report section toggles");
assert.match(navigationSource, /getPreviousReviewRange\(\{startDate: summary\.startDate, endDate: summary\.endDate\}\)/, "report baseline reuses the shared previous-range helper");
assert.match(navigationSource, /host\.downloadReportMarkdown\(buildCurrentReport\(\)\)/, "report export goes through the host download boundary");
assert.match(navigationSource, /data-report-option/, "report toggles persist through view preferences");
assert.match(opsSource, /downloadReportMarkdownFor/, "plugin-ops owns the markdown download helper");
assert.match(prefsSource, /reportSections/, "view preferences persist report sections");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-report-sections-"));
for (const filename of ["date-keys.ts", "i18n.ts", "lunar.ts", "occasions.ts", "view-preferences.ts", "features/reminder-preferences.ts", "features/view-scope.ts", "features/first-success.ts", "features/note-anchor.ts", "features/summary-resident.ts", "features/health-inbox.ts", "features/weread-adapter.ts", "features/review-comparison.ts", "features/report.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(...filename.split("/")), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const {t, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));
const {normalizeViewPreferences, DEFAULT_REPORT_SECTIONS} = require(path.join(outputRoot, "view-preferences.js"));
const {buildWeeklyReportMarkdown} = require(path.join(outputRoot, "features", "report.js"));

const summary = (overrides = {}, items = undefined) => ({
    range: "week", startDate: "2026-09-08", endDate: "2026-09-14", items: items || [], totalEvents: 0, completedItems: 0, scheduledItems: 0, ...overrides,
});
const reading = {itemId: "a", name: "阅读", eventCount: 7, totalsByUnit: [], scheduledDays: 7, completedDays: 7, completionRate: 100};
const running = {itemId: "b", name: "跑步", eventCount: 2, totalsByUnit: [], scheduledDays: 7, completedDays: 1, completionRate: 14};
const comparison = {
    delta: {totalEvents: 4, completedItems: 1, scheduledItems: 0},
    baseline: {startDate: "2026-09-01", endDate: "2026-09-07"},
};

/* 默认全开：标题/指标/明细/亮点/落款齐全。 */
const full = buildWeeklyReportMarkdown(summary({totalEvents: 36, completedItems: 8, scheduledItems: 13}, [reading, running]), "本周报告（2026-09-08 ~ 2026-09-14）", {...DEFAULT_REPORT_SECTIONS}, comparison);
assert.match(full, /## 本周报告/);
assert.match(full, new RegExp(t("report.lineEvents", {n: 36}).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(full, /\| 阅读 \| 7\/7 天 \| 100% \|/);
assert.match(full, new RegExp(t("report.bestLine", {name: "阅读", rate: 100}).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(full, new RegExp(t("report.attentionLine", {name: "跑步", rate: 14}).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(full, new RegExp(t("report.baselineLine", {start: "2026-09-01", end: "2026-09-07", events: "+4", completed: "+1", scheduled: "±0"}).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.ok(full.includes(t("report.footer")));

/* 区块开关：关闭的区块不输出。 */
const minimal = buildWeeklyReportMarkdown(summary({totalEvents: 36, completedItems: 8, scheduledItems: 13}, [reading, running]), "T", {
    events: false, completion: false, items: false, baseline: false, highlights: false,
}, comparison);
assert.ok(!minimal.includes(t("report.lineEvents", {n: 36})), "events line omitted");
assert.ok(!minimal.includes("| 阅读 |"), "item table omitted");
assert.ok(!minimal.includes(t("report.highlightsTitle")), "highlights omitted");
assert.ok(!minimal.includes("±0"), "baseline omitted");
assert.ok(minimal.includes(t("report.lineRange", {start: "2026-09-08", end: "2026-09-14"})), "range line always present");

/* 基线缺失有明确说明；数据不足不编造结论。 */
const missingBaseline = buildWeeklyReportMarkdown(summary({totalEvents: 1}, [reading]), "T", {...DEFAULT_REPORT_SECTIONS});
assert.ok(missingBaseline.includes(t("report.baselineMissingNote")));
const emptyReport = buildWeeklyReportMarkdown(summary(), "T", {...DEFAULT_REPORT_SECTIONS});
assert.ok(emptyReport.includes(t("report.insufficientNote")));
assert.ok(!emptyReport.includes(t("report.bestLine", {name: "阅读", rate: 100}).split("（")[0]));
const thinReport = buildWeeklyReportMarkdown(summary({totalEvents: 3}, [reading]), "T", {...DEFAULT_REPORT_SECTIONS});
assert.ok(thinReport.includes(t("report.singleItemNote")));

/* 偏好归一化：缺省全开，单键关闭被保留，非法形状回落缺省。 */
assert.deepEqual(normalizeViewPreferences({}).reportSections, {events: true, completion: true, items: true, baseline: true, deviations: true, highlights: true});
assert.deepEqual(normalizeViewPreferences({reportSections: {events: false, baseline: true}}).reportSections, {events: false, completion: true, items: true, baseline: true, deviations: true, highlights: true});
assert.deepEqual(normalizeViewPreferences({reportSections: "bogus"}).reportSections, DEFAULT_REPORT_SECTIONS);

/* en-US 键齐全。 */
setPluginLanguage("en-US");
const enFull = buildWeeklyReportMarkdown(summary({totalEvents: 36, completedItems: 8, scheduledItems: 13}, [reading, running]), "Weekly", {...DEFAULT_REPORT_SECTIONS}, comparison);
assert.ok(enFull.includes("records"), "en events label renders");
assert.ok(enFull.includes("Top performer"), "en highlights render");
assert.ok(enFull.includes("Generated by SiYuan Check-in"));
setPluginLanguage("zh-CN");

console.log("Report section checks passed: configurable sections, baseline deltas, insufficiency notes, preference normalization and i18n coverage.");
