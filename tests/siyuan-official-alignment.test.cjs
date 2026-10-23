// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1895 ~ T-1896 守门测试：思源官方最新契约深度对齐与紧凑模式自适应
   1. components.scss 中对 :root[data-ui-density="compact"] 的响应断言；
   2. index.ts 中 onDataChanged 签名完整性与参数兼容性断言；
   3. 全仓 0 引用已弃用的 updateTransaction API 断言；
   4. teardown 预算与自驱清理责任断言。 */

console.log("Starting siyuan-official-alignment tests...");

const root = path.join(__dirname, "..");
const srcScss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

// 1. T-1895 思源桌面紧凑模式自适应 (:root[data-ui-density="compact"])
assert.ok(
    srcScss.includes(':root[data-ui-density="compact"] :is(.lc-checkin-tab-host, .lc-checkin-dialog-host)'),
    "components.scss must adapt tab and dialog hosts to SiYuan compact density"
);
assert.ok(
    srcScss.includes("--lc-checkin-control-height: var(--lc-checkin-compact-min-target);"),
    "compact density must scale control height down"
);

// 2. T-1896 onDataChanged 契约重写保护
assert.ok(
    srcIndex.includes("async onDataChanged()"),
    "onDataChanged must be implemented by plugin to prevent SiYuan violent reload"
);

// 3. 官方弃用 API 零引用守门（Protyle.updateTransaction 在 v3.8.8 正式被移除）
const allTsFiles = [];
const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".git") walk(full);
        } else if (entry.name.endsWith(".ts")) {
            allTsFiles.push(full);
        }
    }
};
walk(path.join(root, "src"));

for (const file of allTsFiles) {
    const code = fs.readFileSync(file, "utf8");
    assert.ok(!code.includes("updateTransaction"), `File ${file} must not reference deprecated updateTransaction API`);
}

// 4. teardown 预算合规
const srcTeardown = fs.readFileSync(path.join(root, "src", "teardown.ts"), "utf8");
assert.ok(srcTeardown.includes("TEARDOWN_DRAIN_BUDGET_MS"), "teardown.ts must enforce bounded persist budget within official 5s limit");

console.log("siyuan-official-alignment: all assertions passed successfully!");
