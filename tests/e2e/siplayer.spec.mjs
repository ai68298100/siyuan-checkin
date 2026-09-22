/* E2E（T-1385/T-1388 前置）：思播适配器真实内核验证——
   注入受控假 controller（isPlaying 受测试状态控制）→ 种入启用偏好与项目 →
   有界采样器在真实宿主轮询累计 → 跨过阈值断言写回落盘与同日幂等。
   上游思播未安装：controller 由测试注入，仅验证小驴侧管线（实验路径口径）。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("思播适配器:controller 采样在真实内核累计并幂等写入", async ({page}) => {
    test.setTimeout(240_000);
    const client = createClient();
    await openCheckin(page);

    const item = makeTestItem("siplay");
    await seedStore(client, await snapshotStore(page), [item]);

    const prefs = (await client.getFile("checkin-view-preferences")) || {};
    prefs.siplayerIntegration = {enabled: true, itemId: item.id, thresholdMinutes: 1};
    await client.putFile("checkin-view-preferences", prefs);

    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    /* 注入受控假 controller：isPlaying() 由测试状态驱动。 */
    await page.evaluate(() => {
        window.__siplayerTest = {playing: true};
        window.siyuanMediaPlayer = {controller: {isPlaying: () => window.__siplayerTest.playing}};
    });

    const dayKey = new Date().toLocaleDateString("sv-SE");

    /* 在播 ~75 秒（覆盖 ≥5 个 15 秒采样周期）→ 跨过 1 分钟阈值。 */
    await page.waitForTimeout(75_000);
    await page.evaluate(() => {
        window.__siplayerTest.playing = false;
    });

    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "siplayer" && event.localDate === dayKey).length;
    }, {timeout: 30000}).toBe(1);

    /* 幂等：同日再次跨过阈值不得重复记账。 */
    await page.evaluate(() => {
        window.__siplayerTest.playing = true;
    });
    await page.waitForTimeout(75_000);
    await page.evaluate(() => {
        window.__siplayerTest.playing = false;
    });
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "siplayer" && event.localDate === dayKey).length;
    }, {timeout: 30000}).toBe(1);

    /* 重载后事件仍在（真实落盘）。 */
    await page.reload();
    await openCheckin(page);
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.source === "siplayer" && event.localDate === dayKey).length;
    }, {timeout: 20000}).toBe(1);
});
