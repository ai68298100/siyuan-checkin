/* 外部失败记录待处理箱（纯函数层，T-1509，D-293）：
   外部来源写入经 recordExternalEvent 遇到可重试存储失败时，把最少字段
   持久化到独立有界箱；启动恢复与用户重试必须重查项目/修订/单位/映射/
   启用状态与墓碑（重查决策在本模块 planExternalPendingRetry），
   禁止自动转投新目标。只保存经过校验的纯数据；不保存 Event/DOM/函数对象。
   边界：只收可重试存储失败；配置拒绝不入箱（不自动复活）；
   本箱不承诺恢复从未收到的监听事件（T-1508 上游边界不变）。 */
import type {CheckinEvent} from "../types";

export type ExternalPendingSource = "siplayer" | "sireader" | "api" | "weread" | "yeguif";

export interface ExternalPendingEntry {
    /** 稳定 id：入箱时由来源+身份+目标派生，同身份重复失败合并。 */
    id: string;
    source: ExternalPendingSource;
    itemId: string;
    value: number;
    /** 失败时刻的项目修订单位；重试时必须与当前修订单位一致。 */
    unit: string;
    note?: string;
    externalRef: string;
    /** 校验过的写入钟表；重试不得改写。 */
    occurredAt: string;
    localDate: string;
    /** 首次失败时刻（ISO）。 */
    failedAt: string;
    attempts: number;
    lastReason?: string;
}

export interface ExternalPendingBox {
    schemaVersion: 1;
    items: ExternalPendingEntry[];
}

/** 容量上限（显式配置常量，D-293）：满了拒绝新条目并在设置页可见，不静默覆盖。 */
export const EXTERNAL_PENDING_CAPACITY = 40;
/** 保留期（显式配置常量，D-293）：超过 N 个自然日仍未成功恢复的条目到期剪除。 */
export const EXTERNAL_PENDING_RETENTION_DAYS = 14;

export const EXTERNAL_PENDING_SCHEMA_VERSION = 1;

/** recordExternalEvent 的失败归因：只有 storage-failed 会入箱。 */
export type ExternalWriteFailureReason =
    | "lifecycle"
    | "item-unavailable"
    | "invalid-value"
    | "identity-rejected"
    | "revision-changed"
    | "unit-mismatch"
    | "unchanged"
    | "storage-failed";

export interface ExternalWriteOutcome {
    reason?: ExternalWriteFailureReason;
}

const SOURCE_OK: ReadonlySet<string> = new Set(["siplayer", "sireader", "api", "weread", "yeguif"]);

function exactText(value: unknown, maxLength: number): string {
    if (typeof value !== "string" || !value || value.length > maxLength || value.trim() !== value) return "";
    return value;
}

function boundedText(value: unknown, maxLength: number): string {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validIso(value: unknown): string | undefined {
    if (typeof value !== "string" || !value || value.length > 40) return undefined;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return undefined;
    return new Date(parsed).toISOString();
}

/** 入箱身份：同来源+同 externalRef+同目标视为同一条目（重复失败合并不膨胀）。 */
export function externalPendingIdentity(source: ExternalPendingSource, externalRef: string, itemId: string): string {
    return `${source}:${itemId}:${externalRef}`;
}

function normalizeEntry(value: unknown): ExternalPendingEntry | undefined {
    if (!value || typeof value !== "object") return undefined;
    const candidate = value as Record<string, unknown>;
    const source = typeof candidate.source === "string" && SOURCE_OK.has(candidate.source) ? candidate.source as ExternalPendingSource : undefined;
    const itemId = exactText(candidate.itemId, 160);
    const externalRef = exactText(candidate.externalRef, 240);
    const unit = exactText(candidate.unit, 80);
    const localDate = exactText(candidate.localDate, 10);
    const value_ = typeof candidate.value === "number" && Number.isFinite(candidate.value) && candidate.value >= 0 ? candidate.value : undefined;
    const occurredAt = validIso(candidate.occurredAt);
    const failedAt = validIso(candidate.failedAt);
    if (!source || !itemId || !externalRef || !unit || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) || value_ === undefined || !occurredAt) return undefined;
    const attemptsRaw = typeof candidate.attempts === "number" && Number.isFinite(candidate.attempts) ? Math.max(0, Math.min(999, Math.floor(candidate.attempts))) : 0;
    const note = boundedText(candidate.note, 400) || undefined;
    return {
        id: externalPendingIdentity(source, externalRef, itemId),
        source,
        itemId,
        value: value_,
        unit,
        note,
        externalRef,
        occurredAt,
        localDate,
        failedAt: failedAt || occurredAt,
        attempts: attemptsRaw,
        lastReason: boundedText(candidate.lastReason, 60) || undefined,
    };
}

/** 损坏输入隔离：逐条校验，坏条目直接丢弃；超容量保留先入箱条目。 */
export function normalizeExternalPendingBox(input: unknown): ExternalPendingBox {
    const source = typeof input === "string"
        ? (() => { try { return JSON.parse(input) as unknown; } catch { return undefined; } })()
        : input;
    const itemsRaw = Array.isArray(source)
        ? source
        : source && typeof source === "object" && Array.isArray((source as Record<string, unknown>).items)
            ? (source as Record<string, unknown>).items as unknown[]
            : [];
    const items: ExternalPendingEntry[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < itemsRaw.length && items.length < EXTERNAL_PENDING_CAPACITY; index += 1) {
        const entry = normalizeEntry(itemsRaw[index]);
        if (!entry || seen.has(entry.id)) continue;
        seen.add(entry.id);
        items.push(entry);
    }
    items.sort((left, right) => Date.parse(left.failedAt) - Date.parse(right.failedAt));
    return {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items};
}

export function serializeExternalPendingBox(box: ExternalPendingBox): {schemaVersion: 1; items: ExternalPendingEntry[]} {
    return {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items: box.items.map((entry) => ({...entry}))};
}

/* T-1622 跨窗口合并：按条目身份并集（normalize 保留先入=本地载荷优先），远端独有条目采用，
    容量与保留期仍由 normalize 强制。调用方必须在「变更前」同步（采用远端新增），
    不能在删除类变更之后调用——箱的丢弃无墓碑，先删后并会复活本窗已丢弃条目。 */
export function mergeExternalPendingBoxes(local: ExternalPendingBox, remote: ExternalPendingBox): ExternalPendingBox {
    return normalizeExternalPendingBox({items: [...local.items, ...remote.items]});
}

export type ExternalPendingEnqueueOutcome = "added" | "merged" | "full";

/** 同身份条目已存在则原样保留（不覆盖首次失败数据）；满员显式拒绝，不静默覆盖。 */
export function enqueueExternalPending(box: ExternalPendingBox, incoming: ExternalPendingEntry): {box: ExternalPendingBox; outcome: ExternalPendingEnqueueOutcome} {
    const existing = box.items.find((entry) => entry.id === incoming.id);
    if (existing) return {box, outcome: "merged"};
    if (box.items.length >= EXTERNAL_PENDING_CAPACITY) return {box, outcome: "full"};
    const items = [...box.items, {...incoming}];
    items.sort((left, right) => Date.parse(left.failedAt) - Date.parse(right.failedAt));
    return {box: {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items}, outcome: "added"};
}

/** 保留期剪除：failedAt 距 todayKey 超过保留期的条目到期移除，返回剪除数。 */
export function pruneExternalPending(box: ExternalPendingBox, todayKey: string): {box: ExternalPendingBox; expired: number} {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return {box, expired: 0};
    const items = box.items.filter((entry) => {
        const ageDays = Math.floor((Date.parse(`${todayKey}T00:00:00Z`) - Date.parse(`${entry.localDate}T00:00:00Z`)) / 86400000);
        return Number.isFinite(ageDays) && ageDays <= EXTERNAL_PENDING_RETENTION_DAYS;
    });
    return {box: {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items}, expired: box.items.length - items.length};
}

export function removeExternalPendingEntry(box: ExternalPendingBox, id: string): ExternalPendingBox {
    const items = box.items.filter((entry) => entry.id !== id);
    if (items.length === box.items.length) return box;
    return {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items};
}

export function markExternalPendingRetry(box: ExternalPendingBox, id: string, reason: string, nowIso: string): ExternalPendingBox {
    const index = box.items.findIndex((entry) => entry.id === id);
    if (index < 0) return box;
    const items = [...box.items];
    items[index] = {...items[index], attempts: Math.min(999, items[index].attempts + 1), lastReason: reason.slice(0, 60) || items[index].lastReason, failedAt: validIso(nowIso) || items[index].failedAt};
    return {schemaVersion: EXTERNAL_PENDING_SCHEMA_VERSION, items};
}

/** 重试决策输入：全部来自重查时的当前 store/偏好快照。 */
export interface ExternalPendingRetryContext {
    /** 当前活跃项目存在且目标未被改绑/停用（映射仍指向 entry.itemId）。 */
    targetAvailable: boolean;
    /** 来源摄取通道当前启用。 */
    sourceEnabled: boolean;
    /** (source, externalRef, itemId) 命中墓碑——用户已撤销的事实不得复活。 */
    tombstoned: boolean;
    /** 当前修订单位与入箱单位一致。 */
    unitMatches: boolean;
    /** 目标日期（localDate）不晚于今天——未来日期不是有效完成日。 */
    dateNotFuture: boolean;
}

export type ExternalPendingRetryPlan =
    | {kind: "write"}
    | {kind: "refuse"; reason: "target-gone" | "source-disabled" | "tombstoned" | "unit-changed" | "future-date"};

/** 重试决策（唯一边界）：任何一项不满足都拒绝写入并给出可见原因；
    绝不自动改投新目标、绝不绕过墓碑。 */
export function planExternalPendingRetry(context: ExternalPendingRetryContext): ExternalPendingRetryPlan {
    if (!context.targetAvailable) return {kind: "refuse", reason: "target-gone"};
    if (!context.sourceEnabled) return {kind: "refuse", reason: "source-disabled"};
    if (context.tombstoned) return {kind: "refuse", reason: "tombstoned"};
    if (!context.dateNotFuture) return {kind: "refuse", reason: "future-date"};
    if (!context.unitMatches) return {kind: "refuse", reason: "unit-changed"};
    return {kind: "write"};
}

/** 恢复/重试后的箱状态迁移：写入或重复成功 → 移除；拒绝/再失败 → 记一次尝试。 */
export function settleExternalPendingAfterRetry(box: ExternalPendingBox, id: string, result: {written: boolean; duplicate: boolean} | {written: false; duplicate: false; reason: string}, nowIso: string): ExternalPendingBox {
    const entry = box.items.find((item) => item.id === id);
    if (!entry) return box;
    if ("written" in result && (result.written || result.duplicate)) return removeExternalPendingEntry(box, id);
    const reason = "reason" in result ? result.reason : "";
    return markExternalPendingRetry(box, id, reason, nowIso);
}

/** 设置页展示投影：只含纯数据的最新若干条（新在前），文案由渲染层走 i18n。 */
export interface ExternalPendingEntryView {
    id: string;
    source: ExternalPendingSource;
    itemId: string;
    itemName?: string;
    value: number;
    unit: string;
    localDate: string;
    failedAt: string;
    attempts: number;
    lastReason?: string;
}

export function projectExternalPendingEntries(box: ExternalPendingBox, itemNameById: (itemId: string) => string | undefined, limit = 20): ExternalPendingEntryView[] {
    const views: ExternalPendingEntryView[] = [];
    for (let index = box.items.length - 1; index >= 0 && views.length < limit; index -= 1) {
        const entry = box.items[index];
        if (!entry) continue;
        views.push({
            id: entry.id,
            source: entry.source,
            itemId: entry.itemId,
            itemName: itemNameById(entry.itemId),
            value: entry.value,
            unit: entry.unit,
            localDate: entry.localDate,
            failedAt: entry.failedAt,
            attempts: entry.attempts,
            lastReason: entry.lastReason,
        });
    }
    return views;
}

/** 入箱载荷构造（写入端唯一边界）：字段来自写入尝试当时的输入与修订，全部有界。 */
export function buildExternalPendingEntry(input: {itemId: string; value: number; unit: string; note?: string; source: CheckinEvent["source"]; externalRef: string}, moment: {occurredAt: string; localDate: string}, failedAtIso: string): ExternalPendingEntry | undefined {
    const source = input.source as ExternalPendingSource;
    if (!SOURCE_OK.has(source)) return undefined;
    return normalizeEntry({
        source,
        itemId: input.itemId,
        value: input.value,
        unit: input.unit,
        note: input.note,
        externalRef: input.externalRef,
        occurredAt: moment.occurredAt,
        localDate: moment.localDate,
        failedAt: failedAtIso,
        attempts: 0,
    });
}
