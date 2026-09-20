/* 20.0 T-1359 项目草案确认流：智能体（或本地生成器）产出新建项目的结构化草案，
   用户在普通编辑器中检查后手动保存——模型不直接写 store（AI 规划 C 块）。
   - normalizeProjectDraft：结构 + 边界校验（与编辑器保存校验同一量级）；
   - draftFromTemplate：从内置模板派生草案变体（"喝水模板的变体"场景）；
   - 排期校验复用 normalizeSuggestionSchedule（T-1360 单一实现），不另写一套。 */

import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot} from "../types";
import {normalizeSuggestionSchedule} from "./schedule-validate";

export interface ProjectDraft {
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: CheckinSchedule;
    group: string;
    priority: CheckinPriority;
    timeSlot: CheckinTimeSlot;
    note: string;
}

export type ProjectDraftParseResult = {ok: true; draft: ProjectDraft} | {ok: false; reason: string};

const DRAFT_KINDS = new Set<CheckinKind>(["binary", "count", "duration", "quantity", "custom"]);
const DRAFT_PRIORITIES = new Set<CheckinPriority>(["low", "medium", "high"]);
const DRAFT_TIME_SLOTS = new Set<CheckinTimeSlot>(["any", "morning", "afternoon", "evening"]);

/** 模板/智能体草案派生：以模板为底、允许安全字段覆写（name/icon/target/unit/group/note）。 */
export function draftFromTemplate(
    template: {name: string; icon: string; kind: CheckinKind; target: number; unit: string; schedule: CheckinSchedule; group: string; priority: CheckinPriority; timeSlot?: CheckinTimeSlot; note?: string},
    overrides: {name?: string; icon?: string; target?: number; unit?: string; group?: string; note?: string} = {},
): ProjectDraft {
    const base: ProjectDraft = {
        name: typeof overrides.name === "string" ? overrides.name : template.name,
        icon: typeof overrides.icon === "string" && overrides.icon.trim() ? overrides.icon : template.icon,
        kind: template.kind,
        target: Number.isFinite(overrides.target) && (overrides.target as number) > 0 ? Number(overrides.target) : template.target,
        unit: typeof overrides.unit === "string" && overrides.unit.trim() ? overrides.unit.trim() : template.unit,
        schedule: template.schedule,
        group: typeof overrides.group === "string" ? overrides.group : template.group,
        priority: template.priority,
        timeSlot: template.timeSlot || "any",
        note: typeof overrides.note === "string" ? overrides.note : template.note || "",
    };
    return normalizeProjectDraft(base) || {
        name: (base.name || template.name).slice(0, 40), icon: base.icon.slice(0, 8) || "✓", kind: base.kind,
        target: base.target > 0 ? base.target : 1, unit: base.unit.slice(0, 12) || "次",
        schedule: base.schedule, group: base.group.slice(0, 32), priority: base.priority,
        timeSlot: base.timeSlot, note: base.note.slice(0, 200),
    };
}

/** 草案校验：任一字段越界即整体拒绝（fail-closed），错误原因供预览层展示。 */
export function normalizeProjectDraft(value: unknown): ProjectDraft | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const source = value as Record<string, unknown>;
    const name = typeof source.name === "string" ? source.name.trim() : "";
    if (!name || name.length > 40) return undefined;
    const icon = typeof source.icon === "string" && source.icon.trim() ? source.icon.trim() : "✓";
    if (icon.length > 8) return undefined;
    if (typeof source.kind !== "string" || !DRAFT_KINDS.has(source.kind as CheckinKind)) return undefined;
    const target = Number(source.target);
    if (!Number.isFinite(target) || target <= 0 || target > 1e9) return undefined;
    const unit = typeof source.unit === "string" ? source.unit.trim() : "";
    if (!unit || unit.length > 12) return undefined;
    const schedule = normalizeSuggestionSchedule(source.schedule);
    if (!schedule) return undefined;
    const group = typeof source.group === "string" ? source.group.trim().slice(0, 32) : "";
    if (typeof source.priority !== "string" || !DRAFT_PRIORITIES.has(source.priority as CheckinPriority)) return undefined;
    const timeSlot = typeof source.timeSlot === "string" && DRAFT_TIME_SLOTS.has(source.timeSlot as CheckinTimeSlot) ? source.timeSlot as CheckinTimeSlot : "any";
    const note = typeof source.note === "string" ? source.note.trim().slice(0, 200) : "";
    return {
        name, icon: icon.slice(0, 8), kind: source.kind as CheckinKind,
        target: Math.min(1e9, Math.round(target * 1000) / 1000), unit,
        schedule, group, priority: source.priority as CheckinPriority, timeSlot, note,
    };
}

/** 草案摘要（预览对话框与审计用；不含任何用户隐私内容之外的文本）。 */
export function summarizeProjectDraft(draft: ProjectDraft): string {
    const targetText = draft.kind === "binary" ? "" : ` ${draft.target}${draft.unit}`;
    return `${draft.name} · ${draft.kind}${targetText} · ${draft.schedule.type}${draft.group ? ` · ${draft.group}` : ""}`;
}
