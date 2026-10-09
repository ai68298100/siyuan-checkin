/* T-1702/T-1703 守门：编辑态模板身份保护与事项表单提交幂等（D-349）。
   风险路径（源码确认）：套用模板强制清空 editingOccasionId——编辑既有事项时
   "保存修改"静默变成"新增"；提交无在途门——快速双击可能连续新建同内容事项。
   契约：编辑态套模板先 confirm（取消零写入，确认后覆写表单但保留编辑目标），
   新建路径原样；提交在途期间忽略重复 submit（按钮 disabled+aria-busy），
   完成后释放可重试；编辑目标由 saveOccasionForm 在锁内从宿主状态复核。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-form-"));
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

/* Node 的 FormData 不接受自造 form 元素——最小垫片（submit 校验用 get，T-1708 签名用 forEach）。 */
class StubFormData {
    constructor(form) {
        this.entries = (form && form.formDataEntries) || [];
    }
    get(key) {
        const found = this.entries.find(([name]) => name === key);
        return found ? found[1] : null;
    }
    forEach(callback) {
        for (const [name, value] of this.entries) callback(value, name);
    }
}
globalThis.FormData = StubFormData;

const makeField = (value = "") => ({value, addEventListener() {}});
const makeFixture = ({editingOccasionId, confirmResult, saveDelay}) => {
    globalThis.window = {confirm: () => confirmResult};
    const formFields = new Map([
        ["[name='name']", makeField("原名称")],
        ["[name='date']", makeField("2026-10-01")],
        ["[name='kind']", makeField("scheduled")],
        ["[name='recurrence']", makeField("weekly")],
        ["[name='calendar']", makeField("solar")],
        ["[name='annualSubtype']", makeField("byday")],
        ["[name='annualMonth']", makeField("1")],
        ["[name='annualNth']", makeField("1")],
        ["[name='annualWeekday']", makeField("0")],
        ["[name='monthlySubtype']", makeField("byday")],
        ["[name='monthlyWeekday']", makeField("0")],
        ["[name='weeklyWeekday']", makeField("1")],
        ["[name='intervalCount']", makeField("1")],
        ["[name='intervalUnit']", makeField("month")],
        ["[name='remindBeforeDays']", makeField("0")],
    ]);
    const submitButton = {attributes: new Map(), setAttribute(name) { this.attributes.set(name, "1"); }, removeAttribute(name) { this.attributes.delete(name); }, hasAttribute(name) { return this.attributes.has(name); }};
    const submitHandlers = [];
    const templateHandlers = [];
    const card = {
        querySelector: (selector) => formFields.get(selector) || null,
        querySelectorAll: (selector) => selector === "[data-occasion-template]" ? [templateButton] : [],
    };
    const templateButton = {dataset: {occasionTemplate: "0"}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }};
    const form = {handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("submit")?.({currentTarget: form, preventDefault() {}}); },
        formDataEntries: [["name", "原名称"], ["date", "2026-10-01"]],
        querySelector: (selector) => formFields.get(selector) || (selector === "button[type='submit']" ? submitButton : null),
        querySelectorAll: () => []};
    const root = {
        querySelector: (selector) => selector === "[data-occasion-form]" ? form : null,
        querySelectorAll: (selector) => {
            if (selector === "[data-occasion-form]") return [form];
            if (selector === "[data-occasion-template]") return [templateButton];
            return [];
        },
    };
    const host = {
        occasionStore: {occasions: []},
        occasionSearchQuery: "",
        occasionStatusFilter: "all",
        occasionKindFilter: "all",
        occasionTimeFilter: "all",
        occasionTemplatesOpen: false,
        occasionTemplateCategory: "recommended",
        editingOccasionId,
        syncOccasionLunarHint() {},
        showToday() {},
        render() {},
        saveCalls: 0,
        saveOccasionForm: async () => {
            host.saveCalls += 1;
            if (saveDelay) await new Promise((resolve) => setTimeout(resolve, saveDelay));
        },
        enqueueMutation: (operation) => Promise.resolve(operation()),
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion"]) host[name] = () => Promise.resolve();
    let confirmCalls = 0;
    const previousConfirm = globalThis.window?.confirm;
    globalThis.window = {confirm: () => { confirmCalls += 1; return confirmResult; }};
    bindOccasions.bindOccasionsHandlers(root, host);
    return {host, form, card, templateButton, submitButton, confirmCount: () => confirmCalls};
};

(async () => {
    /* —— 夹具 1（T-1702）：编辑态套模板，确认后覆写表单且保留编辑目标。 —— */
    const editing = makeFixture({editingOccasionId: "occ-1", confirmResult: true});
    editing.templateButton.fire();
    assert.equal(editing.host.editingOccasionId, "occ-1", "the edit target survives template application");
    assert.ok(editing.confirmCount() === 1, "edit-mode template application consults the confirm dialog");

    /* —— 夹具 2（T-1702）：确认取消零写入（表单不变、目标保留）。 —— */
    const cancelled = makeFixture({editingOccasionId: "occ-1", confirmResult: false});
    const nameBefore = cancelled.card.querySelector("[name='name']").value;
    cancelled.templateButton.fire();
    assert.equal(cancelled.host.editingOccasionId, "occ-1", "cancelling keeps the edit target");
    assert.equal(cancelled.card.querySelector("[name='name']").value, nameBefore, "cancelling leaves the form untouched (zero writes)");

    /* —— 夹具 3（T-1702）：新建路径原样（无确认、清目标）。 —— */
    const creating = makeFixture({editingOccasionId: undefined, confirmResult: false});
    creating.templateButton.fire();
    assert.equal(creating.host.editingOccasionId, undefined, "the create path keeps its original behavior");
    assert.notEqual(creating.card.querySelector("[name='name']").value, "原名称", "the template fills the new-item draft");

    /* —— 夹具 4（T-1703）：快速双击只产生一次保存；完成后释放可重试。 —— */
    const submitting = makeFixture({editingOccasionId: undefined, confirmResult: true, saveDelay: 30});
    submitting.form.fire();
    submitting.form.fire();
    submitting.form.fire();
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(submitting.host.saveCalls, 1, "rapid double/triple submits produce exactly one save");
    assert.equal(submitting.submitButton.hasAttribute("disabled"), true, "the submit button is disabled while in flight");
    assert.equal(submitting.submitButton.hasAttribute("aria-busy"), true, "the submit button announces busy state");
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(submitting.submitButton.hasAttribute("disabled"), false, "the button is released after completion (retryable)");

    /* —— 夹具 5：结构钉 + 红证对照（钉修复前提交 546778d）。 —— */
    const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
    assert.match(bindSource, /host\.editingOccasionId && !window\.confirm\(t\("msg\.occasionTemplateOverwrite"\)\)/, "edit-mode template application confirms first");
    assert.doesNotMatch(bindSource, /set\("remindBeforeDays", String\(template\.remindBeforeDays\)\);\s*\r?\n\s*host\.editingOccasionId = undefined;/, "template application no longer clears the edit target");
    assert.match(bindSource, /if \(occasionSubmitBusy\) return;/, "in-flight submits are ignored");
    assert.match(bindSource, /occasionSubmitBusy = false;/, "the gate releases after completion");
    const occasionView = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
    assert.match(occasionView, /<form data-occasion-form\$\{ctx\.submitting \? ` aria-busy=\"true\"` : \"\"\}>/, "the re-rendered occasion form preserves aria-busy");
    assert.match(occasionView, /type=\"submit\" \$\{ctx\.submitting \? `disabled aria-busy=\"true\"` : \"\"\}/, "the re-rendered submit button preserves disabled and aria-busy");
    const preFixBind = cp.execSync("git show 546778d:src/render/bind-occasions.ts", {encoding: "utf8"});
    assert.doesNotMatch(preFixBind, /occasionSubmitBusy/, "the pre-fix form had no submit gate (red evidence)");
    assert.match(preFixBind, /host\.editingOccasionId = undefined;\s*\r?\n\s*syncBlocks\(\);/, "the pre-fix template flow cleared the edit target (red evidence)");

    /* —— 夹具 6：i18n 双语键在位。 —— */
    const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
    assert.equal((i18nSource.match(/"msg\.occasionTemplateOverwrite":/g) || []).length, 2, "the confirm copy exists in both dictionaries");

    console.log("occasion-form: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
