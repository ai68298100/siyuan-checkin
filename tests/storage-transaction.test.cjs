const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const sourceRoot = path.join(__dirname, "..", "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-storage-transaction-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "storage-transaction.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
}
const {persistStoreWithReconciliation,persistStoreWithVerification,reconcileStoreSnapshots} = require(path.join(outputRoot, "storage-transaction.js"));
const baseItem = {id:"item",name:"阅读",icon:"📖",kind:"count",target:10,unit:"页",schedule:{type:"daily"},createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",createdDate:"2026-09-01",revisions:[],archivePeriods:[],group:"学习",priority:"medium",sortOrder:1,timeSlot:"any"};
const makeStore = (events = [], item = baseItem) => ({version:2,items:[item],events,eventTombstones:[]});
const makeEvent = (index, source = "manual", externalRef) => ({id:`event-${index}`,itemId:"item",occurredAt:new Date(Date.UTC(2026,8,17,0,0,index)).toISOString(),localDate:"2026-09-17",value:1,unit:"页",source,...(externalRef?{externalRef}:{})});
for (let index = 1; index <= 25; index += 1) {
    const result = reconcileStoreSnapshots(makeStore(), makeStore([makeEvent(index)]), makeStore([makeEvent(index + 25)]));
    assert.equal(result.merged.events.length, 2, `case ${index}: concurrent events must both survive`);
    assert.equal(result.localChanged, true, `case ${index}: local projection must absorb the remote event`);
    assert.equal(result.remoteNeedsWrite, true, `case ${index}: remote store must receive the local event`);
    assert.equal(result.conflict.conflicted, true, `case ${index}: changed remote baseline must be reported`);
}
const externalLocal = makeEvent(80,"api","shared-session");
const externalRemote = {...makeEvent(81,"api","shared-session"),value:2};
const deduped = reconcileStoreSnapshots(makeStore(),makeStore([externalLocal]),makeStore([externalRemote]));
assert.equal(deduped.merged.events.length,1,"same external identity must remain idempotent across windows");
assert.equal(deduped.localChanged,true,"local projection must converge to the canonical external event");
assert.equal(deduped.remoteNeedsWrite,false,"already-canonical remote identity needs no redundant rewrite");
const unchanged = reconcileStoreSnapshots(makeStore(),makeStore(),makeStore());
assert.equal(unchanged.conflict.conflicted,false); assert.equal(unchanged.localChanged,false); assert.equal(unchanged.remoteNeedsWrite,false);
const newerItem = {...baseItem,name:"阅读新名称",updatedAt:"2026-09-18T00:00:00.000Z"};
const itemMerge = reconcileStoreSnapshots(makeStore(),makeStore([],baseItem),makeStore([],newerItem));
assert.equal(itemMerge.merged.items[0].name,"阅读新名称"); assert.equal(itemMerge.localChanged,true); assert.equal(itemMerge.remoteNeedsWrite,false);
assert.match(indexSource, /withStorageLock\(async \(\) => \{[\s\S]*?loadData\(STORAGE_NAME\)[\s\S]*?reconcileNormalizedStoreSnapshots\(this\.lastPersistedStore, this\.store, normalizeStore\(stored\)\)/, "remote input must be normalized once and trusted snapshots reconciled inside the exclusive lock");
assert.match(indexSource, /if \(reconciliation\.remoteNeedsWrite\) \{[\s\S]*?await this\.persist\(\)/, "a merged local projection must converge back to storage before the user mutation");
assert.match(indexSource, /this\.lastPersistedStore = this\.cloneStore\(persistedSnapshot\);[\s\S]*?if \(this\.saveState === "saving"\)/, "every successful verified store write must advance the conflict baseline independently of UI save state");
assert.match(indexSource, /persistNormalizedStoreWithVerification\([\s\S]*?snapshot,[\s\S]*?loadData\(STORAGE_NAME\)/, "trusted mutation snapshots must use the normalized verification fast path");

const loadedModules = new Map();
function loadProduction(relative) {
    const filename = path.resolve(sourceRoot, relative);
    if (loadedModules.has(filename)) return loadedModules.get(filename).exports;
    const productionModule = {exports: {}};
    loadedModules.set(filename, productionModule);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
    new Function("require", "module", "exports", compiled)(request => {
        assert.ok(request.startsWith("."), `unexpected dependency ${request}`);
        return loadProduction(path.resolve(path.dirname(filename), `${request}.ts`));
    }, productionModule, productionModule.exports);
    return productionModule.exports;
}
const productionModel = loadProduction("model.ts");
const modelHelpers = loadProduction("model-helpers.ts");
const productionWorkflow = loadProduction("features/suggestion-workflow.ts");
const productionSuggestions = loadProduction("agent-suggestions.ts");
const sourceAst = ts.createSourceFile("index.ts", indexSource, ts.ScriptTarget.Latest, true);
const pluginClass = sourceAst.statements.find(node => ts.isClassDeclaration(node));
const hostMethods = ["enqueueMutation", "withStorageLock", "persist", "persistSuggestionWorkflow", "persistSuggestionWorkflowUnlocked", "persistViewPreferences", "rememberInitialSurfacePreferences", "handleSuggestionDecision", "undoSuggestionWorkflow", "recordBlockToday", "recordEvent", "openJournalEntry", "saveForm"];
const compiledHost = ts.transpileModule(`class TransactionHost {${hostMethods.map(name => {
    const member = pluginClass.members.find(node => node.name?.getText(sourceAst) === name);
    assert.ok(member, `${name} must exist`);
    return member.getText(sourceAst);
}).join("\n")}}`, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
let calendarDate = new Date(2026, 8, 17, 12);
let eventSequence = 1000;
let journalDialog;
let journalWrites = 0;
const messages = [];
const hostEnvironment = {
    ...productionModel, ...loadProduction("storage-transaction.ts"), ...productionWorkflow, ...productionSuggestions,
    ...loadProduction("shared.ts"), ...loadProduction("occasions.ts"),
    navigator: {}, STORAGE_LOCK_NAME: "test-lock", STORAGE_NAME: "checkin-store", BACKUP_STORAGE_NAME: "checkin-store-backup",
    SUGGESTION_WORKFLOW_STORAGE_NAME: "checkin-suggestion-workflow", VIEW_PREFERENCES_NAME: "checkin-view-preferences",
    currentCalendarDate: () => new Date(calendarDate),
    captureActionMoment: () => ({occurredAt: calendarDate.toISOString(), localDate: productionModel.dateKey(calendarDate)}),
    t: key => key, showMessage: message => messages.push(message),
    openJournalDialogFor: options => { journalDialog = options; }, buildJournalEventNote: () => "answers",
    buildJournalEntryMarkdown: () => "entry",
    saveEditorForm: async host => { await host.persist(); return "item"; },
    isTemplateLinkagePlan: value => value === "sireader",
    STREAK_MILESTONES: [], computeStreaksValue: () => new Map(), formatNumber: String,
};
const TransactionHost = new Function(...Object.keys(hostEnvironment), `let fallbackStorageQueue = Promise.resolve();\n${compiledHost}\nreturn TransactionHost;`)(...Object.values(hostEnvironment));
function deferred() {
    let resolve;
    const promise = new Promise(settle => { resolve = settle; });
    return {promise, resolve};
}
async function withinDeadline(operation) {
    let timer;
    try {
        return await Promise.race([operation, new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error("storage lock did not drain")), 3000); })]);
    } finally {
        clearTimeout(timer);
    }
}
function makeHost(initialStore = makeStore()) {
    const host = new TransactionHost();
    const storage = new Map([["checkin-store", productionModel.normalizeStore(initialStore)], ["checkin-occasions", {version: 1, occasions: []}]]);
    Object.assign(host, {
        store: structuredClone(storage.get("checkin-store")), lastPersistedStore: structuredClone(storage.get("checkin-store")),
        acceptingOperations: true, initializationState: "ready", storageReady: true, disposed: false, disposing: false,
        saveQueue: Promise.resolve(), auxiliarySaveQueue: Promise.resolve(), mutationQueue: Promise.resolve(),
        teardownWrites: {shouldIntercept: () => false}, occasionStore: {version: 1, occasions: []}, auditEntries: [], saveState: "idle",
        initialSurfacePreferences: {reviewFold: [], reviewFoldTouched: false, lastInsightsItemId: ""},
        journalDrafts: new Map(), journalPending: new Set(), journalIntegrationPref: {},
        cloneStore: structuredClone, itemFingerprint: modelHelpers.itemFingerprintValue,
        revisionFingerprint: modelHelpers.revisionFingerprintValue,
        makeEvent: (item, value, source, unit, note, externalRef, moment, attachment) => ({...moment, id: `test-${eventSequence++}`, itemId: item.id, value, source, unit, ...(note ? {note} : {}), ...(externalRef ? {externalRef} : {}), ...(attachment ? {attachment} : {})}),
        render: () => {}, renderBackgroundUpdate: () => {}, invalidateSummary: () => {}, broadcast: () => {},
        recordDiagnostic: () => {}, scheduleAuditPersist: () => {}, showSyncNotice: () => {},
        writebackNoteAnchor: () => Promise.resolve(), writeSummaryResidentForDate: () => Promise.resolve(),
        setRecentRecord: () => {}, maybeAutoArchiveAfterRecord: () => {}, collectViewPreferences: () => ({appearance: "dark", reviewFold: ["records"], reviewFoldTouched: true, lastInsightsItemId: "item"}),
        resolveJournalTemplateById: () => ({id: "daily", name: "Daily"}), listNotebooksForJournal: async () => [],
        resolveJournalTarget: async () => ({docId: "doc"}), kernelPost: async () => ({code: 0, data: []}),
        writeJournalEntry: async () => { journalWrites += 1; return {ok: true, docId: "doc", docName: "Daily"}; },
        advanceFirstSuccess: () => {}, suggestionNonce: () => `nonce-${eventSequence++}`,
        failStoreSave: false, failViewPreferencesSave: false,
        loadData: async key => structuredClone(storage.get(key)),
        saveData: async (key, value) => {
            if (key === "checkin-store" && host.failStoreSave) throw new Error("injected store failure");
            if (key === "checkin-view-preferences" && host.failViewPreferencesSave) throw new Error("injected preferences failure");
            storage.set(key, structuredClone(value));
        },
    });
    return {host, storage};
}
async function verifyHostTransactions() {
    const {host: blockHost, storage: blockStorage} = makeHost();
    blockStorage.set("checkin-store", productionModel.normalizeStore(makeStore([makeEvent(101)])));
    await blockHost.recordBlockToday("item", 2);
    assert.equal(blockStorage.get("checkin-store").events.length, 2, "render-block writes must preserve a remote event");
    const blocker = deferred();
    const held = blockHost.withStorageLock(() => blocker.promise);
    const staleWrite = blockHost.recordBlockToday("item", 3);
    blockStorage.set("checkin-store", productionModel.normalizeStore({...blockStorage.get("checkin-store"), items: [{...baseItem, unit: "本", updatedAt: "2026-10-01T00:00:00.000Z"}]}));
    blocker.resolve();
    await Promise.all([held, staleWrite]);
    assert.equal(blockStorage.get("checkin-store").events.length, 2, "a queued click must reject changed units instead of adopting a new fingerprint");

    const binaryItem = {...baseItem, kind: "binary", target: 1, unit: "次", journal: {templateId: "daily"}};
    const {host: journalHost, storage: journalStorage} = makeHost(makeStore([], binaryItem));
    await journalHost.openJournalEntry("item");
    journalStorage.set("checkin-store", productionModel.normalizeStore(makeStore([{...makeEvent(102), value: 1, unit: "次"}], binaryItem)));
    const beforeJournalWrites = journalWrites;
    assert.equal(await journalDialog.onSubmit(["answer"], {}), true);
    assert.equal(journalStorage.get("checkin-store").events.length, 1, "journal submission must recheck completion in the transaction and avoid duplicates");
    assert.equal(journalWrites, beforeJournalWrites + 1, "an already-recorded journal can still update its document");
    journalStorage.set("checkin-store", productionModel.normalizeStore(makeStore([], {...binaryItem, journal: {templateId: "other"}, updatedAt: "2026-10-01T00:00:00.000Z"})));
    assert.equal(await journalDialog.onSubmit(["answer"], {}), false, "journal rebinding while the dialog is open must invalidate its submission");
    assert.equal(journalWrites, beforeJournalWrites + 1, "rejected fact writes must not update a document");

    const {host: suggestionHost, storage: suggestionStorage} = makeHost();
    suggestionHost.suggestionWorkflow = productionWorkflow.createSuggestionWorkflow(productionSuggestions.createSuggestionEnvelope({
        id: "suggestion", title: "Priority", reason: "", requiresConfirmation: true,
        changes: [{itemId: "item", field: "priority", before: "medium", after: "high"}],
    }));
    suggestionHost.failStoreSave = true;
    const workflowBefore = structuredClone(suggestionHost.suggestionWorkflow);
    await assert.rejects(suggestionHost.handleSuggestionDecision("confirm"), /injected store failure/);
    assert.equal(suggestionHost.store.items[0].priority, "medium");
    assert.deepEqual(suggestionHost.suggestionWorkflow, workflowBefore, "failed application must leave a pending, unconsumed workflow available for retry");
    suggestionHost.failStoreSave = false;
    await suggestionHost.handleSuggestionDecision("confirm");
    assert.equal(suggestionStorage.get("checkin-store").items[0].priority, "high");
    const appliedBefore = structuredClone(suggestionHost.suggestionWorkflow);
    suggestionHost.failStoreSave = true;
    await assert.rejects(suggestionHost.undoSuggestionWorkflow(), /injected store failure/);
    assert.deepEqual(suggestionHost.suggestionWorkflow, appliedBefore, "failed undo must retain undo availability and its original audit state");
    assert.equal(suggestionHost.store.items[0].priority, "high");
    suggestionHost.failStoreSave = false;
    await suggestionHost.undoSuggestionWorkflow();
    assert.equal(suggestionStorage.get("checkin-store").items[0].priority, "medium");

    const {host: queueHost} = makeHost();
    const entered = deferred();
    const release = deferred();
    const mutation = queueHost.enqueueMutation(async () => {
        entered.resolve();
        await release.promise;
        await queueHost.persist();
    });
    await entered.promise;
    const preferenceWrite = queueHost.persistViewPreferences();
    await Promise.resolve();
    release.resolve();
    await withinDeadline(Promise.all([mutation, preferenceWrite]));
    assert.deepEqual(queueHost.initialSurfacePreferences, {reviewFold: ["records"], reviewFoldTouched: true, lastInsightsItemId: "item"},
        "successful preference persistence must advance the new-surface baseline after the storage lock releases");
    queueHost.failViewPreferencesSave = true;
    await assert.rejects(queueHost.persistViewPreferences(), /injected preferences failure/);
    assert.deepEqual(queueHost.initialSurfacePreferences, {reviewFold: ["records"], reviewFoldTouched: true, lastInsightsItemId: "item"},
        "failed preference persistence must not advance the new-surface baseline");
    queueHost.failViewPreferencesSave = false;
    queueHost.applyTemplateLinkagePlan = () => queueHost.persistViewPreferences();
    assert.equal(await withinDeadline(queueHost.saveForm(new Map([["linkagePlan", "sireader"]]), undefined, {localDate: "2026-09-17", occurredAt: calendarDate.toISOString()})), "item",
        "editor linkage preferences must save after the main-store transaction releases its lock");
    console.log("Production host transaction checks passed: render-block conflicts, journal duplicate/rebind, suggestion apply/undo failure retries, queue deadlocks and editor linkage.");
}
(async () => {
    for (let index = 1; index <= 25; index += 1) {
        const expected = makeStore([makeEvent(index)]);
        const concurrent = makeStore([makeEvent(index + 25)]);
        let stored = makeStore();
        let saves = 0;
        const result = await persistStoreWithVerification(expected, async () => stored, async (candidate) => {
            saves += 1;
            stored = saves === 1 ? concurrent : candidate;
        });
        assert.equal(result.attempts,2,`repair ${index}: a lost first write needs exactly one retry`);
        assert.equal(result.repaired,true,`repair ${index}: repaired flag must be observable`);
        assert.equal(result.store.events.length,2,`repair ${index}: both concurrent events must survive`);
        assert.equal(saves,2,`repair ${index}: retries must stay bounded`);
    }
    let superset = makeStore();
    const expected = makeStore([makeEvent(90)]);
    const concurrent = makeStore([makeEvent(91)]);
    const accepted = await persistStoreWithVerification(expected,async()=>superset,async(candidate)=>{superset=reconcileStoreSnapshots(makeStore(),candidate,concurrent).merged;});
    assert.equal(accepted.attempts,1,"a stored superset must be accepted without redundant rewriting");
    assert.equal(accepted.repaired,false);
    assert.equal(accepted.store.events.length,2);
    let reconciledStored = concurrent;
    const reconciled = await persistStoreWithReconciliation(expected,async()=>reconciledStored,async(candidate)=>{reconciledStored=candidate;});
    assert.equal(reconciled.attempts,1,"preflight reconciliation should merge remote data before the first write");
    assert.equal(reconciled.store.events.length,2,"preflight reconciliation must preserve a concurrent event");
    await assert.rejects(() => persistStoreWithVerification(expected,async()=>makeStore(),async()=>undefined,2),/store-write-verification-failed/);
    await verifyHostTransactions();
    console.log("Storage transaction checks passed: 200 concurrent assertions plus idempotency, verification and convergence boundaries.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
