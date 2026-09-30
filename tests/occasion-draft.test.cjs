/* T-1708 守门：事项表单草稿、远端刷新与离开保护（D-354）。
   风险路径（源码确认）：onDataChanged 重载事项后整页重绘，未保存的名称/日期/备注
   只在 DOM 中被吞。契约：输入即快照进宿主态（dirty 相对绑定期基线）；重绘后绑定期
   按编辑目标匹配恢复（值还原 + 提示）；远端更新同一事项（updatedAt 变化）confirm
   冲突——确定=保留草稿继续编辑，取消=载入远端数据；保存成功/取消编辑/新建/模板
   覆写清草稿；草稿不跨插件重载保留。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-draft-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
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
transpileTo("render/bind-occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const bindOccasions = require(path.join(dir, "render", "bind-occasions.js"));

class StubFormData {
    constructor(form) { this.entries = (form && form.formDataEntries) || []; }
    get(key) { const found = this.entries.find(([name]) => name === key); return found ? found[1] : null; }
    forEach(callback) { for (const [name, value] of this.entries) callback(value, name); }
}
globalThis.FormData = StubFormData;
globalThis.window = {confirm: () => true};

const FIELD_NAMES = ["name", "date", "kind", "recurrence", "calendar", "remindBeforeDays", "note"];
const makeFixture = ({editingOccasionId, existingUpdatedAt, confirmResult}) => {
    globalThis.window.confirm = () => confirmResult;
    const store = {version: 1, occasions: editingOccasionId ? [
        {id: editingOccasionId, name: "远端名", kind: "scheduled", date: "2026-09-15", recurrence: "weekly", weekday: 2, enabled: true, completedDates: [], overrides: {}, updatedAt: existingUpdatedAt || "2026-09-01T00:00:00.000Z"},
    ] : []};
    const formFields = new Map(FIELD_NAMES.map((name) => [`[name='${name}']`, {value: name === "name" ? "远端名" : name === "date" ? "2026-09-15" : name === "kind" ? "scheduled" : name === "recurrence" ? "weekly" : name === "calendar" ? "solar" : "", addEventListener() {}}]));
    const inputHandlers = [];
    const form = {
        handlers: new Map(),
        addEventListener(name, fn) { this.handlers.set(name, fn); if (name === "input") inputHandlers.push(fn); },
        fireInput() { inputHandlers.forEach((fn) => fn({})); },
        /* 桩 FormData 读取当前字段值（动态）。 */
        get formDataEntries() { return FIELD_NAMES.map((name) => [name, formFields.get(`[name='${name}']`).value]); },
        querySelector: (selector) => formFields.get(selector) || null,
        querySelectorAll: () => [],
    };
    const root = {querySelector: (selector) => selector === "[data-occasion-form]" ? form : null, querySelectorAll: () => []};
    const host = {
        occasionStore: store,
        occasionSearchQuery: "",
        occasionStatusFilter: "all",
        occasionKindFilter: "all",
        occasionTimeFilter: "all",
        occasionTemplatesOpen: false,
        occasionTemplateCategory: "recommended",
        editingOccasionId,
        render() {},
        enqueueMutation: (operation) => Promise.resolve(operation()),
        saveOccasionForm: async () => {},
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion", "setOccasionCompleted", "persistOccasions"]) host[name] = () => Promise.resolve();
    bindOccasions.bindOccasionsHandlers(root, host);
    const setField = (name, value) => { const field = formFields.get(`[name='${name}']`); field.value = value; };
    return {host, form, setField};
};

(async () => {
    /* —— 夹具 1：编辑态输入 → 草稿快照；远端重绘（同宿主再 bind）→ 恢复值写回新 DOM。 —— */
    const twoBindHost = makeFixture({editingOccasionId: "occ-1", existingUpdatedAt: "2026-09-01T00:00:00.000Z", confirmResult: true});
    twoBindHost.setField("name", "我改的名字");
    twoBindHost.form.fireInput();
    assert.ok(twoBindHost.host.occasionDraft, "editing snapshots the draft into host state");
    assert.equal(twoBindHost.host.occasionDraft.values.find(([key]) => key === "name")[1], "我改的名字", "the snapshot carries the edited value");
    /* 模拟远端重载整页重绘：以同宿主再跑一次 bind（全新 root/DOM，值回到远端渲染）。 */
    const redrawRootFields = new Map(FIELD_NAMES.map((name) => [`[name='${name}']`, {value: name === "name" ? "远端名" : name === "date" ? "2026-09-15" : "", addEventListener() {}}]));
    const redrawForm = {handlers: new Map(), addEventListener() {}, get formDataEntries() { return FIELD_NAMES.map((name) => [name, redrawRootFields.get(`[name='${name}']`).value]); }, querySelector: (selector) => redrawRootFields.get(selector) || null, querySelectorAll: () => []};
    const redrawRoot = {querySelector: (selector) => selector === "[data-occasion-form]" ? redrawForm : null, querySelectorAll: () => []};
    twoBindHost.host.occasionStore.occasions[0].updatedAt = "2026-09-01T00:00:00.000Z";
    bindOccasions.bindOccasionsHandlers(redrawRoot, twoBindHost.host);
    assert.equal(redrawRootFields.get("[name='name']").value, "我改的名字", "the redraw restores the draft value into the fresh DOM");
    assert.equal(twoBindHost.host.occasionDraft, undefined, "the draft is consumed once restored");

    /* —— 夹具 3：远端更新同事项（updatedAt 变化）→ confirm 分支。 —— */
    const conflictAccept = makeFixture({editingOccasionId: "occ-1", existingUpdatedAt: "2026-09-10T00:00:00.000Z", confirmResult: true});
    conflictAccept.host.occasionDraft = {editingId: "occ-1", baseUpdatedAt: "2026-09-01T00:00:00.000Z", values: [["name", "我的草稿"], ["date", "2026-09-15"], ["kind", "scheduled"], ["recurrence", "weekly"], ["calendar", "solar"], ["remindBeforeDays", "0"], ["note", ""]]};
    const conflictFields = new Map(FIELD_NAMES.map((name) => [`[name='${name}']`, {value: "远端新名", addEventListener() {}}]));
    const conflictForm = {handlers: new Map(), addEventListener() {}, formDataEntries: [], querySelector: (selector) => conflictFields.get(selector) || null, querySelectorAll: () => []};
    bindOccasions.bindOccasionsHandlers({querySelector: (selector) => selector === "[data-occasion-form]" ? conflictForm : null, querySelectorAll: () => []}, conflictAccept.host);
    assert.equal(conflictFields.get("[name='name']").value, "我的草稿", "accepting the conflict keeps the user draft");
    assert.equal(conflictAccept.host.occasionDraft, undefined, "the conflict draft is consumed after the choice");

    const conflictReject = makeFixture({editingOccasionId: "occ-1", existingUpdatedAt: "2026-09-10T00:00:00.000Z", confirmResult: false});
    conflictReject.host.occasionDraft = {editingId: "occ-1", baseUpdatedAt: "2026-09-01T00:00:00.000Z", values: [["name", "我的草稿"], ["date", "2026-09-15"], ["kind", "scheduled"], ["recurrence", "weekly"], ["calendar", "solar"], ["remindBeforeDays", "0"], ["note", ""]]};
    const rejectFields = new Map(FIELD_NAMES.map((name) => [`[name='${name}']`, {value: "远端新名", addEventListener() {}}]));
    const rejectForm = {handlers: new Map(), addEventListener() {}, formDataEntries: [], querySelector: (selector) => rejectFields.get(selector) || null, querySelectorAll: () => []};
    bindOccasions.bindOccasionsHandlers({querySelector: (selector) => selector === "[data-occasion-form]" ? rejectForm : null, querySelectorAll: () => []}, conflictReject.host);
    assert.equal(rejectFields.get("[name='name']").value, "远端新名", "rejecting the conflict loads the remote data");
    assert.equal(conflictReject.host.occasionDraft, undefined, "the rejected draft is discarded");

    /* —— 夹具 4：结构与红证对照（钉 0f1fe5c）。 —— */
    const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
    assert.match(bindSource, /host\.occasionDraft = \{editingId: host\.editingOccasionId, baseUpdatedAt: draftBaseUpdatedAt, values\}/, "input snapshots the draft");
    assert.match(bindSource, /msg\.occasionDraftConflict/, "the remote-changed branch confirms");
    assert.match(bindSource, /msg\.occasionDraftRestored/, "a restore surfaces the notice");
    assert.match(bindSource, /host\.occasionDraft = undefined;\s*\r?\n?\s*const set = /, "template overwrite clears the draft (programmatic form writes must invalidate)");
    const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    assert.match(indexSource, /this\.occasionDraft = undefined;/, "a successful save clears the draft");
    const preFixBind = cp.execSync("git show 0f1fe5c:src/render/bind-occasions.ts", {encoding: "utf8"});
    assert.doesNotMatch(preFixBind, /occasionDraft/, "the pre-fix binder had no draft layer (red evidence)");

    /* —— 夹具 5：i18n 双语键在位。 —— */
    const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
    for (const key of ["msg.occasionDraftRestored", "msg.occasionDraftConflict"]) {
        assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
    }

    console.log("occasion-draft: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
