/* T-1359 项目草案确认流守门：草案校验与模板派生（运行时）、provider 草案通道、
   回顾草案卡与编辑器预填接线。模型不直接写 store——保存只走普通编辑器 saveForm。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-project-draft-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/types.ts", "src/i18n.ts", "src/features/schedule-validate.ts", "src/features/project-draft.ts", "src/agent-suggestions.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeProjectDraft, draftFromTemplate, summarizeProjectDraft} = require(path.join(outputRoot, "src/features/project-draft.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {normalizeSummaryProviderResult} = require(path.join(outputRoot, "src/agent-suggestions.js"));

const items = [{id: "i1", name: "阅读", archived: false}];
const validDraft = {name: "喝水·睡前", icon: "💧", kind: "quantity", target: 300, unit: "毫升", schedule: {type: "daily"}, group: "健康", priority: "medium", timeSlot: "evening", note: "睡前一杯"};

const draft = normalizeProjectDraft(validDraft);
assert.ok(draft, "valid draft must normalize");
assert.equal(draft.timeSlot, "evening");
assert.equal(normalizeProjectDraft({...validDraft, name: ""}), undefined, "empty name rejected");
assert.equal(normalizeProjectDraft({...validDraft, name: "字".repeat(41)}), undefined, "name over 40 chars rejected");
assert.equal(normalizeProjectDraft({...validDraft, kind: "magical"}), undefined, "unknown kind rejected");
assert.equal(normalizeProjectDraft({...validDraft, target: 0}), undefined, "non-positive target rejected");
assert.equal(normalizeProjectDraft({...validDraft, unit: ""}), undefined, "empty unit rejected");
assert.equal(normalizeProjectDraft({...validDraft, schedule: {type: "quota"}}), undefined, "invalid schedule rejected");

/* 模板派生：模板默认值 + 安全字段覆写。 */
const template = {name: "喝水", icon: "💧", kind: "quantity", target: 2000, unit: "毫升", schedule: {type: "daily"}, group: "健康", priority: "high", timeSlot: "any", note: "把全天饮水分散到各个时段。"};
const variant = draftFromTemplate(template, {name: "喝水·睡前", target: 300, note: "睡前一杯"});
assert.equal(variant.name, "喝水·睡前");
assert.equal(variant.target, 300);
assert.equal(variant.icon, "💧", "unoverridden fields keep template defaults");
assert.equal(variant.group, "健康");
const invalidVariant = draftFromTemplate(template, {name: ""});
assert.ok(invalidVariant.name && invalidVariant.name.length <= 40, "template fallback keeps the draft usable");

/* 草案摘要。 */
assert.match(summarizeProjectDraft(variant), /喝水·睡前/);
assert.match(summarizeProjectDraft(variant), /quantity/);

/* provider 通道：drafts 归一化（非法丢弃、上限 2），text-only 结果草案为空。 */
const providerResult = normalizeSummaryProviderResult({text: "总结", suggestions: [], drafts: [validDraft, {name: "坏草案", kind: "nope"}, validDraft]}, items);
assert.ok(providerResult);
assert.equal(providerResult.drafts.length, 2, "invalid drafts dropped and list capped at 2");
const textOnly = normalizeSummaryProviderResult("纯文本总结", items);
assert.deepEqual(textOnly.drafts, []);

/* ---------- 结构守门 ---------- */

const reviewView = fs.readFileSync("src/render/review.ts", "utf8");
const bindNav = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const bindEditor = fs.readFileSync("src/render/bind-editor.ts", "utf8");
const indexSource = fs.readFileSync("src/index.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");
const agentSource = fs.readFileSync("src/agent-suggestions.ts", "utf8");

assert.match(reviewView, /data-project-drafts/, "review must render the drafts block");
assert.match(reviewView, /data-action="edit-project-draft"/, "each draft card must expose the inspect action");
assert.match(reviewView, /review\.draftsTitle/, "drafts heading must go through i18n");
assert.match(bindNav, /data-action='edit-project-draft'/, "draft inspect action must be bound");
assert.match(bindNav, /openProjectDraftEditor\(draft\)/, "inspect must open the editor with the draft");
assert.match(bindEditor, /host\.pendingProjectDraft/, "editor bind must consume the pending draft");
assert.match(bindEditor, /host\.clearPendingProjectDraft\(\)/, "pending draft must be cleared once applied");
assert.match(bindEditor, /setInput\("schedule", draft\.schedule\.type\)/, "draft prefill must apply the schedule type");
assert.match(indexSource, /openProjectDraftEditor\(draft: ProjectDraft\): void/, "host must implement the draft editor opener");
assert.match(indexSource, /projectDrafts: this\.projectDrafts/, "review context must carry provider drafts");
assert.match(indexSource, /this\.projectDrafts = normalized\.drafts/, "provider result must feed the drafts list");
assert.match(agentSource, /drafts: import\("\.\/features\/project-draft"\)\.ProjectDraft\[\]/, "provider result type must carry drafts");
assert.ok(!indexSource.match(/pendingProjectDraft[\s\S]{0,200}saveForm/), "draft application must never call saveForm itself (user saves manually)");

/* 双语键。 */
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["review.draftsTitle", "review.draftInspect", "review.draftInspectAria"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

fs.rmSync(outputRoot, {recursive: true, force: true});
console.log("project draft gates passed: validation, template factory, provider channel, editor prefill, manual-save-only invariant");
