/* T-1470（R-A18+）笔记联动总览：把散落在各功能的文档/笔记本/块绑定集中成一张可
   检测、可跳转、可定位重选的清单（纯函数面）。
   设计来源（跨插件调研，2026-09-26）：dailynote-today 的笔记本状态面板（三态+行内修复）、
   Achuan-2 的绑定对话框与双向属性、QuickAdd/Templater 的「目标必须显式存在」反例教训。
   本模块只做数据归集与归一化；健康检测（SQL/lsNotebooks）与打开跳转由宿主执行。
   零依赖、无时钟、确定性输出（按固定功能顺序 + 项目名 zh 平局）。 */

export type NoteBindingTargetKind = "doc" | "block" | "notebook" | "none";

export interface NoteBindingRow {
    /** 稳定行 id：内置功能用固定 key，锚点行用 `anchor:<itemId>`。 */
    key: string;
    /** 功能名 i18n 键（bind.feature.*）。 */
    featureKey: string;
    /** 行内变量：锚点行为项目名。 */
    featureParams?: Readonly<Record<string, string>>;
    targetKind: NoteBindingTargetKind;
    /** 目标 ID（docId/blockId/notebookId）；未绑定时空串。 */
    targetId: string;
    /** 该联动当前是否启用（未启用时目标丢失不算故障）。 */
    enabled: boolean;
    /** 联动生效是否依赖此目标（true=必须绑定；false=可选目标）。 */
    required: boolean;
    /** 设置页源配置输入框选择器（「定位重选」用）；无独立输入框的行为空。 */
    sourceSelector: string;
}

export interface NoteBindingsInput {
    diaryReport: {enabled: boolean; docId: string};
    summaryResident: {enabled: boolean; docId: string};
    healthInbox: {enabled: boolean; docId: string};
    journalIntegration: {mode: "daily" | "doc"; notebookId: string; docId: string};
    journalEnabled: boolean;
    yeguifIntegration: {enabled: boolean; itemId: string; notebookId: string};
    /** store 中绑定了笔记锚点的项目（含归档——归档项的锚点仍在但不再写回）。 */
    anchoredItems: ReadonlyArray<{id: string; name: string; blockId: string}>;
}

const ITEM_ID_PATTERN = /^[0-9A-Za-z-]{8,64}$/;

/** 归集全部笔记联动绑定行。确定性：内置功能固定顺序，锚点行按项目名 zh 升序。 */
export function collectNoteBindings(input: NoteBindingsInput): NoteBindingRow[] {
    const rows: NoteBindingRow[] = [];
    rows.push({
        key: "diary-report",
        featureKey: "bind.feature.diaryReport",
        targetKind: "doc",
        targetId: input.diaryReport.docId || "",
        enabled: input.diaryReport.enabled === true,
        required: true,
        sourceSelector: "[data-diary-doc]",
    });
    rows.push({
        key: "summary-resident",
        featureKey: "bind.feature.summaryResident",
        targetKind: "doc",
        targetId: input.summaryResident.docId || "",
        enabled: input.summaryResident.enabled === true,
        required: true,
        sourceSelector: "[data-summary-doc]",
    });
    rows.push({
        key: "health-inbox",
        featureKey: "bind.feature.healthInbox",
        targetKind: "doc",
        targetId: input.healthInbox.docId || "",
        enabled: input.healthInbox.enabled === true,
        required: true,
        sourceSelector: "[data-health-doc]",
    });
    rows.push({
        key: "journal-target",
        featureKey: "bind.feature.journal",
        targetKind: input.journalIntegration.mode === "doc" ? "doc" : "notebook",
        targetId: input.journalIntegration.mode === "doc" ? input.journalIntegration.docId : input.journalIntegration.notebookId,
        enabled: input.journalEnabled === true,
        required: true,
        sourceSelector: "[data-journal-custom]",
    });
    rows.push({
        key: "yeguif-lifelog",
        featureKey: "bind.feature.yeguif",
        targetKind: "notebook",
        targetId: input.yeguifIntegration.notebookId || "",
        enabled: input.yeguifIntegration.enabled === true,
        required: true,
        sourceSelector: "[data-yeguif-notebook]",
    });
    const anchored = [...input.anchoredItems]
        .sort((left, right) => left.name.localeCompare(right.name, "zh") || left.id.localeCompare(right.id));
    for (const item of anchored) {
        if (!ITEM_ID_PATTERN.test(item.blockId || "")) continue;
        rows.push({
            key: `anchor:${item.id}`,
            featureKey: "bind.feature.anchor",
            featureParams: {name: item.name},
            targetKind: "block",
            targetId: item.blockId,
            enabled: true,
            required: true,
            sourceSelector: "",
        });
    }
    return rows;
}

/** 健康状态（会话内计算，不持久化）。 */
export type NoteBindingHealth = "unchecked" | "ok" | "missing";

/** 批量体检的分组：块/文档目标走一次 SQL IN 查询；笔记本目标走 lsNotebooks 成员校验。 */
export function groupBindingTargets(rows: readonly NoteBindingRow[]): {docIds: string[]; notebookIds: string[]} {
    const docIds: string[] = [];
    const notebookIds: string[] = [];
    for (const row of rows) {
        if (!row.targetId) continue;
        if (row.targetKind === "doc" || row.targetKind === "block") docIds.push(row.targetId);
        else if (row.targetKind === "notebook") notebookIds.push(row.targetId);
    }
    return {docIds: [...new Set(docIds)], notebookIds: [...new Set(notebookIds)]};
}

/** 体检结果归并：仅启用的联动参与判定——目标缺失 → missing，存在 → ok；
    未启用的绑定一律 unchecked（不制造噪音）；无目标的启用必填联动 → missing。 */
export function mergeBindingHealth(rows: readonly NoteBindingRow[], foundIds: ReadonlySet<string>, validNotebooks: ReadonlySet<string>): Record<string, NoteBindingHealth> {
    const health: Record<string, NoteBindingHealth> = {};
    for (const row of rows) {
        if (!row.enabled || !row.targetId) {
            health[row.key] = row.enabled && row.required ? "missing" : "unchecked";
            continue;
        }
        if (row.targetKind === "notebook") health[row.key] = validNotebooks.has(row.targetId) ? "ok" : "missing";
        else health[row.key] = foundIds.has(row.targetId) ? "ok" : "missing";
    }
    return health;
}
