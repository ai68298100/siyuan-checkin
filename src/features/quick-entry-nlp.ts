/* T-1496：快速录入的确定性中文解析面。
 *
 * 这是一个有意收窄的解析器：只识别日期、重复日期、数值和时长，
 * 不猜项目、不读时钟、不执行写入。未识别的文本原样留在 remainder，
 * 让调用方继续使用原有搜索/提交路径。 */

export type QuickEntryTokenKind = "date" | "recurrence" | "value";

export interface QuickEntryToken {
    id: string;
    kind: QuickEntryTokenKind;
    text: string;
    start: number;
    end: number;
    value?: number;
    unit?: string;
    date?: string;
    weekdays?: number[];
}

export interface QuickEntryParseResult {
    text: string;
    remainder: string;
    tokens: QuickEntryToken[];
    date?: string;
    value?: number;
    unit?: string;
    recurrence?: {weekdays: number[]};
}

export interface QuickEntryTargetCandidate {
    id: string;
    name: string;
    kind: string;
    unit: string;
    direction?: string;
}

/** A numeric suggestion is actionable only when it names one compatible target. */
export function resolveQuickEntryRecordTarget(result: QuickEntryParseResult, today: string, candidates: readonly QuickEntryTargetCandidate[]): string | undefined {
    if (!Number.isFinite(result.value) || !result.value || !result.unit || result.recurrence || (result.date && result.date !== today)) return undefined;
    const name = result.remainder.trim().toLocaleLowerCase();
    if (!name) return undefined;
    const matches = candidates.filter((item) => item.name.trim().toLocaleLowerCase() === name
        && item.direction !== "atMost" && item.unit === result.unit && (item.kind === "count" || item.kind === "duration" || item.kind === "quantity"));
    return matches.length === 1 ? matches[0].id : undefined;
}

const MAX_TEXT_LENGTH = 120;
const MAX_TOKENS = 4;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isDateKey(value: string): boolean {
    if (!DATE_KEY.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function dateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(baseDate: string, amount: number): string | undefined {
    if (!isDateKey(baseDate)) return undefined;
    const [year, month, day] = baseDate.split("-").map(Number);
    const date = new Date(year, month - 1, day + amount);
    return dateKey(date);
}

function normalizeUnit(value: string): string | undefined {
    const unit = value.toLocaleLowerCase();
    if (["分钟", "分", "min", "mins"].includes(unit)) return "分钟";
    if (["小时", "时", "h", "hr", "hrs"].includes(unit)) return "小时";
    if (["步", "步数"].includes(unit)) return "步";
    if (["次"].includes(unit)) return "次";
    if (["公斤", "千克", "kg"].includes(unit)) return "千克";
    if (["克", "g"].includes(unit)) return "克";
    if (["页"].includes(unit)) return "页";
    if (["毫升", "ml"].includes(unit)) return "毫升";
    return undefined;
}

function parseWeekdays(raw: string): number[] | undefined {
    const body = raw.replace(/^每周/, "").replace(/[，、,\s]+/g, "");
    if (!body || !/^[一二三四五六日天]+$/.test(body)) return undefined;
    const map: Record<string, number> = {一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0};
    const weekdays = [...body].map((day) => map[day]).filter((day) => Number.isInteger(day));
    return weekdays.length ? [...new Set(weekdays)].sort((left, right) => left - right) : undefined;
}

function tokenId(kind: QuickEntryTokenKind, text: string, start: number): string {
    return `${kind}:${start}:${text}`;
}

function dateToken(text: string, start: number, baseDate: string): QuickEntryToken | undefined {
    const relative: Record<string, number> = {今天: 0, 明天: 1, 后天: 2, 昨天: -1, 前天: -2};
    if (relative[text] !== undefined) {
        const date = addDays(baseDate, relative[text]);
        return date ? {id: tokenId("date", text, start), kind: "date", text, start, end: start + text.length, date} : undefined;
    }
    const ymd = /^([0-9]{4})年([0-9]{1,2})月([0-9]{1,2})日?$/.exec(text);
    if (ymd) {
        const date = `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
        if (isDateKey(date)) return {id: tokenId("date", text, start), kind: "date", text, start, end: start + text.length, date};
    }
    if (isDateKey(text)) return {id: tokenId("date", text, start), kind: "date", text, start, end: start + text.length, date: text};
    const monthDay = /^([0-9]{1,2})月([0-9]{1,2})日?$/.exec(text);
    if (monthDay && isDateKey(`${baseDate.slice(0, 4)}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`)) {
        const date = `${baseDate.slice(0, 4)}-${monthDay[1].padStart(2, "0")}-${monthDay[2].padStart(2, "0")}`;
        return {id: tokenId("date", text, start), kind: "date", text, start, end: start + text.length, date};
    }
    return undefined;
}

/** Parse a bounded input against an explicit calendar date. */
export function parseQuickEntryText(text: string, baseDate: string): QuickEntryParseResult {
    const source = typeof text === "string" ? text : "";
    if (source.length > MAX_TEXT_LENGTH || !isDateKey(baseDate)) return {text: source, remainder: source, tokens: []};
    const candidates: QuickEntryToken[] = [];
    const dateLikeRanges: Array<{start: number; end: number}> = [];
    const add = (token: QuickEntryToken | undefined) => {
        if (token && !candidates.some((entry) => entry.start === token.start && entry.end === token.end)) candidates.push(token);
    };
    const datePattern = /\d{4}-\d{1,2}-\d{1,2}|\d{4}年\d{1,2}月\d{1,2}日?|\d{1,2}月\d{1,2}日?|今天|明天|后天|昨天|前天/g;
    for (const match of source.matchAll(datePattern)) {
        const start = match.index ?? 0;
        dateLikeRanges.push({start, end: start + match[0].length});
        add(dateToken(match[0], start, baseDate));
    }
    const recurrencePattern = /每周[一二三四五六日天](?:[、，,\s]*[一二三四五六日天])*/g;
    for (const match of source.matchAll(recurrencePattern)) {
        const weekdays = parseWeekdays(match[0]);
        if (weekdays) add({id: tokenId("recurrence", match[0], match.index ?? 0), kind: "recurrence", text: match[0], start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, weekdays});
    }
    const valuePattern = /(?:^|\s|[，,])([0-9]+(?:\.[0-9]+)?)(分钟|分|mins|min|小时|时|hrs|hr|h|步数|步|次|公斤|千克|kg|克|g|页|毫升|ml)?/gi;
    for (const match of source.matchAll(valuePattern)) {
        const number = Number(match[1]);
        const rawUnit = match[2] || "";
        const unit = rawUnit ? normalizeUnit(rawUnit) : undefined;
        const start = (match.index ?? 0) + match[0].indexOf(match[1]);
        if (dateLikeRanges.some((range) => start < range.end && start + match[1].length > range.start)) continue;
        if (!Number.isFinite(number) || number <= 0 || number > 1_000_000 || (rawUnit && !unit)) continue;
        const normalizedValue = unit === "小时" ? number * 60 : number;
        add({id: tokenId("value", match[1] + rawUnit, start), kind: "value", text: match[1] + rawUnit, start, end: start + match[1].length + rawUnit.length, value: normalizedValue, unit: unit === "小时" ? "分钟" : unit});
    }
    candidates.sort((left, right) => left.start - right.start || right.end - left.end);
    const tokens = candidates.filter((token, index) => !candidates.slice(0, index).some((prior) => token.start < prior.end && token.end > prior.start)).slice(0, MAX_TOKENS);
    const remainder = [...source].map((char, index) => tokens.some((token) => index >= token.start && index < token.end) ? "" : char).join("").replace(/\s{2,}/g, " ").replace(/^[\s,，、]+|[\s,，、]+$/g, "");
    const date = tokens.find((token) => token.kind === "date")?.date;
    const valueToken = tokens.find((token) => token.kind === "value");
    const recurrenceToken = tokens.find((token) => token.kind === "recurrence");
    return {text: source, remainder, tokens, ...(date ? {date} : {}), ...(valueToken?.value !== undefined ? {value: valueToken.value, unit: valueToken.unit} : {}), ...(recurrenceToken?.weekdays ? {recurrence: {weekdays: recurrenceToken.weekdays}} : {})};
}

export function applyQuickEntryCancellations(result: QuickEntryParseResult, cancelled: readonly string[] = []): QuickEntryParseResult {
    const cancelledSet = new Set(cancelled);
    const tokens = result.tokens.filter((token) => !cancelledSet.has(token.id));
    const remainder = [...result.text].map((char, index) => tokens.some((token) => index >= token.start && index < token.end) ? "" : char).join("").replace(/\s{2,}/g, " ").replace(/^[\s,，、]+|[\s,，、]+$/g, "");
    const date = tokens.find((token) => token.kind === "date")?.date;
    const valueToken = tokens.find((token) => token.kind === "value");
    const recurrenceToken = tokens.find((token) => token.kind === "recurrence");
    return {text: result.text, remainder, tokens, ...(date ? {date} : {}), ...(valueToken?.value !== undefined ? {value: valueToken.value, unit: valueToken.unit} : {}), ...(recurrenceToken?.weekdays ? {recurrence: {weekdays: recurrenceToken.weekdays}} : {})};
}
