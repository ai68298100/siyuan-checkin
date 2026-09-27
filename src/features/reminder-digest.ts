/* T-1495 事项提醒降噪聚合——摘要纯函数面（零运行时依赖、无时钟、确定性）。
   纪律：
   - 提醒疲劳研究（benchmark 第二十一节 A 路，证据 B）：特异性+聚合显著影响依从性——
     同日多事件聚合为单条摘要（计数+代表项目名），替代逐项轰炸；
   - 今日页事项横幅（renderOccasionBannerView）已聚合的当日事项不在推送与优先卡
     中重复弹出（isBannerCoveredReminder 单一判定，两个消费方共用）；
   - 全部函数显式接收条目与 today，不读取隐式时钟；非法输入 fail-closed 返回空；
   - 只消费 import type（转译后零运行时依赖），避免加重 reminders 固定模块集。 */

import type {ReminderEntry} from "../reminders";

/** 摘要分段：计数 + 至多 maxNames 个代表项目名 + 溢出计数。 */
export interface ReminderDigestSegment {
    count: number;
    names: string[];
    overflow: number;
}

export interface ReminderDigest {
    /** 今日待完成（dueDate === today）；无则缺省。 */
    today?: ReminderDigestSegment;
    /** 已逾期（dueDate < today，跨日合并为一段，按发生日降序取代表名）。 */
    overdue?: ReminderDigestSegment;
    total: number;
}

export interface ReminderDigestOptions {
    /** 本地日期键（YYYY-MM-DD）；非法则整体 fail-closed 返回空摘要。 */
    today: string;
    /** 每段最多呈现的代表项目名；缺省 3，钳制 1~8。 */
    maxNames?: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_MAX_NAMES = 3;

function clampMaxNames(value: number | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_MAX_NAMES;
    return Math.max(1, Math.min(8, Math.floor(value)));
}

function buildSegment(count: number, titles: readonly string[], maxNames: number): ReminderDigestSegment {
    const names = titles.slice(0, maxNames);
    return {count, names, overflow: count - names.length};
}

/** 同日多事件聚合为单条摘要：今日一段、逾期合并一段（跨日）。 */
export function buildReminderDigest(entries: readonly ReminderEntry[], options: ReminderDigestOptions): ReminderDigest {
    if (!DATE_PATTERN.test(options.today)) return {total: 0};
    const today = options.today;
    const maxNames = clampMaxNames(options.maxNames);
    const todayTitles: string[] = [];
    const overdue: Array<{dueDate: string; title: string}> = [];
    for (const entry of entries) {
        if (!entry || (entry.status !== "today" && entry.status !== "overdue")) continue;
        if (entry.dueDate === today) todayTitles.push(entry.title);
        else if (entry.dueDate < today) overdue.push({dueDate: entry.dueDate, title: entry.title});
    }
    /* 逾期段代表名按发生日降序（距今最近的先出现）再到录入序，稳定可回放。 */
    overdue.sort((left, right) => right.dueDate.localeCompare(left.dueDate));
    const total = todayTitles.length + overdue.length;
    return {
        total,
        ...(todayTitles.length ? {today: buildSegment(todayTitles.length, todayTitles, maxNames)} : {}),
        ...(overdue.length ? {overdue: buildSegment(overdue.length, overdue.map((entry) => entry.title), maxNames)} : {}),
    };
}

/** 今日页事项横幅已聚合的当日事项：source=occasion 且 status=today 且发生在今天。
    推送摘要与今日页优先卡共用此判定，保证「横幅已聚合则不重复弹」口径一致。 */
export function isBannerCoveredReminder(entry: ReminderEntry, today: string): boolean {
    return entry.source === "occasion" && entry.status === "today" && entry.dueDate === today;
}
