const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const fragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const todayBindings = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");

assert.doesNotMatch(fragments, /state === "saving"[\s\S]{0,180}lc-checkin__save-status is-saving/, "saving must not insert a layout-shifting block");
assert.match(fragments, /state === "error"[\s\S]{0,180}role="alert"/, "save errors remain visible and retryable");
assert.match(fragments, /lc-checkin__item-secondary-action/, "secondary actions should not truncate the item title");

assert.match(indexSource, /this\.recentRecordTimer = window\.setTimeout\([\s\S]*?\}, 2600\);/, "check-in feedback should dismiss quickly");
assert.match(fragments, /<main class="lc-checkin__list">[\s\S]*?<\/main>\s*\$\{recentRecord\}/, "check-in feedback must render after the list, not in the mobile header flow");
assert.equal((fragments.match(/\$\{recentRecord\}/g) || []).length, 1, "check-in feedback must render exactly once");
assert.match(indexSource, /surface\?\.querySelector<HTMLElement>\("\.lc-checkin__recent-record"\)[\s\S]*?root\.appendChild\(recentRecordToast\)/, "check-in feedback must be hoisted to the plugin window host");
assert.match(indexSource, /private renderTodayItemLocally\(itemId: string, localDate\?: string\): boolean/, "Today updates should have a conservative local-render path");
assert.match(indexSource, /if \(localDate && localDate !== dateKey\(date\)\) return false/, "cross-day updates must fall back to a full Today projection");
assert.match(indexSource, /if \(this\.pendingOnly && complete\) return false/, "pending-only completion must not remove a card before every surface is validated");
assert.match(indexSource, /if \(currentComplete !== complete \|\| currentInCompleted !== nextInCompleted\) return false/, "completion section transitions must use an atomic full render");
assert.match(indexSource, /structuralSelectors\.some\(\(selector\) => has\(card, selector\) !== has\(next, selector\)\)/, "structural card changes must not use a stale local patch");
assert.match(indexSource, /pendingLocalItemId = current\.id[\s\S]*?renderBackgroundUpdate\(\)/, "successful records should request a local card refresh");
assert.match(indexSource, /broadcast\(\{type: "analytics-updated"/);
assert.match(indexSource, /renderTodayItemLocally\(localItemId, localItemDate\)[\s\S]*?renderBackgroundUpdateFor/, "local refresh should fall back to the full render when unsafe");
assert.match(indexSource, /card\.className = next\.className/, "same-shape state classes should update the existing card in place");
assert.match(indexSource, /updateTodayWeekStrip\(surface, date\)/, "local completion refresh should update the week strip without rebuilding Today");
assert.match(indexSource, /count\.innerHTML =/, "local completion refresh should update the header counter");
assert.match(fragments, /export function renderRecentRecordView\(/, "window toast markup should be reusable by local updates");
assert.match(components, /\.lc-checkin-dialog-host,[\s\S]*?\.lc-checkin-tab-host,[\s\S]*?\.lc-checkin-dock-host \{ position: relative; \}/, "every plugin surface must bound the toast position");
assert.match(components, /\.lc-checkin__recent-record \{[\s\S]*?position: absolute;[\s\S]*?bottom: 18px;[\s\S]*?width: min\(360px, calc\(100% - 24px\)\);[\s\S]*?animation: lc-checkin-toast-in 120ms ease-out both;/, "check-in feedback should be a compact toast bounded by the plugin window");
assert.match(components, /@keyframes lc-checkin-toast-in[\s\S]*?translate\(-50%, 4px\)[\s\S]*?translate\(-50%, 0\)/, "check-in feedback animation should be subtle");
assert.match(components, /prefers-reduced-motion: reduce[\s\S]*?animation: none;/, "check-in feedback must respect reduced motion");
assert.match(fragments, /completed-section" aria-expanded="\$\{!ctx\.completedCollapsed\}"/, "completed section must expose its expanded state");
assert.match(todayBindings, /items\?\.toggleAttribute\("hidden", host\.completedCollapsed\)/, "completed cards must collapse immediately on the active mobile surface");
assert.match(todayBindings, /toggle\.setAttribute\("aria-expanded", String\(!host\.completedCollapsed\)\)/, "completed toggle accessibility state must update without a full render");
assert.doesNotMatch(todayBindings, /toggle-completed'[\s\S]{0,700}host\.render\(\)/, "completed collapse must not depend on a layout-shifting full render");
assert.doesNotMatch(fragments, /revision\.recordStep\s*\?\?\s*item\.recordStep/, "historical cards must not borrow the current quick-record amount");
assert.match(fragments, /getRecordStep\(revision\.kind, revision\.unit, revision\.recordStep\)/, "cards must use the amount effective on their rendered date");

console.log("Check-in toast checks passed.");
