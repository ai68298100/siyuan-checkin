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

export type BackupRecoveryFormat = "envelope" | "legacy-store";

export interface BackupBucketPlanSummary {
    key: string;
    category: BackupBucketCategory;
    resolution: BackupResolutionMode;
    masked: boolean;
    present: boolean;
    storageKey: string;
    description: string;
}

/** 识别输入备份内容属于版本化 Envelope、旧版单主档还是非法数据 */
export function classifyBackupPayload(raw: unknown): "envelope" | "legacy-store" | "invalid" {
    if (!raw || typeof raw !== "object") return "invalid";
    const candidate = raw as Record<string, unknown>;
    if (candidate.envelopeVersion !== undefined) {
        return candidate.envelopeVersion === 1 && candidate.buckets && typeof candidate.buckets === "object"
            ? "envelope"
            : "invalid";
    }
    if (Array.isArray(candidate.items) || Array.isArray(candidate.events) || candidate.version !== undefined) {
        return "legacy-store";
    }
    return "invalid";
}

/** 针对版本化 Envelope 生成逐桶规划与可展示的迁移摘要 */
export function planBackupEnvelopeImport(
    envelope: BackupEnvelope,
    options?: {decisions?: Record<string, BackupResolutionMode>}
): {plan: BackupImportPlan; summaries: BackupBucketPlanSummary[]} {
    const decisions: Record<string, BackupResolutionMode> = {};
    const rollbackSnapshots: Record<string, unknown | null> = {};
    const summaries: BackupBucketPlanSummary[] = [];

    const bucketKeys = new Set([
        ...DEFAULT_BACKUP_BUCKETS.map((d) => d.key),
        ...Object.keys(envelope.buckets || {}),
    ]);

    for (const key of bucketKeys) {
        const descriptor = DEFAULT_BACKUP_BUCKETS.find((d) => d.key === key);
        const payload = envelope.buckets?.[key];
        const category = payload?.category || descriptor?.category || "overwrite";
        const storageKey = payload?.storageKey || descriptor?.key || key;
        const masked = Boolean(payload?.masked || (payload && payload.data === null));
        const present = Boolean(payload && payload.data !== null && payload.data !== undefined);

        const defaultRes = defaultResolutionForCategory(category);
        const chosen = options?.decisions?.[key] || (masked ? "skip" : present ? defaultRes : "skip");
        decisions[key] = chosen;
        rollbackSnapshots[key] = null;

        let description = "";
        if (!present) {
            description = "未包含在备份中，保持现有数据";
        } else if (masked) {
            description = "敏感数据已遮罩，跳过恢复";
        } else {
            const modeLabel = chosen === "overwrite" ? "覆盖现有" : chosen === "merge" ? "增量合并" : "跳过";
            description = `${modeLabel}（分类: ${category}）`;
        }

        summaries.push({
            key,
            category,
            resolution: chosen,
            masked,
            present,
            storageKey,
            description,
        });
    }

    return {
        plan: {
            envelopeVersion: envelope.envelopeVersion,
            decisions,
            rollbackSnapshots,
        },
        summaries,
    };
}

/** T-1787 从活动状态构建版本化全量备份 Envelope，主档强包含，敏感桶默认遮罩 */
export function createBackupEnvelopeFromBuckets(input: {
    pluginVersion: string;
    store: unknown;
    viewPreferences?: unknown;
    userTemplates?: unknown;
    customIconLibrary?: unknown;
    journalData?: unknown;
    occasionStore?: unknown;
    auditEntries?: unknown;
    includeSensitive?: boolean;
}): BackupEnvelope {
    const buckets: Record<string, BackupBucketPayload> = {
        "checkin-store": {
            data: input.store,
            storageKey: "checkin-store",
            category: "main-store",
            masked: false,
        },
    };

    if (input.viewPreferences !== undefined) {
        buckets["checkin-view-preferences"] = {
            data: input.viewPreferences,
            storageKey: "checkin-view-preferences",
            category: "overwrite",
            masked: false,
        };
    }
    if (input.userTemplates !== undefined) {
        buckets["checkin-templates"] = {
            data: input.userTemplates,
            storageKey: "checkin-user-templates",
            category: "mutation",
            masked: false,
        };
    }
    if (input.customIconLibrary !== undefined) {
        buckets["checkin-custom-icon-library"] = {
            data: input.customIconLibrary,
            storageKey: "checkin-custom-icon-library",
            category: "mutation",
            masked: false,
        };
    }
    if (input.journalData !== undefined) {
        buckets["checkin-journal-data"] = {
            data: input.journalData,
            storageKey: "checkin-journal-data",
            category: "mutation",
            masked: false,
        };
    }
    if (input.occasionStore !== undefined) {
        buckets["checkin-occasion-store"] = {
            data: input.occasionStore,
            storageKey: "checkin-occasions",
            category: "mutation",
            masked: false,
        };
    }
    if (input.includeSensitive && input.auditEntries !== undefined) {
        buckets["checkin-audit"] = {
            data: input.auditEntries,
            storageKey: "checkin-store-audit",
            category: "append",
            masked: false,
        };
    } else {
        buckets["checkin-audit"] = {
            data: null,
            storageKey: "checkin-store-audit",
            category: "append",
            masked: true,
        };
    }

    return buildBackupEnvelope({
        pluginVersion: input.pluginVersion,
        exportedAt: Date.now(),
        buckets,
    });
}

export interface UnifiedBackupPreflight {
    format: BackupRecoveryFormat;
    envelopeVersion: number;
    pluginVersion: string;
    exportedAt?: number;
    rawEnvelope?: BackupEnvelope;
    mainStoreReport?: any;
    bucketPlans: BackupBucketPlanSummary[];
    validationErrors: string[];
    requiresReview: boolean;
    reviewReasons: string[];
    legacyWarning?: string;
}

export interface UnifiedBackupPreflightHandlers {
    normalizeStore: (value: unknown) => any;
    summarizeStore?: (store: any) => any;
    preflightLegacy?: (text: string, normalize: (v: unknown) => any, before?: any) => any;
}

/**
 * T-1787 统一预检：支持旧版单主档 JSON 备份与版本化多桶 BackupEnvelope。
 * 精准识别版本，对旧版单主档如实披露丢失的独立配置桶，对多桶 Envelope 提供逐桶覆盖/合并/跳过规划。
 */
export function preflightUnifiedBackup(
    text: string,
    handlers: UnifiedBackupPreflightHandlers,
    beforeSummary?: any
): UnifiedBackupPreflight {
    if (typeof text !== "string") throw new Error("备份内容不是文本");
    if (text.length > 8 * 1024 * 1024) throw new Error("备份文件超过 8 MiB 上限");

    let parsed: unknown;
    try {
        parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
    } catch {
        throw new Error("备份 JSON 无法解析");
    }

    const kind = classifyBackupPayload(parsed);
    if (kind === "invalid") {
        throw new Error("备份格式无效或不受支持的备份版本");
    }

    if (kind === "legacy-store") {
        const legacyPreflight = handlers.preflightLegacy
            ? handlers.preflightLegacy(text, handlers.normalizeStore, beforeSummary)
            : {report: {summary: {itemCount: (parsed as any).items?.length || 0, eventCount: (parsed as any).events?.length || 0}, store: handlers.normalizeStore(parsed), warnings: []}, assessment: {requiresReview: true, reasons: []}, validationErrors: []};

        const bucketPlans: BackupBucketPlanSummary[] = [{
            key: "checkin-store",
            category: "main-store",
            resolution: "overwrite",
            masked: false,
            present: true,
            storageKey: "checkin-store",
            description: "旧版单主档覆盖（包含打卡项目与事实记录）",
        }];
        const legacyWarning = "检测到旧版单主档备份：仅包含打卡项目与记录，不包含模板、问卷、偏好等独立存储桶。导入后现有独立存储桶保持原样。";
        return {
            format: "legacy-store",
            envelopeVersion: 0,
            pluginVersion: "legacy",
            mainStoreReport: legacyPreflight.report,
            bucketPlans,
            validationErrors: legacyPreflight.validationErrors || [],
            requiresReview: true,
            reviewReasons: [legacyWarning, ...(legacyPreflight.assessment?.reasons || [])],
            legacyWarning,
        };
    }

    // kind === "envelope"
    const envelope = parseBackupEnvelope(parsed);
    if (!envelope) {
        throw new Error("无法解析版本化备份 Envelope");
    }

    const {summaries} = planBackupEnvelopeImport(envelope);
    const mainStorePayload = envelope.buckets?.["checkin-store"];
    let mainStoreReport: any;
    const validationErrors: string[] = [];

    if (mainStorePayload && mainStorePayload.data) {
        try {
            if (handlers.preflightLegacy) {
                const legacyResult = handlers.preflightLegacy(JSON.stringify(mainStorePayload.data), handlers.normalizeStore, beforeSummary);
                mainStoreReport = legacyResult.report;
                if (legacyResult.validationErrors?.length) {
                    validationErrors.push(...legacyResult.validationErrors);
                }
            } else {
                mainStoreReport = {store: handlers.normalizeStore(mainStorePayload.data), summary: {itemCount: (mainStorePayload.data as any).items?.length || 0, eventCount: (mainStorePayload.data as any).events?.length || 0}, warnings: []};
            }
        } catch (err) {
            validationErrors.push("主档数据格式损坏或无法解析: " + (err instanceof Error ? err.message : String(err)));
        }
    }

    const reviewReasons: string[] = [];
    if (mainStoreReport && mainStoreReport.warnings?.length) {
        reviewReasons.push(...mainStoreReport.warnings);
    }
    summaries.forEach((s) => {
        if (s.present && s.resolution === "overwrite" && s.key !== "checkin-store") {
            reviewReasons.push(`将覆盖现有 [${s.key}] 存储桶数据`);
        }
    });

    return {
        format: "envelope",
        envelopeVersion: envelope.envelopeVersion,
        pluginVersion: envelope.pluginVersion,
        exportedAt: envelope.exportedAt,
        rawEnvelope: envelope,
        mainStoreReport,
        bucketPlans: summaries,
        validationErrors,
        requiresReview: reviewReasons.length > 0,
        reviewReasons,
    };
}



