/* T-1776 守门：记录成功回执直达所写事实（D-345）。
   风险路径（2026-09-30 审计）：今日最近记录条目只有消息/进度/撤销——用户难核对
   实际日期、数值、来源与撤销对象。契约：回执由事件 id 驱动——"查看此记录"行内
   展开与回顾同款的事实详情（buildRecordDetails 单一投影），来源非 manual 时标注
   徽章（source.* 既有词表）；面板默认收起、本地切换不触重渲染；撤销仍只作用于
   回执对应事件（T-1795 token）。失败不显示成功：回执只在事件落库后由 recordEvent
   成功路径设置（既有结构）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const cp = require("node:child_process");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-record-receipt-"));
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
transpileTo("render/fragments.ts");
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "module.exports = new Proxy({}, {get: () => (...args) => \"\"});\n");
const model = require(path.join(dir, "model.js"));
const fragments = require(path.join(dir, "render", "fragments.js"));

const today = model.dateKey(new Date());
const store = model.normalizeStore({
    version: 3,
    items: [model.normalizeItem({
        id: "p1",
        name: "晨读",
        icon: "📖",
        kind: "count",
        target: 30,
        unit: "分钟",
        schedule: {type: "daily"},
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
        createdDate: today,
    })],
    events: [{id: "e1", itemId: "p1", occurredAt: `${today}T09:30:00.000Z`, localDate: today, value: 20, unit: "分钟", source: "api"}],
    eventTombstones: [],
    itemTombstones: [],
});
const event = model.getEventById(store, "e1");
assert.ok(event, "the fixture event exists");

/* —— 夹具 1：回执携带查看入口 + 来源徽章 + 行内事实面板（默认收起）。 —— */
const receipt = fragments.renderRecentRecordView({
    message: "已为「晨读」记录 20 分钟。",
    progress: 20,
    target: 30,
    unit: "分钟",
    eventId: "e1",
    source: "api",
    localDate: today,
}, event, false);
assert.match(receipt, /data-action="undo-record"/, "undo stays bound to this receipt");
assert.match(receipt, /data-action="toggle-record-details" data-record-details-toggle="e1"/, "the receipt exposes a per-event details toggle");
assert.match(receipt, /data-record-details-panel="e1" hidden/, "the details panel ships collapsed with the event id");
assert.match(receipt, /查看此记录/, "the toggle label resolves through i18n");
assert.match(receipt, /lc-checkin__milestone-tag">[^<]+</, "a non-manual source shows its badge");
assert.match(receipt, /记录日期/, "the panel reuses the single fact-details projection");
assert.ok(!/role="alert"/.test(receipt), "a receipt is a status, never an error surface");

/* —— 夹具 2：manual 来源不显示徽章（词表只在非 manual 时出现）。 —— */
const manualReceipt = fragments.renderRecentRecordView({
    message: "已为「晨读」记录 20 分钟。",
    progress: 20,
    target: 30,
    unit: "分钟",
    eventId: "e1",
    source: "manual",
    localDate: today,
}, event, false);
assert.ok(!/source\.manual/.test(manualReceipt), "manual records carry no source badge");

/* —— 夹具 3：旧形态回执（无 eventId）不渲染查看入口。 —— */
const legacyReceipt = fragments.renderRecentRecordView({message: "已记录。", progress: 1, target: 1, unit: "次"}, undefined, false);
assert.ok(!/toggle-record-details/.test(legacyReceipt), "legacy receipts keep the old shape");

/* —— 夹具 4：事件不存在（跨窗撤销后）不渲染面板与入口。 —— */
const missingReceipt = fragments.renderRecentRecordView({message: "x", progress: 1, target: 1, unit: "次", eventId: "ghost", source: "api"}, undefined, false);
assert.ok(!/toggle-record-details/.test(missingReceipt), "a missing event renders no details entry");

/* —— 夹具 5：接线结构钉 + 红证对照（钉修复前提交 49672ef）。 —— */
const bindSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "bind-today.ts"), "utf8");
assert.match(bindSource, /\[data-action='toggle-record-details'\]/, "the today bindings wire the details toggle");
assert.match(bindSource, /today\.hideRecord/, "the toggle switches to the hide label");
const preFixFragments = cp.execSync("git show 49672ef:src/render/fragments.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixFragments, /toggle-record-details/, "the pre-fix toast had no details entry (red evidence)");
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
assert.match(indexSource, /source: event\.source,\s*\r?\n\s*localDate: event\.localDate,/, "the receipt token carries the event facts");
const completeItemsBlock = indexSource.slice(indexSource.indexOf("private async completeItems"), indexSource.indexOf("/* T-1222 跳过"));
assert.match(completeItemsBlock, /source: last\.event\.source,\s*\r?\n\s*localDate: last\.event\.localDate,/, "bulk completion receipts carry the same event facts as single records");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
for (const key of ["today.viewRecord", "today.hideRecord"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}

console.log("record-receipt: all assertions passed");
