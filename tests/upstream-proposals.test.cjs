/* T-1395 上游公开 API 协同提案守门：
   ① 三份草案夹具为 draft 且结构完整；
   ② 提案正文与夹具互相引用、双轨纪律/隐私红线成文；
   ③ 夹具引用的身份前缀/能力/刷新事件与本仓真实代码一致（草案可引用事实，不可虚构契约）。 */
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const proposalsDir = path.join(root, "docs", "contracts", "upstream-proposals");
const doc = fs.readFileSync(path.join(root, "docs", "upstream-api-proposals-2026-09.md"), "utf8");

/* ---------- ① 夹具结构 ---------- */

const fixtureNames = [
    "sireader-lifecycle-api-v1.json",
    "siplayer-playback-api-v1.json",
    "taskhorizon-calendar-consumer-v1.json",
];
const fixtures = fixtureNames.map((name) => {
    const raw = fs.readFileSync(path.join(proposalsDir, name), "utf8");
    const json = JSON.parse(raw);
    assert.equal(json.status, "draft", `${name} must stay draft until upstream ships`);
    assert.equal(json.version, 1, `${name} must be versioned`);
    assert.ok(json.updatedAt, `${name} must carry updatedAt`);
    return {name, json};
});
const byProposal = Object.fromEntries(fixtures.map((f) => [f.json.proposal, f.json]));

for (const key of ["sireader-lifecycle-api", "siplayer-playback-api"]) {
    const spec = byProposal[key];
    assert.ok(spec.targetPlugin && spec.targetEvidence?.repository, `${key} must cite upstream evidence`);
    assert.ok(spec.proposedSurface?.protocol && spec.proposedSurface?.version, `${key} must propose discovery + version`);
    assert.ok(spec.proposedSurface?.capabilities?.length >= 2, `${key} must propose capability list`);
    assert.ok(spec.effectiveTimeRule, `${key} must freeze the effective-time semantics`);
    assert.ok(spec.consumer?.externalRefPrefix && spec.consumer?.externalRefFormat, `${key} must pin the consumer identity`);
    assert.ok(spec.consumer?.canonicalSourceRule?.includes("never double-count"), `${key} must bind the no-double-count rule`);
    assert.ok(Array.isArray(spec.privacy?.forbidden) && spec.privacy.forbidden.length >= 3, `${key} must list privacy red lines`);
}
const consumer = byProposal["taskhorizon-calendar-consumer"];
assert.equal(consumer.consumes.protocol, "siyuan-checkin", "consumer draft must target the checkin protocol");
assert.ok(consumer.consumes.capabilities.includes("calendar.read"), "consumer draft must consume calendar.read");
assert.ok(consumer.consumerRules.length >= 5, "consumer draft must bind the layer rules");
assert.ok(consumer.consumes.projectionPrivacy.includes("no externalRef"), "consumer draft must keep the projection privacy note");

/* ---------- ② 文档 ↔ 夹具同步 ---------- */

for (const name of fixtureNames) assert.ok(doc.includes(name), `proposal doc must reference ${name}`);
assert.ok(doc.includes("sireader-integration") && doc.includes("siplayer-integration"), "doc must present both proposed protocols");
assert.ok(doc.includes("禁止把 `currentTime` 差值直接当观看时长"), "doc must state the currentTime red line");
assert.ok(doc.includes("reader_stats") && doc.includes("daily.json"), "doc must state the sireader privacy red line");
assert.ok(doc.includes("唯一 canonical source"), "doc must state the single canonical source rule");
assert.ok(doc.includes("未经用户明确授权不得向外部仓库提交"), "doc must forbid unauthorized external submissions");
assert.ok(doc.includes("合并 → 发布 → 真实思源宿主验收"), "doc must state the three promotion gates");
assert.ok(doc.includes("getCalendarProjection"), "doc must present the consumer example against the real method");

/* ---------- ③ 夹具引用的事实与真实代码一致 ---------- */

const ecosystem = fs.readFileSync(path.join(root, "src", "ecosystem.ts"), "utf8");
for (const prefix of ["sireader", "siplayer"]) {
    assert.ok(ecosystem.includes(`prefix: "${prefix}"`), `fixture identity ${prefix}: must exist in EXTERNAL_REF_PREFIX_REGISTRY`);
}
assert.ok(ecosystem.includes("TASK_HORIZON_EXTERNAL_REF_PREFIX"), "taskhorizon: identity must exist in EXTERNAL_REF_PREFIX_REGISTRY (via its constant)");
assert.ok(ecosystem.includes(`format: "sireader:<itemId>:<localDate>"`), "sireader ref format must match the registry");
assert.ok(ecosystem.includes(`format: "siplayer:<itemId>:<localDate>"`), "siplayer ref format must match the registry");

const apiContract = fs.readFileSync(path.join(root, "src", "api-contract.ts"), "utf8");
assert.ok(apiContract.includes('"calendar.read"'), "calendar.read capability must exist in the api contract");
assert.match(apiContract, /"calendar\.read": 5,/, "calendar.read must be a since-5 capability");
for (const event of consumer.consumerRules
    .find((rule) => rule.startsWith("refresh only on")).replace("refresh only on ", "")
    .split(", ")) {
    const normalized = `checkin:${event.trim().replace(/^checkin:/, "")}`;
    assert.ok(apiContract.includes(`"${normalized}"`), `refresh event ${normalized} must exist in the api contract`);
}

const apiFacade = fs.readFileSync(path.join(root, "src", "api.ts"), "utf8");
assert.ok(apiFacade.includes("getCalendarProjection"), "facade must expose getCalendarProjection");

const projection = fs.readFileSync(path.join(root, "src", "features", "calendar-projection.ts"), "utf8");
for (const status of consumer.consumes.statuses) {
    assert.ok(projection.includes(`"${status}"`), `projection status ${status} must exist in the implementation`);
}
assert.ok(projection.includes("taskHorizonCalendarVisible !== false"), "projection must server-side filter hidden items");
assert.ok(projection.includes("!item.archived"), "projection must server-side filter archived items");

const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.ok(indexSource.includes('"reader:open"') && indexSource.includes('"reader:close"'), "fallback must really listen to the four sireader events");

console.log("upstream proposal gates passed: three draft fixtures, doc-fixture-code sync, dual-track discipline, privacy red lines, no fabricated contracts");
