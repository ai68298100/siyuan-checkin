#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");

const root = path.resolve(__dirname, "..");
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
for (const browser of [
    "C:/Users/sunku/AppData/Local/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
]) if (fs.existsSync(browser)) result.browsers.push(browser);
for (const dependency of ["typescript", "webpack"]) {
    try { require.resolve(dependency, {paths: [root]}); result.dependencies[dependency] = true; }
    catch {}
}
console.log(JSON.stringify(result, null, 2));
