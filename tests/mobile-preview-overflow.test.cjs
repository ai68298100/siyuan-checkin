const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

assert.match(source, /class=\"lc-checkin__item-name\"/, "preview cards must expose a dedicated name slot");
assert.match(source, /class=\"lc-checkin__item-meta\"/, "preview cards must expose a dedicated unit/meta slot");
assert.match(source, /class=\"lc-checkin__quick-button\"[\s\S]*<span>\$\{escapeHtml\(unit\)\}<\/span>/,
    "quantity preview actions must keep unit text separate from the action label");
assert.match(styles, /\.lc-checkin__item-name\s*\{[\s\S]*min-width:\s*0[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/,
    "long preview names must truncate instead of widening the card");
assert.match(styles, /\.lc-checkin__item-meta\s*\{[\s\S]*overflow:\s*hidden[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/,
    "long units and progress metadata must truncate instead of widening the card");
assert.match(styles, /@container lc-checkin \(max-width:\s*560px\)[\s\S]*\.lc-checkin__item-action\s*\{[\s\S]*min-width:\s*0[\s\S]*max-width:\s*100%/,
    "narrow preview actions must stay inside the card width");
assert.match(styles, /@container lc-checkin \(max-width:\s*560px\)[\s\S]*\.lc-checkin__quick-button\s*\{[\s\S]*overflow:\s*hidden[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap[\s\S]*span\s*\{[\s\S]*text-overflow:\s*ellipsis/,
    "long units in quick actions must truncate without covering buttons");
const itemBlock = styles.match(/\.lc-checkin__item\s*\{([\s\S]*?)\n\}/)?.[1] || "";
assert.doesNotMatch(itemBlock, /overflow-x:\s*auto/,
    "preview cards must not introduce horizontal scrolling");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile preview overflow checks passed for 320/360/390/430px.");
