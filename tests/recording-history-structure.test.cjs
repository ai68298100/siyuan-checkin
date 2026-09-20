const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "src");
const source = [
    "index.ts",
    "render/fragments.ts",
    "render/bind-today.ts",
    "render/review.ts",
    "render/bind-page-navigation.ts",
    "render/bind-editor.ts",
    "render/save-form.ts",
].map((name) => fs.readFileSync(path.join(root, name), "utf8")).join("\n");
assert.match(source, /data-action="add"/);
assert.match(source, /class="lc-checkin__record-note" type="text" maxlength="2000"/);
assert.match(source, /aria-label="\$\{t\("item\.noteAria"\)\}"/);
assert.match(source, /data-edit-history-event-id/);
assert.match(source, /updateEventNote\(host\.store, event\.id, note\)/);
assert.match(source, /data-history-event-id/);
assert.match(source, /getEventById\(host\.store, eventId\)/);
assert.match(source, /data-history-date="\$\{key\}"/);
assert.match(source, /future \? "disabled"/);
assert.match(source, /host\.showEditor\(\)/);
assert.match(source, /host\.saveForm\(data, editingId/);
assert.match(source, /expectedFingerprint/);
console.log("Recording and history editing structure checks passed.");

/* Execute the actual binding and host recording methods. The small DOM fixture
   deliberately retains both buttons after a render so queued/stale submits
   exercise the production duplicate guard, rather than a mock of that guard. */
const ts = require("typescript");
const moduleCache = new Map();
const messages = [];
const moment = {occurredAt: "2026-09-20T08:00:00.000Z", localDate: "2026-09-20"};
const shared = {
    captureActionMoment: () => ({...moment}),
    calendarDateFromKey: key => new Date(`${key}T12:00:00`),
    currentCalendarDate: () => new Date("2026-09-20T12:00:00"),
    getRecordStep: () => 1,
    formatNumber: String,
};
function loadTs(filename) {
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const module = {exports: {}};
    moduleCache.set(filename, module);
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = name => {
        if (name === "siyuan") return {showMessage: value => messages.push(value)};
        if (name === "../shared") return shared;
        if (name === "../i18n") return {t: key => key};
        if (name === "../occasions") return {};
        if (name === "../integrations") return {DOCK_TOMATO_ADAPTER_ID: "docktomato"};
        if (name === "../dock-tomato") return {};
        return loadTs(path.resolve(path.dirname(filename), `${name}.ts`));
    };
    new Function("require", "module", "exports", output)(localRequire, module, module.exports);
    return module.exports;
}
const model = loadTs(path.join(root, "model.ts"));
const {bindTodayHandlers} = loadTs(path.join(root, "render", "bind-today.ts"));
const pluginSource = ts.createSourceFile("index.ts", fs.readFileSync(path.join(root, "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const pluginClass = pluginSource.statements.find(node => ts.isClassDeclaration(node));
const methods = pluginClass.members.filter(node => ["recordEvent", "toggleItem"].includes(node.name?.getText(pluginSource))).map(node => node.getText(pluginSource)).join("\n");
const hostClassOutput = ts.transpileModule(`class RecordingHost { ${methods} }`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const environment = {...model, ...shared, t: key => key, showMessage: value => messages.push(value)};
const RecordingHost = new Function(...Object.keys(environment), `${hostClassOutput}\nreturn RecordingHost;`)(...Object.values(environment));

function fixture(kind = "binary", direction) {
    const classes = new Set();
    const makeButton = exact => {
        const listeners = [];
        return {addEventListener: (event, listener) => { if (event === "click") listeners.push(listener); }, closest: () => exact ? {} : null, click() { for (const listener of listeners) listener(); }};
    };
    const outer = makeButton(false), inner = makeButton(true), icon = makeButton(false);
    const note = {value: "  真实备注  "};
    const amount = {valueAsNumber: 2, addEventListener() {}, focus() {}};
    const photo = {dataset: {photo: "1"}, classList: {remove() {}}};
    const card = {
        dataset: {itemId: "habit"}, classList: {contains: value => classes.has(value)},
        querySelectorAll: selector => selector === "[data-action='record']" ? [outer, inner] : [],
        querySelector: selector => selector === ".lc-checkin__record-note" ? note : selector === ".lc-checkin__amount" && kind !== "binary" ? amount : selector === "[data-attach-button]" ? photo : selector === "[data-action='toggle']" ? icon : selector === ".lc-checkin__item-action > [data-action='record']" ? outer : null,
    };
    const rootNode = {querySelectorAll: selector => selector === "[data-item-id]" ? [card] : [], querySelector: () => null};
    const host = new RecordingHost();
    host.store = model.normalizeStore({version: 3, items: [{id: "habit", name: "日常", kind, direction, target: kind === "binary" ? 1 : 8, unit: "次", schedule: {type: "daily"}, createdAt: "2026-01-01T00:00:00Z", createdDate: "2026-01-01"}], events: []});
    host.pendingAttachments = new Map([["habit", "data:image/png;base64,proof"]]);
    host.occasionStore = {occasions: []};
    host.revisionFingerprint = () => "revision";
    const queue = [];
    host.enqueueMutation = operation => { queue.push(operation); return Promise.resolve(); };
    let persists = 0, ids = 0;
    host.persist = async () => { persists++; };
    host.makeEvent = (item, value, source, unit, noteValue, externalRef, stamp, attachment) => ({id: `record-${++ids}`, itemId: item.id, value, source, unit, note: noteValue, ...stamp, ...(attachment ? {attachment} : {})});
    host.renderBackgroundUpdate = () => {
        if (model.isComplete(host.store, host.store.items[0], shared.currentCalendarDate())) classes.add("is-complete");
        else classes.delete("is-complete");
    };
    for (const name of ["bindDialogClose", "bindItemDrag", "bindQuickKeyboard", "bindBulkMode", "bindFocusTimerPanel", "bindMobileNav", "pulseHaptic", "invalidateSummary", "broadcast", "writebackNoteAnchor", "setRecentRecord", "maybeAutoArchiveAfterRecord"]) host[name] = () => {};
    host.renderBackgroundUpdate();
    bindTodayHandlers(rootNode, host);
    return {host, inner, outer, icon, note, amount, classes, get persists() { return persists; }, flush: async () => { while (queue.length) await queue.shift()(); }};
}

(async () => {
    const binary = fixture();
    binary.inner.click(); binary.inner.click();
    await binary.flush();
    assert.equal(binary.host.store.events.length, 1, "queued expanded submits must not record twice or undo completion");
    assert.equal(binary.persists, 1);
    assert.equal(binary.host.store.events[0].note, "真实备注");
    assert.equal(binary.host.store.events[0].attachment, "data:image/png;base64,proof");
    assert.equal(binary.host.pendingAttachments.size, 0);
    binary.inner.click(); await binary.flush();
    assert.equal(binary.host.store.events.length, 1, "stale expanded submit remains record-only after completion");
    binary.outer.click(); await binary.flush();
    assert.equal(binary.host.store.events.length, 0, "outer completed button still undoes the record");
    binary.note.value = "外部按钮保留备注";
    binary.outer.click(); await binary.flush();
    assert.equal(binary.host.store.events.length, 1);
    assert.equal(binary.host.store.events[0].note, "外部按钮保留备注");
    const numeric = fixture("count");
    numeric.amount.valueAsNumber = 0;
    numeric.inner.click(); await numeric.flush();
    assert.equal(numeric.host.store.events.length, 0, "invalid amount still blocks saving");
    numeric.amount.valueAsNumber = 2;
    numeric.inner.click(); await numeric.flush();
    assert.equal(numeric.host.store.events[0].value, 2);
    assert.equal(numeric.host.store.events[0].note, "真实备注");

    const limiting = fixture("binary", "atMost");
    assert.equal(limiting.classes.has("is-complete"), true, "absence of lapse starts as successful avoidance");
    limiting.outer.click(); limiting.outer.click(); await limiting.flush();
    assert.equal(limiting.host.store.events.length, 1, "double lapse submits record once despite initial complete state");
    assert.equal(limiting.persists, 1);
    assert.equal(limiting.host.store.events[0].value, 1);
    assert.equal(limiting.host.store.events[0].note, "真实备注");
    assert.equal(limiting.host.store.events[0].attachment, "data:image/png;base64,proof");
    assert.equal(limiting.classes.has("is-complete"), false, "a recorded lapse ends avoidance success");
    limiting.inner.click(); await limiting.flush();
    assert.equal(limiting.host.store.events.length, 1, "stale exact submit never turns into lapse undo");
    limiting.icon.click(); limiting.icon.click(); await limiting.flush();
    assert.equal(limiting.host.store.events.length, 0, "lapse icon shares snapshot undo and queued undo is idempotent");
    assert.equal(limiting.classes.has("is-complete"), true);
    limiting.note.value = "图标入口的真实备注";
    limiting.host.pendingAttachments.set("habit", "data:image/png;base64,icon");
    limiting.icon.click(); limiting.icon.click(); await limiting.flush();
    assert.equal(limiting.host.store.events.length, 1, "avoided-state icon records a lapse once");
    assert.equal(limiting.host.store.events[0].note, "图标入口的真实备注");
    assert.equal(limiting.host.store.events[0].attachment, "data:image/png;base64,icon");
    limiting.outer.click();
    const laterEvent = {...limiting.host.store.events[0], id: "later-lapse", occurredAt: "2026-09-20T08:01:00.000Z"};
    limiting.host.store = model.appendEvent(limiting.host.store, laterEvent);
    await limiting.flush();
    assert.deepEqual(limiting.host.store.events.map(event => event.id), ["later-lapse"], "snapshot undo preserves a lapse arriving after the click");
    assert.equal(limiting.classes.has("is-complete"), false, "remaining late lapse stays incomplete");
    limiting.outer.click(); await limiting.flush();
    assert.equal(limiting.host.store.events.length, 0);

    const exactLapse = fixture("binary", "atMost");
    exactLapse.inner.click(); exactLapse.inner.click(); await exactLapse.flush();
    assert.equal(exactLapse.host.store.events.length, 1, "exact lapse submission records from the avoided state");
    assert.equal(exactLapse.host.store.events[0].note, "真实备注");
    assert.equal(exactLapse.host.store.events[0].attachment, "data:image/png;base64,proof");
    const skippedLapse = fixture("binary", "atMost");
    skippedLapse.host.store = model.appendEvent(skippedLapse.host.store, {id: "skip", itemId: "habit", kind: "skip", value: 0, unit: "次", source: "manual", ...moment});
    skippedLapse.outer.click(); await skippedLapse.flush();
    assert.equal(skippedLapse.host.store.events.length, 2, "skip is not mistaken for an existing lapse");
    skippedLapse.outer.click(); await skippedLapse.flush();
    assert.deepEqual(skippedLapse.host.store.events.map(event => event.id), ["skip"], "lapse undo does not delete a skip marker");
    const directLapse = fixture("binary", "atMost");
    await directLapse.host.toggleItem("habit", moment, true, "revision");
    await directLapse.host.toggleItem("habit", moment, true, "revision");
    assert.equal(directLapse.host.store.events.length, 1, "host toggle uses lapse presence instead of avoidance completion");
    const snapshot = directLapse.host.store.events.map(event => ({...event}));
    await directLapse.host.toggleItem("habit", moment, false, "revision", snapshot);
    assert.equal(directLapse.host.store.events.length, 0);

    const changed = fixture("binary", "atMost");
    changed.outer.click();
    changed.host.revisionFingerprint = () => "changed";
    await changed.flush();
    assert.equal(changed.host.store.events.length, 0, "queued lapse respects revision conflict protection");
    const failing = fixture("binary", "atMost");
    const beforeFailure = failing.host.store;
    failing.host.persist = async () => { throw new Error("write failed"); };
    failing.outer.click(); await failing.flush();
    assert.equal(failing.host.store, beforeFailure, "failed lapse save restores the previous store");
    const undoFailing = fixture("binary", "atMost");
    undoFailing.outer.click(); await undoFailing.flush();
    const beforeUndoFailure = undoFailing.host.store;
    undoFailing.host.persist = async () => { throw new Error("write failed"); };
    undoFailing.icon.click(); await undoFailing.flush();
    assert.equal(undoFailing.host.store, beforeUndoFailure, "failed lapse undo restores its record");
    console.log("Today recording bindings passed: regular/at-most binary inner, outer and icon actions; notes/photos; queued idempotency; snapshot undo; conflict and persistence protection.");
})().catch(error => { console.error(error); process.exitCode = 1; });
