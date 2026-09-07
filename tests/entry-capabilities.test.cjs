const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));

const expectedFrontends = ["desktop", "browser-desktop", "desktop-window", "mobile", "browser-mobile"];
assert.deepEqual(
    manifest.frontends,
    expectedFrontends,
    "the manifest must keep every supported SiYuan frontend visible",
);

const onload = source.match(/\bonload\(\)\s*\{([\s\S]*?)\n\s*\}\s*\n\s*async onLayoutReady/)?.[1] || "";
assert.match(onload, /const frontend = getFrontend\(\);/, "frontend capability detection must happen during onload");
assert.match(onload, /this\.isMobileFrontend = frontend === "mobile" \|\| frontend === "browser-mobile";/,
    "only mobile frontends should use the mobile dialog/layout path");
assert.match(onload, /this\.supportsCustomTab = !this\.isMobileFrontend;/,
    "desktop, desktop-window, and browser-desktop must retain custom tabs");

const dockIndex = onload.indexOf("this.addDock({");
assert.notEqual(dockIndex, -1, "all frontends must register the dock entry");
const tabIndex = onload.indexOf("this.addTab({");
assert.ok(tabIndex > dockIndex, "custom tab registration should follow the shared dock registration");
assert.match(onload, /if \(this\.supportsCustomTab\) this\.addTab\(\{/, "mobile frontends must omit custom tab registration");
assert.match(onload, /if \(this\.supportsCustomTab\) this\.addCommand\(\{[\s\S]*?openCheckinTab/,
    "the tab command must be unavailable where custom tabs are unsupported");

const openTabPage = source.match(/private openTabPage\(\)\s*\{([\s\S]*?)\n\s*\}\s*\n\s*private toggleQuickDialog/)?.[1] || "";
assert.match(openTabPage, /if \(!this\.supportsCustomTab \|\| this\.disposed \|\| this\.disposing \|\| this\.tabOpenPromise\)/,
    "tab opening must be guarded against unsupported or disposing frontends");
assert.match(openTabPage, /if \(!this\.supportsCustomTab\) this\.openQuickDialog\(\);/,
    "mobile tab actions must degrade to the quick dialog");
assert.match(openTabPage, /custom:\s*\{[\s\S]*?id: this\.getTabId\(\),[\s\S]*?icon: "iconLvCheckin"/,
    "custom tabs must use the registered plugin tab id and icon");
assert.match(source, /private getTabId\(\): string \{\s*return `\$\{this\.name \|\| "siyuan-checkin"\}\$\{TAB_TYPE\}`;/,
    "openTab must use the same stable id shape as addTab");

const quickCommand = onload.match(/this\.addCommand\(\{\s*langKey: "openCheckin",([\s\S]*?)\n\s*\}\);/)?.[1] || "";
assert.match(quickCommand, /hotkey: QUICK_DIALOG_HOTKEY/);
assert.match(quickCommand, /callback: \(\) => this\.toggleQuickDialog\(\)/);
assert.match(quickCommand, /globalCallback: \(\) => this\.toggleQuickDialog\(\)/);
assert.match(source, /this\.addTopBar\(\{[\s\S]*?id: "openCheckinDialog"[\s\S]*?callback: \(\) => this\.toggleQuickDialog\(\)/,
    "the quick dialog needs a visible top-bar entry in desktop and browser surfaces");
assert.match(source, /\$\{this\.supportsCustomTab \? `<button[\s\S]*?data-action="open-tab"[\s\S]*?` : ""\}/,
    "the today surface must hide the custom-tab action on mobile");

console.log("Multi-frontend entry capability structure checks passed.");
