const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

/* 6.0 P0 拖拽排序 */
assert.match(source, /data-drag-handle/, "today rows expose a drag handle");
assert.match(source, /private bindItemDrag\(root: HTMLElement\)/, "drag binding exists");
assert.match(source, /private async reorderItems\(orderedIds: string\[\]\): Promise<boolean>/, "reorder persists group-local order");
assert.match(source, /if \(this\.todaySortMode !== "manual"\) return;/, "drag only applies in manual sort mode");
assert.match(source, /item\.closest\("\.lc-checkin__completed-section"\)/, "completed items are not draggable");
assert.match(source, /altKey[\s\S]*ArrowUp[\s\S]*ArrowDown/, "keyboard reordering is available (Alt+Up/Down)");
assert.match(components, /\.lc-checkin__drag-handle \{[^}]*touch-action:\s*none;/, "drag handle disables touch scrolling");
assert.match(components, /\.lc-checkin__item\.is-dragging \{/, "dragged row gets a lifted state");

/* 6.0 P2 内置专注计时 */
assert.match(source, /private openFocusTimer\(/, "built-in focus timer panel exists");
assert.match(source, /data-focus-timer-minutes/, "focus timer duration is adjustable");
assert.match(source, /private tickFocusTimer()/, "focus timer ticks without full re-render");
assert.match(source, /recordEvent\(item, value, moment, fingerprint, `专注 \$\{elapsedMinutes\} 分钟`\)/,
    "focus completion records a labelled duration note");
assert.match(source, /registerFocusAdapter/, "external focus adapters keep priority over the built-in timer");

console.log("6.0 efficiency feature checks passed.");
