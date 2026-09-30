/* T-1743 切片守门：微信读书配置的生效可见性与确认边界（D-367）。
   风险路径（截图主诉）：配置分散四处（下拉 change 即保存 / Key+阈值走保存设置 /
   启用开关 / 拉取按钮），用户难判断哪一步已生效；30 分钟阈值默认无来源说明。
   契约：微信读书卡新增"当前已生效"摘要行（启用态/绑定项目/阈值/Key 状态，全部
   渲染自 ctx.wereadIntegration 已保存值，不含未保存输入框草稿）；阈值 hint 明示
   30 分钟为通用默认；既有守卫（启用需绑定+Key+分钟目标、拉取需配置+启用、Key
   遮罩/留空保留/清除确认）结构钉固化。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src", "render", "settings.ts"), "utf8");

/* —— 夹具 1：生效摘要行存在且只读自已保存值。 —— */
assert.match(settingsSource, /set\.wereadEffective/, "the effective summary row exists");
assert.match(settingsSource, /set\.wereadEffectiveHint/, "the summary states it excludes unsaved drafts");
assert.match(settingsSource, /set\.wereadEnabledOn/, "the summary shows the enabled state");
assert.match(settingsSource, /set\.wereadNotBound/, "an unbound item shows as not-bound");
assert.match(settingsSource, /set\.wereadThresholdValue/, "the summary shows the threshold value");
assert.match(settingsSource, /set\.wereadKeyNone/, "a missing Key shows as not-set");
assert.match(settingsSource, /set\.wereadKeySaved/, "a saved Key shows as saved");

/* —— 夹具 2：阈值 hint 明示 30 分钟默认来源。 —— */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src", "i18n.ts"), "utf8");
assert.match(i18nSource, /30 分钟为通用默认值，并非依据个人阅读历史计算/, "zh threshold hint states the default origin");
assert.match(i18nSource, /general convention, not derived from your reading history/, "en threshold hint states the default origin");

/* —— 夹具 3：既有守卫结构钉（启用需绑定+Key+分钟目标；拉取需配置+启用）。 —— */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
const toggleStart = indexSource.indexOf('querySelector<HTMLInputElement>("[data-weread-toggle]")');
const toggleBody = indexSource.slice(toggleStart, indexSource.indexOf("data-weread-item", toggleStart));
assert.match(toggleBody, /msg\.wereadNeedConfig/, "enabling without config is blocked");
assert.match(toggleBody, /msg\.wereadNeedMinuteItem/, "enabling without a minute target is blocked");
const pullStart = indexSource.indexOf("private async pullWereadNow");
const pullBody = indexSource.slice(pullStart, indexSource.indexOf("}", indexSource.indexOf("wereadPullNeedEnable", pullStart)));
assert.match(pullBody, /msg\.wereadNeedConfig/, "pulling without config is blocked");
assert.match(pullBody, /msg\.wereadPullNeedEnable/, "pulling while disabled is blocked");
/* Key 遮罩与留空保留。 */
assert.match(indexSource, /Key 只在用户显式输入时更新（留空 = 保留已存 Key）/, "the key-keep semantics are documented at the write site");

/* —— 夹具 4：红证对照——修复前（7826e3f）无生效摘要行。 —— */
const preFixSettings = cp.execSync("git show 7826e3f:src/render/settings.ts", {encoding: "utf8"});
assert.doesNotMatch(preFixSettings, /set\.wereadEffective/, "the pre-fix card had no effective summary (red evidence)");

/* —— 夹具 5：i18n 双语键在位（新增键清点；KeySaved 复用既有键不重复）。 —— */
for (const key of ["set.wereadEffective", "set.wereadEffectiveHint", "set.wereadEnabledOn", "set.wereadEnabledOff", "set.wereadNotBound", "set.wereadThresholdValue", "set.wereadKeyNone"]) {
    assert.equal((i18nSource.match(new RegExp(`"${key}":`, "g")) || []).length, 2, `${key} exists in both dictionaries`);
}
assert.equal((i18nSource.match(/"set\.wereadKeySaved":/g) || []).length, 2, "the pre-existing KeySaved key is not duplicated");

console.log("weread-effective: all assertions passed");
