const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../..');
const ts = require(require.resolve('typescript', {paths: [root]}));
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText, filename);
const model = require(path.join(root, 'src/model.ts'));
const {planBatchRecord} = require(path.join(root, 'src/features/api-v5.ts'));
const store = model.normalizeStore({version: 3, items: [{
    id: 'handoff-test', name: 'Synthetic handoff audit', icon: '', kind: 'count', target: 1, unit: '次',
    schedule: {type: 'daily'}, createdAt: '2026-01-01T00:00:00Z', createdDate: '2026-01-01',
    revisions: [], archivePeriods: [],
}], events: []});
const cases = ['2026-02-30T10:00:00+08:00', '2026-04-31T10:00:00+08:00', '2026-02-28T24:00:00+08:00'];
const results = cases.map(occurredAt => {
    const plan = planBatchRecord(store, [{itemId: 'handoff-test', value: 1, unit: '次', source: 'api',
        occurredAt, externalRef: 'taskhorizon:synthetic-block:2026-02-28'}], '2026-10-16T00:00:00Z');
    return {input: occurredAt, receipt: plan.results[0], plannedTime: plan.planned[0]?.occurredAt, plannedDate: plan.planned[0]?.localDate};
});
const crypto = require('node:crypto');
const report = {
    scope: 'pure planner only; no host storage or user data',
    version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
    nodeVersion: process.version,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sourceFiles: Object.fromEntries(['src/features/api-v5.ts', 'src/model.ts', 'src/ecosystem.ts'].map(file => [file,
        crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
    results,
};
fs.writeFileSync(path.join(__dirname, 'taskhorizon-handoff-date-audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
