/* T-1620 守门：B 类即时偏好的「内存/存储不再静默分叉」契约。
   - 统一包装 applyPreference：快照（collectViewPreferences）→ 改值 → persist，
     失败经 applyViewPreferences 原路回滚 + 重绘 + msg.prefSaveFail；
   - 裸 `void persistViewPreferences()` 在 index.ts 清零；旧 savePreference 包装退役；
   - 周复盘草稿宿主侧快照回滚、UI 侧失败状态可见、输入保留可重试；
   - save-note-query 七字段登记决策已文档化（D-313），不再静默。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");

const plugin = read("src", "index.ts");
const navigation = read("src", "render", "bind-page-navigation.ts");
const today = read("src", "render", "bind-today.ts");
const quickDialog = read("src", "render", "quick-dialog.ts");
const reminderSaveStart = plugin.indexOf("data-action='save-reminder-slots'");
const reminderSaveEnd = plugin.indexOf("/* T-1495", reminderSaveStart);
const reminderSaveBlock = plugin.slice(reminderSaveStart, reminderSaveEnd);
const i18n = read("src", "i18n.ts");
const changeList = read("src", "features", "settings-change-list.ts");
const registryDoc = read("docs", "settings-field-registry-2026-09-28.md");

/* 统一包装与快照链路 */
assert.match(plugin, /private applyPreference\(mutate: \(\) => void, success\?: \(\) => void\)(?:: void)?;/,
    "the unified preference wrapper must exist");
assert.match(plugin, /const snapshot = this\.collectViewPreferences\(\);/,
    "the wrapper must snapshot before mutating");
assert.match(plugin, /this\.applyViewPreferences\(snapshot\);/,
    "rollback must restore via the canonical applyViewPreferences mapping");
assert.match(plugin, /showMessage\(t\("msg\.prefSaveFail"\)\)/,
    "rollback must surface the unified failure toast");
assert.match(plugin, /private persistViewPreferences\(avatarOverride\?: \{avatarImage: string \| undefined\}\): Promise<void> \{\s*\r?\n\s*if \(this\.disposed \|\| !this\.storageReady\) return Promise\.resolve\(\);\s*\r?\n\s*const preferences = this\.collectViewPreferences\(avatarOverride\);/,
    "persist must serialize from the same collectViewPreferences used for snapshots");

/* 裸调用清零与旧包装退役 */
assert.doesNotMatch(plugin, /void this\.persistViewPreferences\(\);/,
    "fire-and-forget persists must be gone from index.ts (all B-class handlers go through applyPreference)");
assert.doesNotMatch(plugin, /const savePreference = \(\) =>/,
    "the legacy savePreference wrapper must stay retired");

/* Today/quick surfaces must use the same rollback-aware entry point. */
assert.match(plugin, /public applyPreferenceMutation\(mutate: \(\) => void, failure\?: \(\) => void\): void/,
    "render bindings need a public rollback-aware preference mutation bridge");
assert.match(today, /applyPreferenceMutation\?\(mutate: \(\) => void\): void/,
    "today preference bindings must expose the rollback-aware mutation bridge");
const pendingOnlyBlock = today.slice(today.indexOf("data-action='toggle-pending-only'"), today.indexOf("data-setting-group"));
assert.match(pendingOnlyBlock, /persistPreferenceMutation\(\(\) => \{ host\.pendingOnly = !host\.pendingOnly; \}\)/,
    "today pending-only action must use the rollback-aware mutation helper");
assert.match(today, /const persistPreferenceMutation[\s\S]{0,1200}host\.applyPreferenceMutation\(mutate\)/,
    "today mutation helper must delegate to the host rollback bridge");
assert.match(quickDialog, /host\.applyPreferenceMutation\(\(\) => \{/,
    "quick dialog geometry must use rollback-aware preference persistence");

/* 迁移面抽查（按字段精确签名，防回退到裸 persist） */
const migratedSelectors = [
    "[data-setting-group]", "[data-setting-sort]", "[data-setting-completed]", "[data-setting-weekstrip]",
    "[data-setting-appearance]", "[data-setting-language]", "[data-setting-palette]", "[data-setting-open-mode]",
    "[data-setting-quick-entry-nlp]", "[data-setting-motion]", "[data-setting-haptic]",
    "[data-setting-quiet]", "[data-setting-reminder-toggle]", "[data-setting-occasion-once]",
    "[data-setting-focus-timer]", "[data-summary-toggle]", "[data-sireader-toggle]", "[data-sireader-item]",
    "[data-siplayer-toggle]", "[data-siplayer-item]", "[data-health-toggle]", "[data-note-query-toggle]",
    "[data-weread-toggle]", "[data-weread-item]", "[data-weread-finish-item]", "[data-weread-notes-item]",
    "[data-yeguif-toggle]", "[data-yeguif-mappings]",
];
/* 逐选择器：其处理器体内（同一段 addEventListener）不得再直接跟裸 persist。 */
for (const selector of migratedSelectors) {
    const index = plugin.indexOf(`("${selector}")`);
    assert.ok(index > 0, `${selector} handler must exist`);
    const window = plugin.slice(index, index + 1200);
    assert.ok(!window.includes("void this.persistViewPreferences();"),
        `${selector} handler must not keep a bare persist (migrate to applyPreference)`);
}
assert.ok((plugin.match(/this\.applyPreference\(/g) || []).length >= 36,
    "the migrated B-class surface must go through the unified wrapper");

/* Explicit settings writes must share the same busy/focus/error wrapper so a
   double click cannot enqueue two saves or duplicate external writes. */
for (const action of [
    "save-reminder-slots", "save-note-query", "save-weread", "weread-pull",
    "write-diary-report", "write-summary-now", "create-diary-doc", "data-setting-avatar-clear",
]) {
    const marker = action.startsWith("data-")
        ? `[${action}]`
        : `[data-action='${action}']`;
    const start = plugin.indexOf(marker);
    assert.ok(start >= 0, `${marker} must remain bound`);
    const body = plugin.slice(start, start + 1800);
    assert.match(body, /runSettingsAction\(/, `${marker} must use the settings busy wrapper`);
}
assert.match(plugin, /control\.setAttribute\("aria-busy", "true"\)/,
    "settings async actions must expose aria-busy while pending");

/* 设置提醒时段保存：异步写入必须走统一 busy 生命周期，避免连续点击并发保存；
   失败必须恢复内存快照并交给设置反馈而不是只弹一次 toast。 */
assert.match(reminderSaveBlock, /runSettingsAction\(button, async \(\) => \{/,
    "reminder slot save must use the settings busy lifecycle");
assert.match(reminderSaveBlock, /const previous = this\.dailyReminder;/,
    "reminder slot save must snapshot the previous preference");
assert.match(reminderSaveBlock, /this\.dailyReminder = previous;/,
    "reminder slot save must roll back after persistence failure");
assert.match(reminderSaveBlock, /throw new Error\(t\("msg\.prefSaveFail"\)\)/,
    "reminder slot save failure must use fixed safe feedback");

/* 快照纪律：改值必须发生在 mutate 内（外层先行赋值会污染快照，回滚失效） */
assert.doesNotMatch(plugin, /this\.firstSuccessState = next;\s*\r?\n\s*this\.applyPreference\(/,
    "advanceFirstSuccess must mutate inside the wrapper, not before it");
assert.doesNotMatch(plugin, /this\.reportSource = view\.scope\.sources\[0\] \|\| "";\s*\r?\n\s*this\.applyPreference\(/,
    "applySavedView must mutate inside the wrapper, not before it");

/* 周复盘草稿：宿主快照回滚 + UI 失败反馈 */
const weeklySave = plugin.slice(plugin.indexOf("async saveWeeklyReviewDraft"), plugin.indexOf("exportWeeklyReviewMarkdown"));
assert.match(weeklySave, /const previous = this\.weeklyReviewDrafts;/, "save must snapshot the drafts array");
assert.match(weeklySave, /this\.weeklyReviewDrafts = previous;\s*\r?\n\s*throw error;/, "save failure must roll back and rethrow");
const weeklyClear = plugin.slice(plugin.indexOf("async clearWeeklyReviewDraft"), plugin.indexOf("exportWeeklyReviewMarkdown"));
assert.match(weeklyClear, /const previous = this\.weeklyReviewDrafts;/, "clear must snapshot the drafts array");
assert.match(weeklyClear, /this\.weeklyReviewDrafts = previous;\s*\r?\n\s*throw error;/, "clear failure must roll back and rethrow");
assert.match(navigation, /runWeeklyTool\([\s\S]*?review\.weeklySaveFail/, "weekly save must surface a visible failure status");
assert.match(navigation, /runWeeklyTool\([\s\S]*?review\.weeklyClearFail/, "weekly clear must surface a visible failure status");
assert.match(i18n, /"review\.weeklySaveFail"/, "weekly save failure copy must exist");
assert.match(i18n, /"review\.weeklyClearFail"/, "weekly clear failure copy must exist");
assert.equal((i18n.match(/"review\.weeklySaveFail"/g) || []).length, 2, "weeklySaveFail must exist in both languages");
assert.equal((i18n.match(/"review\.weeklyClearFail"/g) || []).length, 2, "weeklyClearFail must exist in both languages");

/* save-note-query 七字段：决策已登记（D-313），变更清单注册表保持显式一致 */
assert.match(registryDoc, /已决策，D-313/, "the registry doc must record the note-query decision");
assert.match(registryDoc, /整体表单即保存边界/, "the decision must document the whole-form save boundary");
assert.match(registryDoc, /template\/scope\/targetId\/itemId\/field\/value\/tag/, "the seven fields must be enumerated in the decision");
assert.doesNotMatch(changeList, /note-query/,
    "SETTINGS_FIELD_REGISTRY must not silently half-register note-query fields");

console.log("Preference rollback checks passed: wrapper + snapshot rollback, bare-persist zeroed, weekly draft feedback, note-query decision registered.");
