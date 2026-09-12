const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "archived-v4.scss"), "utf8");

assert.match(source, /private archivedQuery = "";/, "archive search state must be independent from history search");
assert.match(source, /data-archived-search[\s\S]*搜索名称、分组或单位/, "archive page must expose a labelled local search");
assert.match(source, /\[item\.name, item\.group, item\.unit, item\.icon\][\s\S]*includes\(query\)/, "archive search must match useful item metadata");
assert.match(source, /data-action="clear-archived-query"/, "archive search must expose a clear action");
assert.match(source, /data-restore-id[\s\S]*t\("archived\.restoreAria"/, "restore actions must identify their item");
assert.match(i18n, /"archived\.restoreAria": "恢复\{name\}"/, "restore aria label must stay in the dictionary");
const pluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
assert.match(pluginOps, /t\("msg\.restoredNamed", \{name: expectedItem\.name\}\)/, "successful restore must give named feedback");
assert.match(i18n, /"msg\.restoredNamed": "\[小驴打卡\] 已恢复「\{name\}」"/, "restore feedback must stay in the dictionary");
assert.match(styles, /\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[\s\S]*justify-content:\s*space-between;/, "archive tools must have a stable desktop layout");
assert.match(styles, /@media \(max-width:\s*600px\)[\s\S]*\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[\s\S]*display:\s*grid;/, "archive tools must stack compactly on mobile");

console.log("Archived search and recovery structure checks passed.");
