/* 对外 API 工厂：从 index.ts 外置（T-022）。
   CheckinApiHost 以结构化接口声明插件宿主成员；index.ts 通过
   `createCheckinApi(this as unknown as CheckinApiHost)` 接线，绕开 private 可见性（仅编译期）。 */
import {getEventsInCustomRange, buildCustomSummaryContext, buildSummaryContext, type CustomSummaryRange, type SummaryRange} from "./analytics";
import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem, CheckinStore} from "./types";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, isValidLocalDateInput, withTimeout} from "./shared";
import {serializeCsv, serializeJson} from "./export";
import {getVisibleOccasions, type Occasion, type OccasionStore} from "./occasions";
import {CHECKIN_API_NAME, CHECKIN_EVENT_NAMES, type FocusAdapter, type SummaryProvider} from "./integrations";
import {CHECKIN_API_PROTOCOL, CHECKIN_API_VERSION, CHECKIN_CAPABILITIES, hasCheckinCapability, getCheckinApiDescriptor, getCheckinCapabilityInfo, type CheckinCapability, type CheckinApiDescriptor, type CheckinCapabilityInfo} from "./api-contract";

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
        return host.disposed || host.disposing || host.summaryProviders.get(provider.id) !== provider || typeof output !== "string" ? undefined : output;
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
        registerFocusAdapter: (adapter) => {
            if (!host.acceptingOperations || host.disposed || !adapter || typeof adapter.id !== "string" || !adapter.id || typeof adapter.canStart !== "function" || typeof adapter.start !== "function" || typeof adapter.stop !== "function") {
                return () => undefined;
            }
            host.focusAdapters.set(adapter.id, adapter);
            host.renderBackgroundUpdate();
            return () => {
                if (host.focusAdapters.get(adapter.id) === adapter) {
                    host.focusAdapters.delete(adapter.id);
                }
                if (host.activeFocusAdapter === adapter) {
                    host.activeFocusAdapter = undefined;
                    if (!host.focusBusy) {
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
