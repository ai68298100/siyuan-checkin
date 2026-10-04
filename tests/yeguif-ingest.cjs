const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const modules = new Map();
function loadSource(relative) {
    const filename = path.join(sourceRoot, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const loaded = {exports: {}};
    modules.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions}).outputText;
    new Function("require", "module", "exports", compiled)(name => name.startsWith(".")
        ? loadSource(path.relative(sourceRoot, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name), loaded, loaded.exports);
    return loaded.exports;
}
const model = loadSource("model.ts");
const adapter = loadSource("features/yeguif-adapter.ts");
const scan = loadSource("features/scan-cursor.ts");
const report = loadSource("features/source-ingest-report.ts");
const shared = loadSource("shared.ts");
const syntax = ts.createSourceFile("index.ts", fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const plugin = syntax.statements.find(statement => ts.isClassDeclaration(statement));
const method = plugin.members.find(member => member.name?.getText(syntax) === "ingestYeguif").getText(syntax);
const code = ts.transpileModule(`class IngestHarness {${method}}\nmodule.exports = IngestHarness;`, {compilerOptions}).outputText;
const loaded = {exports: {}};
const dependencies = {...model, ...adapter, ...scan, ...report, ...shared, document: {hidden: false}};
new Function("module", ...Object.keys(dependencies), code)(loaded, ...Object.values(dependencies));
const IngestHarness = loaded.exports;

function createHost(mappings = []) {
    const host = new IngestHarness();
    const now = new Date();
    const sourceRows = [
        {id: "block-0001", root_id: "daily-document", content: "00:00:37 工作"},
        {id: "block-0002", root_id: "daily-document", content: "00:30:12 跑步"},
        {id: "block-0003", root_id: "daily-document", content: "00:50:00 拉伸"},
    ];
    const writes = [];
    Object.assign(host, {
        yeguifIntegration: {enabled: true, itemId: "", notebookId: "notebook-0001", mappings},
        storageReady: true, acceptingOperations: true, disposed: false, disposing: false, sourceIngestReports: {}, yeguifScanCursor: "",
        store: model.normalizeStore({version: 3, items: [{id: "run", name: "跑步"}, {id: "stretch", name: "拉伸"}].map(item => ({...item,
            kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString()})), events: []}),
        kernelPost: async () => { if (host.readFails) throw new Error("read failed"); return {code: 0, data: sourceRows}; },
        hasMinuteTargetOnDate: (itemId, localDate) => {
            const item = model.getActiveItemById(host.store, itemId);
            return Boolean(item && model.getItemRevisionForDate(item, shared.calendarDateFromKey(localDate)).unit === "分钟");
        },
        revisionFingerprint: item => item.id,
        enqueueMutation: async operation => operation(),
        recordExternalEvent: async (input, moment) => {
            if (host.writeFails) throw new Error("write failed");
            const event = {id: `event-${writes.length}`, ...input, ...moment, unit: "分钟"};
            writes.push(event);
            host.store = model.normalizeStore({...host.store, events: [...host.store.events, event]});
            return event;
        },
        invalidateSummary: () => {}, renderBackgroundUpdate: () => {},
    });
    return {host, writes};
}

async function verifyIngest() {
    const automatic = createHost();
    await automatic.host.ingestYeguif();
    assert.deepEqual(automatic.writes.map(event => [event.itemId, event.value]), [["run", 30], ["stretch", 20]], "empty mappings still permit exact-name matching without a legacy single target");
    assert.deepEqual(automatic.writes.map(event => new Date(event.occurredAt).getSeconds()), [37, 12], "event times retain source segment seconds");
    assert.deepEqual(automatic.writes.map(event => new Date(event.occurredAt).getMinutes()), [0, 30], "source intervals never receive the ingestion timestamp");
    assert.ok(automatic.writes.every(event => event.localDate === model.dateKey(new Date())));
    await automatic.host.ingestYeguif();
    assert.equal(automatic.writes.length, 2, "rereading unchanged source blocks is idempotent");
    assert.equal(automatic.host.sourceIngestReports.yeguif.duplicate, 2);
    const explicit = createHost([{project: "跑步", itemId: "stretch"}]);
    await explicit.host.ingestYeguif();
    assert.deepEqual(explicit.writes.map(event => [event.itemId, event.value]), [["stretch", 30]], "configured mappings take precedence and unmatched projects stay unrecorded");
    const preview = createHost([{project: "跑步", itemId: "run"}, {project: "拉伸", itemId: "stretch"}]);
    await preview.host.ingestYeguif(true);
    assert.equal(preview.writes.length, 0, "preview never writes facts");
    assert.equal(preview.host.sourceIngestReports.yeguif.planned, 2);
    const tombstoned = createHost();
    const localDate = model.dateKey(new Date());
    tombstoned.host.store.eventTombstones = [{eventId: "deleted", itemId: "run", source: "yeguif", externalRef: adapter.buildYeguifExternalRef("block-0002", localDate), deletedAt: new Date().toISOString()}];
    await tombstoned.host.ingestYeguif();
    assert.deepEqual(tombstoned.writes.map(event => event.itemId), ["stretch"], "deleted block identities never revive");
    const invalid = createHost([{project: "跑步", itemId: "missing-target"}]);
    await invalid.host.ingestYeguif();
    assert.equal(invalid.writes.length, 0);
    assert.equal(invalid.host.sourceIngestReports.yeguif.outcome, "not-configured");
    const failed = createHost();
    failed.host.writeFails = true;
    await failed.host.ingestYeguif();
    assert.equal(failed.writes.length, 0);
    assert.equal(failed.host.sourceIngestReports.yeguif.outcome, "write-failed");
    failed.host.writeFails = false;
    await failed.host.ingestYeguif();
    assert.equal(failed.writes.length, 2, "a failed read pass keeps source identities retryable");
    failed.host.readFails = true;
    await failed.host.ingestYeguif();
    assert.equal(failed.host.sourceIngestReports.yeguif.outcome, "read-failed");
    console.log("LifeLog production ingest passed: automatic/explicit routes, separate project durations, source seconds, preview, idempotency, tombstones, invalid targets and failure retry.");
}

verifyIngest().catch(error => { console.error(error); process.exitCode = 1; });
