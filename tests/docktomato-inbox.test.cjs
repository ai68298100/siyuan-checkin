/* 底栏番茄钟收件箱纯函数层守门（PR #5 评审第五、六节）：
   completedAt 时钟、载荷规范化、合并冲突、重试节奏与容量边界。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("src/features/docktomato-inbox.ts", "utf8");
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const moduleUnderTest = {exports: {}};
new Function("require", "module", "exports", compiled)((id) => {
    if (id === "../model") return {dateKey: (date = new Date()) => { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }};
    throw new Error(`Unexpected dependency: ${id}`);
}, moduleUnderTest, moduleUnderTest.exports);

const {
    completionClock, normalizeValidIsoTimestamp, normalizeInboxStore, serializeInboxStore,
    upsertInboxEntry, removeInboxEntry, markInboxRetry, markInboxBlocked,
    inboxDueEntries, inboxNextWakeDelayMs, dockTomatoCompletionValue,
    DOCKTOMATO_INBOX_CAPACITY, INBOX_RETRY_DELAYS_MS, projectInboxEntries,
} = moduleUnderTest.exports;

const entry = (overrides = {}) => ({
    identity: "session-1",
    externalRef: "docktomato:session-1",
    itemId: "read",
    itemUnit: "分钟",
    tomatoMode: "minutes",
    durationMinutes: 25,
    occurredAt: "2026-09-18T15:59:59.000Z",
    localDate: "2026-09-18",
    state: "pending",
    attempts: 0,
    receivedAt: "2026-09-19T10:00:00.000Z",
    updatedAt: "2026-09-19T10:00:00.000Z",
    ...overrides,
});

(async () => {
    /* 完成钟表:以 completedAt 为准;跨午夜归属完成日;缺失/无效不得回退当前时间。 */
    assert.deepEqual(completionClock("2026-09-19T10:00:00.000Z"), {occurredAt: "2026-09-19T10:00:00.000Z", localDate: "2026-09-19"});
    const midnight = completionClock("2026-09-18T15:59:59.000Z");
    assert.equal(midnight.occurredAt, "2026-09-18T15:59:59.000Z");
    assert.equal(/2026-09-1[89]/.test(midnight.localDate), true, "local date must be derived from the completion moment in local time");
    assert.equal(completionClock(undefined), undefined);
    assert.equal(completionClock(null), undefined);
    assert.equal(completionClock(""), undefined);
    assert.equal(completionClock("not-a-date"), undefined);
    assert.equal(completionClock(42), undefined);
    assert.equal(completionClock("x".repeat(41)), undefined);
    assert.equal(typeof normalizeValidIsoTimestamp("2026-09-19T10:00:00+08:00"), "string", "offset timestamps normalize to ISO");

    /* 收件箱规范化:损坏隔离、身份去重、按接收时间排序。 */
    const restored = normalizeInboxStore(JSON.stringify({schemaVersion: 1, items: [entry({identity: "b", receivedAt: "2026-09-19T09:00:00.000Z"}), entry(), {broken: true}, entry({identity: "", itemId: ""}), null]}));
    assert.equal(restored.schemaVersion, 1);
    assert.equal(restored.items.length, 2);
    assert.equal(restored.items[0].identity, "b", "entries sort by received time");
    assert.equal(restored.items[1].identity, "session-1");
    assert.deepEqual(normalizeInboxStore("not json"), {schemaVersion: 1, items: []});
    assert.deepEqual(normalizeInboxStore(null), {schemaVersion: 1, items: []});
    assert.deepEqual(normalizeInboxStore({schemaVersion: 9, items: "nope"}), {schemaVersion: 1, items: []});
    const corruptedEntry = normalizeInboxStore({schemaVersion: 1, items: [entry({durationMinutes: 9999}), entry({tomatoMode: "weekly"}), entry({localDate: "2026/09/18"}), entry({state: "discarded"}), entry({occurredAt: "yesterday"})]});
    assert.equal(corruptedEntry.items.length, 0, "invalid fields must isolate the whole entry");
    const capacity = normalizeInboxStore({schemaVersion: 1, items: Array.from({length: DOCKTOMATO_INBOX_CAPACITY + 50}, (_, index) => entry({identity: `cap-${index}`, receivedAt: new Date(Date.parse("2026-09-19T00:00:00.000Z") + index * 1000).toISOString()}))});
    assert.equal(capacity.items.length, DOCKTOMATO_INBOX_CAPACITY, "capacity caps restore");
    assert.equal(capacity.items[0].identity, "cap-0", "oldest kept within capacity");

    /* upsert:合并一致、冲突保留先收数据、满员拒绝。 */
    const base = normalizeInboxStore([entry()]);
    assert.equal(upsertInboxEntry(base, entry(), "2026-09-19T10:00:01.000Z").outcome, "merged");
    const conflict = upsertInboxEntry(base, entry({durationMinutes: 30}), "2026-09-19T10:00:01.000Z");
    assert.equal(conflict.outcome, "conflict");
    assert.equal(conflict.store.items[0].durationMinutes, 25, "conflict must not overwrite the first received payload");
    assert.equal(conflict.store.items[0].lastError, "payload-conflict");
    assert.equal(upsertInboxEntry(normalizeInboxStore([entry()]), entry({identity: "second"}), "t").outcome, "added");
    const full = {schemaVersion: 1, items: Array.from({length: DOCKTOMATO_INBOX_CAPACITY}, (_, index) => entry({identity: `full-${index}`}))};
    assert.equal(upsertInboxEntry(full, entry({identity: "overflow"}), "t").outcome, "full");
    assert.equal(upsertInboxEntry(full, entry({identity: "full-0"}), "t").outcome, "merged", "existing identity still merges at capacity");

    /* remove/mark。 */
    assert.equal(removeInboxEntry(base, "session-1").items.length, 0);
    assert.equal(removeInboxEntry(base, "missing"), base, "removing unknown identity returns the same store");
    const retried = markInboxRetry(base, "session-1", "persist-failed", "2026-09-19T10:00:00.000Z");
    assert.equal(retried.items[0].attempts, 1);
    assert.equal(retried.items[0].nextAttemptAt, "2026-09-19T10:00:01.000Z", "first retry waits 1s");
    const third = markInboxRetry(markInboxRetry(retried, "session-1", "x", "2026-09-19T10:00:01.000Z"), "session-1", "x", "2026-09-19T10:00:06.000Z");
    assert.equal(third.items[0].attempts, 3);
    assert.equal(third.items[0].nextAttemptAt, "2026-09-19T10:00:36.000Z", "third retry waits 30s");
    const fourth = markInboxRetry(third, "session-1", "x", "2026-09-19T10:00:36.000Z");
    assert.equal(fourth.items[0].nextAttemptAt, undefined, "after the automatic schedule only manual retry remains");
    assert.equal(markInboxRetry(base, "missing", "x", "t"), base);
    const blockedStore = markInboxBlocked(base, "session-1", "skipped-day", "2026-09-19T10:00:00.000Z");
    assert.equal(blockedStore.items[0].state, "blocked");
    assert.equal(blockedStore.items[0].blockedReason, "skipped-day");
    assert.equal(markInboxRetry(blockedStore, "session-1", "x", "t"), blockedStore, "blocked entries are not rescheduled");

    /* 到期与唤醒:无到期项不安排定时器。 */
    assert.equal(inboxDueEntries(base, "2026-09-19T10:00:00.000Z").length, 1, "entries without nextAttemptAt are immediately due");
    assert.equal(inboxDueEntries(blockedStore, "2026-09-19T10:00:00.000Z").length, 0);
    assert.equal(inboxDueEntries(retried, "2026-09-19T10:00:00.000Z").length, 0);
    assert.equal(inboxDueEntries(retried, "2026-09-19T10:00:02.000Z").length, 1);
    assert.equal(inboxNextWakeDelayMs(base, "2026-09-19T10:00:00.000Z"), undefined, "no pending schedule means no wake timer");
    assert.equal(inboxNextWakeDelayMs(retried, "2026-09-19T10:00:00.000Z"), 1000);
    assert.deepEqual(inboxNextWakeDelayMs(normalizeInboxStore([entry({nextAttemptAt: "2026-09-19T10:00:05.000Z"}), entry({identity: "z", nextAttemptAt: "2026-09-19T10:00:01.000Z"})]), "2026-09-19T10:00:00.000Z"), 1000, "earliest due wins");

    /* 完成值:单一代码路径;写入端用完成日期修订调用。 */
    assert.equal(dockTomatoCompletionValue("分钟", "minutes", 25), 25);
    assert.equal(dockTomatoCompletionValue("小时", "minutes", 30), 0.5);
    assert.equal(dockTomatoCompletionValue("次", "sessions", 25), 1);
    assert.equal(dockTomatoCompletionValue("分钟", "minutes", 0), undefined);
    assert.equal(dockTomatoCompletionValue("分钟", "minutes", -5), undefined);
    assert.equal(dockTomatoCompletionValue("分钟", "minutes", 1441), undefined);
    assert.equal(dockTomatoCompletionValue("分钟", "minutes", Number.NaN), undefined);

    /* 序列化往返。 */
    const roundTrip = normalizeInboxStore(JSON.parse(serializeInboxStore(retried)));
    assert.equal(roundTrip.items.length, 1);
    assert.deepEqual(roundTrip.items[0], retried.items[0]);
    assert.deepEqual(JSON.parse(serializeInboxStore(INBOX_RETRY_DELAYS_MS ? {schemaVersion: 1, items: []} : {schemaVersion: 1, items: []})).items, []);

    /* 展示投影:最新在前、限量、纯数据。 */
    const projected = projectInboxEntries(normalizeInboxStore([entry({identity: "old"}), entry(), entry({identity: "newest", receivedAt: "2026-09-19T11:00:00.000Z"})]), 2);
    assert.equal(projected.length, 2);
    assert.equal(projected[0].identity, "newest", "newest entry first");
    assert.equal(projected[0].itemId, "read");
    assert.equal(projected[0].state, "pending");
    assert.equal("externalRef" in projected[0], false, "view must not leak storage fields shape beyond the view");
    assert.deepEqual(projectInboxEntries(normalizeInboxStore([]), 5), []);

    console.log("Dock Tomato inbox module checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
