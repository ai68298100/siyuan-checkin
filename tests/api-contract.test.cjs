const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync("src/api-contract.ts", "utf8");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-api-contract-"));
const output = path.join(directory, "api-contract.js");
fs.writeFileSync(output, ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText);

const api = require(output);
assert.equal(api.CHECKIN_API_PROTOCOL, "siyuan-checkin");
assert.equal(api.CHECKIN_API_VERSION, 4);
assert.equal(new Set(api.CHECKIN_CAPABILITIES).size, api.CHECKIN_CAPABILITIES.length);

const descriptor = api.getCheckinApiDescriptor();
assert.deepEqual(descriptor.capabilities, api.CHECKIN_CAPABILITIES);
assert.equal(descriptor.storeVersion, 2);
assert.equal(Object.isFrozen(descriptor), true);
assert.equal(Object.isFrozen(descriptor.capabilities), true);
assert.equal(Object.isFrozen(descriptor.events), true);
assert.equal(descriptor.events.includes("checkin:event-deleted"), true);
assert.equal(descriptor.events.length, 4);
assert.equal(api.hasCheckinCapability("events.record"), true);
assert.equal(api.hasCheckinCapability("events.delete"), false);

const info = api.getCheckinCapabilityInfo();
assert.deepEqual(Object.keys(info), api.CHECKIN_CAPABILITIES);
assert.equal(info["events.record"].effect, "write");
assert.equal(info["summary.providers"].localOnly, false);
assert.equal(Object.values(info).every((entry) => Object.isFrozen(entry)), true);

fs.rmSync(directory, {recursive: true, force: true});
console.log("API contract checks passed.");
