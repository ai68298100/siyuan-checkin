#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const commands = ["node", "pnpm", "git", "gh"];
const result = {node: process.version, commands: {}, browsers: [], dependencies: {typescript: false, webpack: false}, repo: {root}};
for (const command of commands) {
    try {
        const executable = process.platform === "win32" && command === "pnpm" && fs.existsSync("C:/Program Files/nodejs/pnpm.cmd") ? "C:/Program Files/nodejs/pnpm.cmd" : command;
        result.commands[command] = execFileSync(executable, ["--version"], {encoding: "utf8"}).trim();
    }
    catch { result.commands[command] = null; }
}
if (!result.commands.pnpm && process.env.npm_config_user_agent) {
    const match = process.env.npm_config_user_agent.match(/pnpm\/([^\s]+)/);
    if (match) result.commands.pnpm = match[1];
}
/* 浏览器探测只用环境变量与标准安装路径，避免绑定某个人机器。 */
for (const browser of [
    process.env.CHECKIN_CHROME,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
].filter(Boolean).map((candidate) => path.normalize(candidate))) if (fs.existsSync(browser)) result.browsers.push(browser);
for (const dependency of ["typescript", "webpack"]) {
    try { require.resolve(dependency, {paths: [root]}); result.dependencies[dependency] = true; }
    catch {}
}

function versionParts(value) {
    const match = String(value || "").match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    return match ? [Number(match[1]), Number(match[2] || 0), Number(match[3] || 0)] : undefined;
}

function compareVersions(left, right) {
    for (let index = 0; index < 3; index += 1) {
        if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
}

function lowerBound(range) {
    const match = String(range || "").match(/>=\s*(\d+(?:\.\d+){0,2})/);
    return match ? versionParts(match[1]) : undefined;
}

function formatVersion(parts) {
    return parts ? parts.join(".") : undefined;
}

function resolvePackageJson(name) {
    const directManifest = path.join(root, "node_modules", name, "package.json");
    if (fs.existsSync(directManifest)) {
        try { return JSON.parse(fs.readFileSync(directManifest, "utf8")); }
        catch { /* continue with the resolver fallback */ }
    }
    let resolved;
    try { resolved = require.resolve(name, {paths: [root]}); }
    catch { return undefined; }
    let current = path.dirname(resolved);
    while (current && current !== path.dirname(current)) {
        const candidate = path.join(current, "package.json");
        if (fs.existsSync(candidate)) {
            try {
                const manifest = JSON.parse(fs.readFileSync(candidate, "utf8"));
                if (manifest.name === name) return manifest;
            }
            catch { /* malformed transitive metadata is reported as unresolved */ }
        }
        current = path.dirname(current);
    }
    return undefined;
}

const declaredNodeRange = packageJson.engines?.node || "";
const declaredNodeFloor = lowerBound(declaredNodeRange);
const directDependencies = Object.keys({...packageJson.dependencies, ...packageJson.devDependencies});
const dependencyNodeEngines = directDependencies.map((name) => {
    const manifest = resolvePackageJson(name);
    const range = manifest?.engines?.node || "";
    return {
        name,
        version: manifest?.version || null,
        range: range || null,
        lowerBound: formatVersion(lowerBound(range)),
        resolved: Boolean(manifest),
    };
});
const dependencyFloors = dependencyNodeEngines.map((entry) => versionParts(entry.lowerBound)).filter(Boolean);
const requiredNodeFloor = [declaredNodeFloor, ...dependencyFloors].filter(Boolean).sort(compareVersions).pop();
const actualNode = versionParts(process.versions.node);
const packageManagerMatch = String(packageJson.packageManager || "").match(/^([^@]+)@(.+)$/);
const actualPnpm = versionParts(result.commands.pnpm);
const declaredPnpm = packageManagerMatch ? versionParts(packageManagerMatch[2]) : undefined;
const nodeSatisfied = Boolean(actualNode && requiredNodeFloor && compareVersions(actualNode, requiredNodeFloor) >= 0);
const packageManagerSatisfied = Boolean(actualPnpm && declaredPnpm && compareVersions(actualPnpm, declaredPnpm) === 0);
result.toolchain = {
    packageManager: packageJson.packageManager || null,
    packageManagerVersion: result.commands.pnpm,
    packageManagerSatisfied,
    declaredNodeRange,
    declaredNodeFloor: formatVersion(declaredNodeFloor),
    requiredNodeFloor: formatVersion(requiredNodeFloor),
    actualNode: process.versions.node,
    nodeSatisfied,
    dependencyNodeEngines,
    dependencyScanComplete: dependencyNodeEngines.every((entry) => entry.resolved),
};
if (!nodeSatisfied || !packageManagerSatisfied) {
    const failures = [];
    if (!nodeSatisfied) failures.push(`Node ${process.versions.node} does not satisfy ${formatVersion(requiredNodeFloor) ? `>=${formatVersion(requiredNodeFloor)}` : declaredNodeRange || "the declared engine"}`);
    if (!packageManagerSatisfied) failures.push(`pnpm ${result.commands.pnpm || "missing"} does not match ${packageJson.packageManager || "the declared package manager"}`);
    console.error(`Toolchain requirement failed: ${failures.join("; ")}`);
    process.exitCode = 1;
}
console.log(JSON.stringify(result, null, 2));
