/* T-1249 只读实例：思源以 --readonly 启动时（发布服务/只读模式同一路径），
   内核会拒绝一切写接口，插件必须「不崩、不假装成功、数据不变」。 */
import {expect, test} from "@playwright/test";
import {createClient, openCheckin, recordedEvents} from "../helpers/app.mjs";

const READONLY_TARGET = "target-readonly";

test("只读实例下打卡不会落盘也不得崩溃", async ({page}) => {
    const client = createClient(READONLY_TARGET);
    await openCheckin(page, {target: READONLY_TARGET});
    expect(await page.evaluate(() => Boolean(window.siyuan.config?.readonly)), "内核未以只读模式启动").toBe(true);

    const items = await page.evaluate(() => window.siyuanCheckin.getItems().filter((item) => !item.archived));
    test.skip(!items.length, "E2E 工作区还没有可打卡项，请先跑一次 pnpm run test:e2e");
    const item = items.find((entry) => entry.id.startsWith("e2e-")) || items[0];

    const before = (await recordedEvents(client, item.id)).length;
    const outcome = await page.evaluate(async (id) => {
        try {
            const recorded = await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:readonly:${Date.now()}`});
            return {threw: false, eventId: recorded?.id};
        } catch (error) {
            return {threw: true, detail: String(error?.msg || error?.message || error)};
        }
    }, item.id);

    /* 无论走「拒绝抛错」还是「返回空」，都不得静默成功。 */
    expect(outcome.threw || !outcome.eventId, `只读模式下 recordEvent 竟报告成功：${JSON.stringify(outcome)}`).toBe(true);
    await page.waitForTimeout(1800);
    expect(await page.evaluate(() => window.siyuanCheckin.isReady()), "只读模式下插件应保持可用").toBe(true);
    expect((await recordedEvents(client, item.id)).length, `只读模式下磁盘记录数发生变化（${before} → 现在）`).toBe(before);
});
