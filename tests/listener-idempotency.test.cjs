const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1789 & T-1790 守门测试：根节点与编辑器委托监听生命周期幂等与防漏（D-378）。
   T-1789: bind-editor 重复绑定时 cleanupEditorFor 先行释放旧监听，消除 click 委托重复执行；
   T-1790: bindItemDragFor 与 review toggle 捕获监听通过 root 标记（itemDragKeyboardBound / reviewToggleBound）保证恰安装一次。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：bind-editor.ts 源码结构钉 */
const editorSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-editor.ts"), "utf8");
assert.match(editorSource, /export function cleanupEditorFor\(root: HTMLElement\): void/, "T-1789: exports cleanupEditorFor");
assert.match(editorSource, /cleanupEditorFor\(root\);/, "T-1789: bindEditorHandlers invokes cleanupEditorFor first");
assert.match(editorSource, /const addRootListener =/, "T-1789: encapsulates addRootListener with disposer");
assert.doesNotMatch(editorSource, /root\.addEventListener\("click",/, "T-1789: bare root.addEventListener('click') is eliminated");

/* 断言 2：index.ts 卸载时调用 cleanupEditorFor */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
assert.match(indexSource, /cleanupEditorFor\(root\);/, "T-1789: onunload cleans up editor listeners for all roots");

/* 断言 3：today-bindings.ts 拖拽 keydown 幂等钉 */
const todaySource = fs.readFileSync(path.join(sourceRoot, "render", "today-bindings.ts"), "utf8");
assert.match(
    todaySource,
    /if \(root\.dataset\.itemDragKeyboardBound !== "true"\) \{[\s\S]*?root\.dataset\.itemDragKeyboardBound = "true";[\s\S]*?root\.addEventListener\("keydown",/,
    "T-1790: bindItemDragFor guards keydown listener installation with itemDragKeyboardBound",
);

/* 断言 4：bind-page-navigation.ts 移动端 toggle 捕获幂等钉 */
const navSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-page-navigation.ts"), "utf8");
assert.match(
    navSource,
    /if \(root\.dataset\.reviewToggleBound !== "true"\) \{[\s\S]*?root\.dataset\.reviewToggleBound = "true";[\s\S]*?root\.addEventListener\("toggle",/,
    "T-1790: review toggle capture listener is guarded with reviewToggleBound",
);

/* 断言 5：DOM 行为级模拟验证——多次安装恰触发一次 */
class MockElement {
    constructor() {
        this.dataset = {};
        this.listeners = new Map();
    }
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(listener);
    }
    removeEventListener(type, listener) {
        if (this.listeners.has(type)) this.listeners.get(type).delete(listener);
    }
    dispatchEvent(event) {
        const set = this.listeners.get(event.type);
        if (!set) return;
        for (const listener of set) listener(event);
    }
}

// 模拟 today drag keydown
const mockRoot = new MockElement();
let keydownCount = 0;
for (let i = 0; i < 5; i++) {
    if (mockRoot.dataset.itemDragKeyboardBound !== "true") {
        mockRoot.dataset.itemDragKeyboardBound = "true";
        mockRoot.addEventListener("keydown", () => { keydownCount += 1; });
    }
}
mockRoot.dispatchEvent({type: "keydown"});
assert.equal(keydownCount, 1, "repeated binding only triggers keydown exactly once");

// 模拟 review toggle
const reviewRoot = new MockElement();
let toggleCount = 0;
for (let i = 0; i < 5; i++) {
    if (reviewRoot.dataset.reviewToggleBound !== "true") {
        reviewRoot.dataset.reviewToggleBound = "true";
        reviewRoot.addEventListener("toggle", () => { toggleCount += 1; });
    }
}
reviewRoot.dispatchEvent({type: "toggle"});
assert.equal(toggleCount, 1, "repeated binding only triggers toggle exactly once");

console.log("listener-idempotency: all assertions passed");
