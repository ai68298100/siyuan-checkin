export type CheckinKind = "binary" | "count" | "duration" | "quantity" | "custom";

export type CheckinPriority = "low" | "medium" | "high";

export type CheckinTimeSlot = "any" | "morning" | "afternoon" | "evening";

export type CompletionSource = "manual" | "tomato";
export type TomatoValueMode = "minutes" | "sessions";

export type CheckinItemSortMode = "manual" | "group" | "priority" | "createdAt" | "updatedAt" | "name";

export type ScheduleType = "daily" | "weekly" | "workdays" | "custom" | "interval" | "quota";

export type QuotaPeriod = "week" | "month";
export type QuotaCountMode = "dates" | "value";

export interface CheckinQuota {
    period: QuotaPeriod;
    amount: number;
    countMode: QuotaCountMode;
    weekStartsOn?: 1;
}

export interface CheckinSchedule {
    type: ScheduleType;
    weekdays?: number[];
    /** Number of local calendar days between scheduled occurrences. */
    intervalDays?: number;
    /** Inclusive local date used as the first scheduled occurrence. */
    anchorDate?: string;
    quota?: CheckinQuota;
}

export interface CheckinItemRevision {
    effectiveDate: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    /** Amount recorded by the quick action for this revision. */
    recordStep?: number;
    schedule: CheckinSchedule;
}

export interface CheckinArchivePeriod {
    startDate: string;
    endDate?: string;
}

export interface CheckinItem {
    id: string;
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    /** Amount recorded by one quick check-in. */
    recordStep?: number;
    schedule: CheckinSchedule;
    createdAt: string;
    updatedAt: string;
    createdDate: string;
    revisions: CheckinItemRevision[];
    archivePeriods: CheckinArchivePeriod[];
    archived?: boolean;
    /** User-defined bucket. Empty string means the default ungrouped bucket. */
    group?: string;
    /** Normalized urgency used by priority sorting. */
    priority?: CheckinPriority;
    /** Stable manual order within a group. Lower values appear first. */
    sortOrder?: number;
    /** Optional part of day used by the time grouping view. */
    timeSlot?: CheckinTimeSlot;
    /** Set on one-shot items generated from a date occasion; links completion back to it. */
    linkedOccasionId?: string;
    /** How completion is supplied. Tomato mode is written by a compatible plugin. */
    completionSource?: CompletionSource;
    /** Whether tomato completion contributes minutes or completed sessions. */
    tomatoMode?: TomatoValueMode;
    /** 自动归档（D-165/T-1161）：达成天数达到 afterDays 后自动归档；缺省或 0 表示关闭。 */
    autoArchive?: {afterDays: number};
    /** T-1239 负向习惯方向（D-219）：atMost=戒除类（被动型，不记录即成功）；缺省 at-least。仅 daily 排期。 */
    direction?: "atMost";
    /** T-1231 笔记锚点（opt-in）：打卡状态回写的目标块（文档 ID 亦是合法块 ID）。 */
    noteAnchor?: {blockId: string; appendNotes?: boolean};
    /** T-1390（D-259）：Task Horizon 日历显示策略；缺省/true=显示，仅物化 false（隐藏）。
        只控制外部日历投影，不影响本地项目、事件、统计、导出或任务完成回写。 */
    taskHorizonCalendarVisible?: false;
    /** T-1409 容错连续（maxGap）：排期日漏打 ≤N 天不断签（缺口不计数）；缺省/0=严格断链。
        仅物化 1~30；at-most 与 quota 排期不叠加。 */
    streakTolerance?: number;
}

export interface CheckinEvent {
    id: string;
    itemId: string;
    occurredAt: string;
    localDate: string;
    value: number;
    unit: string;
    /** D-216 之外：sireader=思阅适配器（T-1384）、siplayer=思播适配器（T-1385）、weread=微信读书适配器（T-1402），均为内部写入，外部 API 不可伪造。 */
    source: "manual" | "tomato" | "import" | "api" | "sireader" | "siplayer" | "weread";
    note?: string;
    /** Optional photo attachment as a data URL (\u2264 ~500KB binary). */
    attachment?: string;
    externalRef?: string;
    /** D-216/T-1220：跳过是一等记录态。缺省与 "checkin" 同义（历史数据零迁移）。 */
    kind?: "checkin" | "skip";
}

export interface CheckinEventTombstone {
    eventId: string;
    deletedAt: string;
    itemId?: string;
    source?: CheckinEvent["source"];
    externalRef?: string;
}

export interface CheckinStore {
    version: 3;
    items: CheckinItem[];
    events: CheckinEvent[];
    eventTombstones: CheckinEventTombstone[];
    templates?: UserTemplate[];
}

export interface UserTemplate {
    id: string;
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    recordStep?: number;
    schedule: CheckinSchedule;
    group: string;
    priority: CheckinPriority;
    timeSlot?: CheckinTimeSlot;
    note: string;
    completionSource?: CompletionSource;
    tomatoMode?: TomatoValueMode;
    createdAt: string;
    updatedAt: string;
}

export interface CheckinIntegrationEvent {
    type: "item-created" | "item-updated" | "item-deleted" | "item-archived" | "event-recorded" | "event-deleted" | "suggestion-workflow-updated" | "analytics-updated";
    item?: CheckinItem;
    event?: CheckinEvent;
    deletedEvents?: CheckinEvent[];
    suggestionId?: string;
    suggestionStatus?: "pending" | "confirmed" | "cancelled" | "failed";
    analyticsAsOf?: string;
}

export type SuggestionWorkflowIntegrationEvent = {
    type: "suggestion-workflow-updated";
    suggestionId: string;
    suggestionStatus: "pending" | "confirmed" | "cancelled" | "failed";
};
