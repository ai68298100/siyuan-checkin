import type {CheckinItem} from "./types";

export type AgentSuggestionChange = {
    itemId: string;
    field: keyof CheckinItem;
    before: unknown;
    after: unknown;
};

export type AgentSuggestion = {
    id: string;
    title: string;
    reason: string;
    changes: AgentSuggestionChange[];
    requiresConfirmation: true;
};

export function buildSuggestionChange(item: CheckinItem, field: keyof CheckinItem, after: unknown): AgentSuggestionChange | undefined {
    if (!item || !field || Object.is(item[field], after)) return undefined;
    return {itemId: item.id, field, before: item[field], after};
}

export function summarizeSuggestionImpact(changes: readonly AgentSuggestionChange[]): string {
    const items = new Set(changes.map((change) => change.itemId));
    return `将影响 ${items.size} 个项目，变更 ${changes.length} 项设置；需要用户确认后执行。`;
}
