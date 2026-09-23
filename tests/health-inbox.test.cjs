/* T-1403 健康收件箱守门：行解析严格性、身份格式、摄取计划幂等、偏好归一（opt-in 默认关）、
   registry 前缀、宿主轮询接线、设置结构与 i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-health-inbox-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/features/reminder-preferences.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts", "src/features/health-inbox.ts"].forEach(transpile);
const inbox = require(path.join(outputRoot, "src/features/health-inbox.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));

/* 行解析：合法步数/体重（含小数）、坏行 fail-closed。 */
assert.deepEqual(inbox.parseHealthInboxLine("health:steps:2026-09-23 8432"), {metric: "steps", localDate: "2026-09-23", value: 8432});
assert.deepEqual(inbox.parseHealthInboxLine("  health:weight:2026-09-23 72.5  "), {metric: "weight", localDate: "2026-09-23", value: 72.5});
assert.equal(inbox.parseHealthInboxLine("- 2026-09-23 随手记"), undefined, "user prose must not parse");
assert.equal(inbox.parseHealthInboxLine("health:sleep:2026-09-23 8"), undefined, "unknown metric rejected");
assert.equal(inbox.parseHealthInboxLine("health:steps:2026/09/23 100"), undefined, "bad date rejected");
assert.equal(inbox.parseHealthInboxLine("health:steps:2026-09-23 -5"), undefined, "negative value rejected");
assert.equal(inbox.parseHealthInboxLine("health:steps:2026-09-23"), undefined, "missing value rejected");
assert.equal(inbox.parseHealthInboxLine(undefined), undefined, "non-string rejected");

/* 行序去重：同 metric+日期 取首条；行数有界。 */
const rows = [{content: "health:steps:2026-09-23 100"}, {content: "health:steps:2026-09-23 200"}, {content: "health:weight:2026-09-23 72.5"}];
const entries = inbox.parseHealthInboxRows(rows);
assert.equal(entries.length, 2, "duplicate identities dedupe to the first row");
assert.equal(entries[0].value, 100, "first occurrence wins");

/* 摄取去重：已写入身份（项目×指标×日期）跳过（宿主 writeHealthIngest 同逻辑内联）。 */
const written = new Set(["health:walk:steps:2026-09-23"]);
const pending = entries.filter((entry) => !written.has("health:walk:" + entry.metric + ":" + entry.localDate));
assert.equal(pending.length, 1, "only unwritten entries stay pending");
assert.equal(pending[0].metric, "weight");

/* 偏好归一：默认关；enabled 无合法 docId 不物化。 */
assert.deepEqual(normalizeViewPreferences({}).healthInbox, {enabled: false, docId: "", stepsItemId: "", weightItemId: ""});
assert.equal(normalizeViewPreferences({healthInbox: {enabled: true, docId: "short"}}).healthInbox.enabled, false);
assert.deepEqual(normalizeViewPreferences({healthInbox: {enabled: true, docId: "20260101120000-abcdef1234", stepsItemId: "walk"}}).healthInbox, {enabled: true, docId: "20260101120000-abcdef1234", stepsItemId: "walk", weightItemId: ""});

/* 注册表：health 前缀登记（运行时解析由 external-ref 套件覆盖）；行身份为严格三段式。 */
assert.match(fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8"), /prefix: "health"/, "health prefix must be registered");
/* 身份在写回时按 项目×指标×日期 组装（健康:<itemId>:<指标>:<日期>）。 */
assert.equal(inbox.parseHealthInboxRows([{content: "health:steps:2026-09-23 100"}])[0].externalRef, undefined, "parse no longer carries identity; the host composes it per bound item");

/* 宿主接线：轮询定时器、SQL 收件箱查询、api 来源写入、设置结构与偏好持久化。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.ok(indexSource.includes("HEALTH_INGEST_INTERVAL_MS"), "polling interval must come from the feature module");
assert.ok(indexSource.includes("content LIKE 'health:%'"), "inbox query must scope to the bound document and health lines");
assert.ok(indexSource.includes('source: "api", externalRef'), "health writes must use the public api source with the composed identity");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
for (const hook of ["data-health-inbox", "data-health-toggle", "data-health-doc", "save-health-doc", "data-health-steps-item", "data-health-weight-item"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}

/* i18n 双语。 */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["set.healthTitle", "set.healthHint", "set.healthToggle", "set.healthDoc", "set.healthDocHint", "set.healthDocPending", "set.healthSave", "set.healthStepsItem", "set.healthWeightItem", "set.healthItemHint", "set.healthItemChoose", "msg.healthNeedDoc", "msg.healthDocSaved", "msg.healthDocInvalid"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

/* 接入文档与评估卡修正注记存在。 */
const integrationDoc = fs.readFileSync(path.join(__dirname, "..", "docs/health-shortcuts-integration.md"), "utf8");
assert.ok(integrationDoc.includes("health:steps:") && integrationDoc.includes("appendBlock") && integrationDoc.includes("Token"), "integration guide must document the line format, kernel appendBlock call and token auth");
const evaluationDoc = fs.readFileSync(path.join(__dirname, "..", "docs/external-source-evaluation-2026-09.md"), "utf8");
assert.ok(evaluationDoc.includes("收件箱文档中转"), "evaluation card 4 must carry the zero-code correction note");

console.log("health inbox gates passed: strict parsing, row dedupe, ingest plan, preference opt-in, registry, polling wiring, settings, i18n parity, docs");
