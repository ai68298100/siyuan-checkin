const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1783 守门测试：诊断、审计与导出敏感信息脱敏与长度截断统一（D-391）。
   1. redactSensitiveText:
      - 剥离恶意控制字符（\u0000-\u001f\u007f）及双向覆盖字符（\u202A-\u202E, \u2066-\u2069）；
      - 自动脱敏 Bearer [token] 与 apiKey="xxx" 等凭据；
      - 模糊本地用户私有绝对路径；
      - UTF-16 代理对安全截断，不截碎多字节 Emoji，超长追加可解释标记 …[truncated]；
   2. sanitizeDiagnosticDetail:
      - 诊断详情清洗与 ≤200 字符硬边界；
   3. appendDiagnostic & normalizeDiagnostics 统一生效；
   4. index.ts 中 recordDiagnostic 与 copyInitDiagnostics 统一接线。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：源码接线钉 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const diagSource = fs.readFileSync(path.join(sourceRoot, "features", "diagnostics.ts"), "utf8");
const privacySource = fs.readFileSync(path.join(sourceRoot, "features", "privacy-scope.ts"), "utf8");

assert.match(indexSource, /sanitizeDiagnosticDetail\(detail\)/, "T-1783: index.ts recordDiagnostic sanitizes detail");
assert.match(diagSource, /sanitizeDiagnosticDetail/, "T-1783: diagnostics uses sanitizeDiagnosticDetail");

/* 断言 2：纯函数行为测试 */
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-privacy-redact-"));

for (const filename of ["features/privacy-scope.ts", "features/diagnostics.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}

const {redactSensitiveText, sanitizeDiagnosticDetail} = require(path.join(outputRoot, "features", "privacy-scope.js"));
const {appendDiagnostic, normalizeDiagnostics} = require(path.join(outputRoot, "features", "diagnostics.js"));

// 1. 控制字符清洗
const rawControl = "\u0000\u0008\u001f\u007fError occurred!\u202E";
assert.equal(redactSensitiveText(rawControl), "Error occurred!", "strips dangerous control and bidi override characters");

// 2. 敏感凭据脱敏
const rawToken = "Failed calling upstream: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz";
assert.equal(redactSensitiveText(rawToken), "Failed calling upstream: [REDACTED_CREDENTIAL]");

const rawApiKey = 'fetch failed with apiKey="my-secret-key-123456" in query';
assert.equal(redactSensitiveText(rawApiKey), "fetch failed with [REDACTED_CREDENTIAL] in query");

// 3. 用户私有绝对路径脱敏
const winPath = "File read failed at " + ["C:", "Users", "Administrator", "Documents", "SiYuan", "conf.json"].join("\\");
assert.equal(redactSensitiveText(winPath), "File read failed at [USER_PATH]\\Documents\\SiYuan\\conf.json");

const posixPath = "File read failed at " + ["", "Users", "john_doe", "Library", "Application Support", "SiYuan"].join("/");
assert.equal(redactSensitiveText(posixPath), "File read failed at [USER_PATH]/Library/Application Support/SiYuan");

// 4. 超长截断与代理对安全
const longText = "A".repeat(300);
const truncated = redactSensitiveText(longText, 50);
assert.equal(truncated.length, 50 + "…[truncated]".length);
assert.ok(truncated.endsWith("…[truncated]"), "appends explicit truncated tag");

// 代理对截断安全：在代理对中间截断时不留下孤立代理项
const emojiString = "ABC" + "🎉".repeat(25); // 每个 🎉 长度为 2
const truncatedEmoji = redactSensitiveText(emojiString, 10);
assert.ok(!/[\uD800-\uDBFF]$/.test(truncatedEmoji.slice(0, 10)), "high surrogate is not left hanging at truncation point");

// 5. 诊断集成守门（origin/main 规范标记：<path> 与 <redacted>）
const diags = appendDiagnostic([], {
    code: "load-failed",
    at: "2026-10-19T10:00:00.000Z",
    detail: "Error at " + ["", "home", "user", "workspace"].join("/") + " with Bearer token_secret_12345",
});
assert.equal(diags.length, 1);
assert.equal(diags[0].detail, "Error at <path><redacted>");

const normalized = normalizeDiagnostics([
    {
        code: "save-failed",
        at: "2026-10-19T10:00:00.000Z",
        detail: "Path " + ["C:", "Users", "Admin", "data", "storage"].join("\\") + " failed with apiKey='secret12345'",
    },
]);
assert.equal(normalized[0].detail, "Path <path>'<redacted>'");

console.log("privacy-sensitive-redaction: all assertions passed");
