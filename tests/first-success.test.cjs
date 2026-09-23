/* T-1424 · R-A12 新手首次成功路径测试：阶段单调前进、skip 粘性、reset 归零、
   归一化兼容、抑制判定；外加偏好字段/推进钩子/空态跳过按钮的接线守门与纯度审计。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-first-success-"));
fs.writeFileSync(path.join(dir, "first-success.js"), ts.transpileModule(fs.readFileSync(path.join(root, "src", "features", "first-success.ts"), "utf8"), {compilerOptions}).outputText);
const fsd = require(path.join(dir, "first-success.js"));

const DEFAULT = {stage: "not-started", skipped: false};

/* —— 1. 完整旅程：按序推进到 review-visited —— */
{
    let state = fsd.transitionFirstSuccess(DEFAULT, "item-created");
    assert.equal(state.stage, "item-created");
    state = fsd.transitionFirstSuccess(state, "record-done");
    assert.equal(state.stage, "recorded");
    state = fsd.transitionFirstSuccess(state, "feedback-shown");
    assert.equal(state.stage, "feedback-shown");
    state = fsd.transitionFirstSuccess(state, "review-visited");
    assert.equal(state.stage, "review-visited");
    assert.equal(fsd.isFirstSuccessSuppressed(state), false, "走完旅程不等于被跳过");
}

/* —— 2. 单调性：过期事件不回退阶段 —— */
{
    const state = fsd.transitionFirstSuccess({stage: "feedback-shown", skipped: false}, "item-created");
    assert.equal(state.stage, "feedback-shown", "迟到的事件不降低阶段");
    const idle = fsd.transitionFirstSuccess(DEFAULT, "record-done");
    assert.equal(idle.stage, "recorded", "防御性单调：记录发生即蕴含项目已建（直接落到真实阶段）");
}

/* —— 3. skip 粘性：跳过后引导抑制，但阶段随真实行为继续前进 —— */
{
    let state = fsd.transitionFirstSuccess(DEFAULT, "skip-guidance");
    assert.equal(state.skipped, true);
    assert.equal(state.stage, "not-started");
    assert.equal(fsd.isFirstSuccessSuppressed(state), true);
    state = fsd.transitionFirstSuccess(state, "item-created");
    assert.equal(state.stage, "item-created", "跳过后真实行为仍推进阶段");
    assert.equal(state.skipped, true, "skipped 粘性保持");
    const again = fsd.transitionFirstSuccess(state, "skip-guidance");
    assert.equal(again, state, "重复 skip 幂等（同一对象返回）");
}

/* —— 4. reset：唯一回退，回到默认 —— */
{
    const state = fsd.transitionFirstSuccess({stage: "review-visited", skipped: true}, "reset");
    assert.deepEqual(state, DEFAULT);
}

/* —— 5. 归一化：非法/缺失回落默认；合法值保留 —— */
{
    assert.deepEqual(fsd.normalizeFirstSuccessState(undefined), DEFAULT);
    assert.deepEqual(fsd.normalizeFirstSuccessState(null), DEFAULT);
    assert.deepEqual(fsd.normalizeFirstSuccessState("x"), DEFAULT);
    assert.deepEqual(fsd.normalizeFirstSuccessState({stage: "bogus", skipped: "yes"}), DEFAULT, "非法阶段回落，skipped 只认布尔");
    assert.deepEqual(fsd.normalizeFirstSuccessState({stage: "recorded", skipped: true}), {stage: "recorded", skipped: true});
}

/* —— 6. 确定性：同一状态与事件两次转移深度相等 —— */
{
    const state = {stage: "item-created", skipped: false};
    assert.deepEqual(fsd.transitionFirstSuccess(state, "record-done"), fsd.transitionFirstSuccess(state, "record-done"));
}

/* —— 7. 接线守门：偏好字段/宿主钩子/空态跳过按钮/绑定 —— */
const viewPrefSource = fs.readFileSync(path.join(root, "src", "view-preferences.ts"), "utf8");
assert.match(viewPrefSource, /firstSuccess: FirstSuccessState;/, "偏好接口必须有首次成功字段");
assert.match(viewPrefSource, /normalizeFirstSuccessState\(source\.firstSuccess\)/, "偏好归一化必须走 first-success 模块");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /advanceFirstSuccess\("item-created"\)/, "新建项目必须推进旅程");
assert.match(indexSource, /advanceFirstSuccess\("record-done"\)/, "首次记录必须推进旅程");
assert.match(indexSource, /advanceFirstSuccess\("feedback-shown"\)/, "反馈展示必须推进旅程");
assert.match(indexSource, /advanceFirstSuccess\("review-visited"\)/, "打开回顾必须推进旅程");
assert.match(indexSource, /firstSuccessSkipGuidance\(\)/, "宿主必须实现跳过引导");
assert.match(indexSource, /if \(next === this\.firstSuccessState\) return;/, "幂等事件零写入");
const fragmentsSource = fs.readFileSync(path.join(root, "src", "render", "fragments.ts"), "utf8");
assert.match(fragmentsSource, /firstSuccessSkipped === true/, "被跳过时空态不得再显示三步引导");
assert.match(fragmentsSource, /data-action="skip-onboard"/, "引导卡片必须提供跳过按钮");
const bindTodaySource = fs.readFileSync(path.join(root, "src", "render", "bind-today.ts"), "utf8");
assert.match(bindTodaySource, /data-action='skip-onboard'/, "跳过按钮必须绑定宿主方法");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
const occurrences = i18nSource.split('"today.onboardSkip"').length - 1;
assert.ok(occurrences >= 2, `today.onboardSkip 必须中英双语齐备（当前 ${occurrences} 处）`);

/* —— 8. 纯度：零依赖 + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "first-success.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "状态机模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

console.log("first-success tests passed: 单调前进/skip 粘性/reset/归一化/确定性/接线守门/纯度 全部通过");
