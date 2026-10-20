const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* T-1874 守门测试：多主题色阶年度热力图与日格快速钻取（对标 Obsidian Contribution Graph）
   1. 偏好规范：HEATMAP_THEMES 暴露 4 档预设（violet-glow, classic-green, autumn-warm, monochrome），normalize 严格归一与回退；
   2. 纯渲染层：renderYearHeatmap 支持传递 theme 并映射到 SVG data-heatmap-theme 属性；
   3. 无障碍与钻取：每个有效日格生成 data-heatmap-date、role="button"、tabindex="0" 与完整 aria-label 属性；
   4. 交互绑定：bind-page-navigation.ts 包含 data-heatmap-date 的 click 与 keydown(Enter/Space) 钻取至 records 事实面板；
   5. 样式体系：tokens.scss 与 components.scss 拥有 4 套调色板色阶变量定义及 hover/focus-visible 轮廓。 */

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-heatmap-interaction-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};

for (const filename of ["types.ts", "date-keys.ts", "record-step.ts", "quota.ts", "rules.ts", "model.ts", "charts.ts"]) {
    fs.writeFileSync(
        path.join(dir, filename.replace(/\.ts$/, ".js")),
        ts.transpileModule(fs.readFileSync(path.join(root, "src", filename), "utf8"), {compilerOptions}).outputText
    );
}

const charts = require(path.join(dir, "charts.js"));
const model = require(path.join(dir, "model.js"));

/* ---------------------------------------------------------
   一、静态代码与架构规范断言
   --------------------------------------------------------- */

const srcViewPrefs = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
const srcCharts = fs.readFileSync(path.join(root, "src", "charts.ts"), "utf8");
const srcReview = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
const srcBindNav = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
const srcTokens = fs.readFileSync(path.join(root, "src", "ui", "tokens.scss"), "utf8");
const srcComponents = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
const srcI18n = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");

// 1. view-preferences 预设定义与归一化
assert.match(srcViewPrefs, /export const HEATMAP_THEMES = new Set<HeatmapTheme>\(\["violet-glow", "classic-green", "autumn-warm", "monochrome"\]\);/, "必须暴露 4 档热力图主题预设");
assert.match(srcViewPrefs, /heatmapTheme = HEATMAP_THEMES\.has\(source\.heatmapTheme as HeatmapTheme\)/, "normalizeViewPreferences 必须严格校验并回退 heatmapTheme");

// 2. charts.ts 支持 theme 与交互属性
assert.match(srcCharts, /data-heatmap-date="\$\{escapeChartText\(day\.date\)\}"/, "每个日格必须携带 data-heatmap-date 属性");
assert.match(srcCharts, /role="button"\s+tabindex="0"/, "每个日格必须具备无障碍按钮与键盘导航语义");
assert.match(srcCharts, /data-heatmap-theme="\$\{escapeChartText\(options\.theme\)\}"/, "SVG 根节点必须接受并渲染 data-heatmap-theme 属性");

// 3. review.ts 渲染与切换
assert.match(srcReview, /data-heatmap-theme="\$\{theme\}"/, "回顾页热力图容器必须挂载 data-heatmap-theme");
assert.match(srcReview, /data-action="change-heatmap-theme"/, "回顾页必须提供热力图色板切换下拉菜单");

// 4. bind-page-navigation.ts 键盘与点击快速钻取
assert.match(srcBindNav, /root\.querySelectorAll<SVGElement>\("\[data-heatmap-date\]"\)/, "必须监听所有 data-heatmap-date 日格");
assert.match(srcBindNav, /writeReviewValue\("reviewWorkspace", "records"\);/, "点击热力图日格必须钻取切换到 records 记录面板");
assert.match(srcBindNav, /ke\.key === "Enter" \|\| ke\.key === " "/, "热力图日格必须支持 Enter 与空格键键盘可达激活");
assert.match(srcBindNav, /root\.querySelector<HTMLSelectElement>\("\[data-action='change-heatmap-theme'\]"\)/, "必须监听热力图色板变更并应用偏好持久化");

// 5. tokens.scss 与 components.scss 样式定义
assert.match(srcTokens, /\[data-heatmap-theme="classic-green"\]/, "tokens.scss 包含经典绿色阶定义");
assert.match(srcTokens, /\[data-heatmap-theme="autumn-warm"\]/, "tokens.scss 包含秋日暖阳色阶定义");
assert.match(srcTokens, /\[data-heatmap-theme="monochrome"\]/, "tokens.scss 包含极简水墨色阶定义");
assert.match(srcComponents, /\.lc-yearheatmap rect\[data-heatmap-date\]:focus-visible/, "components.scss 包含日格 :focus-visible 高可见度轮廓");

// 6. i18n 覆盖
assert.match(srcI18n, /"set\.themeClassicGreen":\s*"经典翡翠绿"/);
assert.match(srcI18n, /"set\.themeClassicGreen":\s*"Classic Green"/);
assert.match(srcI18n, /"review\.heatmapThemeLabel":\s*"热力图配色"/);
assert.match(srcI18n, /"review\.heatmapThemeLabel":\s*"Heatmap Theme"/);

/* ---------------------------------------------------------
   二、动态运行生成验证
   --------------------------------------------------------- */

const testStore = model.createDefaultStore();
testStore.items = [
    model.normalizeItem({
        id: "item-1",
        name: "晨读",
        kind: "count",
        target: 1,
        unit: "次",
        schedule: {type: "daily"},
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        createdDate: "2026-01-01",
    }),
];

testStore.events = [
    {id: "e1", itemId: "item-1", value: 1, unit: "次", source: "manual", localDate: "2026-05-20"},
    {id: "e2", itemId: "item-1", value: 3, unit: "次", source: "manual", localDate: "2026-05-21"},
];

const yearHeatmap = charts.buildYearHeatmap(testStore, 2026);
assert.equal(yearHeatmap.year, 2026);
assert.ok(yearHeatmap.days.length >= 365);

// 渲染默认主题
const defaultSvg = charts.renderYearHeatmap(yearHeatmap);
assert.match(defaultSvg, /class="lc-yearheatmap"/);
assert.match(defaultSvg, /data-heatmap-date="2026-05-20"/);
assert.match(defaultSvg, /role="button"/);
assert.match(defaultSvg, /tabindex="0"/);
assert.match(defaultSvg, /aria-label="2026-05-20：1 条记录"/);

// 渲染指定主题（如 classic-green）
const greenSvg = charts.renderYearHeatmap(yearHeatmap, {theme: "classic-green"});
assert.match(greenSvg, /data-heatmap-theme="classic-green"/, "SVG 根节点必须输出 data-heatmap-theme='classic-green'");

console.log("heatmap-theme-interaction: all assertions passed successfully.");
