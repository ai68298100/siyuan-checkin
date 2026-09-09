export const CHECKIN_API_PROTOCOL = "siyuan-checkin" as const;
export const CHECKIN_API_VERSION = 4 as const;

export const CHECKIN_INTEGRATION_EVENTS = [
    "checkin:item-created",
    "checkin:item-updated",
    "checkin:event-recorded",
    "checkin:event-deleted",
] as const;

export const CHECKIN_CAPABILITIES = [
    "items.read",
    "events.read",
    "events.record",
    "occasions.read",
    "occasions.complete",
    "summary.read",
    "summary.custom",
    "summary.providers",
    "focus.adapters",
    "integrations.events",
    "export.json",
    "export.csv",
] as const;

export type CheckinCapability = typeof CHECKIN_CAPABILITIES[number];

export interface CheckinCapabilityInfo {
    available: boolean;
    localOnly: boolean;
    effect: "read" | "write" | "register" | "export";
}

export interface CheckinApiDescriptor {
    name: "siyuanCheckin";
    protocol: typeof CHECKIN_API_PROTOCOL;
    version: typeof CHECKIN_API_VERSION;
    storeVersion: 2;
    capabilities: readonly CheckinCapability[];
    events: readonly typeof CHECKIN_INTEGRATION_EVENTS[number][];
}

const CAPABILITY_INFO: Record<CheckinCapability, CheckinCapabilityInfo> = {
    "items.read": {available: true, localOnly: true, effect: "read"},
    "events.read": {available: true, localOnly: true, effect: "read"},
    "events.record": {available: true, localOnly: true, effect: "write"},
    "occasions.read": {available: true, localOnly: true, effect: "read"},
    "occasions.complete": {available: true, localOnly: true, effect: "write"},
    "summary.read": {available: true, localOnly: true, effect: "read"},
    "summary.custom": {available: true, localOnly: true, effect: "read"},
    "summary.providers": {available: true, localOnly: false, effect: "register"},
    "focus.adapters": {available: true, localOnly: true, effect: "register"},
    "integrations.events": {available: true, localOnly: true, effect: "read"},
    "export.json": {available: true, localOnly: true, effect: "export"},
    "export.csv": {available: true, localOnly: true, effect: "export"},
};

export function getCheckinCapabilityInfo(): Readonly<Record<CheckinCapability, CheckinCapabilityInfo>> {
    return Object.freeze(Object.fromEntries(CHECKIN_CAPABILITIES.map((name) => [name, Object.freeze({...CAPABILITY_INFO[name]})])) as Record<CheckinCapability, CheckinCapabilityInfo>);
}

export function getCheckinApiDescriptor(): Readonly<CheckinApiDescriptor> {
    return Object.freeze({
        name: "siyuanCheckin",
        protocol: CHECKIN_API_PROTOCOL,
        version: CHECKIN_API_VERSION,
        storeVersion: 2,
        capabilities: Object.freeze([...CHECKIN_CAPABILITIES]),
        events: Object.freeze([...CHECKIN_INTEGRATION_EVENTS]),
    });
}

export function hasCheckinCapability(value: unknown): value is CheckinCapability {
    return typeof value === "string" && (CHECKIN_CAPABILITIES as readonly string[]).includes(value);
}
