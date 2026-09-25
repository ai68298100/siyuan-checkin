/* R-A18 第 4 批守门：
   R-18.1 分享图——布局模型（周一对齐/留白/钳制）、最小 canvas 绘制（格子数/文本/alpha 阶梯）、
   保存通道（saveGeneratedFile PNG）与回顾页工具接线；
   R-18.5 里程碑分级庆祝——阶梯命中、is-milestone 呈现、reducedMotion 静态降级、i18n 双语；
   R-18.4 退役词表不复流（SCSS/i18n）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-share-"));
fs.writeFileSync(path.join(dir, "share-card.js"), ts.transpileModule(read("src/features/share-card.ts"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
const share = require(path.join(dir, "share-card.js"));

/* —— 1. 布局模型：周一对齐、窗口外留白、level 钳制。 —— */
{
    /* 2026-09-01 是周二（周一为首列 → leading=1）。 */
    const model = share.buildShareCardModel({
        year: 2026,
        days: [
            {date: "2026-09-01", level: 2},
            {date: "2026-09-02", level: 9},
            {date: "2026-09-03", level: -1},
        ],
        total: 3,
        maxStreak: 2,
        activeDays: 2,
    });
    assert.equal(model.columns, 1, "three days fit in the first column after the Tuesday lead");
    assert.equal(model.columns, 1, "three days fit in the first column after the Tuesday lead");
    assert.equal(model.cells.length, 2, "blank cells (level -1) are excluded from the paint list");
    assert.deepEqual(model.cells[0], {column: 0, row: 1, level: 2}, "first day lands on the Tuesday row (Monday-first)");
    assert.equal(model.cells[1].level, 4, "level clamped into 0..4");
    const size = share.shareCardSize(model);
    assert.ok(size.width >= 260 && size.height > 200, "canvas size covers the grid and stats area");
    const empty = share.buildShareCardModel({year: 2026, days: [], total: 0, maxStreak: 0, activeDays: 0});
    assert.deepEqual(empty.cells, [], "empty year yields no cells");
}

/* —— 2. 绘制：格子数与颜色通道、三段文本、alpha 阶梯单色呈现。 —— */
{
    const model = share.buildShareCardModel({
        year: 2026,
        days: [
            {date: "2026-09-01", level: 1},
            {date: "2026-09-02", level: 4},
            {date: "2026-09-03", level: -1},
            {date: "2026-09-04", level: 0},
        ],
        total: 5,
        maxStreak: 2,
        activeDays: 2,
    });
    const ops = [];
    const ctx = {
        fillStyle: "",
        font: "",
        globalAlpha: 1,
        fillRect(x, y, w, h) { ops.push(["rect", x, y, w, h, this.fillStyle, this.globalAlpha]); },
        fillText(text, x, y) { ops.push(["text", text, x, y]); },
    };
    share.drawShareCard(ctx, model, {bg: "#fff", text: "#111", muted: "#888", accent: "#8b7fd6", track: "#eee"}, {title: "2026 · 小驴打卡", stats: "记录 5 次", footer: "本地生成"});
    const texts = ops.filter((op) => op[0] === "text").map((op) => op[1]);
    assert.deepEqual(texts, ["2026 · 小驴打卡", "记录 5 次", "本地生成"], "title/stats/footer drawn in order");
    const accentRects = ops.filter((op) => op[0] === "rect" && op[5] === "#8b7fd6");
    assert.equal(accentRects.length, 2, "two painted days use the accent");
    assert.deepEqual(accentRects.map((rect) => rect[6]).sort(), [0.18, 1], "level 1→alpha .18, level 4→alpha 1 (accent ladder)");
    const trackRects = ops.filter((op) => op[0] === "rect" && op[5] === "#eee");
    assert.equal(trackRects.length, 1, "the blank cell draws with the track color");
}

/* —— 3. 接线：回顾工具按钮 + 宿主导出 + 保存通道（PNG 走 base64 二进制串）。 —— */
const reviewSource = read("src/render/review.ts");
assert.match(reviewSource, /data-action="export-share-card"/, "review tools expose the share-card export");
const bindNavSource = read("src/render/bind-page-navigation.ts");
assert.match(bindNavSource, /data-action='export-share-card'/, "review tool binding routes the share-card action");
assert.match(bindNavSource, /downloadShareCard\?\(\): void \| Promise<void>;/, "host interface declares the optional export");
const indexSource = read("src/index.ts");
assert.match(indexSource, /async downloadShareCard\(\): Promise<void>/, "host implements the share-card export");
assert.match(indexSource, /buildYearHeatmap\(this\.store, year\)/, "share card reuses the year heatmap projection");
assert.match(indexSource, /canvas\.toDataURL\("image\/png"\)/, "PNG is generated locally via canvas");
assert.match(indexSource, /saveGeneratedFile\(\{fileName: `siyuan-checkin-share-\$\{year\}\.png`/, "PNG lands in the existing save channel (native-aware)");

/* —— 4. R-18.5 里程碑分级庆祝：阶梯、is-milestone 呈现、双闸降级、双语。 —— */
const indexMilestones = read("src/index.ts");
assert.match(indexMilestones, /const STREAK_MILESTONES = \[7, 14, 30, 60, 100, 180, 365, 500, 1000\];/, "milestone ladder is explicit");
assert.match(indexMilestones, /STREAK_MILESTONES\.includes\(currentStreak\)/, "milestone set from the recorded streak");
const fragmentsSource = read("src/render/fragments.ts");
assert.match(fragmentsSource, /is-milestone/, "milestone toast carries the tier class");
assert.match(fragmentsSource, /today\.streakMilestone/, "milestone copy uses i18n");
const scss = read("src/ui/components.scss");
assert.match(scss, /lc-checkin-check-pop-milestone/, "milestone pop keyframes exist");
assert.match(scss, /\.lc-checkin__recent-record\.is-milestone\[data-reduced-motion="true"\] i \{ color: var\(--lc-checkin-gold-text\); \}/, "reduced-motion keeps the static gold channel (three-channel redundancy)");
for (const key of ["today.streakMilestone", "review.exportShareCard", "review.exportShareCardAria", "share.cardTitle", "share.cardStats", "share.cardFooter"]) {
    const count = i18nSourceFor(root).split(`"${key}"`).length - 1;
    assert.equal(count, 2, `${key} must exist in both locales (${count})`);
}

function i18nSourceFor(root) {
    return fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
}

/* —— 5. R-18.4 退役词表不复流（权威断言在 ui-state-ledger，此处防本批回潮）。 —— */
for (const retired of ["lc-checkin__loading", "msg.saving"]) {
    assert.ok(!read("src/ui/components.scss").includes(retired), `retired token must not re-enter SCSS: ${retired}`);
}

/* —— 6. R-18.2 诊断导出结构化预览：confirm 升级为对话框（原因码计数/范围/边界披露）。 —— */
const diagIndexSource = read("src/index.ts");
assert.match(diagIndexSource, /data-diagnostics-preview/, "diagnostics export opens the structured preview");
assert.match(diagIndexSource, /data-diag-confirm/, "preview requires explicit confirmation before download");
assert.match(diagIndexSource, /set\.diagnosticsBoundary/, "the content-boundary disclosure is always shown");
assert.match(diagIndexSource, /downloadDiagnosticsFor\(this\.diagnostics\)/, "confirmation still exports through the versioned channel");
for (const key of ["set.diagnosticsPreviewTitle", "set.diagPreviewCode", "set.diagPreviewCount", "set.diagnosticsRange", "set.diagnosticsBoundary"]) {
    const count = i18nSourceFor(root).split(`"${key}"`).length - 1;
    assert.equal(count, 2, `${key} must exist in both locales (${count})`);
}
const diagScss = read("src/ui/components.scss");
assert.match(diagScss, /\.lc-checkin__diag-preview \{/, "diagnostics preview styles exist");

/* —— 7. R-18.3a 66 天成熟度刻度：洞察页成熟度条（研究中位数参考，非标准）。 —— */
assert.match(indexSource, /insights\.maturityBarTitle/, "insights page renders the maturity bar section");
assert.match(indexSource, /aria-valuemax="66"/, "the maturity scale anchors on the 66-day research median");
assert.match(indexSource, /daysBetweenHalfOpen\(firstRecordDay/, "maturity days computed via the date-keys single implementation");
for (const key of ["insights.maturityBarTitle", "insights.maturityBarHint", "insights.maturityDays"]) {
    const count = i18nSourceFor(root).split(`"${key}"`).length - 1;
    assert.equal(count, 2, `${key} must exist in both locales (${count})`);
}
assert.match(diagScss, /\.lc-checkin__maturity-bar \{/, "maturity bar styles exist");

console.log("share/milestone guard tests passed.");
