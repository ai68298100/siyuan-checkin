/* T-1360 建议执行范围扩展守门：schedule 进入执行白名单（深比较 + 结构校验），
   应用/撤销在克隆对象语义下正确，本地排期下调建议经确认流生成。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-suggestion-schedule-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/types.ts", "src/i18n.ts", "src/record-step.ts", "src/quota.ts", "src/rules.ts", "src/ui/labels.ts", "src/shared.ts", "src/model.ts", "src/features/record-notes.ts", "src/agent-suggestions.ts"].forEach(transpile);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const model = require(path.join(outputRoot, "src", "model.js"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {buildSuggestionChange, normalizeSuggestionChanges, normalizeSuggestionSchedule, createSuggestionEnvelope, applyConfirmedSuggestion, revertSuggestionApplication} = require(path.join(outputRoot, "src", "agent-suggestions.js"));

const item = {
    id: "i1", name: "阅读", icon: "📖", kind: "binary", target: 1, unit: "次",
    schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening",
    createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01",
    revisions: [], archivePeriods: [],
};
const store = model.createDefaultStore();
store.items = [item];

/* 结构校验：合法 quota 排期规范化；非法形态拒绝。 */
const quota = {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}};
assert.deepEqual(normalizeSuggestionSchedule(quota), quota);
assert.equal(normalizeSuggestionSchedule({type: "quota"}), undefined, "quota schedule without quota body is rejected");
assert.equal(normalizeSuggestionSchedule({type: "quota", quota: {period: "year", amount: 3, countMode: "dates"}}), undefined, "invalid period is rejected");
assert.equal(normalizeSuggestionSchedule({type: "weekly"}), undefined, "weekly without weekdays is rejected");
assert.equal(normalizeSuggestionSchedule("daily"), undefined, "non-object schedule is rejected");

/* 生成：daily → quota 产生变更；同值克隆被深比较识别为 no-op。 */
const change = buildSuggestionChange(item, "schedule", quota);
assert.ok(change, "schedule change must be produced for a different schedule");
assert.equal(change.field, "schedule");
assert.equal(buildSuggestionChange(item, "schedule", {type: "daily"}), undefined, "cloned identical schedule must be recognized as a no-op");

/* 归一：非法排期整条丢弃；合法值规范化且保留。 */
const items = [item];
const normalized = normalizeSuggestionChanges([change, {itemId: "i1", field: "schedule", before: {type: "daily"}, after: {type: "quota"}}, {itemId: "i1", field: "priority", before: "high", after: "high"}], items);
assert.equal(normalized.length, 1, "invalid schedule change is dropped, no-op priority is dropped");
assert.deepEqual(normalized[0].after, quota);

/* 确认后应用：before 深比较命中，schedule 落到 item；重放（after 已在位）冲突跳过。 */
const envelope = {...createSuggestionEnvelope({id: "sug-1", title: "改为弹性", reason: "r", changes: [change], requiresConfirmation: true}, "2026-09-21T08:00:00.000Z"), status: "confirmed", confirmedAt: "2026-09-21T08:00:00.000Z"};
const applied = applyConfirmedSuggestion(store, envelope);
assert.equal(applied.applied, 1);
const appliedItem = applied.store.items.find((entry) => entry.id === "i1");
assert.equal(appliedItem.schedule.type, "quota");
assert.equal(appliedItem.schedule.quota.amount, 3);
const replay = applyConfirmedSuggestion(applied.store, envelope);
assert.equal(replay.applied, 0, "second application must conflict (before no longer matches)");
assert.equal(replay.skipped, 1);

/* 撤销：after 仍在位才回滚到 before；用户后续修改（改回 daily）不回滚。 */
const reverted = revertSuggestionApplication(applied.store, envelope);
assert.equal(reverted.reverted, 1);
assert.equal(reverted.store.items.find((entry) => entry.id === "i1").schedule.type, "daily");
const userEdited = {...applied.store, items: applied.store.items.map((entry) => entry.id === "i1" ? {...entry, schedule: {type: "daily"}} : entry)};
const afterUserEdit = revertSuggestionApplication(userEdited, envelope);
assert.equal(afterUserEdit.reverted, 0, "later user edits win over suggestion revert");

fs.rmSync(outputRoot, {recursive: true, force: true});

/* ---------- 结构守门 ---------- */

const bind = fs.readFileSync("src/render/bind-page-navigation.ts", "utf8");
const reviewView = fs.readFileSync("src/render/review.ts", "utf8");
const i18nSource = fs.readFileSync("src/i18n.ts", "utf8");

assert.match(bind, /data-action='preview-agent-schedule-suggestion'/, "schedule suggestion entry must be bound");
assert.match(bind, /item\.schedule\.type !== "daily" \|\| item\.direction === "atMost"/, "schedule suggestions stay daily-only and never touch at-most items");
assert.match(bind, /buildSuggestionChange\(item, "schedule", \{type: "quota", quota: \{period: "week", amount: 3, countMode: "dates"\}\}\)/, "schedule suggestion targets a weekly-3 flexible quota");
assert.match(reviewView, /data-action="preview-agent-schedule-suggestion"/, "review hero must expose the schedule suggestion");
const zhDict = i18nSource.slice(i18nSource.indexOf("const zhCN"), i18nSource.indexOf("const enUS"));
const enDict = i18nSource.slice(i18nSource.indexOf("const enUS"));
for (const key of ["agent.localScheduleTitle", "agent.localScheduleReason", "review.heroSchedulePreview"]) {
    assert.ok(zhDict.includes(`"${key}"`), `zh dict missing ${key}`);
    assert.ok(enDict.includes(`"${key}"`), `en dict missing ${key}`);
}

console.log("schedule suggestion gates passed: whitelist+deep compare, structural validation, apply/replay/revert semantics, local generator, i18n");
