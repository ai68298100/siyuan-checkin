const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

assert.match(source, /hostClass = this\.isMobileFrontend \? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile"/,
    "mobile dialog styling must be present in the initial Dialog content");
assert.match(source, /destroyCallback: \(\) => \{\s*if \(dialog\) this\.handleQuickDialogDestroyed\(dialog\);/,
    "the native dialog close button must use the shared cleanup path");
assert.match(source, /dialog\.destroy\(\);[\s\S]*this\.handleQuickDialogDestroyed\(dialog\);/,
    "programmatic close must retain a cleanup fallback");

const cleanup = source.match(/private handleQuickDialogDestroyed\(dialog: Dialog\) \{([\s\S]*?)\n    \}/)?.[1] || "";
assert.match(cleanup, /if \(this\.quickDialog !== dialog\) return;/, "dialog cleanup must be idempotent");
assert.match(cleanup, /this\.currentPage = "today";/, "closing the dialog must restore the shared view");
assert.match(cleanup, /void this\.reconcileStore\(\);/, "closing the dialog must reconcile persisted data");

assert.match(styles, /\.lc-checkin-dialog-host--mobile[\s\S]*overscroll-behavior: contain;/,
    "mobile dialog scrolling must stay inside the dialog");
assert.match(styles, /@supports \(height: 100dvh\)[\s\S]*height: calc\(100dvh - 16px\)/,
    "mobile dialog must follow the visual viewport when the keyboard opens");

console.log("mobile dialog lifecycle checks passed");
