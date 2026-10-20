/* T-1511 批量补记实际数量与提交预览——纯函数分类与数值解析（零运行时依赖、无时钟、确定性）。
   纪律（承接 T-1497 批量补卡）：
   - 预览零写入：分类只读快照；提交前宿主必须用当前 store 重建快照重新分类（重校验）；
   - 数值不默认为目标值：数值型条目必须逐项填写实际数量，空/零/负/非法一律不提交；
   - 二值保持 1；限额/戒除（atMost）不批量制造成功事实；绑定问卷的项目排除，
     跳转既有单条问卷流程；配额沿用既有配额内核，不做新口径；
   - 已存在事件（含跳过）判 existing，不重复记账；排期不适用如实呈现。 */

import {dateKey, getItemRevisionForDate, getSkipDatesForItem, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import type {CheckinItem, CheckinStore} from "../types";

export type CheckinKindLike = "binary" | "count" | "duration" | "quantity" | "custom";

export type BatchBackfillState = "ready" | "existing" | "off-schedule" | "unsupported";

/** 提交预览用的项目只读快照；由宿主在预览时与提交时各自构建。 */
export interface BatchBackfillItemSnapshot {
    id: string;
    name: string;
    /** 该目标日已有任意事件（含跳过）。 */
    hasEvent: boolean;
    /** 未归档、当日可用且按排期应做。 */
    scheduled: boolean;
    /** 当日生效修订的类型与单位。 */
    kind: CheckinKindLike;
    unit: string;
    recordStep?: number;
    /** direction=atMost（限额/戒除）：不记录即成功，批量补记不制造成功事实。 */
    atMost: boolean;
    /** 绑定问卷模板：批量走不了一份问卷，排除并指向单条流程。 */
    hasJournal: boolean;
}

export interface BatchBackfillEntry {
    itemId: string;
    name: string;
    state: BatchBackfillState;
    /** existing / off-schedule / unsupported 的解释 i18n 键。 */
    reasonKey?: string;
    /** 数值型需要用户填写实际数量；二值无输入。 */
    inputMode: "none" | "number";
    unit: string;
    recordStep?: number;
    /** 解析后的实际值；二值恒为 1。 */
    value?: number;
    /** 数值型填写问题（缺失/非法）；有 errorKey 的 ready 条目不计入可提交数。 */
    errorKey?: string;
}

export interface BatchBackfillPreview {
    entries: BatchBackfillEntry[];
    readyCount: number;
}

const MAX_BATCH_VALUE = 1000000;

export const BATCH_BACKFILL_UNSUPPORTED_LIMIT = "review.batchReasonLimit";
export const BATCH_BACKFILL_UNSUPPORTED_JOURNAL = "review.batchReasonJournal";
export const BATCH_BACKFILL_EXISTING = "review.batchReasonExisting";
export const BATCH_BACKFILL_OFF_SCHEDULE = "review.batchReasonOffSchedule";
export const BATCH_BACKFILL_VALUE_MISSING = "review.batchValueMissing";
export const BATCH_BACKFILL_VALUE_INVALID = "review.batchValueInvalid";

/** 单条分类与数值解析：顺序固定（已存在 → 排期 → 限额/戒除 → 问卷 → 类型），确定性。 */
export function classifyBatchBackfillItem(snapshot: BatchBackfillItemSnapshot, rawValue?: string): BatchBackfillEntry {
    const base: BatchBackfillEntry = {itemId: snapshot.id, name: snapshot.name, state: "ready", inputMode: snapshot.kind === "binary" ? "none" : "number", unit: snapshot.unit, recordStep: snapshot.recordStep};
    if (snapshot.hasEvent) return {...base, state: "existing", reasonKey: BATCH_BACKFILL_EXISTING};
    if (!snapshot.scheduled) return {...base, state: "off-schedule", reasonKey: BATCH_BACKFILL_OFF_SCHEDULE};
    if (snapshot.atMost) return {...base, state: "unsupported", reasonKey: BATCH_BACKFILL_UNSUPPORTED_LIMIT};
    if (snapshot.hasJournal) return {...base, state: "unsupported", reasonKey: BATCH_BACKFILL_UNSUPPORTED_JOURNAL};
    if (snapshot.kind === "binary") return {...base, value: 1};
    /* 数值型：必须逐项填写实际数量；空/零/负/非法/超限一律不提交，不默认目标值。 */
    const trimmed = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!trimmed) return {...base, errorKey: BATCH_BACKFILL_VALUE_MISSING};
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_BATCH_VALUE) return {...base, errorKey: BATCH_BACKFILL_VALUE_INVALID};
    return {...base, value: parsed};
}

/** 整批预览：只读分类，不写任何状态；readyCount 仅计实际可提交条目。 */
export function buildBatchBackfillPreview(snapshots: readonly BatchBackfillItemSnapshot[], values: Readonly<Record<string, string>> = {}): BatchBackfillPreview {
    const entries = snapshots.map((snapshot) => classifyBatchBackfillItem(snapshot, values[snapshot.id]));
    const readyCount = entries.filter((entry) => entry.state === "ready" && !entry.errorKey && entry.value !== undefined).length;
    return {entries, readyCount};
}

/** 提交前重校验（宿主在 mutation 内以当前 store 重建快照后调用）：
    只返回仍可提交的条目，已存在/排期变化/被改绑的项目自动落回对应分类不重复记账。 */
export function planBatchBackfillSubmit(snapshots: readonly BatchBackfillItemSnapshot[], values: Readonly<Record<string, string>> = {}): Array<{itemId: string; value: number}> {
    return buildBatchBackfillPreview(snapshots, values).entries
        .filter((entry) => entry.state === "ready" && !entry.errorKey && entry.value !== undefined)
        .map((entry) => ({itemId: entry.itemId, value: entry.value as number}));
}

/* ===== T-1875 历史排期日历轻量点选补卡与矩阵批量回填（对标 Loop Habit Tracker） ===== */

export type MatrixTriState = "empty" | "done" | "skip";

export function nextMatrixTriState(current: MatrixTriState): MatrixTriState {
    if (current === "empty") return "done";
    if (current === "done") return "skip";
    return "empty";
}

export interface MatrixCalendarDayInfo {
    date: string;
    dayNumber: number;
    weekday: number;
    isFuture: boolean;
    scheduled: boolean;
    originalState: MatrixTriState;
    currentState: MatrixTriState;
    unit: string;
    step: number;
}

export function buildMatrixMonthCalendar(
    store: CheckinStore,
    item: CheckinItem,
    year: number,
    month: number, // 0~11
    drafts: ReadonlyMap<string, MatrixTriState> = new Map(),
    asOfDate = dateKey(new Date()),
): MatrixCalendarDayInfo[] {
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const result: MatrixCalendarDayInfo[] = [];

    const skipDates = getSkipDatesForItem(store, item.id);

    for (let day = 1; day <= daysInMonth; day += 1) {
        const curDate = new Date(year, month, day);
        const curKey = dateKey(curDate);
        const isFuture = curKey > asOfDate;
        const available = isItemAvailableOnDate(item, curDate);
        const scheduled = available && isScheduledToday(item, curDate);
        const revision = getItemRevisionForDate(item, curDate);

        let originalState: MatrixTriState = "empty";
        if (skipDates.has(curKey)) {
            originalState = "skip";
        } else {
            const hasComplete = isComplete(store, item, curDate);
            if (hasComplete) originalState = "done";
        }

        const currentState = drafts.has(curKey) ? drafts.get(curKey)! : originalState;

        result.push({
            date: curKey,
            dayNumber: day,
            weekday: (curDate.getDay() + 6) % 7, // 0=周一, 6=周日
            isFuture,
            scheduled,
            originalState,
            currentState,
            unit: revision.unit || "次",
            step: revision.recordStep || 1,
        });
    }

    return result;
}

export interface MatrixPlanResult {
    changedCount: number;
    toAddCheckins: Array<{itemId: string; localDate: string; value: number; unit: string}>;
    toAddSkips: Array<{itemId: string; localDate: string; unit: string}>;
    toDeleteEventIds: string[];
}

export function planMatrixBatchCommit(
    store: CheckinStore,
    item: CheckinItem,
    calendarDays: readonly MatrixCalendarDayInfo[],
): MatrixPlanResult {
    const toAddCheckins: Array<{itemId: string; localDate: string; value: number; unit: string}> = [];
    const toAddSkips: Array<{itemId: string; localDate: string; unit: string}> = [];
    const toDeleteEventIds: string[] = [];
    let changedCount = 0;

    for (const day of calendarDays) {
        if (day.isFuture || day.currentState === day.originalState) continue;
        changedCount += 1;
        const dayEvents = store.events.filter((e) => e.itemId === item.id && e.localDate === day.date);

        if (day.currentState === "done") {
            dayEvents.forEach((e) => toDeleteEventIds.push(e.id));
            toAddCheckins.push({
                itemId: item.id,
                localDate: day.date,
                value: day.step,
                unit: day.unit,
            });
        } else if (day.currentState === "skip") {
            dayEvents.forEach((e) => toDeleteEventIds.push(e.id));
            toAddSkips.push({
                itemId: item.id,
                localDate: day.date,
                unit: day.unit,
            });
        } else if (day.currentState === "empty") {
            dayEvents.forEach((e) => toDeleteEventIds.push(e.id));
        }
    }

    return {changedCount, toAddCheckins, toAddSkips, toDeleteEventIds};
}

