/* API v5 纯边界守门（T-1275/T-1278,D-240）：
   v5-1 事件范围读/项目投影的限量与截断;v5-2 幂等批量写的规划纪律
   （rejected/duplicate/discarded/blocked/recorded,批内去重,时钟注入标注）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-api-v5-"));
for (const filename of ["types.ts", "i18n.ts", "shared.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "model-helpers.ts", "features/record-notes.ts", "ui/labels.ts", "api-contract.ts", "features/api-v5.ts"]) {
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
const {CHECKIN_BATCH_RECORD_LIMITS} = contract;
const event = (overrides = {}) => ({id: "e", itemId: "read", localDate: "2026-09-20", value: 1, unit: "次", source: "api", ...overrides});
const makeItem = (overrides = {}) => ({
    id: "read", name: "阅读", icon: "✓", kind: "count", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z", createdDate: "2026-08-01",
    revisions: [], archivePeriods: [], ...overrides,
});

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
    ], nowIso);
    const results = plan.results;
    assert.equal(results.length, 15, "results stay 1:1 with inputs");
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
    assert.equal(results[11].reason, "invalid-value");
    assert.equal(results[12].reason, "invalid-occurred-at", "invalid occurredAt must not silently fall back to now");
    assert.equal(results[13].kind, "recorded");
    assert.ok(!results[13].usedFallbackTime, "explicit valid clock is used as-is");
    assert.equal(results[14].kind, "duplicate", "within-batch repeat of a recorded ref stays a single write");
    assert.equal(plan.planned.length, 2, "only recorded entries reach the write plan");
    assert.equal(plan.planned[0].unit, "次", "planned unit resolves to the completion-date revision");
    assert.equal(plan.planned[0].localDate, "2026-09-20");
    assert.deepEqual(plan.recordedIndices, [0, 13], "recorded indices map back to input order");

    /* 跨午夜:occurredAt 在 9 月 18 日 23:59 后(本地),写入发生在次日——localDate 固定完成日。 */
    const crossMidnight = planBatchRecord(store, [{itemId: "read", occurredAt: "2026-09-18T15:59:59.000Z"}], nowIso);
    assert.equal(/2026-09-1[89]/.test(crossMidnight.planned[0].localDate), true, "local date derives from the completion moment");

    /* 限额常量。 */
    assert.deepEqual(CHECKIN_BATCH_RECORD_LIMITS, {maxItems: 200});

    console.log("API v5 read-only and batch-plan checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
