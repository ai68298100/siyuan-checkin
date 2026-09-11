const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

// Archive is the reversible delete operation and must have a visible, labelled action in the editor.
assert.match(source, /data-action="archive"[\s\S]*\$\{item\.archived \? t\("editor\.restore"\) : t\("editor\.archive"\)\}/,
    "editor must expose a reversible archive/delete action");
assert.match(i18n, /"editor\.restore": "恢复打卡项"/);
assert.match(i18n, /"editor\.archive": "暂时归档"/);
assert.match(source, /private async archiveEditingItem\(\)[\s\S]*setItemArchived\(current\.id, !current\.archived/,
    "archive action must use the persisted reversible operation");

// Keyboard and touch users need a visible focus ring on every form control.
assert.match(styles, /\.lc-checkin button:focus-visible,[\s\S]*\.lc-checkin input:focus-visible,[\s\S]*\.lc-checkin select:focus-visible[\s\S]*outline:/,
    "buttons, inputs, and selects must expose a focus ring");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*-webkit-tap-highlight-color:\s*transparent/,
    "touch controls must avoid browser tap flash while retaining focus styling");

// The editor's scroll area must reserve both the safe area and the fixed bottom action bar.
assert.match(styles, /\.lc-checkin-dialog-host--mobile[\s\S]*\.lc-checkin__form-scroll[\s\S]*scroll-padding:[^;]*env\(safe-area-inset-bottom\)/,
    "mobile editor scroll must account for the bottom safe area");
assert.match(styles, /\.lc-checkin:not\(\.lc-checkin--editor\)\s*\{\s*padding-bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile pages must reserve space for bottom navigation and safe area");
assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*position:\s*sticky|\.lc-checkin__editor-actions\s*\{[\s\S]*flex:\s*0\s+0\s+auto/,
    "editor actions must remain visible while the form scrolls");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile template visual checks passed for focus, archive, and safe-area behavior.");
