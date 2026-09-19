/* 用户反馈 2026-09-19（手机端回顾页）的回归网：
   ① 工具栏四个控件必须同一行同顶部；② 报告设置/更多 的下拉不能被祖先容器裁掉；
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
    await page.waitForSelector(".lc-checkin__review-tools", {timeout: 15000});

    const tops = await page.evaluate(() => [...document.querySelectorAll(".lc-checkin__review-tools > .lc-checkin__review-tool-group > *, .lc-checkin__review-tools > .lc-checkin__review-more > summary")].map((el) => Math.round(el.getBoundingClientRect().top)));
    expect(tops.length, "工具栏控件数量异常").toBe(4);
    expect(Math.max(...tops) - Math.min(...tops), `① 工具栏顶部不齐：${tops.join(", ")}`).toBe(0);

    for (const selector of [".lc-checkin__report-settings", ".lc-checkin__review-tools .lc-checkin__review-more:not(.lc-checkin__report-settings)"]) {
        await page.click(`${selector} > summary`);
        await expect.poll(() => visibleInside(page, selector), {timeout: 5000, message: `② 下拉被裁剪：${selector}`}).toBe(3);
        await page.click(`${selector} > summary`);
    }

    await page.evaluate(() => {
        const disclosure = document.querySelector(".lc-checkin__custom-range-disclosure");
        if (disclosure) disclosure.open = true;
    });
    await expect.poll(() => page.evaluate(() => {
        const panel = document.querySelector(".lc-checkin__custom-range-disclosure .lc-checkin__custom-range");
        if (!panel) return -1;
        const r = panel.getBoundingClientRect();
        if (r.height <= 0) return 0;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit && panel.contains(hit) ? 1 : -2;
    }), {timeout: 5000, message: "③ 自定义范围面板被遮挡"}).toBe(1);

    /* 前序步骤会留下思源的临时提示条（#message），它正好盖在工具栏上；
       这里要验的是导出通道，所以先清掉提示条，再直接触发按钮的 click。 */
    await page.evaluate(() => document.querySelectorAll("#message .b3-snackbar__content").forEach((node) => node.remove()));
    await page.$eval("[data-action='export-report']", (el) => el.click());
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
