/* 拆除预算工具（T-1242）：思源把插件实例的 onload、onLayoutReady、onDataChanged、onunload、uninstall
   放进同一份拆除预算（见 siyuan 类型包 siyuan.d.ts 的 Plugin 生命周期注释与宿主 plugin/lifecycle 实现），
   超时即强制销毁。因此卸载路径上的每个 await 都必须有界，否则末次打卡会在预算耗尽时被静默截断。 */

/** 队列排空预算：给宿主后续的 uninstall 与 DOM 拆除留出余量。 */
export const TEARDOWN_DRAIN_BUDGET_MS = 3600;

/** 补写预算：拆除收尾时一次主存储写入的上限。 */
export const TEARDOWN_FLUSH_BUDGET_MS = 900;

export interface TeardownDeadline {
    /** 剩余预算毫秒数，已耗尽时为 0。 */
    remainingMs(): number;
    expired(): boolean;
}

export function createTeardownDeadline(budgetMs: number, now: () => number = () => Date.now()): TeardownDeadline {
    const startedAt = now();
    const limit = Math.max(0, budgetMs);
    return {
        remainingMs(): number { return Math.max(0, limit - (now() - startedAt)); },
        expired(): boolean { return now() - startedAt >= limit; },
    };
}

export type DeadlineOutcome = "done" | "failed" | "timeout";

/** 在预算内等待 promise：区分「按时完成」「按时失败」「超预算」，供拆除路径决定是否提示用户。 */
export async function waitWithinDeadline(promise: Promise<unknown>, deadline: TeardownDeadline): Promise<DeadlineOutcome> {
    const remaining = deadline.remainingMs();
    if (remaining <= 0) {
        void Promise.resolve(promise).catch(() => undefined);
        return "timeout";
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<DeadlineOutcome>((resolve) => { timer = setTimeout(() => resolve("timeout"), remaining); });
    try {
        return await Promise.race([Promise.resolve(promise).then(() => "done" as DeadlineOutcome, () => "failed" as DeadlineOutcome), budget]);
    } finally {
        if (timer !== undefined) clearTimeout(timer);
    }
}

export interface TeardownWriteGate {
    /** 进入拆除：排队的变更不再各自整文件落盘。 */
    deferWrites(): void;
    /** 本次写请求是否被拆除门禁拦截（拦截即代表仍有内存变更待补写）。 */
    shouldIntercept(): boolean;
    /** 解除门禁，返回拆除期间是否攒下了未落盘的变更。 */
    resume(): boolean;
}

export function createTeardownWriteGate(): TeardownWriteGate {
    let deferred = false;
    let dirty = false;
    return {
        deferWrites(): void { deferred = true; },
        shouldIntercept(): boolean {
            if (!deferred) return false;
            dirty = true;
            return true;
        },
        resume(): boolean {
            const pending = dirty;
            deferred = false;
            dirty = false;
            return pending;
        },
    };
}
