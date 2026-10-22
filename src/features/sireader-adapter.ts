/* T-1384 / T-1882 思阅适配器（D-258/D-260，v2.5.6 深度联动支持）——接入层纯核心。
   消费思阅公开生命周期事件 reader:open / reader:focus / reader:blur / reader:close / reader:mobile-open / reader:mobile-close
   在小驴侧以「阅读器有焦点的墙上时间」计时。
   纪律（docs/roadmap-cross-plugin-study-2026-09.md + 框架文档 §七）：
   - 只把事件当信号，读取自有时钟，不读思阅私有 reader_stats / daily.json；
   - 片段按 localDate 预切分（一段一日），分钟向下取整——宁少记不多记；
   - 重载即丢弃在飞焦点区间（fail-closed 少记），每段使用开始分钟与日期组成身份；
   - 支持移动端 mobile-open / mobile-close 事件，感知当前阅读书籍 URL 并提炼书名。 */

export type SireaderLifecycleType = "open" | "focus" | "blur" | "close" | "mobile-open" | "mobile-close";

export interface SireaderSegment {
    localDate: string;
    minutes: number;
    bookTitle?: string;
}

export function extractSireaderBookTitle(bookUrl?: string): string | undefined {
    if (!bookUrl || typeof bookUrl !== "string") return undefined;
    try {
        const clean = bookUrl.split("?")[0].split("#")[0];
        const segments = clean.split(/[/\\]/).filter(Boolean);
        const fileName = segments[segments.length - 1];
        if (!fileName) return undefined;
        const decoded = decodeURIComponent(fileName);
        const title = decoded.replace(/\.(epub|pdf|mobi|txt|azw3|fb2|cbz)$/i, "").trim();
        return title ? title.slice(0, 80) : undefined;
    } catch {
        return undefined;
    }
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
    private currentBookTitle?: string;
    private readonly dayMinutes = new Map<string, number>();

    constructor(private readonly options: SireaderTrackerOptions) {}

    /** 焦点是否在飞（诊断/测试用）。 */
    get focusing(): boolean {
        return this.focusStartedAt !== undefined;
    }

    get sessionStartedAt(): number | undefined {
        return this.focusStartedAt;
    }

    get activeBookTitle(): string | undefined {
        return this.currentBookTitle;
    }

    /** 已累计（未结算）的当日分钟数。 */
    dayTotal(localDate: string): number {
        return this.dayMinutes.get(localDate) || 0;
    }

    /**
     * 处理一条生命周期事件，返回因本次事件新完成的片段（分钟，已按日切分取整）。
     * 语义：open/focus/mobile-open 在空闲时开始计时；重复 focus 忽略；blur/close/mobile-close 结束计时；
     * 空闲时 blur/close 忽略；时间倒流忽略。
     */
    handle(type: SireaderLifecycleType, atMs: number, bookUrl?: string): SireaderSegment[] {
        const bookTitle = extractSireaderBookTitle(bookUrl);
        if (bookTitle) this.currentBookTitle = bookTitle;
        if (type === "focus" || type === "open" || type === "mobile-open") {
            if (this.focusStartedAt === undefined) this.focusStartedAt = atMs;
            return [];
        }
        const startedAt = this.focusStartedAt;
        const capturedBookTitle = this.currentBookTitle;
        if (startedAt === undefined) return [];
        this.focusStartedAt = undefined;
        this.currentBookTitle = undefined;
        if (!Number.isFinite(atMs) || !Number.isFinite(startedAt) || atMs <= startedAt) return [];
        return this.accumulate(startedAt, atMs, capturedBookTitle);
    }

    /** 重载恢复策略：在飞区间直接丢弃（少记不多记）；已完成分钟保留给当前会话结算。 */
    discardInFlight(): void {
        this.focusStartedAt = undefined;
        this.currentBookTitle = undefined;
    }

    private accumulate(startedAt: number, endedAt: number, bookTitle?: string): SireaderSegment[] {
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
            segments.push({localDate, minutes, ...(bookTitle ? {bookTitle} : {})});
        }
        return segments.sort((left, right) => left.localDate.localeCompare(right.localDate));
    }
}

/** Exact start time keeps distinct sessions within the same minute independent. */
export function buildSireaderExternalRef(itemId: string, localDate: string, startedAtMs?: number): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    if (!safeItem || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(localDate)) return "";
    if (startedAtMs === undefined) return `sireader:${safeItem}:${localDate}`; // Legacy daily identity.
    return Number.isSafeInteger(startedAtMs) && startedAtMs > 0 ? `sireader:${safeItem}:${startedAtMs}:${localDate}` : "";
}
