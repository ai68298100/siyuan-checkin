/* T-1795 守门：Today 记录/撤销失败可恢复事务（D-342）。
   风险路径（2026-09-30 审计）：bind-today 在异步写入排队前清除 pendingAttachments、
   收起精确输入并交还焦点——写失败只回滚 Store，备注/附件/输入现场全部丢失；
   undoRecentRecord 在持久化前清空 recentRecord 与计时器——撤销失败后没有可再次
   撤销的 token。修复后契约：记录失败时附件放回、精确面板保持展开、重渲染可改后
   重试；成功才消费附件并收起（T-1455 语义仅在成功路径）；撤销失败恢复撤销 token
   （同一事件可再次撤销，回执原样重呈现）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-record-retry-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath, sourceText) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = sourceText ?? fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    fs.writeFileSync(target, ts.transpileModule(source.replace(/from "siyuan"/g, `from ${stubSpec}`), {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("render/bind-today.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const model = require(path.join(dir, "model.js"));
const bindToday = require(path.join(dir, "render", "bind-today.js"));

const today = model.dateKey(new Date());
const buildStore = () => model.normalizeStore({
    version: 3,
    items: [model.normalizeItem({
        id: "p1",
        name: "晨读",
        icon: "📖",
        kind: "count",
        target: 30,
        unit: "分钟",
        schedule: {type: "daily"},
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
        createdDate: today,
    })],
    events: [],
    eventTombstones: [],
    itemTombstones: [],
});

const makeFixture = (recordOutcome) => {
    const store = buildStore();
    const mutations = [];
    const attachButton = {classList: {add() {}, remove() {}}, dataset: {}};
    const elementStubs = new Map([
        [".lc-checkin__amount", {valueAsNumber: 20, addEventListener() {}}],
        [".lc-checkin__record-note", {value: "读了两章", addEventListener() {}}],
        ["[data-attach-button]", attachButton],
        ["[data-exact-entry]", {hidden: false, addEventListener() {}}],
        ["[data-action='toggle-exact']", {setAttribute() {}, addEventListener() {}}],
        ["[data-attach-file]", {addEventListener() {}}],
    ]);
    const recordButton = {handlers: new Map(), disabled: false, dataset: {}, isConnected: true, setAttribute() {}, removeAttribute() {}, closest() { return null; }, addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.({currentTarget: this}); }};
    const card = {
        dataset: {itemId: "p1"},
        querySelector: (selector) => elementStubs.get(selector) || null,
        querySelectorAll: (selector) => selector === "[data-action='record']" ? [recordButton] : [],
        setAttribute() {}, removeAttribute() {},
        addEventListener() {},
    };
    const root = {
        querySelector: () => null,
        querySelectorAll: (selector) => selector === "[data-item-id]" ? [card] : [],
        addEventListener() {},
    };
    const host = {
        currentPage: "today",
        store,
        occasionStore: {occasions: []},
        todayQuery: "",
        quickEntryCancelled: new Set(),
        pendingOnly: false,
        todayGroupMode: "flat",
        todaySortMode: "manual",
        completedCollapsed: false,
        priorityReminderExpanded: false,
        focusTimerProvider: "native",
        heatmapYearOffset: 0,
        collapsedTodayGroups: new Set(),
        expandedExactEntries: [],
        reviewFoldSections: new Set(),
        reviewFoldTouched: false,
        pendingAttachments: new Map([["p1", "data:image/png;base64,AAA"]]),
        renders: 0,
        render() { this.renders += 1; },
        persistViewPreferences: async () => {},
        pulseHaptic() {},
        revisionFingerprint: () => "fp",
        recordCalls: [],
        recordEvent: async (item, value, moment, fingerprint, note, attachment) => {
            host.recordCalls.push({value, note, attachment});
            return recordOutcome ? {id: "e1", itemId: item.id} : undefined;
        },
        enqueueMutation: (operation) => {
            const result = Promise.resolve(operation());
            mutations.push(result);
            return result;
        },
    };
    for (const name of ["bindDialogClose", "bindItemDrag", "bindQuickKeyboard", "bindBulkMode", "bindFocusTimerPanel", "bindMobileNav", "focusTodaySearch", "undoRecentRecord", "retrySave", "showHistory", "showArchived", "showSummary", "showInsights", "showOccasions", "showSettings", "openTabPage", "showEditor", "firstSuccessSkipGuidance"]) host[name] = () => {};
    bindToday.bindTodayHandlers(root, host);
    return {host, recordButton, mutations};
};

(async () => {
    /* —— 夹具 1：写失败保留草稿现场（附件放回、面板保持展开、重渲染）。 —— */
    const failed = makeFixture(false);
    failed.recordButton.fire();
    await Promise.all(failed.mutations);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(failed.host.recordCalls.length, 1, "the mutation ran once");
    assert.equal(failed.host.pendingAttachments.get("p1"), "data:image/png;base64,AAA", "the attachment survives a failed write");
    assert.deepEqual(failed.host.expandedExactEntries, ["p1"], "the exact-entry panel stays expanded for retry");
    assert.ok(failed.host.renders >= 1, "the failure re-renders with the restored draft state");

    /* —— 夹具 2：写成功消费附件并收起面板（T-1455 语义仅在成功路径）。 —— */
    const success = makeFixture(true);
    success.recordButton.fire();
    await Promise.all(success.mutations);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(success.host.pendingAttachments.has("p1"), false, "success consumes the attachment");
    assert.deepEqual(success.host.expandedExactEntries, [], "success collapses the panel");
    assert.equal(success.host.recordCalls[0].note, "读了两章", "the note reaches the recorder");
    assert.equal(success.host.recordCalls[0].attachment, "data:image/png;base64,AAA", "the attachment reaches the recorder");

    /* —— 夹具 3：红证对照——修复前（67675fe）写失败即丢附件、不保展开。 —— */
    const preFixDir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-record-retry-red-"));
    fs.cpSync(dir, preFixDir, {recursive: true});
    const preFixSource = cp.execSync("git show 67675fe:src/render/bind-today.ts", {encoding: "utf8"});
    fs.writeFileSync(path.join(preFixDir, "render", "bind-today.js"), ts.transpileModule(
        preFixSource.replace(/from "siyuan"/g, 'from "../siyuan-stub.js"'), {compilerOptions},
    ).outputText);
    const preFixBind = require(path.join(preFixDir, "render", "bind-today.js"));
    const redFixture = (() => {
        const store = buildStore();
        const mutations = [];
        const elementStubs = new Map([
            [".lc-checkin__amount", {valueAsNumber: 20, addEventListener() {}}],
            [".lc-checkin__record-note", {value: "读了两章", addEventListener() {}}],
            ["[data-exact-entry]", {hidden: false, addEventListener() {}}],
        ]);
        const recordButton = {handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }};
        const card = {
            dataset: {itemId: "p1"},
            querySelector: (selector) => elementStubs.get(selector) || null,
            isConnected: true, setAttribute() {}, removeAttribute() {},
            querySelectorAll: (selector) => selector === "[data-action='record']" ? [recordButton] : selector.startsWith("button[data-action=") ? [recordButton] : [],
            addEventListener() {},
        };
        const host = {
            store,
            occasionStore: {occasions: []},
            quickEntryCancelled: new Set(),
            expandedExactEntries: [],
            pendingAttachments: new Map([["p1", "data:image/png;base64,AAA"]]),
            renders: 0,
            render() { this.renders += 1; },
            pulseHaptic() {},
            revisionFingerprint: () => "fp",
            recordEvent: async () => undefined,
            enqueueMutation: (operation) => {
                const result = Promise.resolve(operation());
                mutations.push(result);
                return result;
            },
        };
        for (const name of ["bindDialogClose", "bindItemDrag", "bindQuickKeyboard", "bindBulkMode", "bindFocusTimerPanel", "bindMobileNav", "focusTodaySearch", "undoRecentRecord", "retrySave"]) host[name] = () => {};
        preFixBind.bindTodayHandlers({querySelector: () => null, querySelectorAll: (selector) => selector === "[data-item-id]" ? [card] : []}, host);
        return {host, recordButton, mutations};
    })();
    redFixture.recordButton.fire();
    await Promise.all(redFixture.mutations);
    assert.equal(redFixture.host.pendingAttachments.has("p1"), false, "pre-fix reference: the attachment is lost on failure (red evidence)");
    assert.equal(redFixture.host.expandedExactEntries.length, 0, "pre-fix reference: the panel state is lost (red evidence)");

    /* —— 夹具 4：撤销 token 恢复（index 撤销路径结构钉）。 —— */
    const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    const undoStart = indexSource.indexOf("private async undoRecentRecord");
    assert.ok(undoStart > 0, "undoRecentRecord exists");
    const undoBody = indexSource.slice(undoStart, indexSource.indexOf("private async", undoStart + 10));
    assert.match(undoBody, /this\.setRecentRecord\(recent\);/, "a failed undo re-arms the recoverable token");
    assert.match(undoBody, /msg\.undoFail/, "the failure still surfaces the undo-failure message");

    console.log("record-retry: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
