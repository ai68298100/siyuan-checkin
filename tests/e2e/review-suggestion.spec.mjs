/* 回顾页本地建议入口：真实宿主 UI 必须能从预览进入现有确认/应用/撤销工作流。 */
import {devices, expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, seedStore, snapshotStore} from "./helpers/app.mjs";

test("回顾建议可确认执行并撤销", async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext({...devices["iPhone 13"]});
    const page = await context.newPage();
    await openCheckin(page, {bundle: "mobile"});

    const steady = makeTestItem("suggestion-steady");
    const attention = makeTestItem("suggestion-attention");
    await seedStore(client, await snapshotStore(page), [steady, attention]);
    await page.reload();
    await openCheckin(page, {bundle: "mobile"});
    await page.evaluate(async (id) => {
        await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:suggestion:${id}`});
    }, steady.id);

    await page.click("#lcCheckinMobileTopBarButton");
    await page.evaluate(() => {
        const review = [...document.querySelectorAll("button, a")].find((element) => (element.textContent || "").trim() === "回顾");
        review?.click();
    });
    await page.locator('[data-review-workspace="overview"]').click();
    const report = page.locator('details[data-review-fold="report"]');
    if (!await report.evaluate(element => element.open)) await report.locator('> summary').click();
    await expect(report).toHaveJSProperty('open', true);
    await expect(report).not.toHaveAttribute('data-review-lazy', 'true');
    await page.waitForSelector("[data-action='preview-agent-suggestion']", {timeout: 15000});
    await page.locator("[data-action='preview-agent-suggestion']").click();

    const apply = page.locator("[data-agent-preview-apply]");
    await expect(apply).toBeEnabled();
    await expect(apply).toContainText("确认并执行");
    await apply.click();
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().find((item) => item.id === id)?.priority, attention.id), {timeout: 15000, message: "建议没有把关注项目优先级改为高"}).toBe("high");

    const workflow = page.locator("[data-suggestion-workflow]");
    await expect(workflow).toContainText("已确认");
    await workflow.locator("[data-suggestion-undo]").click();
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().find((item) => item.id === id)?.priority, attention.id), {timeout: 15000, message: "撤销没有恢复原优先级"}).toBe("medium");
    await context.close();
});
