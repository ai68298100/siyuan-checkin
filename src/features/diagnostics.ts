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
const CHECKIN_DIAGNOSTIC_DETAIL_MAX_CODE_POINTS = 200;
const CHECKIN_DIAGNOSTIC_INPUT_MAX_CODE_POINTS = 2000;
const CHECKIN_DIAGNOSTICS_EXPORT_MAX_CHARS = 1024 * 1024;

function boundedDiagnosticText(value: string, maxCodePoints: number): string {
    /* Bound UTF-16 work before spreading so a hostile exception string cannot
       force an unbounded scan; remove a dangling high surrogate at the edge. */
    let prefix = value.slice(0, Math.max(1, maxCodePoints * 2));
    if (/[\uD800-\uDBFF]$/.test(prefix)) prefix = prefix.slice(0, -1);
    return [...prefix].slice(0, maxCodePoints).join("");
}

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

/** Keep diagnostics useful while removing the most common credential/path leaks.
 * This is intentionally a small, deterministic boundary rather than a claim of
 * complete anonymization: callers still need to review an export before sharing. */
export function sanitizeDiagnosticDetail(value: string): string {
    const boundedInput = boundedDiagnosticText(value, CHECKIN_DIAGNOSTIC_INPUT_MAX_CODE_POINTS);
    const sanitized = boundedInput
        .replace(/\b(?:authorization\s*[:=]\s*(?:token|bearer)\s+|bearer\s+)[^\s,;]+/gi, (match) => match.replace(/[^\s:]+$/, "<redacted>"))
        .replace(/\b(?:access[_-]?auth[_-]?code|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|apikey|secret[_-]?key|secret|password|passwd|token|nonce|private[_-]?key|client[_-]?secret)\s*[:=]\s*["']?[^\s,;"']+/gi, (match) => match.replace(/([:=]\s*["']?)[^\s,;"']+$/, "$1<redacted>"))
        .replace(/(?:[A-Za-z]:[\\/]|\\\\[A-Za-z0-9._-]+[\\/]|\bfile:\/\/|\/(?:Users|home|private\/var|var\/folders|Volumes|data|tmp|mnt)\/)[^\r\n"'<>]*/gi, "<path>")
        .trim();
    return boundedDiagnosticText(sanitized, CHECKIN_DIAGNOSTIC_DETAIL_MAX_CODE_POINTS);
}

/** 追加一条诊断；连续同码去重（同一故障只记一次，不刷屏），环形容量上限。 */
export function appendDiagnostic(entries: readonly CheckinDiagnostic[], entry: CheckinDiagnostic, limit = CHECKIN_DIAGNOSTIC_LIMIT): CheckinDiagnostic[] {
    const safeEntry = {...entry, ...(entry.detail ? {detail: sanitizeDiagnosticDetail(entry.detail)} : {})};
    const last = entries[entries.length - 1];
    if (last && last.code === safeEntry.code && last.detail === safeEntry.detail) return [...entries];
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(CHECKIN_DIAGNOSTIC_LIMIT, Math.floor(limit))) : CHECKIN_DIAGNOSTIC_LIMIT;
    return [...entries, safeEntry].slice(-safeLimit);
}

export function normalizeDiagnostics(value: unknown, limit = CHECKIN_DIAGNOSTIC_LIMIT): CheckinDiagnostic[] {
    if (!Array.isArray(value)) return [];
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(CHECKIN_DIAGNOSTIC_LIMIT, Math.floor(limit))) : CHECKIN_DIAGNOSTIC_LIMIT;
    return value.filter((entry): entry is CheckinDiagnostic => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<CheckinDiagnostic>;
        /* sanitizeDiagnosticDetail owns the Unicode-aware length bound.  A
           UTF-16 code-unit check here would reject 200 emoji (400 code units)
           after they were safely bounded, losing a valid diagnostic on import. */
        return isCheckinDiagnosticCode(candidate.code) && typeof candidate.at === "string" && !Number.isNaN(Date.parse(candidate.at)) && (candidate.detail === undefined || typeof candidate.detail === "string");
    }).map((entry) => ({code: entry.code, at: entry.at, ...(entry.detail ? {detail: sanitizeDiagnosticDetail(entry.detail)} : {})})).slice(-safeLimit);
}

const DIAGNOSTICS_EXPORT_VERSION = 1;

/** T-1435 · R-A10 诊断导出预览：导出前披露包内构成——条数、原因码分布（数量降序+码序稳定）、时间范围。
    只读纯函数，不读取时钟（时间来自条目自身）。 */
export interface DiagnosticsCodeCount {
    code: CheckinDiagnosticCode;
    count: number;
}

export interface DiagnosticsPreview {
    count: number;
    codes: readonly DiagnosticsCodeCount[];
    oldestAt?: string;
    latestAt?: string;
    /** Latest bounded, already-sanitized details shown before sharing. */
    details: readonly CheckinDiagnostic[];
}

export function summarizeDiagnosticsPreview(entries: readonly CheckinDiagnostic[]): DiagnosticsPreview {
    const normalized = normalizeDiagnostics(entries);
    const counts = new Map<CheckinDiagnosticCode, number>();
    for (const entry of normalized) counts.set(entry.code, (counts.get(entry.code) || 0) + 1);
    const codes = [...counts.entries()]
        .map(([code, count]) => ({code, count}))
        .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));
    const ats = normalized.map((entry) => entry.at).sort((left, right) => left.localeCompare(right));
    const details = normalized.filter((entry) => Boolean(entry.detail)).slice(-3);
    return {
        count: normalized.length,
        codes,
        ...(ats.length ? {oldestAt: ats[0], latestAt: ats[ats.length - 1]} : {}),
        details,
    };
}

export function serializeDiagnostics(entries: readonly CheckinDiagnostic[], exportedAt = new Date().toISOString()): string {
    const parsedExportedAt = typeof exportedAt === "string" ? Date.parse(exportedAt) : Number.NaN;
    const safeExportedAt = Number.isFinite(parsedExportedAt) ? new Date(parsedExportedAt).toISOString() : new Date().toISOString();
    return JSON.stringify({version: DIAGNOSTICS_EXPORT_VERSION, exportedAt: safeExportedAt, diagnostics: normalizeDiagnostics(entries)});
}

export function parseDiagnostics(value: string): CheckinDiagnostic[] {
    if (typeof value !== "string" || value.length > CHECKIN_DIAGNOSTICS_EXPORT_MAX_CHARS) return [];
    try {
        const parsed = JSON.parse(value);
        return parsed?.version === DIAGNOSTICS_EXPORT_VERSION ? normalizeDiagnostics(parsed.diagnostics) : [];
    } catch {
        return [];
    }
}
