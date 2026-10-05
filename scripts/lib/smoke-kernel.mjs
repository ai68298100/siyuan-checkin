/* Shared safety boundary for kernel-writing smoke/E2E tools. Never imports or starts a kernel. */
export const SCRATCH_PREFIXES = Object.freeze(["lv-checkin-smoke-"]);

export function isScratchName(name) {
    return typeof name === "string" && SCRATCH_PREFIXES.some(prefix => name.startsWith(prefix));
}

export function assertLoopback(base) {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]", "::1"].includes(url.hostname)
        || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("内核测试目标必须是无凭据、无路径的本机回环 HTTP(S) 地址");
    }
    return url;
}

/** Explicit argv wins over environment; no baked-in/default access token. */
export function resolveTarget({baseArg, tokenArg, env = process.env, defaultBase} = {}) {
    const sourceBase = baseArg ?? env.SIYUAN_BASE_URL ?? defaultBase;
    if (!sourceBase) throw new Error("缺少思源目标：请显式传入 base URL 或设置 SIYUAN_BASE_URL");
    const base = String(sourceBase).replace(/\/+$/, "");
    assertLoopback(base);
    const token = tokenArg ?? env.SIYUAN_TOKEN;
    if (typeof token !== "string" || !token.trim() || /[\r\n]/.test(token)) {
        throw new Error("缺少思源 token：请显式传入 token 或设置 SIYUAN_TOKEN；不会使用默认 token");
    }
    return {base, token};
}

export function assertAiAllowed(route, {env = process.env} = {}) {
    if (/^\/api\/(?:ai|agent)(?:\/|$)/i.test(route) && env.SIYUAN_E2E_AI !== "1") {
        throw new Error("内核测试默认禁用 AI 请求；仅显式设置 SIYUAN_E2E_AI=1 后可调用");
    }
}

const protectedAiPages = new WeakSet();
export async function protectAiRequests(page, {env = process.env} = {}) {
    if (env.SIYUAN_E2E_AI === "1" || protectedAiPages.has(page)) return;
    await page.route(/\/api\/(?:ai|agent)(?:\/|\?|$)/i, route => route.fulfill({
        status: 403, contentType: "application/json", body: JSON.stringify({code: -1, msg: "E2E AI requests are disabled by default"})
    }));
    protectedAiPages.add(page);
}

/** Checked API for preflight and cleanup; negative assertion callers can keep their own unchecked post. */
export function makeApi(base, token, {fetchImpl = globalThis.fetch, env = process.env} = {}) {
    const target = resolveTarget({baseArg: base, tokenArg: token, env});
    return async (route, body = {}) => {
        assertAiAllowed(route, {env});
        if (!/^\/api\/[A-Za-z0-9_/-]+$/.test(route)) throw new Error("无效的内核 API 路由");
        const response = await fetchImpl(target.base + route, {
            method: "POST", headers: {Authorization: `Token ${target.token}`, "Content-Type": "application/json"},
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`${route} HTTP ${response.status}`);
        const payload = await response.json();
        if (payload?.code !== 0) throw new Error(`${route} code=${payload?.code} msg=${payload?.msg || ""}`);
        return payload;
    };
}

export function notebookIdOf(data) {
    const id = data?.notebook?.id ?? data?.notebook ?? data?.id ?? data;
    return typeof id === "string" ? id : "";
}

async function listNotebooks(api) {
    const result = await api("/api/notebook/lsNotebooks", {});
    if (result?.code !== 0 || !Array.isArray(result.data?.notebooks)) throw new Error("无法确认内核笔记本清单，拒绝写型测试");
    return result.data.notebooks;
}

function assertScratchNotebooks(notebooks, base, env) {
    if (notebooks.some(notebook => !notebook || typeof notebook.id !== "string" || !notebook.id || typeof notebook.name !== "string")) {
        throw new Error("无法确认内核笔记本清单，拒绝写型测试");
    }
    if (env.SIYUAN_E2E_ALLOW_SHARED !== "1" && notebooks.some(notebook => !isScratchName(notebook.name))) {
        throw new Error(`目标内核 ${base || ""} 不是隔离靶场：存在非小驴打卡测试笔记本或无效清单；拒绝写入和清扫。请改用独立 workspace 的第二实例（默认端口 6807），或确认风险后显式设置 SIYUAN_E2E_ALLOW_SHARED=1`);
    }
}

export async function guardScratch(api, {base, env = process.env} = {}) {
    const notebooks = await listNotebooks(api);
    assertScratchNotebooks(notebooks, base, env);
    return notebooks;
}

/** Refresh and guard the complete list before deleting anything, including our own orphans. */
export async function sweepOrphans(api, {base, env = process.env} = {}) {
    const notebooks = (await guardScratch(api, {base, env})).filter(notebook => isScratchName(notebook.name));
    const removed = [];
    for (const notebook of notebooks) {
        const result = await api("/api/notebook/removeNotebook", {notebook: notebook.id});
        if (result?.code !== 0) throw new Error(`临时库清扫失败 code=${result?.code}，停止写型测试`);
        removed.push(notebook.id);
    }
    return removed;
}

export async function prepareScratch(api, options = {}) {
    await guardScratch(api, options);
    return sweepOrphans(api, options);
}
