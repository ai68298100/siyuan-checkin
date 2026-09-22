const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const sourceRoot = path.join(root, "src");
const read = (...parts) => fs.readFileSync(path.join(sourceRoot, ...parts), "utf8");

/* 结构守门：绑定入口、回写旁路、清理路径齐全。 */
const indexSource = read("index.ts");
const saveFormSource = read("render", "save-form.ts");
const editorSource = read("render", "editor.ts");
assert.match(indexSource, /private async writebackNoteAnchor\(/, "index implements the anchor writeback bypass");
assert.match(indexSource, /void this\.writebackNoteAnchor\(current, \{state: "done", value, unit: revision\.unit\}\)/, "recordEvent fires anchor writeback");
assert.match(indexSource, /void this\.writebackNoteAnchor\(current, \{state: "skip"\}\)/, "skip fires anchor writeback");
assert.match(indexSource, /void this\.writebackNoteAnchor\(entry\.item, \{state: "done", value: entry\.value, unit: entry\.revision\.unit\}\)/, "batch completion fires per-item writeback");
assert.match(indexSource, /async uninstall\(\)/, "uninstall clears anchor attributes");
assert.match(indexSource, /\[ANCHOR_ATTR_KEY\]: ""/, "cleanup clears only the plugin attr key");
assert.match(indexSource, /clearAnchorAttrBestEffort\(previousAnchor\.blockId\)/, "unbind clears the previous anchor");
assert.match(saveFormSource, /validateAnchorBlockId\(requestedAnchorBlock\)/, "save form validates the anchor id");
assert.match(saveFormSource, /editor\.anchorInvalid/, "invalid anchor ids are rejected with a message");
assert.match(editorSource, /name="anchorBlockId"/, "editor exposes the anchor input");
assert.match(editorSource, /name="anchorAppendNotes"/, "editor exposes the append-notes switch");
assert.match(read("render", "settings.ts"), /set\.auditAnchor/, "settings label the anchor audit type");
assert.match(read("features", "note-anchor.ts"), /export function buildAnchorNoteMarkdown/, "note markdown builder exists");
assert.match(indexSource, /appendNoteToAnchor\(current, buildAnchorNoteMarkdown\(/, "recordEvent and skip append notes through the builder");
assert.match(indexSource, /private async appendNoteToAnchor\(/, "index implements the append bypass");
assert.match(indexSource, /noteAnchor\?\.appendNotes/, "append honors the opt-in switch");
assert.match(indexSource, /channel: "append"/, "append failures are audited distinctly");
assert.match(indexSource, /const resolved = await resolveAnchorBlock\(/, "writeback pre-checks block existence (suspension detection)");
assert.match(indexSource, /channel: "resolve"/, "suspension failures are audited with the resolve channel");
assert.match(indexSource, /anchorSuspended: \(\(\) =>/, "editor render surfaces the suspension flag");
assert.match(read("render", "editor.ts"), /editor\.anchorSuspended/, "editor shows a suspension warning");

/* 只用已验证内核端点：note-anchor 模块内的 /api/ 调用必须全部在白名单内。 */
const anchorSource = read("features", "note-anchor.ts");
const endpoints = [...anchorSource.matchAll(/"\/api\/[A-Za-z/-]+"/g)].map((match) => match[0].replace(/"/g, ""));
const allowed = new Set(["/api/block/getBlockInfo", "/api/attr/setBlockAttrs", "/api/block/appendBlock"]);
for (const endpoint of endpoints) assert.ok(allowed.has(endpoint), `unverified kernel endpoint: ${endpoint}`);
assert.ok(endpoints.length >= 3, "expected the verified endpoints to be present");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-note-anchor-"));
for (const filename of ["types.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "i18n.ts", "features/note-anchor.ts"]) {
    const target = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(read(filename), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText);
}
const model = require(path.join(outputRoot, "model.js"));
const anchor = require(path.join(outputRoot, "features", "note-anchor.js"));
const {t} = require(path.join(outputRoot, "i18n.js"));

/* 块 ID 校验。 */
assert.equal(anchor.validateAnchorBlockId("  ABCdef123-_456789012345 "), "ABCdef123-_456789012345");
assert.equal(anchor.validateAnchorBlockId("short"), undefined, "too-short ids rejected");
assert.equal(anchor.validateAnchorBlockId("包含中文的id十位以上"), undefined, "non-latin ids rejected");
assert.equal(anchor.validateAnchorBlockId("has space1234567890"), undefined, "spaces rejected");

/* 属性值格式。 */
assert.equal(anchor.buildAnchorAttrValue("2026-09-19", "已完成 3 次"), "2026-09-19 · 已完成 3 次");

/* T-1232 备注块 markdown：带日期戳、换行折叠、空备注省略冒号。 */
assert.equal(
    anchor.buildAnchorNoteMarkdown({date: "2026-09-19", itemName: "阅读", stateText: "已完成", note: "读完第二章\n做了笔记"}),
    "- 2026-09-19 已完成 **阅读**：读完第二章 做了笔记",
);
assert.equal(
    anchor.buildAnchorNoteMarkdown({date: "2026-09-19", itemName: "阅读", stateText: "已跳过", note: "   "}),
    "- 2026-09-19 已跳过 **阅读**",
);

/* 内核调用封装：写/清只动本插件键，code!=0 视为失败。（CJS 无顶层 await，异步段包裹执行） */
(async () => {
    const calls = [];
    const fakePost = async (url, payload) => { calls.push({url, payload}); return {code: 0}; };
    const writeResult = await anchor.writeAnchorAttr(fakePost, "ABCdef123-_456789012345", "2026-09-19 · 已完成");
    assert.equal(writeResult.ok, true);
    assert.equal(calls[0].url, "/api/attr/setBlockAttrs");
    assert.deepEqual(calls[0].payload.attrs, {"custom-lv-checkin": "2026-09-19 · 已完成"}, "writes exactly the plugin attr key");
    const clearResult = await anchor.clearAnchorAttr(fakePost, "ABCdef123-_456789012345");
    assert.equal(clearResult.ok, true);
    assert.equal(calls[1].payload.attrs["custom-lv-checkin"], "", "clear uses the empty-string removal semantics");
    const failing = async () => ({code: -1, msg: "block-not-found"});
    assert.equal((await anchor.resolveAnchorBlock(failing, "ABCdef123-_456789012345")).reason, "block-not-found", "resolution failures surface the kernel reason");

    /* v18.1.x：解析成功携带根文档信息（rootID/box），供跳转跟随块移动与缓存刷新。 */
    const resolving = async () => ({code: 0, data: {rootID: "20260923090000-rootdoc", box: "20250101120000-notebook"}});
    const resolvedInfo = await anchor.resolveAnchorBlock(resolving, "ABCdef123-_456789012345");
    assert.equal(resolvedInfo.ok, true);
    assert.equal(resolvedInfo.rootID, "20260923090000-rootdoc", "success returns the owning root document");
    assert.equal(resolvedInfo.notebook, "20250101120000-notebook", "success returns the owning notebook");
    const missingRoot = async () => ({code: 0, data: {}});
    const resolvedBare = await anchor.resolveAnchorBlock(missingRoot, "ABCdef123-_456789012345");
    assert.equal(resolvedBare.ok, true, "resolution still succeeds without root info");
    assert.equal(resolvedBare.rootID, undefined, "missing rootID stays undefined, never fabricated");

    /* 跳转重解析与缓存一致性接线（index.ts）。 */
    assert.match(indexSource, /const fresh = await resolveAnchorBlock\(/, "anchor jump must re-resolve before opening (block moves are followed)");
    assert.match(indexSource, /this\.anchorDocCache\.set\(blockId, \{doc: resolved\.rootID/, "writeback resolution must refresh the jump cache");
    assert.match(indexSource, /this\.anchorDocCache\.delete\(blockId\)/, "failed resolution must invalidate the stale cache entry");
    assert.match(indexSource, /msg\.anchorUnreachable/, "unreachable anchors degrade to insights with a readable message");
    for (const key of ["msg.anchorUnreachable"]) {
        assert.equal(fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8").split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
    }

    /* 有界重试：首败重试一次，两败返回最后原因。 */
    let attempts = 0;
    const flaky = async () => { attempts += 1; return attempts < 2 ? {ok: false, reason: "timeout"} : {ok: true}; };
    const retried = await anchor.withBoundedRetry(flaky, {attempts: 2, retryDelayMs: 0});
    assert.equal(retried.ok, true, "second attempt recovers");
    assert.equal(attempts, 2, "retry is bounded");
    let alwaysFailCount = 0;
    const alwaysFail = async () => { alwaysFailCount += 1; return {ok: false, reason: "gone"}; };
    const exhausted = await anchor.withBoundedRetry(alwaysFail, {attempts: 2, retryDelayMs: 0});
    assert.equal(exhausted.ok, false);
    assert.equal(exhausted.reason, "gone");
    assert.equal(alwaysFailCount, 2, "attempts never exceed the bound");

    /* normalizeItem：合法锚点保留、appendNotes 仅真值物化、非法锚点剔除。 */
    const baseItem = {id: "i1", name: "阅读", icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", createdDate: "2026-09-01", revisions: [], archivePeriods: []};
    const withAnchor = model.normalizeItem({...baseItem, noteAnchor: {blockId: "ABCdef123-_456789012345", appendNotes: true}});
    assert.deepEqual(withAnchor.noteAnchor, {blockId: "ABCdef123-_456789012345", appendNotes: true});
    const withoutAppend = model.normalizeItem({...baseItem, noteAnchor: {blockId: "ABCdef123-_456789012345", appendNotes: false}});
    assert.deepEqual(withoutAppend.noteAnchor, {blockId: "ABCdef123-_456789012345"}, "false appendNotes is not materialized");
    const invalidAnchor = model.normalizeItem({...baseItem, noteAnchor: {blockId: "bad id"}});
    assert.equal(invalidAnchor.noteAnchor, undefined, "invalid anchors are dropped");

    /* i18n 键中英齐全。 */
    const {t: tFn, setPluginLanguage} = require(path.join(outputRoot, "i18n.js"));
    for (const key of ["editor.anchorTitle", "editor.anchorPlaceholder", "editor.anchorHint", "editor.anchorAppend", "editor.anchorInvalid", "anchor.stateDone", "anchor.stateSkip", "anchor.stateUnskip", "anchor.streakSuffix", "set.auditAnchor"]) {
        setPluginLanguage("zh-CN");
        const zh = tFn(key);
        setPluginLanguage("en-US");
        const en = tFn(key);
        setPluginLanguage("zh-CN");
        assert.ok(zh && zh !== key, `zh covers ${key}`);
        assert.ok(en && en !== key && en !== zh, `en covers ${key}`);
    }

    console.log("Note anchor checks passed: id validation, attr payload semantics, bounded retry, normalization, cleanup and i18n coverage.");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
