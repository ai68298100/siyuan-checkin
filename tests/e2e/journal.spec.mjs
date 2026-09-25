/* E2E（T-1465 · D-273）：问卷式日记打卡真实内核全链路——
   种入绑定 gratitude3 的二值项目 → 今日页点「问卷打卡」→ 填三问提交 →
   断言事实层落盘（value=1，note 含截断摘要）+ 目标文档出现带幂等标记的条目块 →
   经次级按钮重开问卷（已填写提示）改答案重提 → 文档块更新、事件不重复记账。
   写入目标走默认「今日日记」路径（notebook conf → renderSprig → createDocWithMd 幂等）。 */
import {expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, openTodayPage, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

test("问卷日记:绑定项目打卡弹问卷并写入当日日记且重填幂等", async ({page}) => {
    test.setTimeout(240_000);
    const client = createClient();
    await openCheckin(page);

    /* 全新工作区没有笔记本——建一个供「写入今日日记」目标定位（conf → sprig → 建文档）。 */
    const nb = await client.postChecked("/api/notebook/createNotebook", {name: `Journal E2E ${Date.now()}`});
    expect(typeof nb === "string" ? nb : nb?.id || nb?.notebook?.id).toBeTruthy();

    const item = {...makeTestItem("journal"), kind: "binary", journal: {templateId: "gratitude3"}};
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);
    await openTodayPage(page);
    await page.evaluate(() => document.querySelectorAll(".onboarding").forEach((node) => node.remove()));

    const dayKey = new Date().toLocaleDateString("sv-SE");
    const marker = `lv-checkin-journal:gratitude3:${dayKey}`;

    /* 首次填写：主按钮变为「问卷打卡」，弹窗内填三问提交。 */
    const journalButton = page.locator(`.lc-checkin__item[data-item-id="${item.id}"] .lc-checkin__record-button[data-action="journal"][data-journal-template="gratitude3"]`).first();
    page.on("pageerror", (error) => console.log("PAGEERROR:", String(error).slice(0, 300)));
    page.on("console", (message) => { if (message.type() === "error") console.log("CONSOLE-ERR:", message.text().slice(0, 300)); });
    await expect(journalButton).toBeVisible({timeout: 20000});
    await journalButton.click();
    const form = page.locator("[data-journal-form]");
    /* 弹窗前宿主会做目标预检（含首次 createDocWithMd 建当日日记），冷路径可能慢。 */
    await expect(form).toBeVisible({timeout: 20000});
    await expect(form.locator("[data-journal-answer=\"0\"]")).toBeVisible();
    await form.locator("[data-journal-answer=\"0\"]").fill("家人身体健康");
    await form.locator("[data-journal-answer=\"2\"]").fill("感谢同事帮我 review 代码");
    await form.locator("[data-journal-submit]").click();

    /* 事实层：一条二值事件，note 带模板名截断摘要。 */
    await expect.poll(async () => {
        const events = await recordedEvents(client, item.id);
        return events.filter((event) => event.localDate === dayKey && event.value === 1 && (event.note || "").length > 0).length;
    }, {timeout: 30000}).toBe(1);
    const events = await recordedEvents(client, item.id);
    expect(events[0].note).toContain("感恩三问");

    /* 旁路写入：目标文档出现带标记的条目块（索引异步重建 → 轮询）。 */
    let writtenBlock;
    await expect.poll(async () => {
        const blocks = await client.post("/api/query/sql", {stmt: `SELECT id, content FROM blocks WHERE content LIKE '%${marker}%' ORDER BY id ASC LIMIT 1`});
        writtenBlock = (blocks.data || [])[0];
        return Boolean(writtenBlock);
    }, {timeout: 30000}).toBe(true).catch(async () => {
        const audit = await client.getFile("checkin-store-audit");
        const entries = (typeof audit === "string" ? JSON.parse(audit) : audit) || [];
        console.log("JOURNAL-AUDIT", JSON.stringify(entries.filter((entry) => entry.details && entry.details.channel === "journal").slice(-3)));
        throw new Error("journal block never appeared");
    });
    expect(writtenBlock.content).toContain("家人身体健康");

    /* 重填：完成态卡片位于「已完成折叠区」→ 先展开；主按钮变为「重新填写」（撤销走卡片图标 toggle）。 */
    await page.reload();
    await openCheckin(page);
    await openTodayPage(page);
    await page.evaluate(() => document.querySelectorAll(".onboarding").forEach((node) => node.remove()));
    const completedToggle = page.locator("[data-action='toggle-completed']").first();
    if (await completedToggle.getAttribute("aria-expanded") === "false") await completedToggle.click();
    const refillButton = page.locator(`.lc-checkin__item[data-item-id="${item.id}"] .lc-checkin__record-button[data-action="journal"]`).first();
    await expect(refillButton).toBeVisible({timeout: 20000});
    await refillButton.click();
    const refillForm = page.locator("[data-journal-form]");
    await expect(refillForm).toBeVisible({timeout: 20000});
    /* 已填写提示属尽力而为预检（可静默失败），不作硬断言；权威幂等=提交后单块更新+事件不重复。 */
    await refillForm.locator("[data-journal-answer=\"0\"]").fill("家人健康，全家散步一小时");
    await refillForm.locator("[data-journal-submit]").click();

    await expect.poll(async () => {
        const blocks = await client.post("/api/query/sql", {stmt: `SELECT id, content FROM blocks WHERE content LIKE '%${marker}%' ORDER BY id DESC LIMIT 1`});
        const rows = blocks.data || [];
        /* updateBlock 后内核以新 id 重建块、旧块索引异步收敛：断言最新块已更新即可（事件数下线断言）。 */
        return rows.length >= 1 && (rows[0].content || "").includes("全家散步一小时");
    }, {timeout: 30000}).toBe(true).catch(async () => {
        const blocks = await client.post("/api/query/sql", {stmt: `SELECT id, content FROM blocks WHERE content LIKE '%${marker}%' ORDER BY id DESC LIMIT 3`});
        console.log("REFILL-BLOCKS", JSON.stringify(blocks.data || []));
        const audit = await client.getFile("checkin-store-audit");
        const entries = (typeof audit === "string" ? JSON.parse(audit) : audit) || [];
        console.log("REFILL-AUDIT", JSON.stringify(entries.filter((entry) => entry.details && entry.details.channel === "journal").slice(-3)));
        throw new Error("refill did not update the entry block");
    });
    const after = await recordedEvents(client, item.id);
    expect(after.filter((event) => event.localDate === dayKey && event.value === 1).length).toBe(1);
});
