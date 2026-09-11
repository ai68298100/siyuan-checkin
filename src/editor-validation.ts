import type {CheckinKind, ScheduleType} from "./types";
import {t} from "./i18n";

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
    if (!input.name.trim()) errors.name = t("val.name");
    if (input.kind !== "binary" && (!Number.isFinite(input.target) || input.target <= 0)) errors.target = t("val.target");
    if (input.kind !== "binary" && !input.unit.trim()) errors.unit = t("val.unit");
    if ((input.schedule === "weekly" || input.schedule === "custom") && input.weekdays.length === 0) errors.schedule = t("val.scheduleWeekdays");
    if (input.schedule === "quota" && (!Number.isFinite(input.quotaAmount) || (input.quotaAmount || 0) <= 0)) errors.schedule = t("val.quotaAmount");
    return {valid: Object.keys(errors).length === 0, errors};
}
