const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
assert.match(source, /handleSuggestionDecision\(decision: "confirm" \| "cancel"\)/);
assert.match(source, /undoSuggestionWorkflow\(\): Promise<void> \| void/);
assert.match(source, /querySelectorAll<HTMLElement>\("\[data-suggestion-decision\]"\)/);
assert.match(source, /button\.dataset\.suggestionDecision/);
assert.match(source, /decision === "confirm" \|\| decision === "cancel"/);
assert.match(source, /host\.handleSuggestionDecision\(decision\)/);
assert.match(source, /querySelector<HTMLElement>\("\[data-suggestion-undo\]"\)/);
assert.match(source, /host\.undoSuggestionWorkflow\(\)/);

const render = fs.readFileSync("src/render/suggestion-workflow.ts", "utf8");
assert.match(render, /data-suggestion-decision="confirm"/);
assert.match(render, /data-suggestion-decision="cancel"/);
assert.match(render, /data-suggestion-undo/);

const index = fs.readFileSync("src/index.ts", "utf8");
assert.match(index, /private async handleSuggestionDecision/);
assert.match(index, /private async undoSuggestionWorkflow/);
assert.match(index, /createSuggestionDecisionToken\(/);
assert.match(index, /const previousStore = this\.store/);
assert.match(index, /this\.store = previousStore/);
assert.match(index, /SUGGESTION_WORKFLOW_STORAGE_NAME/);
assert.match(index, /private persistSuggestionWorkflow/);
assert.match(index, /deserializeSuggestionWorkflow\(storedSuggestionWorkflow/);
assert.match(index, /serializeSuggestionWorkflow\(this\.suggestionWorkflow\)/);
assert.match(index, /shouldRestoreSuggestionWorkflow\(restoredWorkflow\)/);

console.log("Suggestion workflow binding structure checks passed.");
