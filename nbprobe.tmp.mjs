import {e2eConfig, resolveInstall, startKernel, stopKernel, readAccessToken} from "./scripts/e2e/lib.mjs";
const cfg = e2eConfig();
const install = resolveInstall();
const running = startKernel({kernel: install.kernel, appDir: install.appDir, workspace: cfg.workspace, port: cfg.port});
try {
    for (let i = 0; i < 90; i++) {
        try { const r = await fetch(cfg.baseURL + "/api/system/version", {method: "POST"}); if (r.ok) break; } catch {}
        await new Promise(r => setTimeout(r, 1000));
    }
    const token = readAccessToken(cfg.workspace);
    const post = async (route, body) => {
        const res = await fetch(cfg.baseURL + route, {method: "POST", headers: {Authorization: token ? "Token " + token : "", "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
        return res.json();
    };
    console.log("createNotebook:", JSON.stringify(await post("/api/notebook/createNotebook", {name: "NB Probe " + Date.now()})).slice(0, 300));
} finally {
    await stopKernel({client: undefined, child: running.child}).catch(() => undefined);
}
