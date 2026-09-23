/* T-1419 · R-A7 时间与日历语义契约——localDate 键的单一纯函数实现。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-A7）：
   - 只接受显式 localDate 字符串、显式时区或显式 Date 入参；本模块不读取系统时钟
     （无 Date.now、无缺省 new Date()），同一输入永远得到同一输出；
   - 日期一律使用 `YYYY-MM-DD` 键与基于 UTC 日序号的整数运算，避免毫秒差在
     夏令时/时区切换下漂移；跨午夜与跨日来源的切段责任在接入层（D-258）；
   - 非法输入 fail-closed 返回 undefined，不抛异常、不静默猜测；
   - 与 model.ts 既有 `localCalendarDayNumber` 同一公式（UTC 日序号）；本模块是
     跨模块共享的规范出口，model 内部私有实现待后续批次收敛，不在此处重复导出。 */

const MS_PER_DAY = 86400000;
/* 4 位年份-两位月-两位日；月 01-12、日 00-99 由正则放宽，真实日历由 splitDateKey 复核。 */
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DateKeyParts {
    year: number;
    month: number;
    day: number;
}

/** 严格校验 `YYYY-MM-DD`：四位年份、两位月日、真实日历（含闰年与月末）。 */
export function isValidDateKey(value: unknown): value is string {
    if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
    return splitDateKey(value) !== undefined;
}

/** 拆分并日历校验日期键：`2026-02-30` 这类格式合法但日历不存在的键返回 undefined。 */
export function splitDateKey(key: string): DateKeyParts | undefined {
    if (typeof key !== "string" || !DATE_KEY_PATTERN.test(key)) return undefined;
    const segments = key.split("-");
    const year = Number(segments[0]);
    const month = Number(segments[1]);
    const day = Number(segments[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
    if (month < 1 || month > 12 || day < 1) return undefined;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > daysInMonth) return undefined;
    return {year, month, day};
}

/** UTC 日序号（proleptic day number）：与 model.ts `localCalendarDayNumber` 同一公式。
    与本地时区无关——两个键的序号差就是真实的整天数，不受夏令时影响。 */
export function calendarDayNumber(key: string): number | undefined {
    const parts = splitDateKey(key);
    if (!parts) return undefined;
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

function pad2(value: number): string {
    return String(value).padStart(2, "0");
}

function assembleKey(year: number, month: number, day: number): string {
    return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/** 把显式 Date 格式化为日期键。不给时区时使用 Date 自带的本地时区字段
    （与既有 review-comparison/occasions 的格式化完全等价）；给定 IANA 时区时
    用 Intl 显式换算（如跨时区结算、回放样例）。不支持模糊/偏移量缺失的输入。 */
export function formatDateKey(date: Date, timeZone?: string): string {
    if (!timeZone) {
        return assembleKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }
    const parts = new Intl.DateTimeFormat("en-CA", {timeZone, year: "numeric", month: "2-digit", day: "2-digit"}).formatToParts(date);
    const lookup = (type: string): number => {
        const found = parts.find((part) => part.type === type);
        return Number(found ? found.value : "0");
    };
    return assembleKey(lookup("year"), lookup("month"), lookup("day"));
}

/** 从日期键出发平移 N 天（days 可为负）。经日序号运算，闰日与月末自动归位。 */
export function addDays(key: string, days: number): string | undefined {
    const dayNumber = calendarDayNumber(key);
    if (dayNumber === undefined || !Number.isFinite(days)) return undefined;
    const shifted = new Date((dayNumber + days) * MS_PER_DAY);
    return assembleKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** 下一本地日。 */
export function nextLocalDay(key: string): string | undefined {
    return addDays(key, 1);
}

/** 半开区间 `[from, to)` 的整天数：`daysBetweenHalfOpen(a, a) === 0`，
    相邻两天为 1；方向语义与既有 `Math.round((to-from)/86400000)` 完全一致。 */
export function daysBetweenHalfOpen(fromKey: string, toKey: string): number | undefined {
    const from = calendarDayNumber(fromKey);
    const to = calendarDayNumber(toKey);
    if (from === undefined || to === undefined) return undefined;
    return to - from;
}

/** 半开区间 `[from, to)` 的日期序列；`from >= to` 时空数组。 */
export function dateRangeHalfOpen(fromKey: string, toKey: string): string[] | undefined {
    const from = calendarDayNumber(fromKey);
    const to = calendarDayNumber(toKey);
    if (from === undefined || to === undefined) return undefined;
    const keys: string[] = [];
    for (let day = from; day < to; day += 1) {
        const shifted = new Date(day * MS_PER_DAY);
        keys.push(assembleKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate()));
    }
    return keys;
}

/** 闭区间 `[from, to]` 的日期序列；`from > to` 时空数组。 */
export function dateRangeInclusive(fromKey: string, toKey: string): string[] | undefined {
    const from = calendarDayNumber(fromKey);
    const to = calendarDayNumber(toKey);
    if (from === undefined || to === undefined) return undefined;
    if (from > to) return [];
    const keys = dateRangeHalfOpen(fromKey, toKey);
    if (keys === undefined) return undefined;
    keys.push(toKey);
    return keys;
}
