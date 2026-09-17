import type {CheckinKind} from "./types";

/** Normalize a persisted quick-record amount without applying a kind default. */
export function normalizeRecordStep(kind: CheckinKind, value: unknown): number | undefined {
    if (kind === "binary") return undefined;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    return Math.min(1_000_000_000, Math.round(numeric * 100) / 100);
}

/** Input granularity for quick actions; targets intentionally use coarser steps. */
export function getRecordStepInputStep(kind: CheckinKind, unit: string): number {
    if (kind === "count") return 1;
    void unit;
    return 0.01;
}
