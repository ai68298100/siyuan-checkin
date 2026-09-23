/* T-1425 · R-A8 可保存视图测试：版本化归一化（fail-closed/上限截断）、相对日期解析
   （经 date-keys 单一实现）、缺失条件显式回显、描述词元与确定性；外加报告消费方
   与 i18n 结构守门、纯度审计。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-view-scope-"));
for (const [source, target] of [["src/date-keys.ts", "date-keys.js"], ["src/features/view-scope.ts", path.join("features", "view-scope.js")]]) {
    const targetPath = path.join(dir, target);
    fs.mkdirSync(path.dirname(targetPath), {recursive: true});
    fs.writeFileSync(targetPath, ts.transpileModule(fs.readFileSync(path.join(root, source), "utf8"), {compilerOptions}).outputText);
}
const vs = require(path.join(dir, "features", "view-scope.js"));

/* —— 1. 归一化：缺省/版本 fail-closed —— */
{
    const {scope, truncated} = vs.normalizeViewScope(undefined);
    assert.equal(truncated, false);
    assert.deepEqual(scope, {version: 1, range: {kind: "all"}, itemIds: [], groups: [], sources: [], status: "all"});
    const wrongVersion = vs.normalizeViewScope({version: 2, range: {kind: "relative-days", days: 7}});
    assert.equal(wrongVersion.scope.range.kind, "all", "版本不符整体回落默认（fail-closed）");
    assert.equal(wrongVersion.truncated, false);
    const badRange = vs.normalizeViewScope({version: 1, range: {kind: "relative-days", days: 0}});
    assert.deepEqual(badRange.scope.range, {kind: "relative-days", days: 730}, "非法天数钳制到上限");
    assert.equal(badRange.truncated, true, "钳制必须置 truncated");
}

/* —— 2. 相对天数与过滤器上限 —— */
{
    const {scope, truncated} = vs.normalizeViewScope({
        version: 1,
        range: {kind: "relative-days", days: 30},
        itemIds: [" item-1 ", "item-1", "item-2"],
        groups: ["工作"],
        sources: ["manual", "tomato", "api", "import", "sireader", "siplayer", "health", "wakatime", "rescuetime"],
        status: "completed",
    });
    assert.deepEqual(scope.range, {kind: "relative-days", days: 30});
    assert.deepEqual(scope.itemIds, ["item-1", "item-2"], "trim + 去重");
    assert.equal(truncated, true, "来源超过 8 个截断");
    assert.equal(scope.sources.length, 8);
    assert.equal(scope.status, "completed");
    const bogus = vs.normalizeViewScope({version: 1, range: {kind: "relative-days", days: 12}, status: "weird"});
    assert.equal(bogus.scope.status, "all", "非法状态回落 all");
    assert.equal(bogus.truncated, false);
}

/* —— 3. 解析：相对日期经 date-keys 单一实现 —— */
{
    const {scope} = vs.normalizeViewScope({version: 1, range: {kind: "relative-days", days: 7}});
    const resolved = vs.resolveViewScope(scope, {
        today: "2026-09-24",
        knownItemIds: ["item-1"],
        knownGroups: ["工作"],
        knownSources: ["manual"],
    });
    assert.equal(resolved.startDate, "2026-09-18", "最近 7 天 = today-6 起（闭区间）");
    assert.equal(resolved.endDate, "2026-09-24");
    const all = vs.resolveViewScope(vs.normalizeViewScope({}).scope, {today: "2026-09-24", knownItemIds: [], knownGroups: [], knownSources: []});
    assert.equal(all.startDate, undefined, "all 不设下界");
    /* 跨年边界：12 月末的 7 天窗口。 */
    const yearEnd = vs.resolveViewScope(scope, {today: "2026-01-03", knownItemIds: [], knownGroups: [], knownSources: []});
    assert.equal(yearEnd.startDate, "2025-12-28", "跨年回退正确");
}

/* —— 4. 缺失条件：失效项目/分组/来源显式回显，不静默丢弃 —— */
{
    const {scope} = vs.normalizeViewScope({version: 1, range: {kind: "all"}, itemIds: ["item-1", "ghost-item"], groups: ["工作", "已删分组"], sources: ["manual", "wakatime"]});
    const resolved = vs.resolveViewScope(scope, {
        today: "2026-09-24",
        knownItemIds: ["item-1"],
        knownGroups: ["工作"],
        knownSources: ["manual"],
    });
    assert.deepEqual(resolved.missingItemIds, ["ghost-item"]);
    assert.deepEqual(resolved.missingGroups, ["已删分组"]);
    assert.deepEqual(resolved.missingSources, ["wakatime"]);
}

/* —— 5. 描述词元：报告头部声明所需最小事实 —— */
{
    const {scope} = vs.normalizeViewScope({version: 1, range: {kind: "relative-days", days: 30}, sources: ["manual"], status: "completed"});
    const resolved = vs.resolveViewScope(scope, {today: "2026-09-24", knownItemIds: [], knownGroups: [], knownSources: ["manual"]});
    const described = vs.describeViewScope(scope, resolved);
    assert.deepEqual(described, {rangeToken: "relative-days", days: 30, status: "completed", filterCount: 1, missingCount: 0, truncated: false});
}

/* —— 6. 消费守门：报告范围行 + index 传参 + i18n 双语 —— */
const reportSource = fs.readFileSync(path.join(root, "src", "features", "report.ts"), "utf8");
assert.match(reportSource, /viewScope\?: ViewScopeDescription/, "报告 options 必须接受 viewScope 描述");
assert.match(reportSource, /report\.scopeLabel/, "报告必须渲染统计范围行");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /describeViewScope\(scopeNormalization\.scope, scopeResolution\)/, "index 必须构建范围描述");
assert.match(indexSource, /resolveViewScope\(scopeNormalization\.scope,/, "index 必须解析范围（含缺失条件）");
for (const key of ["report.scopeLabel", "report.scopeRelativeDays", "report.scopeAll", "report.scopeFilters", "report.scopeMissing", "report.scopeTruncated"]) {
    const occurrences = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8").split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 7. 纯度：仅依赖 date-keys，无时钟读取 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "view-scope.ts"), "utf8");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");
const imports = moduleSource.match(/^import[^;]+;/gm) || [];
assert.deepEqual(imports.filter((line) => !line.startsWith("import type")), ['import {addDays} from "../date-keys";'], "运行时依赖仅限 date-keys（单一日期实现）");

console.log("view-scope tests passed: 归一化/版本 fail-closed/相对日期解析/缺失条件/描述词元/消费守门/纯度 全部通过");
