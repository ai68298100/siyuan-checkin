/* README / 集市预览图生成：从当前 dist 构建捕获真实 UI 截图并合成 preview.png。
   用法：CHECKIN_BROWSER="<chromium 路径>" node scripts/capture-shots.mjs
   输出：docs/images/*.png + preview.png（960x640，集市用）。 */
import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const outDir = path.join(root, "docs", "images");
fs.mkdirSync(outDir, {recursive: true});

const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
const page = await browser.newPage({viewport: {width: 1240, height: 800}, deviceScaleFactor: 2});

const now = new Date();
const day = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const iso = (offset, hour) => `${day(offset)}T${String(hour).padStart(2, "0")}:00:00.000Z`;

const items = [
    {id: "reading", name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, group: "学习", priority: "high", timeSlot: "evening", createdAt: iso(40, 8)},
    {id: "water", name: "喝水", icon: "💧", kind: "quantity", target: 8, unit: "杯", schedule: {type: "daily"}, group: "健康", priority: "high", timeSlot: "any", createdAt: iso(40, 8)},
    {id: "run", name: "晨跑", icon: "🏃", kind: "quantity", target: 3, unit: "公里", schedule: {type: "daily"}, group: "运动", priority: "medium", timeSlot: "morning", createdAt: iso(40, 8)},
    {id: "meditate", name: "冥想", icon: "🕯", kind: "duration", target: 10, unit: "分钟", schedule: {type: "daily"}, group: "专注", priority: "medium", timeSlot: "morning", createdAt: iso(40, 8)},
    {id: "deepwork", name: "深度工作", icon: "💻", kind: "duration", target: 90, unit: "分钟", schedule: {type: "workdays"}, group: "工作", priority: "high", timeSlot: "morning", createdAt: iso(40, 8)},
    {id: "journal", name: "写日记", icon: "✍", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "生活", priority: "low", timeSlot: "evening", createdAt: iso(40, 8)},
    {id: "smokefree", name: "戒烟", icon: "🚭", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "戒除", priority: "high", timeSlot: "any", direction: "atMost", createdAt: iso(40, 8)},
    {id: "vocab", name: "背单词", icon: "📝", kind: "count", target: 20, unit: "个", schedule: {type: "daily"}, group: "学习", priority: "medium", timeSlot: "morning", createdAt: iso(40, 8)},
];
const events = [];
let seq = 0;
for (let offset = 0; offset < 30; offset += 1) {
    for (const item of items) {
        const done = (offset + item.name.length) % 10 < (item.priority === "high" ? 8 : item.priority === "medium" ? 6 : 4);
        if (offset === 0 && ["water", "meditate"].includes(item.id)) {
            events.push({id: `s${seq++}`, itemId: item.id, occurredAt: iso(0, 9), localDate: day(0), value: item.kind === "binary" ? 1 : Math.round(item.target / 2), unit: item.unit, source: "manual"});
        }
        if (done) events.push({id: `e${seq++}`, itemId: item.id, occurredAt: iso(offset, 10), localDate: day(offset), value: item.kind === "binary" ? 1 : item.target, unit: item.unit, source: "manual"});
    }
}

await page.setContent(`<style>body{margin:0;background:#f1effc}</style><main id="frame" style="width:1180px;height:760px;border:0"><div id="dock" style="width:100%;height:100%"></div></main>`);
await page.addStyleTag({path: path.join(root, "dist", "index.css")});
await page.evaluate(({store}) => {
    window.__store = structuredClone(store);
    window.__otherStores = {};
    window.module = {exports: {}};
    window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
    window.require = (name) => {
        if (name !== "siyuan") throw new Error(`unexpected external ${name}`);
        return {
            Plugin: class {
                addIcons() {}
                addDock(options) { window.__dockOptions = options; }
                addTab(options) { window.__tabOptions = options; }
                addTopBar() {}
                addCommand() {}
                loadData(name) { return Promise.resolve(structuredClone(name === "checkin-store" ? window.__store : (window.__otherStores || {})[name] || "")); }
                saveData(name, value) { return Promise.resolve(); }
            },
            getFrontend() { return "desktop"; },
            openTab() { return Promise.resolve({close() {}}); },
            showMessage() {},
        };
    };
}, {store: {version: 1, items, events}});
await page.addScriptTag({path: path.join(root, "dist", "index.js")});
await page.evaluate(async () => {
    const PluginClass = window.module.exports.default || window.module.exports;
    window.__plugin = new PluginClass();
    window.__plugin.onload();
    window.__dockOptions.init.call({element: document.querySelector("#dock")});
    await window.__plugin.onLayoutReady();
    window.__plugin.appearance = "light";
    window.__plugin.render();
});
const goto = (surface) => page.evaluate((name) => {
    const plugin = window.__plugin;
    if (name === "today") plugin.showToday();
    else if (name === "review") plugin.showReview();
    else if (name === "editor") plugin.showEditor();
    else if (name === "settings") plugin.showSettings();
    else if (name === "occasions") plugin.showOccasions();
}, surface);
const setTheme = (theme) => page.evaluate((value) => { window.__plugin.appearance = value; window.__plugin.render(); }, theme);
const shot = (name) => page.locator("#dock").screenshot({path: path.join(outDir, name)});

await goto("today");
await page.waitForTimeout(150);
await shot("today-light.png");

await goto("review");
await page.waitForTimeout(150);
await shot("review-light.png");

await page.evaluate(() => { window.__plugin.appearance = "dark"; window.__plugin.render(); });
await page.waitForTimeout(150);
await shot("review-dark.png");
await page.evaluate(() => { window.__plugin.appearance = "light"; window.__plugin.render(); });

await goto("editor");
await page.waitForTimeout(120);
await page.locator("[data-template-disclosure] > summary").click();
await page.waitForTimeout(120);
await shot("editor-light.png");

await goto("settings");
await page.waitForTimeout(120);
await shot("settings-light.png");

await goto("occasions");
await page.waitForTimeout(120);
await shot("occasions-light.png");

await browser.close();
console.log("captured:", fs.readdirSync(outDir).join(", "));
