const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
for (const filename of ["package.json", "plugin.json", path.join("dist", "plugin.json")]) {
    const bytes = fs.readFileSync(path.join(root, filename));
    assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${filename} must not contain a UTF-8 BOM`);
}
const plugin = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const distPlugin = JSON.parse(fs.readFileSync(path.join(root, "dist", "plugin.json"), "utf8"));
assert.equal(plugin.version, packageManifest.version, "source manifest versions must match");
assert.equal(distPlugin.version, plugin.version, "built manifest must match source version");
assert.equal(packageManifest.description, "SiYuan plugin: 小飞驴打卡", "package metadata must use readable UTF-8 Chinese");
assert.ok(!/灏忛|鎵撳崱/.test(packageManifest.description), "package metadata must not contain mojibake");
assert.ok(fs.statSync(path.join(root, "package.zip")).size > 10_000, "package.zip must be a non-empty release archive");
for (const filename of ["index.js", "index.css", "plugin.json", "README.md", "LICENSE.txt", plugin.icon, plugin.preview]) {
    assert.ok(filename && fs.existsSync(path.join(root, "dist", filename)), `dist asset missing: ${filename}`);
}
const builtCss = fs.readFileSync(path.join(root, "dist", "index.css"), "utf8");
for (const surface of ["today", "history", "summary", "settings", "occasions", "insights", "archived"]) {
    assert.match(builtCss, new RegExp(`\\.lc-checkin--${surface}`), `built CSS missing 4.0 ${surface} surface`);
}
/* CSS 体积预算（T-109，B-005 处置后基线）：dock 四档宽度层入库后实测 294502 字节（v9.6.1 为 264920，全部为源码有引用的活样式），
   上限留 8% 余量防样式膨胀回潮；四档样式的合并精简立项在 15.0，完成后再下修基线。 */
const builtCssBytes = fs.statSync(path.join(root, "dist", "index.css")).size;
assert.ok(builtCssBytes <= 318_000, `built CSS exceeds the 318000-byte budget: ${builtCssBytes} bytes`);
console.log(`Release assets: v${plugin.version} checks passed (css ${builtCssBytes} bytes).`);
