/* T-1712/T-1711 守门：事项页按发生日完成/撤销闭环与启停图标消歧（D-355）。
   风险路径（闭环缺口）：事项行只有管理动作（转打卡/编辑/启停/删除），完成/撤销
   要绕道今日横幅或回顾提醒；✓ 图标表示启停而非完成，与事项完成混淆。
   契约：行内"完成本次/撤销本次"复用 setOccasionCompleted 单一通道（与今日横幅/
   回顾/补标同源，撤销同通道回滚），当前可处理发生日=下次发生日；"本次已完成"
   回显；启停图标改 pause/play 与完成语义分离（aria 文案本就明确）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-complete-"));
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
const makeFixture = (presets = []) => {
    const completions = [];
    const completeButtons = presets.map(([id, date, target]) => {
        const button = {dataset: {occasionComplete: id, occasionCompleteDate: date, occasionCompleteTarget: target}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }};
        return button;
    });
    const root = {
        querySelector: () => null,
        querySelectorAll: (selector) => selector === "[data-occasion-complete]" ? completeButtons : [],
    };
    const host = {
        occasionStore: {version: 1, occasions: []},
        occasionSearchQuery: "",
        occasionStatusFilter: "all",
        occasionKindFilter: "all",
        occasionTimeFilter: "all",
        occasionTemplatesOpen: false,
        occasionTemplateCategory: "recommended",
        render() {},
        enqueueMutation: (operation) => Promise.resolve(operation()),
        setOccasionCompleted: async (id, date, target) => { host.completions.push({id, date, target}); return true; },
        completions,
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion", "persistOccasions", "saveOccasionForm"]) host[name] = () => Promise.resolve();
    bindOccasions.bindOccasionsHandlers(root, host);
    return {host, completions, completeButtons};
};

(async () => {
    /* —— 夹具 1：完成本次 → setOccasionCompleted(id, next, true)。 —— */
    const marking = makeFixture([["occ-1", "2026-09-22", "true"]]);
    marking.completeButtons[0].fire();
    assert.deepEqual(marking.completions, [{id: "occ-1", date: "2026-09-22", target: true}], "marking calls the shared completion channel with the occurrence date");

    /* —— 夹具 2：撤销本次 → 同通道回滚（target=false）。 —— */
    const undoing = makeFixture([["occ-1", "2026-09-22", "false"]]);
    undoing.completeButtons[0].fire();
    assert.deepEqual(undoing.completions, [{id: "occ-1", date: "2026-09-22", target: false}], "undoing rolls back through the same channel");

    /* —— 夹具 3：渲染结构钉——完成切换、本次已完成回显、启停图标消歧。 —— */
    const renderSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
    assert.match(renderSource, /data-occasion-complete="\$\{escapeHtml\(item\.id\)\}"/, "the row exposes the completion toggle");
    assert.match(renderSource, /data-occasion-complete-date="\$\{escapeHtml\(next\)\}"/, "the toggle targets the current actionable occurrence");
    assert.match(renderSource, /data-occasion-complete-target="\$\{doneThisTime \? "false" : "true"\}"/, "the toggle carries the desired state");
    assert.match(renderSource, /occ\.doneThisTime/, "completed occurrences surface a this-time badge");
    assert.match(renderSource, /occ\.markDone/, "the mark copy is i18n-driven");
    assert.match(renderSource, /occ\.undoDone/, "the undo copy is i18n-driven");
    assert.match(renderSource, /uiIcon\(item\.enabled \? "pause" : "play"\)/, "the toggle action uses pause/play icons, not check (T-1711 disambiguation)");
    const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
    assert.match(bindSource, /\[data-occasion-complete\]/, "the binder wires the completion toggle");
    assert.match(bindSource, /host\.setOccasionCompleted\(id, occurrenceDate, target\)/, "the binder routes through the shared channel");
    const iconsSource = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "icons.ts"), "utf8");
    assert.match(iconsSource, /pause: /, "the pause icon exists");
    assert.match(iconsSource, /play: /, "the play icon exists");

    /* —— 夹具 4：i18n 双语键在位。 —— */
    const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
    for (const key of ["occ.markDone", "occ.undoDone", "occ.doneThisTime"]) {
        assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
    }

    /* —— 夹具 5：红证对照——修复前（0f1fe5c）无行内完成入口、启停用 check 图标。 —— */
    const preFixRender = cp.execSync("git show 0f1fe5c:src/render/occasions.ts", {encoding: "utf8"});
    assert.doesNotMatch(preFixRender, /data-occasion-complete=/, "the pre-fix row had no completion entry (red evidence)");
    assert.match(preFixRender, /uiIcon\(item\.enabled \? "check" : "circle"\)/, "the pre-fix toggle used the ambiguous check icon (red evidence)");

    console.log("occasion-complete: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
