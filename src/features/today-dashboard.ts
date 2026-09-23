/* T-1420 · R-A2 今日行动台——纯投影编排层（R-10.3）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-10.3/R-A2）：
   - 完成、排期、SKIP、quota、at-most 的事实判断全部委托 src/model.ts，由调用方
     （render/today 视图）算好切片传入；本模块只负责编排、状态归并、排序与截断，
     不在投影层重新实现任何排期或完成语义；
   - 只读输入、确定性输出：同一输入两次构建得到深度相等的结构；排序含稳定
     平局裁决（名称 zh-CN → itemId），不读取时钟、不触碰宿主；
   - 依赖缺失降级：专注提供方缺失时输出 reasonCode 降级提示，不产生不可用动作；
   - 优先提醒（attention）只计数不复制条目——条目呈现仍归 renderPriorityReminderView
     单一路径，避免同一事实两处渲染；
   - 消费方：render/fragments 的今日行动台摘要条（只读 console，记录仍走原卡片
     路径，撤销/失败回滚不受影响）。 */

export type TodayItemState = "breach" | "actionable" | "skipped" | "done";
export type TodayReasonCode =
    | "at-most-breach"
    | "at-most-clean"
    | "quota-behind"
    | "quota-met"
    | "skipped-today"
    | "due-today"
    | "completed-today"
    | "focus-active"
    | "focus-idle"
    | "focus-unavailable";

/** 调用方经 model.ts 事实函数算好的单项目切片（本模块不解释这些事实）。 */
export interface TodayDashboardItemFact {
    itemId: string;
    name: string;
    icon: string;
    group?: string;
    completed: boolean;
    skippedToday: boolean;
    progress: number;
    target: number;
    unit: string;
    /** quota 项目的事实面：contributed/amount 为周期口径（调用方经 evaluateQuotaSchedule 取得）。 */
    quota?: {contributed: number; amount: number};
    /** at-most（戒除类）项目当日是否已破戒。 */
    atMost?: {breached: boolean};
    streak?: number;
    /** 最近漏卡日（YYYY-MM-DD；可由 findLastMissedDate 提供）。 */
    missedDate?: string;
}

export interface TodayAttentionEntry {
    id: string;
    title: string;
    /** "overdue" | "today"（与 reminders 的优先状态一致）。 */
    severity: "overdue" | "today";
    daysUntil: number;
}

export interface TodayDashboardInput {
    today: string;
    items: readonly TodayDashboardItemFact[];
    attention: readonly TodayAttentionEntry[];
    /** 专注提供方可用性与运行状态；缺失即降级（reasonCode: focus-unavailable）。 */
    focus: {available: boolean; active?: boolean};
    /** 每段最多呈现的条目数；超出截断并置 truncated。 */
    limits?: {maxPerSection?: number};
}

export interface TodayDashboardItem {
    fact: TodayDashboardItemFact;
    state: TodayItemState;
    reasonCode: TodayReasonCode;
    missedDate?: string;
}

export interface TodayDashboardSection {
    id: "now" | "deferred" | "done";
    items: readonly TodayDashboardItem[];
    /** 截断前的真实数量。 */
    total: number;
    truncated: boolean;
}

export interface TodayDashboardTotals {
    scheduled: number;
    done: number;
    skipped: number;
    breached: number;
    pending: number;
    completionRate: number;
}

export interface TodayDashboardAction {
    type: "record" | "review";
    itemId?: string;
    reasonCode?: TodayReasonCode;
}

export interface TodayDashboard {
    today: string;
    /** 固定顺序：now（含破戒置顶）→ deferred（跳过）→ done。 */
    sections: readonly [TodayDashboardSection, TodayDashboardSection, TodayDashboardSection];
    totals: TodayDashboardTotals;
    /** 首屏推荐动作：首个可行动项；全部完成时指向回顾；空日程时为 undefined。 */
    nextAction?: TodayDashboardAction;
    focus: {available: boolean; active?: boolean; reasonCode: TodayReasonCode};
    attentionCount: number;
    truncated: boolean;
}

const DEFAULT_MAX_PER_SECTION = 50;

const STATE_RANK: Record<TodayItemState, number> = {breach: 0, actionable: 1, skipped: 2, done: 3};

function resolveState(fact: TodayDashboardItemFact): {state: TodayItemState; reasonCode: TodayReasonCode} {
    if (fact.atMost?.breached) return {state: "breach", reasonCode: "at-most-breach"};
    if (fact.skippedToday) return {state: "skipped", reasonCode: "skipped-today"};
    if (fact.completed) {
        return fact.quota ? {state: "done", reasonCode: "quota-met"} : {state: "done", reasonCode: "completed-today"};
    }
    if (fact.atMost) return {state: "actionable", reasonCode: "at-most-clean"};
    if (fact.quota) return {state: "actionable", reasonCode: "quota-behind"};
    return {state: "actionable", reasonCode: "due-today"};
}

function compareItems(left: TodayDashboardItem, right: TodayDashboardItem): number {
    return STATE_RANK[left.state] - STATE_RANK[right.state]
        || left.fact.name.localeCompare(right.fact.name, "zh-CN")
        || left.fact.itemId.localeCompare(right.fact.itemId);
}

function buildSection(id: TodayDashboardSection["id"], items: readonly TodayDashboardItem[], maxPerSection: number): TodayDashboardSection {
    const total = items.length;
    return {id, items: items.slice(0, maxPerSection), total, truncated: total > maxPerSection};
}

/** 构建今日行动台投影。确定性：输出只由输入决定。 */
export function buildTodayDashboard(input: TodayDashboardInput): TodayDashboard {
    const maxPerSection = Math.max(1, Math.min(200, input.limits?.maxPerSection ?? DEFAULT_MAX_PER_SECTION));
    const projected = input.items.map((fact): TodayDashboardItem => {
        const {state, reasonCode} = resolveState(fact);
        return {fact, state, reasonCode, ...(fact.missedDate ? {missedDate: fact.missedDate} : {})};
    });
    projected.sort(compareItems);

    const breach = projected.filter((item) => item.state === "breach");
    const actionable = projected.filter((item) => item.state === "actionable");
    const skipped = projected.filter((item) => item.state === "skipped");
    const done = projected.filter((item) => item.state === "done");

    const sections = [
        buildSection("now", [...breach, ...actionable], maxPerSection),
        buildSection("deferred", skipped, maxPerSection),
        buildSection("done", done, maxPerSection),
    ] as const;

    const scheduled = input.items.length;
    const totals: TodayDashboardTotals = {
        scheduled,
        done: done.length,
        skipped: skipped.length,
        breached: breach.length,
        pending: actionable.length,
        completionRate: scheduled ? Math.round((done.length / scheduled) * 100) : 0,
    };

    const firstActionable = breach[0] ?? actionable[0];
    const nextAction: TodayDashboardAction | undefined = firstActionable
        ? {type: "record", itemId: firstActionable.fact.itemId, reasonCode: firstActionable.reasonCode}
        : scheduled
            ? {type: "review", reasonCode: "completed-today"}
            : undefined;

    return {
        today: input.today,
        sections,
        totals,
        nextAction,
        focus: {
            available: input.focus.available,
            ...(input.focus.active !== undefined ? {active: input.focus.active} : {}),
            reasonCode: input.focus.available ? (input.focus.active ? "focus-active" : "focus-idle") : "focus-unavailable",
        },
        attentionCount: input.attention.length,
        truncated: sections.some((section) => section.truncated),
    };
}
