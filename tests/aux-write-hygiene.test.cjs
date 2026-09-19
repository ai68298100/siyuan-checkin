/* T-1246 辅助存储写入卫生守门：接收方不得把远端状态原样写回，旁路诊断必须合并写入。
   真实例行为由 tests/e2e/dual-window-data-change.spec.mjs 断言，这里锁定实现口径。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = path.join(__dirname, "..", "src");
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");

/* 1. 建议工作流：与已落盘文本等值即跳过，且两条读取路径都要建立基线。 */
const workflowBody = indexSource.slice(indexSource.indexOf("private persistSuggestionWorkflow()"));
const workflowSlice = workflowBody.slice(0, workflowBody.indexOf("\n    }"));
assert.match(workflowSlice, /if \(payload === this\.lastPersistedSuggestionWorkflow\) return Promise\.resolve\(\);/, "内容与已落盘一致时必须跳过写入");
assert.match(workflowSlice, /\.then\(\(\) => \{\s*this\.lastPersistedSuggestionWorkflow = payload;/, "只有真正写成功才推进基线");
assert.equal([...indexSource.matchAll(/this\.rememberSuggestionWorkflowBaseline\(storedSuggestionWorkflow\);/g)].length, 2, "onLayoutReady 与 onDataChanged 两条读取路径都要建立基线");
assert.match(indexSource, /private rememberSuggestionWorkflowBaseline\(stored: unknown\): void \{\s*this\.lastPersistedSuggestionWorkflow = typeof stored === "string" \? stored : undefined;/, "非字符串存储必须清空基线，避免吞掉真正需要的写入");

/* 2. 审计：合并窗口 + 拆除前收尾，且不得留下裸的即时写在热路径上。 */
assert.match(indexSource, /const AUDIT_COALESCE_MS = \d+;/, "审计合并窗口必须是常量");
const coalesceBody = indexSource.slice(indexSource.indexOf("private scheduleAuditPersist()"));
const coalesceSlice = coalesceBody.slice(0, coalesceBody.indexOf("\n    }"));
assert.match(coalesceSlice, /if \(this\.auditFlushTimer !== undefined\) return;/, "同一合并窗口内只允许一个待决写入");
assert.match(coalesceSlice, /if \(this\.disposed \|\| this\.disposing\) \{ void this\.persistAuditBestEffort\(\); return; \}/, "拆除期不得再挂定时器");
const flushBody = indexSource.slice(indexSource.indexOf("private flushPendingAuditPersist()"));
const flushSlice = flushBody.slice(0, flushBody.indexOf("\n    }"));
assert.match(flushSlice, /window\.clearTimeout\(this\.auditFlushTimer\)/, "收尾必须取消待决定时器");
assert.match(flushSlice, /return this\.persistAuditBestEffort\(\);/, "收尾必须把挂起的审计真正落盘");
const unloadBody = indexSource.slice(indexSource.indexOf("async onunload()"));
const unloadSlice = unloadBody.slice(0, unloadBody.indexOf("\n    private "));
assert.match(unloadSlice, /this\.flushPendingAuditPersist\(\)/, "onunload 必须等待挂起审计落盘");
for (const hotPath of [/type: "conflict"[\s\S]{0,200}?this\.scheduleAuditPersist\(\)/, /channel: "resolve"[\s\S]{0,200}?this\.scheduleAuditPersist\(\)/, /channel: "write"[\s\S]{0,200}?this\.scheduleAuditPersist\(\)/, /channel: "append"[\s\S]{0,200}?this\.scheduleAuditPersist\(\)/]) {
    assert.match(indexSource, hotPath, "旁路诊断的自动路径必须走合并写入");
}
assert.match(indexSource, /\[data-action='clear-audit'\][\s\S]{0,160}?void this\.persistAuditBestEffort\(\)/, "用户主动清空审计要立即落盘");

console.log("Auxiliary write hygiene checks passed: workflow equality guard, baseline on both load paths, coalesced audit and teardown flush.");
