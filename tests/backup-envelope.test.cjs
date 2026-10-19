const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1862 / D-515 版本化多桶备份 envelope 守门测试：
   验证 envelope 协议版本化、默认桶注册表、默认分类决策、遮罩与解析守卫。 */

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src", "backup-envelope.ts"), "utf8");
const ts = require("typescript");
const os = require("node:os");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "backup-envelope-"));
fs.writeFileSync(path.join(outRoot, "backup-envelope.js"), ts.transpileModule(src, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText);
const envelope = require(path.join(outRoot, "backup-envelope.js"));

/* ---------------------------------------------------------
   一、架构静态守门
   --------------------------------------------------------- */

const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(src, /export interface BackupEnvelope/, "backup-envelope.ts 必须导出 BackupEnvelope 接口");
assert.match(src, /export const DEFAULT_BACKUP_BUCKETS/, "必须暴露 DEFAULT_BACKUP_BUCKETS 桶注册表");
assert.match(src, /export type BackupBucketCategory = "main-store" \| "append" \| "overwrite" \| "mutation"/, "桶分类必须与 D-514 对齐");
assert.match(src, /defaultResolutionForCategory/, "必须根据 D-514 分类给出默认导入决策");
assert.match(src, /parseBackupEnvelope/, "必须提供 envelope 版本化解析守卫");

/* ---------------------------------------------------------
   二、运行时行为验证
   --------------------------------------------------------- */

// 1. 默认桶注册表：主档唯一强包含；辅助桶默认不包含；敏感桶遮罩
const descriptors = envelope.DEFAULT_BACKUP_BUCKETS;
const mainStore = descriptors.find((d) => d.key === "checkin-store");
assert.ok(mainStore, "checkin-store 必须在注册表中");
assert.equal(mainStore.category, "main-store");
assert.equal(mainStore.defaultIncluded, true);
const auditBucket = descriptors.find((d) => d.key === "checkin-audit");
assert.ok(auditBucket, "审计桶必须在注册表中");
assert.equal(auditBucket.category, "append");
assert.equal(auditBucket.sensitive, true);
assert.equal(auditBucket.defaultIncluded, false);

// 2. 默认分类决策：追加型=merge；覆盖/增删改=overwrite
assert.equal(envelope.defaultResolutionForCategory("append"), "merge");
assert.equal(envelope.defaultResolutionForCategory("overwrite"), "overwrite");
assert.equal(envelope.defaultResolutionForCategory("mutation"), "overwrite");
assert.equal(envelope.defaultResolutionForCategory("main-store"), "overwrite");

// 3. envelope 构建与解析
const built = envelope.buildBackupEnvelope({
    pluginVersion: "18.18.0",
    exportedAt: 1_729_000_000_000,
    buckets: {"checkin-store": {data: {items: []}, storageKey: "checkin-store", category: "main-store"}},
});
assert.equal(built.envelopeVersion, 1);
assert.equal(built.pluginVersion, "18.18.0");
assert.equal(built.exportedAt, 1_729_000_000_000);

const parsed = envelope.parseBackupEnvelope(built);
assert.ok(parsed, "envelope 应被成功解析");
assert.equal(parsed.envelopeVersion, 1);

// 4. 版本化守卫：unknown 输入拒绝；未来版本号拒绝（当前只接受 1）
assert.equal(envelope.parseBackupEnvelope(null), null);
assert.equal(envelope.parseBackupEnvelope({}), null);
assert.equal(envelope.parseBackupEnvelope({envelopeVersion: 0, buckets: {}}), null);
assert.equal(envelope.parseBackupEnvelope({envelopeVersion: 2, buckets: {a: 1}}), null);

console.log("backup-envelope: all tests passed successfully.");
