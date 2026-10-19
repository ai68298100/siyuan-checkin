const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1785 守门测试：动态图标与 HTML/SVG 属性转义边界统一（D-387）。
   1. renderIconMarkup 严格限制图片白名单（合法 https:// 或 base64 data:image），
      杜绝未编码 data:image/svg 脚本执行、属性闭合攻击；
   2. 恶意控制字符（\u0000、\u001f 等）与 </svg> 标签闭合作为文本统一安全转义；
   3. index.ts 的 normalizeUiIcons 全面升级为 replaceChildren(this.iconNode(...))，
      杜绝批量 innerHTML 注入。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：index.ts 源码结构钉 */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.doesNotMatch(
    indexSource,
    /button\.innerHTML = uiIcon\(/,
    "T-1785: bare button.innerHTML = uiIcon() is eliminated in normalizeUiIcons",
);
assert.doesNotMatch(
    indexSource,
    /node\.innerHTML = uiIcon\(/,
    "T-1785: bare node.innerHTML = uiIcon() is eliminated in normalizeUiIcons",
);
assert.match(
    indexSource,
    /\.replaceChildren\(this\.iconNode\(/,
    "T-1785: normalizeUiIcons uses DOM-safe replaceChildren(this.iconNode(...))",
);

/* 断言 2：renderIconMarkup 安全渲染验证 */
const sharedSource = fs.readFileSync(path.join(sourceRoot, "shared.ts"), "utf8");
const ts = require("typescript");
const sharedJs = ts.transpileModule(sharedSource, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;

const sharedMod = {exports: {}};
const stubRequire = (id) => ({t: (k) => k});
new Function("module", "exports", "require", sharedJs)(sharedMod, sharedMod.exports, stubRequire);
const {renderIconMarkup} = sharedMod.exports;

// 1. 恶意未编码 SVG 脚本 (data:image/svg+xml;utf8,<svg onload="alert(1)">)
const xssSvg = 'data:image/svg+xml;utf8,<svg onload="alert(1)">';
const outSvg = renderIconMarkup(xssSvg);
assert.ok(!outSvg.startsWith("<img"), "malicious unencoded svg data uri must NOT render as <img>");
assert.ok(outSvg.includes("&lt;svg onload=&quot;alert(1)&quot;&gt;"), "malicious svg payload is escaped as safe text");

// 2. 恶意属性闭合攻击
const xssAttr = 'data:image/png" onmouseover="alert(1)';
const outAttr = renderIconMarkup(xssAttr);
assert.ok(!outAttr.startsWith("<img"), "malicious attribute breakout must NOT render as <img>");
assert.ok(!outAttr.includes('" onmouseover="'), "attribute breakout is neutralized");

// 3. 恶意标签注入
const tagBreak = '</svg><script>alert(1)</script>';
const outTag = renderIconMarkup(tagBreak);
assert.equal(outTag, "&lt;/svg&gt;&lt;script&gt;alert(1)&lt;/script&gt;", "raw script tags are escaped as text");

// 4. 控制字符剥离
const ctrlInput = '\u0000\u0007🏃\u001f';
assert.equal(renderIconMarkup(ctrlInput), "🏃", "control characters stripped out");

// 5. 合法 Base64 图片 -> 输出 <img>
const validBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const outBase64 = renderIconMarkup(validBase64);
assert.ok(outBase64.startsWith("<img src=\"data:image/png;base64,"), "valid base64 renders as <img> tag");
assert.ok(outBase64.includes('loading="lazy"'), "img includes loading=lazy");

// 6. 合法 HTTPS 图片 -> 输出 <img>
const validHttps = "https://example.com/icons/habit.png";
const outHttps = renderIconMarkup(validHttps);
assert.ok(outHttps.startsWith("<img src=\"https://example.com/icons/habit.png\""), "valid https url renders as <img>");

// 7. 普通合法 Emoji 与字符
assert.equal(renderIconMarkup("📖"), "📖");
assert.equal(renderIconMarkup("✓"), "✓");

console.log("icon-safety-xss: all assertions passed");
