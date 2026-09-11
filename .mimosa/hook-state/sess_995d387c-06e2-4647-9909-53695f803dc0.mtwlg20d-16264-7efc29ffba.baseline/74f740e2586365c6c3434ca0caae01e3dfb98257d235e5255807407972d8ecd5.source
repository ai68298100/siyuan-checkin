import type {CheckinKind, ScheduleType} from "./types";

export interface EditorValidationInput {
    name: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: ScheduleType;
    weekdays: readonly number[];
    quotaAmount?: number;
}

export interface EditorValidationResult {
    valid: boolean;
    errors: Partial<Record<"name" | "target" | "unit" | "schedule", string>>;
}

export function validateEditorInput(input: EditorValidationInput): EditorValidationResult {
    const errors: EditorValidationResult["errors"] = {};
    if (!input.name.trim()) errors.name = "请输入名称";
    if (input.kind !== "binary" && (!Number.isFinite(input.target) || input.target <= 0)) errors.target = "目标必须是大于 0 的数字";
    if (input.kind !== "binary" && !input.unit.trim()) errors.unit = "请输入单位";
    if ((input.schedule === "weekly" || input.schedule === "custom") && input.weekdays.length === 0) errors.schedule = "请选择至少一天";
    if (input.schedule === "quota" && (!Number.isFinite(input.quotaAmount) || (input.quotaAmount || 0) <= 0)) errors.schedule = "请输入大于 0 的周期配额";
    return {valid: Object.keys(errors).length === 0, errors};
}
