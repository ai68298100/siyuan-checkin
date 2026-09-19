const fs = require("fs");

// 1) i18n block.scopeLoading
let c = fs.readFileSync("src/i18n.ts", "utf8");
const zhA = '    "block.monthMeta":';
if (c.split(zhA).length !== 2) { console.error("zh block anchor"); process.exit(1); }
const zhIns = '    "block.scopeLoading": "正在解析文档锚点…",\n';
c = c.replace(zhA, zhIns + zhA);
const enA = '    "block.monthMeta":';
if (c.split(enA).length !== 2) { console.error("en block anchor"); process.exit(1); }
const enIns = '    "block.scopeLoading": "Resolving document anchors…",\n';
c = c.replace(enA, enIns + enA);
fs.writeFileSync("src/i18n.ts", c);

// 2) compat doc: 登记渲染块的 getBlockInfo 使用
let d = fs.readFileSync("docs/siyuan-compatibility.md", "utf8");
const anchor = "以下三处确实依赖思源内部 DOM，改动宿主结构时只会降级为「不显示」，不会损坏数据，但必须如实登记：";
if (!d.includes(anchor)) { console.error("compat anchor"); process.exit(1); }
const add = anchor + "\n\n渲染块的文档/笔记本维度（T-1292）经内核公开 API `/api/block/getBlockInfo` 解析锚点块归属（`root_id`/`box`），失败时降级为空视图，不新增内部 DOM 依赖。";
d = d.replace(anchor, add);
fs.writeFileSync("docs/siyuan-compatibility.md", d);

console.log("i18n + compat done");
