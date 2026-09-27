/* T-1490 自动记录信任层测试。
   只读投影：来源徽标（source.* 复用）、命中原因派生（阈值/完读/笔记/快捷指令/番茄/
   LifeLog）、fail-closed（口径已变不冒认、未知来源降级 api、手动无原因）、确定性；
   接线守门：回顾页历史行徽标+原因+既有撤销通道、日志行徽标、宿主阈值快照透传、
   墓碑通道未被绕过；双语与纯度。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const sourceRoot = path.join(root, "src");

/* 独立转译单文件（零运行时依赖，可直接加载）。 */
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-record-trust-"));
const target = path.join(dir, "record-trust.js");
fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(sourceRoot, "features", "record-trust.ts"), "utf8"), {compilerOptions}).outputText);
const rt = require(target);

const base = {source: "sireader", value: 32, unit: "分钟", externalRef: "sireader:item-1:2026-06-10"};

/* —— 1. 自动完成判定与来源键复用 —— */
assert.equal(rt.buildRecordTrust(base).auto, true);
assert.deepEqual(rt.buildRecordTrust(base).sourceKey, "source.sireader", "来源键复用既有 source.* 词汇");
const manual = rt.buildRecordTrust({source: "manual", value: 1, unit: "次"});
assert.equal(manual.auto, false, "手动记录无徽标");
assert.equal(manual.reasonKey, undefined, "手动记录无命中原因");
/* 未知来源降级 api 徽标（与宿主归一化口径一致）。 */
assert.equal(rt.buildRecordTrust({source: "mystery", value: 1, unit: "次"}).sourceKey, "source.api");

/* —— 2. 阈值结算原因：达标才解释，口径已变（值低于当前阈值）不冒认 —— */
const threshold = {threshold: {value: 30}};
const hit = rt.buildRecordTrust(base, threshold);
assert.equal(hit.reasonKey, "trust.reasonThreshold");
assert.deepEqual(hit.reasonParams, {value: 32, threshold: 30, unit: "分钟"});
assert.equal(rt.buildRecordTrust({...base, value: 20}, threshold).reasonKey, undefined, "低于当前阈值不编造解释");
assert.equal(rt.buildRecordTrust(base).reasonKey, undefined, "无绑定口径不派生阈值原因");
assert.equal(rt.buildRecordTrust({...base, source: "siplayer"}, threshold).reasonKey, "trust.reasonThreshold", "思播同走阈值口径");
assert.equal(rt.buildRecordTrust({...base, source: "import"}, threshold).reasonKey, undefined, "导入不吃阈值解释");

/* —— 3. externalRef 前缀派生：完读/笔记/快捷指令/番茄/LifeLog —— */
const finish = rt.buildRecordTrust({source: "weread", value: 1, unit: "本", externalRef: "weread:it1:finish:bk9:2026-06-10", note: "三体"});
assert.equal(finish.reasonKey, "trust.reasonFinish");
assert.deepEqual(finish.reasonParams, {title: "三体"});
assert.equal(rt.buildRecordTrust({source: "weread", value: 1, unit: "本", externalRef: "weread:it1:finish:bk9:2026-06-10"}).reasonKey, undefined, "无书名不给完读原因");
const notes = rt.buildRecordTrust({source: "weread", value: 5, unit: "条", externalRef: "weread:it1:notes:2026-06-09"});
assert.equal(notes.reasonKey, "trust.reasonNotes");
const inbox = rt.buildRecordTrust({source: "api", value: 6543, unit: "步", externalRef: "health:it1:steps:2026-06-10"});
assert.equal(inbox.reasonKey, "trust.reasonInbox", "快捷指令（健康收件箱）来源可解释");
const tomato = rt.buildRecordTrust({source: "tomato", value: 25, unit: "分钟"});
assert.equal(tomato.reasonKey, "trust.reasonTomato");
assert.equal(rt.buildRecordTrust({source: "yeguif", value: 2, unit: "次"}).reasonKey, "trust.reasonYeguif");
/* 阈值来源但带完读前缀：前缀口径优先且无书名时不回落阈值（宁可少说）。 */
assert.equal(rt.buildRecordTrust({...base, source: "weread", externalRef: "weread:i:finish:b:d"}, threshold).reasonKey, undefined);

/* —— 4. 确定性 —— */
assert.deepEqual(rt.buildRecordTrust(base, threshold), rt.buildRecordTrust(base, threshold));

/* —— 5. 接线守门：回顾页历史行 + 日志行 + 宿主阈值快照 + 既有撤销通道 —— */
const reviewSource = fs.readFileSync(path.join(sourceRoot, "render", "review.ts"), "utf8");
assert.match(reviewSource, /buildRecordTrust\(event, \{threshold: ctx\.trustThresholds\?/, "历史行必须用信任投影派生徽标与原因");
assert.match(reviewSource, /lc-checkin__source-badge/, "历史行必须有来源徽标");
assert.match(reviewSource, /lc-checkin__record-reason/, "历史行必须有命中原因");
assert.match(reviewSource, /data-history-event-id/, "一键撤销必须沿用既有墓碑通道按钮");
const fragmentsSource = fs.readFileSync(path.join(sourceRoot, "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /const trust = buildRecordTrust\(event\)/, "日志行必须用信任投影呈现来源徽标");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(indexSource, /trustThresholds: \(\[/, "宿主必须透传当前结算绑定快照");
const bindNavSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindNavSource, /removeEvents\(host\.store, \[event\], moment\.occurredAt\)/, "撤销路径必须经 removeEvents（自动写墓碑）");
const modelSource = fs.readFileSync(path.join(sourceRoot, "model.ts"), "utf8");
assert.match(modelSource, /tombstonesByEventId\.set/, "墓碑写入逻辑保持单一实现未被绕过");

/* —— 6. 双语键齐备 —— */
const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");
for (const key of ["trust.reasonThreshold", "trust.reasonFinish", "trust.reasonNotes", "trust.reasonInbox", "trust.reasonTomato", "trust.reasonYeguif"]) {
    const occurrences = i18nSource.split(`"${key}"`).length - 1;
    assert.equal(occurrences, 2, `${key} 必须中英双语齐备（当前 ${occurrences} 处）`);
}

/* —— 7. 纯度：record-trust 仅类型导入 + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(sourceRoot, "features", "record-trust.ts"), "utf8");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(/, "禁止隐式时钟");
const bareImports = moduleSource.split("\n").filter((line) => /^import /.test(line) && !/^import type /.test(line));
assert.deepEqual(bareImports, [], "仅允许 import type（零运行时依赖）");

console.log("record-trust tests passed: 来源徽标复用/命中原因派生（阈值达标/完读/笔记/快捷指令/番茄/LifeLog）/fail-closed 不冒认/确定性 + 历史行与日志行接线 + 墓碑通道未绕过 + 双语与纯度 全部通过");
