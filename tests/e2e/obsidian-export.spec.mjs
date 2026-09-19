/* E2E（T-1296）：Obsidian 迁出按钮的下载流验证——设置页触发导出，
   逐文件下载 H21 习惯 .md,内容含 frontmatter title 与 entries 完成日。 */
import {expect, test, devices} from "@playwright/test";
import fs from "node:fs";
import {createClient, makeTestItem, openCheckin, seedStore, snapshotStore} from "./helpers/app.mjs";

test("Obsidian 迁出:设置页导出 H21 习惯文件", async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext({...devices["iPhone 13"], acceptDownloads: true});
    const page = await context.newPage();
    await openCheckin(page, {bundle: "mobile"});

    const runId = `${Date.now()}`;
    const today = new Date();
    const key = (offsetDays) => {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offsetDays);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const itemA = {...makeTestItem("obs-a"), name: `E2E 跑步 ${runId}`};
    const itemB = {...makeTestItem("obs-b"), name: `E2E 阅读 ${runId}`};
    const events = [
        {id: `e2e-obs-${runId}-1`, itemId: itemA.id, occurredAt: `${key(0)}T04:00:00.000Z`, localDate: key(0), value: 1, unit: "次", source: "manual"},
        {id: `e2e-obs-${runId}-2`, itemId: itemA.id, occurredAt: `${key(0)}T08:00:00.000Z`, localDate: key(0), value: 1, unit: "次", source: "manual"},
        {id: `e2e-obs-${runId}-3`, itemId: itemB.id, occurredAt: `${key(1)}T04:00:00.000Z`, localDate: key(1), value: 1, unit: "次", source: "manual"},
    ];
    const base = await snapshotStore(page);
    await seedStore(client, {...base, events: [...(base.events || []), ...events]}, [itemA, itemB]);
    await page.reload();
    await openCheckin(page, {bundle: "mobile"});

    await page.click("#lcCheckinMobileTopBarButton");
    await page.click("[data-mobile-nav='settings']");
    const exportBtn = page.locator("[data-action='export-obsidian']");
    await expect(exportBtn).toBeVisible();

    const downloads = [page.waitForEvent("download"), page.waitForEvent("download")];
    await exportBtn.click();
    const [first, second] = await Promise.all(downloads);

    const names = [first.suggestedFilename(), second.suggestedFilename()].sort();
    expect(names[0].endsWith(".md")).toBe(true);
    expect(names[1].endsWith(".md")).toBe(true);

    for (const download of [first, second]) {
        const filePath = await download.path();
        const content = fs.readFileSync(filePath, "utf8");
        expect(content.startsWith("---\n"), "H21 file must start with frontmatter").toBe(true);
        expect(content).toContain("entries:");
    }

    await context.close();
});
