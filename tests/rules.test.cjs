const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..", "src");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-rules-"));
for (const file of ["types.ts", "rules.ts"]) {
    fs.writeFileSync(path.join(out, file.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);
}
const rules = require(path.join(out, "rules.js"));
const item = {id: "read", name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: []};
const day = new Date(2026, 8, 7, 12);
assert.equal(rules.periodKeyForSchedule({type: "daily"}, day), "2026-09-07");
assert.equal(rules.periodKeyForSchedule({type: "weekly", weekdays: [1]}, day), "2026-09-07");
assert.equal(rules.periodKeyForSchedule({type: "custom", weekdays: [1]}, day), "2026-09");
assert.equal(rules.periodKeyForSchedule({type: "interval", intervalDays: 3, anchorDate: "2026-09-07"}, day), "2026-09-07");
assert.equal(rules.isScheduled({type: "interval", intervalDays: 3, anchorDate: "2026-09-07"}, new Date(2026, 8, 10, 12)), true);
assert.equal(rules.isScheduled({type: "interval", intervalDays: 3, anchorDate: "2026-09-07"}, new Date(2026, 8, 11, 12)), false);
assert.equal(rules.isScheduled({type: "interval", intervalDays: 2}, new Date(2026, 8, 9, 12), "2026-09-07"), true);
assert.equal(rules.isScheduled({type: "interval", intervalDays: 2}, new Date(2026, 8, 6, 12), "2026-09-07"), false);
const quotaEvents = [
    {id: "q1", itemId: "read", occurredAt: "2026-09-08T08:00:00.000Z", localDate: "2026-09-08", value: 1, unit: "次", source: "manual"},
    {id: "q2", itemId: "read", occurredAt: "2026-09-10T08:00:00.000Z", localDate: "2026-09-10", value: 1, unit: "次", source: "manual"},
    {id: "q3", itemId: "read", occurredAt: "2026-09-10T09:00:00.000Z", localDate: "2026-09-10", value: 1, unit: "次", source: "manual"},
];
const dateQuota = rules.evaluatePeriodQuota({period: "week", quota: 3, distinctDates: true}, quotaEvents, "read", new Date(2026, 8, 10, 12), "次");
assert.deepEqual({periodKey: dateQuota.periodKey, progress: dateQuota.progress, remaining: dateQuota.remaining, complete: dateQuota.complete, contributingDates: dateQuota.contributingDates}, {periodKey: "2026-09-07", progress: 2, remaining: 1, complete: false, contributingDates: ["2026-09-08", "2026-09-10"]});
const valueQuota = rules.evaluatePeriodQuota({period: "month", quota: 4}, quotaEvents, "read", new Date(2026, 8, 10, 12), "次");
assert.equal(valueQuota.periodKey, "2026-09");
assert.equal(valueQuota.progress, 3);
assert.equal(valueQuota.endDate, "2026-09-30");
const quotaItem = {...item, schedule: {type: "quota", quota: {period: "week", amount: 2, countMode: "dates", weekStartsOn: 1}}};
assert.equal(rules.isScheduled(quotaItem.schedule, day), true, "quota schedules remain active throughout their period");
assert.equal(rules.periodKeyForSchedule(quotaItem.schedule, day), "2026-09-07");
const quotaScheduleProgress = rules.evaluateQuotaSchedule(quotaItem.schedule, quotaEvents, "read", new Date(2026, 8, 10, 12), "次");
assert.equal(quotaScheduleProgress.progress, 2);
assert.equal(quotaScheduleProgress.complete, true);
const quotaRuleProgress = rules.evaluateRule(quotaItem, quotaEvents, new Date(2026, 8, 10, 12));
assert.deepEqual({status: quotaRuleProgress.status, target: quotaRuleProgress.target, progress: quotaRuleProgress.progress, complete: quotaRuleProgress.complete}, {status: "scheduled", target: 2, progress: 2, complete: true});
const valueQuotaItem = {...item, unit: "分钟", schedule: {type: "quota", quota: {period: "month", amount: 3, countMode: "value"}}};
assert.equal(rules.evaluateRule(valueQuotaItem, quotaEvents, new Date(2026, 8, 10, 12)).progress, 0, "value quotas still respect the configured unit");
const filteredQuota = rules.evaluatePeriodQuota({period: "month", quota: 2}, [
    ...quotaEvents,
    {...quotaEvents[0], id: "outside", localDate: "2026-10-01", value: 10},
    {...quotaEvents[0], id: "other-item", itemId: "walk", value: 10},
    {...quotaEvents[0], id: "other-unit", unit: "分钟", value: 10},
], "read", new Date(2026, 8, 10, 12), "分钟");
assert.equal(filteredQuota.progress, 10, "item, unit, and period filters are independent");
const emptyQuota = rules.evaluatePeriodQuota({period: "week", quota: 0}, [], "read", day);
assert.equal(emptyQuota.complete, false, "zero or invalid quotas must not be complete by default");
assert.equal(emptyQuota.remaining, 0);
const leapQuota = rules.evaluatePeriodQuota({period: "month", quota: 1}, [], "read", new Date(2028, 1, 10, 12));
assert.equal(leapQuota.endDate, "2028-02-29");
process.env.TZ = "America/New_York";
const timezoneQuota = rules.evaluatePeriodQuota({period: "week", quota: 1, distinctDates: true}, [{...quotaEvents[0], localDate: "2026-09-07"}], "read", new Date(2026, 8, 7, 12));
assert.deepEqual(timezoneQuota.contributingDates, ["2026-09-07"], "stored localDate must not shift through UTC parsing");
process.env.TZ = "Asia/Shanghai";
const progress = rules.evaluateRule(item, [{id: "e1", itemId: "read", occurredAt: "2026-09-07T08:00:00.000Z", localDate: "2026-09-07", value: 10, unit: "分钟", source: "manual"}], day);
assert.deepEqual({status: progress.status, progress: progress.progress, remaining: progress.remaining, complete: progress.complete}, {status: "scheduled", progress: 10, remaining: 20, complete: false});
console.log("Rule helpers: interval and legacy schedule checks passed.");
