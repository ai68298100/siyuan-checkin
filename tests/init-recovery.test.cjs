const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1808 守门测试：初始化失败状态的可执行修复入口（D-381）。
   1. 失败屏包含可达的重试按钮 [data-action='retry-init'] 与诊断复制按钮 [data-action='copy-init-diagnostics']；
   2. 失败状态下自动延迟聚焦重试控件，保障读屏与键盘操作；
   3. index.ts 记录 lastInitError，提供 retryInitialization 与 copyInitDiagnostics 修复通道；
   4. i18n 双语词表齐备。 */

const sourceRoot = path.join(__dirname, "..", "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");
const i18nSource = fs.readFileSync(path.join(sourceRoot, "i18n.ts"), "utf8");

/* 断言 1：index.ts 渲染失败动作与焦点支持 */
assert.match(
    indexSource,
    /data-action="retry-init"/,
    "T-1808: renders retry-init action button",
);
assert.match(
    indexSource,
    /data-action="copy-init-diagnostics"/,
    "T-1808: renders copy-init-diagnostics action button",
);
assert.match(
    indexSource,
    /retryButton\?\.focus\(\)/,
    "T-1808: moves focus to retry button on failed initialization",
);

/* 断言 2：index.ts 具备执行方法与错误记录 */
assert.match(
    indexSource,
    /this\.lastInitError = String\(error\)/,
    "T-1808: records lastInitError when initialization fails",
);
assert.match(
    indexSource,
    /private async retryInitialization\(\): Promise<void>/,
    "T-1808: provides retryInitialization recovery pipeline",
);
assert.match(
    indexSource,
    /private copyInitDiagnostics\(\): void/,
    "T-1808: provides copyInitDiagnostics diagnostic exporter",
);

/* 断言 3：i18n 双语词表全覆盖 */
const expectedKeys = [
    ["init.retry", "重试加载", "Retry loading"],
    ["init.copyDiagnostics", "复制诊断信息", "Copy diagnostics"],
    ["init.retrySuccess", "打卡数据重新加载成功", "Check-in data reloaded successfully"],
    ["init.diagnosticsCopied", "诊断信息已复制到剪贴板", "Diagnostic details copied to clipboard"],
];

for (const [key, zh, en] of expectedKeys) {
    assert.match(i18nSource, new RegExp(`"${key}": "${zh}"`), `zh translation exists for ${key}`);
    assert.match(i18nSource, new RegExp(`"${key}": "${en}"`), `en translation exists for ${key}`);
}

console.log("init-recovery: all assertions passed");
