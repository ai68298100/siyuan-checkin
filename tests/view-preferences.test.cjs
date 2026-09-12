const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/view-preferences.ts", "utf8");
assert.match(source, /groupMode: "none"/, "the first opening must remain ungrouped until the user changes it");
const plugin = fs.readFileSync("src/index.ts", "utf8");
assert.match(source, /normalizeViewPreferences/);
assert.match(source, /dialogSizeMode: DialogSizeMode/);
assert.ok(!source.includes("densityLabel") && !source.includes("nextDensity"),
    "the density preference must be fully retired");
assert.match(source, /showWeekStrip: source\.showWeekStrip === true/,
    "the week-strip preference defaults to off");
assert.match(source, /clampNumber\(source\.dialogScale, 50, 100,/, "dialog scale is clamped to 50–100%");
assert.match(source, /collapsedGroups/);
assert.match(source, /lastInsightsItemId/);
assert.match(source, /slice\(0, 200\)/);
assert.match(plugin, /async onDataChanged\(\)[\s\S]*VIEW_PREFERENCES_NAME/);
assert.match(plugin, /applyViewPreferences\(preferences\)/);
assert.match(plugin, /private quickDialogSize\(\)/, "the quick dialog follows stored size preferences");
console.log("View preference normalization structure checks passed.");
