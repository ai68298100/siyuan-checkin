export interface CheckinLogDay<T> {
    date: string;
    events: readonly T[];
}

export interface CheckinLogWeek<T> {
    startDate: string;
    endDate: string;
    days: CheckinLogDay<T>[];
    eventCount: number;
}

export interface CheckinLogMonth<T> {
    key: string;
    year: number;
    month: number;
    weeks: CheckinLogWeek<T>[];
    dayCount: number;
    eventCount: number;
}

function dateFromKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
}

function keyFromDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function weekBounds(value: string): {startDate: string; endDate: string} {
    const date = dateFromKey(value);
    const mondayOffset = (date.getDay() + 6) % 7;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - mondayOffset, 12);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 12);
    return {startDate: keyFromDate(start), endDate: keyFromDate(end)};
}

/**
 * 把已筛选的日志日期组织为「月 → 周（周一至周日）→ 日」。
 * 输入和输出都按日期倒序；跨月周分别归入各自月份，避免日期离开所属月份。
 */
export function buildCheckinLogHierarchy<T>(input: readonly CheckinLogDay<T>[]): CheckinLogMonth<T>[] {
    const days = [...input].sort((left, right) => right.date.localeCompare(left.date));
    const months: CheckinLogMonth<T>[] = [];
    const monthByKey = new Map<string, CheckinLogMonth<T>>();
    const weekByMonth = new Map<string, Map<string, CheckinLogWeek<T>>>();

    for (const day of days) {
        const [year, month] = day.date.split("-").map(Number);
        const monthKey = day.date.slice(0, 7);
        let monthGroup = monthByKey.get(monthKey);
        if (!monthGroup) {
            monthGroup = {key: monthKey, year, month, weeks: [], dayCount: 0, eventCount: 0};
            monthByKey.set(monthKey, monthGroup);
            weekByMonth.set(monthKey, new Map());
            months.push(monthGroup);
        }

        const bounds = weekBounds(day.date);
        const monthWeeks = weekByMonth.get(monthKey)!;
        let week = monthWeeks.get(bounds.startDate);
        if (!week) {
            week = {...bounds, days: [], eventCount: 0};
            monthWeeks.set(bounds.startDate, week);
            monthGroup.weeks.push(week);
        }
        week.days.push(day);
        week.eventCount += day.events.length;
        monthGroup.dayCount += 1;
        monthGroup.eventCount += day.events.length;
    }

    return months;
}
