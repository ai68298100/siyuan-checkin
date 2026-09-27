/* calendar.read 消费端参考层（T-1392 本地切片 / T-1527）。
   面向日历类消费方（如 Task Horizon 的「打卡」图层）的参考实现：
   能力协商 → 区间规划 → 单飞加载（超时/中止/缓存）→ 防御性归一化 → 刷新分类。
   只依赖已发布的 v5 公开契约（manifest.json / docs/api-v5.md §calendar.read）；
   不读取私有数据、不自算完成率、不因失败抛裸异常（一律返回可诊断结果）。

   用法（消费方插件开发期）：
     import {createCalendarProjectionSession, runCalendarConsumerChecks} from "./calendar-consumer.mjs";
     const session = createCalendarProjectionSession(window.siyuanCheckin, {timeoutMs: 8000});
     const result = await session.load({startDate: "2026-09-01", endDateExclusive: "2026-10-01"});
     if (!result.ok) console.warn(result.reasonKey); else render(result.projection);
     for (const eventName of manifest.events) host.listen(eventName, (e) => planCalendarRefresh(eventName));
   */

import manifest from "./manifest.json" with { type: "json" };

const CAL_LIMITS = manifest.limits.calendarProjection;          // {maxDays: 366, maxItems: 200}
const CALENDAR_READ = "calendar.read";
const CAL_SINCE = manifest.capabilities.find((c) => c.name === CALENDAR_READ)?.since ?? 5;

/** 投影点状态枚举（docs/api-v5.md §calendar.read；与宿主单一路径一致）。 */
export const PROJECTION_STATUSES = Object.freeze([
    "complete", "pending", "skipped", "at-most-safe", "at-most-breach", "logged",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* 民用日序号（Howard Hinnant days_from_civil）：纯 UTC 整数运算，不受夏令时影响，
   与宿主 src/date-keys.ts 同一口径；消费端独立实现以保持零依赖。 */
function dayFromCivil(dateKey) {
    const match = DATE_RE.test(dateKey) ? dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
    if (!match) return NaN;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return NaN;
    const era = Math.floor((month > 2 ? year : year - 1) / 400);
    const yoe = (month > 2 ? year : year - 1) - era * 400;
    const doy = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe - 719468;
}

function civilFromDay(z) {
    z += 719468;
    const era = Math.floor(z / 146097);
    const doe = z - era * 146097;
    const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
    const y = yoe + era * 400;
    const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
    const mp = Math.floor((5 * doy + 2) / 153);
    const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
    const m = mp + (mp < 10 ? 3 : -9);
    const year = m <= 2 ? y + 1 : y;
    const pad = (n) => String(n).padStart(2, "0");
    return `${year}-${pad(m)}-${pad(d)}`;
}

/** 能力协商：宿主缺失/过旧/能力不存在一律给出稳定 reasonKey，绝不带病调用。 */
export function negotiateCalendarRead(api) {
    if (!api || typeof api !== "object") return {ok: false, reasonKey: "api-missing"};
    const negotiable = typeof api.hasCapability === "function" && api.hasCapability(CALENDAR_READ);
    if (!negotiable) {
        return {ok: false, reasonKey: (typeof api.version === "number" && api.version < CAL_SINCE) ? "host-outdated" : "capability-missing"};
    }
    if (typeof api.getCapabilityInfo === "function") {
        const info = api.getCapabilityInfo();
        const meta = info?.[CALENDAR_READ];
        if (meta && meta.effect !== "read") return {ok: false, reasonKey: "capability-missing"};
    }
    if (typeof api.getCalendarProjection !== "function") return {ok: false, reasonKey: "capability-missing"};
    return {ok: true, capability: CALENDAR_READ, since: CAL_SINCE};
}

/** 区间规划：严格 localDate、半开区间、跨度 ≤ maxDays；clamp=true 时截齐上界而不是拒绝。 */
export function planProjectionRange(range, options = {}) {
    const start = range?.startDate;
    const end = range?.endDateExclusive;
    const startDay = dayFromCivil(start ?? "");
    const endDay = dayFromCivil(end ?? "");
    if (Number.isNaN(startDay) || Number.isNaN(endDay)) return {ok: false, reasonKey: "invalid-range"};
    if (endDay <= startDay) return {ok: false, reasonKey: "invalid-range"};
    const days = endDay - startDay;
    if (days > CAL_LIMITS.maxDays) {
        if (!options.clamp) return {ok: false, reasonKey: "range-too-long"};
        return {ok: true, days: CAL_LIMITS.maxDays, clamped: true, range: {startDate: start, endDateExclusive: civilFromDay(startDay + CAL_LIMITS.maxDays)}};
    }
    return {ok: true, days, clamped: false, range: {startDate: start, endDateExclusive: end}};
}

/** 刷新分类（四类）：宿主发布的 8 个事件 → 投影图层是否需要重载。
    record/structure/derived 都刷新（隐藏开关走 item-updated，服务端过滤 + 重载即生效）；
    unrelated 忽略；未知事件 fail-closed 不刷新。 */
export function planCalendarRefresh(eventName) {
    switch (eventName) {
        case "checkin:event-recorded":
        case "checkin:event-deleted":
            return {klass: "record", refresh: true};
        case "checkin:item-created":
        case "checkin:item-updated":
        case "checkin:item-deleted":
        case "checkin:item-archived":
            return {klass: "structure", refresh: true};
        case "checkin:analytics-updated":
            return {klass: "derived", refresh: true};
        case "checkin:suggestion-workflow-updated":
            return {klass: "unrelated", refresh: false};
        default:
            return {klass: "unknown", refresh: false};
    }
}

/** 防御性归一化：形状不符的 item/point 逐条丢弃并计数，绝不整包拒载后猜内容。
    只认 PROJECTION_STATUSES 枚举；数值字段必须是有限数；结果只读（宿主同为防御性副本）。 */
export function normalizeCalendarProjection(raw) {
    if (!raw || typeof raw !== "object") return {ok: false, reasonKey: "projection-invalid"};
    const items = Array.isArray(raw.items) ? raw.items : null;
    if (!items || typeof raw.totalItems !== "number" || !Number.isFinite(raw.totalItems)
        || typeof raw.truncated !== "boolean" || !DATE_RE.test(raw.startDate ?? "") || !DATE_RE.test(raw.endDateExclusive ?? "")) {
        return {ok: false, reasonKey: "projection-invalid"};
    }
    const dropped = {items: 0, points: 0};
    const cleanItems = [];
    for (const entry of items.slice(0, CAL_LIMITS.maxItems)) {
        if (!entry || typeof entry !== "object" || typeof entry.itemId !== "string" || !entry.itemId
            || !Array.isArray(entry.points)) { dropped.items += 1; continue; }
        const points = [];
        let entryInvalid = false;
        for (const point of entry.points) {
            if (!point || typeof point !== "object" || !DATE_RE.test(point.date ?? "")
                || !PROJECTION_STATUSES.includes(point.status)
                || typeof point.value !== "number" || !Number.isFinite(point.value)
                || typeof point.target !== "number" || !Number.isFinite(point.target)) { dropped.points += 1; entryInvalid = true; continue; }
            const clean = {date: point.date, status: point.status, value: point.value, target: point.target, unit: typeof point.unit === "string" ? point.unit : ""};
            if (typeof point.progress === "number" && Number.isFinite(point.progress)) clean.progress = point.progress;
            points.push(clean);
        }
        if (entryInvalid && points.length === 0) { dropped.items += 1; continue; }
        cleanItems.push({
            itemId: entry.itemId,
            name: typeof entry.name === "string" ? entry.name : "",
            icon: typeof entry.icon === "string" ? entry.icon : "",
            kind: typeof entry.kind === "string" ? entry.kind : "",
            unit: typeof entry.unit === "string" ? entry.unit : "",
            scheduleType: typeof entry.scheduleType === "string" ? entry.scheduleType : "",
            ...(entry.direction === "atMost" ? {direction: "atMost"} : {}),
            ...(typeof entry.quotaRate === "number" && Number.isFinite(entry.quotaRate) ? {quotaRate: entry.quotaRate} : {}),
            points,
        });
    }
    return {
        ok: true,
        dropped,
        projection: {startDate: raw.startDate, endDateExclusive: raw.endDateExclusive, items: cleanItems, totalItems: raw.totalItems, truncated: raw.truncated === true},
    };
}

/** 单飞加载会话：并发同区间共享一次在途请求；过期缓存不回退旧值（直接重查）。
    - timeoutMs：宿主无响应判超时（reasonKey "timeout"），可诊断不抛异常；
    - signal：调用方取消（reasonKey "aborted"）；
    - now：可注入时钟，测试与业务共同确定缓存新鲜度；ttl=0 表示只用一次不跨调用。
    失败结果一律不写缓存：旧投影绝不冒充新事实。 */
export function createCalendarProjectionSession(api, options = {}) {
    const timeoutMs = typeof options.timeoutMs === "number" && options.timeoutMs > 0 ? options.timeoutMs : 8000;
    const cacheTtlMs = typeof options.cacheTtlMs === "number" && options.cacheTtlMs >= 0 ? options.cacheTtlMs : 0;
    const now = typeof options.now === "function" ? options.now : (() => Date.now());
    const cache = new Map();
    let inFlight = null;

    async function load(range, callOptions = {}) {
        const negotiation = negotiateCalendarRead(api);
        if (!negotiation.ok) return negotiation;
        const plan = planProjectionRange(range, {clamp: callOptions.clamp === true});
        if (!plan.ok) return plan;
        const key = `${plan.range.startDate}|${plan.range.endDateExclusive}`;
        const cached = cache.get(key);
        if (cached && now() - cached.at <= cacheTtlMs) {
            return {ok: true, fromCache: true, clamped: plan.clamped === true, days: plan.days, projection: cached.projection};
        }
        if (inFlight && inFlight.key === key) return inFlight.promise;
        const promise = (async () => {
            const controller = typeof AbortController === "function" ? new AbortController() : null;
            const signal = callOptions.signal;
            if (signal && controller) {
                if (signal.aborted) return {ok: false, reasonKey: "aborted"};
                signal.addEventListener("abort", () => controller.abort(), {once: true});
            }
            let timer = null;
            let onCallerAbort = null;
            try {
                const provider = Promise.resolve(api.getCalendarProjection(plan.range, {signal: controller?.signal}));
                const timeoutPromise = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
                });
                const abortPromise = signal
                    ? new Promise((_, reject) => {
                        onCallerAbort = () => reject(new Error("aborted"));
                        if (signal.aborted) onCallerAbort();
                        else signal.addEventListener("abort", onCallerAbort, {once: true});
                    })
                    : null;
                const payload = await Promise.race(abortPromise ? [provider, timeoutPromise, abortPromise] : [provider, timeoutPromise]);
                if (!payload || typeof payload !== "object") return {ok: false, reasonKey: "projection-invalid"};
                const normalized = normalizeCalendarProjection(payload);
                if (normalized.ok) cache.set(key, {at: now(), projection: normalized.projection});
                return normalized.ok
                    ? {...normalized, fromCache: false, clamped: plan.clamped === true, days: plan.days}
                    : normalized;
            } catch (error) {
                if (signal?.aborted) return {ok: false, reasonKey: "aborted"};
                return {ok: false, reasonKey: error?.message === "timeout" ? "timeout" : "provider-failed"};
            } finally {
                if (timer) clearTimeout(timer);
                if (onCallerAbort && signal) signal.removeEventListener("abort", onCallerAbort);
                if (inFlight && inFlight.promise === promise) inFlight = null;
            }
        })();
        inFlight = {key, promise};
        return promise;
    }

    return {
        load,
        invalidate: () => cache.clear(),
        get inFlightKey() { return inFlight ? inFlight.key : null; },
    };
}

/** 消费端契约自检：开发期对宿主（或 mock）逐条核对 calendar.read 消费前提。
    与 runContractChecks 同风格：返回 {passed, failures}，不抛异常。 */
export async function runCalendarConsumerChecks({api, label = "calendar-consumer", timeoutMs = 8000, log = () => {}} = {}) {
    const failures = [];
    let passed = 0;
    const ok = (condition, message) => { if (condition) passed += 1; else failures.push(message); };

    const negotiation = negotiateCalendarRead(api);
    ok(negotiation.ok, `${label}: calendar.read must be negotiable (got ${negotiation.reasonKey ?? "ok"})`);
    if (!negotiation.ok) return {passed, failures};

    ok(typeof api.getCalendarProjection === "function", `${label}: getCalendarProjection must be a function`);
    /* 超限与空区间：契约要求「截断标注或拒绝为空，不抛异常」。 */
    let overLimit;
    try { overLimit = await Promise.resolve(api.getCalendarProjection({startDate: "2026-01-01", endDateExclusive: "2027-01-05"})); } catch { overLimit = undefined; }
    ok(overLimit === undefined || (overLimit && Array.isArray(overLimit.items) && (overLimit.items.length === 0 || overLimit.truncated === true)),
        `${label}: over-limit range must truncate-or-reject, never throw`);
    let emptyRange;
    try { emptyRange = await Promise.resolve(api.getCalendarProjection({startDate: "2026-02-01", endDateExclusive: "2026-02-01"})); } catch { emptyRange = undefined; }
    ok(emptyRange === undefined || (emptyRange && Array.isArray(emptyRange.items) && emptyRange.items.length === 0),
        `${label}: an empty half-open range must yield no projection content`);

    /* 固定时钟：cacheTtlMs=0 时同刻重查命中缓存，断言不受真实时钟抖动影响。 */
    const session = createCalendarProjectionSession(api, {timeoutMs, now: () => 0, cacheTtlMs: 0});
    const result = await session.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    ok(result.ok, `${label}: a one-month load must succeed (got ${result.reasonKey ?? "ok"})`);
    if (result.ok) {
        const projection = result.projection;
        ok(projection.startDate === "2026-02-01" && projection.endDateExclusive === "2026-03-01",
            `${label}: projection must echo the requested range verbatim`);
        ok(Array.isArray(projection.items) && projection.items.every((entry) => entry.points.every((point) => PROJECTION_STATUSES.includes(point.status))),
            `${label}: point statuses must stay inside the published enum`);
        ok(typeof projection.totalItems === "number" && typeof projection.truncated === "boolean",
            `${label}: projection must carry totalItems and truncated`);
        const again = await session.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
        ok(again.ok && again.fromCache === true, `${label}: an immediate repeat load must serve the bounded cache`);
    }
    log(`calendar consumer checks: ${passed} passed, ${failures.length} failures`);
    return {passed, failures};
}
