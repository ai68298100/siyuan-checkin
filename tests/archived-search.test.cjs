const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const styles = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
/* 归档视图已外置（15.0-A）：标记断言读 render/archived.ts。 */
const view = fs.readFileSync(path.join(root, "src", "render", "archived.ts"), "utf8");
const bindings = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");

assert.match(source, /private archivedQuery = "";/, "archive search state must be independent from history search");
assert.match(source, /renderArchivedView\(\{items: this\.store\.items, summaries: buildArchivedItemSummaries\(this\.store\.items, this\.store\.events/, "the shell must delegate archive summaries to the extracted view");
assert.match(view, /data-archived-search/, "archive page must expose its local search input");
assert.match(i18n, /"archived\.searchPlaceholder": "搜索名称、分组或单位"/, "search placeholder must stay in the dictionary (zh)");
assert.match(i18n, /"archived\.searchPlaceholder": "Search name, group or unit"/, "search placeholder must stay in the dictionary (en)");
assert.match(view, /\[item\.name, item\.group, item\.unit, item\.icon\][\s\S]*includes\(query\)/, "archive search must match useful item metadata");
assert.match(view, /data-action="clear-archived-query"/, "archive search must expose a clear action");
assert.match(view, /buildArchivedItemSummaries/, "archive rows must use a shared itemId event projection");
assert.match(view, /archived\.completedDays/, "archive rows must show cumulative completed days");
assert.match(view, /archived\.lastRecord/, "archive rows must show the latest check-in");
assert.match(i18n, /"archived\.completedDays": "累计达成 \{n\} 天"/, "completed-day copy must stay in the dictionary (zh)");
assert.match(i18n, /"archived\.completedDays": "\{n\} completed days"/, "completed-day copy must stay in the dictionary (en)");
assert.match(view, /data-restore-id[\s\S]*t\("archived\.restoreAria"/, "restore actions must identify their item");
assert.match(i18n, /"archived\.restoreAria": "恢复\{name\}"/, "restore aria label must stay in the dictionary");
const pluginOps = fs.readFileSync(path.join(root, "src", "plugin-ops.ts"), "utf8");
assert.match(pluginOps, /t\("msg\.restoredNamed", \{name: expectedItem\.name\}\)/, "successful restore must give named feedback");
assert.match(i18n, /"msg\.restoredNamed": "\[小驴打卡\] 已恢复「\{name\}」"/, "restore feedback must stay in the dictionary");
assert.match(view, /data-archived-select=/, "archive rows must expose accessible bulk selection");
assert.match(view, /data-archived-select-all/, "archive page must support selecting the filtered result set");
assert.match(view, /data-archived-bulk-toolbar/, "archive page must expose a dedicated bulk toolbar");
assert.match(bindings, /restoreArchivedItems\(ids\)/, "bulk restore must use one host transaction instead of N row actions");
assert.match(source, /private async restoreArchivedItems[\s\S]*?await this\.persist\(\)/, "bulk restore must persist once through the mutation queue");
assert.match(source, /private async deleteArchivedItems[\s\S]*?bulkDeleteConfirm/, "bulk delete must retain an impact confirmation");
assert.match(source, /private async deleteArchivedItems[\s\S]*?deleteItemsCascade/, "bulk delete must retain event tombstones through the linear batch projection");
assert.match(source, /for \(const event of this\.store\.events\) if \(ids\.has\(event\.itemId\)\) recordCount \+= 1;/, "bulk impact counting must scan history once");
assert.match(source, /private async deleteArchivedItems[\s\S]*?currentItems\.length !== items\.length \|\| currentRecordCount !== recordCount[\s\S]*?msg\.deleteImpactChanged/, "archive deletion must reject a stale cross-window confirmation");
assert.match(bindings, /data-archived-bulk-toolbar[\s\S]*?\|\| row \|\| button/, "row actions must share one mutual-exclusion boundary");
assert.match(bindings, /const candidates = action[\s\S]*?data-action/, "removed rows must restore focus to the nearest equivalent action");
/* 布局守门锁现行活规则（D-051）；宽度决策只认 lc5 容器，不认视口（D-016）。 */
assert.match(styles, /\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[^}]*justify-content:\s*space-between;/, "archive tools must have a stable desktop layout");
assert.match(styles, /@container lc5 \(max-width:\s*560px\)\s*\{[\s\S]*?\.lc-checkin--archived \.lc-checkin__archived-tools\s*\{[^}]*display:\s*grid;/, "archive tools must stack compactly in narrow containers");
assert.match(styles, /\.lc-checkin--archived \.lc-checkin__history-row \[data-action="restore-archived"\][^}]*grid-row:\s*2/, "narrow archive actions must move below row metadata");

/* —— T-1581/T-1594/T-1595 归档三件套：详情折叠、恢复预览确认、危险区隔离 —— */
assert.match(view, /export function buildArchivedItemDetails\(/, "归档详情投影必须为纯函数（可测/可复用）");
assert.match(view, /willResumeToday: isScheduledToday\(item, today\)/, "恢复预览必须核实是否重进今日排期");
assert.match(view, /data-archived-details/, "行内详情折叠容器在位");
assert.match(view, /data-archived-danger/, "危险区容器在位（与恢复批量隔离）");
assert.match(view, /archived\.dangerHint/, "危险区必须说明不可撤销与恢复点");
assert.match(bindings, /confirmArchivedRestore/, "恢复必须先经预览确认（重进今日排期数量）");
assert.match(bindings, /isScheduledToday/, "恢复预览复用 model 排期判定单一实现");
const archivedI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["archived.detailsSummary", "archived.ruleLabel", "archived.linkedOccasion", "archived.anchorLabel", "archived.externalRecords", "archived.resumeToday", "archived.resumeOff", "archived.dangerZone", "archived.dangerHint", "msg.archivedRestoreConfirm"]) {
    const count = archivedI18n.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} 必须中英双语齐备（当前 ${count}）`);
}

/* 纯函数行为：规则标签/关联名/外部计数/恢复预览/未归档排除。
   archived 的依赖（i18n/shared）用桩映射，model 闭包真实转译（isScheduledToday 单一实现）。 */
{
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-archived-details-"));
    const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
    for (const filename of ["src/date-keys.ts", "src/record-step.ts", "src/quota.ts", "src/rules.ts", "src/model.ts"]) {
        const target = path.join(dir, filename.replace(/\.ts$/, ".js"));
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, filename), "utf8"), {compilerOptions}).outputText);
    }
    const archivedRequire = (specifier) => {
        if (specifier === "../i18n") return {t: (key, params) => params ? `${key}:${JSON.stringify(params)}` : key};
        if (specifier === "../shared") return {escapeHtml: (value) => String(value), formatScheduleLabel: () => "每日", renderIconMarkup: () => ""};
        if (specifier === "../model") return require(path.join(dir, "src", "model.js"));
        throw new Error("unexpected dependency " + specifier);
    };
    const compiled = ts.transpileModule(fs.readFileSync(path.join(root, "src", "render", "archived.ts"), "utf8"), {compilerOptions}).outputText;
    const run = new Function("require", "exports", "module", compiled);
    const moduleShell = {exports: {}};
    run(archivedRequire, moduleShell.exports, moduleShell);
    const today = new Date(2026, 8, 29, 12);
    const archivedItem = {id: "arc", name: "旧项目", icon: "✓", kind: "number", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "", updatedAt: "", createdDate: "2026-01-01", archived: true, revisions: [], archivePeriods: [{startDate: "2026-06-01"}], noteAnchor: {blockId: "b1"}, linkedOccasionId: "o1"};
    const details = moduleShell.exports.buildArchivedItemDetails([archivedItem], new Map([["o1", "周年纪念"]]), [{id: "e1", itemId: "arc", occurredAt: "2026-06-01T01:00:00.000Z", localDate: "2026-06-01", value: 10, unit: "分钟", source: "api", externalRef: "x:1"}], today);
    const detail = details.get("arc");
    assert.ok(detail, "归档项必须有详情");
    assert.match(detail.ruleLabel, /每日/, "原规则标签来自 formatScheduleLabel 桩");
    assert.equal(detail.targetLabel, "30 分钟", "目标/单位标签");
    assert.equal(detail.linkedOccasionName, "周年纪念", "关联事项名解析");
    assert.equal(detail.anchorBlockId, "b1", "锚点块 ID 在位");
    assert.equal(detail.externalRefCount, 1, "外部来源记录计数");
    assert.equal(typeof detail.willResumeToday, "boolean", "恢复预览为布尔");
    assert.equal(moduleShell.exports.buildArchivedItemDetails([{...archivedItem, archived: false}], new Map(), [], today).size, 0, "未归档项不进详情");
    fs.rmSync(dir, {recursive: true, force: true});
}

console.log("Archived search and recovery structure checks passed.");
