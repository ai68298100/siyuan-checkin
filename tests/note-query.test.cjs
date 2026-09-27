/* T-1500 笔记推导打卡守门：固定只读 SQL、frontmatter/tag 严格解析、日期/身份/幂等及手动互斥。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-note-query-"));
for (const filename of ["date-keys.ts", "types.ts", "features/note-anchor.ts", "features/note-query.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const feature = require(path.join(outputRoot, "features", "note-query.js"));
const valid = {enabled: true, template: "frontmatter", scope: "notebook", targetId: "20260927090000-abcd123", itemId: "item-1", field: "checkin", value: "done", tag: "checkin"};

assert.equal(feature.normalizeNoteQueryPreference({enabled: true, targetId: "bad", itemId: "x", template: "sql"}).enabled, false, "unsafe target/template never enables");
const unsafeField = feature.normalizeNoteQueryPreference({...valid, field: "drop table"});
assert.equal(unsafeField.field, "", "unsafe field is preserved as invalid instead of silently querying the default marker");
assert.equal(unsafeField.enabled, false, "unsafe field disables ingestion fail-closed");
const sql = feature.buildNoteQuerySql(valid);
assert.match(sql, /^SELECT /);
assert.match(sql, /JOIN blocks AS root/);
assert.match(sql, /root\.box = '20260927090000-abcd123'/);
assert.match(sql, /LIMIT 200$/);
assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE|DROP/i, "template remains read-only");
assert.match(feature.buildNoteQuerySql({...valid, scope: "document"}), /root\.id = '20260927090000-abcd123'/);
assert.equal(feature.buildNoteQuerySql({}), "", "unbound template is empty");

const frontmatterRows = [
    {id: "20260927090100-block001", content: "checkin: done", root_ial: "{\"custom-dailynote-20260927\":\"1\"}"},
    {id: "20260927090101-block002", content: "checkin: todo", root_ial: "custom-dailynote-20260927"},
    {id: "20260927090102-block003", content: "checkin: done", root_hpath: "/日记/2026-09-26"},
    {id: "20260927090103-block004", content: "checkin: done", root_ial: "custom-dailynote-20260230"},
    {id: "20260927090104-block005", content: "<span>checkin: done</span>", root_hpath: "/日记/2026-09-25"},
];
const parsedFrontmatter = feature.parseNoteQueryRows(frontmatterRows, valid);
assert.equal(parsedFrontmatter.length, 3, "only strict done markers with valid daily dates survive");
assert.deepEqual(parsedFrontmatter.map((entry) => entry.localDate), ["2026-09-27", "2026-09-26", "2026-09-25"]);
assert.match(parsedFrontmatter[0].externalRef, /^notequery:item-1:20260927090100-block001:2026-09-27$/);

const tagRows = [
    {id: "20260927090200-block001", content: "今日完成 #checkin。", root_hpath: "2026-09-27"},
    {id: "20260927090201-block002", content: "#checking 不应命中", root_hpath: "2026-09-27"},
    {id: "20260927090202-block003", content: "#checkin", root_hpath: "2026-09-27"},
];
const parsedTag = feature.parseNoteQueryRows(tagRows, {...valid, template: "tag"});
assert.equal(parsedTag.length, 2, "tag template requires a complete tag token");
assert.equal(feature.parseNoteQueryRows(tagRows, {...valid, itemId: "bad id"}).length, 0);

const entry = parsedFrontmatter[0];
const event = {itemId: "item-1", localDate: entry.localDate, source: "manual", externalRef: undefined};
assert.equal(feature.noteQueryIngestDecision([event], [], entry, "item-1"), "manual-conflict");
assert.equal(feature.noteQueryIngestDecision([{...event, source: "api", externalRef: entry.externalRef}], [], entry, "item-1"), "duplicate");
assert.equal(feature.noteQueryIngestDecision([], [{itemId: "item-1", source: "api", externalRef: entry.externalRef}], entry, "item-1"), "tombstoned");
assert.equal(feature.noteQueryIngestDecision([], [], entry, "item-1"), "write");

console.log("Note query checks passed: fixed read-only SQL, strict date/marker parsing, notequery identity and manual mutual exclusion.");
