/* T-1430 · R-A10 本地隐私与控制中心——敏感字段审计与来源断开保留规则（纯函数面）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-A10）：
   - 不新增遥测、不读取第三方私有存储；控制面只做「可见性」与「披露」，
     不替用户决定隐私取舍；
   - 来源断开不删除已经确认落盘的事实事件：断开只停止采集，已写入事件与
     幂等身份全部保留（重连后经 externalRef 防重复累计）；
   - 导出前敏感字段审计：备注/图片附件/头像照片属于用户敏感内容，导出时
     必须向用户披露包含多少，由用户决定是否继续分享该文件；
   - 零依赖、无时钟、确定性；写操作全部走既有偏好归一化与安全下载通道。 */

export interface ExportSensitiveAudit {
    /** 非空备注的事件数。 */
    notes: number;
    /** 带图片附件的事件数。 */
    attachments: number;
    /** 使用照片头像的项目数（0 或 1：全局单头像）。 */
    avatarImages: number;
    /** 带外部幂等身份的事件数（声明来源可追溯，不属隐私泄漏）。 */
    externalRefs: number;
}

/** 导出前敏感字段审计：扫描待导出的 store 切片，统计用户敏感内容的量级。
    附件图片按事件计数（data URL 不复制内容，只报数量）；头像照片是全局
    偏好而非项目字段，由调用方以 avatarImages 显式传入计数。 */
export function auditExportSensitiveFields(
    store: {events?: readonly {note?: string; attachment?: string; externalRef?: string}[]},
    avatarImages = 0,
): ExportSensitiveAudit {
    const events = Array.isArray(store.events) ? store.events : [];
    let notes = 0;
    let attachments = 0;
    let externalRefs = 0;
    for (const event of events) {
        if (typeof event.note === "string" && event.note.trim()) notes += 1;
        if (typeof event.attachment === "string" && event.attachment) attachments += 1;
        if (typeof event.externalRef === "string" && event.externalRef) externalRefs += 1;
    }
    return {notes, attachments, avatarImages: avatarImages > 0 ? 1 : 0, externalRefs};
}

/** 敏感内容是否存在（零值时不打扰用户）。 */
export function hasSensitiveContent(audit: ExportSensitiveAudit): boolean {
    return audit.notes > 0 || audit.attachments > 0 || audit.avatarImages > 0;
}

export interface SourceDisconnectPlan {
    source: string;
    /** 断开后保留的已落盘事件数（永不删除）。 */
    retainedEvents: number;
    /** 其中带幂等身份的事件数（重连防重复累计）。 */
    retainedIdentities: number;
    /** 重连后的防重复口径。 */
    reconnectIdempotency: "externalRef" | "none";
}

/** 来源断开保留规则：断开 = 停止采集，事实事件与幂等身份全部保留。
    source 按事件上的 source 字段匹配（sireader/siplayer/health/import…）。 */
export function planSourceDisconnect(source: string, events: readonly {source?: string; externalRef?: string}[]): SourceDisconnectPlan {
    let retainedEvents = 0;
    let retainedIdentities = 0;
    for (const event of events) {
        if (event.source !== source) continue;
        retainedEvents += 1;
        if (typeof event.externalRef === "string" && event.externalRef) retainedIdentities += 1;
    }
    return {
        source,
        retainedEvents,
        retainedIdentities,
        reconnectIdempotency: retainedIdentities > 0 ? "externalRef" : "none",
    };
}

export interface PrivacyControlPlaneEntry {
    channel: string;
    kind: "doc-write" | "external-source";
    enabled: boolean;
    /** 文档写入目标（docId）；外部来源无此字段。 */
    target?: string;
}

export interface PrivacyControlPlaneSummary {
    entries: readonly PrivacyControlPlaneEntry[];
    /** 本插件零遥测：常量声明，永不变化。 */
    telemetry: "none";
}

/** 控制面汇总：把分散在偏好里的联动开关聚合为一张可读清单。
    入参为偏好切片（缺省字段安全回落为关闭）。 */
export function summarizePrivacyControlPlane(preferences: {
    diaryReport?: {enabled?: boolean; docId?: string};
    summaryResident?: {enabled?: boolean; docId?: string};
    sireaderIntegration?: {enabled?: boolean};
    siplayerIntegration?: {enabled?: boolean};
    healthInbox?: {enabled?: boolean};
    wereadIntegration?: {enabled?: boolean};
    yeguifIntegration?: {enabled?: boolean};
}): PrivacyControlPlaneSummary {
    const source = preferences || {};
    const docWrite = (channel: string, state?: {enabled?: boolean; docId?: string}): PrivacyControlPlaneEntry => ({
        channel,
        kind: "doc-write",
        enabled: state?.enabled === true,
        ...(state?.docId ? {target: state.docId} : {}),
    });
    const external = (sourceName: string, state?: {enabled?: boolean}): PrivacyControlPlaneEntry => ({
        channel: sourceName,
        kind: "external-source",
        enabled: state?.enabled === true,
    });
    return {
        entries: [
            docWrite("diary-report", source.diaryReport),
            docWrite("summary-resident", source.summaryResident),
            external("sireader", source.sireaderIntegration),
            external("siplayer", source.siplayerIntegration),
            external("health", source.healthInbox),
            external("weread", source.wereadIntegration),
            external("yeguif", source.yeguifIntegration),
        ],
        telemetry: "none",
    };
}
