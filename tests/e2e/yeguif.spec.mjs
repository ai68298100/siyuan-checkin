/* E2E（T-1457）：叶归 LifeLog 适配器真实内核全链路——
   建笔记本与日记文档，按叶归 Marker 语法播种段落（09:00 阅读：认知觉醒 → 10:00 运动[开放末条]）→
   种入启用偏好（绑定笔记本）→ 焦点触发摄取 → 断言只记已闭合记录（60 分钟，备注「阅读：认知觉醒」，
   yeguif:<blockId>:<localDate> 身份）→ 重载后再触发仍只有一条（幂等）。
   上游叶归未安装亦成立：Marker 段落即用户文本，本 spec 验证小驴侧摄取管线（探测口径同 T-1441）。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("叶归 LifeLog:Marker 段落按时间差摄取且幂等", async ({page}) => {
    test.setTimeout(180_000);
    const client = createClient();
    await openCheckin(page);

    const item = {...makeTestItem("yeguif"), kind: "duration", target: 30, unit: "分钟"};
    await seedStore(client, await snapshotStore(page), [item]);

    /* 建笔记本与日记文档，播种两条 Marker 段落（末条开放，应被宁少记跳过）。 */
    const nb = await client.postChecked("/api/notebook/createNotebook", {name: `Yegui E2E ${Date.now()}`});
    const nbId = typeof nb === "string" ? nb : nb?.id || nb?.notebook?.id;
    if (!nbId) console.log("[yeguif-e2e] createNotebook payload:", JSON.stringify(nb).slice(0, 300));
    expect(nbId).toBeTruthy();
    const doc = await client.postChecked("/api/filetree/createDocWithMd", {
        notebook: nbId,
        path: `/2026-09-25-yeguif-e2e`,
        markdown: "09:00 阅读：认知觉醒\n\n10:00 运动",
    });
    const docId = typeof doc === "string" ? doc : doc?.id;
    if (!docId) console.log("[yeguif-e2e] createDocWithMd payload:", JSON.stringify(doc).slice(0, 300));
    expect(docId).toBeTruthy();

    /* 索引异步重建：轮询直到 Marker 段落可查（SiYuan 已知写后竞态）。 */
    let readBlock;
    await expect.poll(async () => {
        const blocks = await client.post("/api/query/sql", {stmt: `SELECT id, content FROM blocks WHERE root_id = '${docId}' AND type = 'p'`});
        readBlock = (blocks.data || []).find((row) => (row.content || "").startsWith("09:00"));
        return Boolean(readBlock);
    }, {timeout: 20000}).toBe(true);

    /* 种入偏好：叶归联动启用、绑定项目与笔记本。 */
    const prefs = (await client.getFile("checkin-view-preferences")) || {};
    prefs.yeguifIntegration = {enabled: true, itemId: item.id, notebookId: nbId};
    await client.putFile("checkin-view-preferences", prefs);

    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const dayKey = new Date().toLocaleDateString("sv-SE");

    /* 焦点触发摄取（不可见省电门在 headless 可见态放行）。 */
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));

    /* 写回断言：仅已闭合的 09:00 记录入账，值=60 分钟，备注=类型：内容。 */
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "yeguif" && event.localDate === dayKey).length;
    }, {timeout: 30000}).toBe(1);
    const events = await recordedEvents(client, item.id);
    const recorded = events.find((event) => event.source === "yeguif" && event.localDate === dayKey);
    expect(recorded.value).toBe(60);
    expect(recorded.note).toBe("阅读：认知觉醒");
    expect(recorded.externalRef).toBe(`yeguif:${readBlock.id}:${dayKey}`);

    /* 重载 + 再次触发：块身份幂等，不产生第二条。 */
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(3000);
    const after = await recordedEvents(client, item.id);
    expect(after.filter((event) => event.source === "yeguif" && event.localDate === dayKey).length).toBe(1);
});
