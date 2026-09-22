/* E2E（T-1403/T-1388 前置）：健康收件箱真实内核验证——
   模拟快捷指令：经内核 appendBlock 向收件箱文档追加一行
   「health:steps:<日期> 数值」→ 重载插件（启动摄取）→ 断言幂等入库（source api）。
   重复行/重复摄取不重复记账；真实落盘。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("健康收件箱:内核行启动摄取真实落盘,重复行不重复记账", async ({page}) => {
    test.setTimeout(180_000);
    const client = createClient();
    await openCheckin(page);

    /* 真实笔记本与收件箱文档。 */
    const nbData = await client.postChecked("/api/notebook/createNotebook", {name: `E2E health ${Date.now()}`});
    const notebookId = typeof nbData === "string" ? nbData : String(nbData?.id ?? nbData?.notebook?.id ?? "");
    const doc = await client.postChecked("/api/filetree/createDocWithMd", {notebook: notebookId, path: "/健康收件箱", markdown: ""});
    const docId = typeof doc === "string" ? doc : String(doc?.id ?? doc?.data ?? "");
    expect(docId.length).toBeGreaterThanOrEqual(8);

    const stepsItem = makeTestItem("steps");
    stepsItem.kind = "count";
    stepsItem.target = 6000;
    stepsItem.unit = "步";
    await seedStore(client, await snapshotStore(page), [stepsItem]);

    /* 模拟快捷指令：经内核 appendBlock 追加一行严格格式的健康数据。 */
    const dayKey = new Date().toLocaleDateString("sv-SE");
    await client.postChecked("/api/block/appendBlock", {
        data: `health:steps:${dayKey} 8432`,
        dataType: "markdown",
        parentID: docId,
    });

    /* 种入偏好：健康收件箱启用、绑定收件箱文档与步数项目。 */
    const prefs = (await client.getFile("checkin-view-preferences")) || {};
    prefs.healthInbox = {enabled: true, docId, stepsItemId: stepsItem.id, weightItemId: ""};
    await client.putFile("checkin-view-preferences", prefs);

    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), stepsItem.id), {timeout: 20000}).toBe(true);

    /* 启动摄取（就绪后 2 秒）应把行转成步数打卡：source api + 当日身份。 */
    await expect.poll(async () => {
        const events = await recordedEvents(client, stepsItem.id);
        return events.filter((event) => event.source === "api" && event.localDate === dayKey && event.value === 8432).length;
    }, {timeout: 30000}).toBe(1);

    /* 幂等：重复行/重复摄取不重复记账（仍恰好一条）。 */
    await expect.poll(async () => {
        const events = await recordedEvents(client, stepsItem.id);
        return events.filter((event) => event.source === "api" && event.localDate === dayKey).length;
    }, {timeout: 30000}).toBe(1);

    /* 重载后事件仍在（真实落盘而非内存态）。 */
    await page.reload();
    await openCheckin(page);
    await expect.poll(async () => {
        const events = await recordedEvents(client, stepsItem.id);
        return events.filter((event) => event.source === "api" && event.localDate === dayKey).length;
    }, {timeout: 20000}).toBe(1);
});
