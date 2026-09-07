const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/view-preferences.ts", "utf8");
assert.match(source, /normalizeViewPreferences/);
assert.match(source, /collapsedGroups/);
assert.match(source, /slice\(0, 200\)/);
console.log("View preference normalization structure checks passed.");
