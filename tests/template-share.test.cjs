/* T-1519 个人模板脱敏分享守门：
   白名单脱敏（备注/内部 id/时间戳/未知敏感字段不出包）、确定性导出、
   版本声明、空选择/超量拦截、原模板零修改、编辑器接线与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-template-share-"));
const load = (relative) => {
    const target = path.join(dir, path.basename(relative).replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const share = load("features/template-share.ts");

const template = (overrides = {}) => ({
    id: "tpl-1",
    name: "晨间阅读",
    icon: "📖",
    kind: "duration",
    target: 20,
    unit: "分钟",
    recordStep: 5,
    schedule: {type: "daily"},
    group: "学习",
    priority: "medium",
    note: "私人备注：安静阅读",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
});

/* —— 1. 敏感字段夹具：备注/id/时间戳/未知绑定字段绝不出包；用户文本明确在预览中。 —— */
{
    const dirty = template({
        journal: {templateId: "my-private-survey"},
        noteAnchor: {blockId: "20260101120000-secretblock"},
        apiKey: "wrk-should-never-leak",
        attachment: "data:image/png;base64,AAAA",
        extraUnknown: {deep: "mystery"},
    });
    const result = share.buildTemplateSharePackage([dirty]);
    assert.ok(result.package, "valid selection produces a package");
    const serialized = result.serialized || "";
    for (const secret of ["my-private-survey", "secretblock", "wrk-should-never-leak", "AAAA", "mystery", "私人备注", "tpl-1", "createdAt", "updatedAt", '"note"']) {
        assert.ok(!serialized.includes(secret), `sensitive field never exported: ${secret}`);
    }
    assert.match(serialized, /"name": "晨间阅读"/, "user-visible text is previewed explicitly");
    assert.match(serialized, /"group": "学习"/);
    assert.equal(result.package.templates[0].schedule.type, "daily");
    /* 原模板对象零修改。 */
    assert.equal(dirty.note, "私人备注：安静阅读");
    assert.equal(dirty.createdAt, "2026-01-01T00:00:00.000Z");
}

/* —— 2. 确定性 + 版本声明。 —— */
{
    const list = [template(), template({id: "tpl-2", name: "喝水", kind: "count", unit: "次", target: 8, schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}}})];
    const first = share.buildTemplateSharePackage(list).serialized;
    const second = share.buildTemplateSharePackage(list).serialized;
    assert.equal(first, second, "same input yields identical bytes");
    const pkg = JSON.parse(first);
    assert.equal(pkg.app, "siyuan-checkin");
    assert.equal(pkg.shareVersion, share.TEMPLATE_SHARE_VERSION);
    assert.equal(pkg.templates.length, 2);
    assert.deepEqual(pkg.templates[1].schedule.quota, {period: "week", amount: 3, countMode: "dates"}, "schedule config survives sanitization");
}

/* —— 3. 空选择/超量拦截。 —— */
{
    assert.equal(share.buildTemplateSharePackage([]).errorKey, "editor.shareErrorEmpty");
    const overflow = Array.from({length: share.TEMPLATE_SHARE_MAX + 1}, (_, index) => template({id: `t${index}`, name: `t${index}`}));
    assert.equal(share.buildTemplateSharePackage(overflow).errorKey, "editor.shareErrorLimit");
    assert.equal(share.buildTemplateSharePackage(overflow).package, undefined);
}

/* —— 4. 编辑器接线与双语。 —— */
const editorSource = fs.readFileSync(path.join(root, "src", "render", "editor.ts"), "utf8");
assert.match(editorSource, /data-template-share-details/, "editor hosts the share disclosure");
assert.match(editorSource, /data-share-template=/, "share picker checkboxes render");
assert.match(editorSource, /data-share-preview/, "share preview renders before export");
const bindSource = fs.readFileSync(path.join(root, "src", "render", "bind-editor.ts"), "utf8");
assert.match(bindSource, /buildTemplateSharePackage\(selected\)/, "preview/export consume the pure sanitizer");
assert.match(bindSource, /host\.downloadTemplateShare\?\./, "export goes through the host save channel");
assert.match(bindSource, /shareSelection.delete\(id\)/, "deselection updates the preview");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /downloadTemplateShare\(content: string\): void/, "host implements the save channel");
assert.match(indexSource, /siyuan-checkin-template-share-/, "export file name is declared");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["editor.shareDetails", "editor.shareHint", "editor.sharePreviewAria", "editor.shareExport", "editor.shareExported", "editor.shareErrorEmpty", "editor.shareErrorLimit"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("template share gates passed: whitelist sanitization (note/ids/timestamps/unknown fields never exported), deterministic bytes, version declaration, empty/limit interception, original templates untouched, wiring and bilingual copy.");
