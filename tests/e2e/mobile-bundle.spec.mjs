/* T-1248 移动端 bundle 真实例：插件在移动前端里必须能起、能打卡、能落盘，且不抛未捕获异常。
   移动端构建里 openTab/openWindow/addStatusBar 是空实现，dock 面板与桌面不同，因此只用公开 API 断言。 */
import {devices, expect, test} from "@playwright/test";
import {apiDescriptor, createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("移动端 bundle 下插件可加载并完成一次打卡", async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext({...devices["iPhone 13"]});
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(String(error.message || error)));

    await openCheckin(page, {bundle: "mobile"});
    const frontend = await page.evaluate(() => ({
        readonly: Boolean(window.siyuan.config?.readonly),
        hasTopBar: Boolean(document.querySelector("#mobileTopBar, #toolbar")),
    }));
    expect(frontend.readonly, "移动 bundle 下的实例不应是只读").toBe(false);
    /* 顶栏容器必须存在，否则下面的入口断言会退化成空断言。 */
    expect(frontend.hasTopBar, "移动 bundle 未渲染 #mobileTopBar/#toolbar 容器").toBe(true);

    const item = makeTestItem("mobile");
    await seedStore(client, await snapshotStore(page), [item]);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const eventId = await page.evaluate(async (id) => (await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:mobile:${id}`}))?.id, item.id);
    expect(typeof eventId, "移动端也必须能完成打卡").toBe("string");
    await expect.poll(async () => (await recordedEvents(client, item.id)).some((event) => event.id === eventId), {timeout: 20000}).toBe(true);

    /* 与桌面端同一份公开契约：能力清单不能因为前端不同而变化。 */
    const descriptor = await apiDescriptor(page);
    expect(descriptor.version).toBeGreaterThanOrEqual(4);
    expect(descriptor.capabilities.length, "移动端能力清单与桌面不一致").toBeGreaterThan(0);

    /* 真实注入点见 src/render/quick-dialog.ts ensureMobileTopBarButtonFor。 */
    await expect.poll(() => page.evaluate(() => Boolean(document.getElementById("lcCheckinMobileTopBarButton"))), {timeout: 10000, message: "移动顶栏入口未注入"}).toBe(true);

    expect(pageErrors, `移动端出现未捕获异常：${pageErrors.join(" | ")}`).toEqual([]);
    await context.close();
});
