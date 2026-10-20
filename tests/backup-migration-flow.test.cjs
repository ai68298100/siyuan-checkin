/* T-1787 备份恢复版本化与独立桶迁移提示守门测试：
   验证：
   1. 旧版单主档 JSON 备份精准识别向后兼容，如实披露丢失的独立配置桶，提示不覆盖现有独立配置；
   2. 版本化多桶 BackupEnvelope 协议校验（envelopeVersion === 1，未知版本拒绝）；
   3. 逐桶覆盖/合并/跳过规划（D-514 映射，敏感桶默认遮罩并跳过）；
   4. 多桶完整备份构建（createBackupEnvelopeFromBuckets）；
   5. 多桶原子写入与异常全量回滚架构在位。 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-backup-migration-flow-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "backup-envelope.ts", "export.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}

const envelope = require(path.join(dir, "backup-envelope.js"));
const exporter = require(path.join(dir, "export.js"));

/* ---------------------------------------------------------
   一、静态代码与架构规范守门
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const srcExport = fs.readFileSync(path.join(root, "src", "export.ts"), "utf8");
const srcEnvelope = fs.readFileSync(path.join(root, "src", "backup-envelope.ts"), "utf8");
const srcSettings = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
const srcPluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. 关键符号与接口导出
assert.match(srcEnvelope, /export function classifyBackupPayload/, "backup-envelope.ts 必须导出 classifyBackupPayload");
assert.match(srcEnvelope, /export function planBackupEnvelopeImport/, "backup-envelope.ts 必须导出 planBackupEnvelopeImport");
assert.match(srcEnvelope, /export function createBackupEnvelopeFromBuckets/, "backup-envelope.ts 必须导出 createBackupEnvelopeFromBuckets");
assert.match(srcEnvelope, /export function preflightUnifiedBackup/, "backup-envelope.ts 必须导出 preflightUnifiedBackup");
assert.match(srcPluginOps, /export function downloadBackupEnvelopeFor/, "plugin-ops.ts 必须导出 downloadBackupEnvelopeFor");

// 2. index.ts 恢复与导出接线守门
assert.match(srcIndex, /preflightUnifiedBackup\(text, \{normalizeStore/, "index.ts 恢复处理必须使用 preflightUnifiedBackup 统一预检");
assert.match(srcIndex, /if \(preflight\.format === "legacy-store"\)/, "index.ts 必须对旧版单主档和多桶 Envelope 区分处理");
assert.match(srcIndex, /createBackupEnvelopeFromBuckets\(\{/, "index.ts 必须支持通过 createBackupEnvelopeFromBuckets 导出完整多桶备份");
assert.match(srcIndex, /downloadBackupEnvelopeFor\(envelope\)/, "index.ts 必须调用 downloadBackupEnvelopeFor 执行多桶备份下载");

// 3. 整体原子失败回滚守门
assert.match(
    srcIndex,
    /this\.store = previousStore;\s*this\.userTemplates = previousTemplates;\s*this\.customIconLibrary = previousIcons;\s*this\.journalCustomTemplates = previousJournalTemplates;\s*this\.journalIntegrationPref = previousJournalIntegration;\s*this\.occasionStore = previousOccasions;\s*this\.applyViewPreferences\(previousPreferences\);/,
    "多桶写入异常时必须将内存状态全部原子回滚"
);
assert.match(
    srcIndex,
    /await this\.saveData\(STORAGE_NAME, previousStore\);\s*await this\.saveData\(USER_TEMPLATES_NAME, previousTemplates\);/,
    "多桶写入异常时必须对磁盘数据执行原子回滚"
);

// 4. 设置页与 i18n 提示守门
assert.match(srcSettings, /data-action="export-envelope"/, "设置页必须提供导出多桶备份的按钮");
assert.match(srcI18n, /"set\.exportEnvelope":/, "i18n 中文必须包含 set.exportEnvelope");
assert.match(srcI18n, /"msg\.envelopeRestored":/, "i18n 中文必须包含 msg.envelopeRestored");

/* ---------------------------------------------------------
   二、格式分类器行为测试（classifyBackupPayload）
   --------------------------------------------------------- */

// 1. 版本化 Envelope (v1)
assert.equal(envelope.classifyBackupPayload({envelopeVersion: 1, buckets: {}}), "envelope");

// 2. 未知版本 Envelope（如未来 v2）拒绝
assert.equal(envelope.classifyBackupPayload({envelopeVersion: 2, buckets: {}}), "invalid");
assert.equal(envelope.classifyBackupPayload({envelopeVersion: 0, buckets: {}}), "invalid");

// 3. 旧版单主档
assert.equal(envelope.classifyBackupPayload({version: 3, items: [], events: []}), "legacy-store");
assert.equal(envelope.classifyBackupPayload({items: [{id: "item-1"}]}), "legacy-store");

// 4. 非法输入
assert.equal(envelope.classifyBackupPayload(null), "invalid");
assert.equal(envelope.classifyBackupPayload("not-json"), "invalid");
assert.equal(envelope.classifyBackupPayload({}), "invalid");

/* ---------------------------------------------------------
   三、旧版单主档向后兼容预检测试（preflightUnifiedBackup）
   --------------------------------------------------------- */

const dummyNormalize = (v) => ({
    version: 3,
    items: v?.items || [],
    events: v?.events || [],
    eventTombstones: v?.eventTombstones || [],
});

const legacyJsonText = JSON.stringify({
    version: 3,
    items: [{id: "it-1", name: "早起打卡", archived: false}],
    events: [{id: "ev-1", itemId: "it-1", occurredAt: "2026-10-20T08:00:00.000Z", localDate: "2026-10-20", value: 1, unit: "次", source: "manual"}],
    eventTombstones: [],
});

const legacyPreflight = envelope.preflightUnifiedBackup(legacyJsonText, {
    normalizeStore: dummyNormalize,
    preflightLegacy: exporter.preflightJsonRecovery,
});

assert.equal(legacyPreflight.format, "legacy-store", "旧版格式必须识别为 legacy-store");
assert.equal(legacyPreflight.envelopeVersion, 0, "旧版 envelopeVersion 标记为 0");
assert.equal(legacyPreflight.validationErrors.length, 0, "合法的旧版备份验证错误应为空");
assert.ok(legacyPreflight.mainStoreReport, "必须生成主档迁移报告");
assert.equal(legacyPreflight.mainStoreReport.summary.itemCount, 1);
assert.equal(legacyPreflight.mainStoreReport.summary.eventCount, 1);
assert.equal(legacyPreflight.bucketPlans.length, 1, "旧版备份仅规划主档 checkin-store");
assert.equal(legacyPreflight.bucketPlans[0].key, "checkin-store");
assert.equal(legacyPreflight.bucketPlans[0].resolution, "overwrite");
assert.ok(legacyPreflight.legacyWarning, "必须生成旧版单主档警告文案");
assert.match(legacyPreflight.legacyWarning, /不包含模板、问卷、偏好等独立存储桶/, "警告文案必须如实披露未包含独立存储桶");
assert.equal(legacyPreflight.requiresReview, true, "旧版备份必须要求用户复核");

/* ---------------------------------------------------------
   四、版本化多桶 Envelope 预检与逐桶规划测试
   --------------------------------------------------------- */

const sampleEnvelope = envelope.buildBackupEnvelope({
    pluginVersion: "18.18.0",
    exportedAt: 1_729_400_000_000,
    buckets: {
        "checkin-store": {
            data: {
                version: 3,
                items: [{id: "it-env", name: "阅读", archived: false}],
                events: [{id: "ev-env", itemId: "it-env", occurredAt: "2026-10-20T10:00:00.000Z", localDate: "2026-10-20", value: 30, unit: "分钟", source: "manual"}],
                eventTombstones: [],
            },
            storageKey: "checkin-store",
            category: "main-store",
        },
        "checkin-templates": {
            data: [{id: "tpl-1", name: "每日冥想", kind: "duration", target: 15, unit: "分钟"}],
            storageKey: "checkin-user-templates",
            category: "mutation",
        },
        "checkin-custom-icon-library": {
            data: ["icon-meditation", "icon-book"],
            storageKey: "checkin-custom-icon-library",
            category: "mutation",
        },
        "checkin-audit": {
            data: null,
            storageKey: "checkin-store-audit",
            category: "append",
            masked: true,
        },
    },
});

const envelopePreflight = envelope.preflightUnifiedBackup(JSON.stringify(sampleEnvelope), {
    normalizeStore: dummyNormalize,
    preflightLegacy: exporter.preflightJsonRecovery,
});

assert.equal(envelopePreflight.format, "envelope", "多桶格式必须识别为 envelope");
assert.equal(envelopePreflight.envelopeVersion, 1, "envelopeVersion 必须为 1");
assert.equal(envelopePreflight.pluginVersion, "18.18.0");
assert.equal(envelopePreflight.exportedAt, 1_729_400_000_000);
assert.equal(envelopePreflight.validationErrors.length, 0, "有效多桶备份验证错误应为空");
assert.ok(envelopePreflight.mainStoreReport, "主档迁移报告应生成");
assert.equal(envelopePreflight.mainStoreReport.summary.itemCount, 1);

// 验证逐桶规划
const mainPlan = envelopePreflight.bucketPlans.find((b) => b.key === "checkin-store");
assert.ok(mainPlan);
assert.equal(mainPlan.present, true);
assert.equal(mainPlan.resolution, "overwrite");

const tplPlan = envelopePreflight.bucketPlans.find((b) => b.key === "checkin-templates");
assert.ok(tplPlan);
assert.equal(tplPlan.present, true);
assert.equal(tplPlan.resolution, "overwrite"); // mutation 默认 overwrite

const auditPlan = envelopePreflight.bucketPlans.find((b) => b.key === "checkin-audit");
assert.ok(auditPlan);
assert.equal(auditPlan.masked, true);
assert.equal(auditPlan.resolution, "skip", "敏感遮罩桶必须默认 skip");

const unincludedPlan = envelopePreflight.bucketPlans.find((b) => b.key === "checkin-view-preferences");
assert.ok(unincludedPlan);
assert.equal(unincludedPlan.present, false, "未包含桶 present 应为 false");
assert.equal(unincludedPlan.resolution, "skip", "未包含桶 resolution 应为 skip");
assert.match(unincludedPlan.description, /未包含在备份中/);

/* ---------------------------------------------------------
   五、全量多桶备份构建器测试（createBackupEnvelopeFromBuckets）
   --------------------------------------------------------- */

const builtFullEnvelope = envelope.createBackupEnvelopeFromBuckets({
    pluginVersion: "18.18.0",
    store: {items: [{id: "1"}], events: []},
    viewPreferences: {appearance: "dark"},
    userTemplates: [{id: "t1"}],
    customIconLibrary: ["star"],
    journalData: {templates: [], integration: {}},
    occasionStore: {occasions: []},
    auditEntries: [{type: "test"}],
    includeSensitive: false, // 默认不包含敏感审计
});

assert.equal(builtFullEnvelope.envelopeVersion, 1);
assert.equal(builtFullEnvelope.pluginVersion, "18.18.0");
assert.ok(builtFullEnvelope.buckets["checkin-store"].data);
assert.equal(builtFullEnvelope.buckets["checkin-store"].category, "main-store");
assert.ok(builtFullEnvelope.buckets["checkin-view-preferences"].data);
assert.ok(builtFullEnvelope.buckets["checkin-templates"].data);
assert.ok(builtFullEnvelope.buckets["checkin-custom-icon-library"].data);
assert.ok(builtFullEnvelope.buckets["checkin-journal-data"].data);
assert.ok(builtFullEnvelope.buckets["checkin-occasion-store"].data);

// 敏感桶未勾选敏感导出时必须遮罩
const maskedAudit = builtFullEnvelope.buckets["checkin-audit"];
assert.ok(maskedAudit);
assert.equal(maskedAudit.masked, true);
assert.equal(maskedAudit.data, null);

// 若显式勾选 includeSensitive
const sensitiveEnvelope = envelope.createBackupEnvelopeFromBuckets({
    pluginVersion: "18.18.0",
    store: {items: []},
    auditEntries: [{type: "audit-entry-1"}],
    includeSensitive: true,
});
assert.equal(sensitiveEnvelope.buckets["checkin-audit"].masked, false);
assert.deepEqual(sensitiveEnvelope.buckets["checkin-audit"].data, [{type: "audit-entry-1"}]);

/* ---------------------------------------------------------
   六、未来非法版本拒绝测试
   --------------------------------------------------------- */

const futureVersionEnvelope = {
    envelopeVersion: 99,
    pluginVersion: "99.0.0",
    buckets: {},
};
assert.throws(
    () => envelope.preflightUnifiedBackup(JSON.stringify(futureVersionEnvelope), {normalizeStore: dummyNormalize}),
    /备份格式无效或不受支持的备份版本/,
    "未来未知版本必须被严格拒绝"
);

console.log("backup-migration-flow: all assertions passed successfully.");
