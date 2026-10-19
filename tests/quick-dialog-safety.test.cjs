const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1791 & T-1792 守门测试：快速弹窗外部关闭/重开草稿保护与标题拖拽首开时序（D-380）。
   T-1791: closeQuickDialogFor、openQuickDialogFor 重置与 .b3-dialog__close 统一通过
           shouldProtectQuickDialogDraft 依据弹窗自身 root 的 page 与 isEditorFormDirty 进行离开确认，
           取消则保留草稿与弹窗；
   T-1792: bindQuickDialogFrameFor 标题拖拽与双击最大化通过 container 委托挂载，
           首开 header 渲染前、切页重绘后天然生效，并在 quickDialogFrameCleanup 中完整释放。 */

const sourceRoot = path.join(__dirname, "..", "src");
const quickSource = fs.readFileSync(path.join(sourceRoot, "render", "quick-dialog.ts"), "utf8");

/* 断言 1：T-1791 统一草稿保护钉 */
assert.match(
    quickSource,
    /function shouldProtectQuickDialogDraft\(host: QuickDialogHost, root: HTMLElement\): boolean/,
    "T-1791: shouldProtectQuickDialogDraft helper exists",
);
assert.match(
    quickSource,
    /host\.pageOfRoot\(root\) !== "editor"/,
    "T-1791: checks pageOfRoot(root) instead of global currentPage",
);
assert.match(
    quickSource,
    /isEditorFormDirty\(form \? new FormData\(form\) : undefined, baseline\)/,
    "T-1791: evaluates dirty state via isEditorFormDirty",
);
assert.match(
    quickSource,
    /closeQuickDialogFor[\s\S]*?shouldProtectQuickDialogDraft\(host, root\)[\s\S]*?msg\.quickCloseEditingConfirm/,
    "T-1791: closeQuickDialogFor protects dirty draft",
);
assert.match(
    quickSource,
    /openQuickDialogFor[\s\S]*?shouldProtectQuickDialogDraft\(host, currentRoot\)[\s\S]*?msg\.quickCloseEditingConfirm/,
    "T-1791: openQuickDialogFor protects dirty draft before resetting page",
);
assert.match(
    quickSource,
    /\.b3-dialog__close[\s\S]*?shouldProtectQuickDialogDraft\(host, root\)/,
    "T-1791: close button click capture checks shouldProtectQuickDialogDraft",
);

/* 断言 2：T-1792 标题拖拽与双击最大化首开绑定时序钉 */
assert.match(
    quickSource,
    /container\.addEventListener\("pointerdown", onContainerPointerDown\)/,
    "T-1792: container delegates pointerdown for header drag",
);
assert.match(
    quickSource,
    /container\.addEventListener\("dblclick", onContainerDoubleClick\)/,
    "T-1792: container delegates dblclick for fullscreen toggle",
);
assert.match(
    quickSource,
    /container\.removeEventListener\("pointerdown", onContainerPointerDown\)/,
    "T-1792: frame cleanup removes container pointerdown listener",
);
assert.match(
    quickSource,
    /container\.removeEventListener\("dblclick", onContainerDoubleClick\)/,
    "T-1792: frame cleanup removes container dblclick listener",
);
assert.doesNotMatch(
    quickSource,
    /header\?\.addEventListener\("pointerdown"/,
    "T-1792: direct header pointerdown query before render is eliminated",
);

/* 断言 3：纯函数与逻辑推演 */
const {isEditorFormDirty, formSignatureFromData} = require(path.join(sourceRoot, "features", "editor-draft.ts"));

// 干净表单
assert.equal(isEditorFormDirty(undefined, undefined), false);
assert.equal(isEditorFormDirty(undefined, "some-hash"), false);

console.log("quick-dialog-safety: all assertions passed");
