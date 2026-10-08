/* T-1777（D-347）：项目规则变更历史时间线——只读纯投影。
   revisions 已按生效日排序（D-335 起含 direction），本投影生成每次生效的
   变化点（类型/目标/单位/方向/排期类型/排期细节）、生效区间（至下一修订前一日，
   末条=至今）与"新旧统计为何不同"的解释键（完成判定/进度分母按当日修订结算，
   D-335/D-341）。createdDate 早于首个修订生效日的区间无法从现存数据还原，
   如实标 unknown；渲染层零写入、不触发任何重算。 */
import {getItemRevisionForDate} from "../rules";
import type {CheckinItem, CheckinItemRevision} from "../types";

export type RuleTimelineField = "kind" | "target" | "unit" | "direction" | "scheduleType" | "scheduleDetail";

export interface RuleTimelineChange {
    field: RuleTimelineField;
    /** 规范化后的旧值/新值（可读键或标量字符串），由渲染层配标签。 */
    from?: string;
    to?: string;
}

export interface RuleTimelineEntry {
    effectiveDate: string;
    /** 生效区间末日（下一修订生效日前一日）；缺省=至今。 */
    endDate?: string;
    changes: RuleTimelineChange[];
    explanationKeys: string[];
    isCurrent: boolean;
}

export interface RuleTimeline {
    entries: RuleTimelineEntry[];
    /** createdDate 与首个修订之间的区间无法还原（未知旧版本）。 */
    unknownBefore?: {from: string; until: string};
}

const describeRevision = (item: CheckinItem, revision: CheckinItemRevision): Record<RuleTimelineField, string> => ({
    kind: revision.kind,
    target: String(revision.target),
    unit: revision.unit,
    direction: getItemDirectionOf(item, revision),
    scheduleType: revision.schedule.type,
    scheduleDetail: scheduleDetailOf(revision),
});

function getItemDirectionOf(item: CheckinItem, revision: CheckinItemRevision): "atLeast" | "atMost" {
    return revision.direction ?? (item.direction === "atMost" ? "atMost" : "atLeast");
}

function scheduleDetailOf(revision: CheckinItemRevision): string {
    const schedule = revision.schedule;
    if (schedule.type === "weekly") return `weekdays:${(schedule.weekdays || []).join(",")}`;
    if (schedule.type === "interval") return `interval:${schedule.intervalDays}:${schedule.anchorDate || ""}`;
    if (schedule.type === "quota") return `quota:${schedule.quota?.period || ""}:${schedule.quota?.amount || ""}:${schedule.quota?.countMode || ""}`;
    return schedule.type;
}

const EXPLANATION_BY_FIELD: Record<RuleTimelineField, string> = {
    kind: "editor.timelineExplainKind",
    target: "editor.timelineExplainTarget",
    unit: "editor.timelineExplainUnit",
    direction: "editor.timelineExplainDirection",
    scheduleType: "editor.timelineExplainSchedule",
    scheduleDetail: "editor.timelineExplainScheduleDetail",
};

/** 相邻修订比较的规则字段（键序无关值比较）。 */
const COMPARED_FIELDS: RuleTimelineField[] = ["kind", "target", "unit", "direction", "scheduleType", "scheduleDetail"];

export function buildRuleTimeline(item: CheckinItem, revisions?: readonly CheckinItemRevision[]): RuleTimeline {
    const ordered = [...(revisions || item.revisions)].sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
    const entries: RuleTimelineEntry[] = [];
    ordered.forEach((revision, index) => {
        const next = ordered[index + 1];
        const previous = index > 0 ? ordered[index - 1] : undefined;
        const changes: RuleTimelineChange[] = [];
        const explanationKeys: string[] = [];
        if (previous) {
            const before = describeRevision(item, previous);
            const after = describeRevision(item, revision);
            for (const field of COMPARED_FIELDS) {
                if (before[field] === after[field]) continue;
                changes.push({field, from: before[field], to: after[field]});
                explanationKeys.push(EXPLANATION_BY_FIELD[field]);
            }
        }
        entries.push({
            effectiveDate: revision.effectiveDate,
            endDate: next ? previousDay(next.effectiveDate) : undefined,
            changes,
            explanationKeys,
            isCurrent: index === ordered.length - 1,
        });
    });
    const first = ordered[0];
    const unknownBefore = first && item.createdDate < first.effectiveDate
        ? {from: item.createdDate, until: previousDay(first.effectiveDate)}
        : undefined;
    return {entries, unknownBefore};
}

/** 当日有效规则速查（供渲染层在时间线头部队归属与单位上下文；纯读取）。 */
export function currentRevisionOf(item: CheckinItem, date: Date): CheckinItemRevision {
    return getItemRevisionForDate(item, date);
}

function previousDay(key: string): string {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day - 1, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
