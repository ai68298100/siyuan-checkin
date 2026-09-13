/* 11.0-C 提醒延期/跳过/恢复：模型语义执行测试 + 存储序列化 + 界面接线守门。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* 转译执行 src/reminders.ts（依赖集与 occasions.test.cjs 一致，尽量不引入新依赖）。 */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-actions-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["occasions.ts", "model.ts", "quota.ts", "rules.ts", "types.ts", "lunar.ts", "i18n.ts", "reminders.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(`src/${filename}`, "utf8"), {compilerOptions}).outputText);
}
const reminders = require(path.join(dir, "reminders.js"));

/* —— 存储序列化：空串/坏数据/未来版本都安全回退，非法条目被丢弃 —— */
assert.deepEqual(reminders.deserializeReminderUserActions(""), [], "empty storage deserializes to no actions");
assert.deepEqual(reminders.deserializeReminderUserActions("not json"), [], "broken storage deserializes to no actions");
assert.deepEqual(reminders.deserializeReminderUserActions(JSON.stringify({version: 2, actions: []})), [], "future versions are ignored");
const stored = JSON.parse(reminders.serializeReminderUserActions([
    {id: "occasion:a:2026-09-14", action: "skip", at: "2026-09-14T01:00:00.000Z"},
    {id: "", action: "skip", at: "2026-09-14T01:00:00.000Z"},
    {id: "x", action: "delete", at: "2026-09-14T01:00:00.000Z"},
    {id: "x", action: "snooze", at: "not-a-date"},
]));
assert.equal(stored.version, 1);
assert.deepEqual(stored.actions, [{id: "occasion:a:2026-09-14", action: "skip", at: "2026-09-14T01:00:00.000Z"}], "invalid entries are dropped");
assert.equal(reminders.normalizeReminderUserActions(Array.from({length: 600}, (_, index) => ({id: `r${index}`, action: "snooze", at: "2026-09-14T01:00:00.000Z"}))).length, 200, "action log stays bounded");

/* —— applyReminderActions 语义 —— */
const today = "2026-09-14";
const entries = [
    {id: "r1", source: "checkin", sourceId: "r1", title: "今日", dueDate: today, daysUntil: 0, status: "today", note: ""},
    {id: "r2", source: "occasion", sourceId: "r2", title: "逾期", dueDate: "2026-09-12", daysUntil: -2, status: "overdue", note: ""},
    {id: "r3", source: "checkin", sourceId: "r3", title: "已完成", dueDate: today, daysUntil: 0, status: "completed", note: ""},
];
const apply = (actions) => reminders.applyReminderActions(entries, actions, today);
assert.equal(apply([{id: "r1", action: "skip", at: `${today}T01:00:00.000Z`}])[0].status, "skipped", "skip takes effect");
assert.equal(apply([{id: "r1", action: "snooze", at: `${today}T01:00:00.000Z`}])[0].status, "snoozed", "same-day snooze takes effect");
assert.equal(apply([{id: "r1", action: "snooze", at: "2026-09-12T01:00:00.000Z"}])[0].status, "today", "snooze expires across the local date boundary");
assert.equal(apply([{id: "r3", action: "skip", at: `${today}T01:00:00.000Z`}])[2].status, "completed", "completed is terminal and cannot be overridden");
assert.deepEqual(apply([{id: "zz", action: "skip", at: `${today}T01:00:00.000Z`}]).map((entry) => entry.status), ["today", "overdue", "completed"], "unknown ids are ignored");
assert.equal(apply([{id: "r1", action: "skip", at: `${today}T01:00:00.000Z`}, {id: "r1", action: "snooze", at: `${today}T02:00:00.000Z`}])[0].status, "snoozed", "the latest action per id wins");

/* —— 排序契约：已延期/已跳过不挤占待办，已完成仍收尾 —— */
const ranked = reminders.filterReminderEntries(apply([{id: "r1", action: "skip", at: `${today}T01:00:00.000Z`}, {id: "r2", action: "snooze", at: `${today}T01:00:00.000Z`}]), "all");
assert.deepEqual(ranked.map((entry) => entry.status), ["snoozed", "skipped", "completed"]);

/* —— 恢复 = 清除该实例动作，回到计算状态 —— */
const cleared = reminders.clearReminderUserActions([{id: "r1", action: "skip", at: "x"}, {id: "r2", action: "snooze", at: "y"}], "r1");
assert.deepEqual(cleared.map((action) => action.id), ["r2"]);

/* —— 端到端：提醒中心投影应用用户动作 —— */
const onceOccasion = {id: "bill", name: "账单", kind: "scheduled", date: "2026-09-10", recurrence: "once", completedDates: [], enabled: true, note: ""};
const center = reminders.projectReminderCenter(
    {version: 1, items: [], events: []},
    {version: 1, occasions: [onceOccasion]},
    new Date(2026, 8, 14, 12),
    [{id: "occasion:bill:2026-09-10", action: "snooze", at: "2026-09-14T01:00:00.000Z"}],
);
assert.equal(center.find((entry) => entry.id === "occasion:bill:2026-09-10").status, "snoozed", "reminder center applies the persisted action");

/* —— 界面接线守门 —— */
const review = fs.readFileSync("src/render/review.ts", "utf8");
for (const marker of ['data-reminder-action="snooze"', 'data-reminder-action="skip"', 'data-reminder-action="restore"', "review.reminderSnoozeAria", "review.reminderSkipAria", "review.reminderRestoreAria", "review.remindersSnoozed", "review.remindersSkipped"]) {
    assert.match(review, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `review markup missing ${marker}`);
}
const navigation = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
assert.match(navigation, /\[data-reminder-action\]/, "reminder actions must be bound");
assert.match(navigation, /host\.reminderUserAction\(id, action\)/, "actions must delegate to the host");
const plugin = fs.readFileSync("src/index.ts", "utf8");
assert.match(plugin, /REMINDER_ACTIONS_NAME = "checkin-reminder-actions"/, "actions need an isolated storage key");
assert.match(plugin, /reminderUserAction\(id: string, action: "snooze" \| "skip" \| "restore"\)/, "host must implement the action handler");
const styles = fs.readFileSync("src/ui/components.scss", "utf8");
assert.match(styles, /\.lc-checkin__reminder-action\b/, "text action buttons need their own pill style");
const i18n = fs.readFileSync("src/i18n.ts", "utf8");
for (const key of ["review.remindersSnoozed", "review.remindersSkipped", "review.reminderSnooze", "review.reminderSkip", "review.reminderRestore", "review.reminderActionToast"]) {
    assert.match(i18n, new RegExp(`"${key}"`), `missing i18n key ${key}`);
}
assert.equal((i18n.match(/"review.reminderSkip":/g) || []).length, 2, "labels must exist in both locales");

console.log("Reminder snooze/skip model and wiring checks passed.");
