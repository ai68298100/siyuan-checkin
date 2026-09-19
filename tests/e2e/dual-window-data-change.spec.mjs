/* T-1244 E2E-2：双窗口 onDataChanged 合并。
   思源内核在 putFile 命中 data/storage/petal/<插件>/ 时，会向其它前端实例推 reloadPlugin 的
   dataChangePlugins（kernel/model/push_reload.go、kernel/api/file.go），插件侧收到 onDataChanged。
   本用例锁三件事：跨窗口能看到对方的记录、接收方不回写、来回各一次不产生重复。 */
import {expect, test} from "@playwright/test";
import {apiDescriptor, createClient, instrumentWrites, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("两个窗口对等同步且接收方不回写", async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const writesA = await instrumentWrites(pageA);
    await openCheckin(pageA);
    const pageB = await context.newPage();
    const writesB = await instrumentWrites(pageB);
    await openCheckin(pageB);

    expect((await apiDescriptor(pageB)).version, "两个窗口必须加载同一版公开 API").toBe((await apiDescriptor(pageA)).version);

    const item = makeTestItem("dual");
    await seedStore(client, await snapshotStore(pageA), [item]);
    for (const page of [pageA, pageB]) {
        await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);
    }
    /* 观察窗口从此刻开始：注入与首次合并期间的写入不计入。 */
    await writesA.reset();
    await writesB.reset();

    const eventA = await pageA.evaluate(async (id) => (await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:dual:a:${id}`}))?.id, item.id);
    expect(typeof eventA).toBe("string");
    /* A 自己必须写过主存储，否则下面的「B 零写」是空断言。 */
    await expect.poll(() => writesA.storeWrites().then((paths) => paths.length), {timeout: 20000, message: "未捕获到 A 的主存储写入，监视器失效"}).toBeGreaterThan(0);

    await expect.poll(() => pageB.evaluate((payload) => window.siyuanCheckin.getEvents().some((event) => event.id === payload.eventId && event.itemId === payload.itemId), {itemId: item.id, eventId: eventA}), {
        timeout: 30000, message: "B 窗口未收到 A 的记录",
    }).toBe(true);
    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.source === "api").length, {timeout: 20000}).toBe(1);
    expect(await writesB.storeWrites(), `B 窗口收到对方记录后回写了主存储，全部写入：${JSON.stringify(await writesB.paths())}`).toEqual([]);
    /* T-1246：接收方只是把远端状态合进内存，不得把建议工作流原样再写一遍（那会再触发一轮跨实例推送）。 */
    const auxPaths = await writesB.paths();
    expect(auxPaths.filter((path) => /checkin-suggestion-workflow$/.test(path)), `接收方原样重写了建议工作流：${JSON.stringify(auxPaths)}`).toEqual([]);
    /* 审计是旁路诊断，一个合并窗口内的多次追加应合成至多一次整文件写。 */
    expect(auxPaths.filter((path) => /checkin-store-audit$/.test(path)).length, `审计写入未被合并：${JSON.stringify(auxPaths)}`).toBeLessThanOrEqual(1);
    if (auxPaths.length) console.log(`[e2e] B 未回写主存储，辅助写入 ${auxPaths.length} 次：${[...new Set(auxPaths)].join(", ")}`);

    const eventB = await pageB.evaluate(async (id) => (await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:dual:b:${id}`}))?.id, item.id);
    expect(typeof eventB).toBe("string");
    await expect.poll(() => pageA.evaluate((id) => window.siyuanCheckin.getEvents().some((event) => event.id === id), eventB), {
        timeout: 30000, message: "A 窗口未收到 B 的记录",
    }).toBe(true);
    await expect.poll(() => writesB.storeWrites().then((paths) => paths.length), {timeout: 20000}).toBeGreaterThan(0);

    let settled;
    await expect.poll(async () => {
        const events = (await recordedEvents(client, item.id)).filter((event) => event.itemId === item.id);
        settled = {ids: events.map((event) => event.id).sort(), count: events.length};
        return settled.count;
    }, {timeout: 20000, message: "内核存储应恰好有两条事件"}).toBe(2);
    expect(settled.ids, `事件被重复写入：${JSON.stringify(settled.ids)}`).toEqual([eventA, eventB].sort());

    await pageA.reload();
    await openCheckin(pageA);
    await expect.poll(() => pageA.evaluate((id) => window.siyuanCheckin.getEvents().filter((event) => event.itemId === id).length, item.id), {timeout: 20000}).toBe(2);

    await context.close();
});
