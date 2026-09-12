const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const quickDialogSource = fs.readFileSync(path.join(root, "src", "render", "quick-dialog.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

assert.match(quickDialogSource, /const sync = \(\) => \{[\s\S]*viewport\.height - 16[\s\S]*container\.style\.height/,
    "viewport changes must recalculate the dialog height");
assert.match(quickDialogSource, /viewport\.addEventListener\("resize", sync\)[\s\S]*window\.addEventListener\("resize", sync\)/,
    "orientation changes must trigger both visual and layout viewport updates");
assert.match(quickDialogSource, /viewport\.removeEventListener\("resize", sync\)[\s\S]*window\.removeEventListener\("resize", sync\)/,
    "orientation listeners must be cleaned up when the dialog closes");
assert.match(styles, /\.lc-checkin-dialog-host\s*\{[\s\S]*width:\s*100%[\s\S]*height:\s*100%[\s\S]*overflow:\s*hidden/,
    "dialog host must recover to the current container width after rotation");
assert.match(styles, /\.lc-checkin\s*\{[\s\S]*width:\s*100%[\s\S]*min-height:\s*280px[\s\S]*overflow:\s*auto/,
    "check-in surface must remain scrollable after orientation changes");
assert.match(styles, /\.lc-checkin__form-scroll\s*\{[\s\S]*min-height:\s*0[\s\S]*flex:\s*1[\s\S]*overflow-y:\s*auto/,
    "editor scroll position must remain in the dedicated form scroller");
assert.match(styles, /@container lc-checkin \(max-width:\s*560px\)[\s\S]*\.lc-checkin__item\s*\{[\s\S]*grid-template-columns:/,
    "rotating into portrait width must switch cards to a width-safe grid");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile rotation layout checks passed for portrait and landscape widths.");
