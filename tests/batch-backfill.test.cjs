/* T-1511 批量补记实际数量与提交预览守门：
   纯分类（已存在/排期不适用/限额戒除/问卷排除、二值固定 1、数值逐项填写且
   零/负/非法/缺失不提交、不默认目标值）、提交计划重校验、
   宿主与渲染接线（预览面板/输入草稿/提交确认计数/取消）与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-batch-backfill-"));
const load = (relative) => {
    const target = path.join(dir, relative.replace(/[\\/]/g, "_"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const backfill = load("features/batch-backfill.ts");

const snapshot = (overrides = {}) => ({id: "a", name: "拉伸", hasEvent: false, scheduled: true, kind: "duration", unit: "分钟", recordStep: 5, atMost: false, hasJournal: false, ...overrides});

/* —— 1. 分类优先级：已存在 → 排期 → 限额/戒除 → 问卷 → 类型。 —— */
{
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({hasEvent: true})).state, "existing");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({hasEvent: true})).reasonKey, "review.batchReasonExisting");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({scheduled: false})).state, "off-schedule");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({atMost: true})).state, "unsupported");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({atMost: true})).reasonKey, "review.batchReasonLimit");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({hasJournal: true})).state, "unsupported");
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({hasJournal: true})).reasonKey, "review.batchReasonJournal");
    /* 已存在优先于一切：问卷+已存在按已存在呈现。 */
    assert.equal(backfill.classifyBatchBackfillItem(snapshot({hasEvent: true, hasJournal: true})).state, "existing");
}

/* —— 2. 数值边界：二值固定 1；数值逐项填写，空/零/负/非法不提交且不默认目标值。 —— */
{
    const binary = backfill.classifyBatchBackfillItem(snapshot({kind: "binary", unit: "次"}));
    assert.equal(binary.inputMode, "none");
    assert.equal(binary.value, 1);
    assert.ok(!binary.errorKey);
    const missing = backfill.classifyBatchBackfillItem(snapshot(), "");
    assert.equal(missing.errorKey, "review.batchValueMissing", "numeric value is never defaulted to the target");
    assert.equal(missing.value, undefined);
    for (const invalid of ["0", "-3", "abc", "1e999"]) {
        const entry = backfill.classifyBatchBackfillItem(snapshot(), invalid);
        assert.equal(entry.errorKey, "review.batchValueInvalid", `invalid value rejected: ${invalid}`);
        assert.equal(entry.value, undefined);
    }
    const ok = backfill.classifyBatchBackfillItem(snapshot(), "20");
    assert.equal(ok.state, "ready");
    assert.equal(ok.value, 20);
    assert.ok(!ok.errorKey);
}

/* —— 3. 预览与提交计划：readyCount 只计可提交；提交计划过滤非法条目。 —— */
{
    const previews = backfill.buildBatchBackfillPreview([
        snapshot({id: "a"}),
        snapshot({id: "b", hasEvent: true}),
        snapshot({id: "c", kind: "binary"}),
        snapshot({id: "d", scheduled: false}),
        snapshot({id: "e", atMost: true}),
    ], {a: "20", c: ""});
    assert.equal(previews.readyCount, 2, "only a (20 min) and c (binary 1) are submittable");
    assert.deepEqual(backfill.planBatchBackfillSubmit(
        backfill.buildBatchBackfillPreview === undefined ? [] : [
            snapshot({id: "a"}),
            snapshot({id: "b", hasEvent: true}),
            snapshot({id: "c", kind: "binary"}),
        ], {a: "20", c: "", b: "9"}),
    [{itemId: "a", value: 20}, {itemId: "c", value: 1}], "submit plan drops existing/missing entries and keeps binary 1");
    /* 确定性。 */
    assert.deepEqual(backfill.buildBatchBackfillPreview([snapshot()], {a: "7"}), backfill.buildBatchBackfillPreview([snapshot()], {a: "7"}));
}

/* —— 4. 宿主与渲染接线。 —— */
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /async recordHistoryBatchEntries\(date: string, entries: ReadonlyArray<\{itemId: string; value: number\}>, root\?: HTMLElement\)/, "host exposes the actual-amount submit for the originating root");
assert.match(indexSource, /planBatchBackfillSubmit\(this\.batchBackfillSnapshots\(date, requested\), values\)/, "submit re-validates against the current store inside the mutation");
assert.match(indexSource, /historyBatchPreviewOpen = false;[\s\S]*?historyBatchValues = \{\};/, "successful submit clears preview state");
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /data-batch-preview/, "preview panel renders in the records workspace");
assert.match(reviewSource, /data-batch-value=/, "numeric entries expose actual-value inputs");
assert.match(reviewSource, /data-ready-count="\$\{batchPreview\.readyCount\}"/, "submit button carries the submittable count");
assert.match(reviewSource, /t\(entry\.reasonKey\)/, "exclusion reasons render through the module keys");
assert.equal(backfill.BATCH_BACKFILL_UNSUPPORTED_JOURNAL, "review.batchReasonJournal", "journal exclusion has its own reason key");
const bindingsSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindingsSource, /writeReviewValue\("historyBatchPreviewOpen", true\)/, "record action opens the originating root's preview instead of submitting");
assert.match(bindingsSource, /"\[data-batch-submit\]"/, "submit is bound");
assert.match(bindingsSource, /"\[data-batch-cancel\]"/, "cancel is bound");
assert.match(bindingsSource, /review\.batchSubmitConfirm/, "submit asks for confirmation with the count");
assert.match(bindingsSource, /input\.addEventListener\("input", /, "value draft updates without re-render (IME safe)");
assert.match(bindingsSource, /try \{[\s\S]*host\.recordHistoryBatch\([\s\S]*catch \{[\s\S]*msg\.saveFail/, "skip batch rejects surface a recoverable save failure");
assert.match(bindingsSource, /data-batch-cancel[\s\S]*\.disabled = true/, "submit disables cancel while the batch is pending");

/* —— 5. 双语。 —— */
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["review.batchPreviewAria", "review.batchPreviewHint", "review.batchValuePlaceholder", "review.batchValueAria", "review.batchSubmit", "review.batchSubmitConfirm", "review.batchCancel", "review.batchBinaryFixed", "review.batchReasonExisting", "review.batchReasonOffSchedule", "review.batchReasonLimit", "review.batchReasonJournal", "review.batchValueMissing", "review.batchValueInvalid"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("batch backfill gates passed: classification priority, actual-amount inputs (no target defaulting), zero/negative/invalid rejection, submit re-validation, preview wiring and bilingual copy.");
