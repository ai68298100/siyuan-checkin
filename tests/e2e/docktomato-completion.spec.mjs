/* E2E（T-1286）：番茄完成事件全链路的真实内核验证。
   桥在页面内监听 tomato:focus-session-completed → 校验 → 收件箱缓冲 →
   内部写入器 → 内核落盘。断言全部走内核文件与公开 API,不碰插件私有方法。
   覆盖：正常入账（值/日期/来源/externalRef）、重复幂等、
   跳过日 blocked（不删跳过、不误入账、收件箱留痕）。 */
import {devices, expect, test} from "@playwright/test";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";

const makeDurationItem = (prefix) => ({
    id: `e2e-dt-${prefix}`,
    name: `E2E 番茄 ${prefix}`,
    icon: "✓",
    kind: "duration",
    target: 25,
    unit: "分钟",
    schedule: {type: "daily"},
    tomatoMode: "minutes",
});

function completionDetail(item, sessionId, occurredNow) {
    const completedAt = occurredNow.toISOString();
    const localDate = (() => {
        const date = new Date(completedAt);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    })();
    return {
        detail: {
            apiVersion: 1,
            sessionId,
            durationMinutes: 25,
            completedAt,
            context: {consumer: "siyuan-checkin", itemId: item.id, itemUnit: "分钟", tomatoMode: "minutes"},
        },
        localDate,
    };
}

async function dispatchCompletion(page, detail) {
    await page.evaluate((payload) => {
        window.dispatchEvent(new CustomEvent("tomato:focus-session-completed", {detail: payload}));
    }, detail);
}

test("番茄完成事件真实入账,重复通知幂等", async ({page}) => {
    const client = createClient();
    await openCheckin(page);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = makeDurationItem(runId);
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const {detail, localDate} = completionDetail(item, `e2e-dt-${runId}`, new Date());
    await dispatchCompletion(page, detail);

    /* 正常入账:一条打卡,值=实际时长,完成日期=completedAt 所属本地日。 */
    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.externalRef === `docktomato:e2e-dt-${runId}`).length, {timeout: 20000}).toBe(1);
    const persisted = (await recordedEvents(client, item.id)).find((event) => event.externalRef === `docktomato:e2e-dt-${runId}`);
    expect(persisted.value).toBe(25);
    expect(persisted.unit).toBe("分钟");
    expect(persisted.source).toBe("tomato");
    expect(persisted.localDate).toBe(localDate);

    /* 重复通知:外部身份幂等,内核不新增。 */
    await dispatchCompletion(page, detail);
    await page.waitForTimeout(1500);
    expect((await recordedEvents(client, item.id)).filter((event) => event.externalRef === `docktomato:e2e-dt-${runId}`).length, "重复完成通知不得新增记录").toBe(1);
});

test("完成日已跳过:blocked 留痕于收件箱,不删跳过也不误入账", async ({page}) => {
    const client = createClient();
    await openCheckin(page);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = makeDurationItem(runId);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const base = await snapshotStore(page);
    const skipEvent = {
        id: `e2e-dt-skip-${runId}`,
        itemId: `e2e-dt-${runId}`,
        occurredAt: `${todayKey}T09:00:00.000Z`,
        localDate: todayKey,
        value: 0,
        unit: "分钟",
        source: "manual",
        kind: "skip",
    };
    await seedStore(client, {...base, events: [...(base.events || []), skipEvent]}, [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const {detail} = completionDetail(item, `e2e-dt-skip-${runId}`, new Date());
    await dispatchCompletion(page, detail);

    /* blocked:不删跳过、不自动入账;收件箱留痕(state=blocked, reason=skipped-day)。 */
    await expect.poll(async () => {
        const store = await client.getFile("checkin-docktomato-inbox");
        const entry = (store?.items || []).find((candidate) => candidate.identity === `e2e-dt-skip-${runId}`);
        return entry ? `${entry.state}:${entry.blockedReason || ""}` : "missing";
    }, {timeout: 20000}).toBe("blocked:skipped-day");
    expect((await recordedEvents(client, item.id)).filter((event) => event.externalRef === `docktomato:e2e-dt-skip-${runId}`).length, "跳过日不得自动入账").toBe(0);
    /* 跳过记录原样保留,未被静默删除。 */
    expect((await recordedEvents(client, item.id)).some((event) => event.kind === "skip" && event.localDate === todayKey), "用户跳过必须原样保留").toBe(true);
});

test('番茄完成联动在移动端 bundle 同样入账', async ({page}) => {
    const client = createClient();
    await openCheckin(page, {bundle: 'mobile'});

    const runId = `${Date.now()}-m-${Math.random().toString(36).slice(2, 8)}`;
    const item = makeDurationItem(runId);
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page, {bundle: 'mobile'});
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const {detail} = completionDetail(item, 'e2e-dtm-' + runId, new Date());
    await dispatchCompletion(page, detail);
    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.externalRef === `docktomato:e2e-dtm-${runId}`).length, {timeout: 20000}).toBe(1);
});

test('跳过日解析旅程:设置页撤销跳过并计入,同单元落库', async ({browser}) => {
    const client = createClient();
    const context = await browser.newContext({...devices['iPhone 13']});
    const page = await context.newPage();
    await openCheckin(page, {bundle: 'mobile'});

    const runId = `${Date.now()}-j-${Math.random().toString(36).slice(2, 8)}`;
    const item = makeDurationItem(runId);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const skipEvent = {
        id: `e2e-dtj-skip-${runId}`,
        itemId: `e2e-dt-${runId}`,
        occurredAt: `${todayKey}T09:00:00.000Z`,
        localDate: todayKey,
        value: 0,
        unit: '分钟',
        source: 'manual',
        kind: 'skip',
    };
    /* 密封化:工作区跨次复用,先清空收件箱存储,消除历史 blocked 条目对本旅程断言与 200 上限的影响。 */
    await client.putFile('checkin-docktomato-inbox', {schemaVersion: 1, items: []});
    const base = await snapshotStore(page);
    await seedStore(client, {...base, events: [...(base.events || []), skipEvent]}, [item]);
    await page.reload();
    await openCheckin(page, {bundle: 'mobile'});
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    const sessionId = `e2e-dtj-${runId}`;
    const {detail} = completionDetail(item, sessionId, new Date());
    await dispatchCompletion(page, detail);

    await expect.poll(async () => {
        const inbox = await client.getFile('checkin-docktomato-inbox');
        const entry = (inbox?.items || []).find((candidate) => candidate.identity === sessionId);
        return entry ? `${entry.state}:${entry.blockedReason || ""}` : 'missing';
    }, {timeout: 20000}).toBe('blocked:skipped-day');

    await page.click('#lcCheckinMobileTopBarButton');
    await page.click("[data-mobile-nav='settings']");
    const undo = page.locator(`[data-inbox-undo-skip='${sessionId}']`)
    await expect(undo).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await undo.click();

    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.externalRef === `docktomato:${sessionId}`).length, {timeout: 20000}).toBe(1);
    const storeAfter = await client.getFile('checkin-store');
    expect((storeAfter?.events || []).some((event) => event.itemId === item.id && event.kind === 'skip')).toBe(false);
    expect((storeAfter?.eventTombstones || []).length).toBeGreaterThanOrEqual(1);
    const inboxAfter = await client.getFile('checkin-docktomato-inbox');
    expect((inboxAfter?.items || []).some((entry) => entry.identity === sessionId)).toBe(false);
    await context.close();
});
