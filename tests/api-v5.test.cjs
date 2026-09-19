/* API v5 只读批次纯过滤边界守门（T-1275/D-240）：
   事件范围读的限量/截断/过滤纪律与项目统一投影的归档语义。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const source = fs.readFileSync("src/features/api-v5.ts", "utf8");
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const moduleUnderTest = {exports: {}};
new Function("require", "module", "exports", compiled)((id) => {
    if (id === "../api-contract") return {
        CHECKIN_EVENTS_READ_LIMITS: {maxItemIds: 200, defaultLimit: 1000, maxLimit: 5000},
        CHECKIN_ITEMS_QUERY_LIMITS: {defaultLimit: 200, maxLimit: 1000},
    };
    if (id === "../types") return {};
    throw new Error(`Unexpected dependency: ${id}`);
}, moduleUnderTest, moduleUnderTest.exports);

const {filterEventsInRange, projectItems, isValidEventSource} = moduleUnderTest.exports;

const event = (overrides = {}) => ({id: "e", itemId: "read", localDate: "2026-09-20", value: 1, unit: "次", source: "api", ...overrides});
const item = (overrides = {}) => ({id: "read", name: "阅读", kind: "count", unit: "次", archived: false, ...overrides});

(async () => {
    /* 事件范围读：限量与截断标记。 */
    const hundred = Array.from({length: 100}, (_, index) => event({id: `e-${index}`}));
    assert.deepEqual(filterEventsInRange(hundred, {limit: 100}), {events: hundred, truncated: false}, "exact limit without more matches is not truncated");
    const truncated = filterEventsInRange(hundred, {limit: 99});
    assert.equal(truncated.truncated, true);
    assert.equal(truncated.events.length, 99);
    assert.equal(filterEventsInRange(hundred, {limit: 100000}).events.length, 100, "oversized limit clamps to hard max and reads all");
    assert.equal(filterEventsInRange(hundred, {}).events.length, 100, "default limit 1000");
    assert.equal(filterEventsInRange(hundred, {limit: Number.NaN}).events.length, 100, "invalid limit falls back to default");
    assert.equal(filterEventsInRange(hundred, {limit: 0}).events.length, 1, "limit clamps to at least 1");

    /* 过滤器:itemIds 消毒限量、source 白名单、skip 排除。 */
    const mixed = [event({itemId: "a"}), event({itemId: "b"}), event({itemId: "a", source: "tomato"}), event({itemId: "a", kind: "skip"})];
    assert.equal(filterEventsInRange(mixed, {itemIds: ["a"]}).events.length, 3);
    assert.equal(filterEventsInRange(mixed, {itemIds: ["a"], source: "tomato"}).events.length, 1);
    assert.equal(filterEventsInRange(mixed, {itemIds: ["a"], includeSkips: false}).events.length, 2, "skip excluded on demand");
    assert.equal(filterEventsInRange(mixed, {}).events.length, 4, "skips included by default");
    const manyIds = Array.from({length: 300}, (_, index) => `item-${index}`);
    assert.equal(filterEventsInRange(mixed, {itemIds: manyIds}).events.length, 0, "oversized itemIds sanitize down and match nothing here");
    assert.equal(filterEventsInRange(mixed, {itemIds: Array.from({length: 200}, (_, index) => `x-${index}`)}).events.length, 0, "at-cap itemIds list is accepted");
    assert.equal(filterEventsInRange(mixed, {itemIds: [""]}).events.length, 0, "empty id strings are dropped");
    assert.equal(filterEventsInRange(mixed, {source: "hackede"}).events.length, 4, "invalid source must not be injected by this layer (caller rejects first)");

    /* 项目投影:归档语义二选一、kinds 白名单 fail-closed、限量。 */
    const items = [item(), item({id: "old", archived: true}), item({id: "run", kind: "duration"})];
    assert.equal(projectItems(items).length, 2, "default excludes archived");
    assert.equal(projectItems(items, {includeArchived: true}).length, 3);
    assert.equal(projectItems(items, {archivedOnly: true}).length, 1);
    assert.deepEqual(projectItems(items, {archivedOnly: true}).map((entry) => entry.id), ["old"], "archivedOnly wins over includeArchived");
    assert.equal(projectItems(items, {kinds: ["duration"]}).length, 1);
    assert.deepEqual(projectItems(items, {kinds: ["binaary"]}), [], "all-invalid kinds must fail closed, not unfiltered");
    assert.equal(projectItems(items, {kinds: []}).length, 2, "empty kinds array means no filter");
    assert.equal(projectItems(items, {limit: 1}).length, 1);
    assert.equal(projectItems(Array.from({length: 1500}, (_, index) => item({id: `i-${index}`})), {limit: 5000}).length, 1000, "oversized limit clamps to hard max");
    assert.equal(isValidEventSource("tomato"), true);
    assert.equal(isValidEventSource("nope"), false);

    console.log("API v5 read-only projection checks passed.");
})().catch((error) => { console.error(error); process.exit(1); });
