/* T-1430 · R-A10 本地隐私与控制中心测试：导出敏感字段审计（备注/图片/头像/幂等身份）、
   来源断开保留规则（事实保留/身份保留/重连口径）、控制面汇总（文档写入+外部来源+零遥测）、
   确定性与纯度；外加导出与断开两条消费链的接线守门、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-privacy-scope-"));
fs.writeFileSync(path.join(dir, "privacy-scope.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "privacy-scope.ts"), "utf8"), {compilerOptions}).outputText);
const ps = require(path.join(dir, "privacy-scope.js"));

const event = (overrides = {}) => ({itemId: "i1", source: "manual", ...overrides});

/* —— 1. 导出敏感字段审计：备注/图片/幂等身份计数，空字段不计 —— */
{
    const store = {events: [
        event({note: "晨跑后状态很好", attachment: "data:image/png;base64,AAA"}),
        event({note: "  "}),
        event({externalRef: "sireader:i1:2026-09-20"}),
        event(),
    ], items: [{id: "i1"}]};
    const audit = ps.auditExportSensitiveFields(store);
    assert.deepEqual(audit, {notes: 1, attachments: 1, avatarImages: 0, externalRefs: 1});
    assert.equal(ps.hasSensitiveContent(audit), true);
    assert.equal(ps.hasSensitiveContent(ps.auditExportSensitiveFields({events: [event()]})), false, "无敏感内容不打扰用户");
    /* 缺省 items/events 安全。 */
    assert.deepEqual(ps.auditExportSensitiveFields({}), {notes: 0, attachments: 0, avatarImages: 0, externalRefs: 0});
}

/* —— 2. 头像照片计数由调用方显式传入（偏好字段，非项目字段） —— */
{
    const audit = ps.auditExportSensitiveFields({events: []}, 1);
    assert.equal(audit.avatarImages, 1);
}

/* —— 3. 来源断开保留规则：事实事件与幂等身份全部保留 —— */
{
    const events = [
        event({source: "sireader", externalRef: "sireader:i1:2026-09-20"}),
        event({source: "sireader", externalRef: "sireader:i1:2026-09-21"}),
        event({source: "sireader"}),
        event({source: "manual"}),
    ];
    const plan = ps.planSourceDisconnect("sireader", events);
    assert.equal(plan.retainedEvents, 3, "断开不删除已落盘事件");
    assert.equal(plan.retainedIdentities, 2, "幂等身份保留");
    assert.equal(plan.reconnectIdempotency, "externalRef", "重连经 externalRef 防重复累计");
    const manual = ps.planSourceDisconnect("manual", events);
    assert.equal(manual.retainedEvents, 1);
    assert.equal(manual.reconnectIdempotency, "none", "无幂等身份的来源如实声明");
}

/* —— 4. 控制面汇总：文档写入/外部来源/零遥测 —— */
{
    const summary = ps.summarizePrivacyControlPlane({
        diaryReport: {enabled: true, docId: "20260924-doc"},
        sireaderIntegration: {enabled: true},
        siplayerIntegration: {enabled: false},
        healthInbox: {enabled: true},
    });
    assert.equal(summary.telemetry, "none", "零遥测是常量声明");
    const diary = summary.entries.find((e) => e.channel === "diary-report");
    assert.equal(diary.enabled, true);
    assert.equal(diary.target, "20260924-doc");
    assert.equal(summary.entries.find((e) => e.channel === "siplayer").enabled, false);
    const docWrites = summary.entries.filter((e) => e.kind === "doc-write");
    assert.equal(docWrites.length, 2);
    /* 空配置：全部回落关闭。 */
    const empty = ps.summarizePrivacyControlPlane({});
    assert.equal(empty.entries.every((e) => !e.enabled), true, "空配置全部回落关闭");
}

/* —— 5. 确定性 + 纯度 —— */
{
    const store = {events: [event({note: "x", attachment: "data:image/png;base64,AAA", externalRef: "sireader:i1:2026-09-20"})]};
    assert.deepEqual(ps.auditExportSensitiveFields(store), ps.auditExportSensitiveFields(store));
}
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "privacy-scope.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "隐私模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

/* —— 6. 接线守门：导出审计 + 断开披露 + i18n 双语 —— */
const pluginOpsSource = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
assert.match(pluginOpsSource, /auditExportSensitiveFields\(cloned\)/, "导出必须先审计敏感字段");
assert.match(pluginOpsSource, /hasSensitiveContent\(audit\)/, "有敏感内容才提示（零值不打扰）");
assert.match(pluginOpsSource, /msg\.exportSensitiveAudit/, "审计结果必须以 toast 披露");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /planSourceDisconnect\("sireader", this\.store\.events\)/, "思阅断开必须披露保留规则");
assert.match(indexSource, /planSourceDisconnect\("siplayer", this\.store\.events\)/, "思播断开必须披露保留规则");
assert.match(indexSource, /planSourceDisconnect\("health", this\.store\.events\)/, "健康断开必须披露保留规则");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["msg.exportSensitiveAudit", "msg.sourceDisconnectRetained"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

console.log("privacy-scope tests passed: 敏感字段审计/断开保留规则/控制面汇总/零遥测/确定性/接线守门/纯度 全部通过");
