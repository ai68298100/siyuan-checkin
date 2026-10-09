/* T-1361 机器可读诊断守门：原因码注册表、环形容量、序列化往返、
   公开 API 能力（manifest/文档/源码三方一致）、宿主打点与设置页结构、双语键。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-diagnostics-"));
const featuresDir = path.join(outputRoot, "features");
fs.mkdirSync(featuresDir, {recursive: true});
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(featuresDir, relative.split("/").pop().replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
transpile("src/features/diagnostics.ts");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {appendDiagnostic, normalizeDiagnostics, sanitizeDiagnosticDetail, serializeDiagnostics, parseDiagnostics, summarizeDiagnosticsPreview, CHECKIN_DIAGNOSTIC_CODES, CHECKIN_DIAGNOSTIC_INFO} = require(path.join(featuresDir, "diagnostics.js"));

const at = "2026-09-21T10:00:00.000Z";
/* 追加与容量：连续同码去重；环形上限 20。 */
let entries = appendDiagnostic([], {code: "save-failed", at});
assert.equal(entries.length, 1);
entries = appendDiagnostic(entries, {code: "save-failed", at: "2026-09-21T10:00:01.000Z"});
assert.equal(entries.length, 1, "consecutive same-code entries dedupe");
entries = appendDiagnostic(entries, {code: "version-conflict", at});
entries = appendDiagnostic(entries, {code: "save-failed", at});
assert.equal(entries.length, 3, "alternating codes all stay");
for (let index = 0; index < 30; index += 1) entries = appendDiagnostic(entries, {code: "lock-contended", at: `${at.replace("10:", String(10).padStart(2, "0")).slice(0, 11)}0${index % 10}:0${index % 6}:00.000Z`, detail: `d${index}`});
assert.equal(entries.length, 20, "ring buffer caps at 20");

/* 诊断 detail 只保留可操作上下文：常见凭据和绝对路径在内存、恢复与导出前均遮罩。 */
/* Build hostile paths at runtime so the repository portability guard does not
   mistake a test fixture for a developer's real machine path. */
const windowsUserPath = ["C:", "Users", "alice", "vault", "data.json"].join("\\");
const posixUserPath = ["", "home", "alice", "notes"].join("/");
const hostileDetail = `save failed token=secret123 Authorization: Bearer bearer123 at ${windowsUserPath} and ${posixUserPath}`;
const safeDetail = sanitizeDiagnosticDetail(hostileDetail);
for (const secret of ["secret123", "bearer123", windowsUserPath, posixUserPath]) assert.equal(safeDetail.includes(secret), false);
assert.match(safeDetail, /<redacted>/);
assert.match(safeDetail, /<path>/);
assert.equal(sanitizeDiagnosticDetail("refresh_token=refresh-secret id_token=id-secret").includes("refresh-secret"), false);
assert.equal(normalizeDiagnostics([{code: "save-failed", at, detail: hostileDetail}])[0].detail, safeDetail);
assert.equal(appendDiagnostic([], {code: "save-failed", at, detail: hostileDetail})[0].detail, safeDetail);
const emojiDetail = "😀".repeat(300);
const boundedEmoji = sanitizeDiagnosticDetail(emojiDetail);
assert.equal([...boundedEmoji].length, 200, "diagnostic detail bounds Unicode code points without splitting surrogate pairs");
assert.equal(boundedEmoji.endsWith("😀"), true, "diagnostic detail keeps complete emoji at the boundary");
assert.equal(normalizeDiagnostics([{code: "save-failed", at, detail: emojiDetail}])[0].detail, boundedEmoji, "normalized diagnostics retain bounded Unicode details");

/* 序列化往返与非法输入。 */
const roundTrip = parseDiagnostics(serializeDiagnostics(entries));
assert.deepEqual(roundTrip, entries.slice(-20));
assert.deepEqual(parseDiagnostics("{broken"), []);
const invalidExport = JSON.parse(serializeDiagnostics([{code: "save-failed", at}], "not-a-date"));
assert.equal(Number.isFinite(Date.parse(invalidExport.exportedAt)), true, "invalid diagnostics export time falls back to an ISO timestamp");
assert.deepEqual(normalizeDiagnostics([{code: "bogus", at}, {code: "save-failed", at: "no-date"}]), [], "unknown codes and invalid times are rejected");
for (const code of CHECKIN_DIAGNOSTIC_CODES) {
    assert.ok(CHECKIN_DIAGNOSTIC_INFO[code].labelKey && CHECKIN_DIAGNOSTIC_INFO[code].recoveryKey, `${code} must map to label and recovery keys`);
}

/* ---------- 能力与接线结构断言 ---------- */

const contract = fs.readFileSync("src/api-contract.ts", "utf8");
const manifest = JSON.parse(fs.readFileSync("docs/contracts/checkin-api-v5.json", "utf8"));
const reference = fs.readFileSync("docs/api-v5.md", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const pluginOps = fs.readFileSync("src/plugin-ops.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");

/* 公开能力：源码 ↔ manifest ↔ 文档三方一致（只增不删，since 5）。 */
assert.ok(contract.includes('"diagnostics.read"'), "contract must declare diagnostics.read");
assert.match(manifest.capabilities.map((entry) => entry.name).join(","), /diagnostics\.read/, "manifest must declare diagnostics.read");
const manifestEntry = manifest.capabilities.find((entry) => entry.name === "diagnostics.read");
assert.equal(manifestEntry.since, 5);
assert.equal(manifestEntry.effect, "read");
assert.ok(reference.includes("getDiagnostics"), "reference doc must document getDiagnostics");

/* 宿主打点：五个失败路径全部记录原因码。 */
assert.match(indexSource, /recordDiagnostic\("save-failed", safeUserErrorDetail\(error\)\)/, "store save failures must record save-failed through the shared sanitizer");
const diagnosticRecorder = indexSource.slice(indexSource.indexOf("recordDiagnostic(code:"), indexSource.indexOf("private recordImportFailure"));
assert.ok(diagnosticRecorder.includes("...(detail ? {detail} : {})"), "recordDiagnostic must delegate detail bounds to the shared sanitizer");
assert.match(indexSource, /recordDiagnostic\("version-conflict"/, "merge conflicts must record version-conflict");
assert.match(indexSource, /recordDiagnostic\("load-failed"/, "refresh/load failures must record load-failed");
assert.match(indexSource, /recordDiagnostic\("migration-rejected"/, "rejected imports must record migration-rejected");
assert.match(indexSource, /private recordImportFailure\(source: /, "file import failures must share one bounded fact recorder");
for (const source of ["csv-import", "loop-import", "obsidian-import"]) {
    assert.match(indexSource, new RegExp(`recordImportFailure\\("${source}"`), `${source} failures must be recorded`);
}
assert.match(indexSource, /recordDiagnostic\(phase === "persist" \? "save-failed" : "migration-rejected", failureKind\)/, "import phase chooses a stable diagnostic code");
assert.match(indexSource, /recordDiagnostic\("lock-contended", "teardown final flush deferred"\)/, "lock contention must record lock-contended");
assert.match(indexSource, /let initializationFailurePhase: string = "load"/, "startup initialization must classify load and persist failures");
assert.match(indexSource, /if \(initializationFailurePhase !== "persist"\) this\.recordDiagnostic\("load-failed", "startup-load-failed"\)/, "startup load failures must enter bounded diagnostics without duplicating persist diagnostics");
assert.match(indexSource, /const failureLabel = initializationFailurePhase === "persist" \? t\("diag\.saveFailed"\) : t\("diag\.loadFailed"\);\s*showMessage\(t\("msg\.dataLoadFail", \{error: failureLabel\}\)\)/, "startup failure toast must use a localized phase label instead of leaking raw host exception text");
assert.doesNotMatch(indexSource, /showMessage\(t\("msg\.dataLoadFail", \{error: String\(error\)\}\)\)/, "startup failure toast must not expose raw host exception text");
assert.match(indexSource, /getDiagnostics\(\): readonly CheckinDiagnostic\[\]/, "host must expose diagnostics to the API facade");
assert.match(apiSource, /getDiagnostics: \(\) => Object\.freeze\(host\.getDiagnostics\(\)/, "facade must return defensive copies");
assert.match(indexSource, /private latestDiagnosticText\(\): string[\s\S]*机器细节只在诊断预览\/API 中保留[\s\S]*return `\$\{t\(info\.labelKey\)\} · \$\{t\(info\.recoveryKey\)\}`/, "settings diagnostics summary must hide internal detail codes");

/* 设置页：诊断行 + 导出（无记录禁用）。 */
assert.match(settings, /data-diagnostics/, "settings must mark the diagnostics row");
assert.match(settings, /data-action="open-recovery-guide"/, "settings must expose a direct recovery guide action");
assert.match(settings, /id="\$\{settingsViewId\}-recovery-guide"/, "recovery guide must have a surface-scoped id");
assert.match(settings, /aria-controls="\$\{settingsViewId\}-recovery-guide"/, "recovery action must point to the guide");
assert.match(settings, /data-action="export-diagnostics"/, "settings must expose diagnostics export");
assert.match(settings, /ctx\.diagnosticsCount \? "" : "disabled"/, "export stays disabled without diagnostics");
assert.match(pluginOps, /export function downloadDiagnosticsFor/, "plugin-ops must expose the diagnostics download");

/* 双语键：每个码的 label/recovery 键 + 设置文案。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const code of CHECKIN_DIAGNOSTIC_CODES) {
    for (const key of [CHECKIN_DIAGNOSTIC_INFO[code].labelKey, CHECKIN_DIAGNOSTIC_INFO[code].recoveryKey]) {
        assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
        assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
    }
}
for (const key of ["set.diagnosticsTitle", "set.diagnosticsCount", "set.openRecoveryGuide", "set.diagnosticsExport", "agent.diagnosticsIntro"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

/* T-1435 · R-A10 诊断导出预览：构成披露（条数/原因码分布降序/时间范围）。 */
{
    const preview = summarizeDiagnosticsPreview([
        {code: "save-failed", at: "2026-09-24T10:00:00.000Z"},
        {code: "lock-contended", at: "2026-09-24T09:00:00.000Z"},
        {code: "save-failed", at: "2026-09-24T11:00:00.000Z"},
        {code: "load-failed", at: "2026-09-20T08:00:00.000Z"},
    ]);
    assert.equal(preview.count, 4);
    assert.equal(preview.codes[0].code, "save-failed", "数量降序（save-failed 2 次）");
    assert.equal(preview.codes[0].count, 2);
    assert.equal(preview.oldestAt, "2026-09-20T08:00:00.000Z", "时间范围最早");
    assert.equal(preview.latestAt, "2026-09-24T11:00:00.000Z", "时间范围最新");
    assert.deepEqual(preview.details, [], "没有 detail 时预览为空");
    const detailPreview = summarizeDiagnosticsPreview([
        {code: "save-failed", at: "2026-09-24T10:00:00.000Z", detail: `token=secret123 ${windowsUserPath}`},
        {code: "load-failed", at: "2026-09-24T11:00:01.000Z", detail: "safe context"},
    ]);
    assert.equal(detailPreview.details.length, 2);
    assert.equal(detailPreview.details[0].detail.includes("secret123"), false);
    assert.equal(detailPreview.details[0].detail.includes(windowsUserPath), false);
    assert.match(detailPreview.details[0].detail, /<redacted>|<path>/);
    const emptyPreview = summarizeDiagnosticsPreview([]);
    assert.equal(emptyPreview.count, 0);
    assert.equal(emptyPreview.oldestAt, undefined);
    assert.equal(emptyPreview.latestAt, undefined);
}

/* —— 接线守门：导出前预览确认 + i18n 双语 —— */
const diagnosticsIndexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(diagnosticsIndexSource, /summarizeDiagnosticsPreview\(this\.diagnostics\)/, "导出诊断前必须构建构成预览");
assert.match(diagnosticsIndexSource, /data-diagnostics-detail-preview/, "导出确认框必须展示有界脱敏 detail 预览");
const diagnosticsI18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["msg.diagnosticsPreview", "msg.diagnosticsEmpty"]) {
    const occurrences = diagnosticsI18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log(`diagnostics gates passed: ${CHECKIN_DIAGNOSTIC_CODES.length} codes, ring buffer, serialization roundtrip, capability+manifest+doc sync, 5 instrumented failure paths`);
