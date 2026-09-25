/* T-1427 · R-A4/R-30.4 导入预览统一模型测试：Loop/Obsidian 计划到统一预览的映射、
   语义损耗词表、重名冲突、身份口径声明、确定性与纯度；外加导入流程接线守门。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-import-preview-"));
for (const [source, target] of [["src/features/import-preview.ts", path.join("features", "import-preview.js")]]) {
    const targetPath = path.join(dir, target);
    fs.mkdirSync(path.dirname(targetPath), {recursive: true});
    fs.writeFileSync(targetPath, ts.transpileModule(fs.readFileSync(path.join(root, source), "utf8"), {compilerOptions}).outputText);
}
const ip = require(path.join(dir, "features", "import-preview.js"));

/* —— 1. Loop 预览：损耗词表 + 逐项记录数 + 跳过条目 —— */
{
    const plan = {
        habits: [
            {name: "晨跑", unit: "次", measurable: false, target: 1, archived: false, schedule: {type: "daily"}, scheduleDegraded: false},
            {name: "喝水", unit: "毫升", measurable: true, target: 8, archived: false, schedule: {type: "quota", quota: {period: "day", amount: 8, countMode: "dates"}}, scheduleDegraded: false},
            {name: "旧习惯", unit: "次", measurable: false, target: 1, archived: true, schedule: {type: "daily"}, scheduleDegraded: true},
        ],
        rows: [
            {name: "晨跑", date: "2026-09-20", value: 1, unit: "次", binary: true},
            {name: "晨跑", date: "2026-09-21", value: 1, unit: "次", binary: true},
            {name: "喝水", date: "2026-09-21", value: 300, unit: "毫升", binary: false},
        ],
        measurableNames: ["喝水"],
        skipDays: 4,
        unknownCells: 2,
        unmappableFrequency: ["旧习惯"],
    };
    const preview = ip.buildLoopImportPreview(plan, ["喝水"]);
    assert.equal(preview.format, "loop-csv");
    assert.equal(preview.totalDates, 3);
    assert.equal(preview.skippedEntries, 6, "skip 日 + 未知单元格");
    const morning = preview.items.find((item) => item.name === "晨跑");
    assert.equal(morning.dateCount, 2);
    assert.equal(morning.lossy.length, 0, "完全可映射项目无损耗");
    const legacy = preview.items.find((item) => item.name === "旧习惯");
    assert.ok(legacy.lossy.includes("schedule-degraded") && legacy.lossy.includes("archived-flag"));
    assert.ok(preview.lossy.includes("unknown-cells"));
    assert.ok(preview.lossy.includes("unmappable-frequency"));
    /* 重名冲突：喝水已存在于 store。 */
    assert.deepEqual(preview.conflicts, [{kind: "existing-item", name: "喝水"}]);
    assert.equal(preview.identityNote, "content-item-date", "Loop 无 externalRef，身份为内容匹配");
}

/* —— 2. Obsidian 预览：颜色/maxGap 损耗 + 名称派生与冲突 —— */
{
    const plan = {
        habits: [
            {filename: "morning-run.md", title: "晨跑打卡", color: "#ff0000", maxGap: 7, dates: ["2026-09-20", "2026-09-21"]},
            {filename: "reading.md", dates: ["2026-09-20"]},
        ],
        totalDates: 3,
    };
    const preview = ip.buildObsidianImportPreview(plan, ["晨跑打卡"]);
    assert.equal(preview.format, "obsidian-habits");
    assert.equal(preview.items[0].name, "晨跑打卡", "title 优先");
    assert.ok(preview.items[0].lossy.includes("color") && preview.items[0].lossy.includes("max-gap"));
    assert.equal(preview.items[1].name, "reading", "无 title 时文件名去扩展名");
    assert.equal(preview.items[1].lossy.length, 0);
    assert.deepEqual(preview.conflicts.map((c) => c.name), ["晨跑打卡"]);
    assert.equal(preview.identityNote, "externalRef-obsidian21", "Obsidian 走 obsidian21 幂等身份");
    assert.equal(preview.skippedEntries, 0);
}

/* —— 3. 汇总 + 确定性 —— */
{
    const plan = {
        habits: [{name: "冥想", unit: "次", measurable: false, target: 1, archived: false, schedule: {type: "daily"}, scheduleDegraded: false}],
        rows: [{name: "冥想", date: "2026-09-22", value: 1, unit: "次", binary: true}],
        measurableNames: [], skipDays: 0, unknownCells: 0, unmappableFrequency: [],
    };
    const preview = ip.buildLoopImportPreview(plan, []);
    const summary = ip.summarizeImportPreview(preview);
    assert.deepEqual(summary, {items: 1, totalDates: 1, conflictCount: 0, lossyCount: 0});
    assert.deepEqual(ip.buildLoopImportPreview(plan, []), ip.buildLoopImportPreview(plan, []), "同一输入两次构建深度相等");
}

/* —— 3b. T-1463 未知列：未识别列名计入损耗词表（不静默丢弃） —— */
{
    const plan = {
        habits: [{name: "晨跑", unit: "次", measurable: false, target: 1, archived: false, schedule: {type: "daily"}, scheduleDegraded: false}],
        rows: [{name: "晨跑", date: "2026-09-22", value: 1, unit: "次", binary: true}],
        measurableNames: [], skipDays: 0, unknownCells: 0, unmappableFrequency: [],
        unknownColumns: ["Reminder Time", "Custom Note"],
    };
    const preview = ip.buildLoopImportPreview(plan, []);
    assert.ok(preview.lossy.includes("unknown-columns"), "format-level lossy carries the unknown-columns token");
    assert.deepEqual(ip.buildLoopImportPreview(plan, []), ip.buildLoopImportPreview(plan, []), "unknown-column preview stays deterministic");
    const without = ip.buildLoopImportPreview({...plan, unknownColumns: []}, []);
    assert.ok(!without.lossy.includes("unknown-columns"), "no unknown columns → no token");
}

/* —— 4. 接线守门：两个导入处理器必须先构建预览再确认；i18n 双语 —— */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /buildLoopImportPreview\(plan, this\.store\.items/, "Loop 导入必须构建应用前预览（含现有项目冲突面）");
assert.match(indexSource, /buildObsidianImportPreview\(plan, this\.store\.items/, "Obsidian 导入必须构建应用前预览");
assert.match(indexSource, /summarizeImportPreview/, "预览必须汇总进确认文案");
assert.match(indexSource, /msg\.importUnknownColumns/, "T-1463：未知列名必须在确认弹窗点名");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["msg.importConflictsWarn", "msg.importLossyNote", "msg.importUnknownColumns"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(occurrences >= 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 5. 纯度：仅类型导入（运行时零依赖） + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "import-preview.ts"), "utf8");
const runtimeImports = (moduleSource.match(/^import(?! type)[^;]+;/gm) || []);
assert.equal(runtimeImports.length, 0, "预览模块保持运行时零依赖（plan 类型为 type-only 导入）");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

console.log("import-preview tests passed: Loop/Obsidian 统一预览/损耗词表/重名冲突/身份口径/确定性/接线守门/纯度 全部通过");
