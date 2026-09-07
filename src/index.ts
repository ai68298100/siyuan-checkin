import {Dialog, getFrontend, openTab, Plugin, showMessage} from "siyuan";
import "./index.scss";
import {buildSummaryContext, getEventsInRange} from "./analytics";
import {CHECKIN_TEMPLATES, ICON_GROUPS, ICON_SEARCH_KEYWORDS, KIND_OPTIONS} from "./catalog";
import {serializeCsv, serializeJson} from "./export";
import {buildHabitInsights} from "./features/insights";
import {extractSiyuanBlockLinkSpans} from "./features/record-notes";
import {evaluateRule} from "./rules";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, emitIntegrationEvent} from "./integrations";
import {STORE_VERSION, appendEvent, createDefaultStore, dateKey, getEventDateKey, getEventsForDay, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday, makeId, mergeStores, normalizeStore, removeEvents, sortCheckinItems, updateEventNote} from "./model";
import type {FocusAdapter, SummaryProvider} from "./integrations";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinItemRevision, CheckinItemSortMode, CheckinKind, CheckinPriority, CheckinSchedule, CheckinStore, CheckinTimeSlot, ScheduleType} from "./types";
import type {SummaryRange} from "./analytics";

const STORAGE_NAME = "checkin-store";
const STORAGE_LOCK_NAME = "siyuan-checkin-store-write";
const DOCK_TYPE = "siyuan-checkin-dock";
const TAB_TYPE = "checkin";
const QUICK_DIALOG_HOTKEY = "⌥⇧C";
const API_VERSION = 1;
let fallbackStorageQueue: Promise<void> = Promise.resolve();

const KIND_LABELS: Record<CheckinKind, string> = {
    binary: "完成一次",
    count: "按次数",
    duration: "按时长",
    quantity: "按数量",
    custom: "自定义",
};

const PRIORITY_LABELS: Record<CheckinPriority, string> = {
    high: "重要",
    medium: "普通",
    low: "低优先级",
};

const TIME_SLOT_LABELS: Record<CheckinTimeSlot, string> = {
    morning: "晨间",
    afternoon: "午后",
    evening: "晚间",
    any: "全天",
};

const SORT_LABELS: Partial<Record<CheckinItemSortMode, string>> = {
    manual: "自定义顺序",
    priority: "重要性优先",
    name: "名称",
    createdAt: "创建时间",
    updatedAt: "最近修改",
};

type TodayGroupMode = "group" | "time" | "priority";

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
    daily: "每天",
    workdays: "工作日",
    weekly: "每周指定日",
    custom: "自定义日",
    interval: "每隔 N 天",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const CALENDAR_WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

interface CheckinApi {
    version: number;
    isReady: () => boolean;
    whenReady: () => Promise<boolean>;
    getStore: () => CheckinStore;
    getItems: () => CheckinItem[];
    getEvents: () => CheckinEvent[];
    getSummaryContext: (range: SummaryRange) => ReturnType<typeof buildSummaryContext>;
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
    subscribe: (listener: (event: CheckinIntegrationEvent) => void) => () => void;
}

interface ActionMoment {
    occurredAt: string;
    localDate: string;
}

interface RecentRecord {
    eventId: string;
    itemId: string;
    message: string;
}

interface LockManagerLike {
    request<T>(name: string, options: {mode: "exclusive"}, callback: () => T | PromiseLike<T>): Promise<T>;
}

export default class CheckinPlugin extends Plugin {
    private store: CheckinStore = createDefaultStore();
    private dockElement?: HTMLElement;
    private tabElement?: HTMLElement;
    private quickDialog?: Dialog;
    private quickDialogElement?: HTMLElement;
    private tabOpenPromise?: Promise<void>;
    private tabInstance?: {close: () => void};
    private isMobileFrontend = false;
    private supportsCustomTab = true;
    private todayGroupMode: TodayGroupMode = "group";
    private todaySortMode: CheckinItemSortMode = "manual";
    private todayQuery = "";
    private completedCollapsed = true;
    private collapsedTodayGroups = new Set<string>();
    private currentPage: "today" | "editor" | "history" | "summary" | "archived" | "insights" = "today";
    private insightsItemId?: string;
    private editingId?: string;
    private editingFingerprint?: string;
    private saveQueue: Promise<void> = Promise.resolve();
    private mutationQueue: Promise<void> = Promise.resolve();
    private api?: CheckinApi;
    private focusAdapters = new Map<string, FocusAdapter>();
    private summaryProviders = new Map<string, SummaryProvider>();
    private summaryRange: SummaryRange = "week";
    private summaryText?: string;
    private storageReady = false;
    private activeFocusAdapter?: FocusAdapter;
    private focusBusy = false;
    private focusOperation: Promise<void> = Promise.resolve();
    private apiSubscriptions = new Set<() => void>();
    private historyMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    private selectedHistoryDate = dateKey(new Date());
    private summaryRequestId = 0;
    private currentDateKey = dateKey(new Date());
    private midnightTimer?: number;
    private recentRecord?: RecentRecord;
    private recentRecordTimer?: number;
    private disposed = false;
    private disposing = false;
    private acceptingOperations = true;
    private initializationState: "loading" | "ready" | "failed" = "loading";
    private readyResolver?: (ready: boolean) => void;
    private readonly readyPromise = new Promise<boolean>((resolve) => {
        this.readyResolver = resolve;
    });
    private readonly handleWindowFocus = () => {
        this.refreshDateBoundary();
        void this.reconcileStore();
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
                if (this.disposed || this.disposing) return;
                this.store = normalizeStore(stored);
                this.storageReady = true;
                if (storeNeedsMigration(stored, this.store)) {
                    await this.persist();
                }
            });
            if (this.disposed || this.disposing) return;
            this.initializationState = "ready";
            this.settleReady(true);
        } catch (error) {
            if (this.disposed || this.disposing) return;
            this.storageReady = false;
            this.initializationState = "failed";
            this.settleReady(false);
            showMessage(`[小驴打卡] 读取或升级数据失败，已停止写入以保护原数据：${String(error)}`);
        }
        if (this.disposed || this.disposing) return;
        this.render();
        this.scheduleMidnightRefresh();
    }

    async onDataChanged() {
        await this.reconcileStore();
    }

    async onunload() {
        this.acceptingOperations = false;
        this.disposing = true;
        this.settleReady(false);
        window.removeEventListener("focus", this.handleWindowFocus);
        if (this.recentRecordTimer !== undefined) {
            window.clearTimeout(this.recentRecordTimer);
            this.recentRecordTimer = undefined;
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
        return {
            version: API_VERSION,
            isReady: () => this.initializationState === "ready" && this.acceptingOperations && !this.disposed,
            whenReady: () => this.readyPromise.then((ready) => ready && this.acceptingOperations && !this.disposed),
            getStore: () => this.cloneStore(),
            getItems: () => this.store.items.filter((item) => !item.archived).map((item) => this.cloneItem(item)),
            getEvents: () => this.store.events.map((event) => ({...event})),
            getSummaryContext: (range) => {
                if (!isSummaryRange(range)) throw new TypeError("range 必须是 day、week 或 month");
                return buildSummaryContext(this.store, range, currentCalendarDate());
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
            summarize: async (range, providerId) => {
                if (!this.acceptingOperations || this.disposed || !isSummaryRange(range)) return undefined;
                const provider = providerId ? this.summaryProviders.get(providerId) : this.summaryProviders.values().next().value;
                if (!provider) {
                    return undefined;
                }
                const now = currentCalendarDate();
                const context = buildSummaryContext(this.store, range, now);
                const summaryItemIds = new Set(context.items.map((item) => item.itemId));
                const output = await provider.summarize({
                    range,
                    items: this.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => this.cloneItem(item)),
                    events: this.getSummaryEvents(range, now),
                    context,
                });
                return this.disposed || this.disposing || this.summaryProviders.get(provider.id) !== provider || typeof output !== "string" ? undefined : output;
            },
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

    private showHistory() {
        this.currentPage = "history";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showSummary() {
        this.currentPage = "summary";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
    }

    private showInsights(item?: CheckinItem) {
        const candidate = item || this.store.items.find((entry) => !entry.archived);
        if (!candidate) return;
        this.currentPage = "insights";
        this.insightsItemId = candidate.id;
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
            showMessage(`[小驴打卡] 打开页签失败：${String(error)}，已改用快速窗口`);
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
        dialog = new Dialog({
            title: "",
            content: `<div class="${hostClass}" role="region" aria-label="小驴打卡快速窗口"></div>`,
            width: this.isMobileFrontend ? "94vw" : "760px",
            height: this.isMobileFrontend ? "88vh" : "82vh",
            disableAnimation: this.isMobileFrontend,
            destroyCallback: () => {
                if (dialog) this.handleQuickDialogDestroyed(dialog);
            },
        });
        const root = dialog.element.querySelector<HTMLElement>(".lc-checkin-dialog-host");
        if (!root) {
            dialog.destroy();
            showMessage("[小驴打卡] 快速窗口初始化失败");
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
        this.quickDialog = undefined;
        this.quickDialogElement = undefined;
        if (this.disposed || this.disposing) return;
        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.render();
        void this.reconcileStore();
    }

    private getTabId(): string {
        return `${this.name || "siyuan-checkin"}${TAB_TYPE}`;
    }

    private renderBackgroundUpdate() {
        if (this.currentPage !== "editor") {
            this.render();
        }
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
            : this.currentPage === "history" ? this.renderHistory()
                : this.currentPage === "summary" ? this.renderSummary()
                    : this.currentPage === "insights" ? this.renderInsights()
                    : this.currentPage === "archived" ? this.renderArchived() : this.renderToday();
        root.insertAdjacentHTML("afterbegin", `<button class="lc-checkin__dialog-close" type="button" data-action="close-dialog" aria-label="关闭快速窗口" title="关闭快速窗口">×</button>`);
        if (this.currentPage !== "editor") root.insertAdjacentHTML("beforeend", this.renderMobileNav());
        if (this.currentPage === "editor") {
            this.bindEditor(root);
        } else if (this.currentPage === "today") {
            this.bindToday(root);
        } else {
            this.bindPageNavigation(root);
        }
    }

    private renderInsights(): string {
        const item = this.store.items.find((entry) => entry.id === this.insightsItemId && !entry.archived);
        if (!item) return `<div class="lc-checkin lc-checkin--history"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><h1 class="lc-checkin__title">习惯复盘</h1></header><div class="lc-checkin__empty"><div class="lc-checkin__empty-title">没有可复盘的打卡项</div></div></div>`;
        const report = buildHabitInsights(this.store, item.id, {days: 84, asOf: currentCalendarDate()});
        const rate = report.aggregates.completionRate === null ? "暂无" : `${report.aggregates.completionRate}%`;
        const weekRows = report.weeklyTrend.slice(-6).map((week) => `<div class="lc-checkin__insight-row"><span>${escapeHtml(week.label)}</span><strong>${week.completedDays}/${week.eligibleScheduledDays || week.scheduledDays} 天</strong></div>`).join("");
        return `<div class="lc-checkin lc-checkin--history lc-checkin--insights"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><div><div class="lc-checkin__eyebrow">${escapeHtml(item.icon)} ${escapeHtml(item.group || "习惯复盘")}</div><h1 class="lc-checkin__title">${escapeHtml(item.name)}</h1></div></header><div class="lc-checkin__insight-stats"><div><strong>${rate}</strong><span>完成率</span></div><div><strong>${report.currentStreak}</strong><span>当前连续</span></div><div><strong>${report.longestStreak}</strong><span>窗口最佳</span></div></div><section class="lc-checkin__insight-section"><h2>近 84 天</h2><div class="lc-checkin__insight-grid">${report.days.map((day) => `<span class="is-${day.status}" title="${day.date} ${day.progress}/${day.target} ${day.unit}"></span>`).join("")}</div></section><section class="lc-checkin__insight-section"><h2>每周趋势</h2>${weekRows || `<div class="lc-checkin__history-empty">暂无足够记录</div>`}</section></div>`;
    }

    private renderMobileNav(): string {
        const entries = [["today", "今日", "⌂"], ["history", "历史", "▦"], ["summary", "总结", "◒"], ["archived", "归档", "▤"]] as const;
        return `<nav class="lc-checkin__mobile-nav" aria-label="打卡导航">${entries.map(([page, label, icon]) => `<button type="button" data-mobile-nav="${page}" class="${this.currentPage === page ? "is-selected" : ""}" aria-current="${this.currentPage === page ? "page" : "false"}"><span aria-hidden="true">${icon}</span><small>${label}</small></button>`).join("")}<button type="button" data-mobile-nav="add" aria-label="新建打卡项"><span aria-hidden="true">＋</span><small>新建</small></button></nav>`;
    }

    private renderToday(): string {
        const now = currentCalendarDate();
        const activeItems = this.store.items.filter((item) => !item.archived);
        const scheduledItems = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, now) && isScheduledToday(item, now));
        const query = this.todayQuery.trim().toLocaleLowerCase();
        const visibleItems = query
            ? scheduledItems.filter((item) => `${item.name} ${item.group || ""}`.toLocaleLowerCase().includes(query))
            : scheduledItems;
        const pendingItems = sortCheckinItems(visibleItems.filter((item) => !isComplete(this.store, item, now)), this.todaySortMode);
        const completedItems = sortCheckinItems(visibleItems.filter((item) => isComplete(this.store, item, now)), this.todaySortMode);
        const completed = scheduledItems.filter((item) => isComplete(this.store, item, now)).length;
        const date = now.toLocaleDateString("zh-CN", {month: "long", day: "numeric", weekday: "long"});
        const list = !activeItems.length && this.store.items.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">▱</div>
                <div class="lc-checkin__empty-title">当前没有进行中的打卡项</div>
                <div class="lc-checkin__empty-description">已归档的项目不会出现在今天。恢复一个项目，或新建一个新的打卡项。</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="archived">查看已归档</button><button class="lc-checkin__text-button" type="button" data-action="add">新建打卡项</button></div>
            </div>` : !activeItems.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">✦</div>
                <div class="lc-checkin__empty-title">从一个小目标开始</div>
                <div class="lc-checkin__empty-description">从常用模板中选择，或建立自己的第一个打卡项。</div>
                <button class="lc-checkin__text-button" type="button" data-action="add">新建打卡项</button>
            </div>` : !scheduledItems.length ? `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">◷</div>
                <div class="lc-checkin__empty-title">今天没有安排</div>
                <div class="lc-checkin__empty-description">现有项目都不在今天的计划里。可以查看历史，或添加新的打卡项。</div>
                <div class="lc-checkin__empty-actions"><button class="lc-checkin__text-button" type="button" data-action="history">查看历史</button><button class="lc-checkin__text-button" type="button" data-action="add">新建打卡项</button></div>
            </div>` : !visibleItems.length ? `
            <div class="lc-checkin__today-search-empty">
                <span>⌕</span><strong>没有匹配的打卡项</strong><small>试试项目名称或分组关键词</small>
                <button class="lc-checkin__text-button" type="button" data-action="clear-search">清除筛选</button>
            </div>` : `${pendingItems.length
            ? this.renderTodayGroups(pendingItems, now)
            : `<div class="lc-checkin__all-done"><span>✓</span><strong>今天的计划已完成</strong></div>`}
            ${completedItems.length ? `<section class="lc-checkin__completed-section">
                <button class="lc-checkin__section-toggle" type="button" data-action="toggle-completed" aria-expanded="${!this.completedCollapsed}">
                    <span class="lc-checkin__section-title"><i>✓</i> 已完成打卡项</span>
                    <span class="lc-checkin__section-count">${completedItems.length}</span>
                    <span class="lc-checkin__chevron">${this.completedCollapsed ? "⌄" : "⌃"}</span>
                </button>
                <div class="lc-checkin__group-items" ${this.completedCollapsed ? "hidden" : ""}>${completedItems.map((item) => this.renderItem(item, now)).join("")}</div>
            </section>` : ""}`;
        const recentRecord = this.recentRecord ? `<div class="lc-checkin__recent-record" role="status" aria-live="polite">
            <span><i>✓</i>${escapeHtml(this.recentRecord.message)}</span>
            <button type="button" data-action="undo-record">撤销</button>
        </div>` : "";
        return `<div class="lc-checkin">
            <header class="lc-checkin__header">
                <div>
                    <div class="lc-checkin__eyebrow">${escapeHtml(date)}</div>
                    <h1 class="lc-checkin__title">今天</h1>
                </div>
                <div class="lc-checkin__header-actions">
                    <span class="lc-checkin__count">${completed}<span>/</span>${scheduledItems.length}</span>
                    <button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="history" aria-label="查看历史" title="历史">▦</button>
                    <button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="summary" aria-label="查看总结" title="总结">◒</button>
                    ${this.supportsCustomTab ? `<button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="open-tab" aria-label="在页签打开" title="在页签打开">↗</button>` : ""}
                    <button class="lc-checkin__icon-button" type="button" data-action="add" aria-label="新建打卡项" title="新建打卡项">+</button>
                </div>
            </header>
            <div class="lc-checkin__progress"><span style="width: ${scheduledItems.length ? Math.round((completed / scheduledItems.length) * 100) : 0}%"></span></div>
            ${recentRecord}
            ${scheduledItems.length ? `<div class="lc-checkin__organize">
                <label class="lc-checkin__today-search"><span aria-hidden="true">⌕</span><input data-today-search type="search" value="${escapeHtml(this.todayQuery)}" placeholder="筛选打卡项" aria-label="筛选打卡项" />${this.todayQuery ? `<button type="button" data-action="clear-search" aria-label="清除筛选" title="清除筛选">×</button>` : ""}</label>
                <label><span>分组</span><select data-group-mode aria-label="分组方式">
                    <option value="group" ${this.todayGroupMode === "group" ? "selected" : ""}>自定义分组</option>
                    <option value="time" ${this.todayGroupMode === "time" ? "selected" : ""}>时间段</option>
                    <option value="priority" ${this.todayGroupMode === "priority" ? "selected" : ""}>重要性</option>
                </select></label>
                <label><span>排序</span><select data-sort-mode aria-label="排序方式">${Object.entries(SORT_LABELS).map(([value, label]) => `<option value="${value}" ${this.todaySortMode === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
            </div>` : ""}
            <main class="lc-checkin__list">${list}</main>
        </div>`;
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
            if (left === "未分组") return 1;
            if (right === "未分组") return -1;
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
        return item.group?.trim() || "未分组";
    }

    private getTodayGroupLabel(key: string): string {
        if (this.todayGroupMode === "priority") return PRIORITY_LABELS[key as CheckinPriority] || PRIORITY_LABELS.medium;
        if (this.todayGroupMode === "time") return TIME_SLOT_LABELS[key as CheckinTimeSlot] || TIME_SLOT_LABELS.any;
        return key;
    }

    private renderHistory(): string {
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
                return `<button class="${classes}" type="button" data-history-date="${key}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" ${future ? "disabled" : ""}><span>${index + 1}</span>${eventCount ? `<i>${eventCount}</i>` : ""}</button>`;
            }),
        ].join("");
        const selectedEvents = eventsByDay.get(this.selectedHistoryDate) || [];
        const totals = new Map<string, {name: string; unit: string; value: number}>();
        selectedEvents.forEach((event) => {
            const key = `${event.itemId}\u0000${event.unit}`;
            const current = totals.get(key);
            totals.set(key, {
                name: itemNames.get(event.itemId) || "已删除项目",
                unit: event.unit,
                value: (current?.value || 0) + event.value,
            });
        });
        const aggregateDetails = totals.size ? [...totals.values()].map((entry) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(formatNumber(entry.value))}${escapeHtml(entry.unit)}</span></div>`).join("") : "";
        const eventDetails = selectedEvents.length ? `<div class="lc-checkin__history-events">${selectedEvents.slice().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map((event) => {
            const name = itemNames.get(event.itemId) || "已删除项目";
            const time = new Date(event.occurredAt).toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"});
            const note = event.note ? `<small class="lc-checkin__history-event-note">${renderRecordNote(event.note)}</small>` : "";
            return `<div class="lc-checkin__history-event"><div><strong>${escapeHtml(name)}</strong><span>${escapeHtml(time)} · ${escapeHtml(event.source)}</span>${note}</div><span class="lc-checkin__history-event-value">${escapeHtml(formatNumber(event.value))}${escapeHtml(event.unit)}</span><button class="lc-checkin__text-button" type="button" data-edit-history-event-id="${escapeHtml(event.id)}">备注</button><button class="lc-checkin__text-button" type="button" data-history-event-id="${escapeHtml(event.id)}">撤销</button></div>`;
        }).join("")}</div>` : `<div class="lc-checkin__history-empty">当天没有记录</div>`;
        const details = aggregateDetails + eventDetails;
        const currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const nextDisabled = this.historyMonth >= currentMonth;
        return `<div class="lc-checkin lc-checkin--history"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><h1 class="lc-checkin__title">历史</h1></header><div class="lc-checkin__month-nav"><button type="button" data-history-month="-1" aria-label="上个月" title="上个月">‹</button><strong>${year}年${month + 1}月</strong><button type="button" data-history-month="1" aria-label="下个月" title="下个月" ${nextDisabled ? "disabled" : ""}>›</button></div><div class="lc-checkin__calendar-weekdays">${CALENDAR_WEEKDAYS.map((day) => `<span>${day}</span>`).join("")}</div><div class="lc-checkin__calendar">${calendarCells}</div><section class="lc-checkin__history-selected"><div class="lc-checkin__history-date"><strong>${escapeHtml(formatHistoryDate(this.selectedHistoryDate))}</strong><span>${selectedEvents.length} 条记录</span></div>${details}</section><div class="lc-checkin__history-actions"><button class="lc-checkin__text-button" type="button" data-action="export-json">导出 JSON</button><button class="lc-checkin__text-button" type="button" data-action="export-csv">导出 CSV</button><button class="lc-checkin__text-button" type="button" data-action="archived">已归档</button></div></div>`;
    }

    private renderSummary(): string {
        const summary = buildSummaryContext(this.store, this.summaryRange);
        const rows = summary.items.length ? summary.items.map((item) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(item.name)}</strong><span>${item.completedDays}/${item.scheduledDays} 天 · ${item.completionRate}%</span></div>`).join("") : `<div class="lc-checkin__empty-description">还没有可总结的打卡项。</div>`;
        const providerButton = this.summaryProviders.size ? `<button class="lc-checkin__text-button" type="button" data-action="generate-summary">生成智能总结</button>` : "";
        const generated = this.summaryText ? `<div class="lc-checkin__summary-text">${escapeHtml(this.summaryText)}</div>` : "";
        const tabs = (["day", "week", "month"] as SummaryRange[]).map((range) => `<button type="button" data-summary-range="${range}" class="${this.summaryRange === range ? "is-selected" : ""}">${range === "day" ? "日" : range === "month" ? "月" : "周"}</button>`).join("");
        return `<div class="lc-checkin lc-checkin--history"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><h1 class="lc-checkin__title">总结</h1></header><div class="lc-checkin__range-tabs">${tabs}</div><div class="lc-checkin__summary-total">${summary.totalEvents} 条记录 · ${summary.completedItems}/${summary.scheduledItems} 项有完成</div><main class="lc-checkin__history-list">${rows}</main>${generated}${providerButton}</div>`;
    }

    private renderArchived(): string {
        const items = this.store.items.filter((item) => item.archived);
        const rows = items.length ? items.map((item) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(item.icon)} ${escapeHtml(item.name)}</strong><button class="lc-checkin__text-button" type="button" data-restore-id="${escapeHtml(item.id)}">恢复</button></div>`).join("") : `<div class="lc-checkin__empty-description">没有已归档项目。</div>`;
        return `<div class="lc-checkin lc-checkin--history"><header class="lc-checkin__editor-header"><button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button><h1 class="lc-checkin__title">已归档</h1></header><main class="lc-checkin__history-list">${rows}</main></div>`;
    }

    private renderItem(item: CheckinItem, date: Date): string {
        const revision = getItemRevisionForDate(item, date);
        const progress = getProgress(this.store, item, date);
        const complete = isComplete(this.store, item, date);
        const percent = Math.min(100, Math.round((progress / revision.target) * 100));
        const isBinary = revision.kind === "binary";
        const canFocus = !isBinary && Boolean(this.findFocusAdapter(item, date));
        const recordStep = getRecordStep(revision.kind, revision.unit);
        const rule = evaluateRule(item, this.store.events, date);
        const inputStep = getEditorStep(revision.kind, revision.unit);
        const scheduleMeta = revision.schedule.type === "interval" ? ` · ${formatScheduleLabel(revision.schedule)}` : "";
        const meta = (isBinary ? KIND_LABELS[revision.kind] : `${KIND_LABELS[revision.kind]} · ${formatNumber(progress)} / ${formatNumber(revision.target)} ${revision.unit || "次"}${rule.remaining ? ` · 还需 ${formatNumber(rule.remaining)}${revision.unit || "次"}` : ""}`) + scheduleMeta;
        const priority = item.priority || "medium";
        const timeSlot = item.timeSlot || "any";
        const unit = revision.unit || "次";
        const icon = isBinary
            ? `<button class="lc-checkin__item-icon" type="button" data-action="toggle" aria-label="${complete ? "取消今日完成" : "完成"} ${escapeHtml(item.name)}">${escapeHtml(item.icon)}</button>`
            : `<span class="lc-checkin__item-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>`;
        return `<article class="lc-checkin__item ${complete ? "is-complete" : ""}" data-item-id="${escapeHtml(item.id)}">
            ${icon}
            <div class="lc-checkin__item-body">
                <div class="lc-checkin__item-topline">
                    <span class="lc-checkin__item-name">${escapeHtml(item.name)}</span>
                    ${priority === "high" ? `<span class="lc-checkin__item-tag is-high">重要</span>` : ""}
                    ${timeSlot !== "any" ? `<span class="lc-checkin__item-tag">${TIME_SLOT_LABELS[timeSlot]}</span>` : ""}
                    <button class="lc-checkin__small-button" type="button" data-action="insights" aria-label="查看${escapeHtml(item.name)}的复盘" title="复盘">⌁</button>
                    <button class="lc-checkin__small-button" type="button" data-action="edit" aria-label="设置 ${escapeHtml(item.name)}" title="设置">⚙</button>
                </div>
                <div class="lc-checkin__item-meta">${escapeHtml(meta)}</div>
                ${isBinary ? "" : `<div class="lc-checkin__item-progress"><span style="width: ${percent}%"></span></div>`}
            </div>
            <div class="lc-checkin__item-action">
                ${canFocus ? `<button class="lc-checkin__focus-button" type="button" data-action="focus" aria-label="开始专注" title="开始专注">⌛</button>` : ""}
                ${isBinary
                    ? `<button class="lc-checkin__record-button" type="button" data-action="record">${complete ? "取消" : "打卡"}</button>`
                    : `<button class="lc-checkin__quick-button" type="button" data-action="quick-record" data-amount="${formatNumber(recordStep)}" aria-label="记录 ${formatNumber(recordStep)} ${escapeHtml(unit)}">+${formatNumber(recordStep)} <span>${escapeHtml(unit)}</span></button>
                    <button class="lc-checkin__more-button" type="button" data-action="toggle-exact" aria-label="输入精确记录值" title="精确记录" aria-expanded="false">⋯</button>`}
            </div>
            ${isBinary ? "" : `<div class="lc-checkin__exact-entry" data-exact-entry hidden>
                <label><span>本次记录</span><input class="lc-checkin__amount" type="number" inputmode="decimal" min="${inputStep}" step="${inputStep}" value="${formatNumber(recordStep)}" aria-label="本次${escapeHtml(unit)}" /></label>
                <span>${escapeHtml(unit)}</span>
                <input class="lc-checkin__record-note" type="text" maxlength="2000" placeholder="备注（可选）" aria-label="记录备注" />
                <button class="lc-checkin__record-button" type="button" data-action="record">记录</button>
            </div>`}
        </article>`;
    }

    private renderEditor(): string {
        const item = this.editingId ? this.store.items.find((candidate) => candidate.id === this.editingId) : undefined;
        const schedule = item?.schedule || {type: "daily" as const};
        const weekdays = schedule.weekdays || [1, 2, 3, 4, 5, 6, 0];
        const intervalDays = schedule.intervalDays || 2;
        const anchorDate = schedule.anchorDate || item?.createdDate || dateKey(currentCalendarDate());
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
        const initialPriority = item?.priority || "medium";
        const initialTimeSlot = item?.timeSlot || "any";
        const advancedSummary = [
            item?.group || "未分组",
            PRIORITY_LABELS[initialPriority],
            initialTimeSlot === "any" ? "" : TIME_SLOT_LABELS[initialTimeSlot],
            formatScheduleLabel(schedule),
        ].filter(Boolean).join(" · ");
        const templates = !item ? `<section class="lc-checkin__template-section">
            <div class="lc-checkin__field-heading"><span>从常用打卡开始</span><small>选择后仍可修改</small></div>
            <label class="lc-checkin__search-field">
                <span class="lc-checkin__visually-hidden">搜索常用打卡模板</span>
                <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                <input type="search" data-template-query autocomplete="off" placeholder="搜索模板，如：阅读、运动" />
                <button type="button" data-action="clear-template-query" aria-label="清除模板搜索" title="清除" hidden>×</button>
            </label>
            <div class="lc-checkin__filter-row" role="group" aria-label="模板分组">
                <button class="is-selected" type="button" data-template-group="all" aria-pressed="true">全部</button>
                ${templateGroups.map((group) => `<button type="button" data-template-group="${escapeHtml(group)}" aria-pressed="false">${escapeHtml(group)}</button>`).join("")}
            </div>
            <div class="lc-checkin__result-line"><span data-template-count aria-live="polite">${CHECKIN_TEMPLATES.length} 个模板</span><button type="button" data-action="clear-template-filter" hidden>清除筛选</button></div>
            <div class="lc-checkin__templates" data-template-list>${CHECKIN_TEMPLATES.map((template, index) => {
                const searchText = [template.name, template.group, template.note, template.unit, KIND_LABELS[template.kind], SCHEDULE_LABELS[template.schedule.type]].join(" ");
                return `<button class="lc-checkin__template" type="button" data-template-index="${index}" data-template-group-value="${escapeHtml(template.group)}" data-template-search-text="${escapeHtml(searchText)}" title="${escapeHtml(template.note)}" aria-label="使用${escapeHtml(template.name)}模板"><span>${escapeHtml(template.icon)}</span><strong>${escapeHtml(template.name)}</strong><small>${escapeHtml(template.target === 1 && template.kind === "binary" ? SCHEDULE_LABELS[template.schedule.type] : `${template.target} ${template.unit}`)}</small></button>`;
            }).join("")}</div>
            <div class="lc-checkin__search-empty" data-template-empty hidden><strong>没有匹配的模板</strong><span>换个关键词，或清除筛选后浏览全部模板。</span><button type="button" data-action="clear-template-filter">查看全部</button></div>
        </section>` : "";
        return `<div class="lc-checkin lc-checkin--editor">
            <header class="lc-checkin__editor-header">
                <button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button>
                <h1 class="lc-checkin__title">${item ? "设置打卡项" : "新建打卡项"}</h1>
            </header>
            <form class="lc-checkin__form">
                <div class="lc-checkin__form-scroll">
                    ${templates}
                    <label class="lc-checkin__field lc-checkin__field--name"><span>名称</span><input name="name" type="text" required maxlength="40" placeholder="例如：阅读 20 分钟" value="${escapeHtml(item?.name || "")}" /></label>
                    <div class="lc-checkin__field lc-checkin__field--icons">
                        <span>图标</span>
                        <label class="lc-checkin__search-field lc-checkin__search-field--icon">
                            <span class="lc-checkin__visually-hidden">搜索图标</span>
                            <span class="lc-checkin__search-symbol" aria-hidden="true">⌕</span>
                            <input type="search" data-icon-query autocomplete="off" placeholder="搜索图标，如：跑步、阅读" />
                            <button type="button" data-action="clear-icon-query" aria-label="清除图标搜索" title="清除" hidden>×</button>
                        </label>
                        <div class="lc-checkin__icon-tabs" role="group" aria-label="图标类别">${ICON_GROUPS.map((group) => `<button type="button" data-icon-group="${group.id}" aria-pressed="${selectedIconGroup === group.id ? "true" : "false"}" class="${selectedIconGroup === group.id ? "is-selected" : ""}">${escapeHtml(group.name)}</button>`).join("")}</div>
                        <div class="lc-checkin__result-line"><span data-icon-count aria-live="polite">${escapeHtml(ICON_GROUPS.find((group) => group.id === selectedIconGroup)?.name || "通用")} · ${ICON_GROUPS.find((group) => group.id === selectedIconGroup)?.icons.length || 0} 个</span></div>
                        <div class="lc-checkin__icon-results" data-icon-results>${ICON_GROUPS.map((group) => `<section class="lc-checkin__icon-panel" data-icon-panel="${group.id}" data-icon-group-search="${escapeHtml([group.name, ...group.keywords].join(" "))}" ${selectedIconGroup === group.id ? "" : "hidden"}><small class="lc-checkin__icon-panel-heading">${escapeHtml(group.name)}</small><div class="lc-checkin__icon-grid">${group.icons.map((icon) => {
                            const keywords = ICON_SEARCH_KEYWORDS[icon] || "";
                            const accessibleName = keywords.split(" ").filter(Boolean).slice(0, 2).join("、");
                            return `<button class="lc-checkin__icon-option ${selectedIcon === icon ? "is-selected" : ""}" type="button" data-icon="${escapeHtml(icon)}" data-icon-search-text="${escapeHtml([icon, group.name, ...group.keywords, keywords].join(" "))}" aria-label="选择${escapeHtml(accessibleName || group.name)}图标 ${escapeHtml(icon)}" title="${escapeHtml(keywords || group.name)}">${escapeHtml(icon)}</button>`;
                        }).join("")}</div></section>`).join("")}</div>
                        <div class="lc-checkin__search-empty lc-checkin__search-empty--compact" data-icon-empty hidden><strong>没有匹配的图标</strong><button type="button" data-action="clear-icon-query">清除搜索</button></div>
                        <input name="icon" type="hidden" value="${escapeHtml(selectedIcon)}" />
                    </div>
                    <fieldset class="lc-checkin__kind-field"><legend>类型</legend><div class="lc-checkin__kind-grid">${KIND_OPTIONS.map((option) => `<label class="lc-checkin__kind-option"><input type="radio" name="kind" value="${option.kind}" ${selectedKind === option.kind ? "checked" : ""}/><span><strong>${escapeHtml(option.label)}</strong><small>${escapeHtml(option.description)}</small></span></label>`).join("")}</div></fieldset>
                    <div class="lc-checkin__kind-help" data-kind-help>${escapeHtml(selectedKindOption.description)}</div>
                    <div class="lc-checkin__form-row" data-value-fields>
                        <label class="lc-checkin__field"><span data-target-label>${escapeHtml(getTargetLabel(selectedKind))}</span><input name="target" type="number" min="${getEditorStep(selectedKind, selectedUnit)}" step="${getEditorStep(selectedKind, selectedUnit)}" required value="${escapeHtml(editorTarget.toString())}" /></label>
                        <label class="lc-checkin__field"><span>单位</span><input name="unit" type="text" maxlength="12" placeholder="${escapeHtml(selectedKindOption.defaultUnit)}" value="${escapeHtml(selectedUnit)}" /><span class="lc-checkin__unit-options" data-unit-options>${selectedKindOption.units.map((unit) => `<button type="button" data-unit="${escapeHtml(unit)}" aria-pressed="${selectedUnit === unit ? "true" : "false"}" class="${selectedUnit === unit ? "is-selected" : ""}">${escapeHtml(unit)}</button>`).join("")}</span></label>
                    </div>
                    <details class="lc-checkin__advanced" data-advanced ${item ? "open" : ""}>
                        <summary><span><strong>安排与分类</strong><small data-advanced-summary>${escapeHtml(advancedSummary)}</small></span><span class="lc-checkin__advanced-arrow" aria-hidden="true">⌄</span></summary>
                        <div class="lc-checkin__advanced-content">
                            <div class="lc-checkin__organization-fields">
                                <label class="lc-checkin__field"><span>分组</span><input name="group" type="text" maxlength="32" placeholder="例如：健康、学习" value="${escapeHtml(item?.group || "")}" /><span class="lc-checkin__group-options">${groupSuggestions.slice(0, 8).map((group) => `<button type="button" data-group-value="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("")}</span></label>
                                <label class="lc-checkin__field"><span>重要性</span><select name="priority">${(["high", "medium", "low"] as CheckinPriority[]).map((priority) => `<option value="${priority}" ${initialPriority === priority ? "selected" : ""}>${PRIORITY_LABELS[priority]}</option>`).join("")}</select></label>
                                <label class="lc-checkin__field"><span>时间段</span><select name="timeSlot">${(["any", "morning", "afternoon", "evening"] as CheckinTimeSlot[]).map((slot) => `<option value="${slot}" ${initialTimeSlot === slot ? "selected" : ""}>${TIME_SLOT_LABELS[slot]}</option>`).join("")}</select></label>
                            </div>
                            <div class="lc-checkin__field"><span>频率</span><select name="schedule">${Object.entries(SCHEDULE_LABELS).map(([value, label]) => `<option value="${value}" ${schedule.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
                            <div class="lc-checkin__weekdays" data-weekdays>${WEEKDAYS.map((day, index) => `<label><input type="checkbox" name="weekday" value="${index}" ${weekdays.includes(index) ? "checked" : ""}/><span>${day}</span></label>`).join("")}</div>
                            <div class="lc-checkin__form-row" data-interval-schedule hidden>
                                <label class="lc-checkin__field"><span>间隔天数</span><input name="intervalDays" type="number" min="1" max="3650" step="1" value="${intervalDays}" /></label>
                                <label class="lc-checkin__field"><span>起算日</span><input name="anchorDate" type="date" value="${escapeHtml(anchorDate)}" /></label>
                            </div>
                        </div>
                    </details>
                </div>
                <div class="lc-checkin__editor-actions">
                    <button class="lc-checkin__save-button" type="submit">${item ? "保存修改" : "保存打卡项"}</button>
                    ${item ? `<button class="lc-checkin__archive-button" type="button" data-action="archive">${item.archived ? "恢复打卡项" : "暂时归档"}</button>` : ""}
                </div>
            </form>
        </div>`;
    }

    private bindToday(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindMobileNav(root);
        const search = root.querySelector<HTMLInputElement>("[data-today-search]");
        let searchTimer: number | undefined;
        search?.addEventListener("input", () => {
            if (searchTimer !== undefined) window.clearTimeout(searchTimer);
            const value = search.value;
            searchTimer = window.setTimeout(() => {
                this.todayQuery = value;
                this.render();
                const nextSearch = root.querySelector<HTMLInputElement>("[data-today-search]");
                nextSearch?.focus();
                nextSearch?.setSelectionRange(value.length, value.length);
            }, 120);
        });
        root.querySelectorAll<HTMLElement>("[data-action='clear-search']").forEach((button) => button.addEventListener("click", () => {
            this.todayQuery = "";
            this.render();
            root.querySelector<HTMLInputElement>("[data-today-search]")?.focus();
        }));
        root.querySelector<HTMLElement>("[data-action='undo-record']")?.addEventListener("click", () => this.undoRecentRecord());
        root.querySelector<HTMLElement>("[data-action='history']")?.addEventListener("click", () => this.showHistory());
        root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => this.showArchived());
        root.querySelector<HTMLElement>("[data-action='summary']")?.addEventListener("click", () => this.showSummary());
        root.querySelector<HTMLElement>("[data-action='open-tab']")?.addEventListener("click", () => this.openTabPage());
        root.querySelector<HTMLSelectElement>("[data-group-mode]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "group" || value === "time" || value === "priority") {
                this.todayGroupMode = value;
                this.render();
            }
        });
        root.querySelector<HTMLSelectElement>("[data-sort-mode]")?.addEventListener("change", (event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            if (value === "manual" || value === "priority" || value === "name" || value === "createdAt" || value === "updatedAt") {
                this.todaySortMode = value;
                this.render();
            }
        });
        root.querySelector<HTMLElement>("[data-action='toggle-completed']")?.addEventListener("click", () => {
            this.completedCollapsed = !this.completedCollapsed;
            this.render();
        });
        root.querySelectorAll<HTMLElement>("[data-group-toggle]").forEach((button) => button.addEventListener("click", () => {
            const key = button.dataset.groupToggle;
            if (!key) return;
            if (this.collapsedTodayGroups.has(key)) this.collapsedTodayGroups.delete(key);
            else this.collapsedTodayGroups.add(key);
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
            element.querySelector<HTMLElement>("[data-action='focus']")?.addEventListener("click", () => this.startFocus(itemId));
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
                        showMessage("请输入大于零的记录值");
                        input?.focus();
                        return;
                    }
                    const note = element.querySelector<HTMLInputElement>(".lc-checkin__record-note")?.value;
                    this.enqueueMutation(() => this.recordEvent(item, amount, moment, expectedRevisionFingerprint, note));
                }
            });
        });
    }

    private bindPageNavigation(root: HTMLElement) {
        this.bindDialogClose(root);
        this.bindMobileNav(root);
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => this.showToday());
        root.querySelector<HTMLElement>("[data-action='archived']")?.addEventListener("click", () => this.showArchived());
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
                try { await this.persist(); } catch { this.store = previous; showMessage("[小驴打卡] 撤销失败，请重试"); return; }
                this.invalidateSummary();
                this.broadcast({type: "event-deleted", item: this.store.items.find((item) => item.id === event.itemId), deletedEvents: [event]});
                this.renderBackgroundUpdate();
            });
        }));
        root.querySelectorAll<HTMLElement>("[data-edit-history-event-id]").forEach((button) => button.addEventListener("click", () => {
            const event = this.store.events.find((candidate) => candidate.id === button.dataset.editHistoryEventId);
            if (!event) return;
            const note = window.prompt("记录备注（可填写思源块引用）", event.note || "");
            if (note === null) return;
            void this.enqueueMutation(async () => {
                const previous = this.store;
                const next = updateEventNote(this.store, event.id, note);
                if (next === this.store) return;
                this.store = next;
                try { await this.persist(); } catch { this.store = previous; showMessage("[小驴打卡] 备注保存失败，请重试"); return; }
                this.invalidateSummary();
                this.renderBackgroundUpdate();
            });
        }));
        root.querySelectorAll<HTMLElement>("[data-restore-id]").forEach((button) => button.addEventListener("click", () => this.restoreItem(button.dataset.restoreId || "")));
        root.querySelectorAll<HTMLElement>("[data-summary-range]").forEach((button) => button.addEventListener("click", () => {
            const range = button.dataset.summaryRange;
            if (range === "day" || range === "week" || range === "month") {
                this.summaryRange = range;
                this.summaryText = undefined;
                this.summaryRequestId += 1;
                this.render();
            }
        }));
        root.querySelector<HTMLElement>("[data-action='generate-summary']")?.addEventListener("click", () => this.generateSummary());
        root.querySelector<HTMLElement>("[data-action='export-json']")?.addEventListener("click", () => this.downloadExport("json"));
        root.querySelector<HTMLElement>("[data-action='export-csv']")?.addEventListener("click", () => this.downloadExport("csv"));
    }

    private bindDialogClose(root: HTMLElement) {
        root.querySelector<HTMLElement>("[data-action='close-dialog']")?.addEventListener("click", () => this.closeQuickDialog());
    }

    private bindMobileNav(root: HTMLElement) {
        root.querySelectorAll<HTMLElement>("[data-mobile-nav]").forEach((button) => button.addEventListener("click", () => {
            const page = button.dataset.mobileNav;
            if (page === "today") this.showToday();
            else if (page === "history") this.showHistory();
            else if (page === "summary") this.showSummary();
            else if (page === "archived") this.showArchived();
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
        await this.enqueueMutation(() => this.setItemArchived(itemId, false, moment, expectedFingerprint));
    }

    private async setItemArchived(itemId: string, archived: boolean, moment: ActionMoment, expectedFingerprint?: string): Promise<boolean> {
        if (this.disposed || this.initializationState !== "ready" || typeof itemId !== "string" || typeof archived !== "boolean") return false;
        const item = this.store.items.find((candidate) => candidate.id === itemId);
        if (!item) return false;
        if (item.archived === archived) return true;
        if (!expectedFingerprint || this.itemFingerprint(item) !== expectedFingerprint) {
            showMessage("[小驴打卡] 项目已在其他窗口更新，本次归档操作未执行");
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
            showMessage("[小驴打卡] 保存失败，请重试");
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
        const requestId = ++this.summaryRequestId;
        const now = currentCalendarDate();
        const context = buildSummaryContext(this.store, range, now);
        const summaryItemIds = new Set(context.items.map((item) => item.itemId));
        try {
            const summaryText = await provider.summarize({
                range,
                items: this.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => this.cloneItem(item)),
                events: this.getSummaryEvents(range, now),
                context,
            });
            if (this.disposed || requestId !== this.summaryRequestId || this.currentPage !== "summary" || this.summaryRange !== range || this.summaryProviders.get(provider.id) !== provider) return;
            if (typeof summaryText !== "string") throw new Error("总结适配器没有返回文本");
            this.summaryText = summaryText;
            this.render();
        } catch (error) {
            if (!this.disposed && requestId === this.summaryRequestId && this.currentPage === "summary" && this.summaryRange === range) {
                showMessage(`[小驴打卡] 总结失败：${String(error)}`);
            }
        }
    }

    private downloadExport(format: "json" | "csv") {
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
        this.bindDialogClose(root);
        let activeIconGroup = root.querySelector<HTMLElement>("[data-icon-group].is-selected")?.dataset.iconGroup || ICON_GROUPS[0].id;
        const selectIcon = (icon: string) => {
            root.querySelectorAll("[data-icon].is-selected").forEach((selected) => selected.classList.remove("is-selected"));
            const input = root.querySelector<HTMLInputElement>("input[name='icon']");
            if (input) input.value = icon || "✓";
            root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => {
                if (button.dataset.icon === icon) button.classList.add("is-selected");
            });
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
            if (valueFields) {
                valueFields.hidden = kind === "binary";
            }
            if (weekdays) {
                weekdays.hidden = scheduleSelect?.value !== "weekly" && scheduleSelect?.value !== "custom";
            }
            if (intervalSchedule) intervalSchedule.hidden = scheduleSelect?.value !== "interval";
            const help = root.querySelector<HTMLElement>("[data-kind-help]");
            if (help) help.textContent = kindOption.description;
            const targetLabel = root.querySelector<HTMLElement>("[data-target-label]");
            if (targetLabel) targetLabel.textContent = getTargetLabel(kind);
            if (targetInput) {
                const step = getEditorStep(kind, unitInput?.value || kindOption.defaultUnit);
                targetInput.min = String(step);
                targetInput.step = String(step);
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
        };
        root.querySelectorAll<HTMLInputElement>("input[name='kind']").forEach((input) => input.addEventListener("change", () => updateConditionalFields(true)));
        scheduleSelect?.addEventListener("change", () => updateConditionalFields(false));
        unitInput?.addEventListener("change", () => updateConditionalFields(false));
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
            const setInput = (name: string, value: string) => {
                const control = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name='${name}']`);
                if (control) control.value = value;
            };
            setInput("name", template.name);
            setInput("target", String(template.target));
            setInput("unit", template.unit);
            setInput("group", template.group);
            setInput("priority", template.priority);
            setInput("timeSlot", template.timeSlot || "any");
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
            updateAdvancedSummary();
            root.querySelector<HTMLInputElement>("input[name='name']")?.focus();
        }));
        const updateAdvancedSummary = () => {
            const group = root.querySelector<HTMLInputElement>("input[name='group']")?.value.trim() || "未分组";
            const priority = normalizePriorityInput(root.querySelector<HTMLSelectElement>("select[name='priority']")?.value || null);
            const timeSlot = normalizeTimeSlotInput(root.querySelector<HTMLSelectElement>("select[name='timeSlot']")?.value || null);
            const schedule = root.querySelector<HTMLSelectElement>("select[name='schedule']")?.value as ScheduleType || "daily";
            const interval = Number(root.querySelector<HTMLInputElement>("input[name='intervalDays']")?.value || 1);
            const scheduleLabel = schedule === "interval" ? `每隔 ${Math.max(1, Math.round(interval))} 天` : SCHEDULE_LABELS[schedule];
            const pieces = [group, PRIORITY_LABELS[priority], timeSlot === "any" ? "" : TIME_SLOT_LABELS[timeSlot], scheduleLabel].filter(Boolean);
            root.querySelector<HTMLElement>("[data-advanced-summary]")?.replaceChildren(document.createTextNode(pieces.join(" · ")));
        };
        root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("input", updateAdvancedSummary));
        root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".lc-checkin__advanced input, .lc-checkin__advanced select").forEach((control) => control.addEventListener("change", updateAdvancedSummary));
        updateConditionalFields();
        applyIconFilter();
        applyTemplateFilter();
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
        if (!name) {
            return;
        }
        const requestedKind = String(data.get("kind") || "binary");
        const kind: CheckinKind = KIND_OPTIONS.some((option) => option.kind === requestedKind) ? requestedKind as CheckinKind : "binary";
        const requestedSchedule = String(data.get("schedule") || "daily");
        const scheduleType: ScheduleType = ["daily", "workdays", "weekly", "custom", "interval"].includes(requestedSchedule) ? requestedSchedule as ScheduleType : "daily";
        const checkedWeekdays = data.getAll("weekday").map((value) => Number(value));
        const requestedInterval = Number(data.get("intervalDays"));
        const intervalDaysValue = Number.isFinite(requestedInterval) ? Math.max(1, Math.min(3650, Math.round(requestedInterval))) : 1;
        const requestedAnchor = String(data.get("anchorDate") || "");
        const anchorDateValue = isValidLocalDateInput(requestedAnchor) ? requestedAnchor : submittedAt.localDate;
        const schedule: CheckinSchedule = scheduleType === "interval"
            ? {type: scheduleType, intervalDays: intervalDaysValue, anchorDate: anchorDateValue}
            : {type: scheduleType, weekdays: scheduleType === "daily" || scheduleType === "workdays" ? undefined : checkedWeekdays};
        const existing = editingId ? this.store.items.find((item) => item.id === editingId) : undefined;
        if (editingId && (!existing || !expectedFingerprint || this.itemFingerprint(existing) !== expectedFingerprint)) {
            showMessage("[小驴打卡] 项目已在其他窗口更新，本次编辑未保存");
            this.showToday();
            return;
        }
        if ((scheduleType === "weekly" || scheduleType === "custom") && checkedWeekdays.length === 0) {
            showMessage("请选择至少一天");
            return;
        }
        const createdDate = existing?.createdDate || submittedAt.localDate;
        const target = kind === "binary" ? 1 : Math.max(0.1, Number(data.get("target")) || 1);
        const kindOption = KIND_OPTIONS.find((option) => option.kind === kind) || KIND_OPTIONS[0];
        const unit = kind === "binary" ? "次" : String(data.get("unit") || kindOption.defaultUnit).trim().slice(0, 16) || kindOption.defaultUnit;
        const group = String(data.get("group") || "").trim().slice(0, 32);
        const priority = normalizePriorityInput(data.get("priority"));
        const timeSlot = normalizeTimeSlotInput(data.get("timeSlot"));
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
            showMessage("[小驴打卡] 保存失败，请重试");
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
            showMessage("[小驴打卡] 项目配置已在其他窗口更新，本次打卡未执行");
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
                showMessage("[小驴打卡] 保存失败，请重试");
                this.renderBackgroundUpdate();
                return;
            }
            this.invalidateSummary();
            this.broadcast({type: "event-deleted", item, deletedEvents});
            this.renderBackgroundUpdate();
            return;
        }
        const revision = getItemRevisionForDate(item, actionDate);
        const remaining = Math.max(revision.target - getProgress(this.store, item, actionDate), 0.1);
        await this.recordEvent(item, remaining, moment, expectedRevisionFingerprint);
    }

    private async recordEvent(item: CheckinItem, value: number, moment: ActionMoment, expectedRevisionFingerprint?: string, note?: string): Promise<CheckinEvent | undefined> {
        const current = this.store.items.find((candidate) => candidate.id === item.id && !candidate.archived);
        const actionDate = calendarDateFromKey(moment.localDate);
        const revision = current ? getItemRevisionForDate(current, actionDate) : undefined;
        if (!current || !revision || !isItemAvailableOnDate(current, actionDate) || revision.kind === "binary" && isComplete(this.store, current, actionDate)) {
            return undefined;
        }
        if (!expectedRevisionFingerprint || this.revisionFingerprint(current, actionDate) !== expectedRevisionFingerprint) {
            showMessage("[小驴打卡] 项目配置已在其他窗口更新，本次记录未执行");
            this.renderBackgroundUpdate();
            return undefined;
        }
        const previous = this.store;
        const event = this.makeEvent(current, value, "manual", revision.unit, note?.trim() || undefined, undefined, moment);
        const next = appendEvent(this.store, event);
        if (next === this.store) return undefined;
        this.store = next;
        try {
            await this.persist();
        } catch {
            this.store = previous;
            showMessage("[小驴打卡] 保存失败，请重试");
            this.renderBackgroundUpdate();
            return undefined;
        }
        this.invalidateSummary();
        this.broadcast({type: "event-recorded", item: current, event});
        this.setRecentRecord({eventId: event.id, itemId: current.id, message: `已记录 ${current.name} +${formatNumber(value)} ${revision.unit || "次"}`});
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
                showMessage("[小驴打卡] 撤销失败，请重试");
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
                if (!this.disposed) showMessage(`[小驴打卡] 无法启动专注：${String(error)}`);
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
                if (!this.disposed) showMessage(`[小驴打卡] 无法停止专注：${String(error)}`);
                return false;
            } finally {
                this.focusBusy = false;
                this.renderBackgroundUpdate();
            }
        })();
        this.focusOperation = operation.then(() => undefined, () => undefined);
        return operation;
    }

    private makeEvent(item: CheckinItem, value: number, source: CheckinEvent["source"], unit: string, note?: string, externalRef?: string, moment = captureActionMoment()): CheckinEvent {
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
        const write = this.saveQueue.catch(() => undefined).then(() => this.saveData(STORAGE_NAME, snapshot).then(() => undefined));
        this.saveQueue = write.catch((error) => {
            showMessage(`[小驴打卡] 保存数据失败：${String(error)}`);
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
                    const latest = mergeStores(this.store, remote);
                    refreshed = JSON.stringify(latest) !== JSON.stringify(this.store);
                    this.store = latest;
                    if (JSON.stringify(latest) !== JSON.stringify(remote)) {
                        await this.persist();
                    }
                } catch (error) {
                    if (!this.disposing) showMessage(`[小驴打卡] 刷新数据失败，本次操作已取消：${String(error)}`);
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

function escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
        switch (character) {
            case "&": return "&amp;";
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "'": return "&#39;";
            case "\"": return "&quot;";
            default: return character;
        }
    });
}

function renderRecordNote(note: string): string {
    const spans = extractSiyuanBlockLinkSpans(note);
    if (!spans.length) return escapeHtml(note);
    let cursor = 0;
    return spans.map((span) => {
        const prefix = escapeHtml(note.slice(cursor, span.start));
        const link = `<a href="${escapeHtml(span.url)}" title="打开思源块" target="_blank" rel="noreferrer">${escapeHtml(span.label)}</a>`;
        cursor = span.end;
        return prefix + link;
    }).join("") + escapeHtml(note.slice(cursor));
}

function matchesSearch(value: string, query: string): boolean {
    const searchable = value.normalize("NFKC").toLocaleLowerCase("zh-CN");
    return query.normalize("NFKC").toLocaleLowerCase("zh-CN").trim().split(/\s+/).every((term) => searchable.includes(term));
}

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function formatScheduleLabel(schedule: CheckinSchedule): string {
    return schedule.type === "interval" ? `每隔 ${schedule.intervalDays || 1} 天` : SCHEDULE_LABELS[schedule.type];
}

function getTargetLabel(kind: CheckinKind): string {
    return kind === "duration" ? "目标时长" : kind === "quantity" ? "目标数量" : kind === "count" ? "目标次数" : "目标值";
}

function getRecordStep(kind: CheckinKind, unit: string): number {
    if (kind === "duration") return unit === "小时" ? 0.5 : 5;
    if (kind === "quantity" && unit === "毫升") return 250;
    if (kind === "quantity" && unit === "克") return 50;
    return kind === "custom" ? 0.1 : 1;
}

function getEditorStep(kind: CheckinKind, unit: string): number {
    if (kind === "duration") return unit === "小时" ? 0.25 : 1;
    if (kind === "quantity" && ["升", "千克", "公里"].includes(unit)) return 0.1;
    return kind === "custom" ? 0.1 : 1;
}

function normalizePriorityInput(value: FormDataEntryValue | null): CheckinPriority {
    return value === "high" || value === "low" ? value : "medium";
}

function normalizeTimeSlotInput(value: FormDataEntryValue | null): CheckinTimeSlot {
    return value === "morning" || value === "afternoon" || value === "evening" ? value : "any";
}

function captureActionMoment(): ActionMoment {
    const now = new Date();
    return {occurredAt: now.toISOString(), localDate: dateKey(now)};
}

function nextItemUpdatedAt(current: string | undefined, captured: string): string {
    const capturedTime = new Date(captured).getTime();
    const currentTime = current ? new Date(current).getTime() : Number.NaN;
    const nextTime = Number.isFinite(currentTime) ? Math.max(capturedTime, currentTime + 1) : capturedTime;
    return new Date(nextTime).toISOString();
}

function currentCalendarDate(): Date {
    return calendarDateFromKey(dateKey(new Date()));
}

function calendarDateFromKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

function isValidLocalDateInput(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    return dateKey(calendarDateFromKey(value)) === value;
}

function formatHistoryDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!year || !month || !day || Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString("zh-CN", {month: "long", day: "numeric", weekday: "short"});
}

function isSummaryRange(value: unknown): value is SummaryRange {
    return value === "day" || value === "week" || value === "month";
}

function storeNeedsMigration(value: unknown, normalized: CheckinStore): boolean {
    if (!value || typeof value !== "object") return false;
    try {
        return JSON.stringify(value) !== JSON.stringify(normalized);
    } catch {
        return true;
    }
}
