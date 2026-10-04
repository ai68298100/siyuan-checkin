/* 统一页面壳（T-1576）：详情页头部与返回路径的单一构造点，按 T-1603 表面路由契约收拢
   标题、上下文（eyebrow）、返回路径、状态区与动作槽。今日/回顾是根页面，保留各自头部变体
   （回顾头部承载区间页签与工具区，无返回键）。DOM 钩子（data-action="back"、
   editor-header/back-button/eyebrow/title 类名）保持原名 = 契约 4 兼容映射，绑定与样式零改动。
   危险区标记沿用既有三页统一方案（editor data-editor-section="danger" / archived
   data-archived-danger / settings data-data-section="reset"），不在此重复登记。 */
import {t} from "../i18n";
import {escapeHtml} from "../shared";
import type {PageId, EditorRootContext, InsightsRootContext, SettingsRootContext, TodayRootContext} from "../types";
export type {EditorRootContext, InsightsRootContext, SettingsRootContext, TodayRootContext} from "../types";
import type {OccasionsRootContext} from "./occasion-session";

/** 七页联合（同 navigation.ts 的 currentPage；契约 1 PageId）。 */
export type {PageId} from "../types";

export interface ReviewSummarySession {
    requestId: number;
    refreshing: boolean;
    error?: string;
    errorScope?: string;
}

export interface ReviewRootContext {
    summarySession?: ReviewSummarySession;
    historyMonth: Date;
    selectedHistoryDate: string;
    summaryRange: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    reviewWorkspace: "overview" | "records" | "analysis";
    historyItemId: string;
    historyScope: "day" | "period";
    historyPage: number;
    reviewProjectPage: number;
    historyQuery: string;
    historySource: import("../features/history-filter").HistoryChannelFilter;
    historyMetering: import("../features/history-filter").HistoryMeteringFilter;
    historyOrder: "newest" | "oldest";
    historyBatchSelected: Set<string>;
    historyBatchPreviewOpen: boolean;
    historyBatchValues: Record<string, string>;
    itemCompareSelection: Set<string>;
    itemCompareQuery: string;
    reviewProjectOrder: "attention" | "name";
    reviewTrend: "weekly" | "monthly" | "daily" | "yearly";
    reviewStrengthItemId: string;
    reviewAssistantGoal: import("../features/review-assistant").ReviewAssistantGoal;
    heatmapYearOffset: number;
    reviewFoldSections: Set<string>;
    reviewFoldTouched: boolean;
    editingHistoryNoteId: string | undefined;
    recordDetailsExpanded: Set<string>;
    reminderFilter: import("../reminders").ReminderFilter;
}

export interface RootContext {
    page: PageId;
    returnTo?: PageId;
    /** Root-local view restoration state; it is released with the surface. */
    renderedPage?: PageId;
    scrollTops: Partial<Record<PageId, number>>;
    pendingFocusItemId?: string;
    /** Root-local Today filter; seeded from the compatibility preference on registration. */
    todayQuery?: string;
    /** Root-local Archived filter; seeded from the compatibility preference on registration. */
    archivedQuery?: string;
    review: ReviewRootContext;
    insights?: InsightsRootContext;
    editor?: EditorRootContext;
    renderedEditor?: EditorRootContext;
    settings?: SettingsRootContext;
    today?: TodayRootContext;
    occasions?: OccasionsRootContext;
    renderedOccasions?: OccasionsRootContext;
}

export interface PageShellHeadInput {
    /** 返回按钮 aria（默认 common.back；archived 沿用既有专用文案）。 */
    backAria?: string;
    /** 上下文行纯文本（内部转义）。 */
    eyebrow?: string;
    /** 上下文行已转义 HTML（洞察图标等富内容；与 eyebrow 二选一，优先）。 */
    eyebrowHtml?: string;
    /** 标题纯文本（内部转义）。 */
    title: string;
    /** 头部动作槽（新建事项 + 等；调用方保证已转义）。 */
    actionsHtml?: string;
    /** 状态区（role=status；调用方保证已转义）。 */
    statusHtml?: string;
}

export function renderPageShellHead(input: PageShellHeadInput): string {
    const back = `<button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${escapeHtml(input.backAria ?? t("common.back"))}">‹</button>`;
    const eyebrow = input.eyebrowHtml ?? (input.eyebrow ? escapeHtml(input.eyebrow) : "");
    const context = eyebrow ? `<div class="lc-checkin__eyebrow">${eyebrow}</div>` : "";
    return `<header class="lc-checkin__editor-header">${back}<div>${context}<h1 class="lc-checkin__title">${escapeHtml(input.title)}</h1></div>${input.actionsHtml ?? ""}${input.statusHtml ?? ""}</header>`;
}

/** 契约 3 默认返回表：未显式记录 returnTo 的详情页统一回落 today（insights/editor 由各自会话返回栈优先）。 */
export function defaultReturnPage(_page: PageId): "today" {
    return "today";
}

/** 契约 1 SurfaceContext 读侧：把宿主会话态聚合为只读上下文。
    T-1621 第一切片：params 扩到契约 1 全形状（date/range/workspace/query/filters）——
    只聚合既有会话态、不新增真值，失败与重载策略仍归各页会话态；按 root 的全量
    序列化（多 root 独立 currentPage）是后续切片，字段可增不可改义。 */
export interface SurfaceContextParams {
    itemId?: string;
    /** review 记录日视图的钻取日（selectedHistoryDate，仅 day 范围携带）。 */
    date?: string;
    /** review 概览范围（summaryRange 或自定义区间）。 */
    range?: "day" | "week" | "month" | {startDate: string; endDate: string};
    workspace?: "overview" | "records" | "analysis";
    /** today 搜索 / review 记录查询 / archived 查询（按当前页取用）。 */
    query?: string;
    filters?: {
        scope?: "day" | "period";
        source?: string;
        metering?: string;
        order?: string;
        page?: number;
        reminder?: string;
    };
}

export interface SurfaceContext {
    page: PageId;
    returnTo?: PageId;
    params: SurfaceContextParams;
}

export function readSurfaceContext(snapshot: {
    currentPage: PageId;
    editorReturnPage?: "today" | "review" | "insights";
    insightsReturnPage: "today" | "review";
    editingId?: string;
    insightsItemId?: string;
    selectedHistoryDate?: string;
    summaryRange?: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    reviewWorkspace?: "overview" | "records" | "analysis";
    todayQuery?: string;
    historyQuery?: string;
    archivedQuery?: string;
    historyScope?: "day" | "period";
    historySource?: string;
    historyMetering?: string;
    historyOrder?: string;
    historyPage?: number;
    reminderFilter?: string;
}): SurfaceContext {
    const page = snapshot.currentPage;
    const returnTo = page === "editor"
        ? snapshot.editorReturnPage ?? defaultReturnPage(page)
        : page === "insights" ? snapshot.insightsReturnPage : undefined;
    const itemId = page === "editor" ? snapshot.editingId
        : page === "insights" ? snapshot.insightsItemId : undefined;
    const params: SurfaceContextParams = itemId ? {itemId} : {};
    if (page === "review") {
        if (snapshot.historyScope === "day" && snapshot.selectedHistoryDate) params.date = snapshot.selectedHistoryDate;
        if (snapshot.reviewWorkspace) params.workspace = snapshot.reviewWorkspace;
        const range = snapshot.summaryCustomRange
            ? {startDate: snapshot.summaryCustomRange.startDate, endDate: snapshot.summaryCustomRange.endDate}
            : snapshot.summaryRange;
        if (range) params.range = range;
        if (snapshot.historyQuery) params.query = snapshot.historyQuery;
        const filters: SurfaceContextParams["filters"] = {};
        if (snapshot.historyScope) filters.scope = snapshot.historyScope;
        if (snapshot.historySource && snapshot.historySource !== "all") filters.source = snapshot.historySource;
        if (snapshot.historyMetering && snapshot.historyMetering !== "all") filters.metering = snapshot.historyMetering;
        if (snapshot.historyOrder && snapshot.historyOrder !== "newest") filters.order = snapshot.historyOrder;
        if (snapshot.historyPage) filters.page = snapshot.historyPage;
        if (snapshot.reminderFilter && snapshot.reminderFilter !== "all") filters.reminder = snapshot.reminderFilter;
        params.filters = filters;
    }
    if (page === "today" && snapshot.todayQuery) params.query = snapshot.todayQuery;
    if (page === "archived" && snapshot.archivedQuery) params.query = snapshot.archivedQuery;
    return {page, returnTo, params};
}
