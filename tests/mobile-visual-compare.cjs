const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const [beforePath, afterPath, reportPath] = process.argv.slice(2);
if (!beforePath || !afterPath) { console.error("Usage: node tests/mobile-visual-compare.cjs <before-manifest.json> <after-manifest.json> [report.json]"); process.exit(2); }
const readJson = (file) => JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
const before = readJson(beforePath); const after = readJson(afterPath);
const index = (manifest) => new Map((manifest.records || []).map((record) => [record.width, record]));
const beforeByWidth = index(before); const afterByWidth = index(after);
const hash = (record, file) => { if (!record) return null; const target = path.join(record.outputRoot, file); return fs.existsSync(target) ? crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex") : null; };
const widths = [...new Set([...(before.widths || []), ...(after.widths || [])])].sort((a, b) => a - b);
const comparisons = widths.map((width) => { const oldRecord = beforeByWidth.get(width); const newRecord = afterByWidth.get(width); const files = [...new Set([...(oldRecord?.screenshots || []), ...(newRecord?.screenshots || [])])].sort(); return { width, status: oldRecord && newRecord ? "compared" : oldRecord ? "removed" : "added", changedScreenshots: files.filter((file) => hash(oldRecord, file) !== hash(newRecord, file)), beforeScreenshots: oldRecord?.screenshots || [], afterScreenshots: newRecord?.screenshots || [], scrollAssertions: newRecord?.scrollAssertions || oldRecord?.scrollAssertions || null }; });
const report = { generatedAt: new Date().toISOString(), before: { manifest: path.resolve(beforePath), repoRoot: before.repoRoot, browser: before.browser }, after: { manifest: path.resolve(afterPath), repoRoot: after.repoRoot, browser: after.browser }, widths, comparisons };
if (reportPath) { fs.writeFileSync(path.resolve(reportPath), JSON.stringify(report, null, 2)); console.log(`Comparison written to ${path.resolve(reportPath)}`); } else console.log(JSON.stringify(report, null, 2));
