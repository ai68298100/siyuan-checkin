/* 展示标签的字典键映射表：值是 i18n 键，运行时经 t() 取词。 */
import type {CheckinItemSortMode, CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot, ScheduleType} from "../types";

export const KIND_LABELS: Record<CheckinKind, string> = {
    binary: "kind.binary",
    count: "kind.count",
    duration: "kind.duration",
    quantity: "kind.quantity",
    custom: "kind.custom",
};

export const PRIORITY_LABELS: Record<CheckinPriority, string> = {
    high: "priority.high",
    medium: "priority.medium",
    low: "priority.low",
};

export const TIME_SLOT_LABELS: Record<CheckinTimeSlot, string> = {
    morning: "slot.morning",
    afternoon: "slot.afternoon",
    evening: "slot.evening",
    any: "slot.any",
};

export const SORT_LABELS: Partial<Record<CheckinItemSortMode, string>> = {
    manual: "sort.manual",
    priority: "sort.priority",
    name: "sort.name",
    createdAt: "sort.createdAt",
    updatedAt: "sort.updatedAt",
};

export const SCHEDULE_LABELS: Record<ScheduleType, string> = {
    daily: "schedule.daily",
    workdays: "schedule.workdays",
    weekly: "schedule.weekly",
    custom: "schedule.custom",
    interval: "schedule.interval",
    quota: "schedule.quota",
};
