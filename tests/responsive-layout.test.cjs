const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const todayStyles = fs.readFileSync(path.join(__dirname, "..", "src", "today-v4.scss"), "utf8");
const historyStyles = fs.readFileSync(path.join(__dirname, "..", "src", "history-v4.scss"), "utf8");
const summaryStyles = fs.readFileSync(path.join(__dirname, "..", "src", "summary-v4.scss"), "utf8");
const settingsStyles = fs.readFileSync(path.join(__dirname, "..", "src", "settings-v4.scss"), "utf8");
const occasionsStyles = fs.readFileSync(path.join(__dirname, "..", "src", "occasions-v4.scss"), "utf8");
const insightsStyles = fs.readFileSync(path.join(__dirname, "..", "src", "insights-v4.scss"), "utf8");
const archivedStyles = fs.readFileSync(path.join(__dirname, "..", "src", "archived-v4.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

const v4Imports = ["today", "history", "summary", "settings", "occasions", "insights", "archived"]
    .map((name) => `import \"./${name}-v4.scss\";`);
const importPositions = v4Imports.map((statement) => source.indexOf(statement));
assert.ok(importPositions.every((position) => position >= 0),
    "all 4.0 surface style layers must be imported");
assert.ok(importPositions.every((position, index) => index === 0 || position > importPositions[index - 1]),
    "4.0 surface style layers must load after the legacy stylesheet in a stable order");
assert.ok(source.indexOf('import "./index.scss";') < importPositions[0],
    "legacy stylesheet must load before the 4.0 surface layers");

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
assert.match(todayStyles, /@media\s*\(max-width:\s*600px\)[\s\S]*\.lc-checkin--today > \.lc-checkin__header \.lc-checkin__icon-button\[data-action="add"\]\s*\{\s*display:\s*none;/,
    "mobile today view must not duplicate the bottom navigation add action with a floating button");
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
assert.match(occasionsStyles, /\.lc-checkin--occasions \.lc-checkin__occasion-manager\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*\.9fr\)\s+minmax\(0,\s*1\.1fr\)/,
    "occasion manager desktop layout must keep form and list side by side");
assert.match(occasionsStyles, /@media\s*\(max-width:\s*700px\)[\s\S]*\.lc-checkin--occasions \.lc-checkin__occasion-manager\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
    "occasion manager mobile layout must stack form and list");
assert.match(occasionsStyles, /@media\s*\(max-width:\s*700px\)[\s\S]*\.lc-checkin--occasions \.lc-checkin__occasion-manager-row\s*\{[\s\S]*grid-template-columns:\s*30px\s+minmax\(0,\s*1fr\)\s+repeat\(3,\s*32px\)/,
    "occasion mobile rows must keep all compact actions on one scan line");
assert.match(insightsStyles, /\.lc-checkin--insights \.lc-checkin__insight-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(14,\s*minmax\(0,\s*1fr\)\)/,
    "insights desktop status grid must expose a stable two-week rhythm");
assert.match(insightsStyles, /@media\s*\(max-width:\s*700px\)[\s\S]*\.lc-checkin--insights \.lc-checkin__coaching-list\s*\{[\s\S]*grid-template-columns:\s*1fr;/,
    "insights mobile coaching cards must stack for readable evidence");
assert.match(archivedStyles, /\.lc-checkin--archived > \.lc-checkin__history-list \.lc-checkin__history-row\s*\{[\s\S]*min-height:\s*56px/,
    "archived items must expose a stable recovery row");
assert.match(archivedStyles, /\.lc-checkin--archived > \.lc-checkin__history-list\s*\{[\s\S]*flex:\s*0 0 auto;[\s\S]*align-content:\s*start;/,
    "archived list must not stretch a single recovery row to fill the viewport");
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
assert.match(todayStyles, /@media\s*\(min-width:\s*601px\)[\s\S]*\.lc-checkin--today \.lc-checkin__item-name[\s\S]*white-space:\s*normal/,
    "desktop today cards must allow item names to wrap instead of truncating them");

console.log("Responsive surface layout checks passed.");
