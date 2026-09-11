const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const tokens = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "tokens.scss"), "utf8");
const components = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");

/* Style system wiring: legacy floor loads first, then the v5 token and
   component layers; the v4 patch layers are gone. */
assert.ok(source.includes('import "./index.scss";'), "legacy floor stylesheet must stay imported");
assert.ok(source.indexOf('import "./ui/tokens.scss";') > source.indexOf('import "./index.scss";'),
    "token layer must load after the legacy floor");
assert.ok(source.indexOf('import "./ui/components.scss";') > source.indexOf('import "./ui/tokens.scss";'),
    "component layer must load after tokens");
for (const name of ["today", "history", "summary", "settings", "occasions", "insights", "archived", "modern"]) {
    assert.ok(!source.includes(`import "./${name}-v4.scss";`), `the ${name}-v4 patch layer must be retired`);
}

/* Container-driven layout: the surface declares one inline-size container and
   every layout decision keys off it, never the viewport. */
assert.match(tokens, /container:\s*lc5\s*\/\s*inline-size;/,
    "each check-in surface must expose a single inline-size container named lc5");
assert.ok(!/ @container lc-checkin /.test(components), "component queries must target the lc5 container");
assert.match(components, /@container\s+lc5\s*\(max-width:\s*719px\)[\s\S]*\.lc-checkin__rail\s*\{\s*display:\s*none;/,
    "shortcut form must hide the desktop rail");
assert.match(components, /@container\s+lc5\s*\(min-width:\s*720px\)[\s\S]*grid-template-columns:\s*var\(--lc-checkin-rail-width\)\s+minmax\(0,\s*1fr\)/,
    "desktop form must split into rail and content columns from the medium band up");
assert.match(components, /@container\s+lc5\s*\(min-width:\s*900px\)[\s\S]*\.lc-checkin--today \.lc-checkin__group-items\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
    "desktop today shelf keeps two columns");

/* Header discipline: compact, never sticky. */
assert.match(components, /\.lc-checkin__header,\n\.lc-checkin__editor-header \{[^}]*position:\s*static;/,
    "page headers must not go sticky over scrolling content");
assert.match(components, /\.lc-checkin__header-date/,
    "today header must show the date inline with the title");

/* Rows are the primary checklist unit. */
assert.match(components, /\.lc-checkin--today \.lc-checkin__item\s*\{[^}]*grid-template-areas:\s*"icon body action"/,
    "today items must render as one-action rows");
assert.match(components, /\.lc-checkin--today \.lc-checkin__item::before\s*\{\s*display:\s*none;\s*\}/,
    "rows must not carry the legacy accent stripe");
assert.match(components, /\.lc-checkin--today \.lc-checkin__section-toggle/,
    "completed items must collapse behind one toggle row");

/* Navigation: five destinations, shared by rail and bottom bar, plus the FAB. */
const navEntries = source.match(/const entries = \[\[("today", "今日", "home"\], \["review", "回顾", "summary"\], \["occasions", "事项", "calendar"\], \["archived", "归档", "archive"\], \["settings", "设置", "settings"\])\] as const;/);
assert.ok(navEntries, "navigation must expose exactly today/review/occasions/archived/settings in that order");
assert.match(source, /private renderRail\(\): string/, "desktop surfaces need the labelled rail");
assert.match(components, /\.lc-checkin__mobile-nav \{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)\s+auto;/,
    "bottom navigation keeps five destinations plus the floating add action");
assert.match(components, /\.lc-checkin__mobile-nav button\.is-selected span \{[^}]*background:\s*var\(--lc-checkin-accent-fill\);/,
    "the selected destination uses the solid accent disc");

/* Review fusion: one surface for calendar, day details, stats and projects. */
assert.match(source, /private renderReview\(\): string/, "review page must exist");
assert.ok(!source.includes("private renderHistory(): string") && !source.includes("private renderSummary(): string"),
    "history and summary pages must be retired into review");
assert.match(source, /lc-checkin__review-projects/, "review must include the project summary table");
assert.match(source, /data-review-insights-id/, "project rows must drill into the item insights view");
assert.match(components, /@container\s+lc5\s*\(min-width:\s*880px\)[\s\S]*\.lc-checkin__review-layout\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*\.85fr\)/,
    "review calendar and day details form two columns on desktop");

/* Occasion banner: a slim strip, never a box that fights the checklist. */
assert.match(components, /\.lc-checkin__occasion-banner\s*\{[^}]*min-height:\s*50px;/,
    "the date reminder banner stays a slim strip");

/* Density is gone. */
assert.ok(!source.includes("cycleDensity") && !source.includes("data-density-choice"),
    "the density cycler must be removed");
assert.ok(!/density-options/.test(components), "density options styling must be removed");

/* Dialog sizing preference. */
assert.match(source, /private quickDialogSize\(\): \{width: string; height: string\}/,
    "quick dialog sizing must follow the stored preference");
assert.match(source, /dialogSizeMode === "fullscreen"/, "fullscreen dialog mode must be supported");

/* Standalone dual themes: fixed palette, no runtime dependency on host --b3-* values. */
assert.match(tokens, /--lc-checkin-accent:\s*#7B85F4;/, "light palette keeps the periwinkle accent");
assert.match(tokens, /\[data-appearance="dark"\]\s*\{[^}]*--lc-checkin-accent:\s*#8B93F8;/,
    "dark palette has its own accent");
const aliasOnly = tokens.replace(/--b3-[a-z-]+:\s*var\(--lc-checkin-[a-z-]+\);?/g, "");
assert.ok(!aliasOnly.includes("var(--b3-"), "tokens must not derive colors from host --b3-* variables");
assert.match(tokens, /--b3-theme-background:\s*var\(--lc-checkin-bg\);/,
    "legacy floor inherits the standalone palette via scoped aliases");
assert.ok(!components.includes("--b3-"), "component layer must not reference host variables");

/* Kept behaviours from the 4.0 line. */
assert.match(source, /没有待处理的匹配项/, "pending-only empty state must explain when nothing matches");
assert.match(source, /匹配的项目都已完成/, "search state must distinguish completed matches");
assert.match(styles, /\.lc-checkin__item-tag\s*\{[^}]*max-width:\s*32%;/,
    "legacy floor still guards metadata tag width");

console.log("Responsive surface layout checks passed.");
