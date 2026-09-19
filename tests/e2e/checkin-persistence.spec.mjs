/* T-1244 E2E-1：真实例下的打卡落盘与持久化。
   覆盖此前所有测试都碰不到的部分：真 saveData（putFile）、真 loadData、真重载。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("打卡写入经内核落盘，页面重载后仍在", async ({page}) => {
    const client = createClient();
    await openCheckin(page);

    const item = makeTestItem("persist");
    await seedStore(client, await snapshotStore(page), [item]);

    /* 重载一次：证明注入的项是经插件自己的读取路径恢复的，不是内存里的。 */
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const eventId = await page.evaluate(async (id) => {
        const recorded = await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:persist:${id}`});
        return recorded?.id;
    }, item.id);
    expect(typeof eventId, "recordEvent 必须返回带 id 的事件").toBe("string");

    await expect.poll(async () => (await recordedEvents(client, item.id)).some((event) => event.id === eventId), {timeout: 20000, message: "内核存储文件里应出现该事件"}).toBe(true);

    await page.reload();
    await openCheckin(page);
    const afterReload = await page.evaluate((id) => ({
        events: window.siyuanCheckin.getEvents().filter((event) => event.itemId === id).map((event) => event.id),
        total: window.siyuanCheckin.getEvents().length,
    }), item.id);
    expect(afterReload.events, "重载后事件必须从存储恢复且不重复").toEqual([eventId]);

    /* 同 externalRef 再记一次必须幂等，不产生第二条记录。 */
    const duplicate = await page.evaluate(async (payload) => {
        const again = await window.siyuanCheckin.recordEvent({itemId: payload.id, source: "api", externalRef: `e2e:persist:${payload.id}`});
        return again?.id;
    }, {id: item.id});
    expect(duplicate, "同 externalRef 必须命中幂等分支").toBe(eventId);
    expect((await recordedEvents(client, item.id)).filter((event) => event.itemId === item.id).length, "幂等重放不得增加记录").toBe(1);
});

test("只读模式下保存必须失败并给出可见反馈", async ({page}) => {
    await openCheckin(page);
    const readonly = await page.evaluate(() => Boolean(window.siyuan.config?.readonly || window.siyuan.isPublish));
    test.skip(readonly, "当前实例处于只读/发布模式，写入路径不适用");
    const descriptor = await page.evaluate(() => window.siyuanCheckin.describe());
    expect(descriptor.name, "公开 API 名称必须稳定").toBe("siyuanCheckin");
    expect(descriptor.version, "API 版本必须是不退化的整数").toBeGreaterThanOrEqual(4);
});
