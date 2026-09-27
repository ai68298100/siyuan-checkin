/* T-1509 外部失败记录待处理箱守门（D-293）：
   有界箱纯函数（入箱合并/满员拒绝/保留期剪除/fail-closed 归一化/序列化往返）、
   重试决策（重查不通过一律拒绝、绝不自动转投、绝不绕过墓碑）、
   宿主接线（recordExternalEvent 失败归因与入箱、存储桶、启动恢复、设置页动作与双语）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-external-pending-"));
const load = (relative) => {
    const target = path.join(dir, relative.replace(/[\\/]/g, "_"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const pending = load("features/external-pending.ts");

const ENTRY = {
    source: "yeguif",
    itemId: "item-1",
    value: 25,
    unit: "分钟",
    externalRef: "yeguif:block-1:2026-09-27",
    occurredAt: "2026-09-27T02:00:00.000Z",
    localDate: "2026-09-27",
    failedAt: "2026-09-27T02:00:05.000Z",
};

/* —— 1. 入箱：新条目 added；同身份合并（保留首次数据，不覆盖）；满员显式 full。 —— */
{
    const first = pending.buildExternalPendingEntry({itemId: ENTRY.itemId, value: ENTRY.value, unit: ENTRY.unit, source: ENTRY.source, externalRef: ENTRY.externalRef}, {occurredAt: ENTRY.occurredAt, localDate: ENTRY.localDate}, ENTRY.failedAt);
    assert.ok(first, "valid payload builds an entry");
    assert.equal(first.id, `yeguif:${ENTRY.itemId}:${ENTRY.externalRef}`, "identity is source+itemId+externalRef");
    const empty = {schemaVersion: 1, items: []};
    const added = pending.enqueueExternalPending(empty, first);
    assert.equal(added.outcome, "added");
    assert.equal(added.box.items.length, 1);
    /* 重复失败合并：attempts/原因更新走 settle/mark，不产生第二条。 */
    const merged = pending.enqueueExternalPending(added.box, {...first, value: 99, failedAt: "2026-09-27T03:00:00.000Z"});
    assert.equal(merged.outcome, "merged");
    assert.equal(merged.box.items[0].value, 25, "merged keeps the first failed payload");
    /* 满员：拒绝新条目且原箱不变（不静默覆盖最旧数据）。 */
    const full = {schemaVersion: 1, items: []};
    for (let index = 0; index < pending.EXTERNAL_PENDING_CAPACITY; index += 1) {
        const entry = pending.buildExternalPendingEntry({itemId: `item-${index}`, value: 1, unit: "次", source: "sireader", externalRef: `sireader:ref-${index}`}, {occurredAt: ENTRY.occurredAt, localDate: ENTRY.localDate}, ENTRY.failedAt);
        full.items.push(entry);
    }
    const overflow = pending.buildExternalPendingEntry({itemId: "item-new", value: 1, unit: "次", source: "sireader", externalRef: "sireader:ref-new"}, {occurredAt: ENTRY.occurredAt, localDate: ENTRY.localDate}, ENTRY.failedAt);
    assert.equal(pending.enqueueExternalPending(full, overflow).outcome, "full");
    assert.equal(pending.enqueueExternalPending(full, overflow).box.items.length, pending.EXTERNAL_PENDING_CAPACITY);
}

/* —— 2. 归一化 fail-closed：坏条目逐条丢弃、去重、超容量截断、JSON 字符串可读。 —— */
{
    const corrupted = {
        schemaVersion: 1,
        items: [
            ENTRY,
            {...ENTRY, source: "manual"},
            {...ENTRY, externalRef: ""},
            {...ENTRY, localDate: "2026/09/27"},
            {...ENTRY, value: -3},
            {...ENTRY, occurredAt: "not-a-date"},
            "junk",
        ],
    };
    const box = pending.normalizeExternalPendingBox(corrupted);
    assert.equal(box.items.length, 1, "only the valid entry survives");
    assert.equal(box.items[0].id, `yeguif:${ENTRY.itemId}:${ENTRY.externalRef}`);
    const duplicated = pending.normalizeExternalPendingBox({schemaVersion: 1, items: [ENTRY, {...ENTRY, note: "clone"}]});
    assert.equal(duplicated.items.length, 1, "same identity normalizes to one entry");
    assert.equal(pending.normalizeExternalPendingBox("not json").items.length, 0);
    assert.equal(pending.normalizeExternalPendingBox(undefined).items.length, 0);
    const roundTrip = pending.normalizeExternalPendingBox(JSON.parse(JSON.stringify(pending.serializeExternalPendingBox(box))));
    assert.deepEqual(roundTrip, box, "serialize/normalize round-trips");
}

/* —— 3. 保留期剪除：超过保留期到期移除，非法日期输入原样返回。 —— */
{
    const fresh = pending.buildExternalPendingEntry({itemId: "a", value: 1, unit: "次", source: "api", externalRef: "health:a:steps:2026-09-27"}, {occurredAt: ENTRY.occurredAt, localDate: "2026-09-27"}, ENTRY.failedAt);
    const stale = pending.buildExternalPendingEntry({itemId: "b", value: 1, unit: "次", source: "api", externalRef: "health:b:steps:2026-09-01"}, {occurredAt: "2026-09-01T02:00:00.000Z", localDate: "2026-09-01"}, "2026-09-01T02:00:00.000Z");
    const box = pending.normalizeExternalPendingBox({schemaVersion: 1, items: [fresh, stale]});
    const pruned = pending.pruneExternalPending(box, "2026-09-27");
    assert.equal(pruned.expired, 1);
    assert.equal(pruned.box.items.length, 1);
    assert.equal(pruned.box.items[0].itemId, "a", "fresh entry survives pruning");
    assert.equal(pending.pruneExternalPending(box, "bad-date").expired, 0, "invalid today key prunes nothing");
}

/* —— 4. 重试决策（唯一边界）：项目/映射/启用/墓碑/单位/日期任一不满足都拒绝；
      拒绝后条目保留并计入尝试；成功或重复后移除。 —— */
{
    const ok = {targetAvailable: true, sourceEnabled: true, tombstoned: false, unitMatches: true, dateNotFuture: true};
    assert.equal(pending.planExternalPendingRetry(ok).kind, "write");
    const refuses = [
        [{...ok, targetAvailable: false}, "target-gone"],
        [{...ok, sourceEnabled: false}, "source-disabled"],
        [{...ok, tombstoned: true}, "tombstoned"],
        [{...ok, unitMatches: false}, "unit-changed"],
        [{...ok, dateNotFuture: false}, "future-date"],
    ];
    for (const [context, reason] of refuses) {
        const plan = pending.planExternalPendingRetry(context);
        assert.equal(plan.kind, "refuse");
        assert.equal(plan.reason, reason);
    }
    const box = pending.normalizeExternalPendingBox({schemaVersion: 1, items: [ENTRY]});
    const id = pending.externalPendingIdentity(ENTRY.source, ENTRY.externalRef, ENTRY.itemId);
    const kept = pending.settleExternalPendingAfterRetry(box, id, {written: false, duplicate: false, reason: "source-disabled"}, "2026-09-27T03:00:00.000Z");
    assert.equal(kept.items.length, 1);
    assert.equal(kept.items[0].attempts, 1);
    assert.equal(kept.items[0].lastReason, "source-disabled");
    const recovered = pending.settleExternalPendingAfterRetry(kept, id, {written: true, duplicate: true}, "2026-09-27T03:01:00.000Z");
    assert.equal(recovered.items.length, 0, "successful retry removes the entry");
    assert.equal(pending.settleExternalPendingAfterRetry(recovered, id, {written: true, duplicate: true}, "2026-09-27T03:02:00.000Z"), recovered, "settling an absent entry is a no-op (repeat retry cannot double count)");
}

/* —— 5. 投影有界且不泄露函数/对象；设置页与宿主接线在位。 —— */
{
    const box = pending.normalizeExternalPendingBox({schemaVersion: 1, items: [ENTRY]});
    const views = pending.projectExternalPendingEntries(box, (itemId) => (itemId === "item-1" ? "拉伸" : undefined), 20);
    assert.equal(views.length, 1);
    assert.equal(views[0].itemName, "拉伸");
    assert.deepEqual(Object.keys(views[0]).sort(), ["attempts", "failedAt", "id", "itemId", "itemName", "lastReason", "localDate", "source", "unit", "value"]);
}

const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /EXTERNAL_PENDING_STORAGE_NAME = "checkin-external-pending"/, "pending box has its own storage bucket");
assert.match(indexSource, /private async recordExternalEvent\([\s\S]*?outcome\?: ExternalWriteOutcome/, "recordExternalEvent classifies outcomes");
assert.match(indexSource, /enqueueExternalPending\(this\.externalPendingBox, pending\)/, "storage failure enqueues into the pending box");
assert.match(indexSource, /if \(buffered\.outcome === "full"\) showMessage\(t\("set\.externalPendingFull"\)\)/, "full box is announced, never silently overwritten");
assert.match(indexSource, /void this\.recoverExternalPendingBox\(\);/, "startup recovery runs once after load");
assert.match(indexSource, /planExternalPendingRetry\(\{[\s\S]*?targetAvailable: governance\.available/, "retry re-queries governance before writing");
assert.match(indexSource, /"\[data-pending-retry\]"/, "settings bind pending retry actions");
assert.match(indexSource, /"\[data-pending-discard\]"/, "settings bind pending discard actions");
assert.match(indexSource, /set\.externalPendingDiscardConfirm/, "discard asks for confirmation");
assert.ok(!/removeExternalPendingEntry\(this\.externalPendingBox, id\)[\s\S]*{[\s\S]*tombstone/i.test(indexSource.slice(indexSource.indexOf("discardExternalPendingEntry"))), "discard never writes tombstones");

/* 设置页投影只读且仅在相关时渲染（空箱不制造噪音）。 */
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-external-pending/, "settings render the pending box row");
assert.match(settingsSource, /data-pending-retry=/, "pending entries expose retry actions");
assert.match(settingsSource, /data-pending-discard=/, "pending entries expose discard actions");
assert.match(settingsSource, /pendingState\.count > 0 \|\| pendingState\.saveFailed \|\| pendingState\.recovery/, "empty box stays hidden");

/* i18n 双语对齐。 */
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["set.externalPendingTitle", "set.externalPendingHint", "set.externalPendingCapacity", "set.externalPendingEmpty", "set.externalPendingSaveFailed", "set.externalPendingRecovered", "set.externalPendingFull", "set.externalPendingRetry", "set.externalPendingRetryDone", "set.externalPendingRetryFail", "set.externalPendingDiscard", "set.externalPendingDiscarded", "set.externalPendingDiscardConfirm", "set.externalPendingReasonStorage", "set.externalPendingRefuseTarget", "set.externalPendingRefuseSource", "set.externalPendingRefuseTombstone", "set.externalPendingRefuseUnit", "set.externalPendingRefuseFuture"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("external pending box gates passed: bounded enqueue/merge/full, retention pruning, fail-closed normalize, retry planning with full re-query, idempotent settle, host wiring and bilingual copy.");
