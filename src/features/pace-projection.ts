/* T-1415/T-1426 · R-A3 节奏与恢复投影——普通排期/quota/at-most 三套口径的纯函数面。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-20.1/R-A3、TODO T-1415）：
   - 指标定义（v1 冻结）：
     · 普通 at-least：backlogRate = 未完成的已到期有效排期机会 / 已到期有效排期机会；
       SKIP 日不算机会也不算失败；证据日期（漏掉的排期日）随结果回放；
     · quota：只输出周期贡献/目标/进度，不与普通逾期率混淆；
     · at-most：无破戒天数（现有连续无破戒口径）+ 破戒日历史 + 戒断里程碑阶梯
       （1/3/7/14/30/60/90/180/365），输出最近达成级与下一级；
   - 三套口径互相独立，绝不把 quota/at-most 塞进普通逾期率；
   - 全部事实切片由调用方经 model.ts 单一实现算好传入，本模块不解释排期与完成；
   - 零依赖、无时钟、确定性（日期升序去重、稳定 reasonCode）；
   - 第一版只读（今日卡片里程碑标签消费）；洞察/API 同口径接入随后批次。 */

export const ABSTINENCE_MILESTONE_LADDER: readonly number[] = [1, 3, 7, 14, 30, 60, 90, 180, 365];

/** backlogRate ≥ 50% 判定为积压（阈值常量，口径冻结于此）。 */
export const BACKLOG_WARN_RATIO = 0.5;

/* —— 普通 at-least：backlogRate —— */

export interface AtLeastPaceFacts {
    /** 已到期有效排期日（升序；未来日不在内）。 */
    scheduledDates: readonly string[];
    /** 实际完成日（升序）。 */
    completedDates: readonly string[];
    /** SKIP 日（既不算机会也不算失败）。 */
    skippedDates: readonly string[];
}

export interface AtLeastPaceProjection {
    kind: "at-least";
    dueOpportunities: number;
    doneOpportunities: number;
    /** 0–100：未完成机会占比；无机会时为 0。 */
    backlogRate: number;
    /** 证据：已到期且未完成的有效排期日（升序）。 */
    missedDates: readonly string[];
    reasonCode: "no-opportunities" | "on-track" | "backlog";
}

function normalizeDateList(dates: readonly string[]): string[] {
    return [...new Set(dates)].sort((left, right) => left.localeCompare(right));
}

export function projectAtLeastPace(facts: AtLeastPaceFacts): AtLeastPaceProjection {
    const skipped = new Set(facts.skippedDates);
    const due = normalizeDateList(facts.scheduledDates).filter((date) => !skipped.has(date));
    const completed = new Set(facts.completedDates);
    const missed = due.filter((date) => !completed.has(date));
    const doneOpportunities = due.length - missed.length;
    const backlogRate = due.length ? Math.round((missed.length / due.length) * 100) : 0;
    return {
        kind: "at-least",
        dueOpportunities: due.length,
        doneOpportunities,
        backlogRate,
        missedDates: missed,
        reasonCode: due.length === 0 ? "no-opportunities" : backlogRate >= BACKLOG_WARN_RATIO * 100 ? "backlog" : "on-track",
    };
}

/* —— quota：周期贡献/目标/进度（独立口径） —— */

export interface QuotaPaceFacts {
    contributed: number;
    amount: number;
}

export interface QuotaPaceProjection {
    kind: "quota";
    contributed: number;
    amount: number;
    /** 0–100。 */
    rate: number;
    reasonCode: "quota-met" | "quota-behind";
}

export function projectQuotaPace(facts: QuotaPaceFacts): QuotaPaceProjection {
    const rate = facts.amount > 0 ? Math.min(100, Math.round((facts.contributed / facts.amount) * 100)) : 0;
    return {
        kind: "quota",
        contributed: facts.contributed,
        amount: facts.amount,
        rate,
        reasonCode: facts.amount > 0 && facts.contributed >= facts.amount ? "quota-met" : "quota-behind",
    };
}

/* —— at-most：戒断天数 + 破戒历史 + 里程碑（T-1415） —— */

export interface AbstinenceMilestones {
    cleanDays: number;
    /** 已达成的最高阶梯（0 = 尚未达成任何一级）。 */
    achieved: number;
    /** 下一阶梯；登顶（≥365）后为 undefined。 */
    next?: number;
    /** 通往下一阶梯的进度 0–100；登顶为 100。 */
    progressPct: number;
}

export function abstinenceMilestones(cleanDays: number): AbstinenceMilestones {
    const days = Number.isFinite(cleanDays) && cleanDays > 0 ? Math.floor(cleanDays) : 0;
    let achieved = 0;
    let next: number | undefined;
    for (const step of ABSTINENCE_MILESTONE_LADDER) {
        if (days >= step) achieved = step;
        else {
            next = step;
            break;
        }
    }
    const progressPct = next === undefined ? 100 : Math.floor((days / next) * 100);
    return {cleanDays: days, achieved, ...(next !== undefined ? {next} : {}), progressPct};
}

export interface AtMostPaceFacts {
    /** 当前连续无破戒天数（现有连续无破戒口径，含容错/SKIP 语义由 model 决定）。 */
    cleanDays: number;
    /** 破戒日历史（可乱序，输出升序去重）。 */
    breachDates: readonly string[];
}

export interface AtMostPaceProjection {
    kind: "at-most";
    cleanDays: number;
    recovery: "in-recovery" | "lapsed";
    breaches: readonly string[];
    milestones: AbstinenceMilestones;
    reasonCode: "at-most-clean" | "at-most-breach";
}

export function projectAtMostPace(facts: AtMostPaceFacts): AtMostPaceProjection {
    const cleanDays = Number.isFinite(facts.cleanDays) && facts.cleanDays > 0 ? Math.floor(facts.cleanDays) : 0;
    const breaches = normalizeDateList(facts.breachDates);
    return {
        kind: "at-most",
        cleanDays,
        recovery: cleanDays > 0 ? "in-recovery" : "lapsed",
        breaches,
        milestones: abstinenceMilestones(cleanDays),
        reasonCode: cleanDays > 0 ? "at-most-clean" : "at-most-breach",
    };
}

/* —— 跨项目失速排名（R-20.3 第一张行动卡）：调用方枚举每项目的事实切片，本模块只排序截断 —— */

export interface StalledItemFacts {
    itemId: string;
    name: string;
    /** 观察窗口内的已到期有效排期机会数。 */
    dueOpportunities: number;
    /** 其中漏掉的机会数（0 = 未失速，不进入排名）。 */
    missedCount: number;
    /** 最近一次漏掉的日期（YYYY-MM-DD，可缺省）。 */
    lastMissedDate?: string;
}

export interface StalledItemRank {
    itemId: string;
    name: string;
    dueOpportunities: number;
    missedCount: number;
    backlogRate: number;
    lastMissedDate?: string;
}

/** 失速排名：只收漏掉 ≥1 次的项目，按漏掉次数降序、名称 zh-CN → itemId 稳定平局，
    截断前 limit 个。 */
export function rankStalledItems(items: readonly StalledItemFacts[], limit = 5): readonly StalledItemRank[] {
    const cappedLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    return items
        .filter((item) => item.missedCount > 0)
        .map((item) => {
            const due = Math.max(0, item.dueOpportunities);
            const backlogRate = due ? Math.round((item.missedCount / due) * 100) : 0;
            return {
                itemId: item.itemId,
                name: item.name,
                dueOpportunities: due,
                missedCount: item.missedCount,
                backlogRate,
                ...(item.lastMissedDate ? {lastMissedDate: item.lastMissedDate} : {}),
            };
        })
        .sort((left, right) => right.missedCount - left.missedCount
            || left.name.localeCompare(right.name, "zh-CN")
            || left.itemId.localeCompare(right.itemId))
        .slice(0, cappedLimit);
}

/* —— 判别入口：调用方按项目口径选择，三套投影互不污染 —— */

export type PaceProjection = AtLeastPaceProjection | QuotaPaceProjection | AtMostPaceProjection;

export type PaceFacts =
    | ({kind: "at-least"} & AtLeastPaceFacts)
    | ({kind: "quota"} & QuotaPaceFacts)
    | ({kind: "at-most"} & AtMostPaceFacts);

export function projectPace(facts: PaceFacts): PaceProjection {
    switch (facts.kind) {
        case "at-least": {
            const {kind, ...rest} = facts;
            return projectAtLeastPace(rest);
        }
        case "quota": {
            const {kind, ...rest} = facts;
            return projectQuotaPace(rest);
        }
        case "at-most": {
            const {kind, ...rest} = facts;
            return projectAtMostPace(rest);
        }
    }
}
