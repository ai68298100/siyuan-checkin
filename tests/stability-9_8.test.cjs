/* 9.8 稳定化结构守门：把近期现场反馈固化为不可回退的契约。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");

const plugin = read("src", "index.ts");
const settings = read("src", "render", "settings.ts");
const components = read("src", "ui", "components.scss");
const roadmap = read("docs", "development-roadmap.md");
const i18n = read("src", "i18n.ts");
const occasions = read("src", "render", "occasions.ts");
const packageJson = JSON.parse(read("package.json"));

assert.match(plugin, /if \(!this\.isMobileFrontend\) root\.insertAdjacentHTML\("afterbegin", this\.renderTopNav\(root\)\)/,
    "desktop top navigation must stay outside the scrolling layout");
assert.match(settings, /set\.showOlderSnapshots/,
    "settings must disclose older restore points instead of rendering all rows expanded");
assert.match(settings, /set\.showOlderAudit/,
    "settings must disclose older audit entries instead of rendering all rows expanded");
assert.match(components, /border-left: 2px solid color-mix\(in srgb, var\(--lc-checkin-accent\) 48%/,
    "desktop card status rail must use the softened 2px treatment");
assert.match(roadmap, /9\.8\.x 稳定化清单/,
    "the stabilization window must remain documented before feature expansion");

const checks = [
    [plugin, /root\.insertAdjacentHTML\("beforeend", this\.renderMobileNav\(\)\)/, "mobile nav is host-level"],
    [plugin, /this\.syncRecentRecordToast\(\)/, "toast sync remains centralized"],
    [plugin, /pageScrollTops = new WeakMap/, "scroll memory is surface scoped"],
    [plugin, /pendingFocusItemId/, "focus restoration state remains available"],
    [plugin, /normalizeUiIcons\(root\)/, "icons normalize after each render"],
    [settings, /snapshotLatest/, "latest snapshot label remains visible"],
    [settings, /snapshotOlder/, "older snapshot rows retain labels"],
    [settings, /data-restore-snapshot=/, "snapshot restore action remains addressable"],
    [settings, /data-action=\"export-snapshots\"/, "snapshot export remains available"],
    [settings, /data-action=\"clear-snapshots\"/, "snapshot clear remains available"],
    [settings, /data-action=\"export-audit\"/, "audit export remains available"],
    [settings, /data-action=\"clear-audit\"/, "audit clear remains available"],
    [occasions, /data-occasion-toitem=/, "occasion conversion remains explicit"],
    [occasions, /data-occasion-edit=/, "occasion edit action remains explicit"],
    [occasions, /data-occasion-toggle=/, "occasion enable action remains explicit"],
    [occasions, /data-occasion-delete=/, "occasion delete action remains explicit"],
    [occasions, /lc-checkin__occasion-row-meta/, "occasion metadata remains structured"],
    [occasions, /lc-checkin__occasion-row-note/, "occasion notes remain visible"],
    [components, /\.lc-checkin__settings-fold \{/, "settings fold has a dedicated style"],
    [components, /\.lc-checkin__settings-fold-item/, "fold wrapper does not inherit card padding"],
    [components, /\.lc-checkin__settings-fold\[open\]/, "fold open state has visual feedback"],
    [components, /\.lc-checkin__occasion-row-meta/, "occasion metadata has responsive layout"],
    [components, /-webkit-line-clamp: 2/, "occasion note display is bounded"],
    [components, /grid-template-columns: minmax\(380px, 480px\)/, "desktop occasion list has readable width"],
    [components, /border-left: 2px solid color-mix/, "desktop status rail is subtle"],
    [components, /@container lc5 \(min-width: 1500px\)/, "wide desktop spacing is bounded"],
    [components, /grid-template-columns: repeat\(auto-fill, minmax\(380px, 1fr\)\)/, "wide shelf keeps card minimum"],
    [i18n, /set\.showOlderSnapshots/, "older snapshot copy is localized"],
    [i18n, /set\.showOlderAudit/, "older audit copy is localized"],
    [packageJson.scripts["test:ui"], /stability-9_8\.test\.cjs/, "stability guard is in UI gate"],
];
for (const [source, pattern, label] of checks) assert.match(source, pattern, label);

console.log("9.8 stability structure checks passed.");
