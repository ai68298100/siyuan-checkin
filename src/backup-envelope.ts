/* T-1862 版本化多桶备份 envelope（D-515）
   将主档 + 全部辅助桶打包为可逐桶预览、覆盖/合并/跳过/回滚的版本化快照。 */

export type BackupResolutionMode = "overwrite" | "merge" | "skip";

export interface BackupEnvelope {
    /** Envelope 协议版本号，用于未来不兼容变更识别。 */
    envelopeVersion: 1;
    /** 插件代码版本（来自 package.json），用于迁移决策。 */
    pluginVersion: string;
    /** 导出时间戳（毫秒 epoch）。 */
    exportedAt: number;
    /** 被包含的桶列表及其载荷；敏感桶载荷可能为 null（遮罩）或完整对象。 */
    buckets: Record<string, BackupBucketPayload>;
}

export interface BackupBucketPayload {
    /** 桶原始数据；遮罩桶为 null 以与 JSON 缺键区分。 */
    data: unknown | null;
    /** 原始存储键（与 buckets 对象键同名，冗余但便于日志/导入提示）。 */
    storageKey: string;
    /** 桶分类，决定导入时的默认合并策略（D-514）。 */
    category: BackupBucketCategory;
    /** 若为 true，表示敏感桶载荷已被遮罩；导入时该桶必须显式 opt-in。 */
    masked?: boolean;
}

export type BackupBucketCategory = "main-store" | "append" | "overwrite" | "mutation";

export interface BackupBucketDescriptor {
    /** 桶在 envelope 中的键；与 storage key 通常相同。 */
    key: string;
    /** 桶分类（D-514）。 */
    category: BackupBucketCategory;
    /** 是否敏感（默认遮罩，导入需显式 opt-in）。 */
    sensitive?: boolean;
    /** 默认是否包含（主档默认包含；辅助桶默认 false，用户勾勾选上）。 */
    defaultIncluded: boolean;
}

export interface BackupExportInput {
    pluginVersion: string;
    exportedAt?: number;
    buckets: Record<string, BackupBucketPayload>;
}

export interface BackupImportPlan {
    /** envelope 版本校验已通过；否则整个导入拒绝继续。 */
    envelopeVersion: number;
    /** 逐桶决策（overwrite / merge / skip）。 */
    decisions: Record<string, BackupResolutionMode>;
    /** 逐桶导入前快照，用于整体回滚；跳过桶的快照为 null。 */
    rollbackSnapshots: Record<string, unknown | null>;
}

export interface BackupImportResult {
    /** 成功导入的桶数。 */
    applied: string[];
    /** 显式跳过的桶数。 */
    skipped: string[];
    /** 逐桶错误；任一失败应触发整体回滚。 */
    failed: {bucketKey: string; reason: string}[];
}

/** T-1862 默认桶注册表：主档强包含；辅助桶默认不包含，敏感桶默认遮罩。 */
export const DEFAULT_BACKUP_BUCKETS: readonly BackupBucketDescriptor[] = [
    {key: "checkin-store", category: "main-store", defaultIncluded: true},
    {key: "checkin-view-preferences", category: "overwrite", defaultIncluded: false},
    {key: "checkin-templates", category: "mutation", defaultIncluded: false},
    {key: "checkin-custom-icon-library", category: "mutation", defaultIncluded: false},
    {key: "checkin-journal-data", category: "mutation", defaultIncluded: false},
    {key: "checkin-audit", category: "append", defaultIncluded: false, sensitive: true},
    {key: "checkin-focus-diagnostics", category: "append", defaultIncluded: false, sensitive: true},
    {key: "checkin-reminder-actions", category: "overwrite", defaultIncluded: false, sensitive: true},
    {key: "checkin-suggestion-workflow", category: "mutation", defaultIncluded: false},
    {key: "checkin-reminder-delivery", category: "append", defaultIncluded: false, sensitive: true},
    {key: "agent-analysis-cache", category: "append", defaultIncluded: false, sensitive: true},
    {key: "checkin-occasion-store", category: "mutation", defaultIncluded: false},
];

export function buildBackupEnvelope(input: BackupExportInput): BackupEnvelope {
    return {
        envelopeVersion: 1,
        pluginVersion: input.pluginVersion,
        exportedAt: input.exportedAt ?? Date.now(),
        buckets: input.buckets,
    };
}

export function parseBackupEnvelope(raw: unknown): BackupEnvelope | null {
    if (!raw || typeof raw !== "object") return null;
    const v = (raw as BackupEnvelope).envelopeVersion;
    if (v !== 1) return null;
    const buckets = (raw as BackupEnvelope).buckets;
    if (!buckets || typeof buckets !== "object") return null;
    return raw as BackupEnvelope;
}

/** 依据 D-514 桶分类给出默认导入决策（merge 用于追加型，overwrite 用于覆盖/增删改）。 */
export function defaultResolutionForCategory(category: BackupBucketCategory): BackupResolutionMode {
    switch (category) {
        case "append":
            return "merge";
        case "overwrite":
        case "mutation":
        case "main-store":
        default:
            return "overwrite";
    }
}
