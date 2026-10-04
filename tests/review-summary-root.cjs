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
    const localRequire = name => name.startsWith(".") ? loadSource(path.relative(sourceRoot, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}

const model = loadSource("model.ts");
const analytics = loadSource("analytics.ts");
const assistant = loadSource("features/review-assistant.ts");
const analysis = loadSource("agent-suggestions.ts");
const workflow = loadSource("features/suggestion-workflow.ts");
const shared = loadSource("shared.ts");
const syntax = ts.createSourceFile("index.ts", fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const plugin = syntax.statements.find(statement => ts.isClassDeclaration(statement));
const methods = plugin.members.filter(member => ["generateSummary", "cancelReviewSummary"].includes(member.name?.getText(syntax))).map(member => member.getText(syntax)).join("\n");
const harnessCode = ts.transpileModule(`class SummaryHarness {${methods}}\nmodule.exports = SummaryHarness;`, {compilerOptions}).outputText;
const harnessModule = {exports: {}};
const dependencies = {...model, ...analytics, ...assistant, ...analysis, ...workflow, ...shared,
    SUMMARY_TIMEOUT_MS: 30000, withTimeout: promise => promise, t: key => key, showMessage: () => {}};
new Function("module", ...Object.keys(dependencies), harnessCode)(harnessModule, ...Object.values(dependencies));
const SummaryHarness = harnessModule.exports;

async function verifySummaryRoots() {
    const now = new Date();
    const host = new SummaryHarness();
    const requests = [];
    const writes = [];
    const rendered = [];
    const provider = {id: "test-provider", name: "Test", summarize: input => new Promise((resolve, reject) => requests.push({input, resolve, reject}))};
    Object.assign(host, {
        store: model.normalizeStore({version: 3, items: [{id: "read", name: "Read", kind: "duration", unit: "分钟", target: 10,
            schedule: {type: "daily"}, createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 12).toISOString()}], events: []}),
        rootContexts: new Map(), summaryProviders: new Map([[provider.id, provider]]), summaryRange: "week", summaryRequestId: 0,
        summaryRefreshing: false, summaryText: undefined, analysisHistory: [], analysisHistorySaveQueue: Promise.resolve(), currentPage: "review",
        disposed: false, disposing: false, projectDrafts: [], cloneItem: item => structuredClone(item),
        render: root => rendered.push(root), broadcast: () => {}, persistSuggestionWorkflow: async () => {},
        saveData: async (key, value) => { if (host.failCacheSave) throw new Error("cache write failed"); writes.push({key, value}); },
        reviewStateForRoot: root => host.rootContexts.get(root).review,
        pageForRoot: root => host.rootContexts.get(root).page,
    });
    const primary = {isConnected: true};
    const secondary = {isConnected: true};
    const primaryState = {summaryRange: "day", summarySession: {requestId: 0, refreshing: false}};
    const secondaryState = {summaryRange: "week", summarySession: {requestId: 0, refreshing: false}};
    host.rootContexts.set(primary, {page: "review", review: primaryState});
    host.rootContexts.set(secondary, {page: "review", review: secondaryState});
    const first = host.generateSummary(primary);
    const second = host.generateSummary(secondary);
    assert.equal(requests.length, 2, "two roots may generate independently");
    assert.equal(requests[0].input.range, "day");
    assert.equal(requests[1].input.range, "week");
    assert.equal(primaryState.summarySession.refreshing, true);
    assert.equal(secondaryState.summarySession.refreshing, true);
    await host.generateSummary(primary);
    assert.equal(requests.length, 2, "the same root cannot issue a duplicate request while busy");
    host.cancelReviewSummary(primary);
    assert.equal(secondaryState.summarySession.refreshing, true, "cancelling one root leaves the other request active");
    const replacement = host.generateSummary(primary);
    requests[1].resolve("Secondary result");
    await second;
    requests[0].resolve("Cancelled result");
    await first;
    assert.equal(primaryState.summarySession.refreshing, true, "an old finally block cannot clear a replacement request");
    assert.deepEqual(host.analysisHistory.map(snapshot => snapshot.text), ["Secondary result"]);
    requests[2].reject(new Error("Primary generation failed"));
    await replacement;
    assert.equal(primaryState.summarySession.error, "Primary generation failed");
    assert.equal(secondaryState.summarySession.error, undefined, "errors stay in their requesting root");
    const cacheFailure = host.generateSummary(primary);
    host.failCacheSave = true;
    requests[3].resolve("Primary result");
    await cacheFailure;
    await host.analysisHistorySaveQueue;
    assert.equal(primaryState.summarySession.error, "review.assistantCacheSaveFailed");
    assert.equal(secondaryState.summarySession.error, undefined);
    host.failCacheSave = false;
    const navigation = host.generateSummary(primary);
    host.cancelReviewSummary(primary);
    host.rootContexts.get(primary).page = "today";
    const historyBeforeNavigation = host.analysisHistory.length;
    requests[4].resolve("After navigation");
    await navigation;
    assert.equal(host.analysisHistory.length, historyBeforeNavigation, "navigation invalidates the old output");
    host.rootContexts.get(primary).page = "review";
    const closed = host.generateSummary(primary);
    primary.isConnected = false;
    host.rootContexts.delete(primary);
    const rendersBeforeClose = rendered.length;
    requests[5].resolve("After close");
    await closed;
    assert.equal(host.analysisHistory.length, historyBeforeNavigation, "closed roots cannot publish results");
    assert.equal(rendered.length, rendersBeforeClose, "closed roots are never re-rendered by completion");
    const changedFacts = host.generateSummary(secondary);
    host.store = model.normalizeStore({...host.store, events: [...host.store.events,
        {id: "new-fact", itemId: "read", occurredAt: now.toISOString(), localDate: model.dateKey(now), value: 5, unit: "分钟", source: "manual"}]});
    requests[6].resolve("Stale input");
    await changedFacts;
    assert.equal(host.analysisHistory.length, historyBeforeNavigation, "changed input facts reject the stale summary");
    assert.equal(secondaryState.summarySession.refreshing, false, "stale output does not leave loading stuck");
    const changedProvider = host.generateSummary(secondary);
    host.summaryProviders.set(provider.id, {...provider});
    requests[7].resolve("Replaced provider");
    await changedProvider;
    assert.equal(host.analysisHistory.length, historyBeforeNavigation);
    assert.equal(secondaryState.summarySession.refreshing, false);
    assert.ok(writes.length > 0, "successful summary still reaches the analysis cache");
    console.log("Review summary root lifecycle passed: independent scopes, busy states, cancellation, replacement, failures, cache writes, navigation, close, changed facts and provider replacement.");
}

verifySummaryRoots().catch(error => { console.error(error); process.exitCode = 1; });
