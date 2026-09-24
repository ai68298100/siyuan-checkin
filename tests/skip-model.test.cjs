const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");
const typesSource = read("types.ts");
const apiSource = read("api.ts");
const modelSource = read("model.ts");

/* 结构守门：类型字段、唯一判定入口与 API 写入边界（D-211 五字段不含 kind）。 */
assert.match(typesSource, /kind\?: "checkin" \| "skip"/, "CheckinEvent carries the optional skip kind");
assert.match(typesSource, /version: 3/, "store schema version is 3");
assert.match(modelSource, /export const STORE_VERSION = 3 as const/, "model stamps the new store version");
assert.match(modelSource, /export function isSkipEvent/, "skip judgement has a single entry point");
assert.match(apiSource, /recordEvent: \(input: \{itemId: string; value\?: number; unit\?: string; source\?: CheckinEvent\["source"\]; note\?: string; externalRef\?: string\}/, "ecosystem write payload stays five fields — skips are user-only actions");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-skip-model-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "date-keys.ts", "model.ts"]) {
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));

const baseEvent = (overrides = {}) => ({
    id: "e1", itemId: "i1", occurredAt: "2026-09-19T01:00:00.000Z", localDate: "2026-09-19",
    value: 1, unit: "次", source: "manual", ...overrides,
});

/* kind 词表：只认精确 skip/checkin，其余规约为 checkin 语义且不物化字段。 */
const messy = model.normalizeStore({
    version: 2,
    items: [{id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-09-01", revisions: [], archivePeriods: []}],
    events: [
        baseEvent({id: "e-skip", kind: "skip"}),
        baseEvent({id: "e-checkin", kind: "checkin"}),
        baseEvent({id: "e-legacy"}),
        baseEvent({id: "e-legacy-undefined", kind: undefined}),
        baseEvent({id: "e-bad-upper", kind: "SKIPPER"}),
        baseEvent({id: "e-bad-num", kind: 3}),
    ],
    eventTombstones: [],
});
assert.equal(messy.version, 3, "normalization stamps the current schema version");
const kindsById = new Map(messy.events.map((event) => [event.id, event.kind]));
assert.equal(kindsById.get("e-skip"), "skip");
assert.equal(kindsById.get("e-checkin"), "checkin");
assert.equal(kindsById.get("e-legacy"), undefined, "legacy events stay unmolested");
assert.equal(kindsById.get("e-legacy-undefined"), undefined);
assert.equal(kindsById.get("e-bad-upper"), undefined, "invalid kinds are normalized away, not dropped");
assert.equal(kindsById.get("e-bad-num"), undefined);
assert.equal(messy.events.length, 6, "corrupt kind values degrade to checkin semantics instead of losing records");

/* 唯一判定入口。 */
assert.equal(model.isSkipEvent({kind: "skip"}), true);
assert.equal(model.isSkipEvent({kind: "checkin"}), false);
assert.equal(model.isSkipEvent({}), false, "absent kind means checkin");
assert.equal(model.isSkipEvent(undefined), false);

/* 迁移幂等：重复归一化结果稳定，跳过标记不丢失。 */
const skipStoreFixture = {
    version: 3,
    items: [{id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: []}],
    events: [baseEvent({id: "e-skip", kind: "skip"})],
    eventTombstones: [],
};
const twice = model.normalizeStore(model.normalizeStore(skipStoreFixture));
assert.equal(twice.version, 3);
assert.equal(model.isSkipEvent(twice.events[0]), true, "skip marker survives repeated normalization");
assert.ok(model.areNormalizedStoresEqual(model.normalizeStore(skipStoreFixture), twice), "idempotent normalization is fingerprint-stable");

/* v2 数据无损升级：内容不变、版本前进、无 kind 物化。 */
const legacy = model.normalizeStore({
    version: 2,
    items: [{id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-09-01", revisions: [], archivePeriods: []}],
    events: [baseEvent({id: "e1"})],
    eventTombstones: [],
});
assert.equal(legacy.version, 3);
assert.equal(legacy.events.length, 1);
assert.equal(legacy.events[0].kind, undefined, "legacy upgrade must not materialize kind defaults");

/* 墓碑兼容：skip 事件删除走同一墓碑通道。 */
const tombstoned = model.normalizeStore({
    version: 3,
    items: [{id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-09-01", revisions: [], archivePeriods: []}],
    events: [baseEvent({id: "e-skip", kind: "skip"}), baseEvent({id: "e2"})],
    eventTombstones: [{eventId: "e-skip", deletedAt: "2026-09-19T02:00:00.000Z"}],
});
assert.deepEqual(tombstoned.events.map((event) => event.id), ["e2"], "tombstoned skip events are filtered like any other");
assert.equal(tombstoned.eventTombstones.length, 1);

console.log("Skip model checks passed: kind vocabulary, single skip predicate, idempotent v2→3 migration, legacy upgrade and tombstone compatibility.");
