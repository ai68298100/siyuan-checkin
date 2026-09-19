/* 对外 API 工厂：从 index.ts 外置（T-022）。
   CheckinApiHost 以结构化接口声明插件宿主成员；index.ts 通过
   `createCheckinApi(this as unknown as CheckinApiHost)` 接线，绕开 private 可见性（仅编译期）。 */
import {getEventsInCustomRange, getEventRangeSummary, buildCustomSummaryContext, buildSummaryContext, type CustomSummaryRange, type SummaryRange, type EventRangeSummary, type EventRangeSummaryOptions} from "./analytics";
import {getEventsInDateRange, getItemRevisionForDate, dateKey} from "./model";
import {buildHabitScoreSeries, collectHabitScoreDays, scheduleFrequency} from "./features/habit-score";
import {filterEventsInRange, isValidEventSource, projectItems} from "./features/api-v5";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinKind, CheckinStore} from "./types";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, isValidLocalDateInput, withTimeout} from "./shared";
import {serializeCsv, serializeJson} from "./export";
import {getVisibleOccasions, type Occasion, type OccasionStore} from "./occasions";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, type FocusAdapter, type SummaryProvider} from "./integrations";
import {normalizeSummaryProviderResult} from "./agent-suggestions";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_CAPABILITIES, hasCheckinCapability, getCheckinApiDescriptor, getCheckinCapabilityInfo, type CheckinCapability, type CheckinApiDescriptor, type CheckinCapabilityInfo} from "./api-contract";
import {cloneSuggestionWorkflow, workflowSummary, workflowUpdatedAt, type SuggestionWorkflowState} from "./features/suggestion-workflow";
import {buildAnalyticsSnapshot, cloneAnalyticsSnapshot, summarizeAnalyticsSnapshot, type AnalyticsSnapshot, type AnalyticsSnapshotSummary} from "./charts";

export interface CheckinApi {
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
    /** Bounded local-date projection; range is half-open [startDate, endDateExclusive). */
    getEventRangeSummary: (range: {startDate: string; endDateExclusive: string}, options?: EventRangeSummaryOptions) => EventRangeSummary;
    /** v5:有界日期区间事件读(半开区间,升序);truncated=true 表示达到 limit 截断。 */
    getEventsInRange: (range: {startDate: string; endDateExclusive: string}, options?: {itemIds?: string[]; source?: CheckinEvent["source"]; includeSkips?: boolean; limit?: number}) => {events: CheckinEvent[]; truncated: boolean};
    /** v5:统一项目投影(归档语义二选一 + 类型过滤 + 限量)。 */
    queryItems: (options?: {includeArchived?: boolean; archivedOnly?: boolean; kinds?: CheckinKind[]; limit?: number}) => CheckinItem[];
    getOccasions: () => Occasion[];
    getTodayOccasions: () => VisibleOccasion[];
    completeOccasion: (id: string, occurrenceDate: string, completed: boolean) => Promise<boolean>;
    getSummaryContext: (range: SummaryRange) => ReturnType<typeof buildSummaryContext>;
    getCustomSummaryContext: (range: CustomSummaryRange) => ReturnType<typeof buildCustomSummaryContext>;
    getAnalyticsSnapshot: (asOf?: Date) => AnalyticsSnapshot;
    getAnalyticsSummary: (asOf?: Date) => AnalyticsSnapshotSummary;
    /** T-1227：有界强度摘要（只读；窗口 7~366 天，默认 30；最多 200 个活跃项目）。 */
    getStrengthSummary: (options?: {windowDays?: number}) => {windowDays: number; startDate: string; endDate: string; items: Array<{itemId: string; name: string; score: number}>};
    getArchivedItems: () => CheckinItem[];
    setItemArchived: (itemId: string, archived: boolean) => Promise<boolean>;
    exportJson: () => string;
    exportCsv: () => string;
    recordEvent: (input: {itemId: string; value?: number; unit?: string; source?: CheckinEvent["source"]; note?: string; externalRef?: string}) => Promise<CheckinEvent | undefined>;
    startFocus: (itemId: string) => Promise<boolean>;
    stopFocus: () => Promise<boolean>;
    getFocusAdapters: () => ReadonlyArray<{id: string; name: string}>;
    getFocusStatus: () => Readonly<{busy: boolean; activeAdapterId?: string; adapterCount: number}>;
    registerFocusAdapter: (adapter: FocusAdapter, options?: {stopActive?: boolean}) => (unregisterOptions?: {stopActive?: boolean}) => void;
    registerSummaryProvider: (provider: SummaryProvider) => () => void;
    summarize: (range: SummaryRange, providerId?: string) => Promise<string | undefined>;
    summarizeCustom: (range: CustomSummaryRange, providerId?: string) => Promise<string | undefined>;
    getSuggestionWorkflow: () => SuggestionWorkflowState | undefined;
    getSuggestionWorkflowSummary: () => ReturnType<typeof workflowSummary> & {updatedAt: string} | undefined;
    subscribe: (listener: (event: CheckinIntegrationEvent) => void) => () => void;
}

type VisibleOccasion = Occasion & {occurrenceDate: string; status: "today" | "upcoming"; daysUntil: number; completionKey: string};

export interface CheckinApiHost {
    acceptingOperations: boolean;
    disposed: boolean;
    disposing: boolean;
    initializationState: "loading" | "ready" | "failed";
    readyPromise: Promise<boolean>;
    store: CheckinStore;
    occasionStore: {occasions: Occasion[]};
    summaryProviders: Map<string, SummaryProvider>;
    focusAdapters: Map<string, FocusAdapter>;
    activeFocusAdapter?: FocusAdapter;
    focusBusy: boolean;
    focusOperation: Promise<void>;
    apiSubscriptions: Set<() => void>;
    cloneItem(item: CheckinItem): CheckinItem;
    cloneStore(store?: CheckinStore): CheckinStore;
    getSummaryEvents(range: SummaryRange, date?: Date): CheckinEvent[];
    enqueueMutation<T>(operation: () => Promise<T>): Promise<T>;
    setItemArchived(itemId: string, archived: boolean, moment: {occurredAt: string; localDate: string}, expectedFingerprint?: string): Promise<boolean>;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
    recordExternalEvent(input: {itemId: string; value?: number; unit?: string; source?: CheckinEvent["source"]; note?: string; externalRef?: string}, moment: {occurredAt: string; localDate: string}, expectedRevisionFingerprint?: string): Promise<CheckinEvent | undefined>;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    itemFingerprint(item: CheckinItem): string;
    startFocus(itemId: string): Promise<boolean>;
    stopFocus(): Promise<boolean>;
    stopAdapterSilently(adapter: FocusAdapter): Promise<void>;
    invalidateSummary(): void;
    renderBackgroundUpdate(): void;
    suggestionWorkflow?: SuggestionWorkflowState;
}

export function createCheckinApi(host: CheckinApiHost): CheckinApi {
    const summarizeWithProvider = async (range: SummaryRange, customRange: CustomSummaryRange | undefined, providerId?: string) => {
        if (!host.acceptingOperations || host.disposed) return undefined;
        if (customRange) {
            if (!isValidLocalDateInput(customRange.startDate) || !isValidLocalDateInput(customRange.endDate) || customRange.startDate > customRange.endDate) return undefined;
        } else if (!isSummaryRange(range)) {
            return undefined;
        }
        const provider = providerId ? host.summaryProviders.get(providerId) : host.summaryProviders.values().next().value;
        if (!provider) return undefined;
        const now = currentCalendarDate();
        const context = customRange ? buildCustomSummaryContext(host.store, customRange, now) : buildSummaryContext(host.store, range, now);
        const summaryItemIds = new Set(context.items.map((item) => item.itemId));
        const output = await withTimeout(provider.summarize({
            range,
            ...(customRange ? {customRange} : {}),
            items: host.store.items.filter((item) => summaryItemIds.has(item.id)).map((item) => host.cloneItem(item)),
            events: customRange ? getEventsInCustomRange(host.store, customRange) : host.getSummaryEvents(range, now),
            context,
        }), 30000, "总结适配器响应超时");
        const normalized = normalizeSummaryProviderResult(output, host.store.items);
        return host.disposed || host.disposing || host.summaryProviders.get(provider.id) !== provider || !normalized ? undefined : normalized.text;
    };
    return {
        name: CHECKIN_API_NAME,
        protocol: CHECKIN_API_PROTOCOL,
        version: CHECKIN_API_VERSION,
        capabilities: CHECKIN_CAPABILITIES,
        hasCapability: hasCheckinCapability,
        describe: getCheckinApiDescriptor,
        getCapabilityInfo: getCheckinCapabilityInfo,
        isReady: () => host.initializationState === "ready" && host.acceptingOperations && !host.disposed,
        whenReady: () => host.readyPromise.then((ready) => ready && host.acceptingOperations && !host.disposed),
        getStore: () => host.cloneStore(),
        getItems: () => host.store.items.filter((item) => !item.archived).map((item) => host.cloneItem(item)),
        getEvents: () => host.store.events.map((event) => ({...event})),
        getEventRangeSummary: (range, options) => getEventRangeSummary(host.store, range, options),
        /* v5-1（D-240）：有界范围事件读——去重/过滤纪律与内部消费方一致,返回事件快照防 getter 逃逸。 */
        getEventsInRange: (range, options) => {
            if (!range || !isValidLocalDateInput(range.startDate) || !isValidLocalDateInput(range.endDateExclusive)) {
                throw new TypeError("range 必须提供合法的 startDate 与 endDateExclusive（YYYY-MM-DD）");
            }
            if (range.startDate > range.endDateExclusive) throw new TypeError("range.startDate 不得晚于 endDateExclusive");
            if (options?.itemIds !== undefined && !Array.isArray(options.itemIds)) throw new TypeError("itemIds 必须是字符串数组");
            if (options?.source !== undefined && !isValidEventSource(options.source)) throw new TypeError("source 必须是 manual、tomato、import 或 api");
            if (range.startDate === range.endDateExclusive) return {events: [], truncated: false};
            const inRange = getEventsInDateRange(host.store, range.startDate, range.endDateExclusive);
            const filtered = filterEventsInRange(inRange, options ?? {});
            return {events: filtered.events.map((event) => ({...event})), truncated: filtered.truncated};
        },
        queryItems: (options) => {
            if (options?.kinds !== undefined && !Array.isArray(options.kinds)) throw new TypeError("kinds 必须是 CheckinKind 数组");
            return projectItems(host.store.items, options ?? {}).map((item) => host.cloneItem(item));
        },
        getOccasions: () => host.occasionStore.occasions.map((item) => ({...item, completedDates: [...item.completedDates]})),
        getTodayOccasions: () => getVisibleOccasions({version: 1, occasions: host.occasionStore.occasions} as never, currentCalendarDate()).map((item) => ({...item, completedDates: [...item.completedDates]})),
        completeOccasion: (id, occurrenceDate, completed) => host.enqueueMutation(() => host.setOccasionCompleted(id, occurrenceDate, completed)),
        getSummaryContext: (range) => {
            if (!isSummaryRange(range)) throw new TypeError("range 必须是 day、week 或 month");
            return buildSummaryContext(host.store, range, currentCalendarDate());
        },
        getCustomSummaryContext: (range) => {
            if (!range || !isValidLocalDateInput(range.startDate) || !isValidLocalDateInput(range.endDate) || range.startDate > range.endDate) throw new TypeError("自定义总结范围无效");
            return buildCustomSummaryContext(host.store, range, currentCalendarDate());
        },
        getAnalyticsSnapshot: (asOf = currentCalendarDate()) => cloneAnalyticsSnapshot(buildAnalyticsSnapshot(host.store, asOf)),
        getAnalyticsSummary: (asOf = currentCalendarDate()) => summarizeAnalyticsSnapshot(buildAnalyticsSnapshot(host.store, asOf)),
        /* T-1227：有界强度摘要——只读、窗口 7~366 天（默认 30）、最多 200 个活跃项目。 */
        getStrengthSummary: (options) => {
            const requested = Number(options?.windowDays);
            const windowDays = Number.isFinite(requested) ? Math.min(366, Math.max(7, Math.floor(requested))) : 30;
            const asOf = currentCalendarDate();
            const endExclusive = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() + 1));
            const start = dateKey(new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - (windowDays - 1)));
            const items = host.store.items.filter((item) => !item.archived).slice(0, 200);
            return {
                windowDays,
                startDate: start,
                endDate: dateKey(asOf),
                items: items.map((item) => {
                    const series = buildHabitScoreSeries(
                        collectHabitScoreDays(host.store, item, start, endExclusive),
                        scheduleFrequency(getItemRevisionForDate(item, asOf).schedule),
                    );
                    return {itemId: item.id, name: item.name, score: series.length ? series[series.length - 1].score : 0};
                }),
            };
        },
        getArchivedItems: () => host.store.items.filter((item) => item.archived).map((item) => host.cloneItem(item)),
        setItemArchived: (itemId, archived) => {
            if (!host.acceptingOperations) return Promise.resolve(false);
            const moment = captureActionMoment();
            const expectedItem = host.store.items.find((item) => item.id === itemId);
            const expectedFingerprint = expectedItem ? host.itemFingerprint(expectedItem) : undefined;
            return host.enqueueMutation(() => host.setItemArchived(itemId, archived, moment, expectedFingerprint));
        },
        exportJson: () => serializeJson(host.cloneStore()),
        exportCsv: () => serializeCsv(host.cloneStore()),
        recordEvent: (input) => {
            if (!host.acceptingOperations) return Promise.resolve(undefined);
            const moment = captureActionMoment();
            const snapshot = input && typeof input === "object" ? {...input} : input;
            const expectedItem = snapshot && typeof snapshot === "object" && typeof snapshot.itemId === "string"
                ? host.store.items.find((item) => item.id === snapshot.itemId)
                : undefined;
            const expectedRevisionFingerprint = expectedItem
                ? host.revisionFingerprint(expectedItem, calendarDateFromKey(moment.localDate))
                : undefined;
            return host.enqueueMutation(() => host.recordExternalEvent(snapshot, moment, expectedRevisionFingerprint));
        },
        startFocus: (itemId) => host.startFocus(itemId),
        stopFocus: () => host.stopFocus(),
        getFocusAdapters: () => Object.freeze([...host.focusAdapters.values()].map((adapter) => Object.freeze({id: adapter.id, name: adapter.name}))),
        getFocusStatus: () => Object.freeze({busy: host.focusBusy, activeAdapterId: host.activeFocusAdapter?.id, adapterCount: host.focusAdapters.size}),
        /* 注销回调支持 {stopActive:false} 纯解绑:facade 失效/替换/卸载等生命周期
           不得模拟用户停止（docktomato PR #5 评审第四节）；默认保持原有停止行为兼容第三方。 */
        registerFocusAdapter: (adapter, options) => {
            if (!host.acceptingOperations || host.disposed || !adapter || typeof adapter.id !== "string" || !adapter.id || typeof adapter.canStart !== "function" || typeof adapter.start !== "function" || typeof adapter.stop !== "function") {
                return () => undefined;
            }
            host.focusAdapters.set(adapter.id, adapter);
            host.renderBackgroundUpdate();
            return (unregisterOptions?: {stopActive?: boolean}) => {
                if (host.focusAdapters.get(adapter.id) === adapter) {
                    host.focusAdapters.delete(adapter.id);
                }
                const stopActive = (unregisterOptions ?? options)?.stopActive !== false;
                if (host.activeFocusAdapter === adapter) {
                    host.activeFocusAdapter = undefined;
                    if (stopActive && !host.focusBusy) {
                        host.focusBusy = true;
                        const stop = host.stopAdapterSilently(adapter).finally(() => {
                            host.focusBusy = false;
                            host.renderBackgroundUpdate();
                        });
                        host.focusOperation = stop;
                    }
                }
                host.renderBackgroundUpdate();
            };
        },
        registerSummaryProvider: (provider) => {
            if (!host.acceptingOperations || host.disposed || !provider || typeof provider.id !== "string" || !provider.id || typeof provider.summarize !== "function") {
                return () => undefined;
            }
            host.invalidateSummary();
            host.summaryProviders.set(provider.id, provider);
            host.renderBackgroundUpdate();
            return () => {
                if (host.summaryProviders.get(provider.id) === provider) {
                    host.summaryProviders.delete(provider.id);
                    host.invalidateSummary();
                    host.renderBackgroundUpdate();
                }
            };
        },
        summarize: (range, providerId) => summarizeWithProvider(range, undefined, providerId),
        summarizeCustom: (range, providerId) => summarizeWithProvider("day", range, providerId),
        getSuggestionWorkflow: () => {
            const state = host.suggestionWorkflow;
            if (!state) return undefined;
            return cloneSuggestionWorkflow(state);
        },
        getSuggestionWorkflowSummary: () => {
            const state = host.suggestionWorkflow;
            if (!state) return undefined;
            return {...workflowSummary(state), updatedAt: workflowUpdatedAt(state)};
        },
        subscribe: (listener) => {
            if (!host.acceptingOperations || host.disposed || typeof listener !== "function") {
                return () => undefined;
            }
            const wrapped = (event: Event) => listener((event as CustomEvent<CheckinIntegrationEvent>).detail);
            Object.values(CHECKIN_EVENT_NAMES).forEach((eventName) => window.addEventListener(eventName, wrapped));
            const dispose = () => {
                Object.values(CHECKIN_EVENT_NAMES).forEach((eventName) => window.removeEventListener(eventName, wrapped));
                host.apiSubscriptions.delete(dispose);
            };
            host.apiSubscriptions.add(dispose);
            return dispose;
        },
    };
}

function isSummaryRange(value: unknown): value is SummaryRange {
    return value === "day" || value === "week" || value === "month";
}
