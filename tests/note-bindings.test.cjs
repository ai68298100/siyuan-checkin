/* T-1470 笔记联动总览守门：绑定行归集（7 处联动全覆盖/顺序稳定/锚点行按项目展开）、
   目标分组与体检归并（SQL IN 文档 + lsNotebooks 笔记本）、
   设置页面板接线、宿主体检与打开动作、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-bindings-"));
fs.writeFileSync(path.join(dir, "note-bindings.js"), ts.transpileModule(read("src/features/note-bindings.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const nb = require(path.join(dir, "note-bindings.js"));

const input = {
    diaryReport: {enabled: true, docId: "20260101000000-diary1"},
    summaryResident: {enabled: false, docId: "20260101000000-sumry1"},
    healthInbox: {enabled: true, docId: ""},
    journalIntegration: {mode: "daily", notebookId: "20260101000000-nbook1", docId: ""},
    journalEnabled: true,
    yeguifIntegration: {enabled: true, itemId: "20260101000000-yfit1", notebookId: "20260101000000-nbook1"},
    anchoredItems: [
        {id: "item-b", name: "冥想", blockId: "20260101000000-anchb"},
        {id: "item-a", name: "阅读", blockId: "20260101000000-ancha"},
        {id: "item-x", name: "无锚点", blockId: ""},
    ],
};

/* —— 1. 归集：内置 5 行固定顺序 + 锚点行按项目名展开（无锚点项目不出现）。 —— */
const rows = nb.collectNoteBindings(input);
assert.deepEqual(rows.map((row) => row.key), ["diary-report", "summary-resident", "health-inbox", "journal-target", "yeguif-lifelog", "anchor:item-b", "anchor:item-a"], "builtin rows keep stable order, anchored items expand per item");
assert.equal(rows[0].targetKind, "doc");
assert.equal(rows[3].targetKind, "notebook", "journal daily mode targets a notebook");
assert.equal(rows[5].featureParams.name, "冥想", "anchor rows carry the item name for localization");
assert.ok(rows.every((row) => row.featureKey.startsWith("bind.feature.")), "every row uses an i18n feature key");

/* —— 2. 目标分组与体检归并。 —— */
const {docIds, notebookIds} = nb.groupBindingTargets(rows);
assert.deepEqual(docIds.sort(), ["20260101000000-ancha", "20260101000000-anchb", "20260101000000-diary1", "20260101000000-sumry1"], "doc/block targets group for the batched SQL check");
assert.deepEqual(notebookIds, ["20260101000000-nbook1"], "notebook targets group for membership check");
const found = new Set(["20260101000000-diary1", "20260101000000-anchb"]);
const validNotebooks = new Set(["20260101000000-nbook1"]);
const health = nb.mergeBindingHealth(rows, found, validNotebooks);
assert.equal(health["diary-report"], "ok");
assert.equal(health["summary-resident"], "unchecked", "disabled optional binding without target is unchecked, not missing");
assert.equal(health["health-inbox"], "missing", "enabled binding with empty required target is missing");
assert.equal(health["journal-target"], "ok");
assert.equal(health["yeguif-lifelog"], "ok");
assert.equal(health["anchor:item-a"], "missing", "stale anchor block is reported missing");
assert.equal(health["anchor:item-b"], "ok");

/* —— 3. 接线：设置面板/体检动作/打开与定位/上下文注入。 —— */
const indexSource = read("src/index.ts");
assert.match(indexSource, /collectNoteBindings\({/, "index feeds the pure collector with live preferences");
assert.match(indexSource, /data-action='check-note-bindings'/, "settings check button is wired");
assert.match(indexSource, /groupBindingTargets\(rows\)/, "check uses the grouped batch strategy");
assert.match(indexSource, /mergeBindingHealth\(rows, found, validNotebooks\)/, "check merges health via the pure function");
assert.match(indexSource, /data-open-binding/, "open action wired per binding row");
assert.match(indexSource, /data-goto-binding/, "locate action wired per binding row");
assert.match(indexSource, /openBindingTarget\(targetId: string\)/, "host resolves and opens the binding target");
assert.match(indexSource, /custom-dailynote-/, "journal daily target has the dailynote-attribute fallback (anti-stale)");

const settingsSource = read("src/render/settings.ts");
assert.match(settingsSource, /data-source-panel="bindings"/, "settings expose the bindings overview panel");
assert.match(settingsSource, /data-binding-row=/, "binding rows render with stable keys");
assert.match(settingsSource, /data-binding-status/, "status column renders per row");
assert.match(settingsSource, /noteBindings\?/, "settings context carries the rows");

/* —— 4. i18n 双语。 —— */
const i18nSource = read("src/i18n.ts");
const keys = [...new Set(i18nSource.match(/"bind\.[a-zA-Z0-9.]+"/g) || [])];
assert.ok(keys.length >= 20, `bind.* keys present (${keys.length})`);
for (const key of keys) {
    const count = i18nSource.split(key).length - 1;
    assert.equal(count, 2, `${key} must exist in both locales (${count})`);
}

/* —— 5. 样式：状态三色与行网格。 —— */
const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__binding-row \{/, "binding row grid exists");
assert.match(scss, /\.lc-checkin__binding-status\.is-ok/, "ok state styled");
assert.match(scss, /\.lc-checkin__binding-status\.is-missing/, "missing state styled");

console.log("note-bindings guard tests passed.");
