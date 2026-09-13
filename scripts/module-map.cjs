#!/usr/bin/env node
/* 维护工具：输出 src 模块体量、导入关系、入度与孤儿文件。
   用法：node scripts/module-map.cjs；配套文档 docs/architecture.md（15.0-A 模块化基线）。 */
const fs = require("node:fs");
const path = require("node:path");
const {execSync} = require("node:child_process");

const files = execSync("git ls-files src", {encoding: "utf8"}).split("\n").filter((f) => /\.(ts|scss)$/.test(f));
const rows = files.map((f) => {
    const s = fs.readFileSync(f, "utf8");
    return {
        f,
        lines: s.split("\n").length,
        bytes: Buffer.byteLength(s),
        imports: [...s.matchAll(/from "(\.[^"]+)"/g)].map((m) => m[1]),
    };
});

console.log("=== 模块清单(按行数降序) ===");
[...rows].sort((a, b) => b.lines - a.lines).forEach((r) => {
    console.log(String(r.lines).padStart(5), r.f.padEnd(34), r.imports.length ? "imports: " + r.imports.slice(0, 5).join(" ").replace(/\.ts|\.scss/g, "") : "");
});

console.log("\n=== SCSS 引用状态 ===");
const tsSources = rows.filter((r) => r.f.endsWith(".ts")).map((r) => fs.readFileSync(r.f, "utf8")).join("\n");
const scssSources = rows.filter((r) => r.f.endsWith(".scss")).map((r) => fs.readFileSync(r.f, "utf8"));
for (const r of rows.filter((r) => r.f.endsWith(".scss"))) {
    const base = path.basename(r.f); // e.g. summary-v4.scss
    const inTs = tsSources.includes(`./ui/${base}`) || tsSources.includes(`./${base}`);
    const inScss = scssSources.some((s) => s.includes(`@use "${base}`) || s.includes(`@import "${base}`));
    console.log((inTs || inScss ? "  引用   " : "  未引用 "), r.f, r.lines + "行", r.bytes + "B");
}

console.log("\n=== 被谁引用(入度>0 的 ts 模块) ===");
const inDegree = {};
for (const r of rows.filter((r) => r.f.endsWith(".ts"))) {
    for (const imp of r.imports) {
        const resolved = path.join(path.dirname(r.f), imp).replace(/\\/g, "/");
        const key = resolved.replace(/\.ts$/, "");
        inDegree[key] = (inDegree[key] || 0) + 1;
    }
}
Object.entries(inDegree).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(String(v).padStart(3), k));

console.log("\n=== 零入度的 ts 模块(只被入口或测试使用?) ===");
for (const r of rows.filter((r) => r.f.endsWith(".ts"))) {
    const key = r.f.replace(/\.ts$/, "");
    if (!inDegree[key]) console.log("  ", r.f);
}
