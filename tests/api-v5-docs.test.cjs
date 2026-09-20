/* T-1341 API v5 稳定文档包守门：源码契约 ↔ 机器可读清单 ↔ 参考文档三方交叉核对。
   三处不一致即失败，防止文档漂移（export-identity-docs 同一模式）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-api-v5-docs-"));
const source = fs.readFileSync("src/api-contract.ts", "utf8");
const target = path.join(outputRoot, "api-contract.js");
fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const contract = require(target);

const manifest = JSON.parse(fs.readFileSync("docs/contracts/checkin-api-v5.json", "utf8"));
const reference = fs.readFileSync("docs/api-v5.md", "utf8");
const ecosystem = fs.readFileSync("docs/ecosystem-integration.md", "utf8");
const design = fs.readFileSync("docs/api-v5-design.md", "utf8");

/* 描述符基本盘 */
assert.equal(contract.CHECKIN_API_PROTOCOL, manifest.apiProtocol);
assert.equal(contract.CHECKIN_API_VERSION, manifest.apiVersion);
assert.equal(contract.CHECKIN_API_VERSION, manifest.version);
const descriptor = contract.getCheckinApiDescriptor();
assert.equal(descriptor.storeVersion, manifest.storeVersion);

/* 能力清单：名称与顺序、since、effect/localOnly 三方一致 */
assert.deepEqual([...contract.CHECKIN_CAPABILITIES], manifest.capabilities.map((entry) => entry.name), "capability order must match the manifest");
for (const entry of manifest.capabilities) {
    assert.equal(contract.CHECKIN_CAPABILITIES_SINCE[entry.name], entry.since, `${entry.name}: capabilitiesSince must match manifest`);
    const info = contract.getCheckinCapabilityInfo()[entry.name];
    assert.equal(info.effect, entry.effect, `${entry.name}: effect must match manifest`);
    assert.equal(info.localOnly, entry.localOnly, `${entry.name}: localOnly must match manifest`);
}
assert.deepEqual(descriptor.capabilitiesSince, contract.CHECKIN_CAPABILITIES_SINCE);

/* 事件与限制 */
assert.deepEqual([...contract.CHECKIN_INTEGRATION_EVENTS], manifest.events);
assert.deepEqual({...contract.CHECKIN_EVENT_RANGE_LIMITS}, manifest.limits.eventRange);
assert.deepEqual({...contract.CHECKIN_EVENTS_READ_LIMITS}, manifest.limits.eventsRead);
assert.deepEqual({...contract.CHECKIN_ITEMS_QUERY_LIMITS}, manifest.limits.itemsQuery);
assert.deepEqual({...contract.CHECKIN_BATCH_RECORD_LIMITS}, manifest.limits.batchRecord);

/* T-1365 错误与诊断码标准化：枚举稳定成文，源码/清单/文档三方一致。 */
const diagnosticsSource = fs.readFileSync("src/features/diagnostics.ts", "utf8");
const diagCodesMatch = diagnosticsSource.match(/CHECKIN_DIAGNOSTIC_CODES[^=]*= \[([^\]]*)\]/);
assert.ok(diagCodesMatch, "diagnostics module must declare the code registry inline");
const sourceCodes = [...diagCodesMatch[1].matchAll(/"([\w-]+)"/g)].map((match) => match[1]);
assert.deepEqual(manifest.diagnosticCodes, sourceCodes, "manifest diagnosticCodes must match the source registry order");
for (const code of manifest.diagnosticCodes) {
    assert.ok(reference.includes(`\`${code}\``), `docs/api-v5.md must document diagnostic code ${code}`);
}
const apiV5Source = fs.readFileSync("src/features/api-v5.ts", "utf8");
for (const reason of manifest.batchBlockedReasons) {
    assert.ok(apiV5Source.includes(`"${reason}"`), `batch writer must implement blocked reason ${reason}`);
}
for (const reason of manifest.batchRejectedReasons) {
    assert.ok(apiV5Source.includes(`"${reason}"`), `batch writer must implement rejected reason ${reason}`);
}
for (const kind of manifest.batchResultKinds) {
    assert.ok(reference.includes(`\`${kind}\``), `docs/api-v5.md must document batch kind ${kind}`);
}
assert.ok(reference.includes("错误模型三原则") || reference.includes("错误与诊断码"), "reference must document the error model");

/* 参考文档：覆盖全部能力名、事件名与关键限制数字 */
for (const name of contract.CHECKIN_CAPABILITIES) {
    assert.ok(reference.includes(`\`${name}\``), `docs/api-v5.md must reference capability ${name}`);
}
for (const event of contract.CHECKIN_INTEGRATION_EVENTS) {
    assert.ok(reference.includes(event), `docs/api-v5.md must reference event ${event}`);
}
for (const number of ["366", "5000", "200", "1000"]) {
    assert.ok(reference.includes(number), `docs/api-v5.md must state the limit ${number}`);
}
assert.match(reference, /storeVersion[^\n]*`2`/, "reference must state the public storeVersion");
assert.match(reference, /内部[\s\S]{0,80}v3[\s\S]{0,80}无关|与用户数据内部迁移无关/, "reference must clarify storeVersion vs internal store version duality");
assert.match(reference, /usedFallbackTime/, "reference must document the fallback-time audit flag");
assert.match(reference, /truncated/, "reference must document the truncation flag");
assert.match(reference, /至少一个完整大版本/, "reference must state the deprecation window");
/* T-1365：弃用预告字段与 manifest 同步存在（当前为空数组）。 */
assert.match(source, /deprecated: Object\.freeze\(\[\]\)/, "descriptor must carry the deprecated capability list");
assert.deepEqual(manifest.deprecatedCapabilities, [], "manifest must carry the deprecated list");
assert.match(reference, /describe\(\)\.deprecated/, "reference must document the deprecated field");
for (const prefix of manifest.externalRefPrefixes) {
    assert.ok(reference.includes(prefix.prefix), `reference must list prefix ${prefix.prefix}`);
}

/* 生态文档互相引用；设计稿标记为过程记录 */
assert.match(ecosystem, /api-v5\.md/, "ecosystem doc must point to the v5 reference");
assert.match(design, /api-v5\.md/, "design draft must point to the v5 reference");
assert.match(reference, /ecosystem-integration\.md/, "reference must point back to the ecosystem guide");

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log(`api v5 docs cross-checks passed: ${manifest.capabilities.length} capabilities, ${manifest.events.length} events, limits synced`);
