/* T-1807：真实宿主写入口失败后的重载恢复。
   通过当前插件实例的 saveData 注入一次受控失败，确认公开 API
   不把未落盘事件留在内存；页面重载后恢复正常写入，同一 externalRef
   只形成一条事实。该夹具只覆盖插件写入口的失败边界，不把它当作
   思源内核磁盘/网络故障的现场证据，也不改变持久化格式。 */
import {expect, test} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {createClient, makeTestItem, openCheckin, recordedEvents, seedStore, snapshotStore} from "./helpers/app.mjs";
const enabled = process.env.CHECKIN_STORAGE_HOST_BENCHMARK === "1";

test("真实宿主写入口受控失败后重载可恢复且不重复入账", async ({page}) => {
    test.skip(!enabled, "设置 CHECKIN_STORAGE_HOST_BENCHMARK=1 或运行 pnpm run benchmark:storage:host");
    const client = createClient();
    await openCheckin(page);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item = makeTestItem(`write-failure-${runId}`);
    const externalRef = `e2e:t1807:write-failure:${runId}`;
    await seedStore(client, await snapshotStore(page), [item]);
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);

    /* saveData is the real Plugin storage entrypoint; replacing it only in
       this page makes the primary-store failure deterministic while keeping
       the retry inbox on its real auxiliary storage path. */
    const failedResult = await page.evaluate(async ({itemId, ref}) => {
        const plugin = window.siyuan?.ws?.app?.plugins?.find((entry) => entry.name === "siyuan-checkin");
        if (!plugin || typeof plugin.saveData !== "function") throw new Error("plugin saveData is unavailable");
        const originalSaveData = plugin.saveData.bind(plugin);
        plugin.saveData = async (name, value) => {
            if (name === "checkin-store") throw new Error("e2e-injected-storage-failure");
            return originalSaveData(name, value);
        };
        const result = await window.siyuanCheckin.recordEvent({itemId, source: "api", externalRef: ref});
        return {result, inMemoryEvents: window.siyuanCheckin.getEvents().filter((event) => event.externalRef === ref).length};
    }, {itemId: item.id, ref: externalRef});
    expect(failedResult.result).toBeUndefined();
    expect(failedResult.inMemoryEvents, "失败写入不能把未落盘事实留在当前窗口").toBe(0);
    expect((await recordedEvents(client, item.id)).filter((event) => event.externalRef === externalRef)).toHaveLength(0);

    /* A genuine reload creates a new plugin instance and clears the injected
       failure. The pending retry may settle automatically during startup;
       either way the same identity must converge to one durable event. */
    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((id) => window.siyuanCheckin.getItems().some((entry) => entry.id === id), item.id), {timeout: 20000}).toBe(true);
    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.externalRef === externalRef), {timeout: 30000}).toHaveLength(1);
    const recovered = await page.evaluate(async ({itemId, ref}) => {
        const event = await window.siyuanCheckin.recordEvent({itemId, source: "api", externalRef: ref});
        return event ? {id: event.id, externalRef: event.externalRef} : undefined;
    }, {itemId: item.id, ref: externalRef});
    expect(recovered?.id).toEqual(expect.any(String));
    expect(recovered?.externalRef).toBe(externalRef);
    await expect.poll(async () => (await recordedEvents(client, item.id)).filter((event) => event.externalRef === externalRef), {timeout: 30000}).toHaveLength(1);

    await page.reload();
    await openCheckin(page);
    await expect.poll(() => page.evaluate((ref) => window.siyuanCheckin.getEvents().filter((event) => event.externalRef === ref).length, externalRef), {timeout: 20000}).toBe(1);
    expect((await recordedEvents(client, item.id)).filter((event) => event.externalRef === externalRef)).toHaveLength(1);
    const evidence = {format: "siyuan-checkin-storage-host-failure-reload", version: 1, generatedAt: new Date().toISOString(), externalRef, failedInMemoryEvents: failedResult.inMemoryEvents, retainedAfterReload: true, singleDurableEvent: true, injectedPluginSaveDataFailure: true};
    const outputPath = process.env.T1807_HOST_FAILURE_OUTPUT || path.resolve(".artifacts/storage-host-failure-reload.json");
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
    console.log(`T-1807 failure-reload host evidence: ${JSON.stringify(evidence)}; report ${outputPath}`);
});
