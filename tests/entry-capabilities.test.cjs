const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/index.ts", "utf8");
const manifest = JSON.parse(fs.readFileSync("plugin.json", "utf8"));
const packageManifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(manifest.version, packageManifest.version, "plugin and package versions must stay aligned");
assert.equal(manifest.minAppVersion >= "3.4.2", true);

assert.match(source, /this\.isMobileFrontend = frontend === "mobile" \|\| frontend === "browser-mobile"/);
assert.match(source, /this\.supportsCustomTab = !this\.isMobileFrontend/);
assert.match(source, /if \(this\.supportsCustomTab\) this\.addCommand/);
assert.match(source, /if \(!this\.supportsCustomTab\) this\.openQuickDialog\(\)/);
assert.match(source, /data-action="open-tab"/);
assert.match(source, /getCustomSummaryContext/);
assert.match(source, /自定义总结范围无效/);
assert.match(source, /const API_VERSION = 2/);
assert.match(source, /customRange \? buildCustomSummaryContext/);
assert.match(source, /getEventsInCustomRange\(this\.store, customRange\)/);
console.log("Entry capability structure checks passed.");
