/* 20.0 T-1361 机器可读诊断：失败路径输出结构化原因码（纯数据，无 IO）。
   - 普通界面消费 label/recovery i18n 键给恢复操作；
   - 智能体经公开 API getDiagnostics() 读结构化码，只解释原因与建议顺序（AI 规划 D 块）；
   - 会话态环形容量 20，不落盘——持久事件已由审计台账（type=conflict/migration/anchor）记录。
   锁语义注记：Web Locks 无超时设计（避免长事务被截断），竞争信号以 lock-contended 记录。 */

export type CheckinDiagnosticCode = "save-failed" | "load-failed" | "version-conflict" | "migration-rejected" | "lock-contended";

export interface CheckinDiagnostic {
    code: CheckinDiagnosticCode;
    at: string;
    /** 可选细节（≤200 字符；不携带用户笔记等隐私内容）。 */
    detail?: string;
}

export const CHECKIN_DIAGNOSTIC_CODES: readonly CheckinDiagnosticCode[] = ["save-failed", "load-failed", "version-conflict", "migration-rejected", "lock-contended"];

export const CHECKIN_DIAGNOSTIC_LIMIT = 20;

export interface CheckinDiagnosticInfo {
    /** true = 用户可自行恢复；false = 需要带着诊断导出求助。 */
    recoverable: boolean;
    labelKey: string;
    recoveryKey: string;
}

export const CHECKIN_DIAGNOSTIC_INFO: Readonly<Record<CheckinDiagnosticCode, CheckinDiagnosticInfo>> = Object.freeze({
    "save-failed": {recoverable: true, labelKey: "diag.saveFailed", recoveryKey: "diag.saveFailedRecovery"},
    "load-failed": {recoverable: false, labelKey: "diag.loadFailed", recoveryKey: "diag.loadFailedRecovery"},
    "version-conflict": {recoverable: true, labelKey: "diag.versionConflict", recoveryKey: "diag.versionConflictRecovery"},
    "migration-rejected": {recoverable: true, labelKey: "diag.migrationRejected", recoveryKey: "diag.migrationRejectedRecovery"},
    "lock-contended": {recoverable: true, labelKey: "diag.lockContended", recoveryKey: "diag.lockContendedRecovery"},
});

export function isCheckinDiagnosticCode(value: unknown): value is CheckinDiagnosticCode {
    return typeof value === "string" && (CHECKIN_DIAGNOSTIC_CODES as readonly string[]).includes(value);
}

/** 追加一条诊断；连续同码去重（同一故障只记一次，不刷屏），环形容量上限。 */
export function appendDiagnostic(entries: readonly CheckinDiagnostic[], entry: CheckinDiagnostic, limit = CHECKIN_DIAGNOSTIC_LIMIT): CheckinDiagnostic[] {
    const last = entries[entries.length - 1];
    if (last && last.code === entry.code && last.detail === entry.detail) return [...entries];
    return [...entries, entry].slice(-limit);
}

export function normalizeDiagnostics(value: unknown, limit = CHECKIN_DIAGNOSTIC_LIMIT): CheckinDiagnostic[] {
    if (!Array.isArray(value)) return [];
    const safeLimit = Math.max(1, Math.min(CHECKIN_DIAGNOSTIC_LIMIT, Math.floor(limit)));
    return value.filter((entry): entry is CheckinDiagnostic => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<CheckinDiagnostic>;
        return isCheckinDiagnosticCode(candidate.code) && typeof candidate.at === "string" && !Number.isNaN(Date.parse(candidate.at)) && (candidate.detail === undefined || (typeof candidate.detail === "string" && candidate.detail.length <= 200));
    }).map((entry) => ({code: entry.code, at: entry.at, ...(entry.detail ? {detail: entry.detail.slice(0, 200)} : {})})).slice(-safeLimit);
}

const DIAGNOSTICS_EXPORT_VERSION = 1;

export function serializeDiagnostics(entries: readonly CheckinDiagnostic[], exportedAt = new Date().toISOString()): string {
    return JSON.stringify({version: DIAGNOSTICS_EXPORT_VERSION, exportedAt, diagnostics: normalizeDiagnostics(entries)});
}

export function parseDiagnostics(value: string): CheckinDiagnostic[] {
    try {
        const parsed = JSON.parse(value);
        return parsed?.version === DIAGNOSTICS_EXPORT_VERSION ? normalizeDiagnostics(parsed.diagnostics) : [];
    } catch {
        return [];
    }
}
