const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const bindEditorSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
const bindPageNavSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const quickDialogSource = fs.readFileSync(path.join(root, "src", "render", "quick-dialog.ts"), "utf8");
const pluginOpsSource = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");
const v5Components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

assert.match(quickDialogSource, /hostClass = mobile \? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile"/,
    "mobile dialog styling must be present in the initial Dialog content");
assert.match(quickDialogSource, /destroyCallback: \(\) => \{\s*if \(dialog\) handleQuickDialogDestroyedFor\(host, dialog\);/,
    "the native dialog close button must use the shared cleanup path");
assert.match(quickDialogSource, /dialog\.destroy\(\);[\s\S]*handleQuickDialogDestroyedFor\(host, dialog\);/,
    "programmatic close must retain a cleanup fallback");

const cleanup = quickDialogSource.match(/export function handleQuickDialogDestroyedFor\(host: QuickDialogHost, dialog: Dialog\): void \{([\s\S]*?)\n\}/)?.[1] || "";
assert.match(cleanup, /if \(host\.quickDialog !== dialog\) return;/, "dialog cleanup must be idempotent");
assert.match(cleanup, /host\.currentPage = "today";/, "closing the dialog must restore the shared view");
assert.match(cleanup, /void host\.reconcileStore\(\);/, "closing the dialog must reconcile persisted data");
assert.match(source, /data-action=\\?"close-dialog\\?"/,
    "the dialog content must expose an explicit close action");
assert.match(pluginOpsSource, /export function bindDialogCloseFor\(host: PluginOpsHost, root: HTMLElement\): void \{[\s\S]*host\.closeQuickDialog\(\)/,
    "the explicit close action must use the shared close path");
assert.match(quickDialogSource, /export function bindQuickDialogViewportFor\(host: QuickDialogHost, dialog: Dialog\): void \{[\s\S]*visualViewport/,
    "mobile dialogs must bind to visual viewport changes");
assert.match(quickDialogSource, /viewport\.addEventListener\("resize", sync\)[\s\S]*viewport\.addEventListener\("scroll", sync\)/,
    "keyboard and rotation viewport changes must trigger a size sync");
assert.match(quickDialogSource, /host\.quickDialogViewportCleanup\?\.\(\);[\s\S]*host\.quickDialogViewportCleanup = undefined;/,
    "viewport listeners must be removed when the dialog closes");
assert.match(bindEditorSource, /scrollIntoView\(\{behavior: "smooth", block: "center"/,
    "editor actions should keep the active control visible on mobile");
assert.match(source, /private bindQuickKeyboard\(root: HTMLElement\)/,
    "quick dialog must provide keyboard recording shortcuts");
const todayBindingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "today-bindings.ts"), "utf8");
assert.match(todayBindingsSource, /root\.dataset\.quickKeyboardBound === "true"/,
    "quick dialog keyboard binding must remain idempotent across rerenders");
assert.doesNotMatch(source, /\["archived", t\("nav\.archived"\), "archive"\]/, "archived must remain nested under Review");
const iconsSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "icons.ts"), "utf8");
assert.match(iconsSource, /const UI_ICON_PATHS[\s\S]*home:[\s\S]*insight:/, "navigation icons must use shared vector icons");
for (const destination of ["review", "occasions", "settings"]) assert.match(source, new RegExp(`\\[\\"${destination}\\",`));
assert.match(source, /buttons\.slice\(0, 2\)[\s\S]*?\$\{add\}[\s\S]*?buttons\.slice\(2\)/, "mobile navigation must center the add action");
assert.doesNotMatch(source, /currentPage !== "editor" && !root\.querySelector\("\.lc-checkin__mobile-nav"\)/, "editor must retain bottom navigation");
assert.match(pluginOpsSource, /else if \(page === "review" \|\| page === "history" \|\| page === "summary"\) host\.showReview\(\)/, "legacy review routes remain supported");
assert.match(bindPageNavSource, /data-history-insights-id/,
    "history records should link directly to item insights");
assert.match(source, /revision\.schedule\.type === "quota" && revision\.schedule\.quota\?\.countMode === "dates"/,
    "date quotas must record one qualifying day at a time");
assert.match(fragmentsSource, /toLocaleTimeString\(getPluginLocale\(\), \{hour: "2-digit", minute: "2-digit"\}\)/,
    "review records should expose the record time");
assert.match(reviewSource, /t\(`source\.\$\{event\.source\}`\)/,
    "review records should expose the record source");
assert.match(source, /progress: getProgress\(this\.store, current, actionDate\)/,
    "record feedback should expose current progress");

assert.match(styles, /\.lc-checkin-dialog-host--mobile[\s\S]*overscroll-behavior: contain;/,
    "mobile dialog scrolling must stay inside the dialog");
assert.match(styles, /@supports \(height: 100dvh\)[\s\S]*height: calc\(100dvh - 16px\)/,
    "mobile dialog must follow the visual viewport when the keyboard opens");
assert.match(styles, /\.lc-checkin-dialog-host--mobile \.lc-checkin__dialog-close[\s\S]*width: 38px[\s\S]*height: 38px/,
    "mobile dialog close action must meet a touch-friendly target size");
assert.match(v5Components, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\) !important/,
    "mobile navigation must fit four destinations around the central add action");
assert.match(source, /saveState: "idle" \| "saving" \| "error"/,
    "save state must be explicit for low-network feedback");
assert.match(i18nSource, /"msg\.saving":\s*"[^"]+"/,
    "saving state must be visible to users");
assert.match(fragmentsSource, /data-action=\"retry-save\"/,
    "save failure must expose a retry action");
assert.match(source, /private renderSaveStatus\(\): string/,
    "save feedback should be shared by today and editor surfaces");
assert.match(i18nSource, /"msg\.syncedElsewhere":\s*"[^"]+"/,
    "multi-window merges should expose a transient sync notice");
assert.match(source, /private showSyncNotice\(\)/,
    "sync notices should have an expiring lifecycle");
assert.match(styles, /\.lc-checkin--editor \.lc-checkin__editor-actions[\s\S]*env\(safe-area-inset-bottom\)/,
    "mobile editor actions must clear the device safe area");

console.log("mobile dialog lifecycle checks passed");

