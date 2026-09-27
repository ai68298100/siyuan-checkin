/* T-1514 规则修改前后影响对照——纯函数投影（零运行时依赖、无时钟、确定性）。
   纪律（承接产品计划批次 B，依赖 T-1513 排期预演）：
   - 只比较规则字段：类型/目标/单位/频率（排期）；名称、图标、分组等展示字段不触发对照；
   - 未来 30 天安排差异复用 T-1513 buildSchedulePreview（与排期内核同口径），
     旧侧取该项目当前生效修订，新侧取编辑器草稿；
   - 只呈现差异，不做换算：旧值不自动换算到新单位，历史事实按既有修订机制保留。 */
import {buildSchedulePreview, type SchedulePreviewDraft} from "./schedule-preview";
import type {CheckinKind, ScheduleType} from "../types";

export interface RuleChangeSide {
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: SchedulePreviewDraft;
}

export interface RuleChangeDiff {
    changed: boolean;
    kindChanged?: {from: CheckinKind; to: CheckinKind};
    targetChanged?: {from: number; to: number};
    unitChanged?: {from: string; to: string};
    frequencyChanged?: {from: ScheduleType; to: ScheduleType};
    /** 同类型下的参数变化（星期集合/间隔/锚点/配额参数）。 */
    detailChanged?: boolean;
    /** 未来 30 天新增/移除的应做日（升序，来自两侧排期预演的差集）。 */
    addedDays: string[];
    removedDays: string[];
    /** 任一侧排期草稿非法时无日级差异可算（保存会被既有校验拦截）。 */
    previewUnavailable?: boolean;
}

function weekdaysKey(weekdays: unknown): string {
    if (!Array.isArray(weekdays)) return "";
    return [...weekdays].filter((day) => Number.isInteger(day)).sort((left, right) => left - right).join(",");
}

function canonicalSchedule(schedule: SchedulePreviewDraft): string {
    const weekdays = schedule.type === "weekly" || schedule.type === "custom" ? weekdaysKey(schedule.weekdays) : "";
    const interval = schedule.type === "interval" ? `${schedule.intervalDays ?? ""}@${schedule.anchorDate ?? ""}` : "";
    const quota = schedule.type === "quota" && schedule.quota ? `${schedule.quota.period}:${schedule.quota.amount}:${schedule.quota.countMode}` : "";
    return JSON.stringify({type: schedule.type, weekdays, interval, quota});
}

/** 规则差异计算：字段级对照 + 未来 30 天排期日差集；确定性输出。 */
export function buildRuleChangeDiff(before: RuleChangeSide, after: RuleChangeSide, startDate: string): RuleChangeDiff {
    const kindChanged = before.kind !== after.kind ? {from: before.kind, to: after.kind} : undefined;
    const targetChanged = before.target !== after.target ? {from: before.target, to: after.target} : undefined;
    const unitChanged = before.unit !== after.unit ? {from: before.unit, to: after.unit} : undefined;
    const scheduleEqual = canonicalSchedule(before.schedule) === canonicalSchedule(after.schedule);
    const frequencyChanged = !scheduleEqual && before.schedule.type !== after.schedule.type ? {from: before.schedule.type, to: after.schedule.type} : undefined;
    const detailChanged = !scheduleEqual && !frequencyChanged;
    const diff: RuleChangeDiff = {
        changed: Boolean(kindChanged || targetChanged || unitChanged || !scheduleEqual),
        ...(kindChanged ? {kindChanged} : {}),
        ...(targetChanged ? {targetChanged} : {}),
        ...(unitChanged ? {unitChanged} : {}),
        ...(frequencyChanged ? {frequencyChanged} : {}),
        ...(detailChanged ? {detailChanged} : {}),
        addedDays: [],
        removedDays: [],
    };
    if (!diff.changed) return diff;
    const beforePreview = buildSchedulePreview(before.schedule, startDate);
    const afterPreview = buildSchedulePreview(after.schedule, startDate);
    if (beforePreview.invalidReasonKey || afterPreview.invalidReasonKey) {
        return {...diff, previewUnavailable: true};
    }
    if (scheduleEqual) return diff;
    const beforeDays = new Set(beforePreview.days.filter((day) => day.scheduled).map((day) => day.date));
    const afterDays = new Set(afterPreview.days.filter((day) => day.scheduled).map((day) => day.date));
    diff.addedDays = afterPreview.days.filter((day) => day.scheduled && !beforeDays.has(day.date)).map((day) => day.date);
    diff.removedDays = beforePreview.days.filter((day) => day.scheduled && !afterDays.has(day.date)).map((day) => day.date);
    return diff;
}
