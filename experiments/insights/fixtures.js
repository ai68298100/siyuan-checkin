const key = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function createExampleStore(asOf) {
    const start = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 100, 12);
    const definition = (id, name, icon, kind, target, unit, schedule) => ({
        id, name, icon, kind, target, unit, schedule,
        createdAt: start.toISOString(), updatedAt: start.toISOString(), createdDate: key(start),
        revisions: [{effectiveDate: key(start), kind, target, unit, schedule}], archivePeriods: [],
    });
    const items = [
        definition("reading", "阅读", "book-open", "duration", 30, "分钟", {type: "daily"}),
        definition("movement", "运动", "activity", "duration", 30, "分钟", {type: "weekly", weekdays: [1, 3, 5]}),
        definition("water", "喝水", "droplets", "quantity", 2000, "毫升", {type: "daily"}),
        definition("notes", "每日笔记", "notebook-pen", "binary", 1, "次", {type: "workdays"}),
    ];
    const pauseStart = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 34, 12);
    const pauseEnd = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - 29, 12);
    items[1].archivePeriods = [{startDate: key(pauseStart), endDate: key(pauseEnd)}];
    const events = [];
    for (let offset = 83; offset >= 0; offset -= 1) {
        const date = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate() - offset, 12);
        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            if (item.schedule.type === "workdays" && [0, 6].includes(date.getDay())) continue;
            if (item.schedule.weekdays && !item.schedule.weekdays.includes(date.getDay())) continue;
            if (item.archivePeriods.some((period) => key(date) >= period.startDate && key(date) < period.endDate)) continue;
            if (offset > 5 && (offset + index * 3) % 9 === 0) continue;
            const partial = offset === 0 || offset > 5 && (offset + index) % 7 === 0;
            const total = partial ? item.kind === "binary" ? 0 : item.target / 2 : item.target + (item.kind === "binary" ? 0 : offset % 3 * item.target / 6);
            if (!total) continue;
            const count = item.kind === "binary" ? 1 : partial ? 1 : 2;
            for (let occurrence = 0; occurrence < count; occurrence += 1) {
                const moment = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8 + occurrence * 11, 20);
                events.push({
                    id: `sample-${item.id}-${key(date)}-${occurrence}`, itemId: item.id,
                    occurredAt: moment.toISOString(), localDate: key(date), value: total / count, unit: item.unit,
                    source: item.id === "reading" && occurrence === 1 ? "tomato" : "manual",
                    note: item.id === "reading" && occurrence === 1 ? "读完本章，整理了两条笔记。关联 [阅读摘录](siyuan://blocks/20260906083000-abcdefg)。" : undefined,
                });
            }
        }
    }
    return {version: 2, items, events, eventTombstones: []};
}
