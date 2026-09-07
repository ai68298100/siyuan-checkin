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
assert.match(source, /data-action=\\?"close-dialog\\?"/,
    "the dialog content must expose an explicit close action");
assert.match(source, /private bindDialogClose\(root: HTMLElement\)[\s\S]*this\.closeQuickDialog\(\)/,
    "the explicit close action must use the shared close path");
assert.match(source, /private bindQuickDialogViewport\(dialog: Dialog\)[\s\S]*visualViewport/,
    "mobile dialogs must bind to visual viewport changes");
assert.match(source, /viewport\.addEventListener\("resize", sync\)[\s\S]*viewport\.addEventListener\("scroll", sync\)/,
    "keyboard and rotation viewport changes must trigger a size sync");
assert.match(source, /this\.quickDialogViewportCleanup\?\.\(\);[\s\S]*this\.quickDialogViewportCleanup = undefined;/,
    "viewport listeners must be removed when the dialog closes");
assert.match(source, /scrollIntoView\(\{behavior: "smooth", block: "center"/,
    "editor actions should keep the active control visible on mobile");
assert.match(source, /private bindQuickKeyboard\(root: HTMLElement\)/,
    "quick dialog must provide keyboard recording shortcuts");
assert.match(source, /root\.dataset\.quickKeyboardBound === "true"/,
    "quick dialog keyboard binding must remain idempotent across rerenders");
assert.match(source, /data-quick-recent/,
    "quick dialog must expose recently recorded items");
assert.match(source, /private renderQuickRecent\(\): string/,
    "recent records must be rendered through a dedicated section");

assert.match(styles, /\.lc-checkin-dialog-host--mobile[\s\S]*overscroll-behavior: contain;/,
    "mobile dialog scrolling must stay inside the dialog");
assert.match(styles, /@supports \(height: 100dvh\)[\s\S]*height: calc\(100dvh - 16px\)/,
    "mobile dialog must follow the visual viewport when the keyboard opens");
assert.match(styles, /\.lc-checkin-dialog-host--mobile \.lc-checkin__dialog-close[\s\S]*width: 38px[\s\S]*height: 38px/,
    "mobile dialog close action must meet a touch-friendly target size");
assert.match(styles, /\.lc-checkin__quick-recent-list/,
    "recent records need a responsive layout");

console.log("mobile dialog lifecycle checks passed");
