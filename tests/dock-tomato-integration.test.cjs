const assert = require("node:assert/strict");
const fs = require("node:fs");

const bridge = fs.readFileSync("src/dock-tomato.ts", "utf8");
const preferences = fs.readFileSync("src/view-preferences.ts", "utf8");
const settings = fs.readFileSync("src/render/settings.ts", "utf8");
const focus = fs.readFileSync("src/render/focus-adapter.ts", "utf8");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");

assert.match(bridge, /version !== 1/, "unknown Dock Tomato API versions must be rejected");
assert.match(bridge, /\["status", "start", "pause", "completion-event"\]/, "declared capabilities must be negotiated when present");
assert.match(bridge, /tomato:focus-api-availability-changed/, "either plugin load order must be supported");
assert.match(bridge, /tomato:focus-session-completed/, "durable completion events must be consumed");
assert.match(bridge, /externalRef: `docktomato:\$\{identity\}`/, "session identity must make retries idempotent");
assert.match(bridge, /item\.unit === "小时" \? durationMinutes \/ 60 : durationMinutes/, "minutes must convert to hour-based items");
assert.match(bridge, /item\.tomatoMode === "sessions"\) return 1/, "session-mode items must record one completion");
assert.match(bridge, /durationMinutes > 1440/, "implausible forged durations must be rejected");
assert.match(bridge, /Ignore forged or accessor-based cross-plugin events/, "malformed external events must not escape the listener");
assert.match(bridge, /removeEventListener\(DOCK_TOMATO_COMPLETED_EVENT/, "plugin unload must remove completion listeners");
assert.match(bridge, /releaseWhenIdle\(remaining - 1\), 250/, "adapter state must only release after Dock Tomato becomes idle");
assert.match(bridge, /tomato:focus-ended/, "manual completion or abandonment must also release the adapter state");
assert.match(preferences, /source\.focusTimerProvider === "plugin" \? "docktomato"/, "the legacy generic provider must migrate safely");
assert.match(settings, /option value="docktomato"/, "settings must expose only the named Dock Tomato provider");
assert.match(focus, /if \(adapterId\)[\s\S]*host\.focusAdapters\.get\(adapterId\)/, "named focus routing must not pick an unrelated adapter");
assert.match(bridge, /id: DOCK_TOMATO_ADAPTER_ID/, "the built-in Dock Tomato bridge must register the exact provider id");
assert.match(i18n, /底栏番茄钟插件/, "the selected provider must be explicit to users");

console.log("Dock Tomato integration contract checks passed.");
