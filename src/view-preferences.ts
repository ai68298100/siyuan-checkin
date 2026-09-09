import type {CheckinItemSortMode} from "./types";

export type TodayGroupMode = "group" | "time" | "priority";
export type CheckinDensity = "compact" | "standard" | "comfortable";
export type CheckinAppearance = "system" | "light" | "dark";

export interface CheckinViewPreferences {
    groupMode: TodayGroupMode;
    sortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    collapsedGroups: string[];
    lastInsightsItemId?: string;
    density: CheckinDensity;
    appearance: CheckinAppearance;
    reducedMotion: boolean;
    todayQuery: string;
}

export const DEFAULT_VIEW_PREFERENCES: CheckinViewPreferences = {
    groupMode: "group",
    sortMode: "manual",
    completedCollapsed: true,
    collapsedGroups: [],
    density: "standard",
    appearance: "system",
    reducedMotion: false,
    todayQuery: "",
};

const GROUP_MODES = new Set<TodayGroupMode>(["group", "time", "priority"]);
const SORT_MODES = new Set<CheckinItemSortMode>(["manual", "group", "priority", "createdAt", "updatedAt", "name"]);

export function normalizeViewPreferences(value: unknown): CheckinViewPreferences {
    if (!value || typeof value !== "object") return {...DEFAULT_VIEW_PREFERENCES};
    const source = value as Record<string, unknown>;
    const groupMode = GROUP_MODES.has(source.groupMode as TodayGroupMode) ? source.groupMode as TodayGroupMode : DEFAULT_VIEW_PREFERENCES.groupMode;
    const sortMode = SORT_MODES.has(source.sortMode as CheckinItemSortMode) ? source.sortMode as CheckinItemSortMode : DEFAULT_VIEW_PREFERENCES.sortMode;
    const collapsedGroups = Array.isArray(source.collapsedGroups)
        ? [...new Set(source.collapsedGroups.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].slice(0, 200)
        : [];
    const density = source.density === "compact" || source.density === "comfortable" ? source.density : DEFAULT_VIEW_PREFERENCES.density;
    const appearance = source.appearance === "light" || source.appearance === "dark" ? source.appearance : DEFAULT_VIEW_PREFERENCES.appearance;
    const reducedMotion = typeof source.reducedMotion === "boolean" ? source.reducedMotion : DEFAULT_VIEW_PREFERENCES.reducedMotion;
    const todayQuery = typeof source.todayQuery === "string" ? source.todayQuery.trim().slice(0, 120) : "";
    return {groupMode, sortMode, completedCollapsed: typeof source.completedCollapsed === "boolean" ? source.completedCollapsed : true, collapsedGroups, lastInsightsItemId: typeof source.lastInsightsItemId === "string" && source.lastInsightsItemId.trim() ? source.lastInsightsItemId.trim() : undefined, density, appearance, reducedMotion, todayQuery};
}

export function densityLabel(density: CheckinDensity): string {
    return density === "comfortable" ? "舒适" : density === "compact" ? "紧凑" : "标准";
}

export function nextDensity(density: CheckinDensity): CheckinDensity {
    return density === "standard" ? "comfortable" : density === "comfortable" ? "compact" : "standard";
}
