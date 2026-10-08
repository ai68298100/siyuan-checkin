/* T-1769 守门：事项转打卡的 linkedOccasionId 必须跨普通编辑保留。
   风险路径（2026-09-30 审计）：转打卡把 linkedOccasionId 写入项目（index 转打卡建档），
   save-form 重建项目时逐字段构造却未复制该字段——编辑任意字段保存后，达成回写
   （index setOccasionCompleted）与转打卡查重（linkedOccasionId === occasion.id）断链。
   行为夹具：真实转译 save-form（stub showMessage），走"转打卡建档 → 表单编辑 → 保存 →
   重载（normalize）→ 达成条件"，另覆盖新建不带链接与持久化失败回滚。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-occasion-link-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const done = new Set();
const transpileTo = (relPath) => {
    const key = relPath.replace(/\\/g, "/");
    if (done.has(key)) return;
    done.add(key);
    const target = path.join(dir, key.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    let output = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8"), {compilerOptions}).outputText;
    if (key === "render/save-form.ts") {
        output = output.replace(/require\("siyuan"\)/g, 'require("../siyuan-stub.js")');
    }
    fs.writeFileSync(target, output);
    /* 递归闭包：把相对导入一并转译（目录结构与 src 镜像）。 */
    const imports = fs.readFileSync(path.join(__dirname, "..", "src", key), "utf8").match(/from "(\.[^"]+)"/g) || [];
    for (const match of imports) {
        const spec = match.slice(6, -1);
        const base = path.posix.join(path.posix.dirname(key), spec);
        for (const candidate of [`${base}.ts`, path.posix.join(base, "index.ts")]) {
            if (fs.existsSync(path.join(__dirname, "..", "src", candidate))) transpileTo(candidate);
        }
    }
};
transpileTo(path.join("render", "save-form.ts"));
fs.writeFileSync(path.join(dir, "siyuan-stub.js"), "const messages = [];\nexports.showMessage = (message) => { messages.push(String(message)); };\nexports.messages = messages;\n");

const model = require(path.join(dir, "model.js"));
const saveForm = require(path.join(dir, "render", "save-form.js"));
const siyuanStub = require(path.join(dir, "siyuan-stub.js"));

const today = "2026-10-01";
const submittedAt = {occurredAt: "2026-10-01T09:00:00.000Z", localDate: today};

/* 与 index.ts 转打卡建档同一字段集合（linkedOccasionId 指向原事项）。 */
const transferred = model.normalizeItem({
    id: "item-occ-1",
    name: "复诊（转打卡）",
    icon: "🩺",
    kind: "binary",
    target: 1,
    unit: "次",
    schedule: {type: "daily"},
    createdAt: submittedAt.occurredAt,
    updatedAt: submittedAt.occurredAt,
    createdDate: today,
    archivePeriods: [{startDate: "0000-01-01", endDate: today}, {startDate: "2026-10-02"}],
    linkedOccasionId: "occ-1",
});

const makeHost = (items, persistImpl) => {
    const host = {
        store: {version: 3, items, events: [], eventTombstones: [], itemTombstones: []},
        persisted: 0,
        itemFingerprint: (item) => JSON.stringify(item),
        revisionFingerprint: (item, date) => JSON.stringify(model.getItemRevisionForDate(item, date)),
        persist: async () => {
            if (persistImpl) return persistImpl();
            host.persisted += 1;
        },
        invalidateSummary: () => {},
        broadcast: () => {},
        renderBackgroundUpdate: () => {},
        showToday: () => {},
    };
    return host;
};

const form = (overrides = {}) => {
    const data = new FormData();
    data.set("name", "复诊（转打卡）");
    data.set("kind", "binary");
    data.set("schedule", "daily");
    data.set("icon", "🩺");
    data.set("group", "");
    data.set("priority", "medium");
    data.set("timeSlot", "any");
    data.set("completionSource", "manual");
    data.set("tomatoMode", "minutes");
    data.set("target", "1");
    for (const [key, value] of Object.entries(overrides)) data.set(key, value);
    return data;
};

(async () => {
    /* —— 场景 1：转打卡项目改名编辑后保存，链接必须保留且达成条件成立。 —— */
    const host = makeHost([transferred]);
    const savedId = await saveForm.saveEditorForm(host, form({name: "复诊"}), transferred.id, submittedAt, host.itemFingerprint(transferred));
    assert.equal(savedId, transferred.id, "the edited transfer item is saved in place");
    const saved = host.store.items.find((item) => item.id === transferred.id);
    assert.ok(saved, "the item stays in the store");
    assert.equal(saved.linkedOccasionId, "occ-1", "editing keeps the occasion link (T-1769)");
    assert.equal(saved.name, "复诊", "the edit itself is applied");
    assert.equal(saved.updatedAt > transferred.updatedAt, true, "updatedAt moves forward");
    /* 重载（normalize）后链接仍在；补达成事件后 isComplete=true——回写胶水（setOccasionCompleted）即可命中。 */
    const reloaded = model.normalizeStore(JSON.parse(JSON.stringify(host.store)));
    assert.equal(reloaded.items[0].linkedOccasionId, "occ-1", "the link survives a reload");
    const completedStore = model.appendEvents(reloaded, [{...model.normalizeStore({version: 3, items: [], events: [], eventTombstones: []}) && {
        id: "e-done", itemId: transferred.id, occurredAt: `${today}T10:00:00.000Z`, localDate: today, value: 1, unit: "次", source: "manual",
    }}].filter(Boolean));
    assert.equal(model.isComplete(completedStore, completedStore.items[0], new Date(2026, 9, 1, 12)), true, "completion on the transferred day evaluates complete");

    /* —— 场景 2：普通新建不带 linkedOccasionId（字段不被凭空物化）。 —— */
    const freshHost = makeHost([]);
    const freshId = await saveForm.saveEditorForm(freshHost, form({name: "晨读"}), undefined, submittedAt);
    const fresh = freshHost.store.items.find((item) => item.id === freshId);
    assert.equal(fresh.linkedOccasionId, undefined, "fresh items carry no occasion link");

    /* —— 场景 3：持久化失败整体回滚，原项目（含链接）原样保留。 —— */
    const rollbackHost = makeHost([transferred], () => Promise.reject(new Error("storage down")));
    const failed = await saveForm.saveEditorForm(rollbackHost, form({name: "复诊改"}), transferred.id, submittedAt, rollbackHost.itemFingerprint(transferred));
    assert.equal(failed, undefined, "failed save reports failure");
    assert.equal(rollbackHost.store.items[0].name, "复诊（转打卡）", "the original item is restored");
    assert.equal(rollbackHost.store.items[0].linkedOccasionId, "occ-1", "the restored item keeps its occasion link");
    assert.equal(siyuanStub.messages.some((message) => message.includes("保存失败") || message.includes("save")), true, "a failure message is surfaced");

    console.log("occasion-link: all assertions passed");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
