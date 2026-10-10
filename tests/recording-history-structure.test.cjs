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
    "render/action-busy.ts",
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
assert.match(source, /host\.showEditor\(undefined, undefined, root\)/);
assert.match(source, /host\.saveForm\(data, editingId/);
assert.match(source, /expectedFingerprint/);
assert.match(source, /runExclusiveAction\(actionButton, async \(\) => \{[\s\S]*?host\.enqueueMutation\(async \(\) => \{/,
    "Today record buttons keep their card locked through the queued mutation");
assert.match(source, /runExclusiveAction\(button, \(\) => \{[\s\S]*?host\.recordEvent\(item, amount/,
    "quick-record buttons use the same card-level busy lifecycle");
assert.match(source, /runExclusiveAction\(button, \(\) => host\.enqueueMutation\(\(\) => host\.setOccasionCompleted/,
    "occasion banner completion exposes an exclusive pending state");
assert.match(source, /runExclusiveAction\(button, \(\) => \{[\s\S]*?host\.recordEvent\(item, parsed\.value!/,
    "quick-entry recording shares the target item's card lock");
assert.match(source, /runExclusiveAction\(button, \(\) => host\.archiveEditingItem\(root\), editorActions, "button", editor\?\.editingId \? `item:/);
assert.match(source, /runExclusiveAction\(button, \(\) => host\.deleteEditingItem\(root\), editorActions, "button", editor\?\.editingId \? `item:/);
assert.match(source, /boundary\.dataset\.actionBusy = "true"[\s\S]*?control\.disabled = true[\s\S]*?lock\.controls\) if \(control\.isConnected\) control\.disabled = disabled/,
    "busy boundaries disable competing controls and restore their prior state");
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
        if (name === "../occasions") return {isOccasionCompleted: () => false};
        if (name === "../integrations") return {DOCK_TOMATO_ADAPTER_ID: "docktomato"};
        if (name === "../dock-tomato") return {};
        return loadTs(path.resolve(path.dirname(filename), `${name}.ts`));
    };
    new Function("require", "module", "exports", output)(localRequire, module, module.exports);
    return module.exports;
}
const model = loadTs(path.join(root, "model.ts"));
const {bindTodayHandlers} = loadTs(path.join(root, "render", "bind-today.ts"));
const {runExclusiveAction} = loadTs(path.join(root, "render", "action-busy.ts"));
const pluginSource = ts.createSourceFile("index.ts", fs.readFileSync(path.join(root, "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const pluginClass = pluginSource.statements.find(node => ts.isClassDeclaration(node));
const methods = pluginClass.members.filter(node => ["recordEvent", "toggleItem", "recordHistoryBatch", "recordHistoryBatchEntries", "batchBackfillSnapshots"].includes(node.name?.getText(pluginSource))).map(node => node.getText(pluginSource)).join("\n");
const hostClassOutput = ts.transpileModule(`class RecordingHost { ${methods} }`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
/* R-18.5：recordEvent 现引用 computeStreaksValue（model-helpers）与 STREAK_MILESTONES
   （index 模块常量）——本桩以常量提供，结构测试不断言连击/里程碑值。 */
const environment = {...model, ...shared, ...loadTs(path.join(root, "features", "batch-backfill.ts")), isValidLocalDateInput: value => /^2026-09-(?:1[0-9]|20)$/.test(value), computeStreaksValue: () => new Map(), STREAK_MILESTONES: [], t: key => key, showMessage: value => messages.push(value), document: {activeElement: null}};
const RecordingHost = new Function(...Object.keys(environment), `${hostClassOutput}\nreturn RecordingHost;`)(...Object.values(environment));

function fixture(kind = "binary", direction) {
    const classes = new Set();
    const makeButton = exact => {
        const listeners = [];
        const attributes = new Set();
        return {dataset: {}, disabled: false, isConnected: true, addEventListener: (event, listener) => { if (event === "click") listeners.push(listener); }, closest: selector => selector === "[data-exact-entry]" && exact ? {} : null, querySelectorAll: () => [], setAttribute: name => attributes.add(name), removeAttribute: name => attributes.delete(name), hasAttribute: name => attributes.has(name), click() { for (const listener of listeners) listener({currentTarget: this}); }};
    };
    const outer = makeButton(false), inner = makeButton(true), icon = makeButton(false), quick = makeButton(false), occasionButton = makeButton(false);
    occasionButton.dataset.occasionId = "anniversary";
    occasionButton.dataset.occasionDate = "2026-09-20";
    const note = {value: "  真实备注  "};
    const amount = {valueAsNumber: 2, addEventListener() {}, focus() {}};
    const photo = {dataset: {photo: "1"}, classList: {remove() {}}};
    const cardAttributes = new Set();
    const card = {
        dataset: {itemId: "habit"}, classList: {contains: value => classes.has(value)}, attributes: cardAttributes,
        setAttribute: name => cardAttributes.add(name), removeAttribute: name => cardAttributes.delete(name),
        hasAttribute: name => cardAttributes.has(name),
        isConnected: true,
        querySelectorAll: selector => selector === "[data-action='record']" ? [outer, inner] : selector.startsWith("button[data-action=") ? [outer, inner, icon, quick] : [],
        querySelector: selector => selector === ".lc-checkin__record-note" ? note : selector === ".lc-checkin__amount" && kind !== "binary" ? amount : selector === "[data-attach-button]" ? photo : selector === "[data-action='toggle']" ? icon : selector === "[data-action='quick-record']" ? quick : selector === ".lc-checkin__item-action > [data-action='record']" ? outer : null,
    };
    const rootNode = {querySelectorAll: selector => selector === "[data-item-id]" ? [card] : selector === "[data-action='toggle-occasion']" ? [occasionButton] : [], querySelector: () => null};
    const host = new RecordingHost();
    host.store = model.normalizeStore({version: 3, items: [{id: "habit", name: "日常", kind, direction, target: kind === "binary" ? 1 : 8, unit: "次", schedule: {type: "daily"}, createdAt: "2026-01-01T00:00:00Z", createdDate: "2026-01-01"}], events: []});
    host.pendingAttachments = new Map([["habit", "data:image/png;base64,proof"]]);
    host.occasionStore = {occasions: [{id: "anniversary"}]};
    host.setOccasionCompleted = async () => { host.occasionWrites = (host.occasionWrites || 0) + 1; return true; };
    host.revisionFingerprint = () => "revision";
    host.setPendingFocusItem = (surface, itemId) => {
        assert.equal(surface, rootNode, "recording focus must belong to the originating surface");
        host.pendingFocusItemId = itemId;
    };
    host.expandedExactEntries = [];
    const queue = [];
    host.enqueueMutation = operation => new Promise((resolve, reject) => { queue.push(async () => { try { resolve(await operation()); } catch (error) { reject(error); } }); });
    let persists = 0, ids = 0;
    host.persist = async () => { persists++; };
    host.makeEvent = (item, value, source, unit, noteValue, externalRef, stamp, attachment) => ({id: `record-${++ids}`, itemId: item.id, value, source, unit, note: noteValue, ...stamp, ...(attachment ? {attachment} : {})});
    host.renderBackgroundUpdate = () => {
        if (model.isComplete(host.store, host.store.items[0], shared.currentCalendarDate())) classes.add("is-complete");
        else classes.delete("is-complete");
    };
    /* Root-aware draft recovery may request a regular render after restoring
       the originating surface; the structural host keeps that side effect
       intentionally inert. */
    host.render = () => {};
    for (const name of ["bindDialogClose", "bindItemDrag", "bindQuickKeyboard", "bindBulkMode", "bindFocusTimerPanel", "bindMobileNav", "pulseHaptic", "invalidateSummary", "broadcast", "writebackNoteAnchor", "writeSummaryResidentForDate", "setRecentRecord", "maybeAutoArchiveAfterRecord"]) host[name] = () => {};
    host.renderBackgroundUpdate();
    bindTodayHandlers(rootNode, host);
    return {host, inner, outer, icon, quick, occasionButton, note, amount, card, classes, get persists() { return persists; }, flush: async () => { await Promise.resolve(); while (queue.length) await queue.shift()(); await new Promise(resolve => setImmediate(resolve)); }};
}

(async () => {
    let releaseRedrawn;
    const pendingRedrawn = new Promise(resolve => { releaseRedrawn = resolve; });
    let redrawnWrites = 0;
    const oldButton = {dataset: {}, disabled: false, isConnected: true, setAttribute() {}, removeAttribute() {}};
    const oldCard = {dataset: {itemId: "redrawn-item"}, querySelectorAll: () => [oldButton], setAttribute() {}, removeAttribute() {}};
    runExclusiveAction(oldButton, () => { redrawnWrites += 1; return pendingRedrawn; }, oldCard, "button");
    const newButton = {dataset: {}, disabled: false, isConnected: true, setAttribute() {}, removeAttribute() {}};
    const newCard = {dataset: {itemId: "redrawn-item"}, querySelectorAll: () => [newButton], setAttribute() {}, removeAttribute() {}};
    runExclusiveAction(newButton, () => { redrawnWrites += 1; }, newCard, "button");
    assert.equal(redrawnWrites, 1, "a freshly rendered card cannot repeat an in-flight item mutation");
    assert.equal(newButton.disabled, true, "a freshly rendered action joins the active busy state");
    assert.equal(newCard.dataset.actionBusy, "true", "a freshly rendered card announces the active mutation");
    releaseRedrawn();
    await pendingRedrawn;
    await new Promise(resolve => setImmediate(resolve));
    runExclusiveAction(newButton, () => { redrawnWrites += 1; }, newCard, "button");
    assert.equal(redrawnWrites, 2, "the item key is released after the original mutation settles");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(newButton.disabled, false, "the refreshed action unlocks when the active mutation settles");

    const binary = fixture();
    binary.inner.click();
    assert.equal(binary.inner.disabled, true, "submitting a record disables competing card actions immediately");
    assert.equal(binary.card.hasAttribute("aria-busy"), true, "the whole item card announces its pending state");
    binary.inner.click();
    await binary.flush();
    assert.equal(binary.inner.disabled, false, "record controls unlock when the mutation finishes");
    assert.equal(binary.card.hasAttribute("aria-busy"), false, "the item card clears its pending state after completion");
    assert.equal(binary.host.store.events.length, 1, "queued expanded submits must not record twice or undo completion");
    assert.equal(binary.persists, 1);
    assert.equal(binary.host.store.events[0].note, "真实备注");
    assert.equal(binary.host.store.events[0].attachment, "data:image/png;base64,proof");
    assert.equal(binary.host.pendingAttachments.size, 0);
    assert.equal(binary.outer.disabled, false, "the main record action unlocks with the exact submit action");
    assert.equal(binary.icon.disabled, false, "the toggle action unlocks with the record actions");
    const quick = fixture("count");
    quick.quick.dataset.amount = "3";
    quick.quick.click(); quick.quick.click();
    assert.equal(quick.quick.disabled, true, "quick-record locks the other write actions on its card");
    await quick.flush();
    assert.equal(quick.host.store.events.length, 1, "double-clicking quick-record produces one mutation");
    assert.equal(quick.host.store.events[0].value, 3);
    quick.occasionButton.click(); quick.occasionButton.click();
    assert.equal(quick.occasionButton.disabled, true, "the occasion banner action disables while pending");
    await quick.flush();
    assert.equal(quick.host.occasionWrites, 1, "double-clicking an occasion banner produces one mutation");
    assert.equal(quick.occasionButton.disabled, false, "occasion controls unlock after the mutation");
    const rejected = fixture("count");
    rejected.host.recordEvent = async () => { throw new Error("write rejected"); };
    rejected.inner.click();
    await rejected.flush();
    assert.ok(messages.includes("msg.saveFailedShort"), "unexpected write rejection gets visible fallback feedback");
    assert.deepEqual(rejected.host.expandedExactEntries, ["habit"], "a rejected write preserves the retry panel");
    assert.equal(rejected.inner.disabled, false, "a rejected write releases the busy lock");
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
    const batch = fixture();
    batch.host.store = model.normalizeStore({version: 3, items: [
        {...batch.host.store.items[0], id: "a"}, {...batch.host.store.items[0], id: "b"},
    ], events: []});
    batch.host.historyBatchSelected = new Set(["a", "b"]);
    batch.host.enqueueMutation = async operation => operation();
    batch.host.makeEvent = (item, value, source, unit, note, externalRef, stamp) => ({id: `batch-${item.id}`, itemId: item.id, value, source, unit, ...stamp});
    const count = await batch.host.recordHistoryBatch("2026-09-19", ["a", "b"], "record");
    assert.equal(count, 2, "two historical projects are persisted as one batch");
    assert.equal(batch.host.store.events.length, 2, "each completed project has its own undoable event");
    assert.equal(await batch.host.recordHistoryBatch("2026-09-19", ["a", "b"], "record"), 0, "replayed batch does not add duplicates");
    const batchFailure = fixture();
    batchFailure.host.store = model.normalizeStore({version: 3, items: [{...batchFailure.host.store.items[0], id: "a"}], events: []});
    batchFailure.host.enqueueMutation = async operation => operation();
    batchFailure.host.makeEvent = (item, value, source, unit, note, externalRef, stamp) => ({id: "batch-fail", itemId: item.id, value, source, unit, ...stamp});
    batchFailure.host.persist = async () => { throw new Error("write failed"); };
    const beforeBatchFailure = batchFailure.host.store;
    assert.equal(await batchFailure.host.recordHistoryBatch("2026-09-19", ["a"], "skip"), 0);
    assert.equal(batchFailure.host.store, beforeBatchFailure, "failed historical batch restores the entire store");
    const roots = fixture();
    roots.host.store = model.normalizeStore({version: 3, items: [
        {...roots.host.store.items[0], id: "a"}, {...roots.host.store.items[0], id: "b"},
    ], events: []});
    const primary = {}, secondary = {};
    const primaryReview = {selectedHistoryDate: "2026-09-19", historyBatchSelected: new Set(["a"]), historyBatchValues: {a: "1"}, historyBatchPreviewOpen: true};
    const secondaryReview = {selectedHistoryDate: "2026-09-18", historyBatchSelected: new Set(["b"]), historyBatchValues: {b: "2"}, historyBatchPreviewOpen: true};
    roots.host.rootContexts = new Map([[primary, {review: primaryReview}], [secondary, {review: secondaryReview}]]);
    roots.host.reviewStateForRoot = surface => roots.host.rootContexts.get(surface).review;
    roots.host.setReviewStateForRoot = (surface, patch) => Object.assign(roots.host.reviewStateForRoot(surface), patch);
    roots.host.historyBatchSelected = secondaryReview.historyBatchSelected;
    roots.host.historyBatchValues = secondaryReview.historyBatchValues;
    let releaseBatch;
    const delayedBatch = new Promise(resolve => { releaseBatch = resolve; });
    roots.host.enqueueMutation = async operation => { await delayedBatch; return operation(); };
    const pendingBatch = roots.host.recordHistoryBatchEntries("2026-09-19", [{itemId: "a", value: 1}], primary);
    releaseBatch();
    assert.equal(await pendingBatch, 1);
    assert.equal(primaryReview.historyBatchSelected.size, 0);
    assert.equal(primaryReview.historyBatchPreviewOpen, false);
    assert.deepEqual([...secondaryReview.historyBatchSelected], ["b"], "saving one root's historical batch must preserve another root's selection");
    assert.deepEqual(secondaryReview.historyBatchValues, {b: "2"});
    assert.equal(secondaryReview.historyBatchPreviewOpen, true);
    primaryReview.historyBatchSelected = new Set(["b"]);
    primaryReview.historyBatchValues = {b: "1"};
    primaryReview.historyBatchPreviewOpen = true;
    let releaseNewDraft;
    const newerDraftBatch = new Promise(resolve => { releaseNewDraft = resolve; });
    roots.host.enqueueMutation = async operation => { await newerDraftBatch; return operation(); };
    const pendingNewDraft = roots.host.recordHistoryBatchEntries("2026-09-19", [{itemId: "b", value: 1}], primary);
    primaryReview.historyBatchValues = {b: "3"};
    releaseNewDraft();
    assert.equal(await pendingNewDraft, 1);
    assert.deepEqual(primaryReview.historyBatchValues, {b: "3"}, "an older asynchronous completion must retain newer root-local input");
    assert.deepEqual([...primaryReview.historyBatchSelected], ["b"]);
    assert.equal(primaryReview.historyBatchPreviewOpen, true);
    console.log("Today recording bindings passed: regular/at-most binary inner, outer and icon actions; notes/photos; queued idempotency; snapshot undo; conflict and persistence protection.");
})().catch(error => { console.error(error); process.exitCode = 1; });
