const fs = require("fs");
let c = fs.readFileSync("src/i18n.ts", "utf8");

const zhA = '    "set.importLoop": "从 Loop 导入",';
if (c.split(zhA).length !== 2) { console.error("zh anchor missing"); process.exit(1); }
const zhAdd = [
    '    "set.importObsidian": "从 Obsidian 导入",',
    '    "set.importObsidianHint": "Pick Habit Tracker 21 habit .md files (multi-select). Ticked days become check-ins; colors and the maxGap tolerance are not migrated.",',
].join("\n");
c = c.replace(zhA, zhA + "\n" + zhAdd);

const enA = '    "set.importLoop": "Import from Loop",';
if (c.split(enA).length !== 2) { console.error("en anchor missing"); process.exit(1); }
const enAdd = [
    '    "set.importObsidian": "Import from Obsidian",',
    '    "set.importObsidianHint": "Pick Habit Tracker 21 habit .md files (multi-select). Ticked days become check-ins; colors and the maxGap tolerance are not migrated.",',
].join("\n");
c = c.replace(enA, enA + "\n" + enAdd);

const zhMsg = '    "msg.loopBadHeader":';
if (c.split(zhMsg).length !== 2) { console.error("zh msg anchor missing"); process.exit(1); }
const zhMsgAdd = [
    '    "msg.obsidianNoItems": "未找到有效的 Habit Tracker 21 习惯文件（需含 frontmatter）。",',
    '    "msg.obsidianConfirm": "导入 {habits} 个习惯、{events} 条打卡？颜色与 maxGap 容忍设置不会迁移。",',
    '    "msg.obsidianDone": "已导入 {items} 个项目、{events} 条打卡（跳过重复 {duplicates} 条）。",',
].join("\n");
c = c.replace(zhMsg, zhMsgAdd + "\n" + zhMsg);

const enMsg = '    "msg.loopBadHeader":';
if (c.split(enMsg).length !== 2) { console.error("en msg anchor missing"); process.exit(1); }
const enMsgAdd = [
    '    "msg.obsidianNoItems": "No valid Habit Tracker 21 habit files found (frontmatter required).",',
    '    "msg.obsidianConfirm": "Import {habits} habits with {events} check-ins? Colors and the maxGap tolerance are not migrated.",',
    '    "msg.obsidianDone": "Imported {items} items and {events} check-ins ({duplicates} duplicates skipped).",',
].join("\n");
c = c.replace(enMsg, enMsgAdd + "\n" + enMsg);

fs.writeFileSync("src/i18n.ts", c);
console.log("obsidian i18n added");
