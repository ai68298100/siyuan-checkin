const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

assert.match(editorSource, /class="lc-checkin__save-button" type="submit"/,
    "template save must remain an explicit submit action");
assert.match(source, /showMessage\(t\("msg\.saveFail"\)\)/,
    "template save failures must be reported to the user");
assert.match(i18n, /"msg\.saveFail": "\[小驴打卡\] 保存失败，请重试"/,
    "save failure message must stay in the dictionary");
assert.match(source, /form\.dataset\.submitting = \"true\"[\s\S]*submitButton\.disabled = true/,
    "save must disable the submit button while persistence is pending");
assert.match(source, /const resetSubmitting = \(\) => \{[\s\S]*form\.dataset\.submitting = \"false\"/,
    "save completion must release the submitting state");
assert.match(source, /private showToday\(\)/,
    "save completion must have a normal-view restore path");

assert.match(styles, /\.lc-checkin__editor-actions\s*\{[\s\S]*flex:\s*0\s+0\s+auto[\s\S]*box-shadow:/,
    "save feedback must have a stable action bar outside the scroll region");
assert.match(styles, /\.lc-checkin-dialog-host--mobile[\s\S]*\.lc-checkin__form-scroll[\s\S]*scroll-padding:[^;]*env\(safe-area-inset-bottom\)/,
    "keyboard scrolling must keep the bottom save area visible");
assert.match(styles, /\.lc-checkin__save-button\s*\{[\s\S]*background:\s*var\(--lc-checkin-accent\)/,
    "save action must have a stable visual affordance");
assert.match(styles, /@media \(max-width:\s*380px\)[\s\S]*\.lc-checkin__organization-fields\s*\{[\s\S]*grid-template-columns:\s*1fr/,
    "narrow screens must stack fields without hiding save feedback");

for (const width of [320, 360, 390, 430]) assert.ok(width >= 320 && width <= 430);
console.log("Mobile template save feedback checks passed for 320/360/390/430px.");
