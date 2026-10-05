/* Mock-only safety regression: no request is sent to a real SiYuan kernel. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const {EventEmitter} = require("node:events");
const {spawnSync} = require("node:child_process");
const {pathToFileURL} = require("node:url");
const repository = path.resolve(__dirname, "..");
const load = relative => import(pathToFileURL(path.join(repository, relative)).href);

(async () => {
    const safety = await load("scripts/lib/smoke-kernel.mjs");
    const e2e = await load("scripts/e2e/lib.mjs");
    const running = await load("tests/e2e/running-setup.mjs");
    const base = "http://127.0.0.1:6827";
    const token = "mock-only-token";
    const env = {SIYUAN_BASE_URL: base, SIYUAN_TOKEN: token};
    assert.deepEqual(safety.resolveTarget({env}), {base, token});
    assert.deepEqual(safety.resolveTarget({baseArg: "http://localhost:6830/", tokenArg: "argv-token", env}), {base: "http://localhost:6830", token: "argv-token"});
    assert.throws(() => safety.resolveTarget({env: {SIYUAN_TOKEN: token}}), /目标/);
    assert.throws(() => safety.resolveTarget({baseArg: base, env: {}}), /token/);
    for (const invalid of ["", " ", "x\ny"]) assert.throws(() => safety.resolveTarget({baseArg: base, tokenArg: invalid, env}), /token/);
    for (const invalid of ["http://remote.example:6806", "file:///tmp", `${base}/data`, `${base}?token=x`, "http://name:password@localhost:6806"]) {
        assert.throws(() => safety.resolveTarget({baseArg: invalid, tokenArg: token}), /回环/);
    }
    assert.equal(safety.isScratchName("lv-checkin-smoke-health-123"), true);
    for (const name of [undefined, "E2E nb 123", "Journal E2E 123", "lv-exam-smoke-123", "personal-lv-checkin-smoke-123"]) assert.equal(safety.isScratchName(name), false);
    assert.equal(safety.notebookIdOf("nb1"), "nb1");
    assert.equal(safety.notebookIdOf({notebook: {id: "nb2"}}), "nb2");
    assert.equal(safety.notebookIdOf({notebook: "nb3"}), "nb3");
    const mockApi = notebooks => {
        const calls = [];
        return {calls, api: async (route, body) => {
            calls.push({route, body});
            return route.endsWith("lsNotebooks") ? {code: 0, data: {notebooks}} : {code: 0};
        }};
    };
    const scratch = {id: "scratch", name: "lv-checkin-smoke-orphan-1"};
    const foreign = {id: "foreign", name: "Personal notes"};
    for (const shared of [undefined, "0", "true", "yes"]) {
        const mock = mockApi([scratch, foreign]);
        await assert.rejects(safety.prepareScratch(mock.api, {base, env: {SIYUAN_E2E_ALLOW_SHARED: shared}}), /隔离靶场.*6807.*SIYUAN_E2E_ALLOW_SHARED/);
        assert.deepEqual(mock.calls.map(call => call.route), ["/api/notebook/lsNotebooks"], "default refusal does not delete even our own orphan");
    }
    const shared = mockApi([scratch, foreign, {id: "legacy", name: "E2E nb 123"}]);
    assert.deepEqual(await safety.prepareScratch(shared.api, {base, env: {SIYUAN_E2E_ALLOW_SHARED: "1"}}), ["scratch"]);
    assert.deepEqual(shared.calls.filter(call => call.route.endsWith("removeNotebook")), [{route: "/api/notebook/removeNotebook", body: {notebook: "scratch"}}], "explicit sharing cleans only this project's prefix");
    const isolated = mockApi([scratch]);
    assert.deepEqual(await safety.prepareScratch(isolated.api, {base, env: {}}), ["scratch"]);
    assert.deepEqual(isolated.calls.map(call => call.route), ["/api/notebook/lsNotebooks", "/api/notebook/lsNotebooks", "/api/notebook/removeNotebook"]);
    const changed = [];
    await assert.rejects(safety.prepareScratch(async route => {
        changed.push(route);
        return {code: 0, data: {notebooks: changed.length === 1 ? [scratch] : [scratch, foreign]}};
    }, {env: {}}), /隔离靶场/);
    assert.equal(changed.length, 2, "a shared notebook appearing before sweep still results in zero deletes");
    for (const payload of [{code: -1}, {code: 0, data: {}}, {code: 0, data: {notebooks: [{name: scratch.name}]}}]) {
        await assert.rejects(safety.guardScratch(async () => payload, {env: {}}), /清单/);
    }
    await assert.rejects(safety.sweepOrphans(async route => route.endsWith("lsNotebooks") ? {code: 0, data: {notebooks: [scratch]}} : {code: -1}, {env: {}}), /清扫失败/);

    let fetchCount = 0;
    const api = safety.makeApi(base, token, {env: {}, fetchImpl: async (_url, options) => {
        fetchCount++;
        assert.equal(options.headers.Authorization, `Token ${token}`);
        return {ok: true, json: async () => ({code: 0, data: "ok"})};
    }});
    await api("/api/system/version");
    assert.equal(fetchCount, 1);
    for (const route of ["/api/ai/chatGPT", "/api/ai/agent/chat", "/api/agent/chat"]) await assert.rejects(api(route), /默认禁用 AI/);
    assert.equal(fetchCount, 1, "disabled AI never reaches fetch");
    for (const toggle of [undefined, "0", "true"]) assert.throws(() => safety.assertAiAllowed("/api/ai/chatGPT", {env: {SIYUAN_E2E_AI: toggle}}), /默认禁用 AI/);
    safety.assertAiAllowed("/api/ai/chatGPT", {env: {SIYUAN_E2E_AI: "1"}});
    for (const toggle of [undefined, "0", "true", "1"]) {
        const routes = [];
        const page = {route: async (pattern, handler) => routes.push({pattern, handler})};
        await safety.protectAiRequests(page, {env: {SIYUAN_E2E_AI: toggle}});
        await safety.protectAiRequests(page, {env: {SIYUAN_E2E_AI: toggle}});
        assert.equal(routes.length, toggle === "1" ? 0 : 1, "browser AI protection installs once unless exact opt-in is set");
        if (routes.length) {
            assert.equal(routes[0].pattern.test(`${base}/api/ai/chatGPT`), true);
            assert.equal(routes[0].pattern.test(`${base}/api/agent/chat`), true);
            assert.equal(routes[0].pattern.test(`${base}/api/query/sql`), false);
            let response;
            await routes[0].handler({fulfill(value) {response = value;}});
            assert.equal(response.status, 403);
        }
    }
    await assert.rejects(safety.makeApi(base, token, {fetchImpl: async () => ({ok: false, status: 403}), env: {}})("/api/system/version"), /HTTP 403/);
    await assert.rejects(safety.makeApi(base, token, {fetchImpl: async () => ({ok: true, json: async () => ({code: -1})}), env: {}})("/api/system/version"), /code=-1/);

    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "checkin-smoke-safety-"));
    const originalFetch = globalThis.fetch;
    const priorShared = process.env.SIYUAN_E2E_ALLOW_SHARED;
    const priorAi = process.env.SIYUAN_E2E_AI;
    delete process.env.SIYUAN_E2E_ALLOW_SHARED;
    delete process.env.SIYUAN_E2E_AI;
    try {
        assert.throws(() => e2e.e2eConfig({env: {}}), /CHECKIN_E2E_WORKSPACE/);
        assert.throws(() => e2e.e2eConfig({workspaceArg: "relative", env}), /绝对路径/);
        const workspace = path.join(temporary, "owned");
        const prepared = e2e.prepareWorkspace(workspace);
        assert.equal(prepared.created, true);
        fs.mkdirSync(path.join(workspace, "data", ".siyuan"), {recursive: true});
        e2e.assertScratchWorkspace(workspace); // real SiYuan workspaces carry data/.siyuan beside notebook boxes
        const generated = e2e.configureAccessToken(workspace, {created: true});
        assert.ok(generated.length >= 32, "new self-managed workspace receives a nonempty random token");
        assert.equal(e2e.readAccessToken(workspace), generated);
        assert.throws(() => e2e.configureAccessToken(workspace), /token/);
        assert.throws(() => e2e.configureAccessToken(workspace, {token}), /不匹配/);
        assert.equal(e2e.readAccessToken(workspace), generated, "existing access code is never silently replaced");
        assert.equal(e2e.configureAccessToken(workspace, {token: generated}), generated);
        const cfg = e2e.e2eConfig({workspaceArg: workspace, baseArg: "http://localhost:6831", tokenArg: token, env});
        assert.equal(cfg.port, 6831);
        assert.equal(cfg.token, token);
        const defaultCfg = e2e.e2eConfig({workspaceArg: workspace, tokenArg: token, env: {}});
        assert.equal(defaultCfg.port, 6807, "自管写型靶场默认顺延到 6807");
        const unmarked = path.join(temporary, "unmarked");
        fs.mkdirSync(unmarked);
        assert.throws(() => e2e.prepareWorkspace(unmarked), /标记/);
        const notebookConf = path.join(workspace, "data", "notebook-id", ".siyuan", "conf.json");
        fs.mkdirSync(path.dirname(notebookConf), {recursive: true});
        fs.writeFileSync(notebookConf, JSON.stringify({name: foreign.name}));
        assert.throws(() => e2e.assertScratchWorkspace(workspace, {env: {}}), /非小驴/);
        assert.throws(() => e2e.installPlugin(workspace, temporary), /非小驴/, "foreign notebooks reject before dist lookup or plugin replacement");
        e2e.assertScratchWorkspace(workspace, {env: {SIYUAN_E2E_ALLOW_SHARED: "1"}});
        e2e.assertOwnedWorkspace(workspace); // Readonly startup requires identity, not writable notebook isolation.
        fs.writeFileSync(notebookConf, JSON.stringify({name: scratch.name}));
        fs.mkdirSync(path.join(workspace, "data", "plugins", "another-plugin"), {recursive: true});
        assert.throws(() => e2e.assertScratchWorkspace(workspace, {env: {SIYUAN_E2E_ALLOW_SHARED: "1"}}), /其他插件/);
        fs.rmdirSync(path.join(workspace, "data", "plugins", "another-plugin"));
        const calls = [];
        let notebooks = [scratch, foreign];
        globalThis.fetch = async (url, options) => {
            calls.push({url, body: JSON.parse(options.body)});
            const payload = url.endsWith("lsNotebooks") ? {code: 0, data: {notebooks}} : {code: 0, data: "mock-version"};
            return {ok: true, text: async () => JSON.stringify(payload)};
        };
        await assert.rejects(running.preflightRunningTarget({baseURL: base, token, workspace}, {env: {}}), /隔离靶场/);
        assert.deepEqual(calls.map(call => call.url), [`${base}/api/notebook/lsNotebooks`], "attached setup refuses shared target before any mutation");
        calls.length = 0;
        const attached = await running.preflightRunningTarget({baseURL: base, token, workspace}, {env: {SIYUAN_E2E_ALLOW_SHARED: "1"}});
        assert.equal(attached.kernelVersion, "mock-version");
        assert.deepEqual(calls.filter(call => call.url.endsWith("removeNotebook")).map(call => call.body), [{notebook: "scratch"}]);
        const client = new e2e.SiyuanClient({baseURL: base, token});
        const beforeAi = calls.length;
        await assert.rejects(client.post("/api/ai/chatGPT"), /默认禁用 AI/);
        assert.equal(calls.length, beforeAi);
        globalThis.fetch = async () => ({ok: false, status: 403, text: async () => JSON.stringify({code: -1, msg: "readonly"})});
        assert.equal((await client.post("/api/file/putFile")).code, -1, "unchecked post preserves negative kernel codes");
        await assert.rejects(client.postChecked("/api/file/putFile"), /code=-1/);
        globalThis.fetch = async () => ({ok: false, status: 403, text: async () => JSON.stringify({code: 0})});
        await assert.rejects(client.postChecked("/api/file/putFile"), /HTTP 403/, "HTTP failure cannot be disguised as a successful kernel code");

        const child = new EventEmitter();
        Object.assign(child, {pid: 123, exitCode: null, signalCode: null, kill(signal) {this.signal = signal; queueMicrotask(() => this.emit("exit"));}});
        await e2e.stopKernel({child, client: {exit() {throw new Error("must not exit any remote target");}}});
        assert.equal(child.signal, "SIGTERM");
        await e2e.stopKernel({child: {exitCode: 0, pid: 123, kill() {throw new Error("already exited");}}});
        const occupied = net.createServer();
        await new Promise(resolve => occupied.listen(0, "127.0.0.1", resolve));
        try {await assert.rejects(e2e.assertPortAvailable({host: "127.0.0.1", port: occupied.address().port}), /已占用/);}
        finally {await new Promise(resolve => occupied.close(resolve));}
        await assert.rejects(e2e.assertPortAvailable({port: 0}), /端口/);
        const marker = path.join(workspace, e2e.MARKER_FILE);
        fs.writeFileSync(marker, JSON.stringify({createdBy: "another project"}));
        assert.throws(() => e2e.assertOwnedWorkspace(workspace), /身份/);
        fs.writeFileSync(marker, JSON.stringify({createdBy: "siyuan-checkin e2e", protected: true}));
        assert.throws(() => e2e.assertOwnedWorkspace(workspace), /保护/);
    } finally {
        globalThis.fetch = originalFetch;
        if (priorShared === undefined) delete process.env.SIYUAN_E2E_ALLOW_SHARED; else process.env.SIYUAN_E2E_ALLOW_SHARED = priorShared;
        if (priorAi === undefined) delete process.env.SIYUAN_E2E_AI; else process.env.SIYUAN_E2E_AI = priorAi;
        assert.ok(path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep));
        fs.rmSync(temporary, {recursive: true, force: true});
    }
    const moduleUrl = pathToFileURL(path.join(repository, "scripts/lib/smoke-kernel.mjs")).href;
    const failure = spawnSync(process.execPath, ["--input-type=module", "-e", `import {resolveTarget} from ${JSON.stringify(moduleUrl)}; resolveTarget({baseArg:'${base}',env:{}});`], {encoding: "utf8"});
    assert.equal(failure.status, 1, "missing token retains a nonzero command exit");
    assert.match(failure.stderr, /token/);
    console.log("Kernel safety mock checks passed: explicit target/token/workspace, shared refusal with zero writes, exact shared/AI opt-ins, prefix-only sweep, metadata/plugin guard, occupied port, owned-child shutdown and preserved failure/readonly codes; no real kernel contacted.");
})().catch(error => {console.error(error); process.exitCode = 1;});
