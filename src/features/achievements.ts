/* 7.0 成就徽章：纯函数引擎，全部从事件与项目配置推导，可重放、可测试。 */

import {dateKey, isComplete, isItemAvailableOnDate, isScheduledToday} from "../model";
import type {CheckinStore} from "../types";

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    achieved: boolean;
    progress: number;
    target: number;
    category: "milestone" | "consistency" | "quality" | "reflection" | "rhythm";
}

interface AchievementsContext {
    totalEvents: number;
    activeDays: number;
    perfectDays: number;
    bestPerfectStreak: number;
    morningCompletions: number;
    eveningCompletions: number;
    notedEvents: number;
    photoEvents: number;
    tomatoEvents: number;
    usedItems: number;
    usedSources: number;
}

function buildContext(store: CheckinStore, asOf: Date): AchievementsContext {
    const activeDays = new Set<string>();
    for (const event of store.events) activeDays.add(event.localDate);

    const dayStatus = new Map<string, {scheduled: number; completed: number}>();
    const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 12);
    const earliest = store.items.reduce((minimum, item) => {
        const created = Date.parse(item.createdAt);
        return Number.isNaN(created) ? minimum : Math.min(minimum, created);
    }, today.getTime());
    const start = new Date(new Date(earliest).getFullYear(), new Date(earliest).getMonth(), new Date(earliest).getDate());
    for (let date = new Date(start); dateKey(date) <= dateKey(today); date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) {
        let scheduled = 0;
        let completed = 0;
        for (const item of store.items) {
            if (item.archived || !isItemAvailableOnDate(item, date) || !isScheduledToday(item, date)) continue;
            scheduled += 1;
            if (isComplete(store, item, date)) completed += 1;
        }
        if (scheduled > 0) dayStatus.set(dateKey(date), {scheduled, completed});
    }

    let perfectDays = 0;
    let bestStreak = 0;
    let streak = 0;
    const sortedDays = [...dayStatus.keys()].sort();
    for (const day of sortedDays) {
        const status = dayStatus.get(day)!;
        if (status.completed >= status.scheduled) {
            perfectDays += 1;
            streak += 1;
            bestStreak = Math.max(bestStreak, streak);
        } else {
            streak = 0;
        }
    }

    let morningCompletions = 0;
    let eveningCompletions = 0;
    for (const event of store.events) {
        const item = store.items.find((candidate) => candidate.id === event.itemId);
        if (item?.timeSlot === "morning") morningCompletions += 1;
        if (item?.timeSlot === "evening") eveningCompletions += 1;
    }

    return {
        totalEvents: store.events.length,
        activeDays: activeDays.size,
        perfectDays,
        bestPerfectStreak: bestStreak,
        morningCompletions,
        eveningCompletions,
        notedEvents: store.events.filter((event) => Boolean(event.note?.trim())).length,
        photoEvents: store.events.filter((event) => Boolean(event.attachment)).length,
        tomatoEvents: store.events.filter((event) => event.source === "tomato").length,
        usedItems: new Set(store.events.map((event) => event.itemId)).size,
        usedSources: new Set(store.events.map((event) => event.source)).size,
    };
}

export function buildAchievements(store: CheckinStore, asOf = new Date()): Achievement[] {
    const context = buildContext(store, asOf);
    const definition: Array<Omit<Achievement, "achieved">> = [
        {id: "first", name: "第一次打卡", description: "迈出坚持的第一步", icon: "🎯", progress: context.totalEvents, target: 1, category: "milestone"},
        {id: "events-10", name: "初露锋芒", description: "累计记录 10 条", icon: "🌱", progress: context.totalEvents, target: 10, category: "milestone"},
        {id: "events-50", name: "积少成多", description: "累计记录 50 条", icon: "🧱", progress: context.totalEvents, target: 50, category: "milestone"},
        {id: "events-200", name: "稳定记录者", description: "累计记录 200 条", icon: "🏗️", progress: context.totalEvents, target: 200, category: "milestone"},
        {id: "events-500", name: "行动档案馆", description: "累计记录 500 条", icon: "🏛️", progress: context.totalEvents, target: 500, category: "milestone"},
        {id: "days-7", name: "坚持一周", description: "累计 7 天有打卡", icon: "📅", progress: context.activeDays, target: 7, category: "consistency"},
        {id: "days-30", name: "坚持一月", description: "累计 30 天有打卡", icon: "🌙", progress: context.activeDays, target: 30, category: "consistency"},
        {id: "days-100", name: "百日足迹", description: "累计 100 天有打卡", icon: "🗓️", progress: context.activeDays, target: 100, category: "consistency"},
        {id: "perfect-1", name: "完美一天", description: "单日完成全部安排", icon: "✨", progress: context.perfectDays, target: 1, category: "quality"},
        {id: "perfect-10", name: "十次全清", description: "累计 10 个全清日", icon: "🏅", progress: context.perfectDays, target: 10, category: "quality"},
        {id: "perfect-30", name: "全清专家", description: "累计 30 个全清日", icon: "💎", progress: context.perfectDays, target: 30, category: "quality"},
        {id: "streak-3", name: "三日连胜", description: "连续 3 天完成全部安排", icon: "⚡", progress: context.bestPerfectStreak, target: 3, category: "quality"},
        {id: "streak-7", name: "连续七天全清", description: "连续 7 天完成全部安排", icon: "🔥", progress: context.bestPerfectStreak, target: 7, category: "quality"},
        {id: "streak-14", name: "双周不辍", description: "连续 14 天完成全部安排", icon: "🏆", progress: context.bestPerfectStreak, target: 14, category: "quality"},
        {id: "notes-5", name: "复盘起步", description: "为 5 条记录写下备注", icon: "✍️", progress: context.notedEvents, target: 5, category: "reflection"},
        {id: "notes-30", name: "思考留痕", description: "为 30 条记录写下备注", icon: "📓", progress: context.notedEvents, target: 30, category: "reflection"},
        {id: "photos-5", name: "影像日记", description: "为 5 条记录添加照片", icon: "📷", progress: context.photoEvents, target: 5, category: "reflection"},
        {id: "items-3", name: "多线成长", description: "在 3 个不同项目留下记录", icon: "🧩", progress: context.usedItems, target: 3, category: "reflection"},
        {id: "sources-2", name: "多元记录", description: "使用 2 种记录来源", icon: "🔗", progress: context.usedSources, target: 2, category: "reflection"},
        {id: "early-bird", name: "晨间早起鸟", description: "晨间打卡 20 次", icon: "🌅", progress: context.morningCompletions, target: 20, category: "rhythm"},
        {id: "night-owl", name: "夜间收尾者", description: "晚间打卡 20 次", icon: "🌃", progress: context.eveningCompletions, target: 20, category: "rhythm"},
        {id: "tomato-10", name: "专注启动", description: "通过番茄钟记录 10 次", icon: "🍅", progress: context.tomatoEvents, target: 10, category: "rhythm"},
    ];
    return definition.map((entry) => ({...entry, achieved: entry.progress >= entry.target}));
}
