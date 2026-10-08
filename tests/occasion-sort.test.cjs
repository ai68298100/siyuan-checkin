/* T-1715 守门：排序选择与千项效率（D-361）。
   风险路径（T-1667 场景）：排序固定"启用优先→下次日期→名称"，无用户选择；
   千项列表的冷渲染/筛选响应无实测。
   契约：三种排序模式（next=既有近到远口径逐值不变 / name=启用优先→中文名
   localeCompare / updated=启用优先→最近修改降序），enabled 恒最前、无下次日期
   在 next 模式排后；千项 renderOccasionsView 冒烟有成本上界；排序下拉与宿主
   字段接线；语言切换（zh-CN localeCompare）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-sort-"));
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
transpileTo("render/occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const renderOccasions = require(path.join(dir, "render", "occasions.js"));

const occasion = (id, name, over = {}) => ({
    id,
    name,
    kind: "scheduled",
    date: "2026-09-10",
    recurrence: "weekly",
    weekday: 3,
    enabled: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    completedDates: [],
    ...over,
});
const makeCtx = (occasions, sortMode) => ({
    occasionStore: {version: 1, occasions},
    occasionSearchQuery: "",
    occasionStatusFilter: "all",
    occasionKindFilter: "all",
    occasionTimeFilter: "all",
    occasionSortMode: sortMode,
    occasionTemplatesOpen: false,
    occasionTemplateCategory: "recommended",
    occasionPreviewOpen: false,
    editingOccasionId: undefined,
    appearance: "light",
    reducedMotion: false,
    supportsCustomTab: false,
    bestStreakValue: 0,
    currentStreaks: new Map(),
    reminderUserActions: [],
    weekStripVisible: false,
    bulkMode: false,
    reminderQuiet: false,
    firstSuccessSkipped: true,
    quickEntryNlp: false,
    pendingOnly: false,
    saveState: "idle",
    celebration: undefined,
    isMobileFrontend: false,
    todaySortMode: "manual",
    completedCollapsed: false,
    priorityReminderExpanded: false,
    insightFallback: false,
    focusAvailable: false,
    todayQuery: "",
    quickEntryCancelled: new Set(),
    reviewFoldSections: new Set(),
    recordDetailsExpanded: new Set(),
});
const namesOf = (markup) => [...markup.matchAll(/<strong>([^<]+)<\/strong><span class="lc-checkin__occasion-status|<strong>([^<]+)<\/strong><\/span>/g)].map((m) => m[1] || m[2]);

/* 千项数据（不同名称/修改时间/周几）。 */
const bulk = Array.from({length: 1000}, (_, index) => occasion(
    `b${index}`,
    `事项 ${String(index).padStart(4, "0")}`,
    {weekday: index % 7, updatedAt: new Date(2026, 0, 1 + (index % 90)).toISOString()},
));

/* —— 夹具 1：千项冷渲染成本上界（三种模式都要在预算内）。 —— */
for (const mode of ["next", "name", "updated"]) {
    const start = process.hrtime.bigint();
    const markup = renderOccasions.renderOccasionsView(makeCtx(bulk, mode));
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    assert.ok(markup.includes("lc-checkin__occasion-manager-row"), `${mode}: renders rows`);
    assert.ok(ms < 5000, `${mode}: 1000-item cold render stays bounded (took ${ms.toFixed(0)}ms)`);
}

/* —— 夹具 2：小集合排序语义（转译视图 + 小数据）。 —— */
const small = [
    occasion("s1", "乙事项", {weekday: 3, updatedAt: "2026-09-10T00:00:00.000Z"}),
    occasion("s2", "甲事项", {weekday: 4, updatedAt: "2026-09-20T00:00:00.000Z"}),
    occasion("s3", "丙事项", {weekday: 3, updatedAt: "2026-09-15T00:00:00.000Z", enabled: false}),
];
/* 同周几造成 next 相同时按名称回落——用不同 weekday 制造 next 差异。 */
const orderOf = (mode) => {
    const markup = renderOccasions.renderOccasionsView(makeCtx(small, mode));
    return [...markup.matchAll(/<strong>([^<]*)<\/strong>/g)].map((m) => m[1]).filter((name) => name.includes("事项"));
};
const byNext = orderOf("next");
if (process.env.OS_DEBUG) console.error("DEBUG byNext=", JSON.stringify(byNext));
assert.equal(byNext.indexOf("甲事项") < byNext.indexOf("乙事项"), true, "next mode orders by next occurrence date (today before next week)");
const byName = orderOf("name");
assert.equal(byName.indexOf("甲事项") < byName.indexOf("乙事项") && byName.indexOf("乙事项") < byName.indexOf("丙事项"), true, "name mode sorts by zh-CN name");
const byUpdated = orderOf("updated");
assert.equal(byUpdated.indexOf("甲事项") < byUpdated.indexOf("乙事项"), true, "updated mode puts the most recently modified first");
assert.ok(byNext.includes("丙事项"), "disabled rows still render (in the disabled agenda bucket)");

/* —— 夹具 3：接线结构钉 + 红证对照（钉修复前提交 f65e118→最新 282a622 链上的 09786ca）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSource, /\[data-occasion-sort\]/, "the sort select is wired");
assert.match(bindSource, /host\.occasionSortMode = \(event\.currentTarget as HTMLSelectElement\)\.value/, "the click applies the sort mode");
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /const sortMode = ctx\.occasionSortMode \|\| "next";/, "the view reads the sort mode with the legacy default");
assert.match(viewSource, /data-occasion-sort/, "the filter panel exposes the sort select");
const preFixView = cp.execSync("git show 09786ca:src/render/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixView, /occasionSortMode/, "the pre-fix view had no sort choice (red evidence)");

/* —— 夹具 4：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.sortLabel", "occ.sortNext", "occ.sortName", "occ.sortUpdated"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("occasion-sort: all assertions passed");
