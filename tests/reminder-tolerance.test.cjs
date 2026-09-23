const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-tolerance-"));
for (const filename of ["date-keys.ts", "types.ts", "i18n.ts", "lunar.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "occasions.ts", "reminders.ts", "features/priority-reminder.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const reminders = require(path.join(outputRoot, "reminders.js"));
const priority = require(path.join(outputRoot, "features", "priority-reminder.js"));

const now = new Date(2026, 8, 19, 9);
const today = model.dateKey(now);
const yesterdayKey = model.dateKey(new Date(2026, 8, 18, 9));

const item = (id, name) => ({
    id, name, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: [],
});
const store = {
    version: 2,
    items: [item("a", "已完成项目"), item("b", "待办项目")],
    events: [{id: "e1", itemId: "a", occurredAt: `${today}T01:00:00.000Z`, localDate: today, value: 1, unit: "次", source: "manual"}],
    eventTombstones: [],
};
const occasionStore = {occasions: []};

const center = reminders.projectReminderCenter(store, occasionStore, now, []);
const byId = new Map(center.map((entry) => [entry.id, entry]));
assert.equal(byId.get("checkin:a:" + today).status, "completed", "recorded check-in projects as completed");
assert.equal(byId.get("checkin:b:" + today).status, "today", "unrecorded check-in stays a today reminder");

/* T-1219 核心：「全部」视图是待办视图，不再把已完成打卡当提醒列出。 */
const all = reminders.filterReminderEntries(center, "all");
assert.ok(!all.some((entry) => entry.id === "checkin:a:" + today), "completed check-in reminders leave the all view");
assert.ok(all.some((entry) => entry.id === "checkin:b:" + today), "pending reminders stay");
const completedOnly = reminders.filterReminderEntries(center, "completed");
assert.ok(completedOnly.some((entry) => entry.id === "checkin:a:" + today), "completed filter still lists them");

/* Today 优先横幅：打卡完成后立即不再提醒（uhabits #1573）。 */
const banner = priority.selectPriorityReminders(center);
assert.ok(!banner.some((entry) => entry.id === "checkin:a:" + today));
assert.equal(priority.summarizePriorityReminders(center).count, 1);

/* snooze 语义回归：当日 snooze 生效并保留恢复入口，跨日自动过期。 */
const snoozed = reminders.applyReminderActions(center, [{id: "checkin:b:" + today, action: "snooze", at: `${today}T08:00:00.000Z`}], today);
assert.equal(snoozed.find((entry) => entry.id === "checkin:b:" + today).status, "snoozed");
const expired = reminders.applyReminderActions(center, [{id: "checkin:b:" + today, action: "snooze", at: `${yesterdayKey}T08:00:00.000Z`}], today);
assert.equal(expired.find((entry) => entry.id === "checkin:b:" + today).status, "today");
assert.ok(reminders.filterReminderEntries(snoozed, "all").some((entry) => entry.status === "snoozed"), "snoozed entries keep their restore entry point");

/* 完成是终态：skip 动作不能改写已完成条目。 */
const forced = reminders.applyReminderActions(center, [{id: "checkin:a:" + today, action: "skip", at: `${today}T08:00:00.000Z`}], today);
assert.equal(forced.find((entry) => entry.id === "checkin:a:" + today).status, "completed");

/* 持久层清理：超过 7 天的 snooze 物理丢弃；skip 持续生效不受时效清理。 */
const staleSnooze = {id: "x:old:1", action: "snooze", at: "2026-09-01T00:00:00.000Z"};
const staleSkip = {id: "x:old:2", action: "skip", at: "2026-01-01T00:00:00.000Z"};
const freshSnooze = {id: "x:new:1", action: "snooze", at: "2026-09-19T00:00:00.000Z"};
const normalized = reminders.normalizeReminderUserActions([staleSnooze, staleSkip, freshSnooze, {id: "bad"}], 200, now);
assert.deepEqual(normalized, [staleSkip, freshSnooze], "stale snoozes are dropped, skips persist, malformed entries rejected");

console.log("Reminder tolerance checks passed: completed items leave the todo view, snooze expiry both projected and physically cleaned, terminal states protected.");
