const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const plugin = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageManifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const distPlugin = JSON.parse(fs.readFileSync(path.join(root, "dist", "plugin.json"), "utf8"));
assert.equal(plugin.version, packageManifest.version, "source manifest versions must match");
assert.equal(distPlugin.version, plugin.version, "built manifest must match source version");
assert.ok(fs.statSync(path.join(root, "package.zip")).size > 10_000, "package.zip must be a non-empty release archive");
for (const filename of ["index.js", "index.css", "plugin.json", "README.md", "LICENSE.txt", plugin.icon, plugin.preview]) {
    assert.ok(filename && fs.existsSync(path.join(root, "dist", filename)), `dist asset missing: ${filename}`);
}
const builtCss = fs.readFileSync(path.join(root, "dist", "index.css"), "utf8");
for (const surface of ["today", "history", "summary", "settings", "occasions", "insights", "archived"]) {
    assert.match(builtCss, new RegExp(`\\.lc-checkin--${surface}`), `built CSS missing 4.0 ${surface} surface`);
}
console.log(`Release assets: v${plugin.version} checks passed.`);
