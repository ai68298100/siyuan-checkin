/* T-1714 守门：事项搜索 IME、光标与卸载保护（D-357）。
   风险路径（源码确认）：搜索输入每次 input 同步整页重绘并强制光标跳末尾——
   中文 IME 组合期间重绘吞组合态，中间插入光标错位。
   契约：composition 期间 input 不重绘、compositionend 才应用一次；原生 isComposing
   同样保护；非组合输入保留光标位；旧节点/卸载不渲染；query 为宿主字段往返自动恢复。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-search-ime-"));
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

globalThis.window = {confirm: () => true};
const makeFixture = () => {
    const search = {
        value: "",
        selectionStart: null,
        isConnected: true,
        focus() {},
        setSelectionRange(start) { this.caret = start; },
        handlers: new Map(),
        addEventListener(name, fn) { this.handlers.set(name, fn); },
        fire(name, details = {}) { this.handlers.get(name)?.({currentTarget: this, ...details}); },
    };
    const root = {
        search,
        querySelector: (selector) => selector === "[data-occasion-search]" ? root.search : null,
        querySelectorAll: () => [],
    };
    const host = {
        occasionStore: {version: 1, occasions: []},
        occasionSearchQuery: "",
        occasionStatusFilter: "all",
        occasionKindFilter: "all",
        occasionTimeFilter: "all",
        occasionTemplatesOpen: false,
        occasionTemplateCategory: "recommended",
        renders: 0,
        render() { this.renders += 1; },
        enqueueMutation: (operation) => Promise.resolve(operation()),
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion", "setOccasionCompleted", "persistOccasions", "saveOccasionForm"]) host[name] = () => Promise.resolve();
    bindOccasions.bindOccasionsHandlers(root, host);
    return {host, root, search};
};

/* —— 夹具 1：非组合输入应用查询并恢复光标位。 —— */
const plain = makeFixture();
plain.search.value = "喝水";
plain.search.selectionStart = 1; // 光标在"喝"之后（中间插入位）
plain.search.fire("input");
assert.equal(plain.host.occasionSearchQuery, "喝水", "a plain input applies the query");
assert.equal(plain.host.renders, 1, "a plain input renders once");
assert.equal(plain.root.search.caret, 1, "the caret position is preserved instead of jumping to the end");

/* —— 夹具 2：组合期间 input 不重绘；compositionend 应用一次。 —— */
const composing = makeFixture();
composing.search.value = "h";
composing.search.fire("compositionstart");
composing.search.value = "喝";
composing.search.fire("input", {isComposing: true});
assert.equal(composing.host.renders, 0, "composition input does not re-render");
assert.equal(composing.host.occasionSearchQuery, "", "composition input does not touch the query");
composing.search.value = "喝水";
composing.search.fire("compositionend");
assert.equal(composing.host.occasionSearchQuery, "喝水", "compositionend applies the final value once");
assert.equal(composing.host.renders, 1, "exactly one render after composition ends");

/* —— 夹具 3：原生 isComposing（无 compositionstart）同样保护。 —— */
const native = makeFixture();
native.search.value = "shui";
native.search.fire("input", {isComposing: true});
assert.equal(native.host.renders, 0, "native isComposing also suppresses re-render");
native.search.value = "水";
native.search.fire("input");
assert.equal(native.host.occasionSearchQuery, "水", "post-composition input applies normally");

/* —— 夹具 4：旧节点/卸载不渲染。 —— */
const stale = makeFixture();
stale.search.isConnected = false;
stale.search.value = "旧";
stale.search.fire("input");
assert.equal(stale.host.renders, 0, "a detached input never re-renders");
const disposed = makeFixture();
disposed.host.disposing = true;
disposed.search.value = "旧";
disposed.search.fire("input");
assert.equal(disposed.host.renders, 0, "a disposing host never re-renders");

/* —— 夹具 5：结构钉 + 红证对照（钉修复前提交 f2eddc1）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSource, /compositionstart/, "the search listens for composition start");
assert.match(bindSource, /compositionend/, "the search applies on composition end");
assert.match(bindSource, /\(event as InputEvent\)\.isComposing/, "native isComposing is honored");
assert.match(bindSource, /Math\.min\(caret, next\.value\.length\)/, "the caret position is restored, not forced to the end");
assert.match(bindSource, /host\.disposing/, "a disposing host never re-renders");
const preFixBind = cp.execSync("git show f2eddc1:src/render/bind-occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixBind, /compositionstart/, "the pre-fix search had no composition handling (red evidence)");
assert.match(preFixBind, /setSelectionRange\(searchInput\.value\.length, searchInput\.value\.length\)/, "the pre-fix search forced the caret to the end (red evidence)");

console.log("occasion-search-ime: all assertions passed");
