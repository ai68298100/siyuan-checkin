/* 页面导航与回顾/归档控件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindPageNavigationHost 结构化接口声明。 */
import {t} from "../i18n";
import {buildWeeklyReportMarkdown} from "../features/report";
import {buildReviewComparison, getPreviousReviewRange, type ReviewComparison} from "../features/review-comparison";
import {buildAiReviewPrompt, buildReviewPrompt, type ReviewAssistantGoal} from "../features/review-assistant";
import type {ReportSectionToggles} from "../view-preferences";
import {buildCustomSummaryContext, buildSummaryContext} from "../analytics";
import {dateKey, getActiveItemById, getEventById, getItemById, isScheduledToday, removeEvents, updateEventNote} from "../model";
import {currentCalendarDate, captureActionMoment, isValidLocalDateInput} from "../shared";
import {daysBetweenHalfOpen} from "../date-keys";
import {renderAnalysisDiffPanel} from "./analysis-diff";
import {renderAgentPreviewContent} from "./agent-preview";
import {buildSuggestionChange, createSuggestionEnvelope, type AgentSuggestion} from "../agent-suggestions";
import {createSuggestionWorkflow} from "../features/suggestion-workflow";
import {Dialog, showMessage} from "siyuan";
import {bindResponsiveCharts} from "../ui/responsive-charts";
import {readSurfaceContext, type InsightsRootContext, type ReviewRootContext} from "./page-shell";
import type {SaveOutcome} from "../download";

export interface BindPageNavigationHost {
    openReviewAgent(): boolean;
    store: import("../types").CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings" | "more";
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    /** T-1590 洞察范围会话态与项目搜索词（可选：旧桩按默认 84/空处理）。 */
    insightsRange?: "28" | "84" | "365" | "custom";
    insightsCustomRange?: {startDate: string; endDate: string};
    insightsItemQuery?: string;
    historyQuery: string;
    historySource: import("../features/history-filter").HistoryChannelFilter;
    /** T-1512 计量方式筛选（可选：旧桩缺省按 all 处理）。 */
    historyMetering?: import("../features/history-filter").HistoryMeteringFilter;
    historyOrder: "newest" | "oldest";
    historyScope: "day" | "period";
    historyItemId: string;
    historyPage: number;
    reviewWorkspace: "overview" | "records" | "analysis";
    reviewProjectPage: number;
    reviewProjectOrder: "attention" | "name";
    reviewTrend: "weekly" | "monthly" | "daily" | "yearly";
    reviewStrengthItemId: string;
    reviewAssistantGoal: ReviewAssistantGoal;
    heatmapYearOffset: number;
    selectedHistoryDate: string;
    historyBatchSelected: Set<string>;
    recordHistoryBatch(date: string, itemIds: string[], action: "record" | "skip", root?: HTMLElement): Promise<number>;
    archivedQuery: string;
    summaryRange: "day" | "week" | "month";
    summaryCustomRange?: {startDate: string; endDate: string};
    summaryText?: string;
    summaryError?: string;
    suggestionWorkflow?: import("../features/suggestion-workflow").SuggestionWorkflowState;
    handleSuggestionDecision(decision: "confirm" | "cancel"): Promise<void> | void;
    undoSuggestionWorkflow(): Promise<void> | void;
    persistSuggestionWorkflow(): Promise<void> | void;
    summaryRefreshing: boolean;
    analysisHistory: import("../agent-suggestions").AgentAnalysisSnapshot[];
    summaryRequestId: number;
    editingHistoryNoteId?: string;
    /** T-1510 展开中的记录事实详情（事件 id，会话态）。 */
    recordDetailsExpanded?: Set<string>;
    /** T-1511 批量补记预览状态与逐项实际值草稿（会话态）。 */
    historyBatchPreviewOpen?: boolean;
    historyBatchValues?: Record<string, string>;
    /** T-1517 横向比较选中的项目（会话态，2~4 个）。 */
    itemCompareSelection?: Set<string>;
    /** T-1578 比较器候选搜索词（会话态）。 */
    itemCompareQuery?: string;
    /** T-1518 周复盘草稿存取与导出（可选：旧桩缺省安全跳过）。 */
    saveWeeklyReviewDraft?(weekKey: string, friction: string, adjustment: string): Promise<void>;
    clearWeeklyReviewDraft?(weekKey: string): Promise<void>;
    exportWeeklyReviewMarkdown?(weekKey: string, friction: string, adjustment: string): Promise<SaveOutcome> | void;
    /** T-1511 提交实际数量补记（mutation 内重校验、整批回滚）。 */
    recordHistoryBatchEntries?(date: string, entries: ReadonlyArray<{itemId: string; value: number}>, root?: HTMLElement): Promise<number>;
    disposed: boolean;
    disposing: boolean;
    pageForRoot?(root: HTMLElement): string;
    returnPageForRoot?(root: HTMLElement): "today" | "review" | "insights" | "more" | undefined;
    reviewStateForRoot?(root: HTMLElement): ReviewRootContext;
    setReviewStateForRoot?(root: HTMLElement, patch: Partial<ReviewRootContext>): void;
    syncReviewCompatibilityForRoot?(root: HTMLElement): void;
    insightsStateForRoot?(root: HTMLElement): InsightsRootContext;
    setInsightsStateForRoot?(root: HTMLElement | undefined, patch: Partial<InsightsRootContext>): void;
    /** Persist a page-level preference with the same snapshot/rollback path as settings. */
    applyPreferenceMutation?(mutate: () => void, failure?: () => void): void;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showReview(root?: HTMLElement): void;
    /** T-1579：洞察行动入口——编辑规则（保留项目身份与返回页会话态）。 */
    showEditor(item?: import("../types").CheckinItem, returnTo?: "today" | "review" | "insights" | "more", root?: HTMLElement): void;
    jumpToHistoryDate(date: string, root?: HTMLElement): void;
    showToday(root?: HTMLElement): void;
    showArchived(root?: HTMLElement): void;
    showMore?(root?: HTMLElement): void;
    showOccasions(root?: HTMLElement): void;
    showInsights(item?: import("../types").CheckinItem, root?: HTMLElement): void;
    render(root?: HTMLElement): void;
    setArchivedQueryForRoot?(root: HTMLElement, value: string): void;
    persistViewPreferences(): Promise<void>;
    reviewFoldSections: Set<string>;
    reviewFoldTouched: boolean;
    changeHistoryMonth(offset: number, root?: HTMLElement): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    persist(): Promise<void>;
    invalidateSummary(): void;
    broadcast(event: unknown): void;
    renderBackgroundUpdate(): void;
    restoreItem(itemId: string): Promise<void>;
    restoreArchivedItems(itemIds: string[]): Promise<boolean> | void;
    deleteArchivedItem(itemId: string): Promise<boolean> | void;
    deleteArchivedItems(itemIds: string[]): Promise<boolean> | void;
    generateSummary(root?: HTMLElement): Promise<void> | void;
    cancelReviewSummary?(root?: HTMLElement): void;
    downloadExport(format: "json" | "csv", scopeDays?: number): Promise<SaveOutcome>;
    /** R-18.1（R-A18）：导出年度分享图（本地 canvas 生成 PNG，走既有保存通道）。 */
    downloadShareCard?(): void | Promise<void>;
    downloadReportMarkdown(markdown: string): Promise<SaveOutcome>;
    reportSections: ReportSectionToggles;
    /** T-1360 报告来源筛选："" = 全部来源。 */
    reportSource: string;
    /** T-1447：移动前端标记——回顾页滚动钉住（transform 同步）在移动端彻底停用。 */
    readonly isMobileFrontend: boolean;
    /** T-1432 · R-A8 命名保存视图。 */
    savedViews: Array<{id: string; name: string}>;
    activeSavedViewId?: string;
    applySavedView(id: string): void;
    saveCurrentView(name: string): void;
    deleteSavedView(id: string): void;
    /** T-1359 智能体项目草案与编辑器检查流。 */
    projectDrafts: import("../features/project-draft").ProjectDraft[];
    openProjectDraftEditor(draft: import("../features/project-draft").ProjectDraft, root?: HTMLElement): void;
    reminderFilter: import("../reminders").ReminderFilter;
    reminderUserAction(id: string, action: "snooze" | "skip" | "restore" | "defer"): void;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean, root?: HTMLElement): Promise<boolean>;
}

const pinnedSubnavScrollers = new WeakSet<HTMLElement>();
const initializedRhythmScrollers = new WeakSet<HTMLElement>();
/* The review surface root survives page redraws while its inner HTML is
   replaced.  Keep the delegated mobile-menu toggle listener one-per-root;
   otherwise every redraw adds another scroll correction callback and the
   menu visibly jumps/overscrolls after a few interactions. */
const reviewMoreMenuToggleListeners = new WeakMap<HTMLElement, EventListener>();

/** 回顾二级导航滚动钉住（D-159）：宿主界面缩放形成 zoom 子树后，合成器滚动
    不会重定位 position:sticky（Chromium 已知缺陷，真机实测滚动后导航条消失）。
    导航条因此保持 relative 布局，由滚动同步用 transform 主动钉在滚动区顶部，
    缩放与非缩放环境行为一致。返回同步函数供跳转点击在 scrollIntoView 后
    显式调用（其滚动事件可能不触发本监听）。 */
function pinReviewSubnavRail(root: HTMLElement, host: BindPageNavigationHost): () => void {
    /* Mobile hosts use the native page scroll path.  Applying a per-scroll
       transform to the review subnav there makes WebView compositing fight
       the touch gesture (the scroll position visibly oscillates and the page
       can no longer advance).  The transform workaround is only needed for
       zoomed desktop surfaces where sticky positioning is broken.
       T-1447：守卫改为「宿主显式标记优先」——不再依赖 class 是否恰好挂在
       当前 root 上（挂载路径差异会导致守卫失效、移动端照跑 transform 同步）。 */
    if (host.isMobileFrontend) {
        return () => undefined;
    }
    if (root.classList?.contains("lc-checkin-host--mobile") || root.classList?.contains("lc-checkin-dialog-host--mobile")) {
        return () => undefined;
    }
    const subnav = root.querySelector<HTMLElement>(".lc-checkin__review-subnav");
    const scroller = subnav?.closest<HTMLElement>(".lc-checkin");
    const sync = () => {
        if (host.disposed || host.disposing || !subnav || !subnav.isConnected || !scroller) return;
        subnav.style.transform = "";
        const anchor = subnav.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        const offset = scroller.scrollTop - anchor;
        if (offset > 0.5) subnav.style.transform = `translateY(${offset}px)`;
    };
    if (!subnav || !scroller) return sync;
    sync();
    if (!pinnedSubnavScrollers.has(scroller)) {
        pinnedSubnavScrollers.add(scroller);
        scroller.addEventListener("scroll", sync, {passive: true});
    }
    return sync;
}

export function bindPageNavigationHandlers(root: HTMLElement, host: BindPageNavigationHost): void {
    const pageForRoot = () => host.pageForRoot ? host.pageForRoot(root) : host.currentPage;
    /* 页面绑定可能在异步操作完成前被导航或卸载。捕获绑定时页面，
       让回调只写回仍连接且仍停留在同一页的 surface；宿主数据 mutation
       仍由 enqueueMutation 完成，避免把界面生命周期守门误当成数据回滚。 */
    const boundPage = pageForRoot();
    const isCurrentSurface = () => root.isConnected && !host.disposed && !host.disposing && pageForRoot() === boundPage;
    const reviewState = host.reviewStateForRoot?.(root);
    const insightsState = host.insightsStateForRoot?.(root);
    const insightValue = <K extends keyof InsightsRootContext>(key: K, fallback: InsightsRootContext[K]): InsightsRootContext[K] => insightsState ? insightsState[key] : fallback;
    const writeInsightValue = <K extends keyof InsightsRootContext>(key: K, value: InsightsRootContext[K]): void => {
        if (host.setInsightsStateForRoot) host.setInsightsStateForRoot(root, {[key]: value});
        else Object.assign(host, {[key]: value});
    };
    if (!reviewState) {
        host.historyBatchValues ??= {};
        host.itemCompareSelection ??= new Set<string>();
        host.recordDetailsExpanded ??= new Set<string>();
        host.itemCompareQuery ??= "";
    }
    const reviewValue = <K extends keyof ReviewRootContext>(key: K, fallback: ReviewRootContext[K]): ReviewRootContext[K] => reviewState ? reviewState[key] : fallback;
    const writeReviewValue = <K extends keyof ReviewRootContext>(key: K, value: ReviewRootContext[K]): ReviewRootContext[K] => {
        if (host.setReviewStateForRoot) host.setReviewStateForRoot(root, {[key]: value} as Partial<ReviewRootContext>);
        else (host as unknown as Record<string, unknown>)[key] = value;
        return value;
    };
    const applyPersistentMutation = (mutate: () => void, rollback: () => void = () => undefined): void => {
        if (host.applyPreferenceMutation) {
            host.applyPreferenceMutation(() => {
                mutate();
                host.syncReviewCompatibilityForRoot?.(root);
            }, rollback);
            return;
        }
        mutate();
        host.syncReviewCompatibilityForRoot?.(root);
        void host.persistViewPreferences().catch(rollback);
    };
    const writeArchivedQuery = (value: string) => {
        if (host.setArchivedQueryForRoot) host.setArchivedQueryForRoot(root, value);
        else host.archivedQuery = value;
    };
    bindResponsiveCharts(root);
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    const rhythm = root.querySelector<HTMLElement>(".review-rhythm-days");
    if (rhythm && !initializedRhythmScrollers.has(rhythm)) {
        initializedRhythmScrollers.add(rhythm);
        // Layout is available on the next frame. Only the strip scrolls, and
        // keyboard navigation or a detached page always wins over this default.
        window.requestAnimationFrame(() => {
            if (!rhythm.isConnected || host.disposed || host.disposing || pageForRoot() !== "review"
                || reviewValue("reviewWorkspace", host.reviewWorkspace) !== "overview" || rhythm.clientWidth <= 0
                || rhythm.contains(root.ownerDocument.activeElement)) return;
            rhythm.scrollLeft = rhythm.scrollWidth;
        });
    }
    const reviewScroller = () => root.querySelector<HTMLElement>(".lc-checkin--review");
    const renderReviewPreservingView = (focusSelector?: string, top = false): void => {
        const scrollTop = top ? 0 : (reviewScroller()?.scrollTop || 0);
        host.render(root);
        if (focusSelector) root.querySelector<HTMLElement>(focusSelector)?.focus({preventScroll: true});
        const scroller = reviewScroller();
        if (scroller) scroller.scrollTop = scrollTop;
        pinReviewSubnavRail(root, host)();
    };
    const renderReviewPage = (headingSelector: string): void => {
        renderReviewPreservingView();
        const heading = root.querySelector<HTMLElement>(headingSelector);
        const scroller = reviewScroller();
        if (!heading || !scroller) return;
        heading.tabIndex = -1;
        heading.focus({preventScroll: true});
        const railHeight = root.querySelector<HTMLElement>(".review-workspace-nav")?.getBoundingClientRect().height || 0;
        scroller.scrollTop = Math.max(0, heading.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - railHeight - 12);
        pinReviewSubnavRail(root, host)();
    };
    const recordActionStillFocused = (surface: HTMLElement | null, ...controls: Array<HTMLElement | null>): boolean => {
        return !host.disposed && !host.disposing && pageForRoot() === "review" && reviewValue("reviewWorkspace", host.reviewWorkspace) === "records"
            && Boolean(surface?.isConnected) && controls.some(control => control && control === root.ownerDocument.activeElement);
    };
    const restoreRecordActionFocus = (eventId?: string): void => {
        const target = (eventId ? root.querySelector<HTMLElement>(`[data-edit-history-event-id="${CSS.escape(eventId)}"]`) : undefined)
            || root.querySelector<HTMLElement>("[data-edit-history-event-id]")
            || root.querySelector<HTMLElement>(".lc-checkin__history-date > strong")
            || root.querySelector<HTMLElement>('[data-review-workspace="records"]');
        if (target) {
            if (target.tagName === "STRONG") target.tabIndex = -1;
            target.focus({preventScroll: true});
        }
        pinReviewSubnavRail(root, host)();
    };
    const rememberFoldDefaults = (): void => {
        if (reviewValue("reviewFoldTouched", host.reviewFoldTouched)) return;
        // Keep defaults in the other workspace as well as currently rendered
        // folds: interacting with analysis must not silently close overview.
        reviewValue("reviewFoldSections", host.reviewFoldSections).add("projects");
        reviewValue("reviewFoldSections", host.reviewFoldSections).add("trend");
        root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => {
            const id = details.dataset.reviewFold || "";
            if (details.open) reviewValue("reviewFoldSections", host.reviewFoldSections).add(id);
            else reviewValue("reviewFoldSections", host.reviewFoldSections).delete(id);
        });
    };
    /* Ignore the queued toggle from initial HTML insertion. Only an actual
       change to the observed open state is a preference or lazy-load action. */
    root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => {
        let observedOpen = details.open;
        details.addEventListener("toggle", () => {
            if (!details.isConnected || observedOpen === details.open) return;
            observedOpen = details.open;
            const id = details.dataset.reviewFold || "";
            const previousFolds = new Set(reviewValue("reviewFoldSections", host.reviewFoldSections));
            const previousTouched = reviewValue("reviewFoldTouched", host.reviewFoldTouched);
            applyPersistentMutation(() => {
                rememberFoldDefaults();
                if (details.open) reviewValue("reviewFoldSections", host.reviewFoldSections).add(id);
                else reviewValue("reviewFoldSections", host.reviewFoldSections).delete(id);
                writeReviewValue("reviewFoldTouched", true);
            }, () => {
                writeReviewValue("reviewFoldSections", previousFolds);
                writeReviewValue("reviewFoldTouched", previousTouched);
            });
            if (details.open && details.dataset.reviewLazy === "true") {
                renderReviewPreservingView(`[data-review-fold="${CSS.escape(id)}"] > summary`);
            }
        });
    });
    /* 逾期历史「展开全部」（T-117）：解除折叠容器的 hidden 并移除按钮。 */
    root.querySelector<HTMLElement>("[data-overdue-expand]")?.addEventListener("click", (event) => {
        (event.currentTarget as HTMLElement).remove();
        root.querySelector<HTMLElement>("[data-overdue-more]")?.removeAttribute("hidden");
    });
    /* 逾期历史一键补记（T-101）：把该次逾期标记为已完成，历史随之消掉。
       补记成功弹 6 秒可撤销提示条（T-110），撤销即回滚该次标记。 */
    const showCatchUpToast = (name: string, occasionId: string, date: string) => {
        if (!isCurrentSurface()) return;
        const surface = root.querySelector<HTMLElement>(".lc-checkin");
        if (!surface) return;
        surface.querySelector(".lc-checkin__catchup-toast")?.remove();
        const toast = document.createElement("div");
        toast.className = "lc-checkin__catchup-toast";
        const label = document.createElement("span");
        label.textContent = t("review.catchUpDone", {name, date});
        const undoButton = document.createElement("button");
        undoButton.type = "button";
        undoButton.className = "lc-checkin__small-button";
        undoButton.textContent = t("review.undo");
        undoButton.addEventListener("click", () => { toast.remove(); void host.enqueueMutation(() => host.setOccasionCompleted(occasionId, date, false, root)); });
        toast.append(label, undoButton);
        surface.appendChild(toast);
        window.setTimeout(() => { if (toast.isConnected) toast.remove(); }, 6000);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionId || "";
        const occurrenceDate = button.dataset.occasionDate || "";
        if (!id || !occurrenceDate) return;
        button.disabled = true;
        const name = button.closest<HTMLElement>("[data-overdue-occasion]")?.querySelector("strong")?.textContent || "";
        void host.enqueueMutation(() => host.setOccasionCompleted(id, occurrenceDate, true, root)).then((ok) => {
            if (ok && isCurrentSurface()) showCatchUpToast(name, id, occurrenceDate);
        }).finally(() => {
            if (isCurrentSurface() && button.isConnected) button.disabled = false;
        });
    }));
    /* T-1649：洞察筛选会替换整棵页面 DOM；动作来自键盘/读屏时，重绘后把焦点
       放回对应控件，避免范围、项目或日期编辑突然回到页面根节点。 */
    const renderInsightsPreservingFocus = (selector: string) => {
        const active = root.ownerDocument.activeElement;
        const shouldRestore = active instanceof HTMLElement && root.contains(active) && active.matches(selector);
        host.render(root);
        if (shouldRestore) root.querySelector<HTMLElement>(selector)?.focus({preventScroll: true});
    };
    root.querySelector<HTMLSelectElement>("[data-insight-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        /* T-1590：归档项目可选中回看（只读洞察，动作区提供「在归档中查看」）。 */
        if (!host.store.items.some((item) => item.id === itemId)) return;
        const previousItemId = insightValue("insightsItemId", host.insightsItemId);
        applyPersistentMutation(() => writeInsightValue("insightsItemId", itemId), () => writeInsightValue("insightsItemId", previousItemId));
        renderInsightsPreservingFocus("[data-insight-item]");
    });
    /* T-1590 洞察范围切换：会话态字段，切换只重渲染（项目/滚动由既有机制保持）。 */
    root.querySelectorAll<HTMLElement>("[data-insight-range]").forEach((button) => button.addEventListener("click", () => {
        const range = button.dataset.insightRange || "";
        if (range !== "28" && range !== "84" && range !== "365" && range !== "custom") return;
        writeInsightValue("insightsRange", range);
        renderInsightsPreservingFocus("[data-insight-range]");
    }));
    /* T-1590 自定义起止：日期合法、结束不晚于今日、起不晚于终——通过才写入会话态。 */
    for (const attribute of ["data-insight-range-start", "data-insight-range-end"] as const) {
        root.querySelector<HTMLInputElement>(`[${attribute}]`)?.addEventListener("change", (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const value = input.value || "";
            if (!isValidLocalDateInput(value) || value > dateKey(currentCalendarDate())) {
                input.value = insightValue("insightsCustomRange", host.insightsCustomRange)?.[attribute === "data-insight-range-start" ? "startDate" : "endDate"] || "";
                return;
            }
            const current = insightValue("insightsCustomRange", host.insightsCustomRange) || {startDate: value, endDate: value};
            const next = attribute === "data-insight-range-start"
                ? {startDate: value, endDate: value > current.endDate ? value : current.endDate}
                : {startDate: value < current.startDate ? value : current.startDate, endDate: value};
            if ((daysBetweenHalfOpen(next.startDate, next.endDate) ?? 0) >= 366) {
                input.value = current[attribute === "data-insight-range-start" ? "startDate" : "endDate"];
                showMessage(t("insights.rangeLimit"));
                return;
            }
            writeInsightValue("insightsCustomRange", next);
            writeInsightValue("insightsRange", "custom");
            renderInsightsPreservingFocus(`[${attribute}]`);
        });
    }
    /* T-1590 项目搜索：IME 组合态不打断（compareComposing 同款守卫），DOM 过滤 option 不重渲染。 */
    {
        let insightSearchComposing = false;
        const insightSearch = root.querySelector<HTMLInputElement>("[data-insight-item-search]");
        insightSearch?.addEventListener("compositionstart", () => { insightSearchComposing = true; });
        insightSearch?.addEventListener("compositionend", () => {
            insightSearchComposing = false;
            writeInsightValue("insightsItemQuery", insightSearch.value);
            const query = insightSearch.value.toLocaleLowerCase();
            root.querySelectorAll<HTMLElement>("[data-insight-item] option").forEach((option) => {
                option.hidden = Boolean(query) && !option.textContent?.toLocaleLowerCase().includes(query);
            });
        });
        insightSearch?.addEventListener("input", () => {
            if (insightSearchComposing || host.disposed || host.disposing) return;
            writeInsightValue("insightsItemQuery", insightSearch.value);
            const query = insightSearch.value.toLocaleLowerCase();
            root.querySelectorAll<HTMLElement>("[data-insight-item] option").forEach((option) => {
                option.hidden = Boolean(query) && !option.textContent?.toLocaleLowerCase().includes(query);
            });
        });
    }
    /* T-1590 归档项目动作：跳归档页并预填该项目名（恢复动作留在归档页——那里有重进排期预览确认）。 */
    root.querySelector<HTMLElement>("[data-insight-archived]")?.addEventListener("click", (event) => {
        const itemId = (event.currentTarget as HTMLElement).dataset.insightArchived || "";
        const item = host.store.items.find((candidate) => candidate.id === itemId);
        if (!item) return;
        writeArchivedQuery(item.name);
        host.showArchived(root);
    });
    /* T-1579：洞察行动入口——查看记录（带项目过滤直达记录区，返回页会话态保持）/
       编辑规则（showEditor 保留 editingId 项目身份）。 */
    root.querySelectorAll<HTMLElement>("[data-insight-records]").forEach((button) => button.addEventListener("click", (event) => {
        const itemId = (event.currentTarget as HTMLElement).dataset.insightRecords || "";
        if (!itemId || !host.store.items.some((item) => item.id === itemId && !item.archived)) return;
        writeReviewValue("historyItemId", itemId);
        writeReviewValue("historyPage", 0);
        writeReviewValue("historyBatchPreviewOpen", false);
        writeReviewValue("editingHistoryNoteId", undefined);
        writeReviewValue("reviewWorkspace", "records");
        writeInsightValue("insightsReturnPage", "review");
        host.showReview(root);
    }));
    root.querySelectorAll<HTMLElement>("[data-insight-edit-rules]").forEach((button) => button.addEventListener("click", (event) => {
        const itemId = (event.currentTarget as HTMLElement).dataset.insightEditRules || "";
        const item = host.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
        if (!item) return;
        host.showEditor(item, "insights", root);
    }));
    /* T-1649：洞察日期格使用 roving tabindex，避免长窗口的每一天都占一个 Tab 停靠点。
       方向键步进必须同时考虑 CSS 的列数与 grid-auto-flow：默认按行填充时左右
       走一格、上下走一列；窄屏按列填充时左右走一行、上下走一格。旧 WebView
       解析不到计算样式时回落到生产 CSS 的 14 列/7 行约定。保留原生 button；
       Enter/Space 仍由既有 click 钻取处理。 */
    const insightDayButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-insight-day]"));
    const setInsightDayTabStop = (target: HTMLButtonElement): void => {
        insightDayButtons.forEach((button) => { button.tabIndex = button === target ? 0 : -1; });
    };
    const findInsightDayByDirection = (button: HTMLButtonElement, key: string): HTMLButtonElement | undefined => {
        const grid = button.closest<HTMLElement>(".lc-checkin__insight-grid");
        const styles = grid ? getComputedStyle(grid) : undefined;
        const countTracks = (template: string, fallback: number): number => {
            const repeated = template.match(/^repeat\(\s*(\d+)\s*,/i);
            if (repeated) return Number(repeated[1]);
            const tokens = template.split(" ").filter(Boolean);
            return tokens.length > 1 ? tokens.length : fallback;
        };
        const columnCount = countTracks(styles?.gridTemplateColumns || "", 14);
        const rowCount = countTracks(styles?.gridTemplateRows || "", 7);
        const columnFlow = styles?.gridAutoFlow.includes("column") ?? false;
        const currentIndex = insightDayButtons.indexOf(button);
        if (currentIndex < 0) return undefined;
        if (key === "Home") return insightDayButtons[0];
        if (key === "End") return insightDayButtons[insightDayButtons.length - 1];
        const step = columnFlow
            ? (key === "ArrowLeft" || key === "ArrowRight" ? rowCount : 1)
            : (key === "ArrowLeft" || key === "ArrowRight" ? 1 : columnCount);
        const delta = key === "ArrowLeft" || key === "ArrowUp" ? -step : step;
        return insightDayButtons[currentIndex + delta];
    };
    insightDayButtons.forEach((button) => {
        button.addEventListener("focus", () => setInsightDayTabStop(button));
        button.addEventListener("keydown", (event) => {
            const key = event.key;
            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(key)) return;
            event.preventDefault();
            const target = findInsightDayByDirection(button, key);
            if (!target || target === button) return;
            setInsightDayTabStop(target);
            target.focus({preventScroll: true});
        });
    });
    /* T-1591：洞察日历格/周行钻取——同步项目过滤后跳记录页对应日期（周行落该周起始日，
       周视图由用户在记录页切换；selectedHistoryDate/historyScope 由 jumpToHistoryDate 统一处理）。 */
    for (const attribute of ["data-insight-day", "data-insight-week"]) {
        root.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((button) => button.addEventListener("click", () => {
            const date = button.dataset.insightDay || button.dataset.insightWeek || "";
            if (!isValidLocalDateInput(date) || date > dateKey(currentCalendarDate())) return;
            writeReviewValue("historyItemId", insightValue("insightsItemId", host.insightsItemId) || "");
            writeReviewValue("historyPage", 0);
            writeReviewValue("historyBatchPreviewOpen", false);
            writeReviewValue("editingHistoryNoteId", undefined);
            host.jumpToHistoryDate(date, root);
        }));
    }
    root.querySelector<HTMLSelectElement>("[data-reminder-filter]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "overdue" || value === "today" || value === "upcoming" || value === "completed") {
            writeReviewValue("reminderFilter", value);
            host.render(root);
        }
    });
    /* 11.0-C 提醒延期/跳过/恢复：动作交回宿主（持久化 + 重渲染），按钮本身无状态。 */
    root.querySelectorAll<HTMLButtonElement>("[data-reminder-action]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.reminderId || "";
        const action = button.dataset.reminderAction;
        if (!id || (action !== "snooze" && action !== "skip" && action !== "restore" && action !== "defer")) return;
        host.reminderUserAction(id, action);
    }));
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => {
        /* Archived can be opened from Review, Insights, or More. Keep that
           one-hop source on the root so Back returns to the user's context
           instead of always dropping them on Today. */
        if (pageForRoot() === "archived") {
            const returnPage = host.returnPageForRoot?.(root) ?? "today";
            if (returnPage === "review") { host.showReview(root); return; }
            if (returnPage === "insights") { host.showInsights(undefined, root); return; }
            if (returnPage === "more") { host.showMore?.(root); return; }
            host.showToday(root);
            return;
        }
        /* T-1576：返回路径统一走 SurfaceContext 读侧——insights 会话返回栈优先，其余按默认返回表回落 today。 */
        if (root.dataset.moreActive === "true") { host.showMore?.(root); return; }
        const context = readSurfaceContext({...host, ...insightsState, currentPage: pageForRoot() as BindPageNavigationHost["currentPage"]});
        if (context.page === "insights" && context.returnTo === "review") host.showReview(root);
        else host.showToday(root);
    });
    /* Review workspace controls intentionally keep their state in the session,
       while the section folds below are persisted view preferences. */
    const activateWorkspace = (workspace: BindPageNavigationHost["reviewWorkspace"]) => {
        writeReviewValue("reviewWorkspace", workspace);
        writeReviewValue("historyPage", 0);
        writeReviewValue("reviewProjectPage", 0);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView(`[data-review-workspace="${workspace}"]`, true);
    };
    root.querySelectorAll<HTMLElement>("[data-review-workspace]").forEach((button) => button.addEventListener("click", () => {
        const workspace = button.dataset.reviewWorkspace;
        if (workspace === "overview" || workspace === "records" || workspace === "analysis") activateWorkspace(workspace);
    }));
    root.querySelectorAll<HTMLElement>("[data-history-scope]").forEach((control) => control.addEventListener(control.tagName === "SELECT" ? "change" : "click", () => {
        const value = control.tagName === "SELECT" ? (control as HTMLSelectElement).value : control.dataset.historyScope;
        if (value !== "day" && value !== "period") return;
        writeReviewValue("historyScope", value);
        reviewValue("historyBatchSelected", host.historyBatchSelected)?.clear();
        writeReviewValue("historyBatchPreviewOpen", false);
        writeReviewValue("historyPage", 0);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView(control.tagName === "SELECT" ? "select[data-history-scope]" : `[data-history-scope="${value}"]`);
    }));
    root.querySelector<HTMLSelectElement>("[data-history-item]")?.addEventListener("change", (event) => {
        writeReviewValue("historyItemId", (event.currentTarget as HTMLSelectElement).value);
        writeReviewValue("historyPage", 0);
        writeReviewValue("historyBatchPreviewOpen", false);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView("[data-history-item]");
    });
    root.querySelectorAll<HTMLElement>("[data-history-page]").forEach((button) => button.addEventListener("click", () => {
        const page = Number(button.dataset.historyPage);
        if (!Number.isInteger(page) || page < 0) return;
        writeReviewValue("historyPage", page);
        writeReviewValue("historyBatchPreviewOpen", false);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPage(".lc-checkin__history-date > strong");
    }));
    root.querySelector<HTMLSelectElement>("[data-review-project-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value !== "attention" && value !== "name") return;
        writeReviewValue("reviewProjectOrder", value);
        writeReviewValue("reviewProjectPage", 0);
        renderReviewPreservingView("[data-review-project-order]");
    });
    root.querySelectorAll<HTMLElement>("[data-review-project-page]").forEach((button) => button.addEventListener("click", () => {
        const page = Number(button.dataset.reviewProjectPage);
        if (!Number.isInteger(page) || page < 0) return;
        writeReviewValue("reviewProjectPage", page);
        renderReviewPage('[data-review-fold="projects"] > summary');
    }));
    root.querySelectorAll<HTMLElement>("[data-review-trend]").forEach((button) => button.addEventListener(button.tagName === "SELECT" ? "change" : "click", () => {
        const value = button.tagName === "SELECT" ? (button as HTMLSelectElement).value : button.dataset.reviewTrend;
        if (value !== "weekly" && value !== "monthly" && value !== "daily" && value !== "yearly") return;
        writeReviewValue("reviewTrend", value);
        renderReviewPreservingView(button.tagName === "SELECT" ? "select[data-review-trend]" : `[data-review-trend="${value}"]`);
    }));
    root.querySelector<HTMLSelectElement>("[data-review-strength-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        if (itemId && !host.store.items.some((item) => item.id === itemId)) return;
        writeReviewValue("reviewStrengthItemId", itemId);
        renderReviewPreservingView("[data-review-strength-item]");
    });
    root.querySelector<HTMLSelectElement>("[data-review-assistant-goal]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value !== "summary" && value !== "patterns" && value !== "plan") return;
        writeReviewValue("reviewAssistantGoal", value);
        renderReviewPreservingView("[data-review-assistant-goal]");
    });
    root.querySelectorAll<HTMLElement>("[data-action='review-assistant']").forEach(button => button.addEventListener("click", () => {
        const previousFolds = new Set(reviewValue("reviewFoldSections", host.reviewFoldSections));
        const previousTouched = reviewValue("reviewFoldTouched", host.reviewFoldTouched);
        applyPersistentMutation(() => {
            rememberFoldDefaults();
            writeReviewValue("reviewWorkspace", "overview");
            reviewValue("reviewFoldSections", host.reviewFoldSections).add("report");
            writeReviewValue("reviewFoldTouched", true);
        }, () => {
            writeReviewValue("reviewFoldSections", previousFolds);
            writeReviewValue("reviewFoldTouched", previousTouched);
        });
        renderReviewPage('[data-review-fold="report"] > summary');
        root.querySelector<HTMLElement>("[data-review-assistant-goal]")?.focus({preventScroll: true});
    }));
    /* T-1516：分母明细日期跳记录——沿用 jumpToHistoryDate 通道，
       不清空既有筛选/排序（与节奏日跳转的清筛选行为不同）。 */
    /* T-1517：横向比较项目选择（至多 4 个；键盘原生可用；移除即时重渲染）。 */
    root.querySelectorAll<HTMLInputElement>("[data-item-compare-toggle]").forEach((input) => input.addEventListener("change", () => {
        const id = input.dataset.itemCompareToggle || "";
        if (!id) return;
        const selection = reviewValue("itemCompareSelection", host.itemCompareSelection ?? new Set<string>()) ?? (writeReviewValue("itemCompareSelection", new Set()));
        if (input.checked) {
            if (selection.size >= 4) {
                input.checked = false;
                return;
            }
            selection.add(id);
        } else selection.delete(id);
        renderReviewPreservingView("[data-item-compare-toggle]");
    }));
    /* T-1578：比较器候选搜索——IME 安全防抖（镜像历史搜索模式），查询写入会话态；
       清除按钮复位查询并保持焦点位置。 */
    const compareSearch = root.querySelector<HTMLInputElement>("[data-item-compare-search]");
    let compareSearchTimer: number | undefined;
    let compareComposing = false;
    const applyCompareSearch = () => {
        if (!compareSearch) return;
        if (compareSearchTimer !== undefined) window.clearTimeout(compareSearchTimer);
        compareSearchTimer = window.setTimeout(() => {
            compareSearchTimer = undefined;
            const value = compareSearch.value;
            if (compareComposing || host.disposed || host.disposing || pageForRoot() !== "review" || reviewValue("reviewWorkspace", host.reviewWorkspace) !== "analysis"
                || !compareSearch.isConnected || root.querySelector("[data-item-compare-search]") !== compareSearch) return;
            writeReviewValue("itemCompareQuery", value);
            renderReviewPreservingView("[data-item-compare-search]");
            const nextSearch = root.querySelector<HTMLInputElement>("[data-item-compare-search]");
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    };
    compareSearch?.addEventListener("compositionstart", () => { compareComposing = true; });
    compareSearch?.addEventListener("compositionend", () => { compareComposing = false; applyCompareSearch(); });
    compareSearch?.addEventListener("input", (event) => {
        if (compareComposing || (event as InputEvent).isComposing) return;
        applyCompareSearch();
    });
    root.querySelector<HTMLElement>("[data-action='clear-item-compare-query']")?.addEventListener("click", () => {
        writeReviewValue("itemCompareQuery", "");
        renderReviewPreservingView("[data-item-compare-search]");
        root.querySelector<HTMLInputElement>("[data-item-compare-search]")?.focus({preventScroll: true});
    });
    /* T-1518：周复盘向导——保存草稿（不清输入）、导出 Markdown、清除本周草稿。
       T-1620：保存/清除失败在状态行给出可见反馈（宿主侧已回滚内存草稿），
       输入框内容原样保留作为可重试草稿，不静默。 */
    let weeklyActionBusy = false;
    const runWeeklyTool = (operation: () => Promise<unknown> | unknown, after?: (result: unknown) => void, failed?: () => void) => {
        if (weeklyActionBusy) return;
        weeklyActionBusy = true;
        const controls = [...root.querySelectorAll<HTMLButtonElement>("[data-weekly-save], [data-weekly-export], [data-weekly-ai-copy], [data-weekly-clear]")];
        const fields = [...root.querySelectorAll<HTMLTextAreaElement>("[data-weekly-friction], [data-weekly-adjustment]")];
        const disabledBefore = new Map(controls.map(control => [control, control.disabled]));
        const fieldsDisabledBefore = new Map(fields.map(field => [field, field.disabled]));
        controls.forEach(control => { control.disabled = true; control.setAttribute("aria-busy", "true"); });
        fields.forEach(field => { field.disabled = true; });
        Promise.resolve().then(operation).then((result) => {
            if (isCurrentSurface()) after?.(result);
        }).catch(() => { if (isCurrentSurface()) failed?.(); }).finally(() => {
            weeklyActionBusy = false;
            if (!isCurrentSurface()) return;
            controls.forEach(control => {
                if (!control.isConnected) return;
                control.removeAttribute("aria-busy");
                control.disabled = disabledBefore.get(control) ?? false;
            });
            fields.forEach(field => {
                if (!field.isConnected) return;
                field.disabled = fieldsDisabledBefore.get(field) ?? false;
            });
        });
    };
    root.querySelector<HTMLElement>("[data-weekly-save]")?.addEventListener("click", (event) => {
        const container = root.querySelector<HTMLElement>("[data-weekly-key]");
        const weekKey = container?.dataset.weeklyKey || "";
        if (!weekKey) return;
        const friction = root.querySelector<HTMLTextAreaElement>("[data-weekly-friction]")?.value || "";
        const adjustment = root.querySelector<HTMLTextAreaElement>("[data-weekly-adjustment]")?.value || "";
        if (!host.saveWeeklyReviewDraft) return;
        runWeeklyTool(() => host.saveWeeklyReviewDraft?.(weekKey, friction, adjustment), () => {
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = t("review.weeklySaved");
        }, () => {
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = t("review.weeklySaveFail");
        });
    });
    root.querySelector<HTMLElement>("[data-weekly-export]")?.addEventListener("click", (event) => {
        const container = root.querySelector<HTMLElement>("[data-weekly-key]");
        const weekKey = container?.dataset.weeklyKey || "";
        if (!weekKey) return;
        const friction = root.querySelector<HTMLTextAreaElement>("[data-weekly-friction]")?.value || "";
        const adjustment = root.querySelector<HTMLTextAreaElement>("[data-weekly-adjustment]")?.value || "";
        if (!host.exportWeeklyReviewMarkdown) return;
        runWeeklyTool(() => host.exportWeeklyReviewMarkdown?.(weekKey, friction, adjustment), (outcome) => {
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = t(outcome === "failed" ? "review.weeklyExportFail" : "review.weeklyExported");
        }, () => {
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = t("review.weeklyExportFail");
        });
    });
    /* T-1539：复制 AI 复盘提示词——本地统计事实+草稿现值组装自足提示词写剪贴板；
       零网络、零模型依赖、不写事件；草稿未保存也可复制（取输入框现值）。 */
    root.querySelector<HTMLElement>("[data-weekly-ai-copy]")?.addEventListener("click", (event) => {
        if (weeklyActionBusy) return;
        const friction = root.querySelector<HTMLTextAreaElement>("[data-weekly-friction]")?.value || "";
        const adjustment = root.querySelector<HTMLTextAreaElement>("[data-weekly-adjustment]")?.value || "";
        runWeeklyTool(async () => {
            const asOf = currentCalendarDate();
            const summaryCustomRange = reviewValue("summaryCustomRange", host.summaryCustomRange);
            const summaryRange = reviewValue("summaryRange", host.summaryRange);
            const summary = summaryCustomRange ? buildCustomSummaryContext(host.store, summaryCustomRange, asOf) : buildSummaryContext(host.store, summaryRange, asOf);
            const prompt = buildAiReviewPrompt({
                startDate: summary.startDate,
                endDate: summary.endDate,
                totalEvents: summary.totalEvents,
                completedItems: summary.completedItems,
                scheduledItems: summary.scheduledItems,
                itemLines: summary.items.slice(0, 5).map((entry) => `${entry.name} · ${entry.completedDays}/${entry.scheduledDays} ${t("review.weeklyDays")}`),
                friction,
                adjustment,
                headings: {facts: t("review.weeklyStepFacts"), friction: t("review.weeklyStepFriction"), adjustment: t("review.weeklyStepAdjust")},
            });
            try {
                await navigator.clipboard.writeText(prompt);
                if (!isCurrentSurface()) return;
                showMessage(t("review.aiCopied"));
            } catch {
                if (!isCurrentSurface()) return;
                showMessage(t("msg.clipboardFail"));
            }
        });
    });
    root.querySelector<HTMLElement>("[data-weekly-clear]")?.addEventListener("click", (event) => {
        const container = root.querySelector<HTMLElement>("[data-weekly-key]");
        const weekKey = container?.dataset.weeklyKey || "";
        if (!weekKey) return;
        if (!host.clearWeeklyReviewDraft) return;
        runWeeklyTool(() => host.clearWeeklyReviewDraft?.(weekKey), () => {
            const friction = root.querySelector<HTMLTextAreaElement>("[data-weekly-friction]");
            const adjustment = root.querySelector<HTMLTextAreaElement>("[data-weekly-adjustment]");
            if (friction) friction.value = "";
            if (adjustment) adjustment.value = "";
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = "";
        }, () => {
            const status = root.querySelector<HTMLElement>("[data-weekly-status]");
            if (status) status.textContent = t("review.weeklyClearFail");
        });
    });
    root.querySelectorAll<HTMLElement>("[data-denominator-date]").forEach((button) => button.addEventListener("click", () => {
        const date = button.dataset.denominatorDate || "";
        if (!isValidLocalDateInput(date) || date > dateKey(currentCalendarDate())) return;
        host.jumpToHistoryDate(date, root);
    }));
    root.querySelectorAll<HTMLElement>("[data-review-rhythm-date]").forEach(button => button.addEventListener("click", () => {
        const date = button.dataset.reviewRhythmDate || "";
        if (!isValidLocalDateInput(date) || date > dateKey(currentCalendarDate())) return;
        writeReviewValue("historyQuery", "");
        writeReviewValue("historySource", "all");
        writeReviewValue("historyMetering", "all");
        writeReviewValue("historyItemId", "");
        writeReviewValue("historyOrder", "newest");
        host.jumpToHistoryDate(date, root);
        const heading = root.querySelector<HTMLElement>(".lc-checkin__history-date > strong");
        if (heading) {
            heading.tabIndex = -1;
            heading.focus({preventScroll: true});
            heading.scrollIntoView({block: "center", behavior: "instant"});
            pinReviewSubnavRail(root, host)();
        }
    }));
    root.querySelectorAll<HTMLElement>("[data-heatmap-year]").forEach((button) => button.addEventListener("click", (event) => {
        event.stopPropagation();
        const offset = Number(button.dataset.heatmapYear);
        if (offset === -1) writeReviewValue("heatmapYearOffset", reviewValue("heatmapYearOffset", host.heatmapYearOffset) - 1);
        else if (offset === 1 && reviewValue("heatmapYearOffset", host.heatmapYearOffset) < 0) writeReviewValue("heatmapYearOffset", reviewValue("heatmapYearOffset", host.heatmapYearOffset) + 1);
        else return;
        renderReviewPreservingView(`[data-heatmap-year="${offset}"]`);
    }));
    root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => host.showArchived(root));
    root.querySelector<HTMLElement>("[data-action='occasions']")?.addEventListener("click", () => host.showOccasions(root));
    root.querySelectorAll<HTMLElement>("[data-review-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.reviewInsightsId);
        if (item) host.showInsights(item, root);
    }));
    /* 跳转按 fold id 定位：区块列表里混有年度热力图 details，按下标取会整体
       错位一位（真机实测"趋势"跳到提醒）。瞬时滚动确保钉住同步立即生效。 */
    /* 跳转按 fold id 定位：区块列表里混有年度热力图 details，按下标取会整体
       错位一位（真机实测"趋势"跳到提醒）。不用 scrollIntoView——其滚动落地
       是异步的，钉住同步会拿到旧位置（真机实测 transform 滞后 1058px）；
       这里同步直写 scroller.scrollTop，随后显式同步钉住。 */
    const syncSubnavPin = pinReviewSubnavRail(root, host);
    root.querySelectorAll<HTMLElement>("[data-review-jump]").forEach((button) => button.addEventListener("click", () => {
        const foldId = button.dataset.reviewJump || "";
        const selector = `details[data-review-fold="${CSS.escape(foldId)}"]`;
        let target = root.querySelector<HTMLDetailsElement>(selector);
        if (!target) return;
        const previousFolds = new Set(reviewValue("reviewFoldSections", host.reviewFoldSections));
        const previousTouched = reviewValue("reviewFoldTouched", host.reviewFoldTouched);
        applyPersistentMutation(() => {
            rememberFoldDefaults();
            reviewValue("reviewFoldSections", host.reviewFoldSections).add(foldId);
            writeReviewValue("reviewFoldTouched", true);
        }, () => {
            writeReviewValue("reviewFoldSections", previousFolds);
            writeReviewValue("reviewFoldTouched", previousTouched);
        });
        if (target.dataset.reviewLazy === "true") {
            renderReviewPreservingView(`${selector} > summary`);
            target = root.querySelector<HTMLDetailsElement>(selector);
        }
        const scroller = target?.closest<HTMLElement>(".lc-checkin");
        if (!target || !scroller) return;
        target.open = true;
        const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
        scroller.scrollTop = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - margin;
        syncSubnavPin();
    }));
    root.querySelectorAll<HTMLElement>("[data-history-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.historyInsightsId);
        if (item) host.showInsights(item, root);
    }));
    const historySearch = root.querySelector<HTMLInputElement>("[data-history-search]");
    let historySearchTimer: number | undefined;
    let historyComposing = false;
    const cancelHistorySearch = () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        historySearchTimer = undefined;
    };
    const applyHistorySearch = () => {
        if (!historySearch) return;
        cancelHistorySearch();
        const value = historySearch.value;
        const workspace = reviewValue("reviewWorkspace", host.reviewWorkspace);
        historySearchTimer = window.setTimeout(() => {
            historySearchTimer = undefined;
            if (historyComposing || host.disposed || host.disposing || pageForRoot() !== "review" || reviewValue("reviewWorkspace", host.reviewWorkspace) !== workspace
                || !historySearch.isConnected || root.querySelector("[data-history-search]") !== historySearch) return;
            writeReviewValue("historyQuery", value);
            writeReviewValue("historyPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView("[data-history-search]");
            const nextSearch = root.querySelector<HTMLInputElement>("[data-history-search]");
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    };
    historySearch?.addEventListener("compositionstart", () => { historyComposing = true; cancelHistorySearch(); });
    historySearch?.addEventListener("compositionend", () => { historyComposing = false; applyHistorySearch(); });
    historySearch?.addEventListener("input", (event) => {
        if (historyComposing || (event as InputEvent).isComposing) cancelHistorySearch();
        else applyHistorySearch();
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-query']")?.addEventListener("click", () => {
        cancelHistorySearch();
        writeReviewValue("historyQuery", "");
        writeReviewValue("historyPage", 0);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView("[data-history-search]");
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-filters']")?.addEventListener("click", () => {
        cancelHistorySearch();
        writeReviewValue("historyQuery", "");
        writeReviewValue("historySource", "all");
        writeReviewValue("historyMetering", "all");
        writeReviewValue("historyOrder", "newest");
        writeReviewValue("historyItemId", "");
        writeReviewValue("historyPage", 0);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView("[data-history-search]");
    });
    /* T-1512：渠道细筛值含 api 登记渠道（api:health 等）；计量方式独立筛选。 */
    const HISTORY_CHANNEL_VALUES: ReadonlySet<string> = new Set(["all", "manual", "tomato", "import", "api", "api:health", "api:notequery", "api:taskhorizon", "api:other", "sireader", "siplayer", "weread", "yeguif"]);
    const HISTORY_METERING_VALUES: ReadonlySet<string> = new Set(["all", "session", "daily", "other"]);
    root.querySelector<HTMLSelectElement>("[data-history-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (HISTORY_CHANNEL_VALUES.has(value)) {
            writeReviewValue("historySource", value as import("../features/history-filter").HistoryChannelFilter);
            writeReviewValue("historyPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView("[data-history-source]");
        }
    });
    root.querySelector<HTMLSelectElement>("[data-history-metering]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (HISTORY_METERING_VALUES.has(value)) {
            writeReviewValue("historyMetering", value as import("../features/history-filter").HistoryMeteringFilter);
            writeReviewValue("historyPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView("[data-history-metering]");
        }
    });
    root.querySelector<HTMLSelectElement>("[data-history-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "newest" || value === "oldest") {
            writeReviewValue("historyOrder", value);
            writeReviewValue("historyPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView("[data-history-order]");
        }
    });
    root.querySelectorAll<HTMLElement>("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
        const scrollTop = reviewScroller()?.scrollTop || 0;
        writeReviewValue("historyPage", 0);
        writeReviewValue("historyScope", "day");
        writeReviewValue("editingHistoryNoteId", undefined);
        host.changeHistoryMonth(Number(button.dataset.historyMonth), root);
        root.querySelector<HTMLElement>(`[data-history-month="${button.dataset.historyMonth}"]`)?.focus({preventScroll: true});
        const scroller = reviewScroller();
        if (scroller) scroller.scrollTop = scrollTop;
    }));
    root.querySelectorAll<HTMLElement>("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
        const value = button.dataset.historyDate;
        if (value) {
            writeReviewValue("selectedHistoryDate", value);
            reviewValue("historyBatchSelected", host.historyBatchSelected)?.clear();
            writeReviewValue("historyBatchPreviewOpen", false);
            writeReviewValue("historyScope", "day");
            writeReviewValue("historyPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView(`[data-history-date="${CSS.escape(value)}"]`);
        }
    }));
    root.querySelectorAll<HTMLInputElement>("[data-history-batch-item]").forEach((input) => input.addEventListener("change", () => {
        const id = input.dataset.historyBatchItem;
        if (!id) return;
        const selected = new Set(reviewValue("historyBatchSelected", host.historyBatchSelected));
        if (input.checked) selected.add(id);
        else selected.delete(id);
        writeReviewValue("historyBatchSelected", selected);
        root.querySelectorAll<HTMLButtonElement>("[data-history-batch-action]").forEach((button) => { button.disabled = reviewValue("historyBatchSelected", host.historyBatchSelected).size === 0; });
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-history-batch-action]").forEach((button) => button.addEventListener("click", async () => {
        const action = button.dataset.historyBatchAction;
        if (action !== "record" && action !== "skip" || !reviewValue("historyBatchSelected", host.historyBatchSelected).size) return;
        if (action === "record") {
            /* T-1511：补记先进入预览面板（分类解释 + 逐项实际值），不再直接确认提交。 */
            writeReviewValue("historyBatchPreviewOpen", true);
            renderReviewPreservingView("[data-batch-preview]");
            return;
        }
        const ids = [...reviewValue("historyBatchSelected", host.historyBatchSelected)];
        if (!window.confirm(t("review.batchConfirm", {n: ids.length, action: t("review.batchSkip")}))) return;
        button.textContent = t("review.batchWorking");
        button.setAttribute("aria-busy", "true");
        root.querySelectorAll<HTMLButtonElement>("[data-history-batch-action]").forEach((control) => { control.disabled = true; });
        root.querySelectorAll<HTMLInputElement>("[data-history-batch-item]").forEach((control) => { control.disabled = true; });
        try {
            const count = await host.recordHistoryBatch(reviewValue("selectedHistoryDate", host.selectedHistoryDate), ids, action, root);
            if (!isCurrentSurface()) return;
            showMessage(count ? t("review.batchDone", {n: count}) : t("review.batchNoop"));
            renderReviewPage("[data-history-batch-item]");
        } catch {
            if (!isCurrentSurface()) return;
            showMessage(t("msg.saveFail"));
            renderReviewPreservingView("[data-history-batch-action='skip']");
        }
    }));
    /* T-1511 预览面板：实际值输入（input 只更新草稿不重渲染防打断输入；
       change 时重渲染刷新可提交计数）、提交重校验、取消清草稿。 */
    root.querySelectorAll<HTMLInputElement>("[data-batch-value]").forEach((input) => {
        const itemId = input.dataset.batchValue || "";
        input.addEventListener("input", () => {
            if (!itemId) return;
            writeReviewValue("historyBatchValues", {...reviewValue("historyBatchValues", host.historyBatchValues ?? {}), [itemId]: input.value});
        });
        input.addEventListener("change", () => {
            if (!itemId) return;
            writeReviewValue("historyBatchValues", {...reviewValue("historyBatchValues", host.historyBatchValues ?? {}), [itemId]: input.value});
            renderReviewPreservingView(`[data-batch-value="${CSS.escape(itemId)}"]`);
        });
    });
    root.querySelector<HTMLButtonElement>("[data-batch-submit]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        if (button.disabled || button.dataset.busy === "true") return;
        const entries = Object.entries(reviewValue("historyBatchValues", host.historyBatchValues ?? {}) || {})
            .filter(([itemId]) => reviewValue("historyBatchSelected", host.historyBatchSelected).has(itemId))
            .map(([itemId, raw]) => ({itemId, value: raw}))
            .filter((entry) => entry.value.trim() !== "")
            .map((entry) => ({itemId: entry.itemId, value: Number(entry.value)}))
            .filter((entry) => Number.isFinite(entry.value));
        /* 二值条目没有输入框：按固定 1 提交。 */
        for (const itemId of reviewValue("historyBatchSelected", host.historyBatchSelected)) {
            if (!entries.some((entry) => entry.itemId === itemId) && !root.querySelector(`[data-batch-value="${CSS.escape(itemId)}"]`)) entries.push({itemId, value: 1});
        }
        const expected = Number(button.dataset.readyCount || entries.length);
        if (!expected || !entries.length) return;
        if (!window.confirm(t("review.batchSubmitConfirm", {n: expected}))) return;
        const controls = [button, root.querySelector<HTMLButtonElement>("[data-batch-cancel]")]
            .filter((control): control is HTMLButtonElement => Boolean(control));
        const valueInputs = [...root.querySelectorAll<HTMLInputElement>("[data-batch-value]")];
        const inputDisabledBefore = new Map(valueInputs.map((input) => [input, input.disabled]));
        controls.forEach((control) => { control.disabled = true; control.setAttribute("aria-busy", "true"); });
        valueInputs.forEach((input) => { input.disabled = true; });
        button.dataset.busy = "true";
        try {
            const count = await host.recordHistoryBatchEntries?.(reviewValue("selectedHistoryDate", host.selectedHistoryDate), entries, root);
            if (!isCurrentSurface()) return;
            showMessage(count ? t("review.batchDone", {n: count}) : t("review.batchNoop"));
            renderReviewPage("[data-history-batch-item]");
        } catch {
            if (!isCurrentSurface()) return;
            showMessage(t("msg.saveFail"));
            renderReviewPreservingView("[data-batch-submit]");
        } finally {
            if (!isCurrentSurface()) return;
            controls.forEach((control) => {
                if (!control.isConnected) return;
                control.disabled = false;
                control.removeAttribute("aria-busy");
            });
            valueInputs.forEach((input) => {
                if (!input.isConnected) return;
                input.disabled = inputDisabledBefore.get(input) ?? false;
            });
            delete button.dataset.busy;
        }
    });
    root.querySelector<HTMLButtonElement>("[data-batch-cancel]")?.addEventListener("click", () => {
        writeReviewValue("historyBatchPreviewOpen", false);
        writeReviewValue("historyBatchValues", {});
        renderReviewPreservingView("[data-history-batch-item]");
    });
    root.querySelectorAll<HTMLElement>("[data-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const eventId = button.dataset.historyEventId;
        const event = getEventById(host.store, eventId);
        if (!event) return;
        const moment = captureActionMoment();
        const surface = reviewScroller();
        const visibleIds = [...root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]")].map(control => control.dataset.editHistoryEventId);
        const recordIndex = visibleIds.indexOf(event.id);
        const nextFocusId = visibleIds[recordIndex + 1] || visibleIds[recordIndex - 1];
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = removeEvents(host.store, [event], moment.occurredAt);
            if (next === host.store) return;
            host.store = next;
            try { await host.persist(); } catch {
                host.store = previous;
                if (isCurrentSurface()) showMessage(t("msg.undoFail"));
                return;
            }
            if (reviewValue("editingHistoryNoteId", host.editingHistoryNoteId) === event.id) writeReviewValue("editingHistoryNoteId", undefined);
            host.invalidateSummary();
            host.broadcast({type: "event-deleted", item: getItemById(host.store, event.itemId), deletedEvents: [event]});
            const restoreFocus = isCurrentSurface() && recordActionStillFocused(surface, button);
            host.renderBackgroundUpdate();
            if (restoreFocus) restoreRecordActionFocus(nextFocusId);
        });
    }));
    root.querySelector<HTMLElement>("[data-history-expand]")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const extra = root.querySelector<HTMLElement>("[data-history-extra]");
        if (!extra) return;
        extra.hidden = false;
        button.remove();
    });
    root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]").forEach((button) => button.addEventListener("click", () => {
        const event = getEventById(host.store, button.dataset.editHistoryEventId);
        if (!event) return;
        writeReviewValue("editingHistoryNoteId", event.id);
        renderReviewPreservingView();
        const input = root.querySelector<HTMLTextAreaElement>(`[data-history-note-input="${CSS.escape(event.id)}"]`);
        if (input) {
            let ancestor = input.parentElement;
            while (ancestor && ancestor !== root) {
                if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
                ancestor = ancestor.parentElement;
            }
            input.focus({preventScroll: true});
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }));
    /* T-1510 记录事实详情：切换展开集合并重渲染；焦点经 renderReviewPreservingView
       回到同一切换按钮，滚动位置保持。展开集有界（50），不触碰事件存储。 */
    root.querySelectorAll<HTMLElement>("[data-record-details]").forEach((button) => button.addEventListener("click", () => {
        const eventId = button.dataset.recordDetails || "";
        if (!eventId || !getEventById(host.store, eventId)) return;
        const expanded = reviewValue("recordDetailsExpanded", host.recordDetailsExpanded ?? new Set<string>()) ?? (writeReviewValue("recordDetailsExpanded", new Set<string>()));
        if (expanded.has(eventId)) {
            expanded.delete(eventId);
        } else {
            if (expanded.size >= 50) expanded.clear();
            expanded.add(eventId);
            writeReviewValue("editingHistoryNoteId", undefined);
        }
        renderReviewPreservingView(`[data-record-details="${CSS.escape(eventId)}"]`);
    }));
    root.querySelectorAll<HTMLElement>("[data-save-history-note-id]").forEach((button) => button.addEventListener("click", () => {
        const event = getEventById(host.store, button.dataset.saveHistoryNoteId);
        const input = root.querySelector<HTMLTextAreaElement>(`[data-history-note-input="${CSS.escape(button.dataset.saveHistoryNoteId || "")}"]`);
        if (!event || !input) return;
        const note = input.value.trim();
        const surface = reviewScroller();
        void host.enqueueMutation(async () => {
            const previous = host.store;
            const next = updateEventNote(host.store, event.id, note);
            if (next === host.store) {
                // Saving an unchanged note still finishes editing, without a
                // write or summary invalidation. Do not clear a newer editor.
                if (reviewValue("editingHistoryNoteId", host.editingHistoryNoteId) !== event.id) return;
                writeReviewValue("editingHistoryNoteId", undefined);
                const restoreFocus = recordActionStillFocused(surface, button, input);
                host.renderBackgroundUpdate();
                if (restoreFocus) restoreRecordActionFocus(event.id);
                return;
            }
            host.store = next;
            try { await host.persist(); } catch {
                host.store = previous;
                if (isCurrentSurface()) showMessage(t("msg.noteSaveFail"));
                return;
            }
            host.invalidateSummary();
            if (reviewValue("editingHistoryNoteId", host.editingHistoryNoteId) === event.id) writeReviewValue("editingHistoryNoteId", undefined);
            const restoreFocus = isCurrentSurface() && recordActionStillFocused(surface, button, input);
            host.renderBackgroundUpdate();
            if (restoreFocus) restoreRecordActionFocus(event.id);
        });
    }));
    const archivedSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
    let archivedSearchTimer: number | undefined;
    archivedSearch?.addEventListener("input", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        const value = archivedSearch.value;
        archivedSearchTimer = window.setTimeout(() => {
            if (!isCurrentSurface()) return;
            writeArchivedQuery(value);
            host.render(root);
            const nextSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-archived-query']")?.addEventListener("click", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        writeArchivedQuery("");
        host.render(root);
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    /* 归档搜索框内按 Esc = 清除筛选并回到列表（与清除按钮同一条路径）。 */
    archivedSearch?.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !archivedSearch.value) return;
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        writeArchivedQuery("");
        host.render(root);
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    /* 归档动作共享一个本地互斥边界：除了原生 disabled 外，程序化 click/触屏
       重复派发也必须被吞掉；完成后尽量把焦点留在原动作上。 */
    const archivedBusy = new WeakSet<HTMLElement>();
    const runArchivedAction = (button: HTMLButtonElement, operation: () => Promise<unknown> | unknown) => {
        const row = button.closest<HTMLElement>(".lc-checkin__history-row");
        const rowIndex = row ? [...root.querySelectorAll<HTMLElement>(".lc-checkin__history-row")].indexOf(row) : -1;
        const action = row ? button.dataset.action : undefined;
        const boundary = button.closest<HTMLElement>("[data-archived-bulk-toolbar]") || row || button;
        if (archivedBusy.has(boundary)) return;
        archivedBusy.add(boundary);
        const controls = boundary === button ? [button] : [...boundary.querySelectorAll<HTMLButtonElement>("button")];
        const disabledStates = controls.map((control) => control.disabled);
        controls.forEach((control) => control.disabled = true);
        boundary.setAttribute("aria-busy", "true");
        Promise.resolve().then(operation).catch(() => undefined).finally(() => {
            archivedBusy.delete(boundary);
            if (!isCurrentSurface()) return;
            boundary.removeAttribute("aria-busy");
            if (!button.isConnected) {
                const candidates = action ? [...root.querySelectorAll<HTMLButtonElement>(`[data-action="${action}"]`)] : [];
                candidates[Math.min(Math.max(rowIndex, 0), candidates.length - 1)]?.focus();
                if (!candidates.length) root.querySelector<HTMLElement>("[data-archived-search], [data-action='back']")?.focus();
                return;
            }
            controls.forEach((control, index) => control.disabled = disabledStates[index]);
            button.focus();
        });
    };
    root.querySelectorAll<HTMLButtonElement>("[data-restore-id]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.restoreId || "";
        if (!id) return;
        /* T-1594：恢复前预览——重进今日排期与否先告知；取消零写入。 */
        if (!confirmArchivedRestore([id])) return;
        runArchivedAction(button, () => host.restoreItem(id));
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-archived-delete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.archivedDelete || "";
        if (id) runArchivedAction(button, () => host.deleteArchivedItem(id));
    }));
    /* T-1594：恢复预览确认——统计选中项中恢复后将重进今日排期的数量。 */
    const confirmArchivedRestore = (ids: readonly string[]): boolean => {
        const today = currentCalendarDate();
        const resumeToday = ids.filter((id) => {
            const item = host.store.items.find((candidate) => candidate.id === id);
            return Boolean(item?.archived && isScheduledToday(item, today));
        }).length;
        return window.confirm(t("msg.archivedRestoreConfirm", {count: ids.length, resumeToday}));
    };
    const archivedSelections = () => [...root.querySelectorAll<HTMLInputElement>("[data-archived-select]:checked")].map((input) => input.dataset.archivedSelect || "").filter(Boolean);
    const bulkToolbar = root.querySelector<HTMLElement>("[data-archived-bulk-toolbar]");
    const selectAll = root.querySelector<HTMLInputElement>("[data-archived-select-all]");
    const selectedCount = root.querySelector<HTMLElement>("[data-archived-selected-count]");
    const syncArchivedSelection = () => {
        const inputs = [...root.querySelectorAll<HTMLInputElement>("[data-archived-select]")];
        const selected = inputs.filter((input) => input.checked).length;
        if (selectedCount) selectedCount.textContent = String(selected);
        if (bulkToolbar) bulkToolbar.hidden = selected === 0;
        const dangerZone = root.querySelector<HTMLElement>("[data-archived-danger]");
        if (dangerZone) dangerZone.hidden = selected === 0;
        if (selectAll) {
            selectAll.checked = inputs.length > 0 && selected === inputs.length;
            selectAll.indeterminate = selected > 0 && selected < inputs.length;
        }
    };
    root.querySelectorAll<HTMLInputElement>("[data-archived-select]").forEach((input) => input.addEventListener("change", syncArchivedSelection));
    selectAll?.addEventListener("change", () => {
        root.querySelectorAll<HTMLInputElement>("[data-archived-select]").forEach((input) => input.checked = selectAll.checked);
        syncArchivedSelection();
    });
    root.querySelector<HTMLButtonElement>("[data-action='bulk-restore-archived']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const ids = archivedSelections();
        if (!ids.length) return;
        if (!confirmArchivedRestore(ids)) return;
        runArchivedAction(button, () => host.restoreArchivedItems(ids));
    });
    root.querySelector<HTMLButtonElement>("[data-action='bulk-delete-archived']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const ids = archivedSelections();
        if (ids.length) runArchivedAction(button, () => host.deleteArchivedItems(ids));
    });
    root.querySelectorAll<HTMLElement>("[data-summary-range]").forEach((button) => button.addEventListener("click", () => {
        const range = button.dataset.summaryRange;
        if (range === "day" || range === "week" || range === "month") {
            writeReviewValue("summaryRange", range);
            writeReviewValue("summaryCustomRange", undefined);
            host.summaryText = undefined;
            host.summaryError = undefined;
            host.suggestionWorkflow = undefined;
            void host.persistSuggestionWorkflow();
            if (host.cancelReviewSummary) host.cancelReviewSummary(root);
            else {
                host.summaryRefreshing = false;
                host.summaryRequestId += 1;
            }
            writeReviewValue("historyPage", 0);
            writeReviewValue("reviewProjectPage", 0);
            writeReviewValue("editingHistoryNoteId", undefined);
            renderReviewPreservingView(`[data-summary-range="${range}"]`);
        }
    }));
    root.querySelector<HTMLFormElement>("[data-custom-range]")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget as HTMLFormElement);
        const startDate = String(data.get("customStartDate") || "");
        const endDate = String(data.get("customEndDate") || "");
        if (!isValidLocalDateInput(startDate) || !isValidLocalDateInput(endDate) || startDate > endDate) {
            showMessage(t("msg.invalidDateRange"));
            return;
        }
        if (startDate > dateKey(currentCalendarDate())) {
            showMessage(t("msg.futureReviewStart"));
            return;
        }
        writeReviewValue("summaryCustomRange", {startDate, endDate});
        host.summaryText = undefined;
        host.summaryError = undefined;
        host.suggestionWorkflow = undefined;
        void host.persistSuggestionWorkflow();
        if (host.cancelReviewSummary) host.cancelReviewSummary(root);
        else {
            host.summaryRefreshing = false;
            host.summaryRequestId += 1;
        }
        writeReviewValue("historyPage", 0);
        writeReviewValue("reviewProjectPage", 0);
        writeReviewValue("editingHistoryNoteId", undefined);
        renderReviewPreservingView(".lc-checkin__custom-range-disclosure > summary");
    });
    root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => {
        if (!(reviewState?.summarySession?.refreshing ?? host.summaryRefreshing)) void host.generateSummary(root);
    });
    const suggestionBusyButtons = new WeakSet<HTMLElement>();
    const finishSuggestionButton = (button: HTMLElement) => {
        suggestionBusyButtons.delete(button);
        if (isCurrentSurface() && button.isConnected) {
            button.removeAttribute("aria-busy");
            button.removeAttribute("disabled");
        }
        if (isCurrentSurface()) root.querySelector<HTMLElement>("[data-suggestion-workflow] [data-suggestion-undo]:not([disabled])")?.focus();
    };
    root.querySelectorAll<HTMLElement>("[data-suggestion-decision]").forEach((button) => {
        button.addEventListener("click", () => {
            const decision = button.dataset.suggestionDecision;
            if (decision !== "confirm" && decision !== "cancel") return;
            if (suggestionBusyButtons.has(button)) return;
            suggestionBusyButtons.add(button);
            button.setAttribute("aria-busy", "true");
            button.setAttribute("disabled", "true");
            Promise.resolve().then(() => host.handleSuggestionDecision(decision)).finally(() => finishSuggestionButton(button)).catch(() => undefined);
        });
    });
    root.querySelector<HTMLElement>("[data-suggestion-undo]")?.addEventListener("click", () => {
        const button = root.querySelector<HTMLElement>("[data-suggestion-undo]");
        if (!button) return;
        if (suggestionBusyButtons.has(button)) return;
        suggestionBusyButtons.add(button);
        button.setAttribute("aria-busy", "true");
        button.setAttribute("disabled", "true");
        Promise.resolve().then(() => host.undoSuggestionWorkflow()).finally(() => finishSuggestionButton(button)).catch(() => undefined);
    });
    root.querySelector<HTMLElement>("[data-action='view-analysis-history']")?.addEventListener("click", () => {
        type HistoryRow = import("../agent-suggestions").AgentAnalysisSnapshot;
        const rows: HistoryRow[] = host.analysisHistory.filter((row) => row && typeof row.text === "string");
        const safe = (value: unknown) => String(value ?? "").replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c] || c));
        const sourceLabel = (source: HistoryRow["source"]) => t(source === "agent" ? "agent.historyAgent" : "agent.historyLocal");
        const rangeLabel = (range: HistoryRow["range"]) => range === "custom" ? t("review.custom") : t(`review.tab${range === "day" ? "Day" : range === "month" ? "Month" : "Week"}`);
        const list = rows.map((row, index) => `<li><strong>${t("agent.historyVersion", {n: index + 1})} · ${safe(row.asOf)}</strong><span>${safe(t("agent.historyMeta", {asOf: row.asOf, range: rangeLabel(row.range), source: sourceLabel(row.source), generatedAt: row.generatedAt}))}</span></li>`).join("");
        const baseIndex = Math.max(0, rows.length - 2);
        const targetIndex = Math.max(0, rows.length - 1);
        const options = rows.map((_, index) => `<option value="${index}" ${index === baseIndex ? "selected" : ""}>${t("agent.historyVersion", {n: index + 1})}</option>`).join("");
        const targetOptions = rows.map((_, index) => `<option value="${index}" ${index === targetIndex ? "selected" : ""}>${t("agent.historyVersion", {n: index + 1})}</option>`).join("");
        const canCompare = rows.length > 1;
        const dialog = new Dialog({title: t("agent.historyTitle"), content: `<div class="lc-checkin__agent-preview"><div class="lc-agent-compare-select"><label>${t("agent.historyBase")}<select data-analysis-base aria-label="${t("agent.historyBase")}" ${canCompare ? "" : "disabled"}>${options}</select></label><label>${t("agent.historyTarget")}<select data-analysis-target aria-label="${t("agent.historyTarget")}" ${canCompare ? "" : "disabled"}>${targetOptions}</select></label><button class="b3-button" type="button" data-analysis-swap aria-label="${t("agent.historySwap")}" ${canCompare ? "" : "disabled"}>${t("agent.historySwap")}</button><button class="b3-button" type="button" data-analysis-compare ${canCompare ? "" : "disabled"}>${t("agent.historyCompare")}</button></div><ul class="lc-agent-suggestion-changes">${list || `<li>${t("agent.historyEmpty")}</li>`}</ul><p data-analysis-compare-status aria-live="polite">${t("agent.historyReadOnly")}</p><div data-analysis-compare-result hidden></div></div>`});
        const base = dialog.element.querySelector<HTMLSelectElement>("[data-analysis-base]");
        const target = dialog.element.querySelector<HTMLSelectElement>("[data-analysis-target]");
        const status = dialog.element.querySelector<HTMLElement>("[data-analysis-compare-status]");
        const result = dialog.element.querySelector<HTMLElement>("[data-analysis-compare-result]");
        dialog.element.querySelector<HTMLElement>("[data-analysis-swap]")?.addEventListener("click", () => {
            if (base && target) [base.value, target.value] = [target.value, base.value];
        });
        dialog.element.querySelector<HTMLElement>("[data-analysis-compare]")?.addEventListener("click", () => {
            const baseIndex = Number(base?.value);
            const targetIndex = Number(target?.value);
            if (!status || !result) return;
            if (!Number.isInteger(baseIndex) || !Number.isInteger(targetIndex) || !rows[baseIndex] || !rows[targetIndex]) {
                status.textContent = t("agent.historyInvalid");
                result.hidden = true;
                return;
            }
            if (baseIndex === targetIndex) {
                status.textContent = t("agent.historySameVersion");
                result.hidden = true;
                return;
            }
            const left = rows[baseIndex];
            const right = rows[targetIndex];
            result.innerHTML = `<p class="lc-agent-compare-direction">${t("agent.historyDirection", {base: baseIndex + 1, target: targetIndex + 1})}</p><p class="lc-agent-compare-meta">${safe(t("agent.historyMeta", {asOf: left.asOf, range: rangeLabel(left.range), source: sourceLabel(left.source), generatedAt: left.generatedAt}))}<br />${safe(t("agent.historyMeta", {asOf: right.asOf, range: rangeLabel(right.range), source: sourceLabel(right.source), generatedAt: right.generatedAt}))}</p>${renderAnalysisDiffPanel(left.text || t("agent.historyNoText"), right.text || t("agent.historyNoText"))}`;
            result.hidden = false;
            status.textContent = t("agent.historyReady");
        });
    });
    /* T-1360：本地建议生成器——优先级提升与「daily → 弹性配额」排期下调两类；
       排期建议只对 daily 且非戒除类项目生成，其余场景给「不可用」的禁用预览。 */
    const openLocalSuggestionPreview = (button: HTMLElement, build: (item: NonNullable<ReturnType<typeof getActiveItemById>>) => AgentSuggestion | undefined) => {
        const item = getActiveItemById(host.store, button.dataset.suggestionItemId || "");
        const rate = button.dataset.suggestionRate || "0";
        const suggestion = item ? build(item) : undefined;
        const changes = suggestion?.changes || [];
        const preview = new Dialog({
            title: t("agent.previewTitle"),
            content: `${renderAgentPreviewContent(item?.name || "", rate, changes)}<div class="lc-checkin__agent-preview-actions"><button class="b3-button" type="button" data-agent-preview-close>${t("agent.previewDefer")}</button><button class="b3-button" type="button" data-agent-preview-apply ${suggestion ? "" : "disabled"} title="${suggestion ? t("agent.previewApplyTitle") : t("agent.previewUnavailableTitle")}">${t("agent.previewApplyButton")}</button></div>`,
        });
        preview.element.querySelector<HTMLElement>("[data-agent-preview-close]")?.addEventListener("click", () => preview.destroy());
        preview.element.querySelector<HTMLButtonElement>("[data-agent-preview-apply]")?.addEventListener("click", async (applyButton) => {
            if (!suggestion) return;
            const target = applyButton.currentTarget as HTMLButtonElement;
            if (target.disabled) return;
            target.disabled = true;
            target.setAttribute("aria-busy", "true");
            host.suggestionWorkflow = createSuggestionWorkflow(createSuggestionEnvelope(suggestion));
            try {
                await host.persistSuggestionWorkflow();
                await host.handleSuggestionDecision("confirm");
                preview.destroy();
            } catch {
                if (target.isConnected) {
                    target.disabled = false;
                    target.removeAttribute("aria-busy");
                }
            }
        });
    };
    root.querySelector<HTMLElement>("[data-action='preview-agent-suggestion']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        /* 回顾页的本地建议只调整非高优先级项目的 priority：这是现有建议执行
           白名单中的纯元数据字段，不会改写历史、目标修订或排期。 */
        openLocalSuggestionPreview(button, (item) => item.priority !== "high" ? {
            id: `review-priority-${item.id}-${Date.now()}`,
            title: t("agent.localPriorityTitle", {name: item.name}),
            reason: t("agent.localPriorityReason", {name: item.name, rate: button.dataset.suggestionRate || "0"}),
            changes: [{itemId: item.id, field: "priority", before: item.priority || "medium", after: "high"}],
            requiresConfirmation: true,
        } : undefined);
    });
    /* T-1360：排期下调建议——daily 且非戒除类（at-most 语义反转，不适用弹性化）的项目
       改为「每周 3 次」弹性配额；经确认流执行，可撤销。 */
    root.querySelector<HTMLElement>("[data-action='preview-agent-schedule-suggestion']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        const rate = button.dataset.suggestionRate || "0";
        openLocalSuggestionPreview(button, (item) => {
            if (item.schedule.type !== "daily" || item.direction === "atMost") return undefined;
            const change = buildSuggestionChange(item, "schedule", {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}});
            return change ? {
                id: `review-schedule-${item.id}-${Date.now()}`,
                title: t("agent.localScheduleTitle", {name: item.name}),
                reason: t("agent.localScheduleReason", {name: item.name, rate}),
                changes: [change],
                requiresConfirmation: true,
            } : undefined;
        });
    });
    /* T-1359：草案卡 → 编辑器检查流（预填表单，用户手动保存）。 */
    root.querySelectorAll<HTMLElement>("[data-action='edit-project-draft']").forEach((button) => button.addEventListener("click", () => {
        const draft = host.projectDrafts?.[Number(button.dataset.draftIndex)];
        if (draft) host.openProjectDraftEditor(draft, root);
    }));
    const reviewBusy = new WeakSet<HTMLElement>();
    const runReviewTool = (button: HTMLElement, operation: () => Promise<unknown> | unknown, preservePromptFocus = false, restoreFocus = () => true) => {
        if (reviewBusy.has(button)) return;
        reviewBusy.add(button);
        button.setAttribute("aria-busy", "true");
        button.setAttribute("disabled", "true");
        Promise.resolve().then(operation).catch(() => undefined).finally(() => {
            reviewBusy.delete(button);
            if (!isCurrentSurface() || !button.isConnected) return;
            button.removeAttribute("aria-busy");
            button.removeAttribute("disabled");
            if (restoreFocus() && (!preservePromptFocus || root.ownerDocument.activeElement !== root.querySelector("[data-review-assistant-prompt]"))) button.focus();
        });
    };
    /* T-1217 报告：当前范围摘要 + 可选上一周期基线；标题与区块开关走偏好与字典。 */
    const buildCurrentReport = (): string => {
        /* T-1343：来源筛选作用于当前与基线两个口径，保证偏差可比。 */
        const sourceOptions = host.reportSource ? {source: host.reportSource as "manual" | "tomato" | "api" | "import" | "sireader" | "siplayer"} : undefined;
        const summaryCustomRange = reviewValue("summaryCustomRange", host.summaryCustomRange);
        const summaryRange = reviewValue("summaryRange", host.summaryRange);
        const summary = summaryCustomRange ? buildCustomSummaryContext(host.store, summaryCustomRange, undefined, sourceOptions) : buildSummaryContext(host.store, summaryRange, undefined, sourceOptions);
        const label = summaryCustomRange ? t("report.titleCustom")
            : summaryRange === "day" ? t("report.titleDay")
            : summaryRange === "month" ? t("report.titleMonth")
            : summaryRange === "week" ? t("report.titleWeek")
            : t("report.titleCustom");
        const title = t("report.titleWithRange", {label, start: summary.startDate, end: summary.endDate});
        let comparison: ReviewComparison | undefined;
        if (host.reportSections.baseline || host.reportSections.deviations) {
            const previous = getPreviousReviewRange({startDate: summary.startDate, endDate: summary.endDate});
            comparison = previous ? buildReviewComparison(summary, sourceOptions ? buildCustomSummaryContext(host.store, previous, undefined, sourceOptions) : buildCustomSummaryContext(host.store, previous)) : undefined;
        }
        return buildWeeklyReportMarkdown(summary, title, host.reportSections, comparison, sourceOptions);
    };
    root.querySelector<HTMLElement>("[data-action='copy-weekly-report']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        runReviewTool(button, async () => {
            const markdown = buildCurrentReport();
            try {
                await navigator.clipboard.writeText(markdown);
                if (isCurrentSurface()) showMessage(t("msg.reportCopied"));
            } catch {
                if (isCurrentSurface()) showMessage(t("msg.clipboardFail"));
            }
        });
    });
    for (const action of ["copy-review-prompt", "copy-open-review-agent"]) root.querySelector<HTMLElement>(`[data-action='${action}']`)?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        let opened = false;
        runReviewTool(button, async () => {
            const asOf = currentCalendarDate();
            const summaryCustomRange = reviewValue("summaryCustomRange", host.summaryCustomRange);
            const summaryRange = reviewValue("summaryRange", host.summaryRange);
            const context = summaryCustomRange ? buildCustomSummaryContext(host.store, summaryCustomRange, asOf) : buildSummaryContext(host.store, summaryRange, asOf);
            const prompt = buildReviewPrompt(context, reviewValue("reviewAssistantGoal", host.reviewAssistantGoal));
            try {
                await navigator.clipboard.writeText(prompt);
                if (!button.isConnected || pageForRoot() !== "review" || host.disposed || host.disposing) return;
                if (action === "copy-open-review-agent") {
                    try { opened = host.openReviewAgent(); } catch { opened = false; }
                    showMessage(t(opened ? "review.assistantOpened" : "review.assistantOpenUnavailable"));
                } else showMessage(t("review.assistantPromptCopied"));
            } catch {
                if (!button.isConnected || pageForRoot() !== "review") return;
                const text = root.querySelector<HTMLTextAreaElement>("[data-review-assistant-prompt]");
                if (text) {
                    let ancestor = text.parentElement;
                    while (ancestor && ancestor !== root) {
                        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
                        ancestor = ancestor.parentElement;
                    }
                    text.focus();
                    text.select();
                }
                showMessage(t("review.assistantCopyFailed"));
            }
        }, true, () => !opened);
    });
    root.querySelector<HTMLElement>("[data-action='export-report']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        runReviewTool(button, () => host.downloadReportMarkdown(buildCurrentReport()));
    });
    /* 移动端固定底栏会盖住 in-flow 下拉菜单的底缘：details 打开后若菜单底部
       落入底栏区域，按遮挡量滚动最近的可滚动祖先（兜底 window）让出空间；
       桌面无底栏，测得高度 0 不触发。守门桩 root 无 DOM 事件接口时跳过。 */
    if (typeof root.addEventListener === "function") {
        const previousToggleListener = reviewMoreMenuToggleListeners.get(root);
        if (previousToggleListener && typeof root.removeEventListener === "function") {
            root.removeEventListener("toggle", previousToggleListener, true);
        }
        const toggleListener: EventListener = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLDetailsElement) || !target.open) return;
            const menu = target.querySelector<HTMLElement>(".lc-checkin__review-more-menu");
            if (!menu) return;
            const doc = root.ownerDocument;
            const nav = doc.querySelector(".lc-checkin__mobile-nav");
            const navHeight = nav instanceof HTMLElement && nav.offsetHeight > 0 ? nav.offsetHeight : 0;
            if (navHeight === 0) return;
            const view = doc.defaultView;
            if (!view) return;
            const rect = menu.getBoundingClientRect();
            const limit = view.innerHeight - navHeight - 8;
            const overflow = Math.ceil(rect.bottom - limit);
            if (overflow <= 0) return;
            let scroller: HTMLElement | null = menu.parentElement;
            while (scroller && scroller !== doc.body) {
                const style = view.getComputedStyle(scroller);
                if (/(auto|scroll)/.test(style.overflowY) && scroller.scrollHeight > scroller.clientHeight) break;
                scroller = scroller.parentElement;
            }
            if (scroller && scroller !== doc.body) scroller.scrollTop += overflow;
            else view.scrollBy({top: overflow});
        };
        root.addEventListener("toggle", toggleListener, true);
        reviewMoreMenuToggleListeners.set(root, toggleListener);
    }
    /* 报告设置：改动即写回视图偏好；不触发重渲染（复选框自身状态就是真值）。 */
    root.querySelectorAll<HTMLInputElement>("[data-report-option]").forEach((input) => {
        input.addEventListener("change", () => {
            const key = input.dataset.reportOption as keyof ReportSectionToggles;
            if (!(key in host.reportSections)) return;
            const previous = {...host.reportSections};
            applyPersistentMutation(() => { host.reportSections = {...host.reportSections, [key]: input.checked}; }, () => { host.reportSections = previous; });
        });
    });
    /* T-1343：报告来源筛选改动即写回视图偏好，不触发重渲染。 */
    root.querySelector<HTMLSelectElement>("[data-report-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        const previous = host.reportSource;
        applyPersistentMutation(() => { host.reportSource = ["manual", "tomato", "api", "import", "sireader", "siplayer"].includes(value) ? value : ""; }, () => { host.reportSource = previous; });
    });
    /* T-1432 · R-A8：命名保存视图——应用/保存/删除。 */
    root.querySelector<HTMLSelectElement>("[data-saved-view]")?.addEventListener("change", (event) => {
        const select = event.currentTarget as HTMLSelectElement;
        const deleteButton = root.querySelector<HTMLButtonElement>("[data-action='delete-saved-view']");
        if (deleteButton) deleteButton.disabled = !select.value;
        host.applySavedView(select.value);
    });
    root.querySelector<HTMLElement>("[data-action='save-saved-view']")?.addEventListener("click", () => {
        const name = window.prompt(t("review.savedViewSavePrompt"), "");
        if (name && name.trim()) host.saveCurrentView(name);
    });
    root.querySelector<HTMLElement>("[data-action='delete-saved-view']")?.addEventListener("click", () => {
        const id = root.querySelector<HTMLSelectElement>("[data-saved-view]")?.value || "";
        if (id) host.deleteSavedView(id);
    });
    /* T-1343：批量导出——顺序触发 JSON、CSV 与 Markdown 报告，全部走既有安全导出通道。 */
    root.querySelector<HTMLElement>("[data-action='export-all']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, async () => {
        await Promise.resolve(host.downloadExport("json"));
        await Promise.resolve(host.downloadExport("csv"));
        await Promise.resolve(host.downloadReportMarkdown(buildCurrentReport()));
    }));
    root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, () => { const days = Number(root.querySelector<HTMLSelectElement>("[data-export-days]")?.value); host.downloadExport("csv", Number.isFinite(days) && days >= 1 ? days : undefined); }));
    root.querySelector<HTMLElement>("[data-action='export-json']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, () => host.downloadExport("json")));
    root.querySelector<HTMLElement>("[data-action='export-share-card']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, () => host.downloadShareCard?.()));
}
