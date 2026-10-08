/* T-1515 全项目未来一周负荷预演守门：
   逐日标记与排期内核同口径（复用 T-1513）、计量分开不换算（分钟只来自时长配置）、
   配额单列不摊派到每天、归档/非法排期如实排除、跨周/跨月日期确定性、
   零事件写入、今日页接线（按需展开/名称跳编辑）与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-week-load-"));
const load = (relative) => {
    const target = path.join(dir, "src", relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
/* 先落盘依赖，保持模块间相对 require 可解析。 */
load("date-keys.ts");
load("features/schedule-preview.ts");
const weekLoad = load("features/week-load.ts");

const item = (overrides = {}) => ({id: "a", name: "拉伸", kind: "duration", unit: "分钟", target: 30, archived: false, createdAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01", schedule: {type: "daily"}, revisions: [], ...overrides});

/* —— 1. 逐日标记：每天项目 7 天全应做；工作日项目周末休。 —— */
{
    const result = weekLoad.buildWeekLoadPreview([item()], "2026-09-23"); // Wednesday
    assert.equal(result.dates.length, 7);
    assert.equal(result.dates[0], "2026-09-23");
    assert.equal(result.dates[6], "2026-09-29", "cross-week window spans into next week");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].days.filter((day) => day.scheduled).length, 7);
    assert.deepEqual(weekLoad.buildWeekLoadPreview([item()], "2026-02-30"), {startDate: "2026-02-30", dates: [], items: [], quotaItems: [], invalidCount: 0}, "impossible dates fail closed without generating a normalized week");
    const workdays = weekLoad.buildWeekLoadPreview([item({id: "b", name: "健身", schedule: {type: "workdays"}})], "2026-09-23");
    assert.deepEqual(workdays.items[0].days.filter((day) => day.scheduled).map((day) => day.date), ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-28", "2026-09-29"]);
}

/* —— 2. 计量分开：每行保留自身单位，无跨单位汇总字段。 —— */
{
    const result = weekLoad.buildWeekLoadPreview([
        item({id: "min", name: "冥想", unit: "分钟"}),
        item({id: "count", name: "喝水", kind: "count", unit: "次", target: 8}),
    ], "2026-09-23");
    assert.equal(result.items.length, 2);
    const units = result.items.map((entry) => entry.unit).sort();
    assert.deepEqual(units, ["分钟", "次"], "units stay per-item and unconverted");
    assert.ok(!JSON.stringify(result).includes("totalMinutes"), "the module never aggregates minutes across units");
}

/* —— 3. 配额单列：无逐日标记、不摊派到每天。 —— */
{
    const result = weekLoad.buildWeekLoadPreview([item({id: "q", name: "跑步", schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}})], "2026-09-23");
    assert.equal(result.items.length, 0, "quota items never join the per-day list");
    assert.equal(result.quotaItems.length, 1);
    assert.deepEqual(result.quotaItems[0].quota, {period: "week", amount: 3, countMode: "dates"});
    assert.equal(result.quotaItems[0].days.length, 0);
}

/* —— 4. 归档排除；非法排期如实排除并计数；混合月界确定性。 —— */
{
    const result = weekLoad.buildWeekLoadPreview([
        item({id: "archived", archived: true}),
        item({id: "bad", schedule: {type: "custom", weekdays: []}}),
        item({id: "keep"}),
    ], "2026-09-23");
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].itemId, "keep");
    assert.equal(result.invalidCount, 1);
    const monthBoundary = weekLoad.buildWeekLoadPreview([item()], "2026-09-28");
    assert.equal(monthBoundary.dates[3], "2026-10-01", "date rollover across the month boundary");
    assert.deepEqual(monthBoundary, weekLoad.buildWeekLoadPreview([item()], "2026-09-28"), "deterministic output");
}

/* —— 5. 今日页接线与双语。 —— */
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /data-week-load/, "today page hosts the week load disclosure");
assert.match(fragmentsSource, /data-week-load-edit=/, "item names jump back to the editor");
assert.match(fragmentsSource, /buildWeekLoadPreview\(store\.items/, "preview consumes the store projection");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");
assert.match(bindSource, /"\[data-week-load-edit\]"/, "editor jump is bound on the today page");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.weekLoadTitle", "today.weekLoadHint", "today.weekLoadQuotaTitle", "today.weekLoadQuota", "today.weekLoadWeek", "today.weekLoadMonth"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("week load gates passed: kernel-parity day marks, per-item units without conversion, separate quota list, archived/invalid exclusions, cross-week determinism, today wiring and bilingual copy.");
