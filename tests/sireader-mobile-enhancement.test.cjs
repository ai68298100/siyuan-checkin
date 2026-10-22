// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* T-1882 守门测试：思阅最新 v2.5.6 深度联动升级
   1. 移动端生命周期 reader:mobile-open / reader:mobile-close 支持
   2. api-ready 事件监听与自动连接
   3. extractSireaderBookTitle 书名解析提取纯函数
   4. index.ts 与 sireader-adapter.ts 架构接线 */

console.log("Starting sireader-mobile-enhancement tests...");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src", "features", "sireader-adapter.ts"), "utf8");
const jsCode = ts.transpileModule(src, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const moduleFn = new Function("module", "exports", jsCode);
const mod = {exports: {}};
moduleFn(mod, mod.exports);
const {extractSireaderBookTitle, SireaderFocusTracker} = mod.exports;

/* ---------------------------------------------------------
   一、书名提取算法与纯函数验证
   --------------------------------------------------------- */

assert.equal(extractSireaderBookTitle(undefined), undefined);
assert.equal(extractSireaderBookTitle(""), undefined);
assert.equal(extractSireaderBookTitle("assets/20261020-abc.epub"), "20261020-abc");
assert.equal(extractSireaderBookTitle("assets/%E6%8E%8C%E6%8E%A7%E4%B9%A0%E6%83%AF.epub"), "掌控习惯");
assert.equal(extractSireaderBookTitle("siyuan-cloud://books/%E6%B7%B1%E5%85%A5%E7%90%86%E8%A7%A3%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%B3%BB%E7%BB%9F.pdf?page=1#toc"), "深入理解计算机系统");
assert.equal(extractSireaderBookTitle("/storage/books/ThePragmaticProgrammer.mobi"), "ThePragmaticProgrammer");

/* ---------------------------------------------------------
   二、移动端事件与书籍标题段落累计验证
   --------------------------------------------------------- */

const options = {
    toLocalDate: (ms) => "2026-10-22",
    nextMidnight: (ms) => ms + 86400000,
};

const tracker = new SireaderFocusTracker(options);

// 1. mobile-open 启动
tracker.handle("mobile-open", 1000, "assets/%E6%8E%8C%E6%8E%A7%E4%B9%A0%E6%83%AF.epub");
assert.equal(tracker.focusing, true);
assert.equal(tracker.activeBookTitle, "掌控习惯");

// 2. mobile-close 结算
const segments = tracker.handle("mobile-close", 1000 + 45 * 60 * 1000);
assert.equal(segments.length, 1);
assert.equal(segments[0].minutes, 45);
assert.equal(segments[0].bookTitle, "掌控习惯");
assert.equal(tracker.focusing, false);

/* ---------------------------------------------------------
   三、静态代码与架构接线断言
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.ok(srcIndex.includes('"reader:mobile-open"'), "index.ts must listen to reader:mobile-open");
assert.ok(srcIndex.includes('"reader:mobile-close"'), "index.ts must listen to reader:mobile-close");
assert.ok(srcIndex.includes('"sireader:api-ready"'), "index.ts must listen to sireader:api-ready");
assert.ok(srcIndex.includes("#思阅阅读 《"), "writeSireaderSegments must attach bookTitle to checkin note");

console.log("sireader-mobile-enhancement: all assertions passed successfully!");
