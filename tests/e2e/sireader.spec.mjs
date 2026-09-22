/* E2E（T-1384/T-1388 前置）：思阅适配器真实内核全链路——
   种入启用偏好与项目 → 注入 reader:open/blur 生命周期事件 → 有界等待真实分钟 →
   断言写回落盘（source sireader + externalRef 幂等身份）→ 页面重载后事件仍在。
   上游思阅未安装：事件由测试注入，仅验证小驴侧管线（研究文档实验路径口径）。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("思阅适配器:生命周期事件在真实内核累计并幂等写入", async ({page}) => {
    test.setTimeout(180_000);
    const client = createClient();
    await openCheckin(page);

    const item = makeTestItem("siread");
    await seedStore(client, await snapshotStore(page), [item]);

    /* 种入偏好：思阅联动启用、绑定该项目、阈值 1 分钟。 */
    const prefs = (await client.getFile("checkin-view-preferences")) || {};
    prefs.sireaderIntegration = {enabled: true, itemId: item.id, thresholdMinutes: 1};
    await client.putFile("checkin-view-preferences", prefs);

    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const dayKey = new Date().toLocaleDateString("sv-SE");

    /* 注入生命周期：open 起播，65 秒后 blur——跨过 1 分钟阈值。 */
    await page.evaluate(() => {
        window.dispatchEvent(new Event("reader:open"));
    });
    await page.waitForTimeout(65_000);
    await page.evaluate(() => {
        window.dispatchEvent(new Event("reader:blur"));
    });

    /* 写回断言：source=sireader、externalRef=当日身份、值=1 分钟。 */
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "sireader" && event.localDate === dayKey).length;
    }, {timeout: 20000}).toBe(1);

    /* 重载后事件仍在（真实落盘而非内存态）。 */
    await page.reload();
    await openCheckin(page);
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "sireader" && event.localDate === dayKey).length;
    }, {timeout: 20000}).toBe(1);

    /* 幂等：同日再次跨过阈值（再播 65 秒）不得重复记账。 */
    await page.evaluate(() => {
        window.dispatchEvent(new Event("reader:open"));
    });
    await page.waitForTimeout(65_000);
    await page.evaluate(() => {
        window.dispatchEvent(new Event("reader:blur"));
    });
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "sireader" && event.localDate === dayKey).length;
    }, {timeout: 20000}).toBe(1);
});
