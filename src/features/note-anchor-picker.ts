/* 笔记锚点选择器的纯投影：只展示插件已经知道的绑定，不扫描思源私有数据库。 */

export interface AnchorChoice {
    blockId: string;
    labels: string[];
}

export interface AnchorChoiceSource {
    name?: string;
    noteAnchor?: {blockId?: string};
}

/** 合并同一块被多个项目绑定的情况，保持显示顺序稳定。 */
export function collectAnchorChoices(items: readonly AnchorChoiceSource[]): AnchorChoice[] {
    const choices = new Map<string, Set<string>>();
    for (const item of items) {
        const blockId = typeof item?.noteAnchor?.blockId === "string" ? item.noteAnchor.blockId.trim() : "";
        if (!blockId) continue;
        const labels = choices.get(blockId) || new Set<string>();
        const name = typeof item.name === "string" ? item.name.trim() : "";
        if (name) labels.add(name);
        choices.set(blockId, labels);
    }
    return [...choices.entries()]
        .map(([blockId, labels]) => ({blockId, labels: [...labels].sort((left, right) => left.localeCompare(right, "zh-CN"))}))
        .sort((left, right) => (left.labels[0] || left.blockId).localeCompare(right.labels[0] || right.blockId, "zh-CN") || left.blockId.localeCompare(right.blockId));
}

/** 本地搜索只匹配已绑定项目名称和块 ID，不把“搜索”误报成全库搜索。 */
export function filterAnchorChoices(choices: readonly AnchorChoice[], query: string): AnchorChoice[] {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [...choices];
    return choices.filter((choice) => [choice.blockId, ...choice.labels].join(" ").toLocaleLowerCase().includes(normalized));
}

/** 文档标题用于 createDocWithMd 的 hpath，不能让用户输入改变层级。 */
export function normalizeAnchorDocumentTitle(raw: unknown): string | undefined {
    if (typeof raw !== "string") return undefined;
    const title = raw.trim().replace(/[\\/]/g, "／").replace(/\s+/g, " ").slice(0, 80);
    if (!title || title === "." || title === "..") return undefined;
    return title;
}

export function buildAnchorDocumentPath(raw: unknown): string | undefined {
    const title = normalizeAnchorDocumentTitle(raw);
    return title ? `/${title}` : undefined;
}
