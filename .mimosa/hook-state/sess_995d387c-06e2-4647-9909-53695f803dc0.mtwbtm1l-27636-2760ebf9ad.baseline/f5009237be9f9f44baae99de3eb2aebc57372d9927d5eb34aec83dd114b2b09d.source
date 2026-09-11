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
}

interface AchievementsContext {
    totalEvents: number;
    activeDays: number;
    perfectDays: number;
    bestPerfectStreak: number;
    morningCompletions: number;
}

function buildContext(store: CheckinStore): AchievementsContext {
    const activeDays = new Set<string>();
    for (const event of store.events) activeDays.add(event.localDate);

    const dayStatus = new Map<string, {scheduled: number; completed: number}>();
    const today = new Date();
    const earliest = store.items.reduce((minimum, item) => {
        const created = Date.parse(item.createdAt);
        return Number.isNaN(created) ? minimum : Math.min(minimum, created);
    }, Date.now());
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
    for (const event of store.events) {
        const item = store.items.find((candidate) => candidate.id === event.itemId);
        if (item?.timeSlot === "morning") morningCompletions += 1;
    }

    return {
        totalEvents: store.events.length,
        activeDays: activeDays.size,
        perfectDays,
        bestPerfectStreak: bestStreak,
        morningCompletions,
    };
}

export function buildAchievements(store: CheckinStore): Achievement[] {
    const context = buildContext(store);
    const definition: Array<Omit<Achievement, "achieved">> = [
        {id: "first", name: "第一次打卡", description: "迈出坚持的第一步", icon: "🎯", progress: Math.min(context.totalEvents, 1), target: 1},
        {id: "events-50", name: "50 条记录", description: "累计记录 50 条", icon: "🧱", progress: context.totalEvents, target: 50},
        {id: "events-200", name: "200 条记录", description: "累计记录 200 条", icon: "🏗️", progress: context.totalEvents, target: 200},
        {id: "days-7", name: "坚持一周", description: "累计 7 天有打卡", icon: "📅", progress: context.activeDays, target: 7},
        {id: "days-30", name: "坚持一月", description: "累计 30 天有打卡", icon: "🌙", progress: context.activeDays, target: 30},
        {id: "perfect-1", name: "完美一天", description: "单日完成全部安排", icon: "✨", progress: Math.min(context.perfectDays, 1), target: 1},
        {id: "perfect-10", name: "十次全清", description: "累计 10 个全清日", icon: "🏅", progress: context.perfectDays, target: 10},
        {id: "streak-7", name: "连续七天全清", description: "连续 7 天完成全部安排", icon: "🔥", progress: context.bestPerfectStreak, target: 7},
        {id: "early-bird", name: "晨间早起鸟", description: "晨间打卡 20 次", icon: "🌅", progress: context.morningCompletions, target: 20},
    ];
    return definition.map((entry) => ({...entry, achieved: entry.progress >= entry.target}));
}
