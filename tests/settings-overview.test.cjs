const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1562 设置首页总览只读投影守门：只聚合既有状态、待处理带直达选择器、
   空态显式、有界截断、确定性输出。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-settings-overview-"));

for (const filename of ["features/note-bindings.ts", "features/settings-overview.ts"]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {collectNoteBindings} = require(path.join(outputRoot, "features", "note-bindings.js"));
const {buildSettingsOverview, OVERVIEW_CHANNEL_FEATURE} = require(path.join(outputRoot, "features", "settings-overview.js"));

const bindingsInput = {
    diaryReport: {enabled: true, docId: ""},
    summaryResident: {enabled: true, docId: "20260901000000-summary"},
    healthInbox: {enabled: false, docId: ""},
    noteQuery: {enabled: false, scope: "document", targetId: ""},
    journalIntegration: {mode: "daily", notebookId: "", docId: ""},
    journalEnabled: false,
    yeguifIntegration: {enabled: false, itemId: "", notebookId: ""},
    anchoredItems: [],
};

let checks = 0;
function check(name, run) {
    run();
    checks += 1;
    console.log(`ok ${checks} - ${name}`);
}

try {
    check("unbound required bindings become problems with direct selectors", () => {
        const overview = buildSettingsOverview({
            bindings: collectNoteBindings(bindingsInput),
            sireader: {enabled: false, itemId: ""},
            siplayer: {enabled: false, itemId: ""},
            weread: {enabled: false, itemId: "", hasKey: false},
            healthEnabled: false, healthBindingCount: 0,
            yeguifEnabled: false, yeguifNotebookId: "", yeguifMappingCount: 0,
            failedWriteChannels: [], draftCount: 0, recentWrites: [],
        });
        const problem = overview.problems.find((entry) => entry.key === "binding:diary-report");
        assert.ok(problem, "diary unbound target must surface");
        assert.equal(problem.labelKey, "set.overviewTargetMissing");
        assert.equal(problem.featureKey, "bind.feature.diaryReport");
        assert.equal(problem.selector, "[data-diary-doc]");
        assert.equal(problem.severity, "missing");
        /* 未启用的健康收件箱缺目标不算故障（row.enabled=false）。 */
        assert.ok(!overview.problems.some((entry) => entry.key === "binding:health-inbox"), "disabled rows are not problems");
        assert.equal(overview.activities.length, 0);
    });

    check("source prerequisites, write failures and drafts surface with fixed order and cap", () => {
        const overview = buildSettingsOverview({
            bindings: collectNoteBindings(bindingsInput),
            sireader: {enabled: true, itemId: ""},
            siplayer: {enabled: false, itemId: ""},
            weread: {enabled: true, itemId: "item-weread", hasKey: false},
            healthEnabled: true, healthBindingCount: 0,
            yeguifEnabled: true, yeguifNotebookId: "", yeguifMappingCount: 0,
            failedWriteChannels: ["diary-report", "summary-resident", "unknown-channel"],
            draftCount: 2,
            recentWrites: [],
        });
        const keys = overview.problems.map((problem) => problem.key);
        assert.ok(keys.includes("source:sireader-item"), "sireader missing item surfaces");
        assert.ok(keys.includes("source:weread-key"), "weread missing key surfaces");
        assert.ok(keys.includes("source:health-bindings"), "health without mappings surfaces");
        assert.ok(keys.includes("source:yeguif-notebook"), "yeguif without notebook surfaces");
        assert.ok(keys.includes("write-failed:diary-report"), "failed write channel surfaces");
        assert.ok(!keys.includes("write-failed:unknown-channel"), "unknown channels are ignored (no invented labels)");
        assert.ok(keys.includes("drafts"), "draft count surfaces");
        assert.equal(overview.problems.find((problem) => problem.key === "drafts").severity, "draft");
        assert.ok(overview.problems.length <= 8, "problems stay bounded");
        const disabled = overview.problems.filter((problem) => problem.key === "binding:health-inbox");
        assert.equal(disabled.length, 0, "disabled binding rows stay out (enabled=false)");
    });

    check("all-clear state and bounded recent activities", () => {
        const clear = buildSettingsOverview({
            bindings: collectNoteBindings({
                ...bindingsInput,
                diaryReport: {enabled: true, docId: "20260901000000-diary"},
            }),
            sireader: {enabled: false, itemId: ""},
            siplayer: {enabled: false, itemId: ""},
            weread: {enabled: false, itemId: "", hasKey: false},
            healthEnabled: false, healthBindingCount: 0,
            yeguifEnabled: false, yeguifNotebookId: "", yeguifMappingCount: 0,
            failedWriteChannels: [], draftCount: 0,
            recentWrites: [
                {channel: "journal", ok: true, at: "2026-09-29T10:00:00.000Z"},
                {channel: "diary-report", ok: false, at: "2026-09-29T09:00:00.000Z"},
                {channel: "summary-resident", ok: true, at: "2026-09-29T08:00:00.000Z"},
                {channel: "diary-report", ok: true, at: "2026-09-28T08:00:00.000Z"},
            ],
        });
        assert.equal(clear.problems.length, 0, "no problems when everything is bound");
        assert.equal(clear.activities.length, 3, "activities capped at three");
        assert.equal(clear.activities[0].featureKey, OVERVIEW_CHANNEL_FEATURE.journal);
        assert.equal(clear.activities[0].labelKey, "set.overviewWriteOk");
        assert.equal(clear.activities[1].labelKey, "set.overviewWriteFail");
        /* 确定性：同一输入两次构建深度相等。 */
        const again = buildSettingsOverview({
            bindings: collectNoteBindings({
                ...bindingsInput,
                diaryReport: {enabled: true, docId: "20260901000000-diary"},
            }),
            sireader: {enabled: false, itemId: ""},
            siplayer: {enabled: false, itemId: ""},
            weread: {enabled: false, itemId: "", hasKey: false},
            healthEnabled: false, healthBindingCount: 0,
            yeguifEnabled: false, yeguifNotebookId: "", yeguifMappingCount: 0,
            failedWriteChannels: [], draftCount: 0,
            recentWrites: [
                {channel: "journal", ok: true, at: "2026-09-29T10:00:00.000Z"},
                {channel: "diary-report", ok: false, at: "2026-09-29T09:00:00.000Z"},
                {channel: "summary-resident", ok: true, at: "2026-09-29T08:00:00.000Z"},
                {channel: "diary-report", ok: true, at: "2026-09-28T08:00:00.000Z"},
            ],
        });
        assert.deepEqual(again, clear, "same input builds deep-equal output");
    });

    console.log(`Settings overview projection: ${checks} checks passed.`);
} finally {
    fs.rmSync(outputRoot, {recursive: true, force: true});
}
