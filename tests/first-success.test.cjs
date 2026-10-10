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

/* —— 8. 生产 Today 渲染：空态由真实项目/排期/完成事实决定。
   全部相对依赖执行生产 TypeScript；只替换日历时钟，不用桩模型决定结果。 */
const productionModules = new Map();
function loadProduction(relative) {
    const filename = path.resolve(root, "src", relative);
    if (productionModules.has(filename)) return productionModules.get(filename).exports;
    const module = {exports: {}};
    productionModules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {compilerOptions}).outputText;
    const localRequire = name => {
        assert.ok(name.startsWith("."), `render fixture only loads local production dependencies: ${name}`);
        const next = path.resolve(path.dirname(filename), `${name}.ts`);
        return loadProduction(path.relative(path.join(root, "src"), next));
    };
    new Function("require", "exports", "module", code)(localRequire, module.exports, module);
    return module.exports;
}
const productionModel = loadProduction("model.ts");
const productionI18n = loadProduction("i18n.ts");
const productionShared = loadProduction("shared.ts");
productionShared.currentCalendarDate = () => new Date(2026, 9, 6, 12);
const {renderTodayView, renderItemView} = loadProduction("render/fragments.ts");
const todayDate = productionShared.currentCalendarDate();
const todayKey = productionModel.dateKey(todayDate);
const makeItem = (id, extra = {}) => ({
    id, name: id, icon: "✓", kind: "binary", target: 1, unit: "次", schedule: {type: "daily"},
    createdAt: "2026-10-01T00:00:00.000Z", createdDate: "2026-10-01", ...extra,
});
function renderFixture(items = [], options = {}) {
    const store = productionModel.normalizeStore({version: 3, items, events: options.events || []});
    const before = JSON.stringify(store);
    const context = {
        store, occasionStore: {version: 1, occasions: []}, currentStreaks: new Map(),
        bulkMode: false, bulkSelected: new Set(), todaySortMode: "name", todayGroupMode: "none",
        collapsedTodayGroups: new Set(), completedCollapsed: false, pendingOnly: false, todayQuery: "",
        weekStripVisible: false, saveState: "idle", supportsCustomTab: false, appearance: "light",
        reducedMotion: true, bestStreakValue: 0, quickEntryNlp: false, ...options,
    };
    const html = renderTodayView(context);
    assert.equal(JSON.stringify(store), before, "view/empty-state rendering must not write facts");
    return {html, context};
}
for (const language of ["zh-CN", "en-US"]) {
    productionI18n.setPluginLanguage(language);
    const text = productionI18n.t;
    const fresh = renderFixture().html;
    assert.ok(fresh.includes(text("today.emptyOnboardDesc")));
    assert.match(fresh, /<ol class="lc-checkin__onboard-steps">/);
    assert.match(fresh, /data-action="skip-onboard"/);
    assert.match(fresh, /class="lc-checkin__primary-button lc-checkin__onboard-start" type="button" data-action="add"/, `${language}: first-use primary action opens item creation`);
    assert.match(fresh, /class="lc-checkin__text-button lc-checkin__onboard-skip" type="button" data-action="skip-onboard"/, `${language}: skip remains a secondary action`);
    assert.ok(fresh.indexOf("lc-checkin__onboard-start") < fresh.indexOf("lc-checkin__onboard-skip"), `${language}: create precedes skip`);
    assert.match(fresh, /class="lc-checkin__onboard-features"/, `${language}: first-use feature overview is discoverable`);
    for (const featureKey of ["today.featureToday", "today.featureReview", "today.featureOccasions", "today.featureMore"]) {
        assert.ok(fresh.includes(text(featureKey)), `${language}: feature overview includes ${featureKey}`);
    }
    assert.doesNotMatch(fresh, /data-action="archived"/);
    const guidance = text("today.step3Desc", {checkin: text("item.checkin"), entry: text("item.exactShort"), duration: text("item.manualShort")});
    assert.ok(fresh.includes(guidance), `${language}: guidance uses the actual record controls`);
    assert.doesNotMatch(guidance, /\{(?:checkin|entry|duration)\}/);

    const skipped = renderFixture([], {firstSuccessSkipped: true}).html;
    assert.ok(skipped.includes(text("today.emptyNewDesc")));
    assert.match(skipped, /class="lc-checkin__primary-button lc-checkin__onboard-start" type="button" data-action="add"/);
    assert.doesNotMatch(skipped, /onboard-skip/);
    assert.doesNotMatch(skipped, /onboard-steps|onboard-features|data-action="skip-onboard"|data-action="archived"/,
        "skipping guidance on an empty library keeps creation, without inventing archived items");
    for (const firstSuccessSkipped of [false, true]) {
        const archived = renderFixture([makeItem("archived", {archived: true})], {firstSuccessSkipped}).html;
        assert.ok(archived.includes(text("today.emptyActiveDesc")));
        assert.match(archived, /data-action="archived"/);
        assert.doesNotMatch(archived, /onboard-steps|data-action="skip-onboard"/);
    }

    const offDay = renderFixture([makeItem("sunday", {schedule: {type: "weekly", weekdays: [0]}})]).html;
    assert.ok(offDay.includes(text("today.emptyScheduledDesc")));
    assert.doesNotMatch(offDay, /onboard-steps|data-action="archived"|lc-checkin__all-done/);
    const completedEvent = {id: "done", itemId: "done-item", localDate: todayKey,
        occurredAt: todayDate.toISOString(), value: 1, unit: "次", source: "manual"};
    const done = renderFixture([makeItem("done-item")], {events: [completedEvent]}).html;
    assert.ok(done.includes(text("today.allDone")));
    assert.match(done, /lc-checkin__completed-section/);
    const pending = renderFixture([makeItem("done-item")], {events: [completedEvent], pendingOnly: true}).html;
    assert.ok(pending.includes(text("today.pendingEmpty")));
    assert.doesNotMatch(pending, /lc-checkin__completed-section/);
    const search = renderFixture([makeItem("scheduled")], {todayQuery: "not-present"}).html;
    assert.ok(search.includes(text("today.searchEmptyHint")));
    assert.match(search, /data-action="clear-search"/);
    assert.doesNotMatch(search, /onboard-steps|data-action="archived"|lc-checkin__all-done/);
    const completedMatch = renderFixture([makeItem("done-item"), makeItem("other")],
        {events: [completedEvent], todayQuery: "done-item"}).html;
    assert.ok(completedMatch.includes(text("today.queryCompleted")));

    for (const [kind, extra] of [["binary", {}], ["count", {}], ["quantity", {unit: "杯"}], ["duration", {unit: "分钟"}]]) {
        const {context} = renderFixture([makeItem(kind, {kind, ...extra})]);
        const item = renderItemView(context.store.items[0], todayDate, context);
        if (kind === "binary") {
            assert.match(item, /<button class="lc-checkin__item-icon"[^>]*data-action="toggle"/);
            assert.ok(item.includes(text("item.checkin")));
        } else {
            assert.match(item, /<span class="lc-checkin__item-icon" aria-hidden="true">/);
            assert.match(item, /data-action="toggle-exact"/);
            assert.ok(item.includes(text(kind === "duration" ? "item.manualShort" : "item.exactShort")));
            if (kind !== "duration") assert.match(item, /data-action="quick-record"/);
        }
    }
}

/* —— 9. 纯度：零依赖 + 无时钟 —— */
const moduleSource = fs.readFileSync(path.join(root, "src", "features", "first-success.ts"), "utf8");
assert.doesNotMatch(moduleSource, /^import /m, "状态机模块保持零依赖");
assert.doesNotMatch(moduleSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, ""), /Date\.now\(|new Date\(\)/, "禁止隐式时钟");

console.log("first-success tests passed: state transitions and bilingual production Today rendering (empty/skipped/archive/off-day/complete/search plus binary/count/quantity/duration record controls).");
