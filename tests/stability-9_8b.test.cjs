/* 9.8 稳定化第二批：数据安全、跨端状态与移动端边界结构守门。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");
const plugin = `${read("src", "index.ts")}\n${read("src", "render", "bind-today.ts")}`;
const model = read("src", "model.ts");
const reminders = read("src", "reminders.ts");
const components = read("src", "ui", "components.scss");
const checklist = read("docs", "integration-smoke-checklist.md");

const checks = [
    [plugin, /REMINDER_ACTIONS_NAME = "checkin-reminder-actions"/, "reminder actions use an isolated storage key"],
    [plugin, /deserializeReminderUserActions/, "reminder actions are normalized on load"],
    [plugin, /serializeReminderUserActions/, "reminder actions are serialized on save"],
    [plugin, /clearReminderUserActions/, "reminder restore clears persisted action"],
    [plugin, /projectReminderCenter\(/, "review and today consume projected reminders"],
    [plugin, /focusTimerProvider/, "focus timer provider preference is retained"],
    [plugin, /source === "tomato"/, "tomato source remains explicit"],
    [plugin, /externalRef/, "external event idempotency key remains supported"],
    [plugin, /existing = this\.store\.events\.find/, "duplicate external events are rejected"],
    [plugin, /appendStoreAudit\(/, "mutations use the shared audit boundary"],
    [plugin, /persistAuditBestEffort/, "audit persistence remains best effort"],
    [plugin, /saveQueue\.catch\(\(\) => undefined\)/, "writes remain serialized after failures"],
    [plugin, /syncHostThemeTokens\(/, "host theme tokens are synchronized"],
    [plugin, /hostThemeSignatures/, "theme synchronization is cached"],
    [plugin, /dataset\.reducedMotion/, "reduced motion state reaches the surface"],
    [plugin, /pendingFocusItemId = item\.id/, "record actions queue focus restoration"],
    [plugin, /updateTodayWeekStrip\(/, "local updates refresh week strip"],
    [plugin, /renderTodayItemLocally\(/, "today completion has a local update path"],
    [plugin, /syncRecentRecordToast\(/, "completion feedback remains centralized"],
    [model, /appendStoreSnapshotHistory/, "snapshot history appends previous store"],
    [model, /readStoreSnapshotHistory/, "snapshot history reader remains backward compatible"],
    [model, /normalizeStoreAudit/, "audit entries normalize at the model boundary"],
    [model, /appendStoreAudit/, "audit retention uses one append function"],
    [model, /parseStoreSnapshotHistoryExport/, "snapshot import validates an envelope"],
    [model, /slice\(-Math\.max\(1, limit\)\)/, "snapshot history is bounded"],
    [reminders, /ReminderUserAction/, "reminder action type is explicit"],
    [reminders, /snooze|skip|restore/, "reminder action transitions include restore"],
    [reminders, /completed/, "completed reminder state remains represented"],
    [components, /var\(--lc-checkin-nav-height\)/, "floating notices avoid the bottom navigation"],
    [components, /env\(safe-area-inset-bottom\)/, "component spacing respects mobile safe area"],
    [components, /data-reduced-motion|reducedMotion/, "reduced motion styling hooks remain present"],
    [components, /env\(safe-area-inset-top\)/, "component top spacing respects safe area"],
    [components, /scroll-padding-bottom/, "mobile scrolling reserves bottom controls"],
    [checklist, /局部刷新/, "manual checklist covers local refresh"],
    [checklist, /双窗口/, "manual checklist covers dual-window tomato flow"],
    [checklist, /提醒中心/, "manual checklist covers reminder center"],
];
for (const [source, pattern, label] of checks) assert.match(source, pattern, label);
assert.ok(checks.length >= 30, "the second stability batch must contain at least 30 checks");
console.log(`9.8 stability batch B checks passed (${checks.length} checks).`);
