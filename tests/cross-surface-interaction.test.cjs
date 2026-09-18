const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const navigation = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const archived = fs.readFileSync(path.join(root, "src", "render", "archived.ts"), "utf8");
const settings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const index = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

/* 归档恢复/删除必须共用互斥守门，避免触摸连点产生重复 mutation。 */
assert.match(navigation, /const archivedBusy = new WeakSet/);
assert.match(navigation, /data-restore-id/);
assert.match(navigation, /data-archived-delete/);
assert.match(navigation, /button\.setAttribute\("aria-busy", "true"\)/);
assert.match(navigation, /archivedBusy\.has\(button\)/);
assert.match(archived, /data-action="restore-archived"/);
assert.match(archived, /data-action="delete-archived"/);

/* 回顾页导出/复制按钮执行期间禁用，并在完成后恢复焦点。 */
assert.match(navigation, /const reviewBusy = new WeakSet/);
assert.match(navigation, /data-action='copy-weekly-report'/);
assert.match(navigation, /data-action='export-csv'/);
assert.match(navigation, /data-action='export-json'/);
assert.match(navigation, /runReviewTool\(button/);
assert.match(navigation, /button\.focus\(\)/);

/* 设置页导入/恢复动作应有 data-action、busy 状态、可见错误与焦点回归。 */
for (const action of ["import-json", "import-csv", "import-snapshots", "restore-snapshot", "restore-backup"]) {
    assert.match(settings + index, new RegExp(`data-action=\\"${action}\\"`), `${action} must be addressable`);
}
assert.match(index, /const settingsBusy = new WeakSet/);
assert.match(index, /settingsBusy\.has/);
assert.match(index, /setAttribute\("aria-busy", "true"\)/);
assert.match(index, /data-settings-feedback/);
assert.match(settings, /role="status" aria-live="polite"/);
assert.match(index, /\[data-import-json\].*\.focus\(\)/s);
assert.match(index, /\[data-import-csv\].*\.focus\(\)/s);

console.log("Cross-surface interaction guards passed.");
