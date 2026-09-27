export type DocumentSourceKey = "health" | "notequery" | "yeguif";

/** Session-only counters. No document text, values, credentials or external identities. */
export interface SourceIngestReport {
    mode: "preview" | "ingest";
    outcome: "ok" | "read-failed" | "write-failed" | "not-configured";
    scanned: number;
    matched: number;
    unmatched: number;
    planned: number;
    written: number;
    duplicate: number;
    tombstoned: number;
    manualConflict: number;
    invalid: number;
    blocked: number;
    /** T-1509：可重试存储失败条数（已入持久待处理箱），与配置拒绝（blocked）区分。 */
    storageRetryable: number;
    /** A full bounded page may have more rows; it is not proof of truncation. */
    windowFull: boolean;
}

export function createSourceIngestReport(mode: SourceIngestReport["mode"]): SourceIngestReport {
    return {mode, outcome: "ok", scanned: 0, matched: 0, unmatched: 0, planned: 0, written: 0,
        duplicate: 0, tombstoned: 0, manualConflict: 0, invalid: 0, blocked: 0, storageRetryable: 0, windowFull: false};
}
