/* T-1621 步骤一守门：多 root 独立页面存储（root-page-store）。
   - per-root：两 root 各自持页互不覆盖，显式 root 导航只改该表面并标记最后活跃；
   - 代理层：activePage 读最后活跃页、无活跃 root 回落孤儿页；宿主级全局写同步全部 root + 孤儿页；
   - 注册继承：新 root 继承孤儿页（启动参数写入早于首个 root 注册的路径）；
   - 释放：root 销毁释放上下文、最后活跃释放后由调用方回落（releaseRootContext 语义）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-root-pages-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.writeFileSync(path.join(dir, "root-page-store.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "root-page-store.ts"), "utf8"), {compilerOptions}).outputText);
const {createRootPageStore} = require(path.join(dir, "root-page-store.js"));

const el = (id) => ({id});

(async () => {

/* —— per-root 独立页面 —— */
const store = createRootPageStore();
const dock = el("dock");
const tab = el("tab");
const quick = el("quick");

store.ensure(dock).page = "today";
store.ensure(tab).page = "review";
store.navigate(quick, "settings");
assert.equal(store.pageOf(dock), "today", "dock keeps its own page");
assert.equal(store.pageOf(tab), "review", "tab keeps its own page");
assert.equal(store.pageOf(quick), "settings", "quick dialog keeps its own page");
assert.equal(store.activePage(), "settings", "explicit navigation marks the target root as last active");
assert.equal(store.size(), 3, "all three roots are registered");

/* 未注册 root 只读回落孤儿页，不创建条目。 */
const ghost = el("ghost");
assert.equal(store.pageOf(ghost), "today", "unregistered roots fall back to the orphan page");
assert.equal(store.size(), 3, "read-only pageOf must not register");

/* —— 宿主 currentPage 代理：全局写同步全部 root + 孤儿页 —— */
store.navigate(undefined, "insights");
assert.equal(store.pageOf(dock), "insights", "global write reaches dock");
assert.equal(store.pageOf(tab), "insights", "global write reaches tab");
assert.equal(store.pageOf(quick), "insights", "global write reaches quick dialog");
assert.equal(store.activePage(), "insights", "global write reaches the proxy");

/* —— 全局写覆盖孤儿页；新注册 root 继承孤儿页（启动参数路径） —— */
const fresh = createRootPageStore();
fresh.navigate(undefined, "editor");
const lateRoot = el("late");
assert.equal(fresh.pageOf(lateRoot), "editor", "orphan page carries startup params");
assert.equal(fresh.ensure(lateRoot).page, "editor", "late registration inherits the orphan page");

/* —— 释放：上下文删除 + 最后活跃回落由调用方处理 —— */
const store2 = createRootPageStore();
const dock2 = el("dock2");
const quick2 = el("quick2");
store2.navigate(dock2, "today");
store2.navigate(quick2, "settings");
assert.equal(store2.activePage(), "settings");
store2.release(quick2);
assert.equal(store2.lastActiveRoot(), null, "releasing the last active root clears the marker");
assert.equal(store2.pageOf(quick2), "today", "released root falls back to the orphan page");
assert.equal(store2.activePage(), "today", "proxy falls back to the orphan page until the caller restores");
store2.setActiveRoot(dock2);
assert.equal(store2.activePage(), "today", "caller restores the fallback root (dock before tab)");

/* 释放非活跃 root 不影响代理。 */
store2.navigate(dock2, "review");
const other = el("other");
store2.ensure(other).page = "archived";
store2.release(other);
assert.equal(store2.activePage(), "review", "releasing a non-active root keeps the proxy");

/* —— 孤儿页可变（无 root 的宿主级启动写入） —— */
const bare = createRootPageStore();
assert.equal(bare.activePage(), "today", "default orphan page is today");
bare.navigate(undefined, "occasions");
assert.equal(bare.activePage(), "occasions", "orphan page absorbs host-level writes before any root exists");

console.log("root-page-store: all checks passed.");

})().catch((error) => {
    console.error(error);
    process.exit(1);
});
