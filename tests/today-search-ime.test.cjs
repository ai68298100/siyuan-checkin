const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const timers = new Map();
let nextTimer = 0;
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/render/bind-today.ts", "utf8"), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText, {exports: exportsObject, require: () => ({}), window: {
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
}});
function element() {
    const handlers = new Map();
    return {isConnected: true, value: "", addEventListener: (name, fn) => handlers.set(name, fn),
        fire(name, details = {}) { handlers.get(name)?.(details); }};
}
function fixture() {
    timers.clear();
    const search = element(), clear = element();
    const root = {search, querySelector: selector => selector === "[data-today-search]" ? root.search : null,
        querySelectorAll: selector => selector === "[data-action='clear-search']" ? [clear] : []};
    const host = {todayQuery: "", currentPage: "today", renders: 0,
        render() { this.renders++; }, focusTodaySearch(cursor) { this.cursor = cursor; }};
    for (const name of ["bindDialogClose", "bindItemDrag", "bindQuickKeyboard", "bindBulkMode", "bindFocusTimerPanel", "bindMobileNav"]) host[name] = () => {};
    exportsObject.bindTodayHandlers(root, host);
    return {root, search, clear, host};
}
function flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
let f = fixture();
f.search.value = "h"; f.search.fire("input");
const obsolete = [...timers.values()][0];
f.search.fire("compositionstart");
assert.equal(timers.size, 0, "starting IME cancels the pending Latin query");
obsolete();
assert.equal(f.host.renders, 0, "even a queued callback cannot render during composition");
f.search.value = "喝"; f.search.fire("compositionend");
f.search.fire("input");
assert.equal(timers.size, 1, "post-composition input deduplicates the timer");
f.search.fire("compositionstart");
f.search.value = "喝shui"; f.search.fire("input", {isComposing: true}); flush();
assert.equal(f.host.renders, 0, "consecutive Chinese syllables keep the same input node");
f.search.value = "喝水"; f.search.fire("compositionend"); flush();
assert.equal(f.host.todayQuery, "喝水"); assert.equal(f.host.renders, 1); assert.equal(f.host.cursor, 2);
for (const invalidate of [
    f => { f.search.isConnected = false; }, f => { f.root.search = element(); },
    f => { f.host.currentPage = "settings"; }, f => { f.host.disposing = true; },
]) {
    f = fixture(); f.search.value = "old"; f.search.fire("input"); invalidate(f); flush();
    assert.equal(f.host.renders, 0, "stale search cannot render or change another page");
}
f = fixture(); f.search.value = "old"; f.search.fire("input"); f.clear.fire("click"); flush();
assert.equal(f.host.todayQuery, ""); assert.equal(f.host.renders, 1);
f = fixture(); f.search.value = "zhong"; f.search.fire("input", {isComposing: true}); flush();
assert.equal(f.host.renders, 0, "native isComposing also protects missing compositionstart");
f.search.value = "reading"; f.search.fire("input"); flush();
assert.equal(f.host.todayQuery, "reading"); assert.equal(f.host.renders, 1);
console.log("Today search IME behavior passed: pending timers, consecutive syllables, native composition, stale nodes, navigation and clear.");
