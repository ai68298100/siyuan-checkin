/* E2E（T-1284）：真实思源宿主上验证公开 API v5——版本、新方法形状与只读投影。 */
import {expect, test} from "@playwright/test";
import {openCheckin} from "./helpers/app.mjs";

test("公开 API v5：版本与新增方法在真实宿主可用", async ({page}) => {
    await openCheckin(page);

    const api = await page.evaluate(async () => {
        const api = window.siyuanCheckin;
        if (!api) return {present: false};
        const descriptor = api.describe();
        const today = new Date();
        const endExclusive = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().slice(0, 10);
        const range = api.getEventsInRange({startDate: "2000-01-01", endDateExclusive: endExclusive}, {limit: 100});
        const items = api.queryItems({includeArchived: false, limit: 50});
        const archived = api.queryItems({archivedOnly: true});
        const streaks = api.getStreaks(items.slice(0, 5).map((item) => item.id));
        return {
            present: true,
            version: api.version,
            protocol: api.protocol,
            capabilities: [...api.capabilities],
            capabilitiesSince: {...descriptor.capabilitiesSince},
            rangeShape: {events: Array.isArray(range.events), truncated: typeof range.truncated === "boolean"},
            itemsCount: items.length,
            archivedOnlyArchived: archived.every((item) => item.archived === true),
            streaksShape: streaks.every((entry) => typeof entry.itemId === "string" && typeof entry.current === "number" && typeof entry.longest === "number"),
        };
    });
    expect(api.present).toBe(true);
    expect(api.version).toBe(5);
    expect(api.protocol).toBe("siyuan-checkin");
    expect(api.capabilities).toContain("items.query");
    expect(api.capabilities).toContain("events.range.read");
    expect(api.capabilities).toContain("events.record.batch");
    expect(api.capabilities).toContain("metrics.read");
    expect(api.capabilitiesSince["events.record"]).toBe(4);
    expect(api.capabilitiesSince["metrics.read"]).toBe(5);
    expect(api.rangeShape).toEqual({events: true, truncated: true});
    expect(api.archivedOnlyArchived).toBe(true);
    expect(api.streaksShape).toBe(true);
    expect(api.itemsCount).toBeGreaterThanOrEqual(0);
});
