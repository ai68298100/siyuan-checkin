/* E2E 基础设施（T-1244）：用已安装的思源内核跑真实插件实例。
   与 siyuan-testing 的差异：插件仓库拿不到思源源码，也不需要编译前端 bundle——
   只需要一个 SiYuan-Kernel.exe 与它的 app 目录，插件从 <workspace>/data/plugins/ 加载。 */
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {assertAiAllowed, assertLoopback, isScratchName, resolveTarget} from "../lib/smoke-kernel.mjs";

export const PLUGIN_NAME = "siyuan-checkin";
export const STORAGE_DIR = `storage/petal/${PLUGIN_NAME}`;
export const MARKER_FILE = "checkin-e2e.json";
export const DEFAULT_E2E_PORT = 6807;

export function e2eConfig({baseArg, tokenArg, workspaceArg, env = process.env} = {}) {
    const workspace = workspaceArg ?? env.CHECKIN_E2E_WORKSPACE;
    if (typeof workspace !== "string" || !workspace.trim() || !path.isAbsolute(workspace)) {
        throw new Error("请显式设置 CHECKIN_E2E_WORKSPACE 为独立靶场的绝对路径；没有默认工作区");
    }
    const baseURL = String(baseArg ?? env.SIYUAN_BASE_URL ?? `http://127.0.0.1:${env.CHECKIN_E2E_PORT || DEFAULT_E2E_PORT}`).replace(/\/+$/, "");
    const url = assertLoopback(baseURL);
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
    if (url.protocol !== "http:" || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("自管 E2E 内核需要有效的本机 HTTP 端口");
    return {workspace: path.resolve(workspace), host, port, baseURL, token: tokenArg ?? env.SIYUAN_TOKEN ?? env.CHECKIN_E2E_TOKEN};
}

/** Existing instances are never reused or stopped by self-managed setup. */
export async function assertPortAvailable({host = "127.0.0.1", port}) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("E2E 端口必须是 1~65535 的整数");
    await new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once("error", () => reject(new Error(`E2E 目标端口 ${port} 已占用或不可绑定；拒绝启动、写入和停止已有内核`)));
        server.listen({host, port, exclusive: true}, () => server.close(error => error ? reject(error) : resolve()));
    });
}

/** 思源安装定位：优先环境变量，其次常见安装路径；返回内核与 app 目录。 */
export function resolveInstall() {
    const candidates = [];
    if (process.env.CHECKIN_E2E_KERNEL) candidates.push(process.env.CHECKIN_E2E_KERNEL);
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    candidates.push(
        path.join(programFiles, "SiYuan", "resources", "kernel", "SiYuan-Kernel.exe"),
        "D:\\RJ\\SiYuan\\resources\\kernel\\SiYuan-Kernel.exe",
        "D:\\biji\\SiYuan\\resources\\kernel\\SiYuan-Kernel.exe",
        "C:\\Program Files\\SiYuan\\resources\\kernel\\SiYuan-Kernel.exe",
        "/Applications/SiYuan.app/Contents/Resources/kernel/SiYuan-Kernel",
    );
    const kernel = candidates.find((candidate) => candidate && fs.existsSync(candidate));
    if (!kernel) {
        throw new Error(`未找到 SiYuan-Kernel，请设置 CHECKIN_E2E_KERNEL。已尝试:\n${candidates.join("\n")}`);
    }
    const appDir = process.env.CHECKIN_E2E_APP_DIR || path.resolve(path.dirname(kernel), "..");
    for (const required of ["stage", "appearance"]) {
        if (!fs.existsSync(path.join(appDir, required))) throw new Error(`思源 app 目录缺少 ${required}: ${appDir}`);
    }
    return {kernel, appDir};
}

/** 工作区必须有我们自己的标记文件，绝不让 E2E 指向用户的真实笔记本数据。 */
export function prepareWorkspace(workspace) {
    if (!workspace || !path.isAbsolute(workspace)) throw new Error("E2E 工作区必须显式指定绝对路径");
    if (fs.existsSync(workspace)) {
        const marker = assertScratchWorkspace(workspace);
        return {created: false, marker};
    }
    fs.mkdirSync(path.join(workspace, "data"), {recursive: true});
    const marker = {createdBy: "siyuan-checkin e2e", createdIso: new Date().toISOString()};
    fs.writeFileSync(path.join(workspace, MARKER_FILE), `${JSON.stringify(marker, null, 2)}\n`);
    return {created: true, marker};
}

export function assertOwnedWorkspace(workspace) {
    if (!workspace || !path.isAbsolute(workspace) || !fs.existsSync(workspace) || fs.lstatSync(workspace).isSymbolicLink()) {
        throw new Error("E2E 工作区必须是已明确指定的本地目录，不能使用符号链接");
    }
    const markerPath = path.join(workspace, MARKER_FILE);
    if (!fs.existsSync(markerPath) || fs.lstatSync(markerPath).isSymbolicLink()) throw new Error(`拒绝非 E2E 工作区：缺少可信 ${MARKER_FILE} 标记`);
    const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    if (marker.createdBy !== "siyuan-checkin e2e" || marker.protected) throw new Error("E2E 工作区身份不匹配或已被保护，拒绝使用");
    return marker;
}

/** Inspect notebooks and installed plugins before any local plugin/config mutation. */
export function assertScratchWorkspace(workspace, {env = process.env} = {}) {
    const marker = assertOwnedWorkspace(workspace);
    const data = path.join(workspace, "data");
    if (fs.existsSync(data) && fs.lstatSync(data).isSymbolicLink()) throw new Error("E2E data 目录不能使用符号链接");
    for (const entry of fs.existsSync(data) ? fs.readdirSync(data, {withFileTypes: true}) : []) {
        if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
        const directory = path.join(data, entry.name);
        if (entry.isSymbolicLink()) throw new Error("E2E data 子目录不能使用符号链接");
        const conf = path.join(directory, ".siyuan", "conf.json");
        if (fs.existsSync(conf)) {
            const notebook = JSON.parse(fs.readFileSync(conf, "utf8"));
            if (typeof notebook.name !== "string" || (!isScratchName(notebook.name) && env.SIYUAN_E2E_ALLOW_SHARED !== "1")) throw new Error("E2E 工作区包含非小驴打卡测试笔记本，拒绝本地安装和配置写入");
        } else if (!new Set([".siyuan", "plugins", "storage", "assets", "emojis", "icons", "themes", "widgets", "templates", "public", "history", "snippets"]).has(entry.name)) {
            throw new Error(`E2E data 存在无法确认用途的目录 ${entry.name}，拒绝写入`);
        }
    }
    const plugins = path.join(data, "plugins");
    if (fs.existsSync(plugins) && fs.readdirSync(plugins).some(name => name !== PLUGIN_NAME)) throw new Error("E2E 靶场安装了其他插件，拒绝写型测试");
    const plugin = path.join(plugins, PLUGIN_NAME);
    if (fs.existsSync(plugin) && fs.lstatSync(plugin).isSymbolicLink()) throw new Error("E2E 插件目录不能使用符号链接");
    return marker;
}

/** A self-managed workspace still requires the caller's explicit API token. */
export function configureAccessToken(workspace, {token, created = false} = {}) {
    assertScratchWorkspace(workspace);
    const target = resolveTarget({baseArg: `http://127.0.0.1:${DEFAULT_E2E_PORT}`, tokenArg: token, env: {}});
    if (!created) {
        if (readAccessToken(workspace) !== target.token) throw new Error("显式提供的 token 与靶场配置不匹配；拒绝改写已有访问码");
        return target.token;
    }
    const confPath = path.join(workspace, "conf", "conf.json");
    if (fs.existsSync(confPath)) throw new Error("新靶场已有配置，拒绝覆盖访问码");
    fs.mkdirSync(path.dirname(confPath), {recursive: true});
    /* SiYuan authenticates /api requests with conf.api.token.  accessAuthCode is
       the lock-screen code and must not be used as an API credential. */
    fs.writeFileSync(confPath, JSON.stringify({api: {token: target.token}}, null, 2));
    return target.token;
}

/** 把 dist/ 装进工作区插件目录；思源要求 plugin.json.name 与目录名一致，否则整包静默不加载。 */
export function installPlugin(workspace, repoRoot) {
    assertScratchWorkspace(workspace);
    const dist = path.join(repoRoot, "dist");
    for (const required of ["index.js", "index.css", "plugin.json"]) {
        if (!fs.existsSync(path.join(dist, required))) {
            throw new Error(`dist/${required} 不存在，请先执行 pnpm run build`);
        }
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(dist, "plugin.json"), "utf8"));
    if (manifest.name !== PLUGIN_NAME) throw new Error(`dist/plugin.json.name=${manifest.name} 与目录名 ${PLUGIN_NAME} 不一致`);
    const target = path.join(workspace, "data", "plugins", PLUGIN_NAME);
    fs.rmSync(target, {recursive: true, force: true});
    fs.mkdirSync(target, {recursive: true});
    /* Production packages may contain nested resources such as i18n/*.json.
       Copy the complete dist tree so the E2E host sees the same package shape
       that a real SiYuan installation receives. */
    fs.cpSync(dist, target, {recursive: true, force: true});
    return {target, version: manifest.version};
}

/** extraArgs 必须是 serve 子命令的旗标（如 --readonly true），放在子命令之后；全局旗标只有 --workspace/--log-level。 */
export async function startKernel({kernel, appDir, workspace, port, host = "127.0.0.1", extraArgs = []}) {
    const readonlyIndex = extraArgs.indexOf("--readonly");
    if (readonlyIndex !== -1 && extraArgs[readonlyIndex + 1] === "true") assertOwnedWorkspace(workspace);
    else assertScratchWorkspace(workspace);
    await assertPortAvailable({host, port});
    const child = spawn(kernel, ["--workspace", workspace, "serve", "--wd", appDir, "--port", String(port), ...extraArgs], {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        env: {...process.env, SIYUAN_WORKSPACE_PATH: workspace},
    });
    const lines = [];
    const capture = (stream) => stream.on("data", (chunk) => {
        String(chunk).split(/\r?\n/).forEach((line) => {
            if (!line) return;
            lines.push(line);
            if (lines.length > 4000) lines.shift();
        });
    });
    capture(child.stdout);
    capture(child.stderr);
    await new Promise((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
    });
    return {child, lines};
}

export function readAccessToken(workspace) {
    try {
        const conf = JSON.parse(fs.readFileSync(path.join(workspace, "conf", "conf.json"), "utf8"));
        if (typeof conf.api?.token === "string" && conf.api.token) return conf.api.token;
        /* Legacy E2E workspaces wrote accessAuthCode; keep a read-only fallback
           so the mismatch error remains explicit instead of silently replacing it. */
        return typeof conf.accessAuthCode === "string" ? conf.accessAuthCode : "";
    } catch {
        return "";
    }
}

/** 内核启动失败时把日志尾部一起抛出，避免只剩「超时」这种无信息失败。 */
function failWithLog(message, lines) {
    throw new Error(`${message}\n--- 内核日志尾部 ---\n${lines.slice(-30).join("\n")}`);
}

export class SiyuanClient {
    constructor({baseURL, token, app = "checkin-e2e"}) {
        const target = resolveTarget({baseArg: baseURL, tokenArg: token});
        this.baseURL = target.base;
        this.token = target.token;
        this.app = app;
    }

    headers(extra = {}) {
        const headers = {...extra};
        if (this.token) headers.Authorization = `Token ${this.token}`;
        return headers;
    }

    async post(route, body = {}) {
        assertAiAllowed(route);
        const response = await fetch(`${this.baseURL}${route}`, {method: "POST", headers: this.headers({"Content-Type": "application/json"}), body: JSON.stringify(body)});
        const text = await response.text();
        let payload = {};
        try { payload = text ? JSON.parse(text) : {}; } catch { throw new Error(`${route} 返回非 JSON（HTTP ${response.status}）: ${text.slice(0, 200)}`); }
        if (!response.ok && (payload.code === undefined || payload.code === 0)) throw new Error(`${route} HTTP ${response.status}: ${text.slice(0, 200)}`);
        return payload;
    }

    /** 与前端 fetchPost 不同：这里保留 code，让负例断言可写。 */
    async postChecked(route, body = {}) {
        const payload = await this.post(route, body);
        if (payload.code !== 0) throw new Error(`${route} code=${payload.code} msg=${payload.msg || ""}`);
        return payload.data;
    }

    async version() { return this.postChecked("/api/system/version"); }

    async bootProgress() { return this.post("/api/system/bootProgress"); }

    async waitForBoot(lines, timeoutMs = 60000) {
        const until = Date.now() + timeoutMs;
        while (Date.now() < until) {
            /* 工作区被别的内核（或残留进程）锁住时立刻失败，别等满超时再报一个没信息量的 timeout。 */
            if ((lines || []).some((line) => line.includes("lock workspace"))) {
                failWithLog("工作区被锁定：另一个思源内核正占用它（或有残留进程握着 .lock）。关闭该实例，或用 CHECKIN_E2E_WORKSPACE 换一个测试工作区。", lines);
            }
            const progress = await this.bootProgress().catch(() => undefined);
            if (progress && progress.code === 0 && progress.data && Number(progress.data.progress) >= 100) {
                await this.version();
                return;
            }
            /* Read-only kernels on recent SiYuan builds can finish booting
               without exposing bootProgress=100. A successful version call is
               the same authenticated readiness signal and avoids a false
               timeout after the kernel log already says "kernel booted". */
            if ((lines || []).some((line) => /kernel booted/i.test(line)) || progress === undefined || (progress && progress.code !== 0 && !progress.msg)) {
                try {
                    await this.version();
                    return;
                } catch {
                    /* Keep polling until the bounded timeout. */
                }
            }
            if (progress && progress.code !== 0 && progress.code !== undefined && progress.msg) throw new Error(`bootProgress: ${progress.msg}`);
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
        failWithLog(`等待内核就绪超时（${timeoutMs}ms）`, lines || []);
    }

    async getFile(storageName) {
        const response = await fetch(`${this.baseURL}/api/file/getFile`, {
            method: "POST",
            headers: this.headers({"Content-Type": "application/json"}),
            body: JSON.stringify({path: `/data/${STORAGE_DIR}/${storageName}`}),
        });
        if (response.status === 202 || response.status === 404) return undefined;
        const text = await response.text();
        if (!text) return undefined;
        try { return JSON.parse(text); } catch { throw new Error(`读取 ${storageName} 失败（HTTP ${response.status}）: ${text.slice(0, 160)}`); }
    }

    /** putFile 是 multipart 表单；写入插件存储会触发内核对其它前端实例的 dataChange 推送。 */
    async putFile(storageName, value) {
        const form = new FormData();
        form.set("path", `/data/${STORAGE_DIR}/${storageName}`);
        form.set("isDir", "false");
        form.set("app", this.app);
        form.set("file", new Blob([JSON.stringify(value)], {type: "application/json"}), storageName);
        const response = await fetch(`${this.baseURL}/api/file/putFile`, {method: "POST", headers: this.headers(), body: form});
        const text = await response.text();
        if (!response.ok) throw new Error(`写入 ${storageName} 失败 HTTP ${response.status}: ${text.slice(0, 200)}`);
        if (text) {
            const payload = JSON.parse(text);
            if (payload.code !== 0) throw new Error(`写入 ${storageName} code=${payload.code} msg=${payload.msg || ""}`);
        }
    }

    /** 读取工作区内任意文件（导出落 /assets 时用同一通道核对）。 */
    async readWorkspaceFile(workspacePath) {
        const response = await fetch(`${this.baseURL}/api/file/getFile`, {
            method: "POST",
            headers: this.headers({"Content-Type": "application/json"}),
            body: JSON.stringify({path: workspacePath}),
        });
        if (!response.ok) return undefined;
        return response.text();
    }

    async exit() { await this.post("/api/system/exit", {force: true}).catch(() => undefined); }

    /** 启用/禁用插件：内核会向其它前端实例推 reload/unload（不含本客户端）。 */
    async setPetalEnabled(packageName, enabled) { return this.post("/api/petal/setPetalEnabled", {packageName, enabled}); }
}

export async function stopKernel({child}, lines) {
    // Killing our child cannot issue /api/system/exit to an unrelated instance after a failed start.
    if (!child || child.exitCode !== null || child.signalCode || !child.pid) return;
    const exited = await new Promise(resolve => {
        const timer = setTimeout(() => {child.removeListener("exit", onExit); resolve(false);}, 8000);
        const onExit = () => {clearTimeout(timer); resolve(true);};
        child.once("exit", onExit);
        child.kill("SIGTERM");
    });
    if (!exited) {
        child.kill("SIGKILL");
        if (lines) console.warn("[e2e] 内核未在 8 秒内退出，已强制结束");
    }
}

export function kernelErrorLines(lines) {
    return (lines || []).filter((line) => /^\s*(E |\[E\]|PANIC|F \[)/.test(line) && !/lock: another process is using|workspace is being locked/i.test(line));
}

/**
 * 集市信任（bazaar.trust）与插件启用状态都不在 data/plugins 目录里：
 * 前者是 conf.json 的开关，后者是 data/storage/petal/petals.json 的登记项。
 * 只把 dist 拷进 data/plugins 是不会加载的——这一步必须显式做。
 */
export async function enablePlugin({client, workspace, pluginName}) {
    const trust = await client.post("/api/setting/setBazaar", {trust: true});
    if (trust.code !== 0) {
        throw new Error(`setBazaar 失败（code=${trust.code} msg=${trust.msg || ""}），停止 E2E 初始化`);
    }
    const enabled = await client.post("/api/petal/setPetalEnabled", {packageName: pluginName, enabled: true});
    if (enabled.code !== 0) throw new Error(`setPetalEnabled ${pluginName} 失败：code=${enabled.code} msg=${enabled.msg || ""}`);
    const petals = await client.post("/api/petal/loadPetals", {frontend: "desktop"});
    const loaded = (petals.data || []).find((item) => item.name === pluginName);
    if (!loaded) throw new Error(`内核未下发插件 ${pluginName}，loadPetals 返回 ${(petals.data || []).map((item) => item.name).join(", ") || "空"}`);
    if (!(loaded.js || "").length) throw new Error(`插件 ${pluginName} 的 index.js 为空，检查 dist 是否完整`);
    return {name: loaded.name, version: loaded.version, jsBytes: loaded.js.length, cssBytes: (loaded.css || "").length};
}
