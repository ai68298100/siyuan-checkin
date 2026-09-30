/* T-1706 守门：事项存储规范化、重复 ID 隔离与 agenda 一次映射（D-352）。
   风险路径（源码确认）：normalizeOccasionStore 逐项接收不去重 id——损坏数据里同 id
   多条并存，agenda 按 id findIndex 回取行时第二条复用第一条 DOM（错行呈现），按 id
   写操作同时命中；agenda 循环再 findIndex 造成 O(n²) 且同 id 错行。
   契约：store 规范化按 id 去重（胜者=updatedAt 新者 → completedDates 更多 → 先出现，
   确定性可恢复，不报错）；completedDates 唯一并升序（保留最近 120 条）；agenda 行与
   条目按构建序 zip 一次映射（O(n)，同 id 已在存储层隔离）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-store-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
for (const filename of ["types.ts", "date-keys.ts", "lunar.ts", "i18n.ts", "occasions.ts"]) {
    fs.writeFileSync(path.join(dir, filename.replace(/\.ts$/, ".js")), ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", filename), "utf8"), {compilerOptions}).outputText);
}
const occasions = require(path.join(dir, "occasions.js"));

const occasion = (overrides = {}) => ({
    id: "occ-1",
    name: "事项",
    kind: "scheduled",
    date: "2026-09-15",
    recurrence: "weekly",
    enabled: true,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-09-01T08:00:00.000Z",
    completedDates: [],
    ...overrides,
});

/* —— 夹具 1：重复 id 去重——updatedAt 新者胜出，只留一条。 —— */
const duplicated = occasions.normalizeOccasionStore({
    version: 1,
    occasions: [
        occasion({updatedAt: "2026-09-01T08:00:00.000Z"}),
        occasion({name: "较新副本", updatedAt: "2026-09-05T08:00:00.000Z"}),
    ],
});
assert.equal(duplicated.occasions.length, 1, "duplicate ids are deduplicated at normalization");
assert.equal(duplicated.occasions[0].name, "较新副本", "the newer updatedAt wins deterministically");

/* —— 夹具 2：updatedAt 平局时 completedDates 更多者胜；全平保留先出现。 —— */
const tie = occasions.normalizeOccasionStore({
    version: 1,
    occasions: [
        occasion({completedDates: ["2026-09-15"]}),
        occasion({name: "更多完成", completedDates: ["2026-09-15", "2026-09-22"]}),
    ],
});
assert.equal(tie.occasions[0].name, "更多完成", "equal timestamps prefer the richer completion history");
const identical = occasions.normalizeOccasionStore({version: 1, occasions: [occasion(), occasion()]});
assert.equal(identical.occasions.length, 1, "fully identical duplicates collapse to the first");

/* —— 夹具 3：不同 id 互不影响；损坏条目照常剔除。 —— */
const mixed = occasions.normalizeOccasionStore({
    version: 1,
    occasions: [occasion({id: "a"}), occasion({id: "b", name: "另一条"}), {id: "broken", name: ""}],
});
assert.deepEqual(mixed.occasions.map((item) => item.id), ["a", "b"], "distinct ids survive; invalid entries drop");

/* —— 夹具 4：completedDates 唯一并升序、超 120 保留最新。 —— */
const dense = occasions.normalizeOccasion({
    id: "dense", name: "高频", kind: "scheduled", date: "2026-01-01", recurrence: "weekly",
    enabled: true, completedDates: ["2026-09-20", "2026-09-15", "2026-09-15", "2026-01-05"],
});
assert.deepEqual(dense.completedDates, ["2026-01-05", "2026-09-15", "2026-09-20"], "completion dates are unique and ascending");
const flood = occasions.normalizeOccasion({
    id: "flood", name: "洪泛", kind: "scheduled", date: "2026-01-01", recurrence: "weekly", enabled: true,
    completedDates: Array.from({length: 150}, (_, index) => {
        const date = new Date(2026, 0, 1 + index, 12);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }),
});
assert.equal(flood.completedDates.length, 120, "the 120-entry retention window holds");
assert.equal(flood.completedDates[0] <= flood.completedDates[1], true, "retained entries stay ascending");

/* —— 夹具 5：千项规范化成本有界（无 O(n²) 行为）。 —— */
const floodStoreStart = process.hrtime.bigint();
const bulkStore = occasions.normalizeOccasionStore({version: 1, occasions: Array.from({length: 1000}, (_, index) => occasion({id: `bulk-${index}`, name: `事项 ${index}`}))});
assert.equal(bulkStore.occasions.length, 1000, "a thousand distinct occasions all survive");
const bulkMs = Number(process.hrtime.bigint() - floodStoreStart) / 1e6;
assert.ok(bulkMs < 2000, `normalizing 1000 occasions stays cheap (took ${bulkMs.toFixed(0)}ms)`);

/* —— 夹具 6：agenda 一次映射结构钉 + 红证对照（钉修复前提交 ae1fabb）。 —— */
const renderSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "occasions.ts"), "utf8");
assert.doesNotMatch(renderSource, /rowMarkup\[filteredOccasions\.findIndex/, "the agenda no longer re-finds rows by id (O(n²) + wrong-row risk)");
assert.match(renderSource, /filteredOccasions\.forEach\(\(\{item, next\}, index\) => \{\s*\r?\n?\s*const row = rowMarkup\[index\];/, "rows and entries zip by construction order");
const preFixRender = cp.execSync("git show ae1fabb:src/render/occasions.ts", {encoding: "utf8"});
assert.match(preFixRender, /rowMarkup\[filteredOccasions\.findIndex/, "the pre-fix agenda re-found rows by id (red evidence)");
const preFixOccasions = cp.execSync("git show ae1fabb:src/occasions.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixOccasions, /winners\.set\(occasion\.id/, "the pre-fix store kept duplicate ids (red evidence)");

console.log("occasion-store: all assertions passed");
