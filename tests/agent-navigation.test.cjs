const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const exportsObject = {};
new Function("exports", ts.transpileModule(fs.readFileSync("src/integrations/agent-navigation.ts", "utf8"), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText)(exportsObject);
const {openSiYuanAgent} = exportsObject;
let visible = false, calls = [];
const panel = {isConnected: true, getClientRects: () => visible ? [{}] : [], getBoundingClientRect: () => ({width: 320, height: 800})};
const doc = {querySelector: selector => selector === ".sy__agentChat" ? panel : null};
for (const position of ["leftDock", "rightDock", "bottomDock"]) {
    visible = false;
    const dock = {data: {agentChat: true}, toggleModel(type, show) { assert.equal(this, dock); calls.push([type, show]); visible = show; }};
    const host = {siyuan: {layout: {[position]: dock}}};
    assert.equal(openSiYuanAgent(host, doc), true);
    assert.equal(openSiYuanAgent(host, doc), true, "already-open panel must remain open");
}
assert.equal(calls.length, 6);
assert.ok(calls.every(([type, show]) => type === "agentChat" && show === true));
assert.equal(openSiYuanAgent({}, doc), false);
assert.equal(openSiYuanAgent({siyuan: {layout: {rightDock: {data: {agentChat: true}}}}}, doc), false);
assert.equal(openSiYuanAgent({siyuan: {layout: {rightDock: {data: {agentChat: true}, toggleModel() { throw Error("unavailable"); }}}}}, doc), false);
visible = false;
assert.equal(openSiYuanAgent({siyuan: {layout: {rightDock: {data: {agentChat: true}, toggleModel() {}}}}}, doc), false, "no visible panel must not be reported as opened");
console.log("Agent navigation passed: desktop positions, explicit show, unavailable host, exceptions and real visible panel requirement.");
