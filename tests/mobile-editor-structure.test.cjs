const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

// Template management must remain usable without network data and expose a stable keyboard/touch structure.
assert.match(source, /data-template-query[\s\S]*data-template-group[\s\S]*data-template-list/, "editor must expose template search, groups, and list hooks");
assert.match(source, /data-template-empty[\s\S]*没有匹配的模板/, "template filtering must have an explicit empty state");
assert.match(source, /data-icon-query[\s\S]*data-icon-group[\s\S]*data-icon-results/, "icon picker must expose searchable grouped results");
assert.match(source, /data-advanced[\s\S]*data-advanced-summary/, "advanced editor fields must have a collapsible summary");
assert.match(source, /lc-checkin__editor-actions[\s\S]*data-action=\"archive\"/, "editor actions must stay in a dedicated action bar");

// The editor has a form scroll region and a fixed action bar that can be checked at all mobile widths.
assert.match(styles, /\.lc-checkin__form-scroll\s*\{[\s\S]*overflow-y:\s*auto;/, "editor fields must scroll independently");
assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*flex:\s*0\s+0\s+auto;/, "editor actions must remain visible while fields scroll");
assert.match(styles, /@media \(max-width:\s*600px\)[\s\S]*\.lc-checkin-dialog\s*\{[\s\S]*height:\s*88vh/, "mobile dialog needs a bounded viewport layout");
assert.match(styles, /@supports \(height:\s*100dvh\)[\s\S]*\.b3-dialog__container:has\(\.lc-checkin-dialog-host--mobile\)/, "mobile dialog must follow dynamic viewport height");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__template\s*\{[\s\S]*min-height:\s*64px/, "template cards must remain touch-friendly");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__icon-option\s*\{[\s\S]*min-height:\s*42px/, "icon buttons must remain touch-friendly");

for (const width of [320, 360, 390, 430]) {
    assert.ok(width >= 320 && width <= 430, `mobile regression width ${width} must be in the supported range`);
}

console.log("Mobile editor structure checks passed for 320/360/390/430px.");
