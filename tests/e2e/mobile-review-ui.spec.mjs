/* 用户反馈 2026-09-19（手机端回顾页）的回归网：
   ① 报告菜单四个控件纵向排列且可触达；② 报告设置/更多 的下拉不能被祖先容器裁掉；
   ③ 自定义范围展开同样要完整可见；④ 导出在原生容器里必须走「写 /assets + 宿主原生保存」，
   绝不产生 blob 导航（Android WebView 下那就是「点导出，思源重启」）。 */
import {devices, expect, test} from "@playwright/test";
import {createClient, openCheckin} from "./helpers/app.mjs";

const visibleInside = (page, selector) => page.evaluate((sel) => {
    const menu = document.querySelector(`${sel} .lc-checkin__review-more-menu`);
    if (!menu) return -1;
    const r = menu.getBoundingClientRect();
    const xs = r.left + r.width / 2;
    return [r.top + 4, r.top + r.height / 2, r.bottom - 4].filter((y) => {
        const hit = document.elementFromPoint(xs, y);
        return Boolean(hit && menu.contains(hit));
    }).length;
}, selector);

test("移动端回顾页：对齐、浮层与导出通道", async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext({...devices["iPhone 13"]});
    const page = await context.newPage();
    await openCheckin(page, {bundle: "mobile"});
    /* 钩子在插件就绪之后再装：addInitScript 会覆盖宿主要用的 URL.createObjectURL / window.open，
       反而把启动流程弄坏（首轮就是这样假失败的）。 */
    await page.evaluate(() => {
        window.__blobCalls = [];
        const original = URL.createObjectURL;
        URL.createObjectURL = function tracked(blob) { window.__blobCalls.push("blob"); return original.call(URL, blob); };
        window.__nativeSaves = [];
        window.JSAndroid = {saveExportFile: (uri) => window.__nativeSaves.push(String(uri))};
        window.__opens = [];
        window.open = (url) => { window.__opens.push(String(url)); return null; };
    });
    await page.click("#lcCheckinMobileTopBarButton");
    await page.evaluate(() => {
        const hit = [...document.querySelectorAll("button, a")].find((el) => (el.textContent || "").trim() === "回顾");
        if (hit) hit.click();
    });
    const exportDisclosure = page.locator('.review-export-disclosure');
    await expect(exportDisclosure).toBeVisible({timeout: 15000});
    const overscroll = await page.evaluate(() => {
        const pick = (selector) => {
            const element = document.querySelector(selector);
            return element ? getComputedStyle(element).overscrollBehaviorY : "missing";
        };
        return {
            review: pick(".lc-checkin--review"),
            host: pick(":is(.lc-checkin-host--mobile, .lc-checkin-dialog-host--mobile)"),
            body: getComputedStyle(document.body).overscrollBehaviorY,
        };
    });
    expect(overscroll, "移动回顾页边界下拉必须由整条宿主滚动链拦截").toEqual({review: "none", host: "none", body: "none"});
    if (!await exportDisclosure.evaluate(element => element.open)) await exportDisclosure.locator('> summary').click();
    await expect(page.locator('.lc-checkin__review-tools')).toBeVisible();

    const controls = page.locator(".lc-checkin__review-tool-group > button, .lc-checkin__review-tool-group > details > summary, .lc-checkin__review-tools > .lc-checkin__review-more > summary");
    /* 5 = 助手入口 + 复制报告 + 导出报告 + 报告设置 + 更多工具（17.3 起助手入口进工具栏）。 */
    await expect(controls, "报告菜单控件数量异常").toHaveCount(5);
    const boxes = [];
    for (const control of await controls.all()) {
        await expect(control).toBeVisible();
        await control.click({trial: true});
        const box = await control.boundingBox();
        expect(box.width, "① 菜单触控宽度").toBeGreaterThanOrEqual(44);
        expect(box.height, "① 菜单触控高度").toBeGreaterThanOrEqual(44);
        boxes.push(box);
    }
    for (let index = 1; index < boxes.length; index += 1) {
        expect(boxes[index].y, "① 菜单动作不应重叠").toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height - 1);
    }

    for (const selector of [".lc-checkin__report-settings", ".lc-checkin__review-tools .lc-checkin__review-more:not(.lc-checkin__report-settings)"]) {
        await page.click(`${selector} > summary`);
        await expect.poll(() => visibleInside(page, selector), {timeout: 5000, message: `② 下拉被裁剪：${selector}`}).toBe(3);
        await page.click(`${selector} > summary`);
    }

    const customRange = page.locator('.lc-checkin__custom-range-disclosure');
    if (!await customRange.evaluate(element => element.open)) await customRange.locator('> summary').click();
    await expect.poll(() => page.evaluate(() => {
        const panel = document.querySelector(".lc-checkin__custom-range-disclosure .lc-checkin__custom-range");
        if (!panel) return -1;
        const r = panel.getBoundingClientRect();
        if (r.height <= 0) return 0;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && panel.contains(hit) ? 1 : -2;
    }), {timeout: 5000, message: "③ 自定义范围面板被遮挡"}).toBe(1);
    await customRange.locator('> summary').click();

    /* 前序步骤会留下思源的临时提示条（#message）。插件应按其实际边界
       避让，测试不再删除宿主提示内容。 */
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--lc-checkin-host-message-offset").trim()), {timeout: 5000, message: "④ 未建立宿主提示条动态避让变量"}).toMatch(/^\d+px$/);
    if (!await exportDisclosure.evaluate(element => element.open)) await exportDisclosure.locator('> summary').click();
    await page.locator("[data-action='export-report']").click();
    await expect.poll(() => page.evaluate(() => window.__nativeSaves.length + window.__opens.length), {timeout: 20000, message: "④ 导出没有走宿主原生保存通道"}).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.__blobCalls.length), "④ 原生容器下出现了 blob 下载（正是导致思源重启的路径）").toBe(0);
    const savedUri = await page.evaluate(() => window.__nativeSaves[0] || window.__opens[0]);
    expect(savedUri, `导出目标异常：${savedUri}`).toMatch(/\/assets\/siyuan-checkin-report-\d{4}-\d{2}-\d{2}-\d+\.md/);
    const assetPath = new URL(savedUri).pathname;
    const reportText = await expect.poll(async () => await client.readWorkspaceFile(assetPath) || "", {timeout: 15000, message: `${assetPath} 未落盘`}).toContain("## ");
    expect(reportText).not.toBe(null);
    expect(await page.evaluate(() => window.siyuanCheckin.isReady()), "导出后插件必须仍然可用").toBe(true);
    await context.close();
});
