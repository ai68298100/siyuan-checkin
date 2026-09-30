/* T-1744 切片守门：思阅/思播分钟候选与宿主探测建议（D-368）。
   风险路径：思阅/思播下拉与写入校验脱节（可选非分钟项目，启用时才失败）；
   思阅缺公开宿主探测接口，页面不得显示假连通。
   契约：思阅/思播候选复用 wereadCandidates minutes 过滤（与写入校验同纪律）；
   思阅面板显式显示"暂无公开宿主探测接口"等待说明（数据边界，非错误）；
   思播保留三态探测显示（available/missing/unknown）。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");

/* —— 夹具 1：思阅/思播候选走分钟过滤（复用 wereadOptionsFor minutes）。 —— */
assert.match(settingsSource, /const sireaderItemOptions = wereadOptionsFor\(sireader\.itemId, "minutes"\);/, "sireader candidates filter to minutes");
assert.match(settingsSource, /const siplayerItemOptions = wereadOptionsFor\(siplayer\.itemId, "minutes"\);/, "siplayer candidates filter to minutes");

/* —— 夹具 2：思阅等待说明（不假连通）。 —— */
assert.match(settingsSource, /data-sireader-probe-wait/, "the sireader panel shows the probe-wait note");
assert.match(settingsSource, /set\.sireaderProbeWait/, "the wait copy is i18n-driven");
assert.match(settingsSource, /data-siplayer-host-state=/, "siplayer keeps its three-state probe display");

/* —— 夹具 3：既有重复计量检测保留（sireader vs weread 同目标）。 —— */
assert.match(settingsSource, /readingConflictItem/, "the existing reading-duration conflict detection stays");

/* —— 夹具 4：i18n 双语键在位。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.equal((i18nSource.match(/"set\.sireaderProbeWait":/g) || []).length, 2, "the wait copy exists in both dictionaries");

/* —— 夹具 5：红证对照——修复前（09786ca）思阅/思播复用未过滤 projectOptions、无等待说明。 —— */
const preFixSettings = cp.execSync("git show 09786ca:src/render/settings.ts", {encoding: "utf8"});
assert.match(preFixSettings, /const sireaderItemOptions = projectOptions\(sireader\.itemId\);/, "the pre-fix sireader reused the unfiltered list (red evidence)");
assert.doesNotMatch(preFixSettings, /data-sireader-probe-wait/, "the pre-fix panel had no probe-wait note (red evidence)");

console.log("occasion-source-candidates: all assertions passed");
