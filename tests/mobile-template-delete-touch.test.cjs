const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

assert.match(editorSource, /class="lc-checkin__archive-button" type="button" data-action="archive"/,
    "editor must expose a dedicated archive/delete button");
assert.match(editorSource, /data-action="archive"[\s\S]*\$\{item\.archived \? t\("editor\.restore"\) : t\("editor\.archive"\)\}/,
    "delete action must communicate its reversible archive state");
assert.match(i18n, /"editor\.restore": "恢复打卡项"/);
assert.match(i18n, /"editor\.archive": "暂时归档"/);
assert.match(source, /private async archiveEditingItem\(\)[\s\S]*setItemArchived\(current\.id, !current\.archived/,
    "delete action must use reversible persistence rather than removing the item");

assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__archive-button\s*\{[\s\S]*min-height:\s*40px/,
    "archive/delete action must be touch-sized on mobile");
assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*background:\s*var\(--b3-theme-background\)/,
    "delete action must stay on a solid action surface above the keyboard");
assert.match(styles, /@media \(max-width:\s*380px\)[\s\S]*\.lc-checkin__organization-fields\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "narrow editor must collapse fields before the delete action");
assert.match(styles, /\.lc-checkin__archive-button[\s\S]*cursor:\s*pointer/,
    "archive/delete action must remain visibly actionable");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile template delete touch checks passed for 320/360/390/430px.");
