/* T-1383 来源统筹框架守门：描述符归一、治理配置 opt-in 默认关、结算层幂等/阈值/封顶/
   跨日预切分契约、fail-closed 边界与确定性；接入层适配器（T-1384+）以此为验收基线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-source-framework-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/features/source-framework.ts"].forEach(transpile);
const framework = require(path.join(outputRoot, "src/features/source-framework.js"));

/* 描述符：key 即 externalRef 前缀，前缀级校验 fail-closed。 */
assert.equal(framework.normalizeSourceDescriptor(undefined), undefined);
assert.equal(framework.normalizeSourceDescriptor("sireader"), undefined);
assert.equal(framework.normalizeSourceDescriptor({key: "Bad_Key", name: "x", channel: "plugin-event"}), undefined, "uppercase/underscore keys rejected");
assert.equal(framework.normalizeSourceDescriptor({key: "s", name: "x", channel: "plugin-event"}), undefined, "single-char key rejected (must fit prefix:identity:date)");
assert.equal(framework.normalizeSourceDescriptor({key: "sireader", name: "x", channel: "carrier-pigeon"}), undefined, "unknown channel rejected");
const descriptor = framework.normalizeSourceDescriptor({key: "sireader", name: " 思阅 ", channel: "plugin-event", status: "experimental", capabilities: ["reading-lifecycle", "reading-lifecycle", 42], privacy: "local-only"});
assert.deepEqual(descriptor, {key: "sireader", name: "思阅", channel: "plugin-event", status: "experimental", privacy: "local-only", capabilities: ["reading-lifecycle"]}, "descriptor normalizes name, dedupes capabilities, defaults status");
assert.deepEqual(framework.normalizeSourceDescriptor({key: "health-push", name: "健康中心", channel: "api-push"}).status, "planned", "status defaults to planned");
assert.equal(framework.normalizeSourceDescriptor({key: "weread", name: "微信读书", channel: "official-pull"})?.channel, "official-pull", "T-1402 official-pull channel accepted (outbound pull of official API)");

/* 治理配置：opt-in 默认关、非负有限、映射去重封顶 16。 */
assert.deepEqual(framework.normalizeSourceGovernance(undefined), {enabled: false, thresholdValue: 0, dailyCapValue: 0, itemIds: []}, "governance defaults to off");
assert.equal(framework.normalizeSourceGovernance({enabled: true, thresholdValue: 30, dailyCapValue: 480, itemIds: ["a", "a", "b"]}).itemIds.length, 2, "item mappings dedupe");
assert.equal(framework.normalizeSourceGovernance({enabled: true, thresholdValue: -5, dailyCapValue: Number.POSITIVE_INFINITY}).thresholdValue, 0, "negative threshold falls back to 0");
assert.equal(framework.normalizeSourceGovernance({enabled: true, itemIds: Array.from({length: 20}, (_, i) => `item-${i}`)}).itemIds.length, framework.SOURCE_FRAMEWORK_LIMITS.maxItems, "item mappings bounded");

/* 结算层：阈值资格、每日封顶、localDate 升序、幂等去重。 */
const config = framework.normalizeSourceGovernance({enabled: true, thresholdValue: 30, dailyCapValue: 480});
const segments = [
    {externalRef: "sireader:doc1:2026-09-22#1", localDate: "2026-09-22", value: 20},
    {externalRef: "sireader:doc1:2026-09-22#2", localDate: "2026-09-22", value: 15},
    {externalRef: "sireader:doc2:2026-09-23#1", localDate: "2026-09-23", value: 600},
];
const settled = framework.settleSegmentsToDays(segments, config, []);
assert.deepEqual(settled.days.map((day) => day.localDate), ["2026-09-22", "2026-09-23"], "days sort by localDate ascending");
assert.equal(settled.days[0].rawValue, 35, "same-day segments aggregate raw");
assert.equal(settled.days[0].qualifies, true, "35 >= 30 qualifies");
assert.equal(settled.days[1].countedValue, 480, "daily cap clamps counted value");
assert.equal(settled.days[1].rawValue, 600, "cap never rewrites raw");
assert.equal(settled.days[1].segmentCount, 1);
assert.equal(settled.appliedRefs.length, 3, "all unique refs applied once");

/* 幂等：历史身份与批内重复都只计一次；first occurrence wins。 */
const replayed = framework.settleSegmentsToDays([...segments, segments[0]], config, ["sireader:doc1:2026-09-22#1"]);
assert.equal(replayed.days[0].rawValue, 15, "historically settled ref contributes nothing again; only the sibling segment counts");
assert.ok(replayed.duplicateRefs.includes("sireader:doc1:2026-09-22#1"), "in-batch duplicates surface in duplicateRefs");
assert.equal(replayed.appliedRefs.filter((ref) => ref === "sireader:doc1:2026-09-22#2").length, 1, "applied refs stay unique");

/* 跨日预切分是接入层契约：结算层只认单日片段；多日段不合法。 */
const invalid = framework.settleSegmentsToDays([
    {externalRef: "sireader:doc1:2026-09-22#9", localDate: "2026-09-22/23", value: 10},
    {externalRef: "sireader:doc1:2026-09-22#10", localDate: "2026-09-22", value: -3},
    {externalRef: "", localDate: "2026-09-22", value: 5},
    {externalRef: "x".repeat(513), localDate: "2026-09-22", value: 5},
    null,
], config, []);
assert.equal(invalid.days.length, 0, "batch without valid segments produces no days");
assert.equal(invalid.invalidSegmentCount, 5, "invalid segments fail closed with a count");

/* 阈值 0 = 任何非零记录达标；零值片段永不达标。 */
const zeroThreshold = framework.normalizeSourceGovernance({enabled: true});
const zeroResult = framework.settleSegmentsToDays([{externalRef: "k:p:2026-09-22#z", localDate: "2026-09-22", value: 0}], zeroThreshold, []);
assert.equal(zeroResult.days[0].qualifies, false, "zero-value segment never qualifies");

/* 批上限：超出 5000 整批拒绝；无时钟：同输入两次结算结果逐字节一致。 */
const oversized = Array.from({length: framework.SOURCE_FRAMEWORK_LIMITS.maxSegments + 1}, (_, i) => ({externalRef: `r:${i}:2026-09-22`, localDate: "2026-09-22", value: 1}));
const rejected = framework.settleSegmentsToDays(oversized, config, []);
assert.equal(rejected.days.length, 0, "oversized batch is rejected wholesale");
assert.equal(rejected.invalidSegmentCount, oversized.length, "rejection is counted, not silently dropped");
const first = framework.settleSegmentsToDays(segments, config, []);
assert.equal(JSON.stringify(first), JSON.stringify(settled), "settlement is deterministic (no clock, no iteration-order drift)");

/* 纪律断言：模块不得引入 IO/时钟（纯函数契约）。 */
const sourceText = fs.readFileSync(path.join(__dirname, "..", "src/features/source-framework.ts"), "utf8");
for (const banned of ["fetch(", "Date.now", "new Date(", "require(", "localStorage", "setTimeout"]) {
    assert.ok(!sourceText.includes(banned), `settlement layer must stay free of IO/clock: ${banned}`);
}

/* 框架文档冻结契约节存在（设计文档与实现同源）。 */
const frameworkDoc = fs.readFileSync(path.join(__dirname, "..", "docs/external-source-framework-2026-09.md"), "utf8");
assert.ok(frameworkDoc.includes("settleSegmentsToDays") && frameworkDoc.includes("normalizeSourceDescriptor"), "framework doc must reference the frozen contract");
assert.ok(frameworkDoc.includes("sireader") && frameworkDoc.includes("siplayer"), "framework doc must register the first tenant candidates");

/* ecosystem 前缀注册表是唯一身份入口：框架不另立注册表。 */
const ecosystemSource = fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8");
assert.ok(ecosystemSource.includes("EXTERNAL_REF_PREFIX_REGISTRY"), "identity layer stays in the existing externalRef registry");

console.log("source framework gates passed: descriptor, governance opt-in, settlement idempotency/threshold/cap, fail-closed bounds, purity, identity delegation");
