/* T-1527 · T-1392 本地切片：calendar.read 消费端参考层守门。
   契约包 calendar-consumer.mjs 的协商/区间规划/刷新分类/归一化/单飞会话
   全部行为 + 合规宿主自检 + 破损宿主诊断矩阵。零网络、零真实宿主。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const kitRoot = path.join(__dirname, "..", "contracts", "siyuan-checkin-contract");
const manifest = JSON.parse(fs.readFileSync(path.join(kitRoot, "manifest.json"), "utf8"));

function makeProjection(range, items, extra = {}) {
    return {startDate: range.startDate, endDateExclusive: range.endDateExclusive, items, totalItems: items.length, truncated: false, ...extra};
}

(async () => {
    const kitUrl = "file:///" + path.join(kitRoot, "calendar-consumer.mjs").replace(/\\/g, "/").replace(/^([A-Z]:)/, (m) => m.toLowerCase());
    const consumer = await import(kitUrl);

    /* ---------- 1. 能力协商 ---------- */
    assert.deepEqual(consumer.negotiateCalendarRead(undefined), {ok: false, reasonKey: "api-missing"});
    assert.deepEqual(consumer.negotiateCalendarRead(null), {ok: false, reasonKey: "api-missing"});
    assert.equal(consumer.negotiateCalendarRead({version: 4, hasCapability: () => false}).reasonKey, "host-outdated", "v4 host reports host-outdated");
    assert.equal(consumer.negotiateCalendarRead({version: 5}).reasonKey, "capability-missing", "no negotiation helper = missing");
    assert.equal(consumer.negotiateCalendarRead({version: 5, hasCapability: () => false}).reasonKey, "capability-missing");
    assert.equal(consumer.negotiateCalendarRead({version: 5, hasCapability: () => true}).reasonKey, "capability-missing", "declared but method absent");
    const goodApi = {
        version: 5,
        hasCapability: (name) => name === "calendar.read",
        getCapabilityInfo: () => ({["calendar.read"]: {effect: "read", localOnly: true}}),
        getCalendarProjection: (range) => makeProjection(range, []),
    };
    assert.deepEqual(consumer.negotiateCalendarRead(goodApi), {ok: true, capability: "calendar.read", since: 5});
    const wrongEffect = {...goodApi, getCapabilityInfo: () => ({["calendar.read"]: {effect: "write"}})};
    assert.equal(consumer.negotiateCalendarRead(wrongEffect).reasonKey, "capability-missing", "non-read effect refuses");

    /* ---------- 2. 区间规划 ---------- */
    assert.equal(consumer.planProjectionRange({startDate: "2026-9-1", endDateExclusive: "2026-10-01"}).reasonKey, "invalid-range");
    assert.equal(consumer.planProjectionRange({startDate: "2026-10-01", endDateExclusive: "2026-09-01"}).reasonKey, "invalid-range");
    assert.equal(consumer.planProjectionRange({startDate: "2026-09-01", endDateExclusive: "2026-09-01"}).reasonKey, "invalid-range");
    assert.equal(consumer.planProjectionRange({startDate: "2026-09-01", endDateExclusive: "2027-09-03"}).reasonKey, "range-too-long", "367 days exceeds maxDays 366");
    const clamped = consumer.planProjectionRange({startDate: "2026-09-01", endDateExclusive: "2028-01-01"}, {clamp: true});
    assert.ok(clamped.ok && clamped.clamped && clamped.days === 366, "clamp cuts to 366 days");
    assert.equal(clamped.range.startDate, "2026-09-01");
    assert.equal(clamped.range.endDateExclusive, "2027-09-02", "366 civil days later (no Date/DST dependence)");
    const february = consumer.planProjectionRange({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    assert.ok(february.ok && february.days === 28 && !february.clamped, "Feb 2026 is 28 days");
    assert.equal(consumer.planProjectionRange({startDate: "2028-02-01", endDateExclusive: "2028-03-01"}).days, 29, "leap year handled");

    /* ---------- 3. 刷新分类（发布事件全集 → 四类） ---------- */
    const classes = Object.fromEntries(manifest.events.map((name) => [name, consumer.planCalendarRefresh(name).klass]));
    assert.deepEqual(classes, {
        "checkin:item-created": "structure",
        "checkin:item-updated": "structure",
        "checkin:event-recorded": "record",
        "checkin:event-deleted": "record",
        "checkin:item-deleted": "structure",
        "checkin:item-archived": "structure",
        "checkin:suggestion-workflow-updated": "unrelated",
        "checkin:analytics-updated": "derived",
    });
    assert.ok(consumer.planCalendarRefresh("checkin:item-updated").refresh, "visibility toggle rides item-updated and refreshes");
    assert.ok(!consumer.planCalendarRefresh("checkin:suggestion-workflow-updated").refresh);
    const unknown = consumer.planCalendarRefresh("unknown-event");
    assert.ok(!unknown.refresh && unknown.klass === "unknown", "unknown events fail closed");

    /* ---------- 4. 防御性归一化 ---------- */
    const point = {date: "2026-09-10", status: "complete", value: 1, target: 1, unit: "次"};
    const item = {itemId: "i1", name: "喝水", icon: "💧", kind: "quantity", unit: "毫升", scheduleType: "daily", points: [point]};
    const normalized = consumer.normalizeCalendarProjection(makeProjection({startDate: "2026-09-01", endDateExclusive: "2026-10-01"}, [item]));
    assert.ok(normalized.ok && normalized.projection.items.length === 1 && normalized.dropped.points === 0);
    assert.equal(normalized.projection.items[0].points[0].status, "complete");
    const dirty = consumer.normalizeCalendarProjection({
        startDate: "2026-09-01", endDateExclusive: "2026-10-01", totalItems: 3, truncated: false,
        items: [
            item,
            {...item, itemId: "", points: [point]},
            {...item, itemId: "i3", points: [{...point, status: "超级完成"}, {...point, date: "2026-09-11"}]},
            null,
        ],
    });
    assert.ok(dirty.ok);
    assert.equal(dirty.projection.items.length, 2, "valid point rescued from mixed item; empty items dropped");
    assert.equal(dirty.dropped.items, 2, "nameless and null items counted");
    assert.equal(dirty.dropped.points, 1, "unknown status point counted");
    assert.ok(dirty.projection.items.every((entry) => entry.points.every((p) => consumer.PROJECTION_STATUSES.includes(p.status))));
    assert.equal(consumer.normalizeCalendarProjection(null).reasonKey, "projection-invalid");
    assert.equal(consumer.normalizeCalendarProjection({items: "no"}).reasonKey, "projection-invalid");
    assert.ok(!("note" in normalized.projection.items[0]) && !("externalRef" in normalized.projection.items[0]), "no invented fields");

    /* ---------- 5. 单飞会话：缓存/单飞/超时/中止 ---------- */
    let calls = 0;
    let latencyMs = 0;
    const clock = {nowMs: 1_000_000};
    const countingApi = {
        ...goodApi,
        getCalendarProjection: (range) => {
            calls += 1;
            if (latencyMs > 0) {
                return new Promise((resolve) => setTimeout(() => resolve(makeProjection(range, [item])), latencyMs));
            }
            return makeProjection(range, [item]);
        },
    };
    const cached = consumer.createCalendarProjectionSession(countingApi, {cacheTtlMs: 5000, now: () => clock.nowMs});
    const first = await cached.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    const second = await cached.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    assert.equal(calls, 1, "second fresh load served from cache");
    assert.ok(first.ok && second.ok && second.fromCache);
    clock.nowMs += 6000;
    const stale = await cached.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    assert.equal(calls, 2, "stale cache never serves old facts");
    assert.ok(!stale.fromCache);
    assert.equal(await cached.load({startDate: "bad", endDateExclusive: "2026-03-01"}).then((r) => r.reasonKey), "invalid-range", "invalid range fails before provider");

    const single = consumer.createCalendarProjectionSession(countingApi, {cacheTtlMs: 0, now: () => clock.nowMs});
    latencyMs = 20;
    const [flightA, flightB] = await Promise.all([
        single.load({startDate: "2026-05-01", endDateExclusive: "2026-06-01"}),
        single.load({startDate: "2026-05-01", endDateExclusive: "2026-06-01"}),
    ]);
    assert.equal(calls, 3, "concurrent same-range loads share one flight");
    assert.ok(flightA.ok && flightB.ok && !flightA.fromCache && !flightB.fromCache);
    latencyMs = 0;

    const hanging = {
        ...goodApi,
        getCalendarProjection: () => new Promise(() => {}),
    };
    const timed = consumer.createCalendarProjectionSession(hanging, {timeoutMs: 30});
    const timeoutResult = await timed.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"});
    assert.deepEqual(timeoutResult, {ok: false, reasonKey: "timeout"}, "hang degrades to a diagnostic, never throws");

    const controller = new AbortController();
    const slowGood = {
        ...goodApi,
        getCalendarProjection: (range) => new Promise((resolve) => setTimeout(() => resolve(makeProjection(range, [item])), 50)),
    };
    const abortSession = consumer.createCalendarProjectionSession(slowGood, {timeoutMs: 5000});
    const pending = abortSession.load({startDate: "2026-02-01", endDateExclusive: "2026-03-01"}, {signal: controller.signal});
    controller.abort();
    const abortResult = await pending;
    assert.ok(!abortResult.ok && abortResult.reasonKey === "aborted", "caller abort is honoured deterministically");

    /* ---------- 6. 合规宿主自检 + 破损宿主诊断 ---------- */
    const solid = {
        version: 5,
        name: "siyuanCheckin",
        protocol: "siyuan-checkin-api",
        hasCapability: (name) => name === "calendar.read",
        getCapabilityInfo: () => ({["calendar.read"]: {effect: "read", localOnly: true}}),
        getCalendarProjection: (range) => {
            const plan = consumer.planProjectionRange(range);
            if (!plan.ok) return undefined;
            if (plan.days > 366) return {startDate: range.startDate, endDateExclusive: range.endDateExclusive, items: [], totalItems: 0, truncated: true};
            return makeProjection(range, [item]);
        },
    };
    const goodReport = await consumer.runCalendarConsumerChecks({api: solid});
    assert.equal(goodReport.failures.length, 0, `compliant host passes: ${goodReport.failures.join("; ")}`);
    assert.ok(goodReport.passed >= 8, `expected a substantive pass count, got ${goodReport.passed}`);

    const legacy = {version: 4, hasCapability: () => false};
    const legacyReport = await consumer.runCalendarConsumerChecks({api: legacy});
    assert.ok(legacyReport.failures.length === 1 && /must be negotiable/.test(legacyReport.failures[0]), "legacy host fails fast with exactly the negotiation failure");

    const throwing = {
        version: 5,
        hasCapability: () => true,
        getCapabilityInfo: () => ({["calendar.read"]: {effect: "read"}}),
        getCalendarProjection: () => {
            throw new Error("boom");
        },
    };
    const throwReport = await consumer.runCalendarConsumerChecks({api: throwing, timeoutMs: 200});
    assert.ok(throwReport.failures.length >= 1 && throwReport.failures.every((line) => !/boom/.test(line)), "host exceptions surface as failures, not crashes");

    console.log(`calendar consumer kit gates passed: negotiation/range/refresh(${manifest.events.length} events)/normalize/session/timeout/abort + compliant(${goodReport.passed}) & legacy & throwing hosts`);
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
