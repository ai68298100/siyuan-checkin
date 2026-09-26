/* T-1487 新建打卡智能默认：按名称联想的纯函数面（benchmark 二十一·C 路，D-280）。
   纪律：
   - 推断永不静默覆盖：本模块只产出「建议」，由编辑器以非阻断行呈现，用户点击「应用」后才填表；
     字段应用后仍可随意修改——「不覆盖显式选择」由点击门控天然保证。
   - fail-closed：低置信度信号（无法定位单位/数值/排期）一律不产出对应建议；
     名称与目录锚点都不匹配且无关键词信号时返回 undefined（不猜）。
   - 目录锚点是 zh 原名；同时接受调用方注入的显示名对照（en 用户输入英文也能命中内置模板）。
   本模块零依赖、无时钟、确定性输出。 */

import type {CheckinKind, CheckinTimeSlot, ScheduleType} from "../types";

/** 目录条目对照（宿主从 catalog + i18n 投影；anchor 为 zh 原名，display 为当前语言显示名）。 */
export interface NameInferenceCatalogEntry {
    anchor: string;
    display: string;
}

export interface NameFieldInference {
    kind?: CheckinKind;
    unit?: string;
    target?: number;
    timeSlot?: CheckinTimeSlot;
    schedule?: {type: ScheduleType; weekdays?: number[]};
}

export interface NameInferenceSuggestion {
    /** 命中内置模板（按 zh 锚点或显示名精确匹配）→ 建议整卡套用。 */
    templateAnchor?: string;
    /** 关键词推断的字段建议（仅在无模板命中时给出）。 */
    fields?: NameFieldInference;
}

const KIND_UNITS: ReadonlyArray<readonly [CheckinKind, string]> = [
    ["duration", "分钟"],
    ["duration", "小时"],
    ["quantity", "毫升"],
    ["quantity", "千克"],
    ["quantity", "公斤"],
    ["quantity", "公里"],
    ["quantity", "克"],
    ["quantity", "升"],
    ["quantity", "步"],
    ["quantity", "页"],
    ["quantity", "元"],
    ["count", "次"],
    ["count", "个"],
    ["count", "组"],
    ["count", "回"],
    ["count", "项"],
];

/** 数值+单位相邻模式：只认「数值紧邻单位」，避免长句误配。 */
const NUMBER_UNIT_PATTERN = /([0-9]+(?:\.[0-9]+)?)\s*(分钟|小时|毫升|千克|公斤|公里|克|升|步|页|元|次|个|组|回|项)/;

const WEEKDAY_CHARS: Readonly<Record<string, number>> = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 0, "天": 0};

/** 单位停用词：名称含停用词时该单位信号不可信（如「跑步」并非「步数」单位意图）。 */
const UNIT_STOP_WORDS: Readonly<Record<string, readonly string[]>> = {"步": ["跑步"]};

const unitUsable = (unit: string, name: string): boolean => !(UNIT_STOP_WORDS[unit] || []).some((stopWord) => name.includes(stopWord));

const unitToKind = (unit: string): CheckinKind | undefined => KIND_UNITS.find(([, candidate]) => candidate === unit)?.[0];
const normalizeNumber = (value: string): number => Math.round(Number(value) * 100) / 100;

/** 关键词推断：单位/数值/时段/排期各自独立检出，检出不了的字段不进结果。 */
export function inferFieldsFromName(rawName: unknown): NameFieldInference | undefined {
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name || name.length > 60) return undefined;
    const fields: NameFieldInference = {};
    const numberUnit = name.match(NUMBER_UNIT_PATTERN);
    if (numberUnit) {
        const unit = numberUnit[2] === "公斤" ? "千克" : numberUnit[2];
        const kind = unitToKind(unit);
        const target = normalizeNumber(numberUnit[1]);
        if (kind && target > 0 && unitUsable(unit, name)) {
            fields.kind = kind;
            fields.unit = unit;
            fields.target = target;
        }
    } else {
        /* 无数值时按单位词推断类型+单位（不含数量目标）。 */
        for (const [, unit] of KIND_UNITS) {
            if (!name.includes(unit) || !unitUsable(unit, name)) continue;
            const kind = unitToKind(unit);
            if (kind) {
                fields.kind = kind;
                fields.unit = unit;
            }
            break;
        }
    }
    if (/[早晨]/.test(name)) fields.timeSlot = "morning";
    else if (/午/.test(name)) fields.timeSlot = "afternoon";
    else if (/[晚夜]/.test(name)) fields.timeSlot = "evening";
    if (/每天|每日|天天/.test(name)) fields.schedule = {type: "daily"};
    else if (/工作日/.test(name)) fields.schedule = {type: "workdays"};
    else if (/周末/.test(name)) fields.schedule = {type: "weekly", weekdays: [0, 6]};
    else {
        /* 「每周一三五 / 周二、周四」式列举：周后可连续列举多字，逐字收集去重，升序输出。 */
        const weekdays = new Set<number>();
        for (const match of name.matchAll(/周([一二三四五六日天]+)/g)) {
            for (const char of match[1]) weekdays.add(WEEKDAY_CHARS[char]);
        }
        if (weekdays.size >= 1) fields.schedule = {type: "weekly", weekdays: [...weekdays].sort((left, right) => left - right)};
    }
    return Object.keys(fields).length ? fields : undefined;
}

/** 名称联想：先按目录精确匹配（zh 锚点或注入的显示名，trim 后全等）；
    未命中目录时给出关键词字段建议；两者皆无返回 undefined。 */
export function buildNameInference(rawName: unknown, catalog: readonly NameInferenceCatalogEntry[]): NameInferenceSuggestion | undefined {
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name || name.length > 60) return undefined;
    const lowered = name.toLocaleLowerCase();
    const hit = catalog.find((entry) => entry.anchor === name || (typeof entry.display === "string" && entry.display.trim().toLocaleLowerCase() === lowered));
    if (hit) return {templateAnchor: hit.anchor};
    const fields = inferFieldsFromName(name);
    return fields ? {fields} : undefined;
}
