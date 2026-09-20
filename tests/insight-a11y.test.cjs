const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/index.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
assert.match(source, /lc-checkin lc-checkin--history lc-checkin--insights[\s\S]*t\("insights\.empty"\)/);
assert.match(i18n, /"insights\.empty": "没有可复盘的打卡项"/);
assert.match(source, /role="list" aria-label="\$\{t\("insights\.window"\)\}"/);
assert.match(source, /role="listitem" tabindex="0"/);
assert.match(source, /day\.status === "complete"/);
assert.match(source, /role="list" aria-label="\$\{t\("insights\.legendAria"\)\}"/);
assert.match(i18n, /"insights\.partial": "部分完成"/);
assert.match(i18n, /"insights\.missed": "未完成"/);

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
    weeklyTrend: [{label: "empty week", completedDays: 0, eligibleScheduledDays: 0, scheduledDays: 0}, {label: "scheduled week", completedDays: 2, eligibleScheduledDays: 7, scheduledDays: 7}],
    days: [], aggregates: {completionRate: 29}, currentStreak: 1, longestStreak: 2, maturity: 8, startDate: "2026-06-29", endDate: "2026-09-20",
};
const View = new Function("getActiveItemById", "buildHabitInsights", "computeLongestStreaks", "buildCoachingSuggestions", "currentCalendarDate", "escapeHtml", "renderIconMarkup", "t", `${compiled}; return InsightView;`)(
    (store, id) => store.items.find(item => item.id === id), () => report, () => new Map(), () => [], () => new Date("2026-09-20T12:00:00"), escapeHtml, renderIconMarkup, t,
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
setPluginLanguage("en-US");
html = view.renderInsights();
assert.match(html, /<strong>2\/7 days<\/strong>/, "weekly units must remain localized");
setPluginLanguage("zh-CN");
console.log("Insight accessibility structure checks passed.");
