import {t} from "../i18n";
import type {SummaryContext, ItemSummary} from "../analytics";

export type LocalSummaryTone = "empty" | "high" | "steady" | "starting";

export interface LocalSummaryModel {
    tone: LocalSummaryTone;
    rate: number;
    totalEvents: number;
    completedItems: number;
    scheduledItems: number;
    startDate: string;
    endDate: string;
    topItem?: Pick<ItemSummary, "itemId" | "name" | "completionRate" | "eventCount">;
    focusItem?: Pick<ItemSummary, "itemId" | "name" | "completionRate" | "eventCount">;
}

function itemScore(item: ItemSummary): [number, number, string] {
    return [item.completionRate, item.eventCount, item.name];
}

function compareBest(left: ItemSummary, right: ItemSummary): number {
    const [leftRate, leftEvents, leftName] = itemScore(left);
    const [rightRate, rightEvents, rightName] = itemScore(right);
    return rightRate - leftRate || rightEvents - leftEvents || leftName.localeCompare(rightName, "zh-CN");
}

function compareFocus(left: ItemSummary, right: ItemSummary): number {
    const [leftRate, leftEvents, leftName] = itemScore(left);
    const [rightRate, rightEvents, rightName] = itemScore(right);
    return leftRate - rightRate || leftEvents - rightEvents || leftName.localeCompare(rightName, "zh-CN");
}

function snapshotItem(item: ItemSummary): LocalSummaryModel["topItem"] {
    return {itemId: item.itemId, name: item.name, completionRate: item.completionRate, eventCount: item.eventCount};
}

export function buildLocalSummaryModel(summary: SummaryContext): LocalSummaryModel {
    const rate = summary.scheduledItems ? Math.round(summary.completedItems / summary.scheduledItems * 100) : 0;
    const scheduledItems = summary.items.filter((item) => item.scheduledDays > 0 || Boolean(item.quota?.elapsedPeriods));
    const best = [...summary.items].sort(compareBest)[0];
    const focus = [...scheduledItems].sort(compareFocus)[0];
    const tone: LocalSummaryTone = !summary.totalEvents && !summary.completedItems ? "empty" : rate >= 80 ? "high" : rate >= 50 ? "steady" : "starting";
    return {
        tone,
        rate,
        totalEvents: summary.totalEvents,
        completedItems: summary.completedItems,
        scheduledItems: summary.scheduledItems,
        startDate: summary.startDate,
        endDate: summary.endDate,
        ...(best ? {topItem: snapshotItem(best)} : {}),
        ...(focus ? {focusItem: snapshotItem(focus)} : {}),
    };
}

export function buildLocalSummaryText(summary: SummaryContext): string {
    const model = buildLocalSummaryModel(summary);
    const lines = [t(`review.localHeadline${model.tone === "high" ? "High" : model.tone === "steady" ? "Steady" : model.tone === "starting" ? "Starting" : "Empty"}`)];
    if (model.tone === "empty") {
        lines.push(t("review.localEmptyBody", {start: model.startDate, end: model.endDate}));
        return lines.join("\n");
    }
    lines.push(t("review.localBody", {done: model.completedItems, scheduled: model.scheduledItems, rate: model.rate, events: model.totalEvents}));
    lines.push(t("review.localRange", {start: model.startDate, end: model.endDate}));
    if (model.topItem) lines.push(t("review.localTop", {name: model.topItem.name, rate: model.topItem.completionRate, events: model.topItem.eventCount}));
    if (model.focusItem && model.focusItem.itemId !== model.topItem?.itemId) lines.push(t("review.localFocus", {name: model.focusItem.name, rate: model.focusItem.completionRate}));
    return lines.join("\n");
}
