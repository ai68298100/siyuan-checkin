/* T-1622 守门：跨窗口三桶（提醒动作 / 事项完成 / 外部失败箱）的确定性合并。
   - 提醒动作：按 (id,action,at) 身份并集，两窗口动作互不覆盖，交换律成立；
   - 事项完成：共享 id 的 completedDates 并集，不采用远端独有事项（不复活删除）；
   - 失败箱：按条目身份并集（本地载荷优先），远端独有条目采用，容量 40 强制；
   - 接线：reminderUserAction 动作前并入、persistOccasions 写前合并、discard/retry 变更前同步。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-cross-window-merge-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "occasions.ts", "reminders.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
fs.writeFileSync(path.join(dir, "external-pending.js"), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", "features", "external-pending.ts"), "utf8"), {compilerOptions}).outputText);

const reminders = require(path.join(dir, "reminders.js"));
const occasions = require(path.join(dir, "occasions.js"));
const pending = require(path.join(dir, "external-pending.js"));
const inboxSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "docktomato-inbox.ts"), "utf8");
const templatesSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "templates.ts"), "utf8");
const workflowSource = fs.readFileSync(path.join(__dirname, "..", "src", "features", "suggestion-workflow.ts"), "utf8");

const pluginSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const pageNavigationSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-page-navigation.ts"), "utf8");

/* —— 提醒动作并集 —— */
const localActions = [
    {id: "rem-a", action: "snooze", at: "2026-09-30T08:00:00.000Z"},
    {id: "rem-b", action: "skip", at: "2026-09-30T09:00:00.000Z"},
];
const remoteActions = [
    {id: "rem-c", action: "skip", at: "2026-09-30T07:30:00.000Z"},
    {id: "rem-a", action: "skip", at: "2026-09-30T10:00:00.000Z"},
];
const mergedActions = reminders.mergeReminderUserActions(localActions, remoteActions);
assert.deepEqual(mergedActions.map((entry) => entry.id + ":" + entry.action), ["rem-c:skip", "rem-a:snooze", "rem-b:skip", "rem-a:skip"],
    "union keeps both windows' actions sorted by time");
assert.deepEqual(reminders.mergeReminderUserActions(localActions, localActions.map((entry) => ({...entry}))).length, 2,
    "same identity (id,action,at) is deduplicated");
assert.deepEqual(reminders.mergeReminderUserActions(localActions, reminders.mergeReminderUserActions(localActions, remoteActions)),
    reminders.mergeReminderUserActions(localActions, remoteActions),
    "re-merging an already-merged set is stable");
assert.ok(reminders.mergeReminderUserActions(remoteActions, localActions), "commutative call shape works");
const restoredActions = reminders.mergeReminderUserActions(
    [{id: "rem-restore", action: "restore", at: "2026-09-30T10:00:00.000Z"}],
    [{id: "rem-restore", action: "skip", at: "2026-09-30T09:00:00.000Z"}],
);
assert.equal(reminders.applyReminderActions([{id: "rem-restore", source: "checkin", sourceId: "item", title: "恢复", dueDate: "2026-09-30", daysUntil: 0, status: "today", note: ""}], restoredActions, "2026-09-30")[0].status, "today",
    "a restore removal record suppresses an older remote reminder action");

/* —— 事项完成并集 —— */
const localStore = {
    version: 1,
    occasions: [
        {id: "occ-1", name: "本地名", kind: "once", date: "2026-09-01", recurrence: "once", enabled: true, completedDates: ["2026-09-01", "2026-09-02"]},
        {id: "occ-2", name: "仅本地", kind: "weekly", date: "2026-09-02", recurrence: "weekly", enabled: true, completedDates: ["2026-09-03"]},
    ],
};
const remoteStore = {
    version: 1,
    occasions: [
        {id: "occ-1", name: "远端名", kind: "once", date: "2026-09-01", recurrence: "once", enabled: true, completedDates: ["2026-09-02", "2026-09-05"]},
        {id: "occ-9", name: "仅远端（应不采用）", kind: "once", date: "2026-09-09", recurrence: "once", enabled: true, completedDates: ["2026-09-09"]},
    ],
};
const mergedOccasions = occasions.mergeOccasionCompletions(localStore, remoteStore);
assert.equal(mergedOccasions.occasions.length, 3, "remote-only occasions are adopted when no deletion tombstone exists");
const mergedOcc1 = mergedOccasions.occasions.find((item) => item.id === "occ-1");
assert.deepEqual(mergedOcc1.completedDates, ["2026-09-01", "2026-09-02", "2026-09-05"], "shared id unions completedDates sorted");
assert.equal(mergedOcc1.name, "本地名", "local scalars win for shared ids");
assert.deepEqual(mergedOccasions.occasions.find((item) => item.id === "occ-2").completedDates, ["2026-09-03"], "local-only occasions untouched");
assert.ok(mergedOccasions.occasions.some((item) => item.id === "occ-9"), "a remote create survives the merge");
assert.equal(occasions.mergeOccasionCompletions(localStore, {version: 1, occasions: []}), localStore,
    "no overlap returns the local store unchanged");
const bothOrders = [
    occasions.mergeOccasionCompletions(localStore, remoteStore),
    occasions.mergeOccasionCompletions(localStore, remoteStore),
];
assert.deepEqual(bothOrders[0], bothOrders[1], "merge is deterministic");

const deletedLocalStore = {
    version: 1,
    occasions: [{...localStore.occasions[1]}],
    tombstones: [{occasionId: "occ-1", deletedAt: "2026-09-30T10:00:00.000Z"}],
};
const staleRemoteStore = {
    version: 1,
    occasions: [{...localStore.occasions[0]}, {...localStore.occasions[1]}, {id: "occ-10", name: "并发新建", kind: "once", date: "2026-09-10", recurrence: "once", enabled: true, completedDates: []}],
};
const tombstoneMerged = occasions.mergeOccasionCompletions(deletedLocalStore, staleRemoteStore);
assert.equal(tombstoneMerged.occasions.some((item) => item.id === "occ-1"), false, "a local deletion tombstone suppresses a stale remote item");
assert.equal(tombstoneMerged.occasions.some((item) => item.id === "occ-10"), true, "unrelated remote creates remain visible");
assert.deepEqual(occasions.normalizeOccasionStore({occasions: staleRemoteStore.occasions, tombstones: deletedLocalStore.tombstones}).occasions.map((item) => item.id), ["occ-2", "occ-10"], "normalization filters tombstoned occasions before projection");
const deleted = occasions.deleteOccasion(occasions.normalizeOccasionStore({occasions: [localStore.occasions[0]]}), "occ-1");
assert.equal(deleted.occasions.length, 0, "delete removes the occasion from the local projection");
assert.equal(deleted.tombstones.some((tombstone) => tombstone.occasionId === "occ-1"), true, "delete records an occasion tombstone");

/* —— 失败箱并集 —— */
const entry = (source, externalRef, itemId, value) => ({
    source, externalRef, itemId, value, unit: "分钟",
    occurredAt: "2026-09-30T01:00:00.000Z", localDate: "2026-09-30",
});
const localBox = pending.normalizeExternalPendingBox({items: [entry("sireader", "ref-1", "item-a", 12)]});
const remoteBox = pending.normalizeExternalPendingBox({items: [entry("weread", "ref-2", "item-b", 30), entry("sireader", "ref-1", "item-a", 99)]});
const mergedBox = pending.mergeExternalPendingBoxes(localBox, remoteBox);
assert.equal(mergedBox.items.length, 2, "remote-only entry is adopted, identities deduplicated");
assert.equal(mergedBox.items.find((item) => item.externalRef === "ref-1").value, 12, "identity collision keeps the local payload first");
assert.deepEqual(pending.mergeExternalPendingBoxes(localBox, pending.normalizeExternalPendingBox({items: []})).items, localBox.items,
    "empty remote merge keeps the local items verbatim");
const saturated = pending.mergeExternalPendingBoxes(
    pending.normalizeExternalPendingBox({items: Array.from({length: 40}, (_, index) => entry("sireader", "local-" + index, "item-a", 1))}),
    pending.normalizeExternalPendingBox({items: Array.from({length: 5}, (_, index) => entry("weread", "remote-" + index, "item-b", 1))}),
);
assert.equal(saturated.items.length, 40, "capacity 40 is still enforced after merge");

/* —— 接线（精确签名） —— */
assert.match(pluginSource, /const storedActions = await this\.loadData\(REMINDER_ACTIONS_NAME\);[\s\S]{0,220}mergeReminderUserActions\(this\.reminderUserActions, deserializeReminderUserActions\(storedActions\)\)/,
    "reminderUserAction must merge remote actions before applying the local action");
assert.match(pluginSource, /const stored = await this\.loadData\(OCCASIONS_STORAGE_NAME\);[\s\S]{0,120}mergeOccasionCompletions\(store, normalizeOccasionStore\(stored\)\)/,
    "persistOccasions must merge completions before writing");
assert.match(pluginSource, /删除墓碑优先/, "occasion persistence must document tombstone precedence");
assert.match(pluginSource, /const reconciledOccasions = mergeOccasionCompletions\(this\.occasionStore, remoteOccasions\)/,
    "mutation refresh must reconcile the occasion bucket instead of replacing local state with a stale remote snapshot");
assert.equal((pluginSource.match(/await this\.mergeExternalPendingFromRemoteUnlocked\(\)/g) || []).length >= 4, true,
    "record failure, discard, retry and recovery must sync the pending box before mutating");
assert.match(pluginSource, /mergeExternalPendingBoxes\(this\.externalPendingBox, remote\)/,
    "the pending sync must use the union helper");
assert.match(pluginSource, /private async retryExternalPendingEntry\(id: string\): Promise<boolean> \{[\s\S]*?const result = await this\.enqueueMutation\(async \(\) => \{[\s\S]*?recordExternalEvent\(/,
    "pending retry must keep remote merge, event write and box settlement in one mutation");
assert.match(pluginSource, /private async discardExternalPendingEntry\(id: string\): Promise<boolean> \{[\s\S]*?return this\.withStorageLock\(async \(\) => \{/,
    "pending discard must run under the storage lock");
assert.match(pluginSource, /private async discardExternalPendingEntry\(id: string\): Promise<boolean> \{[\s\S]*?const previous = this\.externalPendingBox;[\s\S]*?await this\.persistExternalPendingBox\(\);[\s\S]*?const saveFailed = this\.externalPendingSaveFailed;[\s\S]*?if \(saveFailed\) \{[\s\S]*?this\.externalPendingBox = previous;/,
    "external pending discard must roll back the in-memory removal when persistence fails");
assert.match(pluginSource, /const saveFailed = this\.externalPendingSaveFailed;[\s\S]*?showMessage\(t\(saveFailed \? "set\.externalPendingSaveFailed" : "set\.externalPendingDiscarded"\)\);[\s\S]*?return !saveFailed;/,
    "external pending discard must report persistence failure instead of claiming it was discarded");
assert.match(templatesSource, /export function mergeUserTemplates\(/, "user templates must have a deterministic cross-window merge");
assert.match(pluginSource, /private async persistUserTemplates\(next: UserTemplate\[\]\): Promise<void> \{[\s\S]*?mergeUserTemplates\(next, remote\)/,
    "template writes must merge remote templates while holding the storage lock");
assert.match(pluginSource, /private async persistCustomIconLibrary\(next: string\[\]\): Promise<void> \{/,
    "custom icon writes must use a lock-held host method");
assert.match(pluginSource, /private lastPersistedJournalTemplates: JournalTemplateDef\[\] = \[\];/,
    "journal templates must keep a persisted baseline for concurrent saves");
assert.match(pluginSource, /private async saveJournalData\(\): Promise<void> \{[\s\S]*?await this\.withStorageLock\(async \(\) => \{[\s\S]*?localTemplatesChanged/,
    "journal configuration writes must reconcile remote state while holding the storage lock");
assert.match(pluginSource, /lastPersistedJournalIntegration = \{\.\.\.this\.journalIntegrationPref\};/,
    "journal integration baseline must be initialized after restore");
assert.match(pluginSource, /reminderUserAction\(id: string, action: "snooze" \| "skip" \| "restore" \| "defer"\): void \{[\s\S]*?void this\.enqueueMutation\(async \(\) => \{/,
    "reminder actions must write inside the mutation queue");
assert.match(pluginSource, /D-315：偏好桶明确采用后写者胜[\s\S]*?withStorageLock/, "preference writes must document and serialize the last-writer-wins boundary");
assert.match(workflowSource, /export function mergeSuggestionWorkflows\(/, "suggestion workflow must merge concurrent audit/token updates");
assert.match(pluginSource, /private persistSuggestionWorkflow\(\): Promise<void> \{[\s\S]*?withStorageLock\(\(\) => this\.persistSuggestionWorkflowUnlocked\(\)\)/, "suggestion persistence must reconcile remote workflow state under the lock");
assert.match(pluginSource, /analysisHistorySaveQueue[\s\S]*?const remoteHistory = typeof this\.loadData === "function"[\s\S]*?mergeAnalysisSnapshots\(localHistory, remoteHistory\)/,
    "analysis history writes must union the remote append-only cache before persisting");
assert.match(pluginSource, /const lock = \(this as unknown as \{withStorageLock\?:[\s\S]*?if \(typeof lock === "function"\) await lock\.call\(this, persist\)/,
    "analysis history persistence must use the shared storage lock when the host provides it");
assert.match(pluginSource, /private async persistAuditBestEffort\(mergeRemote = true\): Promise<void> \{[\s\S]*?mergeStoreAudits\(/, "audit persistence must merge remote append-only diagnostics under the lock");
assert.match(pluginSource, /data-action='clear-audit'[\s\S]*?runSettingsAction\(control, \(\) => this\.clearAuditEntries\(\), "\[data-action='clear-audit'\]:not\(\[disabled\]\)"\)/, "explicit audit clear must use the settings busy/focus lifecycle");
assert.match(pluginSource, /private async clearAuditEntries\(\): Promise<void> \{[\s\S]*?withStorageLock\(\(\) => this\.saveData\(AUDIT_STORAGE_NAME, \[\]\)\)/, "explicit audit clear must replace the audit bucket under the storage lock");
assert.match(pluginSource, /private async persistFocusDiagnosticsBestEffort\(\): Promise<void> \{[\s\S]*?withStorageLock\([\s\S]*?mergeDockTomatoCompletionIssueArchives\(/, "focus diagnostics writes must merge remote issues and permanent resolutions under the storage lock");
assert.match(pluginSource, /data-action='clear-focus-issues'[\s\S]*?this\.clearFocusDiagnostics\(\)/, "focus diagnostics clear must use the rollback-aware host method");
assert.match(pluginSource, /private async clearFocusDiagnostics\(\): Promise<void> \{[\s\S]*?const cleared = clearDockTomatoCompletionIssueArchive\(merged\);[\s\S]*?await this\.saveData[\s\S]*?restoreDockTomatoCompletionIssues\(mergeDockTomatoCompletionIssueArchives/, "focus diagnostics clear must apply its watermark only after a successful write and retain concurrent diagnostics");
assert.match(pluginSource, /private async clearSnapshotHistory\(\): Promise<void> \{[\s\S]*?withStorageLock\(\(\) => this\.saveData\(BACKUP_STORAGE_NAME, createEmptyStoreSnapshotHistory\(\)\)/, "snapshot clear must be serialized under the storage lock");
assert.match(pluginSource, /private async importSnapshotHistory\(history: ReturnType<typeof parseStoreSnapshotHistoryExport>\): Promise<void> \{[\s\S]*?withStorageLock\(\(\) => this\.saveData\(BACKUP_STORAGE_NAME, history\)/, "snapshot import must replace the archive under the storage lock");
assert.match(pluginSource, /async onDataChanged\(\)[\s\S]*?await this\.withStorageLock\(async \(\) => \{[\s\S]*?VIEW_PREFERENCES_NAME/, "external data reload must apply independent buckets inside the storage lock");
assert.match(pluginSource, /shouldRepairSuggestionWorkflow = true[\s\S]*?if \(shouldRepairSuggestionWorkflow\) void this\.persistSuggestionWorkflow\(\)/,
    "onDataChanged must defer suggestion repair until after releasing the storage lock");
assert.match(pluginSource, /private async retrySave\(\)[\s\S]*?await this\.enqueueMutation\(\(\) => this\.persist\(this\.store\)\)/,
    "manual main-store retry must use the same mutation queue as ordinary writes");

/* —— Agent 创建口：入队 + 失败回滚（T-1622 剩余切片） —— */
const agentCreateBlock = pluginSource.slice(pluginSource.indexOf("createItem: async (created) => {"), pluginSource.indexOf("createOccasion: async (created) => {"));
assert.match(agentCreateBlock, /await this\.enqueueMutation\(async \(\) => \{/, "Agent createItem must go through enqueueMutation (main-store reconcile applies)");
assert.match(agentCreateBlock, /const previous = this\.store;/, "Agent createItem must snapshot the store");
assert.match(agentCreateBlock, /this\.store = previous;\s*\r?\n\s*throw error;/, "Agent createItem must roll back on persist failure and rethrow");
assert.match(pluginSource.slice(pluginSource.indexOf("createOccasion: async (created) => {"), pluginSource.indexOf("createOccasion: async (created) => {") + 700),
    /const previous = this\.occasionStore;[\s\S]*?this\.occasionStore = previous;\s*\r?\n\s*throw error;/,
    "Agent createOccasion must roll back on persist failure and rethrow");
/* 主 Store 导入/恢复必须先进入同一锁内刷新，再进行替换写入；失败不能留下只在内存中的导入结果。 */
for (const marker of ["this.importCsvRows(parsed.rows)", "this.importLoopPlan(plan)", "importObsidianHabitsInto(this.store, plan)", "this.store = backup.store", "this.store = backup"]) {
    const markerIndex = pluginSource.indexOf(marker);
    assert.ok(markerIndex >= 0, `store mutation marker ${marker} must remain wired`);
    const window = pluginSource.slice(Math.max(0, markerIndex - 900), markerIndex + 900);
    assert.match(window, /await this\.enqueueMutation\(async \(\) => \{/,
        `${marker} must run inside the exclusive mutation queue`);
    assert.match(window, /const (?:previous(?:Store)?|current) = this\.(?:store|cloneStore\(this\.store\));[\s\S]*?this\.store = (?:previous(?:Store)?|current);[\s\S]*?throw error;/,
        `${marker} must restore the in-memory store when persistence fails`);
}
const occasionOverrideBlock = pluginSource.slice(pluginSource.indexOf("private saveOccasionOverride"), pluginSource.indexOf("private async retrySave"));
assert.match(occasionOverrideBlock, /void this\.enqueueMutation\(async \(\) => \{[\s\S]*?const previous = this\.occasionStore;[\s\S]*?setOccasionOverride\(previous, id, originalDate, newDate\)[\s\S]*?await this\.persistOccasions\([^)]*\)/,
    "occasion override must calculate and persist inside the mutation queue");

const blockRecordBody = pluginSource.slice(pluginSource.indexOf("private async recordBlockToday"), pluginSource.indexOf("private async jumpToItemAnchorDoc"));
assert.match(blockRecordBody, /await this\.enqueueMutation\(\(\) => this\.recordEvent\(/,
    "render-block recording must enter the mutation queue before the main-store write");
const journalBody = pluginSource.slice(pluginSource.indexOf("private async openJournalEntry"), pluginSource.indexOf("private async openPastDiary"));
assert.match(journalBody, /const factReady = await this\.enqueueMutation\(async \(\) => \{[\s\S]*?await this\.recordEvent\(/,
    "journal fact recording must enter the mutation queue before the main-store write");
const suggestionBody = pluginSource.slice(pluginSource.indexOf("private async handleSuggestionDecision"), pluginSource.indexOf("private downloadExport"));
assert.match(suggestionBody, /private async handleSuggestionDecision[\s\S]*?const outcome = await this\.enqueueMutation\(async \(\) => \{[\s\S]*?await this\.persist\(\)/,
    "suggestion confirmation must reconcile and persist the main store inside the mutation queue");
assert.match(suggestionBody, /private async undoSuggestionWorkflow[\s\S]*?const outcome = await this\.enqueueMutation\(async \(\) => \{[\s\S]*?await this\.persist\(\)/,
    "suggestion undo must reconcile and persist the main store inside the mutation queue");
assert.match(pageNavigationSource, /undoButton\.addEventListener\([\s\S]*?host\.enqueueMutation\(\(\) => host\.setOccasionCompleted\(/,
    "catch-up undo must use the mutation queue");
assert.match(pageNavigationSource, /void host\.enqueueMutation\(\(\) => host\.setOccasionCompleted\(id, occurrenceDate, true\)\)/,
    "catch-up completion must use the mutation queue");
const completeItemsBody = pluginSource.slice(pluginSource.indexOf("private async completeItems"), pluginSource.indexOf("/* T-1222 跳过"));
assert.match(completeItemsBody, /void this\.enqueueMutation\(\(\) => this\.setOccasionCompleted\(/,
    "batch completion occasion linkage must defer the auxiliary write through the mutation queue");
assert.match(inboxSource, /export function mergeInboxStores\(/, "Dock Tomato inbox must expose deterministic cross-window merge");
assert.match(pluginSource, /private async persistDockTomatoInboxWithLock\(\)/, "inbox side writes must have a lock-held wrapper");
assert.match(pluginSource, /lastError: "inbox-cleanup-pending"[\s\S]*?await this\.persistDockTomatoInbox\(\);/, "inbox cleanup failure must await the pending rewrite before releasing the mutation lock");
assert.match(pluginSource, /await this\.mergeDockTomatoInboxFromRemoteUnlocked\(\);[\s\S]*?const next = removeInboxEntry\(this\.dockTomatoInbox, identity\)/,
    "manual inbox discard must merge remote state before deletion");
assert.match(pluginSource, /private async discardDockTomatoInboxEntry\(identity: string\): Promise<boolean> \{[\s\S]*?return this\.withStorageLock\(async \(\) => \{/,
    "manual inbox discard must run under the storage lock");
assert.match(pluginSource, /private async discardDockTomatoInboxEntry\(identity: string\): Promise<boolean> \{[\s\S]*?const previous = this\.dockTomatoInbox;[\s\S]*?const persisted = await this\.persistDockTomatoInbox\(\);[\s\S]*?if \(!persisted\) \{[\s\S]*?this\.dockTomatoInbox = previous;/,
    "inbox discard must roll back the in-memory removal when persistence fails");
assert.match(pluginSource, /private async undoSkipAndRecordDockTomatoInboxEntry\(identity: string\): Promise<boolean> \{[\s\S]*?await this\.mergeDockTomatoInboxFromRemoteUnlocked\(\);/,
    "undo-skip inbox mutation must refresh remote state before removing the entry");
assert.match(pluginSource, /if \(!cleanupPersisted\) \{[\s\S]{0,700}?await this\.persistDockTomatoInbox\(\);/,
    "successful Dock Tomato completion must await inbox cleanup while the mutation lock is held");
assert.doesNotMatch(pluginSource, /if \(!cleanupPersisted\) \{[\s\S]{0,700}?void this\.persistDockTomatoInbox\(\);/,
    "inbox cleanup must not fire-and-forget a stale write after the mutation lock is released");
/* 偏好桶决策（D-315）：不做跨窗口合并——注册表文档必须记录该决策而非静默。 */
const registryDoc = fs.readFileSync(path.join(__dirname, "..", "docs", "settings-field-registry-2026-09-28.md"), "utf8");
assert.match(registryDoc, /D-315/, "the preference-bucket decision must be recorded in the field registry doc");
assert.match(registryDoc, /后写者胜/, "the decision must name the last-writer-wins policy");

fs.rmSync(dir, {recursive: true, force: true});
console.log("Cross-window merge checks passed: reminder union, occasion completion union (no resurrection), pending box union, wire-up signatures.");
