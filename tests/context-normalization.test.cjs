/* T-1433 · R-A3/R-20.2 情境化记录测试：关键词归一化（中英/大小写/空文本）、
   聚合（计数降序+稳定次序/other 兜底/日期范围/样本不足守卫）、报告消费接线、
   纯度审计（零依赖+无时钟）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-context-norm-"));
fs.writeFileSync(path.join(dir, "context-normalization.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "context-normalization.ts"), "utf8"), {compilerOptions}).outputText);
const cn = require(path.join(dir, "context-normalization.js"));

/* —— 1. 关键词归一化：中英/大小写/多词元/未命中 —— */
{
    assert.deepEqual(cn.classifyContextTokens("今天没时间，加班到太晚"), ["time"], "中文时间不足");
    assert.deepEqual(cn.classifyContextTokens("有点懒，拖延了"), ["resistance"], "中文阻力");
    assert.deepEqual(cn.classifyContextTokens("下雨没去跑步"), ["environment"], "中文环境（天气）");
    assert.deepEqual(cn.classifyContextTokens("No time at all, so BUSY"), ["time"], "英文大小写不敏感");
    assert.deepEqual(cn.classifyContextTokens("感冒发烧，头很疼"), ["health"], "中文身体状态");
    assert.deepEqual(cn.classifyContextTokens("心情很差，压力好大"), ["mood"], "中文情绪");
    assert.deepEqual(cn.classifyContextTokens("临时陪家人出门"), [], "未命中词表 → 聚合层归 other");
    assert.deepEqual(cn.classifyContextTokens(""), []);
    assert.deepEqual(cn.classifyContextTokens(undefined), [], "非字符串安全");
}

/* —— 2. 聚合：计数降序+词表序稳定、other 兜底、日期范围 —— */
{
    const slices = [
        {note: "没时间", localDate: "2026-09-22"},
        {note: "加班太忙", localDate: "2026-09-23"},
        {note: "就是不想动", localDate: "2026-09-21"},
        {note: "陪家人", localDate: "2026-09-20"},
    ];
    const agg = cn.aggregateSkipContext(slices);
    assert.equal(agg.totalNotes, 4);
    assert.equal(agg.classifiedCount, 3, "陪家人未命中 → other");
    assert.equal(agg.tokens[0].token, "time", "计数 2 的词元排第一");
    assert.equal(agg.tokens[0].count, 2);
    assert.equal(agg.tokens.find((t) => t.token === "other").count, 1);
    assert.equal(agg.firstDate, "2026-09-20");
    assert.equal(agg.lastDate, "2026-09-23");
}

/* —— 3. 样本不足守卫：< 3 条 insufficient —— */
{
    const small = cn.aggregateSkipContext([{note: "没时间", localDate: "2026-09-22"}, {note: "下雨", localDate: "2026-09-23"}]);
    assert.equal(small.totalNotes, 2);
    assert.equal(small.sufficient, false, "样本 < 3 必须标记不足");
    const enough = cn.aggregateSkipContext([{note: "没时间"}, {note: "下雨"}, {note: "累"}]);
    assert.equal(enough.sufficient, true);
}

/* —— 4. 空输入：全空切片 → totalNotes 0 —— */
{
    const agg = cn.aggregateSkipContext([{note: ""}, {localDate: "2026-09-22"}, {}]);
    assert.equal(agg.totalNotes, 0);
    assert.equal(agg.sufficient, false);
    assert.equal(agg.firstDate, undefined);
}

/* —— 5. 确定性 + 纯度 —— */
{
    const slices = [{note: "没时间", localDate: "2026-09-22"}, {note: "懒"}, {note: "下雨"}];
    assert.deepEqual(cn.aggregateSkipContext(slices), cn.aggregateSkipContext(slices));
}
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "context-normalization.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "归一化模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 6. 接线守门：报告消费节 + index 聚合调用 + i18n 双语 —— */
const reportSource = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
assert.match(reportSource, /contextAggregation\?: ContextAggregation/, "报告 options 必须接受情境聚合");
assert.match(reportSource, /report\.contextTitle/, "报告必须渲染跳过原因分布节");
assert.match(reportSource, /report\.contextInsufficient/, "样本不足提示必须在位");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /aggregateSkipContext\(skipSlices\)/, "index 必须以区间内跳过事件构建聚合");
assert.match(indexSource, /crossTabulateContextWeekdays\(skipSlices\)/, "index 必须以同一份切片构建星期交叉");
const reportSource3 = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
assert.match(reportSource3, /report\.contextWeekday/, "报告必须渲染情境×星期交叉行");

/* —— 8. T-1452 情境×星期交叉：过半集中才成模式，样本门槛 + 确定性 —— */
{
    /* 三条 health 命中两条落在周四（2026-09-24 是周四）、一条在周一 → 过半集中模式成立。 */
    const concentrated = cn.crossTabulateContextWeekdays([
        {note: "累", localDate: "2026-09-24"},
        {note: "生病", localDate: "2026-09-24"},
        {note: "失眠", localDate: "2026-09-21"},
    ]);
    assert.equal(concentrated.length, 1, "过半集中给出模式");
    assert.equal(concentrated[0].token, "health");
    assert.deepEqual([concentrated[0].count, concentrated[0].total], [2, 3]);
    /* 分散命中（三天不同星期、各 1 次）不构成模式。 */
    const scattered = cn.crossTabulateContextWeekdays([
        {note: "累", localDate: "2026-09-24"},
        {note: "生病", localDate: "2026-09-21"},
        {note: "失眠", localDate: "2026-09-22"},
    ]);
    assert.deepEqual(scattered, [], "均匀分布不成模式");
    /* 样本门槛：< 3 条命中不给模式。 */
    const thin = cn.crossTabulateContextWeekdays([
        {note: "累", localDate: "2026-09-24"},
        {note: "生病", localDate: "2026-09-24"},
    ]);
    assert.deepEqual(thin, [], "样本不足不推断");
    /* 未命中词表/缺日期/非法日期切片安全跳过。 */
    const mixed = cn.crossTabulateContextWeekdays([
        {note: "累", localDate: "2026-09-24"},
        {note: "累", localDate: "2026-09-17"},
        {note: "没有原因"},
        {note: "拖延", localDate: "bad-date"},
        {note: "没时间", localDate: "2026-09-24"},
        {note: "太忙", localDate: "2026-09-24"},
    ]);
    assert.ok(mixed.every((entry) => ["resistance", "time", "health"].includes(entry.token)), "命中词元的模式正常输出");
    /* 纯度：冻结输入不被改写。 */
    const frozen = Object.freeze([{note: "累", localDate: "2026-09-24"}, {note: "生病", localDate: "2026-09-24"}, {note: "失眠", localDate: "2026-09-17"}]);
    assert.equal(cn.crossTabulateContextWeekdays(frozen).length, 1);
}
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["report.contextTitle", "report.contextInsufficient", "report.contextToken.resistance", "report.contextToken.time", "report.contextToken.environment", "report.contextToken.health", "report.contextToken.mood", "report.contextToken.other", "report.contextWeekday"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("context-normalization tests passed: 关键词归一化/聚合排序/other 兜底/样本不足守卫/日期范围/接线守门/纯度 全部通过");
