/* T-1415/T-1426 · R-A3 节奏与恢复投影测试：普通 backlogRate（SKIP 排除/证据日期/阈值）、
   quota 独立口径、at-most 恢复状态与戒断里程碑阶梯（0/边界/登顶）、判别入口、
   确定性与纯度；外加今日卡片里程碑标签的结构守门与 i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-pace-projection-"));
fs.writeFileSync(path.join(dir, "pace-projection.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "pace-projection.ts"), "utf8"), {compilerOptions}).outputText);
const pp = require(path.join(dir, "pace-projection.js"));

/* —— 1. 普通 at-least：backlogRate 口径（SKIP 排除机会也不算失败） —— */
{
    const empty = pp.projectAtLeastPace({scheduledDates: [], completedDates: [], skippedDates: []});
    assert.equal(empty.reasonCode, "no-opportunities");
    assert.equal(empty.backlogRate, 0);
    const full = pp.projectAtLeastPace({
        scheduledDates: ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23"],
        completedDates: ["2026-09-21", "2026-09-23"],
        skippedDates: ["2026-09-20"],
    });
    assert.equal(full.dueOpportunities, 3, "SKIP 日不算已到期机会");
    assert.equal(full.doneOpportunities, 2);
    assert.equal(full.backlogRate, 33, "1/3 ≈ 33%（四舍五入口径）");
    assert.deepEqual(full.missedDates, ["2026-09-22"], "证据日期：漏掉的排期日");
    assert.equal(full.reasonCode, "on-track");
}

/* —— 2. backlog 阈值：≥50% 判定积压 —— */
{
    const backlog = pp.projectAtLeastPace({
        scheduledDates: ["2026-09-20", "2026-09-21"],
        completedDates: [],
        skippedDates: [],
    });
    assert.equal(backlog.backlogRate, 100);
    assert.equal(backlog.reasonCode, "backlog");
    const half = pp.projectAtLeastPace({scheduledDates: ["2026-09-20", "2026-09-21"], completedDates: ["2026-09-21"], skippedDates: []});
    assert.equal(half.backlogRate, 50);
    assert.equal(half.reasonCode, "backlog", "恰好 50% 判入积压");
}

/* —— 3. quota 独立口径：不与普通逾期率混淆 —— */
{
    const met = pp.projectQuotaPace({contributed: 4, amount: 3});
    assert.equal(met.reasonCode, "quota-met");
    assert.equal(met.rate, 100, "贡献超出目标进度封顶 100");
    const behind = pp.projectQuotaPace({contributed: 1, amount: 4});
    assert.equal(behind.reasonCode, "quota-behind");
    assert.equal(behind.rate, 25);
    const zero = pp.projectQuotaPace({contributed: 0, amount: 0});
    assert.equal(zero.rate, 0, "目标为 0 时进度为 0（无除零）");
    assert.equal(zero.reasonCode, "quota-behind");
}

/* —— 4. at-most 里程碑阶梯：0 起点/阶梯边界/登顶 —— */
{
    const zero = pp.abstinenceMilestones(0);
    assert.deepEqual([zero.achieved, zero.next, zero.progressPct], [0, 1, 0], "第 0 天下一关是 1 天");
    const one = pp.abstinenceMilestones(1);
    assert.deepEqual([one.achieved, one.next], [1, 3]);
    const edge = pp.abstinenceMilestones(14);
    assert.deepEqual([edge.achieved, edge.next], [14, 30], "恰好踩线即达成");
    const year = pp.abstinenceMilestones(400);
    assert.deepEqual([year.achieved, year.next, year.progressPct], [365, undefined, 100], "登顶后无下一关");
    const half = pp.abstinenceMilestones(45);
    assert.equal(half.achieved, 30);
    assert.equal(half.progressPct, 75, "通往 60 天的进度 75%");
}

/* —— 5. at-most 投影：恢复状态与破戒历史 —— */
{
    const clean = pp.projectAtMostPace({cleanDays: 30, breachDates: []});
    assert.equal(clean.recovery, "in-recovery");
    assert.equal(clean.reasonCode, "at-most-clean");
    assert.equal(clean.milestones.achieved, 30);
    const lapsed = pp.projectAtMostPace({cleanDays: 0, breachDates: ["2026-09-24", "2026-09-01", "2026-09-24"]});
    assert.equal(lapsed.recovery, "lapsed");
    assert.equal(lapsed.reasonCode, "at-most-breach");
    assert.deepEqual(lapsed.breaches, ["2026-09-01", "2026-09-24"], "破戒日升序去重（证据可回放）");
    assert.equal(lapsed.milestones.cleanDays, 0);
}

/* —— 6. 判别入口 projectPace 分发 —— */
{
    assert.equal(pp.projectPace({kind: "at-least", scheduledDates: [], completedDates: [], skippedDates: []}).kind, "at-least");
    assert.equal(pp.projectPace({kind: "quota", contributed: 1, amount: 2}).kind, "quota");
    assert.equal(pp.projectPace({kind: "at-most", cleanDays: 7, breachDates: []}).kind, "at-most");
}

/* —— 7. 确定性 + 纯度审计 —— */
{
    const facts = {cleanDays: 5, breachDates: ["2026-09-02", "2026-09-01"]};
    assert.deepEqual(pp.projectAtMostPace(facts), pp.projectAtMostPace(facts));
}
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "pace-projection.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "投影模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 9. 失速排名（R-20.3）：过滤零漏卡、漏卡次数降序、平局稳定、截断 —— */
{
    const facts = [
        {itemId: "a", name: "冥想", dueOpportunities: 10, missedCount: 0},
        {itemId: "b", name: "晨跑", dueOpportunities: 8, missedCount: 3},
        {itemId: "c", name: "阅读", dueOpportunities: 8, missedCount: 3},
        {itemId: "d", name: "戒糖", dueOpportunities: 8, missedCount: 5, lastMissedDate: "2026-09-23"},
    ];
    const ranked = pp.rankStalledItems(facts, 10);
    assert.equal(ranked.length, 3, "零漏卡项目不进排名");
    assert.equal(ranked[0].itemId, "d", "漏卡次数降序");
    assert.equal(ranked[1].itemId, "b", "同次数按名称 zh-CN 稳定平局（晨跑 < 阅读）");
    assert.equal(ranked[1].backlogRate, 38, "38% = 3/8 四舍五入");
    assert.equal(ranked[0].lastMissedDate, "2026-09-23", "证据日期透出");
    const capped = pp.rankStalledItems(facts, 2);
    assert.equal(capped.length, 2, "limit 截断");
    assert.deepEqual(pp.rankStalledItems(facts, 10), pp.rankStalledItems(facts, 10), "同一输入两次排名深度相等");
    const empty = pp.rankStalledItems([], 5);
    assert.equal(empty.length, 0);
}

/* —— 10. 消费守门：今日卡片里程碑标签 + summary 渲染块 + API getStreaks 同口径 + 报告失速节 + i18n 双语 —— */
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /abstinenceMilestones/, "今日卡片必须消费戒断里程碑投影");
assert.match(fragmentsSource, /is-milestone/, "里程碑标签类必须在位");
assert.match(fragmentsSource, /today\.abstinenceDay/, "卡片必须展示戒断天数");
const blockSource = fs.readFileSync(path.join(root, "src", "features", "checkin-block.ts"), "utf8");
assert.match(blockSource, /abstinenceMilestones/, "summary 渲染块必须消费戒断里程碑（同口径）");
assert.match(blockSource, /today\.abstinenceDay/, "渲染块必须展示戒断天数");
const apiSource = fs.readFileSync(path.join(root, "src", "api.ts"), "utf8");
assert.match(apiSource, /milestones = directionById\.get\(itemId\) === "atMost" \? abstinenceMilestones\(base\.current\) : undefined/, "API getStreaks 必须为 at-most 附里程碑（同口径）");
const docsSource = fs.readFileSync(path.join(root, "docs", "api-v5.md"), "utf8");
assert.match(docsSource, /milestones\?: \{achieved: number; next\?: number; progressPct: number\}/, "API 文档必须同步 milestones 字段");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.abstinenceDay", "today.abstinenceNext", "item.milestoneTitle"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 10b. 漏卡时间段聚合：星期推导（2026-09-24=周四）/时段固定顺序/排序稳定性 + 接线守门 —— */
{
    const byWeekday = pp.aggregateMissedWeekdays(["2026-09-24", "2026-09-24", "2026-09-20", "bad"]);
    assert.deepEqual(byWeekday, [{weekday: 4, count: 2}, {weekday: 0, count: 1}], "周四×2 + 周日×1，降序稳定");
    const bySlot = pp.aggregateMissedTimeSlots([{localDate: "2026-09-24", timeSlot: "evening"}, {localDate: "2026-09-23", timeSlot: "evening"}, {localDate: "2026-09-22"}, {localDate: "2026-09-21", timeSlot: "weird"}]);
    assert.deepEqual(bySlot.map((e) => e.timeSlot), ["evening", "any"], "时段聚合：非法归 any");
    assert.deepEqual(pp.aggregateMissedWeekdays([]), []);
}
const reportSource2 = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
assert.match(reportSource2, /report.missedTimeTitle/, "报告必须渲染漏卡时间段节");
assert.match(reportSource2, /aggregateMissedWeekdays|missedByWeekday/, "报告必须消费星期聚合");
const indexSource2 = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource2, /aggregateMissedWeekdays\(missedWeekdaySlices\)/, "index 必须聚合漏卡星期");
assert.match(indexSource2, /aggregateMissedTimeSlots\(missedSlotSlices\)/, "index 必须聚合漏卡时段");
const i18nSource2 = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
{
    const occurrences = i18nSource2.split('"report.missedTimeTitle"').length - 1;
    assert.ok(occurrences >= 2, `report.missedTimeTitle 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("pace-projection tests passed: backlog 口径/SKIP 排除/证据日期/quota 独立/at-most 恢复与里程碑阶梯/判别入口/确定性/消费守门/纯度 全部通过");
