/* Cross-platform launcher for the opt-in real-host T-1807 benchmark. */
import {spawnSync} from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "playwright", "test", "tests/e2e/storage-snapshot-host.spec.mjs", "tests/e2e/storage-failure-reload.spec.mjs", "--config", "playwright.e2e.config.mjs"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {...process.env, CHECKIN_STORAGE_HOST_BENCHMARK: "1"},
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
