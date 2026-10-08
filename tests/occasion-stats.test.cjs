/* T-1713 守门：可操作统计与筛选口径（D-356）。
   风险路径（截图主诉）：统计只是三个纯文本数字（全部/启用中/今天），筛选另在折叠
   面板且时间维度缺"错过"口径；零结果无恢复路径。
   契约：统计块为可点击筛选入口（data-occasion-stat 携带 status/time 组合），口径与
   agenda 分桶同源（enabled+getMissedOccurrence/next），激活态 is-active+aria-pressed
   高亮当前筛选，title 明示口径；时间筛选下拉补 missed 选项；零结果附清除筛选按钮。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-stats-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    fs.writeFileSync(target, ts.transpileModule(source.replace(/from "siyuan"/g, `from ${stubSpec}`), {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("render/bind-occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const bindOccasions = require(path.join(dir, "render", "bind-occasions.js"));

globalThis.window = {confirm: () => true};
const makeFixture = () => {
    const statButtons = [
        {dataset: {occasionStat: "all", statStatus: "all", statTime: "all"}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }},
        {dataset: {occasionStat: "missed", statStatus: "enabled", statTime: "missed"}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }},
    ];
    const root = {querySelector: () => null, querySelectorAll: (selector) => selector === "[data-occasion-stat]" ? statButtons : []};
    const host = {
        occasionStore: {version: 1, occasions: []},
        occasionSearchQuery: "",
        occasionStatusFilter: "all",
        occasionKindFilter: "all",
        occasionTimeFilter: "all",
        occasionTemplatesOpen: false,
        occasionTemplateCategory: "recommended",
        render() {},
        enqueueMutation: (operation) => Promise.resolve(operation()),
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion", "setOccasionCompleted", "persistOccasions", "saveOccasionForm"]) host[name] = () => Promise.resolve();
    bindOccasions.bindOccasionsHandlers(root, host);
    return {host, statButtons};
};

(async () => {
    /* —— 夹具 1：点击统计 → 设置对应筛选组合（全部/错过）。 —— */
    const fixture = makeFixture();
    fixture.statButtons[1].fire();
    assert.equal(fixture.host.occasionStatusFilter, "enabled", "the missed stat enables the status filter");
    assert.equal(fixture.host.occasionTimeFilter, "missed", "the missed stat scopes time to missed");
    fixture.statButtons[0].fire();
    assert.equal(fixture.host.occasionStatusFilter, "all", "the all stat resets both dimensions");
    assert.equal(fixture.host.occasionTimeFilter, "all", "the all stat resets time");

    /* —— 夹具 2：渲染结构钉——口径同源、激活态、missed 选项、空态清除。 —— */
    const renderSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
    assert.match(renderSource, /data-occasion-stat=/, "stats render as clickable filter entries");
    assert.match(renderSource, /data-stat-status=/, "each stat carries its status dimension");
    assert.match(renderSource, /data-stat-time=/, "each stat carries its time dimension");
    assert.match(renderSource, /is-active/, "the active stat is highlighted");
    assert.match(renderSource, /aria-pressed="\$\{active\}"/, "the active state is announced to assistive tech");
    assert.match(renderSource, /Boolean\(getMissedOccurrence\(item, todayKey\)\)\)\.length/, "the missed count shares the agenda bucket source");
    assert.match(renderSource, /\["missed", t\("occ\.filterMissed"\)\]/, "the time filter exposes the missed option");
    assert.match(renderSource, /data-occasion-clear-filters>\$\{t\("occ\.clearFilters"\)\}/, "an empty result with filters offers the clear action");
    const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
    assert.match(bindSource, /\[data-occasion-stat\]/, "the binder wires the stat entries");
    assert.match(bindSource, /(?:host\.occasionStatusFilter = \(button\.dataset\.statStatus|occasionStatusFilter: \(button\.dataset\.statStatus)/, "the click applies the status dimension");

    /* —— 夹具 3：i18n 双语键在位。 —— */
    const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
    for (const key of ["occ.filterMissed", "occ.statAllHint", "occ.statEnabledHint", "occ.statTodayHint", "occ.statMissedHint", "occ.statEndedHint"]) {
        assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
    }

    /* —— 夹具 4：红证对照——修复前（282a622）统计为纯文本且无 missed 口径。 —— */
    const preFixRender = cp.execSync("git show 282a622:src/render/occasions.ts", {encoding: "utf8"});
    assert.doesNotMatch(preFixRender, /data-occasion-stat=/, "the pre-fix stats were not clickable (red evidence)");
    assert.doesNotMatch(preFixRender, /"missed", t\("occ\.filterMissed"\)/, "the pre-fix time filter had no missed option (red evidence)");

    console.log("occasion-stats: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
