import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem} from "./types";
import type {CustomSummaryRange, SummaryContext, SummaryRange} from "./analytics";
import type {AgentSuggestion} from "./agent-suggestions";
import {CHECKIN_INTEGRATION_EVENTS} from "./api-contract";

export const CHECKIN_EVENT_NAMES = {
    itemCreated: "checkin:item-created",
    itemUpdated: "checkin:item-updated",
    eventRecorded: "checkin:event-recorded",
    eventDeleted: "checkin:event-deleted",
    suggestionWorkflowUpdated: "checkin:suggestion-workflow-updated",
} as const;

// Keep the runtime map aligned with the public protocol snapshot.
if (Object.values(CHECKIN_EVENT_NAMES).some((name) => !(CHECKIN_INTEGRATION_EVENTS as readonly string[]).includes(name))) {
    throw new Error("小驴打卡事件契约不一致");
}

export interface FocusAdapter {
    id: string;
    name: string;
    canStart(item: CheckinItem): boolean;
    start(item: CheckinItem): Promise<void>;
    stop(): Promise<void>;
}

export interface SummaryProvider {
    id: string;
    name: string;
    summarize(input: {
        range: SummaryRange;
        customRange?: CustomSummaryRange;
        items: CheckinItem[];
        events: CheckinEvent[];
        context?: SummaryContext;
    }): Promise<string | {text: string; suggestions?: AgentSuggestion[]}>;
}

export type CheckinEventListener = (event: CheckinIntegrationEvent) => void;

export const CHECKIN_API_NAME = "siyuanCheckin";

const SUGGESTION_EVENT_ID_MAX_LENGTH = 160;

export function cloneIntegrationEvent(event: CheckinIntegrationEvent): CheckinIntegrationEvent | undefined {
    if (!event || typeof event !== "object") return undefined;
    if (event.type === "suggestion-workflow-updated") {
        if (typeof event.suggestionId !== "string" || !event.suggestionId.trim() || event.suggestionId.length > SUGGESTION_EVENT_ID_MAX_LENGTH) return undefined;
        if (event.suggestionStatus !== "pending" && event.suggestionStatus !== "confirmed" && event.suggestionStatus !== "cancelled" && event.suggestionStatus !== "failed") return undefined;
        return {type: event.type, suggestionId: event.suggestionId.trim(), suggestionStatus: event.suggestionStatus};
    }
    if (event.type === "item-created" || event.type === "item-updated") {
        return {...event, item: event.item ? {...event.item, archivePeriods: event.item.archivePeriods?.map((period) => ({...period})), schedule: event.item.schedule ? {...event.item.schedule} : event.item.schedule} : undefined};
    }
    if (event.type === "event-recorded" || event.type === "event-deleted") {
        return {...event, event: event.event ? {...event.event} : undefined, deletedEvents: event.deletedEvents?.map((entry) => ({...entry}))};
    }
    return undefined;
}

export function emitIntegrationEvent(event: CheckinIntegrationEvent): void {
    if (typeof window === "undefined") {
        return;
    }
    const safe = cloneIntegrationEvent(event);
    if (!safe) return;
    window.dispatchEvent(new CustomEvent(toExternalEventName(safe), {detail: safe}));
}

export function toExternalEventName(event: CheckinIntegrationEvent): string {
    switch (event.type) {
        case "item-created":
            return CHECKIN_EVENT_NAMES.itemCreated;
        case "item-updated":
            return CHECKIN_EVENT_NAMES.itemUpdated;
        case "event-recorded":
            return CHECKIN_EVENT_NAMES.eventRecorded;
        case "event-deleted":
            return CHECKIN_EVENT_NAMES.eventDeleted;
        case "suggestion-workflow-updated":
            return CHECKIN_EVENT_NAMES.suggestionWorkflowUpdated;
    }
}
