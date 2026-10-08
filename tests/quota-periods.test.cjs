/* T-1767 守门：配额统计按每个周期的生效规则与可用日计算（D-341）。
   风险路径（2026-09-30 审计）：summarizeQuota 用范围末日修订评估所有周期——
   周↔月/额度切换即整体用错规则与周期键；可用性只看周期首日——月中创建、
   归档恢复的整周期被丢弃。修复后契约：
   - 逐日按当日修订的 quota 规则与周期键分桶，桶代表日规则评估该周期；
   - 周期在范围内存在任一可用日即计入（部分可用仍按一个周期）；
   - 单一周期的既有口径逐值不变（T-1516 对照）；跳过事件不贡献进度不变。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-quota-periods-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "analytics.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const model = require(path.join(dir, "model.js"));
const analytics = require(path.join(dir, "analytics.js"));

const event = (itemId, localDate) => ({
    id: `e-${itemId}-${localDate}`,
    itemId,
    occurredAt: `${localDate}T08:00:00.000Z`,
    localDate,
    value: 1,
    unit: "次",
    source: "manual",
});
const item = (overrides = {}) => model.normalizeItem({
    id: "q1",
    name: "限量",
    icon: "☕",
    kind: "count",
    target: 1,
    unit: "次",
    schedule: {type: "quota", quota: {period: "week", amount: 2, countMode: "dates", weekStartsOn: 1}},
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    createdDate: "2026-09-01",
    ...overrides,
});
const summarizeItem = (summary, itemId) => summary.items.find((entry) => entry.itemId === itemId);

/* —— 夹具 1：周→月跨修订（9-15 起）。周纪元 3 个周期按周规则结算，月纪元为当前周期。 —— */
const mixed = {
    version: 3,
    items: [item({
        revisions: [
            {effectiveDate: "2026-09-01", kind: "count", target: 1, unit: "次", direction: "atLeast", schedule: {type: "quota", quota: {period: "week", amount: 2, countMode: "dates", weekStartsOn: 1}}},
            {effectiveDate: "2026-09-15", kind: "count", target: 1, unit: "次", direction: "atLeast", schedule: {type: "quota", quota: {period: "month", amount: 10, countMode: "dates"}}},
        ],
        schedule: {type: "quota", quota: {period: "month", amount: 10, countMode: "dates"}},
    })],
    events: ["2026-09-02", "2026-09-03", "2026-09-08", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-21", "2026-09-22"].map((key) => event("q1", key)),
    eventTombstones: [],
    itemTombstones: [],
};
const mixedSummary = analytics.buildSummaryContext(model.normalizeStore(mixed), "month", new Date(2026, 8, 30, 12));
const mixedQuota = summarizeItem(mixedSummary, "q1").quota;
assert.equal(mixedQuota.elapsedPeriods, 3, "weekly-era periods settle with the weekly rule (old code: 0 — one September bucket with the month rule)");
assert.equal(mixedQuota.completedPeriods, 1, "only week 1 reached its weekly amount of 2");
assert.equal(mixedQuota.completionRate, 33, "rate derives from per-era settled periods");
assert.equal(mixedQuota.period, "month", "the label follows the latest quota era");
assert.ok(mixedQuota.current && mixedQuota.current.period === "month" && mixedQuota.current.progress === 5,
    "the current period is the monthly era with its own progress");

/* —— 夹具 2：月中创建跨月（9-20 创建）。9 月周期不再因首日不可用被整周期丢弃。 —— */
const lateCreated = {
    version: 3,
    items: [item({
        createdDate: "2026-09-20",
        createdAt: "2026-09-20T08:00:00.000Z",
        schedule: {type: "quota", quota: {period: "month", amount: 5, countMode: "dates"}},
        revisions: [{effectiveDate: "2026-09-20", kind: "count", target: 1, unit: "次", direction: "atLeast", schedule: {type: "quota", quota: {period: "month", amount: 5, countMode: "dates"}}}],
    })],
    events: ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"].map((key) => event("q1", key)),
    eventTombstones: [],
    itemTombstones: [],
};
const lateSummary = analytics.buildCustomSummaryContext(model.normalizeStore(lateCreated), {startDate: "2026-09-01", endDate: "2026-10-15"}, new Date(2026, 9, 15, 12));
const lateQuota = summarizeItem(lateSummary, "q1").quota;
assert.equal(lateQuota.elapsedPeriods, 1, "September counts even though the item only existed from the 20th (old code: 0)");
assert.equal(lateQuota.completedPeriods, 1, "September completed within the available days");
assert.ok(lateQuota.current && lateQuota.current.progress === 0, "October is the current period with no events yet");

/* —— 夹具 3：月中归档恢复同理（归档期盖住周期首日）。 —— */
const paused = {
    version: 3,
    items: [item({
        schedule: {type: "quota", quota: {period: "month", amount: 4, countMode: "dates"}},
        archivePeriods: [{startDate: "2026-09-01", endDate: "2026-09-19"}],
        revisions: [{effectiveDate: "2026-09-01", kind: "count", target: 1, unit: "次", direction: "atLeast", schedule: {type: "quota", quota: {period: "month", amount: 4, countMode: "dates"}}}],
    })],
    events: ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"].map((key) => event("q1", key)),
    eventTombstones: [],
    itemTombstones: [],
};
const pausedSummary = analytics.buildCustomSummaryContext(model.normalizeStore(paused), {startDate: "2026-09-01", endDate: "2026-10-15"}, new Date(2026, 9, 15, 12));
const pausedQuota = summarizeItem(pausedSummary, "q1").quota;
assert.equal(pausedQuota.elapsedPeriods, 1, "a period available only after a mid-period resume still settles");
assert.equal(pausedQuota.completedPeriods, 1, "its completions count once available");

/* —— 夹具 4：单一周期既有口径逐值不变（T-1516 对照）+ 跳过不贡献。 —— */
const single = {
    version: 3,
    items: [item()],
    events: ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"].map((key) => event("q1", key))
        .concat([{...event("q1", "2026-09-27"), id: "e-skip", kind: "skip", value: 0}]),
    eventTombstones: [],
    itemTombstones: [],
};
const singleSummary = analytics.buildSummaryContext(model.normalizeStore(single), "week", new Date(2026, 8, 26, 12));
const singleQuota = summarizeItem(singleSummary, "q1").quota;
assert.ok(singleQuota, "a plain quota item still produces a quota summary");
assert.equal(singleQuota.period, "week");
assert.equal(singleQuota.elapsedPeriods, 0, "the in-progress week is not counted as elapsed");
assert.ok(singleQuota.current && singleQuota.current.complete && singleQuota.current.progress === 6,
    "the current week settles with six real dates and ignores the skip event");
const singleDay = summarizeItem(singleSummary, "q1");
assert.equal(singleDay.scheduledDays, 0, "quota items keep the no-day-denominator contract (T-1516)");

console.log("quota-periods: all assertions passed");
