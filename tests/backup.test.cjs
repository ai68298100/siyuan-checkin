const assert = require("node:assert/strict");
function summarizeJsonBackup(store) {
    const dates = store.events.map((event) => event.localDate).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    return {itemCount: store.items.length, eventCount: store.events.length, tombstoneCount: store.eventTombstones.length, templateCount: store.templates?.length || 0, archivedItemCount: store.items.filter((item) => item.archived).length, dateRange: dates.length ? {from: dates[0], to: dates[dates.length - 1]} : undefined};
}
function auditJsonBackup(before, after) {
    return {itemDelta: after.itemCount - before.itemCount, eventDelta: after.eventCount - before.eventCount, tombstoneDelta: after.tombstoneCount - before.tombstoneCount, templateDelta: after.templateCount - before.templateCount, archivedItemDelta: after.archivedItemCount - before.archivedItemCount, dateRangeChanged: (before.dateRange?.from || "") !== (after.dateRange?.from || "") || (before.dateRange?.to || "") !== (after.dateRange?.to || "")};
}
const store = {version: 2, items: [{archived: true}, {archived: false}], events: [{localDate: "2026-09-10"}, {localDate: "2026-09-02"}, {localDate: "invalid"}], eventTombstones: [{}], templates: [{}]};
assert.deepEqual(summarizeJsonBackup(store), {itemCount: 2, eventCount: 3, tombstoneCount: 1, templateCount: 1, archivedItemCount: 1, dateRange: {from: "2026-09-02", to: "2026-09-10"}});
assert.deepEqual(auditJsonBackup({itemCount: 1, eventCount: 2, tombstoneCount: 0, templateCount: 0, archivedItemCount: 0, dateRange: {from: "2026-09-01", to: "2026-09-10"}}, summarizeJsonBackup(store)), {itemDelta: 1, eventDelta: 1, tombstoneDelta: 1, templateDelta: 1, archivedItemDelta: 1, dateRangeChanged: true});
console.log("Backup summary checks passed.");
