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
/* T-106 打卡振动：偏好字段、归一化与绑定链路必须成套存在 */
assert.match(source, /hapticFeedback: true/, "haptic feedback defaults to on");
assert.match(source, /typeof source\.hapticFeedback === "boolean"/, "haptic feedback must be normalized from stored prefs");
assert.match(source, /focusTimerProvider: "builtin"/, "focus timer provider defaults to the built-in timer");
assert.match(source, /source\.focusTimerProvider === "plugin" \? "docktomato"/, "legacy generic plugin preference migrates to Dock Tomato");
assert.match(source, /\["builtin", "docktomato"\]/, "only the built-in timer and Dock Tomato are selectable providers");
assert.match(source, /FOCUS_TIMER_PROVIDERS/, "focus timer provider must be normalized");
const bindToday = fs.readFileSync("src/render/bind-today.ts", "utf8");
assert.match(bindToday, /pulseHaptic\(\): void;/, "the today host must expose the haptic pulse");
assert.ok((bindToday.match(/host\.pulseHaptic\(\)/g) || []).length >= 3, "record tap sites must pulse the haptic");
const settingsSource2 = fs.readFileSync("src/render/settings.ts", "utf8");
assert.match(settingsSource2, /data-setting-haptic/, "settings must expose the haptic toggle");
assert.match(settingsSource2, /data-setting-focus-timer/, "settings must expose the focus timer provider");
assert.match(plugin, /pulseHaptic\(\): void/, "the plugin must implement the haptic pulse");
assert.match(plugin, /async onDataChanged\(\)[\s\S]*VIEW_PREFERENCES_NAME/);
assert.match(plugin, /applyViewPreferences\(preferences\)/);
assert.match(plugin, /private quickDialogSize\(\)/, "the quick dialog follows stored size preferences");
console.log("View preference normalization structure checks passed.");
