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
["src/i18n.ts", "src/features/note-anchor.ts", "src/view-preferences.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));

/* 偏好归一：默认关；docId 走块 ID 校验；enabled 无合法 docId 不物化。 */
assert.deepEqual(normalizeViewPreferences({}).diaryReport, {enabled: false, docId: ""}, "diary integration defaults to off");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: ""}}).diaryReport.enabled, false, "enabled without a doc id must not materialize");
assert.equal(normalizeViewPreferences({diaryReport: {enabled: true, docId: "short"}}).diaryReport.enabled, false, "enabled with an invalid doc id must not materialize");
assert.deepEqual(normalizeViewPreferences({diaryReport: {enabled: true, docId: "20260101120000-abcdef1234"}}).diaryReport, {enabled: true, docId: "20260101120000-abcdef1234"});
assert.equal(normalizeViewPreferences({diaryReport: {enabled: false, docId: "20260101120000-abcdef1234"}}).diaryReport.enabled, false, "saved doc keeps enabled=false until the user opts in");
assert.equal(normalizeViewPreferences({diaryReport: "bogus"}).diaryReport.docId, "", "non-object payload falls back to off");

/* ---------- 结构守门 ---------- */

const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");

assert.match(settings, /data-diary-integration/, "settings must mark the diary integration group");
assert.match(settings, /data-diary-toggle/, "opt-in toggle must exist");
assert.match(settings, /data-diary-doc/, "doc id input must exist");
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
assert.match(indexSource, /buildWeeklyReportMarkdown\(summary, title, this\.reportSections, comparison, sourceOptions\)/, "diary report must reuse the exact review export path");
assert.match(indexSource, /data-diary-toggle/, "toggle binding must exist");
assert.match(indexSource, /data-action='save-diary-doc'/, "doc save binding must exist");
assert.match(indexSource, /validateAnchorBlockId\(input\?\.value\)/, "doc ids must be validated with the shared validator");

/* 双语文案齐备。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["set.diaryTitle", "set.diaryHint", "set.diaryToggle", "set.diaryDoc", "set.diaryDocHint", "set.diarySave", "set.diaryWriteNow", "msg.diaryWritten", "msg.diaryWriteFailed", "msg.diaryNotBound", "msg.diaryDocInvalid"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

/* DECISIONS：撤销策略必须先于交付落盘（D-241）。 */
const decisions = fs.readFileSync("DECISIONS.md", "utf8");
assert.match(decisions, /## D-241：日记集成撤销与幂等策略/, "undo/idempotency strategy must be recorded as D-241");
assert.match(decisions, /不删除已写入的报告/, "undo policy must state reports are user content");

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("diary integration gates passed: opt-in default off, doc validation, bounded retry + audit, single report path, D-241 recorded");
