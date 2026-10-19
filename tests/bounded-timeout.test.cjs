/* T-1854 守门：内核读取与网关调用的有界超时、取消与游标保持契约。
   - kernelPost 接入 10s 客户端有界超时与卸载阻断，清理定时器；
   - wereadGateway 接入 18s 客户端超时竞态与卸载阻断；
   - 扫描读取超时或拒绝时保持游标不推进、不退化已有事实。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pluginSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");

/* 1. 超时常数定义与语义审查 */
assert.match(pluginSource, /const DEFAULT_KERNEL_POST_TIMEOUT_MS = 10000;/, "kernelPost default timeout constant 10000ms");
assert.match(pluginSource, /const WEREAD_CLIENT_TIMEOUT_MS = 18000;/, "weread client timeout constant 18000ms");

/* 2. kernelPost 有界超时与卸载阻断接线 */
assert.match(pluginSource, /if \(this\.disposed \|\| this\.disposing\)\s*\{\s*return Promise\.reject\(new Error\("plugin-disposed"\)\);\s*\}/, "kernelPost immediate rejection during disposal");
assert.match(pluginSource, /setTimeout\(\(\) => reject\(new Error\("kernel-post-timeout"\)\), timeoutMs\);/, "kernelPost timeout rejection");
assert.match(pluginSource, /Promise\.race\(\[\s*fetchSyncPost\(url, payload\) as Promise<T>,\s*timeoutPromise,\s*\]\)\.finally\(\(\) => \{\s*if \(timer\) clearTimeout\(timer\);\s*\}\);/, "kernelPost race and clearTimeout in finally");

/* 3. wereadGateway 客户端超时与卸载阻断接线 */
assert.match(pluginSource, /private async wereadGateway\(body: Record<string, unknown>\): Promise<\{payload\?: unknown; status\?: number\}> \{\s*if \(this\.disposed \|\| this\.disposing\)\s*\{\s*return \{status: 0\};\s*\}/, "wereadGateway immediate rejection during disposal");
assert.match(pluginSource, /setTimeout\(\(\) => resolve\(undefined\), WEREAD_CLIENT_TIMEOUT_MS\);/, "wereadGateway timeout timer with WEREAD_CLIENT_TIMEOUT_MS");

/* 4. 来源扫描失败与超时游标保护断言：
   若 scan 抛出错误或返回 undefined，游标绝不推进，报告如实记录 read-failed */
assert.match(pluginSource, /const scan = await scanBoundedPages\(\{[\s\S]*?\}\)\.catch\(\(\) => undefined\);[\s\S]*?if \(!scan\) \{ report\.outcome = "read-failed"; return; \}/, "notequery preserves cursor and returns read-failed on failure");
assert.match(pluginSource, /\} catch \{ report\.outcome = report\.scanned \? "write-failed" : "read-failed"; \}/, "health inbox preserves cursor and logs diagnostic error on failure");

console.log("Bounded timeout checks passed: kernelPost 10s race, wereadGateway 18s race, disposal isolation, cursor preservation on failure.");
