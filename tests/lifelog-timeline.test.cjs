/* T-1541 LifeLog 时间轴投影守门：解析/排序/色板确定性/无时钟/空态，纯函数夹具。 */
process.env.TZ = "Asia/Shanghai";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const projectRoot = path.join(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(projectRoot, ...segments), "utf8");

function loadTypeScriptModule(filename, dependencies = {}) {
    const output = ts.transpileModule(read(...filename.split("/")), {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
        fileName: filename,
    }).outputText;
    const module = {exports: {}};
    const context = vm.createContext({
        module,
        exports: module.exports,
        require(specifier) {
            if (Object.prototype.hasOwnProperty.call(dependencies, specifier)) return dependencies[specifier];
            throw new Error(`Unexpected dependency ${specifier} while loading ${filename}`);
        },
        console,
    });
    vm.runInContext(output, context, {filename});
    return module.exports;
}

const timeline = loadTypeScriptModule("src/features/lifelog-timeline.ts");

/* 解析：类型/备注拆分、时间读数、分钟取整、无效 ISO 丢弃、排序确定性。 */
const entries = timeline.buildLifelogTimeline([
    {occurredAt: "2026-09-29T14:05:00.000Z", value: 45.4, note: "工作：写日报", itemId: "w"},
    {occurredAt: "2026-09-29T06:30:00.000Z", value: 30, note: "运动", itemId: "run"},
    {occurredAt: "not-a-date", value: 10, note: "坏数据", itemId: "x"},
    {occurredAt: "2026-09-29T09:00:00.000Z", value: -5, note: "负值", itemId: "y"},
], new Map([["w", "深度工作"], ["run", "晨跑"]]));

assert.equal(entries.length, 3, "invalid ISO must be dropped, valid ones kept");
assert.equal(entries[0].time, "14:30", "local time readout must come from the event itself (UTC+8 fixture timezone)");
assert.equal(entries[0].type, "运动", "type is the segment before the colon");
assert.equal(entries[0].text, "", "type-only notes have no trailing text");
assert.equal(entries[0].itemName, "晨跑", "item name resolved from the mapping");
assert.equal(entries[1].time, "17:00", "events must stay in ascending occurrence order");
assert.equal(entries[1].minutes, 0, "non-positive values fall back to zero");
assert.equal(entries[2].time, "22:05", "the latest event sorts last in the local readout");
assert.equal(entries[2].type, "工作", "full-width colon splits type from text");
assert.equal(entries[2].text, "写日报", "trailing text is preserved");
assert.equal(entries[2].minutes, 45, "fractional minutes are rounded to whole numbers");
assert.equal(entries[2].itemName, "深度工作", "item name resolved from the mapping");

/* 色板：同类型恒同色、空类型中性 -1、索引有界。 */
assert.equal(timeline.lifelogTypeColorIndex("工作"), timeline.lifelogTypeColorIndex("工作"), "same type maps to the same color");
assert.equal(timeline.lifelogTypeColorIndex(""), -1, "empty type uses the neutral color");
for (const type of ["工作", "运动", "学习", "阅读", "通勤", "休息", "娱乐", "琐事"]) {
    const index = timeline.lifelogTypeColorIndex(type);
    assert.ok(index >= 0 && index <= 5, `color index must stay on the 6-color palette: ${type} -> ${index}`);
}
const rendered = timeline.buildLifelogTimeline([{occurredAt: "2026-09-29T09:00:00.000Z", value: 20, note: "", itemId: "x"}], new Map());
assert.equal(rendered[0].colorIndex, -1, "typeless entries project to the neutral color");
assert.equal(rendered[0].itemName, "", "unknown item renders empty, not undefined");

/* 渲染面守门：折叠区/接口字段/样式类在位；数据注入在宿主。 */
const review = read("src", "render", "review.ts");
assert.match(review, /fold\("lifelog", t\("review\.lifelogTitle"\), renderLifelog\)/, "the timeline folds into the analysis workspace");
assert.match(review, /data-lifelog-color="\$\{entry\.colorIndex\}"/, "color index must flow from the pure projection");
assert.match(review, /review\.lifelogEmpty/, "empty ranges must show an explicit hint, not a blank fold");
const index = read("src", "index.ts");
assert.match(index, /buildLifelogTimeline\(/, "the host feeds the projection from range events");
assert.match(index, /event\.source === "yeguif"/, "only yeguif events feed the timeline (pure rendering, zero writes)");
const i18n = read("src", "i18n.ts");
for (const key of ["review.lifelogTitle", "review.lifelogEmpty", "review.lifelogMinutes"]) {
    const count = i18n.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both dictionaries (found ${count})`);
}

console.log("Lifelog timeline projection checks passed.");
