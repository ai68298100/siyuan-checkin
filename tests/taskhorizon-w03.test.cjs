const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* Task Horizon 合作 W-03 守门测试：严格时间校验、专用目标约束与固定判序（D-379）。
   1. 严格带时区 ISO 校验：拒绝 2026-02-30、2026-04-31、24:00 隐式滚日，拒绝 date-only 与无时区时间；
   2. 固定判序：输入格式 -> 墓碑 discarded -> 重复 duplicate -> 业务校验 blocked -> recorded；
   3. 专用新事实约束：value===1、显式单位、身份日严格等于落账日、count+daily+atLeast、当日未 SKIP。 */

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-th-w03-"));

for (const filename of [
    "types.ts",
    "i18n.ts",
    "shared.ts",
    "record-step.ts",
    "quota.ts",
    "rules.ts",
    "date-keys.ts",
    "model.ts",
    "model-helpers.ts",
    "features/privacy-scope.ts",
    "features/diagnostics.ts",
    "features/record-notes.ts",
    "ui/labels.ts",
    "api-contract.ts",
    "ecosystem.ts",
    "features/api-v5.ts",
]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(sourceRoot, filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}

const model = require(path.join(outputRoot, "model.js"));
const apiV5 = require(path.join(outputRoot, "features", "api-v5.js"));
const {planBatchRecord} = apiV5;

const baseCountItem = (overrides = {}) => ({
    id: "th-task",
    name: "完成日常任务",
    icon: "📋",
    kind: "count",
    target: 5,
    unit: "个",
    direction: "atLeast",
    schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    createdDate: "2026-09-01",
    revisions: [],
    archivePeriods: [],
    ...overrides,
});

/* ====== 守门 1：严格时间校验与杜绝隐式滚日 ====== */
const store1 = model.createDefaultStore();
store1.items = [baseCountItem()];

const rolloverInputs = [
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-02-30T10:00:00+08:00", externalRef: "taskhorizon:b1:2026-02-30"},
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-04-31T10:00:00+08:00", externalRef: "taskhorizon:b2:2026-04-31"},
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-02-28T24:00:00+08:00", externalRef: "taskhorizon:b3:2026-02-28"},
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-09-20", externalRef: "taskhorizon:b4:2026-09-20"},
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-09-20T10:00:00", externalRef: "taskhorizon:b5:2026-09-20"},
];
const rolloverPlan = planBatchRecord(store1, rolloverInputs, "2026-09-20T10:00:00.000Z");
for (let i = 0; i < rolloverInputs.length; i++) {
    assert.equal(rolloverPlan.results[i].kind, "rejected", `input ${i} must be rejected`);
    assert.equal(rolloverPlan.results[i].reason, "invalid-occurred-at", `input ${i} must fail with invalid-occurred-at`);
}

/* ====== 守门 2：Task Horizon 格式与一致性校验 ====== */
const formatInputs = [
    // value !== 1
    {itemId: "th-task", value: 2, unit: "个", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b1:2026-09-20"},
    // unit 缺失
    {itemId: "th-task", value: 1, occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b2:2026-09-20"},
    // occurredAt 缺省（fallback）
    {itemId: "th-task", value: 1, unit: "个", externalRef: "taskhorizon:b3:2026-09-20"},
    // 非法 externalRef
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:bad:id:colon:2026-09-20"},
    // 身份日与 occurredAt 本地日不一致
    {itemId: "th-task", value: 1, unit: "个", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b5:2026-09-18"},
];
const formatPlan = planBatchRecord(store1, formatInputs, "2026-09-20T10:00:00.000Z");
assert.equal(formatPlan.results[0].reason, "invalid-value");
assert.equal(formatPlan.results[1].reason, "invalid-unit");
assert.equal(formatPlan.results[2].reason, "invalid-occurred-at");
assert.equal(formatPlan.results[3].reason, "invalid-external-ref");
assert.equal(formatPlan.results[4].reason, "ref-date-mismatch");

/* ====== 守门 3：固定判序（墓碑优先于重复，已存重复优先于后来的规则变更） ====== */
const storeSeq = model.createDefaultStore();
// 项目规则在后来被改为 duration，但在历史上有已入账的事件
storeSeq.items = [baseCountItem({id: "item-changed", kind: "duration", unit: "分钟"})];
storeSeq.events = [
    {
        id: "ev-old",
        itemId: "item-changed",
        localDate: "2026-09-15",
        occurredAt: "2026-09-15T10:00:00.000Z",
        value: 1,
        unit: "个",
        source: "api",
        externalRef: "taskhorizon:block-replayed:2026-09-15",
    },
];
storeSeq.eventTombstones = [
    {
        eventId: "tomb-deleted",
        deletedAt: "2026-09-16T00:00:00.000Z",
        itemId: "item-changed",
        source: "api",
        externalRef: "taskhorizon:block-tomb:2026-09-15",
    },
];

const seqPlan = planBatchRecord(storeSeq, [
    // 墓碑条目 -> 必须为 discarded，不得被后续的 target-incompatible 覆盖
    {itemId: "item-changed", value: 1, unit: "个", occurredAt: "2026-09-15T10:00:00.000Z", externalRef: "taskhorizon:block-tomb:2026-09-15"},
    // 已入账重复条目 -> 必须为 duplicate，不得被后续的 target-incompatible 覆盖
    {itemId: "item-changed", value: 1, unit: "个", occurredAt: "2026-09-15T10:00:00.000Z", externalRef: "taskhorizon:block-replayed:2026-09-15"},
], "2026-09-20T10:00:00.000Z");

assert.equal(seqPlan.results[0].kind, "discarded", "tombstone wins over business check");
assert.equal(seqPlan.results[1].kind, "duplicate", "existing duplicate wins over rule change");
assert.equal(seqPlan.results[1].eventId, "ev-old");

/* ====== 守门 4：Task Horizon 专用业务校验（count + daily + atLeast, unit, SKIP） ====== */
const storeBiz = model.createDefaultStore();
storeBiz.items = [
    baseCountItem({id: "duration-item", kind: "duration", unit: "分钟"}),
    baseCountItem({id: "weekly-item", schedule: {type: "weekly", weekdays: [1, 3, 5]}}),
    baseCountItem({id: "atmost-item", direction: "atMost"}),
    baseCountItem({id: "valid-item"}),
];
storeBiz.events = [
    // valid-item 在 2026-09-18 有 skip 事件
    {
        id: "skip-ev",
        itemId: "valid-item",
        localDate: "2026-09-18",
        occurredAt: "2026-09-18T10:00:00.000Z",
        value: 0,
        unit: "个",
        kind: "skip",
        source: "manual",
    },
];

const bizInputs = [
    // 非 count 目标
    {itemId: "duration-item", value: 1, unit: "分钟", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b1:2026-09-20"},
    // 非 daily 排期
    {itemId: "weekly-item", value: 1, unit: "个", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b2:2026-09-20"},
    // atMost 戒除
    {itemId: "atmost-item", value: 1, unit: "个", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b3:2026-09-20"},
    // 单位不匹配
    {itemId: "valid-item", value: 1, unit: "次", occurredAt: "2026-09-20T10:00:00.000Z", externalRef: "taskhorizon:b4:2026-09-20"},
    // 当天已 SKIP
    {itemId: "valid-item", value: 1, unit: "个", occurredAt: "2026-09-18T10:00:00.000Z", externalRef: "taskhorizon:b5:2026-09-18"},
    // 合法记录
    {itemId: "valid-item", value: 1, unit: "个", occurredAt: "2026-09-19T10:00:00.000Z", externalRef: "taskhorizon:b6:2026-09-19"},
];

const bizPlan = planBatchRecord(storeBiz, bizInputs, "2026-09-20T10:00:00.000Z");
assert.equal(bizPlan.results[0].reason, "target-incompatible", "duration is target-incompatible");
assert.equal(bizPlan.results[1].reason, "target-incompatible", "weekly is target-incompatible");
assert.equal(bizPlan.results[2].reason, "target-incompatible", "atMost is target-incompatible");
assert.equal(bizPlan.results[3].reason, "mapping-changed", "unit mismatch");
assert.equal(bizPlan.results[4].reason, "skip-blocked", "skip on that date blocks write-back");
assert.equal(bizPlan.results[5].kind, "recorded", "compliant item plans as recorded");
assert.equal(bizPlan.planned.length, 1);
assert.equal(bizPlan.planned[0].itemId, "valid-item");
assert.equal(bizPlan.planned[0].value, 1);
assert.equal(bizPlan.planned[0].unit, "个");

console.log("taskhorizon-w03: all assertions passed");
