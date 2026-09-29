/* T-1625 守门：动态用户内容的安全渲染边界（四类：HTML 文本 / 属性 / ARIA / URL）。
   - safeAttachmentUrl：协议白名单（data:image/、blob:、https:、http:、相对路径）+ 转义，
     敌意 URL（javascript:、data:text/html、属性逃逸引号）不得进入 src；
   - 接线：fragments 两处附件缩略图、bulk-check aria、today-bindings 上下文菜单的
     t({name}) 输出必须转义后才进 HTML（t() 只做纯文本替换）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-render-boundary-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.mkdirSync(path.join(dir, "features"), {recursive: true});
fs.mkdirSync(path.join(dir, "ui"), {recursive: true});
for (const [source, destination] of [["features/record-notes.ts", "features/record-notes.js"], ["ui/labels.ts", "ui/labels.js"], ["shared.ts", "shared.js"]]) {
    fs.writeFileSync(path.join(dir, destination), ts.transpileModule(fs.readFileSync(path.join(root, "src", source), "utf8"), {compilerOptions}).outputText);
}
const {safeAttachmentUrl} = require(path.join(dir, "shared.js"));

/* —— 敌意 URL 矩阵 —— */
assert.equal(safeAttachmentUrl("javascript:alert(1)"), "", "javascript: scheme is dropped");
assert.equal(safeAttachmentUrl("JAVASCRIPT:alert(1)"), "", "scheme check is case-insensitive");
assert.equal(safeAttachmentUrl("data:text/html,<script>alert(1)</script>"), "", "non-image data URLs are dropped");
assert.equal(safeAttachmentUrl("vbscript:msgbox(1)"), "", "vbscript: is dropped");
const escapedDataUrl = safeAttachmentUrl('data:image/png;base64,AAAA" onerror="alert(1)');
assert.ok(!escapedDataUrl.includes('" onerror='), "quote breakout must be escaped inside the attribute value");
assert.ok(escapedDataUrl.includes("&quot;"), "hostile quotes are entity-escaped");
assert.equal(safeAttachmentUrl("https://example.com/x.png\" onerror=\"x"), "https://example.com/x.png&quot; onerror=&quot;x",
    "allowed-scheme URLs still get attribute-escaped");
assert.equal(safeAttachmentUrl("  /attachments/x.png  "), "/attachments/x.png", "relative paths are trimmed and allowed");
assert.equal(safeAttachmentUrl("blob:abc"), "blob:abc", "blob: is allowed");
assert.equal(safeAttachmentUrl(undefined), "", "missing URL renders nothing");
assert.equal(safeAttachmentUrl(""), "", "empty URL renders nothing");

/* —— 接线（精确签名） —— */
const fragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.equal((fragments.match(/src="\$\{event\.attachment\}"/g) || []).length, 0,
    "attachment URLs must never be interpolated raw into src");
assert.ok((fragments.match(/safeAttachmentUrl\(event\.attachment\)/g) || []).length >= 4,
    "both log thumbnails must gate and escape through safeAttachmentUrl");
assert.match(fragments, /aria-label="\$\{escapeHtml\(t\("item\.select", \{name: item\.name\}\)\)\}"/,
    "bulk-check aria-label must escape the t() output containing item name");
const todayBindings = fs.readFileSync(path.join(root, "src", "render", "today-bindings.ts"), "utf8");
assert.match(todayBindings, /escapeHtml\(t\("item\.editAria", \{name: item\.name\}\)\)/,
    "context-menu edit label must escape the t() output containing item name");
const shared = fs.readFileSync(path.join(root, "src", "shared.ts"), "utf8");
assert.match(shared, /export function safeAttachmentUrl/, "the URL gate must live in shared.ts");


/* —— T-1625 扫尾：审计点名文件中 t({用户参数}) 进 HTML 的插值必须整体转义。 —— */
const sweepPatterns = [
    ["src/render/editor.ts", [
        String.raw`aria-label="\$\{escapeHtml\(t\("item\.useTemplate"`,
        String.raw`aria-label="\$\{escapeHtml\(t\("item\.useMyTemplate"`,
        String.raw`aria-label="\$\{escapeHtml\(t\("item\.deleteTemplate"`,
        String.raw`escapeHtml\(t\("editor\.importDuplicateOf"`,
        String.raw`escapeHtml\(t\("editor\.importMetaNew"`,
        String.raw`escapeHtml\(t\("editor\.iconSelectAria"`,
    ]],
    ["src/render/archived.ts", [
        String.raw`aria-label="\$\{escapeHtml\(t\("archived\.selectAria"`,
        String.raw`escapeHtml\(t\("archived\.searchEmpty"`,
    ]],
    ["src/render/fragments.ts", [
        String.raw`aria-label="\$\{escapeHtml\(t\("item\.insightsAria"`,
        String.raw`aria-label="\$\{escapeHtml\(t\("item\.dragSort"`,
        String.raw`escapeHtml\(t\("today\.focusCelebration"`,
    ]],
    ["src/render/review.ts", [
        String.raw`aria-label="\$\{escapeHtml\(t\("review\.draftInspectAria"`,
    ]],
];
for (const [file, patterns] of sweepPatterns) {
    const sourceText = fs.readFileSync(path.join(root, file), "utf8");
    for (const pattern of patterns) assert.match(sourceText, new RegExp(pattern), file + " must escape user-content t() interpolation");
}
fs.rmSync(dir, {recursive: true, force: true});
console.log("Render boundary checks passed: hostile URL matrix, attachment gating, menu/aria escaping.");
