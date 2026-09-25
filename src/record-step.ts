import type {CheckinKind} from "./types";

/** Normalize a persisted quick-record amount without applying a kind default. */
export function normalizeRecordStep(kind: CheckinKind, value: unknown): number | undefined {
    if (kind === "binary") return undefined;
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
    return Math.min(1_000_000_000, Math.round(numeric * 100) / 100);
}

/** T-1462 数值快捷增量（R-A14）：数值/时长项目的附加快捷步长集合。
    接受数组或「逗号/空白分隔」字符串；仅保留正数（2 位小数精度，≤1e6），
    升序去重、上限 4 个；binary 项目与非法输入一律返回空数组（不物化）。 */
export function normalizeQuickSteps(kind: CheckinKind, value: unknown): number[] {
    if (kind === "binary") return [];
    const entries = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? value.split(/[,，\s]+/).filter(Boolean)
            : [];
    const seen = new Set<string>();
    const steps: number[] = [];
    for (const entry of entries) {
        const numeric = typeof entry === "number" ? entry : Number(String(entry).trim());
        if (!Number.isFinite(numeric) || numeric <= 0) continue;
        const rounded = Math.round(numeric * 100) / 100;
        /* 超上限直接拒绝（不静默钳到 1e6——改值会让按钮记录量与用户输入不一致）。 */
        if (rounded <= 0 || rounded > 1_000_000) continue;
        const key = String(rounded);
        if (seen.has(key)) continue;
        seen.add(key);
        steps.push(rounded);
        if (steps.length >= 4) break;
    }
    return steps.sort((left, right) => left - right);
}

/** Input granularity for quick actions; targets intentionally use coarser steps. */
export function getRecordStepInputStep(kind: CheckinKind, unit: string): number {
    if (kind === "count") return 1;
    void unit;
    return 0.01;
}
