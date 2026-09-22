const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync("src/index.ts", "utf8");
const sharedSource = fs.readFileSync("src/shared.ts", "utf8");
const agentSource = fs.readFileSync("src/agent-capabilities.ts", "utf8");
const apiSource = fs.readFileSync("src/api.ts", "utf8");
const quickDialogSource = fs.readFileSync("src/render/quick-dialog.ts", "utf8");
const manifest = JSON.parse(fs.readFileSync("plugin.json", "utf8"));
const packageManifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(manifest.version, packageManifest.version, "plugin and package versions must stay aligned");
assert.equal(manifest.minAppVersion >= "3.4.2", true);

assert.match(source, /this\.isMobileFrontend = frontend === "mobile" \|\| frontend === "browser-mobile"/);
assert.match(source, /this\.supportsCustomTab = !this\.isMobileFrontend/);
assert.match(source, /if \(this\.supportsCustomTab\) this\.addCommand/);
const navigationSource = fs.readFileSync("src/navigation.ts", "utf8");
assert.match(navigationSource, /if \(!host\.supportsCustomTab\) host\.openQuickDialog\(\)/);
const fragmentsSource = fs.readFileSync("src/render/fragments.ts", "utf8");
assert.match(fragmentsSource, /data-action="open-tab"/);
assert.match(source, /getCustomSummaryContext/);
assert.match(apiSource, /自定义总结范围无效/);
assert.match(apiSource, /CHECKIN_API_VERSION/);
assert.match(apiSource, /summarizeCustom: \(range, providerId\) => summarizeWithProvider\("day", range, providerId\)/);
assert.match(apiSource, /getAnalyticsSnapshot: \(asOf = currentCalendarDate\(\)\)/);
assert.match(apiSource, /getAnalyticsSummary: \(asOf = currentCalendarDate\(\)\)/);
assert.match(source, /customRange \? buildCustomSummaryContext/);
// Provider request range and copy isolation are exercised below against the
// actual generateSummary method, independent of its chosen range helper.
assert.match(source, /const SUMMARY_TIMEOUT_MS = 30000/);
assert.match(source, /withTimeout\(provider\.summarize\([\s\S]*SUMMARY_TIMEOUT_MS, "总结适配器响应超时"/);
assert.match(sharedSource, /export function withTimeout<T>\(promise: Promise<T>, timeoutMs: number, message: string\)/);
assert.match(source, /addAgentCapability\?:/);
assert.match(agentSource, /checkin-summary-context/);
assert.match(agentSource, /checkin-action-suggestions/);
assert.match(agentSource, /requiresConfirmation: true/);
assert.match(agentSource, /changes: \[\]/);
assert.match(agentSource, /description: "规范化后的项目设置变更/);
assert.match(agentSource, /checkin-list-items/);
assert.match(agentSource, /checkin-item-insights/);
assert.match(agentSource, /checkin-record-event/);
assert.match(agentSource, /checkin-list-occasions/);
assert.match(agentSource, /checkin-complete-occasion/);
assert.match(source, /ensureSpeedSwitchQuickActions/);
assert.match(quickDialogSource, /\(host\.app as unknown as \{plugins\?: unknown\} \| undefined\)\?\.plugins/,
    "optional launcher discovery must tolerate hosts without an app plugin registry");
assert.match(quickDialogSource, /lcCheckinMobileTopBarButton/);
assert.match(agentSource, /localRead: true, dataEgress: true, externalCost: false/);
assert.match(agentSource, /localRead: true, localWrite: true, dataEgress: true, externalCost: false/);
assert.match(agentSource, /required: \["itemId"\]/);
assert.match(agentSource, /今日可用的打卡项目/);
assert.match(agentSource, /buildCoachingSuggestions\(report\)/);
assert.match(agentSource, /suggestions,/);
assert.match(agentSource, /自定义日期范围无效，请使用 YYYY-MM-DD/);

/* Exercise the optional launcher's public registration contract. A successful
   void return must be just as idempotent as a returned cleanup function. */
const quickDialogModule = {exports: {}};
const retryCallbacks = [];
vm.runInNewContext(ts.transpileModule(quickDialogSource, {compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
}}).outputText, {
    exports: quickDialogModule.exports,
    module: quickDialogModule,
    require: id => id === "../i18n" ? {t: key => key} : {},
    window: {setTimeout: callback => {retryCallbacks.push(callback); return retryCallbacks.length;}},
});
const registerLauncher = quickDialogModule.exports.ensureSpeedSwitchQuickActionsFor;
for (const returnsCleanup of [false, true]) {
    const registrations = [];
    let cleanupCount = 0;
    const host = {
        disposed: false, disposing: false, speedSwitchQuickActionDisposers: [],
        app: {plugins: [{name: "siyuan-speed-switch", registerQuickAction(options) {
            registrations.push(options);
            return returnsCleanup ? () => cleanupCount++ : undefined;
        }}]},
    };
    registerLauncher(host);
    registerLauncher(host);
    assert.equal(registrations.length, 1, `launcher returning ${returnsCleanup ? "cleanup" : "void"} registers once`);
    assert.equal(registrations[0].id, "xiaolv-checkin-open");
    assert.deepEqual(Array.from(registrations[0].targets), ["desktop", "sidebar", "mobile"]);
    assert.equal(host.speedSwitchQuickActionDisposers.length, returnsCleanup ? 1 : 0);
    host.speedSwitchQuickActionDisposers.forEach(dispose => dispose());
    assert.equal(cleanupCount, returnsCleanup ? 1 : 0, "real cleanup remains available to plugin teardown");
}
const lateHost = {disposed: false, disposing: false, speedSwitchQuickActionDisposers: [], app: {plugins: []}};
registerLauncher(lateHost);
assert.equal(retryCallbacks.length, 1, "missing launcher retains the existing delayed discovery path");
let lateRegistrations = 0;
lateHost.app.plugins.push({name: "siyuan-speed-switch", registerQuickAction() {lateRegistrations++;}});
retryCallbacks[0]();
registerLauncher(lateHost);
assert.equal(lateRegistrations, 1, "late discovery is also idempotent without a disposer");
console.log("Entry capability structure checks passed.");
require("./review-assistant.test.cjs");
