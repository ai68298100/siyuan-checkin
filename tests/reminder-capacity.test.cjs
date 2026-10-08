/* T-1770 守门：提醒跳过动作的容量分账与长期有效性（D-339）。
   风险路径（2026-09-30 审计）：normalizeReminderUserActions 声明 skip 对实例持续生效，
   却对全部动作 slice(-200)——201 条较新 snooze 即可把旧一次性逾期事项的 skip 挤出，
   重投影再次提示。修复后契约：snooze/skip 各自独占 max 配额（snooze 噪声不再挤掉
   长期 skip）；同类超限按最旧淘汰（容量边界如实）；时效清理、防抖校验、合并稳定性
   与端到端投影行为不变。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-reminder-capacity-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "occasions.ts", "reminders.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const reminders = require(path.join(dir, "reminders.js"));

const now = new Date("2026-10-01T12:00:00.000Z");
const at = (day, hour) => `2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
const snoozeAt = (index) => ({id: `checkin:noise:${index}`, action: "snooze", at: at(25 + (index % 6), index % 24)});
const oldSkip = {id: "occasion:once-old:2026-09-01", action: "skip", at: at(2, 8)};

/* —— 夹具 1：300 条较新 snooze 不再挤掉旧 skip（核心红→绿）。 —— */
const noisy = [oldSkip, ...Array.from({length: 300}, (_, index) => snoozeAt(index))];
const normalized = reminders.normalizeReminderUserActions(noisy, 200, now);
assert.ok(normalized.some((entry) => entry.id === oldSkip.id && entry.action === "skip"),
    "a still-relevant skip survives 300 newer snoozes (T-1770)");
assert.equal(normalized.filter((entry) => entry.action === "snooze").length, 200, "snoozes keep their own budget");

/* —— 夹具 2：同类超限按最旧淘汰（容量边界如实）。 —— */
const skipFlood = Array.from({length: 300}, (_, index) => ({id: `occasion:o${index}:2026-09-05`, action: "skip", at: at(5, index % 24)}));
const flooded = reminders.normalizeReminderUserActions(skipFlood, 200, now);
assert.equal(flooded.length, 200, "skip budget stays bounded");
assert.ok(!flooded.some((entry) => entry.id === "occasion:o0:2026-09-05"), "the oldest skips are evicted within their own class");
assert.ok(flooded.some((entry) => entry.id === "occasion:o299:2026-09-05"), "the newest skips stay");

/* —— 夹具 3：snooze 7 天时效清理与 600 条钉住行为不变。 —— */
const staleSnooze = {id: "checkin:stale:2026-09-01", action: "snooze", at: at(1, 8)};
const mixed = reminders.normalizeReminderUserActions([staleSnooze, oldSkip], 200, now);
assert.deepEqual(mixed, [oldSkip], "stale snoozes are still time-cleaned, skips untouched");
assert.equal(reminders.normalizeReminderUserActions(Array.from({length: 600}, (_, index) => snoozeAt(index)), 200, now).length, 200,
    "existing bounded-log pin holds");

/* —— 夹具 4：expiresAt 防抖校验不变（合法保留、超窗丢弃字段）。 —— */
const validDebounce = {id: "checkin:deb:2026-09-30", action: "snooze", at: at(30, 8), expiresAt: at(30, 20)};
const longDebounce = {id: "checkin:long:2026-09-30", action: "snooze", at: at(30, 8), expiresAt: "2026-10-20T08:00:00.000Z"};
const debounced = reminders.normalizeReminderUserActions([validDebounce, longDebounce], 200, now);
assert.equal(debounced.find((entry) => entry.id === validDebounce.id).expiresAt, validDebounce.expiresAt, "valid debounce window is preserved");
assert.equal(debounced.find((entry) => entry.id === longDebounce.id).expiresAt, undefined, "over-long debounce falls back to same-day semantics");

/* —— 夹具 5：合并 + 归一往返稳定（跨窗口动作不被容量误删）。 —— */
const local = [oldSkip, snoozeAt(1)];
const remote = [snoozeAt(2), {id: oldSkip.id, action: "skip", at: at(2, 9)}];
const merged = reminders.normalizeReminderUserActions(reminders.mergeReminderUserActions(local, remote), 200, now);
assert.ok(merged.some((entry) => entry.id === oldSkip.id), "merged skips survive the round trip");
assert.equal(reminders.mergeReminderUserActions(merged, merged).length, merged.length, "normalize output is merge-stable");

/* —— 夹具 6：端到端——300 条新 snooze 之后，旧 skip 仍把逾期实例投影为 skipped。 —— */
const occasion = {id: "once-old", name: "旧约诊", kind: "once", date: "2026-09-01", recurrence: "once", enabled: true, completedDates: []};
const entries = reminders.projectReminderCenter(
    {version: 3, items: [], events: [], eventTombstones: [], itemTombstones: []},
    {occasions: [occasion]},
    new Date(2026, 8, 15, 12),
    reminders.normalizeReminderUserActions(noisy, 200, new Date("2026-09-15T12:00:00.000Z")),
);
const overdueEntry = entries.find((entry) => entry.id === oldSkip.id);
assert.ok(overdueEntry, "the overdue instance still projects");
assert.equal(overdueEntry.status, "skipped", "the old skip still suppresses the projection end to end");

console.log("reminder-capacity: all assertions passed");
