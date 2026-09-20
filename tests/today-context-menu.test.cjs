const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "render", "today-bindings.ts"), "utf8");
const index = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const fragments = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");

assert.match(source, /export function bindItemContextMenuFor\(/, "Today cards expose a context-menu binding");
assert.match(source, /event\.pointerType !== "touch" && event\.pointerType !== "pen"/, "touch and pen pointers are eligible for long press");
assert.match(source, /window\.setTimeout\(\(\) => \{[\s\S]*?520\)/, "long press waits long enough to avoid accidental activation");
assert.match(source, /Math\.hypot\(event\.clientX - longPressStartX, event\.clientY - longPressStartY\) > 10/, "pointer movement cancels a long press");
assert.match(source, /suppressContextMenuUntil = Date\.now\(\) \+ 800/, "native follow-up contextmenu is suppressed after long press");
assert.match(source, /Math\.min\(Math\.max\(margin, clientX\), maxX\)/, "menu is clamped to the horizontal viewport");
assert.match(source, /Math\.min\(Math\.max\(margin, clientY\), maxY\)/, "menu is clamped to the vertical viewport");
assert.match(source, /menu\.querySelector<HTMLElement>\("\[data-menu-action\]"\)\?\.focus\(\)/, "opening the menu moves focus to its first action");
assert.match(source, /event\.key === "Escape"[\s\S]*?closeMenus\(true\)/, "Escape closes an open menu");
assert.match(source, /closeMenus\(true\)/, "closing the menu restores focus to the card action");
assert.match(source, /menu\.setAttribute\("role", "menu"\)/, "context menu exposes menu semantics");
assert.match(source, /role="menuitem"/, "context menu actions expose menuitem semantics");
assert.match(source, /\["ArrowDown", "ArrowUp"\]/, "context menu supports keyboard traversal");
assert.match(source, /event\.key === "Home" \|\| event\.key === "End"/, "context menu supports first/last keyboard navigation");
assert.match(source, /event\.key === "Tab"[\s\S]*?closeMenus\(true\)/, "Tab closes the menu and restores a stable focus target");
assert.match(source, /menu\.setAttribute\("aria-busy", "true"\)/, "context menu exposes its pending state");
assert.match(source, /querySelectorAll<HTMLButtonElement>\("\[data-menu-action\]"\)[\s\S]*?button\.disabled = true/, "one menu mutation disables every competing action");
assert.match(source, /function runExclusiveAction\(/, "bulk actions share an exclusive execution guard");
assert.match(source, /button\.closest<HTMLElement>\("\[data-bulk-toolbar\]"\)/, "bulk action guard coordinates the whole toolbar");
assert.match(source, /Promise\.resolve\(\)\.then\(operation\)/, "synchronous action failures also release the busy guard");
assert.match(source, /button\.dataset\.actionBusy === "true"/, "repeated action clicks are ignored while a mutation is pending");
assert.match(source, /button\.setAttribute\("aria-busy", "true"\)/, "pending actions expose busy state");
assert.match(source, /await host\.archiveItems\(ids\)/, "bulk archive delegates to one host transaction");
assert.match(source, /await host\.completeItems\(ids\)/, "bulk completion delegates to one host transaction");
assert.match(source, /await host\.deleteItemsWithRecords\(ids\)/, "bulk delete delegates to one host transaction");
assert.match(index, /private async archiveItems[\s\S]*?return this\.enqueueMutation[\s\S]*?await this\.persist\(\)/, "bulk archive persists once inside the mutation queue");
assert.match(index, /private async completeItems[\s\S]*?appendEvents[\s\S]*?await this\.persist\(\)/, "bulk completion appends and persists the batch once");
assert.match(index, /private async completeItems[\s\S]*?type: "event-recorded"[\s\S]*?type: "analytics-updated"/, "bulk completion preserves integration refresh events");
assert.match(index, /private async completeItems[\s\S]*?setOccasionCompleted[\s\S]*?maybeAutoArchiveItemsAfterRecord[\s\S]*?setRecentRecord/, "bulk completion preserves linked occasions, batched automatic archive, and undo feedback");
assert.match(index, /private async deleteItemsWithRecords[\s\S]*?deleteItemsCascade[\s\S]*?await this\.persist\(\)/, "bulk deletion uses the linear cascade and persists once");
assert.match(index, /private async recordEvent[\s\S]*?this\.maybeAutoArchiveAfterRecord\(current\)/, "manual records participate in automatic archiving");
assert.match(index, /private async deleteItemWithRecords[\s\S]*?return this\.enqueueMutation[\s\S]*?deleteItemCascade[\s\S]*?await this\.persist\(\)/, "single deletion mutates only inside the storage queue");
assert.match(index, /private async deleteItemWithRecords[\s\S]*?currentRecordCount !== recordCount[\s\S]*?msg\.deleteImpactChanged/, "single deletion rejects a stale impact confirmation");
assert.match(index, /private async deleteItemsWithRecords[\s\S]*?currentItems\.length !== items\.length \|\| currentRecordCount !== recordCount/, "bulk deletion revalidates its confirmed item and record counts");
assert.match(index, /showMessage\(t\("msg\.itemDeleted"[\s\S]*?currentPage === "today"[\s\S]*?renderBackgroundUpdate/, "Today context deletion refreshes the removed card immediately");
assert.match(source, /menu\.dataset\.actionBusy === "true"/, "context-menu actions ignore duplicate clicks");
assert.match(source, /querySelectorAll<HTMLElement>\("\[data-bulk-check\]"\)[\s\S]*?syncBulkSelection\(\)/, "select-all is scoped to rendered filtered results");
assert.match(source, /const renderedIds = new Set[\s\S]*?host\.bulkSelected\.delete\(id\)/, "filter rerenders prune selections outside the rendered result set");
assert.doesNotMatch(source, /host\.bulkSelected\.add\(item\.id\);[\s\S]{0,80}host\.render\(\)/, "selection changes must not force a full surface render");
assert.match(fragments, /data-bulk-toolbar/, "bulk toolbar exposes a coordination boundary");
assert.match(fragments, /data-bulk-selected-count role="status" aria-live="polite"/, "selection count is announced without rerendering");
assert.match(fragments, /data-bulk-selection-action[\s\S]*?disabled/, "empty selection disables destructive bulk actions");
assert.match(styles, /\.lc-checkin__item-context-menu \{[\s\S]*?position: fixed;/, "context menu is positioned against the viewport");

console.log("Today context-menu checks passed.");

/* Execute the real keyboard/menu bindings with a small DOM boundary. The
   duration fixture deliberately contains an earlier hidden exact submit:
   choosing the first record node would focus it or write unearned minutes. */
const ts = require("typescript");
const compiled = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const doc = {activeElement: null};
const items = [
    {id: "reading", kind: "duration", unit: "分钟", recordStep: 15},
    {id: "water", kind: "count", unit: "杯", recordStep: 2},
    {id: "stretch", kind: "binary", unit: "次"},
];
const writes = [];
let focusStarts = 0;
const host = {
    currentPage: "today", bulkMode: false, store: {items},
    enqueueMutation(operation) { return operation(); },
    recordEvent(item, value) { writes.push([item.id, value]); },
    revisionFingerprint() { return "same-revision"; },
};
const dependencies = {
    "../i18n": {t: key => key},
    "../plugin-ops": {getQuickTodayItems: store => store.items},
    "../model": {
        getItemRevisionForDate: item => item,
        getActiveItemById: (store, id) => store.items.find(item => item.id === id),
        getItemById: (store, id) => store.items.find(item => item.id === id),
        dateKey: () => "2026-09-20", isComplete: () => false,
        isItemAvailableOnDate: () => true, isScheduledToday: () => true, getEventsForDay: () => [],
    },
    "../shared": {
        calendarDateFromKey: key => new Date(key), currentCalendarDate: () => new Date("2026-09-20T12:00:00"),
        captureActionMoment: () => ({occurredAt: "2026-09-20T04:00:00Z", localDate: "2026-09-20"}),
        getRecordStep: (_kind, _unit, step) => step,
    },
};
const bindings = {};
const menus = [];
function element(dataset = {}) {
    return {
        dataset, style: {}, isConnected: true, disabled: false, offsetParent: {}, listeners: {},
        matches(selector) { return selector === ":disabled" && this.disabled; },
        focus() { doc.activeElement = this; },
        click() { if (!this.disabled) this.clicked?.(); },
        addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); },
        setAttribute() {},
        remove() { this.isConnected = false; },
        getBoundingClientRect() { return {width: 120, height: 200}; },
        closest(selector) { return selector.includes(".lc-checkin__item") ? this.card || this : null; },
    };
}
doc.createElement = () => {
    const menu = element();
    const firstAction = element({menuAction: "edit"});
    menu.querySelector = () => firstAction;
    menu.querySelectorAll = () => [firstAction];
    return menu;
};
new Function("require", "exports", "document", "window", compiled)(name => {
    assert.ok(dependencies[name], `unexpected keyboard dependency ${name}`);
    return dependencies[name];
}, bindings, doc, {innerWidth: 1000, innerHeight: 700});
const cards = items.map(item => {
    const card = element({itemId: item.id});
    const exact = element({action: "record"}); exact.offsetParent = null;
    const primary = element({action: item.kind === "duration" ? "focus" : item.kind === "binary" ? "record" : "quick-record"});
    const selection = element({bulkCheck: item.id});
    for (const control of [exact, primary, selection]) control.card = card;
    card.primary = primary; card.selection = selection;
    card.querySelectorAll = selector => selector === "[data-bulk-check]" ? [selection]
        : selector.includes(".lc-checkin__item-action >") ? [primary]
        : [exact, primary];
    card.querySelector = () => exact;
    return card;
});
cards[0].primary.clicked = () => { focusStarts += 1; };
const keyboardRoot = element();
keyboardRoot.querySelectorAll = selector => selector === ".lc-checkin__item-context-menu" ? menus.filter(menu => menu.isConnected) : cards;
keyboardRoot.querySelector = selector => keyboardRoot.querySelectorAll(selector)[0] || null;
keyboardRoot.appendChild = menu => menus.push(menu);
function dispatch(type, properties) {
    const event = {defaultPrevented: false, target: keyboardRoot, preventDefault() { this.defaultPrevented = true; }, ...properties};
    for (const listener of keyboardRoot.listeners[type] || []) listener(event);
    return event;
}
bindings.bindQuickKeyboardFor(host, keyboardRoot);
bindings.bindPageKeyboardFor(host, keyboardRoot);
bindings.bindItemContextMenuFor(host, keyboardRoot);
dispatch("keydown", {key: "1", altKey: true});
assert.equal(focusStarts, 1, "Alt+1 follows the visible duration focus entry");
assert.deepEqual(writes, [], "starting focus must not record duration");
dispatch("keydown", {key: "2", altKey: true});
dispatch("keydown", {key: "3", altKey: true});
assert.deepEqual(writes, [["water", 2], ["stretch", 1]], "numeric and completion shortcuts retain their recording semantics");
cards[0].primary.disabled = true;
dispatch("keydown", {key: "1", altKey: true});
cards[0].primary.disabled = false;
cards[0].primary.offsetParent = null;
dispatch("keydown", {key: "1", altKey: true});
cards[0].primary.offsetParent = {};
assert.equal(focusStarts, 1, "busy or hidden focus entries do not start");
assert.equal(writes.length, 2, "busy or hidden focus entries never fall back to manual minutes");
items[0].direction = "atMost";
dispatch("keydown", {key: "1", altKey: true});
assert.deepEqual(writes[2], ["reading", 15], "at-most duration keeps the explicit manual lapse shortcut");
assert.equal(focusStarts, 1, "limiting duration never starts focus");
delete items[0].direction;
items[1].completionSource = "tomato";
items[1].tomatoMode = "sessions";
cards[1].primary.dataset.action = "focus";
cards[1].primary.clicked = () => { focusStarts += 1; };
dispatch("keydown", {key: "2", altKey: true});
assert.equal(focusStarts, 2, "tomato-linked nonbinary shortcut follows the focus entry");
assert.equal(writes.length, 3, "tomato session shortcut does not add units or minutes manually");
delete items[1].completionSource;
delete items[1].tomatoMode;
cards[1].primary.dataset.action = "quick-record";
dispatch("keydown", {key: "j"});
assert.equal(doc.activeElement, cards[0].primary, "j focuses the visible duration primary, not hidden exact submit");
dispatch("keydown", {key: "j"});
assert.equal(doc.activeElement, cards[1].primary);
dispatch("keydown", {key: "k"});
assert.equal(doc.activeElement, cards[0].primary);
dispatch("contextmenu", {target: cards[0], clientX: 20, clientY: 30});
assert.notEqual(doc.activeElement, cards[0].primary, "menu takes keyboard focus");
dispatch("keydown", {key: "Escape"});
assert.equal(doc.activeElement, cards[0].primary, "closing a duration menu returns to the visible focus entry");
host.bulkMode = true;
dispatch("keydown", {key: "1", altKey: true});
assert.equal(focusStarts, 2);
assert.equal(writes.length, 3, "bulk mode suppresses all quick recording shortcuts");
doc.activeElement = null;
dispatch("keydown", {key: "j"});
assert.equal(doc.activeElement, cards[0].selection, "bulk keyboard movement reaches selection only");
console.log("Today primary-action keyboard and menu-return behavior checks passed.");
