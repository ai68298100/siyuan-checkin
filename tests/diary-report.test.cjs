/* T-1352 日记集成守门：偏好归一（opt-in 默认关、docId 校验）、设置页结构、
   写入路径复用锚点通道（有界重试 + 审计）与报告单一路径。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-diary-report-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/lunar.ts", "src/occasions.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/features/weread-adapter.ts", "src/features/yeguif-adapter.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/features/weekly-review.ts", "src/view-preferences.ts", "src/features/note-query.ts", "src/features/diary-search.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {normalizeDocumentSearchResponse, toDocumentChoiceRows} = require(path.join(outputRoot, "src/features/diary-search.js"));

/* 偏好归一：默认关；docId 走块 ID 校验；enabled 无合法 docId 不物化。 */
assert.deepEqual(normalizeViewPreferences({}).diaryReport, {enabled: false, docId: ""}, "diary integration defaults to off");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: ""}}).diaryReport.enabled, false, "enabled without a doc id must not materialize");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: "short"}}).diaryReport.enabled, false, "enabled with an invalid doc id must not materialize");
assert.deepEqual(normalizeViewPreferences({diaryReport: {enabled: true, docId: "20260101120000-abcdef1234"}}).diaryReport, {enabled: true, docId: "20260101120000-abcdef1234"});
assert.equal(normalizeViewPreferences({diaryReport: {enabled: false, docId: "20260101120000-abcdef1234"}}).diaryReport.enabled, false, "saved doc keeps enabled=false until the user opts in");
assert.equal(normalizeViewPreferences({diaryReport: "bogus"}).diaryReport.docId, "", "non-object payload falls back to off");

/* T-1616：搜索响应归一与候选行投影（纯函数）；异步防抖/过期代际/IME 由宿主接线的请求代际模式负责。 */
const legacyWrapped = normalizeDocumentSearchResponse({blocks: [{id: "20260101120000-wrapped", hPath: "Wrapped"}]});
assert.equal(legacyWrapped.length, 1, "legacy wrapped responses must be unwrapped");
assert.deepEqual(normalizeDocumentSearchResponse([]), [], "array responses pass through");
assert.deepEqual(normalizeDocumentSearchResponse(undefined), [], "missing payloads normalize to empty");
const choiceRows = toDocumentChoiceRows(Array.from({length: 55}, (_, index) => ({id: "20260101120000-" + String(index).padStart(10, "0"), content: "Doc " + index, hPath: "Path " + index})));
assert.equal(choiceRows.length, 50, "choice rows stay capped at 50");
assert.equal(choiceRows[0].name, "Doc 0", "document content becomes the row name");
assert.equal(choiceRows[0].path, "Path 0", "hpath becomes the row path");
const deduped = toDocumentChoiceRows([{id: "dup", content: "first"}, {id: "dup", content: "second"}, {id: "noname"}]);
assert.equal(deduped.length, 2, "duplicate ids are deduplicated");
assert.equal(deduped[1].name, "noname", "missing content falls back to the block id");

/* ---------- 结构守门 ---------- */

const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const diarySearchSource = fs.readFileSync("src/features/diary-search.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");
const compatibility = fs.readFileSync("docs/siyuan-compatibility.md", "utf8");

assert.match(settings, /data-diary-integration/, "settings must mark the diary integration group");
/* T-1552：手动报告的启用开关是假门槛（不存在自动路径），已退役；
   写入仅由目标 docId 闸，存储字段 enabled 仅为兼容保留。 */
assert.ok(!settings.includes("data-diary-toggle"), "diary toggle must stay retired (manual write needs no on/off gate)");
assert.match(settings, /data-action="write-diary-report" \$\{diary\.docId \? "" : "disabled"\}/, "write-now is gated by the target doc only");
assert.match(settings, /writeTriggerRow\("diary"/, "diary card declares its trigger explicitly");
assert.match(settings, /writeResultRow\("diary", "diary-report"\)/, "diary card surfaces the latest write outcome");
assert.match(settings, /data-diary-doc/, "doc id input must exist");
assert.match(settings, /data-choice-search="\$\{point\}"/, "unified document search exposes a per-point search input");
assert.match(settings, /documentChoiceBlock\("diary"/, "diary card exposes the unified document search (T-1616)");
assert.match(settings, /documentChoiceBlock\("summary"/, "summary card exposes the unified document search");
assert.match(settings, /documentChoiceBlock\("health"/, "health card exposes the unified document search");
assert.doesNotMatch(settings, /data-diary-search|data-diary-choice/, "the old dual search/select boxes must stay retired (T-1616)");
assert.match(settings, /data-diary-notebook/, "new diary documents must let the user choose an open notebook");
assert.match(settings, /data-action="save-diary-doc"/, "doc id save action must exist");
assert.match(settings, /data-action="write-diary-report"/, "manual write action must exist");

assert.match(indexSource, /diaryReport = \{\.\.\.DEFAULT_VIEW_PREFERENCES\.diaryReport\};/, "plugin keeps diary state");
assert.match(indexSource, /this\.diaryReport = \{\.\.\.preferences\.diaryReport\};/, "applyViewPreferences restores diary prefs");
assert.match(indexSource, /diaryReport: \{\.\.\.this\.diaryReport\}/, "persistViewPreferences saves diary prefs");
assert.match(indexSource, /async writeDiaryReport\(\): Promise<void>/, "host implements the manual write");
assert.match(indexSource, /appendAnchorNote\(\(url, payload\) => this\.kernelPost\(url, payload\), docId, markdown\)/, "write must reuse the anchor append channel (/api/block/appendBlock)");
assert.match(indexSource, /withBoundedRetry\(\s*\(\) => appendAnchorNote/, "write must be wrapped in the bounded retry");
assert.match(indexSource, /type: "anchor", at: new Date\(\)\.toISOString\(\), details: \{channel: "diary-report"/, "write outcome must land in the audit ledger");
assert.match(indexSource, /if \(!docId\) \{\s*showMessage\(t\("msg\.diaryNotBound"\)\)/, "write must refuse when not bound/enabled");
assert.match(indexSource, /buildWeeklyReportMarkdown\(summary, title, this\.reportSections, comparison, \{\.\.\.sourceOptions, viewScope, contextAggregation, contextWeekdayPatterns, stalledItems, missedByWeekday, missedByTimeSlot, targetLoad, correlationInsights\}\)/, "diary report must reuse the exact review export path (incl. T-1425 scope + T-1433 context + T-1452 weekday cross + T-1436 miss-time + stalled + T-1450 target-load + R-17.1 correlation)");
assert.ok(!indexSource.includes("data-diary-toggle"), "toggle binding must stay retired");
assert.match(indexSource, /const docId = this\.diaryReport\.docId;/, "write reads the target doc directly (enabled flag no longer gates)");
assert.match(indexSource, /bindVerifiedDocumentSave\("save-diary-doc", "data-diary-doc"/, "doc save uses the shared verified binding");
assert.match(indexSource, /bindVerifiedDocumentSave\("save-diary-doc"/, "diary document save uses the verified target path");
assert.match(indexSource, /validateBindingTarget\("doc", submitted\)/, "doc ids must be validated against the live document index");
assert.match(indexSource, /msg\.diaryTitleRequired/, "empty new-document titles must produce visible feedback");
assert.match(indexSource, /msg\.diaryNoNotebook/, "missing open notebooks must have a distinct failure message");
assert.match(indexSource, /msg\.diaryCreateFailed/, "document creation failures must not be reported as invalid IDs");
assert.match(indexSource, /msg\.diarySaveFailed/, "preference persistence failures must be distinguished from host creation failures");
assert.match(indexSource, /diaryNotebookRequest/, "stale notebook responses must not populate a replaced settings surface");
assert.match(indexSource, /bindDocumentTargetPickerFor/, "settings must use the shared guarded document picker");
assert.match(indexSource, /searchBindingDocuments/, "document picker must use the host search route");
/* T-1616：路由契约迁移到宿主 searchBindingDocuments；纯模块守归一与投影。 */
assert.match(indexSource, /\/api\/filetree\/searchDocs/, "document search must use the documented host route");
assert.match(indexSource, /k: query\.trim\(\), flashcard: false, excludeIDs: \[\]/, "search payload must remain bounded to the route contract");
assert.match(diarySearchSource, /Array\.isArray\(data\)/, "document search must read the v3.8.4 array response");
assert.match(diarySearchSource, /blocks\?: DiarySearchBlock\[\]/, "document search may tolerate legacy wrapped responses");
assert.match(diarySearchSource, /rows\.length >= 50/, "document search must cap projected results");

/* 兼容边界必须和实现同步：searchDocs 是宿主路由增强，不冒充插件公开 API。 */
assert.match(compatibility, /`POST \/api\/filetree\/searchDocs`/, "compatibility docs must register the diary search route");
assert.match(compatibility, /flashcard: false/, "compatibility docs must record the search payload");
assert.match(compatibility, /成功响应的 `data` 数组/, "compatibility docs must record the v3.8.4 response shape");
assert.match(compatibility, /最多显示前 50 条/, "compatibility docs must record the result cap");
assert.match(compatibility, /msg\.diarySearchFailed/, "compatibility docs must describe the failed-search fallback");
assert.match(compatibility, /宿主路由兼容增强/, "compatibility docs must distinguish host-route compatibility from plugin API");
assert.match(compatibility, /内核认证保护/, "compatibility docs must record the host authentication boundary");
assert.doesNotMatch(compatibility, /选择\/搜索」默认只投影插件已经保存的绑定/, "compatibility docs must not claim all search is limited to saved bindings");

/* 双语文案齐备。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["set.diaryTitle", "set.diaryHint", "set.writeTriggerTitle", "set.writeTriggerManual", "set.writeResultTitle", "set.writeResultOk", "set.writeResultFail", "set.writeResultNone", "set.diaryDoc", "set.diaryDocHint", "set.diarySave", "set.diaryWriteNow", "set.diaryNotebook", "set.diaryNotebookLoading", "set.diaryNotebookChoose", "set.diaryNotebookFailed", "msg.diaryWritten", "msg.diaryWriteFailed", "msg.diaryNotBound", "msg.diaryDocInvalid", "msg.diaryTitleRequired", "msg.diaryNoNotebook", "msg.diaryCreateFailed", "msg.diarySaveFailed", "msg.diarySearchFailed"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

/* DECISIONS：撤销策略必须先于交付落盘（D-241）。 */
const decisions = fs.readFileSync("DECISIONS.md", "utf8");
assert.match(decisions, /## D-241：日记集成撤销与幂等策略/, "undo/idempotency strategy must be recorded as D-241");
assert.match(decisions, /不删除已写入的报告/, "undo policy must state reports are user content");

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("diary integration gates passed: opt-in default off, doc validation, unified document choice, D-241 recorded");
