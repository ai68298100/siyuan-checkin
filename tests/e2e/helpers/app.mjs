/* E2E 页面对象：打开真实例前端并等待插件公开 API 就绪；同时提供内核侧读写与写请求计数。 */
import fs from "node:fs";
import path from "node:path";
import {SiyuanClient} from "../../../scripts/e2e/lib.mjs";

const artifactsDir = path.resolve(import.meta.dirname, "..", "..", "..", ".artifacts", "e2e");

/** 目标信息按名字分文件：默认桌面实例，只读实例走 target-readonly.json。 */
export function target(name = "target") {
    const file = path.join(artifactsDir, `${name}.json`);
    if (!fs.existsSync(file)) throw new Error(`缺少 ${file}，请通过对应的 pnpm run test:e2e* 启动`);
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function createClient(name = "target") {
    const {baseURL, token} = target(name);
    return new SiyuanClient({baseURL, token});
}

/** bundle 取 desktop / mobile：内核按目录提供不同前端构建，插件两端都要能起。 */
export function appURL({bundle = "desktop", target: targetName = "target", extraParams = {}} = {}) {
    const {baseURL, token} = target(targetName);
    const params = new URLSearchParams(extraParams);
    if (token) params.set("token", token);
    const query = params.toString();
    return `${baseURL}/stage/build/${bundle}/${query ? `?${query}` : ""}`;
}

/** 等插件实例就绪：window.siyuanCheckin 是打卡对生态暴露的唯一入口。 */
export async function openCheckin(page, options = {}) {
    await page.goto(appURL(options), {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => typeof window.siyuanCheckin?.whenReady === "function", undefined, {timeout: 45000});
    const ready = await page.evaluate(() => window.siyuanCheckin.whenReady());
    if (!ready) throw new Error("插件未完成初始化（initializationState 未进入 ready）");
    /* whenReady 只在插件 onLayoutReady 完成后置真，比等编辑器容器更可靠：
       全新工作区没有笔记本，.protyle-wsy 本来就不存在。 */
    return page;
}

/** 打开插件的「今日」页签（走与命令面板相同的 openTabPage 真实路径；今日页 DOM 断言的前置）。 */
export async function openTodayPage(page) {
    await page.evaluate(() => {
        const app = window.siyuan?.ws?.app;
        const plugin = app?.plugins?.find((entry) => entry.name === "siyuan-checkin");
        if (!plugin) throw new Error("plugin instance not found");
        plugin.openTabPage();
    });
    await page.waitForSelector(".lc-checkin--today", {timeout: 20000});
    return page;
}

export async function apiDescriptor(page) {
    return page.evaluate(() => {
        const described = window.siyuanCheckin.describe();
        return {name: described.name, version: described.version, protocol: described.protocol, capabilities: [...described.capabilities]};
    });
}

export async function snapshotStore(page) {
    return page.evaluate(() => JSON.parse(JSON.stringify(window.siyuanCheckin.getStore())));
}

/** 通过内核文件接口注入一个打卡项：走的是插件真实读取路径，不依赖任何内部方法。 */
export function makeTestItem(prefix) {
    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return {id: `e2e-${prefix}-${stamp}`, name: `E2E ${prefix} ${stamp}`, kind: "binary", target: 1, unit: "次", schedule: {type: "daily"}};
}

export async function seedStore(client, baseStore, items) {
    await client.putFile("checkin-store", {...baseStore, items: [...(baseStore.items || []), ...items]});
}

export async function recordedEvents(client, itemId) {
    const store = await client.getFile("checkin-store");
    return (store?.events || []).filter((event) => event.itemId === itemId);
}

/**
 * 记录页面对内核 putFile 的目标路径：multipart 请求体在 Playwright 侧拿不到 postData，
 * 所以在页面里包一层 fetch 读表单字段，直接拿到写了哪个存储文件。
 * 必须在第一次 goto 之前调用（addInitScript 只对新文档生效）。
 */
export async function instrumentWrites(page) {
    await page.addInitScript(() => {
        window.__putFileWrites = [];
        const original = window.fetch;
        window.fetch = function patched(input, init) {
            try {
                const url = typeof input === "string" ? input : (input?.url || "");
                if (url.endsWith("/api/file/putFile") && init?.body instanceof FormData) {
                    window.__putFileWrites.push(String(init.body.get("path") || ""));
                }
            } catch { /* 包装失败不影响请求本身 */ }
            return original.apply(this, arguments);
        };
    });
    return {
        async paths() { return page.evaluate(() => window.__putFileWrites.slice()); },
        async storeWrites() { return (await this.paths()).filter((p) => /\/checkin-store$/.test(p)); },
        async reset() { await page.evaluate(() => { window.__putFileWrites = []; }); },
    };
}
