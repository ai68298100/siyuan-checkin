import {DOCK_TOMATO_ADAPTER_ID, type FocusAdapter} from "./integrations";
import {completionClock, type DockTomatoCompletionWriteResult, type DockTomatoPendingCompletion} from "./features/docktomato-inbox";
import type {CheckinEvent, CheckinItem} from "./types";

const DOCK_TOMATO_API_EVENT = "tomato:focus-api-availability-changed";
const DOCK_TOMATO_COMPLETED_EVENT = "tomato:focus-session-completed";
const DOCK_TOMATO_ENDED_EVENT = "tomato:focus-ended";
const CONSUMER_ID = "siyuan-checkin";

interface DockTomatoFocusStatus {
    ready?: boolean;
    active?: boolean;
    running?: boolean;
    paused?: boolean;
    sessionId?: string;
    mode?: string;
}

export interface DockTomatoRuntimeStatus {
    readable: boolean;
    ready: boolean;
    active: boolean;
    running: boolean;
    paused: boolean;
    sessionId?: string;
    mode?: string;
}

interface DockTomatoFocusApi {
    version: number;
    capabilities?: readonly string[];
    getStatus(): DockTomatoFocusStatus;
    start(input: {durationMinutes?: number; confirm?: boolean; context: Record<string, string>}): Promise<DockTomatoFocusStatus>;
    pause(options?: {sessionId?: string}): Promise<DockTomatoFocusStatus>;
}

export type DockTomatoProviderState = "missing" | "incompatible-version" | "incomplete-api" | "missing-capabilities" | "not-ready" | "ready" | "running" | "paused" | "error";

export interface DockTomatoProviderDiagnostics {
    state: DockTomatoProviderState;
    available: boolean;
    ready: boolean;
    active: boolean;
    apiVersion?: number;
    capabilities: readonly string[];
}

interface DockTomatoHost extends Window {
    __dockTomato?: {focus?: DockTomatoFocusApi};
}

const REQUIRED_CAPABILITIES = ["status", "start", "pause", "completion-event"] as const;

function finiteNumber(value: unknown): number | undefined {
    try {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function projectCapabilities(value: unknown): string[] {
    const capabilities: string[] = [];
    if (!Array.isArray(value)) return capabilities;
    for (let index = 0; index < Math.min(value.length, 128) && capabilities.length < 32; index += 1) {
        const capability = ownDataValue(value, String(index));
        if (typeof capability === "string") capabilities.push(capability.slice(0, 80));
    }
    return capabilities;
}

function getDockTomatoCandidate(host: unknown): DockTomatoFocusApi | undefined {
    const container = ownDataValue(host, "__dockTomato");
    const candidate = ownDataValue(container, "focus");
    return candidate && typeof candidate === "object" ? candidate as DockTomatoFocusApi : undefined;
}

export function readDockTomatoRuntimeStatus(candidate: unknown): DockTomatoRuntimeStatus {
    if (!candidate || typeof candidate !== "object") return {readable: false, ready: false, active: false, running: false, paused: false};
    const getStatus = ownDataValue(candidate, "getStatus");
    if (typeof getStatus !== "function") return {readable: false, ready: false, active: false, running: false, paused: false};
    try {
        const status = getStatus.call(candidate);
        if (!status || typeof status !== "object") return {readable: false, ready: false, active: false, running: false, paused: false};
        const active = ownDataValue(status, "active") === true;
        const running = ownDataValue(status, "running") === true;
        const paused = ownDataValue(status, "paused") === true;
        return {
            readable: true,
            ready: ownDataValue(status, "ready") !== false,
            active,
            running,
            paused,
            sessionId: exactBoundedText(ownDataValue(status, "sessionId"), 240) || undefined,
            mode: boundedText(ownDataValue(status, "mode"), 24) || undefined,
        };
    } catch {
        return {readable: false, ready: false, active: false, running: false, paused: false};
    }
}

export function inspectDockTomatoProvider(host: DockTomatoHost = window as DockTomatoHost): DockTomatoProviderDiagnostics {
    const candidate = getDockTomatoCandidate(host);
    if (!candidate) return {state: "missing", available: false, ready: false, active: false, capabilities: []};
    const apiVersion = finiteNumber(ownDataValue(candidate, "version"));
    const capabilities = projectCapabilities(ownDataValue(candidate, "capabilities"));
    if (apiVersion !== 1) return {state: "incompatible-version", available: true, ready: false, active: false, apiVersion, capabilities};
    if (typeof ownDataValue(candidate, "getStatus") !== "function" || typeof ownDataValue(candidate, "start") !== "function" || typeof ownDataValue(candidate, "pause") !== "function") {
        return {state: "incomplete-api", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    if (capabilities.length && !REQUIRED_CAPABILITIES.every((name) => capabilities.includes(name))) {
        return {state: "missing-capabilities", available: true, ready: false, active: false, apiVersion, capabilities};
    }
    const status = readDockTomatoRuntimeStatus(candidate);
    if (!status.readable) return {state: "error", available: true, ready: false, active: false, apiVersion, capabilities};
    /* 就绪优先于运行/暂停:ready:false 时即使 active/paused 为真也不视为可调用接口
       （docktomato PR #5 评审第四节的诊断优先级）。 */
    if (!status.ready) return {state: "not-ready", available: true, ready: false, active: status.active, apiVersion, capabilities};
    if (status.paused) return {state: "paused", available: true, ready: true, active: status.active, apiVersion, capabilities};
    if (status.running || status.active) return {state: "running", available: true, ready: true, active: status.active, apiVersion, capabilities};
    return {state: "ready", available: true, ready: true, active: false, apiVersion, capabilities};
}

interface DockTomatoCompletionDetail {
    apiVersion?: number;
    sessionId?: string;
    recordId?: string;
    durationMinutes?: number;
    context?: Record<string, unknown>;
}

export type DockTomatoCompletionIssueReason = "invalid-event" | "unsupported-version" | "invalid-context" | "invalid-completion-time" | "missing-item" | "archived-item" | "mapping-changed" | "not-scheduled" | "at-most-item" | "skipped-day" | "invalid-duration" | "missing-identity" | "duplicate" | "user-removed" | "write-failed";

export interface DockTomatoCompletionIssue {
    reason: DockTomatoCompletionIssueReason;
    at: string;
    itemId?: string;
    identity?: string;
    count?: number;
}

export interface DockTomatoDiagnosticsArchive {
    schemaVersion: 1;
    exportedAt: string;
    provider: DockTomatoProviderDiagnostics;
    issues: readonly DockTomatoCompletionIssue[];
}

interface DockTomatoCompletionDecision {
    accepted: boolean;
    ignored?: boolean;
    reason?: DockTomatoCompletionIssueReason;
    item?: CheckinItem;
    identity?: string;
    entry?: DockTomatoPendingCompletion;
}

const completionIssues: DockTomatoCompletionIssue[] = [];
const COMPLETION_ISSUE_LIMIT = 20;
const COMPLETION_ISSUE_ARCHIVE_MAX_CHARS = 512 * 1024;

function ownDataValue(object: unknown, key: string): unknown {
    if (!object || typeof object !== "object") return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        return descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value") ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

function boundedText(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function exactBoundedText(value: unknown, maxLength: number): string {
    if (typeof value !== "string" || !value || value.length > maxLength || value.trim() !== value) return "";
    return value;
}

function customEventDetail(event: Event): unknown {
    try { return (event as CustomEvent<unknown>).detail; } catch { return undefined; }
}

export function getDockTomatoCompletionIssues(): readonly DockTomatoCompletionIssue[] {
    return Object.freeze(completionIssues.map((issue) => Object.freeze({...issue})));
}

export function clearDockTomatoCompletionIssues(): void {
    completionIssues.splice(0, completionIssues.length);
}

function normalizeCompletionIssue(value: unknown): DockTomatoCompletionIssue | undefined {
    if (!value || typeof value !== "object") return undefined;
    const reason = boundedText(ownDataValue(value, "reason"), 40) as DockTomatoCompletionIssueReason;
    const validReasons: readonly DockTomatoCompletionIssueReason[] = ["invalid-event", "unsupported-version", "invalid-context", "invalid-completion-time", "missing-item", "archived-item", "mapping-changed", "not-scheduled", "at-most-item", "skipped-day", "invalid-duration", "missing-identity", "duplicate", "user-removed", "write-failed"];
    if (!validReasons.includes(reason)) return undefined;
    const at = boundedText(ownDataValue(value, "at"), 40);
    if (!at || !Number.isFinite(Date.parse(at))) return undefined;
    const itemId = exactBoundedText(ownDataValue(value, "itemId"), 160) || undefined;
    const identity = exactBoundedText(ownDataValue(value, "identity"), 240) || undefined;
    const rawCount = finiteNumber(ownDataValue(value, "count"));
    const count = rawCount !== undefined && Number.isInteger(rawCount) && rawCount > 0 ? Math.min(rawCount, 9999) : 1;
    return {reason, at: new Date(at).toISOString(), itemId, identity, count};
}

export function restoreDockTomatoCompletionIssues(value: unknown): readonly DockTomatoCompletionIssue[] {
    const source = typeof value === "string"
        ? value.length <= COMPLETION_ISSUE_ARCHIVE_MAX_CHARS
            ? (() => { try { return JSON.parse(value) as unknown; } catch { return undefined; } })()
            : undefined
        : value;
    const entries = Array.isArray(source)
        ? source
        : ownDataValue(source, "schemaVersion") === 1 && Array.isArray(ownDataValue(source, "issues"))
            ? ownDataValue(source, "issues") as unknown[]
            : [];
    const normalized: Array<{issue: DockTomatoCompletionIssue; index: number}> = [];
    const scanStart = Math.max(0, entries.length - 512);
    for (let index = scanStart; index < entries.length; index += 1) {
        const issue = normalizeCompletionIssue(ownDataValue(entries, String(index)));
        if (issue) normalized.push({issue, index});
    }
    normalized.sort((left, right) => Date.parse(left.issue.at) - Date.parse(right.issue.at) || left.index - right.index);
    const folded = new Map<string, DockTomatoCompletionIssue>();
    for (const {issue} of normalized) {
        const key = JSON.stringify([issue.reason, issue.itemId || null, issue.identity || null]);
        const existing = folded.get(key);
        if (existing) folded.delete(key);
        folded.set(key, {...issue, count: Math.min((existing?.count || 0) + (issue.count || 1), 9999)});
    }
    const restored = Array.from(folded.values()).slice(-COMPLETION_ISSUE_LIMIT);
    completionIssues.splice(0, completionIssues.length, ...restored);
    return getDockTomatoCompletionIssues();
}

export function serializeDockTomatoCompletionIssues(): string {
    return JSON.stringify({schemaVersion: 1, issues: getDockTomatoCompletionIssues()});
}

export function serializeDockTomatoDiagnostics(provider: DockTomatoProviderDiagnostics, exportedAt = new Date().toISOString()): string {
    const validStates: readonly DockTomatoProviderState[] = ["missing", "incompatible-version", "incomplete-api", "missing-capabilities", "not-ready", "ready", "running", "paused", "error"];
    const rawState = boundedText(ownDataValue(provider, "state"), 40) as DockTomatoProviderState;
    const capabilities = projectCapabilities(ownDataValue(provider, "capabilities"));
    const apiVersion = finiteNumber(ownDataValue(provider, "apiVersion"));
    const parsedExportedAt = typeof exportedAt === "string" ? Date.parse(exportedAt) : Number.NaN;
    const safeProvider: DockTomatoProviderDiagnostics = {
        state: validStates.includes(rawState) ? rawState : "error",
        available: ownDataValue(provider, "available") === true,
        ready: ownDataValue(provider, "ready") === true,
        active: ownDataValue(provider, "active") === true,
        apiVersion,
        capabilities,
    };
    const archive: DockTomatoDiagnosticsArchive = {schemaVersion: 1, exportedAt: Number.isFinite(parsedExportedAt) ? new Date(parsedExportedAt).toISOString() : new Date().toISOString(), provider: safeProvider, issues: getDockTomatoCompletionIssues()};
    return JSON.stringify(archive, null, 2);
}

function appendCompletionIssue(reason: DockTomatoCompletionIssueReason, itemId?: string, identity?: string): void {
    const safeItemId = exactBoundedText(itemId, 160) || undefined;
    const safeIdentity = exactBoundedText(identity, 240) || undefined;
    const existingIndex = completionIssues.findIndex((issue) => issue.reason === reason && issue.itemId === safeItemId && issue.identity === safeIdentity);
    const existing = existingIndex >= 0 ? completionIssues.splice(existingIndex, 1)[0] : undefined;
    completionIssues.push({reason, at: new Date().toISOString(), itemId: safeItemId, identity: safeIdentity, count: Math.min((existing?.count || 1) + (existing ? 1 : 0), 9999)});
    if (completionIssues.length > COMPLETION_ISSUE_LIMIT) completionIssues.splice(0, completionIssues.length - COMPLETION_ISSUE_LIMIT);
}

function resolveCompletionWriteIssue(identity: string): void {
    for (let index = completionIssues.length - 1; index >= 0; index -= 1) {
        const issue = completionIssues[index];
        if (issue.reason === "write-failed" && issue.identity === identity) completionIssues.splice(index, 1);
    }
}

/** 完成通知判定（D-227 顺序）：
    1. 结构校验（版本/消费者/context/时长/身份/completedAt）——completedAt 缺失或无效直接拒绝，不回退当前时间；
    2. 幂等身份判定（已入账 → duplicate；已撤销 → user-removed）——必须在项目可用性之前，
       归档项目的既有记录才不会误报 missing-item；
    3. 项目可用性与映射检查——只决定 blocked 与否，不吞掉身份语义。 */
export function evaluateDockTomatoCompletion(detail: unknown, items: readonly CheckinItem[], duplicateIdentities: ReadonlySet<string> = new Set(), tombstonedIdentities: ReadonlySet<string> = new Set(), receivedAt = new Date().toISOString()): DockTomatoCompletionDecision {
    if (!detail || typeof detail !== "object") return {accepted: false, reason: "invalid-event"};
    if (ownDataValue(detail, "apiVersion") !== 1) return {accepted: false, reason: "unsupported-version"};
    const context = ownDataValue(detail, "context");
    if (!context || typeof context !== "object") return {accepted: false, reason: "invalid-context"};
    if (ownDataValue(context, "consumer") !== CONSUMER_ID) return {accepted: false, ignored: true};
    const itemId = exactBoundedText(ownDataValue(context, "itemId"), 160);
    const startUnit = exactBoundedText(ownDataValue(context, "itemUnit"), 80);
    const startMode = exactBoundedText(ownDataValue(context, "tomatoMode"), 24);
    if (!itemId || !startUnit || (startMode !== "sessions" && startMode !== "minutes")) return {accepted: false, reason: "invalid-context"};
    const rawDuration = ownDataValue(detail, "durationMinutes");
    const durationMinutes = typeof rawDuration === "number" && Number.isFinite(rawDuration) ? rawDuration : Number.NaN;
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) return {accepted: false, reason: "invalid-duration"};
    const identity = exactBoundedText(ownDataValue(detail, "sessionId"), 240) || exactBoundedText(ownDataValue(detail, "recordId"), 240);
    if (!identity) return {accepted: false, reason: "missing-identity"};
    const clock = completionClock(ownDataValue(detail, "completedAt"));
    if (!clock) return {accepted: false, reason: "invalid-completion-time"};
    if (duplicateIdentities.has(identity)) return {accepted: false, reason: "duplicate", identity};
    if (tombstonedIdentities.has(identity)) return {accepted: false, reason: "user-removed", identity};
    const item = findCompletionItem(items, itemId);
    if (!item) return {accepted: false, reason: "missing-item", identity};
    if (ownDataValue(item, "archived") === true) return {accepted: false, reason: "archived-item", item, identity};
    if (ownDataValue(item, "direction") === "atMost") return {accepted: false, reason: "at-most-item", item, identity};
    const currentMode = ownDataValue(item, "tomatoMode") === "sessions" ? "sessions" : "minutes";
    if (ownDataValue(item, "unit") !== startUnit || currentMode !== startMode) return {accepted: false, reason: "mapping-changed", item, identity};
    const entry: DockTomatoPendingCompletion = {
        identity,
        externalRef: `docktomato:${identity}`,
        itemId,
        itemUnit: startUnit,
        tomatoMode: startMode,
        durationMinutes,
        occurredAt: clock.occurredAt,
        localDate: clock.localDate,
        state: "pending",
        attempts: 0,
        receivedAt,
        updatedAt: receivedAt,
    };
    return {accepted: true, item, identity, entry};
}

export function collectDockTomatoStoredIdentities(events: unknown): ReadonlySet<string> {
    const identities = new Set<string>();
    if (!Array.isArray(events)) return identities;
    for (let index = 0; index < events.length; index += 1) {
        const entry = ownDataValue(events, String(index));
        const reference = exactBoundedText(ownDataValue(entry, "externalRef"), 251);
        if (!reference.startsWith("docktomato:")) continue;
        const identity = reference.slice("docktomato:".length);
        if (exactBoundedText(identity, 240)) identities.add(identity);
    }
    return identities;
}

interface DockCheckinApi {
    getItems(): CheckinItem[];
    getArchivedItems?(): CheckinItem[];
    getEvents(): CheckinEvent[];
    registerFocusAdapter(adapter: FocusAdapter): (options?: {stopActive?: boolean}) => void;
}

/** 宿主侧通道：收件箱/回写/纯清理都归宿主持有,桥只做校验与诊断(D-227)。 */
export interface DockTomatoBridgeHost {
    releaseFocusAdapter?(adapter: FocusAdapter): void;
    /** 在受保护的工作单元内完成:收件箱接收 → 打卡写入 → 收件箱移除/标记。 */
    processDockTomatoCompletion?(entry: DockTomatoPendingCompletion): Promise<DockTomatoCompletionWriteResult>;
    /** 主存储中已被用户撤销的 docktomato 身份(墓碑投影)。 */
    dockTomatoTombstonedIdentities?(): ReadonlySet<string>;
}

/** 休息等非专注阶段不参与按会话控制——休息阶段可能沿用父专注的 sessionId。 */
const CONTROLABLE_FOCUS_MODES = new Set(["countdown", "stopwatch"]);

function isControlableFocusMode(mode: string | undefined): boolean {
    return mode === undefined || CONTROLABLE_FOCUS_MODES.has(mode);
}

function dockTomatoError(code: string): Error & {code: string} {
    const error = new Error(code) as Error & {code: string};
    error.code = code;
    return error;
}

interface OwnedFocusSession {
    provider: DockTomatoFocusApi;
    sessionId: string;
    itemId: string;
}

function getDockTomatoFocusApi(): DockTomatoFocusApi | undefined {
    const candidate = getDockTomatoCandidate(window as DockTomatoHost);
    const diagnostics = inspectDockTomatoProvider();
    if (!candidate || !["ready", "running", "paused"].includes(diagnostics.state)) return undefined;
    return candidate;
}

function canUseDockTomato(item: CheckinItem): boolean {
    return item.kind !== "binary" && item.direction !== "atMost" && !item.archived && Boolean(dockTomatoStartContext(item));
}

function dockTomatoStartContext(item: CheckinItem): Record<string, string> | undefined {
    const itemId = boundedText(item.id, 160);
    const itemUnit = boundedText(item.unit, 80);
    if (!itemId || itemId !== item.id || !itemUnit || itemUnit !== item.unit) return undefined;
    return {
        consumer: CONSUMER_ID,
        itemId,
        itemUnit,
        tomatoMode: item.tomatoMode === "sessions" ? "sessions" : "minutes",
    };
}

function findCompletionItem(items: readonly CheckinItem[], itemId: string): CheckinItem | undefined {
    if (!Array.isArray(items)) return undefined;
    for (let index = 0; index < items.length; index += 1) {
        const candidate = ownDataValue(items, String(index));
        if (candidate && typeof candidate === "object" && ownDataValue(candidate, "id") === itemId) return candidate as CheckinItem;
    }
    return undefined;
}

/**
 * Optional Dock Tomato bridge. It only consumes Dock Tomato's public v1 focus
 * facade and events; no DOM selectors, storage paths or private functions are
 * coupled across plugins.
 */
export function installDockTomatoBridge(api: DockCheckinApi, onProviderStateChanged: () => void = () => undefined, host: DockTomatoBridgeHost = {}): () => void {
    let disposeAdapter: ((options?: {stopActive?: boolean}) => void) | undefined;
    let boundFacade: DockTomatoFocusApi | undefined;
    let boundAdapter: FocusAdapter | undefined;
    let ownedFocus: OwnedFocusSession | undefined;
    let providerRefreshQueued = false;
    let bridgeDisposed = false;
    const completedIdentities = new Set<string>();
    const completionIdentityOrder: string[] = [];
    const inFlightIdentities = new Set<string>();
    /* 收到明确 available:false 的 facade 短时间内不再注册,直到新的可用通知或新对象。 */
    const invalidatedFacades = new Set<DockTomatoFocusApi>();

    const scheduleProviderRefresh = () => {
        if (providerRefreshQueued || bridgeDisposed) return;
        providerRefreshQueued = true;
        void Promise.resolve().then(() => {
            providerRefreshQueued = false;
            if (!bridgeDisposed) onProviderStateChanged();
        });
    };

    const releaseOwnedSession = async (facade: DockTomatoFocusApi, capabilities: readonly string[]): Promise<void> => {
        const owned = ownedFocus;
        if (!owned || owned.provider !== facade || invalidatedFacades.has(facade)) {
            if (owned && owned.provider === facade) ownedFocus = undefined;
            return;
        }
        const status = readDockTomatoRuntimeStatus(facade);
        /* 已不是本会话、或已进入休息等不可控阶段:只释放归属,绝不暂停其他会话。 */
        if (!status.active || status.sessionId !== owned.sessionId || !isControlableFocusMode(status.mode)) {
            ownedFocus = undefined;
            return;
        }
        try {
            if (capabilities.includes("pause-session")) {
                /* 原子按会话暂停:提供方在同一串行边界内校验会话后才暂停。 */
                await facade.pause({sessionId: owned.sessionId});
            } else {
                /* 无按会话能力:getStatus 守门已把误暂停缩到窄窗口,跨会话保证依赖提供方原子性。 */
                await facade.pause();
            }
        } catch (error) {
            /* 保留归属:用户可重试停止;不把所有异常吞成"停止成功"。 */
            throw error;
        }
        ownedFocus = undefined;
    };

    const releaseSessionForIdentity = (identity: string): void => {
        if (!ownedFocus || ownedFocus.sessionId !== identity) return;
        ownedFocus = undefined;
        /* 立即释放"正在专注"登记,不等待打卡入账结果。 */
        if (boundAdapter) host.releaseFocusAdapter?.(boundAdapter);
    };

    const unbind = () => {
        disposeAdapter?.({stopActive: false});
        disposeAdapter = undefined;
        boundFacade = undefined;
        boundAdapter = undefined;
        /* facade 失效/替换/卸载:清除归属即可,当前番茄钟继续运行(D-226)。 */
        ownedFocus = undefined;
    };

    const bind = () => {
        const facade = getDockTomatoFocusApi();
        if (!facade || invalidatedFacades.has(facade)) {
            unbind();
            return;
        }
        if (boundFacade === facade && disposeAdapter) return;
        unbind();
        const providerCapabilities = projectCapabilities(ownDataValue(facade, "capabilities"));
        const adapter: FocusAdapter = {
            id: DOCK_TOMATO_ADAPTER_ID,
            name: "底栏番茄钟",
            canStart: (item) => {
                const status = readDockTomatoRuntimeStatus(facade);
                return canUseDockTomato(item) && status.readable && status.ready && !status.active;
            },
            start: async (item) => {
                const context = dockTomatoStartContext(item);
                if (!context) {
                    throw dockTomatoError("DOCK_TOMATO_INVALID_CONTEXT");
                }
                const result = await facade.start({
                    confirm: true,
                    context,
                });
                /* 启动结果必须带回最终会话身份:空 ID 或无法确认时不猜测、不接管、不暂停。 */
                const sessionId = result && typeof result === "object" ? exactBoundedText(ownDataValue(result, "sessionId"), 240) : "";
                if (!sessionId) {
                    throw dockTomatoError("DOCK_TOMATO_START_UNCONFIRMED");
                }
                /* 启动完成前已卸载/解绑/换绑新 facade:不登记归属,也不用旧调用接管新绑定。 */
                if (bridgeDisposed || boundFacade !== facade || invalidatedFacades.has(facade)) return;
                ownedFocus = {provider: facade, sessionId, itemId: context.itemId};
            },
            stop: async () => { await releaseOwnedSession(facade, providerCapabilities); },
        };
        boundFacade = facade;
        boundAdapter = adapter;
        disposeAdapter = api.registerFocusAdapter(adapter);
    };

    const handleAvailability = (event: Event) => {
        const detail = customEventDetail(event);
        const rawAvailable = detail && typeof detail === "object" ? ownDataValue(detail, "available") : undefined;
        if (rawAvailable === false) {
            /* 明确不可用通知:立即失效该 facade 并解绑,不等它从 window 消失。 */
            const candidate = getDockTomatoCandidate(window as DockTomatoHost);
            if (candidate) {
                invalidatedFacades.add(candidate);
                if (ownedFocus?.provider === candidate) ownedFocus = undefined;
                if (boundFacade === candidate) unbind();
            }
        } else {
            if (rawAvailable === true) {
                const candidate = getDockTomatoCandidate(window as DockTomatoHost);
                if (candidate) invalidatedFacades.delete(candidate);
            }
            bind();
        }
        scheduleProviderRefresh();
    };
    const handleProviderState = () => scheduleProviderRefresh();
    const handleCompleted = (event: Event) => {
        void (async () => {
        let failureItemId: string | undefined;
        let failureIdentity: string | undefined;
        let claimedIdentity: string | undefined;
        try {
            const detail = customEventDetail(event);
            const storedIdentities = collectDockTomatoStoredIdentities(api.getEvents());
            const tombstonedIdentities = host.dockTomatoTombstonedIdentities?.() || new Set<string>();
            /* 归档项目也要参与判定:未入账且已归档的通知应报 archived-item,不能因
               getItems 过滤归档而误报 missing-item(已入账且归档的由 duplicate 前置拦截)。 */
            const items = [...api.getItems(), ...(api.getArchivedItems?.() ?? [])];
            const decision = evaluateDockTomatoCompletion(detail, items, new Set([...storedIdentities, ...completedIdentities, ...inFlightIdentities]), tombstonedIdentities);
            if (!decision.accepted) {
                if (decision.reason && decision.reason !== "duplicate") {
                    const context = ownDataValue(detail, "context");
                    appendCompletionIssue(decision.reason, exactBoundedText(ownDataValue(context, "itemId"), 160), exactBoundedText(ownDataValue(detail, "sessionId"), 240));
                    scheduleProviderRefresh();
                }
                return;
            }
            const {item, identity, entry} = decision;
            if (!item || !entry || !identity) return;
            failureItemId = item.id;
            failureIdentity = identity;
            /* 会话已结束:先释放归属与"正在专注"登记,再进入独立回写流程。 */
            releaseSessionForIdentity(identity);
            claimedIdentity = identity;
            inFlightIdentities.add(identity);
            if (!host.processDockTomatoCompletion) throw new Error("DOCK_TOMATO_CHECKIN_WRITE_REJECTED");
            const result = await host.processDockTomatoCompletion(entry);
            if (bridgeDisposed) return;
            /* 排队器刷新失败等极端路径会把结果吞成 undefined:不得误判为已入账。 */
            if (!result) throw new Error("DOCK_TOMATO_CHECKIN_WRITE_REJECTED");
            if (result.kind === "recorded" || result.kind === "duplicate") {
                resolveCompletionWriteIssue(identity);
                completedIdentities.add(identity);
                completionIdentityOrder.push(identity);
                if (completionIdentityOrder.length > 500) {
                    const expired = completionIdentityOrder.shift();
                    if (expired) completedIdentities.delete(expired);
                }
            } else if (result.kind === "blocked" || result.kind === "discarded") {
                const reason: DockTomatoCompletionIssueReason = result.kind === "discarded" ? "user-removed" : (["missing-item", "archived-item", "mapping-changed", "not-scheduled", "at-most-item", "skipped-day"].includes(result.reason) ? result.reason as DockTomatoCompletionIssueReason : "write-failed");
                appendCompletionIssue(reason, item.id, identity);
            } else {
                throw new Error("DOCK_TOMATO_CHECKIN_WRITE_REJECTED");
            }
            scheduleProviderRefresh();
        } catch {
            if (!bridgeDisposed) {
                appendCompletionIssue("write-failed", failureItemId, failureIdentity);
                scheduleProviderRefresh();
            }
        } finally {
            if (claimedIdentity) inFlightIdentities.delete(claimedIdentity);
        }
        })();
    };

    const handleEnded = () => {
        /* focus-ended 仅作为重新读取状态的提示:校验当前会话与阶段后再清理本地记录,
           不暂停刚进入的休息或新会话(休息可能沿用父专注的 sessionId)。 */
        const owned = ownedFocus;
        if (owned) {
            const status = readDockTomatoRuntimeStatus(owned.provider);
            const focusStillControlable = status.readable && status.active
                && (!status.sessionId || status.sessionId === owned.sessionId)
                && isControlableFocusMode(status.mode);
            if (!focusStillControlable) {
                ownedFocus = undefined;
                if (boundAdapter) host.releaseFocusAdapter?.(boundAdapter);
            }
        }
        scheduleProviderRefresh();
    };

    window.addEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
    window.addEventListener("tomato:focus-session-started", handleProviderState);
    window.addEventListener("tomato:focus-session-paused", handleProviderState);
    window.addEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
    window.addEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
    bind();
    return () => {
        bridgeDisposed = true;
        window.removeEventListener(DOCK_TOMATO_API_EVENT, handleAvailability);
        window.removeEventListener("tomato:focus-session-started", handleProviderState);
        window.removeEventListener("tomato:focus-session-paused", handleProviderState);
        window.removeEventListener(DOCK_TOMATO_COMPLETED_EVENT, handleCompleted);
        window.removeEventListener(DOCK_TOMATO_ENDED_EVENT, handleEnded);
        inFlightIdentities.clear();
        completedIdentities.clear();
        completionIdentityOrder.splice(0, completionIdentityOrder.length);
        invalidatedFacades.clear();
        unbind();
    };
}
