/* T-1362 智能体审计导出守门：版本化诊断序列化（统计+归一化审计）、设置页入口、
   统一安全导出通道、宿主接线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-agent-audit-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/types.ts", "src/i18n.ts", "src/features/schedule-validate.ts", "src/features/project-draft.ts", "src/agent-suggestions.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {serializeSuggestionAuditExport, normalizeSuggestionAudits} = require(path.join(outputRoot, "src/agent-suggestions.js"));

const envelope = {id: "sug-1", title: "提高阅读优先级", status: "confirmed", createdAt: "2026-09-21T08:00:00.000Z", changes: [{itemId: "i1", field: "priority", before: "medium", after: "high", reason: "r"}], requiresConfirmation: true, reason: "r", confirmedAt: "2026-09-21T09:00:00.000Z"};
const audits = normalizeSuggestionAudits([
    {suggestionId: "sug-1", action: "created", at: "2026-09-21T08:00:00.000Z"},
    {suggestionId: "sug-1", action: "confirmed", at: "2026-09-21T09:00:00.000Z"},
    {suggestionId: "sug-1", action: "applied", at: "2026-09-21T09:00:05.000Z", applied: 1, skipped: 0},
]);
const exported = JSON.parse(serializeSuggestionAuditExport(envelope, audits, "2026-09-21T10:00:00.000Z"));
assert.equal(exported.version, 1, "export carries a version");
assert.equal(exported.exportedAt, "2026-09-21T10:00:00.000Z");
assert.equal(exported.suggestion.id, "sug-1");
assert.equal(exported.suggestion.status, "confirmed");
assert.equal(exported.suggestion.changes, 1);
assert.deepEqual(exported.stats, {created: 1, confirmed: 1, cancelled: 0, applied: 1, rejected: 0}, "stats must summarize every action");
assert.equal(exported.audits.length, 3);
/* 审计不得包含令牌等敏感材料：导出中不出现 token/nonce 字段。 */
assert.ok(!JSON.stringify(exported).includes("token") && !JSON.stringify(exported).includes("nonce"), "export must not leak decision tokens");
const fallbackTime = JSON.parse(serializeSuggestionAuditExport(envelope, audits, "not-a-date"));
assert.ok(!Number.isNaN(Date.parse(fallbackTime.exportedAt)), "invalid exportedAt falls back to now");

/* ---------- 结构守门 ---------- */

const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const pluginOps = fs.readFileSync("src/plugin-ops.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");

assert.match(settings, /data-action="export-agent-audit"/, "settings must expose the audit export entry");
assert.match(settings, /ctx\.suggestionWorkflowAudits \? "" : "disabled"/, "export stays disabled without audit records");
assert.match(pluginOps, /export function downloadSuggestionAuditFor/, "plugin-ops must expose the download helper");
assert.match(pluginOps, /serializeSuggestionAuditExport\(envelope, audits\)/, "download must serialize via the versioned exporter");
assert.match(pluginOps, /siyuan-checkin-agent-audit-/, "export filename must be namespaced");
assert.match(indexSource, /suggestionWorkflowAudits: this\.suggestionWorkflow\?\.audits\.length \|\| 0/, "settings context must carry the audit count");
assert.match(indexSource, /downloadSuggestionAuditFor\(this\.suggestionWorkflow\.envelope, this\.suggestionWorkflow\.audits\)/, "host must wire the export action");

const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["set.agentAuditTitle", "set.agentAuditHint", "set.agentAuditCount", "set.agentAuditExport"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("agent audit export gates passed: versioned serializer, stats, no token leakage, settings entry, safe download channel");
