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
const {isSafeIconImage, normalizeCustomIcon, renderIconMarkup, safeAttachmentUrl} = require(path.join(dir, "shared.js"));

/* —— 动态图标边界：仅可信 HTTPS、栅格 base64 或无活动内容的 SVG 可进入 img；
   其余 data URL/属性闭合/控制字符均作为转义文本，不能借 innerHTML 执行。 —— */
assert.equal(isSafeIconImage("data:image/png;base64,aGVsbG8="), true, "raster data icons remain supported");
assert.equal(isSafeIconImage("data:image/svg+xml," + encodeURIComponent("<svg><circle cx=\"1\" cy=\"1\" r=\"1\" /></svg>")), true, "inert SVG data icons remain supported");
assert.ok(normalizeCustomIcon("data:image/svg+xml," + encodeURIComponent("<svg><circle cx=\"1\" cy=\"1\" r=\"1\" /></svg>")), "safe SVG data icons remain selectable");
assert.equal(isSafeIconImage("data:image/svg+xml," + encodeURIComponent("<svg onload=\"alert(1)\"></svg>")), false, "SVG event attributes cannot enter image markup");
assert.equal(isSafeIconImage("data:image/svg+xml,<svg></svg>\u0000"), false, "control characters cannot enter image markup");
assert.equal(normalizeCustomIcon("data:image/svg+xml;base64," + Buffer.from("<svg onload=\\\"alert(1)\\\"></svg>").toString("base64")), undefined, "unsafe uploaded SVG is rejected");
assert.match(renderIconMarkup("<svg onload=\"alert(1)\"></svg>"), /^&lt;svg onload=/, "hostile SVG text is escaped");
assert.doesNotMatch(renderIconMarkup("data:image/svg+xml,<svg onload='alert(1)'></svg>"), /<img\b/, "hostile SVG data is rendered as text");
assert.match(renderIconMarkup('https://example.test/icon.png?title=" onerror="x'), /<img src="https:\/\/example\.test\/icon\.png\?title=&quot; onerror=&quot;x"/, "HTTPS icon attributes are escaped");

/* —— 敌意 URL 矩阵 —— */
assert.equal(safeAttachmentUrl("javascript:alert(1)"), "", "javascript: scheme is dropped");
assert.equal(safeAttachmentUrl("JAVASCRIPT:alert(1)"), "", "scheme check is case-insensitive");
assert.equal(safeAttachmentUrl("data:text/html,<script>alert(1)</script>"), "", "non-image data URLs are dropped");
assert.equal(safeAttachmentUrl("vbscript:msgbox(1)"), "", "vbscript: is dropped");
const escapedDataUrl = safeAttachmentUrl('data:image/png;base64,AAAA" onerror="alert(1)');
assert.equal(escapedDataUrl, "", "malformed data images must be rejected before attribute escaping");
assert.equal(safeAttachmentUrl("https://example.com/x.png\" onerror=\"x"), "https://example.com/x.png&quot; onerror=&quot;x",
    "allowed-scheme URLs still get attribute-escaped");
assert.equal(safeAttachmentUrl("  /attachments/x.png  "), "/attachments/x.png", "relative paths are trimmed and allowed");
assert.equal(safeAttachmentUrl("blob:abc"), "blob:abc", "blob: is allowed");
assert.equal(safeAttachmentUrl(undefined), "", "missing URL renders nothing");
assert.equal(safeAttachmentUrl(""), "", "empty URL renders nothing");
for (const url of ["java\nscript:alert(1)", "java\tscript:alert(1)", "data:image/svg+xml,<svg onload='alert(1)'/>", "data:image/png;base64,AAA", "file:///etc/passwd"]) {
    assert.equal(safeAttachmentUrl(url), "", "invalid, active or obfuscated image URLs cannot pass the rendering gate");
}
for (const url of ["//host/photo.png", "\\\\host/photo.png", "/\\host/photo.png", "https://", "https:///host/photo.png", "https://?photo", "http://#photo", "https://@/photo.png", "https://[invalid]/photo.png", "https://host:invalid/photo.png"]) {
    assert.equal(safeAttachmentUrl(url), "", "network-path references and malformed authorities cannot bypass explicit protocols");
}
for (const url of ["https://example.com/photo.png", "HTTP://example.com/photo.png", "assets/photo.png", "./photo.png", "../photo.png", "/assets/photo.png?label=a&size=1"]) {
    assert.equal(safeAttachmentUrl(url), url.replaceAll("&", "&amp;"), "valid explicit HTTP URLs and local paths retain their attribute-safe value");
}
assert.equal(safeAttachmentUrl("data:image/png;base64,iVBORw0KGgo="), "data:image/png;base64,iVBORw0KGgo=",
    "valid raster data remains unmodified by the protocol check");

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
require("./attachment-ingestion.cjs");
console.log("Render boundary checks passed: hostile URL matrix, attachment gating, menu/aria escaping.");
