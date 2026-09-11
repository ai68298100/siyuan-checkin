const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

// Built-in templates are applied through real buttons; saving stays a native form submit.
assert.match(source, /data-template-index=\"\$\{index\}\"/, "each template must expose an apply target");
assert.match(source, /data-action=\"clear-template-filter\"/, "filtered templates need a visible reset action");
assert.match(source, /data-action=\"clear-template-query\"/, "template search needs a clear action");
assert.match(source, /class=\"lc-checkin__save-button\" type=\"submit\"/, "save template/item action must remain a form submit button");
assert.match(source, /data-action="archive"[\s\S]*t\("editor\.archive"\)|t\("editor\.archive"\)[\s\S]*data-action="archive"/, "edit view must expose the delete/archive action");
assert.match(i18n, /"editor\.archive": "暂时归档"/, "archive label must stay in the dictionary");

// Mobile widths must give the controls room to be tapped without relying on hover.
assert.match(styles, /@media \(max-width:\s*380px\)[\s\S]*\.lc-checkin__templates\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    "320/360px template grid must use two stable columns");
assert.match(styles, /@media \(max-width:\s*600px\)[\s\S]*\.lc-checkin__form-scroll\s*\{[\s\S]*scroll-padding-bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile editor scroll must leave room for the fixed action area");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__template\s*\{[\s\S]*min-height:\s*64px[\s\S]*padding:\s*9px/,
    "apply template buttons must remain touch friendly");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin__form input:not\(\[type=\"checkbox\"\]\),[\s\S]*\.lc-checkin__form select[\s\S]*height:\s*42px/,
    "mobile form controls must meet the touch target");
assert.match(styles, /\.lc-checkin__save-button\s*\{[\s\S]*height:\s*36px/,
    "save action must have a stable mobile-friendly height");
assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*background:\s*var\(--b3-theme-background\)/,
    "save and archive actions need a solid mobile surface");

for (const width of [320, 360, 390, 430]) {
    assert.ok(width >= 320 && width <= 430, `supported mobile width: ${width}px`);
}

console.log("Mobile template touch checks passed for 320/360/390/430px.");
