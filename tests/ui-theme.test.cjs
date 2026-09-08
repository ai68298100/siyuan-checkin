const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
assert.match(styles, /--lc-checkin-control-height:\s*36px/);
assert.match(styles, /--lc-checkin-muted-surface:/);
assert.match(styles, /--lc-checkin-shadow:/);
assert.match(styles, /\.lc-checkin__organize[\s\S]*background:\s*var\(--lc-checkin-muted-surface\)/);
assert.match(styles, /\.lc-checkin__item[\s\S]*box-shadow:\s*var\(--lc-checkin-shadow\)/);
assert.match(styles, /@container\s+lc-checkin\s+\(min-width:\s*720px\)[\s\S]*\.lc-checkin__form-scroll[\s\S]*grid-template-columns/);
assert.match(styles, /@container\s+lc-checkin\s+\(max-width:\s*440px\)[\s\S]*\.lc-checkin__item-name[\s\S]*overflow-wrap:\s*anywhere/);
assert.match(styles, /@container\s+lc-checkin\s+\(max-width:\s*340px\)/);
assert.match(styles, /backdrop-filter:\s*blur\(12px\)/);
console.log("Modern responsive UI theme checks passed.");
