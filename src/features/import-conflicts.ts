/* T-1522 数据迁移重名冲突主动选择——纯函数层（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 C，既有 Loop/Obsidian 预览的增量）：
   - 只对「与活跃现有项目同名」的迁移来源生成决策行；新名字面导入不干预；
   - 合入现有仅在类型与单位都兼容时可用；单位/类型不兼容必须明示原因，
     默认回落「跳过」，绝不静默换算单位；
   - 另建的名称确定性派生（「· 导入」后缀 + 序号），不同格式保留各自身份语义；
   - 决策只是计划：确认前由宿主重查目标状态，应用仍在既有事务通道。 */

export interface ImportSourceItem {
    name: string;
    kind: string;
    unit: string;
    dateCount: number;
}

export interface ImportExistingSnapshot {
    id: string;
    name: string;
    kind: string;
    unit: string;
    archived?: boolean;
}

export type ConflictDisposition = "merge" | "createNew" | "skip";

export interface ImportConflictDecision {
    name: string;
    sourceKind: string;
    sourceUnit: string;
    dateCount: number;
    existingId: string;
    existingKind: string;
    existingUnit: string;
    /** 类型与单位都相同才可合入（原始数值可直接叠加）。 */
    mergeCompatible: boolean;
    incompatibility?: "unit" | "kind";
    disposition: ConflictDisposition;
    /** 另建时的确定性新名称（保证与现有项目不重名）。 */
    createNewName: string;
}

export function resolveImportConflictName(base: string, taken: ReadonlySet<string>): string {
    const suffix = " · 导入";
    let candidate = `${base}${suffix}`;
    let counter = 2;
    while (taken.has(candidate)) {
        candidate = `${base}${suffix} ${counter}`;
        counter += 1;
        if (counter > 99) return `${base}${suffix} ${Date.now() % 100000}`;
    }
    return candidate;
}

/** 为同名迁移来源生成逐项决策：合入默认（兼容时）/跳过默认（不兼容时），另建名称确定性派生。 */
export function planImportConflicts(sourceItems: readonly ImportSourceItem[], existingItems: readonly ImportExistingSnapshot[]): ImportConflictDecision[] {
    const decisions: ImportConflictDecision[] = [];
    for (const source of sourceItems) {
        const existing = existingItems.find((candidate) => !candidate.archived && candidate.name === source.name);
        if (!existing) continue;
        const kindCompatible = existing.kind === source.kind;
        const unitCompatible = existing.unit === source.unit;
        const mergeCompatible = kindCompatible && unitCompatible;
        decisions.push({
            name: source.name,
            sourceKind: source.kind,
            sourceUnit: source.unit,
            dateCount: source.dateCount,
            existingId: existing.id,
            existingKind: existing.kind,
            existingUnit: existing.unit,
            mergeCompatible,
            ...(kindCompatible ? {} : {incompatibility: "kind" as const}),
            ...(kindCompatible && !unitCompatible ? {incompatibility: "unit" as const} : {}),
            disposition: mergeCompatible ? "merge" : "skip",
            createNewName: resolveImportConflictName(source.name, new Set(existingItems.map((item) => item.name))),
        });
    }
    return decisions;
}
