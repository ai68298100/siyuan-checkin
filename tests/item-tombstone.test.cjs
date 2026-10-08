/* T-1765 守门：主档项目删除跨窗口防复活（项目删除墓碑 itemTombstones）。
   风险路径（2026-09-30 审计）：mergeNormalizedStores 对项目按 id 并集，
   deleteItemsCascade 只为事件写墓碑；旧窗口仍持有项目时，并集合并与
   persist 写后校验会把已删项目（连同其全部事件）复活。
   修复后契约：
   - A 删除×B 旧快照合并：项目不复活，B 删除后新记的事件也一并丢弃；
   - reconcileNormalizedStoreSnapshots / persistNormalizedStoreWithVerification
     的写后修复同样不复活；
   - 删除后 updatedAt 晚于墓碑的项目（真实编辑/导入冲突）胜出，墓碑被取代；
   - 幂等重复删除、新建同名称新 id 项目、旧数据（无 itemTombstones）零迁移。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-item-tombstone-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "storage-transaction.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const model = require(path.join(dir, "model.js"));
const transaction = require(path.join(dir, "storage-transaction.js"));

const item = (id, name, updatedAt) => ({
    id,
    name,
    icon: "✓",
    kind: "binary",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: updatedAt || "2026-09-01T08:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    archived: false,
});
const event = (id, itemId, occurredAt) => ({
    id,
    itemId,
    occurredAt,
    localDate: occurredAt.slice(0, 10),
    value: 1,
    unit: "次",
    source: "manual",
});

/* —— 夹具 1：A 删除 × B 旧快照并集合并（含 B 删除后新记的事件） —— */
const baseStore = model.normalizeStore({
    version: 3,
    items: [item("p1", "晨读")],
    events: [event("e1", "p1", "2026-09-28T08:00:00.000Z")],
    eventTombstones: [],
});
const storeAAfterDelete = model.deleteItemsCascade(baseStore, ["p1"], "2026-09-30T09:00:00.000Z");
assert.equal(storeAAfterDelete.items.length, 0, "delete removes the item locally");
assert.equal(storeAAfterDelete.events.length, 0, "delete removes the events locally");
assert.ok(storeAAfterDelete.eventTombstones.some((t) => t.eventId === "e1"), "delete writes event tombstones");
assert.ok((storeAAfterDelete.itemTombstones || []).some((t) => t.itemId === "p1"), "delete writes an item tombstone");

const staleWindowB = model.normalizeStore({
    version: 3,
    items: [item("p1", "晨读")],
    events: [event("e1", "p1", "2026-09-28T08:00:00.000Z"), event("e2", "p1", "2026-09-30T09:30:00.000Z")],
    eventTombstones: [],
});
const merged = model.mergeNormalizedStores(storeAAfterDelete, staleWindowB);
assert.equal(merged.items.length, 0, "merge must not resurrect the deleted item (T-1765)");
assert.equal(merged.events.length, 0, "events recorded after the deletion must not resurrect either");
assert.ok(merged.itemTombstones.some((t) => t.itemId === "p1"), "merge keeps the item tombstone");
assert.equal(model.mergeNormalizedStores(staleWindowB, storeAAfterDelete).items.length, 0, "merge is commutative for deletion");

/* —— 夹具 2：写后校验（persist verification）在迟到旧写入落地后收敛为已删状态 —— */
const storage = {value: null};
(async () => {
    let staleLanded = false;
    const result = await transaction.persistNormalizedStoreWithVerification(
        storeAAfterDelete,
        async () => model.normalizeStore(storage.value),
        async (store) => {
            storage.value = JSON.parse(JSON.stringify({...store, itemTombstones: store.itemTombstones || []}));
            if (!staleLanded) {
                staleLanded = true;
                storage.value = JSON.parse(JSON.stringify(staleWindowB));
            }
            return storage.value;
        },
    );
    assert.ok(result.repaired, "the lost-update race is exercised");
    assert.equal(model.normalizeStore(storage.value).items.length, 0, "write-after verification must converge to the deleted state");

    /* —— 夹具 3：reconcileNormalizedStoreSnapshots 的并集写回同样不复活 —— */
    const reconciliation = transaction.reconcileNormalizedStoreSnapshots(baseStore, storeAAfterDelete, staleWindowB);
    assert.equal(reconciliation.merged.items.length, 0, "reconcile merge must not resurrect the deleted item");
    assert.equal(reconciliation.merged.events.length, 0, "reconcile merge must not resurrect events");
    assert.ok(reconciliation.remoteNeedsWrite, "the reconciled store is written back over the stale snapshot");

    /* —— 夹具 4：删除后的真实编辑（updatedAt 晚于墓碑）胜出，墓碑被取代 —— */
    const editedElsewhere = model.normalizeStore({
        version: 3,
        items: [item("p1", "晨读（改名）", "2026-10-01T08:00:00.000Z")],
        events: [],
        eventTombstones: [],
    });
    const editWins = model.mergeNormalizedStores(storeAAfterDelete, editedElsewhere);
    assert.equal(editWins.items.length, 1, "an item edited after the recorded deletion wins over the tombstone");
    assert.equal(editWins.itemTombstones.length, 0, "the superseded tombstone is dropped from the canonical store");

    /* —— 夹具 5：幂等重复删除不复制墓碑；新建同名称新 id 项目不受影响 —— */
    const twice = model.deleteItemsCascade(storeAAfterDelete, ["p1"], "2026-09-30T10:00:00.000Z");
    assert.equal(twice.itemTombstones.length, storeAAfterDelete.itemTombstones.length, "re-deleting an absent item is idempotent");
    const recreated = model.normalizeStore({
        version: 3,
        ...(() => {
            const withNew = model.mergeNormalizedStores(storeAAfterDelete, model.normalizeStore({
                version: 3,
                items: [item("p2", "晨读")],
                events: [],
                eventTombstones: [],
                itemTombstones: storeAAfterDelete.itemTombstones,
            }));
            return {items: withNew.items, events: withNew.events, eventTombstones: withNew.eventTombstones, itemTombstones: withNew.itemTombstones};
        })(),
    });
    assert.equal(recreated.items.length, 1, "a new item with a fresh id is unaffected by the old tombstone");
    assert.equal(recreated.items[0].id, "p2");

    /* —— 夹具 6：旧数据（无 itemTombstones 字段）零迁移 —— */
    const legacy = model.normalizeStore({version: 3, items: [item("p1", "晨读")], events: [event("e1", "p1", "2026-09-28T08:00:00.000Z")], eventTombstones: []});
    assert.deepEqual(legacy.itemTombstones, [], "legacy stores normalize to an empty item tombstone list");
    assert.equal(legacy.items.length, 1, "legacy items are untouched");

    /* —— 夹具 7：指纹对 itemTombstones 敏感（写后校验不能把丢墓碑误判为相等） —— */
    const withoutTombstones = model.normalizeStore({version: 3, items: [], events: [], eventTombstones: []});
    const withTombstones = model.normalizeStore({version: 3, items: [], events: [], eventTombstones: [], itemTombstones: [{itemId: "p1", deletedAt: "2026-09-30T09:00:00.000Z"}]});
    assert.notEqual(model.areNormalizedStoresEqual(withoutTombstones, withTombstones), true, "fingerprint must include item tombstones");

    /* —— 夹具 8：快照信封往返保留墓碑 —— */
    const envelope = model.createStoreSnapshotEnvelope(storeAAfterDelete, "2026-09-30T11:00:00.000Z");
    const roundTrip = model.normalizeStore(envelope.store);
    assert.ok(roundTrip.itemTombstones.some((t) => t.itemId === "p1"), "snapshot envelopes preserve item tombstones");

    console.log("item-tombstone: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
