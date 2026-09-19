import {Dialog, fetchSyncPost, getFrontend, Plugin, showMessage, type IProtyle} from "siyuan";
import "./ui/tokens.scss";
import "./ui/components.scss";
import {getEventsInCustomRange, buildCustomSummaryContext, buildSummaryContext} from "./analytics";
import {buildAnalyticsSnapshot, type AnalyticsSnapshot} from "./charts";
import {formatLunar, solarToLunar} from "./lunar";
import {getPluginLocale, t} from "./i18n";
import {uiIcon, type UiIconName} from "./ui/icons";
import {PRIORITY_LABELS, TIME_SLOT_LABELS, SORT_LABELS, SCHEDULE_LABELS, KIND_LABELS} from "./ui/labels";
import {escapeHtml, normalizeCustomIconLibrary, withTimeout, renderIconMarkup, formatNumber, captureActionMoment, nextItemUpdatedAt, currentCalendarDate, calendarDateFromKey, isValidLocalDateInput, storeNeedsMigration, type ActionMoment} from "./shared";
import {buildRecoveryAuditDetails, parseCheckinCsv, preflightJsonRecovery, summarizeJsonBackup} from "./export";
import {buildHabitInsights} from "./features/insights";
import {buildCoachingSuggestions} from "./features/coaching";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, DOCK_TOMATO_ADAPTER_ID, emitIntegrationEvent} from "./integrations";
import {appendEvent, appendEvents, appendStoreAudit, appendStoreSnapshotHistory, createDefaultStore, createEmptyStoreSnapshotHistory, createStoreSnapshotEnvelope, countCompletedDays, dateKey, deleteItemCascade, deleteItemsCascade, evaluateItemRule, getActiveItemById, getEventById, getEventsForDay, getItemById, getItemRevisionForDate, getProgress, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday, isSkipEvent, makeId, mergeNormalizedStores, normalizeItem as normalizeCheckinItem, normalizeStore, normalizeStoreAudit, parseStoreSnapshotHistoryExport, readStoreSnapshotHistory, removeEvents, type StoreAuditEntry} from "./model";
import type {FocusAdapter, SummaryProvider} from "./integrations";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinKind, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot, CompletionSource, ScheduleType, TomatoValueMode, UserTemplate} from "./types";
import type {CustomSummaryRange, SummaryRange, EventRangeSummary, EventRangeSummaryOptions} from "./analytics";
import type {HistorySortOrder, HistorySourceFilter} from "./features/history-filter";
import {DEFAULT_REPORT_SECTIONS, DEFAULT_VIEW_PREFERENCES, normalizeViewPreferences, type CheckinPalette, type CheckinViewPreferences, type DialogSizeMode, type ReportSectionToggles} from "./view-preferences";
import {renderCheckinLogView, renderItemView, renderOccasionBannerView, renderRecentRecordView, renderSaveStatusView, renderSyncNoticeView, renderTodayView, renderUpcomingOccasionsView} from "./render/fragments";
import {bindTodayHandlers, type BindTodayHost} from "./render/bind-today";
import {bindOccasionsHandlers, type BindOccasionsHost} from "./render/bind-occasions";
import {bindEditorHandlers, type BindEditorHost} from "./render/bind-editor";
import {bindPageNavigationHandlers, type BindPageNavigationHost} from "./render/bind-page-navigation";
import {saveEditorForm, type SaveFormHost} from "./render/save-form";
import {cloneItemForDateValue, cloneItemValue, cloneStoreValue, computeStreaksValue, getSummaryEventsValue, itemFingerprintValue, makeEventValue, revisionFingerprintValue} from "./model-helpers";
import {persistNormalizedStoreWithVerification, reconcileNormalizedStoreSnapshots} from "./storage-transaction";
import {createTeardownDeadline, createTeardownWriteGate, TEARDOWN_DRAIN_BUDGET_MS, TEARDOWN_FLUSH_BUDGET_MS, waitWithinDeadline} from "./teardown";
import {bindDialogCloseFor, bindMobileNavFor, changeHistoryMonthFor, downloadDockTomatoDiagnosticsFor, downloadExportFor, downloadLoopExportFor, downloadReportMarkdownFor, downloadSnapshotHistoryFor, downloadStoreAuditFor, focusTodaySearchFor, getQuickTodayItems, importCsvRowsInto, importLoopPlanInto, invalidateSummaryFor, renderBackgroundUpdateFor, restoreItemFor, settleReadyFor, showSyncNoticeFor, type PluginOpsHost} from "./plugin-ops";
import {buildLoopImportPlan, type LoopImportPlan} from "./features/loop-csv";
import {ANCHOR_ATTR_KEY, appendAnchorNote, buildAnchorAttrValue, buildAnchorNoteMarkdown, clearAnchorAttr, resolveAnchorBlock, withBoundedRetry, writeAnchorAttr} from "./features/note-anchor";
import {openTabPageFor, showArchivedFor, showEditorFor, showInsightsFor, showOccasionsFor, showReviewFor, showSettingsFor, showTodayFor, type NavigationHost} from "./navigation";
import {bindQuickDialogViewportFor, closeQuickDialogFor, ensureMobileTopBarButtonFor, ensureSpeedSwitchQuickActionsFor, handleQuickDialogDestroyedFor, openQuickDialogFor, quickDialogSizeOf, toggleQuickDialogFor, type QuickDialogHost} from "./render/quick-dialog";
import {bindBulkModeFor, bindItemContextMenuFor, bindItemDragFor, bindPageKeyboardFor, bindQuickKeyboardFor, type TodayBindingsHost} from "./render/today-bindings";
import {bindFocusTimerPanelFor, finishFocusTimerFor, openFocusTimerFor, paintFocusTimer, renderFocusTimerPanelFor, stopFocusTimerFor, tickFocusTimerFor, type FocusTimerHost} from "./render/focus-timer";
import {canStartWithAdapter, findFocusAdapterFor, releaseFocusAdapterFor, startFocusFor, stopAdapterSilently, stopFocusFor, type FocusAdapterHost} from "./render/focus-adapter";
import {renderReviewView} from "./render/review";
import {renderCheckinBlocksIn, observeCheckinBlocks} from "./render/block-renderer";
import {buildArchivedItemSummaries, renderArchivedView} from "./render/archived";
import {clearReminderUserActions, deserializeReminderUserActions, normalizeReminderUserActions, projectReminderCenter, serializeReminderUserActions, type ReminderFilter, type ReminderUserAction} from "./reminders";
import {renderOccasionsView} from "./render/occasions";
import {renderSettingsView} from "./render/settings";
import {bindSettingsNavigationFor} from "./render/settings-navigation";
import {renderEditorView} from "./render/editor";
import {validateEditorInput} from "./editor-validation";
import {registerAgentCapabilities} from "./agent-capabilities";
import {AGENT_ANALYSIS_CACHE_KEY, loadAnalysisSnapshots, saveAnalysisSnapshot, createAnalysisMeta, createSuggestionEnvelope, normalizeSummaryProviderResult, type AgentAnalysisSnapshot} from "./agent-suggestions";
import {applySuggestion, createSuggestionWorkflow, decideSuggestion, deserializeSuggestionWorkflow, isWorkflowNewer, serializeSuggestionWorkflow, shouldRestoreSuggestionWorkflow, undoSuggestion, type SuggestionWorkflowState} from "./features/suggestion-workflow";
import {createSuggestionDecisionToken} from "./agent-suggestions";
import {normalizeUserTemplate, upsertUserTemplate, deleteUserTemplate} from "./features/templates";
import type {CheckinAppearance, FocusTimerProvider, TodayGroupMode} from "./view-preferences";
import {applyOccasionTemplate, createDefaultOccasionStore, deleteOccasion, describeRecurrence, getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, markOccasionCompleted, normalizeOccasion, normalizeOccasionStore, OCCASIONS_STORAGE_NAME, OCCASION_TEMPLATES, occasionTemplateName, upsertOccasion, weekdayName, type MonthlySubtype} from "./occasions";
import type {Occasion, OccasionKind, OccasionRecurrence, OccasionStore, VisibleOccasion} from "./occasions";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_CAPABILITIES, getCheckinApiDescriptor, getCheckinCapabilityInfo, hasCheckinCapability} from "./api-contract";
import type {CheckinApiDescriptor, CheckinCapability, CheckinCapabilityInfo} from "./api-contract";
import {createCheckinApi, type CheckinApiHost} from "./api";
import {clearDockTomatoCompletionIssues, getDockTomatoCompletionIssues, inspectDockTomatoProvider, installDockTomatoBridge, restoreDockTomatoCompletionIssues, serializeDockTomatoCompletionIssues} from "./dock-tomato";
import {inboxDueEntries, inboxNextWakeDelayMs, markInboxBlocked, markInboxRetry, normalizeInboxStore, removeInboxEntry, serializeInboxStore, upsertInboxEntry, dockTomatoCompletionValue, type DockTomatoCompletionWriteResult, type DockTomatoInboxStore, type DockTomatoPendingCompletion} from "./features/docktomato-inbox";
import {isTaskHorizonExternalRef} from "./ecosystem";

const STORAGE_NAME = "checkin-store";
const BACKUP_STORAGE_NAME = "checkin-store-backup";
const AUDIT_STORAGE_NAME = "checkin-store-audit";
const VIEW_PREFERENCES_NAME = "checkin-view-preferences";
const USER_TEMPLATES_NAME = "checkin-user-templates";
const CUSTOM_ICON_LIBRARY_NAME = "checkin-custom-icon-library";
const REMINDER_ACTIONS_NAME = "checkin-reminder-actions";
const SUGGESTION_WORKFLOW_STORAGE_NAME = "checkin-suggestion-workflow";
const FOCUS_DIAGNOSTICS_STORAGE_NAME = "checkin-focus-diagnostics";
const DOCKTOMATO_INBOX_STORAGE_NAME = "checkin-docktomato-inbox";
type OccasionImport = import("./occasions").Occasion;
const STORAGE_LOCK_NAME = "siyuan-checkin-store-write";
/* 审计是旁路诊断，同一变更窗口内的多次追加合成一次整文件写入（T-1246）。 */
const AUDIT_COALESCE_MS = 1500;
const DOCK_TYPE = "siyuan-checkin-dock";
const TAB_TYPE = "checkin";
const QUICK_DIALOG_HOTKEY = "⌥⇧C";
const SUMMARY_TIMEOUT_MS = 30000;
let fallbackStorageQueue: Promise<void> = Promise.resolve();

/* 顶栏/底栏位于 .lc-checkin 滚动面板之外，无法直接继承独立主题 token。
   渲染后从已应用主题的 surface 复制自定义属性到宿主，保证窗口级 UI 与内容
   使用同一套浅色/暗色及调色板，而不污染思源全局变量。 */
const HOST_THEME_TOKEN_NAMES = [
    "--lc-checkin-accent", "--lc-checkin-accent-strong", "--lc-checkin-accent-soft", "--lc-checkin-accent-text", "--lc-checkin-accent-fill", "--lc-checkin-accent-contrast",
    "--lc-checkin-success", "--lc-checkin-success-soft", "--lc-checkin-success-text", "--lc-checkin-warning", "--lc-checkin-warning-text", "--lc-checkin-danger", "--lc-checkin-danger-text",
    "--lc-checkin-lilac", "--lc-checkin-lilac-text", "--lc-checkin-lilac-soft", "--lc-checkin-warm", "--lc-checkin-warm-soft", "--lc-checkin-warm-text",
    "--lc-checkin-bg", "--lc-checkin-surface", "--lc-checkin-surface-raised", "--lc-checkin-muted-surface", "--lc-checkin-border", "--lc-checkin-border-strong", "--lc-checkin-text", "--lc-checkin-muted",
    "--lc-checkin-deep", "--lc-checkin-deep-text", "--lc-checkin-gold", "--lc-checkin-gold-text", "--lc-checkin-shadow-sm", "--lc-checkin-shadow", "--lc-checkin-shadow-md", "--lc-checkin-shadow-lg", "--lc-checkin-focus",
    "--lc-checkin-radius-sm", "--lc-checkin-radius", "--lc-checkin-radius-lg", "--lc-checkin-motion-fast", "--lc-checkin-motion", "--lc-checkin-nav-height",
    "--lc-checkin-z-banner", "--lc-checkin-z-header", "--lc-checkin-z-nav", "--lc-checkin-z-fab", "--lc-checkin-z-popup",
    "--b3-theme-background", "--b3-theme-surface", "--b3-theme-surface-light", "--b3-border-color", "--b3-theme-on-background", "--b3-theme-on-surface-light", "--b3-theme-primary", "--b3-theme-success", "--b3-theme-warning", "--b3-theme-error",
] as const;

/* 星期名随插件语言：日序（0=日）用于编辑器勾选，一周首序用于月历表头。 */
const weekdaysFromSunday = (): string[] => [0, 1, 2, 3, 4, 5, 6].map((index) => t(`date.wd${index}`));
const calendarWeekdays = (): string[] => [1, 2, 3, 4, 5, 6, 0].map((index) => t(`date.wd${index}`));
const HISTORY_SOURCE_OPTIONS: readonly HistorySourceFilter[] = [
    "all",
    "manual",
    "tomato",
    "import",
    "api",
];

interface CheckinApi {
    name: string;
    protocol: string;
    version: number;
    capabilities: readonly CheckinCapability[];
    hasCapability: (name: unknown) => name is CheckinCapability;
    describe: () => Readonly<CheckinApiDescriptor>;
    getCapabilityInfo: () => Readonly<Record<CheckinCapability, CheckinCapabilityInfo>>;
    isReady: () => boolean;
    whenReady: () => Promise<boolean>;
    getStore: () => CheckinStore;
    getItems: () => CheckinItem[];
    getEvents: () => CheckinEvent[];
    getEventRangeSummary: (range: {startDate: string; endDateExclusive: string}, options?: EventRangeSummaryOptions) => EventRangeSummary;
    getOccasions: () => Occasion[];
    getTodayOccasions: () => VisibleOccasion[];
    completeOccasion: (id: string, occurrenceDate: string, completed: boolean) => Promise<boolean>;
    getSummaryContext: (range: SummaryRange) => ReturnType<typeof buildSummaryContext>;
    getCustomSummaryContext: (range: CustomSummaryRange) => ReturnType<typeof buildCustomSummaryContext>;
    getArchivedItems: () => CheckinItem[];
    setItemArchived: (itemId: string, archived: boolean) => Promise<boolean>;
    exportJson: () => string;
    exportCsv: () => string;
    recordEvent: (input: {itemId: string; value?: number; unit?: string; source?: CheckinEvent["source"]; note?: string; externalRef?: string}) => Promise<CheckinEvent | undefined>;
    startFocus: (itemId: string) => Promise<boolean>;
    stopFocus: () => Promise<boolean>;
    registerFocusAdapter: (adapter: FocusAdapter) => () => void;
    registerSummaryProvider: (provider: SummaryProvider) => () => void;
    summarize: (range: SummaryRange, providerId?: string) => Promise<string | undefined>;
    summarizeCustom: (range: CustomSummaryRange, providerId?: string) => Promise<string | undefined>;
    getSuggestionWorkflow: () => SuggestionWorkflowState | undefined;
    getSuggestionWorkflowSummary: () => {status: string; canApply: boolean; canUndo: boolean; consumedTokens: number; audits: number; updatedAt: string} | undefined;
    subscribe: (listener: (event: CheckinIntegrationEvent) => void) => () => void;
}

interface RecentRecord {
    eventId: string;
    itemId: string;
    message: string;
    progress: number;
    target: number;
    unit: string;
}

interface LockManagerLike {
    request<T>(name: string, options: {mode: "exclusive"}, callback: () => T | PromiseLike<T>): Promise<T>;
    /** ifAvailable 时拿不到锁会立刻 resolve(undefined)，用于拆除期不排队等待。 */
    request<T>(name: string, options: {mode: "exclusive"; ifAvailable: true}, callback: () => T | PromiseLike<T>): Promise<T | undefined>;
}

export default class CheckinPlugin extends Plugin {
    private store: CheckinStore = createDefaultStore();
    private lastPersistedStore: CheckinStore = createDefaultStore();
    private auditEntries: StoreAuditEntry[] = [];
    private snapshotHistory: ReturnType<typeof readStoreSnapshotHistory> = [];
    private occasionStore: OccasionStore = createDefaultOccasionStore();
    private userTemplates: UserTemplate[] = [];
    private customIconLibrary: string[] = [];
    private dockElement?: HTMLElement;
    private tabElement?: HTMLElement;
    private quickDialog?: Dialog;
    private quickDialogElement?: HTMLElement;
    private quickDialogViewportCleanup?: () => void;
    /* 每个表面（dock/tab/弹窗）分别记录「页面→滚动位置」和当前已渲染页。
       不能用一个全局旧页标记：同一轮会依次渲染多个表面，首个表面切页后会
       让后续表面把旧页面的 scrollTop 错记到新页面。 */
    private pageScrollTops = new WeakMap<HTMLElement, Map<string, number>>();
    private renderedPages = new WeakMap<HTMLElement, string>();
    private hostThemeSignatures = new WeakMap<HTMLElement, string>();
    /* 设置页分类导航监听随宿主表面生命周期清理，避免重渲染后旧滚动回调
       继续引用已替换的 DOM。 */
    private settingsNavigationCleanups = new WeakMap<HTMLElement, () => void>();
    private quickDialogFullscreen = false;
    private tabOpenPromise?: Promise<void>;
    private tabInstance?: {close: () => void};
    private isMobileFrontend = false;
    private supportsCustomTab = true;
    private todayGroupMode: TodayGroupMode = DEFAULT_VIEW_PREFERENCES.groupMode;
    private todaySortMode: CheckinItemSortMode = DEFAULT_VIEW_PREFERENCES.sortMode;
    private todayQuery = "";
    private pendingOnly = false;
    private completedCollapsed = DEFAULT_VIEW_PREFERENCES.completedCollapsed;
    /** Keep the Today priority reminder expanded across data-driven rerenders. */
    private priorityReminderExpanded = false;
    private appearance: CheckinAppearance = DEFAULT_VIEW_PREFERENCES.appearance;
    private dialogSizeMode: DialogSizeMode = DEFAULT_VIEW_PREFERENCES.dialogSizeMode;
    private palette: CheckinPalette = DEFAULT_VIEW_PREFERENCES.palette;
    private dialogScale = DEFAULT_VIEW_PREFERENCES.dialogScale;
    private dialogFixedSize = {...DEFAULT_VIEW_PREFERENCES.dialogFixedSize};
    private dialogRect?: {width: number; height: number} = DEFAULT_VIEW_PREFERENCES.dialogRect;
    private dialogOffset?: {x: number; y: number} = DEFAULT_VIEW_PREFERENCES.dialogOffset;

    /* "跟随思源" must resolve against the host theme, otherwise the dark
       appearance overrides never activate (the attribute would stay "system"). */
    /* 跟随思源：优先读思源 body 的 dark 类（实时反映主题切换），再退回配置与系统偏好。 */
    private resolvedAppearance(): "light" | "dark" {
        if (this.appearance === "system") {
            const body = typeof document !== "undefined" ? document.body : undefined;
            if (body?.classList.contains("dark")) return "dark";
            if (body?.classList.contains("light")) return "light";
            const hostMode = (window as unknown as {siyuan?: {config?: {appearance?: {mode?: number}}}}).siyuan?.config?.appearance?.mode;
            if (hostMode === 1) return "dark";
            if (hostMode === 0) return "light";
            return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return this.appearance;
    }

    /* Live-follow: when "跟随思源" is active and the host flips its theme,
       re-render every open surface so the palette switches instantly. */
    private startHostThemeWatcher() {
        if (this.hostThemeObserver || typeof MutationObserver === "undefined" || !document.body) return;
        let lastApplied = this.resolvedAppearance();
        let scheduled = 0;
        const apply = () => {
            scheduled = 0;
            if (this.disposed || this.disposing || this.appearance !== "system") return;
            const next = this.resolvedAppearance();
            if (next === lastApplied) return;
            lastApplied = next;
            this.render();
        };
        this.hostThemeObserver = new MutationObserver(() => {
            if (scheduled) window.clearTimeout(scheduled);
            scheduled = window.setTimeout(apply, 50);
        });
        this.hostThemeObserver.observe(document.body, {attributes: true, attributeFilter: ["class", "style"]});
        if (document.documentElement) this.hostThemeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ["class", "style", "data-theme-mode"]});
    }

    private stopHostThemeWatcher() {
        this.hostThemeObserver?.disconnect();
        this.hostThemeObserver = undefined;
    }

    private startHostMessageOffsetWatcher() {
        if (!this.isMobileFrontend || typeof document === "undefined" || !document.documentElement || !document.body) return;
        this.hostMessageOffsetCleanup?.();
        const root = document.documentElement;
        let frame = 0;
        let settleFrames = 0;
        let appliedOffset = 0;
        let target: HTMLElement | undefined;
        let targetObserver: MutationObserver | undefined;
        const apply = () => {
            frame = 0;
            const message = target ?? document.getElementById("message") ?? undefined;
            let messageBottom = 0;
            if (message) {
                const candidates = [message, ...Array.from(message.querySelectorAll<HTMLElement>(".b3-snackbar__content, [role=alert]"))];
                for (const node of candidates) {
                    const style = window.getComputedStyle(node);
                    const rect = node.getBoundingClientRect();
                    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) === 0) continue;
                    if (rect.width <= 0 || rect.height <= 0 || rect.top > 80 || rect.bottom <= 0) continue;
                    /* Ignore a full-viewport #message shell; use visible snackbar descendants instead. */
                    if (node === message && rect.height > window.innerHeight * 0.8 && candidates.length > 1) continue;
                    messageBottom = Math.max(messageBottom, Math.ceil(rect.bottom));
                }
            }
            const headers = Array.from(document.querySelectorAll<HTMLElement>(":is(.lc-checkin-host--mobile, .lc-checkin-dialog-host--mobile) .lc-checkin--review .lc-checkin__editor-header"));
            const naturalTop = headers.length ? Math.min(...headers.map((header) => header.getBoundingClientRect().top - appliedOffset)) : 0;
            const naturalBottom = headers.length ? Math.max(...headers.map((header) => header.getBoundingClientRect().bottom - appliedOffset)) : naturalTop;
            const availableOffset = Math.max(0, window.innerHeight - naturalBottom - 120);
            appliedOffset = messageBottom && headers.length ? Math.min(Math.max(0, messageBottom + 8 - naturalTop), availableOffset) : 0;
            root.style.setProperty("--lc-checkin-host-message-offset", `${Math.ceil(appliedOffset)}px`);
            root.style.setProperty("--lc-checkin-review-header-bottom", `${Math.ceil(naturalBottom + appliedOffset)}px`);
            if (settleFrames > 0) {
                settleFrames -= 1;
                frame = window.requestAnimationFrame(apply);
            }
        };
        const schedule = () => {
            /* CSS snackbar transitions change geometry without mutating attributes;
               sample the next half-second so the avoidance follows the animation. */
            settleFrames = 30;
            if (frame) return;
            frame = window.requestAnimationFrame(apply);
        };
        const attachTarget = () => {
            const next = document.getElementById("message") ?? undefined;
            if (next === target) return;
            targetObserver?.disconnect();
            target = next;
            if (target && typeof MutationObserver !== "undefined") {
                targetObserver = new MutationObserver(schedule);
                targetObserver.observe(target, {attributes: true, childList: true, subtree: true});
            }
            schedule();
        };
        const bodyObserver = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(() => {
            attachTarget();
            schedule();
        });
        bodyObserver?.observe(document.body, {childList: true, subtree: true});
        window.addEventListener("resize", schedule, {passive: true});
        attachTarget();
        schedule();
        this.hostMessageOffsetCleanup = () => {
            bodyObserver?.disconnect();
            targetObserver?.disconnect();
            window.removeEventListener("resize", schedule);
            if (frame) window.cancelAnimationFrame(frame);
            root.style.removeProperty("--lc-checkin-host-message-offset");
            root.style.removeProperty("--lc-checkin-review-header-bottom");
            this.hostMessageOffsetCleanup = undefined;
        };
    }

    private stopHostMessageOffsetWatcher() {
        this.hostMessageOffsetCleanup?.();
    }
    private reducedMotion = DEFAULT_VIEW_PREFERENCES.reducedMotion;
    private hapticFeedback = DEFAULT_VIEW_PREFERENCES.hapticFeedback;
    private focusTimerProvider: FocusTimerProvider = DEFAULT_VIEW_PREFERENCES.focusTimerProvider;
    private pendingFocusItemId?: string;
    private pendingLocalItemId?: string;
    /* 仅当变更发生在当前日时才尝试 Today 局部刷新；跨日事件必须走完整投影。 */
    private pendingLocalItemDate?: string;
    private collapsedTodayGroups = new Set<string>();
    /* T-011 回顾页展开的折叠区块（trend/log/upcoming/achievements），空集 = 全部折叠。 */
    private reviewFoldSections = new Set<string>();
    private reviewFoldTouched = false;
    /* T-1217 Markdown 报告包含的区块（视图偏好持久化）。 */
    reportSections: ReportSectionToggles = {...DEFAULT_REPORT_SECTIONS};
    /* T-1231 笔记锚点：回写连续失败的锚点（内存挂起标志，重载后重置重试）。 */
    private suspendedAnchors = new Set<string>();
    /* T-1234/T-1236 渲染块监听器清理。 */
    private renderBlocksUnsubscribers: Array<() => void> = [];
    private renderBlockObservers = new Map<HTMLElement, () => void>();
    /* 思源的 #message 是插件外部的 fixed 提示层；移动端回顾工具栏按
       实际几何位置避让，不能写死某个 WebView 的提示高度。 */
    private hostMessageOffsetCleanup?: () => void;

    private handleProtyleLoaded = (event: {detail: {protyle: IProtyle}}) => {
        this.observeRenderBlocks(event.detail.protyle);
    };

    private handleRenderBlocksRefresh = () => {
        this.refreshAllRenderBlocks();
    };

    private renderBlockDeps() {
        return {
            getStore: () => this.store,
            getNow: () => currentCalendarDate(),
            onJumpDate: (date: string) => this.jumpToHistoryDate(date),
        };
    }

    private observeRenderBlocks(protyle: IProtyle) {
        const existing = this.renderBlockObservers.get(protyle.element);
        if (existing) return;
        this.renderBlockObservers.set(protyle.element, observeCheckinBlocks(protyle.element, this.renderBlockDeps()));
    }

    private refreshAllRenderBlocks() {
        /* 全 DOM 扫描（document.body）：不依赖 app.protyles（部分启动时序/版本下为空），
           渲染器自身按 data-checkin-preview 幂等跳过已有预览。 */
        renderCheckinBlocksIn(document.body, this.renderBlockDeps(), {force: true});
    }

    /* T-1235：点击渲染块日期 → 跳回顾页并定位该日（无效日期拒绝）。 */
    private jumpToHistoryDate(date: string) {
        if (!isValidLocalDateInput(date)) return;
        this.selectedHistoryDate = date;
        this.historyMonth = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, 1);
        this.showReview();
    }
    private reminderFilter: ReminderFilter = "all";
    private reminderUserActions: ReminderUserAction[] = [];
    private weekStripVisible = DEFAULT_VIEW_PREFERENCES.showWeekStrip;
    private hostThemeObserver?: MutationObserver;
    private focusTimerState?: {itemId: string; totalSec: number; remainingSec: number; running: boolean};
    private focusTimerInterval?: number;
    private focusCelebrationTimer?: number;
    private focusTimerRoot?: HTMLElement;
    private focusTimerMinutes = 25;
    private heatmapYearOffset = 0;
    private renderRafId = 0;
    private bulkMode = false;
    private bulkSelected = new Set<string>();
    private occasionSearchQuery = "";
    private occasionStatusFilter: "all" | "enabled" | "disabled" = "all";
    private occasionKindFilter: "all" | "birthday" | "anniversary" | "scheduled" = "all";
    private occasionTimeFilter: "all" | "today" | "upcoming" | "ended" = "all";
    private occasionTemplatesOpen = false;
    private occasionTemplateCategory: "recommended" | import("./occasions").OccasionTemplateCategory = "recommended";
    private celebration?: {message: string; itemName: string};
    private lastExportAt?: string;
    private pendingAttachments = new Map<string, string>();
    private currentStreaks = new Map<string, number>();
    private bestStreakItem?: CheckinItem;
    private bestStreakValue = 0;
    private currentPage: "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings" = "today";
    private insightsItemId?: string;
    private insightsReturnPage: "today" | "review" = "today";
    private editingId?: string;
    private editingFingerprint?: string;
    private saveQueue: Promise<void> = Promise.resolve();
    private mutationQueue: Promise<void> = Promise.resolve();
    /** 拆除期写门禁：见 src/teardown.ts 与 persist() 的拦截分支。 */
    private readonly teardownWrites = createTeardownWriteGate();
    private auditFlushTimer?: number;
    private lastPersistedSuggestionWorkflow?: string;
    /** 底栏番茄钟完成回写收件箱(D-227):已接收未入账的完成通知,持久化于独立存储。 */
    private dockTomatoInbox: DockTomatoInboxStore = {schemaVersion: 1, items: []};
    private dockTomatoInboxTimer?: number;
    private api?: CheckinApi;
    private focusAdapters = new Map<string, FocusAdapter>();
    private disposeDockTomatoBridge?: () => void;
    private summaryProviders = new Map<string, SummaryProvider>();
    private summaryRange: SummaryRange = "week";
    private summaryCustomRange?: {startDate: string; endDate: string};
    private summaryText?: string;
    private suggestionWorkflow?: SuggestionWorkflowState;
    private summaryRefreshing = false;
    private analysisHistory: AgentAnalysisSnapshot[] = [];
    private storageReady = false;
    private activeFocusAdapter?: FocusAdapter;
    private focusBusy = false;
    private focusOperation: Promise<void> = Promise.resolve();
    private apiSubscriptions = new Set<() => void>();
    private historyMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    private selectedHistoryDate = dateKey(new Date());
    private historyQuery = "";
    private historySource: HistorySourceFilter = "all";
    private historyOrder: HistorySortOrder = "newest";
    private archivedQuery = "";
    private editingHistoryNoteId?: string;
    private summaryRequestId = 0;
    private currentDateKey = dateKey(new Date());
    private midnightTimer?: number;
    private recentRecord?: RecentRecord;
    private recentRecordTimer?: number;
    private saveState: "idle" | "saving" | "error" = "idle";
    private syncNoticeTimer?: number;
    private disposed = false;
    private disposing = false;
    private acceptingOperations = true;
    private initializationState: "loading" | "ready" | "failed" = "loading";
    private agentCapabilityState: "pending" | "registered" | "unsupported" | "failed" = "pending";
    private agentCapabilityIds: string[] = [];
    private agentCapabilityError?: string;
    private quickActionAdapters = new Map<string, (value: string) => void | Promise<void>>();
    private quickActionAdapterTargets = new Map<string, CheckinQuickActionTarget[]>();
    private mobileTopBarButton?: HTMLElement;
    private mobileTopBarRetryTimer?: number;
    private speedSwitchQuickActionDisposers: Array<() => void> = [];
    private speedSwitchRetryTimer?: number;
    private editingOccasionId?: string;
    private readyResolver?: (ready: boolean) => void;
    private readonly readyPromise = new Promise<boolean>((resolve) => {
        this.readyResolver = resolve;
    });
    private readonly handleWindowFocus = () => {
        this.refreshDateBoundary();
        void this.reconcileStore();
        this.ensureMobileTopBarButton();
        this.ensureSpeedSwitchQuickActions();
    };

    onload() {
        this.disposed = false;
        this.disposing = false;
        this.acceptingOperations = true;
        this.initializationState = "loading";
        const frontend = getFrontend();
        this.isMobileFrontend = frontend === "mobile" || frontend === "browser-mobile";
        this.supportsCustomTab = !this.isMobileFrontend;
        const plugin = this;
        this.startHostThemeWatcher();
        this.startHostMessageOffsetWatcher();
        this.addIcons(`<symbol id="iconLvCheckin" viewBox="0 0 32 32">
            <path d="M16 2.5 19.9 6l5.2-.3.8 5.1 4.1 3.2-2.6 4.5.9 5.1-5 1.4-2.8 4.3-4.8-2.1-4.8 2.1-2.8-4.3-5-1.4.9-5.1-2.6-4.5 4.1-3.2.8-5.1L12.1 6 16 2.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m10 16 3.7 3.7L22.5 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>`);

        this.addDock({
            id: DOCK_TYPE,
            config: {
                position: "LeftBottom",
                /* Dock API 没有 minWidth；420px 为推荐宽度，拖窄后由容器查询兜底。 */
                size: {width: 420, height: 0},
                icon: "iconLvCheckin",
                title: t("dock.title"),
            },
            data: {},
            type: DOCK_TYPE,
            init: function (this: {element: Element}) {
                plugin.dockElement = this.element as HTMLElement;
                /* 侧边栏面板需要自己的宿主类名：窄面板靠它拿到底部导航与紧凑布局
                   （容器查询不能匹配容器自身，rail 在窄容器又是隐藏的）。 */
                plugin.dockElement.classList.add("lc-checkin-dock-host");
                plugin.render();
            },
            update: function () {
                plugin.renderBackgroundUpdate();
            },
            destroy: function () {
                plugin.dockElement = undefined;
            },
        });

        if (this.supportsCustomTab) this.addTab({
            type: TAB_TYPE,
            init: function (this: {element: Element; tab: {close: () => void}}) {
                const element = this.element as HTMLElement;
                element.classList.add("lc-checkin-tab-host");
                plugin.tabElement = element;
                plugin.tabInstance = this.tab;
                plugin.render();
            },
            update: function (this: {element: Element}) {
                if (plugin.tabElement === this.element) {
                    plugin.render();
                }
            },
            destroy: function (this: {element: Element; tab: {close: () => void}}) {
                if (plugin.tabElement === this.element) {
                    plugin.tabElement = undefined;
                    if (plugin.tabInstance === this.tab) {
                        plugin.tabInstance = undefined;
                    }
                    if (!plugin.disposed && !plugin.disposing) {
                        plugin.render();
                    }
                }
            },
        });

        this.addCommand({
            langKey: "openCheckin",
            hotkey: QUICK_DIALOG_HOTKEY,
            callback: () => this.toggleQuickDialog(),
            globalCallback: () => this.toggleQuickDialog(),
        });
        if (this.supportsCustomTab) this.addCommand({
            langKey: "openCheckinTab",
            callback: () => this.openTabPage(),
            globalCallback: () => this.openTabPage(),
        });

        this.api = this.createApi();
        (window as Window & {siyuanCheckin?: CheckinApi})[CHECKIN_API_NAME] = this.api;
        this.disposeDockTomatoBridge = installDockTomatoBridge(this.api, () => {
            this.renderBackgroundUpdate();
            if (this.storageReady && getDockTomatoCompletionIssues().length) void this.saveData(FOCUS_DIAGNOSTICS_STORAGE_NAME, serializeDockTomatoCompletionIssues()).catch(() => undefined);
        }, {
            releaseFocusAdapter: (adapter) => releaseFocusAdapterFor(this as unknown as FocusAdapterHost, adapter),
            processDockTomatoCompletion: (entry) => this.processDockTomatoCompletion(entry),
            dockTomatoTombstonedIdentities: () => this.collectDockTomatoTombstonedIdentities(),
        });
        window.addEventListener("focus", this.handleWindowFocus);
        if (this.isMobileFrontend) this.ensureMobileTopBarButton();
    }

    async onLayoutReady() {
        this.addTopBar({
            id: "openCheckinDialog",
            icon: "iconLvCheckin",
            position: "right",
            title: t("entry.topBar"),
            callback: () => this.toggleQuickDialog(),
        });
        /* T-1234/T-1235/T-1236 渲染块：protyle 装载事件驱动 + 打卡数据事件刷新。
           app.protyles 是运行时成员（ typings 未声明），防御式访问。 */
        if (typeof this.eventBus?.on === "function") {
            this.eventBus.on("loaded-protyle-static", this.handleProtyleLoaded);
            this.eventBus.on("loaded-protyle-dynamic", this.handleProtyleLoaded);
            this.renderBlocksUnsubscribers.push(() => {
                this.eventBus.off("loaded-protyle-static", this.handleProtyleLoaded);
                this.eventBus.off("loaded-protyle-dynamic", this.handleProtyleLoaded);
            });
        }
        window.addEventListener(CHECKIN_EVENT_NAMES.eventRecorded, this.handleRenderBlocksRefresh);
        window.addEventListener(CHECKIN_EVENT_NAMES.eventDeleted, this.handleRenderBlocksRefresh);
        window.addEventListener(CHECKIN_EVENT_NAMES.analyticsUpdated, this.handleRenderBlocksRefresh);
        this.renderBlocksUnsubscribers.push(() => {
            window.removeEventListener(CHECKIN_EVENT_NAMES.eventRecorded, this.handleRenderBlocksRefresh);
            window.removeEventListener(CHECKIN_EVENT_NAMES.eventDeleted, this.handleRenderBlocksRefresh);
            window.removeEventListener(CHECKIN_EVENT_NAMES.analyticsUpdated, this.handleRenderBlocksRefresh);
        });
        try {
            await this.withStorageLock(async () => {
                const stored = await this.loadData(STORAGE_NAME);
                const preferences = normalizeViewPreferences(await this.loadData(VIEW_PREFERENCES_NAME));
                const occasions = normalizeOccasionStore(await this.loadData(OCCASIONS_STORAGE_NAME));
                const storedTemplates = await this.loadData(USER_TEMPLATES_NAME);
                const storedIconLibrary = await this.loadData(CUSTOM_ICON_LIBRARY_NAME);
                const storedReminderActions = await this.loadData(REMINDER_ACTIONS_NAME);
                this.reminderUserActions = deserializeReminderUserActions(typeof storedReminderActions === "string" ? storedReminderActions : "");
                const storedSuggestionWorkflow = await this.loadData(SUGGESTION_WORKFLOW_STORAGE_NAME);
                this.rememberSuggestionWorkflowBaseline(storedSuggestionWorkflow);
                const storedFocusDiagnostics = await this.loadData(FOCUS_DIAGNOSTICS_STORAGE_NAME);
                const storedSnapshots = await this.loadData(BACKUP_STORAGE_NAME);
                const storedDockTomatoInbox = await this.loadData(DOCKTOMATO_INBOX_STORAGE_NAME);
                if (this.disposed || this.disposing) return;
                this.store = normalizeStore(stored);
                this.lastPersistedStore = this.cloneStore(this.store);
                const restoredWorkflow = typeof storedSuggestionWorkflow === "string"
                    ? deserializeSuggestionWorkflow(storedSuggestionWorkflow, this.store.items)
                    : undefined;
                this.suggestionWorkflow = restoredWorkflow && shouldRestoreSuggestionWorkflow(restoredWorkflow) ? restoredWorkflow : undefined;
                const audit = await this.loadData(AUDIT_STORAGE_NAME);
                this.analysisHistory = await loadAnalysisSnapshots((key) => this.loadData(key), AGENT_ANALYSIS_CACHE_KEY);
                this.summaryText = this.analysisHistory[this.analysisHistory.length - 1]?.text;
                this.auditEntries = normalizeStoreAudit(audit);
                this.snapshotHistory = readStoreSnapshotHistory(storedSnapshots);
                this.occasionStore = occasions;
                this.userTemplates = Array.isArray(storedTemplates) ? storedTemplates.map((item) => normalizeUserTemplate(item)).filter((item): item is UserTemplate => Boolean(item)) : [];
                this.customIconLibrary = normalizeCustomIconLibrary(storedIconLibrary);
                restoreDockTomatoCompletionIssues(storedFocusDiagnostics);
                this.dockTomatoInbox = normalizeInboxStore(storedDockTomatoInbox);
                this.applyViewPreferences(preferences);
                this.storageReady = true;
                if (storeNeedsMigration(stored, this.store)) {
                    await this.persist();
                }
            });
            if (this.disposed || this.disposing) return;
            this.initializationState = "ready";
            this.settleReady(true);
            if (this.isMobileFrontend) this.ensureMobileTopBarButton();
            this.ensureSpeedSwitchQuickActions();
            void this.reconcileDockTomatoInbox();
        } catch (error) {
            if (this.disposed || this.disposing) return;
            this.storageReady = false;
            this.initializationState = "failed";
            this.settleReady(false);
            showMessage(t("msg.dataLoadFail", {error: String(error)}));
        }
        if (this.disposed || this.disposing) return;
        /* 智能体能力注册与存储读取结果解耦：处理器读的是实时状态、写入另有 canRecord 守卫，
           所以存储读取失败时也要把入口注册上，别让「读数据失败」伪装成「宿主不支持智能体」。 */
        this.registerSiYuanAgentCapability();
        this.render();
        this.scheduleMidnightRefresh();
        /* T-1234：启动时渲染块可能先于存储装载渲染了空数据预览——装载完成后强制刷新；
           protyle 可能晚于 onLayoutReady 创建，用延迟补扫兜底（含观察器补挂）。 */
        this.refreshAllRenderBlocks();
        const deferredSweeps = [1500, 4000].map((delay) => window.setTimeout(() => {
            if (!this.disposed && !this.disposing) this.refreshAllRenderBlocks();
        }, delay));
        this.renderBlocksUnsubscribers.push(() => deferredSweeps.forEach((timer) => window.clearTimeout(timer)));
    }

    async onDataChanged() {
        await this.reconcileStore();
        if (!this.acceptingOperations || this.initializationState !== "ready" || !this.storageReady) return;
        try {
            const preferences = normalizeViewPreferences(await this.loadData(VIEW_PREFERENCES_NAME));
            this.occasionStore = normalizeOccasionStore(await this.loadData(OCCASIONS_STORAGE_NAME));
            const storedTemplates = await this.loadData(USER_TEMPLATES_NAME);
            const storedIconLibrary = await this.loadData(CUSTOM_ICON_LIBRARY_NAME);
            const storedReminderActions = await this.loadData(REMINDER_ACTIONS_NAME);
            this.reminderUserActions = deserializeReminderUserActions(typeof storedReminderActions === "string" ? storedReminderActions : "");
            const storedSuggestionWorkflow = await this.loadData(SUGGESTION_WORKFLOW_STORAGE_NAME);
            this.rememberSuggestionWorkflowBaseline(storedSuggestionWorkflow);
            const storedFocusDiagnostics = await this.loadData(FOCUS_DIAGNOSTICS_STORAGE_NAME);
            this.userTemplates = Array.isArray(storedTemplates) ? storedTemplates.map((item) => normalizeUserTemplate(item)).filter((item): item is UserTemplate => Boolean(item)) : [];
            this.customIconLibrary = normalizeCustomIconLibrary(storedIconLibrary);
            restoreDockTomatoCompletionIssues(storedFocusDiagnostics);
            if (typeof storedSuggestionWorkflow === "string") {
                const restoredWorkflow = deserializeSuggestionWorkflow(storedSuggestionWorkflow, this.store.items);
                if (restoredWorkflow && shouldRestoreSuggestionWorkflow(restoredWorkflow)) {
                    if (isWorkflowNewer(restoredWorkflow, this.suggestionWorkflow)) this.suggestionWorkflow = restoredWorkflow;
                } else if (!this.suggestionWorkflow) {
                    void this.persistSuggestionWorkflow().catch(() => undefined);
                }
            }
            this.applyViewPreferences(preferences);
            this.renderBackgroundUpdate();
        } catch (error) {
            if (!this.disposing) showMessage(t("msg.prefRefreshFail", {error: String(error)}));
        }
    }

    /* T-1231 卸载清理：尽力清除所有锚点块上的本插件属性键（custom-lv-checkin）。
       块可能已被删除——逐个尝试，失败不中断；卸载后插件存储保留，重装可恢复绑定关系。 */
    async uninstall() {
        for (const item of this.store.items) {
            const blockId = item.noteAnchor?.blockId;
            if (!blockId) continue;
            try {
                await fetchSyncPost("/api/attr/setBlockAttrs", {id: blockId, attrs: {[ANCHOR_ATTR_KEY]: ""}});
            } catch {
                // 尽力而为；卸载流程不因单个失败中断。
            }
        }
    }

    async onunload() {
        this.disposing = true;
        /* 拆除预算由宿主统一计时，这里从 onunload 入口开始自计一个更小的预算，
           让队列排空与补写都在被强制销毁之前给出确定的结果或提示。 */
        const deadline = createTeardownDeadline(TEARDOWN_DRAIN_BUDGET_MS);
        this.teardownWrites.deferWrites();
        /* 卸载时专注仍在进行：入账必须在关闭 acceptingOperations 之前发起，
           否则排队器会直接丢弃这次写入，整段专注白做。 */
        if (this.focusTimerState) void finishFocusTimerFor(this as unknown as FocusTimerHost, true);
        stopFocusTimerFor(this as unknown as FocusTimerHost);
        this.acceptingOperations = false;
        this.settleReady(false);
        this.renderBlocksUnsubscribers.splice(0).forEach((dispose) => dispose());
        this.renderBlockObservers.forEach((disconnect) => disconnect());
        this.renderBlockObservers.clear();
        this.stopHostThemeWatcher();
        this.stopHostMessageOffsetWatcher();
        [this.dockElement, this.tabElement, this.quickDialogElement].forEach((root) => {
            if (!root) return;
            const cleanup = this.settingsNavigationCleanups.get(root);
            cleanup?.();
            this.settingsNavigationCleanups.delete(root);
        });
        window.removeEventListener("focus", this.handleWindowFocus);
        this.mobileTopBarButton?.remove();
        this.mobileTopBarButton = undefined;
        if (this.mobileTopBarRetryTimer !== undefined) {
            window.clearTimeout(this.mobileTopBarRetryTimer);
            this.mobileTopBarRetryTimer = undefined;
        }
        this.speedSwitchQuickActionDisposers.splice(0).forEach((dispose) => dispose());
        if (this.speedSwitchRetryTimer !== undefined) {
            window.clearTimeout(this.speedSwitchRetryTimer);
            this.speedSwitchRetryTimer = undefined;
        }
        this.quickActionAdapters.clear();
        this.quickActionAdapterTargets.clear();
        if (this.recentRecordTimer !== undefined) {
            window.clearTimeout(this.recentRecordTimer);
            this.recentRecordTimer = undefined;
        }
        if (this.syncNoticeTimer !== undefined) {
            window.clearTimeout(this.syncNoticeTimer);
            this.syncNoticeTimer = undefined;
        }
        this.closeQuickDialog();
        const openTabRequest = this.tabOpenPromise;
        if (openTabRequest) {
            await waitWithinDeadline(openTabRequest.catch(() => undefined), deadline);
        }
        this.tabInstance?.close();
        this.tabInstance = undefined;
        this.tabElement = undefined;
        if (this.midnightTimer !== undefined) {
            window.clearTimeout(this.midnightTimer);
            this.midnightTimer = undefined;
        }
        if (this.dockTomatoInboxTimer !== undefined) {
            window.clearTimeout(this.dockTomatoInboxTimer);
            this.dockTomatoInboxTimer = undefined;
        }
        this.summaryRequestId += 1;
        [...this.apiSubscriptions].forEach((dispose) => dispose());
        this.disposeDockTomatoBridge?.();
        this.disposeDockTomatoBridge = undefined;
        const host = window as Window & {siyuanCheckin?: CheckinApi};
        if (host.siyuanCheckin === this.api) {
            delete host.siyuanCheckin;
        }
        const drained = await waitWithinDeadline(Promise.all([
            this.mutationQueue.catch(() => undefined),
            this.saveQueue.catch(() => undefined),
            this.focusOperation.catch(() => undefined),
            this.flushPendingAuditPersist(),
        ]), deadline);
        const hasDeferredWrites = this.teardownWrites.resume();
        if (drained === "timeout" || hasDeferredWrites) {
            const flushed = await waitWithinDeadline(this.teardownFinalFlush(), deadline);
            if (flushed !== "done") showMessage(t("msg.teardownTruncated"), 5200);
        }
        const activeFocusAdapter = this.activeFocusAdapter;
        /* 卸载=纯解绑（D-226）：外部计时器(底栏番茄钟)继续运行,不模拟用户停止;
           内置计时器已在上方 stopFocusTimerFor 收尾。 */
        this.activeFocusAdapter = undefined;
        if (activeFocusAdapter && activeFocusAdapter.id !== DOCK_TOMATO_ADAPTER_ID) {
            /* 非跨插件适配器保留原有停止兜底,避免未来进程内适配器泄漏。 */
            await waitWithinDeadline(this.stopAdapterSilently(activeFocusAdapter), deadline);
        }
        this.disposed = true;
        this.storageReady = false;
        this.initializationState = "failed";
        this.focusAdapters.clear();
        this.summaryProviders.clear();
    }

    /* 方法体外置于 api.ts（T-022）；宿主成员经 CheckinApiHost 结构化接口声明。 */
    private createApi(): CheckinApi {
        return createCheckinApi(this as unknown as CheckinApiHost);
    }

    private cloneStore(store: CheckinStore = this.store): CheckinStore {
        return cloneStoreValue(store);
    }

    private async recordExternalEvent(input: {itemId: string; value?: number; unit?: string; source?: CheckinEvent["source"]; note?: string; externalRef?: string}, moment: ActionMoment, expectedRevisionFingerprint?: string): Promise<CheckinEvent | undefined> {
        if (this.disposed || this.initializationState !== "ready" || !input || typeof input !== "object" || !this.storageReady) {
            return undefined;
        }
        const item = getActiveItemById(this.store, input.itemId);
        const actionDate = calendarDateFromKey(moment.localDate);
        if (!item || !isItemAvailableOnDate(item, actionDate)) {
            return undefined;
        }
        if (input.value !== undefined && typeof input.value !== "number") {
            return undefined;
        }
        const value = input.value ?? 1;
        if (!Number.isFinite(value) || value < 0) {
            return undefined;
        }
        const source: CheckinEvent["source"] = input.source === "manual" || input.source === "tomato" || input.source === "import" ? input.source : "api";
        const externalRef = typeof input.externalRef === "string" && input.externalRef ? input.externalRef : undefined;
        const taskHorizonRef = externalRef?.trim();
        if (taskHorizonRef?.startsWith("taskhorizon:") && (source !== "api" || !isTaskHorizonExternalRef(taskHorizonRef))) {
            return undefined;
        }
        if (externalRef) {
            const existing = this.store.events.find((event) => event.itemId === item.id && event.source === source && event.externalRef === externalRef);
            if (existing) {
                return {...existing};
            }
        }
        if (!expectedRevisionFingerprint || this.revisionFingerprint(item, actionDate) !== expectedRevisionFingerprint) {
            return undefined;
        }
        const revision = getItemRevisionForDate(item, actionDate);
        const requestedUnit = typeof input.unit === "string" && input.unit.trim() ? input.unit.trim().slice(0, 16) : revision.unit;
        if (requestedUnit !== revision.unit) {
            return undefined;
        }
        const unit = revision.unit;
        const note = typeof input.note === "string" ? input.note : undefined;
        const event = this.makeEvent(item, value, source, unit, note, externalRef, moment);
        const previous = this.store;
        const next = appendEvent(this.store, event);
        if (next === this.store) return undefined;
        this.store = next;
        try {
            await this.persist();
        } catch {
            this.store = previous;
            return undefined;
        }
        this.invalidateSummary();
        this.broadcast({type: "event-recorded", item, event});
        this.broadcast({type: "analytics-updated", analyticsAsOf: event.localDate});
        this.pendingLocalItemId = item.id;
        this.pendingLocalItemDate = event.localDate;
        this.renderBackgroundUpdate();
        this.maybeAutoArchiveAfterRecord(item);
        return {...event};
    }

    /** 自动归档检查（D-165/T-1161）：单条与批量记录共享同一批处理入口。 */
    private maybeAutoArchiveAfterRecord(item: CheckinItem): void {
        this.maybeAutoArchiveItemsAfterRecord([item]);
    }

    /** 达标项目在一次 mutation 中统一归档和持久化；撤销仍不会自动恢复。 */
    private maybeAutoArchiveItemsAfterRecord(items: readonly CheckinItem[]): void {
        if (this.disposed || this.disposing) return;
        const eligibleIds = new Set(items.filter((item) => {
            const target = item.autoArchive?.afterDays;
            return Boolean(target && !item.archived && countCompletedDays(this.store, item, currentCalendarDate()) >= target);
        }).map((item) => item.id));
        if (!eligibleIds.size) return;
        void this.enqueueMutation(async () => {
            const currentEligible = new Set<string>();
            const targets = new Map<string, number>();
            const asOf = currentCalendarDate();
            for (const id of eligibleIds) {
                const current = getItemById(this.store, id);
                const target = current?.autoArchive?.afterDays;
                if (!current || !target || current.archived || countCompletedDays(this.store, current, asOf) < target) continue;
                currentEligible.add(id);
                targets.set(id, target);
            }
            if (!currentEligible.size) return [] as Array<{item: CheckinItem; target: number}>;
            const previous = this.store;
            const archived = this.applyArchivedItems(currentEligible, captureActionMoment());
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                return [] as Array<{item: CheckinItem; target: number}>;
            }
            this.invalidateSummary();
            for (const item of archived) {
                this.broadcast({type: "item-updated", item});
                this.broadcast({type: "item-archived", item});
            }
            this.renderBackgroundUpdate();
            return archived.map((item) => ({item, target: targets.get(item.id) || 0}));
        }).then((archived) => {
            if (!archived?.length) return;
            if (archived.length === 1) showMessage(t("msg.autoArchived", {name: archived[0].item.name, n: archived[0].target}));
            else showMessage(t("msg.autoArchivedMany", {n: archived.length}));
        }).catch(() => undefined);
    }

    /* ===== 底栏番茄钟完成回写(D-227):收件箱、内部写入器与幂等重试 =====
       写入判定顺序固定为:已入账 duplicate → 墓碑 discarded → 项目/映射/跳过日 blocked → 写入。
       duplicate 判定必须在项目可用性之前,否则归档后重复通知会误报 missing-item。 */

    private collectDockTomatoTombstonedIdentities(): ReadonlySet<string> {
        const identities = new Set<string>();
        for (const tombstone of this.store.eventTombstones || []) {
            if (tombstone.source !== "tomato") continue;
            const ref = tombstone.externalRef || "";
            if (!ref.startsWith("docktomato:")) continue;
            const identity = ref.slice("docktomato:".length);
            if (identity) identities.add(identity);
        }
        return identities;
    }

    /** 内部写入器:调用方已持有存储锁(enqueueMutation),不得再经公开 recordEvent 重新排队。 */
    private async recordDockTomatoCompletionUnlocked(entry: DockTomatoPendingCompletion): Promise<DockTomatoCompletionWriteResult> {
        if (this.disposed || this.disposing || this.initializationState !== "ready" || !this.storageReady) return {kind: "retry", reason: "storage-not-ready"};
        const ref = entry.externalRef;
        const existing = this.store.events.find((event) => event.itemId === entry.itemId && event.source === "tomato" && event.externalRef === ref);
        if (existing) return {kind: "duplicate", eventId: existing.id};
        if ((this.store.eventTombstones || []).some((tombstone) => tombstone.source === "tomato" && tombstone.externalRef === ref)) return {kind: "discarded"};
        const item = getItemById(this.store, entry.itemId);
        if (!item) return {kind: "blocked", reason: "missing-item"};
        if (item.archived) return {kind: "blocked", reason: "archived-item"};
        if (item.direction === "atMost") return {kind: "blocked", reason: "at-most-item"};
        const completionDate = calendarDateFromKey(entry.localDate);
        if (!isItemAvailableOnDate(item, completionDate)) return {kind: "blocked", reason: "not-scheduled"};
        const revision = getItemRevisionForDate(item, completionDate);
        if (revision.kind === "binary") return {kind: "blocked", reason: "mapping-changed"};
        if (revision.unit !== entry.itemUnit) return {kind: "blocked", reason: "mapping-changed"};
        const currentMode = item.tomatoMode === "sessions" ? "sessions" : "minutes";
        if (currentMode !== entry.tomatoMode) return {kind: "blocked", reason: "mapping-changed"};
        /* 跳过日:保留待处理由用户决定,不默默删除跳过、也不把专注转成破戒。 */
        if (getSkipDatesForItem(this.store, entry.itemId).has(entry.localDate) && !isComplete(this.store, item, completionDate)) {
            return {kind: "blocked", reason: "skipped-day"};
        }
        const value = dockTomatoCompletionValue(revision.unit, entry.tomatoMode, entry.durationMinutes);
        if (value === undefined || value <= 0) return {kind: "blocked", reason: "invalid-duration"};
        const event = this.makeEvent(item, value, "tomato", revision.unit, t("record.tomatoSource"), ref, {occurredAt: entry.occurredAt, localDate: entry.localDate});
        const previous = this.store;
        const next = appendEvent(this.store, event);
        if (next === this.store) {
            const stored = this.store.events.find((candidate) => candidate.itemId === entry.itemId && candidate.source === "tomato" && candidate.externalRef === ref);
            return stored ? {kind: "duplicate", eventId: stored.id} : {kind: "discarded"};
        }
        this.store = next;
        try {
            await this.persist();
        } catch {
            this.store = previous;
            return {kind: "retry", reason: "persist-failed"};
        }
        this.invalidateSummary();
        this.broadcast({type: "event-recorded", item, event});
        this.broadcast({type: "analytics-updated", analyticsAsOf: event.localDate});
        this.pendingLocalItemId = item.id;
        this.pendingLocalItemDate = event.localDate;
        this.renderBackgroundUpdate();
        this.maybeAutoArchiveAfterRecord(item);
        /* 锚点回写是尽力而为的旁路(D-218):失败不影响入账;
           自动来源说明不追加为用户备注,仅刷新锚点状态属性。 */
        void this.writebackNoteAnchor(item, {state: "done", value, unit: revision.unit});
        return {kind: "recorded", eventId: event.id};
    }

    private async persistDockTomatoInbox(): Promise<boolean> {
        try {
            await this.saveData(DOCKTOMATO_INBOX_STORAGE_NAME, serializeInboxStore(this.dockTomatoInbox));
            return true;
        } catch {
            return false;
        }
    }

    private scheduleDockTomatoInboxWake(): void {
        if (this.dockTomatoInboxTimer !== undefined) {
            window.clearTimeout(this.dockTomatoInboxTimer);
            this.dockTomatoInboxTimer = undefined;
        }
        if (this.disposed || this.disposing) return;
        const delay = inboxNextWakeDelayMs(this.dockTomatoInbox, new Date().toISOString());
        if (delay === undefined) return;
        this.dockTomatoInboxTimer = window.setTimeout(() => {
            this.dockTomatoInboxTimer = undefined;
            void this.reconcileDockTomatoInbox();
        }, Math.min(Math.max(delay, 250), 60000));
    }

    /** 恢复入口:初始化后与重试到期时驱动;仅在有到期项时唤醒,无常驻定时器。 */
    private async reconcileDockTomatoInbox(): Promise<void> {
        if (this.disposed || this.disposing || !this.acceptingOperations || this.initializationState !== "ready") return;
        const due = inboxDueEntries(this.dockTomatoInbox, new Date().toISOString());
        for (const entry of due) {
            if (this.disposed || this.disposing || !this.acceptingOperations) return;
            await this.processDockTomatoCompletion(entry);
        }
        this.scheduleDockTomatoInboxWake();
    }

    /** 桥完成事件的宿主通道:先把合法通知缓冲进收件箱,再在同一个受保护工作单元内 写入 → 移除/标记。
        未就绪、排队器刷新失败等任何失败路径都只影响处理时机,不丢已接收的通知。 */
    private processDockTomatoCompletion(entry: DockTomatoPendingCompletion): Promise<DockTomatoCompletionWriteResult> {
        const nowIso = new Date().toISOString();
        /* 先缓冲:内存收件箱是后续一切失败路径的兜底,不得跳过。 */
        const buffered = upsertInboxEntry(this.dockTomatoInbox, entry, nowIso);
        if (buffered.outcome === "full") {
            showMessage(t("msg.dockInboxFull"));
            return Promise.resolve({kind: "blocked", reason: "inbox-full"});
        }
        this.dockTomatoInbox = buffered.store;
        if (!this.acceptingOperations || this.initializationState !== "ready") {
            /* 数据尚未就绪或已停止接受操作:先缓冲并尽力落盘,恢复后由 reconcile 处理。 */
            void this.persistDockTomatoInbox();
            return Promise.resolve({kind: "retry", reason: "storage-not-ready"});
        }
        return this.enqueueMutation(async (): Promise<DockTomatoCompletionWriteResult> => {
            if (this.disposed || this.disposing || this.initializationState !== "ready" || !this.storageReady) return {kind: "retry", reason: "storage-not-ready"};
            const unitNow = new Date().toISOString();
            /* 跨窗口合并:锁内重读收件箱逐项合并,不让窗口互相覆盖对方的待处理项。 */
            let stored = this.dockTomatoInbox;
            try {
                const remote = normalizeInboxStore(await this.loadData(DOCKTOMATO_INBOX_STORAGE_NAME));
                for (const remoteEntry of remote.items) {
                    stored = upsertInboxEntry(stored, remoteEntry, unitNow).store;
                }
            } catch {
                /* 收件箱读取失败不阻断本条处理:内存态继续,写回时如实报告。 */
            }
            this.dockTomatoInbox = upsertInboxEntry(stored, entry, unitNow).store;
            const inboxPersisted = await this.persistDockTomatoInbox();
            if (!inboxPersisted) {
                /* 先保存收件箱失败:保留内存待处理项并标记重试,不得显示成已保存。 */
                showMessage(t("msg.dockInboxSaveFail"));
            }
            const result = await this.recordDockTomatoCompletionUnlocked(entry);
            if (result.kind === "recorded" || result.kind === "duplicate") {
                this.dockTomatoInbox = removeInboxEntry(this.dockTomatoInbox, entry.identity);
                const cleanupPersisted = await this.persistDockTomatoInbox();
                if (!cleanupPersisted) {
                    /* 主记录已成功,收件箱删除失败:保留待处理,恢复后以 duplicate 收尾不再新增。 */
                    this.dockTomatoInbox = upsertInboxEntry(this.dockTomatoInbox, {...entry, state: "pending", attempts: 0, nextAttemptAt: undefined, lastError: "inbox-cleanup-pending", updatedAt: new Date().toISOString()}, new Date().toISOString()).store;
                    void this.persistDockTomatoInbox();
                }
            } else if (result.kind === "retry") {
                this.dockTomatoInbox = markInboxRetry(this.dockTomatoInbox, entry.identity, result.reason, new Date().toISOString());
                await this.persistDockTomatoInbox();
            } else if (result.kind === "blocked") {
                this.dockTomatoInbox = markInboxBlocked(this.dockTomatoInbox, entry.identity, result.reason, new Date().toISOString());
                await this.persistDockTomatoInbox();
            }
            this.scheduleDockTomatoInboxWake();
            return result;
        }).then((result) => {
            if (!result) {
                /* 排队器刷新失败等工作单元未执行:内存条目已缓冲,尽力落盘并按 retry 上报。 */
                void this.persistDockTomatoInbox();
                return {kind: "retry", reason: "storage-refresh-failed"} as DockTomatoCompletionWriteResult;
            }
            return result;
        });
    }

    private showToday() {
        showTodayFor(this as unknown as NavigationHost);
    }

    private showReview() {
        showReviewFor(this as unknown as NavigationHost);
    }

    private showHistory() {
        this.showReview();
    }

    private showSummary() {
        this.showReview();
    }

    private showInsights(item?: CheckinItem) {
        showInsightsFor(this as unknown as NavigationHost, item);
    }

    private showArchived() {
        showArchivedFor(this as unknown as NavigationHost);
    }

    private showOccasions() {
        showOccasionsFor(this as unknown as NavigationHost);
    }

    private showSettings() {
        showSettingsFor(this as unknown as NavigationHost);
    }

    private showEditor(item?: CheckinItem) {
        /* 新建/编辑是一段新的表单会话，必须从标题和模板入口开始；表单内部
           的普通重渲染仍由 pageScrollTops 保留当前位置。 */
        [this.dockElement, this.tabElement, this.quickDialogElement].forEach((root) => {
            if (!root) return;
            const tops = this.pageScrollTops.get(root) ?? new Map<string, number>();
            tops.set("editor", 0);
            this.pageScrollTops.set(root, tops);
        });
        showEditorFor(this as unknown as NavigationHost, item);
    }

    private openTabPage() {
        openTabPageFor(this as unknown as NavigationHost);
    }

    /* 方法体外置于 render/quick-dialog.ts（T-022）。 */
    private toggleQuickDialog() {
        toggleQuickDialogFor(this as unknown as QuickDialogHost);
    }

    /* Desktop quick dialog sizing follows the user preference: a percentage of
       the host window (default 90%), fullscreen, or a fixed pixel size. */
    private quickDialogSize(): {width: string; height: string} {
        return quickDialogSizeOf(this as unknown as QuickDialogHost);
    }

    private openQuickDialog() {
        openQuickDialogFor(this as unknown as QuickDialogHost);
    }

    private closeQuickDialog() {
        closeQuickDialogFor(this as unknown as QuickDialogHost);
    }

    private handleQuickDialogDestroyed(dialog: Dialog) {
        handleQuickDialogDestroyedFor(this as unknown as QuickDialogHost, dialog);
    }

    /** Runtime adapter used by 小驴速切 and other optional launchers. */
    public registerQuickAction(options: CheckinQuickActionOptions): () => void {
        if (!options || !/^[A-Za-z0-9._:-]+$/.test(options.id) || typeof options.handler !== "function") return () => undefined;
        const handler = options.handler;
        this.quickActionAdapters.set(options.id, handler);
        const targets = Array.isArray(options.targets)
            ? options.targets.filter((target, index, list): target is CheckinQuickActionTarget => ["desktop", "sidebar", "mobile"].includes(target) && list.indexOf(target) === index)
            : undefined;
        if (targets) this.quickActionAdapterTargets.set(options.id, targets);
        else this.quickActionAdapterTargets.delete(options.id);
        return () => {
            if (this.quickActionAdapters.get(options.id) === handler) {
                this.quickActionAdapters.delete(options.id);
                this.quickActionAdapterTargets.delete(options.id);
            }
        };
    }

    public registerQuickActionAdapter(id: string, handler: (value: string) => void | Promise<void>, targets?: CheckinQuickActionTarget[]): () => void {
        return this.registerQuickAction({id, label: id, handler, targets});
    }

    /** Read-only diagnostics for integrations; does not expose handlers or write access. */
    public getRegisteredQuickActionIds(): readonly string[] {
        return Object.freeze([...this.quickActionAdapters.keys()]);
    }

    /* 方法体外置于 render/quick-dialog.ts（T-022）。 */
    private ensureMobileTopBarButton() {
        ensureMobileTopBarButtonFor(this as unknown as QuickDialogHost);
    }

    /** Register optional launcher actions when 小驴速切 is installed. */
    private ensureSpeedSwitchQuickActions() {
        ensureSpeedSwitchQuickActionsFor(this as unknown as QuickDialogHost);
    }

    private bindQuickDialogViewport(dialog: Dialog) {
        bindQuickDialogViewportFor(this as unknown as QuickDialogHost, dialog);
    }

    /* 能力定义外置于 agent-capabilities.ts（T-022）；壳内仅保留守卫、Plugin 类型探测与注册完成标记。 */
    private registerSiYuanAgentCapability() {
        if (this.agentCapabilityState !== "pending" || this.disposed || this.disposing || !this.api) return;
        const plugin = this as unknown as Plugin & {
            addAgentCapability?: (options: Parameters<typeof registerAgentCapabilities>[0]["addCapability"]) => string;
        };
        if (typeof plugin.addAgentCapability !== "function") {
            /* 宿主没有这个入口＝思源早于 3.8.0：核心打卡与公开 API 不受影响，设置页要说明这一点而不是含糊报「未检测到」。 */
            this.agentCapabilityState = "unsupported";
            return;
        }
        const ids: string[] = [];
        try {
            registerAgentCapabilities({
                addCapability: (options) => {
                    const id = plugin.addAgentCapability?.(options);
                    if (typeof id === "string") ids.push(id);
                    return id;
                },
                getStore: () => this.store,
                getOccasionStore: () => this.occasionStore,
                getSummaryContext: (range) => this.api!.getSummaryContext(range),
                getCustomSummaryContext: (range) => this.api!.getCustomSummaryContext(range),
                canRecord: () => this.acceptingOperations && !this.disposed && this.initializationState === "ready",
                cloneItem: (item) => this.cloneItem(item),
                revisionFingerprint: (item, date) => this.revisionFingerprint(item, date),
                enqueueMutation: (fn) => this.enqueueMutation(fn),
                recordEvent: (item, value, moment, fingerprint, note) => this.recordEvent(item, value, moment, fingerprint, note),
                setOccasionCompleted: (id, date, completed) => this.setOccasionCompleted(id, date, completed),
                createItem: async (created) => {
                    this.store = {...this.store, items: [...this.store.items, created]};
                    await this.persist();
                    this.render();
                },
                createOccasion: async (created) => {
                    this.occasionStore = {...this.occasionStore, occasions: [...this.occasionStore.occasions, created]};
                    await this.persistOccasions();
                    this.render();
                },
            });
            this.agentCapabilityIds = ids;
            this.agentCapabilityState = "registered";
        } catch (error) {
            /* 抛错前已注册的能力仍然有效：保留计数，并把原因显示出来，避免与「宿主不支持」混为一谈。 */
            this.agentCapabilityIds = ids;
            this.agentCapabilityError = String(error instanceof Error ? error.message : error);
            this.agentCapabilityState = "failed";
            showMessage(t("msg.agentRegisterFail", {error: this.agentCapabilityError}));
        }
    }

    private getTabId(): string {
        return `${this.name || "siyuan-checkin"}${TAB_TYPE}`;
    }

    private renderBackgroundUpdate() {
        const localItemId = this.pendingLocalItemId;
        const localItemDate = this.pendingLocalItemDate;
        this.pendingLocalItemId = undefined;
        this.pendingLocalItemDate = undefined;
        if (localItemId && this.currentPage === "today" && this.renderTodayItemLocally(localItemId, localItemDate)) {
            /* The original control stays connected, so no focus restoration is needed;
               clear the deferred full-render target to avoid stealing focus later. */
            this.pendingFocusItemId = undefined;
            return;
        }
        renderBackgroundUpdateFor(this as unknown as PluginOpsHost);
    }

    /* 打卡后只更新同结构目标卡片及 Today 的派生计数，保留滚动位置、焦点和
       其余控件节点。完成区/操作节点发生变化时保守回退完整投影，避免留下
       错误分区或失效按钮。 */
    private renderTodayItemLocally(itemId: string, localDate?: string): boolean {
        if (typeof document === "undefined") return false;
        const date = currentCalendarDate();
        /* 外部适配器、番茄钟和撤销操作都可能带着非今天的 localDate 回来。
           Today 的卡片是当天投影，跨日强行局部改写会把历史事件错误显示到今天。 */
        if (localDate && localDate !== dateKey(date)) return false;
        const item = getActiveItemById(this.store, itemId);
        if (!item || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) return false;
        const complete = isComplete(this.store, item, date);
        const query = this.todayQuery.trim().toLocaleLowerCase();
        if (query && !`${item.name} ${item.group || ""}`.toLocaleLowerCase().includes(query)) return false;
        const roots = [this.dockElement, this.tabElement, this.quickDialogElement]
            .filter((root, index, all): root is HTMLElement => Boolean(root) && all.indexOf(root) === index);
        if (!roots.length) return false;
        const currentStreaks = this.computeStreaks();
        const ctx = {
            store: this.store,
            currentStreaks,
            bulkMode: this.bulkMode,
            bulkSelected: this.bulkSelected,
            todaySortMode: this.todaySortMode,
        };
        const cards: Array<{card: HTMLElement; next: HTMLElement; surface: HTMLElement}> = [];
        for (const root of roots) {
            const surface = root.querySelector<HTMLElement>(".lc-checkin--today");
            const card = [...(surface?.querySelectorAll<HTMLElement>("[data-item-id]") || [])]
                .find((candidate) => candidate.dataset.itemId === itemId);
            if (!surface || !card) return false;
            /* 任何完成态变化都会改变操作节点、完成区归属或拖拽语义。
               先拒绝局部 patch，统一回退到完整 render，避免先 remove 一个
               surface 后才发现另一个 surface 缺卡，造成跨表面短暂不一致。 */
            if (this.pendingOnly && complete) return false;
            const template = document.createElement("template");
            template.innerHTML = renderItemView(item, date, ctx).trim();
            const next = template.content.firstElementChild;
            if (!(next instanceof HTMLElement)) return false;
            const has = (node: HTMLElement, selector: string) => Boolean(node.querySelector(selector));
            const currentComplete = card.classList.contains("is-complete");
            const currentInCompleted = Boolean(card.closest(".lc-checkin__completed-section"));
            const nextInCompleted = Boolean(next.classList.contains("is-complete"));
            const structuralSelectors = [
                "[data-action='toggle-exact']",
                "[data-exact-entry]",
                "[data-drag-handle]",
                "[data-bulk-check]",
                "[data-action='record']",
                "[data-action='quick-record']",
            ];
            /* Local patch intentionally handles only same-shape updates (for
               example progress/count changes). Completion transitions are
               rendered atomically so their parent section and listeners stay
               correct on every surface. */
            if (currentComplete !== complete || currentInCompleted !== nextInCompleted) return false;
            if (structuralSelectors.some((selector) => has(card, selector) !== has(next, selector))) return false;
            cards.push({card, next, surface});
        }
        for (const {card, next, surface} of cards) {
            if (card === next) continue;
            card.className = next.className;
            const style = next.getAttribute("style");
            if (style) card.setAttribute("style", style);
            else card.removeAttribute("style");
            const currentMeta = card.querySelector<HTMLElement>(".lc-checkin__item-meta");
            const nextMeta = next.querySelector<HTMLElement>(".lc-checkin__item-meta");
            if (currentMeta && nextMeta) currentMeta.textContent = nextMeta.textContent;
            const currentProgress = card.querySelector<HTMLElement>(".lc-checkin__item-progress > span");
            const nextProgress = next.querySelector<HTMLElement>(".lc-checkin__item-progress > span");
            if (currentProgress && nextProgress) currentProgress.setAttribute("style", nextProgress.getAttribute("style") || "");
            const currentStreak = card.querySelector<HTMLElement>(".lc-checkin__streak-badge");
            const nextStreak = next.querySelector<HTMLElement>(".lc-checkin__streak-badge");
            if (currentStreak && nextStreak) currentStreak.textContent = nextStreak.textContent;
            if (nextStreak && !currentStreak) {
                const topline = card.querySelector<HTMLElement>(".lc-checkin__item-topline");
                if (topline) {
                    const inserted = nextStreak.cloneNode(true) as HTMLElement;
                    inserted.addEventListener("click", () => {
                        this.insightsReturnPage = "today";
                        this.showInsights(item);
                    });
                    topline.insertBefore(inserted, topline.querySelector(".lc-checkin__small-button"));
                }
            } else if (currentStreak && !nextStreak) {
                currentStreak.remove();
            }
            const currentIcon = card.querySelector<HTMLElement>(".lc-checkin__item-icon");
            const nextIcon = next.querySelector<HTMLElement>(".lc-checkin__item-icon");
            if (currentIcon && nextIcon) {
                const ariaLabel = nextIcon.getAttribute("aria-label");
                if (ariaLabel) currentIcon.setAttribute("aria-label", ariaLabel);
            }
            const currentPrimary = card.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record']");
            const nextPrimary = next.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record']");
            if (currentPrimary && nextPrimary && currentPrimary.classList.contains("lc-checkin__record-button")) {
                currentPrimary.textContent = nextPrimary.textContent;
            }
            const currentMore = card.querySelector<HTMLElement>("[data-action='toggle-exact']");
            if (currentMore) currentMore.hidden = complete;
            const currentExact = card.querySelector<HTMLElement>("[data-exact-entry]");
            if (currentExact && complete) currentExact.hidden = true;
            /* Parent section and completion-state changes were rejected during
               preflight above; no card is moved or removed after mutation starts. */
        }
        for (const surface of new Set(cards.map(({surface}) => surface))) {
            const scheduledItems = this.store.items.filter((candidate) => !candidate.archived && isItemAvailableOnDate(candidate, date) && isScheduledToday(candidate, date));
            const completedCount = scheduledItems.filter((candidate) => isComplete(this.store, candidate, date)).length;
            const count = surface.querySelector<HTMLElement>(".lc-checkin__count");
            if (count) count.innerHTML = `${completedCount}<span>/</span>${scheduledItems.length}`;
            const progress = surface.querySelector<HTMLElement>(".lc-checkin__progress > span");
            if (progress) progress.style.width = `${scheduledItems.length ? Math.round((completedCount / scheduledItems.length) * 100) : 0}%`;
            this.updateTodayWeekStrip(surface, date);
        }
        this.syncRecentRecordToast();
        return true;
    }

    private updateTodayWeekStrip(surface: HTMLElement, now: Date) {
        const chips = [...surface.querySelectorAll<HTMLElement>(".lc-checkin__day-chip")];
        if (!chips.length) return;
        for (let index = 0; index < chips.length; index += 1) {
            const day = new Date(now);
            day.setDate(now.getDate() - (6 - index));
            const dayItems = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, day) && isScheduledToday(item, day));
            const done = dayItems.filter((item) => isComplete(this.store, item, day)).length;
            const status = !dayItems.length ? "empty" : done === dayItems.length ? "complete" : done ? "partial" : "pending";
            const chip = chips[index];
            chip.className = `lc-checkin__day-chip is-${status} ${dateKey(day) === dateKey(now) ? "is-today" : ""}`.trim();
            chip.title = t("date.chipTitle", {date: day.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric"}), done, total: dayItems.length});
        }
    }

    private syncRecentRecordToast() {
        const markup = renderRecentRecordView(this.recentRecord, this.reducedMotion);
        const roots = [this.dockElement, this.tabElement, this.quickDialogElement]
            .filter((root, index, all): root is HTMLElement => Boolean(root) && all.indexOf(root) === index);
        for (const root of roots) {
            const current = [...root.children].find((child): child is HTMLElement => child.classList.contains("lc-checkin__recent-record"));
            if (!markup) {
                current?.remove();
                continue;
            }
            const template = document.createElement("template");
            template.innerHTML = markup.trim();
            const next = template.content.firstElementChild;
            if (!(next instanceof HTMLElement)) continue;
            current?.replaceWith(next);
            if (!current) root.appendChild(next);
            next.querySelector<HTMLElement>("[data-action='undo-record']")?.addEventListener("click", () => this.undoRecentRecord());
        }
    }

    /* 9.0 渲染合并：同一帧内多次调用只执行一次渲染。 */
    private scheduleRender() {
        if (this.renderRafId) return;
        this.renderRafId = requestAnimationFrame(() => {
            this.renderRafId = 0;
            this.render();
        });
    }

    private render() {
        if (this.disposed || this.disposing) {
            return;
        }
        const roots = [this.dockElement, this.tabElement, this.quickDialogElement].filter((root, index, all): root is HTMLElement => Boolean(root) && all.indexOf(root) === index);
        const reviewAnalyticsSnapshot = roots.length && this.currentPage === "review" && this.initializationState === "ready"
            ? buildAnalyticsSnapshot(this.store, currentCalendarDate())
            : undefined;
        roots.forEach((root) => this.renderInto(root, reviewAnalyticsSnapshot));
    }

    private renderInto(root: HTMLElement, reviewAnalyticsSnapshot?: AnalyticsSnapshot) {
        /* A short, explicit mobile host marker keeps the final responsive
           layer deterministic without repeating long :has() selectors for
           every child rule.  Desktop docks remain on their container-query
           layout even when they happen to be narrow. */
        root.classList.toggle("lc-checkin-host--mobile", this.isMobileFrontend);
        /* 页面重绘会替换 .lc-checkin 内容；先释放设置分类栏的 scroll/
           observer 监听，避免旧 root 被异步回调短暂保活。 */
        const cleanupSettingsNavigation = this.settingsNavigationCleanups.get(root);
        if (cleanupSettingsNavigation) {
            cleanupSettingsNavigation();
            this.settingsNavigationCleanups.delete(root);
        }
        if (this.initializationState !== "ready") {
            const message = this.initializationState === "failed" ? "打卡数据读取失败" : "正在加载打卡数据…";
            root.innerHTML = `<div class="lc-checkin"><div class="lc-checkin__empty"><div class="lc-checkin__empty-title">${message}</div></div></div>`;
            return;
        }
        /* 页面滚动位置记忆（T-112）：内容替换前按「旧页」捕获，渲染完恢复「新页」记忆——
           同页重渲染（打卡/筛选）不跳动，切页回到上次离开的位置。WeakMap 随表面销毁自动释放。 */
        const previousScroller = root.querySelector<HTMLElement>(".lc-checkin");
        if (previousScroller) {
            const tops = this.pageScrollTops.get(root) ?? new Map<string, number>();
            tops.set(this.renderedPages.get(root) ?? "today", previousScroller.scrollTop);
            this.pageScrollTops.set(root, tops);
        }
        root.innerHTML = this.currentPage === "editor" ? this.renderEditor()
            : this.currentPage === "review" ? this.renderReview(reviewAnalyticsSnapshot!)
                : this.currentPage === "insights" ? this.renderInsights()
            : this.currentPage === "archived" ? this.renderArchived()
                    : this.currentPage === "occasions" ? this.renderOccasions()
                    : this.currentPage === "settings" ? this.renderSettings() : this.renderToday();
        this.normalizeUiIcons(root);
        const surface = root.querySelector<HTMLElement>(".lc-checkin");
        if (surface) {
            surface.dataset.appearance = this.resolvedAppearance();
            const appearance = surface.dataset.appearance as "light" | "dark";
            surface.dataset.palette = this.palette;
            surface.dataset.reducedMotion = String(this.reducedMotion);
            root.dataset.appearance = appearance;
            root.dataset.palette = this.palette;
            this.syncHostThemeTokens(root, surface);
            /* container queries cannot style their own container, so all page
               content lives in one layout wrapper inside the container. */
            const layout = document.createElement("div");
            layout.className = "lc-checkin__layout";
            while (surface.firstChild) layout.appendChild(surface.firstChild);
            surface.appendChild(layout);
        }
        /* 桌面快速弹窗的 全屏/关闭 并入顶栏（renderTopNav）。页签和 dock
           的生命周期由思源宿主管理，不在内容区伪造第二枚关闭按钮。 */
        if (this.isMobileFrontend && !root.querySelector(".lc-checkin__mobile-topbar")) {
            root.insertAdjacentHTML("afterbegin", this.renderMobileTopbar());
        }
        /* A wide dock hides the compact bottom bar to preserve vertical space.
           Give that surface its own persistent rail instead of leaving the
           navigation unreachable (the rail is hidden again below 720px). */
        if (root === this.dockElement && !root.querySelector(".lc-checkin__rail")) {
            root.insertAdjacentHTML("afterbegin", this.renderRail());
        }
        const layout = root.querySelector<HTMLElement>(".lc-checkin__layout");
        if (layout) {
            /* 顶部导航只服务桌面宽容器；移动端顶栏自带导航 tabs（renderMobileTopbar），
               窄 dock 面板由 CSS 隐藏 —— v9.5.1 曾在窄容器裸渲染出独立导航行（用户点名）。
               桌面导航挂在宿主而不是滚动的 .lc-checkin__layout 上，切页/滚动时几何基线保持不变。 */
            if (!this.isMobileFrontend) root.insertAdjacentHTML("afterbegin", this.renderTopNav(root));
            if (this.focusTimerState && this.focusTimerRoot === root) layout.insertAdjacentHTML("beforeend", this.renderFocusTimerPanel());
        }
        /* 底部导航在所有表面都渲染（含桌面侧边栏面板）：宽容器由 CSS 隐藏、
           窄容器（手机弹窗 / 侧边栏 dock）显示 —— 侧边栏此前完全没有导航入口。 */
        if (!root.querySelector(".lc-checkin__mobile-nav")) {
            root.insertAdjacentHTML("beforeend", this.renderMobileNav());
        }
        /* Transient check-in feedback belongs to the plugin window, not the
           scrolling Today document. Hoist it so absolute positioning is
           bounded by the dialog, tab, or dock host on every frontend. */
        const recentRecordToast = surface?.querySelector<HTMLElement>(".lc-checkin__recent-record");
        if (recentRecordToast) root.appendChild(recentRecordToast);
        if (this.currentPage === "editor") {
            this.bindEditor(root);
        } else if (this.currentPage === "today") {
            this.bindToday(root);
        } else if (this.currentPage === "occasions") {
            this.bindOccasions(root);
        } else if (this.currentPage === "settings") {
            this.bindSettings(root);
        } else {
            this.bindPageNavigation(root);
        }
        if (this.quickDialog && this.quickDialogElement === root) this.bindQuickKeyboard(root);
        /* 桌面弹窗打开/重渲染后把焦点收进弹窗容器：键盘流（j/k/e）立即生效，
           且按键不会再漏进背后的文档编辑器；用户已在弹窗内（搜索框等）时不打断。 */
        if (root === this.quickDialogElement && !this.isMobileFrontend) {
            const surfaceEl = root.querySelector<HTMLElement>(".lc-checkin");
            if (surfaceEl) {
                surfaceEl.tabIndex = -1;
                if (!root.contains(document.activeElement)) surfaceEl.focus();
            }
        }
        /* 打卡后焦点归位（T-114）：重渲染后把焦点还原到刚操作卡片的主按钮，键盘流无缝继续；
           该卡已被过滤/消失时保持容器焦点。 */
        const focusItemId = this.pendingFocusItemId;
        this.pendingFocusItemId = undefined;
        if (focusItemId && this.currentPage === "today") {
            const card = root.querySelector<HTMLElement>(`.lc-checkin__item[data-item-id='${focusItemId}']`);
            const focusTarget = card?.querySelector<HTMLElement>("[data-action='record'], [data-action='quick-record'], [data-action='toggle']");
            if (focusTarget) focusTarget.focus();
        }
        const scroller = root.querySelector<HTMLElement>(".lc-checkin");
        if (scroller) scroller.scrollTop = this.pageScrollTops.get(root)?.get(this.currentPage) ?? 0;
        this.renderedPages.set(root, this.currentPage);
    }

    private syncHostThemeTokens(root: HTMLElement, surface: HTMLElement) {
        if (typeof getComputedStyle !== "function") return;
        const signature = `${surface.dataset.appearance ?? ""}:${surface.dataset.palette ?? ""}`;
        if (this.hostThemeSignatures.get(root) === signature) return;
        const computed = getComputedStyle(surface);
        for (const name of HOST_THEME_TOKEN_NAMES) {
            const value = computed.getPropertyValue(name).trim();
            if (value) root.style.setProperty(name, value);
        }
        this.hostThemeSignatures.set(root, signature);
    }

    private normalizeUiIcons(root: HTMLElement) {
        const replaceOccasionIcon = (button: HTMLElement, name: UiIconName) => {
            const icon = button.querySelector<HTMLElement>(".lc-checkin__action-icon");
            if (icon) {
                icon.replaceChildren(this.iconNode(name));
                return;
            }
            /* Keep compatibility with older markup while migrating only the
               glyph node; a visible/assistive action label must survive. */
            const label = button.querySelector<HTMLElement>(".lc-checkin__action-label");
            const wrapper = document.createElement("span");
            wrapper.className = "lc-checkin__action-icon";
            wrapper.setAttribute("aria-hidden", "true");
            wrapper.appendChild(this.iconNode(name));
            if (label) button.insertBefore(wrapper, label);
            else button.replaceChildren(wrapper);
        };
        root.querySelectorAll<HTMLElement>(".lc-checkin__back-button").forEach((button) => { button.innerHTML = uiIcon("back"); });
        root.querySelector<HTMLElement>("[data-history-month='-1']")?.replaceChildren(this.iconNode("back"));
        root.querySelector<HTMLElement>("[data-history-month='1']")?.replaceChildren(this.iconNode("forward"));
        root.querySelectorAll<HTMLElement>(".lc-checkin__search-symbol, .lc-checkin__today-search > span").forEach((node) => { node.innerHTML = uiIcon("search"); });
        root.querySelectorAll<HTMLElement>("[data-action='clear-search'], [data-action='clear-history-query'], [data-action='clear-template-query'], [data-action='clear-icon-query']").forEach((button) => { button.innerHTML = uiIcon("close"); });
        root.querySelectorAll<HTMLElement>("[data-action='insights']").forEach((button) => { button.innerHTML = uiIcon("insight"); });
        root.querySelectorAll<HTMLElement>("[data-action='edit']").forEach((button) => { button.innerHTML = uiIcon("edit"); });
        root.querySelectorAll<HTMLElement>("[data-occasion-edit]").forEach((button) => replaceOccasionIcon(button, "edit"));
        root.querySelectorAll<HTMLElement>("[data-action='focus']").forEach((button) => { button.innerHTML = uiIcon("timer"); });
        root.querySelectorAll<HTMLElement>("[data-action='toggle-exact']").forEach((button) => { button.innerHTML = uiIcon("more"); });
        root.querySelectorAll<HTMLElement>("[data-occasion-delete]").forEach((button) => replaceOccasionIcon(button, "trash"));
        root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => replaceOccasionIcon(button, button.classList.contains("is-on") ? "check" : "circle"));
        root.querySelectorAll<HTMLElement>("[data-action='new-occasion']").forEach((button) => { button.innerHTML = uiIcon("add"); });
        root.querySelectorAll<HTMLElement>(".lc-checkin__empty-mark").forEach((node) => { node.innerHTML = uiIcon("calendar"); });
    }

    private iconNode(name: UiIconName): SVGElement {
        const template = document.createElement("template");
        template.innerHTML = uiIcon(name);
        return template.content.firstElementChild as SVGElement;
    }

    /* 方法体外置于 render/settings.ts（T-022）。 */
    private renderSettings(): string {
        return renderSettingsView({
            store: this.store,
            auditEntries: this.auditEntries,
            snapshots: this.snapshotHistory.map((snapshot, index) => ({index, capturedAt: snapshot.capturedAt, legacy: snapshot.legacy,
                itemCount: normalizeStore(snapshot.store).items.length, eventCount: normalizeStore(snapshot.store).events.length})),
            customIconLibrary: this.customIconLibrary,
            agentCapability: {state: this.agentCapabilityState, count: this.agentCapabilityIds.length, error: this.agentCapabilityError},
            appearance: this.appearance,
            reducedMotion: this.reducedMotion,
            hapticFeedback: this.hapticFeedback,
            focusTimerProvider: this.focusTimerProvider,
            focusTimerAdapterCount: this.focusAdapters.has(DOCK_TOMATO_ADAPTER_ID) ? 1 : 0,
            dockTomatoDiagnostics: inspectDockTomatoProvider(),
            dockTomatoCompletionIssues: getDockTomatoCompletionIssues(),
            focusTimerBusy: this.focusBusy,
            palette: this.palette,
            todayGroupMode: this.todayGroupMode,
            todaySortMode: this.todaySortMode,
            completedCollapsed: this.completedCollapsed,
            weekStripVisible: this.weekStripVisible,
            dialogSizeMode: this.dialogSizeMode,
            dialogScale: this.dialogScale,
            dialogFixedSize: {...this.dialogFixedSize},
            dialogHasCustomFrame: Boolean(this.dialogRect || this.dialogOffset),
            resolvedAppearanceValue: this.resolvedAppearance(),
        });
    }

    private bindSettings(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindMobileNav(root);
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => this.showToday());
        const settingsBusy = new WeakSet<HTMLElement>();
        const settingsFeedback = (message: string) => {
            let node = root.querySelector<HTMLElement>("[data-settings-feedback]");
            if (!node) {
                node = document.createElement("div");
                node.dataset.settingsFeedback = "true";
                node.setAttribute("role", "alert");
                node.className = "lc-checkin__settings-feedback";
                root.querySelector<HTMLElement>(".lc-checkin__settings-layout")?.prepend(node);
            }
            node.textContent = message;
        };
        const runSettingsAction = (control: HTMLElement, operation: () => Promise<unknown> | unknown, focusSelector = "[data-action='back']") => {
            if (settingsBusy.has(control)) return;
            settingsBusy.add(control);
            control.setAttribute("aria-busy", "true");
            if ("disabled" in control) (control as HTMLButtonElement | HTMLInputElement).disabled = true;
            Promise.resolve().then(operation).catch((error) => settingsFeedback(String(error instanceof Error ? error.message : error || t("common.unknownError")))).finally(() => {
                settingsBusy.delete(control);
                if (control.isConnected) {
                    control.removeAttribute("aria-busy");
                    if ("disabled" in control) (control as HTMLButtonElement | HTMLInputElement).disabled = false;
                    control.focus();
                } else root.querySelector<HTMLElement>(focusSelector)?.focus();
            });
        };
        const savePreference = () => { void this.persistViewPreferences().then(() => showMessage(t("msg.prefSaved"))).catch(() => showMessage(t("msg.prefSaveFail"))); };
        root.querySelector<HTMLSelectElement>("[data-setting-group]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (value === "none" || value === "group" || value === "time" || value === "priority") { this.todayGroupMode = value; void this.persistViewPreferences(); } });
        root.querySelector<HTMLSelectElement>("[data-setting-sort]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (SORT_LABELS[value as CheckinItemSortMode]) { this.todaySortMode = value as CheckinItemSortMode; void this.persistViewPreferences(); } });
        root.querySelector<HTMLInputElement>("[data-setting-completed]")?.addEventListener("change", (event) => { this.completedCollapsed = !(event.currentTarget as HTMLInputElement).checked; void this.persistViewPreferences(); });
        root.querySelector<HTMLInputElement>("[data-setting-weekstrip]")?.addEventListener("change", (event) => { this.weekStripVisible = (event.currentTarget as HTMLInputElement).checked; savePreference(); this.render(); });
        root.querySelector<HTMLSelectElement>("[data-setting-appearance]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (value === "system" || value === "light" || value === "dark") { this.appearance = value; void this.persistViewPreferences(); this.render(); } });
        root.querySelector<HTMLInputElement>("[data-setting-motion]")?.addEventListener("change", (event) => { this.reducedMotion = (event.currentTarget as HTMLInputElement).checked; void this.persistViewPreferences(); this.render(); });
        root.querySelector<HTMLInputElement>("[data-setting-haptic]")?.addEventListener("change", (event) => { this.hapticFeedback = (event.currentTarget as HTMLInputElement).checked; void this.persistViewPreferences(); });
        root.querySelector<HTMLSelectElement>("[data-setting-focus-timer]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "builtin" || value === "docktomato") {
                this.focusTimerProvider = value;
                savePreference();
            }
        });
        root.querySelector<HTMLElement>("[data-action='use-builtin-focus']")?.addEventListener("click", () => {
            this.focusTimerProvider = "builtin";
            void this.persistViewPreferences().then(() => showMessage(t("set.tomatoFallbackSaved"))).catch(() => showMessage(t("msg.prefSaveFail")));
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='clear-focus-issues']")?.addEventListener("click", () => {
            clearDockTomatoCompletionIssues();
            void this.saveData(FOCUS_DIAGNOSTICS_STORAGE_NAME, serializeDockTomatoCompletionIssues()).catch(() => undefined);
            showMessage(t("set.tomatoIssuesCleared"));
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='export-focus-issues']")?.addEventListener("click", () => {
            downloadDockTomatoDiagnosticsFor(inspectDockTomatoProvider());
            showMessage(t("set.tomatoIssuesExported"));
        });
        root.querySelector<HTMLSelectElement>("[data-setting-palette]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "lavender" || value === "ocean" || value === "forest" || value === "sunset") {
                this.palette = value;
                void this.persistViewPreferences().then(() => showMessage(t("msg.accentSaved"))).catch(() => showMessage(t("msg.accentSaveFail")));
                this.render();
            }
        });
        root.querySelector<HTMLElement>("[data-action='reset-view-preferences']")?.addEventListener("click", () => { this.applyViewPreferences({...DEFAULT_VIEW_PREFERENCES, appearance: this.appearance, reducedMotion: this.reducedMotion, dialogSizeMode: this.dialogSizeMode, dialogScale: this.dialogScale, dialogFixedSize: {...this.dialogFixedSize}, dialogRect: this.dialogRect ? {...this.dialogRect} : undefined, dialogOffset: this.dialogOffset ? {...this.dialogOffset} : undefined}); void this.persistViewPreferences(); this.render(); });
        root.querySelector<HTMLElement>("[data-action='reset-all-preferences']")?.addEventListener("click", () => { if (!window.confirm(t("msg.prefsResetConfirm"))) return; this.applyViewPreferences(DEFAULT_VIEW_PREFERENCES); void this.persistViewPreferences().then(() => showMessage(t("msg.prefsReset"))); this.render(); });
        root.querySelector<HTMLElement>("[data-action='review']")?.addEventListener("click", () => this.showReview());
        root.querySelector<HTMLElement>("[data-action='restore-backup']")?.addEventListener("click", (event) => runSettingsAction(event.currentTarget as HTMLElement, () => this.restoreLatestBackup()));
        root.querySelectorAll<HTMLElement>("[data-restore-snapshot]").forEach((button) => button.addEventListener("click", () => {
            const index = Number(button.dataset.restoreSnapshot);
            if (Number.isInteger(index)) runSettingsAction(button, () => this.restoreLatestBackup(index), `[data-restore-snapshot='${index}']`);
        }));
        root.querySelector<HTMLElement>("[data-action='export-snapshots']")?.addEventListener("click", () => void this.loadData(BACKUP_STORAGE_NAME).then(downloadSnapshotHistoryFor).catch(() => showMessage(t("msg.snapshotExportFail"))));
        root.querySelector<HTMLElement>("[data-action='clear-snapshots']")?.addEventListener("click", () => {
            if (!window.confirm(t("msg.clearSnapshotsConfirm"))) return;
            this.snapshotHistory = [];
            void this.saveData(BACKUP_STORAGE_NAME, createEmptyStoreSnapshotHistory()).catch(() => showMessage(t("msg.clearSnapshotsFail")));
            this.render();
        });
        root.querySelector<HTMLInputElement>("[data-import-snapshots]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            if (settingsBusy.has(input)) return;
            settingsBusy.add(input); input.disabled = true; input.setAttribute("aria-busy", "true");
            try {
                const history = parseStoreSnapshotHistoryExport(await file.text());
                if (!window.confirm(t("msg.importSnapshotsConfirm", {count: history.snapshots.length}))) return;
                await this.saveData(BACKUP_STORAGE_NAME, history);
                this.snapshotHistory = readStoreSnapshotHistory(history);
                this.render();
            } catch {
                showMessage(t("msg.importSnapshotsFail"));
                settingsFeedback(t("msg.importSnapshotsFail"));
            } finally {
                input.value = "";
                settingsBusy.delete(input); input.disabled = false; input.removeAttribute("aria-busy");
                (root.querySelector<HTMLInputElement>("[data-import-snapshots]") || input).focus();
            }
        });
        root.querySelector<HTMLElement>("[data-action='clear-audit']")?.addEventListener("click", () => { this.auditEntries = []; void this.persistAuditBestEffort(); this.render(); });
        root.querySelector<HTMLElement>("[data-action='export-audit']")?.addEventListener("click", () => downloadStoreAuditFor(this.auditEntries));
        root.querySelector<HTMLInputElement>("[data-import-json]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            if (settingsBusy.has(input)) return;
            settingsBusy.add(input); input.disabled = true; input.setAttribute("aria-busy", "true");
            try {
                const preflight = preflightJsonRecovery(await file.text(), normalizeStore, summarizeJsonBackup(this.store));
                const {report: migration, assessment, validationErrors} = preflight;
                const backup = migration;
                if (validationErrors.length) {
                    this.auditEntries = appendStoreAudit(this.auditEntries, {type: "migration", at: new Date().toISOString(), details: buildRecoveryAuditDetails("json-import", preflight, "rejected", validationErrors)});
                    void this.persistAuditBestEffort();
                    showMessage(`恢复失败：${validationErrors.join("；")}`);
                    input.value = "";
                    return;
                }
                const {itemCount, eventCount, archivedItemCount, dateRange} = backup.summary;
                const rangeLabel = dateRange ? `，日期 ${dateRange.from} 至 ${dateRange.to}` : "";
                const warningLabel = backup.warnings.length ? `\n\n兼容性提示：${backup.warnings.join("；")}` : "";
                    const reviewLabel = assessment.requiresReview ? `\n\n请复核：${assessment.reasons.join("；")}` : "";
                    if (!window.confirm(t("msg.jsonRestoreConfirm", {items: itemCount, archived: archivedItemCount, events: eventCount, range: `${rangeLabel}${reviewLabel}`, warning: warningLabel}))) { input.value = ""; return; }
                const previous = this.store;
                this.store = backup.store;
                try {
                    await this.persist();
                } catch {
                    this.store = previous;
                    this.auditEntries = appendStoreAudit(this.auditEntries, {type: "migration", at: new Date().toISOString(), details: buildRecoveryAuditDetails("json-import", preflight, "rejected", ["persist-failed"])});
                    await this.persistAuditBestEffort();
                    showMessage(t("msg.restoreFailed"));
                    return;
                }
                this.auditEntries = appendStoreAudit(this.auditEntries, {type: "migration", at: new Date().toISOString(), details: buildRecoveryAuditDetails("json-import", preflight, "accepted")});
                await this.persistAuditBestEffort();
                showMessage(`已恢复 ${itemCount} 个项目、${eventCount} 条记录${backup.repaired ? t("msg.jsonRepaired") : ""}`);
                this.render();
            } catch (error) {
                showMessage(t("msg.importFail", {error: String(error)}));
                settingsFeedback(t("msg.importFail", {error: String(error)}));
            } finally {
                input.value = ""; settingsBusy.delete(input); input.disabled = false; input.removeAttribute("aria-busy");
                (root.querySelector<HTMLInputElement>("[data-import-json]") || input).focus();
            }
        });
        root.querySelector<HTMLInputElement>("[data-import-csv]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            if (settingsBusy.has(input)) return;
            settingsBusy.add(input); input.disabled = true; input.setAttribute("aria-busy", "true");
            try {
                const parsed = parseCheckinCsv(await file.text());
                const names = [...new Set(parsed.rows.map((row) => row.name))];
                if (!parsed.rows.length) { showMessage(t("msg.csvEmpty")); return; }
                const skip = parsed.invalid;
                if (!window.confirm(t("msg.csvConfirm", {items: names.length, events: parsed.rows.length, skipped: skip}))) { input.value = ""; return; }
                const report = this.importCsvRows(parsed.rows);
                await this.persist();
                showMessage(t("msg.csvDone", {items: report.itemsCreated, events: report.eventsCreated, duplicates: report.duplicates}));
                this.render();
            } catch (error) {
                showMessage(t("msg.importFail", {error: String(error)}));
                settingsFeedback(t("msg.importFail", {error: String(error)}));
            } finally {
                input.value = ""; settingsBusy.delete(input); input.disabled = false; input.removeAttribute("aria-busy");
                (root.querySelector<HTMLInputElement>("[data-import-csv]") || input).focus();
            }
        });

        root.querySelector<HTMLInputElement>("[data-import-loop]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const files = [...(input.files || [])];
            if (!files.length) return;
            if (settingsBusy.has(input)) return;
            settingsBusy.add(input); input.disabled = true; input.setAttribute("aria-busy", "true");
            try {
                const texts = await Promise.all(files.map((file) => file.text()));
                const firstCell = (text: string) => (text.replace(/^\uFEFF/, "").split(/\r?\n/)[0] || "").split(",")[0].trim().toUpperCase();
                const habitsCsv = texts.find((text) => firstCell(text) === "POSITION");
                const checkmarksCsv = texts.find((text) => firstCell(text) === "DATE");
                if (!checkmarksCsv && !habitsCsv) { showMessage(t("msg.loopBadHeader")); return; }
                const plan = buildLoopImportPlan(habitsCsv, checkmarksCsv || "");
                if (!plan.habits.length) { showMessage(t("msg.loopNoItems")); return; }
                if (!window.confirm(t("msg.loopConfirm", {habits: plan.habits.length, events: plan.rows.length, numerical: plan.measurableNames.length, skipDays: plan.skipDays}))) { input.value = ""; return; }
                const report = this.importLoopPlan(plan);
                await this.persist();
                showMessage(t("msg.loopDone", {items: report.itemsCreated, events: report.eventsCreated, duplicates: report.duplicates}));
                this.render();
            } catch (error) {
                showMessage(t("msg.importFail", {error: String(error)}));
                settingsFeedback(t("msg.importFail", {error: String(error)}));
            } finally {
                input.value = ""; settingsBusy.delete(input); input.disabled = false; input.removeAttribute("aria-busy");
                (root.querySelector<HTMLInputElement>("[data-import-loop]") || input).focus();
            }
        });

        root.querySelector<HTMLElement>("[data-action='export-loop']")?.addEventListener("click", (event) => {
            runSettingsAction(event.currentTarget as HTMLElement, () => this.downloadLoopExport());
        });

        const modeSelect = root.querySelector<HTMLSelectElement>("[data-setting-dialog-mode]");
        const scaleRow = root.querySelector<HTMLElement>("[data-dialog-scale-row]");
        const fixedRow = root.querySelector<HTMLElement>("[data-dialog-fixed-row]");
        const resetRow = root.querySelector<HTMLElement>("[data-dialog-reset-row]");
        const syncDialogRows = () => {
            if (scaleRow) scaleRow.hidden = this.dialogSizeMode !== "percent";
            if (fixedRow) fixedRow.hidden = this.dialogSizeMode !== "fixed";
            if (resetRow) resetRow.hidden = this.dialogSizeMode !== "auto" || (!this.dialogRect && !this.dialogOffset);
        };
        modeSelect?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "auto" || value === "percent" || value === "fullscreen" || value === "fixed") {
                this.dialogSizeMode = value;
                syncDialogRows();
                savePreference();
                this.render();
            }
        });
        root.querySelector<HTMLElement>("[data-action='reset-dialog-frame']")?.addEventListener("click", () => {
            this.dialogRect = undefined;
            this.dialogOffset = undefined;
            savePreference();
            this.render();
        });
        root.querySelector<HTMLInputElement>("[data-setting-dialog-scale]")?.addEventListener("change", (event) => {
            const value = Number((event.currentTarget as HTMLInputElement).value);
            if (Number.isFinite(value)) { this.dialogScale = Math.min(100, Math.max(50, Math.round(value))); savePreference(); this.render(); }
        });
        const bindFixedInput = (selector: string, key: "width" | "height") => {
            root.querySelector<HTMLInputElement>(selector)?.addEventListener("change", (event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value);
                if (Number.isFinite(value)) {
                    this.dialogFixedSize = {...this.dialogFixedSize, [key]: key === "width" ? Math.min(2560, Math.max(320, Math.round(value))) : Math.min(2048, Math.max(240, Math.round(value)))};
                    savePreference();
                }
            });
        };
        bindFixedInput("[data-setting-dialog-width]", "width");
        bindFixedInput("[data-setting-dialog-height]", "height");

        /* 分类栏与右侧卡片双向同步：桌面纵向 rail、移动端横向 sticky
           rail 共用同一绑定，并在下次重渲染前由 renderInto 释放。 */
        this.settingsNavigationCleanups.set(root, bindSettingsNavigationFor(root, {reducedMotion: this.reducedMotion}));
    }

    /* 方法体外置于 render/today-bindings.ts（T-022 可选收尾）。 */
    private bindQuickKeyboard(root: HTMLElement) {
        bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root);
    }

    private getQuickTodayItems(): CheckinItem[] {
        return getQuickTodayItems(this.store);
    }

    private renderInsights(): string {
        const item = getActiveItemById(this.store, this.insightsItemId);
        if (!item) return `<div class="lc-checkin lc-checkin--history lc-checkin--insights" data-appearance="${this.resolvedAppearance()}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><h1 class="lc-checkin__title">${t("insights.title")}</h1></header><div class="lc-checkin__empty"><div class="lc-checkin__empty-title">${t("insights.empty")}</div></div></div>`;
        const report = buildHabitInsights(this.store, item.id, {days: 84, asOf: currentCalendarDate()});
        const suggestions = buildCoachingSuggestions(report);
        const rate = report.aggregates.completionRate === null ? t("review.quotaNone") : `${report.aggregates.completionRate}%`;
        const weekRows = report.weeklyTrend.slice(-6).map((week) => `<div class="lc-checkin__insight-row"><span>${escapeHtml(week.label)}</span><strong>${week.completedDays}/${week.eligibleScheduledDays || week.scheduledDays} ${t("insights.weekDays", {n: week.eligibleScheduledDays || week.scheduledDays})}</strong></div>`).join("");
        const insightItems = this.store.items.filter((entry) => !entry.archived).sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
        const itemPicker = insightItems.length > 1 ? `<label class="lc-checkin__insight-picker"><span>${t("insights.picker")}</span><select data-insight-item aria-label="${t("insights.picker")}">${insightItems.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === item.id ? "selected" : ""}>${escapeHtml(entry.icon)} ${escapeHtml(entry.name)}</option>`).join("")}</select></label>` : "";
        /* T-1223 反内疚：连续归位不表述为清零——跳过与中断后重新开始不丢历史。 */
        const restartNote = report.currentStreak === 0 && report.longestStreak > 0 ? `<div class="lc-checkin__insight-restart" role="note">${t("insights.streakRestart")}</div>` : "";
        const coaching = suggestions.length ? `<section class="lc-checkin__insight-section"><div class="lc-checkin__insight-heading"><h2>${t("insights.coaching")}</h2><small>${t("insights.coachingHint")}</small></div><div class="lc-checkin__coaching-list" role="list">${suggestions.map((suggestion, index) => `<div class="lc-checkin__coaching-item is-${suggestion.tone} ${index === 0 ? "is-primary" : ""}" role="listitem"><div><strong>${escapeHtml(suggestion.title)}</strong><span>${escapeHtml(suggestion.detail)}</span></div><small>${escapeHtml(suggestion.evidence)}</small></div>`).join("")}</div></section>` : "";
        const insightGrid = report.days.map((day) => { const label = `${day.date}，${day.status === "complete" ? t("insights.complete") : day.status === "partial" ? t("insights.partial") : day.status === "missed" ? t("insights.missed") : t("insights.off")}，${day.progress}/${day.target} ${day.unit}`; return `<span class="is-${day.status}" role="listitem" tabindex="0" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`; }).join("");
        return `<div class="lc-checkin lc-checkin--history lc-checkin--insights" data-appearance="${this.resolvedAppearance()}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${escapeHtml(item.icon)} ${escapeHtml(item.group || t("insights.title"))}</div><h1 class="lc-checkin__title">${escapeHtml(item.name)}</h1></div></header>${itemPicker}<div class="lc-checkin__insight-stats"><div><strong>${rate}</strong><span>${t("insights.rate")}</span></div><div><strong>${report.currentStreak}</strong><span>${t("insights.currentStreak")}</span></div><div><strong>${report.longestStreak}</strong><span>${t("insights.bestStreak")}</span></div><div><strong>${report.maturity}%</strong><span>${t("insights.maturity")}</span></div></div>${restartNote}${coaching}<section class="lc-checkin__insight-section"><div class="lc-checkin__insight-heading"><h2>${t("insights.window")}</h2><small>${report.startDate} 至 ${report.endDate}</small><div class="lc-checkin__insight-legend" role="list" aria-label="${t("insights.legendAria")}"><span role="listitem"><i class="is-complete" aria-hidden="true"></i>${t("insights.complete")}</span><span role="listitem"><i class="is-partial" aria-hidden="true"></i>${t("insights.partial")}</span><span role="listitem"><i class="is-missed" aria-hidden="true"></i>${t("insights.missed")}</span><span role="listitem"><i class="is-off" aria-hidden="true"></i>${t("insights.off")}</span></div></div><div class="lc-checkin__insight-grid-scroll"><div class="lc-checkin__insight-grid" role="list" aria-label="${t("insights.window")}">${insightGrid}</div></div><div class="lc-checkin__insight-grid-range"><span>${report.startDate}</span><span>${report.endDate}</span></div></section><section class="lc-checkin__insight-section"><h2>${t("insights.weeklyTrend")}</h2>${weekRows || `<div class="lc-checkin__history-empty">${t("insights.notEnough")}</div>`}</section></div>`;
    }

    /* 手机端顶栏（T-118 用户反馈）：导航全部归底栏（顶栏页签与底栏完全重复），
       顶栏只保留 关闭 + 页面标题 + 今日进度，单行尽量矮。 */
    private renderMobileTopbar(): string {
        const progress = this.currentPage === "today" ? this.todayProgressLabel() : "";
        /* Root pages use one close action; nested pages replace it with Back.
           Rendering both controls consumed the entire left rail on phones and
           made the centred title look offset. */
        const contextBackAction = this.currentPage === "editor" ? "back"
            : this.currentPage === "insights" || this.currentPage === "archived" ? "back" : "";
        const leadingAction = contextBackAction
            ? `<button class="lc-checkin__topbar-context" type="button" data-action="${contextBackAction}" aria-label="${t("common.back")}" title="${t("common.back")}">${uiIcon("back")}</button>`
            : `<button class="lc-checkin__topbar-close" type="button" data-action="close-dialog" aria-label="${t("common.close")}">${uiIcon("close")}</button>`;
        const occasionAction = this.currentPage === "occasions"
            ? `<button class="lc-checkin__topbar-context" type="button" data-action="new-occasion" aria-label="${t("occ.newAria")}" title="${t("occ.newAria")}">${uiIcon("add")}</button>`
            : "";
        return `<div class="lc-checkin__mobile-topbar" data-appearance="${this.resolvedAppearance()}" data-palette="${this.palette}" data-page="${this.currentPage}"><div class="lc-checkin__topbar-leading">${leadingAction}</div><strong class="lc-checkin__topbar-title">${this.getPageTitle()}</strong><div class="lc-checkin__topbar-trailing">${progress ? `<span class="lc-checkin__topbar-meta" role="status" aria-label="${t("today.progressAria")}">${progress}</span>` : ""}${occasionAction}</div></div>`;
    }

    private renderMobileNav(): string {
        const entries = [["today", t("nav.today"), "home"], ["review", t("nav.review"), "summary"], ["occasions", t("nav.occasions"), "calendar"], ["settings", t("nav.settings"), "settings"]] as const;
        const buttons = entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`);
        /* 底栏需要短标签保持五列等宽；完整动作名称继续用于辅助名称与 tooltip。 */
        const add = `<button class="lc-checkin__mobile-nav-add ${this.currentPage === "editor" ? "is-selected" : ""}" type="button" data-mobile-nav="add" aria-label="${t("nav.add")}" title="${t("nav.add")}"><span>${uiIcon("add")}</span><small>${t("common.add")}</small></button>`;
        return `<nav class="lc-checkin__mobile-nav" aria-label="${t("app.navAria")}">${buttons.slice(0, 2).join("")}${add}${buttons.slice(2).join("")}</nav>`;
    }
    /* 顶栏进度：与今日页口径一致（未归档 + 当日可用 + 当日排期）。 */
    private todayProgressLabel(): string {
        const date = currentCalendarDate();
        const items = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date));
        if (!items.length) return "";
        const done = items.filter((item) => isComplete(this.store, item, date)).length;
        return `${done}/${items.length}`;
    }

    /* Desktop-wide containers show a labelled left rail instead of the bottom bar.
       Both use data-mobile-nav so one binding covers them. */
    private renderRail(): string {
        const entries = [["today", "今日", "home"], ["review", "回顾", "summary"], ["occasions", "事项", "calendar"], ["settings", "设置", "settings"]] as const;
        return `<nav class="lc-checkin__rail" aria-label="${t("app.navAria")}">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}</nav>`;
    }

    /* 桌面顶栏：左侧五个导航项，右侧 全屏/关闭 —— 正常软件的标题栏布局（T-030/T-031）。
       窄容器由 CSS 隐藏（改用底部导航）。 */
    private renderTopNav(root: HTMLElement): string {
        const entries = [["today", t("nav.today"), "home"], ["review", t("nav.review"), "summary"], ["occasions", t("nav.occasions"), "calendar"], ["settings", t("nav.settings"), "settings"]] as const;
        const ownsDialogChrome = Boolean(this.quickDialog) && root === this.quickDialogElement && !this.isMobileFrontend;
        const fullscreen = ownsDialogChrome
            ? `<button class="lc-checkin__topnav-action" type="button" data-action="toggle-fullscreen" aria-label="${t(this.quickDialogFullscreen ? "common.exitFullscreen" : "common.fullscreen")}" title="${t(this.quickDialogFullscreen ? "common.exitFullscreen" : "common.fullscreen")}">${uiIcon("expand")}</button>`
            : "";
        const dialogActions = ownsDialogChrome
            ? `<div class="lc-checkin__topnav-actions">${fullscreen}<button class="lc-checkin__topnav-action" type="button" data-action="close-dialog" aria-label="${t("common.closeQuickWindow")}" title="${t("common.closeQuickWindow")}">${uiIcon("close")}</button></div>`
            : "";
        return `<nav class="lc-checkin__topnav" aria-label="${t("app.navAria")}"><div class="lc-checkin__topnav-tabs">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}</div>${dialogActions}</nav>`;
    }

    /* 8.6 连续记录：按项目统计当前连续打卡天数（自然日粒度，从事件推导）。 */
    private computeStreaks(): Map<string, number> {
        return computeStreaksValue(this.store);
    }

    /* 方法体外置于 render/fragments.ts（T-022）；壳内仅保留连续记录状态赋值。 */
    private renderToday(): string {
        this.currentStreaks = this.computeStreaks();
        let bestStreakId = "";
        let bestStreak = 0;
        for (const [id, streak] of this.currentStreaks) {
            if (streak > bestStreak) { bestStreak = streak; bestStreakId = id; }
        }
        this.bestStreakItem = bestStreakId ? this.store.items.find((item) => item.id === bestStreakId) : undefined;
        this.bestStreakValue = bestStreak;
        return renderTodayView({
            store: this.store,
            occasionStore: this.occasionStore,
            currentStreaks: this.currentStreaks,
            bestStreakItem: this.bestStreakItem,
            bestStreakValue: this.bestStreakValue,
            bulkMode: this.bulkMode,
            bulkSelected: this.bulkSelected,
            todaySortMode: this.todaySortMode,
            todayGroupMode: this.todayGroupMode,
            collapsedTodayGroups: this.collapsedTodayGroups,
            completedCollapsed: this.completedCollapsed,
            pendingOnly: this.pendingOnly,
            todayQuery: this.todayQuery,
            weekStripVisible: this.weekStripVisible,
            lastExportAt: this.lastExportAt,
            saveState: this.saveState,
            recentRecord: this.recentRecord,
            celebration: this.celebration,
            supportsCustomTab: this.supportsCustomTab,
            appearance: this.resolvedAppearance(),
            reducedMotion: this.reducedMotion,
            reminderUserActions: this.reminderUserActions,
            priorityReminderExpanded: this.priorityReminderExpanded,
        });
    }

    /* 方法体外置于 render/fragments.ts（T-022）。 */
    private renderOccasionSection(date: Date): string {
        return renderOccasionBannerView(this.occasionStore, date);
    }

    private renderSaveStatus(): string {
        return renderSaveStatusView(this.saveState);
    }

    private renderSyncNotice(): string {
        return renderSyncNoticeView(this.syncNoticeTimer !== undefined);
    }

    private renderTodayGroups(items: CheckinItem[], date: Date): string {
        const groups = new Map<string, CheckinItem[]>();
        items.forEach((item) => {
            const key = this.getTodayGroupKey(item);
            const group = groups.get(key);
            if (group) group.push(item);
            else groups.set(key, [item]);
        });
        const order = this.todayGroupMode === "priority"
            ? ["high", "medium", "low"]
            : this.todayGroupMode === "time" ? ["morning", "afternoon", "evening", "any"] : [];
        const entries = [...groups.entries()].sort(([left], [right]) => {
            if (order.length) return order.indexOf(left) - order.indexOf(right);
            if (left === t("review.ungrouped")) return 1;
            if (right === t("review.ungrouped")) return -1;
            return left.localeCompare(right, "zh-CN");
        });
        return entries.map(([key, groupItems]) => {
            const stateKey = `${this.todayGroupMode}:${key}`;
            const collapsed = this.collapsedTodayGroups.has(stateKey);
            return `<section class="lc-checkin__group">
                <button class="lc-checkin__group-header" type="button" data-group-toggle="${escapeHtml(stateKey)}" aria-expanded="${!collapsed}">
                    <span>${escapeHtml(this.getTodayGroupLabel(key))}</span><em>${groupItems.length}</em><i>${collapsed ? "⌄" : "⌃"}</i>
                </button>
                <div class="lc-checkin__group-items" ${collapsed ? "hidden" : ""}>${groupItems.map((item) => this.renderItem(item, date)).join("")}</div>
            </section>`;
        }).join("");
    }

    private getTodayGroupKey(item: CheckinItem): string {
        if (this.todayGroupMode === "priority") return item.priority || "medium";
        if (this.todayGroupMode === "time") return item.timeSlot || "any";
        return item.group?.trim() || t("review.ungrouped");
    }

    private getTodayGroupLabel(key: string): string {
        if (this.todayGroupMode === "priority") return t(PRIORITY_LABELS[key as CheckinPriority] || PRIORITY_LABELS.medium);
        if (this.todayGroupMode === "time") return t(TIME_SLOT_LABELS[key as CheckinTimeSlot] || TIME_SLOT_LABELS.any);
        return key;
    }

    /* 方法体外置于 render/review.ts（T-022）。 */
    private renderReview(analyticsSnapshot: AnalyticsSnapshot): string {
        return renderReviewView({
            store: this.store,
            occasionStore: this.occasionStore,
            appearance: this.resolvedAppearance(),
            historyMonth: this.historyMonth,
            selectedHistoryDate: this.selectedHistoryDate,
            historyQuery: this.historyQuery,
            historySource: this.historySource,
            historyOrder: this.historyOrder,
            heatmapYearOffset: this.heatmapYearOffset,
            reviewFoldSections: this.reviewFoldSections,
            reviewFoldTouched: this.reviewFoldTouched,
            summaryRange: this.summaryRange,
            summaryCustomRange: this.summaryCustomRange,
            summaryText: this.summaryText,
            reportSections: this.reportSections,
            suggestionWorkflow: this.suggestionWorkflow,
            summaryRefreshing: this.summaryRefreshing,
            analysisLastGeneratedAt: this.analysisHistory.length ? this.analysisHistory[this.analysisHistory.length - 1].generatedAt : undefined,
            analysisHistoryCount: this.analysisHistory.length,
            summaryProvidersCount: this.summaryProviders.size,
            editingHistoryNoteId: this.editingHistoryNoteId,
            reminderFilter: this.reminderFilter,
            reminderUserActions: this.reminderUserActions,
            analyticsSnapshot,
        });
    }

    /* T-011 回顾页可折叠区块：趋势/日志/近期事项/成就默认折叠，展开状态存入视图偏好。 */
    private renderReviewFold(id: string, title: string, body: string): string {
        if (!body.trim()) return "";
        const open = this.reviewFoldSections.has(id);
        return `<details class="lc-checkin__review-fold" data-review-fold="${id}"${open ? " open" : ""}><summary><span>${title}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-fold-body">${body}</div></details>`;
    }

    /* 方法体外置于 render/fragments.ts；壳保持类内 API 与测试断言稳定。 */
    private renderUpcomingOccasions(): string {
        return renderUpcomingOccasionsView(this.occasionStore);
    }

    private renderCheckinLog(): string {
        return renderCheckinLogView(this.store.events, this.store.items);
    }

    /* 方法体外置于 render/archived.ts（15.0-A 模块化）；壳保持类内 API 与存储字段稳定。 */
    private renderArchived(): string {
        return renderArchivedView({items: this.store.items, summaries: buildArchivedItemSummaries(this.store.items, this.store.events, (item) => countCompletedDays(this.store, item, currentCalendarDate())), query: this.archivedQuery, appearance: this.resolvedAppearance()});
    }

    /* 方法体外置于 render/occasions.ts（T-022）。 */
    private renderOccasions(): string {
        return renderOccasionsView({
            occasionStore: this.occasionStore,
            editingOccasionId: this.editingOccasionId,
            occasionSearchQuery: this.occasionSearchQuery,
            occasionStatusFilter: this.occasionStatusFilter,
            occasionKindFilter: this.occasionKindFilter,
            occasionTimeFilter: this.occasionTimeFilter,
            occasionTemplatesOpen: this.occasionTemplatesOpen,
            occasionTemplateCategory: this.occasionTemplateCategory,
            appearance: this.resolvedAppearance(),
        });
    }

    /* 方法体外置于 render/fragments.ts（T-022）。 */
    private renderItem(item: CheckinItem, date: Date): string {
        return renderItemView(item, date, {
            store: this.store,
            currentStreaks: this.currentStreaks,
            bulkMode: this.bulkMode,
            bulkSelected: this.bulkSelected,
            todaySortMode: this.todaySortMode,
        });
    }

    /* 方法体外置于 render/editor.ts（T-022）。 */
    private renderEditor(): string {
        return renderEditorView({
            store: this.store,
            userTemplates: this.userTemplates,
            customIconLibrary: this.customIconLibrary,
            editingId: this.editingId,
            appearance: this.resolvedAppearance(),
            todayGroupMode: this.todayGroupMode,
            saveState: this.saveState,
            syncNoticeActive: this.syncNoticeTimer !== undefined,
            anchorSuspended: (() => {
                const anchor = this.store.items.find((candidate) => candidate.id === this.editingId)?.noteAnchor;
                return Boolean(anchor && this.suspendedAnchors.has(`${this.editingId}:${anchor.blockId}`));
            })(),
        });
    }


    /* 方法体外置于 render/bind-today.ts（T-022）；宿主成员经 BindTodayHost 接口声明。 */
    private bindToday(root: HTMLElement) {
        bindTodayHandlers(root, this as unknown as BindTodayHost);
        /* 桌面键盘流 j/k/e（T-107）：手机端不绑定，避免与输入法/滚动手势冲突。 */
        if (!this.isMobileFrontend) bindPageKeyboardFor(this as unknown as TodayBindingsHost, root);
        bindItemContextMenuFor(this as unknown as TodayBindingsHost, root);
    }

    /* 方法体外置于 render/bind-occasions.ts（T-022）。 */
    private bindOccasions(root: HTMLElement) {
        bindOccasionsHandlers(root, this as unknown as BindOccasionsHost);
    }

    private syncOccasionLunarHint(form: HTMLFormElement | null) {
        if (!form) return;
        const hint = form.querySelector<HTMLElement>("[data-occasion-lunar-hint]");
        if (!hint) return;
        const date = form.querySelector<HTMLInputElement>("[name='date']")?.value || "";
        const calendar = form.querySelector<HTMLSelectElement>("[data-occasion-calendar]")?.value;
        if (calendar !== "lunar" || !isValidLocalDateInput(date)) { hint.hidden = true; return; }
        const lunar = solarToLunar(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
        hint.textContent = lunar ? `将按农历 ${formatLunar(lunar)} 循环` : "";
        hint.hidden = !lunar;
    }

    /* 方法体外置于 render/bind-page-navigation.ts（T-022）。 */
    private bindPageNavigation(root: HTMLElement) {
        bindPageNavigationHandlers(root, this as unknown as BindPageNavigationHost);
    }

    private bindDialogClose(root: HTMLElement) {
        bindDialogCloseFor(this as unknown as PluginOpsHost, root);
    }

    private bindMobileNav(root: HTMLElement) {
        bindMobileNavFor(this as unknown as PluginOpsHost, root);
    }

    private changeHistoryMonth(offset: number) {
        changeHistoryMonthFor(this as unknown as PluginOpsHost, offset);
    }

    private async restoreItem(itemId: string) {
        await restoreItemFor(this as unknown as PluginOpsHost, itemId);
    }

    private async restoreLatestBackup(historyIndex?: number) {
        if (!this.storageReady || this.disposed) return;
        const raw = await this.loadData(BACKUP_STORAGE_NAME);
        if (!raw) { showMessage(t("msg.noSnapshot")); return; }
        const snapshots = readStoreSnapshotHistory(raw);
        const snapshot = historyIndex === undefined ? snapshots[snapshots.length - 1] : snapshots[historyIndex];
        if (!snapshot) { showMessage(t("msg.noSnapshot")); return; }
        const preflight = preflightJsonRecovery(JSON.stringify(snapshot.store), normalizeStore, summarizeJsonBackup(this.store));
        const {report: migration, assessment, validationErrors} = preflight;
        if (validationErrors.length) {
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "restore", at: new Date().toISOString(), details: {...buildRecoveryAuditDetails("local-snapshot", preflight, "rejected", validationErrors), snapshotCapturedAt: snapshot.capturedAt, legacySnapshot: snapshot.legacy}});
            await this.persistAuditBestEffort();
            showMessage(t("msg.snapshotRestoreFail"));
            return;
        }
        const backup = migration.store;
        const itemCount = backup.items.length;
        const eventCount = backup.events.length;
        const review = assessment.requiresReview ? `\n\n${assessment.reasons.join("；")}` : "";
        const captured = snapshot.capturedAt ? `\n${t("msg.snapshotCapturedAt", {time: new Date(snapshot.capturedAt).toLocaleString()})}` : "";
        if (!window.confirm(`${t("msg.snapshotConfirm", {items: itemCount, events: eventCount})}${captured}${review}`)) return;
        const current = this.cloneStore(this.store);
        this.store = backup;
        try {
            await this.persist();
        } catch {
            this.store = current;
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "restore", at: new Date().toISOString(), details: {...buildRecoveryAuditDetails("local-snapshot", preflight, "rejected", ["persist-failed"]), snapshotCapturedAt: snapshot.capturedAt, legacySnapshot: snapshot.legacy}});
            await this.persistAuditBestEffort();
            showMessage(t("msg.snapshotRestoreFail"));
            return;
        }
        this.auditEntries = appendStoreAudit(this.auditEntries, {type: "restore", at: new Date().toISOString(), details: {...buildRecoveryAuditDetails("local-snapshot", preflight, "accepted"), snapshotCapturedAt: snapshot.capturedAt, legacySnapshot: snapshot.legacy}});
        await this.persistAuditBestEffort();
        showMessage(t("msg.snapshotRestored", {items: itemCount, events: eventCount}));
        this.render();
    }

    private async setItemArchived(itemId: string, archived: boolean, moment: ActionMoment, expectedFingerprint?: string): Promise<boolean> {
        if (this.disposed || this.initializationState !== "ready" || typeof itemId !== "string" || typeof archived !== "boolean") return false;
        const item = getItemById(this.store, itemId);
        if (!item) return false;
        if (item.archived === archived) return true;
        if (!expectedFingerprint || this.itemFingerprint(item) !== expectedFingerprint) {
            showMessage(t("msg.conflictArchive"));
            return false;
        }
        const previous = this.store;
        const archivePeriods = item.archivePeriods.map((period) => ({...period}));
        const today = moment.localDate;
        if (archived) {
            const todayDate = calendarDateFromKey(today);
            const tomorrow = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1);
            if (!archivePeriods.some((period) => !period.endDate)) {
                archivePeriods.push({startDate: dateKey(tomorrow)});
            }
        } else {
            const openIndex = archivePeriods.findIndex((period) => !period.endDate);
            if (openIndex >= 0) {
                if (archivePeriods[openIndex].startDate >= today) {
                    archivePeriods.splice(openIndex, 1);
                } else {
                    archivePeriods[openIndex] = {...archivePeriods[openIndex], endDate: today};
                }
            }
        }
        const updated = {...item, archived, archivePeriods, updatedAt: nextItemUpdatedAt(item.updatedAt, moment.occurredAt)};
        this.store = {...this.store, items: this.store.items.map((candidate) => candidate.id === itemId ? updated : candidate)};
        try {
            await this.persist();
        } catch {
            this.store = previous;
            showMessage(t("msg.saveFail"));
            return false;
        }
        this.invalidateSummary();
        this.broadcast({type: "item-updated", item: updated});
        this.renderBackgroundUpdate();
        return true;
    }

    /** Apply the shared archive-period transition to the current in-memory snapshot. */
    private applyArchivedItems(requestedIds: ReadonlySet<string>, moment: ActionMoment): CheckinItem[] {
        const today = calendarDateFromKey(moment.localDate);
        const startDate = dateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
        const archived: CheckinItem[] = [];
        const items = this.store.items.map((item) => {
            if (!requestedIds.has(item.id) || item.archived) return item;
            const archivePeriods = item.archivePeriods.map((period) => ({...period}));
            if (!archivePeriods.some((period) => !period.endDate)) archivePeriods.push({startDate});
            const updated = {...item, archived: true, archivePeriods, updatedAt: nextItemUpdatedAt(item.updatedAt, moment.occurredAt)};
            archived.push(updated);
            return updated;
        });
        if (archived.length) this.store = {...this.store, items};
        return archived;
    }

    /** Today 批量归档：一次构造快照、一次持久化，避免逐项保存和中间态重渲染。 */
    private async archiveItems(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        if (!requestedIds.size || this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const previous = this.store;
            const moment = captureActionMoment();
            const archived = this.applyArchivedItems(requestedIds, moment);
            if (!archived.length) return false;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                return false;
            }
            this.invalidateSummary();
            for (const item of archived) this.broadcast({type: "item-updated", item});
            showMessage(t("msg.itemsArchived", {n: archived.length}));
            return true;
        });
    }

    /** Today 批量完成：基于同一自然日快照生成事件，整批只追加/持久化一次。 */
    private async completeItems(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        if (!requestedIds.size || this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const previous = this.store;
            const moment = captureActionMoment();
            const actionDate = calendarDateFromKey(moment.localDate);
            const recorded: Array<{item: CheckinItem; event: CheckinEvent; revision: CheckinItemRevision; value: number}> = [];
            for (const item of this.store.items) {
                if (!requestedIds.has(item.id) || item.archived || !isItemAvailableOnDate(item, actionDate)
                    || !isScheduledToday(item, actionDate) || isComplete(this.store, item, actionDate)) continue;
                const revision = getItemRevisionForDate(item, actionDate);
                const remaining = evaluateItemRule(this.store, item, actionDate).remaining ?? 0;
                const value = revision.kind === "binary" ? 1 : Math.max(0, remaining);
                if (value <= 0) continue;
                const event = this.makeEvent(item, value, "manual", revision.unit, undefined, undefined, moment);
                recorded.push({item, event, revision, value});
            }
            const next = appendEvents(this.store, recorded.map((entry) => entry.event));
            if (next === this.store) return false;
            this.store = next;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                return false;
            }
            this.invalidateSummary();
            for (const entry of recorded) this.broadcast({type: "event-recorded", item: entry.item, event: entry.event});
            this.broadcast({type: "analytics-updated", analyticsAsOf: moment.localDate});
            for (const entry of recorded) {
                if (entry.item.linkedOccasionId && isComplete(this.store, entry.item, actionDate)) {
                    void this.setOccasionCompleted(entry.item.linkedOccasionId, moment.localDate, true);
                }
                void this.writebackNoteAnchor(entry.item, {state: "done", value: entry.value, unit: entry.revision.unit});
            }
            this.maybeAutoArchiveItemsAfterRecord(recorded.map((entry) => entry.item));
            const last = recorded[recorded.length - 1];
            if (last) {
                const target = last.revision.schedule.type === "quota" ? last.revision.schedule.quota?.amount || last.revision.target : last.revision.target;
                this.setRecentRecord({
                    eventId: last.event.id,
                    itemId: last.item.id,
                    message: `已记录 ${last.item.name} +${formatNumber(last.value)} ${last.revision.unit || "次"}`,
                    progress: getProgress(this.store, last.item, actionDate),
                    target,
                    unit: last.revision.unit || "次",
                });
                this.pendingLocalItemId = last.item.id;
                this.pendingLocalItemDate = moment.localDate;
            }
            showMessage(t("msg.itemsCompleted", {n: recorded.length}));
            return true;
        });
    }

    /* T-1222 跳过（D-216）：用户显式跳过当日——kind=skip 事件，完成/配额/连击口径
       由计算层自动跟随（T-1221）。已完成或非当日排期的项不提供跳过。 */
    private async skipItemToday(itemId: string, note?: string): Promise<boolean> {
        if (this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const current = getActiveItemById(this.store, itemId);
            const moment = captureActionMoment();
            const actionDate = calendarDateFromKey(moment.localDate);
            if (!current || !isItemAvailableOnDate(current, actionDate) || !isScheduledToday(current, actionDate)) return false;
            if (isComplete(this.store, current, actionDate)) return false;
            if (getEventsForDay(this.store, itemId, actionDate).some((event) => isSkipEvent(event))) return true;
            const revision = getItemRevisionForDate(current, actionDate);
            const event: CheckinEvent = {...this.makeEvent(current, 0, "manual", revision.unit, note?.trim() || undefined, undefined, moment), kind: "skip"};
            const previous = this.store;
            const next = appendEvent(this.store, event);
            if (next === this.store) return false;
            this.store = next;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return false;
            }
            this.invalidateSummary();
            this.broadcast({type: "event-recorded", item: current, event});
            this.broadcast({type: "analytics-updated", analyticsAsOf: event.localDate});
            void this.writebackNoteAnchor(current, {state: "skip"});
            if (current.noteAnchor?.appendNotes && note?.trim()) {
                void this.appendNoteToAnchor(current, buildAnchorNoteMarkdown({date: event.localDate, itemName: current.name, stateText: t("anchor.stateSkip"), note: note.trim()}));
            }
            showMessage(t("msg.skipDone", {name: current.name}));
            return true;
        });
    }

    private async unskipItemToday(itemId: string): Promise<boolean> {
        if (this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const current = getActiveItemById(this.store, itemId);
            const moment = captureActionMoment();
            const actionDate = calendarDateFromKey(moment.localDate);
            if (!current) return false;
            const skipEvents = getEventsForDay(this.store, itemId, actionDate).filter((event) => isSkipEvent(event));
            if (!skipEvents.length) return true;
            const previous = this.store;
            this.store = removeEvents(this.store, skipEvents, moment.occurredAt);
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return false;
            }
            this.invalidateSummary();
            this.broadcast({type: "event-deleted", item: current, deletedEvents: skipEvents});
            void this.writebackNoteAnchor(current, {state: "unskip"});
            showMessage(t("msg.unskipDone", {name: current.name}));
            return true;
        });
    }

    private async skipItems(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        if (!requestedIds.size || this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const previous = this.store;
            const moment = captureActionMoment();
            const actionDate = calendarDateFromKey(moment.localDate);
            const events: CheckinEvent[] = [];
            const skipped: CheckinItem[] = [];
            for (const item of this.store.items) {
                if (!requestedIds.has(item.id) || item.archived || !isItemAvailableOnDate(item, actionDate) || !isScheduledToday(item, actionDate) || isComplete(this.store, item, actionDate)) continue;
                if (getEventsForDay(this.store, item.id, actionDate).some((event) => isSkipEvent(event))) continue;
                const revision = getItemRevisionForDate(item, actionDate);
                events.push({...this.makeEvent(item, 0, "manual", revision.unit, undefined, undefined, moment), kind: "skip"});
                skipped.push(item);
            }
            if (!events.length) return false;
            const next = appendEvents(this.store, events);
            if (next === this.store) return false;
            this.store = next;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                return false;
            }
            this.invalidateSummary();
            for (const item of skipped) {
                const created = events.find((event) => event.itemId === item.id);
                if (created) this.broadcast({type: "event-recorded", item, event: created});
                void this.writebackNoteAnchor(item, {state: "skip"});
            }
            this.broadcast({type: "analytics-updated", analyticsAsOf: events[0].localDate});
            showMessage(t("msg.skipBatchDone", {n: skipped.length}));
            return true;
        });
    }

    private async generateSummary() {
        const provider = this.summaryProviders.values().next().value as SummaryProvider | undefined;
        if (!provider) return;
        if (this.summaryRefreshing) return;
        const range = this.summaryRange;
        const customRange = this.summaryCustomRange;
        const requestId = ++this.summaryRequestId;
        const now = currentCalendarDate();
        const context = customRange ? buildCustomSummaryContext(this.store, customRange, now) : buildSummaryContext(this.store, range, now);
        const summaryItemIds = new Set(context.items.map((item) => item.itemId));
        this.summaryRefreshing = true;
        this.render();
        try {
            const summaryText = await withTimeout(provider.summarize({
                range,
                ...(customRange ? {customRange} : {}),
                items: this.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => this.cloneItem(item)),
                events: customRange ? getEventsInCustomRange(this.store, customRange) : this.getSummaryEvents(range, now),
                context,
            }), SUMMARY_TIMEOUT_MS, "总结适配器响应超时");
            if (this.disposed || requestId !== this.summaryRequestId || this.currentPage !== "review" || this.summaryRange !== range || this.summaryCustomRange !== customRange || this.summaryProviders.get(provider.id) !== provider) return;
            const normalized = normalizeSummaryProviderResult(summaryText, this.store.items);
            if (!normalized) throw new Error("总结适配器返回格式无效");
            this.summaryText = normalized.text;
            this.suggestionWorkflow = normalized.suggestions[0] ? createSuggestionWorkflow(createSuggestionEnvelope(normalized.suggestions[0])) : undefined;
            if (this.suggestionWorkflow) this.broadcast({type: "suggestion-workflow-updated", suggestionId: this.suggestionWorkflow.envelope.id, suggestionStatus: this.suggestionWorkflow.envelope.status});
            void this.persistSuggestionWorkflow().catch(() => undefined);
            this.summaryRefreshing = false;
            const meta = createAnalysisMeta(customRange ? "custom" : range, "agent", context.endDate);
            void saveAnalysisSnapshot((key, value) => this.saveData(key, value), AGENT_ANALYSIS_CACHE_KEY, this.analysisHistory, {...meta, text: normalized.text}).then((history) => { this.analysisHistory = history; }).catch(() => undefined);
            this.render();
        } catch (error) {
            if (requestId === this.summaryRequestId) {
                this.summaryRefreshing = false;
            }
            if (!this.disposed && requestId === this.summaryRequestId && this.currentPage === "review" && this.summaryRange === range && this.summaryCustomRange === customRange) {
                this.render();
                showMessage(t("msg.summaryFail", {error: String(error)}));            }
        }
    }

    private suggestionNonce(): string {
        try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    }

    private async handleSuggestionDecision(decision: "confirm" | "cancel") {
        const current = this.suggestionWorkflow;
        if (!current) return;
        const token = createSuggestionDecisionToken(current.envelope, decision, new Date().toISOString(), this.suggestionNonce());
        const outcome = decideSuggestion(current, token, decision, new Date());
        if (!outcome.accepted) {
            showMessage(t(`agent.decision.${outcome.reason}`));
            return;
        }
        if (decision === "cancel") {
            this.suggestionWorkflow = outcome.state;
            await this.persistSuggestionWorkflow().catch(() => undefined);
            this.broadcast({type: "suggestion-workflow-updated", suggestionId: current.envelope.id, suggestionStatus: outcome.state.envelope.status});
            this.render();
            showMessage(t("agent.cancelledNotice", {title: current.envelope.title}));
            return;
        }
        const applied = applySuggestion(outcome.state, this.store);
        if (!applied.result.applied) {
            this.suggestionWorkflow = applied.state;
            await this.persistSuggestionWorkflow().catch(() => undefined);
            this.broadcast({type: "suggestion-workflow-updated", suggestionId: current.envelope.id, suggestionStatus: applied.state.envelope.status});
            this.render();
            showMessage(t("agent.confirmedNotice", {title: current.envelope.title}));
            showMessage(t("agent.applyRejected"));
            return;
        }
        const previousStore = this.store;
        this.store = applied.result.store;
        try {
            await this.persist();
            this.suggestionWorkflow = applied.state;
            await this.persistSuggestionWorkflow().catch(() => undefined);
            this.broadcast({type: "suggestion-workflow-updated", suggestionId: current.envelope.id, suggestionStatus: applied.state.envelope.status});
            this.render();
        } catch (error) {
            this.store = previousStore;
            showMessage(t("msg.saveFailedShort"));
            throw error;
        }
    }

    private async undoSuggestionWorkflow() {
        const current = this.suggestionWorkflow;
        if (!current) return;
        const undone = undoSuggestion(current, this.store);
        if (!undone.result.reverted) {
            this.suggestionWorkflow = undone.state;
            await this.persistSuggestionWorkflow().catch(() => undefined);
            this.broadcast({type: "suggestion-workflow-updated", suggestionId: current.envelope.id, suggestionStatus: undone.state.envelope.status});
            this.render();
            showMessage(t("agent.undoAccepted", {title: current.envelope.title}));
            showMessage(t("agent.undoRejected"));
            return;
        }
        const previousStore = this.store;
        this.store = undone.result.store;
        try {
            await this.persist();
            this.suggestionWorkflow = undone.state;
            await this.persistSuggestionWorkflow().catch(() => undefined);
            this.broadcast({type: "suggestion-workflow-updated", suggestionId: current.envelope.id, suggestionStatus: undone.state.envelope.status});
            this.render();
        } catch (error) {
            this.store = previousStore;
            showMessage(t("msg.saveFailedShort"));
            throw error;
        }
    }

    private downloadExport(format: "json" | "csv") {
        downloadExportFor(this as unknown as PluginOpsHost, format);
    }

    /* T-1217：报告 Markdown 走与 JSON/CSV 相同的下载边界。 */
    private downloadReportMarkdown(markdown: string) {
        downloadReportMarkdownFor(markdown);
    }

    private getSummaryEvents(range: SummaryRange, date = new Date()): CheckinEvent[] {
        return getSummaryEventsValue(this.store, range, date);
    }

    /* 方法体外置于 render/bind-editor.ts（T-022）；宿主成员经 BindEditorHost 接口声明。 */
    private bindEditor(root: HTMLElement) {
        bindEditorHandlers(root, this as unknown as BindEditorHost);
    }

    /* 方法体外置于 render/save-form.ts（T-022）。 */
    private async saveForm(data: FormData, editingId: string | undefined, submittedAt: ActionMoment, expectedFingerprint?: string) {
        /* T-1231：解绑时清除旧锚点块上的本插件属性（尽力而为，不阻断保存）。 */
        const previousAnchor = editingId ? getItemById(this.store, editingId)?.noteAnchor : undefined;
        await saveEditorForm(this as unknown as SaveFormHost, data, editingId, submittedAt, expectedFingerprint);
        const newAnchor = editingId ? getItemById(this.store, editingId)?.noteAnchor : undefined;
        if (previousAnchor && (!newAnchor || newAnchor.blockId !== previousAnchor.blockId)) {
            this.suspendedAnchors.delete(`${editingId}:${previousAnchor.blockId}`);
            void this.clearAnchorAttrBestEffort(previousAnchor.blockId);
        }
    }

    private async archiveEditingItem() {
        if (!this.editingId) {
            return;
        }
        const current = getItemById(this.store, this.editingId);
        if (!current) {
            return;
        }
        const moment = captureActionMoment();
        const expectedFingerprint = this.editingFingerprint;
        if (await this.enqueueMutation(() => this.setItemArchived(current.id, !current.archived, moment, expectedFingerprint))) {
            this.showToday();
        }
    }

    /** 删除打卡项及其全部记录（D-165）：确认层展示影响，persist 链自动写入删除前恢复点，
        事件墓碑防多窗口旧数据重放复活。 */
    private async deleteItemWithRecords(itemId: string): Promise<boolean> {
        const item = getItemById(this.store, itemId);
        if (!item || this.disposed || this.disposing) return false;
        const recordCount = this.store.events.filter((event) => event.itemId === itemId).length;
        if (!window.confirm(t("editor.deleteItemConfirm", {name: item.name, n: recordCount}))) return false;
        return this.enqueueMutation(async () => {
            const current = getItemById(this.store, itemId);
            if (!current) {
                if (this.currentPage === "today") this.renderBackgroundUpdate();
                return true;
            }
            let currentRecordCount = 0;
            for (const event of this.store.events) if (event.itemId === itemId) currentRecordCount += 1;
            if (currentRecordCount !== recordCount) {
                showMessage(t("msg.deleteImpactChanged"));
                return false;
            }
            const previous = this.store;
            const moment = captureActionMoment();
            this.store = deleteItemCascade(this.store, itemId, moment.occurredAt);
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return false;
            }
            this.invalidateSummary();
            this.broadcast({type: "item-deleted", item: current});
            if (this.editingId === itemId) {
                this.editingId = undefined;
                this.editingFingerprint = undefined;
            }
            showMessage(t("msg.itemDeleted", {name: current.name}));
            if (this.currentPage === "today") this.renderBackgroundUpdate();
            return true;
        });
    }

    /** Today 批量删除：确认统计与删除投影均为单次线性扫描，整批只持久化一次。 */
    private async deleteItemsWithRecords(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        const items = this.store.items.filter((item) => requestedIds.has(item.id) && !item.archived);
        if (!items.length || this.disposed || this.disposing) return false;
        const ids = new Set(items.map((item) => item.id));
        let recordCount = 0;
        for (const event of this.store.events) if (ids.has(event.itemId)) recordCount += 1;
        if (!window.confirm(t("today.bulkDeleteConfirm", {n: items.length, records: recordCount}))) return false;
        return this.enqueueMutation(async () => {
            const currentItems = this.store.items.filter((item) => ids.has(item.id) && !item.archived);
            let currentRecordCount = 0;
            for (const event of this.store.events) if (ids.has(event.itemId)) currentRecordCount += 1;
            if (currentItems.length !== items.length || currentRecordCount !== recordCount) {
                showMessage(t("msg.deleteImpactChanged"));
                return false;
            }
            const previous = this.store;
            const moment = captureActionMoment();
            this.store = deleteItemsCascade(this.store, [...ids], moment.occurredAt);
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFailedShort"));
                return false;
            }
            this.invalidateSummary();
            for (const item of currentItems) this.broadcast({type: "item-deleted", item});
            showMessage(t("msg.itemsDeleted", {n: currentItems.length}));
            return true;
        });
    }

    private async deleteEditingItem(): Promise<boolean> {
        if (!this.editingId) return false;
        const deleted = await this.deleteItemWithRecords(this.editingId);
        if (deleted) this.showToday();
        return deleted;
    }

    private async deleteArchivedItem(itemId: string): Promise<boolean> {
        const deleted = await this.deleteItemWithRecords(itemId);
        if (deleted) this.renderBackgroundUpdate();
        return deleted;
    }

    private async restoreArchivedItems(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        if (!requestedIds.size || this.disposed || this.disposing) return false;
        return this.enqueueMutation(async () => {
            const moment = captureActionMoment();
            const previous = this.store;
            const restored: CheckinItem[] = [];
            const nextItems = this.store.items.map((item) => {
                if (!requestedIds.has(item.id) || !item.archived) return item;
                const archivePeriods = item.archivePeriods.map((period) => ({...period}));
                const openIndex = archivePeriods.findIndex((period) => !period.endDate);
                if (openIndex >= 0) {
                    if (archivePeriods[openIndex].startDate >= moment.localDate) archivePeriods.splice(openIndex, 1);
                    else archivePeriods[openIndex] = {...archivePeriods[openIndex], endDate: moment.localDate};
                }
                const updated = {...item, archived: false, archivePeriods, updatedAt: nextItemUpdatedAt(item.updatedAt, moment.occurredAt)};
                restored.push(updated);
                return updated;
            });
            if (!restored.length) return false;
            this.store = {...this.store, items: nextItems};
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return false;
            }
            this.invalidateSummary();
            for (const item of restored) this.broadcast({type: "item-updated", item});
            showMessage(t("msg.itemsRestored", {n: restored.length}));
            this.renderBackgroundUpdate();
            return true;
        });
    }

    private async deleteArchivedItems(itemIds: string[]): Promise<boolean> {
        const requestedIds = new Set(itemIds.filter((id) => typeof id === "string" && id));
        const items = this.store.items.filter((item) => requestedIds.has(item.id) && item.archived);
        if (!items.length || this.disposed || this.disposing) return false;
        const ids = new Set(items.map((item) => item.id));
        let recordCount = 0;
        for (const event of this.store.events) if (ids.has(event.itemId)) recordCount += 1;
        if (!window.confirm(t("archived.bulkDeleteConfirm", {n: ids.size, records: recordCount}))) return false;
        return this.enqueueMutation(async () => {
            const currentItems = this.store.items.filter((item) => ids.has(item.id) && item.archived);
            let currentRecordCount = 0;
            for (const event of this.store.events) if (ids.has(event.itemId)) currentRecordCount += 1;
            if (currentItems.length !== items.length || currentRecordCount !== recordCount) {
                showMessage(t("msg.deleteImpactChanged"));
                return false;
            }
            const previous = this.store;
            const moment = captureActionMoment();
            this.store = deleteItemsCascade(this.store, [...ids], moment.occurredAt);
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return false;
            }
            this.invalidateSummary();
            for (const item of currentItems) this.broadcast({type: "item-deleted", item});
            showMessage(t("msg.itemsDeleted", {n: currentItems.length}));
            this.renderBackgroundUpdate();
            return true;
        });
    }

    private async toggleItem(itemId: string, moment: ActionMoment, desiredComplete: boolean, expectedRevisionFingerprint?: string, eventsToUndo: readonly CheckinEvent[] = []) {
        const item = getActiveItemById(this.store, itemId);
        const actionDate = calendarDateFromKey(moment.localDate);
        if (!item || !isItemAvailableOnDate(item, actionDate)) {
            return;
        }
        if (!expectedRevisionFingerprint || this.revisionFingerprint(item, actionDate) !== expectedRevisionFingerprint) {
            showMessage(t("msg.conflictCheckin"));
            this.renderBackgroundUpdate();
            return;
        }
        const complete = isComplete(this.store, item, actionDate);
        if (complete === desiredComplete) {
            return;
        }
        if (!desiredComplete) {
            const previous = this.store;
            const deletedEvents = this.store.events.filter((event) => eventsToUndo.some((snapshot) => snapshot.id === event.id
                || Boolean(snapshot.externalRef && snapshot.itemId === event.itemId && snapshot.source === event.source && snapshot.externalRef === event.externalRef)));
            const next = removeEvents(this.store, eventsToUndo, moment.occurredAt);
            if (next === this.store) {
                this.renderBackgroundUpdate();
                return;
            }
            this.store = next;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.saveFail"));
                this.renderBackgroundUpdate();
                return;
            }
            this.invalidateSummary();
            this.broadcast({type: "event-deleted", item, deletedEvents});
            this.broadcast({type: "analytics-updated", analyticsAsOf: moment.localDate});
            this.pendingLocalItemId = item.id;
            this.pendingLocalItemDate = moment.localDate;
            this.renderBackgroundUpdate();
            return;
        }
        const revision = getItemRevisionForDate(item, actionDate);
        const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
        const remaining = revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates"
            ? 1
            : Math.max(target - getProgress(this.store, item, actionDate), 0.1);
        await this.recordEvent(item, remaining, moment, expectedRevisionFingerprint);
    }

    private async recordEvent(item: CheckinItem, value: number, moment: ActionMoment, expectedRevisionFingerprint?: string, note?: string, attachment?: string): Promise<CheckinEvent | undefined> {
        const current = getActiveItemById(this.store, item.id);
        const actionDate = calendarDateFromKey(moment.localDate);
        const revision = current ? getItemRevisionForDate(current, actionDate) : undefined;
        if (!current || !revision || !isItemAvailableOnDate(current, actionDate) || revision.kind === "binary" && isComplete(this.store, current, actionDate)) {
            return undefined;
        }
        if (!expectedRevisionFingerprint || this.revisionFingerprint(current, actionDate) !== expectedRevisionFingerprint) {
            showMessage(t("msg.conflictRecord"));
            this.renderBackgroundUpdate();
            return undefined;
        }
        const previous = this.store;
        const event = this.makeEvent(current, value, "manual", revision.unit, note?.trim() || undefined, undefined, moment, attachment);
        const next = appendEvent(this.store, event);
        if (next === this.store) return undefined;
        this.store = next;
        try {
            await this.persist();
        } catch {
            this.store = previous;
            showMessage(t("msg.saveFail"));
            this.renderBackgroundUpdate();
            return undefined;
        }
        this.invalidateSummary();
        this.broadcast({type: "event-recorded", item: current, event});
        this.broadcast({type: "analytics-updated", analyticsAsOf: event.localDate});
        void this.writebackNoteAnchor(current, {state: "done", value, unit: revision.unit});
        if (current.noteAnchor?.appendNotes && event.note) {
            void this.appendNoteToAnchor(current, buildAnchorNoteMarkdown({date: event.localDate, itemName: current.name, stateText: t("anchor.stateDone"), note: event.note}));
        }
        /* 6.0 occasion linkage: completing a generated one-shot item resolves its occasion. */
        if (current.linkedOccasionId && isComplete(this.store, current, actionDate)) {
            void this.setOccasionCompleted(current.linkedOccasionId, moment.localDate, true);
        }
        this.setRecentRecord({
            eventId: event.id,
            itemId: current.id,
            message: `已记录 ${current.name} +${formatNumber(value)} ${revision.unit || "次"}`,
            progress: getProgress(this.store, current, actionDate),
            target: revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target,
            unit: revision.unit || "次",
        });
        this.pendingLocalItemId = current.id;
        this.pendingLocalItemDate = moment.localDate;
        this.renderBackgroundUpdate();
        this.maybeAutoArchiveAfterRecord(current);
        return {...event};
    }

    private setRecentRecord(record: RecentRecord) {
        this.recentRecord = record;
        if (this.recentRecordTimer !== undefined) window.clearTimeout(this.recentRecordTimer);
        this.recentRecordTimer = window.setTimeout(() => {
            this.recentRecord = undefined;
            this.recentRecordTimer = undefined;
            this.syncRecentRecordToast();
        }, 2600);
    }

    private async undoRecentRecord() {
        const recent = this.recentRecord;
        if (!recent) return;
        this.recentRecord = undefined;
        if (this.recentRecordTimer !== undefined) {
            window.clearTimeout(this.recentRecordTimer);
            this.recentRecordTimer = undefined;
        }
        const event = getEventById(this.store, recent.eventId);
        if (!event) {
            this.renderBackgroundUpdate();
            return;
        }
        const moment = captureActionMoment();
        await this.enqueueMutation(async () => {
            const previous = this.store;
            const next = removeEvents(this.store, [event], moment.occurredAt);
            if (next === this.store) return;
            this.store = next;
            try {
                await this.persist();
            } catch {
                this.store = previous;
                showMessage(t("msg.undoFail"));
                return;
            }
            this.invalidateSummary();
            this.broadcast({type: "event-deleted", item: getItemById(this.store, event.itemId), deletedEvents: [event]});
            this.pendingLocalItemId = event.itemId;
            this.pendingLocalItemDate = event.localDate;
            this.renderBackgroundUpdate();
        });
    }

    /* 方法体外置于 render/focus-adapter.ts（T-022）。 */
    private startFocus(itemId: string, adapterId?: string): Promise<boolean> {
        return startFocusFor(this as unknown as FocusAdapterHost, itemId, adapterId);
    }

    private findFocusAdapter(item: CheckinItem, date = new Date(), adapterId?: string): FocusAdapter | undefined {
        return findFocusAdapterFor(this as unknown as FocusAdapterHost, item, date, adapterId);
    }

    private canStartWithAdapter(adapter: FocusAdapter, item: CheckinItem, date: Date): boolean {
        return canStartWithAdapter(this as unknown as FocusAdapterHost, adapter, item, date);
    }

    private stopAdapterSilently(adapter: FocusAdapter): Promise<void> {
        return stopAdapterSilently(adapter);
    }

    private stopFocus(): Promise<boolean> {
        return stopFocusFor(this as unknown as FocusAdapterHost);
    }

    private makeEvent(item: CheckinItem, value: number, source: CheckinEvent["source"], unit: string, note?: string, externalRef?: string, moment = captureActionMoment(), attachment?: string): CheckinEvent {
        return makeEventValue(item, value, source, unit, note, externalRef, moment, attachment);
    }

    private cloneItem(item: CheckinItem): CheckinItem {
        return cloneItemValue(item);
    }

    private itemFingerprint(item: CheckinItem): string {
        return itemFingerprintValue(item);
    }

    private revisionFingerprint(item: CheckinItem, date: Date): string {
        return revisionFingerprintValue(item, date);
    }

    private cloneItemForDate(item: CheckinItem, date: Date): CheckinItem {
        return cloneItemForDateValue(item, date);
    }

    private broadcast(event: CheckinIntegrationEvent) {
        if (this.disposed || this.disposing) return;
        emitIntegrationEvent({
            ...event,
            item: event.item ? this.cloneItem(event.item) : undefined,
            event: event.event ? {...event.event} : undefined,
            deletedEvents: event.deletedEvents?.map((deletedEvent) => ({...deletedEvent})),
        });
    }

    private persist(store: CheckinStore = this.store): Promise<void> {
        if (this.teardownWrites.shouldIntercept()) {
            /* 拆除期排队的写合并为收尾一次补写：每个整文件写入是「读备份-写备份-写主档-回读校验」四次 IO，
               逐个落盘会在宿主拆除预算内排不完，导致末次打卡被截断。 */
            return Promise.resolve();
        }
        if (this.disposed || !this.storageReady) {
            return Promise.reject(new Error("数据存储尚未就绪"));
        }
        const snapshot = this.cloneStore(store);
        this.saveState = "saving";
        this.renderBackgroundUpdate();
        const previous = this.cloneStore(this.lastPersistedStore);
        let persistedSnapshot = snapshot;
        const write = this.saveQueue.catch(() => undefined).then(async () => {
            const history = appendStoreSnapshotHistory(await this.loadData(BACKUP_STORAGE_NAME), createStoreSnapshotEnvelope(previous));
            await this.saveData(BACKUP_STORAGE_NAME, history);
            this.snapshotHistory = readStoreSnapshotHistory(history);
            const verified = await persistNormalizedStoreWithVerification(
                snapshot,
                () => this.loadData(STORAGE_NAME),
                (candidate) => this.saveData(STORAGE_NAME, candidate),
            );
            persistedSnapshot = verified.store;
            this.store = mergeNormalizedStores(this.store, verified.store);
        });
        this.saveQueue = write.catch((error) => {
            this.saveState = "error";
            showMessage(t("msg.saveDataFail", {error: String(error)}));
            this.renderBackgroundUpdate();
        });
        void write.then(() => {
            this.lastPersistedStore = this.cloneStore(persistedSnapshot);
            if (this.saveState === "saving") this.saveState = "idle";
            this.renderBackgroundUpdate();
        }, () => undefined);
        return write;
    }

    /** 与已落盘的建议工作流文本建立基线：非字符串（旧格式/异常内容）时清空基线，保证下一次真的写盘。 */
    private rememberSuggestionWorkflowBaseline(stored: unknown): void {
        this.lastPersistedSuggestionWorkflow = typeof stored === "string" ? stored : undefined;
    }

    /** 建议工作流使用独立版本化存储，不混入主打卡 store。 */
    private persistSuggestionWorkflow(): Promise<void> {
        if (this.disposed || !this.storageReady) return Promise.reject(new Error("数据存储尚未就绪"));
        const payload = this.suggestionWorkflow ? serializeSuggestionWorkflow(this.suggestionWorkflow) : "";
        /* 与已落盘内容等值就跳过：接收方 onDataChanged 只是把远端反序列化回来，
           原样再写一次会多一次整文件写并再触发一轮跨实例推送（T-1246）。 */
        if (payload === this.lastPersistedSuggestionWorkflow) return Promise.resolve();
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(SUGGESTION_WORKFLOW_STORAGE_NAME, payload)).then(() => {
            this.lastPersistedSuggestionWorkflow = payload;
        });
        this.saveQueue = write.catch((error) => {
            if (!this.disposed && !this.disposing) showMessage(t("agent.workflowPersistFail", {error: String(error)}));
        });
        return write;
    }

    private persistOccasions(store: OccasionStore = this.occasionStore): Promise<void> {
        if (this.disposed || !this.storageReady) return Promise.reject(new Error("数据存储尚未就绪"));
        const snapshot: OccasionStore = {version: 1, occasions: store.occasions.map((item) => ({...item, completedDates: [...item.completedDates]}))};
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(OCCASIONS_STORAGE_NAME, snapshot).then(() => undefined));
        this.saveQueue = write.catch((error) => showMessage(t("msg.occasionPersistFail", {error: String(error)})));
        return write;
    }

    /* 6.0 P1 bulk operations: multi-select pending rows, then complete/archive in one pass.
       方法体外置于 render/today-bindings.ts（T-022 可选收尾）。 */
    private bindBulkMode(root: HTMLElement) {
        bindBulkModeFor(this as unknown as TodayBindingsHost, root);
    }

    /* 7.0 P3 CSV import: group rows by name, create missing items (binary when
       every value is 1), append events with source "import"; identical
       item+date+value+unit rows are skipped as duplicates. */
    private importCsvRows(rows: Array<{name: string; date: string; value: number; unit: string; binary: boolean}>): {itemsCreated: number; eventsCreated: number; duplicates: number} {
        const result = importCsvRowsInto(this.store, rows);
        this.store = result.store;
        return {itemsCreated: result.itemsCreated, eventsCreated: result.eventsCreated, duplicates: result.duplicates};
    }

    /* T-1218 Loop 导入：计划落库 + 持久化前自动快照（persist 管线）；导出为两个同构 CSV。 */
    private importLoopPlan(plan: LoopImportPlan): {itemsCreated: number; eventsCreated: number; duplicates: number} {
        const result = importLoopPlanInto(this.store, plan);
        this.store = result.store;
        return {itemsCreated: result.itemsCreated, eventsCreated: result.eventsCreated, duplicates: result.duplicates};
    }

    private downloadLoopExport() {
        downloadLoopExportFor(this.cloneStore());
    }

    /* T-1231 笔记锚点回写：尽力而为的旁路——不阻断、不回滚打卡主路径；
       失败有界重试一次（1.5s），仍失败则挂起该锚点并写入审计。 */
    private kernelPost(url: string, payload: unknown): Promise<{code?: number; msg?: string}> {
        return fetchSyncPost(url, payload);
    }

    private async writebackNoteAnchor(item: CheckinItem, info: {state: "done" | "skip" | "unskip"; value?: number; unit?: string}): Promise<void> {
        const blockId = item.noteAnchor?.blockId;
        if (!blockId || this.disposed || this.disposing || !this.acceptingOperations) return;
        const suspendKey = `${item.id}:${blockId}`;
        if (this.suspendedAnchors.has(suspendKey)) return;
        const now = currentCalendarDate();
        const streak = computeStreaksValue(this.store).get(item.id) || 0;
        const stateText = info.state === "done"
            ? (info.value !== undefined && info.unit ? `${t("anchor.stateDone")} ${formatNumber(info.value)} ${info.unit}` : t("anchor.stateDone"))
            : info.state === "skip" ? t("anchor.stateSkip") : t("anchor.stateUnskip");
        const value = buildAnchorAttrValue(dateKey(now), `${stateText}${streak > 1 ? ` · ${t("anchor.streakSuffix", {n: streak})}` : ""}`);
        /* T-1233 悬挂检测：块已被删除/不可达时重试无意义——直接挂起并审计。 */
        const resolved = await resolveAnchorBlock((url, payload) => this.kernelPost(url, payload), blockId);
        if (!resolved.ok) {
            this.suspendedAnchors.add(suspendKey);
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "anchor", at: new Date().toISOString(), details: {itemId: item.id, blockId, channel: "resolve", reason: resolved.reason || "unknown"}});
            this.scheduleAuditPersist();
            return;
        }
        const result = await withBoundedRetry(
            () => writeAnchorAttr((url, payload) => this.kernelPost(url, payload), blockId, value),
            {attempts: 2, retryDelayMs: 1500, onRetryWait: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))},
        );
        if (!result.ok) {
            this.suspendedAnchors.add(suspendKey);
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "anchor", at: new Date().toISOString(), details: {itemId: item.id, blockId, channel: "write", reason: result.reason || "unknown"}});
            this.scheduleAuditPersist();
        }
    }

    /* 解绑/卸载清理：只清本插件键（空串即移除），尽力而为。 */
    private async clearAnchorAttrBestEffort(blockId: string): Promise<void> {
        try {
            await clearAnchorAttr((url, payload) => this.kernelPost(url, payload), blockId);
        } catch {
            // 清理失败不打扰用户；块可能已被删除。
        }
    }

    /* T-1232 打卡即笔记：备注/跳过原因追加为锚点文档的子块（opt-in，撤销不删除）。 */
    private async appendNoteToAnchor(item: CheckinItem, markdown: string): Promise<void> {
        const anchor = item.noteAnchor;
        if (!anchor?.blockId || !anchor.appendNotes) return;
        if (this.disposed || this.disposing || !this.acceptingOperations) return;
        const result = await appendAnchorNote((url, payload) => this.kernelPost(url, payload), anchor.blockId, markdown);
        if (!result.ok) {
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "anchor", at: new Date().toISOString(), details: {itemId: item.id, blockId: anchor.blockId, channel: "append", reason: result.reason || "unknown"}});
            this.scheduleAuditPersist();
        }
    }

    /* 6.0 P0 drag-sort: pointer drag on the handle reorders within the group;
       drop persists group-local sortOrder 1..N (manual sort mode only).
       方法体外置于 render/today-bindings.ts（T-022 可选收尾）。 */
    private bindItemDrag(root: HTMLElement) {
        bindItemDragFor(this as unknown as TodayBindingsHost, root);
    }

    private async reorderItems(orderedIds: string[]): Promise<boolean> {
        const orderIndex = new Map(orderedIds.map((id, index) => [id, index + 1]));
        const previous = this.store;
        const now = new Date().toISOString();
        let changed = false;
        this.store = {...this.store, items: this.store.items.map((item) => {
            const index = orderIndex.get(item.id);
            if (index === undefined || index === item.sortOrder) return item;
            changed = true;
            return {...item, sortOrder: index, updatedAt: now};
        })};
        if (!changed) return true;
        try {
            await this.persist();
            return true;
        } catch {
            this.store = previous;
            showMessage(t("msg.reorderFail"));
            return false;
        }
    }

    private getPageTitle(): string {
        switch (this.currentPage) {
            case "review": return t("review.title");
            case "occasions": return t("occasions.title");
            case "archived": return t("archived.title");
            case "settings": return t("settings.title");
            case "editor": return this.editingId ? t("editor.edit") : t("editor.create");
            default: return t("today.title");
        }
    }

    /* 6.0 P2 built-in focus timer: countdown panel for duration items; external
       focus adapters (tomato plugins) keep priority via startFocus routing. */
    /* 方法体外置于 render/focus-timer.ts（T-022）。 */
    private openFocusTimer(itemId: string) {
        openFocusTimerFor(this as unknown as FocusTimerHost, itemId);
    }

    private tickFocusTimer() {
        tickFocusTimerFor(this as unknown as FocusTimerHost);
    }

    private paintFocusTimer(panel: HTMLElement, state: {remainingSec: number; totalSec: number; running: boolean}) {
        paintFocusTimer(panel, state);
    }

    private async finishFocusTimer(complete: boolean) {
        await finishFocusTimerFor(this as unknown as FocusTimerHost, complete);
    }

    private renderFocusTimerPanel(): string {
        return renderFocusTimerPanelFor(this as unknown as FocusTimerHost);
    }

    private bindFocusTimerPanel(root: HTMLElement) {
        bindFocusTimerPanelFor(this as unknown as FocusTimerHost, root);
    }

    /* 6.0 P3 occasion → checkin linkage: generate a one-shot binary item that is
       only visible on the occasion's next occurrence date; completing it (or the
       manual "处理" action) resolves the occasion for that date. */
    private async createOccasionLinkedItem(occasionId: string): Promise<boolean> {
        const occasion = this.occasionStore.occasions.find((candidate) => candidate.id === occasionId);
        if (!occasion) return false;
        const today = dateKey(currentCalendarDate());
        const occurrence = getOccurrenceDate(occasion, today) ?? occasion.date;
        if (!isValidLocalDateInput(occurrence)) return false;
        const dayAfter = dateKey(new Date(calendarDateFromKey(occurrence).getFullYear(), calendarDateFromKey(occurrence).getMonth(), calendarDateFromKey(occurrence).getDate() + 1));
        const now = new Date().toISOString();
        const created = normalizeCheckinItem({
            id: makeId("item"),
            name: occasion.name,
            icon: occasion.kind === "birthday" ? "🎂" : occasion.kind === "anniversary" ? "💍" : "◷",
            kind: "binary",
            target: 1,
            unit: "次",
            schedule: {type: "daily"},
            createdDate: today,
            createdAt: now,
            updatedAt: now,
            archivePeriods: [{startDate: "0000-01-01", endDate: occurrence}, {startDate: dayAfter}],
            linkedOccasionId: occasion.id,
        });
        if (!created) { showMessage(t("msg.createFail")); return false; }
        if (this.store.items.some((candidate) => candidate.linkedOccasionId === occasion.id && !candidate.archived)) {
            showMessage(t("msg.alreadyGenerated"));
            return false;
        }
        const previous = this.store;
        this.store = {...this.store, items: [...this.store.items, created]};
        try {
            await this.persist();
        } catch {
            this.store = previous;
            showMessage(t("msg.createCheckinFail"));
            return false;
        }
        showMessage(t("msg.checkinCreated", {name: occasion.name}));
        return true;
    }

    private async saveOccasionForm(data: FormData) {
        const name = String(data.get("name") || "").trim();
        const date = String(data.get("date") || "");
        const kindValue = String(data.get("kind") || "scheduled");
        const recurrenceValue = String(data.get("recurrence") || "annual");
        const kind: OccasionKind = kindValue === "birthday" || kindValue === "anniversary" ? kindValue : "scheduled";
        const recurrence: OccasionRecurrence = ["once", "annual", "monthly", "weekly", "quarterly", "halfyearly", "interval"].includes(recurrenceValue) ? recurrenceValue as OccasionRecurrence : "annual";
        const remindBeforeDays = Math.max(0, Math.min(365, Math.round(Number(data.get("remindBeforeDays")) || 0)));
        const existing = this.editingOccasionId ? this.occasionStore.occasions.find((item) => item.id === this.editingOccasionId) : undefined;
        const lunar = solarToLunar(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
        const normalized = normalizeOccasion({
            id: existing?.id, name, kind, date, recurrence,
            calendar: recurrence === "annual" ? String(data.get("calendar") || "solar") : "solar",
            lunarLeap: recurrence === "annual" && String(data.get("calendar")) === "lunar" ? lunar?.leap === true : false,
            annualSubtype: String(data.get("annualSubtype") || "byday"),
            month: Number(data.get("annualMonth")) || undefined,
            nthWeek: Number(data.get("annualNth")) || Number(data.get("monthlyNth")) || undefined,
            weekday: data.has("annualWeekday") ? Number(data.get("annualWeekday")) : data.has("weeklyWeekday") ? Number(data.get("weeklyWeekday")) : undefined,
            monthlySubtype: String(data.get("monthlySubtype") || "byday"),
            intervalUnit: String(data.get("intervalUnit") || "month"),
            intervalCount: Number(data.get("intervalCount")) || undefined,
            remindBeforeDays, note: String(data.get("note") || ""),
            enabled: existing?.enabled !== false, completedDates: existing?.completedDates || [], createdAt: existing?.createdAt, updatedAt: new Date().toISOString(),
        });
        if (!normalized) { showMessage(t("msg.occasionInvalid")); return; }
        const previous = this.occasionStore;
        this.occasionStore = upsertOccasion(previous, normalized);
        try { await this.persistOccasions(); } catch { this.occasionStore = previous; showMessage(t("msg.occasionSaveFail")); return; }
        this.editingOccasionId = undefined;
        this.render();
    }

    private async updateOccasion(item: Occasion) {
        const normalized = normalizeOccasion(item);
        if (!normalized) return;
        const previous = this.occasionStore;
        this.occasionStore = {...previous, occasions: previous.occasions.map((candidate) => candidate.id === normalized.id ? normalized : candidate)};
        try { await this.persistOccasions(); } catch { this.occasionStore = previous; showMessage(t("msg.occasionUpdateFail")); return; }
        this.renderBackgroundUpdate();
    }

    /* 11.0-C 延期/跳过/恢复：动作落独立存储（与打卡、事项数据隔离），低干扰提示后重渲染。 */
    reminderUserAction(id: string, action: "snooze" | "skip" | "restore"): void {
        if (!id) return;
        this.reminderUserActions = action === "restore"
            ? clearReminderUserActions(this.reminderUserActions, id)
            : normalizeReminderUserActions([...this.reminderUserActions, {id, action, at: new Date().toISOString()}]);
        void this.saveData(REMINDER_ACTIONS_NAME, serializeReminderUserActions(this.reminderUserActions)).catch(() => showMessage(t("msg.saveFailedShort")));
        const name = projectReminderCenter(this.store, this.occasionStore, new Date(), this.reminderUserActions).find((entry) => entry.id === id)?.title;
        if (name) showMessage(t("review.reminderActionToast", {name}), 2200);
        this.render();
    }

    private async setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean> {
        const previous = this.occasionStore;
        const next = markOccasionCompleted(previous, id, occurrenceDate, completed);
        if (next === previous) return true;
        this.occasionStore = next;
        try { await this.persistOccasions(); } catch { this.occasionStore = previous; showMessage(t("msg.occasionToggleFail")); return false; }
        this.renderBackgroundUpdate();
        return true;
    }

    private async retrySave() {
        if (this.saveState !== "error" || this.disposed || !this.storageReady) return;
        try {
            await this.persist(this.store);
        } catch {
            // persist updates the visible error state and toast.
        }
    }

    private focusTodaySearch(selection?: number) {
        focusTodaySearchFor(this as unknown as PluginOpsHost, selection);
    }

    private applyViewPreferences(preferences: CheckinViewPreferences) {
        this.todayGroupMode = preferences.groupMode;
        this.todaySortMode = preferences.sortMode;
        this.completedCollapsed = preferences.completedCollapsed;
        this.appearance = preferences.appearance;
        this.dialogSizeMode = preferences.dialogSizeMode;
        this.dialogScale = preferences.dialogScale;
        this.palette = preferences.palette;
        this.dialogFixedSize = {...preferences.dialogFixedSize};
        this.reducedMotion = preferences.reducedMotion;
        this.hapticFeedback = preferences.hapticFeedback;
        this.focusTimerProvider = preferences.focusTimerProvider;
        this.todayQuery = preferences.todayQuery;
        this.pendingOnly = preferences.pendingOnly;
        this.collapsedTodayGroups = new Set(preferences.collapsedGroups);
        this.reviewFoldSections = new Set(preferences.reviewFold);
        this.reviewFoldTouched = preferences.reviewFoldTouched;
        this.insightsItemId = preferences.lastInsightsItemId;
        this.weekStripVisible = preferences.showWeekStrip;
        this.lastExportAt = preferences.lastExportAt;
        this.reportSections = {...preferences.reportSections};
    }

    /* 手机端打卡成功的短振动（仅移动前端 + 用户未关闭；无振动能力的环境静默跳过）。 */
    pulseHaptic(): void {
        if (!this.isMobileFrontend || !this.hapticFeedback) return;
        if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
        try { navigator.vibrate(10); } catch { /* 个别 WebView 限制非手势振动，忽略 */ }
    }

    private persistViewPreferences(): Promise<void> {
        if (this.disposed || !this.storageReady) return Promise.resolve();
        const preferences: CheckinViewPreferences = {
            groupMode: this.todayGroupMode,
            sortMode: this.todaySortMode,
            completedCollapsed: this.completedCollapsed,
            collapsedGroups: [...this.collapsedTodayGroups].slice(0, 200),
            reviewFold: [...this.reviewFoldSections],
            reviewFoldTouched: this.reviewFoldTouched,
            lastInsightsItemId: this.insightsItemId,
            appearance: this.appearance,
            reducedMotion: this.reducedMotion,
            hapticFeedback: this.hapticFeedback,
            focusTimerProvider: this.focusTimerProvider,
            todayQuery: this.todayQuery,
            pendingOnly: this.pendingOnly,
            showWeekStrip: this.weekStripVisible,
            lastExportAt: this.lastExportAt,
            dialogSizeMode: this.dialogSizeMode,
            dialogScale: this.dialogScale,
            palette: this.palette,
            dialogFixedSize: {...this.dialogFixedSize},
            dialogRect: this.dialogRect ? {...this.dialogRect} : undefined,
            dialogOffset: this.dialogOffset ? {...this.dialogOffset} : undefined,
            reportSections: {...this.reportSections},
        };
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(VIEW_PREFERENCES_NAME, preferences).then(() => undefined));
        this.saveQueue = write.catch((error) => {
            showMessage(t("msg.prefPersistFail", {error: String(error)}));
        });
        return write;
    }

    private async persistAuditBestEffort(): Promise<void> {
        if (this.auditFlushTimer !== undefined) {
            // 立即写覆盖排队中的合并写，避免同一内容写两次。
            window.clearTimeout(this.auditFlushTimer);
            this.auditFlushTimer = undefined;
        }
        try {
            await this.saveData(AUDIT_STORAGE_NAME, this.auditEntries);
        } catch {
            // Audit diagnostics must never interrupt or roll back the user operation they describe.
        }
    }

    /** 旁路诊断的合并写入：一个合并窗口内的多次审计追加只落一次盘（T-1246）。 */
    private scheduleAuditPersist(): void {
        if (this.disposed || this.disposing) { void this.persistAuditBestEffort(); return; }
        if (this.auditFlushTimer !== undefined) return;
        this.auditFlushTimer = window.setTimeout(() => {
            this.auditFlushTimer = undefined;
            void this.persistAuditBestEffort();
        }, AUDIT_COALESCE_MS);
    }

    /** 拆除前把挂起的审计写落盘，纳入 onunload 的等待集合；未排空时不重试，交给下一次变更。 */
    private flushPendingAuditPersist(): Promise<void> {
        if (this.auditFlushTimer === undefined) return Promise.resolve();
        window.clearTimeout(this.auditFlushTimer);
        this.auditFlushTimer = undefined;
        return this.persistAuditBestEffort();
    }

    private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
        if (!this.acceptingOperations) return Promise.resolve(undefined as T);
        const execute = () => this.withStorageLock(async () => {
            let refreshed = false;
            if (this.initializationState === "ready" && this.storageReady) {
                try {
                    const stored = await this.loadData(STORAGE_NAME);
                    const reconciliation = reconcileNormalizedStoreSnapshots(this.lastPersistedStore, this.store, normalizeStore(stored));
                    const {remote, merged: latest, conflict} = reconciliation;
                    if (conflict.conflicted) {
                        this.auditEntries = appendStoreAudit(this.auditEntries, {type: "conflict", at: new Date().toISOString(), details: {items: conflict.changedItemIds.length, events: conflict.changedEventIds.length}});
                        this.scheduleAuditPersist();
                    }
                    refreshed = reconciliation.localChanged;
                    this.store = latest;
                    if (refreshed || conflict.conflicted) this.showSyncNotice();
                    if (reconciliation.remoteNeedsWrite) {
                        await this.persist();
                    }
                    const remoteOccasions = normalizeOccasionStore(await this.loadData(OCCASIONS_STORAGE_NAME));
                    if (JSON.stringify(remoteOccasions) !== JSON.stringify(this.occasionStore)) {
                        this.occasionStore = remoteOccasions;
                    }
                } catch (error) {
                    if (!this.disposing) showMessage(t("msg.refreshFail", {error: String(error)}));
                    return undefined as T;
                }
            }
            try {
                return await operation();
            } finally {
                if (refreshed && !this.disposed && !this.disposing) {
                    this.invalidateSummary();
                    this.renderBackgroundUpdate();
                }
            }
        });
        const run = this.mutationQueue.then(execute, execute);
        this.mutationQueue = run.then(() => undefined, () => undefined);
        return run;
    }

    private reconcileStore(): Promise<void> {
        if (!this.acceptingOperations || this.initializationState !== "ready" || !this.storageReady) return Promise.resolve();
        return this.enqueueMutation(async () => undefined);
    }

    private withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
        const locks = typeof navigator === "undefined" ? undefined : (navigator as Navigator & {locks?: LockManagerLike}).locks;
        if (locks) return locks.request<T>(STORAGE_LOCK_NAME, {mode: "exclusive"}, operation);
        const run = fallbackStorageQueue.then(operation, operation);
        fallbackStorageQueue = run.then(() => undefined, () => undefined);
        return run;
    }

    /**
     * 拆除收尾补写：把门禁期内攒下的内存变更一次性写入主存储。
     * 不生成快照历史（省掉读备份+写备份两次 IO），快照由下一次正常写入补齐。
     * 锁被其它窗口占用时用 ifAvailable 避免排到队尾再被强制销毁，退化为普通排队。
     */
    private async teardownFinalFlush(): Promise<void> {
        if (!this.storageReady) return;
        const snapshot = normalizeStore(this.store);
        const locks = typeof navigator === "undefined" ? undefined : (navigator as Navigator & {locks?: LockManagerLike}).locks;
        const write = () => this.saveData(STORAGE_NAME, snapshot).then(() => undefined);
        if (!locks) { await write(); return; }
        const flushedMark = "teardown-flushed" as const;
        const acquired = await locks.request<typeof flushedMark>(STORAGE_LOCK_NAME, {mode: "exclusive", ifAvailable: true}, () => write().then(() => flushedMark));
        if (acquired === undefined) await this.withStorageLock(write);
    }

    private showSyncNotice() {
        showSyncNoticeFor(this as unknown as PluginOpsHost);
    }

    private settleReady(ready: boolean) {
        settleReadyFor(this as unknown as PluginOpsHost, ready);
    }

    private invalidateSummary() {
        invalidateSummaryFor(this as unknown as PluginOpsHost);
    }

    private refreshDateBoundary() {
        if (this.disposed || this.disposing) return;
        const now = new Date();
        const nextDateKey = dateKey(now);
        if (nextDateKey !== this.currentDateKey) {
            const [previousYear, previousMonth] = this.currentDateKey.split("-").map(Number);
            const historyWasCurrent = this.historyMonth.getFullYear() === previousYear && this.historyMonth.getMonth() === previousMonth - 1;
            this.currentDateKey = nextDateKey;
            if (historyWasCurrent) {
                this.historyMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                this.selectedHistoryDate = nextDateKey;
            }
            this.summaryText = undefined;
            this.suggestionWorkflow = undefined;
            this.summaryRefreshing = false;
            this.summaryRequestId += 1;
            this.renderBackgroundUpdate();
        }
        this.scheduleMidnightRefresh();
    }

    private scheduleMidnightRefresh() {
        if (this.disposed || this.disposing) return;
        if (this.midnightTimer !== undefined) {
            window.clearTimeout(this.midnightTimer);
        }
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        this.midnightTimer = window.setTimeout(() => this.refreshDateBoundary(), Math.max(1, nextMidnight.getTime() - now.getTime()));
    }
}

type CheckinQuickActionTarget = "desktop" | "sidebar" | "mobile";

interface SpeedSwitchPluginLike {
    name?: string;
    registerQuickAction: (options: {
        id: string;
        label: string;
        icon?: string;
        value?: string;
        targets?: CheckinQuickActionTarget[];
        handler: (value: string) => void | Promise<void>;
    }) => (() => void) | void;
}

interface CheckinQuickActionOptions {
    id: string;
    label: string;
    icon?: string;
    value?: string;
    targets?: CheckinQuickActionTarget[];
    handler: (value: string) => void | Promise<void>;
}
