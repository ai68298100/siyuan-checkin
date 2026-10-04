/* T-1521 设置保存前变更清单与分节恢复守门：
   白名单注册表（敏感字段遮罩、普通值截断）、草稿≠已保存才入清单、
   分节分组确定性、撤回/分节恢复接线、不得把草稿当已生效、双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-settings-change-"));
const load = (relative) => {
    const target = path.join(dir, path.basename(relative).replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const changeList = load("features/settings-change-list.ts");

/* —— 1. 遮罩：敏感字段一律 ••••；普通字段截断；空值占位。 —— */
{
    assert.equal(changeList.maskSettingValue(true, "wrk-secret-key"), "••••••");
    assert.equal(changeList.maskSettingValue(true, ""), "（空）");
    assert.equal(changeList.maskSettingValue(false, "20260101120000-abcdefgh"), "20260101120000-abcdefgh");
    assert.equal(changeList.maskSettingValue(false, "a".repeat(40)), `${"a".repeat(24)}…`);
    assert.equal(changeList.maskSettingValue(false, ""), "（空）");
}

/* —— 2. 清单：只收草稿≠已保存；注册表顺序分节；字段遮罩在清单层应用。 —— */
{
    const sections = changeList.buildSettingsChangeList([
        {attribute: "data-weread-key", saved: "wrk-old", draft: "wrk-new"},
        {attribute: "data-weread-threshold", saved: "30", draft: "45"},
        {attribute: "data-diary-doc", saved: "same", draft: "same"},
        {attribute: "data-health-doc", saved: "old-doc", draft: "new-doc"},
    ]);
    assert.equal(sections.length, 2, "weread + health groups (diary-doc unchanged is excluded)");
    assert.equal(sections[0].sectionId, "health", "registry order: health before weread");
    const weread = sections[1];
    assert.equal(weread.labelKey, "set.change.section.weread");
    assert.equal(weread.entries.length, 2);
    const keyEntry = weread.entries.find((entry) => entry.attribute === "data-weread-key");
    assert.equal(keyEntry.saved, "••••••", "sensitive saved value masked");
    assert.equal(keyEntry.draft, "••••••", "sensitive draft value masked");
    const threshold = weread.entries.find((entry) => entry.attribute === "data-weread-threshold");
    assert.equal(threshold.saved, "30");
    assert.equal(threshold.draft, "45");
    assert.deepEqual(changeList.buildSettingsChangeList([{attribute: "data-diary-doc", saved: "x", draft: "x"}]), [], "no changes → empty list");
    assert.deepEqual(changeList.buildSettingsChangeList([{attribute: "data-unknown-field", saved: "a", draft: "b"}]), [], "fields outside the registry are ignored");
}

/* —— 3. 宿主与渲染接线。 —— */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private settingsSavedBaselines = new Map<string, string>\(\)/, "host captures saved baselines");
assert.match(indexSource, /settingsSavedBaselines\.set\(attribute, saved\)/, "root baseline captured before the draft is re-applied");
assert.match(indexSource, /settingsChangeSections: this\.buildSettingsChangeSections\(root\)/, "settings ctx carries the root-local change list");
assert.match(indexSource, /private revertSettingDraft\(attribute: string, root\?: HTMLElement\): void/, "single root revert drops the draft");
assert.match(indexSource, /private revertSettingSection\(sectionId: string, root\?: HTMLElement\): void/, "single root section revert drops all drafts");
assert.match(indexSource, /set\.changeRevertConfirm/, "single revert asks for confirmation");
assert.match(indexSource, /set\.changeSectionConfirm/, "section revert asks for confirmation");
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-settings-change-list/, "settings renders the change list panel");
assert.match(settingsSource, /data-revert-setting=/, "entries expose revert actions");
assert.match(settingsSource, /data-revert-section=/, "sections expose restore actions");
assert.match(settingsSource, /set\.changeNone/, "empty state says nothing to save");
assert.match(settingsSource, /set\.changeDraftHint/, "the panel states drafts are not yet effective");
const scss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
assert.match(scss, /\.lc-checkin__change-list \{/, "change list styles exist");

/* —— 4. 双语。 —— */
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["set.changeTitle", "set.changeNone", "set.changeDraftHint", "set.changeRevertOne", "set.changeRevertSection", "set.changeRevertConfirm", "set.changeSectionConfirm", "set.change.section.journal", "set.change.section.docs", "set.change.section.health", "set.change.section.reminders", "set.change.section.weread", "set.change.journalCustom", "set.change.journalMode", "set.change.journalNotebook", "set.change.journalTargetDoc", "set.change.diaryDoc", "set.change.summaryDoc", "set.change.healthDoc", "set.change.reminderSlots", "set.change.wereadThreshold", "set.change.wereadKey"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("settings change list gates passed: registry whitelist, sensitive masking, draft-vs-saved only, section grouping, revert/restore wiring, draft-not-effective copy and bilingual labels.");
