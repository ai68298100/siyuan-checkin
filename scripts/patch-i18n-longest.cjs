const fs = require("fs");
let c = fs.readFileSync("src/i18n.ts", "utf8");

const zhA = '    "block.summaryPending":';
if (c.split(zhA).length !== 2) { console.error("zh anchor"); process.exit(1); }
const zhIns = '    "block.longestSuffix": "历史最长 {n} 天",\n';
c = c.replace(zhA, zhIns + zhA);

const enA = '    "block.summaryPending":';
if (c.split(enA).length !== 2) { console.error("en anchor"); process.exit(1); }
const enIns = '    "block.longestSuffix": "Longest {n} days",\n';
c = c.replace(enA, enIns + enA);

fs.writeFileSync("src/i18n.ts", c);
console.log("longestSuffix i18n added");
