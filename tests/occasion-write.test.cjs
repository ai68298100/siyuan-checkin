/* T-1707 守门：事项写入取锁内最新值与卸载收尾（D-353）。
   风险路径（源码确认）：启停在入队前捕获旧 item 整对象——队列等待期间其他入口/
   远端改名改期后执行，陈旧快照整对象覆盖；saveOccasionOverride 先改内存再入队；
   reminderUserAction 的独立桶 saveData 未挂写队列、卸载后仍可发起。
   契约：toggle 点击只捕获 id、执行时锁内重读最新条目做字段级翻转（陈旧快照不再
   整对象覆盖）；删除锁内重读存在性（已删跳过，冲突语义归 T-1721）；override 的
   内存应用与持久化全程入锁基于最新 store；提醒动作挂 mutation 队列 await 写入，
   卸载/disposing 静默丢弃。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-write-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const source = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8");
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    const depth = key.split("/").length - 1;
    const stubSpec = JSON.stringify((depth ? "../".repeat(depth) : "./") + "siyuan-stub.js");
    fs.writeFileSync(target, ts.transpileModule(source.replace(/from "siyuan"/g, `from ${stubSpec}`), {compilerOptions}).outputText);
    const imports = source.match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const base = path.posix.join(path.posix.dirname(key), match.slice(6, -1));
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo("render/bind-occasions.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = {showMessage: () => {}};\n");
const bindOccasions = require(path.join(dir, "render", "bind-occasions.js"));

globalThis.window = {confirm: () => true};
const makeField = (value = "") => ({value, addEventListener() {}});
const makeFixture = () => {
    const toggles = new Map();
    const root = {
        querySelector: () => null,
        querySelectorAll: (selector) => selector === "[data-occasion-toggle]"
            ? [...toggles.values()]
            : [],
    };
    const host = {
        occasionStore: {version: 1, occasions: []},
        render() {},
        enqueueMutation: (operation) => Promise.resolve(operation()),
        updateOccasion: async (item) => { host.updates.push(item); },
        updates: [],
    };
    for (const name of ["bindDialogClose", "bindMobileNav", "showToday", "syncOccasionLunarHint", "createOccasionLinkedItem", "deleteOccasion", "setOccasionCompleted", "persistOccasions", "saveOccasionForm"]) host[name] = () => Promise.resolve();
    host.occasionStore.occasions = [
        {id: "p1", name: "事项一", kind: "scheduled", date: "2026-09-15", recurrence: "weekly", weekday: 2, enabled: true, completedDates: [], overrides: {}},
    ];
    host.occasionStore.occasions.forEach((entry) => {
        const button = {dataset: {occasionToggle: entry.id}, handlers: new Map(), addEventListener(name, fn) { this.handlers.set(name, fn); }, fire() { this.handlers.get("click")?.(); }};
        toggles.set(entry.id, button);
    });
    bindOccasions.bindOccasionsHandlers(root, host);
    return {host, button: toggles.get("p1")};
};

(async () => {
    /* —— 夹具 1：点击后、队列执行前另一入口改名 → 执行保留改名只翻转启用态。 —— */
    const fixture = makeFixture();
    const queued = [];
    fixture.host.enqueueMutation = (operation) => { queued.push(operation); return Promise.resolve(); };
    fixture.button.fire();
    assert.equal(queued.length, 1, "the click queues exactly one operation");
    /* 队列等待期间另一窗口/入口改名+改期。 */
    fixture.host.occasionStore.occasions[0].name = "改名后";
    fixture.host.occasionStore.occasions[0].date = "2026-10-20";
    await queued[0]();
    assert.equal(fixture.host.updates.length, 1, "the update runs once");
    assert.equal(fixture.host.updates[0].name, "改名后", "the in-lock re-read keeps the concurrent rename (was the stale snapshot)");
    assert.equal(fixture.host.updates[0].date, "2026-10-20", "the in-lock re-read keeps the concurrent reschedule");
    assert.equal(fixture.host.updates[0].enabled, false, "only the enabled flag flips");

    /* —— 夹具 2：锁内重读发现条目已删除 → 跳过。 —— */
    const deleted = makeFixture();
    const deletedQueue = [];
    deleted.host.enqueueMutation = (operation) => { deletedQueue.push(operation); return Promise.resolve(); };
    deleted.button.fire();
    deleted.host.occasionStore.occasions.splice(0, 1);
    await deletedQueue[0]();
    assert.equal(deleted.host.updates.length, 0, "a concurrently deleted item is skipped");

    /* —— 夹具 3：结构钉（override 全程入锁 + reminder 卸载门与队列）+ 红证对照（钉 0ba809c）。 —— */
    const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    const overrideStart = indexSource.indexOf("private saveOccasionOverride");
    const overrideBody = indexSource.slice(overrideStart, indexSource.indexOf("private async retrySave", overrideStart));
    assert.match(overrideBody, /void this\.enqueueMutation/, "the override write runs inside the mutation queue");
    const enqueueAt = overrideBody.indexOf("enqueueMutation");
    assert.ok(overrideBody.indexOf("this.occasionStore = next") > enqueueAt, "the memory application happens inside the lock, not before enqueueing");
    const reminderStart = indexSource.indexOf('reminderUserAction(id: string, action: "snooze"');
    const reminderBody = indexSource.slice(reminderStart, indexSource.indexOf("private async setOccasionCompleted", reminderStart));
    assert.match(reminderBody, /this\.disposed \|\| this\.disposing\)? ?return|disposed \|\| this\.disposing/, "the reminder action gate-checks disposal");
    assert.match(reminderBody, /await this\.enqueueMutation/, "the reminder save joins the mutation queue");
    assert.match(reminderBody, /await this\.saveData\(REMINDER_ACTIONS_NAME, serialized\)/, "the independent-bucket write is awaited inside the queue");
    const preFixBind = cp.execSync("git show 0ba809c:src/render/bind-occasions.ts", {encoding: "utf8"});
    assert.match(preFixBind, /\{\.\.\.item, enabled: !item\.enabled\}/, "the pre-fix toggle captured a stale whole-object snapshot (red evidence)");
    const preFixIndex = cp.execSync("git show 0ba809c:src/index.ts", {encoding: "utf8"});
    const preFixOverride = preFixIndex.slice(preFixIndex.indexOf("private saveOccasionOverride"), preFixIndex.indexOf("private async retrySave"));
    assert.ok(preFixOverride.indexOf("this.occasionStore = next") < preFixOverride.indexOf("enqueueMutation"), "the pre-fix override mutated memory before enqueueing (red evidence)");
    const preFixReminder = preFixIndex.slice(preFixIndex.indexOf('reminderUserAction(id: string'), preFixIndex.indexOf("private async setOccasionCompleted"));
    assert.doesNotMatch(preFixReminder, /await this\.enqueueMutation/, "the pre-fix reminder save bypassed the queue (red evidence)");
    assert.doesNotMatch(preFixReminder, /disposed \|\| this\.disposing\)? ?return/, "the pre-fix reminder had no disposal gate (red evidence)");

    console.log("occasion-write: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
