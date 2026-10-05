const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/index.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
assert.match(source, /lc-checkin lc-checkin--history lc-checkin--insights[\s\S]*t\("insights\.empty"\)/);
assert.match(i18n, /"insights\.empty": "没有可复盘的打卡项"/);
assert.match(source, /role="group" aria-label="\$\{t\("insights\.window"\)\}"/);
/* T-1591：日历格 button 化——原生可聚焦（无需 tabindex），aria-label 携完整状态读数+钻取提示。 */
assert.match(source, /<button class="lc-checkin__insight-day is-\$\{day\.status\}\$\{day\.isToday \? " is-today" : ""\}" type="button" data-insight-day="\$\{escapeHtml\(day\.date\)\}" title=/);
assert.match(source, /data-insight-day="\$\{escapeHtml\(day\.date\)\}" title="\$\{escapeHtml\(label\)\}" aria-label="\$\{escapeHtml\(`\$\{label\}，\$\{t\("insights\.dayJumpHint"\)\}`\)\}"\$\{day\.isToday \? ` aria-current="date"` : ""\}/);
assert.match(fs.readFileSync("src/ui/components.scss", "utf8"), /\.lc-checkin__insight-grid \.lc-checkin__insight-day\.is-today \{/, "the current insight day must have a visible marker");
assert.match(source, /role="progressbar" aria-label="\$\{escapeHtml\(t\("insights\.maturityBarTitle"\)\)\}"/, "the maturity indicator must have a readable name");
assert.match(source, /day\.status === "complete"/);
assert.match(source, /role="list" aria-label="\$\{t\("insights\.legendAria"\)\}"/);
assert.match(i18n, /"insights\.partial": "部分完成"/);
assert.match(i18n, /"insights\.missed": "未完成"/);
/* T-1591：周行钻取 + 口径行 + 教练 CTA（复用 records/editor 既有 data 通道）。 */
assert.match(source, /data-insight-week="\$\{escapeHtml\(week\.startDate\)\}"/);
assert.match(source, /insights\.scopeNotePrefix/);
assert.match(source, /insights\.scopeNoteQuota/);
assert.match(source, /insights\.scopeNoteAtMost/);
assert.match(source, /insights\.scopeNoteScheduled/);
assert.match(source, /data-insight-records="\$\{escapeHtml\(item\.id\)\}">\$\{t\("insights\.coachingEvidence"\)\}/);
assert.match(source, /data-insight-edit-rules="\$\{escapeHtml\(item\.id\)\}">\$\{t\("insights\.coachingAdjust"\)\}/);
assert.match(i18n, /"insights\.dayJumpHint": "点击查看当日记录"/);
assert.match(i18n, /"insights\.coachingEvidence": "查看证据"/);
/* T-1590：范围切换/可搜索选择器/归档动作。 */
assert.match(source, /data-insight-range="\$\{range\}" aria-pressed="\$\{insights\.insightsRange === range\}"/, "range tabs must bind the root session range with aria-pressed");
assert.match(source, /data-insight-range-start value="\$\{escapeHtml\(insights\.insightsCustomRange\?\.startDate \|\| ""\)\}"/, "custom range inputs carry the root session values");
assert.match(source, /data-insight-item-search value="\$\{escapeHtml\(insights\.insightsItemQuery\)\}"/, "item search keeps the root session query");
assert.match(source, /entry\.archived \? escapeHtml\(archivedSuffix\)/, "archived items must be labelled in the picker");
assert.match(source, /data-insight-archived="\$\{escapeHtml\(item\.id\)\}"/, "archived items must offer the archive-page jump");
const insightsCore = fs.readFileSync("src/features/insights.ts", "utf8");
assert.match(insightsCore, /const customEnd = typeof options\.endDate === "string"/, "custom end date must be an explicit option (fail-closed fallback)");
assert.match(insightsCore, /endDate\?: string;/, "the option must be declared");
const nav = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
assert.match(nav, /insightSearchComposing/, "item search must guard IME composition");
assert.match(nav, /writeArchivedQuery\(item\.name\);\s*\n\s*host\.showArchived\(root\);/, "archived jump must prefill the archive search");
assert.match(nav, /value > dateKey\(currentCalendarDate\(\)\)/, "custom range must reject future dates");

// Execute the production renderer with a report containing empty and scheduled
// weeks. The view must not repeat the denominator or expose image URLs as text.
const path = require("node:path");
const ts = require("typescript");
const moduleCache = new Map();
function loadTs(filename) {
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const loaded = {exports: {}};
    moduleCache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = name => name.startsWith(".") ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}
const {escapeHtml, renderIconMarkup} = loadTs(path.resolve("src/shared.ts"));
const {t, setPluginLanguage} = loadTs(path.resolve("src/i18n.ts"));
const {renderPageShellHead} = loadTs(path.resolve("src/render/page-shell.ts"));
const sourceFile = ts.createSourceFile("index.ts", source, ts.ScriptTarget.Latest, true);
let method;
function findRenderer(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(sourceFile) === "renderInsights") method = node.getText(sourceFile);
    ts.forEachChild(node, findRenderer);
}
findRenderer(sourceFile);
assert.ok(method, "the test must execute the real renderInsights method");
const compiled = ts.transpileModule(`class InsightView { ${method} }`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const report = {
    weeklyTrend: [{label: "empty week", startDate: "2026-08-31", completedDays: 0, eligibleScheduledDays: 0, scheduledDays: 0}, {label: "scheduled week", startDate: "2026-09-07", completedDays: 2, eligibleScheduledDays: 7, scheduledDays: 7}],
    days: [
        {date: "2026-09-19", status: "complete", isToday: false, kind: "binary", progress: 1, target: 1, unit: "次"},
        {date: "2026-09-20", status: "pending", isToday: true, kind: "binary", progress: 0, target: 1, unit: "次"},
    ], aggregates: {completionRate: 29}, currentStreak: 1, longestStreak: 2, maturity: 8, startDate: "2026-06-29", endDate: "2026-09-20",
};
let reportOptions;
const View = new Function("getItemById", "buildHabitInsights", "computeLongestStreaks", "buildCoachingSuggestions", "currentCalendarDate", "escapeHtml", "renderIconMarkup", "t", "renderPageShellHead", "dateKey", `${compiled}; return InsightView;`)(
    (store, id) => store.items.find(item => item.id === id), (store, id, options) => { reportOptions = options; return report; }, () => new Map(), () => [{tone: "neutral", title: "Advice", detail: "Detail", evidence: "Evidence"}], () => new Date("2026-09-20T12:00:00"), escapeHtml, renderIconMarkup, t, renderPageShellHead, date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
);
const view = new View();
const imageIcon = "data:image/png;base64,aGVsbG8=";
view.store = {items: [{id: "custom", name: "自定义图片", icon: imageIcon, group: "学习"}, {id: "text", name: "文字图标", icon: "✓"}]};
view.insightsItemId = "custom";
view.resolvedAppearance = () => "light";
setPluginLanguage("zh-CN");
let html = view.renderInsights();
assert.match(html, /<strong>2\/7 天<\/strong>/, "the weekly value must show its denominator exactly once");
assert.match(html, /empty week<\/span><strong>未安排<\/strong>/, "a week without opportunities must not show 0/0");
assert.ok(html.includes(`<img src="${imageIcon}"`), "the heading must render the custom image safely");
const picker = html.match(/<select data-insight-item[\s\S]*?<\/select>/)?.[0] || "";
assert.ok(picker.includes("自定义图片"));
assert.ok(!picker.includes(imageIcon), "native options cannot render images and must not display a data URI");
assert.equal((html.match(/aria-current="date"/g) || []).length, 1, "only the current insight day is marked current");
assert.match(html, /lc-checkin__insight-day is-pending is-today[^>]*aria-current="date"/, "the current insight day keeps its status and current-date semantics");
assert.match(html, /lc-checkin__insight-day is-complete(?! is-today)[^>]*data-insight-day="2026-09-19"/, "past insight days are not marked current");
view.insightsRange = "custom";
view.insightsCustomRange = {startDate: "2026-08-01", endDate: "2026-08-28"};
view.renderInsights();
assert.equal(reportOptions.startDate, "2026-08-01", "the renderer must send the selected first day to the core");
assert.equal(reportOptions.endDate, "2026-08-28");
view.store.items[0].archived = true;
const archivedHtml = view.renderInsights();
assert.doesNotMatch(archivedHtml, /data-insight-edit-rules=|data-insight-records=/, "archived views must not advertise inactive records or edit actions");
assert.match(archivedHtml, /data-insight-archived=/);
view.store.items[0].archived = false;
view.insightsRange = "84";
setPluginLanguage("en-US");
html = view.renderInsights();
assert.match(html, /<strong>2\/7 days<\/strong>/, "weekly units must remain localized");
setPluginLanguage("zh-CN");
console.log("Insight accessibility structure checks passed.");
