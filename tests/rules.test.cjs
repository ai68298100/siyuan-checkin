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
const progress = rules.evaluateRule(item, [{id: "e1", itemId: "read", occurredAt: "2026-09-07T08:00:00.000Z", localDate: "2026-09-07", value: 10, unit: "分钟", source: "manual"}], day);
assert.deepEqual({status: progress.status, progress: progress.progress, remaining: progress.remaining, complete: progress.complete}, {status: "scheduled", progress: 10, remaining: 20, complete: false});
console.log("Rule helpers: interval and legacy schedule checks passed.");
