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

function fixture(kind = "binary") {
    const classes = new Set();
    const makeButton = exact => {
        const listeners = [];
        return {addEventListener: (event, listener) => { if (event === "click") listeners.push(listener); }, closest: () => exact ? {} : null, click() { for (const listener of listeners) listener(); }};
    };
    const outer = makeButton(false), inner = makeButton(true);
    const note = {value: "  真实备注  "};
    const amount = {valueAsNumber: 2, addEventListener() {}, focus() {}};
    const photo = {dataset: {photo: "1"}, classList: {remove() {}}};
    const card = {
        dataset: {itemId: "habit"}, classList: {contains: value => classes.has(value)},
        querySelectorAll: selector => selector === "[data-action='record']" ? [outer, inner] : [],
        querySelector: selector => selector === ".lc-checkin__record-note" ? note : selector === ".lc-checkin__amount" && kind !== "binary" ? amount : selector === "[data-attach-button]" ? photo : null,
    };
    const rootNode = {querySelectorAll: selector => selector === "[data-item-id]" ? [card] : [], querySelector: () => null};
    const host = new RecordingHost();
    host.store = model.normalizeStore({version: 3, items: [{id: "habit", name: "日常", kind, target: kind === "binary" ? 1 : 8, unit: "次", schedule: {type: "daily"}, createdAt: "2026-01-01T00:00:00Z", createdDate: "2026-01-01"}], events: []});
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
    bindTodayHandlers(rootNode, host);
    return {host, inner, outer, note, amount, classes, get persists() { return persists; }, flush: async () => { while (queue.length) await queue.shift()(); }};
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
    console.log("Today recording bindings passed: inner/outer binary notes, attachments, queued duplicate protection, undo and numeric validation.");
})().catch(error => { console.error(error); process.exitCode = 1; });
