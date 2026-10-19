/* API v5 边界守门（T-1275/T-1278,D-240）：
   v5-1 事件范围读/项目投影的限量与截断;v5-2 幂等批量写的规划纪律
   （rejected/duplicate/discarded/blocked/recorded,批内去重,时钟注入标注），
   以及生产入口/队列的快照与宿主失败回执（W-02/W-04/W-05）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-api-v5-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts", "analytics.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "api-contract.ts", "ecosystem.ts", "features/diagnostics.ts", "features/api-v5.ts", "storage-transaction.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const apiV5 = require(path.join(outputRoot, "features", "api-v5.js"));
const contract = require(path.join(outputRoot, "api-contract.js"));

const {filterEventsInRange, projectItems, isValidEventSource, planBatchRecord} = apiV5;
const {cloneItemValue} = require(path.join(outputRoot, "model-helpers.js"));
const {CHECKIN_BATCH_RECORD_LIMITS} = contract;
const event = (overrides = {}) => ({id: "e", itemId: "read", localDate: "2026-09-20", value: 1, unit: "次", source: "api", ...overrides});
const makeItem = (overrides = {}) => ({
    id: "read", name: "阅读", icon: "✓", kind: "count", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01",
    revisions: [], archivePeriods: [], ...overrides,
});

/* 执行生产批量入口和实际 mutation 队列；持久化与宿主反馈为可控内存边界。 */
const indexAst = ts.createSourceFile("index.ts", fs.readFileSync(path.join(root, "src", "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const pluginClass = indexAst.statements.find((node) => ts.isClassDeclaration(node));
const compiledHost = ts.transpileModule(`class BatchHost {${["recordEventsBatch", "enqueueMutation", "withStorageLock"].map((name) => {
    const method = pluginClass.members.find((node) => node.name?.getText(indexAst) === name);
    assert.ok(method, `${name} must exist`);
    return method.getText(indexAst);
}).join("\n")}}`, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const hostEnvironment = {
    ...model, ...apiV5, ...contract, ...require(path.join(outputRoot, "storage-transaction.js")),
    navigator: {}, STORAGE_LOCK_NAME: "batch-test-lock", STORAGE_NAME: "checkin-store", OCCASIONS_STORAGE_NAME: "checkin-occasions",
    normalizeOccasionStore: (value) => value,
    mergeOccasionCompletions: (local) => local,
    appendStoreAudit: (entries, entry) => [...entries, entry],
    safeUserErrorDetail: (error) => String(error?.message || error), t: (key) => key, showMessage() {},
};
const BatchHost = new Function(...Object.keys(hostEnvironment), `let fallbackStorageQueue = Promise.resolve();\n${compiledHost}\nreturn BatchHost;`)(...Object.values(hostEnvironment));
const makeBatchHost = () => {
    const host = new BatchHost();
    const initial = model.normalizeStore({version: 3, items: [makeItem()], events: []});
    let sequence = 0;
    Object.assign(host, {
        store: structuredClone(initial), lastPersistedStore: structuredClone(initial), durableStore: structuredClone(initial),
        acceptingOperations: true, initializationState: "ready", storageReady: true, disposed: false, disposing: false,
        mutationQueue: Promise.resolve(), occasionStore: {version: 1, occasions: []}, auditEntries: [], persistCalls: 0,
        cloneStore: (value) => structuredClone(value),
        loadData: async (name) => {
            if (host.failRefresh) throw new Error("storage refresh failed");
            return structuredClone(name === "checkin-store" ? host.durableStore : host.occasionStore);
        },
        makeEvent: (item, value, source, unit, note, externalRef, moment) => ({id: `batch-${++sequence}`, itemId: item.id, value, source, unit, note, externalRef, ...moment}),
        persist: async () => {
            host.persistCalls += 1;
            if (host.failPersist) throw new Error("storage persist failed");
            host.durableStore = structuredClone(host.store);
            if (host.failPersistConfirmation) throw new Error("storage confirmation failed");
            host.lastPersistedStore = structuredClone(host.store);
        },
        invalidateSummary() {}, broadcast() {}, showSyncNotice() {}, scheduleAuditPersist() {}, recordDiagnostic() {},
        renderBackgroundUpdate() { if (host.failFeedback) throw new Error("feedback failed"); },
        maybeAutoArchiveItemsAfterRecord() {}, writebackNoteAnchor: async () => undefined,
    });
    return host;
};
const deferred = () => {
    let resolve;
    const promise = new Promise((settle) => { resolve = settle; });
    return {promise, resolve};
};

/* Public item snapshots must detach all mutable nested fields, including
   quota objects and optional arrays/records. A shallow quota clone would let
   getItems()/getStore() consumers mutate the live host configuration. */
{
    const source = makeItem({
        schedule: {type: "quota", weekdays: [1], quota: {period: "week", amount: 3, countMode: "dates"}},
        revisions: [{effectiveDate: "2026-09-01", kind: "count", target: 2, unit: "次", schedule: {type: "quota", quota: {period: "month", amount: 5, countMode: "value"}}}],
        quickSteps: [1, 2], autoArchive: {afterDays: 7}, noteAnchor: {blockId: "b1", appendNotes: true}, journal: {templateId: "daily"},
    });
    const copy = cloneItemValue(source);
    assert.notEqual(copy.schedule, source.schedule);
    assert.notEqual(copy.schedule.weekdays, source.schedule.weekdays);
    assert.notEqual(copy.schedule.quota, source.schedule.quota);
    assert.notEqual(copy.revisions[0].schedule.quota, source.revisions[0].schedule.quota);
    assert.notEqual(copy.quickSteps, source.quickSteps);
    assert.notEqual(copy.autoArchive, source.autoArchive);
    assert.notEqual(copy.noteAnchor, source.noteAnchor);
    assert.notEqual(copy.journal, source.journal);
    copy.schedule.quota.amount = 99;
    copy.revisions[0].schedule.quota.amount = 88;
    copy.quickSteps.push(4);
    assert.equal(source.schedule.quota.amount, 3);
    assert.equal(source.revisions[0].schedule.quota.amount, 5);
    assert.deepEqual(source.quickSteps, [1, 2]);
}

(async () => {
    /* ===== v5-1 事件范围读 ===== */
    const hundred = Array.from({length: 100}, (_, index) => event({id: `e-${index}`}));
    assert.deepEqual(filterEventsInRange(hundred, {limit: 100}), {events: hundred, truncated: false}, "exact limit without more matches is not truncated");
    const truncated = filterEventsInRange(hundred, {limit: 99});
    assert.equal(truncated.truncated, true);
    assert.equal(truncated.events.length, 99);
    assert.equal(filterEventsInRange(hundred, {limit: 100000}).events.length, 100, "oversized limit clamps to hard max");
    assert.equal(filterEventsInRange(hundred, {limit: 0}).events.length, 1, "limit clamps to at least 1");
    const mixed = [event({itemId: "a"}), event({itemId: "b"}), event({itemId: "a", source: "tomato"}), event({itemId: "a", kind: "skip"})];
    assert.equal(filterEventsInRange(mixed, {itemIds: ["a"], includeSkips: false}).events.length, 2, "skip excluded on demand");
    assert.equal(filterEventsInRange(mixed, {}).events.length, 4, "skips included by default");
    assert.equal(filterEventsInRange(mixed, {itemIds: Array.from({length: 200}, (_, index) => `x-${index}`)}).events.length, 0, "at-cap itemIds list is accepted");
    assert.equal(filterEventsInRange(mixed, {itemIds: [""]}).events.length, 0, "empty id strings are dropped");

    /* ===== v5-1 项目投影 ===== */
    const items = [makeItem(), makeItem({id: "old", archived: true}), makeItem({id: "run", kind: "duration"})];
    assert.equal(projectItems(items).length, 2, "default excludes archived");
    assert.equal(projectItems(items, {archivedOnly: true}).length, 1);
    assert.deepEqual(projectItems(items, {archivedOnly: true}).map((entry) => entry.id), ["old"], "archivedOnly wins over includeArchived");
    assert.deepEqual(projectItems(items, {kinds: ["binaary"]}), [], "all-invalid kinds must fail closed, not unfiltered");
    assert.equal(projectItems(items, {kinds: []}).length, 2, "empty kinds array means no filter");
    assert.equal(isValidEventSource("tomato"), true);
    assert.equal(isValidEventSource("nope"), false);
    /* T-1631：读侧来源过滤与类型全集对齐——八种持久化来源都可过滤，内部适配器来源不再被拒。 */
    const integrationSources = [event({source: "sireader"}), event({source: "siplayer"}), event({source: "weread"}), event({source: "yeguif"}), event({source: "api"})];
    assert.deepEqual(filterEventsInRange(integrationSources, {source: "weread"}).events.map((entry) => entry.source), ["weread"],
        "weread events are filterable (previously TypeError / silently unfiltered)");
    assert.equal(filterEventsInRange(integrationSources, {source: "yeguif"}).events.length, 1, "yeguif filter works");
    assert.equal(filterEventsInRange(integrationSources, {source: "sireader"}).events.length, 1, "sireader filter works");
    assert.equal(filterEventsInRange(integrationSources, {source: "siplayer"}).events.length, 1, "siplayer filter works");
    assert.equal(filterEventsInRange(integrationSources, {source: "tomato"}).events.length, 0, "filter with absent source returns empty, never unfiltered");
    assert.equal(isValidEventSource("weread"), true);
    assert.equal(isValidEventSource("yeguif"), true);
    assert.equal(isValidEventSource("sireader"), true);
    assert.equal(isValidEventSource("siplayer"), true);

    /* ===== v5-2 幂等批量写 ===== */
    const store = model.createDefaultStore();
    store.items = [
        makeItem(),
        makeItem({id: "old", archived: true}),
        makeItem({id: "quit", direction: "atMost"}),
        makeItem({id: "future", schedule: {type: "interval", interval: 7}, createdDate: "2026-09-10"}),
    ];
    store.events = [event({id: "seed-1", itemId: "read", externalRef: "ext://existing"})];
    store.eventTombstones = [{eventId: "tomb-1", deletedAt: "2026-09-19T00:00:00.000Z", itemId: "read", source: "api", externalRef: "ext://undone"}];
    const nowIso = "2026-09-20T08:00:00.000Z";
    const plan = planBatchRecord(store, [
        {itemId: "read"},
        {itemId: "read", externalRef: "ext://existing", value: 5},
        {itemId: "read", externalRef: "ext://undone"},
        {itemId: "missing-item"},
        {itemId: "old"},
        {itemId: "quit"},
        {itemId: "future", occurredAt: "2026-09-05T00:00:00.000Z"},
        {itemId: "read", unit: "小时"},
        null,
        {itemId: ""},
        {itemId: "read", source: "manual"},
        {itemId: "read", value: -1},
        {itemId: "read", occurredAt: "not-a-date"},
        {itemId: "read", occurredAt: "2026-09-18T22:30:00.000Z"},
        {itemId: "read", externalRef: "ext://existing"},
        {itemId: "read", source: "weread"},
    ], nowIso);
    const results = plan.results;
    assert.equal(results.length, 16, "results stay 1:1 with inputs");
    assert.equal(results[0], plan.results[0]);
    assert.equal(results[0].kind, "recorded");
    assert.equal(results[0].usedFallbackTime, true, "missing occurredAt falls back to now with flag");
    assert.equal(results[1].kind, "duplicate");
    assert.equal(results[1].eventId, "seed-1");
    assert.equal(results[2].kind, "discarded", "user-undone refs never resurrect");
    assert.equal(results[3].kind, "blocked");
    assert.equal(results[3].reason, "missing-item");
    assert.equal(results[4].reason, "archived-item");
    assert.equal(results[5].reason, "at-most-item");
    assert.equal(results[6].reason, "not-scheduled", "completion date outside the item schedule is blocked");
    assert.equal(results[7].reason, "mapping-changed", "unit mismatch against completion-date revision is blocked");
    assert.equal(results[8].reason, "invalid-input");
    assert.equal(results[9].reason, "invalid-item-id");
    assert.equal(results[10].reason, "invalid-source");
    assert.equal(results[15].reason, "invalid-source", "forged integration source stays rejected on the write side (T-1631: read widened, write unchanged)");
    assert.equal(results[11].reason, "invalid-value");
    assert.equal(results[12].reason, "invalid-occurred-at", "invalid occurredAt must not silently fall back to now");
    assert.equal(results[13].kind, "recorded");
    assert.ok(!results[13].usedFallbackTime, "explicit valid clock is used as-is");
    assert.equal(results[14].kind, "duplicate", "within-batch repeat of a recorded ref stays a single write");
    assert.equal(plan.planned.length, 2, "only recorded entries reach the write plan");
    assert.equal(plan.planned[0].unit, "次", "planned unit resolves to the completion-date revision");
    assert.equal(plan.planned[0].localDate, "2026-09-20");
    assert.deepEqual(plan.recordedIndices, [0, 13], "recorded indices map back to input order");

    /* 批内重复 externalRef 仍只规划一次，但规划结果必须保留首条索引，
       供宿主持久化成功后把同一 eventId 回填到后续 duplicate 回执。 */
    const repeatedFreshRef = planBatchRecord(store, [
        {itemId: "read", externalRef: "ext://batch-fresh", occurredAt: "2026-09-20T08:00:00Z"},
        {itemId: "read", externalRef: "ext://batch-fresh", occurredAt: "2026-09-20T08:00:00Z"},
    ], nowIso);
    assert.deepEqual(repeatedFreshRef.duplicateResultLinks, [{resultIndex: 1, firstResultIndex: 0}],
        "batch duplicate keeps a link to its first planned result for eventId receipt backfill");
    assert.equal(repeatedFreshRef.results[1].kind, "duplicate");

    /* Task Horizon 历史补录同样经过公开批量入口，不能绕过单条写入的身份格式校验。
       仅保留前缀使用严格格式；其它外部来源继续兼容通用 opaque externalRef。 */
    const invalidTaskHorizonRefs = [
        "taskhorizon:task:2026-02-30",
        "taskhorizon:task:not-a-date",
        "taskhorizon:task:part:2026-09-20",
        "taskhorizon:task\u0001:2026-09-20",
        "taskhorizon:task name:2026-09-20",
        `taskhorizon:${"x".repeat(129)}:2026-09-20`,
    ];
    const taskHorizonPlan = planBatchRecord(store, [
        ...invalidTaskHorizonRefs.map((externalRef) => ({itemId: "read", externalRef})),
        {itemId: "read", externalRef: "taskhorizon:valid-task:2026-09-20", unit: "次", occurredAt: nowIso},
        {itemId: "read", externalRef: "taskhorizon:valid-task:2026-09-20", unit: "次", occurredAt: nowIso},
        {itemId: "read", externalRef: "unregistered:task:part:2026-02-30", occurredAt: nowIso},
    ], nowIso);
    assert.equal(taskHorizonPlan.results.length, invalidTaskHorizonRefs.length + 3, "identity validation preserves per-input receipts");
    assert.deepEqual(taskHorizonPlan.results.slice(0, invalidTaskHorizonRefs.length),
        invalidTaskHorizonRefs.map(() => ({kind: "rejected", reason: "invalid-external-ref"})),
        "malformed Task Horizon identities cannot reach the batch write plan");
    assert.equal(taskHorizonPlan.results[invalidTaskHorizonRefs.length].kind, "recorded", "canonical Task Horizon identity remains writable");
    assert.equal(taskHorizonPlan.results[invalidTaskHorizonRefs.length + 1].kind, "duplicate", "canonical identity retains batch idempotency");
    assert.equal(taskHorizonPlan.results[invalidTaskHorizonRefs.length + 2].kind, "recorded", "other prefixes retain their existing opaque identity semantics");
    assert.deepEqual(taskHorizonPlan.planned.map(({externalRef}) => externalRef), [
        "taskhorizon:valid-task:2026-09-20", "unregistered:task:part:2026-02-30",
    ]);

    /* 方向与单位均按完成日生效修订；当前方向不能追溯阻塞/放行另一方向纪元。 */
    const revision = (effectiveDate, direction, unit = "次") => ({effectiveDate, direction, kind: "count", target: 1, unit, schedule: {type: "daily"}});
    const revisionStore = model.normalizeStore({version: 3, items: [
        makeItem({id: "now-at-most", direction: "atMost", revisions: [revision("2026-08-01", "atLeast", "页"), revision("2026-09-15", "atMost")]}),
        makeItem({id: "was-at-most", revisions: [revision("2026-08-01", "atMost"), revision("2026-09-15", "atLeast")]}),
        makeItem({id: "monday-only", schedule: {type: "weekly", weekdays: [1]}}),
    ], events: []});
    const revisionPlan = planBatchRecord(revisionStore, [
        {itemId: "now-at-most", unit: "页", occurredAt: "2026-09-10T08:00:00Z"},
        {itemId: "now-at-most", occurredAt: nowIso},
        {itemId: "was-at-most", occurredAt: "2026-09-10T08:00:00Z"},
        {itemId: "was-at-most", occurredAt: nowIso},
        {itemId: "monday-only", externalRef: "other:off-schedule", occurredAt: new Date(2026, 8, 20, 12).toISOString()},
    ], nowIso);
    assert.deepEqual(revisionPlan.results.map(({kind}) => kind), ["recorded", "blocked", "blocked", "recorded", "recorded"]);
    assert.equal(revisionPlan.results[1].reason, "at-most-item");
    assert.equal(revisionPlan.results[2].reason, "at-most-item");
    assert.equal(revisionPlan.planned[0].unit, "页", "historical direction and unit resolve from the completion-date revision");
    assert.equal(model.isScheduledToday(model.getItemById(revisionStore, "monday-only"), new Date(2026, 8, 20, 12)), false);
    assert.equal(revisionPlan.results[4].kind, "recorded", "generic external sources retain off-schedule logged facts");

    /* 调用后改写全部标量字段和数组长度，不能影响已进入真实队列的批次。 */
    const snapshotHost = makeBatchHost();
    const snapshotGate = deferred();
    snapshotHost.mutationQueue = snapshotGate.promise;
    const originalInput = {itemId: "read", value: 1, unit: "次", source: "api", note: "original", externalRef: "external:original", occurredAt: nowIso};
    const mutableInputs = [originalInput, null, []];
    const snapshotResult = snapshotHost.recordEventsBatch(mutableInputs);
    Object.assign(originalInput, {itemId: "missing", value: 7, unit: "小时", source: "manual", note: "changed", externalRef: "external:changed", occurredAt: "not-a-date"});
    mutableInputs.splice(0, mutableInputs.length, ...Array.from({length: 201}, () => ({itemId: "missing"})));
    snapshotGate.resolve();
    const snapshotReceipts = await snapshotResult;
    assert.equal(snapshotReceipts.length, 3, "receipt count uses the captured batch length");
    assert.deepEqual(snapshotReceipts.map(({kind}) => kind), ["recorded", "rejected", "rejected"]);
    assert.deepEqual({...snapshotHost.durableStore.events[0], id: undefined}, {
        id: undefined, itemId: "read", value: 1, unit: "次", source: "api", note: "original", externalRef: "external:original", occurredAt: nowIso, localDate: "2026-09-20",
    }, "the queued write retains all original scalar fields");

    const batchInput = {itemId: "read", externalRef: "external:batch", occurredAt: nowIso};
    const receiptHost = makeBatchHost();
    const mixedReceipts = await receiptHost.recordEventsBatch([batchInput, {...batchInput}, null]);
    assert.deepEqual(mixedReceipts.map(({kind}) => kind), ["recorded", "duplicate", "rejected"]);
    assert.ok(mixedReceipts[0].eventId, "recorded receipts include the durable event identity");
    assert.equal(mixedReceipts[1].eventId, mixedReceipts[0].eventId, "within-batch duplicate receipts point to the same durable fact");
    assert.equal(receiptHost.durableStore.events.length, 1);
    assert.equal(receiptHost.persistCalls, 1);
    const emptyHost = makeBatchHost();
    emptyHost.failRefresh = true;
    assert.deepEqual(await emptyHost.recordEventsBatch([]), []);
    assert.equal(emptyHost.persistCalls, 0);
    await assert.rejects(emptyHost.recordEventsBatch(null), /inputs/);
    await assert.rejects(emptyHost.recordEventsBatch(Array.from({length: 201}, () => batchInput)), /200/);
    for (const queueResult of [undefined, []]) {
        const skippedHost = makeBatchHost();
        skippedHost.enqueueMutation = async () => queueResult;
        await assert.rejects(skippedHost.recordEventsBatch([batchInput]), /batch was not executed/, "skipped/incomplete queue execution is a host failure");
    }
    const refreshFailure = makeBatchHost();
    refreshFailure.failRefresh = true;
    await assert.rejects(refreshFailure.recordEventsBatch([batchInput]), /batch was not executed/, "the actual queue's swallowed refresh failure must reject at the public batch boundary");
    assert.equal(refreshFailure.persistCalls, 0);

    const unloadHost = makeBatchHost();
    const unloadGate = deferred();
    unloadHost.mutationQueue = unloadGate.promise;
    const unloadResult = unloadHost.recordEventsBatch([batchInput]);
    unloadHost.acceptingOperations = false;
    unloadHost.disposing = true;
    unloadGate.resolve();
    await assert.rejects(unloadResult, /storage is not ready/, "unload while queued cannot report batch success");
    assert.equal(unloadHost.durableStore.events.length, 0);

    const persistFailure = makeBatchHost();
    persistFailure.failPersist = true;
    await assert.rejects(persistFailure.recordEventsBatch([batchInput]), /batch persist failed/);
    assert.equal(persistFailure.store.events.length, 0, "persist failure rolls back the in-memory batch");
    assert.equal(persistFailure.durableStore.events.length, 0);

    for (const failureFlag of ["failPersistConfirmation", "failFeedback"]) {
        const ambiguousHost = makeBatchHost();
        ambiguousHost[failureFlag] = true;
        await assert.rejects(ambiguousHost.recordEventsBatch([batchInput]), failureFlag === "failFeedback" ? /feedback failed/ : /batch persist failed/);
        assert.equal(ambiguousHost.durableStore.events.length, 1, "a rejected acknowledgement can follow a durable write");
        ambiguousHost[failureFlag] = false;
        const retryReceipts = await ambiguousHost.recordEventsBatch([batchInput]);
        assert.deepEqual(retryReceipts, [{kind: "duplicate", eventId: ambiguousHost.durableStore.events[0].id}], "retry preserves the original fact identity after an ambiguous host failure");
        assert.equal(ambiguousHost.durableStore.events.length, 1);
    }

    /* ISO 入口必须携带显式时区；Date.parse 可接受的日期-only 与无偏移
       字符串会随宿主地区漂移业务日，必须拒绝而不是静默归一化。 */
    assert.equal(planBatchRecord(store, [{itemId: "read", occurredAt: "2026-09-20"}], nowIso).results[0].reason, "invalid-occurred-at");
    assert.equal(planBatchRecord(store, [{itemId: "read", occurredAt: "2026-09-20T08:00"}], nowIso).results[0].reason, "invalid-occurred-at");
    assert.equal(planBatchRecord(store, [{itemId: "read", occurredAt: "2026-09-20T08:00:00+08:00"}], nowIso).results[0].kind, "recorded");

    /* 跨午夜:occurredAt 在 9 月 18 日 23:59 后(本地),写入发生在次日——localDate 固定完成日。 */
    const crossMidnight = planBatchRecord(store, [{itemId: "read", occurredAt: "2026-09-18T15:59:59.000Z"}], nowIso);
    assert.equal(/2026-09-1[89]/.test(crossMidnight.planned[0].localDate), true, "local date derives from the completion moment");

    /* ===== v5-3 longest streak（T-1280）：与当前连续同一状态语义的全历史最大值。 ===== */
    const streakStore = model.createDefaultStore();
    streakStore.items = [makeItem()];
    streakStore.events = [
        event({id: "s1", localDate: "2026-09-01"}),
        event({id: "s2", localDate: "2026-09-02"}),
        event({id: "s3", localDate: "2026-09-03"}),
        event({id: "s9", localDate: "2026-09-19"}),
    ];
    const asOf = new Date(2026, 8, 19, 12);
    const longestMap = model.computeLongestStreaks(streakStore, asOf);
    const currentMap = model.computeEventStreaks(streakStore, asOf);
    assert.equal(currentMap.get("read"), 1, "current streak is the tail run");
    assert.equal(longestMap.get("read"), 3, "longest streak spans the earlier 3-day run");

    /* 跳过日桥接不加成：1 日 + 跳过 + 3 日 → 最长 2（只算真实完成）。 */
    const bridgeStore = model.createDefaultStore();
    bridgeStore.items = [makeItem()];
    bridgeStore.events = [
        event({id: "b1", localDate: "2026-09-01"}),
        event({id: "b2", localDate: "2026-09-02", kind: "skip"}),
        event({id: "b3", localDate: "2026-09-03"}),
    ];
    const bridgedLongest = model.computeLongestStreaks(bridgeStore, asOf);
    assert.equal(bridgedLongest.get("read"), 2, "skip days bridge the run but do not add to the count");

    /* 限额常量。 */
    assert.deepEqual(CHECKIN_BATCH_RECORD_LIMITS, {maxItems: 200});

    /* ===== 性能门禁（T-1172 哲学：防灾难退化，非单机承诺）=====
       10 万级事件下：范围读走日期索引；批量规划为 O(批条数×事件数) 有界扫描。 */
    const perfStore = model.createDefaultStore();
    perfStore.items = [makeItem(), makeItem({id: "big", kind: "count"})];
    const perfEvents = [];
    const cursorDate = new Date(2000, 0, 1, 12);
    for (let index = 0; index < 100000; index += 1) {
        const localDate = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth() + 1).padStart(2, "0")}-${String(cursorDate.getDate()).padStart(2, "0")}`;
        perfEvents.push(event({id: `pe-${index}`, itemId: index % 2 ? "read" : "big", localDate, occurredAt: `${localDate}T12:00:00.000Z`}));
        cursorDate.setDate(cursorDate.getDate() + 1);
    }
    perfStore.events = perfEvents;
    const rangeStart = process.hrtime.bigint();
    const inRange = model.getEventsInDateRange(perfStore, "2025-01-01", "2026-01-01");
    const rangeRead = filterEventsInRange(inRange, {limit: 5000});
    const rangeMs = Number(process.hrtime.bigint() - rangeStart) / 1e6;
    assert.ok(rangeRead.events.length > 0, "range read returns a sane projection");
    assert.ok(rangeMs < 2000, `100k-event range read must stay under 2000ms (took ${Math.round(rangeMs)}ms)`);

    const planStart = process.hrtime.bigint();
    const batchInputs = Array.from({length: 200}, (_, index) => ({itemId: "read", externalRef: `perf://${index}`, occurredAt: "2026-09-18T10:00:00.000Z"}));
    const batchPlan = planBatchRecord(perfStore, batchInputs, "2026-09-20T08:00:00.000Z");
    const planMs = Number(process.hrtime.bigint() - planStart) / 1e6;
    assert.equal(batchPlan.results.length, 200);
    assert.equal(batchPlan.planned.length, 200, "fresh refs plan as recorded");
    assert.ok(planMs < 2000, `200-entry batch plan over 100k events must stay under 2000ms (took ${Math.round(planMs)}ms)`);

        /* longest 全历史扫描:createdDate 起逐日状态遍历,有 36500 步护栏。 */
    const longestStart = process.hrtime.bigint();
    const perfLongestMap = model.computeLongestStreaks(perfStore);
    const longestMs = Number(process.hrtime.bigint() - longestStart) / 1e6;
    assert.ok(typeof perfLongestMap.get("read") === "number", "longest projection must be numeric");
    assert.ok(longestMs < 2000, `computeLongestStreaks over a 26-year window must stay under 2000ms (took ${Math.round(longestMs)}ms)`);

console.log("API v5 read-only, batch-plan and host-boundary checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
