const fs = require("fs");
let c = fs.readFileSync("tests/e2e/docktomato-completion.spec.mjs", "utf8");
const q = String.fromCharCode(39);
const bad = "    await page.click('" + q + "[data-mobile-nav=" + q + "settings" + q + "]' + q + ");";
if (c.split(bad).length !== 2) { console.error("nav anchor missing"); process.exit(1); }
c = c.replace(bad, "    await page.click(\"" + q + "[data-mobile-nav=" + q + "settings" + q + "]" + q + "\");");
fs.writeFileSync("tests/e2e/docktomato-completion.spec.mjs", c);
console.log("nav click fixed");
