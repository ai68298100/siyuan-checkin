const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-core-"));

for (const filename of ["model.ts", "analytics.ts", "export.ts", "quota.ts", "rules.ts", "types.ts", "i18n.ts", "lunar.ts", "occasions.ts", "reminders.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
        },
    }).outputText;
    fs.writeFileSync(path.join(outputRoot, filename.replace(/\.ts$/, ".js")), output, "utf8");
}

const model = require(path.join(outputRoot, "model.js"));
const analytics = require(path.join(outputRoot, "analytics.js"));
const exporter = require(path.join(outputRoot, "export.js"));
const quota = require(path.join(outputRoot, "quota.js"));
const reminders = require(path.join(outputRoot, "reminders.js"));

const emptySnapshot = model.createStoreSnapshotEnvelope(model.createDefaultStore(), "2026-09-12T03:00:00+08:00");
assert.equal(emptySnapshot.format, "siyuan-checkin-snapshot");
assert.equal(emptySnapshot.capturedAt, "2026-09-11T19:00:00.000Z");
assert.deepEqual(model.readStoreSnapshot(emptySnapshot), {store: emptySnapshot.store, capturedAt: emptySnapshot.capturedAt, legacy: false});
assert.deepEqual(model.readStoreSnapshot({version: 1, items: [], events: []}), {store: {version: 1, items: [], events: []}, legacy: true});
const snapshotHistory = [1, 2, 3, 4].reduce((history, hour) => model.appendStoreSnapshotHistory(history,
    model.createStoreSnapshotEnvelope(model.createDefaultStore(), `2026-09-12T0${hour}:00:00Z`)), undefined);
assert.equal(snapshotHistory.snapshots.length, 3);
assert.deepEqual(model.readStoreSnapshotHistory(snapshotHistory).map((entry) => entry.capturedAt), [
    "2026-09-12T02:00:00.000Z", "2026-09-12T03:00:00.000Z", "2026-09-12T04:00:00.000Z",
]);
assert.equal(model.readStoreSnapshotHistory({version: 1, items: [], events: []})[0].legacy, true);
assert.equal(model.readStoreSnapshotHistory({format: model.STORE_SNAPSHOT_HISTORY_FORMAT, version: 1, snapshots: Array.from({length: 20}, (_, index) => model.createStoreSnapshotEnvelope(model.createDefaultStore(), new Date(index * 1000).toISOString()))}).length, 3);
assert.throws(() => model.createStoreSnapshotEnvelope(model.createDefaultStore(), "invalid"), /invalid-snapshot-time/);
const snapshotExport = JSON.parse(model.serializeStoreSnapshotHistory(snapshotHistory, "2026-09-12T05:00:00.000Z"));
assert.equal(snapshotExport.format, "siyuan-checkin-snapshot-export");
assert.equal(snapshotExport.snapshots.length, 3);
assert.deepEqual(model.createEmptyStoreSnapshotHistory(), {format: "siyuan-checkin-snapshot-history", version: 1, snapshots: []});
assert.equal(model.parseStoreSnapshotHistoryExport(JSON.stringify(snapshotExport)).snapshots.length, 3);
assert.throws(() => model.parseStoreSnapshotHistoryExport("{}"), /invalid-snapshot-export/);
assert.throws(() => model.parseStoreSnapshotHistoryExport(JSON.stringify({format: "siyuan-checkin-snapshot-export", version: 1, snapshots: []})), /empty-snapshot-export/);
assert.throws(() => model.parseStoreSnapshotHistoryExport(JSON.stringify({format: "siyuan-checkin-snapshot-export", version: 1, snapshots: [{format: model.STORE_SNAPSHOT_FORMAT, version: 1, capturedAt: new Date().toISOString(), store: {}}]})), /empty-snapshot-export/);

const auditInput = [
    null,
    {type: "unknown", at: "2026-09-12T00:00:00Z", details: {}},
    {type: "migration", at: "invalid", details: {}},
    {type: "restore", at: "2026-09-12T00:00:00+08:00", details: {source: "snapshot"}},
    {type: "conflict", at: "2026-09-12T01:00:00Z", details: ["invalid"]},
];
assert.deepEqual(model.normalizeStoreAudit(auditInput), [
    {type: "restore", at: "2026-09-11T16:00:00.000Z", details: {source: "snapshot"}},
    {type: "conflict", at: "2026-09-12T01:00:00.000Z", details: {}},
]);
assert.equal(model.normalizeStoreAudit(Array.from({length: 60}, (_, index) => ({type: "merge", at: new Date(index * 1000).toISOString(), details: {index}}))).length, 50);
assert.deepEqual(JSON.parse(model.serializeStoreAudit(auditInput, "2026-09-12T02:00:00.000Z")), {
    format: "siyuan-checkin-audit",
    version: 1,
    generatedAt: "2026-09-12T02:00:00.000Z",
    entries: model.normalizeStoreAudit(auditInput),
});
const recoveryPreflight = exporter.preflightJsonRecovery(JSON.stringify({version: 1, items: [], events: []}), model.normalizeStore, exporter.summarizeJsonBackup(model.createDefaultStore()));
assert.equal(recoveryPreflight.report.sourceVersion, 1);
assert.equal(recoveryPreflight.report.targetVersion, model.STORE_VERSION);
assert.deepEqual(recoveryPreflight.validationErrors, []);
assert.equal(recoveryPreflight.assessment.requiresReview, true);
assert.equal(recoveryPreflight.report.repaired, true);
assert.deepEqual(exporter.buildRecoveryAuditDetails("local-snapshot", recoveryPreflight, "rejected", ["invalid summary"]), {
    status: "rejected",
    source: "local-snapshot",
    sourceVersion: 1,
    targetVersion: model.STORE_VERSION,
    repaired: true,
    warnings: recoveryPreflight.report.warnings.length,
    audit: recoveryPreflight.report.audit,
    errors: ["invalid summary"],
});

assert.deepEqual(quota.normalizeQuota({period: "week", amount: "3", countMode: "dates"}), {period: "week", amount: 3, countMode: "dates", weekStartsOn: 1});
assert.equal(quota.normalizeQuota({period: "year", amount: 3, countMode: "dates"}), undefined);
const item = {
    id: "reading",
    name: "阅读",
    icon: "📖",
    kind: "duration",
    target: 25,
    unit: "分钟",
    schedule: {type: "daily"},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdDate: "2026-01-01",
};
const quotaStore = model.normalizeStore({version: 2, items: [{...item, id: "quota", schedule: {type: "quota", quota: {period: "month", amount: 12, countMode: "value"}}}, {...item, id: "invalid-quota", schedule: {type: "quota", quota: {period: "year", amount: 12, countMode: "value"}}}], events: [], eventTombstones: []});
assert.deepEqual(quotaStore.items.find((entry) => entry.id === "quota").schedule, {type: "quota", quota: {period: "month", amount: 12, countMode: "value"}});
assert.deepEqual(quotaStore.items.find((entry) => entry.id === "invalid-quota").schedule, {type: "daily"});
const dateQuotaItem = {...item, id: "quota-dates", schedule: {type: "quota", quota: {period: "week", amount: 2, countMode: "dates", weekStartsOn: 1}}};
const dateQuotaEvents = [
    {id: "quota-date-1", itemId: dateQuotaItem.id, occurredAt: "2026-09-07T08:00:00.000Z", localDate: "2026-09-07", value: 1, unit: "次", source: "manual"},
    {id: "quota-date-2", itemId: dateQuotaItem.id, occurredAt: "2026-09-08T08:00:00.000Z", localDate: "2026-09-08", value: 1, unit: "分钟", source: "manual"},
];
assert.equal(model.getProgress({version: 2, items: [dateQuotaItem], events: dateQuotaEvents, eventTombstones: []}, dateQuotaItem, new Date(2026, 8, 7, 12)), 2);
assert.equal(model.isComplete({version: 2, items: [dateQuotaItem], events: dateQuotaEvents, eventTombstones: []}, dateQuotaItem, new Date(2026, 8, 7, 12)), true);
assert.equal(model.isScheduledToday(dateQuotaItem, new Date(2026, 8, 7, 12)), true);
const localDay = new Date(2026, 8, 6, 0, 30, 0);
const event = {
    id: "event-1",
    itemId: item.id,
    occurredAt: localDay.toISOString(),
    localDate: "2026-09-06",
    value: 25,
    unit: "分钟",
    source: "manual",
    note: "读完第一章, 写了笔记",
};
const store = {version: 2, items: [item], events: [event], eventTombstones: []};
const checkinReminders = reminders.projectCheckinReminders(store, localDay);
assert.equal(checkinReminders[0].id, "checkin:reading:2026-09-06");
assert.equal(checkinReminders[0].status, "completed");
const pendingReminders = reminders.projectCheckinReminders({...store, events: []}, localDay);
assert.equal(pendingReminders[0].status, "today");
assert.deepEqual(reminders.projectReminderCenter({...store, events: []}, {version: 1, occasions: []}, localDay), pendingReminders);
assert.equal(reminders.filterReminderEntries(checkinReminders, "completed").length, 1);
assert.equal(reminders.filterReminderEntries(checkinReminders, "today").length, 0);

assert.equal(event.occurredAt.startsWith("2026-09-05"), true, "test must cross the UTC date boundary");
assert.equal(model.dateKey(localDay), "2026-09-06");
assert.equal(model.getEventsForDay(store, item.id, localDay).length, 1);
assert.equal(model.getProgress(store, item, localDay), 25);
assert.equal(model.isComplete(store, item, localDay), true);
const noted = model.updateEventNote(store, store.events[0].id, "  记录备注  ");
assert.equal(noted.events[0].note, "记录备注");
assert.equal(noted.events[0].id, store.events[0].id);
assert.equal(model.isScheduledToday({...item, schedule: {type: "workdays"}}, new Date(2026, 8, 6)), false);
assert.equal(model.isScheduledToday({...item, schedule: {type: "workdays"}}, new Date(2026, 8, 7)), true);
assert.equal(model.isScheduledToday({...item, schedule: {type: "weekly", weekdays: [1]}}, new Date(2026, 8, 7)), true);
const intervalItem = {...item, createdDate: "2026-09-01", schedule: {type: "interval", intervalDays: 3, anchorDate: "2026-09-01"}, revisions: [{effectiveDate: "2026-09-01", kind: "duration", target: 25, unit: "分钟", schedule: {type: "interval", intervalDays: 3, anchorDate: "2026-09-01"}}]};
assert.equal(model.isScheduledToday(intervalItem, new Date(2026, 8, 1)), true);
assert.equal(model.isScheduledToday(intervalItem, new Date(2026, 8, 2)), false);
assert.equal(model.isScheduledToday(intervalItem, new Date(2026, 8, 4)), true);
assert.equal(model.isScheduledToday(intervalItem, new Date(2026, 9, 1)), true, "calendar-day arithmetic must cross month boundaries");
const previousTimezone = process.env.TZ;
process.env.TZ = "America/New_York";
assert.equal(model.isScheduledToday({...intervalItem, schedule: {type: "interval", intervalDays: 2, anchorDate: "2026-03-07"}, revisions: []}, new Date(2026, 2, 9, 12)), true, "DST must not change calendar-day intervals");
if (previousTimezone === undefined) delete process.env.TZ;
else process.env.TZ = previousTimezone;
const deletedAt = "2026-09-06T04:00:00.000Z";
const removedStore = model.removeEventsForDay(store, item.id, localDay, deletedAt);
assert.equal(removedStore.events.length, 0);
assert.deepEqual(removedStore.eventTombstones, [{eventId: event.id, deletedAt}]);
assert.equal(model.getProgress({...store, events: [{...event, unit: "页"}]}, item, localDay), 0);
const fractionalItem = {...item, target: 0.5, revisions: [{effectiveDate: "2026-01-01", kind: "quantity", target: 0.5, unit: "分钟", schedule: {type: "daily"}}]};
assert.equal(model.isComplete({...store, items: [fractionalItem], events: [{...event, value: 0.5}]}, fractionalItem, localDay), true);

process.env.TZ = "UTC";
assert.equal(model.getEventsForDay(store, item.id, new Date(2026, 8, 6, 12, 0, 0)).length, 1);
assert.equal(model.removeEventsForDay(store, item.id, new Date(2026, 8, 6, 12, 0, 0), deletedAt).events.length, 0);
assert.equal(analytics.buildSummaryContext(store, "day", new Date(2026, 8, 6, 12, 0, 0)).totalEvents, 1);
const travelItem = {...item, createdAt: localDay.toISOString(), createdDate: "2026-09-06"};
assert.equal(model.isItemAvailableOnDate(travelItem, new Date(2026, 8, 5, 12, 0, 0)), false);
assert.equal(model.isItemAvailableOnDate(travelItem, new Date(2026, 8, 6, 12, 0, 0)), true);
process.env.TZ = "Asia/Shanghai";

const normalized = model.normalizeStore({
    version: 99,
    items: [{...item, target: "bad"}, {...item, name: "重复项目"}, {id: "invalid", name: ""}],
    events: [event, {...event}, {...event, id: "orphan", itemId: "missing"}, {...event, id: "negative", value: -1}, {...event, id: "bad-date", occurredAt: "not-a-date"}],
});
assert.equal(normalized.version, 2);
assert.equal(normalized.items.length, 1);
assert.equal(normalized.items[0].target, 1);
assert.equal(normalized.items[0].updatedAt, normalized.items[0].createdAt);
assert.equal(normalized.items[0].revisions.length, 1);
assert.deepEqual(normalized.items[0].archivePeriods, []);
assert.equal(normalized.items[0].group, "");
assert.equal(normalized.items[0].priority, "medium");
assert.equal(normalized.items[0].sortOrder, 0);
assert.equal(normalized.items[0].timeSlot, "any");
assert.equal(normalized.events.length, 1);
assert.deepEqual(normalized.eventTombstones, []);

const normalizedIntervals = model.normalizeStore({
    version: 2,
    items: [
        {...item, id: "interval-legacy", schedule: {type: "interval", everyDays: "4", anchorDate: "2026-09-02"}},
        {...item, id: "interval-invalid", schedule: {type: "interval", intervalDays: 99999, anchorDate: "invalid"}},
        {...item, id: "old-weekly", schedule: {type: "weekly", weekdays: [1, 3]}},
    ],
    events: [],
});
const normalizedIntervalsById = new Map(normalizedIntervals.items.map((candidate) => [candidate.id, candidate]));
assert.deepEqual(normalizedIntervalsById.get("interval-legacy").schedule, {type: "interval", intervalDays: 4, anchorDate: "2026-09-02"});
assert.deepEqual(normalizedIntervalsById.get("interval-invalid").schedule, {type: "interval", intervalDays: 3650});
assert.deepEqual(normalizedIntervalsById.get("old-weekly").schedule, {type: "weekly", weekdays: [1, 3]});

const weekDate = new Date(2026, 8, 8, 12, 0, 0);
const weekEvent = {...event, occurredAt: new Date(2026, 8, 8, 9, 0, 0).toISOString(), localDate: "2026-09-08"};
const weekStore = {...store, events: [weekEvent]};
const week = analytics.buildSummaryContext(weekStore, "week", weekDate);
assert.equal(week.startDate, "2026-09-07");
assert.equal(week.endDate, "2026-09-08");
assert.equal(week.totalEvents, 1);
assert.equal(week.items[0].scheduledDays, 2);
assert.equal(week.items[0].completedDays, 1);
assert.equal(week.items[0].completionRate, 50);

const newItem = {...item, id: "new-reading", createdAt: new Date(2026, 8, 8, 12, 0, 0).toISOString(), createdDate: "2026-09-08"};
const month = analytics.buildSummaryContext({version: 2, items: [newItem], events: [], eventTombstones: []}, "month", weekDate);
assert.equal(model.isItemAvailableOnDate(newItem, new Date(2026, 8, 7)), false);
assert.equal(model.isItemAvailableOnDate(newItem, new Date(2026, 8, 8)), true);
assert.equal(month.items[0].scheduledDays, 1);
assert.equal(month.items[0].completionRate, 0);
const customSummary = analytics.buildCustomSummaryContext(store, {startDate: "2026-09-06", endDate: "2026-09-06"}, new Date(2026, 8, 6, 12));
assert.equal(customSummary.startDate, "2026-09-06");
assert.equal(customSummary.endDate, "2026-09-06");
assert.equal(customSummary.totalEvents, 1);
assert.equal(analytics.getEventsInCustomRange(store, {startDate: "2026-09-06", endDate: "2026-09-06"}).length, 1);
assert.deepEqual(analytics.getEventsInCustomRange(store, {startDate: "2026-02-30", endDate: "2026-03-01"}), []);
assert.equal(analytics.buildCustomSummaryContext(store, {startDate: "bad", endDate: "2026-09-06"}, weekDate).range, "day");
const intervalMonth = analytics.buildSummaryContext({version: 2, items: [intervalItem], events: [], eventTombstones: []}, "month", weekDate);
assert.equal(intervalMonth.items[0].scheduledDays, 3, "September 1, 4, and 7 are due before the September 8 cutoff");
const quotaSummary = analytics.buildSummaryContext({version: 2, items: [dateQuotaItem], events: dateQuotaEvents, eventTombstones: []}, "month", weekDate);
assert.equal(quotaSummary.items[0].scheduledDays, 0, "quota items do not become fake daily opportunities");
assert.equal(quotaSummary.items[0].quota.current.progress, 2);
assert.equal(quotaSummary.items[0].quota.elapsedPeriods, 1, "the completed prior week enters the quota denominator");
assert.equal(quotaSummary.items[0].quota.completedPeriods, 0);

const versionedItem = {
    ...item,
    kind: "count",
    target: 10,
    unit: "页",
    schedule: {type: "weekly", weekdays: [2]},
    createdDate: "2026-09-01",
    revisions: [
        {effectiveDate: "2026-09-01", kind: "count", target: 1, unit: "分钟", schedule: {type: "daily"}},
        {effectiveDate: "2026-09-08", kind: "count", target: 10, unit: "页", schedule: {type: "weekly", weekdays: [2]}},
    ],
    archivePeriods: [{startDate: "2026-09-05", endDate: "2026-09-07"}],
};
const versionedEvents = [
    {...event, id: "v1", localDate: "2026-09-04", value: 1, unit: "分钟"},
    {...event, id: "v2", localDate: "2026-09-07", value: 1, unit: "分钟"},
    {...event, id: "v3", localDate: "2026-09-08", value: 5, unit: "页"},
];
const versionedStore = {version: 2, items: [versionedItem], events: versionedEvents, eventTombstones: []};
assert.equal(model.isItemAvailableOnDate(versionedItem, new Date(2026, 8, 5)), false);
assert.equal(model.isItemAvailableOnDate(versionedItem, new Date(2026, 8, 7)), true);
assert.equal(model.isScheduledToday(versionedItem, new Date(2026, 8, 7)), true);
assert.equal(model.isScheduledToday(versionedItem, new Date(2026, 8, 9)), false);
assert.equal(model.isComplete(versionedStore, versionedItem, new Date(2026, 8, 4)), true);
assert.equal(model.isComplete(versionedStore, versionedItem, new Date(2026, 8, 8)), false);
const versionedSummary = analytics.buildSummaryContext(versionedStore, "month", weekDate);
assert.equal(versionedSummary.items[0].scheduledDays, 6);
assert.equal(versionedSummary.items[0].completedDays, 2);
assert.equal(versionedSummary.items[0].completionRate, 33);
assert.deepEqual(versionedSummary.items[0].totalsByUnit, [
    {unit: "分钟", totalValue: 2, eventCount: 2},
    {unit: "页", totalValue: 5, eventCount: 1},
]);

const intervalRevisionItem = {
    ...item,
    createdDate: "2026-09-01",
    schedule: {type: "interval", intervalDays: 2, anchorDate: "2026-09-10"},
    revisions: [
        {effectiveDate: "2026-09-01", kind: "duration", target: 25, unit: "分钟", schedule: {type: "daily"}},
        {effectiveDate: "2026-09-10", kind: "duration", target: 25, unit: "分钟", schedule: {type: "interval", intervalDays: 2}},
    ],
};
assert.equal(model.isScheduledToday(intervalRevisionItem, new Date(2026, 8, 9)), true, "historical daily revision remains daily");
assert.equal(model.isScheduledToday(intervalRevisionItem, new Date(2026, 8, 10)), true, "revision date is the fallback interval anchor");
assert.equal(model.isScheduledToday(intervalRevisionItem, new Date(2026, 8, 11)), false);
assert.equal(model.isScheduledToday(intervalRevisionItem, new Date(2026, 8, 12)), true);

const legacyEvent = {...event};
delete legacyEvent.id;
const legacyStore = {version: 1, items: [{...item, updatedAt: undefined}], events: [legacyEvent]};
const migratedLegacyA = model.normalizeStore(legacyStore);
const migratedLegacyB = model.normalizeStore(legacyStore);
assert.equal(migratedLegacyA.version, 2);
assert.equal(migratedLegacyA.items[0].updatedAt, item.createdAt);
assert.equal(migratedLegacyA.events[0].id, migratedLegacyB.events[0].id);
assert.match(migratedLegacyA.events[0].id, /^event-legacy-/);
const archivedLegacy = {version: 1, items: [{...item, archived: true, updatedAt: undefined}], events: [legacyEvent]};
const migratedArchivedA = model.normalizeStore(archivedLegacy);
const migratedArchivedB = model.normalizeStore(archivedLegacy);
assert.deepEqual(migratedArchivedA, migratedArchivedB);
assert.deepEqual(migratedArchivedA.items[0].archivePeriods, [{startDate: item.createdDate}]);
assert.equal(Object.hasOwn(migratedArchivedA.items[0].archivePeriods[0], "endDate"), false);
const archivedWithoutEvents = {version: 1, items: [{...item, archived: true, updatedAt: undefined}], events: []};
const archivedWithEvents = {version: 1, items: [{...item, archived: true, updatedAt: undefined}], events: [legacyEvent]};
const archivedLeftAssociated = model.mergeStores(model.mergeStores(archivedWithoutEvents, archivedWithoutEvents), archivedWithEvents);
const archivedRightAssociated = model.mergeStores(archivedWithoutEvents, model.mergeStores(archivedWithoutEvents, archivedWithEvents));
assert.deepEqual(archivedLeftAssociated, archivedRightAssociated);

const concurrentEventA = {...event, id: "concurrent-a", externalRef: undefined};
const concurrentEventB = {...event, id: "concurrent-b", occurredAt: "2026-09-06T03:00:00.000Z", externalRef: undefined};
const clientA = {...store, events: [concurrentEventA]};
const clientB = {...store, events: [concurrentEventB]};
const mergedAB = model.mergeStores(clientA, clientB);
const mergedBA = model.mergeStores(clientB, clientA);
assert.deepEqual(mergedAB, mergedBA);
assert.deepEqual(mergedAB.events.map((candidate) => candidate.id), ["concurrent-a", "concurrent-b"]);
assert.deepEqual(model.mergeStores(mergedAB, clientA), mergedAB);

const deletedConcurrentA = model.removeEventsForDay(clientA, item.id, localDay, "2026-09-06T04:30:00.000Z");
const ordinaryDeletionMerge = model.mergeStores(deletedConcurrentA, clientB);
assert.deepEqual(ordinaryDeletionMerge.events.map((candidate) => candidate.id), ["concurrent-b"]);
assert.equal(ordinaryDeletionMerge.eventTombstones[0].eventId, "concurrent-a");
assert.deepEqual(model.mergeStores(ordinaryDeletionMerge, clientA), ordinaryDeletionMerge);
const queuedUndo = model.removeEvents(mergedAB, ["concurrent-a"], "2026-09-06T04:30:00.000Z");
assert.deepEqual(queuedUndo.events.map((candidate) => candidate.id), ["concurrent-b"]);
assert.deepEqual(queuedUndo.eventTombstones.map((candidate) => candidate.eventId), ["concurrent-a"]);

const externalEventA = {...event, id: "external-a", source: "api", externalRef: "focus-session-1"};
const externalEventB = {...event, id: "external-b", source: "api", externalRef: "focus-session-1"};
const externalMergeAB = model.mergeStores({...store, events: [externalEventA]}, {...store, events: [externalEventB]});
const externalMergeBA = model.mergeStores({...store, events: [externalEventB]}, {...store, events: [externalEventA]});
assert.deepEqual(externalMergeAB, externalMergeBA);
assert.equal(externalMergeAB.events.length, 1);
assert.equal(externalMergeAB.events[0].externalRef, "focus-session-1");
const undoAfterExternalDedupe = model.removeEvents(externalMergeAB, [externalEventA], "2026-09-06T04:45:00.000Z");
assert.equal(undoAfterExternalDedupe.events.length, 0);
assert.equal(undoAfterExternalDedupe.eventTombstones.length, 2);
assert.equal(undoAfterExternalDedupe.eventTombstones.every((candidate) => candidate.itemId === item.id
    && candidate.source === "api"
    && candidate.externalRef === "focus-session-1"), true);
assert.equal(model.mergeStores(undoAfterExternalDedupe, {
    ...store,
    events: [externalEventA, externalEventB],
}).events.length, 0);

const deletedExternal = model.removeEventsForDay(
    {...store, events: [externalEventA]},
    item.id,
    localDay,
    "2026-09-06T05:00:00.000Z",
);
const staleExternalStore = {...store, events: [externalEventA, externalEventB]};
const persistedDeletedExternal = JSON.parse(JSON.stringify(deletedExternal));
const deletionMerge = model.mergeStores(persistedDeletedExternal, staleExternalStore);
assert.equal(deletionMerge.events.length, 0);
assert.equal(deletionMerge.eventTombstones.length, 1);
assert.deepEqual(model.mergeStores(staleExternalStore, deletedExternal), deletionMerge);
assert.deepEqual(model.mergeStores(deletionMerge, staleExternalStore), deletionMerge);

const olderItemStore = {...store, items: [{...item, name: "旧名称", updatedAt: "2026-09-06T01:00:00.000Z"}], events: []};
const newerItemStore = {...store, items: [{...item, name: "新名称", updatedAt: "2026-09-06T02:00:00.000Z"}], events: []};
assert.equal(model.mergeStores(olderItemStore, newerItemStore).items[0].name, "新名称");
assert.deepEqual(model.mergeStores(olderItemStore, newerItemStore), model.mergeStores(newerItemStore, olderItemStore));
const tiedItemA = {...item, name: "并发名称 A", updatedAt: "2026-09-06T02:00:00.000Z"};
const tiedItemB = {...item, name: "并发名称 B", updatedAt: "2026-09-06T02:00:00.000Z"};
const tiedMergeAB = model.mergeStores({...store, items: [tiedItemA], events: []}, {...store, items: [tiedItemB], events: []});
const tiedMergeBA = model.mergeStores({...store, items: [tiedItemB], events: []}, {...store, items: [tiedItemA], events: []});
assert.deepEqual(tiedMergeAB, tiedMergeBA);

const reverseNormalized = model.normalizeStore({
    version: 2,
    items: [{...item, id: "z-item"}, item],
    events: [{...event, id: "z-event", itemId: "z-item"}, event],
    eventTombstones: [],
});
const forwardNormalized = model.normalizeStore({
    version: 2,
    items: [item, {...item, id: "z-item"}],
    events: [event, {...event, id: "z-event", itemId: "z-item"}],
    eventTombstones: [],
});
assert.deepEqual(reverseNormalized, forwardNormalized);

const groupedSourceItems = [
    {...item, id: "group-low", group: "学习", priority: "low", sortOrder: 2},
    {...item, id: "group-high", group: "学习", priority: 3, sortOrder: 1},
    {...item, id: "ungrouped", category: "", priority: "normal", order: "9"},
];
const groupedStore = model.normalizeStore({version: 2, items: groupedSourceItems, events: [], eventTombstones: []});
const groupedById = new Map(groupedStore.items.map((candidate) => [candidate.id, candidate]));
assert.equal(groupedById.get("group-low").group, "学习");
assert.equal(groupedById.get("group-low").priority, "low");
assert.equal(groupedById.get("group-high").priority, "high");
assert.equal(groupedById.get("ungrouped").priority, "medium");
assert.equal(groupedById.get("ungrouped").sortOrder, 9);
assert.deepEqual(model.sortCheckinItems(groupedStore.items, "priority").map((candidate) => candidate.id), ["group-high", "ungrouped", "group-low"]);
assert.deepEqual(model.sortCheckinItems(groupedStore.items, "manual").map((candidate) => candidate.id), ["group-high", "group-low", "ungrouped"]);
assert.deepEqual([...model.groupCheckinItems(groupedStore.items).keys()], ["", "学习"]);
assert.equal(model.normalizeCheckinGroup("  长期阅读  "), "长期阅读");
assert.equal(model.normalizeCheckinSortOrder("12.7"), 13);
assert.equal(model.normalizeCheckinPriority("urgent"), "high");
assert.equal(model.getCheckinPriorityRank(), 2);
assert.equal(model.normalizeCheckinTimeSlot("晚上"), "evening");
const completedGroupedStore = {
    ...groupedStore,
    events: [{...event, itemId: "group-high", id: "group-high-event"}],
};
assert.deepEqual(model.sortCheckinItemsForDate(completedGroupedStore, groupedStore.items, localDay, "priority").map((candidate) => candidate.id), ["ungrouped", "group-low", "group-high"]);

const json = JSON.parse(exporter.serializeJson(store));
assert.equal(json.events[0].value, 25);
const csv = exporter.serializeCsv(store);
assert.equal(csv.charCodeAt(0), 0xFEFF);
assert.match(csv.split("\n")[0], /localDate/);
assert.match(csv, /"读完第一章, 写了笔记"/);

for (const filename of fs.readdirSync(outputRoot)) {
    fs.unlinkSync(path.join(outputRoot, filename));
}
fs.rmdirSync(outputRoot);
console.log("core model, analytics, and export tests passed");
