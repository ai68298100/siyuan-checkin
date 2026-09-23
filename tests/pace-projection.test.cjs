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

/* —— 8. 消费守门：今日卡片里程碑标签 + i18n 双语 + 无时钟清单 —— */
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /abstinenceMilestones/, "今日卡片必须消费戒断里程碑投影");
assert.match(fragmentsSource, /is-milestone/, "里程碑标签类必须在位");
assert.match(fragmentsSource, /today\.abstinenceDay/, "卡片必须展示戒断天数");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["today.abstinenceDay", "today.abstinenceNext", "item.milestoneTitle"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("pace-projection tests passed: backlog 口径/SKIP 排除/证据日期/quota 独立/at-most 恢复与里程碑阶梯/判别入口/确定性/消费守门/纯度 全部通过");
