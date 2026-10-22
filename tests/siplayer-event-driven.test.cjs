// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* T-1883 守门测试：思播最新 v2.0.9 事件驱动与媒体标题接入升级
   1. extractSiplayerMediaTitle 标题提取纯函数
   2. mediaChanged 与 playerDestroy 监听与销毁闭环
   3. 播放段携带 mediaTitle 与打卡事件备注
   4. index.ts 与 siplayer-adapter.ts 架构接线 */

console.log("Starting siplayer-event-driven tests...");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "src", "features", "siplayer-adapter.ts"), "utf8");
const jsCode = ts.transpileModule(src, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
const moduleFn = new Function("module", "exports", jsCode);
const mod = {exports: {}};
moduleFn(mod, mod.exports);
const {extractSiplayerMediaTitle, SiplayerPlaybackTracker} = mod.exports;

/* ---------------------------------------------------------
   一、媒体标题提取纯函数验证
   --------------------------------------------------------- */

assert.equal(extractSiplayerMediaTitle(undefined), undefined);
assert.equal(extractSiplayerMediaTitle(null), undefined);
assert.equal(extractSiplayerMediaTitle({title: "深入理解计算机系统 第01讲"}), "深入理解计算机系统 第01讲");
assert.equal(extractSiplayerMediaTitle({name: "Vue3源码解析"}), "Vue3源码解析");
assert.equal(extractSiplayerMediaTitle({url: "siyuan-cloud://videos/%E8%AE%BE%E8%AE%A1%E6%A8%A1%E5%BC%8F.mp4"}), "设计模式");
assert.equal(extractSiplayerMediaTitle({url: "assets/lecture-02.flv?auth=token"}), "lecture-02");

/* ---------------------------------------------------------
   二、采样段携带 mediaTitle 累计与 flush 验证
   --------------------------------------------------------- */

const tracker = new SiplayerPlaybackTracker({
    toLocalDate: (ms) => "2026-10-22",
    nextMidnight: (ms) => ms + 86400000,
    sampleIntervalMs: 15_000,
});

// 1. 开始在播并传入媒体标题
tracker.sample(true, 1000, "CSAPP公开课");
assert.equal(tracker.playing, true);
assert.equal(tracker.activeMediaTitle, "CSAPP公开课");

// 2. 正常采样
tracker.sample(true, 1000 + 15000);
tracker.sample(true, 1000 + 30000);
tracker.sample(true, 1000 + 45000);
tracker.sample(true, 1000 + 60000);

// 3. 停止播放（触发 flush 结算）
const segments = tracker.sample(false, 1000 + 75000);
assert.equal(segments.length, 1);
assert.equal(segments[0].minutes, 1);
assert.equal(segments[0].mediaTitle, "CSAPP公开课");
assert.equal(tracker.playing, false);

/* ---------------------------------------------------------
   三、静态代码与架构接线断言
   --------------------------------------------------------- */

const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.ok(srcIndex.includes('window.addEventListener("mediaChanged"'), "index.ts must listen to mediaChanged");
assert.ok(srcIndex.includes('window.addEventListener("playerDestroy"'), "index.ts must listen to playerDestroy");
assert.ok(srcIndex.includes("extractSiplayerMediaTitle(controller.getCurrentMedia())"), "index.ts must query current media title");
assert.ok(srcIndex.includes("#思播播放 《"), "writeSiplayerSegments must attach mediaTitle to checkin note");

console.log("siplayer-event-driven: all assertions passed successfully!");
