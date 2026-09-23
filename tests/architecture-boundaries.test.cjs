/* T-1418 · R-A1 架构边界守门：用源码扫描把既有边界固化成自动证据。
   规则来自 docs/implementation-roadmap-product-strategy-2026-09.md §R-A1：
   1. 核心与 features 纯模块不得反向导入 render/ui，不得触碰宿主 API；
      含宿主 IO 的模块必须显式登记为副作用边界，不允许默认扩展。
   2. render/ui 导入只允许出现在渲染层、组合根与显式白名单文件里。
   3. 事件存储只能被 model.ts 改写；外部事件写入只能经 recordExternalEvent
      （api.ts / index.ts 两个入口）。
   4. 新增来源模块（*adapter.ts / *inbox.ts）必须在清单登记前缀与测试；
      前缀必须进入 ecosystem 的 EXTERNAL_REF_PREFIX_REGISTRY。
   本守门只扫描可识别模块与显式清单，不用模糊规则阻止合法扩展；
   新模块进入受管范围时在此登记即可，不改变运行代码。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const HOST_API = /\bwindow\s*\.\s*siyuan|\bwindow\s*\.\s*[a-zA-Z]|\bdocument\s*\.\s*[a-zA-Z]|\bfetch\s*\(|\bXMLHttpRequest\b|localStorage|sessionStorage|\bnavigator\s*\.\s*[a-zA-Z]|setTimeout\s*\(|setInterval\s*\(|\brequire\s*\(\s*["']siyuan["']\s*\)|from ["']siyuan["']/;
const RENDER_UI_IMPORT = /from ["'][./]*[^"']*(?:\/|^)(?:render|ui)\//;
const CLOCK = /Date\.now\s*\(|new Date\s*\(\s*\)/;

/* —— 1. 组合根之外的 render/ui 导入方向 —— */
const RENDER_UI_IMPORTERS_ALLOWED = new Set([
    "src/index.ts", // 组合根
    "src/plugin-ops.ts", // 宿主 UI 编排层
    "src/shared.ts", // 声明依赖 ui/labels 的跨页文案表（既有事实）
]);

function listTsFiles(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listTsFiles(full));
        else if (entry.name.endsWith(".ts")) out.push(full);
    }
    return out;
}

const allFiles = listTsFiles(src).map((full) => path.relative(root, full).replace(/\\/g, "/"));
for (const file of allFiles) {
    const inRenderLayer = file.startsWith("src/render/") || file.startsWith("src/ui/");
    if (inRenderLayer || RENDER_UI_IMPORTERS_ALLOWED.has(file)) continue;
    assert.doesNotMatch(read(file), RENDER_UI_IMPORT, `${file} 不得导入 render/ui——组合根之外的模块依赖必须指向 model/features`);
}

/* —— 2. 非渲染层的宿主 API 准入清单（新增文件触碰宿主前必须显式登记） —— */
const HOST_API_ALLOWLIST = new Set([
    "src/api.ts", // 公开 API 面向宿主
    "src/dock-tomato.ts", // 番茄钟提供方桥
    "src/download.ts", // 下载通道
    "src/ecosystem.ts", // 事件订阅与 externalRef 注册表
    "src/i18n.ts", // 语言探测
    "src/index.ts", // 组合根
    "src/integrations.ts", // 集成事件
    "src/navigation.ts", // 页面导航
    "src/plugin-ops.ts", // 宿主 UI 编排层（showMessage/延迟聚焦等）
    "src/shared.ts", // 跨页工具：withTimeout 计时器（既有事实，新增宿主访问仍需评审）
    "src/teardown.ts", // 拆除预算：有界 setTimeout 等待（时钟经 now 注入）
    "src/features/insights.ts", // 宿主交互建议入口
]);
for (const file of allFiles) {
    if (file.startsWith("src/render/")) continue; // 渲染层本身允许宿主访问
    const source = read(file);
    if (HOST_API_ALLOWLIST.has(file)) continue;
    assert.doesNotMatch(source, HOST_API, `${file} 出现宿主 API 访问——先评审再进 HOST_API_ALLOWLIST，不允许默认引入副作用`);
}

/* —— 3. 无时钟模块：日期与结算的纯函数面禁止隐式时钟（R-A7 契约） —— */
const CLOCK_FREE_MODULES = [
    "src/date-keys.ts",
    "src/features/source-framework.ts", // D-258：结算层可离线回放
    "src/features/calendar-projection.ts",
    "src/features/today-dashboard.ts",
    "src/features/reminder-preferences.ts",
    "src/features/quick-entry-capabilities.ts",
    "src/features/first-success.ts",
    "src/features/habit-score.ts",
    "src/features/sireader-adapter.ts", // 身份/结算纯函数面
    "src/features/siplayer-adapter.ts",
    "src/features/docktomato-inbox.ts",
    "src/features/health-inbox.ts",
    "src/quota.ts",
    "src/record-step.ts",
    "src/storage-transaction.ts",
];
for (const file of CLOCK_FREE_MODULES) {
    const code = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    assert.doesNotMatch(code, CLOCK, `${file} 属于无时钟纯函数面，禁止 Date.now()/缺省 new Date()`);
}

/* —— 4. 副作用边界登记：含宿主 IO 的 features 模块必须显式列出（R-A1 规则 1） —— */
const SIDE_EFFECT_BOUNDARIES = [
    "src/features/note-anchor.ts", // 文档锚点读写
    "src/features/diary-search.ts", // 日记搜索（宿主查询）
    "src/features/api-v5.ts", // 宿主事件监听
];
const boundaryNote = read("docs/architecture.md");
for (const file of SIDE_EFFECT_BOUNDARIES) {
    assert.ok(allFiles.includes(file), `登记的副作用边界 ${file} 必须真实存在`);
}
assert.ok(boundaryNote.length > 0, "architecture.md 必须持续维护模块地图");

/* —— 5. 事件存储写路径唯一：只有 model.ts 可以改写 store.events —— */
const EVENT_MUTATION = /\.events\s*\.\s*(?:push|unshift|splice|pop|shift|sort)\s*\(/;
for (const file of allFiles) {
    if (file === "src/model.ts") continue;
    assert.doesNotMatch(read(file), EVENT_MUTATION, `${file} 直接改写 events 数组——事件写入必须经 model.ts 的记录/撤销通道`);
}

/* —— 6. 外部事件写入唯一入口：recordExternalEvent 只允许 api/index 两个宿主入口调用 —— */
const RECORD_EXTERNAL_CALLERS = allFiles.filter((file) => /\brecordExternalEvent\s*\(/.test(read(file)) && !file.endsWith("model.ts"));
for (const caller of RECORD_EXTERNAL_CALLERS) {
    assert.ok(
        caller === "src/api.ts" || caller === "src/index.ts",
        `${caller} 调用 recordExternalEvent——外部事件写入只允许 api.ts / index.ts 两个宿主入口`
    );
}

/* —— 7. 来源登记：前缀注册表 + 适配器发现 + 测试存在（R-A1 规则 3/4） —— */
const SOURCE_MANIFEST = [
    {prefix: "taskhorizon", modules: ["src/ecosystem.ts"], tests: ["tests/task-horizon-contract.test.cjs", "tests/task-horizon-bridge.test.cjs"]},
    {prefix: "obsidian21", modules: ["src/features/obsidian-habits.ts"], tests: ["tests/obsidian-habits.test.cjs"]},
    {prefix: "sireader", modules: ["src/features/sireader-adapter.ts"], tests: ["tests/sireader-adapter.test.cjs"]},
    {prefix: "siplayer", modules: ["src/features/siplayer-adapter.ts"], tests: ["tests/siplayer-adapter.test.cjs"]},
    {prefix: "health", modules: ["src/features/health-inbox.ts"], tests: ["tests/health-inbox.test.cjs"]},
];
const registry = read("src/ecosystem.ts");
for (const source of SOURCE_MANIFEST) {
    /* taskhorizon 经 TASK_HORIZON_EXTERNAL_REF_PREFIX 常量进注册表，其余为字面量。 */
    const registered = registry.includes(`prefix: "${source.prefix}"`) || (source.prefix === "taskhorizon" && /TASK_HORIZON_EXTERNAL_REF_PREFIX = "taskhorizon"/.test(registry));
    assert.ok(registered, `来源前缀 ${source.prefix} 必须登记在 EXTERNAL_REF_PREFIX_REGISTRY`);
    for (const module of source.modules) {
        assert.ok(allFiles.includes(module), `来源模块 ${module} 必须存在`);
        assert.match(read(module), new RegExp(source.prefix), `${module} 必须实际使用前缀 ${source.prefix}`);
    }
    for (const test of source.tests) {
        assert.ok(fs.existsSync(path.join(root, test)), `来源 ${source.prefix} 的守门测试 ${test} 必须存在`);
        assert.match(read(test), new RegExp(source.prefix), `守门测试 ${test} 必须覆盖前缀 ${source.prefix}`);
    }
}
/* 发现规则：新增 *adapter.ts / *inbox.ts 必须二选一登记——
   a) 进入 SOURCE_MANIFEST（使用 `<prefix>:<identity>:<localDate>` externalRef 体系）；
   b) 进入 NON_EXTERNALREF_SOURCE_MODULES（来源家族但不走日期前缀体系，须写明理由）。
   防止新来源绕过登记。 */
const NON_EXTERNALREF_SOURCE_MODULES = [
    "src/features/docktomato-inbox.ts", // Dock Tomato 提供方收件箱：身份为 docktomato:<identity>（无日期后缀），经自有收件箱存储与审计写入，不适用 externalRef 日期前缀注册表
];
const manifestModules = new Set([...SOURCE_MANIFEST.flatMap((source) => source.modules), ...NON_EXTERNALREF_SOURCE_MODULES]);
for (const file of allFiles) {
    if (!file.startsWith("src/features/")) continue;
    if (!/[a-z-]+(?:adapter|inbox)\.ts$/.test(file)) continue;
    assert.ok(manifestModules.has(file), `${file} 是来源模块但未登记进 SOURCE_MANIFEST——先补前缀注册、治理与测试清单`);
}

console.log(`architecture-boundaries checks passed: ${allFiles.length} 个 TS 模块的依赖方向/宿主准入/时钟纪律/事件写路径/来源登记全部在界内`);
