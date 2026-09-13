const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
/* 归档视图已外置（15.0-A）：标记断言读 render/archived.ts。 */
const view = fs.readFileSync(path.join(root, "src", "render", "archived.ts"), "utf8");

assert.match(source, /private archivedQuery = "";/, "archive search state must be independent from history search");
assert.match(source, /renderArchivedView\(\{items: this\.store\.items, query: this\.archivedQuery/, "the shell must delegate to the extracted view");
assert.match(view, /data-archived-search/, "archive page must expose its local search input");
assert.match(i18n, /"archived\.searchPlaceholder": "搜索名称、分组或单位"/, "search placeholder must stay in the dictionary (zh)");
assert.match(i18n, /"archived\.searchPlaceholder": "Search name, group or unit"/, "search placeholder must stay in the dictionary (en)");
assert.match(view, /\[item\.name, item\.group, item\.unit, item\.icon\][\s\S]*includes\(query\)/, "archive search must match useful item metadata");
assert.match(view, /data-action="clear-archived-query"/, "archive search must expose a clear action");
assert.match(view, /data-restore-id[\s\S]*t\("archived\.restoreAria"/, "restore actions must identify their item");
assert.match(i18n, /"archived\.restoreAria": "恢复\{name\}"/, "restore aria label must stay in the dictionary");
const pluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
assert.match(pluginOps, /t\("msg\.restoredNamed", \{name: expectedItem\.name\}\)/, "successful restore must give named feedback");
assert.match(i18n, /"msg\.restoredNamed": "\[小驴打卡\] 已恢复「\{name\}」"/, "restore feedback must stay in the dictionary");
/* 布局守门锁现行活规则（D-051）；宽度决策只认 lc5 容器，不认视口（D-016）。 */
assert.match(styles, /\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[^}]*justify-content:\s*space-between;/, "archive tools must have a stable desktop layout");
assert.match(styles, /@container lc5 \(max-width:\s*560px\)\s*\{[\s\S]*?\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[^}]*display:\s*grid;/, "archive tools must stack compactly in narrow containers");

console.log("Archived search and recovery structure checks passed.");
