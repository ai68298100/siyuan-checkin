const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-integration-events-"));
for (const file of ["api-contract.ts", "integrations.ts"]) {
    const source = fs.readFileSync(path.join("src", file), "utf8");
    fs.writeFileSync(path.join(root, file.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText, "utf8");
}
const events = require(path.join(root, "integrations.js"));
const input = {type: "suggestion-workflow-updated", suggestionId: " s1 ", suggestionStatus: "confirmed", item: {id: "leak"}};
const safe = events.cloneIntegrationEvent(input);
assert.deepEqual(safe, {type: "suggestion-workflow-updated", suggestionId: "s1", suggestionStatus: "confirmed"});
assert.notEqual(safe, input);
assert.equal(events.toExternalEventName(safe), "checkin:suggestion-workflow-updated");
assert.equal(events.isSuggestionWorkflowEvent(safe), true);
assert.equal(events.isSuggestionWorkflowEvent(input), true);
assert.equal(events.cloneIntegrationEvent({...input, suggestionId: ""}), undefined);
assert.equal(events.cloneIntegrationEvent({...input, suggestionStatus: "unknown"}), undefined);
assert.equal(events.cloneIntegrationEvent({...input, suggestionId: "x".repeat(161)}), undefined);
assert.equal(events.isSuggestionWorkflowEvent({...input, suggestionStatus: "unknown"}), false);
assert.equal(events.isSuggestionWorkflowEvent(null), false);
const deleted = {type: "event-deleted", deletedEvents: [{id: "e1"}]};
const deletedCopy = events.cloneIntegrationEvent(deleted);
assert.notEqual(deletedCopy.deletedEvents, deleted.deletedEvents);
assert.notEqual(deletedCopy.deletedEvents[0], deleted.deletedEvents[0]);
fs.rmSync(root, {recursive: true, force: true});
console.log("Integration event payload safety checks passed.");
