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
const {appendDiagnostic, normalizeDiagnostics, serializeDiagnostics, parseDiagnostics, CHECKIN_DIAGNOSTIC_CODES, CHECKIN_DIAGNOSTIC_INFO} = require(path.join(featuresDir, "diagnostics.js"));

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

/* 序列化往返与非法输入。 */
const roundTrip = parseDiagnostics(serializeDiagnostics(entries));
assert.deepEqual(roundTrip, entries.slice(-20));
assert.deepEqual(parseDiagnostics("{broken"), []);
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
assert.match(indexSource, /recordDiagnostic\("save-failed", String\(error\)\.slice\(0, 200\)\)/, "store save failures must record save-failed");
assert.match(indexSource, /recordDiagnostic\("version-conflict"/, "merge conflicts must record version-conflict");
assert.match(indexSource, /recordDiagnostic\("load-failed"/, "refresh/load failures must record load-failed");
assert.match(indexSource, /recordDiagnostic\("migration-rejected"/, "rejected imports must record migration-rejected");
assert.match(indexSource, /recordDiagnostic\("lock-contended", "teardown final flush deferred"\)/, "lock contention must record lock-contended");
assert.match(indexSource, /getDiagnostics\(\): readonly CheckinDiagnostic\[\]/, "host must expose diagnostics to the API facade");
assert.match(apiSource, /getDiagnostics: \(\) => Object\.freeze\(host\.getDiagnostics\(\)/, "facade must return defensive copies");

/* 设置页：诊断行 + 导出（无记录禁用）。 */
assert.match(settings, /data-diagnostics/, "settings must mark the diagnostics row");
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
for (const key of ["set.diagnosticsTitle", "set.diagnosticsCount", "set.diagnosticsExport", "agent.diagnosticsIntro"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log(`diagnostics gates passed: ${CHECKIN_DIAGNOSTIC_CODES.length} codes, ring buffer, serialization roundtrip, capability+manifest+doc sync, 5 instrumented failure paths`);
