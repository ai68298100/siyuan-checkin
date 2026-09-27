/* T-1512 来源渠道细筛与计量方式筛选守门：
   渠道派生（api 按登记前缀细分、未知归 api:other、公开 source 枚举不变）、
   计量方式分桶（会话/日汇总/其他，与 T-1510 同一证据口径）、
   组合筛选与命中数、清空重置、查询零写入与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-channel-filter-"));
const load = (relative) => {
    const target = path.join(dir, relative.replace(/[\\/]/g, "_"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const filter = load("features/history-filter.ts");

const event = (overrides = {}) => ({id: "e", itemId: "i", occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27", value: 10, unit: "分钟", source: "manual", ...overrides});
const record = (overrides = {}) => ({event: event(overrides), itemName: "拉伸"});

/* —— 1. 渠道派生：登记前缀细分；未知/旧身份如实归 api:other。 —— */
{
    assert.equal(filter.historyEventChannel(event({source: "sireader"})), "sireader");
    assert.equal(filter.historyEventChannel(event({source: "weread"})), "weread");
    assert.equal(filter.historyEventChannel(event({source: "api", externalRef: "health:x:steps:2026-09-27"})), "api:health");
    assert.equal(filter.historyEventChannel(event({source: "api", externalRef: "notequery:x:b:2026-09-27"})), "api:notequery");
    assert.equal(filter.historyEventChannel(event({source: "api", externalRef: "taskhorizon:b:2026-09-27"})), "api:taskhorizon");
    assert.equal(filter.historyEventChannel(event({source: "api", externalRef: "my-plugin:session-1"})), "api:other", "unregistered identity stays other/unknown");
    assert.equal(filter.historyEventChannel(event({source: "api"})), "api:other", "api without externalRef stays other/unknown");
}

/* —— 2. 计量分桶：会话（思阅/思播/番茄）、日汇总（微信读书时长、健康）、其他。 —— */
{
    assert.equal(filter.historyMeteringBucket(event({source: "sireader"})), "session");
    assert.equal(filter.historyMeteringBucket(event({source: "siplayer"})), "session");
    assert.equal(filter.historyMeteringBucket(event({source: "tomato"})), "session");
    assert.equal(filter.historyMeteringBucket(event({source: "weread", externalRef: "weread:i:2026-09-26"})), "daily");
    assert.equal(filter.historyMeteringBucket(event({source: "api", externalRef: "health:i:steps:2026-09-27"})), "daily");
    assert.equal(filter.historyMeteringBucket(event({source: "weread", externalRef: "weread:finish:b1:2026-09-26"})), "other", "finish marks are per-book, not daily summaries");
    assert.equal(filter.historyMeteringBucket(event({source: "weread", externalRef: "weread:i:notes:2026-09-26"})), "other");
    assert.equal(filter.historyMeteringBucket(event({source: "manual"})), "other");
    assert.equal(filter.historyMeteringBucket(event({source: "api", externalRef: "notequery:x:b:2026-09-27"})), "other");
}

/* —— 3. 组合筛选：渠道 × 计量方式 × 关键词；不修改输入记录。 —— */
{
    const records = [
        record({id: "1", source: "api", externalRef: "health:i:steps:2026-09-27", value: 6000, unit: "步"}),
        record({id: "2", source: "sireader", value: 20}),
        record({id: "3", source: "weread", externalRef: "weread:i:2026-09-26", value: 32}),
        record({id: "4", source: "api", externalRef: "my-plugin:session-1", value: 9}),
    ];
    const snapshot = JSON.stringify(records);
    const combined = filter.filterHistoryRecords(records, {source: "api:health", metering: "daily"});
    assert.equal(combined.length, 1);
    assert.equal(combined[0].event.id, "1");
    assert.equal(filter.filterHistoryRecords(records, {source: "api", metering: "session"}).length, 0, "api events are never session metering");
    assert.equal(filter.filterHistoryRecords(records, {source: "api:other"}).length, 1, "unknown identity lands in other/unknown");
    assert.equal(filter.filterHistoryRecords(records, {source: "weread", metering: "other"}).length, 0, "weread duration without finish/notes is daily, not other");
    assert.equal(JSON.stringify(records), snapshot, "filtering never mutates the input records");
}

/* —— 4. 渲染与绑定接线：命中数、分页一致（先筛选后分页）、清空重置。 —— */
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /data-history-metering/, "records workspace renders the metering filter");
assert.match(reviewSource, /filterHits\(value, currentMetering\)/, "channel options carry hit counts");
assert.match(reviewSource, /filterHits\(ctx\.historySource, value\)/, "metering options carry hit counts");
assert.match(reviewSource, /metering: ctx\.historyMetering/, "record list honors the metering filter");
assert.match(reviewSource, /historyChannelOptions: HistoryChannelFilter\[\] = \["all", "manual", "tomato", "import", "api", "api:health", "api:notequery", "api:taskhorizon", "api:other"/, "api sub-channels are listed beside the source enum");
const bindingsSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindingsSource, /"\[data-history-metering\]"/, "metering select is bound");
assert.match(bindingsSource, /HISTORY_CHANNEL_VALUES\.has\(value\)/, "channel values are validated against the registered list");
assert.match(bindingsSource, /host\.historyMetering = "all"/, "clearing filters resets the metering dimension");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private historyMetering: HistoryMeteringFilter = "all"/, "host holds the metering filter state");
/* 分页一致性：记录列表先过滤再分页（filteredRecords 即分页输入）。 */
assert.match(reviewSource, /const page = Math\.min\(Math\.max\(0, ctx\.historyPage \|\| 0\)[\s\S]*?filteredRecords\.length/, "pagination operates on the filtered list");
/* 公开 source 枚举不变。 */
const typesSource = fs.readFileSync(path.join(root, "src", "types.ts"), "utf8");
assert.ok(!typesSource.includes('"api:health"'), "public source enum stays untouched by UI filter values");

/* —— 5. 双语。 —— */
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["review.filterChannel.health", "review.filterChannel.noteQuery", "review.filterChannel.taskHorizon", "review.filterChannel.apiOther", "review.filterMetering.all", "review.filterMetering.session", "review.filterMetering.daily", "review.filterMetering.other", "review.meteringLabel", "review.meteringAria"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("channel/metering filter gates passed: registered-prefix channels, unknown stays unknown, metering buckets, combined filters with hit counts, zero mutation and bilingual copy.");
