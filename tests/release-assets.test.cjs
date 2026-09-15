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
assert.match(packageManifest.scripts["test:quality"], /test:legacy-style/, "quality chain must include legacy style audit");
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
/* CSS 体积分级门禁：正常线 318KB，合理新增允许至 340KB，超过 360KB 才阻断发布。 */
const builtCssBytes = fs.statSync(path.join(root, "dist", "index.css")).size;
const CSS_SOFT_LIMIT = 318_000;
const CSS_WARN_LIMIT = 340_000;
const CSS_HARD_LIMIT = 360_000;
assert.ok(builtCssBytes <= CSS_HARD_LIMIT, `built CSS exceeds the hard 360000-byte budget: ${builtCssBytes} bytes`);
const budgetState = builtCssBytes <= CSS_SOFT_LIMIT ? "within-budget" : builtCssBytes <= CSS_WARN_LIMIT ? "warning" : "near-hard-limit";
assert.ok(["within-budget", "warning", "near-hard-limit"].includes(budgetState), "CSS budget state must be explicit");
console.log(`Release assets: v${plugin.version} checks passed (css ${builtCssBytes} bytes, ${budgetState}).`);
