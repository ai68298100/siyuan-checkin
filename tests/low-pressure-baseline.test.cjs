/* T-1461 · R-A13 低压力呈现与包容性设计基线守门：基线文档在位、calm 文案禁则、
   双日规则接线、热力图单色色阶+冗余编码、移动 44px 触控基线、undo/确认清单。
   规范全文见 docs/low-pressure-baseline.md；真机触控/显示保持 host-pending。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

/* —— 1. 基线文档在位且覆盖五个维度。 —— */
const baseline = read("docs/low-pressure-baseline.md");
for (const marker of [
    "单色亮度阶梯",
    "冗余编码",
    "低完成度不上警示红",
    "禁则词表",
    "双日规则",
    "三通道静态可辨",
    "44px",
    "undo 优先于确认弹窗",
    "保留确认的高危清单",
]) {
    assert.ok(baseline.includes(marker), `baseline doc must state: ${marker}`);
}

/* —— 2. calm 文案禁则：用户可见 i18n 文案不得出现愧疚/惩罚措辞。 —— */
const i18nSource = read("src/i18n.ts");
for (const banned of ["你落后了", "前功尽弃", "归零", "you've fallen behind", "back to zero"]) {
    assert.ok(!i18nSource.includes(banned), `user-facing copy must not contain shaming phrase: ${banned}`);
}

/* —— 3. 双日规则：失速卡收尾为无罪化口径，双语在位并接线进报告。 —— */
const stalledNoteCount = (i18nSource.match(/"report\.stalledNote"/g) || []).length;
assert.equal(stalledNoteCount, 2, "report.stalledNote exists in both locales");
assert.match(i18nSource, /断一天是数据，连断两天才是信号/, "zh copy states the two-day rule");
assert.match(read("src/features/report.ts"), /t\("report\.stalledNote"\)/, "report renders the two-day rule note after stalled items");

/* —— 4. 热力图色阶：单色亮度阶梯（accent/surface 派生）+ 每格 title 冗余编码。 —— */
const charts = read("src/charts.ts");
assert.ok(charts.includes("<title>${title}</title>"), "heatmap cells keep hover titles as redundant encoding");
const scss = read("src/ui/components.scss");
for (const line of scss.split("\n").filter((entry) => /\.lc-yearheatmap \.is-level-\d/.test(entry))) {
    assert.match(line, /var\(--lc-checkin-accent\)/, `heatmap level color stays on the accent ladder: ${line.trim()}`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(line), `heatmap level color must not use raw hex (red/green risk): ${line.trim()}`);
}

/* —— 5. 移动触控基线：44px 规则块在位并覆盖主要打卡目标。 —— */
assert.match(scss, /T-1461 低压力触控基线/, "touch baseline block is present in components.scss");
for (const target of [".lc-checkin__record-button", ".lc-checkin__quick-button", ".lc-checkin__chip-button", ".lc-checkin__renderblock-today-record", ".lc-checkin__mobile-nav button"]) {
    assert.match(scss, new RegExp(`[^{}]*${target.replace(/[-_]/g, "\\$&")}[^{}]*\\{ min-height: 44px; \\}`), `44px baseline covers ${target}`);
}
assert.match(scss, /lc-checkin-dock-host[^]*30px/, "dock density exception stays documented (pointer context)");

/* —— 6. 完成/撤销语义：记录按钮文字随状态切换（非仅颜色），撤销通道为既有路径。 —— */
const fragments = read("src/render/fragments.ts");
assert.match(fragments, /complete \? t\("item\.cancel"\) : t\("item\.checkin"\)/, "record button copy toggles with state (three-channel: text)");
assert.match(fragments, /is-complete/, "completed state carries a class hook (color channel)");
assert.ok(i18nSource.includes('"item.undoAria"'), "undo stays a first-class action (aria channel)");

console.log("low-pressure baseline guard tests passed.");
