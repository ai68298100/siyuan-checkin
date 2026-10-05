const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1567 设置页分阶段迁移切片验收（九组→四组重组后的逐字段对账）。
   对照 docs/settings-field-registry-2026-09-28.md 迁移表：
   - 显式保存 10 字段：DOM 属性（settings.ts）+ 保存处理器（index.ts）+ 变更清单注册（settings-change-list.ts）三面齐；
   - 即时持久化字段（T-1552/1564 迁移后仍存在的 B 类）：属性 + 监听在位；
   - 结构兼容：四导航组、三大分区标记、四数据分区、总览与搜索会话机制在位；
   - 存储键零变化：视图偏好单桶 + 8 个 checkin-* 独立桶名原样。
   验收证据入 T-1608 统一台账（registry §7 证据行同步）。真实内核（文档目标/来源卡/恢复/重载）
   属 host-pending 现场验收，不以本守门冒充。 */

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const settings = read("src", "render", "settings.ts");
const indexSource = read("src", "index.ts");
const changeList = read("src", "features", "settings-change-list.ts");
const navigation = read("src", "render", "settings-navigation.ts");
const i18nSource = read("src", "i18n.ts");

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("explicit-save fields keep all three faces after the four-group migration", () => {
        const explicitFields = [
            ["data-journal-custom", "save-journal-custom"],
            ["data-journal-mode", "save-journal-target"],
            ["data-journal-notebook-id", "save-journal-target"],
            ["data-journal-target-doc", "save-journal-target"],
            ["data-diary-doc", "save-diary-doc"],
            ["data-summary-doc", "save-summary-doc"],
            ["data-health-doc", "save-health-doc"],
            ["data-setting-reminder-slots", "save-reminder-slots"],
            ["data-weread-threshold", "save-weread"],
            ["data-weread-key", "save-weread"],
        ];
        for (const [attribute, action] of explicitFields) {
            assert.match(settings, new RegExp(attribute.replace(/-/g, "\\-")), `settings.ts 必须保留 ${attribute}`);
            assert.match(indexSource, new RegExp(attribute.replace(/-/g, "\\-")), `index.ts 必须仍接线 ${attribute}`);
        }
        /* 六个文档目标动作经 bindVerifiedDocumentSave 动态选择器（断言调用点），
           其余显式保存动作为字面量选择器。 */
        for (const action of ["save-diary-doc", "save-summary-doc", "save-health-doc"]) {
            assert.match(indexSource, new RegExp(`bindVerifiedDocumentSave\\("${action}"`), `显式保存动作 ${action} 处理器在位`);
        }
        for (const action of ["save-journal-custom", "save-journal-target", "save-reminder-slots", "save-weread"]) {
            assert.match(indexSource, new RegExp(`data-action='${action}'`), `显式保存动作 ${action} 处理器在位`);
        }
        for (const attribute of ["data-journal-custom", "data-journal-mode", "data-journal-notebook-id", "data-journal-target-doc", "data-diary-doc", "data-summary-doc", "data-health-doc", "data-setting-reminder-slots", "data-weread-threshold", "data-weread-key"]) {
            assert.match(changeList, new RegExp(attribute.replace(/-/g, "\\-")), `变更清单仍登记 ${attribute}`);
        }
    });

    check("immediate-persist fields keep their attributes and listeners after group merges", () => {
        const immediateFields = [
            "data-setting-appearance", "data-setting-language", "data-setting-open-mode",
            "data-setting-quick-entry-nlp", "data-setting-motion", "data-setting-haptic",
            "data-setting-palette", "data-setting-avatar", "data-setting-group",
            "data-setting-sort", "data-setting-completed", "data-setting-weekstrip",
            "data-setting-quiet", "data-setting-reminder-toggle", "data-setting-occasion-once",
            "data-setting-focus-timer",
        ];
        for (const attribute of immediateFields) {
            assert.match(settings, new RegExp(attribute.replace(/-/g, "\\-")), `settings.ts 必须保留 ${attribute}`);
            assert.match(indexSource, new RegExp(attribute.replace(/-/g, "\\-")), `index.ts 必须仍监听 ${attribute}`);
        }
        /* 安静时段起止经模板选择器循环绑定（index.ts:3668-3675）。 */
        assert.match(indexSource, /data-setting-quiet-\$\{bound\}/, "安静时段起止仍循环绑定");
        assert.ok(!settings.includes("data-diary-toggle"), "退役的 diary 开关保持退役（T-1552）");
    });

    check("migrated structure: four nav groups, section markers, overview and search session", () => {
        for (const groupId of ["appearance", "external", "data", "about"]) {
            assert.match(settings, new RegExp(`id: "${groupId}"`), `导航组 ${groupId} 在位`);
        }
        for (const retired of ["today", "dialog", "shortcuts", "host", "documents"]) {
            assert.ok(!settings.includes(`id: "${retired}"`), `旧组 ${retired} 保持并入`);
        }
        for (const marker of ["data-appearance-section=", "data-integration-section=", "data-data-section="]) {
            assert.match(settings, new RegExp(marker), `分区标记 ${marker} 在位`);
        }
        assert.match(settings, /data-settings-overview/, "T-1562 总览块保留");
        assert.match(navigation, /searchSession\?: SettingsSearchSession/, "T-1563 搜索会话由 root context 提供");
        assert.match(indexSource, /searchSession: this\.settingsStateForRoot\(root\)\.searchSession/, "设置搜索绑定所属 root 会话");
        assert.doesNotMatch(navigation, /new WeakMap<HTMLElement, SettingsSearchSession>/, "设置搜索不再以模块级 WeakMap 持有 root 会话");
        assert.match(settings, /sourcePanelOpen\(/, "来源面板展开态机制保留");
        assert.match(indexSource, /settings\.openSourcePanels\.clear\(\)/, "展开态捕获写入设置 root 会话");
        assert.match(indexSource, /this\.settingsStateForRoot\(root\)\.openSourcePanels/, "展开态恢复读取设置 root 会话");
        assert.doesNotMatch(indexSource, /settingsOpenSourcePanels/, "展开态不再由独立 WeakMap 持有");
    });

    check("storage keys unchanged: one view-preferences bucket plus the eight named buckets", () => {
        const buckets = [
            "checkin-view-preferences", "checkin-user-templates", "checkin-custom-icon-library",
            "checkin-reminder-actions", "checkin-suggestion-workflow", "checkin-focus-diagnostics",
            "checkin-docktomato-inbox", "checkin-external-pending",
        ];
        for (const bucket of buckets) {
            assert.match(indexSource, new RegExp(`"${bucket}"`), `存储桶 ${bucket} 名称原样`);
        }
        assert.match(indexSource, /applyViewPreferences\(resetViewPreferences\(this\.collectViewPreferences\(\)\)\)/, "重置视图偏好通过纯 helper 保留主题等例外字段（T-1566 语义）");
        assert.match(indexSource, /applyViewPreferences\(resetDisplayPreferences\(this\.collectViewPreferences\(\)\)\)/, "重置全部偏好使用独立显示偏好边界");
    });

    check("bilingual coverage for every key introduced by the migration slices", () => {
        const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
        const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
        const migrationKeys = [
            "set.groupAppearanceOps", "set.groupReminders", "set.groupIntegration",
            "set.dataSectionIO", "set.dataSectionRecovery", "set.dataSectionDiagnostics", "set.dataSectionReset",
            "set.hostMine", "set.hostForOthers",
            "set.searchActive", "set.sourceReadNow", "set.sourceAdvanced", "set.outputPreview",
            "set.overviewTitle", "set.overviewAllClear", "set.overviewTargetMissing", "set.overviewDrafts",
            "set.targetSummaryTitle", "set.targetNone", "set.targetOpen", "set.targetRecheck", "set.targetEdit", "set.targetClear",
            "bind.lastCheck", "bind.disable", "bind.disableConfirm", "bind.reasonMissing", "bind.reasonError",
            "init.loading", "init.failed", "init.failedHint",
        ];
        for (const key of migrationKeys) {
            assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
            assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
        }
    });

    console.log(`Settings migration acceptance: ${checks} checks passed.`);
} finally {
    process.env.TZ = undefined;
}
