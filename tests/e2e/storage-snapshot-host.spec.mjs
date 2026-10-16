/* T-1807：真实思源 saveData/loadData 快照写放大证据。
   该用例只在 benchmark:storage:host 中运行，避免普通 e2e 套件被大样本拖慢。
   它通过公开 API 触发真实保存，再从内核文件接口读取主档/恢复历史，记录
   主档大小、历史大小、单次写入耗时和重载结果。 */
import {expect, test} from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {createClient, openCheckin} from "./helpers/app.mjs";

const enabled = process.env.CHECKIN_STORAGE_HOST_BENCHMARK === "1";
const counts = String(process.env.CHECKIN_STORAGE_HOST_COUNTS || "1000,10000,100000")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
const attachmentBytes = Math.max(0, Math.min(500000, Number(process.env.CHECKIN_STORAGE_HOST_ATTACHMENT_BYTES || 0)));

function makeStore(eventCount, suffix, attachmentSize = 0) {
    const now = new Date().toISOString();
    const itemId = `e2e-storage-${suffix}`;
    const attachment = attachmentSize > 0
        ? `data:image/png;base64,${Buffer.alloc(attachmentSize, 0xab).toString("base64")}`
        : undefined;
    const events = Array.from({length: eventCount}, (_, index) => ({
        id: `e2e-storage-event-${suffix}-${index}`,
        itemId,
        occurredAt: now,
        localDate: now.slice(0, 10),
        value: 1,
        unit: "次",
        source: "manual",
        ...(index === 0 && attachment ? {attachment} : {}),
    }));
    return {
        version: 1,
        items: [{id: itemId, name: `T-1807 ${suffix}`, kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: now}],
        events,
    };
}

async function readStorageBytes(client, name) {
    const text = await client.readWorkspaceFile(`/data/storage/petal/siyuan-checkin/${name}`);
    return {bytes: text ? Buffer.byteLength(text, "utf8") : 0, value: text ? JSON.parse(text) : undefined};
}

async function waitForEvent(client, itemId, eventId) {
    await expect.poll(async () => {
        const store = await client.getFile("checkin-store");
        return (store?.events || []).some((event) => event.itemId === itemId && event.id === eventId);
    }, {timeout: 30000}).toBe(true);
}

test("T-1807 真实宿主快照写放大与重载一致性", async ({page}) => {
    test.skip(!enabled, "设置 CHECKIN_STORAGE_HOST_BENCHMARK=1 或运行 pnpm run benchmark:storage:host");
    test.skip(counts.length === 0, "CHECKIN_STORAGE_HOST_COUNTS 没有有效样本");

    const client = createClient();
    const report = [];
    for (const eventCount of counts) {
        const suffix = `${eventCount}-${Date.now()}`;
        const seed = makeStore(eventCount, suffix, attachmentBytes);
        await client.putFile("checkin-store", seed);
        await page.reload();
        await openCheckin(page);

        const itemId = seed.items[0].id;
        const before = await readStorageBytes(client, "checkin-store");
        const startedAt = Date.now();
        const eventId = await page.evaluate(async (id) => {
            const event = await window.siyuanCheckin.recordEvent({itemId: id, source: "api", externalRef: `e2e:t1807:${id}`});
            return event?.id;
        }, itemId);
        const elapsedMs = Date.now() - startedAt;
        expect(typeof eventId).toBe("string");
        await waitForEvent(client, itemId, eventId);

        const after = await readStorageBytes(client, "checkin-store");
        const backup = await readStorageBytes(client, "checkin-store-backup");
        const snapshots = Array.isArray(backup.value?.snapshots) ? backup.value.snapshots : [];
        expect(snapshots.length).toBeGreaterThan(0);

        /* 重载后再读一次，确认真实 loadData 没有丢失已提交事件或重复事实。 */
        await page.reload();
        await openCheckin(page);
        const reloaded = await client.getFile("checkin-store");
        expect((reloaded?.events || []).filter((event) => event.id === eventId)).toHaveLength(1);

        report.push({
            eventCount,
            beforeBytes: before.bytes,
            afterBytes: after.bytes,
            backupBytes: backup.bytes,
            snapshotCount: snapshots.length,
            elapsedMs,
            reloadRetainedEvent: true,
        });
    }

    const outputPath = process.env.T1807_HOST_OUTPUT || path.resolve(".artifacts", "storage-host-benchmark.json");
    fs.mkdirSync(path.dirname(outputPath), {recursive: true});
    fs.writeFileSync(outputPath, `${JSON.stringify({format: "siyuan-checkin-storage-host-benchmark", version: 1, generatedAt: new Date().toISOString(), attachmentBytes, report}, null, 2)}\n`);
    console.log(`T-1807 host benchmark: ${JSON.stringify(report)}; report ${outputPath}`);
});

test("T-1807 真实宿主双窗口并发写入保持两条事实", async ({browser}) => {
    test.skip(!enabled, "设置 CHECKIN_STORAGE_HOST_BENCHMARK=1 或运行 pnpm run benchmark:storage:host");

    const client = createClient();
    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();
    try {
        await Promise.all([openCheckin(pageA), openCheckin(pageB)]);
        const suffix = `concurrent-${Date.now()}`;
        /* A binary item with a seeded event is already complete, so it would
           reject both concurrent calls before exercising the storage lock.
           Start empty and use a count item that accepts two independent facts. */
        const seed = makeStore(0, suffix);
        seed.items[0].kind = "count";
        seed.items[0].target = 100;
        await client.putFile("checkin-store", seed);
        await Promise.all([pageA.reload(), pageB.reload()]);
        await Promise.all([openCheckin(pageA), openCheckin(pageB)]);
        const itemId = seed.items[0].id;
        await Promise.all([
            expect.poll(() => pageA.evaluate((id) => window.siyuanCheckin.getItems().some((item) => item.id === id), itemId), {timeout: 20000}).toBe(true),
            expect.poll(() => pageB.evaluate((id) => window.siyuanCheckin.getItems().some((item) => item.id === id), itemId), {timeout: 20000}).toBe(true),
        ]);

        const refs = [`e2e:t1807:concurrent:a:${suffix}`, `e2e:t1807:concurrent:b:${suffix}`];
        const results = await Promise.all([
            pageA.evaluate((payload) => window.siyuanCheckin.recordEvent({itemId: payload.itemId, source: "api", externalRef: payload.externalRef}), {itemId, externalRef: refs[0]}),
            pageB.evaluate((payload) => window.siyuanCheckin.recordEvent({itemId: payload.itemId, source: "api", externalRef: payload.externalRef}), {itemId, externalRef: refs[1]}),
        ]);
        expect(results.every((event) => typeof event?.id === "string"), "两个并发调用都必须返回已写入事件").toBe(true);
        expect(new Set(results.map((event) => event?.id)).size, "两个独立 externalRef 不得共享同一事件身份").toBe(2);

        await expect.poll(async () => {
            const store = await client.getFile("checkin-store");
            return (store?.events || []).filter((event) => refs.includes(event.externalRef)).map((event) => event.externalRef).sort();
        }, {timeout: 30000, message: "真实宿主并发写入后应同时保留两个 externalRef"}).toEqual([...refs].sort());

        await Promise.all([pageA.reload(), pageB.reload()]);
        await Promise.all([openCheckin(pageA), openCheckin(pageB)]);
        for (const page of [pageA, pageB]) {
            await expect.poll(() => page.evaluate((payload) => {
                const events = window.siyuanCheckin.getEvents().filter((event) => payload.refs.includes(event.externalRef));
                return [...new Set(events.map((event) => event.externalRef))].sort();
            }, {refs}), {timeout: 30000}).toEqual([...refs].sort());
        }
        const evidence = {format: "siyuan-checkin-storage-host-concurrency", version: 1, generatedAt: new Date().toISOString(), refs, eventIds: results.map((event) => event?.id), persistedCount: 2, reloadConverged: true};
        const outputPath = process.env.T1807_HOST_CONCURRENCY_OUTPUT || path.resolve(".artifacts/storage-host-concurrency.json");
        fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
        console.log(`T-1807 concurrent host evidence: ${JSON.stringify(evidence)}; report ${outputPath}`);
    } finally {
        await context.close();
    }
});
