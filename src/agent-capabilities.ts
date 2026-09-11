/* 思源智能体能力注册：从 index.ts 外置（T-022）。
   所有状态访问经 AgentCapabilityDeps 回调进行，保证处理器在请求时读取实时数据。 */
import {dateKey, getItemRevisionForDate, getProgress, isComplete, isItemAvailableOnDate, makeId, normalizeItem as normalizeCheckinItem} from "./model";
import {currentCalendarDate, captureActionMoment, calendarDateFromKey, formatNumber, getRecordStep, isValidLocalDateInput} from "./shared";
import {getOccurrenceDate, getVisibleOccasions, isOccasionCompleted, normalizeOccasion, type Occasion} from "./occasions";
import {buildHabitInsights} from "./features/insights";
import {buildCoachingSuggestions} from "./features/coaching";
import {buildSummaryContext, type SummaryRange} from "./analytics";
import type {CheckinEvent, CheckinItem, CheckinStore} from "./types";

export interface AgentAddOptions {
    name: string;
    title?: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    effects?: {localRead?: boolean; localWrite?: boolean; dataEgress?: boolean; externalCost?: boolean};
    handler: (args: Record<string, unknown>) => Promise<{result?: string; structuredContent?: unknown; error?: string}>;
}

export interface AgentCapabilityDeps {
    addCapability: (options: AgentAddOptions) => void;
    getStore(): CheckinStore;
    getOccasionStore(): {occasions: Occasion[]};
    canRecord(): boolean;
    cloneItem(item: CheckinItem): CheckinItem;
    revisionFingerprint(item: CheckinItem, date: Date): string;
    enqueueMutation<T>(fn: () => Promise<T>): Promise<T>;
    recordEvent(item: CheckinItem, value: number, moment: {occurredAt: string; localDate: string}, fingerprint: string | undefined, note?: string): Promise<CheckinEvent | undefined>;
    setOccasionCompleted(id: string, occurrenceDate: string, completed: boolean): Promise<boolean>;
    getSummaryContext(range: SummaryRange): {totalEvents: number; completedItems: number; scheduledItems: number; items: Array<{name: string; completedDays: number; scheduledDays: number; completionRate: number}>};
    getCustomSummaryContext(range: {startDate: string; endDate: string}): {totalEvents: number} | undefined;
    createItem(created: CheckinItem): Promise<void>;
    createOccasion(created: Occasion): Promise<void>;
}

type AgentArgs = Record<string, unknown>;

export function registerAgentCapabilities(deps: AgentCapabilityDeps): void {
    deps.addCapability({
        name: "checkin-summary-context",
        title: "读取小驴打卡复盘上下文",
        description: "读取小驴打卡的日、周、月或自定义日期范围数据，用于生成复盘、趋势和完成率分析。该能力只读本插件数据，不会写入记录，也不会自行访问外部网络。",
        inputSchema: {
            type: "object",
            properties: {
                range: {type: "string", enum: ["day", "week", "month", "custom"], description: "总结范围，默认为 week"},
                startDate: {type: "string", description: "自定义范围开始日期，格式 YYYY-MM-DD"},
                endDate: {type: "string", description: "自定义范围结束日期，格式 YYYY-MM-DD"},
            },
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const range: SummaryRange | "custom" = args.range === "day" || args.range === "week" || args.range === "month" || args.range === "custom" ? args.range : "week";
            if (range === "custom") {
                const startDate = typeof args.startDate === "string" ? args.startDate : "";
                const endDate = typeof args.endDate === "string" ? args.endDate : "";
                if (!isValidLocalDateInput(startDate) || !isValidLocalDateInput(endDate) || startDate > endDate) return {error: "自定义日期范围无效，请使用 YYYY-MM-DD。"};
                const context = deps.getCustomSummaryContext({startDate, endDate});
                return context ? {result: `小驴打卡自定义范围 ${startDate} 至 ${endDate}，共 ${context.totalEvents} 条记录。`, structuredContent: context} : {error: "打卡数据尚未准备好。"};
            }
            const context = deps.getSummaryContext(range);
            return context ? {result: `小驴打卡${range === "day" ? "今日" : range === "month" ? "本月" : "本周"}共有 ${context.totalEvents} 条记录。`, structuredContent: context} : {error: "打卡数据尚未准备好。"};
        },
    });
    deps.addCapability({
        name: "checkin-list-items",
        title: "列出小驴打卡项目",
        description: "列出当前可用的打卡项目及其类型、目标、单位、分组、优先级和频率，帮助智能体选择正确的项目。该能力只读本插件数据。",
        inputSchema: {
            type: "object",
            properties: {includeArchived: {type: "boolean", description: "是否包含已归档项目，默认为 false"}},
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const includeArchived = args.includeArchived === true;
            const items = deps.getStore().items
                .filter((item) => includeArchived || !item.archived)
                .map((item) => ({
                    id: item.id, name: item.name, icon: item.icon, kind: item.kind,
                    target: item.target, unit: item.unit, schedule: item.schedule,
                    group: item.group || "", priority: item.priority || "medium",
                    timeSlot: item.timeSlot || "any", archived: Boolean(item.archived),
                }));
            return {result: `找到 ${items.length} 个${includeArchived ? "（含归档）" : "可用的"}打卡项目。`, structuredContent: {items, count: items.length}};
        },
    });
    deps.addCapability({
        name: "checkin-item-insights",
        title: "读取单项打卡洞察",
        description: "读取指定打卡项目的完成率、连续记录、周期趋势和明细，用于回答某个习惯的表现、波动和复盘问题。该能力只读本插件数据。",
        inputSchema: {
            type: "object",
            properties: {
                itemId: {type: "string", description: "打卡项目 ID，可先调用 checkin-list-items 获取"},
                days: {type: "integer", minimum: 7, maximum: 366, description: "回看天数，默认为 84，范围 7-366"},
            },
            required: ["itemId"],
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const itemId = typeof args.itemId === "string" ? args.itemId.trim() : "";
            const item = deps.getStore().items.find((candidate) => candidate.id === itemId && !candidate.archived);
            if (!item) return {error: "找不到对应的未归档打卡项目，请先调用 checkin-list-items。"};
            const requestedDays = typeof args.days === "number" && Number.isFinite(args.days) ? Math.round(args.days) : 84;
            const days = Math.max(7, Math.min(366, requestedDays));
            const report = buildHabitInsights(deps.getStore(), item.id, {days, asOf: currentCalendarDate()});
            const suggestions = buildCoachingSuggestions(report);
            const rate = report.aggregates.completionRate === null ? "暂无" : `${report.aggregates.completionRate}%`;
            return {
                result: `${item.name}近 ${days} 天完成率 ${rate}，当前连续 ${report.currentStreak} 天，最长连续 ${report.longestStreak} 天。`,
                structuredContent: {
                    item: deps.cloneItem(item),
                    range: {startDate: report.startDate, endDate: report.endDate, days},
                    aggregates: report.aggregates,
                    currentStreak: report.currentStreak,
                    longestStreak: report.longestStreak,
                    weeklyTrend: report.weeklyTrend,
                    totalsByUnit: report.totalsByUnit,
                    days: report.days,
                    records: report.records,
                    suggestions,
                },
            };
        },
    });
    deps.addCapability({
        name: "checkin-record-event",
        title: "记录一次小驴打卡",
        description: "在用户明确要求执行时，为指定打卡项目记录一次进度。会遵守项目的日程、类型、单位和完成状态，并使用插件现有并发锁持久化。该能力会修改本地打卡数据。",
        inputSchema: {
            type: "object",
            properties: {
                itemId: {type: "string", description: "打卡项目 ID，可先调用 checkin-list-items 获取"},
                value: {type: "number", minimum: 0, description: "本次记录的数值；省略时使用该类型的默认步长"},
                unit: {type: "string", description: "单位，必须与项目当前版本一致；省略时自动使用项目单位"},
                note: {type: "string", maxLength: 500, description: "可选备注"},
            },
            required: ["itemId"],
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            if (!deps.canRecord()) return {error: "打卡数据尚未准备好。"};
            const itemId = typeof args.itemId === "string" ? args.itemId.trim() : "";
            const item = deps.getStore().items.find((candidate) => candidate.id === itemId && !candidate.archived);
            const moment = captureActionMoment();
            const actionDate = calendarDateFromKey(moment.localDate);
            if (!item || !isItemAvailableOnDate(item, actionDate)) return {error: "找不到今日可用的打卡项目。"};
            const revision = getItemRevisionForDate(item, actionDate);
            if (revision.kind === "binary" && isComplete(deps.getStore(), item, actionDate)) return {error: "该打卡项目今天已经完成。"};
            const value = args.value === undefined
                ? (revision.schedule.type === "quota" && revision.schedule.quota?.countMode === "dates" ? 1 : revision.kind === "binary" ? 1 : getRecordStep(revision.kind, revision.unit))
                : args.value;
            if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return {error: "记录数值必须是大于或等于 0 的有限数字。"};
            if (args.unit !== undefined && (typeof args.unit !== "string" || args.unit.trim() !== revision.unit)) return {error: `单位不匹配，该项目当前单位为“${revision.unit || "次"}”。`};
            const note = args.note === undefined ? undefined : typeof args.note === "string" ? args.note.slice(0, 500) : "";
            const expectedRevisionFingerprint = deps.revisionFingerprint(item, actionDate);
            const event = await deps.enqueueMutation(() => deps.recordEvent(item, value, moment, expectedRevisionFingerprint, note));
            if (!event) return {error: "记录未执行，项目可能已在其他窗口更新或今日不可记录。"};
            const current = deps.getStore().items.find((candidate) => candidate.id === item.id) || item;
            const target = revision.schedule.type === "quota" ? revision.schedule.quota?.amount || revision.target : revision.target;
            return {
                result: `已为“${current.name}”记录 ${formatNumber(event.value)}${event.unit || "次"}。`,
                structuredContent: {
                    item: {id: current.id, name: current.name, icon: current.icon},
                    event,
                    progress: getProgress(deps.getStore(), current, actionDate),
                    target,
                    unit: revision.unit,
                    localDate: moment.localDate,
                },
            };
        },
    });
    deps.addCapability({
        name: "checkin-list-occasions",
        title: "读取小驴打卡日期事项",
        description: "列出生日、纪念日和定时事项，并返回今天或提前提醒窗口内的事项。该能力只读本地数据。",
        inputSchema: {type: "object", properties: {includeDisabled: {type: "boolean", description: "是否包含已停用事项"}}, additionalProperties: false},
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const includeDisabled = args.includeDisabled === true;
            const occasions = deps.getOccasionStore().occasions.filter((item) => includeDisabled || item.enabled).map((item) => ({...item, completedDates: [...item.completedDates]}));
            const upcoming = getVisibleOccasions({version: 1, occasions: deps.getOccasionStore().occasions}, currentCalendarDate()).map((item) => ({id: item.id, name: item.name, kind: item.kind, occurrenceDate: item.occurrenceDate, daysUntil: item.daysUntil, status: item.status, completed: isOccasionCompleted(item, item.occurrenceDate)}));
            return {result: "找到 " + occasions.length + " 个日期事项，当前提醒窗口内有 " + upcoming.length + " 个。", structuredContent: {occasions, upcoming}};
        },
    });
    deps.addCapability({
        name: "checkin-complete-occasion",
        title: "处理小驴打卡日期事项",
        description: "在用户明确要求时标记生日、纪念日或定时事项为已处理或未处理，并保存到本地。",
        inputSchema: {type: "object", properties: {id: {type: "string", description: "事项 ID"}, occurrenceDate: {type: "string", description: "发生日期 YYYY-MM-DD"}, completed: {type: "boolean", description: "是否标记为已处理"}}, required: ["id", "occurrenceDate", "completed"], additionalProperties: false},
        outputSchema: {type: "object"},
        effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const id = typeof args.id === "string" ? args.id.trim() : "";
            const occurrenceDate = typeof args.occurrenceDate === "string" ? args.occurrenceDate : "";
            if (!id || !isValidLocalDateInput(occurrenceDate) || typeof args.completed !== "boolean") return {error: "事项 ID、日期或处理状态无效。"};
            const item = deps.getOccasionStore().occasions.find((candidate) => candidate.id === id);
            if (!item) return {error: "找不到对应的日期事项。"};
            const ok = await deps.enqueueMutation(() => deps.setOccasionCompleted(id, occurrenceDate, args.completed as boolean));
            return ok ? {result: (args.completed ? "已处理" : "已取消处理") + "日期事项“" + item.name + "”。", structuredContent: {id, occurrenceDate, completed: args.completed}} : {error: "事项状态保存失败。"};
        },
    });
    deps.addCapability({
        name: "checkin-list-upcoming",
        title: "查询小驴打卡近期事项",
        description: "查询未来指定天数内即将发生的日期事项（生日、还款、体检等），按剩余天数排序。该能力只读本地数据。",
        inputSchema: {type: "object", properties: {days: {type: "number", description: "查询未来多少天，默认 30，最大 365"}}, additionalProperties: false},
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const days = Math.min(365, Math.max(1, Math.round(Number(args.days) || 30)));
            const today = dateKey(currentCalendarDate());
            const horizon = dateKey(new Date(currentCalendarDate().getFullYear(), currentCalendarDate().getMonth(), currentCalendarDate().getDate() + days));
            const items = deps.getOccasionStore().occasions.filter((item) => item.enabled)
                .map((item) => ({item, next: getOccurrenceDate(item, today)}))
                .filter((entry) => typeof entry.next === "string" && entry.next <= horizon)
                .sort((left, right) => (left.next as string).localeCompare(right.next as string));
            return {result: "未来 " + days + " 天共有 " + items.length + " 个日期事项。", structuredContent: {days, occasions: items.map(({item, next}) => ({id: item.id, name: item.name, kind: item.kind, date: next, repeat: item.recurrence, note: item.note}))}};
        },
    });
    deps.addCapability({
        name: "checkin-weekly-report",
        title: "生成小驴打卡周报",
        description: "根据最近一周的打卡记录生成纯文本周报，包含完成率、亮点与待改进。该能力只读本地数据。",
        inputSchema: {type: "object", properties: {}, additionalProperties: false},
        outputSchema: {type: "object"},
        effects: {localRead: true, dataEgress: true, externalCost: false},
        handler: async () => {
            const summary = buildSummaryContext(deps.getStore(), "week");
            const rate = summary.scheduledItems ? Math.round((summary.completedItems / summary.scheduledItems) * 100) : 0;
            const top = [...summary.items].sort((left, right) => right.completionRate - left.completionRate).slice(0, 3);
            const lines = [
                "本周共 " + summary.totalEvents + " 条记录，" + summary.completedItems + "/" + summary.scheduledItems + " 项有完成（" + rate + "%）。",
                ...top.map((item) => "· " + item.name + "：" + item.completedDays + "/" + item.scheduledDays + " 天（" + item.completionRate + "%）"),
            ];
            return {result: lines.join("\n"), structuredContent: {totalEvents: summary.totalEvents, completedItems: summary.completedItems, scheduledItems: summary.scheduledItems, rate}};
        },
    });
    deps.addCapability({
        name: "checkin-create-item",
        title: "代建小驴打卡项",
        description: "在用户明确要求时创建一个新的打卡项目（名称必填，支持按时长/按次数等类型）。",
        inputSchema: {
            type: "object",
            properties: {
                name: {type: "string", description: "项目名称"},
                kind: {type: "string", enum: ["binary", "count", "duration", "quantity", "custom"], description: "记录类型，默认 binary"},
                target: {type: "number", description: "目标值，默认 1"},
                unit: {type: "string", description: "单位，默认 次"},
                group: {type: "string", description: "分组"},
            },
            required: ["name"],
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const name = typeof args.name === "string" ? args.name.trim().slice(0, 40) : "";
            if (!name) return {error: "项目名称无效。"};
            if (deps.getStore().items.some((candidate) => !candidate.archived && candidate.name === name)) return {error: "已存在同名打卡项。"};
            const kind = args.kind === "count" || args.kind === "duration" || args.kind === "quantity" || args.kind === "custom" ? args.kind : "binary";
            const target = Number.isFinite(Number(args.target)) && Number(args.target) > 0 ? Number(args.target) : 1;
            const now = new Date().toISOString();
            const created = normalizeCheckinItem({id: makeId("item"), name, icon: "✓", kind, target, unit: typeof args.unit === "string" && args.unit.trim() ? args.unit.trim().slice(0, 16) : "次", schedule: {type: "daily"}, group: typeof args.group === "string" ? args.group.trim().slice(0, 32) : "", createdDate: dateKey(currentCalendarDate()), createdAt: now, updatedAt: now});
            if (!created) return {error: "打卡项参数无效。"};
            await deps.createItem(created);
            return {result: "已创建打卡项“" + created.name + "”。", structuredContent: {id: created.id, name: created.name}};
        },
    });
    deps.addCapability({
        name: "checkin-create-occasion",
        title: "代建小驴打卡日期事项",
        description: "在用户明确要求时创建一个日期事项（如生日提醒、还款提醒）。名称与日期必填，重复方式默认一次性。",
        inputSchema: {
            type: "object",
            properties: {
                name: {type: "string", description: "事项名称"},
                date: {type: "string", description: "日期 YYYY-MM-DD"},
                recurrence: {type: "string", enum: ["once", "annual", "monthly", "weekly"], description: "重复方式，默认 once"},
            },
            required: ["name", "date"],
            additionalProperties: false,
        },
        outputSchema: {type: "object"},
        effects: {localRead: true, localWrite: true, dataEgress: true, externalCost: false},
        handler: async (args) => {
            const name = typeof args.name === "string" ? args.name.trim().slice(0, 120) : "";
            const date = typeof args.date === "string" ? args.date.trim() : "";
            const recurrence = args.recurrence === "annual" || args.recurrence === "monthly" || args.recurrence === "weekly" ? args.recurrence : "once";
            if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return {error: "事项名称或日期无效。"};
            const created = normalizeOccasion({name, kind: "scheduled", date, recurrence, remindBeforeDays: 3, enabled: true});
            if (!created) return {error: "日期事项参数无效。"};
            await deps.createOccasion(created);
            return {result: "已创建日期事项“" + created.name + "”（" + date + "）。", structuredContent: {id: created.id, name: created.name, date}};
        },
    });
}

