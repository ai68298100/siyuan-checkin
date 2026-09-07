import type {CheckinEvent, CheckinIntegrationEvent, CheckinItem} from "./types";
import type {CustomSummaryRange, SummaryContext, SummaryRange} from "./analytics";

export const CHECKIN_EVENT_NAMES = {
    itemCreated: "checkin:item-created",
    itemUpdated: "checkin:item-updated",
    eventRecorded: "checkin:event-recorded",
    eventDeleted: "checkin:event-deleted",
} as const;

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
    }): Promise<string>;
}

export type CheckinEventListener = (event: CheckinIntegrationEvent) => void;

export const CHECKIN_API_NAME = "siyuanCheckin";

export function emitIntegrationEvent(event: CheckinIntegrationEvent): void {
    if (typeof window === "undefined") {
        return;
    }
    window.dispatchEvent(new CustomEvent(toExternalEventName(event), {detail: event}));
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
    }
}
