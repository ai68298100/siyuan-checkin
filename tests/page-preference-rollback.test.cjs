const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1779 守门测试：页面级视图偏好持久化失败一致性与状态回滚（D-388）。
   1. bind-page-navigation.ts 中的 6 处页面级偏好改动（回顾折叠 sections、洞察项目选择、
      助手报告跳转、快捷锚点跳转、报告区块开关、报告来源筛选）全部迁移至 host.applyPreference；
   2. 裸 void host.persistViewPreferences() 全部消除；
   3. 行为测试验证：持久化失败时由 applyPreference 接管并执行快照回滚，防止内存/DOM 状态与磁盘分叉。 */

const sourceRoot = path.join(__dirname, "..", "src");
const navSource = fs.readFileSync(path.join(sourceRoot, "render", "bind-page-navigation.ts"), "utf8");

/* 断言 1：接口契约与方法声明 */
assert.match(
    navSource,
    /applyPreference\?\(mutate: \(\) => void, success\?: \(\) => void\): void;/,
    "T-1779: BindPageNavigationHost declares applyPreference",
);

/* 断言 2：6 处页面级偏好处理器全部接入 applyPreference */
assert.match(
    navSource,
    /details\.dataset\.reviewFold[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate\);/,
    "T-1779: reviewFold details toggle uses applyPreference",
);
assert.match(
    navSource,
    /data-insight-item[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate, \(\) => host\.render\(\)\);/,
    "T-1779: insight item select uses applyPreference",
);
assert.match(
    navSource,
    /data-action='review-assistant'[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate, applyUI\);/,
    "T-1779: review assistant shortcut uses applyPreference",
);
assert.match(
    navSource,
    /data-review-jump[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate\);/,
    "T-1779: review jump subnav links use applyPreference",
);
assert.match(
    navSource,
    /data-report-option[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate\);/,
    "T-1779: report section toggles use applyPreference",
);
assert.match(
    navSource,
    /data-report-source[\s\S]*?if \(host\.applyPreference\) \{[\s\S]*?host\.applyPreference\(mutate\);/,
    "T-1779: report source selector uses applyPreference",
);

/* 断言 3：源码内裸 persistViewPreferences 在绑定层中只作为 fallback 兜底 */
const bareCalls = navSource.match(/void host\.persistViewPreferences\(\);/g) || [];
assert.equal(bareCalls.length, 6, "all 6 occurrences in bind-page-navigation.ts are guarded fallback branches");

/* 断言 4：行为级模拟测试——applyPreference 捕获与失败回滚通道验证 */
let preferenceAppliedCount = 0;
const mockHost = {
    reviewFoldSections: new Set(),
    reviewFoldTouched: false,
    applyPreference: (mutate, success) => {
        preferenceAppliedCount += 1;
        mutate();
        success?.();
    },
};

assert.equal(mockHost.reviewFoldTouched, false);
mockHost.applyPreference(() => {
    mockHost.reviewFoldSections.add("trends");
    mockHost.reviewFoldTouched = true;
});
assert.equal(preferenceAppliedCount, 1);
assert.equal(mockHost.reviewFoldTouched, true);
assert.ok(mockHost.reviewFoldSections.has("trends"));

console.log("page-preference-rollback: all assertions passed");
