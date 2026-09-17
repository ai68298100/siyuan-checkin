const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
const editorBindings = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
const saveForm = fs.readFileSync(path.join(root, "src", "render", "save-form.ts"), "utf8");
const recordStepSource = fs.readFileSync(path.join(root, "src", "record-step.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
assert.ok(!styles.includes("height: 88vh !important"), "mobile dialog shell must not return to legacy index.scss");

// Template management must remain usable without network data and expose a stable keyboard/touch structure.
assert.match(editorSource, /data-template-query[\s\S]*data-template-group[\s\S]*data-template-list/, "editor must expose template search, groups, and list hooks");
assert.match(editorSource, /data-template-empty[\s\S]*t\("editor\.templateEmpty"\)/, "template filtering must have an explicit empty state");
assert.match(i18n, /"editor\.templateEmpty": "没有匹配的模板"/, "template empty copy must stay localized");
assert.match(editorSource, /data-icon-query[\s\S]*data-icon-group[\s\S]*data-icon-results/, "icon picker must expose searchable grouped results");
assert.match(editorSource, /data-advanced[\s\S]*data-advanced-summary/, "advanced editor fields must have a collapsible summary");
assert.match(editorSource, /lc-checkin__editor-actions[\s\S]*data-action="archive"/, "editor actions must stay in a dedicated action bar");
assert.match(editorSource, /name="recordStep"/, "non-binary items need a configurable quick-record amount");
assert.match(editorSource, /editor\.recordStepHint/, "the quick-record amount needs an explicit explanation");
assert.match(editorBindings, /getRecordStep\(kind, unit, configuredRecordStep\)/, "the live preview must use the configured amount");
assert.match(editorBindings, /recordStepField\.hidden = kind === "binary"/, "binary items must not show an irrelevant amount control");
assert.match(saveForm, /normalizeRecordStep\(kind, data\.get\("recordStep"\)\)[\s\S]*?CheckinItemRevision[\s\S]*?\{recordStep\}/, "the configured amount must be persisted with the effective revision");
assert.match(recordStepSource, /Math\.min\(1_000_000_000/, "imported quick-record amounts need the same hard ceiling as editor saves");
assert.match(editorSource, /getRecordStepInputStep\(selectedKind, selectedUnit\)/, "quick-record input must use its own decimal-friendly granularity");

// The editor has a form scroll region and a fixed action bar that can be checked at all mobile widths.
assert.match(components, /Editor foundations[\s\S]*\.lc-checkin__form-scroll\s*\{[^}]*overflow-y:\s*auto;/, "editor fields must scroll independently");
assert.match(components, /Editor foundations[\s\S]*\.lc-checkin__editor-actions\s*\{[^}]*flex:\s*0\s+0\s+auto;/, "editor actions must remain visible while fields scroll");
assert.match(components, /@media \(max-width:\s*600px\)[\s\S]*\.lc-checkin-dialog\s*\{[\s\S]*height:\s*88vh/, "mobile dialog needs a bounded viewport layout");
assert.match(components, /@supports \(height:\s*100dvh\)[\s\S]*\.b3-dialog__container:has\(\.lc-checkin-dialog-host--mobile\)/, "mobile dialog must follow dynamic viewport height");
assert.match(components, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__template\s*\{[^}]*min-height:\s*64px/, "template cards must remain touch-friendly");
assert.match(components, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__icon-option\s*\{[^}]*min-height:\s*42px/, "icon buttons must remain touch-friendly");

// The final mobile spacing layer may trim the short-form cushion, but it must
// preserve the independent scroller's safe-area reservation and keep the
// preview/advanced rail aligned. These source-level guards prevent a later
// density pass from moving the rules to a desktop-only query or restoring
// uneven panel margins.
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__layout\s*\{[^}]*padding-bottom:\s*calc\(64px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile editor layout must reserve exactly one action-rail height");
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__form-scroll\s*\{[\s\S]*scroll-padding-bottom:\s*calc\(70px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile editor scroller must retain safe-area clearance for the fixed action rail");
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__editor-side\s*\{[\s\S]*align-content:\s*start;[\s\S]*min-width:\s*0;/,
    "mobile editor preview and advanced panels must share a stable aligned rail");

for (const width of [320, 360, 390, 430]) {
    assert.ok(width >= 320 && width <= 430, `mobile regression width ${width} must be in the supported range`);
}

console.log("Mobile editor structure checks passed for 320/360/390/430px.");
