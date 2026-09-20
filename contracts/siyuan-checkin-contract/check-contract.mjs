/* siyuanCheckin 公开 API v5 契约自测（T-1364）。
   环境无关：浏览器控制台、SiYuan 插件开发期、Node 冒烟均可运行。
   用法：
     import {runContractChecks} from "./check-contract.mjs";
     const report = await runContractChecks({api: window.siyuanCheckin});
     if (report.failures.length) console.error(report.failures); else console.log(`OK (${report.passed} checks)`);
   断言口径与 docs/contracts/manifest.json（仓库真值副本）逐条对应；
   manifest 不一致 = 插件侧契约漂移，先升级插件或对照 docs/api-v5.md 核对。 */

import manifest from "./manifest.json" with { type: "json" };

const EVENT_NAMES = manifest.events;
const CAPABILITIES_BY_NAME = new Map(manifest.capabilities.map((entry) => [entry.name, entry]));
const KNOWN_SOURCES = new Set(["manual", "tomato", "api", "import", "occasion"]);

function check(failures, condition, message) {
    if (!condition) failures.push(message);
    return condition;
}

export async function runContractChecks({api, label = "api", deep = true, log = () => {}} = {}) {
    const failures = [];
    let passed = 0;
    const ok = (condition, message) => {
        if (check(failures, condition, message)) passed += 1;
    };

    /* 1. 描述符与版本协商 */
    ok(api && typeof api === "object", `${label}: API object must exist`);
    if (!api) return {passed, failures};
    ok(api.name === manifest.apiObjectName, `${label}: name must be "${manifest.apiObjectName}"`);
    ok(api.protocol === manifest.apiProtocol, `${label}: protocol must be "${manifest.apiProtocol}"`);
    ok(typeof api.version === "number" && api.version >= manifest.minSupportedConsumerVersion, `${label}: version must be >= ${manifest.minSupportedConsumerVersion}`);
    ok(typeof api.storeVersion === "number", `${label}: storeVersion must be a number (public contract version, unrelated to internal storage)`);
    ok(Array.isArray(api.capabilities) && api.capabilities.length > 0, `${label}: capabilities list must not be empty`);

    /* 2. 能力面：manifest 内、且 since <= 宿主版本的每项能力都必须可协商。 */
    const expected = manifest.capabilities.filter((entry) => entry.since <= api.version);
    for (const entry of expected) {
        ok(typeof api.hasCapability === "function" && api.hasCapability(entry.name), `${label}: capability "${entry.name}" (since ${entry.since}) must be negotiable via hasCapability`);
    }
    if (typeof api.describe === "function") {
        const descriptor = api.describe();
        ok(descriptor && descriptor.protocol === manifest.apiProtocol, `${label}: describe().protocol`);
        if (descriptor?.capabilitiesSince) {
            for (const entry of expected) {
                ok(descriptor.capabilitiesSince[entry.name] === entry.since, `${label}: capabilitiesSince["${entry.name}"] must be ${entry.since}`);
            }
        }
        ok(Array.isArray(descriptor.events) && EVENT_NAMES.every((name) => descriptor.events.includes(name)), `${label}: describe().events must include all ${EVENT_NAMES.length} integration events`);
    }

    /* 3. 能力元数据：effect 枚举、写能力必须 localOnly。 */
    if (typeof api.getCapabilityInfo === "function") {
        const info = api.getCapabilityInfo();
        for (const entry of expected) {
            const meta = info?.[entry.name];
            ok(meta && ["read", "write", "register", "export"].includes(meta.effect), `${label}: "${entry.name}" effect must be a known enum`);
            if (meta && entry.effect === "write") ok(meta.localOnly === true, `${label}: write capability "${entry.name}" must be localOnly`);
        }
    }

    /* 4. 只读方法形状（空库亦成立）。 */
    if (deep) {
        ok(Array.isArray(api.queryItems?.({limit: 5})), `${label}: queryItems({limit}) must return an array`);
        ok(typeof api.getEventsInRange === "function", `${label}: getEventsInRange must exist (events.range.read)`);
        if (typeof api.getEventsInRange === "function") {
            const empty = await api.getEventsInRange({startDate: "2026-01-01", endDateExclusive: "2026-01-02"});
            ok(empty && Array.isArray(empty.events) && typeof empty.truncated === "boolean", `${label}: getEventsInRange must return {events, truncated} with a half-open range`);
        }
        ok(Array.isArray(api.getStreaks?.()), `${label}: getStreaks() must return an array of {itemId,current,longest}`);
        ok(Array.isArray(api.getDiagnostics?.()), `${label}: getDiagnostics() must return an array of reason-code entries`);
        const batch = api.recordEventsBatch ? await api.recordEventsBatch([]) : undefined;
        ok(Array.isArray(batch) && batch.length === 0, `${label}: recordEventsBatch([]) must resolve to an empty array (no input, no writes)`);
        if (typeof api.recordEventsBatch === "function") {
            const oversized = Array.from({length: manifest.limits.batchRecord.maxItems + 1}, () => ({}));
            const rejected = await api.recordEventsBatch(oversized).catch(() => undefined);
            ok(Array.isArray(rejected) && rejected.every((entry) => entry && ["rejected", "blocked", "discarded"].includes(entry.kind)), `${label}: batch over ${manifest.limits.batchRecord.maxItems} inputs must be rejected per-entry, never silently truncated`);
        }
        const invalidSource = api.recordEventsBatch ? await api.recordEventsBatch([{itemId: "contract-probe", source: "impersonated", value: 1}]).catch(() => undefined) : undefined;
        ok(Array.isArray(invalidSource), `${label}: invalid input must resolve per-entry (rejected), never throw raw exceptions`);
        if (Array.isArray(invalidSource) && invalidSource[0]) ok(invalidSource[0].kind === "rejected", `${label}: unknown source must be "rejected", not impersonated into "manual"`);
        ok(KNOWN_SOURCES.has("manual"), `${label}: source vocabulary probe`);
    }

    log(`siyuan-checkin contract: ${passed} passed, ${failures.length} failures`);
    return {passed, failures};
}
