/* 8.3 平台打磨：数字快捷键、Markdown 周报、i18n 第四波、发布流水线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const navigationSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const reportSource = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

/* 数字快捷键覆盖主今日页 */
assert.match(source, /private bindQuickKeyboard\(root: HTMLElement\)/);
assert.match(source, /this\.bindQuickKeyboard\(root\);/, "main today page also binds number shortcuts");

/* Markdown 周报 */
assert.match(reviewSource, /data-action="copy-weekly-report"/, "review exposes a copy-weekly-report action");
assert.match(navigationSource, /navigator\.clipboard\.writeText/, "weekly report copies via clipboard");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-report-"));
/* T-1217 起 report.ts 运行时依赖 i18n（报告文案走字典）与 view-preferences（区块开关缺省），
   T-1343 起再依赖 features/review-comparison（偏差解释）。
   临时目录镜像 src 布局（features/report.js + 根上 i18n/view-preferences）。 */
const reportJs = path.join(outputRoot, "features", "report.js");
fs.mkdirSync(path.dirname(reportJs), {recursive: true});
fs.writeFileSync(reportJs, ts.transpileModule(reportSource, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
const prefsSource = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
fs.writeFileSync(path.join(outputRoot, "features", "reminder-preferences.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "reminder-preferences.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); // T-1421 view-preferences 依赖
fs.writeFileSync(path.join(outputRoot, "features", "first-success.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "first-success.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); // T-1424 view-preferences 依赖
fs.writeFileSync(path.join(outputRoot, "features", "view-scope.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "view-scope.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); // T-1425 view-preferences 依赖
const comparisonJs = path.join(outputRoot, "features", "review-comparison.js");
fs.writeFileSync(path.join(outputRoot, "date-keys.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "date-keys.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); // T-1419 review-comparison 依赖 date-keys
fs.writeFileSync(path.join(outputRoot, "lunar.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "lunar.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
fs.writeFileSync(path.join(outputRoot, "occasions.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "occasions.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText); // T-1436 report 失速节依赖 weekdayName
fs.writeFileSync(comparisonJs, ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "review-comparison.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
/* T-1352 起 view-preferences 运行时依赖 features/note-anchor 的 validateAnchorBlockId。 */
const noteAnchorJs = path.join(outputRoot, "features", "note-anchor.js");
fs.writeFileSync(noteAnchorJs, ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "note-anchor.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
/* T-1353 起 view-preferences 运行时依赖 features/summary-resident；T-1403 起依赖 features/health-inbox。 */
fs.writeFileSync(path.join(outputRoot, "features", "summary-resident.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "summary-resident.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
fs.writeFileSync(path.join(outputRoot, "features", "health-inbox.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "health-inbox.ts"), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
fs.writeFileSync(path.join(outputRoot, "i18n.js"), ts.transpileModule(i18nSource, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
fs.writeFileSync(path.join(outputRoot, "view-preferences.js"), ts.transpileModule(prefsSource, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
const {buildWeeklyReportMarkdown} = require(reportJs);
const markdown = buildWeeklyReportMarkdown({
    range: "week", startDate: "2026-09-08", endDate: "2026-09-14",
    items: [{itemId: "a", name: "阅读", eventCount: 7, totalsByUnit: [], scheduledDays: 7, completedDays: 7, completionRate: 100}],
    totalEvents: 36, completedItems: 8, scheduledItems: 13,
}, "本周报告（2026-09-08 ~ 2026-09-14）");
assert.match(markdown, /## 本周报告/, "report renders the title");
assert.match(markdown, /36/, "report includes total events");
assert.match(markdown, /\| 阅读 \| 7\/7 天 \| 100% \|/, "report renders per-item table rows");

/* i18n 字典：第四波键位齐全且每个语言块内无重复 */
const zhBlock = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enBlock = i18nSource.slice(i18nSource.indexOf("const enUS"));
function duplicateKeys(block) {
    const keys = [...block.matchAll(/"([a-z.A-Za-z]+)":/g)].map((match) => match[1]);
    return keys.filter((key, index) => keys.indexOf(key) !== index);
}
assert.deepEqual(duplicateKeys(zhBlock), [], "zh-CN dictionary must not contain duplicate keys");
assert.deepEqual(duplicateKeys(enBlock), [], "en-US dictionary must not contain duplicate keys");
assert.ok(i18nSource.includes('"occasions.eyebrow": "提醒与计划"'), "occasions eyebrow key exists");
assert.ok(source.includes('t("editor.create")') && source.includes('t("editor.edit")'), "editor titles use the dictionary");

/* 发布流水线与走查清单存在 */
assert.ok(fs.existsSync(path.join(root, "scripts", "release.cjs")), "release pipeline script exists");
assert.ok(fs.existsSync(path.join(root, "docs", "detail-checklist.md")), "detail checklist exists");

console.log("8.3 platform polish checks passed.");
