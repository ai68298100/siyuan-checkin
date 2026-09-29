/* T-1601 全页面隔离内核回归（阶段 5）：真实 dist bundle + 桩宿主（siyuan Dialog/
   fetchSyncPost 可编程、存储 Map 跨重启持久），行为级补齐既有守门确认的两条缺口：
   ①问卷双结果编排——事实先落、文档旁路失败不回滚事实、重试只补文档不重复记账、
     事实层失败不旁路写文档（writeJournalEntry 失败语义已有 journal-experience 覆盖，
     本文件补 onSubmit 编排层）；
   ②重载后状态矩阵（T-1603 契约 4）——持久偏好跨重启恢复、会话态回默认。
   其余场景（统计口径/日期算法/来源身份/提醒动作/事项补标/归档恢复删除/专注结算）
   由 model.test.cjs、date-keys.test.cjs、external-ref.test.cjs、reminder-actions、
   batch-backfill、archived-search、midnight-boundary、record-trust 等既有内核夹具
   覆盖，见 docs/acceptance-ledger-phase5-2026-09-29.md 的 T-1601 覆盖矩阵。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function loadPlaywright() {
    const candidates = [process.env.CHECKIN_PLAYWRIGHT_MODULE, "playwright"].filter(Boolean);
    for (const candidate of candidates) {
        try { return require(candidate); } catch {}
    }
    throw new Error("Playwright is unavailable. Set CHECKIN_PLAYWRIGHT_MODULE to its module path.");
}
const {chromium} = loadPlaywright();
const projectRoot = process.env.CHECKIN_QA_PROJECT_ROOT || path.resolve(__dirname, "..");

const makeStore = () => ({
    version: 1,
    items: [
        {id: "jr", name: "感恩三件事", icon: "🙏", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "心境", journal: {templateId: "gratitude3"}, createdAt: new Date().toISOString()},
        {id: "jr2", name: "晚间复盘", icon: "🌙", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "心境", journal: {templateId: "gratitude3"}, createdAt: new Date().toISOString()},
    ],
    events: [],
});

(async () => {
    const browser = await chromium.launch({headless: true, executablePath: process.env.CHECKIN_BROWSER});
    try {
        /* 注入桩宿主并启动插件；storage 快照由 Node 侧传入（重启语义=同 Map 重新 boot）。 */
        const bootInto = async (page, storage) => {
            await page.setContent('<main id="frame" style="width:1200px;height:820px;border:1px solid #ddd"><div id="dock" style="width:100%;height:100%"></div></main>');
            await page.addStyleTag({path: path.join(projectRoot, "dist", "index.css")});
            await page.evaluate((storage) => {
                window.__storage = storage;
                window.__messages = [];
                window.__kernelCalls = [];
                window.__kernelFail = false;
                window.__failPersist = false;
                window.__docBlocks = [];
                window.module = {exports: {}};
                window.siyuan = {config: {appearance: {mode: 0}, system: {appDir: "", os: "windows"}}};
                window.require = (name) => {
                    if (name !== "siyuan") throw new Error(`Unexpected external: ${name}`);
                    return {
                        Plugin: class {
                            addIcons() {}
                            addDock(options) { window.__dockOptions = options; }
                            addTab() {}
                            addTopBar() {}
                            addCommand() {}
                            loadData(name) { return Promise.resolve(window.__storage[name] === undefined ? undefined : JSON.parse(JSON.stringify(window.__storage[name]))); }
                            saveData(name, value) {
                                return new Promise((resolve, reject) => setTimeout(() => {
                                    if (window.__failPersist && name === "checkin-store") { reject(new Error("disk")); return; }
                                    window.__storage[name] = JSON.parse(JSON.stringify(value));
                                    resolve();
                                }, 10));
                            }
                        },
                        getFrontend() { return "desktop"; },
                        openTab() { return Promise.resolve({close() {}}); },
                        showMessage(message) { window.__messages.push(String(message)); },
                        fetchSyncPost: async (url, payload) => {
                            window.__kernelCalls.push(url);
                            /* A1 失败注入收窄到写入类调用：目标校验（sql）放行，append/update 失败——
                               精确命中「事实已落、文档旁路失败」路径，而非提交前的目标检测失败。 */
                            if (window.__kernelFail && (url.includes("/api/block/appendBlock") || url.includes("/api/block/updateBlock"))) return {code: -1, msg: "offline"};
                            if (url.includes("/api/notebook/lsNotebooks")) return {code: 0, data: {notebooks: [{id: "nb1", name: "Diary"}]}};
                            if (url.includes("/api/query/sql")) {
                                const stmt = String((payload && payload.stmt) || "");
                                if (stmt.includes("content LIKE")) return {code: 0, data: window.__docBlocks.length ? [{id: window.__docBlocks[0]}] : []};
                                /* 块存在性/目标校验查询：回显被查 id（视为文档自身），id 归一化前后都成立。 */
                                const inMatch = stmt.match(/WHERE id IN \('([^']+)'\)/);
                                if (inMatch) return {code: 0, data: [{id: inMatch[1], root_id: inMatch[1], type: "d", hpath: "/Diary", content: "Diary"}]};
                                const eqMatch = stmt.match(/WHERE id = '([^']+)'/);
                                if (eqMatch) return {code: 0, data: [{id: eqMatch[1], root_id: eqMatch[1]}]};
                                return {code: 0, data: []};
                            }
                            if (url.includes("/api/block/appendBlock")) {
                                window.__docBlocks.push(`blk-${window.__docBlocks.length + 1}`);
                                return {code: 0, data: window.__docBlocks[window.__docBlocks.length - 1]};
                            }
                            if (url.includes("/api/block/updateBlock")) return {code: 0, data: "blk-1"};
                            return {code: 0, data: null};
                        },
                        Dialog: class {
                            constructor(options) {
                                this.element = document.createElement("div");
                                this.element.className = "lc-checkin-dialog-host";
                                this.element.innerHTML = options.content;
                                document.body.append(this.element);
                            }
                            destroy() { this.element.remove(); }
                        },
                    };
                };
            }, storage);
            await page.addScriptTag({path: path.join(projectRoot, "dist", "index.js")});
            await page.evaluate(async () => {
                const PluginClass = window.module.exports.default || window.module.exports;
                window.__plugin = new PluginClass();
                window.__plugin.onload();
                const readyPromise = window.siyuanCheckin.whenReady();
                window.__dockOptions.init.call({element: document.querySelector("#dock")});
                await window.__plugin.onLayoutReady();
                await readyPromise;
            });
            await page.waitForTimeout(200);
        };
        const eventCount = (page, itemId) => page.evaluate((itemId) => window.__plugin.store.events.filter((event) => event.itemId === itemId).length, itemId);

        /* —— ① 问卷双结果编排 —— */
        {
            const page = await browser.newPage({viewport: {width: 1280, height: 900}});
            const errors = [];
            page.on("pageerror", (error) => errors.push(error.message));
            const storage = {"checkin-store": makeStore(), "journal.json": {templates: [], integration: {mode: "doc", docId: "20260926120000-doc0000", notebookId: ""}}};
            await bootInto(page, storage);
            assert.equal(await eventCount(page, "jr"), 0);

            /* A1 事实成功 + 文档旁路失败：事件必须已落、不回滚、表单保留草稿。 */
            await page.locator("[data-action='journal']").first().evaluate((b) => b.click());
            await page.waitForSelector("[data-journal-submit]", {state: "attached"});
            const answers = page.locator("[data-journal-answer]");
            for (let index = 0; index < await answers.count(); index += 1) await answers.nth(index).fill(`感恩第${index + 1}件：家人、健康、好天气`);
            await page.evaluate(() => { window.__kernelFail = true; });
            await page.locator("[data-journal-submit]").click();
            await page.waitForFunction(() => window.__messages.some((m) => m.includes("写入日记失败")));
            assert.equal(await eventCount(page, "jr"), 1, "文档旁路失败不回滚事实——事件必须已落账");
            assert.equal(await page.locator("[data-journal-form]").count(), 1, "文档失败后表单保留（重试入口在位）");
            assert.equal(await page.locator("[data-journal-answer]").first().inputValue(), "感恩第1件：家人、健康、好天气", "文档失败保留答案草稿");

            /* A2 重试只补文档：isComplete 已真 → 不再 recordEvent（事件数不变），文档写入成功。 */
            await page.evaluate(() => { window.__kernelFail = false; });
            await page.locator("[data-journal-submit]").click();
            await page.waitForFunction(() => window.__messages.some((m) => m.includes("问卷已写入")));
            assert.equal(await eventCount(page, "jr"), 1, "重试只补文档且不重复记账");
            assert.equal(await page.locator("[data-journal-form]").count(), 0, "成功后表单关闭");

            /* A3 事实层失败：persist 拒绝 → recordEvent 回滚返回空 → 不旁路写文档、草稿保留。 */
            await page.evaluate(() => { window.__failPersist = true; });
            await page.locator("[data-action='journal']").nth(1).evaluate((b) => b.click());
            await page.waitForSelector("[data-journal-submit]", {state: "attached"});
            const answers2 = page.locator("[data-journal-answer]");
            for (let index = 0; index < await answers2.count(); index += 1) await answers2.nth(index).fill("保留这份草稿");
            const callsBeforeA3 = await page.evaluate(() => window.__kernelCalls.length);
            await page.locator("[data-journal-submit]").click();
            await page.waitForFunction(() => window.__messages.some((m) => m.includes("保存失败，请重试")));
            assert.equal(await eventCount(page, "jr2"), 0, "事实层失败不落账");
            /* 只看 A3 提交之后的调用增量（此前 A1 的失败 append 尝试已计入历史）。 */
            assert.equal(await page.evaluate((from) => window.__kernelCalls.slice(from).filter((url) => url.includes("/api/block/")).length, callsBeforeA3), 0, "事实层失败不旁路写文档（提交零写入类内核调用）");
            assert.equal(await page.locator("[data-journal-answer]").first().inputValue(), "保留这份草稿", "事实失败保留答案草稿");
            assert.deepEqual(errors, [], "问卷双结果链路零页面错误");
            await page.close();
        }

        /* —— ② 重载后状态矩阵（契约 4：持久偏好恢复 / 会话态回默认） —— */
        {
            const page = await browser.newPage({viewport: {width: 1280, height: 900}});
            const storage = {
                "checkin-store": {version: 1, items: [{id: "walk", name: "晨间散步", icon: "🚶", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}, group: "健康", createdAt: new Date().toISOString()}], events: []},
                "checkin-view-preferences": {groupMode: "group", appearance: "dark", completedCollapsed: false},
            };
            await bootInto(page, storage);
            assert.equal(await page.locator(".lc-checkin").getAttribute("data-appearance"), "dark", "持久偏好：外观暗色生效");
            assert.ok(await page.locator("[data-group-toggle]").count() >= 1, "持久偏好：分组模式生效（默认 none 无组头）");

            /* 会话态：回顾 records 工作区 + 历史搜索——重启后必须回默认（会话态不持久）。 */
            await page.locator('[data-mobile-nav="review"]').first().evaluate((b) => b.click());
            await page.waitForTimeout(200);
            await page.locator('[data-review-workspace="records"]').first().evaluate((b) => b.click());
            await page.waitForTimeout(200);
            await page.locator("[data-history-search]").fill("散步");
            await page.waitForTimeout(600); /* 搜索防抖落定 */
            assert.equal(await page.locator('[data-review-workspace="records"]').first().getAttribute("aria-pressed"), "true", "会话态会话内生效");

            /* 重启：同 storage 重新 boot（loadData 返回持久槽，会话内存不携带）。 */
            await page.reload();
            await bootInto(page, storage);
            assert.equal(await page.locator(".lc-checkin").getAttribute("data-appearance"), "dark", "重启后持久偏好仍恢复（外观）");
            assert.ok(await page.locator("[data-group-toggle]").count() >= 1, "重启后持久偏好仍恢复（分组）");
            await page.locator('[data-mobile-nav="review"]').first().evaluate((b) => b.click());
            await page.waitForTimeout(200);
            assert.equal(await page.locator('[data-review-workspace="overview"]').first().getAttribute("aria-pressed"), "true", "重启后会话态回默认：回顾工作区=总览");
            assert.equal(await page.locator('[data-review-workspace="records"]').first().getAttribute("aria-pressed"), "false", "重启后 records 不再选中");
            await page.locator('[data-review-workspace="records"]').first().evaluate((b) => b.click());
            await page.waitForTimeout(200);
            assert.equal(await page.locator("[data-history-search]").inputValue(), "", "重启后会话态回默认：历史搜索清空");
            await page.close();
        }

        await browser.close();
        console.log("kernel regression passed: journal dual-result orchestration + reload state matrix (contract 4)");
    } finally {
        await browser.close().catch(() => undefined);
    }
})().catch((error) => { console.error(String(error && error.message || error)); process.exit(1); });
