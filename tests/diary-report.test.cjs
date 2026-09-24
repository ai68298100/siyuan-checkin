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
["src/i18n.ts", "src/lunar.ts", "src/occasions.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/features/weread-adapter.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/view-preferences.ts", "src/features/diary-search.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {runDiarySearchRequest} = require(path.join(outputRoot, "src/features/diary-search.js"));

/* 偏好归一：默认关；docId 走块 ID 校验；enabled 无合法 docId 不物化。 */
assert.deepEqual(normalizeViewPreferences({}).diaryReport, {enabled: false, docId: ""}, "diary integration defaults to off");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: ""}}).diaryReport.enabled, false, "enabled without a doc id must not materialize");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: "short"}}).diaryReport.enabled, false, "enabled with an invalid doc id must not materialize");
assert.deepEqual(normalizeViewPreferences({diaryReport: {enabled: true, docId: "20260101120000-abcdef1234"}}).diaryReport, {enabled: true, docId: "20260101120000-abcdef1234"});
assert.equal(normalizeViewPreferences({diaryReport: {enabled: false, docId: "20260101120000-abcdef1234"}}).diaryReport.enabled, false, "saved doc keeps enabled=false until the user opts in");
assert.equal(normalizeViewPreferences({diaryReport: "bogus"}).diaryReport.docId, "", "non-object payload falls back to off");

/* 搜索行为：宿主错误要提示，成功数组要投影，迟到响应不能覆盖新请求。 */
const connectedSelect = {isConnected: true};
let renderedBlocks = [];
let failureCount = 0;
const searchOptions = (post, overrides = {}) => ({
    query: "日记",
    request: 1,
    isCurrent: (request) => request === 1,
    getSelect: () => connectedSelect,
    post,
    render: (_select, blocks) => { renderedBlocks = blocks; },
    onFailure: () => { failureCount += 1; },
    ...overrides,
});
const verifyDiarySearchBehavior = async () => {
    let emptyQueryPosts = 0;
    assert.equal(await runDiarySearchRequest(searchOptions(async () => {
        emptyQueryPosts += 1;
        return {code: 0, data: []};
    }, {query: ""})), "empty", "empty query must not issue a host request");
    assert.equal(emptyQueryPosts, 0, "empty query must not call searchDocs");
    const detachedSelect = {isConnected: false};
    assert.equal(await runDiarySearchRequest(searchOptions(async () => ({code: 0, data: [{id: "20260101120000-detached"}]}), {
        getSelect: () => detachedSelect,
    })), "stale", "detached select must discard a successful response");
    assert.equal(failureCount, 0, "detached successful response must not show a failure");
    assert.equal(await runDiarySearchRequest(searchOptions(async () => ({code: 1, data: []}))), "failed", "non-zero search response must fail");
    assert.equal(failureCount, 1, "non-zero search response must show one failure");
    assert.equal(await runDiarySearchRequest(searchOptions(async () => { throw new Error("host down"); })), "failed", "thrown search request must fail");
    assert.equal(failureCount, 2, "thrown search request must show one failure");
    const wrappedBlocks = [{id: "20260101120000-wrapped", hPath: "Wrapped"}];
    assert.equal(await runDiarySearchRequest(searchOptions(async () => ({code: 0, data: {blocks: wrappedBlocks}}))), "rendered", "wrapped legacy response must render");
    assert.deepEqual(renderedBlocks, wrappedBlocks, "wrapped response blocks must be projected");
    assert.equal(await runDiarySearchRequest(searchOptions(async () => ({code: 0, data: []}))), "rendered", "successful empty array must render");
    assert.deepEqual(renderedBlocks, [], "successful empty array must clear the projected results");
    const blocks = Array.from({length: 55}, (_, index) => ({id: `20260101120000-${String(index).padStart(10, "0")}`, content: `Doc ${index}`}));
    assert.equal(await runDiarySearchRequest(searchOptions(async () => ({code: 0, data: blocks}))), "rendered", "successful array response must render");
    assert.equal(renderedBlocks.length, 50, "search results must remain capped at 50");
    let resolveLateFailure;
    const lateFailureResponse = new Promise((resolve) => { resolveLateFailure = resolve; });
    let currentFailureRequest = 1;
    const lateFailurePromise = runDiarySearchRequest(searchOptions(() => lateFailureResponse, {
        isCurrent: (request) => request === currentFailureRequest,
    }));
    currentFailureRequest = 2;
    resolveLateFailure({code: 1, data: []});
    assert.equal(await lateFailurePromise, "stale", "late failed response must be ignored");
    assert.equal(failureCount, 2, "late failed response must not show a failure");
    let resolveLate;
    const lateResponse = new Promise((resolve) => { resolveLate = resolve; });
    let currentRequest = 1;
    const latePromise = runDiarySearchRequest(searchOptions(() => lateResponse, {
        isCurrent: (request) => request === currentRequest,
    }));
    currentRequest = 2;
    resolveLate({code: 0, data: [{id: "20260101120000-late"}]});
    assert.equal(await latePromise, "stale", "late search response must be ignored");
    assert.equal(renderedBlocks.length, 50, "late response must not replace current results");
};

/* ---------- 结构守门 ---------- */

const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const diarySearchSource = fs.readFileSync("src/features/diary-search.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");
const compatibility = fs.readFileSync("docs/siyuan-compatibility.md", "utf8");

assert.match(settings, /data-diary-integration/, "settings must mark the diary integration group");
assert.match(settings, /data-diary-toggle/, "opt-in toggle must exist");
assert.match(settings, /data-diary-doc/, "doc id input must exist");
assert.match(settings, /data-diary-search/, "diary settings must expose a full-document search input");
assert.match(settings, /data-diary-notebook/, "new diary documents must let the user choose an open notebook");
assert.match(settings, /data-action="save-diary-doc"/, "doc id save action must exist");
assert.match(settings, /data-action="write-diary-report"/, "manual write action must exist");
assert.match(settings, /diary\.enabled && diary\.docId \? "" : "disabled"/, "write-now stays disabled until enabled with a valid doc");

assert.match(indexSource, /diaryReport = \{\.\.\.DEFAULT_VIEW_PREFERENCES\.diaryReport\};/, "plugin keeps diary state");
assert.match(indexSource, /this\.diaryReport = \{\.\.\.preferences\.diaryReport\};/, "applyViewPreferences restores diary prefs");
assert.match(indexSource, /diaryReport: \{\.\.\.this\.diaryReport\}/, "persistViewPreferences saves diary prefs");
assert.match(indexSource, /async writeDiaryReport\(\): Promise<void>/, "host implements the manual write");
assert.match(indexSource, /appendAnchorNote\(\(url, payload\) => this\.kernelPost\(url, payload\), docId, markdown\)/, "write must reuse the anchor append channel (/api/block/appendBlock)");
assert.match(indexSource, /withBoundedRetry\(\s*\(\) => appendAnchorNote/, "write must be wrapped in the bounded retry");
assert.match(indexSource, /type: "anchor", at: new Date\(\)\.toISOString\(\), details: \{channel: "diary-report"/, "write outcome must land in the audit ledger");
assert.match(indexSource, /if \(!docId\) \{\s*showMessage\(t\("msg\.diaryNotBound"\)\)/, "write must refuse when not bound/enabled");
assert.match(indexSource, /buildWeeklyReportMarkdown\(summary, title, this\.reportSections, comparison, \{\.\.\.sourceOptions, viewScope, contextAggregation, contextWeekdayPatterns, stalledItems, missedByWeekday, missedByTimeSlot, targetLoad\}\)/, "diary report must reuse the exact review export path (incl. T-1425 scope + T-1433 context + T-1452 weekday cross + T-1436 miss-time + stalled + T-1450 target-load)");
assert.match(indexSource, /data-diary-toggle/, "toggle binding must exist");
assert.match(indexSource, /data-action='save-diary-doc'/, "doc save binding must exist");
assert.match(indexSource, /validateAnchorBlockId\(input\?\.value\)/, "doc ids must be validated with the shared validator");
assert.match(indexSource, /msg\.diaryTitleRequired/, "empty new-document titles must produce visible feedback");
assert.match(indexSource, /msg\.diaryNoNotebook/, "missing open notebooks must have a distinct failure message");
assert.match(indexSource, /msg\.diaryCreateFailed/, "document creation failures must not be reported as invalid IDs");
assert.match(indexSource, /msg\.diarySaveFailed/, "preference persistence failures must be distinguished from host creation failures");
assert.match(indexSource, /diaryNotebookRequest/, "stale notebook responses must not populate a replaced settings surface");
assert.match(indexSource, /runDiarySearchRequest/, "settings must delegate search to the guarded request helper");
assert.match(indexSource, /getSelect: \(\) => select/, "search must retain the select captured before awaiting the host");
assert.match(diarySearchSource, /\/api\/filetree\/searchDocs/, "diary search must use the documented host route");
assert.match(diarySearchSource, /k: options\.query, flashcard: false, excludeIDs: \[\]/, "diary search payload must remain bounded to the route contract");
assert.match(diarySearchSource, /Array\.isArray\(response\.data\)/, "diary search must read the v3.8.4 array response");
assert.match(diarySearchSource, /response\.data\?\.blocks/, "diary search may tolerate legacy wrapped responses");
assert.match(diarySearchSource, /blocks\.slice\(0, 50\)/, "diary search must cap projected results");

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
for (const key of ["set.diaryTitle", "set.diaryHint", "set.diaryToggle", "set.diaryDoc", "set.diaryDocHint", "set.diarySave", "set.diaryWriteNow", "set.diaryNotebook", "set.diaryNotebookLoading", "set.diaryNotebookChoose", "set.diaryNotebookFailed", "msg.diaryWritten", "msg.diaryWriteFailed", "msg.diaryNotBound", "msg.diaryDocInvalid", "msg.diaryTitleRequired", "msg.diaryNoNotebook", "msg.diaryCreateFailed", "msg.diarySaveFailed", "msg.diarySearchFailed"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

/* DECISIONS：撤销策略必须先于交付落盘（D-241）。 */
const decisions = fs.readFileSync("DECISIONS.md", "utf8");
assert.match(decisions, /## D-241：日记集成撤销与幂等策略/, "undo/idempotency strategy must be recorded as D-241");
assert.match(decisions, /不删除已写入的报告/, "undo policy must state reports are user content");

verifyDiarySearchBehavior().then(() => {
    fs.rmSync(outputRoot, {recursive: true, force: true});
    console.log("diary integration gates passed: opt-in default off, doc validation, bounded retry + audit, search failure/stale guards, D-241 recorded");
}).catch((error) => {
    fs.rmSync(outputRoot, {recursive: true, force: true});
    console.error(error);
    process.exitCode = 1;
});
