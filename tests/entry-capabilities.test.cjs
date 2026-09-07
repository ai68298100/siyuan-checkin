const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/index.ts", "utf8");

assert.match(source, /this\.isMobileFrontend = frontend === "mobile" \|\| frontend === "browser-mobile"/);
assert.match(source, /this\.supportsCustomTab = !this\.isMobileFrontend/);
assert.match(source, /if \(this\.supportsCustomTab\) this\.addCommand/);
assert.match(source, /if \(!this\.supportsCustomTab\) this\.openQuickDialog\(\)/);
assert.match(source, /data-action="open-tab"/);
console.log("Entry capability structure checks passed.");
