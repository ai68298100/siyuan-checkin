const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const plugin = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const browserEntry = fs.readFileSync(path.join(root, "tests", "mobile-visual-browser.cjs"), "utf8");

assert.equal(manifest.version, packageJson.version, "plugin and package versions must match");
assert.ok(fs.existsSync(path.join(root, manifest.icon)), "manifest icon must exist");
if (manifest.preview) assert.ok(fs.existsSync(path.join(root, manifest.preview)), "manifest preview must exist");
assert.match(packageJson.scripts["test:mobile:visual"], /test:mobile/,
    "mobile visual regression must be part of the release scripts");
assert.match(packageJson.scripts["test:mobile:visual:browser"], /mobile-visual-browser/,
    "browser visual entry must be discoverable from package scripts");
assert.match(browserEntry, /CHECKIN_QA_HARNESS/,
    "browser visual entry must support an explicit QA harness path");
assert.match(browserEntry, /CHECKIN_QA_PROJECT_ROOT/,
    "browser visual entry must pass the current worktree to the QA harness");
assert.match(browserEntry, /spawnSync\(process\.execPath/,
    "browser visual entry must execute the maintained QA harness");
assert.match(packageJson.scripts["test:ui"], /responsive-layout\.test\.cjs/,
    "4.0 UI verification must be discoverable from package scripts");

assert.match(styles, /@media \(hover:\s*none\), \(pointer:\s*coarse\)/,
    "release must include a touch-specific layout tier");
assert.match(styles, /env\(safe-area-inset-bottom\)/,
    "release must include bottom safe-area handling");
assert.match(styles, /:focus-visible/,
    "release must include keyboard-visible focus styling");
assert.match(styles, /overflow-x:\s*hidden|touch-action:\s*pan-y/,
    "release must guard against horizontal touch overflow");
assert.match(components, /height:\s*calc\(38px \+ env\(safe-area-inset-top\)\)/,
    "mobile top bar must stay compact while accounting for the safe-area inset");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin__mobile-topbar[\s\S]*?box-sizing:\s*border-box;/,
    "mobile top bar must include padding inside its measured height");
assert.match(components, /\.lc-checkin-dialog-host--mobile > \.lc-checkin__mobile-topbar[\s\S]*?background:\s*var\(--lc-checkin-bg\)/,
    "mobile top bar must share the canvas background instead of an unrelated color");
assert.match(plugin, /root\.dataset\.appearance\s*=\s*appearance/,
    "window host must carry the resolved independent appearance");
assert.match(plugin, /this\.syncHostThemeTokens\(root, surface\)/,
    "window-level chrome must inherit the surface theme tokens");
assert.match(plugin, /hostThemeSignatures = new WeakMap<HTMLElement, string>/,
    "theme token synchronization should be cached per host surface");
assert.match(plugin, /if \(this\.hostThemeSignatures\.get\(root\) === signature\) return/,
    "unchanged appearance and palette should skip repeated computed-style work");
assert.match(plugin, /class=\"lc-checkin__mobile-topbar\" data-appearance=\"\$\{this\.resolvedAppearance\(\)\}\"/,
    "mobile top bar must expose its resolved appearance for deterministic styling");
assert.match(styles, /@container lc5 \(max-width: 380px\)/,
    "sub-380px content layout should respond to the surface container width");
assert.match(styles, /@container lc5 \(max-width: 360px\)/,
    "sub-360px content density should respond to the surface container width");
assert.match(components, /@container lc-dock \(max-width: 719px\)/,
    "dock must have a dedicated narrow-container layout tier");
assert.match(components, /@container lc-dock \(max-width: 320px\)/,
    "dock must guard ultra-narrow widths");
assert.match(components, /grid-column: 1 \/ -1/,
    "dock card actions must occupy a dedicated row");
assert.match(components, /scroll-padding-bottom: 16px/,
    "dock content must preserve bottom scroll safety space");

console.log("Mobile release quality checks passed.");
