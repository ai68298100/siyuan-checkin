import {Dialog, getFrontend, Plugin, showMessage} from "siyuan";
import "./index.scss";
import "./ui/tokens.scss";
import "./ui/components.scss";
import {getEventsInCustomRange, buildCustomSummaryContext, buildSummaryContext} from "./analytics";
import {formatLunar, solarToLunar} from "./lunar";
import {getPluginLocale, t} from "./i18n";
import {uiIcon, type UiIconName} from "./ui/icons";
import {PRIORITY_LABELS, TIME_SLOT_LABELS, SORT_LABELS, SCHEDULE_LABELS, KIND_LABELS} from "./ui/labels";
import {escapeHtml, normalizeCustomIconLibrary, withTimeout, renderIconMarkup, formatNumber, captureActionMoment, nextItemUpdatedAt, currentCalendarDate, calendarDateFromKey, isValidLocalDateInput, storeNeedsMigration, type ActionMoment} from "./shared";
import {assessJsonMigration, buildJsonMigrationReport, parseCheckinCsv, summarizeJsonBackup, validateJsonMigrationReport} from "./export";
import {buildHabitInsights} from "./features/insights";
import {buildCoachingSuggestions} from "./features/coaching";
import {CHECKIN_API_NAME, emitIntegrationEvent} from "./integrations";
import {appendEvent, appendStoreAudit, createDefaultStore, dateKey, detectStoreConflict, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday, makeId, mergeStores, normalizeItem as normalizeCheckinItem, normalizeStore, normalizeStoreAudit, removeEvents} from "./model";
import type {FocusAdapter, SummaryProvider} from "./integrations";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinKind, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot, CompletionSource, ScheduleType, TomatoValueMode, UserTemplate} from "./types";
import type {CustomSummaryRange, SummaryRange} from "./analytics";
import type {HistorySortOrder, HistorySourceFilter} from "./features/history-filter";
import {DEFAULT_VIEW_PREFERENCES, normalizeViewPreferences, type CheckinPalette, type CheckinViewPreferences, type DialogSizeMode} from "./view-preferences";
import {renderCheckinLogView, renderItemView, renderOccasionBannerView, renderSaveStatusView, renderSyncNoticeView, renderTodayView, renderUpcomingOccasionsView} from "./render/fragments";
import {bindTodayHandlers, type BindTodayHost} from "./render/bind-today";
import {bindOccasionsHandlers, type BindOccasionsHost} from "./render/bind-occasions";
import {bindEditorHandlers, type BindEditorHost} from "./render/bind-editor";
import {bindPageNavigationHandlers, type BindPageNavigationHost} from "./render/bind-page-navigation";
import {saveEditorForm, type SaveFormHost} from "./render/save-form";
import {cloneItemForDateValue, cloneItemValue, cloneStoreValue, computeStreaksValue, getSummaryEventsValue, itemFingerprintValue, makeEventValue, revisionFingerprintValue} from "./model-helpers";
import {bindDialogCloseFor, bindMobileNavFor, changeHistoryMonthFor, downloadExportFor, downloadStoreAuditFor, focusTodaySearchFor, getQuickTodayItems, importCsvRowsInto, invalidateSummaryFor, renderBackgroundUpdateFor, restoreItemFor, settleReadyFor, showSyncNoticeFor, type PluginOpsHost} from "./plugin-ops";
import {openTabPageFor, showArchivedFor, showEditorFor, showInsightsFor, showOccasionsFor, showReviewFor, showSettingsFor, showTodayFor, type NavigationHost} from "./navigation";
import {bindQuickDialogViewportFor, closeQuickDialogFor, ensureMobileTopBarButtonFor, ensureSpeedSwitchQuickActionsFor, handleQuickDialogDestroyedFor, openQuickDialogFor, quickDialogSizeOf, toggleQuickDialogFor, type QuickDialogHost} from "./render/quick-dialog";
import {bindBulkModeFor, bindItemDragFor, bindQuickKeyboardFor, type TodayBindingsHost} from "./render/today-bindings";
import {bindFocusTimerPanelFor, finishFocusTimerFor, openFocusTimerFor, paintFocusTimer, renderFocusTimerPanelFor, tickFocusTimerFor, type FocusTimerHost} from "./render/focus-timer";
import {canStartWithAdapter, findFocusAdapterFor, startFocusFor, stopAdapterSilently, stopFocusFor, type FocusAdapterHost} from "./render/focus-adapter";
import {renderReviewView} from "./render/review";
import {renderOccasionsView} from "./render/occasions";
import {renderSettingsView} from "./render/settings";
import {renderEditorView} from "./render/editor";
import {validateEditorInput} from "./editor-validation";
import {registerAgentCapabilities} from "./agent-capabilities";
import {normalizeUserTemplate, upsertUserTemplate, deleteUserTemplate} from "./features/templates";
import type {CheckinAppearance, TodayGroupMode} from "./view-preferences";
import {applyOccasionTemplate, createDefaultOccasionStore, deleteOccasion, describeRecurrence, getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, markOccasionCompleted, normalizeOccasion, normalizeOccasionStore, OCCASIONS_STORAGE_NAME, OCCASION_TEMPLATES, occasionTemplateName, upsertOccasion, weekdayName, type MonthlySubtype} from "./occasions";
import type {Occasion, OccasionKind, OccasionRecurrence, OccasionStore, VisibleOccasion} from "./occasions";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_CAPABILITIES, getCheckinApiDescriptor, getCheckinCapabilityInfo, hasCheckinCapability} from "./api-contract";
import type {CheckinApiDescriptor, CheckinCapability, CheckinCapabilityInfo} from "./api-contract";
import {createCheckinApi, type CheckinApiHost} from "./api";

const STORAGE_NAME = "checkin-store";
const BACKUP_STORAGE_NAME = "checkin-store-backup";
const AUDIT_STORAGE_NAME = "checkin-store-audit";
const VIEW_PREFERENCES_NAME = "checkin-view-preferences";
const USER_TEMPLATES_NAME = "checkin-user-templates";
const CUSTOM_ICON_LIBRARY_NAME = "checkin-custom-icon-library";
type OccasionImport = import("./occasions").Occasion;
const STORAGE_LOCK_NAME = "siyuan-checkin-store-write";
const DOCK_TYPE = "siyuan-checkin-dock";
const TAB_TYPE = "checkin";
const QUICK_DIALOG_HOTKEY = "⌥⇧C";
const SUMMARY_TIMEOUT_MS = 30000;
let fallbackStorageQueue: Promise<void> = Promise.resolve();

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
}

export default class CheckinPlugin extends Plugin {
    private store: CheckinStore = createDefaultStore();
    private lastPersistedStore: CheckinStore = createDefaultStore();
    private auditEntries: Array<{type: "conflict" | "merge" | "restore" | "migration"; at: string; details: Record<string, unknown>}> = [];
    private occasionStore: OccasionStore = createDefaultOccasionStore();
    private userTemplates: UserTemplate[] = [];
    private customIconLibrary: string[] = [];
    private dockElement?: HTMLElement;
    private tabElement?: HTMLElement;
    private quickDialog?: Dialog;
    private quickDialogElement?: HTMLElement;
    private quickDialogViewportCleanup?: () => void;
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
    private reducedMotion = DEFAULT_VIEW_PREFERENCES.reducedMotion;
    private collapsedTodayGroups = new Set<string>();
    /* T-011 回顾页展开的折叠区块（trend/log/upcoming/achievements），空集 = 全部折叠。 */
    private reviewFoldSections = new Set<string>();
    private reviewFoldTouched = false;
    private weekStripVisible = DEFAULT_VIEW_PREFERENCES.showWeekStrip;
    private hostThemeObserver?: MutationObserver;
    private focusTimerState?: {itemId: string; totalSec: number; remainingSec: number; running: boolean};
    private focusTimerInterval?: number;
    private focusTimerRoot?: HTMLElement;
    private focusTimerMinutes = 25;
    private heatmapYearOffset = 0;
    private renderRafId = 0;
    private bulkMode = false;
    private bulkSelected = new Set<string>();
    private occasionSearchQuery = "";
    private occasionTemplatesOpen = false;
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
    private api?: CheckinApi;
    private focusAdapters = new Map<string, FocusAdapter>();
    private summaryProviders = new Map<string, SummaryProvider>();
    private summaryRange: SummaryRange = "week";
    private summaryCustomRange?: {startDate: string; endDate: string};
    private summaryText?: string;
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
    private agentCapabilityRegistered = false;
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
        this.addIcons(`<symbol id="iconLvCheckin" viewBox="0 0 32 32">
            <path d="M16 2.5 19.9 6l5.2-.3.8 5.1 4.1 3.2-2.6 4.5.9 5.1-5 1.4-2.8 4.3-4.8-2.1-4.8 2.1-2.8-4.3-5-1.4.9-5.1-2.6-4.5 4.1-3.2.8-5.1L12.1 6 16 2.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="m10 16 3.7 3.7L22.5 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </symbol>`);

        this.addDock({
            id: DOCK_TYPE,
            config: {
                position: "LeftBottom",
                size: {width: 380, height: 0},
                icon: "iconLvCheckin",
                title: "小驴打卡",
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
            langText: "打开小驴打卡快速窗口",
            hotkey: QUICK_DIALOG_HOTKEY,
            callback: () => this.toggleQuickDialog(),
            globalCallback: () => this.toggleQuickDialog(),
        });
        if (this.supportsCustomTab) this.addCommand({
            langKey: "openCheckinTab",
            langText: "在页签打开小驴打卡",
            callback: () => this.openTabPage(),
            globalCallback: () => this.openTabPage(),
        });

        this.api = this.createApi();
        (window as Window & {siyuanCheckin?: CheckinApi})[CHECKIN_API_NAME] = this.api;
        window.addEventListener("focus", this.handleWindowFocus);
        if (this.isMobileFrontend) this.ensureMobileTopBarButton();
    }

    async onLayoutReady() {
        this.addTopBar({
            id: "openCheckinDialog",
            icon: "iconLvCheckin",
            position: "right",
            title: "打开小驴打卡（Alt+Shift+C）",
            callback: () => this.toggleQuickDialog(),
        });
        try {
            await this.withStorageLock(async () => {
                const stored = await this.loadData(STORAGE_NAME);
                const preferences = normalizeViewPreferences(await this.loadData(VIEW_PREFERENCES_NAME));
                const occasions = normalizeOccasionStore(await this.loadData(OCCASIONS_STORAGE_NAME));
                const storedTemplates = await this.loadData(USER_TEMPLATES_NAME);
                const storedIconLibrary = await this.loadData(CUSTOM_ICON_LIBRARY_NAME);
                if (this.disposed || this.disposing) return;
                this.store = normalizeStore(stored);
                this.lastPersistedStore = this.cloneStore(this.store);
                const audit = await this.loadData(AUDIT_STORAGE_NAME);
                this.auditEntries = normalizeStoreAudit(audit);
                this.occasionStore = occasions;
                this.userTemplates = Array.isArray(storedTemplates) ? storedTemplates.map((item) => normalizeUserTemplate(item)).filter((item): item is UserTemplate => Boolean(item)) : [];
                this.customIconLibrary = normalizeCustomIconLibrary(storedIconLibrary);
                this.applyViewPreferences(preferences);
                this.storageReady = true;
                if (storeNeedsMigration(stored, this.store)) {
                    await this.persist();
                }
            });
            if (this.disposed || this.disposing) return;
            this.initializationState = "ready";
            this.settleReady(true);
            this.registerSiYuanAgentCapability();
            if (this.isMobileFrontend) this.ensureMobileTopBarButton();
            this.ensureSpeedSwitchQuickActions();
        } catch (error) {
            if (this.disposed || this.disposing) return;
            this.storageReady = false;
            this.initializationState = "failed";
            this.settleReady(false);
            showMessage(t("msg.dataLoadFail", {error: String(error)}));
        }
        if (this.disposed || this.disposing) return;
        this.render();
        this.scheduleMidnightRefresh();
    }

    async onDataChanged() {
        await this.reconcileStore();
        if (!this.acceptingOperations || this.initializationState !== "ready" || !this.storageReady) return;
        try {
            const preferences = normalizeViewPreferences(await this.loadData(VIEW_PREFERENCES_NAME));
            this.occasionStore = normalizeOccasionStore(await this.loadData(OCCASIONS_STORAGE_NAME));
            const storedTemplates = await this.loadData(USER_TEMPLATES_NAME);
            const storedIconLibrary = await this.loadData(CUSTOM_ICON_LIBRARY_NAME);
            this.userTemplates = Array.isArray(storedTemplates) ? storedTemplates.map((item) => normalizeUserTemplate(item)).filter((item): item is UserTemplate => Boolean(item)) : [];
            this.customIconLibrary = normalizeCustomIconLibrary(storedIconLibrary);
            this.applyViewPreferences(preferences);
            this.renderBackgroundUpdate();
        } catch (error) {
            if (!this.disposing) showMessage(t("msg.prefRefreshFail", {error: String(error)}));
        }
    }

    async onunload() {
        this.acceptingOperations = false;
        this.disposing = true;
        this.settleReady(false);
        this.stopHostThemeWatcher();
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
            await openTabRequest.catch(() => undefined);
        }
        this.tabInstance?.close();
        this.tabInstance = undefined;
        this.tabElement = undefined;
        if (this.midnightTimer !== undefined) {
            window.clearTimeout(this.midnightTimer);
            this.midnightTimer = undefined;
        }
        this.summaryRequestId += 1;
        [...this.apiSubscriptions].forEach((dispose) => dispose());
        const host = window as Window & {siyuanCheckin?: CheckinApi};
        if (host.siyuanCheckin === this.api) {
            delete host.siyuanCheckin;
        }
        await this.mutationQueue.catch(() => undefined);
        await this.saveQueue.catch(() => undefined);
        await this.focusOperation.catch(() => undefined);
        const activeFocusAdapter = this.activeFocusAdapter;
        this.activeFocusAdapter = undefined;
        if (activeFocusAdapter) {
            await this.stopAdapterSilently(activeFocusAdapter);
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
        const item = this.store.items.find((candidate) => candidate.id === input.itemId && !candidate.archived);
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
        this.renderBackgroundUpdate();
        return {...event};
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
       the host window (default 80%), fullscreen, or a fixed pixel size. */
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
        if (this.agentCapabilityRegistered || this.disposed || this.disposing || !this.api) return;
        const plugin = this as unknown as Plugin & {
            addAgentCapability?: (options: Parameters<typeof registerAgentCapabilities>[0]["addCapability"]) => string;
        };
        if (typeof plugin.addAgentCapability !== "function") return;
        try {
            registerAgentCapabilities({
                addCapability: (options) => { plugin.addAgentCapability?.(options); },
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
            this.agentCapabilityRegistered = true;
        } catch (error) {
            showMessage(t("msg.agentRegisterFail", {error: String(error)}));
        }
    }

    private getTabId(): string {
        return `${this.name || "siyuan-checkin"}${TAB_TYPE}`;
    }

    private renderBackgroundUpdate() {
        renderBackgroundUpdateFor(this as unknown as PluginOpsHost);
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
        roots.forEach((root) => this.renderInto(root));
    }

    private renderInto(root: HTMLElement) {
        if (this.initializationState !== "ready") {
            const message = this.initializationState === "failed" ? "打卡数据读取失败" : "正在加载打卡数据…";
            root.innerHTML = `<div class="lc-checkin"><div class="lc-checkin__empty"><div class="lc-checkin__empty-title">${message}</div></div></div>`;
            return;
        }
        root.innerHTML = this.currentPage === "editor" ? this.renderEditor()
            : this.currentPage === "review" ? this.renderReview()
                : this.currentPage === "insights" ? this.renderInsights()
            : this.currentPage === "archived" ? this.renderArchived()
                    : this.currentPage === "occasions" ? this.renderOccasions()
                    : this.currentPage === "settings" ? this.renderSettings() : this.renderToday();
        this.normalizeUiIcons(root);
        const surface = root.querySelector<HTMLElement>(".lc-checkin");
        if (surface) {
            surface.dataset.appearance = this.resolvedAppearance();
            surface.dataset.palette = this.palette;
            surface.dataset.reducedMotion = String(this.reducedMotion);
            /* container queries cannot style their own container, so all page
               content lives in one layout wrapper inside the container. */
            const layout = document.createElement("div");
            layout.className = "lc-checkin__layout";
            while (surface.firstChild) layout.appendChild(surface.firstChild);
            surface.appendChild(layout);
        }
        root.insertAdjacentHTML("afterbegin", `<button class="lc-checkin__dialog-close" type="button" data-action="close-dialog" aria-label="关闭快速窗口" title="关闭快速窗口">${uiIcon("close")}</button>`);
        if (this.quickDialog && this.quickDialogElement === root && !this.isMobileFrontend) {
            const button = document.createElement("button");
            button.className = "lc-checkin__dialog-fullscreen";
            button.type = "button";
            button.dataset.action = "toggle-fullscreen";
            button.setAttribute("aria-label", this.quickDialogFullscreen ? "退出全屏" : "全屏显示");
            button.title = this.quickDialogFullscreen ? "退出全屏" : "全屏显示";
            button.innerHTML = uiIcon("expand");
            root.prepend(button);
        }
        if (this.isMobileFrontend && !root.querySelector(".lc-checkin__mobile-topbar")) {
            const progressLabel = this.currentPage === "today" ? this.todayProgressLabel() : "";
            root.insertAdjacentHTML("afterbegin",
                `<div class="lc-checkin__mobile-topbar"><button class="lc-checkin__topbar-close" type="button" data-action="close-dialog" aria-label="关闭">✕</button><strong class="lc-checkin__topbar-title">${this.getPageTitle()}</strong>${progressLabel ? `<span class="lc-checkin__topbar-meta" role="status" aria-label="今日完成进度">${progressLabel}</span>` : ""}</div>`);
        }
        const layout = root.querySelector<HTMLElement>(".lc-checkin__layout");
        if (layout) {
            /* 顶部导航（桌面宽容器显示，替代左侧 rail，把整行宽度让给内容）；
               窄容器（手机弹窗/侧边栏）由 CSS 隐藏，改用底部导航。 */
            layout.insertAdjacentHTML("afterbegin", this.renderTopNav());
            if (this.focusTimerState && this.focusTimerRoot === root) layout.insertAdjacentHTML("beforeend", this.renderFocusTimerPanel());
        }
        /* 底部导航在所有表面都渲染（含桌面侧边栏面板）：宽容器由 CSS 隐藏、
           窄容器（手机弹窗 / 侧边栏 dock）显示 —— 侧边栏此前完全没有导航入口。 */
        if (!root.querySelector(".lc-checkin__mobile-nav")) {
            root.insertAdjacentHTML("beforeend", this.renderMobileNav());
        }
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
    }

    private normalizeUiIcons(root: HTMLElement) {
        root.querySelectorAll<HTMLElement>(".lc-checkin__back-button").forEach((button) => { button.innerHTML = uiIcon("back"); });
        root.querySelector<HTMLElement>("[data-history-month='-1']")?.replaceChildren(this.iconNode("back"));
        root.querySelector<HTMLElement>("[data-history-month='1']")?.replaceChildren(this.iconNode("forward"));
        root.querySelectorAll<HTMLElement>(".lc-checkin__search-symbol, .lc-checkin__today-search > span").forEach((node) => { node.innerHTML = uiIcon("search"); });
        root.querySelectorAll<HTMLElement>("[data-action='clear-search'], [data-action='clear-history-query'], [data-action='clear-template-query'], [data-action='clear-icon-query']").forEach((button) => { button.innerHTML = uiIcon("close"); });
        root.querySelectorAll<HTMLElement>("[data-action='insights']").forEach((button) => { button.innerHTML = uiIcon("insight"); });
        root.querySelectorAll<HTMLElement>("[data-action='edit'], [data-occasion-edit]").forEach((button) => { button.innerHTML = uiIcon("edit"); });
        root.querySelectorAll<HTMLElement>("[data-action='focus']").forEach((button) => { button.innerHTML = uiIcon("timer"); });
        root.querySelectorAll<HTMLElement>("[data-action='toggle-exact']").forEach((button) => { button.innerHTML = uiIcon("more"); });
        root.querySelectorAll<HTMLElement>("[data-occasion-delete]").forEach((button) => { button.innerHTML = uiIcon("trash"); });
        root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => { button.innerHTML = button.textContent?.includes("✓") ? uiIcon("check") : uiIcon("circle"); });
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
            customIconLibrary: this.customIconLibrary,
            agentCapabilityRegistered: this.agentCapabilityRegistered,
            appearance: this.appearance,
            reducedMotion: this.reducedMotion,
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
        const savePreference = () => { void this.persistViewPreferences().then(() => showMessage(t("msg.prefSaved"))).catch(() => showMessage(t("msg.prefSaveFail"))); };
        root.querySelector<HTMLSelectElement>("[data-setting-group]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (value === "none" || value === "group" || value === "time" || value === "priority") { this.todayGroupMode = value; void this.persistViewPreferences(); } });
        root.querySelector<HTMLSelectElement>("[data-setting-sort]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (SORT_LABELS[value as CheckinItemSortMode]) { this.todaySortMode = value as CheckinItemSortMode; void this.persistViewPreferences(); } });
        root.querySelector<HTMLInputElement>("[data-setting-completed]")?.addEventListener("change", (event) => { this.completedCollapsed = !(event.currentTarget as HTMLInputElement).checked; void this.persistViewPreferences(); });
        root.querySelector<HTMLInputElement>("[data-setting-weekstrip]")?.addEventListener("change", (event) => { this.weekStripVisible = (event.currentTarget as HTMLInputElement).checked; savePreference(); this.render(); });
        root.querySelector<HTMLSelectElement>("[data-setting-appearance]")?.addEventListener("change", (event) => { const value = (event.currentTarget as HTMLSelectElement).value; if (value === "system" || value === "light" || value === "dark") { this.appearance = value; void this.persistViewPreferences(); this.render(); } });
        root.querySelector<HTMLInputElement>("[data-setting-motion]")?.addEventListener("change", (event) => { this.reducedMotion = (event.currentTarget as HTMLInputElement).checked; void this.persistViewPreferences(); this.render(); });
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
        root.querySelector<HTMLElement>("[data-action='restore-backup']")?.addEventListener("click", () => void this.restoreLatestBackup());
        root.querySelector<HTMLElement>("[data-action='clear-audit']")?.addEventListener("click", () => { this.auditEntries = []; void this.saveData(AUDIT_STORAGE_NAME, []); this.render(); });
        root.querySelector<HTMLElement>("[data-action='export-audit']")?.addEventListener("click", () => downloadStoreAuditFor(this.auditEntries));
        root.querySelector<HTMLInputElement>("[data-import-json]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            try {
                const migration = buildJsonMigrationReport(await file.text(), normalizeStore, summarizeJsonBackup(this.store));
                const backup = migration;
                const assessment = assessJsonMigration(migration);
                const validationErrors = validateJsonMigrationReport(migration);
                if (validationErrors.length) {
                    this.auditEntries = appendStoreAudit(this.auditEntries, {type: "migration", at: new Date().toISOString(), details: {status: "rejected", sourceVersion: migration.sourceVersion, targetVersion: migration.targetVersion, errors: validationErrors}});
                    void this.saveData(AUDIT_STORAGE_NAME, this.auditEntries);
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
                    this.auditEntries = appendStoreAudit(this.auditEntries, {type: "migration", at: new Date().toISOString(), details: {sourceVersion: migration.sourceVersion, targetVersion: migration.targetVersion, repaired: migration.repaired, warnings: migration.warnings.length, audit: migration.audit}});
                    await this.saveData(AUDIT_STORAGE_NAME, this.auditEntries);
                    showMessage(`已恢复 ${itemCount} 个项目、${eventCount} 条记录${backup.repaired ? t("msg.jsonRepaired") : ""}`);
                } catch {
                    this.store = previous;
                    showMessage(t("msg.restoreFailed"));
                    return;
                }
                this.render();
            } catch (error) {
                showMessage(t("msg.importFail", {error: String(error)}));
            }
            input.value = "";
        });
        root.querySelector<HTMLInputElement>("[data-import-csv]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
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
            }
            input.value = "";
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

        // Category nav: scroll the requested group into view (sticky rail on wide containers).
        root.querySelectorAll<HTMLElement>("[data-settings-nav]").forEach((button) => button.addEventListener("click", () => {
            const target = root.querySelector<HTMLElement>(`[data-settings-group="${button.dataset.settingsNav}"]`);
            target?.scrollIntoView({behavior: this.reducedMotion ? "auto" : "smooth", block: "start"});
            root.querySelectorAll("[data-settings-nav]").forEach((entry) => { entry.classList.toggle("is-active", entry === button); entry.setAttribute("aria-current", entry === button ? "true" : "false"); });
        }));
    }

    /* 方法体外置于 render/today-bindings.ts（T-022 可选收尾）。 */
    private bindQuickKeyboard(root: HTMLElement) {
        bindQuickKeyboardFor(this as unknown as TodayBindingsHost, root);
    }

    private getQuickTodayItems(): CheckinItem[] {
        return getQuickTodayItems(this.store);
    }

    private renderInsights(): string {
        const item = this.store.items.find((entry) => entry.id === this.insightsItemId && !entry.archived);
        if (!item) return `<div class="lc-checkin lc-checkin--history lc-checkin--insights" data-appearance="${this.resolvedAppearance()}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><h1 class="lc-checkin__title">${t("insights.title")}</h1></header><div class="lc-checkin__empty"><div class="lc-checkin__empty-title">${t("insights.empty")}</div></div></div>`;
        const report = buildHabitInsights(this.store, item.id, {days: 84, asOf: currentCalendarDate()});
        const suggestions = buildCoachingSuggestions(report);
        const rate = report.aggregates.completionRate === null ? t("review.quotaNone") : `${report.aggregates.completionRate}%`;
        const weekRows = report.weeklyTrend.slice(-6).map((week) => `<div class="lc-checkin__insight-row"><span>${escapeHtml(week.label)}</span><strong>${week.completedDays}/${week.eligibleScheduledDays || week.scheduledDays} ${t("insights.weekDays", {n: week.eligibleScheduledDays || week.scheduledDays})}</strong></div>`).join("");
        const insightItems = this.store.items.filter((entry) => !entry.archived).sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
        const itemPicker = insightItems.length > 1 ? `<label class="lc-checkin__insight-picker"><span>${t("insights.picker")}</span><select data-insight-item aria-label="${t("insights.picker")}">${insightItems.map((entry) => `<option value="${escapeHtml(entry.id)}" ${entry.id === item.id ? "selected" : ""}>${escapeHtml(entry.icon)} ${escapeHtml(entry.name)}</option>`).join("")}</select></label>` : "";
        const coaching = suggestions.length ? `<section class="lc-checkin__insight-section"><div class="lc-checkin__insight-heading"><h2>${t("insights.coaching")}</h2><small>${t("insights.coachingHint")}</small></div><div class="lc-checkin__coaching-list" role="list">${suggestions.map((suggestion, index) => `<div class="lc-checkin__coaching-item is-${suggestion.tone} ${index === 0 ? "is-primary" : ""}" role="listitem"><div><strong>${escapeHtml(suggestion.title)}</strong><span>${escapeHtml(suggestion.detail)}</span></div><small>${escapeHtml(suggestion.evidence)}</small></div>`).join("")}</div></section>` : "";
        const insightGrid = report.days.map((day) => { const label = `${day.date}，${day.status === "complete" ? t("insights.complete") : day.status === "partial" ? t("insights.partial") : day.status === "missed" ? t("insights.missed") : t("insights.off")}，${day.progress}/${day.target} ${day.unit}`; return `<span class="is-${day.status}" role="listitem" tabindex="0" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}"></span>`; }).join("");
        return `<div class="lc-checkin lc-checkin--history lc-checkin--insights" data-appearance="${this.resolvedAppearance()}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${escapeHtml(item.icon)} ${escapeHtml(item.group || t("insights.title"))}</div><h1 class="lc-checkin__title">${escapeHtml(item.name)}</h1></div></header>${itemPicker}<div class="lc-checkin__insight-stats"><div><strong>${rate}</strong><span>${t("insights.rate")}</span></div><div><strong>${report.currentStreak}</strong><span>${t("insights.currentStreak")}</span></div><div><strong>${report.longestStreak}</strong><span>${t("insights.bestStreak")}</span></div></div>${coaching}<section class="lc-checkin__insight-section"><div class="lc-checkin__insight-heading"><h2>${t("insights.window")}</h2><small>${report.startDate} 至 ${report.endDate}</small><div class="lc-checkin__insight-legend" role="list" aria-label="${t("insights.legendAria")}"><span role="listitem"><i class="is-complete" aria-hidden="true"></i>${t("insights.complete")}</span><span role="listitem"><i class="is-partial" aria-hidden="true"></i>${t("insights.partial")}</span><span role="listitem"><i class="is-missed" aria-hidden="true"></i>${t("insights.missed")}</span><span role="listitem"><i class="is-off" aria-hidden="true"></i>${t("insights.off")}</span></div></div><div class="lc-checkin__insight-grid-scroll"><div class="lc-checkin__insight-grid" role="list" aria-label="${t("insights.window")}">${insightGrid}</div></div><div class="lc-checkin__insight-grid-range"><span>${report.startDate}</span><span>${report.endDate}</span></div></section><section class="lc-checkin__insight-section"><h2>${t("insights.weeklyTrend")}</h2>${weekRows || `<div class="lc-checkin__history-empty">${t("insights.notEnough")}</div>`}</section></div>`;
    }

    private renderMobileNav(): string {
        const entries = [["today", t("nav.today"), "home"], ["review", t("nav.review"), "summary"], ["occasions", t("nav.occasions"), "calendar"], ["settings", t("nav.settings"), "settings"]] as const;
        const buttons = entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`);
        const add = `<button class="lc-checkin__mobile-nav-add ${this.currentPage === "editor" ? "is-selected" : ""}" type="button" data-mobile-nav="add" aria-label="新建打卡项" title="新建打卡项"><span>${uiIcon("add")}</span><small>${t("nav.add")}</small></button>`;
        return `<nav class="lc-checkin__mobile-nav" aria-label="打卡导航">${buttons.slice(0, 2).join("")}${add}${buttons.slice(2).join("")}</nav>`;
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
        return `<nav class="lc-checkin__rail" aria-label="打卡导航">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}</nav>`;
    }

    /* 桌面顶部导航：替代左侧 rail（T-030）。窄容器由 CSS 隐藏（改用底部导航）。 */
    private renderTopNav(): string {
        const entries = [["today", t("nav.today"), "home"], ["review", t("nav.review"), "summary"], ["occasions", t("nav.occasions"), "calendar"], ["settings", t("nav.settings"), "settings"]] as const;
        return `<nav class="lc-checkin__topnav" aria-label="打卡导航">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}</nav>`;
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
    private renderReview(): string {
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
            summaryProvidersCount: this.summaryProviders.size,
            editingHistoryNoteId: this.editingHistoryNoteId,
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

    private renderArchived(): string {
        const archivedItems = this.store.items.filter((item) => item.archived);
        const query = this.archivedQuery.trim().toLocaleLowerCase();
        const items = query ? archivedItems.filter((item) => [item.name, item.group, item.unit, item.icon].some((value) => value?.toLocaleLowerCase().includes(query))) : archivedItems;
        const rows = items.length ? items.map((item) => {
            const openPeriod = item.archivePeriods.find((period) => !period.endDate);
            const pausedLabel = openPeriod ? t("archived.pausedSince", {date: openPeriod.startDate}) : t("archived.paused");
            const groupLabel = item.group || t("review.ungrouped");
            return `<article class="lc-checkin__history-row"><span class="lc-checkin__archived-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span><div class="lc-checkin__archived-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(groupLabel)} · ${escapeHtml(pausedLabel)}</small></div><button class="lc-checkin__text-button" type="button" data-restore-id="${escapeHtml(item.id)}" aria-label="${t("archived.restoreAria", {name: item.name})}">${t("archived.restore")}</button></article>`;
        }).join("") : query ? `<div class="lc-checkin__empty-description">${t("archived.searchEmpty", {q: this.archivedQuery.trim()})}</div>` : `<div class="lc-checkin__empty-description">${t("archived.empty")}</div>`;
        const resultLabel = query ? `找到 ${items.length} 个，共 ${archivedItems.length} 个归档项目` : `共 ${archivedItems.length} 个归档项目`;
        return `<div class="lc-checkin lc-checkin--history lc-checkin--archived" data-appearance="${this.resolvedAppearance()}"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><div><div class="lc-checkin__eyebrow">暂不参与今日计划</div><h1 class="lc-checkin__title">已归档</h1></div></header><section class="lc-checkin__archived-tools" role="search" aria-label="搜索归档项目"><label class="lc-checkin__archived-search"><span aria-hidden="true">⌕</span><input data-archived-search type="search" value="${escapeHtml(this.archivedQuery)}" placeholder="搜索名称、分组或单位" aria-label="搜索归档项目" enterkeyhint="search" />${this.archivedQuery ? `<button type="button" data-action="clear-archived-query" aria-label="清除归档搜索" title="清除搜索">×</button>` : ""}</label><span class="lc-checkin__archived-result" role="status" aria-live="polite">${resultLabel}</span></section><main class="lc-checkin__history-list">${rows}</main></div>`;
    }

    /* 方法体外置于 render/occasions.ts（T-022）。 */
    private renderOccasions(): string {
        return renderOccasionsView({
            occasionStore: this.occasionStore,
            editingOccasionId: this.editingOccasionId,
            occasionSearchQuery: this.occasionSearchQuery,
            occasionTemplatesOpen: this.occasionTemplatesOpen,
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
        });
    }


    /* 方法体外置于 render/bind-today.ts（T-022）；宿主成员经 BindTodayHost 接口声明。 */
    private bindToday(root: HTMLElement) {
        bindTodayHandlers(root, this as unknown as BindTodayHost);
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

    private async restoreLatestBackup() {
        if (!this.storageReady || this.disposed) return;
        const raw = await this.loadData(BACKUP_STORAGE_NAME);
        if (!raw) { showMessage(t("msg.noSnapshot")); return; }
        const backup = normalizeStore(raw);
        const itemCount = backup.items.length;
        const eventCount = backup.events.length;
        if (!window.confirm(t("msg.snapshotConfirm", {items: itemCount, events: eventCount}))) return;
        const current = this.cloneStore(this.store);
        this.store = backup;
        try {
            await this.persist(current);
            this.auditEntries = appendStoreAudit(this.auditEntries, {type: "restore", at: new Date().toISOString(), details: {source: "local-snapshot", itemCount, eventCount, fromVersion: current.version, toVersion: backup.version}});
            await this.saveData(AUDIT_STORAGE_NAME, this.auditEntries);
            showMessage(t("msg.snapshotRestored", {items: itemCount, events: eventCount}));
            this.render();
        } catch {
            this.store = current;
            showMessage(t("msg.snapshotRestoreFail"));
        }
    }

    private async setItemArchived(itemId: string, archived: boolean, moment: ActionMoment, expectedFingerprint?: string): Promise<boolean> {
        if (this.disposed || this.initializationState !== "ready" || typeof itemId !== "string" || typeof archived !== "boolean") return false;
        const item = this.store.items.find((candidate) => candidate.id === itemId);
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

    private async generateSummary() {
        const provider = this.summaryProviders.values().next().value as SummaryProvider | undefined;
        if (!provider) return;
        const range = this.summaryRange;
        const customRange = this.summaryCustomRange;
        const requestId = ++this.summaryRequestId;
        const now = currentCalendarDate();
        const context = customRange ? buildCustomSummaryContext(this.store, customRange, now) : buildSummaryContext(this.store, range, now);
        const summaryItemIds = new Set(context.items.map((item) => item.itemId));
        try {
            const summaryText = await withTimeout(provider.summarize({
                range,
                ...(customRange ? {customRange} : {}),
                items: this.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => this.cloneItem(item)),
                events: customRange ? getEventsInCustomRange(this.store, customRange) : this.getSummaryEvents(range, now),
                context,
            }), SUMMARY_TIMEOUT_MS, "总结适配器响应超时");
            if (this.disposed || requestId !== this.summaryRequestId || this.currentPage !== "review" || this.summaryRange !== range || this.summaryCustomRange !== customRange || this.summaryProviders.get(provider.id) !== provider) return;
            if (typeof summaryText !== "string") throw new Error("总结适配器没有返回文本");
            this.summaryText = summaryText;
            this.render();
        } catch (error) {
            if (!this.disposed && requestId === this.summaryRequestId && this.currentPage === "review" && this.summaryRange === range && this.summaryCustomRange === customRange) {
                showMessage(t("msg.summaryFail", {error: String(error)}));            }
        }
    }

    private downloadExport(format: "json" | "csv") {
        downloadExportFor(this as unknown as PluginOpsHost, format);
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
        await saveEditorForm(this as unknown as SaveFormHost, data, editingId, submittedAt, expectedFingerprint);
    }

    private async archiveEditingItem() {
        if (!this.editingId) {
            return;
        }
        const current = this.store.items.find((item) => item.id === this.editingId);
        if (!current) {
            return;
        }
        const moment = captureActionMoment();
        const expectedFingerprint = this.editingFingerprint;
        if (await this.enqueueMutation(() => this.setItemArchived(current.id, !current.archived, moment, expectedFingerprint))) {
            this.showToday();
        }
    }

    private async toggleItem(itemId: string, moment: ActionMoment, desiredComplete: boolean, expectedRevisionFingerprint?: string, eventsToUndo: readonly CheckinEvent[] = []) {
        const item = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
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
        const current = this.store.items.find((candidate) => candidate.id === item.id && !candidate.archived);
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
        this.renderBackgroundUpdate();
        return {...event};
    }

    private setRecentRecord(record: RecentRecord) {
        this.recentRecord = record;
        if (this.recentRecordTimer !== undefined) window.clearTimeout(this.recentRecordTimer);
        this.recentRecordTimer = window.setTimeout(() => {
            this.recentRecord = undefined;
            this.recentRecordTimer = undefined;
            this.renderBackgroundUpdate();
        }, 5000);
    }

    private async undoRecentRecord() {
        const recent = this.recentRecord;
        if (!recent) return;
        this.recentRecord = undefined;
        if (this.recentRecordTimer !== undefined) {
            window.clearTimeout(this.recentRecordTimer);
            this.recentRecordTimer = undefined;
        }
        const event = this.store.events.find((candidate) => candidate.id === recent.eventId);
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
            this.broadcast({type: "event-deleted", item: this.store.items.find((item) => item.id === event.itemId), deletedEvents: [event]});
            this.renderBackgroundUpdate();
        });
    }

    /* 方法体外置于 render/focus-adapter.ts（T-022）。 */
    private startFocus(itemId: string): Promise<boolean> {
        return startFocusFor(this as unknown as FocusAdapterHost, itemId);
    }

    private findFocusAdapter(item: CheckinItem, date = new Date()): FocusAdapter | undefined {
        return findFocusAdapterFor(this as unknown as FocusAdapterHost, item, date);
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
        if (this.disposed || !this.storageReady) {
            return Promise.reject(new Error("数据存储尚未就绪"));
        }
        const snapshot = this.cloneStore(store);
        this.saveState = "saving";
        this.renderBackgroundUpdate();
        const previous = this.cloneStore(this.lastPersistedStore);
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(BACKUP_STORAGE_NAME, previous).then(() => this.saveData(STORAGE_NAME, snapshot).then(() => undefined)));
        this.saveQueue = write.catch((error) => {
            this.saveState = "error";
            showMessage(t("msg.saveDataFail", {error: String(error)}));
            this.renderBackgroundUpdate();
        });
        void write.then(() => {
            if (this.saveState === "saving") { this.saveState = "idle"; this.lastPersistedStore = this.cloneStore(snapshot); }
            this.renderBackgroundUpdate();
        }, () => undefined);
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
        this.todayQuery = preferences.todayQuery;
        this.pendingOnly = preferences.pendingOnly;
        this.collapsedTodayGroups = new Set(preferences.collapsedGroups);
        this.reviewFoldSections = new Set(preferences.reviewFold);
        this.reviewFoldTouched = preferences.reviewFoldTouched;
        this.insightsItemId = preferences.lastInsightsItemId;
        this.weekStripVisible = preferences.showWeekStrip;
        this.lastExportAt = preferences.lastExportAt;
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
        };
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(VIEW_PREFERENCES_NAME, preferences).then(() => undefined));
        this.saveQueue = write.catch((error) => {
            showMessage(t("msg.prefPersistFail", {error: String(error)}));
        });
        return write;
    }

    private enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
        if (!this.acceptingOperations) return Promise.resolve(undefined as T);
        const execute = () => this.withStorageLock(async () => {
            let refreshed = false;
            if (this.initializationState === "ready" && this.storageReady) {
                try {
                    const stored = await this.loadData(STORAGE_NAME);
                    const remote = normalizeStore(stored);
                    const conflict = detectStoreConflict(this.lastPersistedStore, remote);
                    if (conflict.conflicted) {
                        this.auditEntries = appendStoreAudit(this.auditEntries, {type: "conflict", at: new Date().toISOString(), details: {items: conflict.changedItemIds.length, events: conflict.changedEventIds.length}});
                        void this.saveData(AUDIT_STORAGE_NAME, this.auditEntries);
                    }
                    const latest = mergeStores(this.store, remote);
                    refreshed = JSON.stringify(latest) !== JSON.stringify(this.store);
                    this.store = latest;
                    if (refreshed || conflict.conflicted) this.showSyncNotice();
                    if (JSON.stringify(latest) !== JSON.stringify(remote)) {
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
