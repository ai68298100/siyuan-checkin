/* T-1385 思播适配器（实验/仅观察起步，D-260 同构扩展）——接入层纯核心。
   实验路径纪律（docs/roadmap-cross-plugin-study-2026-09.md + D-255/D-263）：
   - 只轮询 `controller.isPlaying()` 判定播放态，累计「播放器在播的墙上时间」；
     绝不用 currentTime 差值估计观看量（seek/循环/变速会污染）；
   - 采样间隔有界（默认 15s）；相邻采样间隔超过 3 倍周期视为断档，该段时间丢弃
     （页面休眠/后台不可信，宁少记不多记）；
   - 切集（媒体键变化）即断段；跨午夜按 localDate 预切分；分钟向下取整；
   - 重载丢弃在飞状态；已写入当日由 `siplayer:<itemId>:<localDate>` externalRef 幂等兜底；
   - 纯逻辑无 IO：时间戳与日期换算由调用方注入，可离线回放测试。 */

export type SiplayerSampleState = "playing" | "paused" | "absent";

export interface SiplayerSegment {
    localDate: string;
    minutes: number;
}

export interface SiplayerTrackerOptions {
    /** 毫秒时间戳 → 本地日期（YYYY-MM-DD），由宿主注入。 */
    toLocalDate: (ms: number) => string;
    /** 毫秒时间戳 → 当地次日零点，用于跨日切分。 */
    nextMidnight: (ms: number) => number;
    /** 采样周期（毫秒）；相邻在播采样间隔超过 3 倍周期视为断档丢弃。 */
    sampleIntervalMs: number;
}

/** 单项目会话内累计。内部按毫秒累计、对外按「向下取整分钟」暴露——
    采样周期（15s）短于分钟粒度，若按段取整会丢失全部时长（T-1385 修复）。 */
export class SiplayerPlaybackTracker {
    private playingSince?: number;
    private lastSampleAt?: number;
    private readonly dayMs = new Map<string, number>();

    constructor(private readonly options: SiplayerTrackerOptions) {}

    get playing(): boolean {
        return this.playingSince !== undefined;
    }

    /** 该日已累计的向下取整分钟数。 */
    dayTotal(localDate: string): number {
        return Math.floor((this.dayMs.get(localDate) || 0) / 60_000);
    }

    /**
     * 处理一次采样。在播期间累计与上一采样的间隔（有界）；
     * 暂停/ absent 结束当前播放段；断档（间隔超 3 倍周期）丢弃该段时间并重新锚定。
     */
    sample(playing: boolean, atMs: number): SiplayerSegment[] {
        const segments: SiplayerSegment[] = [];
        const inPlay = this.playingSince !== undefined;
        const previous = this.lastSampleAt;
        if (inPlay && previous !== undefined) {
            const span = atMs - previous;
            if (span > 0 && span <= this.options.sampleIntervalMs * 3) {
                segments.push(...this.accumulate(previous, atMs));
            } else if (span > this.options.sampleIntervalMs * 3) {
                /* 断档：区间不可信，丢弃并重新锚定（新状态决定是否在播）。 */
                this.playingSince = playing ? atMs : undefined;
                this.lastSampleAt = atMs;
                return segments;
            }
        }
        this.lastSampleAt = atMs;
        if (playing && this.playingSince === undefined) this.playingSince = atMs;
        if (!playing) this.playingSince = undefined;
        return segments;
    }

    /** 结束当前播放段（宿主停用/卸载时调用）。 */
    stop(atMs: number): SiplayerSegment[] {
        if (this.playingSince === undefined) return [];
        return this.sample(false, atMs);
    }

    discardInFlight(): void {
        this.playingSince = undefined;
        this.lastSampleAt = undefined;
    }

    private accumulate(startedAt: number, endedAt: number): SiplayerSegment[] {
        const totals = new Map<string, number>();
        let cursor = startedAt;
        while (cursor < endedAt) {
            const midnight = this.options.nextMidnight(cursor);
            const sliceEnd = Math.min(midnight, endedAt);
            const localDate = this.options.toLocalDate(cursor);
            totals.set(localDate, (totals.get(localDate) || 0) + (sliceEnd - cursor));
            cursor = sliceEnd;
        }
        /* 毫秒累计、整分钟晋升：晋升时产出段（携带该日累计分钟），不再丢秒。 */
        const segments: SiplayerSegment[] = [];
        for (const [localDate, ms] of totals) {
            const before = this.dayMs.get(localDate) || 0;
            this.dayMs.set(localDate, before + ms);
            const promoted = Math.floor((before + ms) / 60_000);
            if (promoted > Math.floor(before / 60_000)) segments.push({localDate, minutes: promoted});
        }
        return segments.sort((left, right) => left.localDate.localeCompare(right.localDate));
    }
}

/** 写入身份：`siplayer:<itemId>:<localDate>`（每日一次，幂等键）。 */
export function buildSiplayerExternalRef(itemId: string, localDate: string): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    return safeItem && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(localDate) ? `siplayer:${safeItem}:${localDate}` : "";
}

/** 特征探测：宿主窗口是否存在可用的思播 controller（isPlaying 可调用）。 */
export function detectSiplayerController(hostWindow: unknown): boolean {
    const candidate = (hostWindow as {siyuanMediaPlayer?: {controller?: {isPlaying?: unknown}}}).siyuanMediaPlayer;
    return typeof candidate?.controller?.isPlaying === "function";
}
