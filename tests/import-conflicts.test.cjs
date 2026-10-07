/* T-1522 数据迁移重名冲突主动选择守门：
   同名才生成决策、合入仅在类型与单位兼容时可用、不兼容明示原因且默认跳过、
   另建名称确定性且不与现有重名、迁移函数尊重逐项决策（跳过行计数）、
   重复导入幂等、确认前重查（会话决策即重查输入）与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-import-conflicts-"));
const transpileTo = (relative, targetRelative) => {
    const target = path.join(dir, targetRelative || relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
};
const load = (relative) => {
    const target = path.join(dir, path.basename(relative).replace(/\.ts$/, ".js"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const conflicts = load("features/import-conflicts.ts");

/* plugin-ops 依赖面广：真实 transpile model/rules/loop-csv/obsidian-habits，
   其余（siyuan/i18n/shared/download 等）以 Proxy 桩满足 require（导入路径不触达）。 */
transpileTo("date-keys.ts");
transpileTo("quota.ts");
transpileTo("record-step.ts");
transpileTo("rules.ts");
transpileTo("model.ts");
transpileTo("features/loop-csv.ts");
transpileTo("features/obsidian-habits.ts");
transpileTo("plugin-ops.ts");
const PROXY_STUB = `module.exports = new Proxy({}, {get: () => () => undefined});`;
for (const relative of ["i18n.js", "download.js", "shared.js", "agent-suggestions.js", "export.js", "dock-tomato.js", path.join("render", "quick-dialog.js"), path.join("features", "diagnostics.js"), path.join("features", "privacy-scope.js")]) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, PROXY_STUB);
}
/* 裸模块 siyuan：在临时目录放一个 node_modules 桩包。 */
const siyuanStubDir = path.join(dir, "node_modules", "siyuan");
fs.mkdirSync(siyuanStubDir, {recursive: true});
fs.writeFileSync(path.join(siyuanStubDir, "package.json"), JSON.stringify({name: "siyuan", main: "index.js"}));
fs.writeFileSync(path.join(siyuanStubDir, "index.js"), PROXY_STUB);
const pluginOps = require(path.join(dir, "plugin-ops.js"));

const source = (overrides = {}) => ({name: "拉伸", kind: "duration", unit: "分钟", dateCount: 7, ...overrides});
const existing = (overrides = {}) => ({id: "e1", name: "拉伸", kind: "duration", unit: "分钟", archived: false, ...overrides});

/* —— 1. 同名才生成决策；兼容合入默认；异单位/异类型明示原因并默认跳过。 —— */
{
    const decisions = conflicts.planImportConflicts([source()], [existing()]);
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].mergeCompatible, true);
    assert.equal(decisions[0].disposition, "merge", "compatible duplicate defaults to merge");
    const unitDiff = conflicts.planImportConflicts([source({unit: "次"})], [existing()]);
    assert.equal(unitDiff[0].incompatibility, "unit", "unit mismatch is stated explicitly");
    assert.equal(unitDiff[0].mergeCompatible, false);
    assert.equal(unitDiff[0].disposition, "skip", "incompatible defaults to skip (no silent unit conversion)");
    const kindDiff = conflicts.planImportConflicts([source({kind: "binary"})], [existing()]);
    assert.equal(kindDiff[0].incompatibility, "kind");
    assert.equal(conflicts.planImportConflicts([source({name: "喝水"})], [existing()]).length, 0, "non-conflicting names produce no decisions");
    assert.equal(conflicts.planImportConflicts([source()], [existing({archived: true})]).length, 0, "archived items are not conflict targets");
}

/* —— 2. 另建名称确定性且不与现有重名；连续另建自动递增。 —— */
{
    const taken = new Set(["拉伸", "拉伸 · 导入"]);
    assert.equal(conflicts.resolveImportConflictName("拉伸", taken), "拉伸 · 导入 2");
    assert.equal(conflicts.resolveImportConflictName("喝水", taken), "喝水 · 导入");
}

/* —— 3. 迁移函数尊重决策：跳过计行、另建用新名、合入保持既有语义。 —— */
{
    const pluginOps = load("plugin-ops.ts");
    const mkStore = (items, events) => ({version: 3, items, events, eventTombstones: []});
    const plan = {
        habits: [{name: "拉伸", measurable: true, unit: "分钟", target: 30, scheduleDegraded: false, archived: false}],
        rows: [{name: "拉伸", date: "2026-09-21", value: 30, unit: "分钟", binary: false}, {name: "拉伸", date: "2026-09-22", value: 25, unit: "分钟", binary: false}],
        measurableNames: ["拉伸"], skipDays: 0, unknownCells: 0, unmappableFrequency: [], unknownColumns: [],
    };
    const existingItem = {...baseItem()};
    const base = pluginOps.importLoopPlanInto(mkStore([existingItem], []), plan, new Map([["拉伸", {disposition: "merge"}]]));
    assert.equal(base.eventsCreated, 2, "merge keeps existing semantics");
    assert.equal(base.skippedRows, 0);
    const skipped = pluginOps.importLoopPlanInto(mkStore([existingItem], []), plan, new Map([["拉伸", {disposition: "skip"}]]));
    assert.equal(skipped.eventsCreated, 0, "skip writes no events");
    assert.equal(skipped.skippedRows, 2, "skipped rows are counted");
    assert.equal(skipped.itemsCreated, 0, "skip never creates items");
    const createNew = pluginOps.importLoopPlanInto(mkStore([existingItem], []), plan, new Map([["拉伸", {disposition: "createNew", createNewName: "拉伸 · 导入"}]]));
    assert.equal(createNew.itemsCreated, 1);
    assert.equal(createNew.store.items.find((candidate) => candidate.name === "拉伸 · 导入").unit, "分钟", "create-new keeps the source unit (no conversion)");
    /* 重复导入幂等：同 rows 再导入（合入）→ 全部判重复。 */
    const replay = pluginOps.importLoopPlanInto(base.store, plan, new Map([["拉伸", {disposition: "merge"}]]));
    assert.equal(replay.duplicates, 2, "re-import reports duplicates instead of double counting");
}

function baseItem() {
    return {id: "e1", name: "拉伸", icon: "✓", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-01-01T00:00:00.000Z", createdDate: "2026-01-01", archived: false, revisions: []};
}

/* —— 4. 接线与双语。 —— */
const settingsSource = fs.readFileSync(path.join(root, "src", "render", "settings.ts"), "utf8");
assert.match(settingsSource, /data-import-conflict-panel/, "settings hosts the conflict decision panel");
assert.match(settingsSource, /data-conflict-name=/, "per-conflict radios render");
assert.match(settingsSource, /set\.importIncompatibleUnit/, "unit incompatibility reason is rendered");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private importConflictSession/, "host holds the conflict session");
assert.match(indexSource, /settings\.importConflictSession = \{format: "loop-csv"/, "loop conflict plans are held by the owning settings root");
assert.match(indexSource, /settings\.importConflictSession = \{format: "obsidian-habits"/, "Obsidian conflict plans are held by the owning settings root");
assert.match(indexSource, /"\[data-import-conflict-confirm\]"\)\?\.addEventListener\("click", \(event\) => \{/, "confirm is bound through a stable click handler");
assert.match(indexSource, /runSettingsAction\(control, async \(\) => \{[\s\S]*this\.persist\(\)[\s\S]*\}, "\[data-mobile-nav='settings'\]"\)/, "conflict confirmation uses the settings busy lifecycle and focuses the live settings navigation after success");
assert.doesNotMatch(indexSource, /"\[data-import-conflict-confirm\]"\)\?\.addEventListener\("click", async \(\)/, "conflict confirmation must not bypass the busy lifecycle");
assert.match(indexSource, /"\[data-import-conflict-cancel\]"/, "cancel is bound");
assert.match(indexSource, /this\.store = previousStore/, "save failure rolls the store back");
assert.match(indexSource, /settingsFeedback\(t\("msg\.importPersistFail"\)\)/, "conflict persistence failure uses fixed safe feedback");
assert.doesNotMatch(indexSource, /data-import-conflict-confirm[\s\S]{0,1800}String\(error\)/, "conflict feedback must not echo raw host errors");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["set.importConflictTitle", "set.importConflictHint", "set.importConflictMerge", "set.importConflictCreateNew", "set.importConflictSkip", "set.importConflictMeta", "set.importIncompatibleUnit", "set.importIncompatibleKind", "set.importConflictConfirm", "set.importSkippedRows"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("import conflict gates passed: same-name decisions only, compatibility gating with explicit reasons, deterministic create-new names, disposition-respecting migration functions, re-import idempotence, rollback and bilingual copy.");
