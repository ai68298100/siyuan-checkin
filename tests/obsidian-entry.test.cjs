/* T-1797/T-1798 守门：Obsidian 无冲突导入接回 report.store，三格式入口持久化失败统一回滚（D-340）。
   风险路径（第三轮审计）：index.ts 无冲突 Obsidian 入口调用纯函数 importObsidianHabitsInto
   却丢弃返回的 report.store（不可变模型运算返回新 Store），导入物静默丢失；CSV/Loop/Obsidian
   三处入口先改内存再 persist，失败不回滚——内存/磁盘分叉成半成品导入。
   守门：纯函数行为（不可变性证明丢弃返回值即丢数据）+ 入口接线结构钉 + HEAD 红证对照。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

/* —— 红证对照：修复前（1b19a66 的父提交 689894c）的无冲突 Obsidian 入口没有接回
   report.store（T-1797 坐实）。钉历史提交而非 HEAD，修复合入后对照依然成立。 —— */
const preFixIndex = cp.execSync("git show 689894c:src/index.ts", {encoding: "utf8"});
const wiringPattern = /importObsidianHabitsInto\(this\.store, plan\);\s*\r?\n\s*this\.store = report\.store;/;
assert.match(indexSource, wiringPattern, "the no-conflict Obsidian entry assigns report.store (T-1797)");
assert.doesNotMatch(preFixIndex, wiringPattern, "the pre-fix tree lacked the assignment (red evidence)");

/* —— 结构钉：三格式入口都有 previousStore 快照 + 失败回滚。 —— */
assert.equal((indexSource.match(/T-1798：持久化失败统一回滚导入内存/g) || []).length, 3,
    "all three import entries (csv/loop/obsidian) roll back on persist failure");
assert.ok(((indexSource.match(/this\.store = previousStore;/g) || []).length) >= 3,
    "each entry restores the previous store snapshot");
assert.match(indexSource, /const result = importObsidianHabitsInto\(this\.store, session\.obsidianPlan, map\); this\.store = result\.store;/,
    "the conflict path keeps its existing correct wiring");

/* —— 纯函数行为：返回新 Store 且不改入参——丢弃返回值即等于丢弃导入物。 —— */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-obsidian-entry-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    let output = ts.transpileModule(source, {compilerOptions}).outputText;
    /* siyuan stub 按文件深度生成相对路径（根目录文件需 ./，子目录按层级回退）。 */
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    output = output.replace(/require\("siyuan"\)/g, `require(${stubSpec})`);
    fs.writeFileSync(target, output);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("plugin-ops.ts");
fs.mkdirSync(path.join(dir, "render"), {recursive: true});
fs.writeFileSync(path.join(dir, "siyuan-stub.js"),
    "module.exports = new Proxy({}, {get: () => (...args) => Promise.resolve()});\n");
const pluginOps = require(path.join(dir, "plugin-ops.js"));

const baseStore = {
    version: 3,
    items: [],
    events: [],
    eventTombstones: [],
    itemTombstones: [],
};
const plan = {
    habits: [{
        filename: "晨跑.md",
        title: "晨跑",
        dates: ["2026-09-28", "2026-09-29", "2026-09-30"],
    }],
    totalDates: 3,
};
const before = JSON.stringify(baseStore);
const report = pluginOps.importObsidianHabitsInto(baseStore, plan);
assert.equal(report.itemsCreated, 1, "the plan creates one item");
assert.equal(report.eventsCreated, 3, "the plan creates one event per date");
assert.equal(report.store.items.length, 1, "the returned store carries the imported item");
assert.equal(report.store.events.length, 3, "the returned store carries the imported events");
assert.equal(JSON.stringify(baseStore), before, "the input store is untouched — discarding report.store discards the import (why T-1797 matters)");
assert.equal(report.store.items[0].source ?? "manual", "manual");
assert.ok(report.store.events.every((event) => event.source === "import"), "imported events carry the import source");

console.log("obsidian-entry: all assertions passed");
