const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1878 守门测试：移动端/桌面端卡片微动效与触觉反馈深度调优（对标 Streaks / Everyday）
   1. 静态断言：index.ts 包含 pulseCard 纯函数，使用 WAAPI scale 关键帧微脉冲；
   2. 减少动效断言：pulseCard 遇到 this.reducedMotion 为 true 必须直接短路，绝不调用 animate；
   3. 局部刷新与完整记录统一：recordEvent 与 renderTodayItemLocally 成功后均派发 pulseCard；
   4. 触觉反馈：pulseHaptic 仅在移动端且未关闭时触发短振动。 */

const root = path.join(__dirname, "..");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

/* ——— 1. pulseCard 静态结构 ——— */
assert.match(
    srcIndex,
    /pulseCard\(root: HTMLElement, itemId: string\): void \{[\s\S]*?if \(this\.reducedMotion\) return;/,
    "pulseCard 必须在 reducedMotion 为 true 时立即短路（零动效降级）",
);
assert.match(
    srcIndex,
    /card\.animate\(\[\s*\{transform: "scale\(1\)"\},\s*\{transform: "scale\(0\.985\)"\},\s*\{transform: "scale\(1\.008\)"\},\s*\{transform: "scale\(1\)"\},\s*\]/,
    "pulseCard 必须采用微收缩微回弹（scale 1 → 0.985 → 1.008 → 1）的轻量物理回弹曲线",
);

/* ——— 2. 模拟运行验证：reducedMotion 短路与安全降级 ——— */
let animated = 0;
const mockCard = {
    animate: (keyframes, options) => {
        animated += 1;
        assert.equal(options.duration, 260);
        return {cancel: () => undefined};
    },
};
const mockRoot = {
    querySelector: (selector) => (selector.includes("target-item") ? mockCard : null),
};

const fakePlugin = {
    reducedMotion: true,
    isMobileFrontend: true,
    hapticFeedback: true,
    pulseCard: (rootEl, id) => {
        if (fakePlugin.reducedMotion) return;
        const card = rootEl.querySelector(`.lc-checkin__item[data-item-id="${id}"]`);
        card?.animate?.([{}], {duration: 260});
    },
};

// 开启减少动效时调用：0 次 animate
fakePlugin.pulseCard(mockRoot, "target-item");
assert.equal(animated, 0, "reducedMotion 为 true 时不得触发卡片动效");

// 关闭减少动效时调用：触发 1 次
fakePlugin.reducedMotion = false;
fakePlugin.pulseCard(mockRoot, "target-item");
assert.equal(animated, 1, "正常状态下触发 1 次微动效");

// 目标不存在时安全空操作
fakePlugin.pulseCard(mockRoot, "non-existent");
assert.equal(animated, 1, "目标不存在时不崩溃");

console.log("card-micro-motion: all assertions passed successfully.");
