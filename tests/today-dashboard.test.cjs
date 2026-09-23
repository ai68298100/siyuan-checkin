/* T-1420 · R-A2 今日行动台测试：空态/待处理/完成/SKIP/quota/at-most/提醒计数/专注降级/
   排序确定性/截断，外加 render 接线与 i18n 结构守门。投影的事实输入由测试桩直接给定
   （事实判断归 model.ts，已有各自测试覆盖），本文件验证编排层语义本身。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-today-dashboard-"));
fs.writeFileSync(path.join(dir, "today-dashboard.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "today-dashboard.ts"), "utf8"), {compilerOptions}).outputText);
const {buildTodayDashboard} = require(path.join(dir, "today-dashboard.js"));

const fact = (overrides = {}) => ({
    itemId: "item-1", name: "晨间阅读", icon: "book", completed: false, skippedToday: false,
    progress: 0, target: 1, unit: "次", ...overrides,
});

/* —— 1. 空态：无日程时无推荐动作、完成率 0 —— */
{
    const dashboard = buildTodayDashboard({today: "2026-09-24", items: [], attention: [], focus: {available: false}});
    assert.equal(dashboard.totals.scheduled, 0);
    assert.equal(dashboard.totals.completionRate, 0);
    assert.equal(dashboard.nextAction, undefined, "空日程不产生推荐动作");
    assert.equal(dashboard.sections.find((s) => s.id === "now").total, 0);
    assert.equal(dashboard.truncated, false);
}

/* —— 2. 待处理：due-today，nextAction 指向它 —— */
{
    const dashboard = buildTodayDashboard({today: "2026-09-24", items: [fact()], attention: [], focus: {available: true}});
    assert.equal(dashboard.totals.pending, 1);
    assert.equal(dashboard.nextAction.type, "record");
    assert.equal(dashboard.nextAction.itemId, "item-1");
    assert.equal(dashboard.nextAction.reasonCode, "due-today");
    const now = dashboard.sections.find((s) => s.id === "now");
    assert.equal(now.items[0].reasonCode, "due-today");
}

/* —— 3. 已完成：done 段 + completed-today；全部完成时 nextAction 转向回顾 —— */
{
    const dashboard = buildTodayDashboard({today: "2026-09-24", items: [fact({completed: true})], attention: [], focus: {available: true}});
    assert.equal(dashboard.totals.done, 1);
    assert.equal(dashboard.totals.completionRate, 100);
    const done = dashboard.sections.find((s) => s.id === "done");
    assert.equal(done.items[0].reasonCode, "completed-today");
    assert.equal(dashboard.nextAction.type, "review");
    assert.equal(dashboard.nextAction.reasonCode, "completed-today");
}

/* —— 4. SKIP：跳过是中性 deferred，不算完成也不算待办 —— */
{
    const dashboard = buildTodayDashboard({today: "2026-09-24", items: [fact({skippedToday: true})], attention: [], focus: {available: true}});
    assert.equal(dashboard.totals.skipped, 1);
    assert.equal(dashboard.totals.done, 0);
    assert.equal(dashboard.totals.pending, 0);
    const deferred = dashboard.sections.find((s) => s.id === "deferred");
    assert.equal(deferred.items[0].reasonCode, "skipped-today");
    assert.equal(dashboard.nextAction.type, "review", "只剩跳过项时不推荐再记录");
}

/* —— 5. quota：达标 quota-met，落后 quota-behind —— */
{
    const met = buildTodayDashboard({today: "2026-09-24", items: [fact({completed: true, quota: {contributed: 3, amount: 3}})], attention: [], focus: {available: true}});
    assert.equal(met.sections.find((s) => s.id === "done").items[0].reasonCode, "quota-met");
    const behind = buildTodayDashboard({today: "2026-09-24", items: [fact({completed: false, quota: {contributed: 1, amount: 3}})], attention: [], focus: {available: true}});
    assert.equal(behind.sections.find((s) => s.id === "now").items[0].reasonCode, "quota-behind");
    assert.equal(behind.nextAction.reasonCode, "quota-behind");
}

/* —— 6. at-most：干净日 actionable(at-most-clean)，破戒日置顶 breach —— */
{
    const clean = buildTodayDashboard({today: "2026-09-24", items: [fact({atMost: {breached: false}})], attention: [], focus: {available: true}});
    assert.equal(clean.totals.pending, 1);
    assert.equal(clean.sections.find((s) => s.id === "now").items[0].reasonCode, "at-most-clean");
    const breached = buildTodayDashboard({
        today: "2026-09-24",
        items: [fact({itemId: "a", name: "晨间阅读"}), fact({itemId: "b", name: "不刷手机", atMost: {breached: true}})],
        attention: [], focus: {available: true},
    });
    assert.equal(breached.totals.breached, 1);
    const now = breached.sections.find((s) => s.id === "now");
    assert.equal(now.items[0].state, "breach", "破戒项在 now 段置顶");
    assert.equal(now.items[0].reasonCode, "at-most-breach");
    assert.equal(breached.nextAction.itemId, "b", "破戒项优先成为推荐动作");
}

/* —— 7. 提醒计数：只计数，条目呈现留给 priority reminder 单一路径 —— */
{
    const dashboard = buildTodayDashboard({
        today: "2026-09-24", items: [fact()], attention: [
            {id: "overdue-1", title: "生日提醒", severity: "overdue", daysUntil: -2},
            {id: "today-1", title: "周报", severity: "today", daysUntil: 0},
        ], focus: {available: true},
    });
    assert.equal(dashboard.attentionCount, 2);
}

/* —— 8. 专注降级：提供方缺失 → focus-unavailable 且不抛错 —— */
{
    const missing = buildTodayDashboard({today: "2026-09-24", items: [], attention: [], focus: {available: false}});
    assert.equal(missing.focus.reasonCode, "focus-unavailable");
    assert.equal(missing.focus.available, false);
    const idle = buildTodayDashboard({today: "2026-09-24", items: [], attention: [], focus: {available: true, active: false}});
    assert.equal(idle.focus.reasonCode, "focus-idle");
    const active = buildTodayDashboard({today: "2026-09-24", items: [], attention: [], focus: {available: true, active: true}});
    assert.equal(active.focus.reasonCode, "focus-active");
}

/* —— 9. 排序确定性：同输入两次构建深度相等；状态序 breach<actionable<skipped<done，平局按名称 zh-CN → itemId —— */
{
    const input = {
        today: "2026-09-24",
        items: [
            fact({itemId: "x3", name: "散步", completed: true}),
            fact({itemId: "x1", name: "不刷手机", atMost: {breached: false}}),
            fact({itemId: "x2", name: "晨间阅读", skippedToday: true}),
            fact({itemId: "x0", name: "冥想", completed: true, quota: {contributed: 2, amount: 2}}),
        ],
        attention: [], focus: {available: true},
    };
    const first = buildTodayDashboard(input);
    const second = buildTodayDashboard(input);
    assert.deepEqual(first, second, "同一输入两次构建深度相等");
    assert.equal(first.sections.find((s) => s.id === "done").items[0].fact.itemId, "x0", "done 段名称 zh-CN 平局排序");
}

/* —— 10. 截断：超限截断并置 truncated，total 保留截断前数量 —— */
{
    const items = Array.from({length: 7}, (_, i) => fact({itemId: `item-${i}`, name: `项目${i}`}));
    const dashboard = buildTodayDashboard({today: "2026-09-24", items, attention: [], focus: {available: true}, limits: {maxPerSection: 3}});
    const now = dashboard.sections.find((s) => s.id === "now");
    assert.equal(now.items.length, 3);
    assert.equal(now.total, 7);
    assert.equal(now.truncated, true);
    assert.equal(dashboard.truncated, true);
    assert.equal(dashboard.totals.pending, 7, "totals 反映截断前真实数量");
}

/* —— 11. 最近漏卡：missedDate 随条目透出 —— */
{
    const dashboard = buildTodayDashboard({today: "2026-09-24", items: [fact({missedDate: "2026-09-21"})], attention: [], focus: {available: true}});
    assert.equal(dashboard.sections.find((s) => s.id === "now").items[0].missedDate, "2026-09-21");
}

/* —— 12. 接线守门：fragments 消费投影、摘要条 DOM、i18n 双语键 —— */
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /buildTodayDashboard/, "今日视图必须消费 today-dashboard 投影");
assert.match(fragmentsSource, /data-today-dashboard/, "今日视图必须渲染行动台摘要条容器");
assert.match(fragmentsSource, /renderTodayDashboardStrip/, "摘要条渲染函数必须存在");
for (const key of ["today.consoleTotals", "today.consoleNext", "today.consoleAllDone", "today.consoleFocusMissing"]) {
    assert.match(fragmentsSource, new RegExp(key.replace(/\./, "\\.")), `fragments 使用 ${key}`);
}
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.consoleTotals", "today.consoleNext", "today.consoleAllDone", "today.consoleFocusMissing"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}
/* 纯度：投影模块不得依赖任何其它模块（零 import），不读取时钟。 */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "today-dashboard.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "投影模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

console.log("today-dashboard tests passed: 空态/待处理/完成/SKIP/quota/at-most/提醒/专注降级/确定性/截断/接线守门 全部通过");
