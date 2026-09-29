/* T-1630 守门：微信读书三链路拉取完整性。
   - 笔记结算门 settleWereadNotes：未完整（分页触顶/网关失败）→retry 不写每日身份
     （身份一经写入即锁定当日补算机会）；已存在→skip；完整零 tally→skip；完整>0→write；
   - 升级阻断：upgrade（官方升级停用）出现即阻断本轮全部链路，无论时长成功与否；
   - 完读链路返回 written/pending（超上限与失败的书计入 pending，不假成功）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-weread-integrity-"));
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
fs.writeFileSync(path.join(dir, "weread-adapter.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "weread-adapter.ts"), "utf8"), {compilerOptions}).outputText);
const adapter = require(path.join(dir, "weread-adapter.js"));

/* —— 笔记结算决策矩阵 —— */
assert.deepEqual(adapter.settleWereadNotes({complete: true, tally: 7, identityExists: false}), {action: "write", value: 7}, "complete positive tally writes");
assert.deepEqual(adapter.settleWereadNotes({complete: true, tally: 0, identityExists: false}), {action: "skip", value: 0}, "complete zero tally skips without locking");
assert.deepEqual(adapter.settleWereadNotes({complete: false, tally: 7, identityExists: false}), {action: "retry", value: 0}, "incomplete scan never writes a partial tally");
assert.deepEqual(adapter.settleWereadNotes({complete: false, tally: 0, identityExists: false}), {action: "retry", value: 0}, "gateway failure (indistinguishable from empty) still retries");
assert.deepEqual(adapter.settleWereadNotes({complete: true, tally: 7, identityExists: true}), {action: "skip", value: 0}, "existing daily identity skips");
assert.equal(adapter.wereadUpgradeBlocked("服务升级中"), true, "non-empty upgrade blocks");
assert.equal(adapter.wereadUpgradeBlocked(undefined), false, "no upgrade does not block");

/* —— 宿主接线（精确签名） —— */
const pluginSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(pluginSource, /if \(wereadUpgradeBlocked\(outcome\.upgrade\)\) \{[\s\S]*?return written;\s*\}/, "upgrade must block the whole round (duration ok or not)");
const notesBody = pluginSource.slice(pluginSource.indexOf("private async ingestWereadNotes"), pluginSource.indexOf("private async pullWereadNow"));
assert.match(notesBody, /if \(!pageResult\.payload\) \{ complete = false; break; \}/, "notebook gateway failure must mark the scan incomplete");
assert.match(notesBody, /if \(page === 4\) \{ complete = false; break; \}/, "notebook overview page cap must mark incomplete");
assert.match(notesBody, /if \(activeBooks\.length > 10\) complete = false;/, "books beyond the per-round cap must mark incomplete");
assert.match(notesBody, /if \(!bookmarkList\.payload\) \{ complete = false; break; \}/, "bookmark gateway failure must mark incomplete");
assert.match(notesBody, /if \(page === 2\) \{ complete = false; break; \}/, "review synckey page cap must mark incomplete");
assert.match(notesBody, /const decision = settleWereadNotes\(scan\);/, "notes settlement must go through the adapter gate");
assert.match(notesBody, /decision\.action !== "write"/, "non-write actions must not create the daily identity");
const finishedBody = pluginSource.slice(pluginSource.indexOf("private async ingestWereadFinished"), pluginSource.indexOf("/* T-1402 第三批次"));
assert.match(finishedBody, /if \(!progress\.payload\) \{ pending \+= 1; continue; \}/, "failed progress verification counts as pending, not success");
assert.match(finishedBody, /let pending = Math\.max\(0, finishedBooks\.length - 10\);/, "books beyond the per-round cap count as pending");
assert.match(pluginSource, /\{\.\.\.base, finished, \.\.\.\(notes \? \{notes\} : \{\}\)\}/, "the pull result must carry per-chain outcomes");

fs.rmSync(dir, {recursive: true, force: true});
console.log("Weread integrity checks passed: notes settle matrix, upgrade blocking, per-chain outcomes, finished pending accounting.");
