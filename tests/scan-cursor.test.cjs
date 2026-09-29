/* T-1629 守门：三类文档来源的有界分页扫描器。
   - 短页收尾：游标复位空串（下轮从头幂等重扫），行全部累积；
   - 整页推进：游标=本页最后块 ID，多页累积跨页保序（LifeLog 相邻段前置不丢）；
   - 页数上限：读满停止且 advanced=true（windowFull 语义），游标保存；
   - 游标白名单：非法形态（含 SQL 注入串）绝不拼入子句；
   - 接线：健康/笔记推导/叶归三处摄取全部走 scanBoundedPages。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-scan-cursor-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.writeFileSync(path.join(dir, "scan-cursor.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "scan-cursor.ts"), "utf8"), {compilerOptions}).outputText);
const {scanBoundedPages, blockIdCursorClause, SOURCE_SCAN_MAX_PAGES, BLOCK_ID_CURSOR_PATTERN} = require(path.join(dir, "scan-cursor.js"));

(async () => {

const row = (id) => ({id, content: `content-${id}`});
const page = (prefix, count) => Array.from({length: count}, (_, index) => row(`${prefix}-${String(index).padStart(3, "0")}`));

/* —— 游标子句白名单 —— */
assert.equal(blockIdCursorClause("20260930120000-abc1234"), " AND id > '20260930120000-abc1234'", "valid block id becomes a cursor clause");
assert.equal(blockIdCursorClause(""), "", "empty cursor yields no clause");
assert.equal(blockIdCursorClause("x' OR '1'='1"), "", "SQL injection shapes are rejected");
assert.equal(blockIdCursorClause("short"), "", "too-short ids are rejected");
assert.ok(BLOCK_ID_CURSOR_PATTERN.test("20260930120000-abc1234") && !BLOCK_ID_CURSOR_PATTERN.test("'--"), "pattern matches siyuan block id shape");

/* —— 短页收尾 —— */
const shortResult = await scanBoundedPages({
    cursor: "",
    windowSize: 3,
    fetchPage: async () => page("p", 2),
    rowId: (entry) => entry.id,
});
assert.equal(shortResult.rows.length, 2, "short page rows are accumulated");
assert.equal(shortResult.advanced, false, "short page means fully read");
assert.equal(shortResult.cursor, "", "cursor resets so the next run rescans idempotently");

/* —— 整页推进 + 页数上限 —— */
const calls = [];
const capped = await scanBoundedPages({
    cursor: "",
    windowSize: 3,
    maxPages: 2,
    fetchPage: async (cursor) => {
        calls.push(cursor);
        return page(cursor ? "pageb" : "pagea", 3);
    },
    rowId: (entry) => entry.id,
});
assert.equal(capped.pages, 2, "stops at the page cap");
assert.equal(capped.advanced, true, "a full last page means more data may remain (windowFull)");
assert.equal(capped.rows.length, 6, "both pages accumulate");
assert.equal(capped.cursor, "pageb-002", "cursor advances to the last block id of the final page");
assert.deepEqual(calls, ["", "pagea-002"], "the second page reads after the first page's cursor");

/* —— 覆盖保证：满页推进直到短页，跨页行累积保序 —— */
const sequence = [["pagea-000", "pagea-001", "pagea-002"], ["pageb-000", "pageb-001", "pageb-002"], ["pagec-000"]];
let readIndex = 0;
const covered = await scanBoundedPages({
    cursor: "",
    windowSize: 3,
    fetchPage: async () => sequence[readIndex++] || [],
    rowId: (entry) => entry,
});
assert.equal(covered.rows.length, 7, "all pages accumulate across the cursor advance");
assert.deepEqual(covered.rows.map((entry) => entry.slice(0, 6)), ["pagea-", "pagea-", "pagea-", "pageb-", "pageb-", "pageb-", "pagec-"], "cross-page order is preserved (adjacent-segment safety)");
assert.equal(covered.cursor, "", "a closing short page resets the cursor");

/* —— 游标非法时按无游标续读，不中断扫描 —— */
const invalidLast = await scanBoundedPages({
    cursor: "",
    windowSize: 2,
    fetchPage: async () => page("p", 2).map((entry, index) => (index === 1 ? {...entry, id: "bad id with spaces"} : entry)),
    rowId: (entry) => entry.id,
});
assert.equal(invalidLast.advanced, false, "an unpatterned last id cannot advance");
assert.equal(invalidLast.rows.length, 2, "rows still accumulate");

/* —— 默认页数上限常量在档 —— */
assert.ok(SOURCE_SCAN_MAX_PAGES >= 2 && SOURCE_SCAN_MAX_PAGES <= 8, "the page cap stays bounded");

/* —— 接线：三处摄取全部走扫描器 —— */
const pluginSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.equal((pluginSource.match(/scanBoundedPages\(\{/g) || []).length, 3, "health/notequery/yeguif all use the bounded scanner");
assert.match(pluginSource, /cursor: this\.healthScanCursor/, "health session cursor wired");
assert.match(pluginSource, /cursor: this\.noteQueryScanCursor/, "notequery session cursor wired");
assert.match(pluginSource, /cursor: this\.yeguifScanCursor/, "yeguif session cursor wired");
assert.equal((pluginSource.match(/blockIdCursorClause\(cursor\)/g) || []).length, 2, "health and yeguif build cursor clauses through the whitelist helper");
assert.match(pluginSource, /buildNoteQuerySql\(governance, cursor\)/, "notequery passes the cursor to its native SQL builder");
assert.match(pluginSource, /\.catch\(\(\) => undefined\)/, "notequery/yeguif keep the read-failed funnel");
assert.match(pluginSource, /this\.healthScanCursor = scan\.cursor;/, "health persists the final cursor");
assert.match(pluginSource, /this\.noteQueryScanCursor = scan\.cursor;/, "notequery persists the final cursor");
assert.match(pluginSource, /this\.yeguifScanCursor = scan\.cursor;/, "yeguif persists the final cursor");

fs.rmSync(dir, {recursive: true, force: true});
console.log("Scan cursor checks passed: short-page reset, capped advance, coverage order, cursor whitelist, three-source wiring.");
})().catch((error) => { console.error(error); process.exit(1); });
