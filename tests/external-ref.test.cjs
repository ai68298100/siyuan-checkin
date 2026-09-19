const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

const ecosystemSource = read("ecosystem.ts");
const opsSource = read("plugin-ops.ts");

/* 结构守门：注册表、解析器与 Loop 迁移降级边界齐全。 */
assert.match(ecosystemSource, /EXTERNAL_REF_PREFIX_REGISTRY/, "prefix registry is exported");
assert.match(ecosystemSource, /export function isRegisteredExternalRefPrefix/, "registry lookup helper exists");
assert.match(ecosystemSource, /export function parseExternalRef/, "generic externalRef parser exists");
assert.match(opsSource, /importLoopPlanInto/, "Loop import executor present");
assert.match(opsSource, /downloadLoopExportFor/, "Loop export downloader present");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-external-ref-"));
for (const filename of ["types.ts", "api-contract.ts", "ecosystem.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const ecosystem = require(path.join(outputRoot, "ecosystem.js"));

/* 前缀注册表：taskhorizon 已登记，格式说明完整。 */
assert.ok(ecosystem.EXTERNAL_REF_PREFIX_REGISTRY.length >= 1, "registry has at least one entry");
const th = ecosystem.EXTERNAL_REF_PREFIX_REGISTRY.find((entry) => entry.prefix === "taskhorizon");
assert.ok(th, "taskhorizon prefix registered");
assert.ok(th.format.includes("<blockId>") && th.format.includes("<localDate>"), "taskhorizon format documented");
assert.ok(Object.isFrozen(ecosystem.EXTERNAL_REF_PREFIX_REGISTRY), "registry is frozen");

/* 通用 externalRef 解析：prefix:identity:date 三段式。 */
const parsed = ecosystem.parseExternalRef("taskhorizon:20260919084107-82e21wr:2026-09-19");
assert.deepEqual(parsed, {prefix: "taskhorizon", identity: "20260919084107-82e21wr", date: "2026-09-19"});
assert.equal(ecosystem.parseExternalRef("no-prefix-at-all"), undefined, "values without a prefix are rejected");
assert.equal(ecosystem.parseExternalRef(":identity:2026-09-19"), undefined, "empty prefix rejected");
assert.equal(ecosystem.parseExternalRef("taskhorizon"), undefined, "bare prefix rejected");
assert.equal(ecosystem.parseExternalRef("taskhorizon:identity:not-a-date"), undefined, "bad date rejected");
assert.equal(ecosystem.parseExternalRef("taskhorizon:identity:"), undefined, "empty date rejected");
assert.equal(ecosystem.parseExternalRef("x".repeat(300)), undefined, "oversized values rejected");

/* 已注册前缀查询。 */
assert.equal(ecosystem.isRegisteredExternalRefPrefix("taskhorizon"), true);
assert.equal(ecosystem.isRegisteredExternalRefPrefix("unknown-plugin"), false);
assert.equal(ecosystem.isRegisteredExternalRefPrefix(123), false);

console.log("ExternalRef registry checks passed: prefix parsing, registry lookup and validation boundaries.");
