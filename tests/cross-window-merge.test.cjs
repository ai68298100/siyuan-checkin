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

const pluginSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

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
assert.equal(mergedOccasions.occasions.length, 2, "remote-only occasions must not be adopted (no resurrection of local deletions)");
const mergedOcc1 = mergedOccasions.occasions.find((item) => item.id === "occ-1");
assert.deepEqual(mergedOcc1.completedDates, ["2026-09-01", "2026-09-02", "2026-09-05"], "shared id unions completedDates sorted");
assert.equal(mergedOcc1.name, "本地名", "local scalars win for shared ids");
assert.deepEqual(mergedOccasions.occasions.find((item) => item.id === "occ-2").completedDates, ["2026-09-03"], "local-only occasions untouched");
assert.equal(occasions.mergeOccasionCompletions(localStore, {version: 1, occasions: []}), localStore,
    "no overlap returns the local store unchanged");
const bothOrders = [
    occasions.mergeOccasionCompletions(localStore, remoteStore),
    occasions.mergeOccasionCompletions(localStore, remoteStore),
];
assert.deepEqual(bothOrders[0], bothOrders[1], "merge is deterministic");

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
assert.match(pluginSource, /不采用远端独有事项/, "occasion merge must document the no-adoption deletion boundary");
assert.equal((pluginSource.match(/await this\.mergeExternalPendingFromRemote\(\)/g) || []).length, 2,
    "discard and retry must sync the pending box before mutating");
assert.match(pluginSource, /mergeExternalPendingBoxes\(this\.externalPendingBox, remote\)/,
    "the pending sync must use the union helper");

fs.rmSync(dir, {recursive: true, force: true});
console.log("Cross-window merge checks passed: reminder union, occasion completion union (no resurrection), pending box union, wire-up signatures.");
