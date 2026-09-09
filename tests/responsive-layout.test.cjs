const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const todayStyles = fs.readFileSync(path.join(__dirname, "..", "src", "today-v4.scss"), "utf8");
const historyStyles = fs.readFileSync(path.join(__dirname, "..", "src", "history-v4.scss"), "utf8");
const summaryStyles = fs.readFileSync(path.join(__dirname, "..", "src", "summary-v4.scss"), "utf8");
const settingsStyles = fs.readFileSync(path.join(__dirname, "..", "src", "settings-v4.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

assert.match(styles, /\.lc-checkin\s*\{[\s\S]*container-name:\s*lc-checkin;[\s\S]*container-type:\s*inline-size;/,
    "each check-in surface must expose its own inline-size container");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*560px\)[\s\S]*\.lc-checkin__item\s*\{[\s\S]*display:\s*grid;/,
    "narrow surfaces must switch item cards to a width-safe grid");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*560px\)[\s\S]*\.lc-checkin__item-topline\s*\{[\s\S]*flex-wrap:\s*wrap;/,
    "item names and controls must be allowed to wrap in narrow docks");
assert.match(styles, /\.lc-checkin__item-name\s*\{[\s\S]*flex:\s*1 1 auto;[\s\S]*min-width:\s*0;/,
    "item names must retain a shrinkable flex slot");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*360px\)/,
    "very narrow surfaces need a second compact layout tier");
assert.match(styles, /\.lc-checkin__item-body\s*\{[\s\S]*max-width:\s*100%;[\s\S]*overflow:\s*hidden;/,
    "item bodies must stay shrinkable inside narrow docks");
assert.match(source, /lc-checkin__today-summary/,
    "today view must expose a compact progress summary region");
assert.match(source, /没有待处理的匹配项/,
    "today pending-only empty state must explain when no pending item matches");
assert.match(source, /匹配的项目都已完成/,
    "today search state must distinguish completed matches");
assert.match(todayStyles, /@media\s*\(max-width:\s*600px\)[\s\S]*\.lc-checkin__mobile-nav\s*\{[\s\S]*grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/,
    "mobile navigation must keep all eight destinations in one stable row");
assert.match(todayStyles, /\.lc-checkin--today \.lc-checkin__organize \.lc-checkin__today-search,[\s\S]*\.lc-checkin--today \.lc-checkin__organize \.lc-checkin__filter-toggle\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1;/,
    "today mobile filters must give search and pending toggle the full row");
assert.match(historyStyles, /@media\s*\(min-width:\s*900px\)[\s\S]*grid-template-columns:\s*minmax\(340px,\s*\.9fr\)\s+minmax\(0,\s*1\.15fr\)/,
    "history desktop layout must keep calendar and records in two columns");
assert.match(historyStyles, /@media\s*\(max-width:\s*600px\)[\s\S]*\.lc-checkin__history-event\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/,
    "history mobile records must reserve a dedicated value column");
assert.match(summaryStyles, /\.lc-checkin--summary \.lc-checkin__summary-stats\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
    "summary must present its three overview metrics as a stable row");
assert.match(summaryStyles, /@media\s*\(max-width:\s*600px\)[\s\S]*\.lc-checkin--summary \.lc-checkin__custom-range\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
    "summary custom dates must collapse into two safe mobile columns");
assert.match(settingsStyles, /\.lc-checkin--settings \.lc-checkin__field\s*\{[\s\S]*grid-template-columns:\s*minmax\(110px,\s*\.34fr\)\s+minmax\(0,\s*\.66fr\)/,
    "settings desktop fields must align labels and controls predictably");
assert.match(settingsStyles, /@media\s*\(max-width:\s*600px\)[\s\S]*\.lc-checkin--settings \.lc-checkin__field\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
    "settings mobile fields must stack labels above controls");
assert.match(styles, /\.lc-checkin__item-tag\s*\{[\s\S]*max-width:\s*32%;[\s\S]*text-overflow:\s*ellipsis;/,
    "metadata tags must not consume the item name slot");
assert.match(styles, /\.lc-checkin__custom-range\s*\{[\s\S]*display:\s*flex;/,
    "custom summary dates need a compact responsive control");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*440px\)[\s\S]*\.lc-checkin__form-row,[\s\S]*\.lc-checkin__organization-fields,[\s\S]*\.lc-checkin__history-filter-row\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
    "narrow surfaces must collapse form and history controls into one column");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*440px\)[\s\S]*\.lc-checkin__range-tabs\s*\{[\s\S]*margin-left:\s*0;/,
    "summary tabs must use the full narrow surface width");
assert.match(styles, /@container\s+lc-checkin\s*\(max-width:\s*440px\)[\s\S]*\.lc-checkin__history-event\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/,
    "history records must keep actions usable inside narrow docks");

console.log("Responsive surface layout checks passed.");
