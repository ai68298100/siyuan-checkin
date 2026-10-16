/* T-1807: observe main-store snapshot write amplification.
 *
 * This is intentionally a benchmark, not a release gate. It exercises the
 * model snapshot/history and verified-write helpers without starting Plugin
 * or a real SiYuan host. Run with `node --expose-gc scripts/storage-snapshot-benchmark.cjs`.
 */
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {performance} = require("node:perf_hooks");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourceRoot = path.join(projectRoot, "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-storage-snapshot-"));

function compile(filename) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        fileName: filename,
    }).outputText;
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), output);
}
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "date-keys.ts", "rules.ts", "model.ts", "storage-transaction.ts"]) compile(filename);
const model = require(path.join(outputRoot, "model.js"));
const transaction = require(path.join(outputRoot, "storage-transaction.js"));

const SCALES = (process.env.T1807_EVENT_COUNTS || "1000,10000,100000").split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0);
const VARIANTS = [
    {name: "plain", attachments: false, tombstones: false},
    {name: "attachments-sparse", attachments: true, tombstones: false},
    {name: "tombstones", attachments: false, tombstones: true},
];
const CAPTURED_AT = "2026-10-15T00:00:00.000Z";
const attachment = `data:image/png;base64,${Buffer.from("x".repeat(192)).toString("base64")}`;

function makeItem(index) {
    return {
        id: `item-${index}`, name: `项目 ${index}`, icon: "✓", kind: "binary", target: 1,
        unit: "次", schedule: {type: "daily"}, createdDate: "2026-01-01",
        createdAt: "2026-01-01T00:00:00.000Z", updatedAt: CAPTURED_AT, revisions: [],
        archivePeriods: [], archived: false, group: index % 2 ? "学习" : "健康",
        priority: "medium", sortOrder: index, timeSlot: "any",
    };
}

function makeStore(eventCount, variant) {
    const itemCount = Math.max(40, Math.min(100, Math.ceil(eventCount / 1_000)));
    const items = Array.from({length: itemCount}, (_, index) => makeItem(index));
    const events = Array.from({length: eventCount}, (_, index) => ({
        id: `event-${index}`, itemId: `item-${index % itemCount}`,
        occurredAt: CAPTURED_AT, localDate: "2026-10-15", value: 1, unit: "次",
        source: index % 3 === 0 ? "import" : index % 2 ? "manual" : "api",
        ...(index % 2 ? {} : {externalRef: `external-${index}`}),
        ...(variant.attachments && index % 100 === 0 ? {attachment} : {}),
    }));
    const deletedItems = variant.tombstones ? Math.max(1, Math.floor(itemCount * 0.05)) : 0;
    const itemTombstones = Array.from({length: deletedItems}, (_, index) => ({itemId: `item-${index}`, deletedAt: CAPTURED_AT}));
    const eventTombstones = variant.tombstones
        ? Array.from({length: Math.floor(eventCount * 0.1)}, (_, index) => ({
            eventId: `deleted-event-${index}`, deletedAt: CAPTURED_AT,
            source: index % 2 ? "manual" : "api",
            ...(index % 2 ? {} : {externalRef: `deleted-external-${index}`}),
        }))
        : [];
    return model.normalizeStore({version: 2, items, events, eventTombstones, itemTombstones});
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function bytes(value) { return Buffer.byteLength(JSON.stringify(value), "utf8"); }
function p95(values) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}
function timing(samples, result) {
    return {medianMs: Number([...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)].toFixed(3)), p95Ms: Number(p95(samples).toFixed(3)), samplesMs: samples.map((value) => Number(value.toFixed(3))), result};
}
async function measure(operation, rounds = 3) {
    const samples = [];
    let result;
    for (let index = 0; index < rounds; index += 1) {
        if (global.gc) global.gc();
        const startedAt = performance.now();
        result = await operation();
        samples.push(performance.now() - startedAt);
    }
    return timing(samples, result);
}
function heapSnapshot() {
    const memory = process.memoryUsage();
    return {heapUsed: memory.heapUsed, rss: memory.rss, external: memory.external, arrayBuffers: memory.arrayBuffers};
}

function simulatePersistFailurePhases(store, history1) {
    const beforePrimary = clone(store);
    const beforeBackup = clone(history1);
    const failure = (phase) => {
        let primary = clone(beforePrimary);
        let backup = clone(beforeBackup);
        const startedAt = performance.now();
        try {
            const previous = clone(primary);
            const nextBackup = model.appendStoreSnapshotHistory(backup, model.createStoreSnapshotEnvelope(previous, CAPTURED_AT), 3);
            if (phase === "backup-write") throw new Error("simulated-backup-write-failure");
            backup = nextBackup;
            if (phase === "primary-write") throw new Error("simulated-primary-write-failure");
            primary = clone(store);
        } catch (error) {
            return {
                phase, elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
                error: error.message, primaryUnchanged: JSON.stringify(primary) === JSON.stringify(beforePrimary),
                backupUnchanged: JSON.stringify(backup) === JSON.stringify(beforeBackup),
                backupChanged: JSON.stringify(backup) !== JSON.stringify(beforeBackup),
            };
        }
        throw new Error(`failure simulation did not fail: ${phase}`);
    };
    return {backupWriteFailure: failure("backup-write"), primaryWriteFailure: failure("primary-write")};
}

async function runScenario(eventCount, variant) {
    const rounds = eventCount >= 100_000 ? 3 : 5;
    const raw = {
        version: 2,
        items: Array.from({length: Math.max(40, Math.min(100, Math.ceil(eventCount / 1_000)))}, (_, index) => makeItem(index)),
        events: Array.from({length: eventCount}, (_, index) => ({
            id: `event-${index}`, itemId: `item-${index % Math.max(40, Math.min(100, Math.ceil(eventCount / 1_000)))}`,
            occurredAt: CAPTURED_AT, localDate: "2026-10-15", value: 1, unit: "次", source: index % 3 === 0 ? "import" : index % 2 ? "manual" : "api",
            ...(index % 2 ? {} : {externalRef: `external-${index}`}),
            ...(variant.attachments && index % 100 === 0 ? {attachment} : {}),
        })),
        eventTombstones: variant.tombstones ? Array.from({length: Math.floor(eventCount * 0.1)}, (_, index) => ({eventId: `deleted-event-${index}`, deletedAt: CAPTURED_AT})) : [],
        itemTombstones: variant.tombstones ? Array.from({length: Math.max(1, Math.floor(Math.max(40, Math.min(100, Math.ceil(eventCount / 1_000))) * 0.05))}, (_, index) => ({itemId: `item-${index}`, deletedAt: CAPTURED_AT})) : [],
    };
    const normalized = await measure(() => model.normalizeStore(raw), rounds);
    const store = normalized.result;
    const envelope = model.createStoreSnapshotEnvelope(store, CAPTURED_AT);
    const history1 = model.appendStoreSnapshotHistory(undefined, envelope, 3);
    const history3 = model.appendStoreSnapshotHistory(model.appendStoreSnapshotHistory(history1, envelope, 3), envelope, 3);
    const rawBytes = bytes(raw);
    const primaryBytes = bytes(store);
    const history1Bytes = bytes(history1);
    const history3Bytes = bytes(history3);
    const beforeMemory = heapSnapshot();
    const historyRead = await measure(() => model.readStoreSnapshotHistory(history3), rounds);
    const afterMemory = heapSnapshot();
    const append = await measure(() => model.appendStoreSnapshotHistory(history3, envelope, 3), rounds);
    const serialize = await measure(() => JSON.stringify(history3), rounds);
    const parse = await measure(() => JSON.parse(serialize.result), rounds);
    const restorePreflight = await measure(() => model.normalizeStore(JSON.parse(JSON.stringify(store))), rounds);
    const serializeHistoryBytes = Buffer.byteLength(serialize.result, "utf8");

    async function verifiedWrite(deepCloneHost) {
        let remote = deepCloneHost ? clone(store) : structuredClone(store);
        let saves = 0;
        let loads = 0;
        const result = await transaction.persistNormalizedStoreWithVerification(
            store,
            async () => { loads += 1; return deepCloneHost ? clone(remote) : structuredClone(remote); },
            async (candidate) => { saves += 1; remote = deepCloneHost ? clone(candidate) : structuredClone(candidate); },
        );
        return {attempts: result.attempts, saves, loads, bytes: bytes(remote)};
    }
    const verifyNoClone = await measure(() => verifiedWrite(false), rounds);
    const verifyDeepClone = await measure(() => verifiedWrite(true), rounds);
    const verifyRepair = await measure(async () => {
        let remote = clone(store);
        let saves = 0;
        let loads = 0;
        const result = await transaction.persistNormalizedStoreWithVerification(
            store,
            async () => {
                loads += 1;
                if (loads === 1) {
                    const stale = clone(remote);
                    stale.events = [];
                    stale.events.push({id: `remote-race-${eventCount}`, itemId: stale.items[0].id, occurredAt: CAPTURED_AT, localDate: "2026-10-15", value: 1, unit: "次", source: "api", externalRef: `remote-race-${eventCount}`});
                    return stale;
                }
                return clone(remote);
            },
            async (candidate) => {
                saves += 1;
                remote = clone(candidate);
                if (saves === 1) remote.events.push({id: `remote-race-${eventCount}`, itemId: remote.items[0].id, occurredAt: CAPTURED_AT, localDate: "2026-10-15", value: 1, unit: "次", source: "api", externalRef: `remote-race-${eventCount}`});
            },
        );
        return {attempts: result.attempts, repaired: result.repaired, saves, loads, retainedRaceEvent: remote.events.some((event) => event.id === `remote-race-${eventCount}`)};
    }, rounds);
    assert.equal(verifyRepair.result.attempts, 2, `injected readback race must force a bounded repair attempt: ${JSON.stringify(verifyRepair.result)}`);
    assert.equal(verifyRepair.result.repaired, true, "injected readback race must report repaired=true");
    assert.equal(verifyRepair.result.retainedRaceEvent, true, "repair must retain the concurrent remote event");
    const rollback = await measure(async () => {
        const before = clone(store);
        try {
            await transaction.persistNormalizedStoreWithVerification(store, async () => clone(before), async () => { throw new Error("simulated-write-failure"); });
        } catch (error) {
            assert.equal(error.message, "simulated-write-failure");
        }
        return {primaryUnchanged: JSON.stringify(before) === JSON.stringify(store)};
    }, rounds);
    const failurePhases = simulatePersistFailurePhases(store, history1);
    assert.equal(failurePhases.backupWriteFailure.primaryUnchanged, true, "backup failure keeps primary unchanged");
    assert.equal(failurePhases.backupWriteFailure.backupUnchanged, true, "backup failure keeps backup unchanged");
    assert.equal(failurePhases.primaryWriteFailure.primaryUnchanged, true, "primary failure keeps primary unchanged");
    assert.equal(failurePhases.primaryWriteFailure.backupChanged, true, "primary failure occurs after backup write in persist order");
    const reconciliation = await measure(() => {
        const baseline = clone(store);
        const local = clone(store);
        local.events.push({...local.events[0], id: `local-${eventCount}`, externalRef: `local-${eventCount}`});
        const remote = clone(store);
        remote.events.push({...remote.events[0], id: `remote-${eventCount}`, externalRef: `remote-${eventCount}`});
        const result = transaction.reconcileNormalizedStoreSnapshots(baseline, local, remote);
        return {localChanged: result.localChanged, remoteNeedsWrite: result.remoteNeedsWrite, mergedEvents: result.merged.events.length};
    }, rounds);
    return {
        eventCount, variant: variant.name, rounds,
        counts: {items: store.items.length, events: store.events.length, eventTombstones: store.eventTombstones.length, itemTombstones: (store.itemTombstones || []).length, attachmentEvents: store.events.filter((event) => event.attachment).length},
        bytes: {raw: rawBytes, primary: primaryBytes, history1: history1Bytes, history3: history3Bytes, serializedHistory3: serializeHistoryBytes, amplificationHistory3PlusPrimary: Number(((primaryBytes + history3Bytes) / Math.max(1, primaryBytes)).toFixed(3))},
        memoryDelta: Object.fromEntries(Object.keys(beforeMemory).map((key) => [key, Math.max(0, afterMemory[key] - beforeMemory[key])])),
        repairSummary: verifyRepair.result,
        failurePhases,
        timings: {normalize: {...normalized, result: undefined}, historyRead: {...historyRead, result: undefined}, appendHistory3: {...append, result: undefined}, serializeHistory3: {...serialize, result: undefined}, parseHistory3: {...parse, result: undefined}, restorePreflight: {...restorePreflight, result: undefined}, verifyNoClone: {...verifyNoClone, result: undefined}, verifyDeepClone: {...verifyDeepClone, result: undefined}, verifyRepair: {...verifyRepair, result: undefined}, rollback: {...rollback, result: undefined}, reconcile: {...reconciliation, result: undefined}},
    };
}

(async () => {
    const startedAt = performance.now();
    const scenarios = [];
    for (const eventCount of SCALES) for (const variant of VARIANTS) scenarios.push(await runScenario(eventCount, variant));
    const report = {
        format: "siyuan-checkin-storage-snapshot-benchmark", version: 1, generatedAt: new Date().toISOString(),
        git: cp.execFileSync("git", ["rev-parse", "HEAD"], {cwd: projectRoot, encoding: "utf8"}).trim(),
        node: process.version, platform: `${process.platform}/${process.arch}`, cpu: os.cpus()[0]?.model || "unknown", gcExposed: Boolean(global.gc), historyLimit: 3,
        scenarios, elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
    };
    const artifactDir = path.join(projectRoot, ".artifacts");
    fs.mkdirSync(artifactDir, {recursive: true});
    const outputPath = path.join(artifactDir, "storage-snapshot-benchmark.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`T-1807 storage snapshot benchmark complete: ${scenarios.length} scenarios, ${Math.round(report.elapsedMs)}ms total.`);
    for (const scenario of scenarios) {
        const t = scenario.timings;
        console.log(`${scenario.eventCount} | ${scenario.variant} | primary=${scenario.bytes.primary}B | history3=${scenario.bytes.history3}B | append=${t.appendHistory3.medianMs}ms | serialize=${t.serializeHistory3.medianMs}ms | verify(clone)=${t.verifyDeepClone.medianMs}ms | repair=${t.verifyRepair.medianMs}ms | rollback=${t.rollback.medianMs}ms`);
    }
    console.log(`report: ${outputPath}`);
})().catch((error) => { console.error(error); process.exit(1); });
