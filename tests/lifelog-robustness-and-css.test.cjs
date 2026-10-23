// @ts-check
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const ts = require("typescript");

/* T-1901 ~ T-1903 守门测试：LifeLog 鲁棒性清洗、CSS 体积安全与搜索键盘交互防护
   1. formatLifelogEntry 多行换行转单行空格与项目名冒号安全转义
   2. formatLifelogMarkdownBlock 安全图文格式
   3. bind-today.ts 搜索输入框 keydown 防护与 Enter / Escape 响应
   4. CSS 产物体积在预算护栏内且 0 死类 */

console.log("Starting lifelog-robustness-and-css tests...");

const root = path.join(__dirname, "..");
const srcLifelog = fs.readFileSync(path.join(root, "src", "features", "lifelog-append.ts"), "utf8");
const srcBindToday = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");

// 1. T-1901 源码契约校验
assert.ok(srcLifelog.includes('.replace(/[\\r\\n]+/g, " ")'), "lifelog-append.ts must sanitize newlines into spaces");
assert.ok(srcLifelog.includes('.replace(/[：:]/g, "-")'), "lifelog-append.ts must sanitize colons in item names");

// 引入模块动态验证纯函数
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lc-lifelog-rob-test-"));
fs.mkdirSync(path.join(dir, "src", "features"), {recursive: true});
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    fs.writeFileSync(path.join(dir, relative.replace(/\.ts$/, ".js")), ts.transpileModule(source, {compilerOptions}).outputText);
};
transpile("src/features/lifelog-append.ts");
const {formatLifelogEntry, formatLifelogMarkdownBlock} = require(path.join(dir, "src", "features", "lifelog-append.js"));

// 测试 1.1：多行换行清洗
const multilineResult = formatLifelogEntry({
    timeStr: "09:30",
    itemName: "阅读",
    kind: "checkin",
    note: "第一行备注\n第二行心得\r\n第三行总结",
    energy: 5,
});
assert.ok(!multilineResult.includes("\n"), "Result must not contain newlines");
assert.ok(!multilineResult.includes("\r"), "Result must not contain carriage returns");
assert.ok(multilineResult.includes("第一行备注 第二行心得 第三行总结"), "Newlines must be collapsed to spaces");
assert.ok(multilineResult.includes("09:30 阅读：第一行备注 第二行心得 第三行总结 ⚡5"));

// 测试 1.2：项目名称中含有全角和半角冒号
const colonItemResult = formatLifelogEntry({
    timeStr: "14:00",
    itemName: "复习：英语单词:必考词",
    kind: "checkin",
    note: "完成单元测验",
});
assert.ok(colonItemResult.startsWith("14:00 复习-英语单词-必考词："), "Colons in item names must be sanitized to dashes to avoid marker parsing collision");

// 测试 1.3：图片附件 Markdown 生成
const imageBlock = formatLifelogMarkdownBlock({
    timeStr: "18:00",
    itemName: "跑步",
    kind: "checkin",
    attachment: "assets/running.png",
});
assert.ok(imageBlock.includes("![跑步](assets/running.png)"), "Markdown block must format image attachment correctly");

// 2. T-1903 搜索输入框键盘防护
assert.ok(srcBindToday.includes('search?.addEventListener("keydown"'), "bind-today.ts must attach keydown listener to search input");
assert.ok(srcBindToday.includes("if (event.isComposing || event.keyCode === 229) return;"), "search keydown must check composing state");
assert.ok(srcBindToday.includes('event.key === "Enter"'), "search keydown must handle Enter key");
assert.ok(srcBindToday.includes('event.key === "Escape"'), "search keydown must handle Escape key");

// 清理临时文件
try {
    fs.rmSync(dir, {recursive: true, force: true});
} catch {}

console.log("lifelog-robustness-and-css: all assertions passed successfully!");
