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
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/features/weekly-review.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts", "src/features/health-inbox.ts", "src/features/note-query.ts", "src/features/weread-adapter.ts", "src/features/template-linkage.ts"].forEach(transpile);
const inbox = require(path.join(outputRoot, "src/features/health-inbox.js"));
const linkage = require(path.join(outputRoot, "src/features/template-linkage.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));

/* 行解析：合法步数/体重（含小数）、坏行 fail-closed。 */
assert.deepEqual(inbox.parseHealthInboxLine("health:steps:2026-09-23 8432"), {metric: "steps", localDate: "2026-09-23", value: 8432});
assert.deepEqual(inbox.parseHealthInboxLine("  health:weight:2026-09-23 72.5  "), {metric: "weight", localDate: "2026-09-23", value: 72.5});
assert.equal(inbox.parseHealthInboxLine("- 2026-09-23 随手记"), undefined, "user prose must not parse");
assert.equal(inbox.parseHealthInboxLine("health:sleep:2026-09-23 8"), undefined, "unknown metric rejected");
assert.equal(inbox.parseHealthInboxLine("health:steps:2026/09/23 100"), undefined, "bad date rejected");
assert.equal(inbox.parseHealthInboxLine("health:steps:2026-02-30 100"), undefined, "impossible calendar date rejected");
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

/* 偏好归一：默认关；enabled 无合法 docId 不物化；T-1486 metricBindings 按项目映射 + 旧字段迁移。 */
assert.deepEqual(normalizeViewPreferences({}).healthInbox, {enabled: false, docId: "", metricBindings: [], stepsItemId: "", weightItemId: ""});
assert.equal(normalizeViewPreferences({healthInbox: {enabled: true, docId: "short"}}).healthInbox.enabled, false);
assert.equal(normalizeViewPreferences({healthInbox: {enabled: true, docId: "20260101120000-abcdef1234"}}).healthInbox.enabled, false, "a health inbox without any metric mapping stays disabled");
assert.deepEqual(normalizeViewPreferences({healthInbox: {enabled: true, docId: "20260101120000-abcdef1234", stepsItemId: "walk"}}).healthInbox, {enabled: true, docId: "20260101120000-abcdef1234", metricBindings: [{metric: "steps", itemId: "walk"}], stepsItemId: "walk", weightItemId: ""});
/* T-1486：同指标多项目挂载、去重、坏条目丢弃、镜像字段=每指标首条。 */
const multiBinding = normalizeViewPreferences({healthInbox: {enabled: true, docId: "20260101120000-abcdef1234", metricBindings: [{metric: "steps", itemId: "daily-steps"}, {metric: "steps", itemId: "weekly-steps"}, {metric: "bogus", itemId: "x"}, {metric: "weight", itemId: "daily-steps"}, {metric: "weight", itemId: "daily-steps"}]}});
assert.deepEqual(multiBinding.healthInbox.metricBindings, [{metric: "steps", itemId: "daily-steps"}, {metric: "steps", itemId: "weekly-steps"}, {metric: "weight", itemId: "daily-steps"}], "same metric may mount multiple projects; unknown metrics and duplicates are dropped");
assert.equal(multiBinding.healthInbox.stepsItemId, "daily-steps", "legacy mirror keeps the first steps binding");
assert.equal(multiBinding.healthInbox.weightItemId, "daily-steps", "legacy mirror keeps the first weight binding");
/* T-1486：addHealthMetricBinding——去重返回 undefined、追加成功、非法输入拒绝、容量封顶。 */
const basePref = {enabled: true, docId: "20260101120000-abcdef1234", metricBindings: [{metric: "steps", itemId: "daily-steps"}], stepsItemId: "daily-steps", weightItemId: ""};
assert.equal(inbox.addHealthMetricBinding(basePref, "steps", "daily-steps"), undefined, "duplicate binding is a no-op");
assert.deepEqual(inbox.addHealthMetricBinding(basePref, "steps", "weekly-steps")?.metricBindings.length, 2, "second project mounts on the same metric");
assert.equal(inbox.addHealthMetricBinding(basePref, "sleep", "x"), undefined, "unknown metric rejected");
assert.equal(inbox.addHealthMetricBinding(basePref, "steps", "  "), undefined, "empty item id rejected");
assert.equal(inbox.addHealthMetricBinding({enabled: false, docId: "", metricBindings: Array.from({length: 16}, (_, index) => ({metric: index % 2 ? "weight" : "steps", itemId: `i${index}`})), stepsItemId: "i0", weightItemId: "i1"}, "steps", "overflow"), undefined, "capacity cap at 16");

/* 注册表：health 前缀登记（运行时解析由 external-ref 套件覆盖）；行身份为严格三段式。 */
assert.match(fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8"), /prefix: "health"/, "health prefix must be registered");
/* 身份在写回时按 项目×指标×日期 组装（健康:<itemId>:<指标>:<日期>）。 */
assert.equal(inbox.parseHealthInboxRows([{content: "health:steps:2026-09-23 100"}])[0].externalRef, undefined, "parse no longer carries identity; the host composes it per bound item");

/* 宿主接线：轮询定时器、SQL 收件箱查询、api 来源写入、设置结构与偏好持久化。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.ok(indexSource.includes("HEALTH_INGEST_INTERVAL_MS"), "polling interval must come from the feature module");
assert.ok(indexSource.includes("NOTE_QUERY_INTERVAL_MS"), "note-query polling interval must come from the feature module");
assert.ok(indexSource.includes("content LIKE 'health:%'"), "inbox query must scope to the bound document and health lines");
/* T-1629：有界分页扫描——LIMIT 走 HEALTH_INBOX_MAX_ROWS 常量，游标子句由白名单助手拼接，排序保持最旧优先。 */
assert.match(indexSource, /content LIKE 'health:%'\$\{blockIdCursorClause\(cursor\)\} ORDER BY id ASC LIMIT \$\{HEALTH_INBOX_MAX_ROWS\}/, "health rows must have deterministic oldest-first order before first-row dedupe");
assert.ok(indexSource.includes('source: "api", externalRef'), "health writes must use the public api source with the composed identity");
assert.match(indexSource, /eventTombstones\.some\(\(tombstone\) => tombstone\.source === "api"[\s\S]*externalRef === externalRef\)/, "health ingest must honor deleted-identity tombstones");
assert.match(indexSource, /bindVerifiedDocumentSave\("save-health-doc"[\s\S]*ingestHealthInbox\(\)/, "saving an enabled inbox must trigger an immediate ingest");
assert.match(indexSource, /buildNoteQuerySql\(governance\)/, "note-query ingest must use the fixed SQL builder");
assert.match(indexSource, /source === "notequery"\) await this\.ingestNoteQuery\(\)/, "note-query refresh must reuse the bounded ingest path");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
assert.match(settingsSource, /data-action="refresh-source" data-source="health"/, "health source exposes a manual refresh action");
assert.match(indexSource, /source === "health"\) await this\.ingestHealthInbox\(\)/, "health refresh reuses the bounded ingest path");
for (const hook of ["data-health-inbox", "data-health-toggle", "data-health-doc", "save-health-doc", "data-health-bindings", "data-health-binding-metric", "data-health-binding-item", "data-health-binding-remove", "add-health-binding", "data-health-binding-template"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}
assert.ok(!settingsSource.includes("data-health-steps-item") && !settingsSource.includes("data-health-weight-item"), "retired single-mapping selects must not return");
for (const hook of ["data-source-panel=\"notequery\"", "data-note-query-template", "data-note-query-target", "data-note-query-item", "data-note-query-toggle", "data-action=\"save-note-query\""]) {
    assert.ok(settingsSource.includes(hook), `note-query settings markup must include ${hook}`);
}

/* —— T-1486 联动预接线模板：亲和映射、建议卡片 fail-closed、宿主接线。 —— */
assert.equal(linkage.templateLinkageForName("步数"), "health-steps", "steps template carries health affinity");
assert.equal(linkage.templateLinkageForName("体重"), "health-weight");
assert.equal(linkage.templateLinkageForName("阅读"), "sireader");
assert.equal(linkage.templateLinkageForName("问卷日记"), "journal");
assert.equal(linkage.templateLinkageForName("喝水"), undefined, "templates without affinity stay silent");
assert.equal(linkage.templateLinkageForName(" 步数 "), "health-steps", "name anchor trims");
assert.equal(linkage.templateLinkageForName(42), undefined, "non-string rejected");
const emptyState = linkage.EMPTY_LINKAGE_BINDING_STATE;
const sireaderCard = linkage.buildTemplateLinkageCard("sireader", {...emptyState, sireaderItemName: "旧阅读"});
assert.deepEqual(sireaderCard.conflictNames, ["旧阅读"], "sireader rebind must surface the existing binding");
assert.equal(linkage.buildTemplateLinkageCard("sireader", emptyState).conflictNames.length, 0);
const stepsCard = linkage.buildTemplateLinkageCard("health-steps", {...emptyState, healthStepItemNames: ["每日步数"]});
assert.deepEqual(stepsCard.relatedNames, ["每日步数"], "health cards show already-mounted projects without blocking");
assert.equal(stepsCard.actionable, true);
const journalCard = linkage.buildTemplateLinkageCard("journal", emptyState);
assert.equal(journalCard.unavailableReason, "empty", "journal suggestion degrades without presets");
assert.equal(linkage.buildTemplateLinkageCard("journal", {...emptyState, journalPresetCount: 5}).unavailableReason, undefined);
assert.equal(linkage.isTemplateLinkagePlan("health-steps") && linkage.isTemplateLinkagePlan("sireader"), true);
assert.equal(linkage.isTemplateLinkagePlan("journal"), false, "journal never becomes a persisted plan");
assert.equal(linkage.isTemplateLinkagePlan("evil"), false, "unknown plan values fail closed");
assert.equal(linkage.templateLinkageI18nKey("health-steps", "title"), "linkage.healthSteps.title");
const catalog = require(path.join(outputRoot, "src/catalog.js"));
assert.ok(catalog.CHECKIN_TEMPLATES.some((template) => template.name === "体重"), "weight template exists for health-weight affinity");
assert.ok(catalog.CHECKIN_TEMPLATES.some((template) => template.name === "问卷日记"), "journal-survey template exists for journal affinity");
const editorSource = fs.readFileSync(path.join(__dirname, "..", "src/render/editor.ts"), "utf8");
assert.match(editorSource, /data-linkage-card/, "editor renders the linkage suggestion card container");
assert.match(editorSource, /name="linkagePlan"/, "editor carries the hidden linkage plan field");
const bindEditorSource = fs.readFileSync(path.join(__dirname, "..", "src/render/bind-editor.ts"), "utf8");
assert.match(bindEditorSource, /templateLinkageForName\(template\.name\)/, "template apply resolves affinity by the zh name anchor (not the translated display name)");
assert.match(bindEditorSource, /isTemplateLinkagePlan\(kind\)/, "planned state validates against the plan whitelist");
const t1486Index = indexSource;
assert.match(t1486Index, /applyTemplateLinkagePlan\(plan, savedItemId\)/, "the plan is consumed only after the item actually saves");
assert.match(t1486Index, /linkageState\(\): LinkageBindingState/, "host projects binding names for the suggestion card");
assert.match(t1486Index, /metricBindings\.filter\(\(binding\) => binding\.metric === entry\.metric\)/, "ingest delivers each entry to every mounted project");

/* i18n 双语。 */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["set.healthTitle", "set.healthHint", "set.healthToggle", "set.healthDoc", "set.healthDocHint", "set.healthDocPending", "set.healthSave", "set.healthBindings", "set.healthBindingsHint", "set.healthMetricSteps", "set.healthMetricWeight", "set.healthAddBinding", "set.healthBindingRemove", "set.healthBindingMetric", "set.healthBindingItem", "set.healthItemHint", "set.healthItemChoose", "msg.healthNeedDoc", "msg.healthNeedMapping", "msg.healthMappingUnavailable", "msg.healthDocSaved", "msg.healthDocInvalid", "set.noteQueryIntegration", "set.stepsNoteQuery1", "set.stepsNoteQuery2", "set.stepsNoteQuery3", "set.noteQueryBoundary", "set.noteQuerySave", "set.noteQueryToggle", "msg.noteQueryNeedConfig", "msg.noteQuerySaved", "linkage.cardTitle", "linkage.healthSteps.title", "linkage.healthSteps.hint", "linkage.healthSteps.action", "linkage.healthWeight.title", "linkage.healthWeight.hint", "linkage.healthWeight.action", "linkage.sireader.title", "linkage.sireader.hint", "linkage.sireader.action", "linkage.sireader.conflict", "linkage.journal.title", "linkage.journal.hint", "linkage.journal.action", "linkage.journal.empty", "linkage.planned", "linkage.relatedNames", "msg.linkageApplied", "tpl.weight", "tpl.surveyJournal", "tplNote.weight", "tplNote.surveyJournal"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
assert.match(indexSource, /msg\.healthNeedMapping/, "health inbox must require at least one metric mapping before enabling");

/* 接入文档与评估卡修正注记存在。 */
const integrationDoc = fs.readFileSync(path.join(__dirname, "..", "docs/health-shortcuts-integration.md"), "utf8");
assert.ok(integrationDoc.includes("health:steps:") && integrationDoc.includes("appendBlock") && integrationDoc.includes("Token"), "integration guide must document the line format, kernel appendBlock call and token auth");
for (const phrase of ["官方配方 A", "官方配方 B", "失败排查", "自定义自动化场景", "host-pending", "health:sleep", "只接受以下形式"]) {
    assert.ok(integrationDoc.includes(phrase), `T-1501 integration guide must retain the ${phrase} boundary or recipe`);
}
assert.match(integrationDoc, /当前不能用任意名称扩展指标[\s\S]*严格解析器忽略/, "the recipe must not claim unsupported custom health metrics");
const releaseNotes = fs.readFileSync(path.join(__dirname, "..", "docs/releases/release-notes-18.8.0.md"), "utf8");
assert.ok(releaseNotes.includes("快捷指令配方") && releaseNotes.includes("health-shortcuts-integration.md"), "release notes must point to the T-1501 recipes");
const evaluationDoc = fs.readFileSync(path.join(__dirname, "..", "docs/external-source-evaluation-2026-09.md"), "utf8");
assert.ok(evaluationDoc.includes("收件箱文档中转"), "evaluation card 4 must carry the zero-code correction note");

console.log("health inbox gates passed: strict parsing, row dedupe, ingest plan, preference opt-in, registry, polling wiring, settings, i18n parity, docs");
