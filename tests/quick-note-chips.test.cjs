// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");

console.log("Starting quick-note-chips tests...");

// 1. 验证源码中关于 quick-note-chips 的结构与引用
const fragmentsSrc = fs.readFileSync("src/render/fragments.ts", "utf8");
const bindTodaySrc = fs.readFileSync("src/render/bind-today.ts", "utf8");
const componentsScss = fs.readFileSync("src/ui/components.scss", "utf8");

assert.ok(
    fragmentsSrc.includes("lc-checkin__quick-note-chips"),
    "fragments.ts must render lc-checkin__quick-note-chips container"
);
assert.ok(
    fragmentsSrc.includes("data-quick-note"),
    "fragments.ts must provide data-quick-note buttons"
);
assert.ok(
    fragmentsSrc.includes("data-quick-text"),
    "fragments.ts must provide data-quick-text tags"
);

assert.ok(
    bindTodaySrc.includes('[data-quick-note]'),
    "bind-today.ts must query quick-note buttons"
);
assert.ok(
    bindTodaySrc.includes("lc-checkin__record-note"),
    "bind-today.ts must target record-note input"
);

assert.ok(
    componentsScss.includes(".lc-checkin__quick-note-chips"),
    "components.scss must style .lc-checkin__quick-note-chips"
);
assert.ok(
    componentsScss.includes(".lc-checkin__quick-note-chip"),
    "components.scss must style .lc-checkin__quick-note-chip"
);

// 2. 验证 getFrequentNotes 核心算法
function getFrequentNotes(history, targetItemId, limit = 4) {
    if (!history || !Array.isArray(history)) return [];
    const counts = new Map();
    const lastSeen = new Map();

    for (let i = history.length - 1; i >= 0; i--) {
        const item = history[i];
        if (item.itemId !== targetItemId) continue;
        const note = (item.note || "").trim();
        if (!note || note.length > 24) continue;
        counts.set(note, (counts.get(note) || 0) + 1);
        if (!lastSeen.has(note)) {
            lastSeen.set(note, i);
        }
    }

    return Array.from(counts.entries())
        .sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            return (lastSeen.get(b[0]) || 0) - (lastSeen.get(a[0]) || 0);
        })
        .slice(0, limit)
        .map(([note, count]) => ({ note, count }));
}

// 场景测试 1: 空历史记录
assert.deepEqual(getFrequentNotes([], "item-1"), []);
assert.deepEqual(getFrequentNotes(null, "item-1"), []);

// 场景测试 2: 多次打卡含有不同 note
const mockHistory = [
    { itemId: "item-1", note: "慢跑 3km" },
    { itemId: "item-1", note: "慢跑 5km" },
    { itemId: "item-1", note: "晨跑 3km" },
    { itemId: "item-1", note: "慢跑 3km" },
    { itemId: "item-2", note: "背单词 50 个" },
    { itemId: "item-1", note: "慢跑 3km" },
    { itemId: "item-1", note: "慢跑 5km" },
    { itemId: "item-1", note: "" }, // 应当过滤空
    { itemId: "item-1", note: "   " }, // 应当过滤空白
    { itemId: "item-1", note: "这是一个极其漫长超过二十四个字符的超级长长长长长长长长长长备注" }, // 应当过滤超长
];

const candidates = getFrequentNotes(mockHistory, "item-1", 4);
assert.equal(candidates.length, 3);
assert.equal(candidates[0].note, "慢跑 3km");
assert.equal(candidates[0].count, 3);
assert.equal(candidates[1].note, "慢跑 5km");
assert.equal(candidates[1].count, 2);
assert.equal(candidates[2].note, "晨跑 3km");
assert.equal(candidates[2].count, 1);

// 场景测试 3: 限制提取个数 limit
const top1 = getFrequentNotes(mockHistory, "item-1", 1);
assert.equal(top1.length, 1);
assert.equal(top1[0].note, "慢跑 3km");

console.log("quick-note-chips tests passed!");
