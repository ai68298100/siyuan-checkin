/* T-1384 思阅适配器 MVP（框架首个租户，D-258/D-260）——接入层纯核心。
   消费思阅公开生命周期事件 reader:open / reader:focus / reader:blur / reader:close
   （源码级证据，v2.2.8），在小驴侧以「阅读器有焦点的墙上时间」计时。
   纪律（docs/roadmap-cross-plugin-study-2026-09.md + 框架文档 §七）：
   - 只把事件当信号，读取自有时钟，不读思阅私有 reader_stats / daily.json；
   - 片段按 localDate 预切分（一段一日），分钟向下取整——宁少记不多记；
   - 重载即丢弃在飞焦点区间（fail-closed 少记），已写入当日身份由
     `sireader:<itemId>:<localDate>` externalRef 幂等兜底；
   - 纯逻辑无 IO：时间戳由调用方注入，localDate 换算与次日零点由调用方注入。 */

export type SireaderLifecycleType = "open" | "focus" | "blur" | "close";

export interface SireaderSegment {
    localDate: string;
    minutes: number;
}

export interface SireaderTrackerOptions {
    /** 毫秒时间戳 → 本地日期（YYYY-MM-DD），由宿主注入以保证确定性。 */
    toLocalDate: (ms: number) => string;
    /** 毫秒时间戳 → 当地次日零点，用于跨日切分。 */
    nextMidnight: (ms: number) => number;
}

/** 单项目会话内累计（分钟）。 */
export class SireaderFocusTracker {
    private focusStartedAt?: number;
    private readonly dayMinutes = new Map<string, number>();

    constructor(private readonly options: SireaderTrackerOptions) {}

    /** 焦点是否在飞（诊断/测试用）。 */
    get focusing(): boolean {
        return this.focusStartedAt !== undefined;
    }

    /** 已累计（未结算）的当日分钟数。 */
    dayTotal(localDate: string): number {
        return this.dayMinutes.get(localDate) || 0;
    }

    /**
     * 处理一条生命周期事件，返回因本次事件新完成的片段（分钟，已按日切分取整）。
     * 语义：open/focus 在空闲时开始计时；重复 focus 忽略；blur/close 结束计时；
     * 空闲时 blur/close 忽略；时间倒流忽略。
     */
    handle(type: SireaderLifecycleType, atMs: number): SireaderSegment[] {
        if (type === "focus" || type === "open") {
            if (this.focusStartedAt === undefined) this.focusStartedAt = atMs;
            return [];
        }
        const startedAt = this.focusStartedAt;
        if (startedAt === undefined) return [];
        this.focusStartedAt = undefined;
        if (!Number.isFinite(atMs) || !Number.isFinite(startedAt) || atMs <= startedAt) return [];
        return this.accumulate(startedAt, atMs);
    }

    /** 重载恢复策略：在飞区间直接丢弃（少记不多记）；已完成分钟保留给当前会话结算。 */
    discardInFlight(): void {
        this.focusStartedAt = undefined;
    }

    private accumulate(startedAt: number, endedAt: number): SireaderSegment[] {
        const totals = new Map<string, number>();
        let cursor = startedAt;
        while (cursor < endedAt) {
            const midnight = this.options.nextMidnight(cursor);
            const sliceEnd = Math.min(midnight, endedAt);
            const localDate = this.options.toLocalDate(cursor);
            totals.set(localDate, (totals.get(localDate) || 0) + (sliceEnd - cursor));
            cursor = sliceEnd;
        }
        const segments: SireaderSegment[] = [];
        for (const [localDate, ms] of totals) {
            const minutes = Math.floor(ms / 60_000);
            if (minutes <= 0) continue;
            this.dayMinutes.set(localDate, (this.dayMinutes.get(localDate) || 0) + minutes);
            segments.push({localDate, minutes});
        }
        return segments.sort((left, right) => left.localDate.localeCompare(right.localDate));
    }
}

/** 写入身份：`sireader:<itemId>:<localDate>`（每日一次，幂等键）。 */
export function buildSireaderExternalRef(itemId: string, localDate: string): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    return safeItem && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(localDate) ? `sireader:${safeItem}:${localDate}` : "";
}
