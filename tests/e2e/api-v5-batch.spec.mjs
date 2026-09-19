/* E2E（T-1285）：公开 API v5 批量写在真实思源内核上的落盘与幂等。
   覆盖：recordEventsBatch 单次持久化、事件带稳定 externalRef 落内核文件、
   重载后同 refs 重放全部 duplicate 且不产生新记录。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("公开 API v5 批量写:真实落盘、重载后幂等重放不重复", async ({page}) => {
    const client = createClient();
    await openCheckin(page);

    const item = makeTestItem("batch");
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const occurredAt = new Date().toISOString();
    const inputs = [
        {itemId: item.id, source: "api", externalRef: `e2e:batch:${runId}:a`, occurredAt},
        {itemId: item.id, source: "api", externalRef: `e2e:batch:${runId}:b`, occurredAt},
    ];

    const first = await page.evaluate(async (payload) => {
        const api = window.siyuanCheckin;
        const results = await api.recordEventsBatch(payload.inputs);
        return {
            kinds: results.map((entry) => entry.kind),
            eventIds: results.map((entry) => entry.eventId),
            eventRefs: results.map((entry) => entry.eventId),
        };
    }, {inputs});
    expect(first.kinds).toEqual(["recorded", "recorded"]);
    expect(first.eventIds.every((id) => typeof id === "string" && id), "recorded results must carry event ids").toBe(true);

    /* 内核存储文件里必须真有这两条,externalRef 原样保留。 */
    const persisted = (await recordedEvents(client, item.id)).filter((event) => event.externalRef && event.externalRef.startsWith(`e2e:batch:${runId}`));
    expect(persisted.length).toBe(2);
    expect(persisted.map((event) => event.externalRef).sort()).toEqual([...inputs.map((input) => input.externalRef)].sort());
    expect(persisted.every((event) => event.source === "api")).toBe(true);

    /* 重载后同 refs 重放:全部 duplicate,内核不新增记录。 */
    await page.reload();
    await openCheckin(page);
    const replay = await page.evaluate(async (payload) => {
        const results = await window.siyuanCheckin.recordEventsBatch(payload.inputs);
        return results.map((entry) => ({kind: entry.kind, eventId: entry.eventId}));
    }, {inputs});
    expect(replay).toEqual([
        {kind: "duplicate", eventId: first.eventIds[0]},
        {kind: "duplicate", eventId: first.eventIds[1]},
    ]);
    expect((await recordedEvents(client, item.id)).filter((event) => event.externalRef && event.externalRef.startsWith(`e2e:batch:${runId}`)).length, "幂等重放不得在内核新增记录").toBe(2);
});
