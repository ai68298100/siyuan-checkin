import {openTab, Plugin, showMessage} from "siyuan";
import "./index.scss";
import {buildSummaryContext, getEventsInRange} from "./analytics";
import {serializeCsv, serializeJson} from "./export";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, emitIntegrationEvent} from "./integrations";
import {STORE_VERSION, appendEvent, createDefaultStore, dateKey, getEventDateKey, getEventsForDay, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, isScheduledToday, makeId, mergeStores, normalizeStore, removeEvents} from "./model";
import type {FocusAdapter, SummaryProvider} from "./integrations";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinItemRevision, CheckinKind, CheckinSchedule, CheckinStore, ScheduleType} from "./types";
import type {SummaryRange} from "./analytics";

const STORAGE_NAME = "checkin-store";
const STORAGE_LOCK_NAME = "siyuan-checkin-store-write";
const DOCK_TYPE = "siyuan-checkin-dock";
const TAB_TYPE = "checkin";
const API_VERSION = 1;
let fallbackStorageQueue: Promise<void> = Promise.resolve();

const ICON_OPTIONS = [
    "✓", "★", "☆", "☀", "☾", "♡", "✦", "❖",
    "📖", "✍", "🎧", "🎨", "🏃", "🚶", "🧘", "💪",
    "💧", "🥗", "☕", "🌱", "🧹", "💡", "⌛", "♫",
    "🧠", "💻", "📷", "🌙", "🐾", "🎯", "🧩", "🛌",
];

const KIND_LABELS: Record<CheckinKind, string> = {
    binary: "完成一次",
    count: "按次数",
    duration: "按时长",
    quantity: "按数量",
    custom: "自定义",
};

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
    daily: "每天",
    workdays: "工作日",
    weekly: "每周指定日",
    custom: "自定义日",
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

interface LockManagerLike {
    request<T>(name: string, options: {mode: "exclusive"}, callback: () => T | PromiseLike<T>): Promise<T>;
}

export default class CheckinPlugin extends Plugin {
    private store: CheckinStore = createDefaultStore();
    private dockElement?: HTMLElement;
    private tabElement?: HTMLElement;
    private tabOpenPromise?: Promise<void>;
    private tabInstance?: {close: () => void};
    private currentPage: "today" | "editor" | "history" | "summary" | "archived" = "today";
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

        this.addTab({
            type: TAB_TYPE,
            init: function (this: {element: Element}) {
                const element = this.element as HTMLElement;
                element.classList.add("lc-checkin-tab-host");
                plugin.tabElement = element;
                plugin.render();
            },
            update: function (this: {element: Element}) {
                if (plugin.tabElement === this.element) {
                    plugin.render();
                }
            },
            destroy: function (this: {element: Element}) {
                if (plugin.tabElement === this.element) {
                    plugin.tabElement = undefined;
                    plugin.tabInstance = undefined;
                    if (!plugin.disposed && !plugin.disposing) {
                        plugin.render();
                    }
                }
            },
        });

        this.addTopBar({
            id: "openCheckinTab",
            icon: "iconLvCheckin",
            title: "在页签打开小驴打卡",
            callback: () => this.openTabPage(),
        });

        this.addCommand({
            langKey: "openCheckin",
            callback: () => this.showToday(),
            globalCallback: () => this.showToday(),
        });
        this.addCommand({
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
        if (this.disposed || this.disposing || this.tabOpenPromise || this.tabInstance) {
            return;
        }
        this.currentPage = "today";
        this.editingId = undefined;
        this.editingFingerprint = undefined;
        this.tabOpenPromise = openTab({
            app: this.app,
            custom: {
                id: `${this.name}${TAB_TYPE}`,
                icon: "iconLvCheckin",
                title: "小驴打卡",
                data: {page: "today"},
            },
            position: "right",
            keepCursor: true,
            openNewTab: false,
        }).then((tab) => {
            this.tabInstance = tab;
        }).catch((error) => {
            showMessage(`[小驴打卡] 打开页签失败：${String(error)}`);
        }).finally(() => {
            this.tabOpenPromise = undefined;
        });
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
        const roots = [this.dockElement, this.tabElement].filter((root, index, all): root is HTMLElement => Boolean(root) && all.indexOf(root) === index);
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
                    : this.currentPage === "archived" ? this.renderArchived() : this.renderToday();
        if (this.currentPage === "editor") {
            this.bindEditor(root);
        } else if (this.currentPage === "today") {
            this.bindToday(root);
        } else {
            this.bindPageNavigation(root);
        }
    }

    private renderToday(): string {
        const now = currentCalendarDate();
        const visibleItems = this.store.items.filter((item) => !item.archived && isItemAvailableOnDate(item, now) && isScheduledToday(item, now));
        const completed = visibleItems.filter((item) => isComplete(this.store, item, now)).length;
        const date = now.toLocaleDateString("zh-CN", {month: "long", day: "numeric", weekday: "long"});
        const list = visibleItems.length ? visibleItems.map((item) => this.renderItem(item, now)).join("") : `
            <div class="lc-checkin__empty">
                <div class="lc-checkin__empty-mark">✦</div>
                <div class="lc-checkin__empty-title">从一个小目标开始</div>
                <div class="lc-checkin__empty-description">建立你的第一个打卡项，让今天有迹可循。</div>
                <button class="lc-checkin__text-button" type="button" data-action="add">新建打卡项</button>
            </div>`;
        return `<div class="lc-checkin">
            <header class="lc-checkin__header">
                <div>
                    <div class="lc-checkin__eyebrow">${escapeHtml(date)}</div>
                    <h1 class="lc-checkin__title">今天</h1>
                </div>
                <div class="lc-checkin__header-actions">
                    <span class="lc-checkin__count">${completed}<span>/</span>${visibleItems.length}</span>
                    <button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="history" aria-label="查看历史" title="历史">▦</button>
                    <button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="summary" aria-label="查看总结" title="总结">◒</button>
                    <button class="lc-checkin__small-button lc-checkin__always-visible" type="button" data-action="open-tab" aria-label="在页签打开" title="在页签打开">↗</button>
                    <button class="lc-checkin__icon-button" type="button" data-action="add" aria-label="新建打卡项" title="新建打卡项">+</button>
                </div>
            </header>
            <div class="lc-checkin__progress"><span style="width: ${visibleItems.length ? Math.round((completed / visibleItems.length) * 100) : 0}%"></span></div>
            <main class="lc-checkin__list">${list}</main>
        </div>`;
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
        const details = totals.size ? [...totals.values()].map((entry) => `<div class="lc-checkin__history-row"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(formatNumber(entry.value))}${escapeHtml(entry.unit)}</span></div>`).join("") : `<div class="lc-checkin__history-empty">当天没有记录</div>`;
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
        const meta = isBinary ? KIND_LABELS[revision.kind] : `${KIND_LABELS[revision.kind]} · ${formatNumber(progress)}/${formatNumber(revision.target)}${revision.unit || "次"}`;
        return `<article class="lc-checkin__item ${complete ? "is-complete" : ""}" data-item-id="${escapeHtml(item.id)}">
            <button class="lc-checkin__item-icon" type="button" data-action="toggle" aria-label="${complete ? "取消" : "完成"} ${escapeHtml(item.name)}">${escapeHtml(item.icon)}</button>
            <div class="lc-checkin__item-body">
                <div class="lc-checkin__item-topline">
                    <span class="lc-checkin__item-name">${escapeHtml(item.name)}</span>
                    <button class="lc-checkin__small-button" type="button" data-action="edit" aria-label="设置 ${escapeHtml(item.name)}" title="设置">⚙</button>
                </div>
                <div class="lc-checkin__item-meta">${escapeHtml(meta)}</div>
                ${isBinary ? "" : `<div class="lc-checkin__item-progress"><span style="width: ${percent}%"></span></div>`}
            </div>
            <div class="lc-checkin__item-action">
                ${isBinary ? "" : `<input class="lc-checkin__amount" type="number" min="0.1" step="0.1" value="1" aria-label="本次${escapeHtml(revision.unit || "数量")}" />`}
                ${canFocus ? `<button class="lc-checkin__focus-button" type="button" data-action="focus" aria-label="开始专注" title="开始专注">⌛</button>` : ""}
                <button class="lc-checkin__record-button" type="button" data-action="record">${isBinary ? complete ? "撤销" : "打卡" : "+ 记录"}</button>
            </div>
        </article>`;
    }

    private renderEditor(): string {
        const item = this.editingId ? this.store.items.find((candidate) => candidate.id === this.editingId) : undefined;
        const schedule = item?.schedule || {type: "daily" as const};
        const weekdays = schedule.weekdays || [1, 2, 3, 4, 5, 6, 0];
        return `<div class="lc-checkin lc-checkin--editor">
            <header class="lc-checkin__editor-header">
                <button class="lc-checkin__back-button" type="button" data-action="back" aria-label="返回">‹</button>
                <h1 class="lc-checkin__title">${item ? "设置打卡项" : "新建打卡项"}</h1>
            </header>
            <form class="lc-checkin__form">
                <label class="lc-checkin__field lc-checkin__field--name"><span>名称</span><input name="name" type="text" required maxlength="40" placeholder="例如：阅读 20 分钟" value="${escapeHtml(item?.name || "")}" /></label>
                <div class="lc-checkin__field"><span>图标</span><div class="lc-checkin__icon-grid">${ICON_OPTIONS.map((icon) => `<button class="lc-checkin__icon-option ${(item?.icon || "✓") === icon ? "is-selected" : ""}" type="button" data-icon="${escapeHtml(icon)}" aria-label="选择图标 ${escapeHtml(icon)}">${escapeHtml(icon)}</button>`).join("")}</div><input name="icon" type="hidden" value="${escapeHtml(item?.icon || "✓")}" /></div>
                <div class="lc-checkin__field"><span>类型</span><select name="kind">${Object.entries(KIND_LABELS).map(([value, label]) => `<option value="${value}" ${item?.kind === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
                <div class="lc-checkin__form-row" data-value-fields><label class="lc-checkin__field"><span>目标</span><input name="target" type="number" min="0.1" step="0.1" required value="${escapeHtml((item?.target || 1).toString())}" /></label><label class="lc-checkin__field"><span>单位</span><input name="unit" type="text" maxlength="8" placeholder="次" value="${escapeHtml(item?.unit || "次")}" /></label></div>
                <div class="lc-checkin__field"><span>频率</span><select name="schedule">${Object.entries(SCHEDULE_LABELS).map(([value, label]) => `<option value="${value}" ${schedule.type === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
                <div class="lc-checkin__weekdays" data-weekdays>${WEEKDAYS.map((day, index) => `<label><input type="checkbox" name="weekday" value="${index}" ${weekdays.includes(index) ? "checked" : ""}/><span>${day}</span></label>`).join("")}</div>
                <button class="lc-checkin__save-button" type="submit">保存打卡项</button>
                ${item ? `<button class="lc-checkin__archive-button" type="button" data-action="archive">${item.archived ? "恢复打卡项" : "暂时归档"}</button>` : ""}
            </form>
        </div>`;
    }

    private bindToday(root: HTMLElement) {
        root.querySelector<HTMLElement>("[data-action='history']")?.addEventListener("click", () => this.showHistory());
        root.querySelector<HTMLElement>("[data-action='summary']")?.addEventListener("click", () => this.showSummary());
        root.querySelector<HTMLElement>("[data-action='open-tab']")?.addEventListener("click", () => this.openTabPage());
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
                    this.enqueueMutation(() => this.recordEvent(item, amount, moment, expectedRevisionFingerprint));
                }
            });
        });
    }

    private bindPageNavigation(root: HTMLElement) {
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
        root.querySelectorAll<HTMLButtonElement>("[data-icon]").forEach((button) => button.addEventListener("click", () => {
            root.querySelectorAll("[data-icon].is-selected").forEach((selected) => selected.classList.remove("is-selected"));
            button.classList.add("is-selected");
            const input = root.querySelector<HTMLInputElement>("input[name='icon']");
            if (input) {
                input.value = button.dataset.icon || "✓";
            }
        }));
        root.querySelector<HTMLElement>("[data-action='back']")?.addEventListener("click", () => this.showToday());
        root.querySelector<HTMLElement>("[data-action='archive']")?.addEventListener("click", () => this.archiveEditingItem());
        const kindSelect = root.querySelector<HTMLSelectElement>("select[name='kind']");
        const scheduleSelect = root.querySelector<HTMLSelectElement>("select[name='schedule']");
        const updateConditionalFields = () => {
            const valueFields = root.querySelector<HTMLElement>("[data-value-fields]");
            const weekdays = root.querySelector<HTMLElement>("[data-weekdays]");
            if (valueFields) {
                valueFields.hidden = kindSelect?.value === "binary";
            }
            if (weekdays) {
                weekdays.hidden = scheduleSelect?.value !== "weekly" && scheduleSelect?.value !== "custom";
            }
        };
        kindSelect?.addEventListener("change", updateConditionalFields);
        scheduleSelect?.addEventListener("change", updateConditionalFields);
        updateConditionalFields();
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
        const kind = String(data.get("kind") || "binary") as CheckinKind;
        const scheduleType = String(data.get("schedule") || "daily") as ScheduleType;
        const checkedWeekdays = data.getAll("weekday").map((value) => Number(value));
        const schedule: CheckinSchedule = {
            type: scheduleType,
            weekdays: scheduleType === "daily" || scheduleType === "workdays" ? undefined : checkedWeekdays,
        };
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
        const unit = kind === "binary" ? "次" : String(data.get("unit") || "次").trim() || "次";
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

    private async recordEvent(item: CheckinItem, value: number, moment: ActionMoment, expectedRevisionFingerprint?: string) {
        const current = this.store.items.find((candidate) => candidate.id === item.id && !candidate.archived);
        const actionDate = calendarDateFromKey(moment.localDate);
        const revision = current ? getItemRevisionForDate(current, actionDate) : undefined;
        if (!current || !revision || !isItemAvailableOnDate(current, actionDate) || revision.kind === "binary" && isComplete(this.store, current, actionDate)) {
            return;
        }
        if (!expectedRevisionFingerprint || this.revisionFingerprint(current, actionDate) !== expectedRevisionFingerprint) {
            showMessage("[小驴打卡] 项目配置已在其他窗口更新，本次记录未执行");
            this.renderBackgroundUpdate();
            return;
        }
        const previous = this.store;
        const event = this.makeEvent(current, value, "manual", revision.unit, undefined, undefined, moment);
        const next = appendEvent(this.store, event);
        if (next === this.store) return;
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
        this.broadcast({type: "event-recorded", item: current, event});
        this.renderBackgroundUpdate();
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

function formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
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
