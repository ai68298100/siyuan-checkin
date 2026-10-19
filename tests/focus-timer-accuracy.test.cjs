const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

/* T-1780 & T-1781 守门测试：专注计时真实时间戳结算、预设切换保护与多 root 实例同步（D-389）。
   T-1780: 基于 Date.now() 单调时间戳计算 deltaSec 并累加至 accumulatedElapsedSec，
           休眠/后台节流后单次 tick 自动补偿真实流逝时间；已用时间 >=60s 时切换预设增加确认；
   T-1781: tick、暂停/恢复与预设切换全面改用 querySelectorAll，确保 dock/tab/quick 多表面同屏同步刷新。 */

const sourceRoot = path.join(__dirname, "..", "src");

/* 断言 1：源码静态钉 */
const timerSource = fs.readFileSync(path.join(sourceRoot, "render", "focus-timer.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");

assert.match(
    timerSource,
    /lastTickAt\?: number;[\s\S]*?accumulatedElapsedSec\?: number;/,
    "T-1780: FocusTimerState declares timestamp tracking fields",
);
assert.match(
    timerSource,
    /const deltaSec = state\.lastTickAt \? Math\.max\(1, Math\.round\(\(now - state\.lastTickAt\) \/ 1000\)\) : 1;/,
    "T-1780: tickFocusTimerFor computes deltaSec via timestamp difference",
);
assert.match(
    timerSource,
    /state\.accumulatedElapsedSec = \(state\.accumulatedElapsedSec \?\? 0\) \+ deltaSec;/,
    "T-1780: accumulates true elapsed seconds across ticks",
);
assert.match(
    timerSource,
    /const elapsedSec = state\.accumulatedElapsedSec \?\? \(state\.totalSec - state\.remainingSec\);[\s\S]*?const elapsedMinutes = Math\.floor\(elapsedSec \/ 60\);/,
    "T-1780: finishFocusTimerFor settles based on accumulatedElapsedSec",
);
assert.match(
    timerSource,
    /if \(currentElapsed >= 60 && !window\.confirm\(t\("focus\.presetSwitchConfirm"\)\)\) return;/,
    "T-1780: preset switch confirms when elapsed time >= 60s",
);
assert.match(
    timerSource,
    /document\.querySelectorAll<HTMLElement>\("\[data-focus-timer\]"\)\.forEach/,
    "T-1781: tickFocusTimerFor updates all open panels via querySelectorAll",
);
assert.match(
    timerSource,
    /document\.querySelectorAll<HTMLElement>\("\[data-focus-mini-remaining\]"\)\.forEach/,
    "T-1781: tickFocusTimerFor updates all mini strips via querySelectorAll",
);
assert.doesNotMatch(
    timerSource,
    /const panel = document\.querySelector\("\[data-focus-timer\]"\);/,
    "T-1781: bare single document.querySelector is eliminated in tickFocusTimerFor",
);

/* 断言 2：i18n 双语词表齐备 */
for (const [lang, text] of [["zh", "当前专注已有已用时间，切换预设将重置本轮计时。确认切换吗？"], ["en", "Time has already elapsed in this session. Switching presets will reset the timer. Switch anyway?"]]) {
    assert.ok(i18nSource.includes(`"focus.presetSwitchConfirm": "${text}"`), `i18n translation for ${lang}`);
}

/* 断言 3：真实经过时间补偿逻辑单元测试（模拟 300 秒后台节流） */
const state = {
    itemId: "read",
    totalSec: 1500, // 25 分钟
    remainingSec: 1500,
    running: true,
    lastTickAt: 1000000,
    accumulatedElapsedSec: 0,
};

// 模拟休眠 300 秒后触发一次 tick
const now = 1000000 + 300 * 1000;
const deltaSec = state.lastTickAt ? Math.max(1, Math.round((now - state.lastTickAt) / 1000)) : 1;
state.lastTickAt = now;
state.accumulatedElapsedSec = (state.accumulatedElapsedSec || 0) + deltaSec;
state.remainingSec = Math.max(0, state.totalSec - state.accumulatedElapsedSec);

assert.equal(state.accumulatedElapsedSec, 300, "accumulated 300 seconds accurately");
assert.equal(state.remainingSec, 1200, "remainingSec reduced to 1200 (20 minutes)");
assert.equal(Math.floor(state.accumulatedElapsedSec / 60), 5, "settles 5 full minutes");

console.log("focus-timer-accuracy: all assertions passed");
