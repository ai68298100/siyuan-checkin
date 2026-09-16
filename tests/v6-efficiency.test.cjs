const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const fragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const todayBindings = fs.readFileSync(path.join(root, "src", "render", "today-bindings.ts"), "utf8");
const focusTimer = fs.readFileSync(path.join(root, "src", "render", "focus-timer.ts"), "utf8");
const occasions = fs.readFileSync(path.join(root, "src", "render", "occasions.ts"), "utf8");
const bindOccasions = fs.readFileSync(path.join(root, "src", "render", "bind-occasions.ts"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

/* 6.0 P0 拖拽排序 */
assert.match(fragments, /data-drag-handle/, "today rows expose a drag handle");
assert.match(todayBindings, /export function bindItemDragFor\(/, "drag binding exists");
assert.match(source, /private async reorderItems\(orderedIds: string\[\]\): Promise<boolean>/, "reorder persists group-local order");
assert.match(todayBindings, /if \(host\.todaySortMode !== "manual"\) return;/, "drag only applies in manual sort mode");
assert.match(todayBindings, /item\.closest\("\.lc-checkin__completed-section"\)/, "completed items are not draggable");
assert.match(todayBindings, /altKey[\s\S]*ArrowUp[\s\S]*ArrowDown/, "keyboard reordering is available (Alt+Up/Down)");
assert.match(components, /\.lc-checkin__drag-handle \{[^}]*touch-action:\s*none;/, "drag handle disables touch scrolling");
assert.match(components, /\.lc-checkin__item\.is-dragging \{/, "dragged row gets a lifted state");

/* 6.0 P2 内置专注计时 */
assert.match(source, /private openFocusTimer\(/, "built-in focus timer panel exists");
assert.match(focusTimer, /data-focus-timer-minutes/, "focus timer duration is adjustable");
assert.match(source, /private tickFocusTimer()/, "focus timer ticks without full re-render");
assert.match(focusTimer, /recordEvent\(item, value, moment, fingerprint, `专注 \$\{elapsedMinutes\} 分钟`\)/,
    "focus completion records a labelled duration note");
assert.match(source, /registerFocusAdapter/, "external focus adapters remain available for the configured plugin timer");
const bindToday = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");
assert.match(bindToday, /focusTimerProvider === "docktomato"/, "the clock button must honor the configured Dock Tomato provider");
assert.match(bindToday, /focusPluginUnavailable/, "plugin mode must not silently fall back to the built-in timer");

console.log("6.0 efficiency feature checks passed.");

/* 6.0 P1 批量操作 */
assert.match(fragments, /data-action="toggle-bulk"/, "today exposes a bulk-select toggle");
assert.match(fragments, /data-bulk-check=/, "pending rows expose selection checkboxes");
assert.match(fragments, /data-action="bulk-complete"/, "bulk completion action exists");
assert.match(fragments, /data-action="bulk-archive"/, "bulk archive action exists");
assert.match(fragments, /bulk-all/, "select-all-pending action exists");

/* 6.0 P3 日期事项 → 打卡项联动 */
assert.match(occasions, /data-occasion-toitem/, "occasion rows can generate a check-in item");
assert.match(source, /private async createOccasionLinkedItem\(/, "linked item creation exists");
assert.match(source, /linkedOccasionId: occasion\.id/, "generated item links back to the occasion");
assert.match(source, /archivePeriods: \[\{startDate: "0000-01-01", endDate: occurrence\}, \{startDate: dayAfter\}\]/,
    "generated item is visible only on the occurrence date");
assert.match(source, /linkedOccasionId && isComplete\(this\.store, current, actionDate\)/,
    "completing the generated item resolves the occasion");
assert.match(bindOccasions, /host\.createOccasionLinkedItem/, "occasion action invokes linked item creation");

/* 数据模型 */
const model = fs.readFileSync(path.join(root, "src", "model.ts"), "utf8");
assert.match(model, /linkedOccasionId: typeof value\.linkedOccasionId === "string"/, "model normalizes the linkage field");
const types = fs.readFileSync(path.join(root, "src", "types.ts"), "utf8");
assert.match(types, /linkedOccasionId\?: string;/, "CheckinItem declares the linkage field");
