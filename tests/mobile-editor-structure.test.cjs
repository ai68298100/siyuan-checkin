const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
const editorBindings = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
const saveForm = fs.readFileSync(path.join(root, "src", "render", "save-form.ts"), "utf8");
const recordStepSource = fs.readFileSync(path.join(root, "src", "record-step.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "index.scss"), "utf8");
const components = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const contentStyles = fs.readFileSync(path.join(root, "src", "ui", "content-responsive.scss"), "utf8");
assert.ok(!styles.includes("height: 88vh !important"), "mobile dialog shell must not return to legacy index.scss");

// Template management must remain usable without network data and expose a stable keyboard/touch structure.
assert.match(editorSource, /data-template-query[\s\S]*data-template-group[\s\S]*data-template-list/, "editor must expose template search, groups, and list hooks");
assert.match(editorSource, /data-template-empty[\s\S]*t\("editor\.templateEmpty"\)/, "template filtering must have an explicit empty state");
assert.match(i18n, /"editor\.templateEmpty": "没有匹配的模板"/, "template empty copy must stay localized");
assert.match(editorSource, /data-icon-query[\s\S]*data-icon-group[\s\S]*data-icon-results/, "icon picker must expose searchable grouped results");
assert.match(editorSource, /data-advanced[\s\S]*data-advanced-summary/, "advanced editor fields must have a collapsible summary");
assert.match(editorSource, /lc-checkin__editor-actions[\s\S]*data-action="archive"/, "editor actions must stay in a dedicated action bar");
assert.match(editorSource, /name="recordStep"/, "non-binary items need a configurable quick-record amount");
assert.match(editorSource, /editor\.recordStepHint/, "the quick-record amount needs an explicit explanation");
assert.match(editorBindings, /getRecordStep\(kind, unit, configuredRecordStep\)/, "the live preview must use the configured amount");
assert.match(editorBindings, /recordStepField\.hidden = kind === "binary"/, "binary items must not show an irrelevant amount control");
assert.match(saveForm, /normalizeRecordStep\(kind, data\.get\("recordStep"\)\)[\s\S]*?CheckinItemRevision[\s\S]*?\{recordStep\}/, "the configured amount must be persisted with the effective revision");
assert.match(recordStepSource, /Math\.min\(1_000_000_000/, "imported quick-record amounts need the same hard ceiling as editor saves");
assert.match(editorSource, /getRecordStepInputStep\(selectedKind, selectedUnit\)/, "quick-record input must use its own decimal-friendly granularity");

// The editor has a form scroll region and a fixed action bar that can be checked at all mobile widths.
assert.match(components, /Editor foundations[\s\S]*\.lc-checkin__form-scroll\s*\{[^}]*overflow-y:\s*auto;/, "editor fields must scroll independently");
assert.match(components, /Editor foundations[\s\S]*\.lc-checkin__editor-actions\s*\{[^}]*flex:\s*0\s+0\s+auto;/, "editor actions must remain visible while fields scroll");
assert.match(components, /@media \(max-width:\s*600px\)[\s\S]*\.lc-checkin-dialog\s*\{[\s\S]*height:\s*88vh/, "mobile dialog needs a bounded viewport layout");
assert.match(components, /@supports \(height:\s*100dvh\)[\s\S]*\.b3-dialog__container:has\(\.lc-checkin-dialog-host--mobile\)/, "mobile dialog must follow dynamic viewport height");
assert.match(components, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__template\s*\{[^}]*min-height:\s*64px/, "template cards must remain touch-friendly");
assert.match(components, /@media \(hover:\s*none\), \(pointer:\s*coarse\)[\s\S]*\.lc-checkin--editor \.lc-checkin__icon-option\s*\{[^}]*min-height:\s*42px/, "icon buttons must remain touch-friendly");

// The final mobile spacing layer may trim the short-form cushion, but it must
// preserve the independent scroller's safe-area reservation and keep the
// preview/advanced rail aligned. These source-level guards prevent a later
// density pass from moving the rules to a desktop-only query or restoring
// uneven panel margins.
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__layout\s*\{[^}]*padding-bottom:\s*calc\(64px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile editor layout must reserve exactly one action-rail height");
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__form-scroll\s*\{[\s\S]*scroll-padding-bottom:\s*calc\(70px \+ env\(safe-area-inset-bottom\)\)/,
    "mobile editor scroller must retain safe-area clearance for the fixed action rail");
assert.match(components, /Mobile editor final spacing pass[\s\S]*\.lc-checkin--editor \.lc-checkin__editor-side\s*\{[\s\S]*align-content:\s*start;[\s\S]*min-width:\s*0;/,
    "mobile editor preview and advanced panels must share a stable aligned rail");
assert.match(contentStyles, /:is\(\.lc-checkin-host--mobile, \.lc-checkin-dialog-host--mobile\) \.lc-checkin\.lc-checkin--editor > \.lc-checkin__layout\s*\{[^}]*flex:\s*0 0 auto;/,
    "mobile editor content must retain natural height and real trailing scroll space above the save rail");
assert.match(contentStyles, /\.lc-checkin__field\s*\{[^}]*align-content:\s*start;/,
    "editor field rows must not stretch labels apart when neighboring unit suggestions wrap");

for (const width of [320, 360, 390, 430]) {
    assert.ok(width >= 320 && width <= 430, `mobile regression width ${width} must be in the supported range`);
}

// Exercise the shared preview description and initial renderer with real locale
// strings. Browser coverage verifies that changing the controls refreshes it.
const ts = require("typescript");
const moduleCache = new Map();
function loadTs(filename) {
    if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
    const loaded = {exports: {}};
    moduleCache.set(filename, loaded);
    const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const localRequire = name => name.startsWith(".")
        ? loadTs(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name);
    new Function("require", "module", "exports", compiled)(localRequire, loaded, loaded.exports);
    return loaded.exports;
}
const {describeEditorPreviewActions, describeEditorPreviewMeta, renderEditorView} = loadTs(path.join(root, "src", "render", "editor.ts"));
const {createDefaultStore, dateKey} = loadTs(path.join(root, "src", "model.ts"));
const {setPluginLanguage} = loadTs(path.join(root, "src", "i18n.ts"));
const basePreview = {kind: "quantity", unit: "毫升", recordStep: 250, scheduleType: "daily", completionSource: "manual"};
const previewCases = [
    {input: {}, label: "+250 毫升 · 填写", detail: ""},
    {input: {kind: "duration", unit: "分钟", recordStep: 25}, label: "开始专注 · 记录", detail: ""},
    {input: {completionSource: "tomato"}, label: "开始专注 · 记录", detail: ""},
    {input: {kind: "duration", unit: "分钟", recordStep: 25, directionAtMost: true}, label: "+25 分钟 · 填写", detail: ""},
    {input: {completionSource: "tomato", directionAtMost: true}, label: "+250 毫升 · 填写", detail: ""},
    {input: {kind: "binary", unit: "次", recordStep: 1}, label: "打卡 · 备注", detail: ""},
    {input: {kind: "binary", unit: "次", recordStep: 1, completionSource: "tomato"}, label: "打卡 · 备注", detail: ""},
    {input: {kind: "binary", unit: "次", recordStep: 1, directionAtMost: true}, label: "记破戒 · 备注", detail: ""},
    {input: {recordStep: 12345}, label: "记录 · 填写", detail: "按 +12345 毫升 记录"},
    {input: {unit: "个完整学习单元"}, label: "记录 · 填写", detail: "按 +250 个完整学习单元 记录"},
    {input: {scheduleType: "quota", quotaCountMode: "dates"}, label: "+250 毫升 · 填写", detail: "按 +250 毫升 记录"},
    {input: {scheduleType: "quota", quotaCountMode: "value"}, label: "+250 毫升 · 填写", detail: ""},
    {input: {kind: "binary", unit: "次", recordStep: 1, scheduleType: "quota", quotaCountMode: "dates"}, label: "+1 次 · 填写", detail: "按 +1 次 记录"},
    {input: {kind: "duration", scheduleType: "weekly", directionAtMost: true}, label: "开始专注 · 记录", detail: ""},
];
for (const {input, label, detail} of previewCases) {
    const data = {...basePreview, ...input};
    assert.deepEqual(describeEditorPreviewActions(data), {label, detail});
    const store = createDefaultStore();
    const now = new Date();
    store.items.push({
        id: "preview-item", name: "预览测试", icon: "✓", kind: data.kind, target: 1000,
        unit: data.unit, recordStep: data.recordStep, completionSource: data.completionSource,
        direction: data.directionAtMost ? "atMost" : undefined,
        schedule: {type: data.scheduleType, quota: {period: "week", amount: 3, countMode: data.quotaCountMode}},
        createdAt: now.toISOString(), updatedAt: now.toISOString(), createdDate: dateKey(now), revisions: [], archivePeriods: [],
    });
    const html = renderEditorView({store, editingId: "preview-item", userTemplates: [], customIconLibrary: [], appearance: "light", todayGroupMode: "none", saveState: "idle", syncNoticeActive: false});
    const preview = html.match(/<article[^>]*data-editor-preview>[\s\S]*?<\/article>/)?.[0];
    assert.ok(preview, "initial HTML must contain the preview");
    assert.ok(preview.includes(`data-preview-action>${label}</span>`), `initial preview must match: ${label}`);
    assert.ok(preview.includes(`>${detail}</small>`), "the initial preview must retain the full configured increment");
    const meta = preview.match(/data-preview-meta>([^<]*)<\/small>/)?.[1] || "";
    if (data.scheduleType === "quota") {
        assert.ok(meta.includes(`0 / 3 ${data.quotaCountMode === "dates" ? "天" : data.unit}`), "quota preview must show the period goal and correct progress unit");
        assert.doesNotMatch(preview, /data-preview-progress hidden/, "binary quotas also need a progress preview");
    } else if (data.kind !== "binary" && data.directionAtMost && data.scheduleType === "daily") {
        assert.ok(meta.includes(`0 · 上限 1000 ${data.unit}`), "avoidance preview must describe an upper limit rather than a completion goal");
    }
    assert.doesNotMatch(preview, /<button\b|data-action=|tabindex=/, "preview actions must not look interactive to assistive technology");
}
assert.match(describeEditorPreviewMeta({...basePreview, target: 2000, scheduleType: "quota", scheduleLabel: "每周", quotaAmount: 3, quotaCountMode: "dates"}), /0 \/ 3 天/);
assert.match(describeEditorPreviewMeta({...basePreview, target: 2000, scheduleType: "quota", scheduleLabel: "每月", quotaAmount: 600, quotaCountMode: "value"}), /0 \/ 600 毫升/);
assert.match(describeEditorPreviewMeta({...basePreview, target: 2000, scheduleLabel: "每天", directionAtMost: true}), /0 · 上限 2000 毫升/);
assert.doesNotMatch(describeEditorPreviewMeta({...basePreview, target: 2000, scheduleType: "weekly", scheduleLabel: "每周", directionAtMost: true}), /上限/);
setPluginLanguage("en-US");
assert.deepEqual(describeEditorPreviewActions({...basePreview, kind: "duration"}), {label: "Start focus timer · Log", detail: ""});
assert.deepEqual(describeEditorPreviewActions({...basePreview, unit: "ml"}), {label: "+250 ml · Enter", detail: ""});
setPluginLanguage("zh-CN");

const customTemplateIcon = "data:image/png;base64,aGVsbG8=";
const customTemplateView = renderEditorView({
    store: createDefaultStore(), customIconLibrary: [], appearance: "light", todayGroupMode: "none", saveState: "idle", syncNoticeActive: false,
    userTemplates: [{id: "image-template", name: "图标模板", icon: customTemplateIcon, group: "自定义", note: "", kind: "quantity", target: 500, unit: "ml", schedule: {type: "daily"}}],
});
const templateButton = customTemplateView.match(/<button[^>]*data-user-template-id="image-template"[\s\S]*?<\/button>/)?.[0];
assert.ok(templateButton, "custom templates must render");
assert.ok(templateButton.includes(`<span><img src="${customTemplateIcon}" alt="" loading="lazy" referrerpolicy="no-referrer" /></span>`), "custom image templates must show an image, not the raw data URI as text");

// Exercise the live icon-selection function, not only initial HTML. DOM
// replaceChildren(string) inserts text, which used to expose literal <img...>.
const editorBindingAst = ts.createSourceFile("bind-editor.ts", editorBindings, ts.ScriptTarget.Latest, true);
let selectIconDeclaration;
function findSelectIcon(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(editorBindingAst) === "selectIcon") selectIconDeclaration = node.getText(editorBindingAst);
    ts.forEachChild(node, findSelectIcon);
}
findSelectIcon(editorBindingAst);
assert.ok(selectIconDeclaration, "the live icon selection handler must exist");
const compiledSelectIcon = ts.transpileModule(`const ${selectIconDeclaration};`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
}).outputText;
const {renderIconMarkup} = loadTs(path.join(root, "src", "shared.ts"));
const currentIcon = {innerHTML: "", replaceChildren(value) { this.textContent = value; }};
const iconInput = {value: ""};
const iconRoot = {querySelectorAll: () => [], querySelector: selector => selector === "input[name='icon']" ? iconInput : currentIcon};
const selectIcon = new Function("root", "renderIconMarkup", "renderIconSizeStrip", `${compiledSelectIcon}; return selectIcon;`)(iconRoot, renderIconMarkup, () => {});
selectIcon(customTemplateIcon);
assert.equal(currentIcon.innerHTML, renderIconMarkup(customTemplateIcon), "the live picker must insert the safe image markup as DOM");
assert.equal(iconInput.value, customTemplateIcon);
selectIcon('<svg onload="alert(1)">');
assert.equal(currentIcon.innerHTML, "&lt;svg onload=&quot;alert(1)&quot;&gt;", "text icons must retain the shared escape boundary");

console.log("Mobile editor structure checks passed for 320/360/390/430px.");
