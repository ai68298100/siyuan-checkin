/* 只读实例 E2E 配置（T-1249）：单独起一个 --readonly 内核，端口与桌面实例错开。 */
import {defineConfig} from "@playwright/test";
import path from "node:path";

export default defineConfig({
    testDir: "./tests/e2e/readonly",
    testMatch: "**/*.spec.mjs",
    globalSetup: path.resolve(import.meta.dirname, "tests/e2e/readonly/global-setup.mjs"),
    timeout: 120000,
    workers: 1,
    retries: 0,
    fullyParallel: false,
    outputDir: ".artifacts/e2e/test-results-readonly",
    reporter: [["list"], ["json", {outputFile: ".artifacts/e2e/results-readonly.json"}]],
    use: {
        headless: true,
        viewport: {width: 1440, height: 900},
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
});
