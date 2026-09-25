/* T-1434 · R-A5 来源 mock 生命周期矩阵——思阅/思播/健康三来源统一四阶段场景：
   A 正常接入（片段→当日结算） / B 跨日切段（接入层预切，来源各自归属单日） /
   C 重复幂等（同身份重放与 alreadyCountedRefs 防双计） / D 宿主缺失与异常
   （非法片段/超限批 fail-closed，不抛异常）。身份前缀与 contract kit 清单对齐。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-source-matrix-"));
const load = (relative, outName) => {
    const target = path.join(dir, outName);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const framework = load("features/source-framework.ts", "source-framework.js");
const sireader = load("features/sireader-adapter.ts", "sireader-adapter.js");
const siplayer = load("features/siplayer-adapter.ts", "siplayer-adapter.js");
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.writeFileSync(path.join(dir, "features", "note-anchor.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "note-anchor.ts"), "utf8"), {compilerOptions}).outputText);
fs.writeFileSync(path.join(dir, "date-keys.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "date-keys.ts"), "utf8"), {compilerOptions}).outputText);
const health = load("features/health-inbox.ts", "features/health-inbox.js");

const governance = framework.normalizeSourceGovernance({enabled: true, thresholdValue: 0, dailyCapValue: 0, itemIds: ["item-1"]});
assert.equal(governance.enabled, true);

/* 三来源的身份构造器与前缀（与 ecosystem EXTERNAL_REF_PREFIX_REGISTRY 对齐）。 */
const SOURCES = [
    {key: "sireader", ref: (localDate) => sireader.buildSireaderExternalRef("item-1", localDate)},
    {key: "siplayer", ref: (localDate) => siplayer.buildSiplayerExternalRef("item-1", localDate)},
    {key: "health", ref: (localDate) => health.buildHealthExternalRef("item-1", "steps", localDate)},
];

for (const source of SOURCES) {
    /* —— A 正常接入：三个不同日期的片段 → 三日结算，升序、达标 —— */
    {
        const segments = [
            {externalRef: source.ref("2026-09-20"), localDate: "2026-09-20", value: 15},
            {externalRef: source.ref("2026-09-21"), localDate: "2026-09-21", value: 20},
            {externalRef: source.ref("2026-09-22"), localDate: "2026-09-22", value: 25},
        ];
        const result = framework.settleSegmentsToDays(segments, governance, []);
        assert.equal(result.days.length, 3, `${source.key}: 三日结算`);
        assert.deepEqual(result.days.map((day) => day.localDate), ["2026-09-20", "2026-09-21", "2026-09-22"], `${source.key}: 升序`);
        assert.equal(result.invalidSegmentCount, 0);
        assert.equal(result.appliedRefs.length, 3);
        for (const day of result.days) assert.equal(day.qualifies, true, `${source.key}: 达标`);
    }

    /* —— B 跨日切段：接入层已按 localDate 预切，一段一日；结算不合并不同日 —— */
    {
        const segments = [
            {externalRef: source.ref("2026-09-22"), localDate: "2026-09-22", value: 30},
            {externalRef: source.ref("2026-09-23"), localDate: "2026-09-23", value: 40},
        ];
        const result = framework.settleSegmentsToDays(segments, governance, []);
        assert.deepEqual(result.days.map((day) => day.localDate), ["2026-09-22", "2026-09-23"], `${source.key}: 跨日切段各自独立成日`);
    }

    /* —— C 重复幂等：批内重复 + 已结算身份重放，均不双计 —— */
    {
        const segments = [
            {externalRef: source.ref("2026-09-20"), localDate: "2026-09-20", value: 15},
            {externalRef: source.ref("2026-09-20"), localDate: "2026-09-20", value: 15},
        ];
        const inBatch = framework.settleSegmentsToDays(segments, governance, []);
        assert.equal(inBatch.appliedRefs.length, 1, `${source.key}: 批内重复去重`);
        assert.equal(inBatch.duplicateRefs.length, 1);
        const replay = framework.settleSegmentsToDays(segments, governance, [source.ref("2026-09-20")]);
        assert.equal(replay.appliedRefs.length, 0, `${source.key}: 已结算身份重放不计入`);
        assert.equal(replay.duplicateRefs.length, 2);
        assert.equal(replay.days.length, 0, `${source.key}: 重放不产生新日`);
    }

    /* —— D 宿主缺失/异常：非法片段 fail-closed 计数，不抛异常 —— */
    {
        const badSegments = [
            {},
            {externalRef: source.ref("2026-09-20"), localDate: "not-a-date", value: 5},
            {externalRef: source.ref("2026-09-20"), localDate: "2026-09-20", value: -1},
            {externalRef: "", localDate: "2026-09-20", value: 1},
        ];
        const result = framework.settleSegmentsToDays(badSegments, governance, []);
        assert.equal(result.appliedRefs.length, 0, `${source.key}: 全部非法片段不计入`);
        assert.equal(result.invalidSegmentCount, badSegments.length, `${source.key}: 非法计数如实`);
    }
}

/* —— 超限批：整批拒绝并计数（SOURCE_FRAMEWORK_LIMITS.maxSegments = 5000） —— */
{
    const oversized = Array.from({length: 5001}, (_, i) => ({externalRef: `sireader:bulk:${i}`, localDate: "2026-09-20", value: 1}));
    const result = framework.settleSegmentsToDays(oversized, governance, []);
    assert.equal(result.days.length, 0, "超限批整批拒绝");
    assert.equal(result.invalidSegmentCount, 5001);
}

/* —— 健康收件箱行解析：合法行/非法指标/负值/非字符串 —— */
{
    const okLine = health.parseHealthInboxLine("health:steps:2026-09-24 8000");
    assert.equal(okLine.metric, "steps");
    assert.equal(okLine.localDate, "2026-09-24");
    assert.equal(okLine.value, 8000);
    assert.equal(health.parseHealthInboxLine("health:steps:2026-9-24 100"), undefined, "形状非法日期拒绝（日历级校验归下游结算）");
    assert.equal(health.parseHealthInboxLine("health:heartrate:2026-09-24 60"), undefined, "未登记指标拒绝");
    assert.equal(health.parseHealthInboxLine("health:steps:2026-09-24 -5"), undefined, "负值拒绝");
    assert.equal(health.parseHealthInboxLine(42), undefined, "非字符串拒绝");
}

/* —— 契约对齐：externalRefPrefixes 清单覆盖全部已注册身份前缀 —— */
const kitManifest = JSON.parse(fs.readFileSync(path.join(root, "contracts", "siyuan-checkin-contract", "manifest.json"), "utf8"));
const declaredPrefixes = kitManifest.externalRefPrefixes.map((entry) => entry.prefix);
for (const prefix of ["docktomato:", "taskhorizon:", "obsidian21:", "sireader:", "siplayer:", "health:"]) {
    assert.ok(declaredPrefixes.includes(prefix), `契约前缀清单必须包含 ${prefix}`);
}
const repoDocsManifest = JSON.parse(fs.readFileSync(path.join(root, "docs", "contracts", "checkin-api-v5.json"), "utf8"));
assert.deepEqual(kitManifest.externalRefPrefixes, repoDocsManifest.externalRefPrefixes, "契约两份前缀清单一致");

console.log("source-lifecycle-matrix tests passed: 思阅/思播/健康 × 正常接入/跨日切段/重复幂等/异常 fail-closed + 超限批 + 健康行解析 + 契约前缀对齐 全部通过");
