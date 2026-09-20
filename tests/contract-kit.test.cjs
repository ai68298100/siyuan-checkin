/* T-1364 契约自测包守门：包内 manifest 与仓库契约清单强制一致（字节级）；
   自测程序对合规 mock 全过、对变异违规逐项捕获；准入清单成文。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const kitRoot = path.join(__dirname, "..", "contracts", "siyuan-checkin-contract");

/* 包内 manifest 必须与仓库契约清单字节一致（同源发布，防两处漂移）。 */
const kitManifest = fs.readFileSync(path.join(kitRoot, "manifest.json"), "utf8");
const repoManifest = fs.readFileSync(path.join(__dirname, "..", "docs", "contracts", "checkin-api-v5.json"), "utf8");
assert.equal(kitManifest.trim(), repoManifest.trim(), "kit manifest must be byte-identical to docs/contracts/checkin-api-v5.json");

/* 准入清单成文：五项准入要求逐条可读。 */
const readme = fs.readFileSync(path.join(kitRoot, "README.md"), "utf8");
for (const item of ["身份", "幂等", "卸载清理", "权限声明", "失败隔离"]) {
    assert.ok(readme.includes(item), `admission checklist must cover "${item}"`);
}
const kitPackage = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
assert.equal(kitPackage.name, "siyuan-checkin-contract");
assert.match(kitPackage.version, /^5\./, "kit major version tracks the API version");

const manifest = JSON.parse(kitManifest);

(async () => {
const kitUrl = "file:///" + path.join(kitRoot, "check-contract.mjs").replace(/\\/g, "/").replace(/^([A-Z]:)/, (m) => m.toLowerCase());
const {runContractChecks} = await import(kitUrl);

/* 合规 mock：完全按 manifest 实现。 */
function compliantApi() {
    const caps = manifest.capabilities.map((entry) => entry.name);
    const since = Object.fromEntries(manifest.capabilities.map((entry) => [entry.name, entry.since]));
    const info = Object.fromEntries(manifest.capabilities.map((entry) => [entry.name, {available: true, localOnly: entry.localOnly, effect: entry.effect}]));
    return {
        name: manifest.apiObjectName,
        protocol: manifest.apiProtocol,
        version: manifest.apiVersion,
        storeVersion: manifest.storeVersion,
        capabilities: caps,
        capabilitiesSince: since,
        events: [...manifest.events],
        hasCapability: (name) => caps.includes(name),
        describe: () => ({protocol: manifest.apiProtocol, version: manifest.apiVersion, storeVersion: manifest.storeVersion, capabilities: caps, capabilitiesSince: since, events: [...manifest.events]}),
        getCapabilityInfo: () => info,
        queryItems: () => [],
        getEventsInRange: async () => ({events: [], truncated: false}),
        getStreaks: () => [],
        getDiagnostics: () => [],
        recordEventsBatch: async (inputs) => inputs.length > manifest.limits.batchRecord.maxItems
            ? inputs.map(() => ({kind: "rejected"}))
            : inputs.map((input) => input.source === "impersonated" || input.source !== "api" ? {kind: "rejected"} : {kind: "recorded"}),
    };
}

const good = await runContractChecks({api: compliantApi()});
assert.equal(good.failures.length, 0, `compliant mock must pass the full kit: ${JSON.stringify(good.failures)}`);
assert.ok(good.passed >= 30, `compliance must be verified by a meaningful number of checks (got ${good.passed})`);

/* 变异验证：逐项违规必须被捕获。 */
async function expectFailure(mutate, fragment) {
    const api = compliantApi();
    mutate(api);
    const report = await runContractChecks({api, deep: false});
    const reportDeep = await runContractChecks({api: Object.assign(compliantApi(), api), deep: true});
    const all = [...report.failures, ...reportDeep.failures];
    assert.ok(all.some((failure) => failure.includes(fragment)), `violation "${fragment}" must be caught, got: ${JSON.stringify(all)}`);
}

await expectFailure((api) => {
    api.hasCapability = (name) => name !== "metrics.read" && capsHas(api, name);
}, "metrics.read");
function capsHas(api, name) { return api.capabilities.includes(name); }

await expectFailure((api) => {
    api.describe = () => ({protocol: api.protocol, version: 5, storeVersion: 2, capabilities: api.capabilities, capabilitiesSince: {}, events: api.events.slice(0, 3)});
}, "integration events");

await expectFailure((api) => {
    api.recordEventsBatch = async (inputs) => inputs; // 透传非法输入且不标注 rejected
}, "rejected");

await expectFailure((api) => {
    api.getEventsInRange = async () => ({truncated: false}); // 丢失 events 数组
}, "getEventsInRange must return {events, truncated}");

/* effect 漂移：写能力丢失 localOnly 必须被抓。 */
const drifted = compliantApi();
const info = drifted.getCapabilityInfo();
info["events.record"].localOnly = false;
const driftReport = await runContractChecks({api: drifted, deep: false});
assert.ok(driftReport.failures.some((failure) => failure.includes("events.record")), "write capability losing localOnly must be caught");

console.log(`contract kit gates passed: manifest byte-sync, ${good.passed} compliance checks, 4 mutation captures, admission checklist`);
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
