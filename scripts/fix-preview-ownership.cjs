const fs = require("fs");
let c = fs.readFileSync("src/render/block-renderer.ts", "utf8");
const q = String.fromCharCode(39);

// 1) 唯一标记 + 归属属性
const a1 = "const PREVIEW_FLAG = " + q + "data-checkin-preview" + q + ";\nconst BLOCK_LANGUAGE = " + q + "checkin" + q + ";";
const b1 = a1 + "\nconst PREVIEW_OWNER_FLAG = " + q + "data-checkin-preview-for" + q + ";\nlet previewBlockSeq = 0;";
if (c.split(a1).length !== 2) { console.error("anchor1"); process.exit(1); }
c = c.replace(a1, b1);

// 2) 重写 renderCheckinBlocksIn 的核心循环
const a2 = [
    "export function renderCheckinBlocksIn(protyleElement: HTMLElement, deps: BlockRendererDeps, options: {force?: boolean} = {}): void {",
    "    const blocks = findCodeBlocks(protyleElement);",
    "    for (const block of blocks) {",
    "        const configText = readBlockConfigText(block).trim();",
    "        const previous = block.nextElementSibling;",
    "        const previousIsPreview = previous?.getAttribute(PREVIEW_FLAG) === \"true\";",
    "        /* T-1293 修正:相邻的另一个代码块不是预览,绝不可删——否则相邻两个渲染块互相摧毁。 */",
    "        if (previousIsPreview) previous?.remove();",
    "        const existing = previousIsPreview || previous?.hasAttribute?.(PREVIEW_FLAG) === true;",
    "        if (existing && !options?.force && lastRenderedConfig.get(block) === configText) continue;",
    "        previous?.remove();",
].join("\n");
const b2 = [
    "export function renderCheckinBlocksIn(protyleElement: HTMLElement, deps: BlockRendererDeps, options: {force?: boolean} = {}): void {",
    "    const blocks = findCodeBlocks(protyleElement);",
    "    for (const block of blocks) {",
    "        const configText = readBlockConfigText(block).trim();",
    "        /* T-1293:预览按源块归属(唯一标记),相邻渲染块互不干扰。 */",
    "        if (!block.dataset.checkinBlockId) {",
    "            previewBlockSeq += 1;",
    "            block.dataset.checkinBlockId = `cb-${previewBlockSeq}`;",
    "        }",
    "        const ownerMarker = block.dataset.checkinBlockId;",
    "        const previous = block.nextElementSibling;",
    "        const previousIsOurs = previous?.getAttribute(PREVIEW_OWNER_FLAG) === ownerMarker;",
    "        const previousIsPreview = previous?.getAttribute(PREVIEW_FLAG) === \"true\";",
    "        const existing = previousIsOurs || previous?.getAttribute(PREVIEW_FLAG) === \"true\";",
    "        if (existing && !options?.force && lastRenderedConfig.get(block) === configText) continue;",
    "        if (previousIsOurs) previous?.remove();",
].join("\n");
if (c.split(a2).length !== 2) { console.error("anchor2"); process.exit(1); }
c = c.replace(a2, b2);

// 3) 预览挂归属标记(两处 innerHTML 分支之后统一设置)
const a3 = '        preview.setAttribute(PREVIEW_FLAG, "true");';
const b3 = '        preview.setAttribute(PREVIEW_FLAG, "true");\n        preview.setAttribute(PREVIEW_OWNER_FLAG, ownerMarker);';
if (c.split(a3).length !== 2) { console.error("anchor3"); process.exit(1); }
c = c.replace(a3, b3);

fs.writeFileSync("src/render/block-renderer.ts", c);
console.log("preview ownership implemented");
