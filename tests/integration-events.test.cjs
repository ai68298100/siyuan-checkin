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
const indexSource = fs.readFileSync(path.join("src", "index.ts"), "utf8");
const input = {type: "suggestion-workflow-updated", suggestionId: " s1 ", suggestionStatus: "confirmed", item: {id: "leak"}};
const analytics = {type: "analytics-updated", analyticsAsOf: "2026-09-15", leaked: {secret: true}};
const safe = events.cloneIntegrationEvent(input);
assert.deepEqual(safe, {type: "suggestion-workflow-updated", suggestionId: "s1", suggestionStatus: "confirmed"});
assert.notEqual(safe, input);
assert.equal(events.toExternalEventName(safe), "checkin:suggestion-workflow-updated");
assert.equal(events.cloneIntegrationEvent(analytics).analyticsAsOf, "2026-09-15");
assert.equal(events.toExternalEventName({type: "analytics-updated"}), "checkin:analytics-updated");
assert.match(indexSource, /maybeAutoArchiveItemsAfterRecord[\s\S]*?current\.archived[\s\S]*?applyArchivedItems[\s\S]*?await this\.persist\(\)[\s\S]*?type: "item-archived"/, "only persisted automatic archive transitions may emit item-archived");
assert.match(indexSource, /for \(const item of archived\)[\s\S]*?type: "item-updated"[\s\S]*?type: "item-archived"/, "automatic archive retains the compatibility update before its dedicated event");
const archived = {
    type: "item-archived",
    leaked: {secret: true},
    item: {
        id: "archived-item",
        schedule: {type: "quota", weekdays: [1, 3], quota: {period: "week", amount: 3, countMode: "dates"}},
        revisions: [{effectiveDate: "2026-01-01", schedule: {type: "quota", weekdays: [2], quota: {period: "month", amount: 5, countMode: "value"}}}],
        archivePeriods: [{startDate: "2026-09-18"}],
        autoArchive: {afterDays: 7},
    },
};
const archivedCopy = events.cloneIntegrationEvent(archived);
assert.equal(events.toExternalEventName(archivedCopy), "checkin:item-archived");
assert.equal(Object.hasOwn(archivedCopy, "leaked"), false);
assert.notEqual(archivedCopy.item, archived.item);
assert.notEqual(archivedCopy.item.schedule, archived.item.schedule);
assert.notEqual(archivedCopy.item.schedule.weekdays, archived.item.schedule.weekdays);
assert.notEqual(archivedCopy.item.schedule.quota, archived.item.schedule.quota);
assert.notEqual(archivedCopy.item.revisions[0].schedule.weekdays, archived.item.revisions[0].schedule.weekdays);
assert.notEqual(archivedCopy.item.revisions[0].schedule.quota, archived.item.revisions[0].schedule.quota);
assert.notEqual(archivedCopy.item.archivePeriods, archived.item.archivePeriods);
assert.notEqual(archivedCopy.item.autoArchive, archived.item.autoArchive);
archived.item.schedule.weekdays.push(5);
archived.item.schedule.quota.amount = 99;
archived.item.revisions[0].schedule.weekdays.push(4);
archived.item.revisions[0].schedule.quota.amount = 88;
archived.item.archivePeriods[0].startDate = "tampered";
archived.item.autoArchive.afterDays = 999;
assert.deepEqual(archivedCopy.item.schedule.weekdays, [1, 3]);
assert.equal(archivedCopy.item.schedule.quota.amount, 3);
assert.deepEqual(archivedCopy.item.revisions[0].schedule.weekdays, [2]);
assert.equal(archivedCopy.item.revisions[0].schedule.quota.amount, 5);
assert.equal(archivedCopy.item.archivePeriods[0].startDate, "2026-09-18");
assert.equal(archivedCopy.item.autoArchive.afterDays, 7);
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
