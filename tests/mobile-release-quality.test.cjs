const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");

assert.equal(manifest.version, packageJson.version, "plugin and package versions must match");
assert.ok(fs.existsSync(path.join(root, manifest.icon)), "manifest icon must exist");
if (manifest.preview) assert.ok(fs.existsSync(path.join(root, manifest.preview)), "manifest preview must exist");
assert.match(packageJson.scripts["test:mobile:visual"], /test:mobile/,
    "mobile visual regression must be part of the release scripts");
assert.match(packageJson.scripts["test:mobile:visual:browser"], /mobile-visual-browser/,
    "browser visual entry must be discoverable from package scripts");
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

console.log("Mobile release quality checks passed.");
