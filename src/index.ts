import {Dialog, getFrontend, openTab, Plugin, showMessage} from "siyuan";
import "./index.scss";
import "./ui/tokens.scss";
import "./ui/components.scss";
import {buildCustomSummaryContext, buildSummaryContext, getEventsInCustomRange, getEventsInRange} from "./analytics";
import {formatLunar, solarToLunar} from "./lunar";
import {getPluginLocale, t} from "./i18n";
import {uiIcon, type UiIconName} from "./ui/icons";
import {KIND_LABELS, PRIORITY_LABELS, TIME_SLOT_LABELS, SORT_LABELS, SCHEDULE_LABELS} from "./ui/labels";
import {parseLocalDateKey, MAX_CUSTOM_ICON_BYTES, MAX_CUSTOM_LIBRARY_ITEMS, escapeHtml, normalizeCustomIcon, normalizeCustomIconLibrary, parseCustomIconLibrary, renderIconMarkup, withTimeout, renderRecordNote, matchesSearch, formatNumber, formatScheduleLabel, getTargetLabel, getRecordStep, getEditorStep, normalizePriorityInput, normalizeTimeSlotInput, captureActionMoment, nextItemUpdatedAt, currentCalendarDate, calendarDateFromKey, isValidLocalDateInput, formatHistoryDate, isSummaryRange, storeNeedsMigration, type ActionMoment} from "./shared";
import {buildMonthlyEventTrend, buildWeeklyCompletionTrend, buildYearHeatmap, renderBarChart, renderLineChart, renderYearHeatmap} from "./charts";
import {buildAchievements} from "./features/achievements";
import {CHECKIN_TEMPLATES, ICON_GROUPS, ICON_SEARCH_KEYWORDS, KIND_OPTIONS, templateGroupLabel, templateName, templateNote, type CheckinTemplate} from "./catalog";
import {parseCheckinCsv, parseJsonBackup, serializeCsv, serializeJson} from "./export";
import {buildHabitInsights} from "./features/insights";
import {buildCoachingSuggestions} from "./features/coaching";
import {buildWeeklyReportMarkdown} from "./features/report";
import {filterHistoryRecords} from "./features/history-filter";
import {extractSiyuanBlockLinkSpans} from "./features/record-notes";
import {evaluateRule} from "./rules";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, emitIntegrationEvent} from "./integrations";
import {STORE_VERSION, appendEvent, createDefaultStore, dateKey, detectStoreConflict, getEventDateKey, getEventsForDay, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday, makeId, mergeStores, normalizeItem as normalizeCheckinItem, normalizeStore, removeEvents, sortCheckinItems, updateEventNote} from "./model";
import type {FocusAdapter, SummaryProvider} from "./integrations";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinKind, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot, CompletionSource, ScheduleType, TomatoValueMode, UserTemplate} from "./types";
import type {CustomSummaryRange, SummaryRange} from "./analytics";
import type {HistorySortOrder, HistorySourceFilter} from "./features/history-filter";
import {DEFAULT_VIEW_PREFERENCES, normalizeViewPreferences, type CheckinPalette, type CheckinViewPreferences, type DialogSizeMode} from "./view-preferences";
import {validateEditorInput} from "./editor-validation";
import {normalizeUserTemplate, upsertUserTemplate, deleteUserTemplate} from "./features/templates";
import type {CheckinAppearance, TodayGroupMode} from "./view-preferences";
import {applyOccasionTemplate, createDefaultOccasionStore, deleteOccasion, describeRecurrence, getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, markOccasionCompleted, normalizeOccasion, normalizeOccasionStore, OCCASIONS_STORAGE_NAME, OCCASION_TEMPLATES, occasionTemplateName, upsertOccasion, weekdayName, type MonthlySubtype} from "./occasions";
import type {Occasion, OccasionKind, OccasionRecurrence, OccasionStore, VisibleOccasion} from "./occasions";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_CAPABILITIES, getCheckinApiDescriptor, getCheckinCapabilityInfo, hasCheckinCapability} from "./api-contract";
import type {CheckinApiDescriptor, CheckinCapability, CheckinCapabilityInfo} from "./api-contract";

const STORAGE_NAME = "checkin-store";
const BACKUP_STORAGE_NAME = "checkin-store-backup";
const AUDIT_STORAGE_NAME = "checkin-store-audit";
const VIEW_PREFERENCES_NAME = "checkin-view-preferences";
const USER_TEMPLATES_NAME = "checkin-user-templates";
const CUSTOM_ICON_LIBRARY_NAME = "checkin-custom-icon-library";
const PLUGIN_VERSION = "9.3.0";
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
                size: {width: 320, height: 0},
                icon: "iconLvCheckin",
                title: "小驴打卡",
            },
            data: {},
            type: DOCK_TYPE,
            init: function (this: {element: Element}) {
                plugin.dockElement = this.element as HTMLElement;
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
                this.auditEntries = Array.isArray(audit) ? audit.slice(-50) : [];
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

    private createApi(): CheckinApi {
        const summarizeWithProvider = async (range: SummaryRange, customRange: CustomSummaryRange | undefined, providerId?: string) => {
            if (!this.acceptingOperations || this.disposed) return undefined;
            if (customRange) {
                if (!isValidLocalDateInput(customRange.startDate) || !isValidLocalDateInput(customRange.endDate) || customRange.startDate > customRange.endDate) return undefined;
            } else if (!isSummaryRange(range)) {
                return undefined;
            }
            const provider = providerId ? this.summaryProviders.get(providerId) : this.summaryProviders.values().next().value;
            if (!provider) return undefined;
            const now = currentCalendarDate();
            const context = customRange ? buildCustomSummaryContext(this.store, customRange, now) : buildSummaryContext(this.store, range, now);
            const summaryItemIds = new Set(context.items.map((item) => item.itemId));
            const output = await withTimeout(provider.summarize({
                range,
                ...(customRange ? {customRange} : {}),
                items: this.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => this.cloneItem(item)),
                events: customRange ? getEventsInCustomRange(this.store, customRange) : this.getSummaryEvents(range, now),
                context,
            }), SUMMARY_TIMEOUT_MS, "总结适配器响应超时");
            return this.disposed || this.disposing || this.summaryProviders.get(provider.id) !== provider || typeof output !== "string" ? undefined : output;
        };
        return {
            name: CHECKIN_API_NAME,
            protocol: CHECKIN_API_PROTOCOL,
            version: CHECKIN_API_VERSION,
            capabilities: CHECKIN_CAPABILITIES,
            hasCapability: hasCheckinCapability,
            describe: getCheckinApiDescriptor,
            getCapabilityInfo: getCheckinCapabilityInfo,
            isReady: () => this.initializationState === "ready" && this.acceptingOperations && !this.disposed,
            whenReady: () => this.readyPromise.then((ready) => ready && this.acceptingOperations && !this.disposed),
            getStore: () => this.cloneStore(),
            getItems: () => this.store.items.filter((item) => !item.archived).map((item) => this.cloneItem(item)),
            getEvents: () => this.store.events.map((event) => ({...event})),
            getOccasions: () => this.occasionStore.occasions.map((item) => ({...item, completedDates: [...item.completedDates]})),
            getTodayOccasions: () => getVisibleOccasions(this.occasionStore, currentCalendarDate()).map((item) => ({...item, completedDates: [...item.completedDates]})),
            completeOccasion: (id, occurrenceDate, completed) => this.enqueueMutation(() => this.setOccasionCompleted(id, occurrenceDate, completed)),
            getSummaryContext: (range) => {
                if (!isSummaryRange(range)) throw new TypeError("range 必须是 day、week 或 month");
                return buildSummaryContext(this.store, range, currentCalendarDate());
            },
            getCustomSummaryContext: (range) => {
                if (!range || !isValidLocalDateInput(range.startDate) || !isValidLocalDateInput(range.endDate) || range.startDate > range.endDate) throw new TypeError("自定义总结范围无效");
                return buildCustomSummaryContext(this.store, range, currentCalendarDate());
            },
            getArchivedItems: () => this.store.items.filter((item) => item.archived).map((item) => this.cloneItem(item)),
            setItemArchived: (itemId, archived) => {
                if (!this.acceptingOperations) return Promise.resolve(false);
                const moment = captureActionMoment();
                const expectedItem = this.store.items.find((item) => item.id === itemId);
                const expectedFingerprint = expectedItem ? this.itemFingerprint(expectedItem) : undefined;
                return this.enqueueMutation(() => this.setItemArchived(itemId, archived, moment, expectedFingerprint));
            },
            exportJson: () => serializeJson(this.cloneStore()),
            exportCsv: () => serializeCsv(this.cloneStore()),
            recordEvent: (input) => {
                if (!this.acceptingOperations) return Promise.resolve(undefined);
                const moment = captureActionMoment();
                const snapshot = input && typeof input === "object" ? {...input} : input;
                const expectedItem = snapshot && typeof snapshot === "object" && typeof snapshot.itemId === "string"
                    ? this.store.items.find((item) => item.id === snapshot.itemId)
                    : undefined;
                const expectedRevisionFingerprint = expectedItem
                    ? this.revisionFingerprint(expectedItem, calendarDateFromKey(moment.localDate))
                    : undefined;
                return this.enqueueMutation(() => this.recordExternalEvent(snapshot, moment, expectedRevisionFingerprint));
            },
            startFocus: (itemId) => this.startFocus(itemId),
            stopFocus: () => this.stopFocus(),
            registerFocusAdapter: (adapter) => {
                if (!this.acceptingOperations || this.disposed || !adapter || typeof adapter.id !== "string" || !adapter.id || typeof adapter.canStart !== "function" || typeof adapter.start !== "function" || typeof adapter.stop !== "function") {
                    return () => undefined;
                }
                this.focusAdapters.set(adapter.id, adapter);
                this.renderBackgroundUpdate();
                return () => {
                    if (this.focusAdapters.get(adapter.id) === adapter) {
                        this.focusAdapters.delete(adapter.id);
                    }
                    if (this.activeFocusAdapter === adapter) {
                        this.activeFocusAdapter = undefined;
                        if (!this.focusBusy) {
                            this.focusBusy = true;
                            const stop = this.stopAdapterSilently(adapter).finally(() => {
                                this.focusBusy = false;
                                this.renderBackgroundUpdate();
                            });
                            this.focusOperation = stop;
                        }
                    }
                    this.renderBackgroundUpdate();
                };
            },
            registerSummaryProvider: (provider) => {
                if (!this.acceptingOperations || this.disposed || !provider || typeof provider.id !== "string" || !provider.id || typeof provider.summarize !== "function") {
                    return () => undefined;
                }
                this.invalidateSummary();
                this.summaryProviders.set(provider.id, provider);
                this.renderBackgroundUpdate();
                return () => {
                    if (this.summaryProviders.get(provider.id) === provider) {
                        this.summaryProviders.delete(provider.id);
                        this.invalidateSummary();
                        this.renderBackgroundUpdate();
                    }
                };
            },
            summarize: (range, providerId) => summarizeWithProvider(range, undefined, providerId),
            summarizeCustom: (range, providerId) => summarizeWithProvider("day", range, providerId),
            subscribe: (listener) => {
                if (!this.acceptingOperations || this.disposed || typeof listener !== "function") {
                    return () => undefined;
                }
                const wrapped = (event: Event) => listener((event as CustomEvent<CheckinIntegrationEvent>).detail);
                Object.values(CHECKIN_EVENT_NAMES).forEach((eventName) => window.addEventListener(eventName, wrapped));
                const dispose = () => {
                    Object.values(CHECKIN_EVENT_NAMES).forEach((eventName) => window.removeEventListener(eventName, wrapped));
                    this.apiSubscriptions.delete(dispose);
                };
                this.apiSubscriptions.add(dispose);
                return dispose;
            },
        };
    }

    private cloneStore(store: CheckinStore = this.store): CheckinStore {
        return {
            version: STORE_VERSION,
            items: store.items.map((item) => this.cloneItem(item)),
            events: store.events.map((event) => ({...event})),
            eventTombstones: store.eventTombstones.map((tombstone) => ({...tombstone})),
        };
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
        this.summaryRequestId += 1;
        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showReview() {
        this.currentPage = "review";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showHistory() {
        this.showReview();
    }

    private showSummary() {
        this.showReview();
    }

    private showInsights(item?: CheckinItem) {
        const candidate = item || this.store.items.find((entry) => entry.id === this.insightsItemId && !entry.archived) || this.store.items.find((entry) => !entry.archived);
        if (!candidate) return;
        this.insightsReturnPage = this.currentPage === "review" ? "review" : "today";
        this.currentPage = "insights";
        this.insightsItemId = candidate.id;
        void this.persistViewPreferences();
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showArchived() {
        this.currentPage = "archived";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showOccasions() {
        this.currentPage = "occasions";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showSettings() {
        this.currentPage = "settings";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showEditor(item?: CheckinItem) {
        this.currentPage = "editor";
        this.editingId = item?.id;
        this.editingFingerprint = item ? this.itemFingerprint(item) : undefined;
        this.render();
    }

    private openTabPage() {
        if (!this.supportsCustomTab || this.disposed || this.disposing || this.tabOpenPromise) {
            if (!this.supportsCustomTab) this.openQuickDialog();
            return;
        }
        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.tabOpenPromise = openTab({
            app: this.app,
            custom: {
                id: this.getTabId(),
                icon: "iconLvCheckin",
                title: "小驴打卡",
                data: {page: "today"},
            },
        }).then((tab) => {
            if (this.disposed || this.disposing) {
                tab.close();
            } else {
                this.tabInstance = tab;
            }
        }).catch((error) => {
            showMessage(t("msg.openTabFail", {error: String(error)}));
            this.openQuickDialog();
        }).finally(() => {
            this.tabOpenPromise = undefined;
        });
    }

    private toggleQuickDialog() {
        if (this.quickDialog) {
            this.closeQuickDialog();
            return;
        }
        this.openQuickDialog();
    }

    /* Desktop quick dialog sizing follows the user preference: a percentage of
       the host window (default 80%), fullscreen, or a fixed pixel size. */
    private quickDialogSize(): {width: string; height: string} {
        if (this.dialogSizeMode === "fullscreen") return {width: "100vw", height: "100vh"};
        if (this.dialogSizeMode === "fixed") return {width: `${this.dialogFixedSize.width}px`, height: `${this.dialogFixedSize.height}px`};
        const scale = Math.min(100, Math.max(50, this.dialogScale)) / 100;
        const width = Math.round(window.innerWidth * scale);
        const height = Math.round(window.innerHeight * scale);
        return {width: `${width}px`, height: `${height}px`};
    }

    private openQuickDialog() {
        if (this.disposed || this.disposing) return;
        if (this.quickDialog) {
            this.currentPage = "today";
            this.editingId = undefined;
            this.editingFingerprint = undefined;
            this.render();
            return;
        }

        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        let dialog: Dialog | undefined;
        const hostClass = this.isMobileFrontend ? "lc-checkin-dialog-host lc-checkin-dialog-host--mobile" : "lc-checkin-dialog-host";
        const size = this.quickDialogSize();
        dialog = new Dialog({
            title: "",
            content: `<div class="${hostClass}" role="region" aria-label="小驴打卡快速窗口"></div>`,
            width: this.isMobileFrontend ? "100vw" : size.width,
            height: this.isMobileFrontend ? "100dvh" : size.height,
            disableAnimation: this.isMobileFrontend,
            destroyCallback: () => {
                if (dialog) this.handleQuickDialogDestroyed(dialog);
            },
        });
        const root = dialog.element.querySelector<HTMLElement>(".lc-checkin-dialog-host");
        if (!root) {
            dialog.destroy();
            showMessage(t("msg.quickDialogInitFail"));
            return;
        }
        dialog.element.querySelector<HTMLElement>(".b3-dialog__container")?.classList.add("lc-checkin-dialog");
        dialog.element.querySelector<HTMLElement>(".b3-dialog__body")?.classList.add("lc-checkin-dialog__body");
        const dialogBody = dialog.element.querySelector<HTMLElement>(".b3-dialog__body");
        const hostStyle = dialog.element.querySelector<HTMLElement>(".lc-checkin-dialog-host");
        if (dialogBody && hostStyle) {
            dialogBody.style.overflow = "hidden";
            hostStyle.style.height = "100%";
        }
        this.quickDialog = dialog;
        this.quickDialogElement = root;
        this.quickDialogFullscreen = false;
        this.bindQuickDialogViewport(dialog);
        this.renderInto(root);
    }

    private closeQuickDialog() {
        const dialog = this.quickDialog;
        if (!dialog) return;
        dialog.destroy();
        // SiYuan currently invokes destroyCallback synchronously; retain a
        // fallback so a future asynchronous implementation cannot leave stale refs.
        this.handleQuickDialogDestroyed(dialog);
    }

    private handleQuickDialogDestroyed(dialog: Dialog) {
        if (this.quickDialog !== dialog) return;
        this.quickDialogViewportCleanup?.();
        this.quickDialogViewportCleanup = undefined;
        this.quickDialog = undefined;
        this.quickDialogElement = undefined;
        this.quickDialogFullscreen = false;
        if (this.disposed || this.disposing) return;
        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
        void this.reconcileStore();
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

    private ensureMobileTopBarButton() {
        if (!this.isMobileFrontend || this.disposed || this.disposing) return;
        const topBar = document.getElementById("mobileTopBar") || document.getElementById("toolbar");
        if (!topBar) {
            if (this.mobileTopBarRetryTimer === undefined) {
                this.mobileTopBarRetryTimer = window.setTimeout(() => {
                    this.mobileTopBarRetryTimer = undefined;
                    this.ensureMobileTopBarButton();
                }, 800);
            }
            return;
        }
        if (this.mobileTopBarButton?.isConnected || topBar.querySelector("#lcCheckinMobileTopBarButton")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.id = "lcCheckinMobileTopBarButton";
        button.className = "toolbar__button";
        button.setAttribute("aria-label", "打开小驴打卡");
        button.setAttribute("title", "打开小驴打卡");
        button.innerHTML = `<svg aria-hidden="true"><use xlink:href="#iconLvCheckin"></use></svg>`;
        button.addEventListener("click", () => this.toggleQuickDialog());
        topBar.appendChild(button);
        this.mobileTopBarButton = button;
    }

    /** Register optional launcher actions when 小驴速切 is installed. */
    private ensureSpeedSwitchQuickActions() {
        if (this.disposed || this.disposing || this.speedSwitchQuickActionDisposers.length) return;
        const plugins = (this.app as unknown as {plugins?: unknown} | undefined)?.plugins;
        const candidates = Array.isArray(plugins)
            ? plugins
            : plugins && typeof plugins === "object" ? Object.values(plugins as Record<string, unknown>) : [];
        const speedSwitch = candidates.find((candidate) => {
            if (!candidate || typeof candidate !== "object") return false;
            const plugin = candidate as {name?: unknown; registerQuickAction?: unknown};
            return typeof plugin.registerQuickAction === "function" && (plugin.name === "siyuan-speed-switch" || plugin.name === "小驴速切" || plugin.name === "siyuanSpeedSwitch");
        }) as SpeedSwitchPluginLike | undefined;
        if (!speedSwitch?.registerQuickAction) {
            if (this.speedSwitchRetryTimer === undefined) {
                this.speedSwitchRetryTimer = window.setTimeout(() => {
                    this.speedSwitchRetryTimer = undefined;
                    this.ensureSpeedSwitchQuickActions();
                }, 1200);
            }
            return;
        }
        const actions: Array<{id: string; label: string; value: string; handler: () => void}> = [
            {id: "xiaolv-checkin-open", label: "打卡", value: "open", handler: () => this.openQuickDialog()},
        ];
        actions.forEach((action) => {
            const dispose = speedSwitch.registerQuickAction({
                id: action.id,
                label: action.label,
                icon: "iconLvCheckin",
                value: action.value,
                targets: ["desktop", "sidebar", "mobile"],
                handler: () => action.handler(),
            });
            if (typeof dispose === "function") this.speedSwitchQuickActionDisposers.push(dispose);
        });
    }

    private bindQuickDialogViewport(dialog: Dialog) {
        if (!this.isMobileFrontend) return;
        const viewport = window.visualViewport;
        const container = dialog.element.querySelector<HTMLElement>(".b3-dialog__container");
        if (!viewport || !container) return;
        let frame = 0;
        const sync = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                if (this.quickDialog !== dialog) return;
                const height = Math.max(280, Math.floor(viewport.height - 16));
                container.style.height = `${height}px`;
                container.style.maxHeight = `${height}px`;
            });
        };
        viewport.addEventListener("resize", sync);
        viewport.addEventListener("scroll", sync);
        window.addEventListener("resize", sync);
        sync();
        this.quickDialogViewportCleanup = () => {
            viewport.removeEventListener("resize", sync);
            viewport.removeEventListener("scroll", sync);
            window.removeEventListener("resize", sync);
            if (frame) window.cancelAnimationFrame(frame);
            frame = 0;
        };
    }

    private registerSiYuanAgentCapability() {
        if (this.agentCapabilityRegistered || this.disposed || this.disposing || !this.api) return;
        const plugin = this as Plugin & {
            addAgentCapability?: (options: {
                name: string;
                title?: string;
                description: string;
                inputSchema: Record<string, unknown>;
                outputSchema?: Record<string, unknown>;
                effects?: {localRead?: boolean; localWrite?: boolean; dataEgress?: boolean; externalCost?: boolean};
                handler: (args: Record<string, unknown>) => Promise<{result?: string; structuredContent?: unknown; error?: string}>;
            }) => string;
        };
        if (typeof plugin.addAgentCapability !== "function") return;
        try {
            plugin.addAgentCapability({
                name: "checkin-summary-context",
                title: "读取小驴打卡复盘上下文",
                description: "读取小驴打卡的日、周、月或自定义日期范围数据，用于生成复盘、趋势和完成率分析。该能力只读本插件数据，不会写入记录，也不会自行访问外部网络。",
                inputSchema: {
                    type: "object",
                    properties: {
                        range: {type: "string", enum: ["day", "week", "month", "custom"], description: "总结范围，默认为 week"},
                        startDate: {type: "string", description: "自定义范围开始日期，格式 YYYY-MM-DD"},
                        endDate: {type: "string", description: "自定义范围结束日期，格式 YYYY-MM-DD"},
                    },
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const range = args.range === "day" || args.range === "week" || args.range === "month" || args.range === "custom" ? args.range : "week";
                    if (range === "custom") {
                        const startDate = typeof args.startDate === "string" ? args.startDate : "";
                        const endDate = typeof args.endDate === "string" ? args.endDate : "";
                        if (!isValidLocalDateInput(startDate) || !isValidLocalDateInput(endDate) || startDate > endDate) return {error: "自定义日期范围无效，请使用 YYYY-MM-DD。"};
                        const context = this.api?.getCustomSummaryContext({startDate, endDate});
                        return context ? {result: `小驴打卡自定义范围 ${startDate} 至 ${endDate}，共 ${context.totalEvents} 条记录。`, structuredContent: context} : {error: "打卡数据尚未准备好。"};
                    }
                    const context = this.api?.getSummaryContext(range);
                    return context ? {result: `小驴打卡${range === "day" ? "今日" : range === "month" ? "本月" : "本周"}共有 ${context.totalEvents} 条记录。`, structuredContent: context} : {error: "打卡数据尚未准备好。"};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-list-items",
                title: "列出小驴打卡项目",
                description: "列出当前可用的打卡项目及其类型、目标、单位、分组、优先级和频率，帮助智能体选择正确的项目。该能力只读本插件数据。",
                inputSchema: {
                    type: "object",
                    properties: {
                        includeArchived: {type: "boolean", description: "是否包含已归档项目，默认为 false"},
                    },
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const includeArchived = args.includeArchived === true;
                    const items = this.store.items
                        .filter((item) => includeArchived || !item.archived)
                        .map((item) => ({
                            id: item.id,
                            name: item.name,
                            icon: item.icon,
                            kind: item.kind,
                            target: item.target,
                            unit: item.unit,
                            schedule: item.schedule,
                            group: item.group || "",
                            priority: item.priority || "medium",
                            timeSlot: item.timeSlot || "any",
                            archived: Boolean(item.archived),
                        }));
                    return {result: `找到 ${items.length} 个${includeArchived ? "（含归档）" : "可用的"}打卡项目。`, structuredContent: {items, count: items.length}};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-item-insights",
                title: "读取单项打卡洞察",
                description: "读取指定打卡项目的完成率、连续记录、周期趋势和明细，用于回答某个习惯的表现、波动和复盘问题。该能力只读本插件数据。",
                inputSchema: {
                    type: "object",
                    properties: {
                        itemId: {type: "string", description: "打卡项目 ID，可先调用 checkin-list-items 获取"},
                        days: {type: "integer", minimum: 7, maximum: 366, description: "回看天数，默认为 84，范围 7-366"},
                    },
                    required: ["itemId"],
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const itemId = typeof args.itemId === "string" ? args.itemId.trim() : "";
                    const item = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
                    if (!item) return {error: "找不到对应的未归档打卡项目，请先调用 checkin-list-items。"};
                    const requestedDays = typeof args.days === "number" && Number.isFinite(args.days) ? Math.round(args.days) : 84;
                    const days = Math.max(7, Math.min(366, requestedDays));
                    const report = buildHabitInsights(this.store, item.id, {days, asOf: currentCalendarDate()});
                    const suggestions = buildCoachingSuggestions(report);
                    const rate = report.aggregates.completionRate === null ? "暂无" : `${report.aggregates.completionRate}%`;
                    return {
                        result: `${item.name}近 ${days} 天完成率 ${rate}，当前连续 ${report.currentStreak} 天，最长连续 ${report.longestStreak} 天。`,
                        structuredContent: {
                            item: this.cloneItem(item),
                            range: {startDate: report.startDate, endDate: report.endDate, days},
                            aggregates: report.aggregates,
                            currentStreak: report.currentStreak,
                            longestStreak: report.longestStreak,
                            weeklyTrend: report.weeklyTrend,
                            totalsByUnit: report.totalsByUnit,
                            days: report.days,
                            records: report.records,
                            suggestions,
                        },
                    };
                },
            });
            plugin.addAgentCapability({
                name: "checkin-record-event",
                title: "记录一次小驴打卡",
                description: "在用户明确要求执行时，为指定打卡项目记录一次进度。会遵守项目的日程、类型、单位和完成状态，并使用插件现有并发锁持久化。该能力会修改本地打卡数据。",
                inputSchema: {
                    type: "object",
                    properties: {
                        itemId: {type: "string", description: "打卡项目 ID，可先调用 checkin-list-items 获取"},
                        value: {type: "number", minimum: 0, description: "本次记录的数值；省略时使用该类型的默认步长"},
                        unit: {type: "string", description: "单位，必须与项目当前版本一致；省略时自动使用项目单位"},
                        note: {type: "string", maxLength: 500, description: "可选备注"},
                    },
                    required: ["itemId"],
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    if (!this.acceptingOperations || this.disposed || this.initializationState !== "ready") return {error: "打卡数据尚未准备好。"};
                    const itemId = typeof args.itemId === "string" ? args.itemId.trim() : "";
                    const item = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
                    const moment = captureActionMoment();
                    const actionDate = calendarDateFromKey(moment.localDate);
                    if (!item || !isItemAvailableOnDate(item, actionDate)) return {error: "找不到今日可用的打卡项目。"};
                    const revision = getItemRevisionForDate(item, actionDate);
                    if (revision.kind === "binary" && isComplete(this.store, item, actionDate)) return {error: "该打卡项目今天已经完成。"};
                    const value = args.value === undefined
                        ? (revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? 1 : revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit))
                        : args.value;
                    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return {error: "记录数值必须是大于或等于 0 的有限数字。"};
                    if (args.unit !== undefined && (typeof args.unit !== "string" || args.unit.trim() !== revision.unit)) return {error: `单位不匹配，该项目当前单位为“${revision.unit || "次"}”。`};
                    const note = args.note === undefined ? undefined : typeof args.note === "string" ? args.note.slice(0, 500) : "";
                    const expectedRevisionFingerprint = this.revisionFingerprint(item, actionDate);
                    const event = await this.enqueueMutation(() => this.recordEvent(item, value, moment, expectedRevisionFingerprint, note));
                    if (!event) return {error: "记录未执行，项目可能已在其他窗口更新或今日不可记录。"};
                    const current = this.store.items.find((candidate) => candidate.id === item.id) || item;
                    const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
                    return {
                        result: `已为“${current.name}”记录 ${formatNumber(event.value)}${event.unit || "次"}。`,
                        structuredContent: {
                            item: {id: current.id, name: current.name, icon: current.icon},
                            event,
                            progress: getProgress(this.store, current, actionDate),
                            target,
                            unit: revision.unit,
                            localDate: moment.localDate,
                        },
                    };
                },
            });
            plugin.addAgentCapability({
                name: "checkin-list-occasions",
                title: "读取小驴打卡日期事项",
                description: "列出生日、纪念日和定时事项，并返回今天或提前提醒窗口内的事项。该能力只读本地数据。",
                inputSchema: {type: "object", properties: {includeDisabled: {type: "boolean", description: "是否包含已停用事项"}}, additionalProperties: false},
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const includeDisabled = args.includeDisabled === true;
                    const occasions = this.occasionStore.occasions.filter((item) => includeDisabled || item.enabled).map((item) => ({...item, completedDates: [...item.completedDates]}));
                    const upcoming = getVisibleOccasions(this.occasionStore, currentCalendarDate()).map((item) => ({id: item.id, name: item.name, kind: item.kind, occurrenceDate: item.occurrenceDate, daysUntil: item.daysUntil, status: item.status, completed: isOccasionCompleted(item, item.occurrenceDate)}));
                    return {result: "找到 " + occasions.length + " 个日期事项，当前提醒窗口内有 " + upcoming.length + " 个。", structuredContent: {occasions, upcoming}};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-complete-occasion",
                title: "处理小驴打卡日期事项",
                description: "在用户明确要求时标记生日、纪念日或定时事项为已处理或未处理，并保存到本地。",
                inputSchema: {type: "object", properties: {id: {type: "string", description: "事项 ID"}, occurrenceDate: {type: "string", description: "发生日期 YYYY-MM-DD"}, completed: {type: "boolean", description: "是否标记为已处理"}}, required: ["id", "occurrenceDate", "completed"], additionalProperties: false},
                outputSchema: {type: "object"},
                effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const id = typeof args.id === "string" ? args.id.trim() : "";
                    const occurrenceDate = typeof args.occurrenceDate === "string" ? args.occurrenceDate : "";
                    if (!id || !isValidLocalDateInput(occurrenceDate) || typeof args.completed !== "boolean") return {error: "事项 ID、日期或处理状态无效。"};
                    const item = this.occasionStore.occasions.find((candidate) => candidate.id === id);
                    if (!item) return {error: "找不到对应的日期事项。"};
                    const ok = await this.enqueueMutation(() => this.setOccasionCompleted(id, occurrenceDate, args.completed as boolean));
                    return ok ? {result: (args.completed ? "已处理" : "已取消处理") + "日期事项“" + item.name + "”。", structuredContent: {id, occurrenceDate, completed: args.completed}} : {error: "事项状态保存失败。"};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-list-upcoming",
                title: "查询小驴打卡近期事项",
                description: "查询未来指定天数内即将发生的日期事项（生日、还款、体检等），按剩余天数排序。该能力只读本地数据。",
                inputSchema: {type: "object", properties: {days: {type: "number", description: "查询未来多少天，默认 30，最大 365"}}, additionalProperties: false},
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const days = Math.min(365, Math.max(1, Math.round(Number(args.days) || 30)));
                    const today = dateKey(currentCalendarDate());
                    const horizon = dateKey(new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() + days));
                    const items = this.occasionStore.occasions.filter((item) => item.enabled)
                        .map((item) => ({item, next: getOccurrenceDate(item, today)}))
                        .filter((entry) => typeof entry.next === "string" && entry.next <= horizon)
                        .sort((left, right) => (left.next as string).localeCompare(right.next as string));
                    return {result: "未来 " + days + " 天共有 " + items.length + " 个日期事项。", structuredContent: {days, occasions: items.map(({item, next}) => ({id: item.id, name: item.name, kind: item.kind, date: next, repeat: item.recurrence, note: item.note}))}};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-weekly-report",
                title: "生成小驴打卡周报",
                description: "根据最近一周的打卡记录生成纯文本周报，包含完成率、亮点与待改进。该能力只读本地数据。",
                inputSchema: {type: "object", properties: {}, additionalProperties: false},
                outputSchema: {type: "object"},
                effects: {localRead: true, dataEgress: true, externalCost: false},
                handler: async () => {
                    const summary = buildSummaryContext(this.store, "week");
                    const rate = summary.scheduledItems ? Math.round((summary.completedItems / summary.scheduledItems) * 100) : 0;
                    const top = [...summary.items].sort((left, right) => right.completionRate - left.completionRate).slice(0, 3);
                    const lines = [
                        "本周共 " + summary.totalEvents + " 条记录，" + summary.completedItems + "/" + summary.scheduledItems + " 项有完成（" + rate + "%）。",
                        ...top.map((item) => "· " + item.name + "：" + item.completedDays + "/" + item.scheduledDays + " 天（" + item.completionRate + "%）"),
                    ];
                    return {result: lines.join("\n"), structuredContent: {totalEvents: summary.totalEvents, completedItems: summary.completedItems, scheduledItems: summary.scheduledItems, rate}};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-create-item",
                title: "代建小驴打卡项",
                description: "在用户明确要求时创建一个新的打卡项目（名称必填，支持按时长/按次数等类型）。",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: {type: "string", description: "项目名称"},
                        kind: {type: "string", enum: ["binary", "count", "duration", "quantity", "custom"], description: "记录类型，默认 binary"},
                        target: {type: "number", description: "目标值，默认 1"},
                        unit: {type: "string", description: "单位，默认 次"},
                        group: {type: "string", description: "分组"},
                    },
                    required: ["name"],
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const name = typeof args.name === "string" ? args.name.trim().slice(0, 40) : "";
                    if (!name) return {error: "项目名称无效。"};
                    if (this.store.items.some((candidate) => !candidate.archived && candidate.name === name)) return {error: "已存在同名打卡项。"};
                    const kind = args.kind === "count" || args.kind === "duration" || args.kind === "quantity" || args.kind === "custom" ? args.kind : "binary";
                    const target = Number.isFinite(Number(args.target)) && Number(args.target) > 0 ? Number(args.target) : 1;
                    const now = new Date().toISOString();
                    const created = normalizeCheckinItem({id: makeId("item"), name, icon: "✓", kind, target, unit: typeof args.unit === "string" && args.unit.trim() ? args.unit.trim().slice(0, 16) : "次", schedule: {type: "daily"}, group: typeof args.group === "string" ? args.group.trim().slice(0, 32) : "", createdDate: dateKey(currentCalendarDate()), createdAt: now, updatedAt: now});
                    if (!created) return {error: "打卡项参数无效。"};
                    this.store = {...this.store, items: [...this.store.items, created]};
                    await this.persist();
                    this.render();
                    return {result: "已创建打卡项“" + created.name + "”。", structuredContent: {id: created.id, name: created.name}};
                },
            });
            plugin.addAgentCapability({
                name: "checkin-create-occasion",
                title: "代建小驴打卡日期事项",
                description: "在用户明确要求时创建一个日期事项（如生日提醒、还款提醒）。名称与日期必填，重复方式默认一次性。",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: {type: "string", description: "事项名称"},
                        date: {type: "string", description: "日期 YYYY-MM-DD"},
                        recurrence: {type: "string", enum: ["once", "annual", "monthly", "weekly"], description: "重复方式，默认 once"},
                    },
                    required: ["name", "date"],
                    additionalProperties: false,
                },
                outputSchema: {type: "object"},
                effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
                handler: async (args) => {
                    const name = typeof args.name === "string" ? args.name.trim().slice(0, 120) : "";
                    const date = typeof args.date === "string" ? args.date.trim() : "";
                    const recurrence = args.recurrence === "annual" || args.recurrence === "monthly" || args.recurrence === "weekly" ? args.recurrence : "once";
                    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return {error: "事项名称或日期无效。"};
                    const created = normalizeOccasion({name, kind: "scheduled", date, recurrence, remindBeforeDays: 3, enabled: true});
                    if (!created) return {error: "日期事项参数无效。"};
                    this.occasionStore = {...this.occasionStore, occasions: [...this.occasionStore.occasions, created]};
                    await this.persistOccasions();
                    this.render();
                    return {result: "已创建日期事项“" + created.name + "”（" + date + "）。", structuredContent: {id: created.id, name: created.name, date}};
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
        if (this.currentPage !== "editor") {
            this.render();
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
            root.querySelector(".lc-checkin")?.insertAdjacentHTML("afterbegin",
                `<div class="lc-checkin__mobile-topbar"><button class="lc-checkin__topbar-close" type="button" data-action="close-dialog" aria-label="关闭">✕</button><strong class="lc-checkin__topbar-title">${this.getPageTitle()}</strong><span class="lc-checkin__topbar-spacer"></span></div>`);
        }
        const layout = root.querySelector<HTMLElement>(".lc-checkin__layout");
        if (layout) {
            layout.insertAdjacentHTML("afterbegin", this.renderRail());
            if (this.currentPage !== "editor") layout.insertAdjacentHTML("beforeend", this.renderMobileNav());
            if (this.focusTimerState && this.focusTimerRoot === root) layout.insertAdjacentHTML("beforeend", this.renderFocusTimerPanel());
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

    private renderSettings(): string {
        const agentStatus = this.agentCapabilityRegistered ? t("set.agentOn") : t("set.agentOff");
        const photoEvents = this.store.events.filter((event) => event.attachment);
        const photoKb = Math.max(0, Math.round(photoEvents.reduce((sum, event) => sum + (event.attachment?.length || 0), 0) * 0.75 / 1024));
        const iconKb = Math.max(0, Math.round(this.customIconLibrary.reduce((sum, icon) => sum + icon.length, 0) * 0.75 / 1024));
        const storageKb = Math.max(1, Math.round((this.store.events.length * 160 + this.store.items.length * 320) * 0.75 / 1024) + photoKb + iconKb);
        const auditLabel = (type: string) => type === "conflict" ? t("set.auditConflict") : type === "merge" ? t("set.auditMerge") : type === "restore" ? t("set.auditRestore") : t("set.auditMigration");
        const auditRows = this.auditEntries.slice(-5).reverse().map((entry) => `<li><strong>${auditLabel(entry.type)}</strong><small>${escapeHtml(new Date(entry.at).toLocaleString())} · ${escapeHtml(JSON.stringify(entry.details))}</small></li>`).join("");
        const kbdRow = (label: string, hint: string, keys: string[]) => `<div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${label}</span><small>${hint}</small></span><span class="lc-checkin__kbd-group">${keys.map((key) => `<kbd class="lc-checkin__kbd">${key}</kbd>`).join('<span class="lc-checkin__kbd-plus" aria-hidden="true">+</span>')}</span></div>`;
        const groups: Array<{id: string; label: string; body: string}> = [
            {
                id: "appearance",
                label: t("set.groupAppearance"),
                body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.theme")}</span><small>${t("set.themeHint")}</small></span><select data-setting-appearance aria-label="${t("set.theme")}"><option value="system" ${this.appearance === "system" ? "selected" : ""}>${t("set.themeSystem")}</option><option value="light" ${this.appearance === "light" ? "selected" : ""}>${t("set.themeLight")}</option><option value="dark" ${this.appearance === "dark" ? "selected" : ""}>${t("set.themeDark")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.reduceMotion")}</span><small>${t("set.reduceMotionHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-motion ${this.reducedMotion ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.accent")}</span><small>${t("set.accentHint")}</small></span><select data-setting-palette aria-label="${t("set.accent")}"><option value="lavender"${this.palette === "lavender" ? " selected" : ""}>${t("set.paletteLavender")}</option><option value="ocean"${this.palette === "ocean" ? " selected" : ""}>${t("set.paletteOcean")}</option><option value="forest"${this.palette === "forest" ? " selected" : ""}>${t("set.paletteForest")}</option><option value="sunset"${this.palette === "sunset" ? " selected" : ""}>${t("set.paletteSunset")}</option></select></label>`,
            },
            {
                id: "today",
                label: t("set.groupToday"),
                body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.groupModeLabel")}</span><small>${t("set.groupModeHint")}</small></span><select data-setting-group aria-label="${t("set.groupModeLabel")}"><option value="none"${this.todayGroupMode === "none" ? " selected" : ""}>${t("set.groupNone")}</option><option value="group"${this.todayGroupMode === "group" ? " selected" : ""}>${t("set.groupCustom")}</option><option value="time" ${this.todayGroupMode === "time" ? "selected" : ""}>${t("set.groupTime")}</option><option value="priority" ${this.todayGroupMode === "priority" ? "selected" : ""}>${t("set.groupPriority")}</option></select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.sortModeLabel")}</span><small>${t("set.sortModeHint")}</small></span><select data-setting-sort aria-label="${t("set.sortModeLabel")}">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${this.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.expandCompleted")}</span><small>${t("set.expandCompletedHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-completed ${!this.completedCollapsed ? "checked" : ""} /></label>
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.weekStrip")}</span><small>${t("set.weekStripHint")}</small></span><input type="checkbox" class="lc-checkin__switch" data-setting-weekstrip ${this.weekStripVisible ? "checked" : ""} /></label>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetView")}</span><small>${t("set.resetViewHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-view-preferences">${t("set.reset")}</button></div>`,
            },
            {
                id: "dialog",
                label: t("set.groupDialog"),
                body: `
                    <label class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.dialogSize")}</span><small>${t("set.dialogSizeHint")}</small></span><select data-setting-dialog-mode aria-label="${t("set.dialogSize")}"><option value="percent" ${this.dialogSizeMode === "percent" ? "selected" : ""}>${t("set.dialogPercent")}</option><option value="fullscreen" ${this.dialogSizeMode === "fullscreen" ? "selected" : ""}>${t("set.dialogFullscreen")}</option><option value="fixed" ${this.dialogSizeMode === "fixed" ? "selected" : ""}>${t("set.dialogFixed")}</option></select></label>
                    <label class="lc-checkin__settings-row" data-dialog-scale-row ${this.dialogSizeMode === "percent" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.scaleLabel")}</span><small>${t("set.scaleCurrent", {n: this.dialogScale})}</small></span><input type="range" min="50" max="100" step="5" value="${this.dialogScale}" data-setting-dialog-scale aria-label="${t("set.scaleLabel")}" /></label>
                    <div class="lc-checkin__settings-row" data-dialog-fixed-row ${this.dialogSizeMode === "fixed" ? "" : "hidden"}><span class="lc-checkin__settings-label"><span>${t("set.fixedWH")}</span><small>${t("set.fixedWHHint")}</small></span><span class="lc-checkin__settings-inline"><input type="number" min="320" max="2560" step="20" value="${this.dialogFixedSize.width}" data-setting-dialog-width aria-label="${t("set.dialogWidthAria")}" aria-describedby="lc-checkin-dialog-width-unit" /><span id="lc-checkin-dialog-width-unit">×</span><input type="number" min="240" max="2048" step="20" value="${this.dialogFixedSize.height}" data-setting-dialog-height aria-label="${t("set.dialogHeightAria")}" aria-describedby="lc-checkin-dialog-width-unit" /></span></div>`,
            },
            {
                id: "shortcuts",
                label: t("set.groupShortcuts"),
                body: `
                    ${kbdRow(t("set.shortcutsOpen"), t("set.shortcutsOpenHint"), ["Alt", "Shift", "C"])}
                    ${kbdRow(t("set.shortcutsQuick"), t("set.shortcutsQuickHint"), ["Alt", "1-9"])}
                    ${kbdRow(t("set.shortcutsReorder"), t("set.shortcutsReorderHint"), ["Alt", "↑ / ↓"])}`,
            },
            {
                id: "data",
                label: t("set.groupData"),
                body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.exportRecords")}</span><small>${t("set.exportHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="review">${t("set.openReview")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.storageLabel")}</span><small>${t("set.storageDetail", {items: this.store.items.length, events: this.store.events.length})}${photoEvents.length ? ` · ${t("set.photosDetail", {n: photoEvents.length, kb: photoKb})}` : ""}${iconKb ? ` · ${t("set.iconsDetail", {kb: iconKb})}` : ""}。</small></span><span class="lc-checkin__settings-value">${storageKb} KB</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importJson")}</span><small>${t("set.importJsonHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-import-json accept=".json,application/json" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.restoreSnapshot")}</span><small>${t("set.restoreSnapshotHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="restore-backup">${t("set.restoreSnapshotBtn")}</button></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.audit")}</span><small>${t("set.auditHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="clear-audit">${t("set.clearAudit")}</button></div>
                    <div class="lc-checkin__audit-list" aria-label="${t("set.audit")}">${auditRows ? `<ul>${auditRows}</ul>` : `<small>${t("set.auditEmpty")}</small>`}</div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.importCsv")}</span><small>${t("set.importCsvHint")}</small></span><label class="lc-checkin__file-button"><input type="file" data-import-csv accept=".csv,text/csv" />${t("set.chooseFile")}</label></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.resetPrefs")}</span><small>${t("set.resetPrefsHint")}</small></span><button class="lc-checkin__text-button" type="button" data-action="reset-all-preferences">${t("set.resetDefaults")}</button></div>`,
            },
            {
                id: "integrations",
                label: t("set.groupIntegrations"),
                body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.tomato")}</span><small>${t("set.tomatoHint")}</small></span><span class="lc-checkin__settings-value">${t("set.tomatoPending")}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.agent")}</span><small>${t("set.agentHint")}</small></span><span class="lc-checkin__settings-value">${agentStatus}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.customIcons")}</span><small>${t("set.customIconsHint")}</small></span><span class="lc-checkin__settings-value">${t("set.countSuffix", {n: this.customIconLibrary.length})}</span></div>`,
            },
            {
                id: "about",
                label: t("set.groupAbout"),
                body: `
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.versionLabel")}</span><small>${t("set.versionHint")}</small></span><span class="lc-checkin__settings-value">${PLUGIN_VERSION}</span></div>
                    <div class="lc-checkin__settings-row"><span class="lc-checkin__settings-label"><span>${t("set.homepage")}</span><small>${t("set.homepageHint")}</small></span><a class="lc-checkin__settings-link" href="https://github.com/ai68298100/siyuan-checkin" target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>`,
            },
        ];
        return `<div class="lc-checkin lc-checkin--settings" data-appearance="${this.resolvedAppearance()}">
            <header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${t("set.personal")}</div><h1 class="lc-checkin__title">${t("settings.title")}</h1></div></header>
            <div class="lc-checkin__settings-layout">
                <nav class="lc-checkin__settings-nav" aria-label="设置分组">${groups.map((group, index) => `<button type="button" data-settings-nav="${group.id}" class="${index === 0 ? "is-active" : ""}" aria-current="${index === 0 ? "true" : "false"}">${group.label}</button>`).join("")}</nav>
                <div class="lc-checkin__settings-groups">${groups.map((group) => `<section class="lc-checkin__settings-card" data-settings-group="${group.id}"><h2>${group.label}</h2>${group.body}</section>`).join("")}</div>
            </div>
        </div>`;
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
        root.querySelector<HTMLElement>("[data-action='reset-view-preferences']")?.addEventListener("click", () => { this.applyViewPreferences({...DEFAULT_VIEW_PREFERENCES, appearance: this.appearance, reducedMotion: this.reducedMotion, dialogSizeMode: this.dialogSizeMode, dialogScale: this.dialogScale, dialogFixedSize: {...this.dialogFixedSize}}); void this.persistViewPreferences(); this.render(); });
        root.querySelector<HTMLElement>("[data-action='reset-all-preferences']")?.addEventListener("click", () => { if (!window.confirm(t("msg.prefsResetConfirm"))) return; this.applyViewPreferences(DEFAULT_VIEW_PREFERENCES); void this.persistViewPreferences().then(() => showMessage(t("msg.prefsReset"))); this.render(); });
        root.querySelector<HTMLElement>("[data-action='review']")?.addEventListener("click", () => this.showReview());
        root.querySelector<HTMLElement>("[data-action='restore-backup']")?.addEventListener("click", () => void this.restoreLatestBackup());
        root.querySelector<HTMLElement>("[data-action='clear-audit']")?.addEventListener("click", () => { this.auditEntries = []; void this.saveData(AUDIT_STORAGE_NAME, []); this.render(); });
        root.querySelector<HTMLInputElement>("[data-import-json]")?.addEventListener("change", async (event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            if (!file) return;
            try {
                const backup = parseJsonBackup(await file.text(), normalizeStore);
                const {itemCount, eventCount, archivedItemCount, dateRange} = backup.summary;
                const rangeLabel = dateRange ? `，日期 ${dateRange.from} 至 ${dateRange.to}` : "";
                const warningLabel = backup.warnings.length ? `\n\n兼容性提示：${backup.warnings.join("；")}` : "";
                    if (!window.confirm(t("msg.jsonRestoreConfirm", {items: itemCount, archived: archivedItemCount, events: eventCount, range: rangeLabel, warning: warningLabel}))) { input.value = ""; return; }
                const previous = this.store;
                this.store = backup.store;
                try {
                    await this.persist();
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
        const syncDialogRows = () => {
            if (scaleRow) scaleRow.hidden = this.dialogSizeMode !== "percent";
            if (fixedRow) fixedRow.hidden = this.dialogSizeMode !== "fixed";
        };
        modeSelect?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "percent" || value === "fullscreen" || value === "fixed") {
                this.dialogSizeMode = value;
                syncDialogRows();
                savePreference();
                this.render();
            }
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

    private bindQuickKeyboard(root: HTMLElement) {
        if (root.dataset.quickKeyboardBound === "true") return;
        root.dataset.quickKeyboardBound = "true";
        root.addEventListener("keydown", (event) => {
            if (this.currentPage !== "today") return;
            if (event.defaultPrevented || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
            const target = event.target as HTMLElement | null;
            if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
            const index = Number(event.key) - 1;
            if (!Number.isInteger(index) || index < 0 || index > 8) return;
            const items = this.getQuickTodayItems();
            const item = items[index];
            if (!item) return;
            event.preventDefault();
            const date = calendarDateFromKey(dateKey(currentCalendarDate()));
            const revision = getItemRevisionForDate(item, date);
            this.enqueueMutation(() => this.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit), captureActionMoment(), this.revisionFingerprint(item, date)));
        });
    }

    private getQuickTodayItems(): CheckinItem[] {
        const date = currentCalendarDate();
        return sortCheckinItems(this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, date) && isScheduledToday(item, date)), "priority");
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
        return `<nav class="lc-checkin__mobile-nav" aria-label="打卡导航">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}<button class="lc-checkin__mobile-fab" type="button" data-mobile-nav="add" aria-label="新建打卡项" title="新建打卡项">${uiIcon("add")}</button></nav>`;
    }

    /* Desktop-wide containers show a labelled left rail instead of the bottom bar.
       Both use data-mobile-nav so one binding covers them. */
    private renderRail(): string {
        const entries = [["today", "今日", "home"], ["review", "回顾", "summary"], ["occasions", "事项", "calendar"], ["archived", "归档", "archive"], ["settings", "设置", "settings"]] as const;
        return `<nav class="lc-checkin__rail" aria-label="打卡导航">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span>${uiIcon(icon)}</span><small>${label}</small></button>`).join("")}</nav>`;
    }

    /* 8.6 连续记录：按项目统计当前连续打卡天数（自然日粒度，从事件推导）。 */
    private computeStreaks(): Map<string, number> {
        const streaks = new Map<string, number>();
        const itemDays = new Map<string, Set<string>>();
        for (const event of this.store.events) {
            if (!itemDays.has(event.itemId)) itemDays.set(event.itemId, new Set());
            itemDays.get(event.itemId)!.add(event.localDate);
        }
        const today = dateKey(currentCalendarDate());
        const yesterdayDate = new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() - 1);
        const yesterday = dateKey(yesterdayDate);
        for (const item of this.store.items) {
            if (item.archived) { streaks.set(item.id, 0); continue; }
            const days = itemDays.get(item.id);
            if (!days || !days.size) { streaks.set(item.id, 0); continue; }
            // 从今天或昨天开始往回数（今天没打卡但昨天打了也不断）
            let startKey = today;
            if (!days.has(startKey)) startKey = yesterday;
            if (!days.has(startKey)) { streaks.set(item.id, 0); continue; }
            let streak = 0;
            const check = new Date(Number(startKey.slice(0, 4)), Number(startKey.slice(5, 7)) - 1, Number(startKey.slice(8, 10)));
            while (days.has(dateKey(check))) {
                streak += 1;
                check.setDate(check.getDate() - 1);
            }
            streaks.set(item.id, streak);
        }
        return streaks;
    }

    private renderToday(): string {
        const now = currentCalendarDate();
        const activeItems = this.store.items.filter((item) => !item.archived);
        const scheduledItems = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, now) && isScheduledToday(item, now));
        const query = this.todayQuery.trim().toLocaleLowerCase();
        const visibleItems = query
            ? scheduledItems.filter((item) => `${item.name} ${item.group || ""}`.toLocaleLowerCase().includes(query))
            : scheduledItems;
        const filteredItems = this.pendingOnly ? visibleItems.filter((item) => !isComplete(this.store, item, now)) : visibleItems;
        const pendingItems = sortCheckinItems(filteredItems.filter((item) => !isComplete(this.store, item, now)), this.todaySortMode);
        const completedItems = sortCheckinItems(filteredItems.filter((item) => isComplete(this.store, item, now)), this.todaySortMode);
        const completed = scheduledItems.filter((item) => isComplete(this.store, item, now)).length;
        const pending = Math.max(0, scheduledItems.length - completed);
        const completionRate = scheduledItems.length ? Math.round((completed / scheduledItems.length) * 100) : 0;
        const weekStrip = Array.from({length: 7}, (_, index) => {
            const day = new Date(now);
            day.setDate(now.getDate() - (6 - index));
            const items = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, day) && isScheduledToday(item, day));
            const done = items.filter((item) => isComplete(this.store, item, day)).length;
            const status = !items.length ? "empty" : done === items.length ? "complete" : done ? "partial" : "pending";
            const isToday = dateKey(day) === dateKey(now);
            return `<span class="lc-checkin__day-chip is-${status} ${isToday ? "is-today" : ""}" title="${escapeHtml(t("date.chipTitle", {date: day.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric"}), done, total: items.length}))}"><small>${day.toLocaleDateString(getPluginLocale(), {weekday: "short"})}</small><strong>${day.getDate()}</strong><i aria-hidden="true"></i></span>`;
        }).join("");
        const backupNeeded = this.store.events.length >= 30 && (!this.lastExportAt || Date.now() - Date.parse(this.lastExportAt) > 30 * 86400000);
        const emptyProgressTitle = this.pendingOnly
            ? t("today.pendingEmpty")
            : query ? t("today.queryCompleted") : t("today.allDone");
        const date = now.toLocaleDateString(getPluginLocale(), {month: "long", day: "numeric", weekday: "long"});
        const list = !activeItems.length && this.store.items.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">▱</div>
                <div class="lc-checkin__empty-title">${t("today.emptyActiveTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyActiveDesc")}</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="archived">${t("today.viewArchived")}</button><button class="lc-checkin__text-button" type="button" data-action="add">${t("nav.add")}</button></div>
            </div>` : !activeItems.length ? `
            <div class="lc-checkin__empty lc-checkin__empty--onboard">
                <div class="lc-checkin__empty-mark">✦</div>
                <div class="lc-checkin__empty-title">${t("today.emptyOnboardTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyOnboardDesc")}</div>
                <ol class="lc-checkin__onboard-steps">
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">1</span><div><strong>${t("today.step1Title")}</strong><small>${t("today.step1Desc")}</small></div></li>
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">2</span><div><strong>${t("today.step2Title")}</strong><small>${t("today.step2Desc")}</small></div></li>
                    <li><span class="lc-checkin__onboard-num" aria-hidden="true">3</span><div><strong>${t("today.step3Title")}</strong><small>${t("today.step3Desc")}</small></div></li>
                </ol>
                <button class="lc-checkin__text-button" type="button" data-action="add">${t("today.addFirst")}</button>
            </div>` : !scheduledItems.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">◷</div>
                <div class="lc-checkin__empty-title">${t("today.emptyScheduledTitle")}</div>
                <div class="lc-checkin__empty-description">${t("today.emptyScheduledDesc")}</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="history">${t("today.viewHistory")}</button><button class="lc-checkin__text-button" type="button" data-action="add">${t("nav.add")}</button></div>
            </div>` : !visibleItems.length ? `
            <div class="lc-checkin__today-search-empty">
                <span>⌕</span><strong>${t("today.searchEmpty")}</strong><small>${t("today.searchEmptyHint")}</small>
                <button class="lc-checkin__text-button" type="button" data-action="clear-search">${t("common.clearFilter")}</button>
            </div>` : `${pendingItems.length
            ? this.renderTodayGroups(pendingItems, now)
            : `<div class="lc-checkin__all-done"><span>✓</span><strong>${emptyProgressTitle}</strong></div>`}
            ${completedItems.length ? `<section class="lc-checkin__completed-section">
                <button class="lc-checkin__section-toggle" type="button" data-action="toggle-completed" aria-expanded="${!this.completedCollapsed}">
                    <span class="lc-checkin__section-title"><i>✓</i> ${t("today.completed")}</span>
                    <span class="lc-checkin__section-count">${completedItems.length}</span>
                    <span class="lc-checkin__chevron">${this.completedCollapsed ? "⌄" : "⌃"}</span>
                </button>
                <div class="lc-checkin__group-items" ${this.completedCollapsed ? "hidden" : ""}>${completedItems.map((item) => this.renderItem(item, now)).join("")}</div>
            </section>` : ""}`;
        const recentRecord = this.recentRecord ? `<div class="lc-checkin__recent-record" role="status" aria-live="polite">
            <span><i>✓</i><strong>${escapeHtml(this.recentRecord.message)}</strong><small>当前 ${escapeHtml(formatNumber(this.recentRecord.progress))}/${escapeHtml(formatNumber(this.recentRecord.target))} ${escapeHtml(this.recentRecord.unit)}</small></span>
            <button type="button" data-action="undo-record">撤销</button>
        </div>` : "";
        this.currentStreaks = this.computeStreaks();
        let bestStreakId = "";
        let bestStreak = 0;
        for (const [id, streak] of this.currentStreaks) {
            if (streak > bestStreak) { bestStreak = streak; bestStreakId = id; }
        }
        this.bestStreakItem = bestStreakId ? this.store.items.find((item) => item.id === bestStreakId) : undefined;
        this.bestStreakValue = bestStreak;
        const saveStatus = this.renderSaveStatus();
        const occasionBanner = this.renderOccasionSection(now);
        return `<div class="lc-checkin lc-checkin--today" data-appearance="${this.resolvedAppearance()}" data-reduced-motion="${this.reducedMotion}">
            <header class="lc-checkin__header">
                <div class="lc-checkin__header-titles">
                    <h1 class="lc-checkin__title">${t("today.title")}</h1>
                    <span class="lc-checkin__header-date">${escapeHtml(date)}</span>
                </div>
                <div class="lc-checkin__header-actions">
                    ${this.bestStreakValue > 1 && this.bestStreakItem ? `<span class="lc-checkin__header-streak" title="当前最佳连续">🔥 ${escapeHtml(this.bestStreakItem.name)} ${this.bestStreakValue} 天</span>` : ""}
                    <span class="lc-checkin__count" role="status" aria-label="今日完成进度">${completed}<span>/</span>${scheduledItems.length}</span>
                    ${this.supportsCustomTab ? `<button class="lc-checkin__small-button" type="button" data-action="open-tab" aria-label="在页签打开" title="在页签打开">${uiIcon("external")}</button>` : ""}
                    <button class="lc-checkin__icon-button" type="button" data-action="add" aria-label="新建打卡项" title="新建打卡项">${uiIcon("add")}</button>
                </div>
            </header>
            <div class="lc-checkin__progress"><span style="width: ${completionRate}%"></span></div>
            ${this.weekStripVisible ? `<section class="lc-checkin__week-strip" aria-label="最近七天打卡状态">${weekStrip}</section>` : ""}
            ${recentRecord}
            ${saveStatus}
            ${scheduledItems.length ? `<div class="lc-checkin__organize">
                <label class="lc-checkin__today-search"><span aria-hidden="true">⌕</span><input data-today-search type="search" value="${escapeHtml(this.todayQuery)}" placeholder="${t("today.filterPlaceholder")}" aria-label="筛选打卡项" />${this.todayQuery ? `<button type="button" data-action="clear-search" aria-label="清除筛选" title="清除筛选">×</button>` : ""}</label>
                <details class="lc-checkin__today-filters" data-today-filters ${this.pendingOnly ? "open" : ""}><summary>${this.pendingOnly ? t("today.filterActive") : t("today.filter")}</summary><div class="lc-checkin__today-filter-fields"><label><span>${t("today.group")}</span><select data-group-mode aria-label="${t("today.groupMode")}">
                    <option value="group" ${this.todayGroupMode === "group" ? "selected" : ""}>自定义分组</option>
                    <option value="time" ${this.todayGroupMode === "time" ? "selected" : ""}>时间段</option>
                    <option value="priority" ${this.todayGroupMode === "priority" ? "selected" : ""}>重要性</option>
                </select></label><label><span>排序</span><select data-sort-mode aria-label="排序方式">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${this.todaySortMode === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label><button class="lc-checkin__filter-toggle ${this.pendingOnly ? "is-active" : ""}" type="button" data-action="toggle-pending-only" aria-pressed="${this.pendingOnly}">${t("today.pendingOnly")}</button></div></details>
                <button class="lc-checkin__filter-toggle ${this.bulkMode ? "is-active" : ""}" type="button" data-action="toggle-bulk" aria-pressed="${this.bulkMode}">${t("today.bulk")}</button>
            </div>` : ""}
            ${this.bulkMode ? `<div class="lc-checkin__bulk-bar" role="toolbar" aria-label="批量操作">
                <strong>已选 ${this.bulkSelected.size}</strong>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-all">全选待办</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-complete">全部完成</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-archive">归档</button>
                <button class="lc-checkin__text-button" type="button" data-action="bulk-exit">退出多选</button>
            </div>` : ""}
            ${this.celebration ? `<div class="lc-checkin__celebration" role="status"><span class="lc-checkin__celebration-icon" aria-hidden="true">🎉</span><span>专注 <strong>${this.celebration.message}</strong> 已完成 · ${this.celebration.itemName}</span></div>` : ""}
            ${backupNeeded ? `<div class="lc-checkin__backup-reminder" role="note"><span>已积累 <strong>${this.store.events.length}</strong> 条记录，建议导出备份。</span><button class="lc-checkin__text-button" type="button" data-action="review">去导出</button></div>` : ""}
            <main class="lc-checkin__list">${list}${occasionBanner}</main>
        </div>`;
    }

    private renderOccasionSection(date: Date): string {
        const items = getVisibleOccasions(this.occasionStore, date).slice(0, 3);
        const chips = items.map((item) => {
            const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
            const timing = item.status === "today" ? "今天" : `${item.daysUntil} 天后`;
            const completed = isOccasionCompleted(item, item.occurrenceDate);
            return `<button type="button" class="lc-checkin__occasion-chip ${completed ? "is-complete" : ""}" data-action="occasions" title="${escapeHtml(item.name)} · ${timing}"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(item.name)}</strong><small>${timing}</small></button>`;
        }).join("");
        return `<section class="lc-checkin__occasion-banner" aria-label="${t("today.occasionTitle")}">
            <span class="lc-checkin__occasion-banner-icon" aria-hidden="true">${uiIcon("calendar")}</span>
            <div class="lc-checkin__occasion-banner-body">
                <strong>${t("today.occasionTitle")}</strong>
                ${items.length ? `<div class="lc-checkin__occasion-chips">${chips}</div>` : `<small>${t("today.occasionEmpty")}</small>`}
            </div>
            <button class="lc-checkin__text-button" type="button" data-action="occasions">管理</button>
        </section>`;
    }

    private renderSaveStatus(): string {
        return this.saveState === "saving"
            ? `<div class="lc-checkin__save-status is-saving" role="status" aria-live="polite">正在保存…</div>`
            : this.saveState === "error"
                ? `<div class="lc-checkin__save-status is-error" role="alert"><span>保存失败</span><button type="button" data-action="retry-save">重试保存</button></div>`
                : "";
    }

    private renderSyncNotice(): string {
        return this.syncNoticeTimer !== undefined
            ? `<div class="lc-checkin__sync-notice" role="status" aria-live="polite">已同步其他窗口更新</div>`
            : "";
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

    private renderReview(): string {
        const eventsByDay = new Map<string, CheckinEvent[]>();
        this.store.events.forEach((event) => {
            const key = getEventDateKey(event);
            const dayEvents = eventsByDay.get(key);
            if (dayEvents) {
                dayEvents.push(event);
            } else {
                eventsByDay.set(key, [event]);
            }
        });
        const itemNames = new Map(this.store.items.map((item) => [item.id, item.name]));
        const year = this.historyMonth.getFullYear();
        const month = this.historyMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
        const activeItems = this.store.items;
        const today = dateKey(new Date());
        const calendarCells = [
            ...Array.from({length: leadingDays}, () => `<span class="lc-checkin__calendar-empty"></span>`),
            ...Array.from({length: daysInMonth}, (_, index) => {
                const date = new Date(year, month, index + 1);
                const key = dateKey(date);
                const scheduled = activeItems.filter((item) => isItemAvailableOnDate(item, date) && isScheduledToday(item, date));
                const completed = scheduled.filter((item) => isComplete(this.store, item, date)).length;
                const eventCount = eventsByDay.get(key)?.length || 0;
                const rate = scheduled.length ? completed / scheduled.length : 0;
                const level = rate >= 1 ? 4 : rate >= .66 ? 3 : rate > 0 ? 2 : eventCount ? 1 : 0;
                const future = key > today;
                const classes = [
                    "lc-checkin__calendar-day",
                    `is-level-${level}`,
                    this.selectedHistoryDate === key ? "is-selected" : "",
                    key === today ? "is-today" : "",
                ].filter(Boolean).join(" ");
                const label = `${formatHistoryDate(key)}，${completed}/${scheduled.length} 项完成，${eventCount} 条记录`;
                return `<button class="${classes}" type="button" data-history-date="${key}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${future ? "disabled" : ""}><span>${index + 1}</span>${eventCount ? `<b>${eventCount > 999 ? "999+" : eventCount}</b>` : ""}</button>`;
            }),
        ].join("");
        const selectedEvents = eventsByDay.get(this.selectedHistoryDate) || [];
        const selectedRecords = selectedEvents.map((event) => ({
            event,
            itemName: itemNames.get(event.itemId) || t("review.deletedItem"),
        }));
        const filteredRecords = filterHistoryRecords(selectedRecords, {
            query: this.historyQuery,
            source: this.historySource,
            order: this.historyOrder,
        });
        const filteredEvents = filteredRecords.map((record) => record.event);
        const totals = new Map<string, {name: string; unit: string; value: number}>();
        filteredEvents.forEach((event) => {
            const key = `${event.itemId}\u0000${event.unit}`;
            const current = totals.get(key);
            totals.set(key, {
                name: itemNames.get(event.itemId) || t("review.deletedItem"),
                unit: event.unit,
                value: (current?.value || 0) + event.value,
            });
        });
        const aggregateDetails = totals.size ? [...totals.values()].map((entry) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(formatNumber(entry.value))}${escapeHtml(entry.unit)}</span></div>`).join("") : "";
        const hasHistoryFilter = Boolean(this.historyQuery.trim()) || this.historySource !== "all";
        const eventDetails = filteredRecords.length ? `<div class="lc-checkin__history-events">${filteredRecords.map(({event, itemName}) => {
            const time = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
            const note = event.note ? `<small class="lc-checkin__history-event-note">${renderRecordNote(event.note)}</small>` : "";
            const noteEditor = this.editingHistoryNoteId === event.id ? `<textarea class="lc-checkin__history-note-editor" data-history-note-input="${escapeHtml(event.id)}" rows="2">${escapeHtml(event.note || "")}</textarea><button class="lc-checkin__text-button" type="button" data-save-history-note-id="${escapeHtml(event.id)}">保存备注</button>` : "";
            const photoThumb = event.attachment ? `<img class="lc-checkin__history-thumb" src="${event.attachment}" alt="打卡照片" loading="lazy" />` : "";
            const sourceLabel = t(`source.${event.source}`) || event.source;
            return `<div class="lc-checkin__history-event">${photoThumb}<div class="lc-checkin__history-event-main"><strong>${escapeHtml(itemName)}</strong><span>${escapeHtml(time)} · ${escapeHtml(sourceLabel)}</span>${note}${noteEditor}</div><span class="lc-checkin__history-event-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span><div class="lc-checkin__history-event-actions">${this.store.items.some((item) => item.id === event.itemId && !item.archived) ? `<button class="lc-checkin__text-button" type="button" data-history-insights-id="${escapeHtml(event.itemId)}" aria-label="查看${escapeHtml(itemName)}复盘">复盘</button>` : ""}<button class="lc-checkin__text-button" type="button" data-edit-history-event-id="${escapeHtml(event.id)}" aria-label="编辑${escapeHtml(itemName)} ${escapeHtml(time)} 的备注">备注</button><button class="lc-checkin__text-button" type="button" data-history-event-id="${escapeHtml(event.id)}" aria-label="撤销${escapeHtml(itemName)} ${escapeHtml(time)} 的记录">撤销</button></div></div>`;
        }).join("")}</div>` : `<div class="lc-checkin__history-empty">${selectedEvents.length ? "没有符合当前筛选条件的记录" : "当天没有记录"}</div>`;
        const details = aggregateDetails + eventDetails;
        const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const nextDisabled = this.historyMonth >= currentMonth;
        const historySourceOptions = HISTORY_SOURCE_OPTIONS.map((value) => `<option value="${value}" ${this.historySource === value ? "selected" : ""}>${escapeHtml(t(`source.${value}`))}</option>`).join("");
        const historyOrderOptions = [["newest", "最新在前"], ["oldest", "最早在前"]] as const;
        const resultLabel = hasHistoryFilter ? `显示 ${filteredEvents.length} / ${selectedEvents.length} 条记录` : `${selectedEvents.length} 条记录`;
        const historyTools = `<details class="lc-checkin__history-filter-disclosure" ${hasHistoryFilter ? "open" : ""}><summary>${hasHistoryFilter ? t("review.searchOn") : t("review.searchTitle")}</summary><section class="lc-checkin__history-tools" role="search" aria-label="${t("review.searchAria")}"><label class="lc-checkin__history-search lc-checkin__search-field"><span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span><input data-history-search type="search" value="${escapeHtml(this.historyQuery)}" placeholder="${t("review.searchAria")}" aria-label="${t("review.searchAria")}" enterkeyhint="search" />${this.historyQuery ? `<button type="button" data-action="clear-history-query" aria-label="${t("review.clearSearch")}" title="${t("review.clearSearchTitle")}">×</button>` : ""}</label><div class="lc-checkin__history-filter-row"><label><span>${t("review.sourceLabel")}</span><select data-history-source aria-label="${t("review.sourceAria")}">${historySourceOptions}</select></label><label><span>${t("review.orderLabel")}</span><select data-history-order aria-label="${t("review.orderAria")}">${historyOrderOptions.map(([value, label]) => `<option value="${value}" ${this.historyOrder === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></label></div></section></details>`;

        const summary = this.summaryCustomRange ? buildCustomSummaryContext(this.store, this.summaryCustomRange) : buildSummaryContext(this.store, this.summaryRange);
        const iconsById = new Map(this.store.items.map((item) => [item.id, item.icon]));
        const projectRows = summary.items.length ? summary.items.map((item) => {
            const quotaMeta = item.quota
                ? t("review.quotaPeriods", {done: item.quota.completedPeriods, elapsed: item.quota.elapsedPeriods, current: item.quota.current ? `${formatNumber(item.quota.current.progress)}/${formatNumber(item.quota.current.quota)}` : t("review.quotaNone")})
                : t("review.daysRatio", {done: item.completedDays, scheduled: item.scheduledDays, rate: item.completionRate});
            return `<button type="button" class="lc-checkin__review-item" data-review-insights-id="${escapeHtml(item.itemId)}"><span class="lc-checkin__review-item-icon" aria-hidden="true">${escapeHtml(iconsById.get(item.itemId) || "✓")}</span><strong>${escapeHtml(item.name)}</strong><span class="lc-checkin__review-item-meta">${escapeHtml(quotaMeta)}</span><i class="lc-checkin__review-item-bar" aria-hidden="true"><span style="width: ${Math.min(100, Math.max(0, item.completionRate))}%"></span></i></button>`;
        }).join("") : `<div class="lc-checkin__empty-description">${t("review.emptyProjects")}</div>`;
        const groupMap = new Map<string, {name: string; completed: number; scheduled: number}>();
        for (const item of summary.items) {
            const storeItem = this.store.items.find((candidate) => candidate.id === item.itemId);
            const group = storeItem?.group || t("review.ungrouped");
            const entry = groupMap.get(group) || {name: group, completed: 0, scheduled: 0};
            entry.completed += item.completedDays;
            entry.scheduled += item.scheduledDays;
            groupMap.set(group, entry);
        }
        const groupBars = [...groupMap.values()]
            .filter((entry) => entry.scheduled > 0)
            .sort((left, right) => right.completed / right.scheduled - left.completed / left.scheduled)
            .map((entry) => {
                const rate = Math.round((entry.completed / entry.scheduled) * 100);
                return `<div class="lc-checkin__balance-row"><strong>${escapeHtml(entry.name)}</strong><span>${entry.completed}/${entry.scheduled}</span><i class="lc-checkin__balance-bar"><span style="width:${Math.min(100, Math.round((entry.completed / Math.max(1, entry.scheduled)) * 100))}%"></span></i><em>${rate}%</em></div>`;
            }).join("");
        const heatmapYear = new Date().getFullYear() + this.heatmapYearOffset;
        const heatmap = buildYearHeatmap(this.store, heatmapYear);
        const weeklyTrend = buildWeeklyCompletionTrend(this.store, 12);
        const monthlyTrend = buildMonthlyEventTrend(this.store, 6);
        const achievements = buildAchievements(this.store);
        const earnedCount = achievements.filter((entry) => entry.achieved).length;
        const providerButton = this.summaryProviders.size
            ? `<div class="lc-checkin__summary-agent"><span>${t("review.agentConnected")}</span><button class="lc-checkin__text-button" type="button" data-action="generate-summary">${t("review.agentGenerate")}</button></div>`
            : `<div class="lc-checkin__summary-agent is-unavailable" role="note"><span>${t("review.agentUnavailable")}</span></div>`;
        const generated = this.summaryText ? `<div class="lc-checkin__summary-text">${escapeHtml(this.summaryText)}</div>` : "";
        const tabs = (["day", "week", "month"] as SummaryRange[]).map((range) => `<button type="button" data-summary-range="${range}" class="${!this.summaryCustomRange && this.summaryRange === range ? "is-selected" : ""}">${range === "day" ? t("review.tabDay") : range === "month" ? t("review.tabMonth") : t("review.tabWeek")}</button>`).join("");
        const custom = `<details class="lc-checkin__custom-range-disclosure" ${this.summaryCustomRange ? "open" : ""}><summary>${this.summaryCustomRange ? t("review.customOn") : t("review.custom")}</summary><form class="lc-checkin__custom-range" data-custom-range><label><span>开始</span><input type="date" name="customStartDate" value="${escapeHtml(this.summaryCustomRange?.startDate || summary.startDate)}" required /></label><span class="lc-checkin__custom-range-separator">至</span><label><span>结束</span><input type="date" name="customEndDate" value="${escapeHtml(this.summaryCustomRange?.endDate || summary.endDate)}" required /></label><button type="submit" class="lc-checkin__text-button">应用</button></form></details>`;
        return `<div class="lc-checkin lc-checkin--review" data-appearance="${this.resolvedAppearance()}">
            <header class="lc-checkin__editor-header">
                <div><div class="lc-checkin__eyebrow">${t("review.eyebrow")}</div><h1 class="lc-checkin__title">${t("review.title")}</h1></div>
                <div class="lc-checkin__header-actions">
                    <div class="lc-checkin__range-tabs" role="tablist" aria-label="${t("review.rangeAria")}">${tabs}${custom}</div>
                    <button class="lc-checkin__text-button" type="button" data-action="copy-weekly-report">${t("review.copyReport")}</button>
                    <button class="lc-checkin__text-button" type="button" data-action="archived">${t("review.archived")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="export-json" aria-label="${t("review.exportJson")}" title="${t("review.exportJson")}">${uiIcon("summary")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="export-csv" aria-label="${t("review.exportCsv")}" title="${t("review.exportCsv")}">${uiIcon("history")}</button>
                </div>
            </header>
            <section class="lc-checkin__summary-stats" aria-label="范围统计"><div><strong>${summary.totalEvents}</strong><span>${t("review.statEvents")}</span></div><div><strong>${summary.completedItems}</strong><span>${t("review.statCompleted")}</span></div><div><strong>${summary.scheduledItems}</strong><span>${t("review.statScheduled")}</span></div></section>
            <div class="lc-checkin__review-layout">
                <div class="lc-checkin__review-calendar">
                    <div class="lc-checkin__month-nav"><button type="button" data-history-month="-1" aria-label="${t("review.prevMonth")}" title="${t("review.prevMonth")}">‹</button><strong>${t("date.monthYear", {year, month: month + 1})}</strong><button type="button" data-history-month="1" aria-label="${t("review.nextMonth")}" title="${t("review.nextMonth")}" ${nextDisabled ? "disabled" : ""}>›</button></div>
                    <div class="lc-checkin__calendar-weekdays">${calendarWeekdays().map((day) => `<span>${day}</span>`).join("")}</div>
                    <div class="lc-checkin__calendar">${calendarCells}</div>
                </div>
                <div class="lc-checkin__review-detail">
                    ${historyTools}
                    <div class="lc-checkin__history-result" role="status" aria-live="polite"><span>${resultLabel}</span>${hasHistoryFilter ? `<button class="lc-checkin__text-button" type="button" data-action="clear-history-filters">${t("review.clearFilters")}</button>` : ""}</div>
                    <section class="lc-checkin__history-selected"><div class="lc-checkin__history-date"><strong>${escapeHtml(formatHistoryDate(this.selectedHistoryDate))}</strong><span>${t("review.recordsCount", {n: filteredEvents.length})}</span></div>${details}</section>
                </div>
            </div>
            <details class="lc-checkin__year-heatmap" aria-label="${t("review.heatmapTitle")}">
                <summary><span class="lc-checkin__heatmap-nav" role="group"><button type="button" data-heatmap-year="-1" aria-label="${t("review.prevYear")}">‹</button><strong>${heatmapYear}</strong><button type="button" data-heatmap-year="1" aria-label="${t("review.nextYear")}"${this.heatmapYearOffset >= 0 ? " disabled" : ""}>›</button></span>${t("review.heatmapTitle")}</summary>
                <div class="lc-checkin__yearheatmap-scroll">${renderYearHeatmap(heatmap)}</div>
                <small class="lc-checkin__yearheatmap-total">${t("review.heatmapTotal", {year: heatmapYear, n: heatmap.total})}</small>
            </details>
            ${this.renderReviewFold("trend", t("review.foldTrend"), `<div class="lc-checkin__trend-grid"><div class="lc-checkin__trend-card"><h3>${weeklyTrend.title}</h3>${renderLineChart(weeklyTrend)}</div><div class="lc-checkin__trend-card"><h3>${monthlyTrend.title}</h3>${renderBarChart(monthlyTrend)}</div></div>`)}
            <section class="lc-checkin__review-projects"><h2>${t("review.foldProjects")}</h2><div class="lc-checkin__review-project-list">${projectRows}</div></section>
            ${this.renderReviewFold("log", t("review.foldLog"), this.renderCheckinLog())}
            ${groupBars ? `<section class="lc-checkin__balance" aria-label="${t("review.balanceTitle")}"><h2>${t("review.balanceTitle")}</h2>${groupBars}</section>` : ""}
            ${this.renderReviewFold("achievements", `成就 · ${earnedCount}/${achievements.length}`, `<div class="lc-checkin__achievement-grid">${achievements.map((entry) => `<div class="lc-checkin__achievement ${entry.achieved ? "is-achieved" : ""}" title="${escapeHtml(entry.description)}"><span class="lc-checkin__achievement-icon" aria-hidden="true">${entry.icon}</span><strong>${escapeHtml(entry.name)}</strong><small>${entry.achieved ? t("review.achieved") : `${entry.progress}/${entry.target}`}</small></div>`).join("")}</div>`)}
            ${this.renderReviewFold("upcoming", t("review.foldUpcoming"), this.renderUpcomingOccasions())}
            ${generated}
            ${providerButton}
        </div>`;
    }

    /* T-011 回顾页可折叠区块：趋势/日志/近期事项/成就默认折叠，展开状态存入视图偏好。 */
    private renderReviewFold(id: string, title: string, body: string): string {
        if (!body.trim()) return "";
        const open = this.reviewFoldSections.has(id);
        return `<details class="lc-checkin__review-fold" data-review-fold="${id}"${open ? " open" : ""}><summary><span>${title}</span><span class="lc-checkin__fold-chevron" aria-hidden="true">⌄</span></summary><div class="lc-checkin__review-fold-body">${body}</div></details>`;
    }

    private renderUpcomingOccasions(): string {
        const today = dateKey(currentCalendarDate());
        const horizonDate = new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() + 60);
        const horizon = dateKey(horizonDate);
        const items = this.occasionStore.occasions.filter((item) => item.enabled)
            .map((item) => ({item, next: getOccurrenceDate(item, today)}))
            .filter((entry): entry is {item: Occasion; next: string} => typeof entry.next === "string" && entry.next <= horizon)
            .sort((left, right) => left.next.localeCompare(right.next))
            .slice(0, 6);
        if (!items.length) return "";
        const rows = items.map(({item, next}) => {
            const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
            const days = Math.max(0, Math.round((parseLocalDateKey(next).getTime() - parseLocalDateKey(today).getTime()) / 86400000));
            return `<div class="lc-checkin__upcoming-row"><span aria-hidden="true">${icon}</span><strong>${escapeHtml(item.name)}</strong><span>${next}</span><em>${days === 0 ? t("review.today") : t("review.daysLater", {n: days})}</em></div>`;
        }).join("");
        return rows;
    }

    /* 7.0 打卡日志：最近 14 天有记录的日期时间线（图标 + 名称 + 数值 + 备注）。 */
    private renderCheckinLog(): string {
        const itemNames = new Map(this.store.items.map((item) => [item.id, item]));
        const byDay = new Map<string, CheckinEvent[]>();
        for (const event of this.store.events) {
            const day = getEventDateKey(event);
            const list = byDay.get(day);
            if (list) list.push(event);
            else byDay.set(day, [event]);
        }
        const days = [...byDay.keys()].filter((day) => day <= dateKey(currentCalendarDate())).sort((left, right) => right.localeCompare(left)).slice(0, 14);
        if (!days.length) return "";
        const daySections = days.map((day) => {
            const events = (byDay.get(day) || []).slice().sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
            const rows = events.map((event) => {
                const item = itemNames.get(event.itemId);
                const icon = item?.icon || "✓";
                const name = itemNames.get(event.itemId)?.name || t("review.deletedItem");
                const time = new Date(event.occurredAt).toLocaleTimeString(getPluginLocale(), {hour: "2-digit", minute: "2-digit"});
                const thumb = event.attachment ? `<img class="lc-checkin__log-thumb" src="${event.attachment}" alt="${t("review.logPhotoAlt")}" loading="lazy" />` : "";
                return `<div class="lc-checkin__log-row${event.attachment ? " has-thumb" : ""}">${thumb}<span class="lc-checkin__log-icon" aria-hidden="true">${escapeHtml(icon)}</span><div class="lc-checkin__log-main"><strong>${escapeHtml(name)}</strong><small>${time}${event.note ? " · " + escapeHtml(event.note) : ""}</small></div><span class="lc-checkin__log-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span></div>`;
            }).join("");
            return `<div class="lc-checkin__log-day"><h3>${escapeHtml(formatHistoryDate(day))}</h3>${rows}</div>`;
        }).join("");
        return daySections;
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

    private renderOccasions(): string {
        const editing = this.editingOccasionId ? this.occasionStore.occasions.find((item) => item.id === this.editingOccasionId) : undefined;
        const occasionQuery = (this.occasionSearchQuery || "").trim().toLocaleLowerCase();
        const allOccasions = [...this.occasionStore.occasions].sort((left, right) => left.date.localeCompare(right.date));
        const filteredOccasions = occasionQuery ? allOccasions.filter((item) => item.name.toLocaleLowerCase().includes(occasionQuery)) : allOccasions;
        const rows = filteredOccasions.length ? filteredOccasions.map((item) => {
            const icon = item.kind === "birthday" ? "🎂" : item.kind === "anniversary" ? "💍" : "◷";
            const kind = item.kind === "birthday" ? "生日" : item.kind === "anniversary" ? "纪念日" : "定时事项";
            const next = getOccurrenceDate(item, dateKey(currentCalendarDate()));
            const countdown = next ? `${next} · ${t("occ.daysAway", {n: Math.max(0, Math.round((parseLocalDateKey(next).getTime() - parseLocalDateKey(dateKey(currentCalendarDate())).getTime()) / 86400000))})}` : t("occ.ended");
            const recurrence = describeRecurrence(item);
            return `<article class="lc-checkin__occasion-manager-row ${item.enabled ? "" : "is-disabled"}"><span class="lc-checkin__occasion-icon" aria-hidden="true">${icon}</span><div class="lc-checkin__occasion-row-body"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(kind)} · ${escapeHtml(recurrence)} · ${escapeHtml(countdown)}</small>${item.note ? `<small class="lc-checkin__occasion-row-note">${escapeHtml(item.note)}</small>` : ""}</div><button class="lc-checkin__text-button" type="button" data-occasion-toitem="${escapeHtml(item.id)}">${t("occ.toItem")}</button><button class="lc-checkin__text-button" type="button" data-occasion-edit="${escapeHtml(item.id)}">${t("occ.editBtn")}</button><button class="lc-checkin__small-button" type="button" data-occasion-toggle="${escapeHtml(item.id)}" aria-label="${t("occ.toggleAria", {name: item.name})}">${item.enabled ? "✓" : "○"}</button><button class="lc-checkin__small-button" type="button" data-occasion-delete="${escapeHtml(item.id)}" aria-label="${t("occ.deleteAria", {name: item.name})}" title="${t("common.delete")}">×</button></article>`;
        }).join("") : (occasionQuery ? `<div class="lc-checkin__empty-description">${t("occ.searchEmpty")}</div>` : `<div class="lc-checkin__empty-description">${t("occ.empty")}</div>`);
        const date = editing?.date || dateKey(currentCalendarDate());
        const editLabel = editing ? t("occ.edit") : t("occ.create");
        const kind: OccasionKind = editing?.kind || "scheduled";
        const recurrence: OccasionRecurrence = editing?.recurrence || "annual";
        const calendar = editing?.calendar || "solar";
        const annualSubtype = editing?.annualSubtype || "byday";
        const monthlySubtype: MonthlySubtype = editing?.monthlySubtype || "byday";
        const sel = (value: string, current: string | undefined): string => value === current ? " selected" : "";
        const templateChips = OCCASION_TEMPLATES.map((template, index) => `<button type="button" class="lc-checkin__occasion-template" data-occasion-template="${index}" title="${describeRecurrence({...template, id: "", date: template.date || dateKey(currentCalendarDate()), remindBeforeDays: template.remindBeforeDays, note: template.note || "", enabled: true, completedDates: [], createdAt: "", updatedAt: ""} as OccasionImport)}"><span aria-hidden="true">${template.icon}</span>${occasionTemplateName(template)}</button>`).join("");
        const weekdayOptions = [0, 1, 2, 3, 4, 5, 6].map((value) => `<option value="${value}"${Number(editing?.weekday ?? 0) === value ? " selected" : ""}>${weekdayName(value)}</option>`).join("");
        const monthOptions = Array.from({length: 12}, (_, index) => `<option value="${index + 1}"${Number(editing?.month ?? 1) === index + 1 ? " selected" : ""}>${t("date.monthN", {n: index + 1})}</option>`).join("");
        const nthOptions = [1, 2, 3, 4, 5].map((value) => `<option value="${value}"${Number(editing?.nthWeek ?? 1) === value ? " selected" : ""}>${t(`occ.nth${value}`)}</option>`).join("");
        return `<div class="lc-checkin lc-checkin--occasions" data-appearance="${this.resolvedAppearance()}">
            <header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button><div><div class="lc-checkin__eyebrow">${t("occasions.eyebrow")}</div><h1 class="lc-checkin__title">${t("occasions.title")}</h1></div><button class="lc-checkin__icon-button" type="button" data-action="new-occasion" aria-label="${t("occ.newAria")}" title="${t("common.add")}">+</button></header>
            <div class="lc-checkin__occasion-manager">
                <section class="lc-checkin__occasion-form-panel">
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${editLabel}</span><strong>${t("occ.heading")}</strong></div></div>
                    <div class="lc-checkin__occasion-templates" aria-label="常用模板">${templateChips}</div>
                    <form data-occasion-form>
                        <label class="lc-checkin__field"><span>${t("occ.name")}</span><input name="name" required maxlength="120" placeholder="${t("occ.namePlaceholder")}" value="${escapeHtml(editing?.name || "")}" /></label>
                        <div class="lc-checkin__form-row">
                            <label class="lc-checkin__field"><span>${t("occ.kind")}</span><select name="kind"><option value="birthday"${sel("birthday", kind)}>${t("occ.kindBirthday")}</option><option value="anniversary"${sel("anniversary", kind)}>${t("occ.kindAnniversary")}</option><option value="scheduled"${sel("scheduled", kind)}>${t("occ.kindScheduled")}</option></select></label>
                            <label class="lc-checkin__field"><span>${t("occ.date")}</span><input name="date" type="date" required value="${escapeHtml(date)}" /></label>
                        </div>
                        <div class="lc-checkin__form-row">
                            <label class="lc-checkin__field"><span>${t("occ.recurrence")}</span><select name="recurrence" data-occasion-recurrence>
                                <option value="once"${sel("once", recurrence)}>${t("occ.once")}</option>
                                <option value="annual"${sel("annual", recurrence)}>${t("occ.annual")}</option>
                                <option value="monthly"${sel("monthly", recurrence)}>${t("occ.monthly")}</option>
                                <option value="weekly"${sel("weekly", recurrence)}>${t("occ.weekly")}</option>
                                <option value="quarterly"${sel("quarterly", recurrence)}>${t("occ.quarterly")}</option>
                                <option value="halfyearly"${sel("halfyearly", recurrence)}>${t("occ.halfyearly")}</option>
                                <option value="interval"${sel("interval", recurrence)}>${t("occ.interval")}</option>
                            </select></label>
                            <div class="lc-checkin__field" data-occasion-block="annual-calendar"${recurrence === "annual" ? "" : " hidden"}><span class="lc-checkin__field-label">${t("occ.calendar")}</span><select name="calendar" data-occasion-calendar aria-label="${t("occ.calendar")}"><option value="solar"${sel("solar", calendar)}>${t("occ.solar")}</option><option value="lunar"${sel("lunar", calendar)}>${t("occ.lunar")}</option></select><small class="lc-checkin__field-hint" data-occasion-lunar-hint hidden></small></div>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="annual-nthweek"${recurrence === "annual" && annualSubtype === "nthweek" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.month")}</span><select name="annualMonth">${monthOptions}</select></label>
                            <label class="lc-checkin__field"><span>${t("occ.weekday")}</span><select name="annualNth">${nthOptions}</select></label>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="annual-nthweek"${recurrence === "annual" && annualSubtype === "nthweek" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.weekdayNth")}</span><select name="annualWeekday">${weekdayOptions}</select></label>
                            <input type="hidden" name="annualSubtype" value="${annualSubtype}" />
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="monthly-sub"${recurrence === "monthly" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.monthlyMode")}</span><select name="monthlySubtype" data-occasion-monthly-subtype><option value="byday"${sel("byday", monthlySubtype)}>${t("occ.monthlyByday")}</option><option value="nthweek"${sel("nthweek", monthlySubtype)}>${t("occ.monthlyNthweek")}</option><option value="lastday"${sel("lastday", monthlySubtype)}>${t("occ.monthlyLastday")}</option></select></label>
                            <div class="lc-checkin__field" data-occasion-block="monthly-nthweek"${monthlySubtype === "nthweek" ? "" : " hidden"}><span class="lc-checkin__field-label">${t("occ.weekday")}</span><select name="monthlyWeekday" aria-label="${t("occ.weekday")}">${weekdayOptions}</select></div>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="weekly"${recurrence === "weekly" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.weekday")}</span><select name="weeklyWeekday">${weekdayOptions}</select></label>
                        </div>
                        <div class="lc-checkin__form-row" data-occasion-block="interval"${recurrence === "interval" ? "" : " hidden"}>
                            <label class="lc-checkin__field"><span>${t("occ.intervalCount")}</span><input name="intervalCount" type="number" min="1" max="365" step="1" value="${editing?.intervalCount ?? 1}" /></label>
                            <label class="lc-checkin__field"><span>${t("occ.unit")}</span><select name="intervalUnit"><option value="day"${sel("day", editing?.intervalUnit)}>${t("occ.unitDay")}</option><option value="month"${sel("month", editing?.intervalUnit || "month")}>${t("occ.unitMonth")}</option><option value="year"${sel("year", editing?.intervalUnit)}>${t("occ.unitYear")}</option></select></label>
                        </div>
                        <label class="lc-checkin__field"><span>${t("occ.remindDays")}</span><input name="remindBeforeDays" type="number" min="0" max="365" step="1" list="lc-occasion-remind-presets" value="${editing?.remindBeforeDays ?? 3}" /><datalist id="lc-occasion-remind-presets"><option value="0"><option value="1"><option value="3"><option value="7"><option value="14"><option value="30"></datalist></label>
                        <label class="lc-checkin__field"><span>${t("occ.note")}</span><textarea name="note" maxlength="500" rows="2" placeholder="${t("occ.notePlaceholder")}">${escapeHtml(editing?.note || "")}</textarea></label>
                        <div class="lc-checkin__editor-actions"><button class="lc-checkin__primary-button" type="submit">${editing ? t("occ.save") : t("occ.add")}</button>${editing ? `<button class="lc-checkin__text-button" type="button" data-action="cancel-occasion-edit">${t("occ.cancelEdit")}</button>` : ""}</div>
                    </form>
                </section>
                <section class="lc-checkin__occasion-list-panel">
                    <div class="lc-checkin__section-heading"><div><span class="lc-checkin__section-kicker">${t("occ.listKicker")}</span><strong>${t("occ.listHeading")}</strong></div><span class="lc-checkin__section-count">${filteredOccasions.length}/${this.occasionStore.occasions.length}</span></div>
                    <label class="lc-checkin__occasion-search"><input type="search" data-occasion-search value="${escapeHtml(this.occasionSearchQuery)}" placeholder="${t("occ.searchPlaceholder")}" aria-label="${t("occ.searchAria")}" /></label>
                    <div class="lc-checkin__occasion-manager-list">${rows}</div>
                </section>
            </div>
        </div>`;
    }

    private renderItem(item: CheckinItem, date: Date): string {
        const revision = getItemRevisionForDate(item, date);
        const progress = getProgress(this.store, item, date);
        const complete = isComplete(this.store, item, date);
        const displayTarget = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
        const percent = Math.min(100, Math.round((progress / displayTarget) * 100));
        const isBinary = revision.kind === "binary" && revision.schedule.type !== "quota";
        const canFocus = revision.kind === "duration";
        const recordStep = getRecordStep(revision.kind, revision.unit);
        const rule = evaluateRule(item, this.store.events, date);
        const inputStep = getEditorStep(revision.kind, revision.unit);
        const scheduleMeta = revision.schedule.type === "interval" || revision.schedule.type === "quota" ? ` · ${formatScheduleLabel(revision.schedule)}` : "";
        const meta = (isBinary ? t(KIND_LABELS[revision.kind]) : `${t(KIND_LABELS[revision.kind])} · ${formatNumber(progress)} / ${formatNumber(displayTarget)} ${revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? "天" : revision.unit || "次"}${rule.remaining ? ` · 还需 ${formatNumber(rule.remaining)}${revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? "天" : revision.unit || "次"}` : ""}`) + scheduleMeta;
        const priority = item.priority || "medium";
        const timeSlot = item.timeSlot || "any";
        const completionSource = item.completionSource || "manual";
        const unit = revision.unit || "次";
        const icon = isBinary
            ? `<button class="lc-checkin__item-icon" type="button" data-action="toggle" aria-label="${complete ? t("item.undoAria", {name: item.name}) : t("item.completeAria", {name: item.name})}">${renderIconMarkup(item.icon)}</button>`
            : `<span class="lc-checkin__item-icon" aria-hidden="true">${renderIconMarkup(item.icon)}</span>`;
        return `<article class="lc-checkin__item ${complete ? "is-complete" : ""}" data-item-id="${escapeHtml(item.id)}" style="--item-progress: ${percent}%">
            ${icon}
            <div class="lc-checkin__item-body">
                <div class="lc-checkin__item-topline">
                    <span class="lc-checkin__item-name">${escapeHtml(item.name)}</span>
                    ${(this.currentStreaks.get(item.id) || 0) > 1 ? `<button class="lc-checkin__streak-badge" type="button" data-streak-insights="${item.id}" title="${t("item.insightsTitle")}">🔥 ${this.currentStreaks.get(item.id)}</button>` : ""}
                    ${priority === "high" ? `<span class="lc-checkin__item-tag is-high">${t("priority.high")}</span>` : ""}
                    ${timeSlot !== "any" ? `<span class="lc-checkin__item-tag">${t(TIME_SLOT_LABELS[timeSlot])}</span>` : ""}
                    ${completionSource === "tomato" ? `<span class="lc-checkin__item-tag is-tomato">${item.tomatoMode === "sessions" ? t("item.tomatoSessions") : t("item.tomatoMinutes")}</span>` : ""}
                    <button class="lc-checkin__small-button" type="button" data-action="insights" aria-label="${t("item.insightsAria", {name: item.name})}" title="${t("item.insightsTitle")}">${uiIcon("insight")}</button>
                    <button class="lc-checkin__small-button" type="button" data-action="edit" aria-label="${t("item.editAria", {name: item.name})}" title="${t("item.editAria", {name: item.name})}">${uiIcon("edit")}</button>
                </div>
                <div class="lc-checkin__item-meta">${escapeHtml(meta)}</div>
                ${isBinary ? "" : `<div class="lc-checkin__item-progress"><span style="width: ${percent}%"></span></div>`}
            </div>
            <div class="lc-checkin__item-action">
                ${this.bulkMode ? `<button class="lc-checkin__bulk-check${this.bulkSelected.has(item.id) ? " is-selected" : ""}" type="button" data-bulk-check="${escapeHtml(item.id)}" aria-pressed="${this.bulkSelected.has(item.id)}" aria-label="${t("item.select", {name: item.name})}">${this.bulkSelected.has(item.id) ? "✓" : ""}</button>` : ""}
                ${canFocus ? `<button class="lc-checkin__focus-button" type="button" data-action="focus" aria-label="${t("item.focus")}" title="${t("item.focus")}">${uiIcon("timer")}</button>` : ""}
                ${isBinary
                    ? `<button class="lc-checkin__record-button" type="button" data-action="record">${complete ? t("item.cancel") : t("item.checkin")}</button>`
                    : `<button class="lc-checkin__quick-button" type="button" data-action="quick-record" data-amount="${formatNumber(recordStep)}" aria-label="${t("item.recordStep", {value: formatNumber(recordStep), unit})}">+${formatNumber(recordStep)} <span>${escapeHtml(unit)}</span></button>
                    <button class="lc-checkin__more-button" type="button" data-action="toggle-exact" aria-label="${t("item.exact")}" title="${t("item.exact")}" aria-expanded="false">${uiIcon("more")}</button>`}
                ${this.todaySortMode === "manual" && !complete ? `<button class="lc-checkin__drag-handle" type="button" data-drag-handle aria-label="${t("item.dragSort", {name: item.name})}" title="${t("item.dragSort", {name: item.name})}">${uiIcon("more")}</button>` : ""}
            </div>
            ${isBinary ? "" : `<div class="lc-checkin__exact-entry" data-exact-entry hidden>
                <label><span>本次记录</span><input class="lc-checkin__amount" type="number" inputmode="decimal" min="${inputStep}" step="${inputStep}" value="${formatNumber(recordStep)}" aria-label="${t("item.exactThis", {unit})}" /></label>
                <span>${escapeHtml(unit)}</span>
                <input class="lc-checkin__record-note" type="text" maxlength="2000" placeholder="${t("item.notePlaceholder")}" aria-label="${t("item.noteAria")}" />
                <label class="lc-checkin__attach-button" data-attach-button title="${t("item.photo")}"><input type="file" data-attach-file accept="image/png,image/jpeg,image/webp,image/gif" />📷</label>
                <button class="lc-checkin__record-button" type="button" data-action="record">${t("item.record")}</button>
            </div>`}
        </article>`;
    }

    private renderEditor(): string {
        const item = this.editingId ? this.store.items.find((candidate) => candidate.id === this.editingId) : undefined;
        const schedule = item?.schedule || {type: "daily" as const};
        const weekdays = schedule.weekdays || [1, 2, 3, 4, 5, 6, 0];
        const intervalDays = schedule.intervalDays || 2;
        const anchorDate = schedule.anchorDate || item?.createdDate || dateKey(currentCalendarDate());
        const quotaPeriod = schedule.type === "quota" ? schedule.quota?.period || "week" : "week";
        const quotaAmount = schedule.type === "quota" ? schedule.quota?.amount || 3 : 3;
        const quotaCountMode = schedule.type === "quota" ? schedule.quota?.countMode || "dates" : "dates";
        const selectedIcon = item?.icon || "✓";
        const selectedKind = item?.kind || "binary";
        const selectedKindOption = KIND_OPTIONS.find((option) => option.kind === selectedKind) || KIND_OPTIONS[0];
        const selectedUnit = item?.unit || selectedKindOption.defaultUnit;
        const editorTarget = item?.target || (selectedKind === "duration" && selectedUnit === "小时" ? 0.5 : selectedKindOption.step);
        const selectedIconGroup = ICON_GROUPS.find((group) => group.icons.includes(selectedIcon))?.id || ICON_GROUPS[0].id;
        const groupSuggestions = [...new Set([
            ...this.store.items.map((candidate) => candidate.group || ""),
            ...CHECKIN_TEMPLATES.map((template) => template.group),
        ].filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
        const templateGroups = [...new Set(CHECKIN_TEMPLATES.map((template) => template.group))];
        const userTemplateMarkup = this.userTemplates.length ? `<div class="lc-checkin__field-heading"><span>${t("item.myTemplates")}</span><small>${t("item.templateCount", {n: this.userTemplates.length})}</small></div><div class="lc-checkin__templates" data-user-template-list>${this.userTemplates.map((template) => `<div class="lc-checkin__template-wrap"><button class="lc-checkin__template" type="button" data-user-template-id="${escapeHtml(template.id)}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml([template.name, template.group, template.note, template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" "))}" title="${escapeHtml(template.note)}" aria-label="${t("item.useMyTemplate", {name: template.name})}"><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit}`)}</small></button><button class="lc-checkin__template-delete" type="button" data-user-template-delete="${escapeHtml(template.id)}" aria-label="${t("item.deleteTemplate", {name: template.name})}">${t("item.delete")}</button></div>`).join("")}</div>` : "";
        const initialPriority = item?.priority || "medium";
        const initialTimeSlot = item?.timeSlot || "any";
        const initialCompletionSource: CompletionSource = item?.completionSource === "tomato" ? "tomato" : "manual";
        const initialTomatoMode: TomatoValueMode = item?.tomatoMode === "sessions" ? "sessions" : "minutes";
        const advancedSummary = [
            item?.group || t("review.ungrouped"),
            PRIORITY_LABELS[initialPriority] && t(PRIORITY_LABELS[initialPriority]),
            initialTimeSlot === "any" ? "" : t(TIME_SLOT_LABELS[initialTimeSlot]),
            initialCompletionSource === "tomato" ? "番茄钟联动" : "手动记录",
            formatScheduleLabel(schedule),
        ].filter(Boolean).join(" · ");
        const templates = !item ? `<section class="lc-checkin__template-section">
            <div class="lc-checkin__field-heading"><span>${t("editor.templateHeading")}</span><small>${t("editor.templateHint")}</small></div>
            <label class="lc-checkin__search-field">
                <span class="lc-checkin__visually-hidden">${t("editor.templateSearchAria")}</span>
                <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                <input type="search" data-template-query autocomplete="off" placeholder="${t("editor.templateSearchPh")}" />
                <button type="button" data-action="clear-template-query" aria-label="${t("editor.clearTemplateSearch")}" title="${t("editor.clear")}" hidden>×</button>
            </label>
            <div class="lc-checkin__filter-row" role="group" aria-label="${t("editor.templateGroups")}">
                <button class="is-selected" type="button" data-template-group="all" aria-pressed="true">${t("editor.groupAll")}</button>
                ${templateGroups.map((group) => `<button type="button" data-template-group="${escapeHtml(group)}" aria-pressed="false">${escapeHtml(templateGroupLabel(group))}</button>`).join("")}
            </div>
            <div class="lc-checkin__result-line"><span data-template-count aria-live="polite">${t("editor.templateCount", {n: CHECKIN_TEMPLATES.length})}</span><button type="button" data-action="clear-template-filter" hidden>${t("review.clearFilters")}</button></div>
            <div class="lc-checkin__templates" data-template-list>${CHECKIN_TEMPLATES.map((template, index) => {
                const searchText = [templateName(template), template.note, templateGroupLabel(template.group), template.unit, t(KIND_LABELS[template.kind]), t(SCHEDULE_LABELS[template.schedule.type])].join(" ");
                return `<button class="lc-checkin__template" type="button" data-template-index="${index}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml(searchText)}" title="${escapeHtml(templateNote(template))}" aria-label="${t("item.useTemplate", {name: templateName(template)})}" aria-pressed="false"><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(templateName(template))}</strong><small>${escapeHtml(template.target === 1 && template.kind === "binary" ? t(SCHEDULE_LABELS[template.schedule.type]) : `${template.target} ${template.unit}`)}</small></button>`;
            }).join("")}</div>${userTemplateMarkup}
            <div class="lc-checkin__search-empty" data-template-empty hidden><strong>${t("editor.templateEmpty")}</strong><span>${t("editor.templateEmptyHint")}</span><button type="button" data-action="clear-template-filter">${t("editor.viewAll")}</button></div>
        </section>` : "";
        return `<div class="lc-checkin lc-checkin--editor" data-appearance="${this.resolvedAppearance()}">
            <header class="lc-checkin__editor-header">
                <button class="lc-checkin__back-button" type="button" data-action="back" aria-label="${t("common.back")}">‹</button>
                <h1 class="lc-checkin__title">${item ? t("editor.edit") : t("editor.create")}</h1>
            </header>
            <form class="lc-checkin__form">
                <div class="lc-checkin__editor-columns">
                <div class="lc-checkin__form-scroll">
                    ${templates}
                    <label class="lc-checkin__field lc-checkin__field--name"><span>${t("occ.name")}</span><input name="name" type="text" required maxlength="40" placeholder="${t("editor.namePlaceholder")}" value="${escapeHtml(item?.name || "")}" /></label>
                    <div class="lc-checkin__field lc-checkin__field--icons">
                        <span>${t("editor.icon")}</span>
                        <details class="lc-checkin__icon-popup" data-icon-popup>
                        <summary type="button"><span class="lc-checkin__popup-current" data-popup-current-icon>${renderIconMarkup(selectedIcon)}</span><span class="lc-checkin__popup-summary-text">${t("editor.changeIcon")}</span><span class="lc-checkin__popup-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__popup-body">
                        <label class="lc-checkin__search-field lc-checkin__search-field--icon">
                            <span class="lc-checkin__visually-hidden">${t("editor.iconSearchAria")}</span>
                            <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                            <input type="search" data-icon-query autocomplete="off" placeholder="${t("editor.iconSearchPh")}" />
                            <button type="button" data-action="clear-icon-query" aria-label="${t("editor.clearIconSearch")}" title="${t("editor.clear")}" hidden>×</button>
                        </label>
                        <div class="lc-checkin__icon-tabs" role="group" aria-label="${t("editor.iconGroups")}">${ICON_GROUPS.map((group) => `<button type="button" data-icon-group="${group.id}" aria-pressed="${selectedIconGroup === group.id ? "true" : "false"}" class="${selectedIconGroup === group.id ? "is-selected" : ""}">${t(`iconGroup.${group.id}`)}</button>`).join("")}</div>
                        <div class="lc-checkin__result-line"><span data-icon-count aria-live="polite">${t("editor.iconCount", {name: t(`iconGroup.${selectedIconGroup}`), n: ICON_GROUPS.find((group) => group.id === selectedIconGroup)?.icons.length || 0})}</span></div>
                        <div class="lc-checkin__icon-results" data-icon-results>${ICON_GROUPS.map((group) => `<section class="lc-checkin__icon-panel" data-icon-panel="${group.id}" data-icon-group-search="${escapeHtml([group.name, ...group.keywords].join(" "))}" ${selectedIconGroup === group.id ? "" : "hidden"}><small class="lc-checkin__icon-panel-heading">${t(`iconGroup.${group.id}`)}</small><div class="lc-checkin__icon-grid">${group.icons.map((icon) => {
                            const keywords = ICON_SEARCH_KEYWORDS[icon] || "";
                            return `<button class="lc-checkin__icon-option ${selectedIcon === icon ? "is-selected" : ""}" type="button" data-icon="${escapeHtml(icon)}" data-icon-search-text="${escapeHtml([icon, group.name, ...group.keywords, keywords].join(" "))}" aria-label="${t("editor.iconSelectAria", {label: t(`iconGroup.${group.id}`), icon})}" title="${escapeHtml(keywords || group.name)}">${escapeHtml(icon)}</button>`;
                        }).join("")}</div></section>`).join("")}</div>
                        <div class="lc-checkin__search-empty lc-checkin__search-empty--compact" data-icon-empty hidden><strong>${t("editor.iconEmpty")}</strong><button type="button" data-action="clear-icon-query">${t("review.clearFilters")}</button></div>
                        <div class="lc-checkin__custom-icon" data-custom-icon-panel>
                            <div class="lc-checkin__custom-icon-heading"><strong>${t("editor.customIcon")}</strong><small>${t("editor.customIconHint")}</small></div>
                            <div class="lc-checkin__custom-icon-row"><input type="text" data-custom-icon-input maxlength="500" value="${escapeHtml(ICON_GROUPS.some((group) => group.icons.includes(selectedIcon)) ? "" : selectedIcon)}" placeholder="${t("editor.customIconPh")}" aria-label="${t("editor.customIcon")}" /><button type="button" data-action="apply-custom-icon">${t("editor.apply")}</button></div>
                            <div class="lc-checkin__custom-icon-tools"><label class="lc-checkin__file-button"><input type="file" data-custom-icon-file accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" />${t("editor.uploadImage")}</label><button type="button" data-action="download-custom-icon">${t("editor.saveRemote")}</button><button type="button" data-action="open-iconfont">${t("editor.iconfont")}</button></div>
                            <div class="lc-checkin__custom-icon-tools"><label class="lc-checkin__file-button"><input type="file" data-custom-icon-library accept=".json,.txt,application/json,text/plain" />${t("editor.importLibrary")}</label><small>${t("editor.importLibraryHint")}</small></div>
                            ${this.customIconLibrary.length ? `<div class="lc-checkin__custom-library" data-custom-library><small>${t("editor.myIcons", {n: this.customIconLibrary.length})}</small><div class="lc-checkin__icon-grid">${this.customIconLibrary.map((icon) => `<button class="lc-checkin__icon-option" type="button" data-library-icon="${escapeHtml(icon)}" aria-label="${t("editor.useCustomIcon")}">${renderIconMarkup(icon)}</button>`).join("")}</div></div>` : ""}
                        </div>
                        </div>
                        </details>
                        <input name="icon" type="hidden" value="${escapeHtml(selectedIcon)}" />
                    </div>
                    <fieldset class="lc-checkin__kind-field"><legend>${t("occ.kind")}</legend><div class="lc-checkin__kind-grid">${KIND_OPTIONS.map((option) => `<label class="lc-checkin__kind-option"><input type="radio" name="kind" value="${option.kind}" ${selectedKind === option.kind ? "checked" : ""}/><span><strong>${t(KIND_LABELS[option.kind])}</strong><small>${t(`kindDesc.${option.kind}`)}</small></span></label>`).join("")}</div></fieldset>
                    <div class="lc-checkin__kind-help" data-kind-help>${t(`kindDesc.${selectedKind}`)}</div>
                    <div class="lc-checkin__form-row" data-value-fields>
                        <label class="lc-checkin__field"><span data-target-label>${escapeHtml(getTargetLabel(selectedKind))}</span><input name="target" type="number" min="${getEditorStep(selectedKind, selectedUnit)}" step="${getEditorStep(selectedKind, selectedUnit)}" required value="${escapeHtml(editorTarget.toString())}" /></label>
                        <label class="lc-checkin__field"><span>${t("occ.unit")}</span><input name="unit" type="text" maxlength="12" placeholder="${escapeHtml(selectedKindOption.defaultUnit)}" value="${escapeHtml(selectedUnit)}" /><span class="lc-checkin__unit-options" data-unit-options>${selectedKindOption.units.map((unit) => `<button type="button" data-unit="${escapeHtml(unit)}" aria-pressed="${selectedUnit === unit ? "true" : "false"}" class="${selectedUnit === unit ? "is-selected" : ""}">${escapeHtml(unit)}</button>`).join("")}</span></label>
                    </div>
                </div>
                <aside class="lc-checkin__editor-side">
                    <section class="lc-checkin__editor-preview" aria-label="${t("editor.previewLabel")}">
                        <div class="lc-checkin__field-heading"><span>${t("editor.previewLabel")}</span><small>${t("editor.previewHint")}</small></div>
                        <article class="lc-checkin__preview-card" data-editor-preview>
                            <span class="lc-checkin__preview-icon" data-preview-icon>${renderIconMarkup(selectedIcon)}</span>
                            <div class="lc-checkin__preview-body"><strong data-preview-name>${escapeHtml(item?.name || t("editor.unnamed"))}</strong><small data-preview-meta>${escapeHtml(selectedKind === "binary" ? `${t("kind.binary")} · ` + formatScheduleLabel(schedule) : `${t(KIND_LABELS[selectedKind])} · 0 / ${formatNumber(editorTarget)} ${selectedUnit} · ${formatScheduleLabel(schedule)}`)}</small><span class="lc-checkin__preview-progress" data-preview-progress ${selectedKind === "binary" ? "hidden" : ""}><i></i></span></div>
                            <span class="lc-checkin__preview-action" data-preview-action>${selectedKind === "binary" ? t("item.checkin") : `+${formatNumber(getRecordStep(selectedKind, selectedUnit))} ${escapeHtml(selectedUnit)}`}</span>
                        </article>
                    </section>
                    <details class="lc-checkin__advanced" data-advanced ${item ? "open" : ""}>
                        <summary><span><strong>${t("editor.advanced")}</strong><small data-advanced-summary>${escapeHtml(advancedSummary)}</small></span><span class="lc-checkin__advanced-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__advanced-content">
                            <div class="lc-checkin__organization-fields">
                                <label class="lc-checkin__field"><span>${t("editor.group")}</span><input name="group" type="text" maxlength="32" placeholder="${t("editor.groupPlaceholder")}" value="${escapeHtml(item?.group || "")}" /><span class="lc-checkin__group-options">${groupSuggestions.slice(0, 8).map((group) => `<button type="button" data-group-value="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("")}</span></label>
                                <label class="lc-checkin__field"><span>${t("editor.priorityLabel")}</span><select name="priority">${(["high", "medium", "low"] as CheckinPriority[]).map((priority) => `<option value="${priority}" ${initialPriority === priority ? "selected" : ""}>${t(PRIORITY_LABELS[priority])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.slotLabel")}</span><select name="timeSlot">${(["any", "morning", "afternoon", "evening"] as CheckinTimeSlot[]).map((slot) => `<option value="${slot}" ${initialTimeSlot === slot ? "selected" : ""}>${t(TIME_SLOT_LABELS[slot])}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>${t("editor.completionSource")}</span><select name="completionSource"><option value="manual" ${initialCompletionSource === "manual" ? "selected" : ""}>${t("source.manual")}</option><option value="tomato" ${initialCompletionSource === "tomato" ? "selected" : ""}>${t("source.tomato")}</option></select></label>
                                <label class="lc-checkin__field" data-tomato-mode-field ${initialCompletionSource === "tomato" ? "" : "hidden"}><span>${t("editor.tomatoModeLabel")}</span><select name="tomatoMode"><option value="minutes" ${initialTomatoMode === "minutes" ? "selected" : ""}>${t("editor.tomatoMinutesOpt")}</option><option value="sessions" ${initialTomatoMode === "sessions" ? "selected" : ""}>${t("editor.tomatoSessionsOpt")}</option></select></label>
                                <p class="lc-checkin__integration-help" data-tomato-help ${initialCompletionSource === "tomato" ? "" : "hidden"}>${t("editor.tomatoHelp")}</p>
                            </div>
                            <div class="lc-checkin__field"><span>${t("editor.scheduleLabel")}</span><select name="schedule" aria-label="${t("editor.scheduleLabel")}">${Object.entries(SCHEDULE_LABELS).map(([value, label]) => `<option value="${value}" ${schedule.type === value ? "selected" : ""}>${t(label)}</option>`).join("")}</select></div>
                            <div class="lc-checkin__weekdays" data-weekdays>${weekdaysFromSunday().map((day, index) => `<label><input type="checkbox" name="weekday" value="${index}" ${weekdays.includes(index) ? "checked" : ""}/><span>${day}</span></label>`).join("")}</div>
                            <div class="lc-checkin__form-row" data-interval-schedule hidden>
                                <label class="lc-checkin__field"><span>${t("editor.intervalDays")}</span><input name="intervalDays" type="number" min="1" max="3650" step="1" value="${intervalDays}" /></label>
                                <label class="lc-checkin__field"><span>${t("editor.anchorDate")}</span><input name="anchorDate" type="date" value="${escapeHtml(anchorDate)}" /><button class="lc-checkin__field-action" type="button" data-action="anchor-today">${t("review.tabDay")}</button></label>
                            </div>
                            <div class="lc-checkin__quota-schedule" data-quota-schedule hidden>
                                <div class="lc-checkin__form-row">
                                    <label class="lc-checkin__field"><span>${t("editor.quotaPeriodLabel")}</span><select name="quotaPeriod"><option value="week" ${quotaPeriod === "week" ? "selected" : ""}>${t("editor.quotaWeekly")}</option><option value="month" ${quotaPeriod === "month" ? "selected" : ""}>${t("editor.quotaMonthly")}</option></select></label>
                                    <label class="lc-checkin__field"><span data-quota-amount-label>${t("editor.quotaAmountLabel")}</span><input name="quotaAmount" type="number" min="1" step="1" value="${formatNumber(quotaAmount)}" /></label>
                                </div>
                                <label class="lc-checkin__field"><span>${t("editor.countModeLabel")}</span><select name="quotaCountMode"><option value="dates" ${quotaCountMode === "dates" ? "selected" : ""}>${t("editor.countModeDates")}</option><option value="value" ${quotaCountMode === "value" ? "selected" : ""}>${t("editor.countModeValue")}</option></select></label>
                                <small class="lc-checkin__quota-help" data-quota-help>${t("editor.quotaHelp")}</small>
                            </div>
                        </div>
                    </details>
                </aside>
                <div class="lc-checkin__editor-actions">
                    <button class="lc-checkin__save-button" type="submit">${item ? t("editor.save") : t("editor.saveNew")}</button>
                    <button class="lc-checkin__text-button" type="button" data-action="save-template">${t("editor.saveTemplate")}</button>
                    ${item ? `<button class="lc-checkin__archive-button" type="button" data-action="archive">${item.archived ? t("editor.restore") : t("editor.archive")}</button>` : ""}
            ${this.renderSaveStatus()}
            ${this.renderSyncNotice()}
                </aside>
                </div>
            </form>
        </div>`;
    }

    private bindToday(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindItemDrag(root);
        this.bindQuickKeyboard(root);
        this.bindBulkMode(root);
        this.bindFocusTimerPanel(root);
        root.querySelectorAll<HTMLElement>("[data-streak-insights]").forEach((button) => button.addEventListener("click", () => {
            const item = this.store.items.find((candidate) => candidate.id === button.dataset.streakInsights && !candidate.archived);
            if (item) { this.insightsReturnPage = "today"; this.showInsights(item); }
        }));
        this.bindMobileNav(root);
        const search = root.querySelector<HTMLInputElement>("[data-today-search]");
        let searchTimer: number | undefined;
        search?.addEventListener("input", () => {
            if (searchTimer !== undefined) window.clearTimeout(searchTimer);
            const value = search.value;
            searchTimer = window.setTimeout(() => {
                this.todayQuery = value;
                this.render();
                this.focusTodaySearch(value.length);
            }, 120);
        });
        root.querySelectorAll<HTMLElement>("[data-action='clear-search']").forEach((button) => button.addEventListener("click", () => {
            this.todayQuery = "";
            this.render();
            this.focusTodaySearch();
        }));
        root.querySelector<HTMLElement>("[data-action='undo-record']")?.addEventListener("click", () => this.undoRecentRecord());
        root.querySelector<HTMLElement>("[data-action='retry-save']")?.addEventListener("click", () => {
            void this.retrySave();
        });
        root.querySelectorAll<HTMLElement>("[data-quick-recent]").forEach((button) => button.addEventListener("click", () => {
            const item = this.store.items.find((candidate) => candidate.id === button.dataset.quickRecent && !candidate.archived);
            if (!item) return;
            const date = currentCalendarDate();
            const revision = getItemRevisionForDate(item, date);
            this.enqueueMutation(() => this.recordEvent(item, revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit), captureActionMoment(), this.revisionFingerprint(item, date)));
        }));
        root.querySelector<HTMLElement>("[data-action='toggle-pending-only']")?.addEventListener("click", () => {
            this.pendingOnly = !this.pendingOnly;
            void this.persistViewPreferences();
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='history']")?.addEventListener("click", () => this.showHistory());
        root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => this.showArchived());
        root.querySelectorAll<HTMLElement>("[data-heatmap-year]").forEach((button) => button.addEventListener("click", (event) => {
            event.stopPropagation();
            const offset = Number(button.dataset.heatmapYear);
            if (offset === -1) this.heatmapYearOffset -= 1;
            else if (this.heatmapYearOffset < 0) this.heatmapYearOffset += 1;
            this.render();
        }));
        root.querySelectorAll<HTMLDetailsElement>("details[data-review-fold]").forEach((details) => details.addEventListener("toggle", () => {
            const id = details.dataset.reviewFold || "";
            if (details.open) this.reviewFoldSections.add(id);
            else this.reviewFoldSections.delete(id);
            void this.persistViewPreferences();
        }));
        root.querySelector<HTMLElement>("[data-action='summary']")?.addEventListener("click", () => this.showSummary());
        root.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => this.showInsights());
        root.querySelectorAll<HTMLElement>("[data-action='occasions']").forEach((button) => button.addEventListener("click", () => this.showOccasions()));

        root.querySelectorAll<HTMLElement>("[data-action='settings']").forEach((button) => button.addEventListener("click", () => this.showSettings()));
        root.querySelector<HTMLElement>("[data-action='open-tab']")?.addEventListener("click", () => this.openTabPage());
        root.querySelector<HTMLSelectElement>("[data-group-mode]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "group" || value === "time" || value === "priority") {
                this.todayGroupMode = value;
                void this.persistViewPreferences();
                this.render();
            }
        });
        root.querySelector<HTMLSelectElement>("[data-sort-mode]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "manual" || value === "priority" || value === "name" || value === "createdAt" || value === "updatedAt") {
                this.todaySortMode = value;
                void this.persistViewPreferences();
                this.render();
            }
        });
        root.querySelector<HTMLElement>("[data-action='toggle-completed']")?.addEventListener("click", () => {
            this.completedCollapsed = !this.completedCollapsed;
            void this.persistViewPreferences();
            this.render();
        });
        root.querySelectorAll<HTMLElement>("[data-group-toggle]").forEach((button) => button.addEventListener("click", () => {
            const key = button.dataset.groupToggle;
            if (!key) return;
            if (this.collapsedTodayGroups.has(key)) this.collapsedTodayGroups.delete(key);
            else this.collapsedTodayGroups.add(key);
            void this.persistViewPreferences();
            this.render();
        }));
        root.querySelectorAll<HTMLElement>("[data-action='add']").forEach((element) => element.addEventListener("click", () => this.showEditor()));
        root.querySelectorAll<HTMLElement>("[data-item-id]").forEach((element) => {
            const itemId = element.dataset.itemId;
            if (!itemId) {
                return;
            }
            element.querySelector<HTMLElement>("[data-action='edit']")?.addEventListener("click", () => {
                const item = this.store.items.find((candidate) => candidate.id === itemId);
                if (item) {
                    this.showEditor(item);
                }
            });
            element.querySelector<HTMLElement>("[data-action='insights']")?.addEventListener("click", () => {
                const item = this.store.items.find((candidate) => candidate.id === itemId);
                if (item) this.showInsights(item);
            });
            element.querySelector<HTMLElement>("[data-action='toggle']")?.addEventListener("click", () => {
                const moment = captureActionMoment();
                const desiredComplete = !element.classList.contains("is-complete");
                const item = this.store.items.find((candidate) => candidate.id === itemId);
                const actionDate = calendarDateFromKey(moment.localDate);
                const expectedRevisionFingerprint = item ? this.revisionFingerprint(item, actionDate) : undefined;
                const eventsToUndo = desiredComplete ? [] : getEventsForDay(this.store, itemId, actionDate).map((event) => ({...event}));
                this.enqueueMutation(() => this.toggleItem(itemId, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
            });
            element.querySelector<HTMLElement>("[data-action='focus']")?.addEventListener("click", () => {
                const focusItem = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
                if (focusItem && this.findFocusAdapter(focusItem, currentCalendarDate())) void this.startFocus(itemId);
                else {
                    this.focusTimerRoot = element.closest(".lc-checkin")?.parentElement ?? undefined;
                    this.openFocusTimer(itemId);
                }
            });
            element.querySelector<HTMLElement>("[data-action='quick-record']")?.addEventListener("click", () => {
                const item = this.store.items.find((candidate) => candidate.id === itemId);
                if (!item) return;
                const moment = captureActionMoment();
                const date = calendarDateFromKey(moment.localDate);
                const revision = getItemRevisionForDate(item, date);
                const expectedRevisionFingerprint = this.revisionFingerprint(item, date);
                this.enqueueMutation(() => this.recordEvent(item, getRecordStep(revision.kind, revision.unit), moment, expectedRevisionFingerprint));
            });
            element.querySelector<HTMLElement>("[data-action='toggle-exact']")?.addEventListener("click", (event) => {
                const button = event.currentTarget as HTMLElement;
                const entry = element.querySelector<HTMLElement>("[data-exact-entry]");
                if (!entry) return;
                const expanded = !entry.hidden;
                entry.hidden = expanded;
                button.setAttribute("aria-expanded", String(!expanded));
                if (!expanded) entry.querySelector<HTMLInputElement>("input")?.focus();
            });
            element.querySelector<HTMLInputElement>(".lc-checkin__amount")?.addEventListener("keydown", (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                element.querySelector<HTMLButtonElement>("[data-action='record']")?.click();
            });
            element.querySelector<HTMLInputElement>("[data-attach-file]")?.addEventListener("change", (event) => {
                const input = event.currentTarget as HTMLInputElement;
                const file = input.files?.[0];
                if (!file) return;
                if (file.size > 500 * 1024) { showMessage(t("msg.photoTooLarge")); input.value = ""; return; }
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result !== "string") return;
                    this.pendingAttachments.set(itemId, reader.result);
                    const button = element.querySelector<HTMLElement>("[data-attach-button]");
                    if (button) { button.classList.add("has-photo"); button.dataset.photo = "1"; }
                    showMessage(t("msg.photoAttached"));
                };
                reader.readAsDataURL(file);
            });
            element.querySelector<HTMLElement>("[data-action='record']")?.addEventListener("click", () => {
                const item = this.store.items.find((candidate) => candidate.id === itemId);
                const input = element.querySelector<HTMLInputElement>(".lc-checkin__amount");
                const amount = input ? input.valueAsNumber : 1;
                if (item) {
                    const moment = captureActionMoment();
                    const revision = getItemRevisionForDate(item, calendarDateFromKey(moment.localDate));
                    const expectedRevisionFingerprint = this.revisionFingerprint(item, calendarDateFromKey(moment.localDate));
                    if (revision.kind === "binary") {
                        const desiredComplete = !element.classList.contains("is-complete");
                        const eventsToUndo = desiredComplete ? [] : getEventsForDay(this.store, item.id, calendarDateFromKey(moment.localDate)).map((event) => ({...event}));
                        this.enqueueMutation(() => this.toggleItem(item.id, moment, desiredComplete, expectedRevisionFingerprint, eventsToUndo));
                        return;
                    }
                    if (!Number.isFinite(amount) || amount <= 0) {
                        showMessage(t("msg.valuePositive"));
                        input?.focus();
                        return;
                    }
                    const note = element.querySelector<HTMLInputElement>(".lc-checkin__record-note")?.value;
                    const attachment = this.pendingAttachments.get(itemId);
                    this.pendingAttachments.delete(itemId);
                    this.enqueueMutation(() => this.recordEvent(item, amount, moment, expectedRevisionFingerprint, note, attachment));
                    const attachButton = element.querySelector<HTMLElement>("[data-attach-button]");
                    if (attachButton) { attachButton.classList.remove("has-photo"); attachButton.dataset.photo = ""; }
                }
            });
        });
        root.querySelectorAll<HTMLElement>("[data-action='toggle-occasion']").forEach((button) => button.addEventListener("click", () => {
            const row = button.closest<HTMLElement>("[data-occasion-id]");
            const id = row?.dataset.occasionId || "";
            const occurrenceDate = row?.dataset.occasionDate || "";
            const item = this.occasionStore.occasions.find((candidate) => candidate.id === id);
            if (item) void this.enqueueMutation(() => this.setOccasionCompleted(id, occurrenceDate, !isOccasionCompleted(item, occurrenceDate)));
        }));
    }

    private bindOccasions(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindMobileNav(root);
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => this.showToday());
        root.querySelector<HTMLElement>("[data-action='new-occasion']")?.addEventListener("click", () => { this.editingOccasionId = undefined; this.render(); });
        root.querySelector<HTMLElement>("[data-action='cancel-occasion-edit']")?.addEventListener("click", () => { this.editingOccasionId = undefined; this.render(); });
        root.querySelector<HTMLInputElement>("[data-occasion-search]")?.addEventListener("input", (event) => {
            this.occasionSearchQuery = (event.currentTarget as HTMLInputElement).value;
            this.render();
            const searchInput = document.querySelector<HTMLInputElement>("[data-occasion-search]");
            if (searchInput) { searchInput.focus(); searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); }
        });
        root.querySelectorAll<HTMLElement>("[data-occasion-edit]").forEach((button) => button.addEventListener("click", () => { this.editingOccasionId = button.dataset.occasionEdit; this.render(); }));
        root.querySelectorAll<HTMLElement>("[data-occasion-toitem]").forEach((button) => button.addEventListener("click", () => {
            void this.enqueueMutation(async () => { await this.createOccasionLinkedItem(button.dataset.occasionToitem || ""); });
        }));
        root.querySelectorAll<HTMLElement>("[data-occasion-toggle]").forEach((button) => button.addEventListener("click", () => {
            const id = button.dataset.occasionToggle || "";
            const item = this.occasionStore.occasions.find((candidate) => candidate.id === id);
            if (item) void this.enqueueMutation(() => this.updateOccasion({...item, enabled: !item.enabled}));
        }));
        root.querySelectorAll<HTMLElement>("[data-occasion-delete]").forEach((button) => button.addEventListener("click", () => {
            const id = button.dataset.occasionDelete || "";
            const item = this.occasionStore.occasions.find((candidate) => candidate.id === id);
            if (!item || !window.confirm(t("msg.occasionDeleteConfirm"))) return;
            void this.enqueueMutation(async () => { const previous = this.occasionStore; this.occasionStore = deleteOccasion(previous, id); try { await this.persistOccasions(); } catch { this.occasionStore = previous; showMessage(t("msg.occasionDeleteFail")); } if (this.editingOccasionId === id) this.editingOccasionId = undefined; this.render(); });
        }));

        const syncBlocks = () => {
            const form = root.querySelector<HTMLFormElement>("[data-occasion-form]");
            if (!form) return;
            const recurrence = form.querySelector<HTMLSelectElement>("[name='recurrence']")?.value || "annual";
            const monthlySubtype = form.querySelector<HTMLSelectElement>("[data-occasion-monthly-subtype]")?.value || "byday";
            form.querySelectorAll<HTMLElement>("[data-occasion-block]").forEach((block) => {
                const key = block.dataset.occasionBlock || "";
                let visible = key === recurrence;
                if (key === "annual-calendar") visible = recurrence === "annual";
                if (key === "annual-nthweek") visible = recurrence === "annual" && form.querySelector<HTMLInputElement>("[name='annualSubtype']")?.value === "nthweek";
                if (key === "monthly-sub") visible = recurrence === "monthly";
                if (key === "monthly-nthweek") visible = recurrence === "monthly" && monthlySubtype === "nthweek";
                block.hidden = !visible;
            });
            this.syncOccasionLunarHint(form);
        };
        root.querySelector<HTMLSelectElement>("[data-occasion-recurrence]")?.addEventListener("change", syncBlocks);
        root.querySelector<HTMLSelectElement>("[data-occasion-monthly-subtype]")?.addEventListener("change", syncBlocks);
        root.querySelector<HTMLInputElement>("[name='date']")?.addEventListener("change", () => this.syncOccasionLunarHint(root.querySelector<HTMLFormElement>("[data-occasion-form]")));
        root.querySelector<HTMLSelectElement>("[data-occasion-calendar]")?.addEventListener("change", () => this.syncOccasionLunarHint(root.querySelector<HTMLFormElement>("[data-occasion-form]")));
        syncBlocks();

        root.querySelectorAll<HTMLButtonElement>("[data-occasion-template]").forEach((button) => button.addEventListener("click", () => {
            const template = OCCASION_TEMPLATES[Number(button.dataset.occasionTemplate)];
            if (!template) return;
            const form = root.querySelector<HTMLFormElement>("[data-occasion-form]");
            if (!form) return;
            const set = (name: string, value: string) => { const field = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`); if (field) field.value = value; };
            set("name", template.name);
            set("kind", template.kind);
            set("date", template.date || dateKey(currentCalendarDate()));
            set("recurrence", template.recurrence);
            set("calendar", template.calendar || "solar");
            set("annualSubtype", template.annualSubtype || "byday");
            set("annualMonth", String(template.month || 1));
            set("annualNth", String(template.nthWeek || 1));
            set("annualWeekday", String(template.weekday ?? 0));
            set("monthlySubtype", template.monthlySubtype || "byday");
            set("monthlyWeekday", String(template.weekday ?? 0));
            set("weeklyWeekday", String(template.weekday ?? 0));
            set("intervalCount", String(template.intervalCount || 1));
            set("intervalUnit", template.intervalUnit || "month");
            set("remindBeforeDays", String(template.remindBeforeDays));
            this.editingOccasionId = undefined;
            syncBlocks();
        }));

        root.querySelector<HTMLFormElement>("[data-occasion-form]")?.addEventListener("submit", (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            const data = new FormData(form);
            if (!String(data.get("name") || "").trim() || !isValidLocalDateInput(String(data.get("date") || ""))) {
                showMessage(t("msg.occasionInvalid"));
                return;
            }
            void this.enqueueMutation(() => this.saveOccasionForm(data));
        });
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

    private bindPageNavigation(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindMobileNav(root);
        root.querySelector<HTMLSelectElement>("[data-insight-item]")?.addEventListener("change", (event) => {
            const itemId = (event.currentTarget as HTMLSelectElement).value;
            if (!this.store.items.some((item) => item.id === itemId && !item.archived)) return;
        this.insightsItemId = itemId;
            void this.persistViewPreferences();
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => {
            if (this.currentPage === "insights" && this.insightsReturnPage === "review") this.showReview();
            else this.showToday();
        });
        root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => this.showArchived());
        root.querySelector<HTMLElement>("[data-action='occasions']")?.addEventListener("click", () => this.showOccasions());
        root.querySelectorAll<HTMLElement>("[data-review-insights-id]").forEach((button) => button.addEventListener("click", () => {
            const item = this.store.items.find((candidate) => candidate.id === button.dataset.reviewInsightsId && !candidate.archived);
            if (item) this.showInsights(item);
        }));
                root.querySelectorAll<HTMLElement>("[data-history-insights-id]").forEach((button) => button.addEventListener("click", () => {
            const item = this.store.items.find((candidate) => candidate.id === button.dataset.historyInsightsId && !candidate.archived);
            if (item) this.showInsights(item);
        }));
        const historySearch = root.querySelector<HTMLInputElement>("[data-history-search]");
        let historySearchTimer: number | undefined;
        historySearch?.addEventListener("input", () => {
            if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
            const value = historySearch.value;
            historySearchTimer = window.setTimeout(() => {
                if (this.disposed || this.disposing || this.currentPage !== "review") return;
                this.historyQuery = value;
                this.render();
                const nextSearch = root.querySelector<HTMLInputElement>("[data-history-search]");
                nextSearch?.focus();
                nextSearch?.setSelectionRange(value.length, value.length);
            }, 120);
        });
        root.querySelector<HTMLElement>("[data-action='clear-history-query']")?.addEventListener("click", () => {
            if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
            this.historyQuery = "";
            this.render();
            root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
        });
        root.querySelector<HTMLElement>("[data-action='clear-history-filters']")?.addEventListener("click", () => {
            if (historySearchTimer !== undefined) window.clearTimeout(historySearchTimer);
            this.historyQuery = "";
            this.historySource = "all";
            this.historyOrder = "newest";
            this.render();
            root.querySelector<HTMLInputElement>("[data-history-search]")?.focus();
        });
        root.querySelector<HTMLSelectElement>("[data-history-source]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "all" || value === "manual" || value === "tomato" || value === "import" || value === "api") {
                this.historySource = value;
                this.render();
                root.querySelector<HTMLSelectElement>("[data-history-source]")?.focus();
            }
        });
        root.querySelector<HTMLSelectElement>("[data-history-order]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "newest" || value === "oldest") {
                this.historyOrder = value;
                this.render();
                root.querySelector<HTMLSelectElement>("[data-history-order]")?.focus();
            }
        });
        root.querySelectorAll<HTMLElement>("[data-history-month]").forEach((button) => button.addEventListener("click", () => {
            this.changeHistoryMonth(Number(button.dataset.historyMonth));
        }));
        root.querySelectorAll<HTMLElement>("[data-history-date]").forEach((button) => button.addEventListener("click", () => {
            const value = button.dataset.historyDate;
            if (value) {
                this.selectedHistoryDate = value;
                this.render();
            }
        }));
        root.querySelectorAll<HTMLElement>("[data-history-event-id]").forEach((button) => button.addEventListener("click", () => {
            const eventId = button.dataset.historyEventId;
            const event = this.store.events.find((candidate) => candidate.id === eventId);
            if (!event) return;
            const moment = captureActionMoment();
            void this.enqueueMutation(async () => {
                const previous = this.store;
                const next = removeEvents(this.store, [event], moment.occurredAt);
                if (next === this.store) return;
                this.store = next;
                try { await this.persist(); } catch { this.store = previous; showMessage(t("msg.undoFail")); return; }
                this.invalidateSummary();
                this.broadcast({type: "event-deleted", item: this.store.items.find((item) => item.id === event.itemId), deletedEvents: [event]});
                this.renderBackgroundUpdate();
            });
        }));
        root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]").forEach((button) => button.addEventListener("click", () => {
            const event = this.store.events.find((candidate) => candidate.id === button.dataset.editHistoryEventId);
            if (!event) return;
            this.editingHistoryNoteId = event.id;
            this.render();
        }));
        root.querySelectorAll<HTMLElement>("[data-save-history-note-id]").forEach((button) => button.addEventListener("click", () => {
            const event = this.store.events.find((candidate) => candidate.id === button.dataset.saveHistoryNoteId);
            const input = root.querySelector<HTMLTextAreaElement>(`[data-history-note-input='${button.dataset.saveHistoryNoteId}']`);
            if (!event || !input) return;
            const note = input.value.trim();
            void this.enqueueMutation(async () => {
                const previous = this.store;
                const next = updateEventNote(this.store, event.id, note);
                if (next === this.store) return;
                this.store = next;
                try { await this.persist(); } catch { this.store = previous; showMessage(t("msg.noteSaveFail")); return; }
                this.invalidateSummary();
                this.editingHistoryNoteId = undefined;
                this.renderBackgroundUpdate();
            });
        }));
        const archivedSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
        let archivedSearchTimer: number | undefined;
        archivedSearch?.addEventListener("input", () => {
            if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
            const value = archivedSearch.value;
            archivedSearchTimer = window.setTimeout(() => {
                if (this.disposed || this.disposing || this.currentPage !== "archived") return;
                this.archivedQuery = value;
                this.render();
                const nextSearch = root.querySelector<HTMLInputElement>("[data-archived-search]");
                nextSearch?.focus();
                nextSearch?.setSelectionRange(value.length, value.length);
            }, 120);
        });
        root.querySelector<HTMLElement>("[data-action='clear-archived-query']")?.addEventListener("click", () => {
            if (archivedSearchTimer !== undefined) window.clearTimeout(archivedSearchTimer);
            this.archivedQuery = "";
            this.render();
            root.querySelector<HTMLInputElement>("[data-archived-search]")?.focus();
        });
        root.querySelectorAll<HTMLButtonElement>("[data-restore-id]").forEach((button) => button.addEventListener("click", () => {
            button.disabled = true;
            button.setAttribute("aria-busy", "true");
            void this.restoreItem(button.dataset.restoreId || "");
        }));
        root.querySelectorAll<HTMLElement>("[data-summary-range]").forEach((button) => button.addEventListener("click", () => {
            const range = button.dataset.summaryRange;
            if (range === "day" || range === "week" || range === "month") {
                this.summaryRange = range;
                this.summaryCustomRange = undefined;
                this.summaryText = undefined;
                this.summaryRequestId += 1;
                this.render();
            }
        }));
        root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => this.generateSummary());
        root.querySelector<HTMLElement>("[data-action='copy-weekly-report']")?.addEventListener("click", async () => {
            const summary = this.summaryCustomRange ? buildCustomSummaryContext(this.store, this.summaryCustomRange) : buildSummaryContext(this.store, this.summaryRange);
            const label = this.summaryRange === "day" ? "今日报告" : this.summaryRange === "month" ? "本月报告" : "本周报告";
            const markdown = buildWeeklyReportMarkdown(summary, `${label}（${summary.startDate} ~ ${summary.endDate}）`);
            try {
                await navigator.clipboard.writeText(markdown);
                showMessage(t("msg.reportCopied"));
            } catch {
                showMessage(t("msg.clipboardFail"));
            }
        });
        root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", () => this.downloadExport("csv"));
    }

    private bindDialogClose(root: HTMLElement) {
        root.querySelector<HTMLElement>("[data-action='close-dialog']")?.addEventListener("click", () => this.closeQuickDialog());
        root.querySelector<HTMLElement>("[data-action='toggle-fullscreen']")?.addEventListener("click", () => {
            const container = this.quickDialog?.element.querySelector<HTMLElement>(".b3-dialog__container");
            if (!container) return;
            this.quickDialogFullscreen = !this.quickDialogFullscreen;
            container.classList.toggle("lc-checkin-dialog--fullscreen", this.quickDialogFullscreen);
            this.renderInto(root);
        });
    }

    private bindMobileNav(root: HTMLElement) {
        root.querySelectorAll<HTMLElement>("[data-mobile-nav]").forEach((button) => button.addEventListener("click", () => {
            const page = button.dataset.mobileNav;
            if (page === "today") this.showToday();
            else if (page === "review" || page === "history" || page === "summary") this.showReview();
            else if (page === "insights") this.showInsights();
            else if (page === "archived") this.showArchived();
            else if (page === "occasions") this.showOccasions();
            else if (page === "settings") this.showSettings();
            else if (page === "add") this.showEditor();
        }));
    }

    private changeHistoryMonth(offset: number) {
        if (!Number.isInteger(offset) || !offset) {
            return;
        }
        const candidate = new Date(this.historyMonth.getFullYear(), this.historyMonth.getMonth() + offset, 1);
        const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        if (candidate > currentMonth) {
            return;
        }
        this.historyMonth = candidate;
        const prefix = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, "0")}-`;
        const latestRecordedDay = this.store.events.map(getEventDateKey).filter((key) => key.startsWith(prefix)).sort().reverse()[0];
        this.selectedHistoryDate = candidate.getTime() === currentMonth.getTime() ? dateKey(new Date()) : latestRecordedDay || dateKey(candidate);
        this.render();
    }

    private async restoreItem(itemId: string) {
        const moment = captureActionMoment();
        const expectedItem = this.store.items.find((item) => item.id === itemId);
        const expectedFingerprint = expectedItem ? this.itemFingerprint(expectedItem) : undefined;
        let restored = false;
        await this.enqueueMutation(async () => { restored = await this.setItemArchived(itemId, false, moment, expectedFingerprint); });
        if (restored && expectedItem) showMessage(t("msg.restoredNamed", {name: expectedItem.name}));
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
        this.lastExportAt = new Date().toISOString();
        void this.persistViewPreferences();
        const content = format === "json" ? serializeJson(this.cloneStore()) : serializeCsv(this.cloneStore());
        const blob = new Blob([content], {type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `siyuan-checkin-${dateKey(new Date())}.${format}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    private getSummaryEvents(range: SummaryRange, date = new Date()): CheckinEvent[] {
        return getEventsInRange(this.store, range, date).map((event) => ({...event}));
    }

    private bindEditor(root: HTMLElement) {
        this.bindMobileNav(root);
        this.bindDialogClose(root);
        root.querySelector<HTMLElement>("[data-action='retry-save']")?.addEventListener("click", () => {
            void this.retrySave();
        });
        const ensureEditorVisible = (element?: HTMLElement | null) => {
            if (!element) return;
            window.setTimeout(() => element.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"}), 80);
        };
        let activeIconGroup = root.querySelector<HTMLElement>("[data-icon-group].is-selected")?.dataset.iconGroup || ICON_GROUPS[0].id;
        /* T-012 图标弹层关闭后焦点回到"更换图标"按钮，保持键盘/读屏路径连续。 */
        const iconPopup = root.querySelector<HTMLDetailsElement>("[data-icon-popup]");
        const iconPopupSummary = iconPopup?.querySelector<HTMLElement>("summary");
        iconPopup?.addEventListener("toggle", () => { if (!iconPopup.open) iconPopupSummary?.focus(); });
        const selectIcon = (icon: string) => {
            root.querySelectorAll("[data-icon].is-selected").forEach((selected) => selected.classList.remove("is-selected"));
            const input = root.querySelector<HTMLInputElement>("input[name='icon']");
            if (input) input.value = icon || "✓";
            root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => {
                if (button.dataset.icon === icon) button.classList.add("is-selected");
            });
            const current = root.querySelector<HTMLElement>("[data-popup-current-icon]");
            if (current) current.replaceChildren(renderIconMarkup(icon || "✓"));
        };
        const selectIconGroup = (groupId: string) => {
            activeIconGroup = ICON_GROUPS.some((group) => group.id === groupId) ? groupId : ICON_GROUPS[0].id;
            const query = root.querySelector<HTMLInputElement>("[data-icon-query]");
            if (query) query.value = "";
            root.querySelectorAll<HTMLElement>("[data-icon-group]").forEach((button) => {
                const selected = button.dataset.iconGroup === activeIconGroup;
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-pressed", String(selected));
            });
            applyIconFilter();
        };
        const applyIconFilter = () => {
            const queryInput = root.querySelector<HTMLInputElement>("[data-icon-query]");
            const query = queryInput?.value || "";
            const hasQuery = Boolean(query.trim());
            let matchCount = 0;
            root.querySelectorAll<HTMLElement>("[data-icon-panel]").forEach((panel) => {
                let panelMatchCount = 0;
                panel.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => {
                    const matches = !hasQuery || matchesSearch(button.dataset.iconSearchText || button.dataset.icon || "", query);
                    button.hidden = !matches;
                    if (matches) panelMatchCount += 1;
                });
                matchCount += panelMatchCount;
                panel.hidden = hasQuery ? panelMatchCount === 0 : panel.dataset.iconPanel !== activeIconGroup;
            });
            const activeGroup = ICON_GROUPS.find((group) => group.id === activeIconGroup) || ICON_GROUPS[0];
            const count = root.querySelector<HTMLElement>("[data-icon-count]");
            if (count) count.textContent = hasQuery ? `${matchCount} 个匹配图标` : `${activeGroup.name} · ${activeGroup.icons.length} 个`;
            const empty = root.querySelector<HTMLElement>("[data-icon-empty]");
            if (empty) empty.hidden = matchCount > 0;
            root.querySelector<HTMLElement>("[data-icon-results]")?.classList.toggle("is-searching", hasQuery);
            root.querySelector<HTMLButtonElement>("[data-action='clear-icon-query']")?.toggleAttribute("hidden", !hasQuery);
        };
        root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => button.addEventListener("click", () => selectIcon(button.dataset.icon || "✓")));
        root.querySelectorAll<HTMLButtonElement>("[data-icon-group]").forEach((button) => button.addEventListener("click", () => selectIconGroup(button.dataset.iconGroup || ICON_GROUPS[0].id)));
        const iconQuery = root.querySelector<HTMLInputElement>("[data-icon-query]");
        iconQuery?.addEventListener("input", applyIconFilter);
        root.querySelectorAll<HTMLElement>("[data-action='clear-icon-query']").forEach((button) => button.addEventListener("click", () => {
            if (iconQuery) {
                iconQuery.value = "";
                iconQuery.focus();
            }
            applyIconFilter();
        }));
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => this.showToday());
        root.querySelector<HTMLElement>("[data-action='archive']")?.addEventListener("click", () => this.archiveEditingItem());
        const scheduleSelect = root.querySelector<HTMLSelectElement>("select[name='schedule']");
        const unitInput = root.querySelector<HTMLInputElement>("input[name='unit']");
        const targetInput = root.querySelector<HTMLInputElement>("input[name='target']");
        const getKind = () => (root.querySelector<HTMLInputElement>("input[name='kind']:checked")?.value || "binary") as CheckinKind;
        const updateEditorPreview = () => {
            const kind = getKind();
            const option = KIND_OPTIONS.find((candidate) => candidate.kind === kind) || KIND_OPTIONS[0];
            const name = root.querySelector<HTMLInputElement>("input[name='name']")?.value.trim() || "未命名打卡";
            const icon = root.querySelector<HTMLInputElement>("input[name='icon']")?.value || "✓";
            const unit = unitInput?.value.trim() || option.defaultUnit;
            const target = Number(targetInput?.value || option.step);
            const scheduleType = (scheduleSelect?.value || "daily") as ScheduleType;
            let scheduleLabel = t(SCHEDULE_LABELS[scheduleType] || SCHEDULE_LABELS.daily);
            if (scheduleType === "interval") {
                const days = Math.max(1, Number(root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.value || 1));
                scheduleLabel = `每隔 ${formatNumber(days)} 天`;
            } else if (scheduleType === "quota") {
                const period = root.querySelector<HTMLSelectElement>("select[name='quotaPeriod']")?.value === "month" ? "每月" : "每周";
                const amount = Number(root.querySelector<HTMLInputElement>("input[name='quotaAmount']")?.value || 1);
                const mode = root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.value === "value" ? unit : "天";
                scheduleLabel = `${period} ${formatNumber(amount)} ${mode}`;
            }
            const previewName = root.querySelector<HTMLElement>("[data-preview-name]");
            const previewIcon = root.querySelector<HTMLElement>("[data-preview-icon]");
            const previewMeta = root.querySelector<HTMLElement>("[data-preview-meta]");
            const previewAction = root.querySelector<HTMLElement>("[data-preview-action]");
            const previewProgress = root.querySelector<HTMLElement>("[data-preview-progress]");
            if (previewName) previewName.textContent = name;
            if (previewIcon) previewIcon.innerHTML = renderIconMarkup(icon);
            if (previewMeta) previewMeta.textContent = kind === "binary" ? `${t("kind.binary")} · ${scheduleLabel}` : `${t(KIND_LABELS[kind])} · 0 / ${formatNumber(Number.isFinite(target) ? target : option.step)} ${unit} · ${scheduleLabel}`;
            if (previewAction) previewAction.textContent = kind === "binary" ? "打卡" : `+${formatNumber(getRecordStep(kind, unit))} ${unit}`;
            if (previewProgress) previewProgress.hidden = kind === "binary";
        };
        const applyCustomIcon = () => {
            const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
            const customIcon = normalizeCustomIcon(input?.value || "");
            if (!customIcon) {
                showMessage(t("msg.iconInvalid"));
                input?.focus();
                return;
            }
            selectIcon(customIcon);
            if (input) input.value = customIcon;
            updateEditorPreview();
        };
        const applyLocalIcon = (icon: string, storageLabel: string) => {
            if (icon.length > MAX_CUSTOM_ICON_BYTES) {
                showMessage(t("msg.iconTooLarge", {action: storageLabel, kb: Math.round(MAX_CUSTOM_ICON_BYTES / 1024)}));
                return;
            }
            const sizeKb = Math.max(1, Math.round(icon.length * 0.75 / 1024));
            if (!window.confirm(t("msg.iconSaveConfirm", {kb: sizeKb}))) return;
            selectIcon(icon);
            const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
            if (input) input.value = icon;
            updateEditorPreview();
        };
        const readImageBlob = async (file: Blob): Promise<string> => {
            if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
            if (file.size > MAX_CUSTOM_ICON_BYTES) throw new Error(`图片超过 ${Math.round(MAX_CUSTOM_ICON_BYTES / 1024)} KB 限制`);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("图片读取失败"));
                reader.onerror = () => reject(new Error("图片读取失败"));
                reader.readAsDataURL(file);
            });
        };
        root.querySelector<HTMLElement>("[data-action='apply-custom-icon']")?.addEventListener("click", applyCustomIcon);
        root.querySelector<HTMLInputElement>("[data-custom-icon-input]")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") { event.preventDefault(); applyCustomIcon(); }
        });
        root.querySelector<HTMLInputElement>("[data-custom-icon-file]")?.addEventListener("change", async (event) => {
            const file = (event.currentTarget as HTMLInputElement).files?.[0];
            if (!file) return;
            try { applyLocalIcon(await readImageBlob(file), t("msg.upload")); } catch (error) { showMessage(`[小驴打卡] ${String(error instanceof Error ? error.message : error)}`); }
        });
        root.querySelector<HTMLElement>("[data-action='download-custom-icon']")?.addEventListener("click", async () => {
            const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]");
            const url = normalizeCustomIcon(input?.value || "");
            if (!url || !/^https:\/\//i.test(url)) { showMessage(t("msg.iconUrlNeeded")); input?.focus(); return; }
            try {
                const response = await fetch(url, {credentials: "omit"});
                if (!response.ok) throw new Error(`下载失败（${response.status}）`);
                const blob = await response.blob();
                if (!blob.type.startsWith("image/")) throw new Error("地址返回的不是图片");
                applyLocalIcon(await readImageBlob(blob), t("msg.download"));
            } catch (error) {
                showMessage(t("msg.iconDownloadFail", {error: String(error instanceof Error ? error.message : error)}));
            }
        });
        root.querySelector<HTMLElement>("[data-action='open-iconfont']")?.addEventListener("click", () => {
            window.open("https://www.iconfont.cn/", "_blank", "noopener,noreferrer");
        });
        root.querySelectorAll<HTMLButtonElement>("[data-library-icon]").forEach((button) => button.addEventListener("click", () => {
            const icon = button.dataset.libraryIcon || "";
            if (icon) { selectIcon(icon); const input = root.querySelector<HTMLInputElement>("[data-custom-icon-input]"); if (input) input.value = icon; updateEditorPreview(); }
        }));
        root.querySelector<HTMLInputElement>("[data-custom-icon-library]")?.addEventListener("change", async (event) => {
            const file = (event.currentTarget as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const parsed = parseCustomIconLibrary(await file.text());
                if (!parsed.length) throw new Error("没有找到可用图标");
                const merged = normalizeCustomIconLibrary([...this.customIconLibrary, ...parsed]);
                const added = merged.length - this.customIconLibrary.length;
                if (!added) throw new Error("图标库中没有新的图标");
                const sizeKb = Math.max(1, Math.round(merged.reduce((sum, icon) => sum + icon.length, 0) * 0.75 / 1024));
                if (!window.confirm(t("msg.iconImportConfirm", {n: added, kb: sizeKb}))) return;
                this.customIconLibrary = merged;
                await this.saveData(CUSTOM_ICON_LIBRARY_NAME, this.customIconLibrary);
                showMessage(t("msg.iconImported", {n: added}));
                this.render();
            } catch (error) { showMessage(t("msg.iconImportFail", {error: String(error instanceof Error ? error.message : error)})); }
        });
        let previousKind = getKind();
        const bindUnitOptions = () => {
            root.querySelectorAll<HTMLButtonElement>("[data-unit]").forEach((button) => button.addEventListener("click", () => {
                const nextUnit = button.dataset.unit || "";
                const previousUnit = unitInput?.value || "";
                if (targetInput && getKind() === "duration" && previousUnit !== nextUnit) {
                    const currentTarget = Number(targetInput.value);
                    if (Number.isFinite(currentTarget) && previousUnit === "分钟" && nextUnit === "小时") targetInput.value = formatNumber(currentTarget / 60);
                    if (Number.isFinite(currentTarget) && previousUnit === "小时" && nextUnit === "分钟") targetInput.value = formatNumber(currentTarget * 60);
                }
                if (unitInput) unitInput.value = nextUnit;
                root.querySelectorAll<HTMLButtonElement>("[data-unit]").forEach((candidate) => {
                    const selected = candidate.dataset.unit === nextUnit;
                    candidate.classList.toggle("is-selected", selected);
                    candidate.setAttribute("aria-pressed", String(selected));
                });
                unitInput?.dispatchEvent(new Event("change", {bubbles: true}));
            }));
        };
        const updateConditionalFields = (useKindDefault = false) => {
            const kind = getKind();
            const kindOption = KIND_OPTIONS.find((option) => option.kind === kind) || KIND_OPTIONS[0];
            const valueFields = root.querySelector<HTMLElement>("[data-value-fields]");
            const weekdays = root.querySelector<HTMLElement>("[data-weekdays]");
            const intervalSchedule = root.querySelector<HTMLElement>("[data-interval-schedule]");
            const quotaSchedule = root.querySelector<HTMLElement>("[data-quota-schedule]");
            if (valueFields) {
                valueFields.hidden = kind === "binary";
            }
            if (weekdays) {
                weekdays.hidden = scheduleSelect?.value !== "weekly" && scheduleSelect?.value !== "custom";
                if (!weekdays.hidden && !weekdays.querySelector<HTMLInputElement>("input[name='weekday']:checked")) {
                    const today = (new Date().getDay() + 6) % 7;
                    const fallback = weekdays.querySelector<HTMLInputElement>(`input[name='weekday'][value='${today}']`);
                    if (fallback) fallback.checked = true;
                }
            }
            if (intervalSchedule) intervalSchedule.hidden = scheduleSelect?.value !== "interval";
            if (quotaSchedule) quotaSchedule.hidden = scheduleSelect?.value !== "quota";
            const quotaMode = root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.value || "dates";
            const quotaAmount = root.querySelector<HTMLInputElement>("input[name='quotaAmount']");
            const quotaAmountLabel = root.querySelector<HTMLElement>("[data-quota-amount-label]");
            const quotaHelp = root.querySelector<HTMLElement>("[data-quota-help]");
            if (quotaAmount) {
                quotaAmount.min = quotaMode === "dates" ? "1" : String(getEditorStep(kind, unitInput?.value || kindOption.defaultUnit));
                quotaAmount.step = quotaMode === "dates" ? "1" : String(getEditorStep(kind, unitInput?.value || kindOption.defaultUnit));
            }
            if (quotaAmountLabel) quotaAmountLabel.textContent = quotaMode === "dates" ? "周期天数" : `周期${getTargetLabel(kind).replace(/^目标/, "")}`;
            if (quotaHelp) quotaHelp.textContent = quotaMode === "dates" ? "同一自然日多次记录只计 1 天，适合“每周运动 3 天”。" : "按当前单位累加周期内记录值，适合“每月阅读 600 分钟”。";
            const help = root.querySelector<HTMLElement>("[data-kind-help]");
            if (help) help.textContent = kindOption.description;
            const targetLabel = root.querySelector<HTMLElement>("[data-target-label]");
            if (targetLabel) targetLabel.textContent = getTargetLabel(kind);
            if (targetInput) {
                const step = getEditorStep(kind, unitInput?.value || kindOption.defaultUnit);
                targetInput.min = String(step);
                targetInput.step = String(step);
                const current = Number(targetInput.value);
                if (!Number.isFinite(current) || current < step) {
                    targetInput.value = String(step);
                } else {
                    const aligned = Math.ceil(current / step - 1e-9) * step;
                    const precision = step < 1 ? 2 : 6;
                    targetInput.value = String(Number(aligned.toFixed(precision)));
                }
            }
            if (unitInput) {
                const oldDefault = KIND_OPTIONS.find((option) => option.kind === previousKind)?.defaultUnit;
                if (useKindDefault && (!unitInput.value.trim() || unitInput.value === oldDefault)) {
                    unitInput.value = kindOption.defaultUnit;
                }
                unitInput.placeholder = kindOption.defaultUnit;
            }
            const unitOptions = root.querySelector<HTMLElement>("[data-unit-options]");
            if (unitOptions) {
                const selectedUnitValue = unitInput?.value || kindOption.defaultUnit;
                unitOptions.innerHTML = kindOption.units.map((unit) => `<button type="button" data-unit="${escapeHtml(unit)}" aria-pressed="${selectedUnitValue === unit ? "true" : "false"}" class="${selectedUnitValue === unit ? "is-selected" : ""}">${escapeHtml(unit)}</button>`).join("");
                bindUnitOptions();
            }
            previousKind = kind;
            updateEditorPreview();
        };
        root.querySelectorAll<HTMLInputElement>("input[name='kind']").forEach((input) => input.addEventListener("change", () => {
            updateConditionalFields(true);
            ensureEditorVisible(input.closest<HTMLElement>(".lc-checkin__kind-option"));
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
            this.summaryCustomRange = {startDate, endDate};
            this.summaryText = undefined;
            this.summaryRequestId += 1;
            this.render();
        });
        scheduleSelect?.addEventListener("change", () => updateConditionalFields(false));
        unitInput?.addEventListener("change", () => updateConditionalFields(false));
        root.querySelector<HTMLInputElement>("input[name='name']")?.addEventListener("input", updateEditorPreview);
        root.querySelector<HTMLInputElement>("input[name='target']")?.addEventListener("input", updateEditorPreview);
        root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.addEventListener("input", updateEditorPreview);
        root.querySelector<HTMLInputElement>("input[name='quotaAmount']")?.addEventListener("input", updateEditorPreview);
        root.querySelector<HTMLSelectElement>("select[name='quotaCountMode']")?.addEventListener("change", () => updateConditionalFields(false));
        root.querySelector<HTMLSelectElement>("select[name='quotaPeriod']")?.addEventListener("change", updateEditorPreview);
        root.querySelector<HTMLElement>("[data-action='anchor-today']")?.addEventListener("click", () => {
            const anchor = root.querySelector<HTMLInputElement>("input[name='anchorDate']");
            if (!anchor) return;
            anchor.value = dateKey(new Date());
            anchor.dispatchEvent(new Event("change", {bubbles: true}));
            updateAdvancedSummary();
            ensureEditorVisible(anchor);
        });
        bindUnitOptions();
        root.querySelectorAll<HTMLButtonElement>("[data-group-value]").forEach((button) => button.addEventListener("click", () => {
            const input = root.querySelector<HTMLInputElement>("input[name='group']");
            if (input) input.value = button.dataset.groupValue || "";
            updateAdvancedSummary();
        }));
        const templateQuery = root.querySelector<HTMLInputElement>("[data-template-query]");
        let activeTemplateGroup = "all";
        const applyTemplateFilter = () => {
            const query = templateQuery?.value || "";
            const hasQuery = Boolean(query.trim());
            let matchCount = 0;
            root.querySelectorAll<HTMLButtonElement>("[data-template-index]").forEach((button) => {
                const matches = (activeTemplateGroup === "all" || button.dataset.templateGroupValue === activeTemplateGroup)
                    && (!hasQuery || matchesSearch(button.dataset.templateSearchText || "", query));
                button.hidden = !matches;
                if (matches) matchCount += 1;
            });
            const count = root.querySelector<HTMLElement>("[data-template-count]");
            if (count) count.textContent = `${matchCount} 个模板`;
            root.querySelector<HTMLElement>("[data-template-empty]")?.toggleAttribute("hidden", matchCount > 0);
            root.querySelector<HTMLButtonElement>("[data-action='clear-template-query']")?.toggleAttribute("hidden", !hasQuery);
            root.querySelector<HTMLButtonElement>("[data-action='clear-template-filter']")?.toggleAttribute("hidden", !hasQuery && activeTemplateGroup === "all");
        };
        templateQuery?.addEventListener("input", applyTemplateFilter);
        root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((button) => button.addEventListener("click", () => {
            activeTemplateGroup = button.dataset.templateGroup || "all";
            root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((candidate) => {
                const selected = candidate.dataset.templateGroup === activeTemplateGroup;
                candidate.setAttribute("aria-pressed", String(selected));
                candidate.classList.toggle("is-selected", selected);
            });
            applyTemplateFilter();
        }));
        root.querySelectorAll<HTMLElement>("[data-action='clear-template-query']").forEach((button) => button.addEventListener("click", () => {
            if (templateQuery) {
                templateQuery.value = "";
                templateQuery.focus();
            }
            applyTemplateFilter();
        }));
        root.querySelectorAll<HTMLElement>("[data-action='clear-template-filter']").forEach((button) => button.addEventListener("click", () => {
            activeTemplateGroup = "all";
            if (templateQuery) templateQuery.value = "";
            root.querySelectorAll<HTMLButtonElement>("[data-template-group]").forEach((candidate) => {
                const selected = candidate.dataset.templateGroup === "all";
                candidate.setAttribute("aria-pressed", String(selected));
                candidate.classList.toggle("is-selected", selected);
            });
            applyTemplateFilter();
            templateQuery?.focus();
        }));
        root.querySelectorAll<HTMLButtonElement>("[data-template-index]").forEach((button) => button.addEventListener("click", () => {
            const template = CHECKIN_TEMPLATES[Number(button.dataset.templateIndex)];
            if (!template) return;
            root.querySelectorAll<HTMLButtonElement>("[data-template-index]").forEach((candidate) => {
                const selected = candidate === button;
                candidate.classList.toggle("is-selected", selected);
                candidate.setAttribute("aria-pressed", String(selected));
            });
            const setInput = (name: string, value: string) => {
                const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
                if (control) control.value = value;
            };
            setInput("name", templateName(template));
            setInput("target", String(template.target));
            setInput("unit", template.unit);
            setInput("group", template.group);
            setInput("priority", template.priority);
            setInput("timeSlot", template.timeSlot || "any");
            setInput("completionSource", template.completionSource || "manual");
            setInput("tomatoMode", template.tomatoMode || "minutes");
            setInput("schedule", template.schedule.type);
            const kindInput = root.querySelector<HTMLInputElement>(`input[name='kind'][value='${template.kind}']`);
            if (kindInput) kindInput.checked = true;
            root.querySelectorAll<HTMLInputElement>("input[name='weekday']").forEach((input) => {
                input.checked = (template.schedule.weekdays || []).includes(Number(input.value));
            });
            selectIcon(template.icon);
            const iconGroup = ICON_GROUPS.find((group) => group.icons.includes(template.icon));
            if (iconGroup) selectIconGroup(iconGroup.id);
            updateConditionalFields(false);
            root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", template.completionSource !== "tomato");
            root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", template.completionSource !== "tomato");
            updateEditorPreview();
            updateAdvancedSummary();
            const advanced = root.querySelector<HTMLDetailsElement>("[data-advanced]");
            if (advanced) advanced.open = true;
            ensureEditorVisible(root.querySelector<HTMLInputElement>("input[name='name']"));
            root.querySelector<HTMLInputElement>("input[name='name']")?.focus();
        }));
        root.querySelectorAll<HTMLButtonElement>("[data-user-template-id]").forEach((button) => button.addEventListener("click", () => {
            const template = this.userTemplates.find((candidate) => candidate.id === button.dataset.userTemplateId);
            if (!template) return;
            const setInput = (name: string, value: string) => {
                const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
                if (control) control.value = value;
            };
            setInput("name", templateName(template)); setInput("target", String(template.target)); setInput("unit", template.unit); setInput("group", template.group); setInput("priority", template.priority); setInput("timeSlot", template.timeSlot || "any"); setInput("completionSource", template.completionSource || "manual"); setInput("tomatoMode", template.tomatoMode || "minutes"); setInput("schedule", template.schedule.type);
            const kindInput = root.querySelector<HTMLInputElement>(`input[name='kind'][value='${template.kind}']`); if (kindInput) kindInput.checked = true;
            root.querySelectorAll<HTMLInputElement>("input[name='weekday']").forEach((input) => { input.checked = (template.schedule.weekdays || []).includes(Number(input.value)); });
            selectIcon(template.icon); updateConditionalFields(false); root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", template.completionSource !== "tomato"); root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", template.completionSource !== "tomato"); updateEditorPreview(); updateAdvancedSummary();
            ensureEditorVisible(root.querySelector<HTMLInputElement>("input[name='name']"));
        }));
        root.querySelectorAll<HTMLButtonElement>("[data-user-template-delete]").forEach((button) => button.addEventListener("click", () => {
            const id = button.dataset.userTemplateDelete;
            const template = this.userTemplates.find((candidate) => candidate.id === id);
            if (!id || !template || !window.confirm(t("msg.templateDeleteConfirm", {name: template.name}))) return;
            const nextTemplates = deleteUserTemplate(this.userTemplates, id);
            void this.saveData(USER_TEMPLATES_NAME, nextTemplates).then(() => {
                this.userTemplates = nextTemplates;
                showMessage(t("msg.templateDeleted"));
                this.render();
            }).catch(() => showMessage(t("msg.templateDeleteFail")));
        }));
        root.querySelector<HTMLButtonElement>("[data-action='save-template']")?.addEventListener("click", () => {
            const form = root.querySelector<HTMLFormElement>("form");
            if (!form) return;
            const data = new FormData(form);
            const name = String(data.get("name") || "").trim();
            const kind = String(data.get("kind") || "binary") as CheckinKind;
            const scheduleType = String(data.get("schedule") || "daily") as ScheduleType;
            const target = kind === "binary" ? 1 : Number(data.get("target"));
            const unit = kind === "binary" ? "次" : String(data.get("unit") || "").trim();
            const validation = validateEditorInput({name, kind, target, unit, schedule: scheduleType, weekdays: data.getAll("weekday").map(Number), quotaAmount: Number(data.get("quotaAmount"))});
            if (!validation.valid) {
                showMessage(`[小驴打卡] ${validation.errors.name || validation.errors.target || validation.errors.unit || validation.errors.schedule || t("msg.formInvalid")}`);
                return;
            }
            const existing = this.userTemplates.find((template) => template.name === name);
            const weekdays = data.getAll("weekday").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
            const intervalDays = Math.max(1, Math.min(3650, Math.round(Number(data.get("intervalDays")) || 1)));
            const anchorDate = String(data.get("anchorDate") || dateKey(currentCalendarDate()));
            const quotaPeriod = data.get("quotaPeriod") === "month" ? "month" : "week";
            const quotaCountMode = data.get("quotaCountMode") === "value" ? "value" : "dates";
            const quotaAmount = Math.max(quotaCountMode === "dates" ? 1 : 0.1, Number(data.get("quotaAmount")) || 1);
            const schedule: CheckinSchedule = scheduleType === "interval"
                ? {type: "interval", intervalDays, anchorDate}
                : scheduleType === "quota"
                    ? {type: "quota", quota: {period: quotaPeriod, amount: quotaAmount, countMode: quotaCountMode, ...(quotaPeriod === "week" ? {weekStartsOn: 1 as const} : {})}}
                    : {type: scheduleType, weekdays: scheduleType === "weekly" || scheduleType === "custom" ? weekdays : undefined};
            const now = new Date().toISOString();
            const template: UserTemplate = {
                id: existing?.id || makeId("template"), name, icon: String(data.get("icon") || "✓"), kind,
                target: kind === "binary" ? 1 : Math.max(0.1, target || 1), unit: unit || "次",
                schedule, group: String(data.get("group") || "").trim(),
                priority: normalizePriorityInput(data.get("priority")), timeSlot: normalizeTimeSlotInput(data.get("timeSlot")), completionSource: data.get("completionSource") === "tomato" ? "tomato" : "manual", tomatoMode: data.get("tomatoMode") === "sessions" ? "sessions" : "minutes", note: "来自编辑器保存", createdAt: existing?.createdAt || now, updatedAt: now,
            };
            this.userTemplates = upsertUserTemplate(this.userTemplates, template);
            void this.saveData(USER_TEMPLATES_NAME, this.userTemplates).then(() => { showMessage(t("msg.templateSaved")); this.render(); }).catch(() => {
                showMessage(t("msg.templateSaveFail"));
            });
        });
        const updateAdvancedSummary = () => {
            const group = root.querySelector<HTMLInputElement>("input[name='group']")?.value.trim() || t("review.ungrouped");
            const priority = normalizePriorityInput(root.querySelector<HTMLSelectElement>("select[name='priority']")?.value || null);
            const timeSlot = normalizeTimeSlotInput(root.querySelector<HTMLSelectElement>("select[name='timeSlot']")?.value || null);
            const linkedToTomato = root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.value === "tomato";
            const completionSource = linkedToTomato ? `番茄钟·${root.querySelector<HTMLSelectElement>("select[name='tomatoMode']")?.value === "sessions" ? "次数" : "分钟"}` : "手动记录";
            const schedule = root.querySelector<HTMLSelectElement>("select[name='schedule']")?.value as ScheduleType || "daily";
            const interval = Number(root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.value || 1);
            const scheduleLabel = schedule === "interval" ? t("schedule.intervalN", {n: Math.max(1, Math.round(interval))}) : t(SCHEDULE_LABELS[schedule]);
            const pieces = [group, t(PRIORITY_LABELS[priority]), timeSlot === "any" ? "" : t(TIME_SLOT_LABELS[timeSlot]), completionSource, scheduleLabel].filter(Boolean);
            root.querySelector<HTMLElement>("[data-advanced-summary]")?.replaceChildren(document.createTextNode(pieces.join(" · ")));
        };
        const updateTomatoFields = () => {
            const linked = root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.value === "tomato";
            root.querySelector<HTMLElement>("[data-tomato-mode-field]")?.toggleAttribute("hidden", !linked);
            root.querySelector<HTMLElement>("[data-tomato-help]")?.toggleAttribute("hidden", !linked);
            updateAdvancedSummary();
        };
        root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("input", updateAdvancedSummary));
        root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("change", updateAdvancedSummary));
        root.querySelector<HTMLSelectElement>("select[name='completionSource']")?.addEventListener("change", updateTomatoFields);
        root.querySelector<HTMLSelectElement>("select[name='tomatoMode']")?.addEventListener("change", updateAdvancedSummary);
        updateConditionalFields();
        updateEditorPreview();
        applyIconFilter();
        applyTemplateFilter();
        updateTomatoFields();
        updateAdvancedSummary();
        root.querySelector<HTMLFormElement>("form")?.addEventListener("submit", (event) => {
            event.preventDefault();
            const form = event.currentTarget as HTMLFormElement;
            if (form.dataset.submitting === "true") return;
            form.dataset.submitting = "true";
            const data = new FormData(form);
            const editingId = this.editingId;
            const submittedAt = captureActionMoment();
            const expectedFingerprint = editingId ? this.editingFingerprint : undefined;
            const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
            if (submitButton) submitButton.disabled = true;
            const resetSubmitting = () => {
                form.dataset.submitting = "false";
                if (submitButton) submitButton.disabled = false;
            };
            void this.enqueueMutation(() => this.saveForm(data, editingId, submittedAt, expectedFingerprint)).then(resetSubmitting, resetSubmitting);
        });
    }

    private async saveForm(data: FormData, editingId: string | undefined, submittedAt: ActionMoment, expectedFingerprint?: string) {
        const name = String(data.get("name") || "").trim();
        const requestedKind = String(data.get("kind") || "binary");
        const kind: CheckinKind = KIND_OPTIONS.some((option) => option.kind === requestedKind) ? requestedKind as CheckinKind : "binary";
        const requestedSchedule = String(data.get("schedule") || "daily");
        const scheduleType: ScheduleType = ["daily", "workdays", "weekly", "custom", "interval", "quota"].includes(requestedSchedule) ? requestedSchedule as ScheduleType : "daily";
        const checkedWeekdays = data.getAll("weekday").map((value) => Number(value));
        const requestedInterval = Number(data.get("intervalDays"));
        const intervalDaysValue = Number.isFinite(requestedInterval) ? Math.max(1, Math.min(3650, Math.round(requestedInterval))) : 1;
        const requestedAnchor = String(data.get("anchorDate") || "");
        const anchorDateValue = isValidLocalDateInput(requestedAnchor) ? requestedAnchor : submittedAt.localDate;
        const requestedQuotaPeriod = data.get("quotaPeriod") === "month" ? "month" : "week";
        const requestedQuotaMode = data.get("quotaCountMode") === "value" ? "value" : "dates";
        const requestedQuotaAmount = Number(data.get("quotaAmount"));
        const quotaAmountValue = Number.isFinite(requestedQuotaAmount) ? Math.max(requestedQuotaMode === "dates" ? 1 : 0.1, requestedQuotaAmount) : 0;
        const validation = validateEditorInput({name, kind, target: kind === "binary" ? 1 : Number(data.get("target")), unit: kind === "binary" ? "次" : String(data.get("unit") || "").trim(), schedule: scheduleType, weekdays: checkedWeekdays, quotaAmount: requestedQuotaAmount});
        if (!validation.valid) {
            showMessage(`[小驴打卡] ${validation.errors.name || validation.errors.target || validation.errors.unit || validation.errors.schedule || t("msg.formInvalid")}`);
            return;
        }
        const schedule: CheckinSchedule = scheduleType === "interval"
            ? {type: scheduleType, intervalDays: intervalDaysValue, anchorDate: anchorDateValue}
            : scheduleType === "quota"
                ? {type: scheduleType, quota: {period: requestedQuotaPeriod, amount: Math.round(quotaAmountValue * 100) / 100, countMode: requestedQuotaMode, ...(requestedQuotaPeriod === "week" ? {weekStartsOn: 1 as const} : {})}}
                : {type: scheduleType, weekdays: scheduleType === "daily" || scheduleType === "workdays" ? undefined : checkedWeekdays};
        const existing = editingId ? this.store.items.find((item) => item.id === editingId) : undefined;
        if (editingId && (!existing || !expectedFingerprint || this.itemFingerprint(existing) !== expectedFingerprint)) {
            showMessage(t("msg.conflictEdit"));
            this.showToday();
            return;
        }
        const createdDate = existing?.createdDate || submittedAt.localDate;
        const target = kind === "binary" ? 1 : Math.max(0.1, Number(data.get("target")) || 1);
        const kindOption = KIND_OPTIONS.find((option) => option.kind === kind) || KIND_OPTIONS[0];
        const unit = kind === "binary" ? "次" : String(data.get("unit") || kindOption.defaultUnit).trim().slice(0, 16) || kindOption.defaultUnit;
        const group = String(data.get("group") || "").trim().slice(0, 32);
        const priority = normalizePriorityInput(data.get("priority"));
        const timeSlot = normalizeTimeSlotInput(data.get("timeSlot"));
        const completionSource: CompletionSource = data.get("completionSource") === "tomato" ? "tomato" : "manual";
        const tomatoMode: TomatoValueMode = data.get("tomatoMode") === "sessions" ? "sessions" : "minutes";
        const sortOrder = existing?.sortOrder ?? this.store.items.reduce((maximum, candidate) => candidate.group === group ? Math.max(maximum, candidate.sortOrder || 0) : maximum, 0) + 1;
        const revision: CheckinItemRevision = {
            effectiveDate: submittedAt.localDate,
            kind,
            target,
            unit,
            schedule: {...schedule, weekdays: schedule.weekdays ? [...schedule.weekdays] : undefined},
        };
        const revisions: CheckinItemRevision[] = existing?.revisions.map((entry) => ({
            ...entry,
            schedule: {...entry.schedule, weekdays: entry.schedule.weekdays ? [...entry.schedule.weekdays] : undefined},
        })) || [];
        const revisionIndex = revisions.findIndex((entry) => entry.effectiveDate === revision.effectiveDate);
        if (revisionIndex >= 0) {
            revisions[revisionIndex] = revision;
        } else {
            revisions.push(revision);
            revisions.sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
        }
        const item: CheckinItem = {
            id: existing?.id || makeId("item"),
            name,
            icon: String(data.get("icon") || "✓"),
            kind,
            target,
            unit,
            schedule,
            createdAt: existing?.createdAt || submittedAt.occurredAt,
            updatedAt: nextItemUpdatedAt(existing?.updatedAt, submittedAt.occurredAt),
            createdDate,
            revisions,
            archivePeriods: existing?.archivePeriods.map((period) => ({...period})) || [],
            archived: existing?.archived,
            group,
            priority,
            sortOrder,
            timeSlot,
            completionSource,
            tomatoMode,
        };
        const previous = this.store;
        this.store = {
            ...this.store,
            items: existing ? this.store.items.map((candidate) => candidate.id === item.id ? item : candidate) : [...this.store.items, item],
        };
        try {
            await this.persist();
        } catch {
            this.store = previous;
            showMessage(t("msg.saveFail"));
            this.renderBackgroundUpdate();
            return;
        }
        this.invalidateSummary();
        this.broadcast({type: existing ? "item-updated" : "item-created", item});
        this.showToday();
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

    private startFocus(itemId: string): Promise<boolean> {
        if (!this.acceptingOperations || this.disposed || this.initializationState !== "ready" || this.focusBusy || this.activeFocusAdapter) return Promise.resolve(false);
        const startedAt = currentCalendarDate();
        const item = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
        if (!item || !isItemAvailableOnDate(item, startedAt) || getItemRevisionForDate(item, startedAt).kind === "binary") {
            return Promise.resolve(false);
        }
        const adapter = this.findFocusAdapter(item, startedAt);
        if (!adapter) {
            return Promise.resolve(false);
        }
        const expectedRevisionFingerprint = this.revisionFingerprint(item, startedAt);
        this.focusBusy = true;
        const operation = (async () => {
            try {
                await adapter.start(this.cloneItemForDate(item, startedAt));
                const current = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
                if (this.disposed || this.disposing || !this.acceptingOperations || this.focusAdapters.get(adapter.id) !== adapter || !current || !isItemAvailableOnDate(current, startedAt) || this.revisionFingerprint(current, startedAt) !== expectedRevisionFingerprint || !this.canStartWithAdapter(adapter, current, startedAt)) {
                    await this.stopAdapterSilently(adapter);
                    return false;
                }
                this.activeFocusAdapter = adapter;
                return true;
            } catch (error) {
                if (!this.disposed) showMessage(t("msg.focusStartFail", {error: String(error)}));
                return false;
            } finally {
                this.focusBusy = false;
                this.renderBackgroundUpdate();
            }
        })();
        this.focusOperation = operation.then(() => undefined, () => undefined);
        return operation;
    }

    private findFocusAdapter(item: CheckinItem, date = new Date()): FocusAdapter | undefined {
        return [...this.focusAdapters.values()].find((candidate) => this.canStartWithAdapter(candidate, item, date));
    }

    private canStartWithAdapter(adapter: FocusAdapter, item: CheckinItem, date: Date): boolean {
        if (getItemRevisionForDate(item, date).kind === "binary") return false;
        try {
            return adapter.canStart(this.cloneItemForDate(item, date));
        } catch {
            return false;
        }
    }

    private stopAdapterSilently(adapter: FocusAdapter): Promise<void> {
        return Promise.resolve().then(() => adapter.stop()).catch(() => undefined);
    }

    private stopFocus(): Promise<boolean> {
        if (!this.acceptingOperations || this.disposed || this.focusBusy || !this.activeFocusAdapter) return Promise.resolve(false);
        const adapter = this.activeFocusAdapter;
        this.focusBusy = true;
        const operation = (async () => {
            try {
                await adapter.stop();
                if (this.activeFocusAdapter === adapter) this.activeFocusAdapter = undefined;
                return true;
            } catch (error) {
                if (!this.disposed) showMessage(t("msg.focusStopFail", {error: String(error)}));
                return false;
            } finally {
                this.focusBusy = false;
                this.renderBackgroundUpdate();
            }
        })();
        this.focusOperation = operation.then(() => undefined, () => undefined);
        return operation;
    }

    private makeEvent(item: CheckinItem, value: number, source: CheckinEvent["source"], unit: string, note?: string, externalRef?: string, moment = captureActionMoment(), attachment?: string): CheckinEvent {
        const safeValue = Number(value);
        return {
            id: makeId("event"),
            itemId: item.id,
            occurredAt: moment.occurredAt,
            localDate: moment.localDate,
            value: Number.isFinite(safeValue) ? Math.max(0, safeValue) : 0,
            unit,
            source,
            note,
            externalRef,
            attachment: typeof attachment === "string" && attachment.startsWith("data:image/") && attachment.length <= 700000 ? attachment : undefined,
        };
    }

    private cloneItem(item: CheckinItem): CheckinItem {
        return {
            ...item,
            schedule: {...item.schedule, weekdays: item.schedule.weekdays ? [...item.schedule.weekdays] : undefined},
            revisions: item.revisions.map((revision) => ({
                ...revision,
                schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
            })),
            archivePeriods: item.archivePeriods.map((period) => ({...period})),
        };
    }

    private itemFingerprint(item: CheckinItem): string {
        return JSON.stringify(this.cloneItem(item));
    }

    private revisionFingerprint(item: CheckinItem, date: Date): string {
        const revision = getItemRevisionForDate(item, date);
        return JSON.stringify({
            ...revision,
            schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
        });
    }

    private cloneItemForDate(item: CheckinItem, date: Date): CheckinItem {
        const clone = this.cloneItem(item);
        const revision = getItemRevisionForDate(item, date);
        return {
            ...clone,
            kind: revision.kind,
            target: revision.target,
            unit: revision.unit,
            schedule: {...revision.schedule, weekdays: revision.schedule.weekdays ? [...revision.schedule.weekdays] : undefined},
        };
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

    /* 6.0 P1 bulk operations: multi-select pending rows, then complete/archive in one pass. */
    private bindBulkMode(root: HTMLElement) {
        root.querySelector<HTMLElement>("[data-action='toggle-bulk']")?.addEventListener("click", () => {
            this.bulkMode = !this.bulkMode;
            this.bulkSelected.clear();
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='bulk-exit']")?.addEventListener("click", () => {
            this.bulkMode = false;
            this.bulkSelected.clear();
            this.render();
        });
        root.querySelectorAll<HTMLElement>("[data-bulk-check]").forEach((button) => button.addEventListener("click", () => {
            const id = button.dataset.bulkCheck || "";
            if (!id) return;
            if (this.bulkSelected.has(id)) this.bulkSelected.delete(id);
            else this.bulkSelected.add(id);
            this.render();
        }));
        root.querySelector<HTMLElement>("[data-action='bulk-all']")?.addEventListener("click", () => {
            const date = currentCalendarDate();
            for (const item of this.store.items) {
                if (item.archived || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date) || isComplete(this.store, item, date)) continue;
                this.bulkSelected.add(item.id);
            }
            this.render();
        });
        root.querySelector<HTMLElement>("[data-action='bulk-complete']")?.addEventListener("click", () => {
            const ids = [...this.bulkSelected];
            if (!ids.length) return;
            const date = currentCalendarDate();
            for (const id of ids) {
                const item = this.store.items.find((candidate) => candidate.id === id && !candidate.archived);
                if (!item || isComplete(this.store, item, date)) continue;
                const moment = captureActionMoment();
                const revision = getItemRevisionForDate(item, date);
                const fingerprint = this.revisionFingerprint(item, date);
                const remaining = evaluateRule(item, this.store.events, date).remaining ?? 0;
                const value = revision.kind === "binary" ? 1 : Math.max(0, remaining);
                if (value <= 0) continue;
                void this.enqueueMutation(() => this.recordEvent(item, value, moment, fingerprint));
            }
            this.bulkMode = false;
            this.bulkSelected.clear();
        });
        root.querySelector<HTMLElement>("[data-action='bulk-archive']")?.addEventListener("click", () => {
            const ids = [...this.bulkSelected];
            if (!ids.length) return;
            for (const id of ids) {
                const item = this.store.items.find((candidate) => candidate.id === id && !candidate.archived);
                if (!item) continue;
                void this.enqueueMutation(() => this.setItemArchived(id, true, captureActionMoment(), this.itemFingerprint(item)));
            }
            this.bulkMode = false;
            this.bulkSelected.clear();
        });
    }

    /* 7.0 P3 CSV import: group rows by name, create missing items (binary when
       every value is 1), append events with source "import"; identical
       item+date+value+unit rows are skipped as duplicates. */
    private importCsvRows(rows: Array<{name: string; date: string; value: number; unit: string; binary: boolean}>): {itemsCreated: number; eventsCreated: number; duplicates: number} {
        const byName = new Map<string, CheckinItem>();
        let itemsCreated = 0;
        const now = new Date().toISOString();
        const today = dateKey(new Date());
        const resolveItem = (name: string, unit: string, binary: boolean): CheckinItem => {
            const existing = byName.get(name) || this.store.items.find((candidate) => !candidate.archived && candidate.name === name);
            if (existing) return existing;
            const created = normalizeCheckinItem({
                id: makeId("item"),
                name,
                icon: "✓",
                kind: binary ? "binary" : "count",
                target: 1,
                unit: binary ? "次" : unit,
                schedule: {type: "daily"},
                createdDate: today,
                createdAt: now,
                updatedAt: now,
            })!;
            byName.set(name, created);
            itemsCreated += 1;
            return created;
        };
        const resolved: CheckinItem[] = [];
        const events: CheckinEvent[] = [];
        let eventsCreated = 0;
        let duplicates = 0;
        for (const row of rows) {
            const item = resolveItem(row.name, row.unit, row.binary);
            resolved.push(item);
            const date = row.date;
            const duplicate = this.store.events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit)
                || events.some((event) => event.itemId === item.id && event.localDate === date && event.value === row.value && event.unit === row.unit);
            if (duplicate) { duplicates += 1; continue; }
            events.push({
                id: makeId("event"),
                itemId: item.id,
                occurredAt: new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12, 0).toISOString(),
                localDate: date,
                value: row.value,
                unit: row.unit || item.unit,
                source: "import",
            });
            eventsCreated += 1;
        }
        const knownIds = new Set([...this.store.items, ...resolved].map((item) => item.id));
        const items = [...this.store.items, ...resolved.filter((item) => !this.store.items.some((existing) => existing.id === item.id))];
        void knownIds;
        this.store = {...this.store, items, events: [...this.store.events, ...events]};
        return {itemsCreated, eventsCreated, duplicates};
    }

    /* 6.0 P0 drag-sort: pointer drag on the handle reorders within the group;
       drop persists group-local sortOrder 1..N (manual sort mode only). */
    private bindItemDrag(root: HTMLElement) {
        root.querySelectorAll<HTMLElement>("[data-drag-handle]").forEach((handle) => {
            handle.addEventListener("pointerdown", (event) => {
                if (this.todaySortMode !== "manual") return;
                const item = handle.closest<HTMLElement>(".lc-checkin__item");
                const container = item?.parentElement;
                if (!item || !container || item.closest(".lc-checkin__completed-section")) return;
                event.preventDefault();
                try { handle.setPointerCapture(event.pointerId); } catch { /* pointer may be released already */ }
                item.classList.add("is-dragging");
                const onMove = (moveEvent: PointerEvent) => {
                    const siblings = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")].filter((el) => el !== item);
                    const target = siblings.find((sibling) => {
                        const box = sibling.getBoundingClientRect();
                        return moveEvent.clientY < box.top + box.height / 2;
                    });
                    if (target) container.insertBefore(item, target);
                    else container.appendChild(item);
                };
                const finish = () => {
                    item.classList.remove("is-dragging");
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", finish);
                    window.removeEventListener("pointercancel", finish);
                    const orderedIds = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")]
                        .map((el) => el.dataset.itemId || "")
                        .filter(Boolean);
                    if (orderedIds.length) void this.enqueueMutation(() => this.reorderItems(orderedIds));
                };
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", finish);
                window.addEventListener("pointercancel", finish);
            });
        });
        root.addEventListener("keydown", (event) => {
            if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
            const target = event.target as HTMLElement | null;
            const item = target?.closest?.(".lc-checkin__item");
            if (!item || item.closest(".lc-checkin__completed-section") || this.todaySortMode !== "manual") return;
            const container = item.parentElement;
            if (!container) return;
            event.preventDefault();
            if (event.key === "ArrowUp" && item.previousElementSibling) container.insertBefore(item, item.previousElementSibling);
            if (event.key === "ArrowDown" && item.nextElementSibling) container.insertBefore(item.nextElementSibling, item);
            const orderedIds = [...container.querySelectorAll<HTMLElement>(".lc-checkin__item")].map((el) => el.dataset.itemId || "").filter(Boolean);
            if (orderedIds.length) void this.enqueueMutation(() => this.reorderItems(orderedIds));
        });
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
    private openFocusTimer(itemId: string) {
        const item = this.store.items.find((candidate) => candidate.id === itemId && !candidate.archived);
        if (!item) return;
        if (this.focusTimerInterval !== undefined) { window.clearInterval(this.focusTimerInterval); this.focusTimerInterval = undefined; }
        this.focusTimerState = {itemId, totalSec: this.focusTimerMinutes * 60, remainingSec: this.focusTimerMinutes * 60, running: true};
        this.focusTimerInterval = window.setInterval(() => this.tickFocusTimer(), 1000);
        this.render();
    }

    private tickFocusTimer() {
        const state = this.focusTimerState;
        if (!state || !state.running) return;
        state.remainingSec = Math.max(0, state.remainingSec - 1);
        const panel = document.querySelector("[data-focus-timer]");
        if (panel) this.paintFocusTimer(panel as HTMLElement, state);
        if (state.remainingSec <= 0) void this.finishFocusTimer(true);
    }

    private paintFocusTimer(panel: HTMLElement, state: {remainingSec: number; totalSec: number; running: boolean}) {
        const time = panel.querySelector<HTMLElement>("[data-focus-remaining]");
        if (time) {
            const minutes = Math.floor(state.remainingSec / 60);
            const seconds = state.remainingSec % 60;
            time.textContent = `${minutes}:${String(seconds).padStart(2, "0")}`;
        }
        const bar = panel.querySelector<HTMLElement>("[data-focus-progress] span");
        if (bar) bar.style.width = `${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%`;
        const toggle = panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']");
        if (toggle) toggle.textContent = state.running ? "暂停" : "继续";
    }

    private async finishFocusTimer(complete: boolean) {
        const state = this.focusTimerState;
        if (!state) return;
        if (this.focusTimerInterval !== undefined) { window.clearInterval(this.focusTimerInterval); this.focusTimerInterval = undefined; }
        this.focusTimerState = undefined;
        this.focusTimerRoot = undefined;
        const elapsedMinutes = Math.floor((state.totalSec - state.remainingSec) / 60);
        if (complete && elapsedMinutes >= 1) {
            const item = this.store.items.find((candidate) => candidate.id === state.itemId && !candidate.archived);
            if (item) {
                const moment = captureActionMoment();
                const date = calendarDateFromKey(moment.localDate);
                const fingerprint = this.revisionFingerprint(item, date);
                let unit = item.unit || "分钟";
                let value = elapsedMinutes;
                if (unit === "小时") { value = Math.round(elapsedMinutes / 6) / 10; unit = "小时"; }
                void this.enqueueMutation(() => this.recordEvent(item, value, moment, fingerprint, `专注 ${elapsedMinutes} 分钟`));
                this.celebration = {message: `专注 ${elapsedMinutes} 分钟`, itemName: item.name};
                window.setTimeout(() => { this.celebration = undefined; this.render(); }, 6000);
            }
        } else if (complete) {
            showMessage(t("msg.focusTooShort"));
        }
        this.render();
    }

    private renderFocusTimerPanel(): string {
        const state = this.focusTimerState;
        if (!state) return "";
        const item = this.store.items.find((candidate) => candidate.id === state.itemId);
        const name = item ? item.name : "专注";
        const icon = item ? item.icon : "⏱";
        const presets = [15, 25, 45, 60].map((minutes) => `<button type="button" data-focus-timer-minutes="${minutes}" class="${state.totalSec === minutes * 60 ? "is-selected" : ""}">${minutes}</button>`).join("");
        const minutes = Math.floor(state.remainingSec / 60);
        const seconds = state.remainingSec % 60;
        return `<div class="lc-checkin__focus-timer" data-focus-timer role="dialog" aria-label="专注计时">
            <div class="lc-checkin__focus-head"><span class="lc-checkin__focus-icon" aria-hidden="true">${escapeHtml(icon)}</span><strong>${escapeHtml(name)}</strong></div>
            <div class="lc-checkin__focus-time" data-focus-remaining>${minutes}:${String(seconds).padStart(2, "0")}</div>
            <div class="lc-checkin__focus-progress" data-focus-progress><span style="width: ${Math.round(((state.totalSec - state.remainingSec) / state.totalSec) * 100)}%"></span></div>
            <div class="lc-checkin__focus-presets" role="group" aria-label="专注时长">${presets}</div>
            <div class="lc-checkin__focus-actions">
                <button class="lc-checkin__text-button" type="button" data-action="focus-toggle">${state.running ? "暂停" : "继续"}</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-finish">完成</button>
                <button class="lc-checkin__text-button" type="button" data-action="focus-abandon">放弃</button>
            </div>
        </div>`;
    }

    private bindFocusTimerPanel(root: HTMLElement) {
        const panel = root.querySelector<HTMLElement>("[data-focus-timer]");
        if (!panel || panel.dataset.bound === "true") return;
        panel.dataset.bound = "true";
        panel.querySelector<HTMLButtonElement>("[data-action='focus-toggle']")?.addEventListener("click", () => {
            if (!this.focusTimerState) return;
            this.focusTimerState.running = !this.focusTimerState.running;
            this.paintFocusTimer(panel, this.focusTimerState);
        });
        panel.querySelector<HTMLElement>("[data-action='focus-finish']")?.addEventListener("click", () => void this.finishFocusTimer(true));
        panel.querySelector<HTMLElement>("[data-action='focus-abandon']")?.addEventListener("click", () => void this.finishFocusTimer(false));
        panel.querySelectorAll<HTMLButtonElement>("[data-focus-timer-minutes]").forEach((button) => button.addEventListener("click", () => {
            const minutes = Number(button.dataset.focusTimerMinutes);
            if (!this.focusTimerState || !Number.isFinite(minutes)) return;
            this.focusTimerMinutes = minutes;
            this.focusTimerState.totalSec = minutes * 60;
            this.focusTimerState.remainingSec = minutes * 60;
            this.focusTimerState.running = true;
            panel.querySelectorAll("[data-focus-timer-minutes]").forEach((entry) => entry.classList.toggle("is-selected", entry === button));
            this.paintFocusTimer(panel, this.focusTimerState);
        }));
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
        window.setTimeout(() => {
            const roots = [this.dockElement, this.tabElement, this.quickDialogElement].filter((element): element is HTMLElement => Boolean(element));
            const input = roots.map((element) => element.querySelector<HTMLInputElement>("[data-today-search]")).find((candidate): candidate is HTMLInputElement => Boolean(candidate));
            input?.focus();
            if (selection !== undefined) input?.setSelectionRange(selection, selection);
        }, 0);
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
                        this.auditEntries = [...this.auditEntries, {type: "conflict" as const, at: new Date().toISOString(), details: {items: conflict.changedItemIds.length, events: conflict.changedEventIds.length}}].slice(-50);
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
        if (this.disposed || this.disposing) return;
        if (this.syncNoticeTimer !== undefined) window.clearTimeout(this.syncNoticeTimer);
        this.syncNoticeTimer = window.setTimeout(() => {
            this.syncNoticeTimer = undefined;
            if (!this.disposed && !this.disposing) this.renderBackgroundUpdate();
        }, 4200);
    }

    private settleReady(ready: boolean) {
        this.readyResolver?.(ready);
        this.readyResolver = undefined;
    }

    private invalidateSummary() {
        this.summaryRequestId += 1;
        this.summaryText = undefined;
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
