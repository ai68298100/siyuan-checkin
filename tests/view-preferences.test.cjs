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

// Execute the normalizer and binding module as well: source assertions alone
// cannot detect lost expansion state or a detached search timer overwriting a
// newer workspace after a render.
const vm = require("node:vm");
const ts = require("typescript");
function loadTypeScript(filename, globals = {}, imports = {}) {
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    vm.runInNewContext(code, {exports, require: (name) => imports[name] || {}, ...globals}, {filename});
    return exports;
}
const preferences = loadTypeScript("src/view-preferences.ts");
const foldIds = ["projects", "trend", "log", "compare", "strength", "balance", "achievements", "upcoming", "reminders", "report", "heatmap", "calendar"];
const normalized = preferences.normalizeViewPreferences({reviewFold: [...foldIds, "unknown", "projects", null], reviewFoldTouched: true});
assert.deepEqual(Array.from(normalized.reviewFold), foldIds, "all review section choices survive normalization without unknown or duplicate ids");
assert.equal(normalized.reviewFoldTouched, true);
assert.deepEqual(Array.from(preferences.normalizeViewPreferences({reviewFold: "projects"}).reviewFold), []);

const timers = new Map();
let nextTimer = 1;
let focused;
class Element {
    constructor(dataset = {}, tagName = "BUTTON") {
        this.dataset = dataset;
        this.tagName = tagName;
        this.isConnected = true;
        this.handlers = new Map();
        this.value = "";
        this.scrollTop = 0;
    }
    addEventListener(name, callback) { this.handlers.set(name, callback); }
    fire(name) { this.handlers.get(name)?.({currentTarget: this, preventDefault() {}, stopPropagation() {}}); }
    focus() { focused = this; }
    getBoundingClientRect() { return {top: 100, height: 44}; }
    setSelectionRange(start, end) { this.selection = [start, end]; }
}
class Details extends Element {
    constructor(id, open, lazy) {
        super({reviewFold: id, reviewLazy: String(lazy)}, "DETAILS");
        this.open = open;
        this.summary = new Element({}, "SUMMARY");
    }
}
const imports = {
    "../i18n": {t: (key) => key},
    "../model": {
        getEventById: (store, id) => store.events.find((entry) => entry.id === id),
        getItemById: (store, id) => store.items.find((entry) => entry.id === id),
        updateEventNote: (store, id, note) => store.events.find(entry => entry.id === id)?.note === note ? store
            : {...store, events: store.events.map(entry => entry.id === id ? {...entry, note} : entry)},
        removeEvents: (store, removed) => ({...store, events: store.events.filter(entry => !removed.some(event => event.id === entry.id))}),
    },
    "../shared": {isValidLocalDateInput: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value), captureActionMoment: () => ({occurredAt: '2026-09-20T08:00:00.000Z'})},
    "siyuan": {showMessage() {}},
};
const {bindPageNavigationHandlers} = loadTypeScript("src/render/bind-page-navigation.ts", {
    window: {
        setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
        clearTimeout(id) { timers.delete(id); },
    },
    CSS: {escape: (value) => value},
    HTMLDetailsElement: Details,
    FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key]; } },
}, imports);
const host = {
    currentPage: "review", reviewWorkspace: "overview", reviewFoldSections: new Set(), reviewFoldTouched: false,
    historyScope: "period", historyItemId: "", historyPage: 0, historyQuery: "", historySource: "all", historyOrder: "newest",
    reviewProjectPage: 0, reviewProjectOrder: "attention", reviewTrend: "weekly", reviewStrengthItemId: "",
    summaryRange: "week", summaryRequestId: 0, reportSections: {}, heatmapYearOffset: 0,
    store: {items: [{id: "reading"}], events: [{id: "note-event", itemId: "reading", note: "a note"}]},
    bindDialogClose() {}, bindMobileNav() {}, renderCount: 0, persistCount: 0,
    persistViewPreferences() { this.persistCount++; return Promise.resolve(); },
    persistSuggestionWorkflow() { return Promise.resolve(); },
};
let nodes = [];
let surface;
let folds;
let noteInput;
const root = {
    ownerDocument: {get activeElement() { return focused; }},
    querySelectorAll(selector) {
        if (selector === "details[data-review-fold]") return folds || [];
        const attr = selector.match(/^\[data-([a-z-]+)\]$/);
        if (!attr) return [];
        const key = attr[1].replace(/-([a-z])/g, (_, character) => character.toUpperCase());
        return nodes.filter((node) => key in node.dataset);
    },
    querySelector(selector) {
        if (selector === ".lc-checkin--review") return surface;
        if (selector.includes("data-review-fold") && selector.endsWith(" > summary")) {
            const id = selector.match(/data-review-fold="([^"]+)"/)?.[1];
            return folds.find((fold) => fold.dataset.reviewFold === id)?.summary;
        }
        const attr = selector.match(/^(?:select)?\[data-([a-z-]+)(?:=["']([^"']*)["'])?\](?::not\(\[disabled\]\))?$/);
        if (!attr) return null;
        const key = attr[1].replace(/-([a-z])/g, (_, character) => character.toUpperCase());
        return nodes.find((node) => key in node.dataset && (attr[2] === undefined || node.dataset[key] === attr[2])) || null;
    },
};
host.render = function render() {
    this.renderCount++;
    nodes.forEach((node) => { node.isConnected = false; });
    folds?.forEach((fold) => { fold.isConnected = false; });
    if (surface) surface.isConnected = false;
    surface = new Element({}, "DIV");
    const open = (id) => host.reviewFoldSections.has(id) || (!host.reviewFoldTouched && ["projects", "trend"].includes(id));
    folds = ["projects", "trend", "compare"].map((id) => new Details(id, open(id), !open(id)));
    nodes = [
        ...["overview", "records", "analysis"].map((value) => new Element({reviewWorkspace: value})),
        ...["day", "period"].map((value) => new Element({historyScope: value})),
        new Element({historyItem: ""}, "SELECT"), new Element({historySource: ""}, "SELECT"),
        new Element({historyOrder: ""}, "SELECT"), new Element({historySearch: ""}, "INPUT"),
        new Element({historyPage: "2"}), new Element({historyPage: "-1"}),
        new Element({reviewProjectPage: "2"}), new Element({reviewProjectOrder: ""}, "SELECT"),
        new Element({reviewTrend: "monthly"}), new Element({reviewStrengthItem: ""}, "SELECT"),
        new Element({summaryRange: "month"}), new Element({historyDate: "2026-09-18"}),
        new Element({customRange: ""}, "FORM"), new Element({heatmapYear: "-1"}), new Element({heatmapYear: "1"}),
        new Element({action: "clear-history-filters"}),
        ...host.store.events.flatMap(event => [new Element({editHistoryEventId: event.id}), new Element({historyEventId: event.id})]),
    ];
    if (host.editingHistoryNoteId) {
        noteInput = new Element({historyNoteInput: host.editingHistoryNoteId}, "TEXTAREA");
        noteInput.value = host.store.events.find(event => event.id === host.editingHistoryNoteId)?.note || "";
        noteInput.parentElement = new Details("", false, false);
        noteInput.parentElement.parentElement = root;
        nodes.push(noteInput, new Element({saveHistoryNoteId: host.editingHistoryNoteId}));
    }
    bindPageNavigationHandlers(root, host);
};
const control = (key, value) => nodes.find((node) => key in node.dataset && (value === undefined || node.dataset[key] === value));
host.render();
folds.forEach((fold) => fold.fire("toggle"));
assert.equal(host.reviewFoldTouched, false, "initial open toggle must not count as user interaction");
assert.equal(host.persistCount, 0);
const lazy = folds.find((fold) => fold.dataset.reviewFold === "compare");
surface.scrollTop = 410;
lazy.open = true;
lazy.fire("toggle");
assert.deepEqual([...host.reviewFoldSections].sort(), ["compare", "projects", "trend"]);
assert.equal(host.renderCount, 2, "opening a lazy fold renders it once");
assert.equal(surface.scrollTop, 410);
assert.equal(focused, folds.find((fold) => fold.dataset.reviewFold === "compare").summary);
folds.forEach((fold) => fold.fire("toggle"));
assert.equal(host.renderCount, 2, "the generated open fold must not recursively render");
control("reviewWorkspace", "records").fire("click");
assert.equal(host.reviewWorkspace, "records");
assert.equal(surface.scrollTop, 0);
assert.equal(focused, control("reviewWorkspace", "records"));
host.historyPage = 6;
control("historyItem").value = "reading";
control("historyItem").fire("change");
assert.equal(host.historyItemId, "reading");
assert.equal(host.historyPage, 0);
surface.scrollTop = 280;
control("historySearch").value = "chapter";
control("historySearch").fire("input");
const searchCallback = [...timers.values()].at(-1);
searchCallback();
assert.equal(host.historyQuery, "chapter");
assert.equal(surface.scrollTop, 280);
assert.equal(focused, control("historySearch"));
assert.deepEqual(focused.selection, [7, 7]);
control("historySearch").value = "stale query";
control("historySearch").fire("input");
const staleCallback = [...timers.values()].at(-1);
control("reviewWorkspace", "analysis").fire("click");
const countAfterWorkspaceChange = host.renderCount;
staleCallback();
assert.equal(host.historyQuery, "chapter", "a detached search input cannot overwrite the next workspace");
assert.equal(host.renderCount, countAfterWorkspaceChange);
control("action", "clear-history-filters").fire("click");
assert.equal(host.historyItemId, "");
assert.equal(host.historyQuery, "");
assert.equal(host.historySource, "all");
assert.equal(host.historyOrder, "newest");
control("historyScope", "day").fire("click");
assert.equal(host.historyScope, "day");
control("historyPage", "2").fire("click");
assert.equal(host.historyPage, 2);
control("historyPage", "-1").fire("click");
assert.equal(host.historyPage, 2, "invalid target pages are ignored");
control("historyDate").fire("click");
assert.equal(host.historyPage, 0);
assert.equal(host.selectedHistoryDate, "2026-09-18");
control("reviewProjectPage").fire("click");
assert.equal(host.reviewProjectPage, 2);
control("reviewProjectOrder").value = "name";
control("reviewProjectOrder").fire("change");
assert.equal(host.reviewProjectOrder, "name");
assert.equal(host.reviewProjectPage, 0);
control("reviewTrend").fire("click");
assert.equal(host.reviewTrend, "monthly");
control("reviewStrengthItem").value = "reading";
control("reviewStrengthItem").fire("change");
assert.equal(host.reviewStrengthItemId, "reading");
host.historyPage = 5;
host.reviewProjectPage = 4;
control("summaryRange").fire("click");
assert.equal(host.historyPage, 0);
assert.equal(host.reviewProjectPage, 0);
host.historyPage = 3;
host.reviewProjectPage = 2;
let customForm = control("customRange");
customForm.customStartDate = "2026-09-01";
customForm.customEndDate = "2026-09-15";
customForm.fire("submit");
assert.equal(JSON.stringify(host.summaryCustomRange), JSON.stringify({startDate: "2026-09-01", endDate: "2026-09-15"}));
assert.equal(host.historyPage, 0);
assert.equal(host.reviewProjectPage, 0);
customForm = control("customRange");
customForm.customStartDate = "2026-09-15";
customForm.customEndDate = "2026-09-01";
const beforeInvalidRange = host.renderCount;
customForm.fire("submit");
assert.equal(host.renderCount, beforeInvalidRange, "reversed custom ranges must not render or change the selection");
control("heatmapYear", "-1").fire("click");
assert.equal(host.heatmapYearOffset, -1);
control("heatmapYear", "1").fire("click");
control("heatmapYear", "1").fire("click");
assert.equal(host.heatmapYearOffset, 0, "heatmaps cannot navigate into a future year");
control("editHistoryEventId").fire("click");
assert.equal(noteInput.parentElement.open, true, "editing reveals closed history detail ancestors");
assert.equal(focused, noteInput);
assert.deepEqual(noteInput.selection, [6, 6]);
console.log("Review preferences and navigation behavior passed: full fold persistence, lazy loading, filters, paging, focus and stale-search isolation.");

(async () => {
    let pendingMutation;
    let persistCount = 0;
    host.enqueueMutation = operation => (pendingMutation = operation());
    host.persist = async () => { persistCount++; };
    host.invalidateSummary = () => {};
    host.broadcast = () => {};
    host.renderBackgroundUpdate = () => { if (host.currentPage !== 'editor') host.render(); };
    host.reviewWorkspace = 'records';
    host.render();
    const saveNote = () => {
        const save = control('saveHistoryNoteId');
        save.focus();
        save.fire('click');
        return pendingMutation;
    };
    const deleteRecord = id => {
        const button = control('historyEventId', id);
        button.focus();
        button.fire('click');
        return pendingMutation;
    };
    await saveNote();
    assert.equal(host.editingHistoryNoteId, undefined, 'saving unchanged text must close the editor');
    assert.equal(persistCount, 0, 'unchanged notes must not write data');
    assert.equal(focused, control('editHistoryEventId', 'note-event'), 'saving returns keyboard focus to the record');
    control('editHistoryEventId', 'note-event').fire('click');
    noteInput.value = 'updated note';
    await saveNote();
    assert.equal(host.store.events[0].note, 'updated note');
    assert.equal(persistCount, 1);
    assert.equal(focused, control('editHistoryEventId', 'note-event'));

    control('editHistoryEventId', 'note-event').fire('click');
    noteInput.value = 'unsaved note';
    host.persist = async () => { throw new Error('disk error'); };
    const failedInput = noteInput;
    await saveNote();
    assert.equal(host.store.events[0].note, 'updated note', 'failed saves must roll back the store');
    assert.equal(host.editingHistoryNoteId, 'note-event');
    assert.equal(failedInput.value, 'unsaved note', 'failed saves retain the draft for retry');
    assert.equal(failedInput.isConnected, true);
    await deleteRecord('note-event');
    assert.equal(host.store.events.length, 1, 'failed deletion must roll back the record');
    assert.equal(host.editingHistoryNoteId, 'note-event', 'failed deletion must retain the open editor');

    host.persist = async () => { persistCount++; };
    host.store.events.push({id: 'next-record', itemId: 'reading', note: ''});
    host.render();
    await deleteRecord('note-event');
    assert.equal(host.editingHistoryNoteId, undefined);
    assert.equal(focused, control('editHistoryEventId', 'next-record'), 'deletion moves focus to the next remaining record');
    await deleteRecord('next-record');
    assert.equal(host.store.events.length, 0);
    assert.equal(focused, control('reviewWorkspace', 'records'), 'empty results still have a reachable keyboard focus target');

    host.store.events = [{id: 'note-event', itemId: 'reading', note: 'original'}];
    host.editingHistoryNoteId = 'note-event';
    host.render();
    noteInput.value = 'async save';
    let resolvePersist;
    host.persist = () => new Promise(resolve => { resolvePersist = resolve; });
    const pendingSave = saveNote();
    host.currentPage = 'editor';
    host.editingHistoryNoteId = 'different-record';
    const editorFocus = new Element({}, 'INPUT');
    editorFocus.focus();
    resolvePersist();
    await pendingSave;
    assert.equal(focused, editorFocus, 'an asynchronous save must not steal focus from a different page');
    assert.equal(host.editingHistoryNoteId, 'different-record', 'finishing an old save must not close a newer editor');
    console.log('Review record mutation behavior passed: no-op/save/delete focus, failure draft preservation, empty results and asynchronous navigation isolation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
