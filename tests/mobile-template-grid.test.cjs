const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

assert.match(styles, /\.lc-checkin__templates\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/,
    "normal editor widths must use a stable three-column template grid");
assert.match(styles, /@media \(max-width:\s*380px\)[\s\S]*\.lc-checkin__templates\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/,
    "320/360px widths must switch templates to two columns");
assert.match(styles, /@media \(max-width:\s*340px\)[\s\S]*\.lc-checkin__templates\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "320px widths must degrade templates to one column");
assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__template\s*\{[\s\S]*min-height:\s*64px/,
    "template cards must retain a stable touch height");
assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
    "save and delete actions must remain stacked instead of reflowing into the template grid");
assert.match(source, /data-action=\"archive\"[\s\S]*暂时归档/,
    "delete/archive action must remain present after template application");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile template grid checks passed for 320/360/390/430px.");
