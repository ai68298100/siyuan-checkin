import type {CheckinItemSortMode} from "./types";
import {validateAnchorBlockId} from "./features/note-anchor";
import {normalizeSummaryResidentPreference} from "./features/summary-resident";
import {normalizeHealthInboxPreference} from "./features/health-inbox";

export type TodayGroupMode = "none" | "group" | "time" | "priority";
export type CheckinAppearance = "system" | "light" | "dark";
/** How the quick dialog sizes itself on desktop. "auto" adapts to the content and remembers a user resize. */
export type DialogSizeMode = "auto" | "percent" | "fullscreen" | "fixed";
export type CheckinPalette = "lavender" | "ocean" | "forest" | "sunset";
/** Which focus timer should open from a duration item's clock button. */
export type FocusTimerProvider = "builtin" | "docktomato";
/** T-1346：插件界面语言；"follow" 按思源界面语言自动选择（en* → en-US）。 */
export type PluginLanguageSetting = "zh-CN" | "en-US" | "follow";
export type CheckinAvatar = "check" | "star" | "horse" | "leaf" | "sun" | "target";

/** T-1217 周报/月报包含的区块；缺省全开，关闭项不进入报告输出。 */
export interface ReportSectionToggles {
    events: boolean;
    completion: boolean;
    items: boolean;
    baseline: boolean;
    highlights: boolean;
    /** T-1343：目标偏差解释（对比基线的可读结论）。 */
    deviations: boolean;
}

export interface CheckinViewPreferences {
    groupMode: TodayGroupMode;
    sortMode: CheckinItemSortMode;
    completedCollapsed: boolean;
    collapsedGroups: string[];
    /** Expanded review sections, shared across review workspaces. */
    reviewFold: string[];
    /** True after an explicit section toggle; saved choices then replace the default expansion. */
    reviewFoldTouched: boolean;
    lastInsightsItemId?: string;
    appearance: CheckinAppearance;
    reducedMotion: boolean;
    /** Short vibration on successful check-ins (mobile only; no-op where Vibration API is missing). */
    hapticFeedback: boolean;
    /** Default focus timer launcher: the built-in panel or a registered tomato plugin adapter. */
    focusTimerProvider: FocusTimerProvider;
    todayQuery: string;
    pendingOnly: boolean;
    /** Optional today-page extras (week strip). Off by default: the checklist is the first screen. */
    showWeekStrip: boolean;
    /** Quick dialog size preference (desktop). */
    dialogSizeMode: DialogSizeMode;
    /** Accent palette. Colors are fixed per palette and do not follow the host theme. */
    palette: CheckinPalette;
    avatar: string;
    avatarImage?: string;
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
    /** T-1217 Markdown 报告包含的区块。 */
    reportSections: ReportSectionToggles;
    /** T-1346 插件界面语言设置；缺省 zh-CN，历史偏好无该字段时行为不变。 */
    pluginLanguage: PluginLanguageSetting;
    /** T-1343 报告导出的来源筛选："" = 全部来源；否则 manual/tomato/api/import。 */
    reportSource: string;
    /** T-1352 日记集成：把周期报告手动写入用户绑定的思源文档（opt-in，默认关）。 */
    diaryReport: {enabled: boolean; docId: string};
    /** T-1353 摘要驻留：每日把当天汇总单行追加进用户绑定的思源文档（opt-in，默认关）。 */
    summaryResident: {enabled: boolean; docId: string};
    /** T-1384 思阅联动（opt-in，默认关）：有效阅读分钟达阈值后每日一次幂等写入。 */
    sireaderIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number};
    /** T-1385 思播联动（实验，opt-in 默认关）：有效播放分钟达阈值后每日一次幂等写入。 */
    siplayerIntegration: {enabled: boolean; itemId: string; thresholdMinutes: number};
    /** T-1403 健康收件箱（opt-in，默认关）：快捷指令经内核向收件箱文档追加行，插件轮询摄取。 */
    healthInbox: {enabled: boolean; docId: string; stepsItemId: string; weightItemId: string};
    /** T-1349 最近使用的内置模板名（zh 名为数据锚点），最多 6 条，驱动新建页「最近使用」置顶。 */
    recentTemplates: string[];
}

export const DEFAULT_REPORT_SECTIONS: ReportSectionToggles = {
    events: true,
    completion: true,
    items: true,
    baseline: true,
    highlights: true,
    deviations: true,
};

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
    focusTimerProvider: "builtin",
    todayQuery: "",
    pendingOnly: false,
    lastExportAt: undefined,
    showWeekStrip: false,
    dialogSizeMode: "auto",
    palette: "lavender",
    avatar: "check",
    avatarImage: undefined,
    dialogScale: 90,
    dialogFixedSize: {width: 720, height: 560},
    reportSections: {...DEFAULT_REPORT_SECTIONS},
    pluginLanguage: "zh-CN",
    reportSource: "",
    diaryReport: {enabled: false, docId: ""},
    summaryResident: {enabled: false, docId: ""},
    sireaderIntegration: {enabled: false, itemId: "", thresholdMinutes: 30},
    siplayerIntegration: {enabled: false, itemId: "", thresholdMinutes: 30},
    healthInbox: {enabled: false, docId: "", stepsItemId: "", weightItemId: ""},
    recentTemplates: [],
};

/** T-1349 「最近使用」保留条数上限。 */
export const RECENT_TEMPLATES_LIMIT = 6;

const PLUGIN_LANGUAGE_SETTINGS = new Set<PluginLanguageSetting>(["zh-CN", "en-US", "follow"]);
/** T-1343 报告来源筛选的合法值。 */
export const REPORT_SOURCE_VALUES = ["", "manual", "tomato", "api", "import"] as const;

const SORT_MODES = new Set<CheckinItemSortMode>(["manual", "group", "priority", "createdAt", "updatedAt", "name"]);
const DIALOG_SIZE_MODES = new Set<DialogSizeMode>(["auto", "percent", "fullscreen", "fixed"]);
const PALETTES = new Set<CheckinPalette>(["lavender", "ocean", "forest", "sunset"]);
const FOCUS_TIMER_PROVIDERS = new Set<FocusTimerProvider>(["builtin", "docktomato"]);

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

export function normalizeAvatarImage(value: unknown): string | undefined {
    if (typeof value !== "string" || value.length > 1_000_000) return undefined;
    const match = /^data:image\/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    return match && match[1].length % 4 === 0 ? value : undefined;
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
    const REVIEW_FOLD_SECTIONS = new Set(["projects", "trend", "log", "compare", "strength", "balance", "achievements", "upcoming", "reminders", "report", "heatmap", "calendar"]);
    const reviewFold = Array.isArray(source.reviewFold)
        ? [...new Set(source.reviewFold.filter((entry): entry is string => typeof entry === "string" && REVIEW_FOLD_SECTIONS.has(entry)))].slice(0, REVIEW_FOLD_SECTIONS.size)
        : [];
    const appearance = source.appearance === "light" || source.appearance === "dark" ? source.appearance : DEFAULT_VIEW_PREFERENCES.appearance;
    const reducedMotion = typeof source.reducedMotion === "boolean" ? source.reducedMotion : DEFAULT_VIEW_PREFERENCES.reducedMotion;
    const hapticFeedback = typeof source.hapticFeedback === "boolean" ? source.hapticFeedback : DEFAULT_VIEW_PREFERENCES.hapticFeedback;
    // “plugin” was the generic pre-12.0 value. Preserve the user's choice while
    // narrowing the first supported external provider to Dock Tomato.
    const legacyFocusTimerProvider = source.focusTimerProvider === "plugin" ? "docktomato" : source.focusTimerProvider;
    const focusTimerProvider = FOCUS_TIMER_PROVIDERS.has(legacyFocusTimerProvider as FocusTimerProvider) ? legacyFocusTimerProvider as FocusTimerProvider : DEFAULT_VIEW_PREFERENCES.focusTimerProvider;
    const todayQuery = typeof source.todayQuery === "string" ? source.todayQuery.trim().slice(0, 120) : "";
    const pendingOnly = typeof source.pendingOnly === "boolean" ? source.pendingOnly : false;
    const dialogSizeMode = DIALOG_SIZE_MODES.has(source.dialogSizeMode as DialogSizeMode) ? source.dialogSizeMode as DialogSizeMode : DEFAULT_VIEW_PREFERENCES.dialogSizeMode;
    const palette = PALETTES.has(source.palette as CheckinPalette) ? source.palette as CheckinPalette : DEFAULT_VIEW_PREFERENCES.palette;
    const avatar = typeof source.avatar === "string" && source.avatar.trim().length > 0
        ? source.avatar.trim().slice(0, 8) : DEFAULT_VIEW_PREFERENCES.avatar;
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
    /* 报告区块开关缺省全开：旧偏好里没有该字段时保持完整报告。 */
    const reportSource = (source.reportSections && typeof source.reportSections === "object" ? source.reportSections : {}) as Record<string, unknown>;
    const reportSections: ReportSectionToggles = {
        events: reportSource.events !== false,
        completion: reportSource.completion !== false,
        items: reportSource.items !== false,
        baseline: reportSource.baseline !== false,
        highlights: reportSource.highlights !== false,
        deviations: reportSource.deviations !== false,
    };
    const recentTemplates = Array.isArray(source.recentTemplates)
        ? [...new Set(source.recentTemplates.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim()))].slice(0, RECENT_TEMPLATES_LIMIT)
        : [];
    const pluginLanguage = PLUGIN_LANGUAGE_SETTINGS.has(source.pluginLanguage as PluginLanguageSetting) ? source.pluginLanguage as PluginLanguageSetting : DEFAULT_VIEW_PREFERENCES.pluginLanguage;
    const reportSourceFilter = REPORT_SOURCE_VALUES.includes(source.reportSource as typeof REPORT_SOURCE_VALUES[number]) ? (source.reportSource as string) : "";
    /* T-1352：docId 必须通过块 ID 校验；enabled 在没有合法 docId 时不物化（同 D-157 纪律）。 */
    const diarySource = (source.diaryReport && typeof source.diaryReport === "object" ? source.diaryReport : {}) as Record<string, unknown>;
    const diaryDocId = validateAnchorBlockId(diarySource.docId) || "";
    const diaryReport = {enabled: diarySource.enabled === true && Boolean(diaryDocId), docId: diaryDocId};
    const summaryResident = normalizeSummaryResidentPreference(source.summaryResident);
    const healthInbox = normalizeHealthInboxPreference(source.healthInbox);
    /* T-1384：思阅联动——enabled 无有效 itemId 不物化；阈值钳制 1~1440（缺省 30）。 */
    const sireaderSource = (source.sireaderIntegration && typeof source.sireaderIntegration === "object" ? source.sireaderIntegration : {}) as Record<string, unknown>;
    const sireaderItemId = typeof sireaderSource.itemId === "string" ? sireaderSource.itemId.trim().slice(0, 160) : "";
    const sireaderThreshold = clampNumber(sireaderSource.thresholdMinutes, 1, 1440, DEFAULT_VIEW_PREFERENCES.sireaderIntegration.thresholdMinutes);
    const sireaderIntegration = {enabled: sireaderSource.enabled === true && Boolean(sireaderItemId), itemId: sireaderItemId, thresholdMinutes: sireaderThreshold};
    /* T-1385：思播联动——同 sireader 口径。 */
    const siplayerSource = (source.siplayerIntegration && typeof source.siplayerIntegration === "object" ? source.siplayerIntegration : {}) as Record<string, unknown>;
    const siplayerItemId = typeof siplayerSource.itemId === "string" ? siplayerSource.itemId.trim().slice(0, 160) : "";
    const siplayerThreshold = clampNumber(siplayerSource.thresholdMinutes, 1, 1440, DEFAULT_VIEW_PREFERENCES.siplayerIntegration.thresholdMinutes);
    const siplayerIntegration = {enabled: siplayerSource.enabled === true && Boolean(siplayerItemId), itemId: siplayerItemId, thresholdMinutes: siplayerThreshold};
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
        focusTimerProvider,
        todayQuery,
        pendingOnly,
        lastExportAt: typeof source.lastExportAt === "string" ? source.lastExportAt : undefined,
        palette,
        avatar,
        // Keep complete raster data URLs or reject them; truncation corrupts persisted avatars.
        avatarImage: normalizeAvatarImage(source.avatarImage),
        showWeekStrip: source.showWeekStrip === true,
        dialogSizeMode,
        dialogScale: clampNumber(source.dialogScale, 50, 100, DEFAULT_VIEW_PREFERENCES.dialogScale),
        dialogFixedSize: {
            width: clampNumber(fixedSource.width, 320, 2560, DEFAULT_VIEW_PREFERENCES.dialogFixedSize.width),
            height: clampNumber(fixedSource.height, 240, 2048, DEFAULT_VIEW_PREFERENCES.dialogFixedSize.height),
        },
        dialogRect: readRect(source.dialogRect, 520, 400, 3840, 2160),
        dialogOffset: readOffset(source.dialogOffset),
        reportSections,
        pluginLanguage,
        reportSource: reportSourceFilter,
        diaryReport,
        summaryResident,
        sireaderIntegration,
        siplayerIntegration,
        healthInbox,
        recentTemplates,
    };
}
