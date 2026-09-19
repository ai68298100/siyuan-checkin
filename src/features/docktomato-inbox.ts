/* 底栏番茄钟完成回写收件箱（纯函数层，D-227）：
   完成时刻钟表、载荷规范化、收件箱存储模型与重试节奏。
   只保存经过校验的纯数据；不保存 Event/DOM/函数/provider 对象。 */
import {dateKey} from "../model";

export type DockTomatoCompletionWriteResult =
    | {kind: "recorded"; eventId: string}
    | {kind: "duplicate"; eventId?: string}
    | {kind: "discarded"}
    | {kind: "blocked"; reason: string}
    | {kind: "retry"; reason: string};

export interface DockTomatoPendingCompletion {
    identity: string;
    externalRef: string;
    itemId: string;
    itemUnit: string;
    tomatoMode: "minutes" | "sessions";
    durationMinutes: number;
    /** 校验过的 completedAt（ISO）；重试不得改写。 */
    occurredAt: string;
    /** 首次接收时按本地时区固定；重试不得随设备时区重新解释。 */
    localDate: string;
    state: "pending" | "blocked";
    blockedReason?: string;
    attempts: number;
    nextAttemptAt?: string;
    lastError?: string;
    receivedAt: string;
    updatedAt: string;
}

export interface DockTomatoInboxStore {
    schemaVersion: 1;
    items: DockTomatoPendingCompletion[];
}

export const DOCKTOMATO_INBOX_SCHEMA_VERSION = 1;
/** 容量上限：满了拒绝新条目并提示，不静默丢弃未完成项。 */
export const DOCKTOMATO_INBOX_CAPACITY = 200;
/** 暂时性失败的自动重试节奏：1s/5s/30s，之后保持待处理等待手动恢复。 */
export const INBOX_RETRY_DELAYS_MS: readonly number[] = [1000, 5000, 30000];

/** 完成值计算单一边界：计次项目记 1 次；小时项目按 60 分钟折算；其余按分钟。
    写入端必须用完成日期的项目修订（单位/模式）来调用,不能用今天的项目配置。 */
export function dockTomatoCompletionValue(itemUnit: string, tomatoMode: "minutes" | "sessions", durationMinutes: number): number | undefined {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440) return undefined;
    if (tomatoMode === "sessions") return 1;
    return itemUnit === "小时" ? durationMinutes / 60 : durationMinutes;
}

export function normalizeValidIsoTimestamp(value: unknown): string | undefined {
    if (typeof value !== "string" || !value || value.length > 40) return undefined;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return undefined;
    return new Date(parsed).toISOString();
}

/** 完成钟表：以 completedAt 为准；缺失/无效返回 undefined，不得回退为当前时间。 */
export function completionClock(completedAt: unknown): {occurredAt: string; localDate: string} | undefined {
    const occurredAt = normalizeValidIsoTimestamp(completedAt);
    if (!occurredAt) return undefined;
    return {occurredAt, localDate: dateKey(new Date(occurredAt))};
}

function boundedText(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function exactText(value: unknown, maxLength: number): string {
    if (typeof value !== "string" || !value || value.length > maxLength || value.trim() !== value) return "";
    return value;
}

function normalizeEntry(value: unknown): DockTomatoPendingCompletion | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Record<string, unknown>;
    const identity = exactText(candidate.identity, 240);
    const itemId = exactText(candidate.itemId, 160);
    const itemUnit = exactText(candidate.itemUnit, 80);
    const tomatoMode = candidate.tomatoMode === "sessions" ? "sessions" : candidate.tomatoMode === "minutes" ? "minutes" : undefined;
    const duration = typeof candidate.durationMinutes === "number" && Number.isFinite(candidate.durationMinutes) && candidate.durationMinutes > 0 && candidate.durationMinutes <= 1440 ? candidate.durationMinutes : undefined;
    const occurredAt = normalizeValidIsoTimestamp(candidate.occurredAt);
    const localDate = exactText(candidate.localDate, 10);
    const state = candidate.state === "blocked" ? "blocked" : candidate.state === "pending" ? "pending" : undefined;
    if (!identity || !itemId || !itemUnit || !tomatoMode || duration === undefined || !occurredAt || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !state) return undefined;
    const attemptsRaw = typeof candidate.attempts === "number" && Number.isFinite(candidate.attempts) ? Math.max(0, Math.min(9999, Math.floor(candidate.attempts))) : 0;
    const nextAttemptAt = normalizeValidIsoTimestamp(candidate.nextAttemptAt);
    return {
        identity,
        externalRef: `docktomato:${identity}`,
        itemId,
        itemUnit,
        tomatoMode,
        durationMinutes: duration,
        occurredAt,
        localDate,
        state,
        blockedReason: state === "blocked" ? boundedText(candidate.blockedReason, 40) || undefined : undefined,
        attempts: attemptsRaw,
        nextAttemptAt: state === "pending" ? nextAttemptAt : undefined,
        lastError: boundedText(candidate.lastError, 240) || undefined,
        receivedAt: normalizeValidIsoTimestamp(candidate.receivedAt) || occurredAt,
        updatedAt: normalizeValidIsoTimestamp(candidate.updatedAt) || occurredAt,
    };
}

/** 损坏输入隔离：逐条校验，坏条目直接丢弃；按 receivedAt 保留最新若干条。 */
export function normalizeInboxStore(value: unknown): DockTomatoInboxStore {
    const source = typeof value === "string"
        ? (() => { try { return JSON.parse(value) as unknown; } catch { return undefined; } })()
        : value;
    const itemsRaw = Array.isArray(source)
        ? source
        : source && typeof source === "object" && Array.isArray((source as Record<string, unknown>).items)
            ? (source as Record<string, unknown>).items as unknown[]
            : [];
    const normalized: DockTomatoPendingCompletion[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < itemsRaw.length && normalized.length < DOCKTOMATO_INBOX_CAPACITY; index += 1) {
        const entry = normalizeEntry(itemsRaw[index]);
        if (!entry || seen.has(entry.identity)) continue;
        seen.add(entry.identity);
        normalized.push(entry);
    }
    normalized.sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt));
    return {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items: normalized};
}

export function serializeInboxStore(store: DockTomatoInboxStore): string {
    return JSON.stringify({schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items: store.items});
}

export type InboxUpsertOutcome = "added" | "merged" | "conflict" | "full";

/** 按 identity 合并：内容一致视为重复通知；冲突保留先接收的数据；满员拒绝新条目。 */
export function upsertInboxEntry(store: DockTomatoInboxStore, incoming: DockTomatoPendingCompletion, nowIso: string): {store: DockTomatoInboxStore; outcome: InboxUpsertOutcome} {
    const index = store.items.findIndex((entry) => entry.identity === incoming.identity);
    if (index >= 0) {
        const existing = store.items[index];
        const same = existing.itemId === incoming.itemId && existing.itemUnit === incoming.itemUnit && existing.tomatoMode === incoming.tomatoMode && existing.durationMinutes === incoming.durationMinutes && existing.occurredAt === incoming.occurredAt;
        if (same) return {store, outcome: "merged"};
        /* 冲突：不覆盖先前已接收的数据，仅记录冲突标记。 */
        const items = [...store.items];
        items[index] = {...existing, lastError: "payload-conflict", updatedAt: nowIso};
        return {store: {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items}, outcome: "conflict"};
    }
    if (store.items.length >= DOCKTOMATO_INBOX_CAPACITY) return {store, outcome: "full"};
    return {store: {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items: [...store.items, {...incoming}]}, outcome: "added"};
}

export function removeInboxEntry(store: DockTomatoInboxStore, identity: string): DockTomatoInboxStore {
    const items = store.items.filter((entry) => entry.identity !== identity);
    if (items.length === store.items.length) return store;
    return {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items};
}

export function markInboxRetry(store: DockTomatoInboxStore, identity: string, reason: string, nowIso: string): DockTomatoInboxStore {
    const index = store.items.findIndex((entry) => entry.identity === identity);
    if (index < 0) return store;
    const existing = store.items[index];
    if (existing.state === "blocked") return store;
    const attempts = existing.attempts + 1;
    const delay = attempts <= INBOX_RETRY_DELAYS_MS.length ? INBOX_RETRY_DELAYS_MS[attempts - 1] : undefined;
    const items = [...store.items];
    items[index] = {...existing, attempts, nextAttemptAt: delay !== undefined ? new Date(Date.parse(nowIso) + delay).toISOString() : undefined, lastError: reason.slice(0, 240), updatedAt: nowIso};
    return {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items};
}

export function markInboxBlocked(store: DockTomatoInboxStore, identity: string, reason: string, nowIso: string): DockTomatoInboxStore {
    const index = store.items.findIndex((entry) => entry.identity === identity);
    if (index < 0) return store;
    const items = [...store.items];
    items[index] = {...store.items[index], state: "blocked", blockedReason: reason.slice(0, 40), nextAttemptAt: undefined, updatedAt: nowIso};
    return {schemaVersion: DOCKTOMATO_INBOX_SCHEMA_VERSION, items};
}

/** 到期待处理项：state=pending 且（无 nextAttemptAt 或已到期）。 */
export function inboxDueEntries(store: DockTomatoInboxStore, nowIso: string): DockTomatoPendingCompletion[] {
    const now = Date.parse(nowIso);
    return store.items.filter((entry) => {
        if (entry.state !== "pending") return false;
        if (!entry.nextAttemptAt) return true;
        const due = Date.parse(entry.nextAttemptAt);
        return Number.isFinite(due) && due <= now;
    });
}

/** 最早的下一次到期时间（ms）；无待处理返回 undefined——不安排周期唤醒。 */
export function inboxNextWakeDelayMs(store: DockTomatoInboxStore, nowIso: string): number | undefined {
    const now = Date.parse(nowIso);
    let earliest: number | undefined;
    for (const entry of store.items) {
        if (entry.state !== "pending" || !entry.nextAttemptAt) continue;
        const due = Date.parse(entry.nextAttemptAt);
        if (!Number.isFinite(due)) continue;
        const delay = Math.max(0, due - now);
        if (earliest === undefined || delay < earliest) earliest = delay;
    }
    return earliest;
}
