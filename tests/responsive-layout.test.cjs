const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const styles = fs.readFileSync(path.join(__dirname, "..", "src", "index.scss"), "utf8");
const tokens = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "tokens.scss"), "utf8");
const components = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "components.scss"), "utf8");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "review.ts"), "utf8");
assert.match(source, /size: \{width: 420, height: 0\}/, "dock opens at the recommended readable width");
assert.match(components, /@container lc-dock \(max-width: 480px\)[\s\S]*?\.lc-checkin-dock-host \.lc-checkin--today \.lc-checkin__item-action \{ grid-column: 2;/, "narrow dock actions move below item content");
assert.match(components, /@container lc-dock \(max-width: 340px\)[\s\S]*?grid-column: 1 \/ -1;/, "extremely narrow dock actions use the full card width");

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
assert.match(components, /@container\s+lc5\s*\(min-width:\s*720px\)[\s\S]*\.lc-checkin__layout \{\s*padding:\s*0 24px 40px;/,
    "desktop layout is a single full-width column (navigation lives in the top bar, T-032)");
assert.match(components, /@container\s+lc5\s*\(min-width:\s*900px\)[\s\S]*\.lc-checkin--today \.lc-checkin__group-items\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(390px,\s*1fr\)\)/,
    "desktop today shelf auto-fills with cards wide enough for name plus actions");
assert.match(components, /@container\s+lc5\s*\(min-width:\s*720px\)[\s\S]*?\.lc-checkin--today \.lc-checkin__group-items\s*> \.lc-checkin__item:last-child:nth-child\(odd\):not\(:only-child\)\s*\{\s*grid-column:\s*1 \/ -1;/,
    "desktop today shelves give an odd final card the full row");

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

/* Navigation: five destinations, shared by top nav and bottom bar, plus the add action. */
const navEntries = source.includes(`const entries = [["today", t("nav.today"), "home"], ["review", t("nav.review"), "summary"], ["occasions", t("nav.occasions"), "calendar"], ["settings", t("nav.settings"), "settings"]] as const;`);
assert.ok(navEntries, "navigation must expose exactly today/review/occasions/settings in that order");
assert.match(source, /private renderTopNav\(root: HTMLElement\): string/, "desktop surfaces need host-aware labelled top navigation");
assert.match(components, /\.lc-checkin__mobile-nav \{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/,
    "bottom navigation keeps five equal cells for four destinations plus the add action");
assert.match(components, /\.lc-checkin__mobile-nav-add \{/,
    "the add action lives inside the bottom bar instead of floating over the list");
assert.ok(!source.includes("lc-checkin__mobile-fab"),
    "the legacy floating add button markup is gone (the add action lives in the bottom bar)");
assert.match(components, /\.lc-checkin__mobile-nav button\.is-selected span \{[^}]*background:\s*var\(--lc-checkin-accent-fill\);/,
    "the selected destination uses the solid accent disc");

/* Review fusion: one surface for calendar, day details, stats and projects. */
assert.match(source, /private renderReview\(\): string/, "review page must exist");
assert.ok(!source.includes("private renderHistory(): string") && !source.includes("private renderSummary(): string"),
    "history and summary pages must be retired into review");
assert.match(reviewSource, /lc-checkin__review-projects/, "review must include the project summary table");
assert.match(reviewSource, /data-review-insights-id/, "project rows must drill into the item insights view");
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
const quickDialogSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "quick-dialog.ts"), "utf8");
assert.match(quickDialogSource, /dialogSizeMode === "fullscreen"/, "fullscreen dialog mode must be supported");

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
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.match(i18nSource, /"today\.pendingEmpty": "没有待处理的匹配项"/, "pending-only empty state must explain when nothing matches");
assert.match(i18nSource, /"today\.queryCompleted": "匹配的项目都已完成"/, "search state must distinguish completed matches");
assert.match(components, /Today card foundations[\s\S]*\.lc-checkin__item-tag\s*\{[^}]*max-width:\s*32%;/,
    "component layer guards metadata tag width");

/* Review's jump rail is inside the scrolling surface; host chrome is a
   sibling, so a legacy 58px offset would leave the rail floating over the
   calendar/detail content.  The final component layer must reset it to the
   scrollport edge and use an opaque surface. */
assert.match(components, /Review jump rail:[\s\S]*\.lc-checkin--review \.lc-checkin__review-subnav\s*\{[\s\S]*top:\s*0\s*!important;[\s\S]*background:\s*var\(--lc-checkin-bg\);/,
    "review jump rail must dock to the scrollport edge with an opaque background");

/* Native details elements expose their descendants in static DOM snapshots.
   Keep explicit closed-state guards so menus and help panels cannot consume
   layout space before the user opens them. */
assert.match(components, /\.lc-checkin__review-more:not\(\[open\]\)\s*>\s*\.lc-checkin__review-more-menu\s*\{\s*display:\s*none;/,
    "the review more-tools menu must stay hidden while its details element is closed");
assert.match(components, /:is\(\.lc-checkin__occasion-help,\s*\.lc-checkin__occasion-actions-help\):not\(\[open\]\)\s*>\s*div\s*\{\s*display:\s*none;/,
    "occasion help content must stay hidden while its details element is closed");
assert.match(components, /details:not\(\[open\]\)\s*>\s*:not\(summary\)\s*\{\s*display:\s*none\s*!important;/,
    "all closed details bodies must stay out of layout in embedded WebViews");
assert.match(source, /replaceOccasionIcon[\s\S]*data-occasion-edit/, "icon normalization must preserve occasion action labels");
assert.match(source, /data-occasion-toggle.*classList\.contains\("is-on"\)/, "occasion toggle icon state must come from its stable state class");

/* Compact editors use the surface as the only page scroll owner.  The icon
   catalogue is a bounded in-flow panel, so expanding templates or icons does
   not create a nested full-page scroller or clip the save controls. */
assert.match(components, /@container\s+lc-dock\s*\(max-width:\s*719px\)[\s\S]*\.lc-checkin-dock-host \.lc-checkin--editor \.lc-checkin__form-scroll\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/,
    "narrow dock editors must delegate page scrolling to their outer surface");
assert.match(components, /@container\s+lc5\s*\(max-width:\s*719px\)[\s\S]*\.lc-checkin__icon-popup\[open\] \.lc-checkin__popup-body\s*\{[^}]*position:\s*static;[^}]*max-height:\s*min\(52dvh,\s*420px\);[^}]*overflow:\s*auto;/,
    "compact icon catalogues must open in flow with their own bounded scrolling area");
assert.match(components, /@container\s+lc5\s*\(max-width:\s*340px\)[\s\S]*\.lc-checkin--today \.lc-checkin__header-actions\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow:\s*hidden;/,
    "the 320px Today header must keep streak and progress badges on one compact row");

/* Dock navigation geometry: reference sidebars use equal tracks and let
   labels shrink before they can push the host wider.  Keep this contract in
   the final cascade so later visual layers cannot reintroduce intrinsic-width
   overflow or an off-centre add action. */
assert.match(components, /12\.0 dock navigation geometry guard[\s\S]*\.lc-checkin-dock-host > \.lc-checkin__mobile-nav\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
    "narrow dock navigation must keep five equal, shrinkable tracks");
assert.match(components, /12\.0 dock navigation geometry guard[\s\S]*\.lc-checkin-dock-host > \.lc-checkin__mobile-nav > button\s*\{[\s\S]*justify-items:\s*center;[\s\S]*min-width:\s*0;/,
    "narrow dock buttons must centre icon/label content without intrinsic overflow");
assert.match(components, /12\.0 dock navigation geometry guard[\s\S]*\.lc-checkin-dock-host > \.lc-checkin__rail > button\s*\{[\s\S]*flex:\s*1 1 0;[\s\S]*min-width:\s*72px;/,
    "wide dock rail buttons must distribute evenly while retaining a usable minimum");

console.log("Responsive surface layout checks passed.");
