const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");

assert.match(styles, /\.lc-checkin\s*\{[\s\S]*container-name:\s*lc-checkin;[\s\S]*container-type:\s*inline-size;/,
    "each check-in surface must expose its own inline-size container");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*560px\)[\s\S]*\.lc-checkin__item\s*\{[\s\S]*display:\s*grid;/,
    "narrow surfaces must switch item cards to a width-safe grid");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*560px\)[\s\S]*\.lc-checkin__item-topline\s*\{[\s\S]*flex-wrap:\s*wrap;/,
    "item names and controls must be allowed to wrap in narrow docks");
assert.match(styles, /\.lc-checkin__item-name\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-width:\s*0;/,
    "item names must retain a shrinkable flex slot");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*360px\)/,
    "very narrow surfaces need a second compact layout tier");
assert.match(styles, /\.lc-checkin__item-body\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow:\s*hidden;/,
    "item bodies must stay shrinkable inside narrow docks");
assert.match(styles, /\.lc-checkin__item-tag\s*\{[\s\S]*max-width:\s*32%;[\s\S]*text-overflow:\s*ellipsis;/,
    "metadata tags must not consume the item name slot");
assert.match(styles, /\.lc-checkin__custom-range\s*\{[\s\S]*display:\s*flex;/,
    "custom summary dates need a compact responsive control");

console.log("Responsive surface layout checks passed.");
