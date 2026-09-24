/* T-1433 · R-A3/R-20.2 情境化记录——自由文本备注的词表归一化与聚合（纯函数面）。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-20.2）：
   - 上下文只从既有事件备注（跳过原因/打卡备注）中「读出」词元，不新增事件字段、
     不修改 Store v3、不影响完成判定与连击（只读投影）；
   - 词表有限且可扩展（v1 冻结六类：阻力/时间不足/环境变化/身体状态/情绪波动/其他），
     中英关键词匹配，未命中归入 other；
   - 聚合带样本不足守卫（< CONTEXT_MIN_SAMPLE 提示仅供参考），防止把小样本当结论；
   - 零依赖、无时钟、确定性（同输入同输出，词元按数量降序+词表序稳定排序）。 */

export type ContextToken = "resistance" | "time" | "environment" | "health" | "mood" | "other";

/** v1 词表：中英关键词小写匹配；命中任一关键词即计入该词元。 */
export const CONTEXT_TOKEN_KEYWORDS: Readonly<Record<Exclude<ContextToken, "other">, readonly string[]>> = Object.freeze({
    resistance: Object.freeze(["阻力", "不想", "拖延", "懒", "抗拒", "resistance", "procrastinat", "lazy", "avoid"]),
    time: Object.freeze(["时间不足", "没时间", "太忙", "来不及", "加班", "no time", "busy", "overtime"]),
    environment: Object.freeze(["环境", "天气", "下雨", "出差", "旅行", "停电", "weather", "rain", "travel", "trip"]),
    health: Object.freeze(["生病", "不舒服", "感冒", "发烧", "受伤", "累", "失眠", "sick", "ill", "injur", "tired", "insomnia", "headache"]),
    mood: Object.freeze(["心情", "情绪", "烦躁", "焦虑", "压力大", "低落", "mood", "stress", "anxious", "anxiou", "down"]),
});

export const CONTEXT_MIN_SAMPLE = 3;

/** 从单条备注提取词元（小写包含匹配，中英文关键词）；无命中返回空数组——
    是否归入 other 由聚合层决定。非字符串/空文本返回空数组。 */
export function classifyContextTokens(note: string): readonly Exclude<ContextToken, "other">[] {
    if (typeof note !== "string") return [];
    const lowered = note.toLowerCase();
    const hits: Exclude<ContextToken, "other">[] = [];
    for (const [token, keywords] of Object.entries(CONTEXT_TOKEN_KEYWORDS)) {
        if (keywords.some((keyword) => lowered.includes(keyword))) hits.push(token as Exclude<ContextToken, "other">);
    }
    return hits;
}

export interface ContextAggregationInput {
    /** 事件切片：调用方从既有事件中筛选（如区间内的跳过事件）。 */
    note?: string;
    localDate?: string;
}

export interface ContextTokenCount {
    token: ContextToken;
    count: number;
}

export interface ContextAggregation {
    /** 有非空备注的切片数。 */
    totalNotes: number;
    /** 命中词表的切片数（totalNotes − other）。 */
    classifiedCount: number;
    tokens: readonly ContextTokenCount[];
    firstDate?: string;
    lastDate?: string;
    /** totalNotes ≥ CONTEXT_MIN_SAMPLE 时为 true；不足时展示层必须提示仅供参考。 */
    sufficient: boolean;
}

/** 聚合跳过原因/备注词元：按数量降序、同数按词表序；未命中词表的备注计入 other。 */
export function aggregateSkipContext(slices: readonly ContextAggregationInput[]): ContextAggregation {
    const counts = new Map<ContextToken, number>();
    let totalNotes = 0;
    let classifiedCount = 0;
    let firstDate: string | undefined;
    let lastDate: string | undefined;
    for (const slice of slices) {
        const note = typeof slice.note === "string" ? slice.note.trim() : "";
        if (!note) continue;
        totalNotes += 1;
        if (slice.localDate) {
            if (firstDate === undefined || slice.localDate < firstDate) firstDate = slice.localDate;
            if (lastDate === undefined || slice.localDate > lastDate) lastDate = slice.localDate;
        }
        const hits = classifyContextTokens(note);
        if (!hits.length) {
            counts.set("other", (counts.get("other") || 0) + 1);
            continue;
        }
        classifiedCount += 1;
        for (const token of hits) counts.set(token, (counts.get(token) || 0) + 1);
    }
    const order: ContextToken[] = ["resistance", "time", "environment", "health", "mood", "other"];
    const tokens = [...counts.entries()]
        .map(([token, count]) => ({token, count}))
        .sort((left, right) => right.count - left.count || order.indexOf(left.token) - order.indexOf(right.token));
    return {
        totalNotes,
        classifiedCount,
        tokens,
        ...(firstDate !== undefined ? {firstDate} : {}),
        ...(lastDate !== undefined ? {lastDate} : {}),
        sufficient: totalNotes >= CONTEXT_MIN_SAMPLE,
    };
}

/* —— T-1452 · R-20.2 情境标签×星期交叉（第五轮生态调研采纳，源：Daylio/Pinch 情境统计；
   第三轮延后项触发条件「R-A3 context normalization 交付」已满足）——
   回答「这个原因常发生在哪天」：只对总命中 ≥ CONTEXT_MIN_SAMPLE 且存在过半集中
   （最高星期次数 > 总数一半且 ≥2）的词元给出模式；平局取较小星期，确定性输出。 */

export interface ContextWeekdayPattern {
    token: Exclude<ContextToken, "other">;
    /** 最集中的星期（0=周日…6=周六）。 */
    weekday: number;
    /** 该星期上的命中次数。 */
    count: number;
    /** 该词元总命中次数。 */
    total: number;
}

/** 情境词元×星期交叉统计：从既有切片读出词元与星期，零依赖、无时钟、确定性。
    与 aggregateSkipContext 同源输入；星期推导与 pace-projection 同公式（UTC 口径）。 */
export function crossTabulateContextWeekdays(slices: readonly ContextAggregationInput[]): readonly ContextWeekdayPattern[] {
    const perToken = new Map<Exclude<ContextToken, "other">, Map<number, number>>();
    for (const slice of slices) {
        const note = typeof slice.note === "string" ? slice.note.trim() : "";
        if (!note || typeof slice.localDate !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(slice.localDate)) continue;
        const hits = classifyContextTokens(note);
        if (!hits.length) continue;
        const weekday = new Date(slice.localDate + "T00:00:00Z").getUTCDay();
        for (const token of hits) {
            const bucket = perToken.get(token) || new Map<number, number>();
            bucket.set(weekday, (bucket.get(weekday) || 0) + 1);
            perToken.set(token, bucket);
        }
    }
    const patterns: ContextWeekdayPattern[] = [];
    for (const [token, bucket] of perToken) {
        const total = [...bucket.values()].reduce((sum, count) => sum + count, 0);
        if (total < CONTEXT_MIN_SAMPLE) continue;
        const entries = [...bucket.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0]);
        const [weekday, count] = entries[0];
        /* 过半集中才构成「模式」，否则只是均匀分布的噪声。 */
        if (count > total / 2 && count >= 2) patterns.push({token, weekday, count, total});
    }
    return patterns.sort((left, right) => right.total - left.total
        || left.token.localeCompare(right.token)
        || left.weekday - right.weekday);
}
