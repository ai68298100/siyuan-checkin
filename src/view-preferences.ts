import type {CheckinItemSortMode} from "./types";

export type TodayGroupMode = "none" | "group" | "time" | "priority";
export type CheckinAppearance = "system" | "light" | "dark";
/** How the quick dialog sizes itself on desktop. "auto" adapts to the content and remembers a user resize. */
export type DialogSizeMode = "auto" | "percent" | "fullscreen" | "fixed";
export type CheckinPalette = "lavender" | "ocean" | "forest" | "sunset";

export interface CheckinViewPreferences {
    groupMode: TodayGroupMode;
    sortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    collapsedGroups: string[];
    /** Review-page sections currently expanded ("trend" | "log" | "upcoming" | "achievements"). Empty = all folded. */
    reviewFold: string[];
    /** True once the user has toggled a review section; disables the wide-screen default-expanded state. */
    reviewFoldTouched: boolean;
    lastInsightsItemId?: string;
    appearance: CheckinAppearance;
    reducedMotion: boolean;
    /** Short vibration on successful check-ins (mobile only; no-op where Vibration API is missing). */
    hapticFeedback: boolean;
    todayQuery: string;
    pendingOnly: boolean;
    /** Optional today-page extras (week strip). Off by default: the checklist is the first screen. */
    showWeekStrip: boolean;
    /** Quick dialog size preference (desktop). */
    dialogSizeMode: DialogSizeMode;
    /** Accent palette. Colors are fixed per palette and do not follow the host theme. */
    palette: CheckinPalette;
    /** ISO timestamp of the last JSON/CSV export, drives the gentle backup reminder. */
    lastExportAt?: string;
    /** Percentage of the host window when dialogSizeMode is "percent" (50–100). */
    dialogScale: number;
    /** Fixed size in px when dialogSizeMode is "fixed". */
    dialogFixedSize: {width: number; height: number};
    /** Last user-resized dialog size in px ("auto" mode); kept so a drag sticks across sessions. */
    dialogRect?: {width: number; height: number};
    /** Last user-dragged dialog offset from center in px. */
    dialogOffset?: {x: number; y: number};
}

export const DEFAULT_VIEW_PREFERENCES: CheckinViewPreferences = {
    groupMode: "none",
    sortMode: "manual",
    completedCollapsed: true,
    collapsedGroups: [],
    reviewFold: [],
    reviewFoldTouched: false,
    appearance: "system",
    reducedMotion: false,
    hapticFeedback: true,
    todayQuery: "",
    pendingOnly: false,
    lastExportAt: undefined,
    showWeekStrip: false,
    dialogSizeMode: "auto",
    palette: "lavender",
    dialogScale: 90,
    dialogFixedSize: {width: 720, height: 560},
};

const SORT_MODES = new Set<CheckinItemSortMode>(["manual", "group", "priority", "createdAt", "updatedAt", "name"]);
const DIALOG_SIZE_MODES = new Set<DialogSizeMode>(["auto", "percent", "fullscreen", "fixed"]);
const PALETTES = new Set<CheckinPalette>(["lavender", "ocean", "forest", "sunset"]);

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function normalizeViewPreferences(value: unknown): CheckinViewPreferences {
    if (!value || typeof value !== "object") return {...DEFAULT_VIEW_PREFERENCES};
    const source = value as Record<string, unknown>;
    const GROUP_MODES_ALL = new Set<TodayGroupMode>(["none", "group", "time", "priority"]);
    const groupMode = GROUP_MODES_ALL.has(source.groupMode as TodayGroupMode) ? source.groupMode as TodayGroupMode : DEFAULT_VIEW_PREFERENCES.groupMode;
    const sortMode = SORT_MODES.has(source.sortMode as CheckinItemSortMode) ? source.sortMode as CheckinItemSortMode : DEFAULT_VIEW_PREFERENCES.sortMode;
    const collapsedGroups = Array.isArray(source.collapsedGroups)
        ? [...new Set(source.collapsedGroups.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].slice(0, 200)
        : [];
    const REVIEW_FOLD_SECTIONS = new Set(["trend", "log", "upcoming", "achievements"]);
    const reviewFold = Array.isArray(source.reviewFold)
        ? [...new Set(source.reviewFold.filter((entry): entry is string => typeof entry === "string" && REVIEW_FOLD_SECTIONS.has(entry)))] .slice(0, 8)
        : [];
    const appearance = source.appearance === "light" || source.appearance === "dark" ? source.appearance : DEFAULT_VIEW_PREFERENCES.appearance;
    const reducedMotion = typeof source.reducedMotion === "boolean" ? source.reducedMotion : DEFAULT_VIEW_PREFERENCES.reducedMotion;
    const hapticFeedback = typeof source.hapticFeedback === "boolean" ? source.hapticFeedback : DEFAULT_VIEW_PREFERENCES.hapticFeedback;
    const todayQuery = typeof source.todayQuery === "string" ? source.todayQuery.trim().slice(0, 120) : "";
    const pendingOnly = typeof source.pendingOnly === "boolean" ? source.pendingOnly : false;
    const dialogSizeMode = DIALOG_SIZE_MODES.has(source.dialogSizeMode as DialogSizeMode) ? source.dialogSizeMode as DialogSizeMode : DEFAULT_VIEW_PREFERENCES.dialogSizeMode;
    const palette = PALETTES.has(source.palette as CheckinPalette) ? source.palette as CheckinPalette : DEFAULT_VIEW_PREFERENCES.palette;
    const legacySize = (source as {dialogSize?: unknown}).dialogSize;
    const fixedSource = (source.dialogFixedSize && typeof source.dialogFixedSize === "object" ? source.dialogFixedSize : legacySize && typeof legacySize === "object" ? legacySize : {}) as Record<string, unknown>;
    const readRect = (value: unknown, minWidth: number, minHeight: number, maxWidth: number, maxHeight: number): {width: number; height: number} | undefined => {
        if (!value || typeof value !== "object") return undefined;
        const entry = value as Record<string, unknown>;
        const width = Number(entry.width);
        const height = Number(entry.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) return undefined;
        return {
            width: clampNumber(width, minWidth, maxWidth, minWidth),
            height: clampNumber(height, minHeight, maxHeight, minHeight),
        };
    };
    const readOffset = (value: unknown): {x: number; y: number} | undefined => {
        if (!value || typeof value !== "object") return undefined;
        const entry = value as Record<string, unknown>;
        const x = Number(entry.x);
        const y = Number(entry.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
        if (x === 0 && y === 0) return undefined;
        return {x: clampNumber(x, -4000, 4000, 0), y: clampNumber(y, -4000, 4000, 0)};
    };
    return {
        groupMode,
        sortMode,
        completedCollapsed: typeof source.completedCollapsed === "boolean" ? source.completedCollapsed : true,
        collapsedGroups,
        reviewFold,
        reviewFoldTouched: source.reviewFoldTouched === true,
        lastInsightsItemId: typeof source.lastInsightsItemId === "string" && source.lastInsightsItemId.trim() ? source.lastInsightsItemId.trim() : undefined,
        appearance,
        reducedMotion,
        hapticFeedback,
        todayQuery,
        pendingOnly,
        lastExportAt: typeof source.lastExportAt === "string" ? source.lastExportAt : undefined,
        palette,
        showWeekStrip: source.showWeekStrip === true,
        dialogSizeMode,
        dialogScale: clampNumber(source.dialogScale, 50, 100, DEFAULT_VIEW_PREFERENCES.dialogScale),
        dialogFixedSize: {
            width: clampNumber(fixedSource.width, 320, 2560, DEFAULT_VIEW_PREFERENCES.dialogFixedSize.width),
            height: clampNumber(fixedSource.height, 240, 2048, DEFAULT_VIEW_PREFERENCES.dialogFixedSize.height),
        },
        dialogRect: readRect(source.dialogRect, 520, 400, 3840, 2160),
        dialogOffset: readOffset(source.dialogOffset),
    };
}
