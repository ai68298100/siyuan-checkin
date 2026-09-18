const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "render", "today-bindings.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

assert.match(source, /export function bindItemContextMenuFor\(/, "Today cards expose a context-menu binding");
assert.match(source, /event\.pointerType !== "touch" && event\.pointerType !== "pen"/, "touch and pen pointers are eligible for long press");
assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*?520\)/, "long press waits long enough to avoid accidental activation");
assert.match(source, /Math\.hypot\(event\.clientX - longPressStartX, event\.clientY - longPressStartY\) > 10/, "pointer movement cancels a long press");
assert.match(source, /suppressContextMenuUntil = Date\.now\(\) \+ 800/, "native follow-up contextmenu is suppressed after long press");
assert.match(source, /Math\.min\(Math\.max\(margin, clientX\), maxX\)/, "menu is clamped to the horizontal viewport");
assert.match(source, /Math\.min\(Math\.max\(margin, clientY\), maxY\)/, "menu is clamped to the vertical viewport");
assert.match(source, /menu\.querySelector<HTMLElement>\("\[data-menu-action\]"\)\?\.focus\(\)/, "opening the menu moves focus to its first action");
assert.match(source, /event\.key === "Escape"[\s\S]*?closeMenus\(\)/, "Escape closes an open menu");
assert.match(styles, /\.lc-checkin__item-context-menu \{[\s\S]*?position: fixed;/, "context menu is positioned against the viewport");

console.log("Today context-menu checks passed.");
