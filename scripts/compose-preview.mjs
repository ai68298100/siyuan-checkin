/* 合成 preview.png（960x640 集市预览）：将 docs/images 截图排入品牌化版式并截图。
   用法：CHECKIN_BROWSER="<chromium>" node scripts/compose-preview.mjs */
import fs from "node:fs";
import path from "node:path";
import {chromium} from "playwright";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")), "..");
const images = path.join(root, "docs", "images");
const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
const page = await browser.newPage({viewport: {width: 960, height: 640}, deviceScaleFactor: 2});

const cell = (file, caption) => `<figure><img src="${file}"><figcaption>${caption}</figcaption></figure>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin: 0; box-sizing: border-box; }
    body { width: 960px; height: 640px; font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
           background: linear-gradient(135deg, #ece9fb 0%, #e3ecfd 55%, #eef2fe 100%); padding: 26px 30px; }
    header { display: flex; align-items: baseline; gap: 14px; margin-bottom: 16px; }
    h1 { font-size: 30px; color: #3b3a58; letter-spacing: 1px; }
    header p { font-size: 15px; color: #6f6d95; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    figure { background: #fff; border-radius: 12px; padding: 8px 8px 6px; box-shadow: 0 6px 18px rgba(80, 70, 160, .14); }
    figure img { width: 100%; height: 212px; object-fit: cover; object-position: top; border-radius: 8px; display: block; }
    figcaption { font-size: 13px; color: #55537a; padding: 6px 2px 2px; font-weight: 600; }
    footer { margin-top: 14px; font-size: 13px; color: #6f6d95; display: flex; gap: 18px; }
    b { color: #4b49a8; }
</style></head><body>
    <header><h1>小驴打卡 · v18</h1><p>思源笔记 · 本地打卡、习惯与复盘工作台</p></header>
    <div class="grid">
        ${cell("today-light.png", "今日 · 连续与提醒")}
        ${cell("review-light.png", "回顾 · 概览/记录/分析")}
        ${cell("editor-light.png", "新建 · 61 个内置模板")}
        ${cell("review-dark.png", "深色 · 独立双主题")}
    </div>
    <footer><span><b>本地优先</b> 无网络可用</span><span><b>61 模板</b> 八类场景</span><span><b>中/EN</b> 双语界面</span><span><b>公开 API v5</b> 契约自测包</span></footer>
</body></html>`;
const htmlPath = path.join(images, "preview-layout.html");
fs.writeFileSync(htmlPath, html);
await page.goto("file:///" + htmlPath.replace(/\\/g, "/"));
await page.waitForTimeout(400);
await page.screenshot({path: path.join(root, "preview.png"), clip: {x: 0, y: 0, width: 960, height: 640}});
fs.rmSync(htmlPath);
await browser.close();
const kb = Math.round(fs.statSync(path.join(root, "preview.png")).size / 1024);
console.log(`preview.png composed: 960x640, ${kb}KB`);
