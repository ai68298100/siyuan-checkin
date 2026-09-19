const fs = require("fs");
let c = fs.readFileSync("src/i18n.ts", "utf8");

const zhA = '    "set.exportLoopBtn":';
if (c.split(zhA).length !== 2) { console.error("zh anchor missing"); process.exit(1); }
const zhAdd = [
    '    "set.exportObsidian": "导出 Obsidian 习惯文件",',
    "set.exportObsidianHint": "导出为 Habit Tracker 21 习惯 .md 文件（每个项目一个文件，含全部勾选日；最多 30 个）。"',
].join("\n");
c = c.replace(zhA, zhA + "\n" + zhAdd);

const enA = '    "set.exportLoopBtn":';
if (c.split(enA).length !== 2) { console.error("en anchor missing"); process.exit(1); }
const enAdd = [
    '    "set.exportObsidian": "Export Obsidian habit files",',
    "set.exportObsidianHint": "Export as Habit Tracker 21 habit .md files (one file per item with all ticked days; up to 30)."',
].join("\n");
c = c.replace(enA, enA + "\n" + enAdd);

const zhMsg = '    "msg.obsidianNoItems": "未找到有效的 Habit Tracker 21 习惯文件（需含 frontmatter）。",';
if (c.split(zhMsg).length !== 2) { console.error("zh msg anchor missing"); process.exit(1); }
c = c.replace(zhMsg, '    "msg.obsidianExportDone": "已导出 {n} 个习惯文件；{skipped} 个无记录项目未导出。",\n' + zhMsg);

const enMsg = '    "msg.obsidianNoItems": "No valid Habit Tracker 21 habit files found (frontmatter required).",';
if (c.split(enMsg).length !== 2) { console.error("en msg anchor missing"); process.exit(1); }
c = c.replace(enMsg, '    "msg.obsidianExportDone": "Exported {n} habit files; {skipped} items without records were skipped.",\n' + enMsg);

fs.writeFileSync("src/i18n.ts", c);
console.log("export i18n added");
