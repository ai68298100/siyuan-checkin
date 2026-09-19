/* T-1248 宿主生命周期 E2E：真实禁用/启用一轮，验证
   1) 禁用时插件按 onunload 收尾并交出 window.siyuanCheckin；
   2) 拆除后不再有「幽灵写入」（泄漏的定时器或队列会在插件已注销后继续落盘）；
   3) 重新启用后数据完整恢复。 */
import {expect, test} from "@playwright/test";
import {createClient, instrumentWrites, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

const PLUGIN = "siyuan-checkin";

test("禁用后不再写盘，重新启用后数据完整", async ({page}) => {
    const client = createClient();
    const writes = await instrumentWrites(page);
    await openCheckin(page);

    const item = makeTestItem("lifecycle");
    await seedStore(client, await snapshotStore(page), [item]);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);
    const eventId = await page.evaluate(async (id) => (await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:lifecycle:${id}`}))?.id, item.id);
    expect(typeof eventId).toBe("string");
    await expect.poll(async () => (await recordedEvents(client, item.id)).some((event) => event.id === eventId), {timeout: 20000}).toBe(true);

    const disabled = await client.setPetalEnabled(PLUGIN, false);
    expect(disabled.code, `禁用插件失败：${disabled.msg || ""}`).toBe(0);

    /* 宿主给插件实例的拆除预算是 5 秒：API 交出必须在这段时间内完成。 */
    const startedAt = Date.now();
    await page.waitForFunction(() => typeof window.siyuanCheckin === "undefined", undefined, {timeout: 10000});
    const teardownMs = Date.now() - startedAt;
    expect(teardownMs, `禁用后 window.siyuanCheckin 消失耗时 ${teardownMs}ms，超出宿主 5 秒拆除预算`).toBeLessThan(5000);

    /* 拆除收尾自身允许落一次盘（补写与合并后的审计），所以观察窗口从 API 消失之后才开始；
       2.6 秒足够覆盖 1.5 秒审计合并窗口与 1 秒专注心跳——泄漏在这里就会现形。 */
    await writes.reset();
    await page.waitForTimeout(2600);
    expect(await writes.paths(), `插件已注销但仍发生写入：${JSON.stringify(await writes.paths())}`).toEqual([]);

    const enabled = await client.setPetalEnabled(PLUGIN, true);
    expect(enabled.code, `重新启用插件失败：${enabled.msg || ""}`).toBe(0);
    await openCheckin(page);
    await expect.poll(() => page.evaluate((payload) => {
        const events = window.siyuanCheckin.getEvents().filter((event) => event.itemId === payload.itemId);
        return {hasItem: window.siyuanCheckin.getItems().some((entry) => entry.id === payload.itemId), ids: events.map((event) => event.id)};
    }, {itemId: item.id, eventId}), {timeout: 20000}).toEqual({hasItem: true, ids: [eventId]});
});
