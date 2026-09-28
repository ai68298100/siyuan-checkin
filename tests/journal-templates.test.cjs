/* T-1465 · D-273 问卷式日记打卡守门：内置 5 预设解析、自建模板归一化（fail-closed）、
   设置文本解析往返、写入 Markdown（标记/表格/空答案）、事件摘要截断、幂等查询语句、
   目标配置归一化；外加全链接线（model/save-form/fragments/bind-today/index/editor/settings）与双语。
   T-1484 提示词池守门：池归一化 fail-closed、ISO 周确定性轮换、空池/单候选/非法日期回落、
   解析/序列化往返、弹窗与 Markdown 共用取词、宿主接线。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-journal-"));
fs.writeFileSync(path.join(dir, "journal-templates.js"), ts.transpileModule(read("src/features/journal-templates.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const journal = require(path.join(dir, "journal-templates.js"));

const i18nSource = read("src/i18n.ts");
/* translate 桩：直接从 i18n 源里取 zh 文案——同时验证键真实存在。 */
const translate = (key) => {
    const match = i18nSource.match(new RegExp(`"${key.replace(/\./g, "\\.")}": "([^"]+)"`));
    return match ? match[1] : "";
};

/* —— 1. 幂等标记：slug + 日期；非法输入空串。 —— */
assert.equal(journal.journalMarker("gratitude3", "2026-09-26"), "lv-checkin-journal:gratitude3:2026-09-26");
assert.equal(journal.journalMarker("Bad_Id", "2026-09-26"), "", "non-slug ids rejected");
assert.equal(journal.journalMarker("gratitude3", "2026-9-26"), "", "non-ISO dates rejected");

/* —— 2. 内置 5 预设：全部可解析、id 唯一、题数固定、九宫格为 grid。 —— */
const resolved = journal.JOURNAL_BUILTIN_TEMPLATES.map((def) => journal.resolveJournalTemplate(def, translate));
assert.equal(resolved.length, 5, "all five built-ins resolve with real i18n keys");
assert.deepEqual(resolved.map((entry) => entry.id), ["gratitude3", "fiveminute", "ninegrid", "kpt", "weekreview"], "builtin ids stay stable (marker identity)");
assert.deepEqual(resolved.map((entry) => entry.questions.length), [3, 5, 8, 3, 4], "question counts match the frozen presets");
assert.equal(resolved[2].layout, "grid", "ninegrid renders as a table");
assert.ok(resolved.every((entry) => entry.questions.every((question) => question.text)), "every question resolves to real copy");
/* 翻译缺失 → fail-closed 丢弃（不写空题干）。 */
assert.equal(journal.resolveJournalTemplate({id: "x1", icon: "x", name: "n", period: "any", questions: [{textKey: "journal.missing.key", type: "text"}]}, translate), undefined, "missing translations drop the question");

/* —— 3. 自建模板归一化：上限、非法丢弃。 —— */
const many = Array.from({length: 11}, (_, index) => ({id: `t${index}`, name: `T${index}`, icon: "x", period: "any", questions: [{text: `q${index}`, type: "text"}]}));
assert.equal(journal.normalizeCustomJournalTemplates(many).length, journal.JOURNAL_MAX_CUSTOM_TEMPLATES, "custom templates cap at 10");
const tooManyQuestions = {id: "big", name: "big", questions: Array.from({length: 25}, (_, index) => ({text: `q${index}`, type: "text"}))};
assert.equal(journal.normalizeCustomJournalTemplates([tooManyQuestions])[0].questions.length, journal.JOURNAL_MAX_QUESTIONS, "questions cap at 20");
assert.deepEqual(journal.normalizeCustomJournalTemplates([{id: "bad id", name: "x", questions: [{text: "q", type: "text"}]}]), [], "slug with whitespace is rejected (lowercasing alone cannot save it)");
assert.deepEqual(journal.normalizeCustomJournalTemplates([{id: "ok", name: "", questions: [{text: "q", type: "text"}]}]), [], "missing name dropped");

/* —— 4. 设置文本解析与往返。 —— */
const parsedText = "# 晨间两问 | 🌅\n今天最重要的一件事 | text\n状态打分 | slider\n\n# 晚间回顾\n今天学到什么？";
const parsed = journal.parseCustomJournalTemplatesText(parsedText);
assert.equal(parsed.invalidBlocks, 0);
assert.equal(parsed.templates.length, 2);
assert.equal(parsed.templates[0].icon, "🌅");
assert.deepEqual(parsed.templates[0].questions.map((question) => question.type), ["text", "slider"]);
assert.equal(journal.parseCustomJournalTemplatesText("没有井号的块").invalidBlocks, 1, "blocks without a header are counted invalid");
const roundtrip = journal.parseCustomJournalTemplatesText(journal.serializeCustomJournalTemplatesText(parsed.templates));
assert.deepEqual(roundtrip.templates.map((entry) => [entry.name, entry.icon, entry.questions.length]), [["晨间两问", "🌅", 2], ["晚间回顾", "📝", 1]], "serialize → parse round-trip");

/* —— 5. 写入 Markdown：单段落块（含幂等标记，重填 updateBlock 整块替换）；空答案跳过；全空有占位。 —— */
const template = journal.resolveJournalTemplate(journal.JOURNAL_BUILTIN_TEMPLATES[0], translate);
const markdown = journal.buildJournalEntryMarkdown({template, localDate: "2026-09-26", answers: ["家人健康", "", "感谢同事帮忙review"]});
assert.match(markdown, /^\*\*🙏 感恩三问 · 2026-09-26\*\* · lv-checkin-journal:gratitude3:2026-09-26\n/, "first line carries the idempotent marker");
/* T-1484：q1 配有提示词池，题干与弹窗共用同一轮换取词（同日一致），基础题干不再直接出现。 */
const rotatedQ1 = journal.resolveJournalQuestionText(template.questions[0], "2026-09-26");
assert.notEqual(rotatedQ1, template.questions[0].text, "pool question rotates away from the base text on 2026-W39");
assert.ok(template.questions[0].prompts.includes(rotatedQ1), "rotated prompt comes from the resolved pool");
assert.match(markdown, new RegExp(`\\*\\*${rotatedQ1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\*\\* 家人健康`), "Q/A pairs render with the same rotated prompt as the dialog");
assert.ok(!markdown.includes(template.questions[0].text), "base text is not rendered when a pool is in effect");
assert.ok(!markdown.includes("今日亮点"), "empty answers are omitted");
assert.equal(markdown.split("\n").filter((line) => line.trim()).length, 3, "single-block model: marker + two answered questions, no blank lines");
assert.equal(journal.buildJournalEntryMarkdown({template, localDate: "bad", answers: []}), "", "invalid date → no markdown (fail-closed)");
const emptyMarkdown = journal.buildJournalEntryMarkdown({template, localDate: "2026-09-26", answers: []});
assert.match(emptyMarkdown, /（空）/, "fully-empty entry renders an explicit placeholder");
assert.equal(journal.buildJournalEntryMarkdown({template, localDate: "2026-09-26", answers: ["a\nb"]}).includes("\nb"), false, "multi-line answers collapse to one line (single-block invariant)");

/* —— 6. 事件摘要截断 + 查询语句转义。 —— */
assert.equal(journal.buildJournalEventNote(template, ["家人健康", "", ""]), "感恩三问：家人健康");
const long = "x".repeat(80);
assert.equal(journal.buildJournalEventNote(template, [long]).length, "感恩三问：".length + 61, "first answer clipped at 60 chars with ellipsis");
assert.equal(journal.buildJournalEventNote(template, []), "感恩三问", "no answers → template name only");
const query = journal.buildJournalLookupQuery("doc'1", "gratitude3", "2026-09-26");
assert.match(query, /doc''1/, "doc ids are SQL-escaped");
assert.match(query, /LIKE '%lv-checkin-journal:gratitude3:2026-09-26%'/, "lookup keys on the marker");

/* —— 7. 集成配置归一化。 —— */
assert.deepEqual(journal.normalizeJournalIntegration(undefined), {mode: "daily", notebookId: "", docId: ""});
assert.deepEqual(journal.normalizeJournalIntegration({mode: "doc", docId: " abc ", notebookId: "n"}), {mode: "doc", notebookId: "n", docId: "abc"});

/* —— 7.5 T-1484 提示词池：归一化 fail-closed、ISO 周确定性轮换、空池/单候选/非法日期回落基础题干。 —— */
assert.deepEqual(journal.normalizePromptPool("x"), [], "non-array input is not a pool");
assert.deepEqual(journal.normalizePromptPool([" a ", "a", "b", 3, null, "", "c"]), ["a", "b", "c"], "trim + dedupe + non-string/empty drop");
assert.deepEqual(journal.normalizePromptPool(["only"]), [], "a single candidate is not a pool");
assert.deepEqual(journal.normalizePromptPool(["1", "2", "3", "4", "5", "6", "7", "8"]), ["1", "2", "3", "4", "5", "6"], "pool caps at JOURNAL_MAX_PROMPT_POOL");
assert.equal(journal.journalIsoWeekKey("2026-01-01"), "2026-W01");
assert.equal(journal.journalIsoWeekKey("2025-12-29"), "2026-W01", "cross-year Monday belongs to the next ISO year");
assert.equal(journal.journalIsoWeekKey("2026-09-26"), "2026-W39");
assert.equal(journal.journalIsoWeekKey("2026-12-31"), "2026-W53", "2026 has 53 ISO weeks");
assert.equal(journal.journalIsoWeekKey("2027-01-01"), "2026-W53", "Jan 1 2027 stays in the previous ISO year's week");
assert.equal(journal.journalIsoWeekKey("2026-02-30"), "", "non-existent calendar date fails closed");
assert.equal(journal.journalIsoWeekKey("2026-9-6"), "", "non-ISO format fails closed");
const poolQuestion = {text: "BASE", prompts: ["P1", "P2", "P3"]};
assert.equal(journal.resolveJournalQuestionText(poolQuestion, "2026-09-26"), journal.resolveJournalQuestionText(poolQuestion, "2026-09-27"), "same ISO week → same prompt");
assert.equal(journal.resolveJournalQuestionText(poolQuestion, "2026-02-30"), "BASE", "invalid date falls back to base text");
assert.equal(journal.resolveJournalQuestionText({text: "BASE"}, "2026-09-26"), "BASE", "no pool → base text");
assert.equal(journal.resolveJournalQuestionText({text: "BASE", prompts: ["P1"]}, "2026-09-26"), "BASE", "singleton pool → base text");
const yearSpread = new Set();
for (let day = 1; day <= 365; day += 1) yearSpread.add(journal.resolveJournalQuestionText(poolQuestion, new Date(Date.UTC(2026, 0, day)).toISOString().slice(0, 10)));
assert.equal(yearSpread.size, 3, "a year of weeks exercises every pool candidate");
/* 内置池经 i18n 解析：3 条候选齐备；缺翻译候选被丢弃；不足 2 条整体不物化（回落基础题干）。 */
assert.equal(template.questions[0].prompts.length, 3, "gratitude3 q1 resolves a 3-candidate pool");
assert.ok(!template.questions[1].prompts, "questions without pools keep prompts unset");
const fiveminuteResolved = journal.resolveJournalTemplate(journal.JOURNAL_BUILTIN_TEMPLATES[1], translate);
assert.equal(fiveminuteResolved.questions[1].prompts.length, 3, "fiveminute q2 pool resolves");
assert.equal(fiveminuteResolved.questions[4].prompts.length, 3, "fiveminute q5 pool resolves");
const partialPool = journal.resolveJournalTemplate({id: "x2", icon: "x", name: "n", period: "any", questions: [{textKey: "journal.tpl.gratitude3.q1", promptKeys: ["journal.tpl.gratitude3.q1.p1", "journal.missing.pool.key"], type: "text"}]}, translate);
assert.ok(!partialPool.questions[0].prompts, "a pool with fewer than 2 resolvable candidates is not materialized");
/* 自建模板文本：`> ` 行累积为上一题池（去重）；孤立池行计坏块；单候选池解析时剪除；序列化往返保留。 */
const poolText = "# 周记 | 📝\n本周一题 | textarea\n> 候选一\n> 候选一\n> 候选二\n> 候选三\n\n# 坏块 | 📝\n> 孤立池行\n真题 | text\n\n# 单候选 | 📝\n一题 | text\n> 唯一候选";
const poolParsed = journal.parseCustomJournalTemplatesText(poolText);
assert.equal(poolParsed.invalidBlocks, 1, "a stray pool line before any question invalidates its block");
assert.deepEqual(poolParsed.templates[0].questions[0].prompts, ["候选一", "候选二", "候选三"], "pool lines accumulate on the preceding question with dedupe");
assert.ok(!poolParsed.templates[1].questions[0].prompts, "singleton pool is pruned on parse");
const poolRoundtrip = journal.parseCustomJournalTemplatesText(journal.serializeCustomJournalTemplatesText(poolParsed.templates));
assert.deepEqual(poolRoundtrip.templates[0].questions[0].prompts, ["候选一", "候选二", "候选三"], "serialize → parse round-trip keeps pools");
assert.equal(poolRoundtrip.invalidBlocks, 0, "pool-bearing text re-parses cleanly");

/* —— 8. 全链接线 —— */
const modelSource = read("src/model.ts");
assert.match(modelSource, /normalizeJournalBinding\(value\.journal\)/, "model normalizes the item binding");
assert.match(modelSource, /\/\^\[a-z0-9\]\[a-z0-9-\]\{0,39\}\$\//, "model uses the slug pattern (inlined to avoid model→features import)");

const saveFormSource = read("src/render/save-form.ts");
assert.match(saveFormSource, /data\.get\("journalTemplateId"\)/, "save-form reads the binding select");
assert.match(saveFormSource, /\{journal: \{templateId: journalTemplateId\}\}/, "save-form materializes the same shape as normalizeItem (fingerprint parity)");

const fragmentsSource = read("src/render/fragments.ts");
assert.match(fragmentsSource, /item\.journal\?\.templateId && !atMost/, "bound binary items keep the journal action in complete state (refill); at-most stays on lapse semantics");
assert.match(fragmentsSource, /data-action="journal"/, "today cards expose the journal action");

const bindTodaySource = read("src/render/bind-today.ts");
assert.match(bindTodaySource, /openJournalEntry\?\(itemId: string\): void/, "bindings host declares the optional journal entry");
assert.match(bindTodaySource, /data-action='journal'/, "bindings route the journal action to the host");

const indexSource = read("src/index.ts");
assert.match(indexSource, /loadData\(JOURNAL_DATA_NAME\)/, "journal data loads at startup");
assert.match(indexSource, /recordEvent\(item, 1, moment, fingerprint, buildJournalEventNote\(template, answers\)\)/, "fact layer first: check-in with truncated note");
assert.match(indexSource, /\/api\/block\/updateBlock/, "refill updates the plugin-owned block");
assert.match(indexSource, /\/api\/block\/appendBlock", \{data: markdown, dataType: "markdown", parentID: target\.docId\}/, "first write appends to the target doc");
assert.match(indexSource, /\/api\/template\/renderSprig/, "daily-note path renders through sprig");
assert.match(indexSource, /createDocWithMd/, "missing daily doc is created idempotently");
assert.match(indexSource, /channel: "journal"/, "write results land in the audit trail");
assert.match(indexSource, /journal\.templateMissing/, "missing template falls back to a normal check-in with a toast");

const editorSource = read("src/render/editor.ts");
assert.match(editorSource, /name="journalTemplateId"/, "editor exposes the binding select");
assert.match(editorSource, /journalTemplates\?/, "editor context carries the resolved templates");

const settingsSource = read("src/render/settings.ts");
assert.match(settingsSource, /data-journal-custom/, "settings expose the custom template textarea");
assert.match(settingsSource, /data-source-panel="journal"/, "settings expose the journal panel");
assert.match(indexSource, /data-action='save-journal-custom'/, "settings save is wired");

/* —— 8.5 T-1484 接线：弹窗按日取词、宿主传入 localDate、builder 深拷贝池数组、预览提示。 —— */
const dialogSource = read("src/render/journal-dialog.ts");
const builderDialogSource = read("src/render/journal-dialog.ts");
assert.match(builderDialogSource, /localDate: string;/, "dialog deps require the rotation date");
assert.match(builderDialogSource, /resolveJournalQuestionText\(question, deps\.localDate\)/, "dialog picks the rotated prompt through the shared implementation");
assert.match(builderDialogSource, /prompts: q\.prompts \? \[\.\.\.q\.prompts\] : undefined/, "copy-preset deep-copies pool arrays");
assert.match(builderDialogSource, /prompts: template\.questions\[j\]\.prompts \? \[\.\.\.template\.questions\[j\]\.prompts\] : undefined/, "duplicate-question deep-copies pool arrays");
assert.match(builderDialogSource, /journal\.poolVariants/, "builder preview surfaces the pool size hint");
assert.match(indexSource, /template,\s*\n\s*localDate,\s*\n\s*integration: this\.journalIntegrationPref/, "host passes the day key into the journal dialog");

/* —— 9. i18n 双语 + 移动触控基线覆盖。 —— */
const journalKeys = i18nSource.match(/"journal\.[a-zA-Z0-9.]+"/g) || [];
const uniqueKeys = [...new Set(journalKeys)];
assert.ok(uniqueKeys.length >= 45, `journal keys present (${uniqueKeys.length})`);
for (const key of uniqueKeys) {
    const count = i18nSource.split(key).length - 1; /* match 结果自带引号，直接计数 */
    assert.equal(count, 2, `${key} must exist exactly in both locales (${count})`);
}
const scss = read("src/ui/components.scss");
assert.match(scss, /\.lc-checkin__journal-answer,/, "mobile 44px baseline covers journal answers");
assert.match(scss, /\.lc-checkin__journal-actions button \{ min-height: 44px; \}/, "mobile 44px baseline covers journal actions");

console.log("journal template guard tests passed.");
const stableTemplate = {id: "my-stable-id", name: "Renamed", icon: "📝", period: "any", layout: "list", questions: [{text: "Required answer", type: "text", required: true}]};
const stableRoundtrip = journal.parseCustomJournalTemplatesText(journal.serializeCustomJournalTemplatesText([stableTemplate]), [stableTemplate.id]);
assert.equal(stableRoundtrip.templates[0].id, stableTemplate.id, "saving/renaming preserves bound template identity");
assert.equal(stableRoundtrip.templates[0].questions[0].required, true, "text roundtrip preserves required questions");
assert.equal(journal.parseCustomJournalTemplatesText("# Form | 📝 | blank-test\nValid | text\n | textarea | required").invalidBlocks, 1, "empty builder questions reject the whole template");

/* —— T-1589 构建器可理解化：边界说明、模板计数/必答摘要、解析错误恢复既有。 —— */
assert.match(builderDialogSource, /data-builder-boundary/, "构建器边界说明在位（更改仅确认后写入）");
assert.match(builderDialogSource, /journal\.builderBoundary/, "边界说明走 i18n");
assert.match(builderDialogSource, /journal\.templateSummary/, "模板摘要（题数/必答）走 i18n");
assert.match(builderDialogSource, /templateSummary\(template\)/, "摘要按模板实时生成");
assert.match(builderDialogSource, /journal\.customInvalid/, "解析错误恢复提示既有");
const journalI18n = read("src/i18n.ts");
for (const key of ["journal.builderBoundary", "journal.templateSummary"]) {
    const count = journalI18n.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} 必须中英双语齐备（当前 ${count}）`);
}
