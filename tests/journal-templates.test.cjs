/* T-1465 · D-273 问卷式日记打卡守门：内置 5 预设解析、自建模板归一化（fail-closed）、
   设置文本解析往返、写入 Markdown（标记/表格/空答案）、事件摘要截断、幂等查询语句、
   目标配置归一化；外加全链接线（model/save-form/fragments/bind-today/index/editor/settings）与双语。 */
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
assert.match(markdown, /\*\*今天值得感恩的三件事是什么？\*\* 家人健康/, "Q/A pairs render as bold-prefixed lines");
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
