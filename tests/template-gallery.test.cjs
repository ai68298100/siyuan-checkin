/* T-1350 模板显示矩阵门禁：模板目录 ↔ i18n 映射完整性、最近使用与分批显示链路、
   宿主接线与纯函数边界。此后模板新增/修改必须过本门禁。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* ---------- 源码文本断言 ---------- */

const catalog = fs.readFileSync("src/catalog.ts", "utf8");
const editor = fs.readFileSync("src/render/editor.ts", "utf8");
const bindEditor = fs.readFileSync("src/render/bind-editor.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");
const viewPrefs = fs.readFileSync("src/view-preferences.ts", "utf8");

/* 目录映射完整性：60 个内置模板的名称键与分组键不允许回退到中文原文。 */
const templateBlock = catalog.slice(catalog.indexOf("CHECKIN_TEMPLATES"), catalog.indexOf("TEMPLATE_NAME_KEYS"));
const templateNames = [...templateBlock.matchAll(/\{name: "([^"]+)"/g)].map((match) => match[1]);
assert.ok(templateNames.length >= 55 && templateNames.length <= 70, `template catalog stays curated (got ${templateNames.length})`);
const nameKeyBlock = catalog.slice(catalog.indexOf("TEMPLATE_NAME_KEYS"), catalog.indexOf("TEMPLATE_GROUP_KEYS"));
const mappedNames = new Set([...nameKeyBlock.matchAll(/"([^"]+)": "tpl\./g)].map((match) => match[1]));
const unmapped = templateNames.filter((name) => !mappedNames.has(name));
assert.deepEqual(unmapped, [], `every builtin template must map to a tpl.* name key; missing: ${unmapped.join(",")}`);

const groupBlock = catalog.slice(catalog.indexOf("TEMPLATE_GROUP_KEYS"), catalog.indexOf("export function templateName"));
const templateGroups = [...new Set([...templateBlock.matchAll(/group: "([^"]+)"/g)].map((match) => match[1]))];
const mappedGroups = new Set([...groupBlock.matchAll(/"([^"]+)": "tplGroup\./g)].map((match) => match[1]));
const unmappedGroups = templateGroups.filter((group) => !mappedGroups.has(group));
assert.deepEqual(unmappedGroups, [], `every template group must map to a tplGroup.* key; missing: ${unmappedGroups.join(",")}`);

/* 双语字典完备性：映射到的每个键在 zh 与 en 两侧都必须存在。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
const zhKeys = new Set([...zhDict.matchAll(/"((?:tpl|tplNote|tplGroup)\.[A-Za-z]+)":/g)].map((match) => match[1]));
const enKeys = new Set([...enDict.matchAll(/"((?:tpl|tplNote|tplGroup)\.[A-Za-z]+)":/g)].map((match) => match[1]));
const referencedKeys = [...nameKeyBlock.matchAll(/: "(tpl\.[A-Za-z]+)"/g)].map((match) => match[1]);
const missingZh = referencedKeys.filter((key) => !zhKeys.has(key));
const missingEn = referencedKeys.filter((key) => !enKeys.has(key));
assert.deepEqual(missingZh, [], `zh dict missing template name keys: ${missingZh.join(",")}`);
assert.deepEqual(missingEn, [], `en dict missing template name keys: ${missingEn.join(",")}`);
for (const group of templateGroups) {
    const key = catalog.match(new RegExp(`"${group}": "(tplGroup\\.[A-Za-z]+)"`));
    assert.ok(key, `group ${group} must map through TEMPLATE_GROUP_KEYS`);
    assert.ok(zhKeys.has(key[1]), `zh dict missing ${key[1]}`);
    assert.ok(enKeys.has(key[1]), `en dict missing ${key[1]}`);
}
/* 名称键对应的备注键（tplNote.*）同样必须双语存在。 */
for (const key of referencedKeys) {
    const noteKey = `tplNote.${key.slice(4)}`;
    assert.ok(zhKeys.has(noteKey), `zh dict missing ${noteKey}`);
    assert.ok(enKeys.has(noteKey), `en dict missing ${noteKey}`);
}

/* 戒除类模板契约（T-1239）：at-most 只允许 daily 排期，且必须标注方向。 */
const atMostEntries = [...templateBlock.matchAll(/\{name: "([^"]+)"[^}]*direction: "atMost"[^}]*\}/g)];
assert.ok(atMostEntries.length >= 3, "quitting templates should exist");
for (const entry of atMostEntries) {
    assert.match(entry[0], /schedule: daily/, `${entry[1]}: at-most templates are daily-only`);
}

/* 编辑器渲染：最近使用行、分批溢出、显示全部按钮、预览摘要带排期标签。 */
assert.match(editor, /export const TEMPLATE_BATCH_SIZE = \d+/, "batch size must be an explicit exported constant");
assert.match(editor, /data-template-recent-heading/, "recent row heading marker");
assert.match(editor, /data-template-recent/, "recent row container marker");
assert.match(editor, /data-template-overflow/, "overflow chips must be marked for batch reveal");
assert.match(editor, /data-action="template-show-all"/, "show-all expander must exist");
assert.match(editor, /editor\.recentTemplates/, "recent heading must go through i18n");
assert.match(editor, /editor\.recommendedTemplates/, "recommended heading must go through i18n");
assert.match(editor, /data-template-recommended/, "recommended row marker must exist");
assert.match(editor, /RECOMMENDED_TEMPLATES/, "recommended names must come from the catalog constant");
assert.match(catalog, /export const RECOMMENDED_TEMPLATES/, "recommended list must be a versioned catalog constant");
/* 精选名单必须全部能解析为真实模板。 */
const recommendedDeclaration = catalog.match(/export const RECOMMENDED_TEMPLATES[^=]*= \[([^\]]*)\]/);
assert.ok(recommendedDeclaration, "RECOMMENDED_TEMPLATES must be declared as an array literal");
const recommendedNames = [...recommendedDeclaration[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
const missingRecommended = recommendedNames.filter((name) => !templateNames.includes(name));
assert.deepEqual(missingRecommended, [], `recommended names must exist in the catalog: ${missingRecommended.join(",")}`);
assert.match(editor, /editor\.templateShowAll/, "expander label must go through i18n");
assert.match(editor, /editor\.recentTemplates[\s\S]{0,400}data-template-recent/, "recent row renders after its heading");
assert.match(editor, /\$\{template\.target\} \$\{template\.unit\} · \$\{t\(SCHEDULE_LABELS\[template\.schedule\.type\]\)\}/,
    "non-binary template preview must append the schedule label");
assert.match(editor, /ctx\.recentTemplates \|\| \[\][\s\S]{0,200}findIndex\(\(template\) => template\.name === name\)/,
    "recent entries must resolve by stable zh-name anchor, not array index");

/* 绑定层：委托点击、溢出隐藏/展开、筛选态全显、计数走 i18n、最近使用回写。 */
assert.match(bindEditor, /closest<HTMLButtonElement>\("\[data-template-index\]"\)/, "template apply must use delegated clicks so cloned recent chips work");
assert.match(bindEditor, /templateOverflowRevealed/, "session-level reveal flag must exist");
assert.match(bindEditor, /button\.hidden = !matches \|\| \(!templateOverflowRevealed && !filtered && button\.hasAttribute\("data-template-overflow"\)\)/,
    "overflow chips stay hidden until revealed or filtered");
assert.match(bindEditor, /data-action='template-show-all'/, "expander binding must exist");
assert.match(bindEditor, /count\.textContent = t\("editor\.templateCount"/, "filter count must go through i18n (no hardcoded Chinese)");
assert.ok(!bindEditor.includes("个模板"), "hardcoded Chinese count suffix must be gone");
assert.match(bindEditor, /host\.recordRecentTemplateUse\(template\.name\)/, "apply flow must record recent usage");
assert.match(bindEditor, /data-template-recent-heading[\s\S]{0,300}data-template-recent/, "refresh path can lazily create the recent row");
assert.match(bindEditor, /RECENT_TEMPLATES_LIMIT/, "recent row must be capped by the shared limit constant");

/* 宿主接线：偏好字段、应用/持久化、渲染上下文、宿主方法。 */
assert.match(indexSource, /private recentTemplates: string\[\] = \[\];/, "plugin keeps recent template state");
assert.match(indexSource, /this\.recentTemplates = \[\.\.\.preferences\.recentTemplates\];/, "applyViewPreferences must restore recents");
assert.match(indexSource, /recentTemplates: \[\.\.\.this\.recentTemplates\],/, "persistViewPreferences must save recents");
assert.match(indexSource, /recentTemplates: this\.recentTemplates,/, "editor render context must receive recents");
assert.match(indexSource, /recordRecentTemplateUse\(name: string\): void/, "plugin implements the host method");
assert.match(indexSource, /recordRecentTemplate\(this\.recentTemplates, name\)/, "plugin delegates to the pure helper");
assert.match(viewPrefs, /export const RECENT_TEMPLATES_LIMIT = 6/, "recent limit constant lives with preferences");
assert.match(viewPrefs, /recentTemplates/, "preferences carry the recent templates field");

/* ---------- 运行时断言（转译后真实模块） ---------- */

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-template-gallery-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/record-step.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/catalog.ts", "src/features/templates.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {recordRecentTemplate} = require(path.join(outputRoot, "src/features/templates.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeViewPreferences, RECENT_TEMPLATES_LIMIT} = require(path.join(outputRoot, "src/view-preferences.js"));

assert.equal(RECENT_TEMPLATES_LIMIT, 6);
assert.deepEqual(recordRecentTemplate([], "喝水"), ["喝水"]);
assert.deepEqual(recordRecentTemplate(["喝水", "阅读"], "阅读"), ["阅读", "喝水"], "re-used template moves to front");
assert.deepEqual(recordRecentTemplate(["a", "b", "c", "d", "e", "f"], "g"), ["g", "a", "b", "c", "d", "e"], "recents cap at the limit");
assert.deepEqual(recordRecentTemplate(["  喝水  ", ""], "喝水"), ["喝水"], "trim and drop empties");
assert.deepEqual(recordRecentTemplate(["a"], "  "), ["a"], "blank usage is a no-op");

assert.deepEqual(normalizeViewPreferences({}).recentTemplates, [], "recents default to empty");
assert.deepEqual(normalizeViewPreferences({recentTemplates: "喝水"}).recentTemplates, [], "non-array falls back to empty");
assert.deepEqual(
    normalizeViewPreferences({recentTemplates: ["喝水", "  阅读 ", "喝水", 42, ""]}).recentTemplates,
    ["喝水", "阅读"],
    "normalize trims, dedupes and drops invalid entries",
);
assert.equal(normalizeViewPreferences({recentTemplates: ["1", "2", "3", "4", "5", "6", "7", "8"]}).recentTemplates.length, RECENT_TEMPLATES_LIMIT,
    "normalize caps recents at the shared limit");

fs.rmSync(outputRoot, {recursive: true, force: true});
const batchSize = Number(editor.match(/export const TEMPLATE_BATCH_SIZE = (\d+)/)[1]);
console.log(`template gallery gates passed: ${templateNames.length} templates, ${templateGroups.length} groups, batch-first ${batchSize} checked`);
