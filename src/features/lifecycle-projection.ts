/* T-1429 · R-A9 项目生命周期与数据治理——影响预览纯投影。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-A9）：
   - 删除/归档/恢复前先给出影响预览：关联事件数、外部幂等身份、锚点引用、
     事项联动的受影响范围与可恢复性，让高影响操作可解释；
   - 状态语义冻结：delete = 级联墓碑 + persist 链恢复点（可经恢复审计找回，
     非静默清除）；archive/restore = 可逆开关（事件与历史不动，只改可见面）；
   - 外部幂等身份（source + externalRef）在三种动作下全部保留——防止重复累计，
     来源断开或项目删除都不抹掉已确认落盘的事实与身份（D-260 口径）；
   - 事实切片由调用方经 model.ts 单一实现算好传入；本模块零依赖、无时钟、
     确定性输出；只做预览，不执行任何写操作（写入走 deleteItemsCascade/
     setItemArchived 既有通道）。 */

export type LifecycleAction = "delete" | "archive" | "restore";

export interface LifecycleItemFacts {
    name: string;
    archived: boolean;
    /** 关联事件总数（含外部来源事件）。 */
    eventCount: number;
    /** 带 source + externalRef 幂等身份的事件数。 */
    externalRefCount: number;
    /** 笔记锚点引用数（noteAnchor）。 */
    anchorCount: number;
    /** 事项联动数（linkedOccasionId）。 */
    occasionLinkCount: number;
}

export type LifecycleRecoverability = "reversible" | "recoverable-with-audit";

export type LifecycleReasonCode =
    | "today-hidden"
    | "today-restored"
    | "calendar-hidden"
    | "calendar-restored"
    | "events-retained"
    | "identities-retained"
    | "tombstone-guard"
    | "restore-point";

export interface LifecycleImpact {
    action: LifecycleAction;
    name: string;
    /** delete = 将被打墓碑的事件数；archive/restore = 0（事件不动）。 */
    affectedEvents: number;
    /** 保留的外部幂等身份数（防重复累计）。 */
    externalIdentitiesRetained: number;
    /** delete 时将被清理的锚点引用数。 */
    anchorsCleared: number;
    /** delete 时将解除的事项联动数。 */
    occasionLinksCleared: number;
    recoverability: LifecycleRecoverability;
    reasonCodes: readonly LifecycleReasonCode[];
}

/** 单项目影响预览。确定性：同一事实与动作得到同一结果。 */
export function projectLifecycleImpact(facts: LifecycleItemFacts, action: LifecycleAction): LifecycleImpact {
    const externalIdentitiesRetained = Math.max(0, Math.floor(facts.externalRefCount)) || 0;
    if (action === "delete") {
        return {
            action,
            name: facts.name,
            affectedEvents: Math.max(0, Math.floor(facts.eventCount)) || 0,
            externalIdentitiesRetained,
            anchorsCleared: Math.max(0, Math.floor(facts.anchorCount)) || 0,
            occasionLinksCleared: Math.max(0, Math.floor(facts.occasionLinkCount)) || 0,
            recoverability: "recoverable-with-audit",
            reasonCodes: ["today-hidden", "calendar-hidden", "identities-retained", "tombstone-guard", "restore-point"],
        };
    }
    if (action === "archive") {
        return {
            action,
            name: facts.name,
            affectedEvents: 0,
            externalIdentitiesRetained,
            anchorsCleared: 0,
            occasionLinksCleared: 0,
            recoverability: "reversible",
            reasonCodes: ["today-hidden", "calendar-hidden", "events-retained", "identities-retained"],
        };
    }
    return {
        action: "restore",
        name: facts.name,
        affectedEvents: 0,
        externalIdentitiesRetained,
        anchorsCleared: 0,
        occasionLinksCleared: 0,
        recoverability: "reversible",
        reasonCodes: ["today-restored", "calendar-restored", "events-retained", "identities-retained"],
    };
}

/** 批量影响预览（归档页批量删除/恢复场景）。 */
export function projectLifecycleBatch(factsList: readonly LifecycleItemFacts[], action: LifecycleAction): {
    impacts: readonly LifecycleImpact[];
    totals: {items: number; affectedEvents: number; externalIdentitiesRetained: number; anchorsCleared: number; occasionLinksCleared: number; recoverability: LifecycleRecoverability};
} {
    const impacts = factsList.map((facts) => projectLifecycleImpact(facts, action));
    return {
        impacts,
        totals: {
            items: impacts.length,
            affectedEvents: impacts.reduce((total, impact) => total + impact.affectedEvents, 0),
            externalIdentitiesRetained: impacts.reduce((total, impact) => total + impact.externalIdentitiesRetained, 0),
            anchorsCleared: impacts.reduce((total, impact) => total + impact.anchorsCleared, 0),
            occasionLinksCleared: impacts.reduce((total, impact) => total + impact.occasionLinksCleared, 0),
            recoverability: action === "delete" ? "recoverable-with-audit" : "reversible",
        },
    };
}

/** 汇总事实切片：从事件数组（model 单一口径产出的 store.events）统计关联数。 */
export function collectLifecycleFacts(item: {id: string; name: string; archived?: boolean; noteAnchor?: {blockId?: string}; linkedOccasionId?: string}, events: readonly {itemId: string; externalRef?: string}[]): LifecycleItemFacts {
    let eventCount = 0;
    let externalRefCount = 0;
    for (const event of events) {
        if (event.itemId !== item.id) continue;
        eventCount += 1;
        if (event.externalRef) externalRefCount += 1;
    }
    return {
        name: item.name,
        archived: item.archived === true,
        eventCount,
        externalRefCount,
        anchorCount: item.noteAnchor?.blockId ? 1 : 0,
        occasionLinkCount: item.linkedOccasionId ? 1 : 0,
    };
}
