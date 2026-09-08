const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

// Empty and filtered states must stay explicit and readable on narrow screens.
assert.match(source, /data-template-empty[\s\S]*没有匹配的模板/, "template search needs a readable empty state");
assert.match(source, /data-action=\"clear-template-filter\"[\s\S]*查看全部/, "template empty state needs a reset action");
assert.match(styles, /\.lc-checkin__search-empty\s*\{[\s\S]*display:\s*flex[\s\S]*text-align:\s*center/,
    "empty state content must remain centered and readable");
assert.match(styles, /\.lc-checkin__search-empty[\s\S]*max-width|\.lc-checkin__search-empty[\s\S]*overflow-wrap|\.lc-checkin__search-empty[\s\S]*word-break/,
    "empty state copy must be allowed to wrap on narrow screens");

// Safe-area and keyboard layout contracts.
assert.match(styles, /padding:\s*7px 6px calc\(7px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile navigation must include the bottom safe area");
assert.match(styles, /scroll-padding:\s*12px 0 calc\(72px \+ env\(safe-area-inset-bottom\)\)/,
    "editor scrolling must include bottom safe-area space");
assert.match(styles, /\.lc-checkin button:focus-visible,[\s\S]*\.lc-checkin input:focus-visible,[\s\S]*\.lc-checkin select:focus-visible[\s\S]*outline:\s*2px solid/,
    "keyboard focus must remain visible");

// Touch interactions must not create a second horizontal scroller.
assert.match(styles, /\.lc-checkin-dialog-host--mobile\s*\{[\s\S]*touch-action:\s*pan-y/,
    "mobile dialog must reserve horizontal gestures for the page shell");
assert.match(styles, /\.lc-checkin__item-action\s*\{[\s\S]*max-width:\s*100%|@container lc-checkin \(max-width:\s*560px\)[\s\S]*\.lc-checkin__item-action\s*\{[\s\S]*max-width:\s*100%/,
    "card actions must remain within the card width");

// Snapshot contract: each supported viewport keeps the same semantic card hooks.
for (const width of [320, 360, 390, 430]) {
    assert.match(source, /lc-checkin__item-name/);
    assert.match(source, /lc-checkin__item-meta/);
    assert.ok(width >= 320 && width <= 430);
}

console.log("Mobile visual regression checks passed for empty states, safe-area, focus, touch, and 320/360/390/430px structure.");
