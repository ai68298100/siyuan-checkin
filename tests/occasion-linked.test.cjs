/* T-1720 守门：转打卡关联状态与后续管理（D-363）。
   风险路径（闭环缺口）：关联写在打卡项目 linkedOccasionId，事项行不显示关联项目，
   归档/删除后状态不可见。
   契约：宿主传 linkedItems 投影进事项视图，行内显示关联项目徽章（名称，归档态
   附"已归档"）；徽章点击跨页打开该项目编辑器（归档项目不可进，先启用再编辑）；
   项目删除后徽章自然消失（无墓碑，诊断归 T-1721）；重建走既有转打卡按钮（重复
   拦截已排除归档项，可重建）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-linked-"));
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
transpileTo("render/occasions.ts");
transpileTo("render/bind-occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const renderOccasions = require(path.join(dir, "render", "occasions.js"));
const bindOccasions = require(path.join(dir, "render", "bind-occasions.js"));

globalThis.window = {confirm: () => true};
const today = new Date(2026, 9, 1, 12);
const occasion = (id, name, over = {}) => ({
    id, name, kind: "scheduled", date: "2026-09-10", recurrence: "weekly", weekday: 4,
    enabled: true, completedDates: [], ...over,
});
const linkedItem = (id, name, linkedOccasionId, archived) => ({id, name, linkedOccasionId, archived: archived === true});
const makeCtx = (occasionsList, linkedItems) => ({
    occasionStore: {version: 1, occasions: occasionsList},
    linkedItems: linkedItems || [],
    occasionSearchQuery: "",
    occasionStatusFilter: "all",
    occasionKindFilter: "all",
    occasionTimeFilter: "all",
    occasionSortMode: "next",
    occasionTemplatesOpen: false,
    occasionTemplateCategory: "recommended",
    occasionPreviewOpen: false,
    editingOccasionId: undefined,
    appearance: "light",
    reducedMotion: false,
    supportsCustomTab: false,
    bestStreakValue: 0,
    currentStreaks: new Map(),
    reminderUserActions: [],
    weekStripVisible: false,
    bulkMode: false,
    reminderQuiet: false,
    firstSuccessSkipped: true,
    quickEntryNlp: false,
    pendingOnly: false,
    saveState: "idle",
    isMobileFrontend: false,
    todaySortMode: "manual",
    completedCollapsed: false,
    priorityReminderExpanded: false,
    focusAvailable: false,
    todayQuery: "",
    quickEntryCancelled: new Set(),
    reviewFoldSections: new Set(),
    recordDetailsExpanded: new Set(),
});
const renderAt = (ctx) => renderOccasions.renderOccasionsView(ctx);

/* —— 夹具 1：有关联项目的行显示徽章（名称）；归档附"已归档"。 —— */
const occasionsList = [occasion("occ-1", "每周复诊"), occasion("occ-2", "独立事项")];
const linked = [linkedItem("item-1", "复诊打卡", "occ-1"), linkedItem("item-9", "旧项目", "occ-gone", true)];
const markup = renderAt(makeCtx(occasionsList, linked));
assert.match(markup, /data-occasion-linked-edit="item-1"/, "the linked check-in renders as an entry point");
assert.match(markup, /复诊打卡/, "the linked name is visible");
assert.ok(!/旧项目/.test(markup), "links to nonexistent occasions never render (diagnostics belong to T-1721)");

/* —— 夹具 2：归档关联项目附"已归档"诊断，且不可点击进入编辑。 —— */
const archivedOcc = [occasion("occ-3", "已归档关联的事项")];
const archivedLinked = [linkedItem("item-3", "旧打卡", "occ-3", true)];
const archivedMarkup = renderAt(makeCtx(archivedOcc, archivedLinked));
assert.match(archivedMarkup, /已归档/, "an archived link surfaces the archived diagnosis");
const archivedClick = renderAt(makeCtx(archivedOcc, archivedLinked));
void archivedClick;

/* —— 夹具 3：bind 接线行为——未归档可进编辑器，归档不进。 —— */
const editorOpens = [];
const linkedButtons = [];
    const bindRoot = {querySelector: () => null, querySelectorAll: (selector) => {
    if (selector === "[data-occasion-linked-edit]") {
        if (!linkedButtons.length) {
            linkedButtons.push(
                {dataset: {occasionLinkedEdit: "item-1"}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }},
                {dataset: {occasionLinkedEdit: "item-3"}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.()}},
            );
        }
        return linkedButtons;
    }
    return [];
}};
const bindHost = {
    occasionStore: {version: 1, occasions: []},
    linkedItems: [linkedItem("item-1", "复诊打卡", "occ-1"), linkedItem("item-3", "旧打卡", "occ-3", true)],
    enqueueMutation: (operation) => Promise.resolve(operation()),
};
for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "updateOccasion", "deleteOccasion", "setOccasionCompleted", "persistOccasions", "saveOccasionForm"]) bindHost[name] = () => Promise.resolve();
bindOccasions.bindOccasionsHandlers(bindRoot, bindHost);
bindHost.showEditorForLinkedItem = (itemId, root) => { editorOpens.push({itemId, root}); };
[...bindRoot.querySelectorAll("[data-occasion-linked-edit]")].forEach((button) => button.fire());
assert.equal(editorOpens.length, 1, "only the live linked check-in opens the editor");
assert.equal(editorOpens[0].itemId, "item-1", "the live linked check-in opens its item");
assert.equal(editorOpens[0].root, bindRoot, "linked editor entry keeps the originating root");

/* —— 夹具 4：结构钉 + 红证对照（钉修复前提交 165aeba）。 —— */
const viewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.match(viewSource, /data-occasion-linked-edit/, "the row renders the linked badge");
assert.match(viewSource, /occ\.linkedArchived/, "archived links surface the diagnosis");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(indexSource, /linkedItems: this\.store\.items/, "the host passes the linked projection");
assert.match(indexSource, /private showEditorForLinkedItem/, "the host implements the cross-page editor entry");
const bindSrc = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-occasions.ts"), "utf8");
assert.match(bindSrc, /host\.showEditorForLinkedItem/, "the binder routes through the host entry");
const preFixView = cp.execSync("git show 165aeba:src/render/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixView, /data-occasion-linked-edit/, "the pre-fix row had no linked badge (red evidence)");

/* —— 夹具 5：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["occ.linkedItem", "occ.linkedArchived"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("occasion-linked: all assertions passed");
