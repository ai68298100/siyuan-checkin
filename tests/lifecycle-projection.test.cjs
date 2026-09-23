/* T-1429 · R-A9 生命周期影响预览测试：delete/archive/restore 三动作的影响范围、
   可恢复性、外部身份保留、批量汇总、事实切片收集、确定性与纯度；外加删除确认
   接线守门与 i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-lifecycle-"));
fs.writeFileSync(path.join(dir, "lifecycle-projection.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "lifecycle-projection.ts"), "utf8"), {compilerOptions}).outputText);
const lc = require(path.join(dir, "lifecycle-projection.js"));

const facts = (overrides = {}) => ({name: "晨跑", archived: false, eventCount: 10, externalRefCount: 4, anchorCount: 2, occasionLinkCount: 1, ...overrides});

/* —— 1. delete：级联事件 + 身份保留 + 可恢复审计 —— */
{
    const impact = lc.projectLifecycleImpact(facts(), "delete");
    assert.equal(impact.affectedEvents, 10);
    assert.equal(impact.externalIdentitiesRetained, 4, "外部幂等身份保留（防重复累计）");
    assert.equal(impact.anchorsCleared, 2);
    assert.equal(impact.occasionLinksCleared, 1);
    assert.equal(impact.recoverability, "recoverable-with-audit");
    for (const code of ["tombstone-guard", "restore-point", "today-hidden", "calendar-hidden", "identities-retained"]) {
        assert.ok(impact.reasonCodes.includes(code), `delete reasonCode 缺 ${code}`);
    }
}

/* —— 2. archive：可逆开关，事件不动 —— */
{
    const impact = lc.projectLifecycleImpact(facts(), "archive");
    assert.equal(impact.affectedEvents, 0);
    assert.equal(impact.recoverability, "reversible");
    assert.ok(impact.reasonCodes.includes("events-retained"));
    assert.ok(impact.reasonCodes.includes("today-hidden"));
    assert.ok(impact.reasonCodes.includes("calendar-hidden"));
    assert.equal(impact.anchorsCleared, 0, "归档不清锚点");
}

/* —— 3. restore：可逆还原，事件不动 —— */
{
    const impact = lc.projectLifecycleImpact(facts({archived: true}), "restore");
    assert.equal(impact.affectedEvents, 0);
    assert.equal(impact.recoverability, "reversible");
    assert.ok(impact.reasonCodes.includes("today-restored") && impact.reasonCodes.includes("calendar-restored"));
}

/* —— 4. 空项目边界：零事件/零身份照常出预览 —— */
{
    const impact = lc.projectLifecycleImpact(facts({eventCount: 0, externalRefCount: 0, anchorCount: 0, occasionLinkCount: 0}), "delete");
    assert.equal(impact.affectedEvents, 0);
    assert.equal(impact.externalIdentitiesRetained, 0);
    assert.equal(impact.recoverability, "recoverable-with-audit");
}

/* —— 5. 批量汇总：各维合计 + 批量可恢复性 —— */
{
    const batch = lc.projectLifecycleBatch([facts(), facts({name: "冥想", eventCount: 3, externalRefCount: 1, anchorCount: 0, occasionLinkCount: 0})], "delete");
    assert.equal(batch.totals.items, 2);
    assert.equal(batch.totals.affectedEvents, 13);
    assert.equal(batch.totals.externalIdentitiesRetained, 5);
    assert.equal(batch.totals.anchorsCleared, 2);
    assert.equal(batch.totals.occasionLinksCleared, 1);
    assert.equal(batch.totals.recoverability, "recoverable-with-audit");
    const reversibleBatch = lc.projectLifecycleBatch([facts()], "restore");
    assert.equal(reversibleBatch.totals.recoverability, "reversible");
}

/* —— 6. collectLifecycleFacts：事实切片收集（计数 + 外部身份 + 锚点 + 联动） —— */
{
    const item = {id: "item-1", name: "晨跑", archived: false, noteAnchor: {blockId: "20260924120000-abc"}, linkedOccasionId: "occ-1"};
    const events = [
        {itemId: "item-1", externalRef: "sireader:i1:2026-09-20"},
        {itemId: "item-1"},
        {itemId: "item-1", externalRef: "health:steps:2026-09-21"},
        {itemId: "item-2"},
    ];
    const collected = lc.collectLifecycleFacts(item, events);
    assert.deepEqual(collected, {name: "晨跑", archived: false, eventCount: 3, externalRefCount: 2, anchorCount: 1, occasionLinkCount: 1});
}

/* —— 7. 确定性 + 纯度 —— */
{
    const f = facts();
    assert.deepEqual(lc.projectLifecycleImpact(f, "delete"), lc.projectLifecycleImpact(f, "delete"));
}
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "lifecycle-projection.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "投影模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 8. 接线守门：删除确认消费影响预览 + i18n 双语 —— */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /projectLifecycleImpact\(collectLifecycleFacts\(item, this\.store\.events\), "delete"\)/, "删除确认必须消费生命周期影响预览");
assert.match(indexSource, /editor\.deleteImpactExtra/, "确认文案必须包含影响补充说明");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const occurrences = i18nSource.split('"editor.deleteImpactExtra"').length - 1;
assert.ok(occurrences >= 2, `editor.deleteImpactExtra 必须中英双语齐备（当前 ${occurrences} 处）`);

console.log("lifecycle-projection tests passed: delete/archive/restore 影响/身份保留/批量汇总/事实收集/确定性/接线守门/纯度 全部通过");
