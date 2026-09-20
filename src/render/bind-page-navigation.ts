/* 页面导航与回顾/归档控件绑定：从 index.ts 外置（T-022）。
   宿主成员经 BindPageNavigationHost 结构化接口声明。 */
import {t} from "../i18n";
import {buildWeeklyReportMarkdown} from "../features/report";
import {buildReviewComparison, getPreviousReviewRange, type ReviewComparison} from "../features/review-comparison";
import {buildReviewPrompt, type ReviewAssistantGoal} from "../features/review-assistant";
import type {ReportSectionToggles} from "../view-preferences";
import {buildCustomSummaryContext, buildSummaryContext} from "../analytics";
import {dateKey, getActiveItemById, getEventById, getItemById, removeEvents, updateEventNote} from "../model";
import {currentCalendarDate, captureActionMoment, isValidLocalDateInput} from "../shared";
import {renderAnalysisDiffPanel} from "./analysis-diff";
import {renderAgentPreviewContent} from "./agent-preview";
import {buildSuggestionChange, createSuggestionEnvelope, type AgentSuggestion} from "../agent-suggestions";
import {createSuggestionWorkflow} from "../features/suggestion-workflow";
import {Dialog, showMessage} from "siyuan";

export interface BindPageNavigationHost {
    store: import("../types").CheckinStore;
    currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";
    insightsItemId?: string;
    insightsReturnPage: "today" | "review";
    historyQuery: string;
    historySource: "all" | "manual" | "tomato" | "import" | "api";
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
    disposed: boolean;
    disposing: boolean;
    bindDialogClose(root: HTMLElement): void;
    bindMobileNav(root: HTMLElement): void;
    showReview(): void;
    jumpToHistoryDate(date: string): void;
    showToday(): void;
    showArchived(): void;
    showOccasions(): void;
    showInsights(item?: import("../types").CheckinItem): void;
    render(): void;
    persistViewPreferences(): Promise<void>;
    reviewFoldSections: Set<string>;
    reviewFoldTouched: boolean;
    changeHistoryMonth(offset: number): void;
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    persist(): Promise<void>;
    invalidateSummary(): void;
    broadcast(event: unknown): void;
    renderBackgroundUpdate(): void;
    restoreItem(itemId: string): Promise<void>;
    restoreArchivedItems(itemIds: string[]): Promise<boolean> | void;
    deleteArchivedItem(itemId: string): Promise<boolean> | void;
    deleteArchivedItems(itemIds: string[]): Promise<boolean> | void;
    generateSummary(): Promise<void> | void;
    downloadExport(format: "json" | "csv"): void;
    downloadReportMarkdown(markdown: string): void;
    reportSections: ReportSectionToggles;
    /** T-1343 报告来源筛选："" = 全部来源。 */
    reportSource: string;
    reminderFilter: import("../reminders").ReminderFilter;
    reminderUserAction(id: string, action: "snooze" | "skip" | "restore"): void;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
}

const pinnedSubnavScrollers = new WeakSet<HTMLElement>();
const initializedRhythmScrollers = new WeakSet<HTMLElement>();

/** 回顾二级导航滚动钉住（D-159）：宿主界面缩放形成 zoom 子树后，合成器滚动
    不会重定位 position:sticky（Chromium 已知缺陷，真机实测滚动后导航条消失）。
    导航条因此保持 relative 布局，由滚动同步用 transform 主动钉在滚动区顶部，
    缩放与非缩放环境行为一致。返回同步函数供跳转点击在 scrollIntoView 后
    显式调用（其滚动事件可能不触发本监听）。 */
function pinReviewSubnavRail(root: HTMLElement, host: BindPageNavigationHost): () => void {
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
    host.bindDialogClose(root);
    host.bindMobileNav(root);
    const rhythm = root.querySelector<HTMLElement>(".review-rhythm-days");
    if (rhythm && !initializedRhythmScrollers.has(rhythm)) {
        initializedRhythmScrollers.add(rhythm);
        // Layout is available on the next frame. Only the strip scrolls, and
        // keyboard navigation or a detached page always wins over this default.
        window.requestAnimationFrame(() => {
            if (!rhythm.isConnected || host.disposed || host.disposing || host.currentPage !== "review"
                || host.reviewWorkspace !== "overview" || rhythm.clientWidth <= 0
                || rhythm.contains(root.ownerDocument.activeElement)) return;
            rhythm.scrollLeft = rhythm.scrollWidth;
        });
    }
    const reviewScroller = () => root.querySelector<HTMLElement>(".lc-checkin--review");
    const renderReviewPreservingView = (focusSelector?: string, top = false): void => {
        const scrollTop = top ? 0 : (reviewScroller()?.scrollTop || 0);
        host.render();
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
        return !host.disposed && !host.disposing && host.currentPage === "review" && host.reviewWorkspace === "records"
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
        if (host.reviewFoldTouched) return;
        // Keep defaults in the other workspace as well as currently rendered
        // folds: interacting with analysis must not silently close overview.
        host.reviewFoldSections.add("projects");
        host.reviewFoldSections.add("trend");
        root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => {
            const id = details.dataset.reviewFold || "";
            if (details.open) host.reviewFoldSections.add(id);
            else host.reviewFoldSections.delete(id);
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
            rememberFoldDefaults();
            if (details.open) host.reviewFoldSections.add(id);
            else host.reviewFoldSections.delete(id);
            host.reviewFoldTouched = true;
            void host.persistViewPreferences();
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
        undoButton.addEventListener("click", () => { toast.remove(); void host.setOccasionCompleted(occasionId, date, false); });
        toast.append(label, undoButton);
        surface.appendChild(toast);
        window.setTimeout(() => toast.remove(), 6000);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-occasion-complete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.occasionId || "";
        const occurrenceDate = button.dataset.occasionDate || "";
        if (!id || !occurrenceDate) return;
        button.disabled = true;
        const name = button.closest<HTMLElement>("[data-overdue-occasion]")?.querySelector("strong")?.textContent || "";
        void host.setOccasionCompleted(id, occurrenceDate, true).then((ok) => {
            if (ok) showCatchUpToast(name, id, occurrenceDate);
        }).finally(() => { button.disabled = false; });
    }));
    root.querySelector<HTMLSelectElement>("[data-insight-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        if (!host.store.items.some((item) => item.id === itemId && !item.archived)) return;
        host.insightsItemId = itemId;
        void host.persistViewPreferences();
        host.render();
    });
    root.querySelector<HTMLSelectElement>("[data-reminder-filter]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "overdue" || value === "today" || value === "upcoming" || value === "completed") {
            host.reminderFilter = value;
            host.render();
        }
    });
    /* 11.0-C 提醒延期/跳过/恢复：动作交回宿主（持久化 + 重渲染），按钮本身无状态。 */
    root.querySelectorAll<HTMLButtonElement>("[data-reminder-action]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.reminderId || "";
        const action = button.dataset.reminderAction;
        if (!id || (action !== "snooze" && action !== "skip" && action !== "restore")) return;
        host.reminderUserAction(id, action);
    }));
    root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => {
        if (host.currentPage === "insights" && host.insightsReturnPage === "review") host.showReview();
        else host.showToday();
    });
    /* Review workspace controls intentionally keep their state in the session,
       while the section folds below are persisted view preferences. */
    const activateWorkspace = (workspace: BindPageNavigationHost["reviewWorkspace"]) => {
        host.reviewWorkspace = workspace;
        host.historyPage = 0;
        host.reviewProjectPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView(`[data-review-workspace="${workspace}"]`, true);
    };
    root.querySelectorAll<HTMLElement>("[data-review-workspace]").forEach((button) => button.addEventListener("click", () => {
        const workspace = button.dataset.reviewWorkspace;
        if (workspace === "overview" || workspace === "records" || workspace === "analysis") activateWorkspace(workspace);
    }));
    root.querySelectorAll<HTMLElement>("[data-history-scope]").forEach((control) => control.addEventListener(control.tagName === "SELECT" ? "change" : "click", () => {
        const value = control.tagName === "SELECT" ? (control as HTMLSelectElement).value : control.dataset.historyScope;
        if (value !== "day" && value !== "period") return;
        host.historyScope = value;
        host.historyPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView(control.tagName === "SELECT" ? "select[data-history-scope]" : `[data-history-scope="${value}"]`);
    }));
    root.querySelector<HTMLSelectElement>("[data-history-item]")?.addEventListener("change", (event) => {
        host.historyItemId = (event.currentTarget as HTMLSelectElement).value;
        host.historyPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView("[data-history-item]");
    });
    root.querySelectorAll<HTMLElement>("[data-history-page]").forEach((button) => button.addEventListener("click", () => {
        const page = Number(button.dataset.historyPage);
        if (!Number.isInteger(page) || page < 0) return;
        host.historyPage = page;
        host.editingHistoryNoteId = undefined;
        renderReviewPage(".lc-checkin__history-date > strong");
    }));
    root.querySelector<HTMLSelectElement>("[data-review-project-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value !== "attention" && value !== "name") return;
        host.reviewProjectOrder = value;
        host.reviewProjectPage = 0;
        renderReviewPreservingView("[data-review-project-order]");
    });
    root.querySelectorAll<HTMLElement>("[data-review-project-page]").forEach((button) => button.addEventListener("click", () => {
        const page = Number(button.dataset.reviewProjectPage);
        if (!Number.isInteger(page) || page < 0) return;
        host.reviewProjectPage = page;
        renderReviewPage('[data-review-fold="projects"] > summary');
    }));
    root.querySelectorAll<HTMLElement>("[data-review-trend]").forEach((button) => button.addEventListener(button.tagName === "SELECT" ? "change" : "click", () => {
        const value = button.tagName === "SELECT" ? (button as HTMLSelectElement).value : button.dataset.reviewTrend;
        if (value !== "weekly" && value !== "monthly" && value !== "daily" && value !== "yearly") return;
        host.reviewTrend = value;
        renderReviewPreservingView(button.tagName === "SELECT" ? "select[data-review-trend]" : `[data-review-trend="${value}"]`);
    }));
    root.querySelector<HTMLSelectElement>("[data-review-strength-item]")?.addEventListener("change", (event) => {
        const itemId = (event.currentTarget as HTMLSelectElement).value;
        if (itemId && !host.store.items.some((item) => item.id === itemId)) return;
        host.reviewStrengthItemId = itemId;
        renderReviewPreservingView("[data-review-strength-item]");
    });
    root.querySelector<HTMLSelectElement>("[data-review-assistant-goal]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value !== "summary" && value !== "patterns" && value !== "plan") return;
        host.reviewAssistantGoal = value;
        renderReviewPreservingView("[data-review-assistant-goal]");
    });
    root.querySelectorAll<HTMLElement>("[data-action='review-assistant']").forEach(button => button.addEventListener("click", () => {
        rememberFoldDefaults();
        host.reviewWorkspace = "overview";
        host.reviewFoldSections.add("report");
        host.reviewFoldTouched = true;
        void host.persistViewPreferences();
        renderReviewPage('[data-review-fold="report"] > summary');
        root.querySelector<HTMLElement>("[data-review-assistant-goal]")?.focus({preventScroll: true});
    }));
    root.querySelectorAll<HTMLElement>("[data-review-rhythm-date]").forEach(button => button.addEventListener("click", () => {
        const date = button.dataset.reviewRhythmDate || "";
        if (!isValidLocalDateInput(date) || date > dateKey(currentCalendarDate())) return;
        host.historyQuery = "";
        host.historySource = "all";
        host.historyItemId = "";
        host.historyOrder = "newest";
        host.jumpToHistoryDate(date);
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
        if (offset === -1) host.heatmapYearOffset -= 1;
        else if (offset === 1 && host.heatmapYearOffset < 0) host.heatmapYearOffset += 1;
        else return;
        renderReviewPreservingView(`[data-heatmap-year="${offset}"]`);
    }));
    root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => host.showArchived());
    root.querySelector<HTMLElement>("[data-action='occasions']")?.addEventListener("click", () => host.showOccasions());
    root.querySelectorAll<HTMLElement>("[data-review-insights-id]").forEach((button) => button.addEventListener("click", () => {
        const item = getActiveItemById(host.store, button.dataset.reviewInsightsId);
        if (item) host.showInsights(item);
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
        rememberFoldDefaults();
        host.reviewFoldSections.add(foldId);
        host.reviewFoldTouched = true;
        void host.persistViewPreferences();
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
        if (item) host.showInsights(item);
    }));
    const historySearch = root.querySelector<HTMLInputElement>("[data-history-search]");
    let historySearchTimer: number | undefined;
    historySearch?.addEventListener("input", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        const value = historySearch.value;
        const workspace = host.reviewWorkspace;
        historySearchTimer = window.setTimeout(() => {
            if (host.disposed || host.disposing || host.currentPage !== "review" || host.reviewWorkspace !== workspace
                || !historySearch.isConnected || root.querySelector("[data-history-search]") !== historySearch) return;
            host.historyQuery = value;
            host.historyPage = 0;
            host.editingHistoryNoteId = undefined;
            renderReviewPreservingView("[data-history-search]");
            const nextSearch = root.querySelector<HTMLInputElement>("[data-history-search]");
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-query']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.historyPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView("[data-history-search]");
    });
    root.querySelector<HTMLElement>("[data-action='clear-history-filters']")?.addEventListener("click", () => {
        if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
        host.historyQuery = "";
        host.historySource = "all";
        host.historyOrder = "newest";
        host.historyItemId = "";
        host.historyPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView("[data-history-search]");
    });
    root.querySelector<HTMLSelectElement>("[data-history-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "all" || value === "manual" || value === "tomato" || value === "import" || value === "api") {
            host.historySource = value;
            host.historyPage = 0;
            host.editingHistoryNoteId = undefined;
            renderReviewPreservingView("[data-history-source]");
        }
    });
    root.querySelector<HTMLSelectElement>("[data-history-order]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        if (value === "newest" || value === "oldest") {
            host.historyOrder = value;
            host.historyPage = 0;
            host.editingHistoryNoteId = undefined;
            renderReviewPreservingView("[data-history-order]");
        }
    });
    root.querySelectorAll<HTMLElement>("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
        const scrollTop = reviewScroller()?.scrollTop || 0;
        host.historyPage = 0;
        host.historyScope = "day";
        host.editingHistoryNoteId = undefined;
        host.changeHistoryMonth(Number(button.dataset.historyMonth));
        root.querySelector<HTMLElement>(`[data-history-month="${button.dataset.historyMonth}"]`)?.focus({preventScroll: true});
        const scroller = reviewScroller();
        if (scroller) scroller.scrollTop = scrollTop;
    }));
    root.querySelectorAll<HTMLElement>("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
        const value = button.dataset.historyDate;
        if (value) {
            host.selectedHistoryDate = value;
            host.historyScope = "day";
            host.historyPage = 0;
            host.editingHistoryNoteId = undefined;
            renderReviewPreservingView(`[data-history-date="${CSS.escape(value)}"]`);
        }
    }));
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
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.undoFail")); return; }
            if (host.editingHistoryNoteId === event.id) host.editingHistoryNoteId = undefined;
            host.invalidateSummary();
            host.broadcast({type: "event-deleted", item: getItemById(host.store, event.itemId), deletedEvents: [event]});
            const restoreFocus = recordActionStillFocused(surface, button);
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
        host.editingHistoryNoteId = event.id;
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
                if (host.editingHistoryNoteId !== event.id) return;
                host.editingHistoryNoteId = undefined;
                const restoreFocus = recordActionStillFocused(surface, button, input);
                host.renderBackgroundUpdate();
                if (restoreFocus) restoreRecordActionFocus(event.id);
                return;
            }
            host.store = next;
            try { await host.persist(); } catch { host.store = previous; showMessage(t("msg.noteSaveFail")); return; }
            host.invalidateSummary();
            if (host.editingHistoryNoteId === event.id) host.editingHistoryNoteId = undefined;
            const restoreFocus = recordActionStillFocused(surface, button, input);
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
            if (host.disposed || host.disposing || host.currentPage !== "archived") return;
            host.archivedQuery = value;
            host.render();
            const nextSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
            nextSearch?.focus();
            nextSearch?.setSelectionRange(value.length, value.length);
        }, 120);
    });
    root.querySelector<HTMLElement>("[data-action='clear-archived-query']")?.addEventListener("click", () => {
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        host.archivedQuery = "";
        host.render();
        root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
    });
    /* 归档搜索框内按 Esc = 清除筛选并回到列表（与清除按钮同一条路径）。 */
    archivedSearch?.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !archivedSearch.value) return;
        if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
        host.archivedQuery = "";
        host.render();
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
        if (id) runArchivedAction(button, () => host.restoreItem(id));
    }));
    root.querySelectorAll<HTMLButtonElement>("[data-archived-delete]").forEach((button) => button.addEventListener("click", () => {
        const id = button.dataset.archivedDelete || "";
        if (id) runArchivedAction(button, () => host.deleteArchivedItem(id));
    }));
    const archivedSelections = () => [...root.querySelectorAll<HTMLInputElement>("[data-archived-select]:checked")].map((input) => input.dataset.archivedSelect || "").filter(Boolean);
    const bulkToolbar = root.querySelector<HTMLElement>("[data-archived-bulk-toolbar]");
    const selectAll = root.querySelector<HTMLInputElement>("[data-archived-select-all]");
    const selectedCount = root.querySelector<HTMLElement>("[data-archived-selected-count]");
    const syncArchivedSelection = () => {
        const inputs = [...root.querySelectorAll<HTMLInputElement>("[data-archived-select]")];
        const selected = inputs.filter((input) => input.checked).length;
        if (selectedCount) selectedCount.textContent = String(selected);
        if (bulkToolbar) bulkToolbar.hidden = selected === 0;
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
            host.summaryRange = range;
            host.summaryCustomRange = undefined;
            host.summaryText = undefined;
            host.summaryError = undefined;
            host.suggestionWorkflow = undefined;
            void host.persistSuggestionWorkflow();
            host.summaryRefreshing = false;
            host.summaryRequestId += 1;
            host.historyPage = 0;
            host.reviewProjectPage = 0;
            host.editingHistoryNoteId = undefined;
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
        host.summaryCustomRange = {startDate, endDate};
        host.summaryText = undefined;
        host.summaryError = undefined;
        host.suggestionWorkflow = undefined;
        void host.persistSuggestionWorkflow();
        host.summaryRefreshing = false;
        host.summaryRequestId += 1;
        host.historyPage = 0;
        host.reviewProjectPage = 0;
        host.editingHistoryNoteId = undefined;
        renderReviewPreservingView(".lc-checkin__custom-range-disclosure > summary");
    });
    root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => { if (!host.summaryRefreshing) void host.generateSummary(); });
    const suggestionBusyButtons = new WeakSet<HTMLElement>();
    const finishSuggestionButton = (button: HTMLElement) => {
        suggestionBusyButtons.delete(button);
        if (button.isConnected) {
            button.removeAttribute("aria-busy");
            button.removeAttribute("disabled");
        }
        root.querySelector<HTMLElement>("[data-suggestion-workflow] [data-suggestion-undo]:not([disabled])")?.focus();
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
    const reviewBusy = new WeakSet<HTMLElement>();
    const runReviewTool = (button: HTMLElement, operation: () => Promise<unknown> | unknown, preservePromptFocus = false) => {
        if (reviewBusy.has(button)) return;
        reviewBusy.add(button);
        button.setAttribute("aria-busy", "true");
        button.setAttribute("disabled", "true");
        Promise.resolve().then(operation).catch(() => undefined).finally(() => {
            reviewBusy.delete(button);
            if (!button.isConnected) return;
            button.removeAttribute("aria-busy");
            button.removeAttribute("disabled");
            if (!preservePromptFocus || root.ownerDocument.activeElement !== root.querySelector("[data-review-assistant-prompt]")) button.focus();
        });
    };
    /* T-1217 报告：当前范围摘要 + 可选上一周期基线；标题与区块开关走偏好与字典。 */
    const buildCurrentReport = (): string => {
        /* T-1343：来源筛选作用于当前与基线两个口径，保证偏差可比。 */
        const sourceOptions = host.reportSource ? {source: host.reportSource as "manual" | "tomato" | "api" | "import"} : undefined;
        const summary = host.summaryCustomRange ? buildCustomSummaryContext(host.store, host.summaryCustomRange, undefined, sourceOptions) : buildSummaryContext(host.store, host.summaryRange, undefined, sourceOptions);
        const label = host.summaryCustomRange ? t("report.titleCustom")
            : host.summaryRange === "day" ? t("report.titleDay")
            : host.summaryRange === "month" ? t("report.titleMonth")
            : host.summaryRange === "week" ? t("report.titleWeek")
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
            try { await navigator.clipboard.writeText(markdown); showMessage(t("msg.reportCopied")); }
            catch { showMessage(t("msg.clipboardFail")); }
        });
    });
    root.querySelector<HTMLElement>("[data-action='copy-review-prompt']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        runReviewTool(button, async () => {
            const asOf = currentCalendarDate();
            const context = host.summaryCustomRange ? buildCustomSummaryContext(host.store, host.summaryCustomRange, asOf) : buildSummaryContext(host.store, host.summaryRange, asOf);
            const prompt = buildReviewPrompt(context, host.reviewAssistantGoal);
            try {
                await navigator.clipboard.writeText(prompt);
                showMessage(t("review.assistantPromptCopied"));
            } catch {
                if (!button.isConnected || host.currentPage !== "review") return;
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
        }, true);
    });
    root.querySelector<HTMLElement>("[data-action='export-report']")?.addEventListener("click", (event) => {
        const button = event.currentTarget as HTMLElement;
        runReviewTool(button, () => host.downloadReportMarkdown(buildCurrentReport()));
    });
    /* 报告设置：改动即写回视图偏好；不触发重渲染（复选框自身状态就是真值）。 */
    root.querySelectorAll<HTMLInputElement>("[data-report-option]").forEach((input) => {
        input.addEventListener("change", () => {
            const key = input.dataset.reportOption as keyof ReportSectionToggles;
            if (!(key in host.reportSections)) return;
            host.reportSections = {...host.reportSections, [key]: input.checked};
            void host.persistViewPreferences();
        });
    });
    /* T-1343：报告来源筛选改动即写回视图偏好，不触发重渲染。 */
    root.querySelector<HTMLSelectElement>("[data-report-source]")?.addEventListener("change", (event) => {
        const value = (event.currentTarget as HTMLSelectElement).value;
        host.reportSource = ["manual", "tomato", "api", "import"].includes(value) ? value : "";
        void host.persistViewPreferences();
    });
    /* T-1343：批量导出——顺序触发 JSON、CSV 与 Markdown 报告，全部走既有安全导出通道。 */
    root.querySelector<HTMLElement>("[data-action='export-all']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, async () => {
        await Promise.resolve(host.downloadExport("json"));
        await Promise.resolve(host.downloadExport("csv"));
        host.downloadReportMarkdown(buildCurrentReport());
    }));
    root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, () => host.downloadExport("csv")));
    root.querySelector<HTMLElement>("[data-action='export-json']")?.addEventListener("click", (event) => runReviewTool(event.currentTarget as HTMLElement, () => host.downloadExport("json")));
}
