const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

process.env.TZ = "Asia/Shanghai";
const sourceRoot = path.join(__dirname, "..", "src");
const modules = new Map();
// Execute the production helper and its dependency graph entirely in memory.
function load(relative) {
    const filename = path.resolve(sourceRoot, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = {exports: {}};
    modules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    new Function("require", "module", "exports", code)(request => {
        assert.ok(request.startsWith("."), `unexpected runtime dependency: ${request}`);
        return load(path.resolve(path.dirname(filename), `${request}.ts`));
    }, module, module.exports);
    return module.exports;
}
const model = load("model.ts");
const analytics = load("analytics.ts");
const assistant = load("features/review-assistant.ts");
const suggestions = load("agent-suggestions.ts");
const shared = load("shared.ts");
const {t, setPluginLanguage} = load("i18n.ts");
setPluginLanguage("zh-CN");
const asOf = new Date(2026, 8, 20, 12);
function fixture() {
    const store = model.createDefaultStore();
    store.items = [{id: "water", name: "Private project name", icon: "W", kind: "count", target: 1000, unit: "ml",
        schedule: {type: "daily"}, createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
        createdDate: "2026-08-01", revisions: [], archivePeriods: []}];
    store.events = ["13", "14", "20", "21"].map(day => ({id: `event-${day}`, itemId: "water", localDate: `2026-09-${day}`,
        occurredAt: `2026-09-${day}T01:00:00.000Z`, value: 400, unit: "ml", source: "manual", note: "Private record note"}));
    return store;
}
const store = fixture();
const context = analytics.buildSummaryContext(store, "week", asOf);
const key = assistant.buildReviewAnalysisKey(store, context);
const snapshot = {...suggestions.createAnalysisMeta("week", "agent", context.endDate, "2026-09-20T04:00:00.000Z"),
    startDate: context.startDate, endDate: context.endDate, contextKey: key, text: "Current analysis", providerName: "Adapter"};
const legacy = {asOf: context.endDate, range: "week", source: "agent", generatedAt: snapshot.generatedAt, text: "Legacy analysis"};

for (const language of ["zh-CN", "en-US"]) {
    setPluginLanguage(language);
    const prompts = ["summary", "patterns", "plan"].map(goal => assistant.buildReviewPrompt(context, goal));
    assert.equal(new Set(prompts).size, 3, "each intent must produce a distinct localized task");
    for (const prompt of prompts) {
        assert.ok(prompt.includes('checkin-summary-context({"range":"custom","startDate":"2026-09-14","endDate":"2026-09-20"})'));
        assert.doesNotMatch(prompt, /Private project name|Private record note|review\.assistantPrompt/,
            "handoff text contains instructions and dates, no raw private records or missing dictionary keys");
    }
}
setPluginLanguage("zh-CN");
assert.equal(assistant.selectReviewAnalysis([legacy, snapshot], context, key).snapshot, snapshot);
assert.equal(assistant.selectReviewAnalysis([], context, key).state, "none");
assert.equal(assistant.selectReviewAnalysis([legacy], context, key).state, "stale", "unscoped old caches remain history only");
assert.equal(assistant.selectReviewAnalysis([{...snapshot, source: "local"}], context, key).state, "stale");
const otherRange = analytics.buildCustomSummaryContext(store, {startDate: "2026-09-01", endDate: "2026-09-20"}, asOf);
assert.equal(assistant.selectReviewAnalysis([snapshot], otherRange, key).state, "stale", "matching end dates alone are insufficient");
const customSameDates = analytics.buildCustomSummaryContext(store, {startDate: context.startDate, endDate: context.endDate}, asOf);
assert.notEqual(assistant.buildReviewAnalysisKey(store, customSameDates), key, "cache includes the actual provider context range label");
const changed = {...store, events: store.events.map(event => event.id === "event-20" ? {...event, note: "Updated private note"} : event)};
const changedContext = analytics.buildSummaryContext(changed, "week", asOf);
const changedKey = assistant.buildReviewAnalysisKey(changed, changedContext);
assert.notEqual(changedKey, key, "edited notes invalidate a provider input even if totals do not change");
assert.equal(assistant.selectReviewAnalysis([snapshot], changedContext, changedKey).state, "stale");
const outsideChanged = {...store, events: store.events.map(event => event.id === "event-13" ? {...event, note: "outside"} : event)};
assert.equal(assistant.buildReviewAnalysisKey(outsideChanged, analytics.buildSummaryContext(outsideChanged, "week", asOf)), key,
    "unrelated records outside the selected period do not stale its analysis");
const invalidSnapshots = [
    {...snapshot, startDate: "2026-02-30"}, {...snapshot, endDate: "2026-13-01"},
    {...snapshot, startDate: "2026-09-21"}, {...snapshot, contextKey: undefined},
    {...snapshot, contextKey: "unversioned"}, {...snapshot, providerName: "x".repeat(201)},
];
assert.deepEqual(suggestions.normalizeAnalysisSnapshots([legacy, snapshot, snapshot, ...invalidSnapshots]), [legacy, snapshot]);

// Extract actual class members through the TS AST; no reimplementation of the
// async lifecycle. Inject only host IO and a fixed local clock around them.
const indexText = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const indexAst = ts.createSourceFile("index.ts", indexText, ts.ScriptTarget.Latest, true);
const pluginClass = indexAst.statements.find(node => ts.isClassDeclaration(node));
const method = name => {
    const node = pluginClass.members.find(member => member.name?.getText(indexAst) === name);
    assert.ok(node, `${name} method must exist`);
    return node.getText(indexAst);
};
const opsText = fs.readFileSync(path.join(sourceRoot, "plugin-ops.ts"), "utf8");
const opsAst = ts.createSourceFile("plugin-ops.ts", opsText, ts.ScriptTarget.Latest, true);
const invalidation = opsAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "invalidateSummaryFor").getText(opsAst).replace(/^export /, "");
const code = ts.transpileModule(`${invalidation}\nclass SummaryHarness {${method("generateSummary")}\n${method("invalidateSummary")}\n${method("renderReview")}}`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
let clock = asOf;
const messages = [];
const renderCalls = {summary: 0, digest: 0};
let renderedSummary;
const Harness = vm.runInNewContext(`${code}\nSummaryHarness`, {
    ...model, ...analytics, ...assistant, ...suggestions, ...shared,
    buildSummaryContext: (...args) => { renderCalls.summary++; return renderedSummary = analytics.buildSummaryContext(...args); },
    buildReviewAnalysisKey: (...args) => { renderCalls.digest++; return assistant.buildReviewAnalysisKey(...args); },
    renderReviewView: context => context,
    currentCalendarDate: () => new Date(clock), structuredClone, t, Error,
    createSuggestionWorkflow: envelope => ({envelope}),
    withTimeout: value => Promise.resolve(value), SUMMARY_TIMEOUT_MS: 1000,
    showMessage: message => messages.push(message),
});
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise, resolve, reject}; };
function hostFor(provider) {
    const host = new Harness();
    Object.assign(host, {store: fixture(), summaryRange: "week", summaryRequestId: 0, summaryRefreshing: false,
        summaryProviders: new Map([[provider.id, provider]]), currentPage: "review", analysisHistory: [],
        analysisHistorySaveQueue: Promise.resolve(), renders: [], writes: [],
        reviewWorkspace: "overview", reviewFoldSections: new Set(), agentCapabilityIds: [], resolvedAppearance: () => "light",
        cloneItem: structuredClone, persistSuggestionWorkflow: async () => {}, broadcast() {},
        render() { this.renders.push({busy: this.summaryRefreshing, text: this.summaryText, history: this.analysisHistory.slice()}); },
        async saveData(cacheKey, value) { this.writes.push({cacheKey, value}); },
    });
    return host;
}

(async () => {
    const registered = new Map();
    let toolContext;
    load("agent-capabilities.ts").registerAgentCapabilities({
        addCapability: capability => registered.set(capability.name, capability),
        getSummaryContext: () => toolContext,
        getCustomSummaryContext: () => toolContext,
    });
    const validBest = {name: "Daily best", completedDays: 7, scheduledDays: 7, completionRate: 100};
    const validFocus = {name: "Daily focus", completedDays: 1, scheduledDays: 4, completionRate: 25};
    const quotaCandidate = {name: "Quota contribution", completedDays: 0, scheduledDays: 7, completionRate: 0,
        quota: {period: "week", elapsedPeriods: 1, completedPeriods: 1, completionRate: 100}};
    const unscheduledCandidate = {name: "Unscheduled activity", completedDays: 0, scheduledDays: 0, completionRate: 100};
    for (const scenario of [
        {items: [quotaCandidate, unscheduledCandidate, validBest, validFocus], best: validBest.name, focus: validFocus.name, suggestion: validFocus.name},
        {items: [quotaCandidate], best: null, focus: null, suggestion: undefined},
        {items: [unscheduledCandidate], best: null, focus: null, suggestion: undefined},
        {items: [quotaCandidate, validBest, unscheduledCandidate], best: validBest.name, focus: null, suggestion: validBest.name},
        {items: [], best: null, focus: null, suggestion: undefined},
    ]) {
        toolContext = {...context, items: scenario.items};
        const before = JSON.stringify(toolContext);
        const result = await registered.get("checkin-summary-context").handler({range: "week"});
        assert.deepEqual(result.structuredContent.highlights, {bestItem: scenario.best, needsAttention: scenario.focus},
            "agent highlights compare only scheduled daily opportunities, without ranking quota or unscheduled items");
        assert.equal(result.structuredContent.items, toolContext.items, "all source items remain available in the unchanged summary schema");
        const action = await registered.get("checkin-action-suggestions").handler({range: "week"});
        assert.equal(action.structuredContent.suggestions[0]?.item, scenario.suggestion,
            "agent priority suggestions use the same eligible daily candidates as the displayed review");
        assert.equal(action.structuredContent.requiresConfirmation, true);
        assert.deepEqual(action.structuredContent.changes, []);
        assert.equal(JSON.stringify(toolContext), before, "agent ranking must not mutate the shared context or item order");
    }
    const customTool = await registered.get("checkin-summary-context").handler({range: "custom", startDate: context.startDate, endDate: context.endDate});
    assert.equal(customTool.structuredContent, toolContext, "custom handoff preserves its established context output schema");

    const presentation = hostFor({id: "adapter", summarize: () => "unused"});
    const viewSnapshot = {asOf: "2026-09-20"};
    presentation.analysisHistory = [snapshot];
    renderCalls.summary = renderCalls.digest = 0;
    const closedReport = presentation.renderReview(viewSnapshot);
    assert.equal(renderCalls.summary, 1, "the host builds a single reusable summary for the review renderer");
    assert.equal(closedReport.summaryContext, renderedSummary, "the exact built context is handed through to the renderer");
    assert.equal(renderCalls.digest, 0, "a closed report must not hash stored events even when a matching cached summary exists");
    assert.equal(closedReport.summaryText, undefined);
    presentation.reviewFoldSections.add("report");
    presentation.reviewWorkspace = "records";
    presentation.renderReview(viewSnapshot);
    presentation.reviewWorkspace = "analysis";
    presentation.renderReview(viewSnapshot);
    assert.equal(renderCalls.digest, 0, "other workspaces must not hydrate the remembered open report");
    presentation.reviewWorkspace = "overview";
    presentation.analysisHistory = [legacy, {...snapshot, startDate: "2026-09-01"}];
    const unrelatedHistory = presentation.renderReview(viewSnapshot);
    assert.equal(unrelatedHistory.summaryCacheState, "stale");
    assert.equal(renderCalls.digest, 0, "legacy and unrelated periods need no event digest");
    presentation.analysisHistory = [snapshot];
    const currentAnalysis = presentation.renderReview(viewSnapshot);
    assert.equal(renderCalls.digest, 1, "an open report with a scoped candidate verifies its actual provider input");
    assert.equal(currentAnalysis.summaryText, snapshot.text);
    assert.equal(currentAnalysis.summaryCacheState, "current");

    let request;
    const host = hostFor({id: "adapter", name: "Adapter", summarize: input => {
        request = structuredClone(input);
        input.events[0].note = "Provider edit";
        input.items[0].name = "Provider rename";
        input.context.items[0].name = "Provider context rename";
        return "First analysis";
    }});
    await host.generateSummary();
    assert.deepEqual(Array.from(request.events, event => event.id), ["event-14", "event-20"], "providers receive only elapsed events in the exact period");
    assert.equal(host.store.events[1].note, "Private record note", "provider mutations cannot affect stored events");
    assert.equal(host.store.items[0].name, "Private project name", "provider mutations cannot affect stored items");
    assert.equal(host.summaryRefreshing, false);
    assert.equal(host.analysisHistory[0].contextKey, key);
    assert.equal(host.analysisHistory[0].startDate, "2026-09-14");
    assert.equal(host.analysisHistory[0].endDate, "2026-09-20");
    assert.equal(host.renders.at(-1).history[0].generatedAt, host.analysisHistory[0].generatedAt,
        "the first completed render already has the matching generation timestamp");
    await host.analysisHistorySaveQueue;
    assert.equal(host.writes[0].cacheKey, suggestions.AGENT_ANALYSIS_CACHE_KEY);

    for (const scenario of [
        {range: {startDate: "2026-09-14", endDate: "2026-09-14"}, ids: ["event-14"], effectiveEnd: "2026-09-14"},
        {range: {startDate: "2026-09-20", endDate: "2026-09-30"}, ids: ["event-20"], effectiveEnd: "2026-09-20"},
    ]) {
        let customRequest;
        const custom = hostFor({id: "adapter", summarize: input => {
            customRequest = structuredClone(input);
            input.customRange.startDate = "2026-01-01";
            input.events[0].note = "Provider-only note";
            return "Custom analysis";
        }});
        custom.summaryCustomRange = {...scenario.range};
        await custom.generateSummary();
        await custom.analysisHistorySaveQueue;
        assert.deepEqual(Array.from(customRequest.events, event => event.id), scenario.ids,
            "custom provider events respect inclusive bounds and exclude future dates beyond the summary cutoff");
        assert.equal(customRequest.context.startDate, scenario.range.startDate);
        assert.equal(customRequest.context.endDate, scenario.effectiveEnd);
        assert.deepEqual(custom.summaryCustomRange, scenario.range, "providers cannot mutate the selected custom range");
        assert.equal(custom.store.events.find(event => event.id === scenario.ids[0]).note, "Private record note");
        assert.equal(custom.analysisHistory[0].endDate, scenario.effectiveEnd, "cached metadata describes the elapsed input, not future requested dates");
        const prompt = assistant.buildReviewPrompt(customRequest.context, "summary");
        assert.ok(prompt.includes(`"endDate":"${scenario.effectiveEnd}"`), "copied agent prompts use the same valid elapsed custom range");
    }

    const oldResult = defer();
    const newResult = defer();
    const race = hostFor({id: "adapter", summarize: () => oldResult.promise});
    const first = race.generateSummary();
    race.invalidateSummary();
    assert.equal(race.summaryRefreshing, false, "invalidation immediately releases the generate action");
    race.summaryProviders.set("adapter", {id: "adapter", summarize: () => newResult.promise});
    const second = race.generateSummary();
    oldResult.resolve("Old result");
    await first;
    assert.equal(race.summaryRefreshing, true, "an old completion cannot clear a newer request's busy state");
    assert.equal(race.analysisHistory.length, 0);
    newResult.resolve("New result");
    await second;
    assert.equal(race.summaryText, "New result");
    assert.equal(race.analysisHistory.length, 1);
    await race.analysisHistorySaveQueue;

    for (const invalidate of [
        host => { host.currentPage = "today"; },
        host => { host.summaryProviders.set("adapter", {id: "adapter", summarize: () => "replacement"}); },
        host => { host.store = {...host.store, events: host.store.events.map(event => event.id === "event-20" ? {...event, note: "newer edit"} : event)}; },
        () => { clock = new Date(2026, 8, 21, 1); },
    ]) {
        const pending = defer();
        const stale = hostFor({id: "adapter", summarize: () => pending.promise});
        const operation = stale.generateSummary();
        invalidate(stale);
        pending.resolve("Must be ignored");
        await operation;
        assert.equal(stale.summaryRefreshing, false, "stale results release their own busy state");
        assert.equal(stale.analysisHistory.length, 0, "navigation, replacement, newer data and midnight each reject stale results");
        clock = asOf;
    }

    const failed = hostFor({id: "adapter", summarize: async () => { throw new Error("Offline"); }});
    await failed.generateSummary();
    assert.equal(failed.summaryError, "Offline");
    assert.equal(failed.summaryRefreshing, false);
    failed.summaryProviders.set("adapter", {id: "adapter", summarize: () => "Recovered"});
    await failed.generateSummary();
    assert.equal(failed.summaryError, undefined);
    assert.equal(failed.summaryText, "Recovered");
    await failed.analysisHistorySaveQueue;

    let sequence = 0;
    const serial = hostFor({id: "adapter", summarize: () => `Analysis ${++sequence}`});
    const firstWrite = defer();
    serial.saveData = async (cacheKey, value) => {
        serial.writes.push({cacheKey, value});
        if (serial.writes.length === 1) await firstWrite.promise;
    };
    await serial.generateSummary();
    await serial.generateSummary();
    assert.equal(serial.analysisHistory.length, 2, "slow persistence never delays current in-memory results");
    assert.equal(serial.writes.length, 1, "disk writes are serialized");
    firstWrite.resolve();
    await serial.analysisHistorySaveQueue;
    assert.deepEqual(Array.from(serial.writes[1].value, entry => entry.text), ["Analysis 1", "Analysis 2"]);
    assert.equal(serial.analysisHistory.at(-1).text, "Analysis 2", "an older save cannot overwrite newer in-memory history");

    const diskFailure = hostFor({id: "adapter", summarize: () => "Keep this result"});
    diskFailure.saveData = async () => { throw new Error("disk full"); };
    await diskFailure.generateSummary();
    await diskFailure.analysisHistorySaveQueue;
    assert.equal(diskFailure.summaryText, "Keep this result");
    assert.equal(diskFailure.summaryError, t("review.assistantCacheSaveFailed"), "cache failure is visible without discarding the generated result");
    console.log("Review assistant behavior passed: localized private-data-free handoff, precise cache scopes, legacy migration, immutable provider input, stale requests, midnight, errors, immediate metadata and ordered persistence.");
})().catch(error => { console.error(error); process.exitCode = 1; });
