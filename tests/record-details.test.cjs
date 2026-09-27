/* T-1510 单条记录事实详情守门：
   纯投影（数值/计量方式/生效修订/归属；缺证据如实未知、绝不以当前配置反推历史、
   敏感外部身份不进投影）、验收夹具（20/15 分钟两条、官方日汇总、手动/导入/未知来源、
   历史规则缺失、跨日事件）、宿主接线（详情切换/焦点保持/跳过行不显示）与双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = path.join(__dirname, "..");
const compilerOptions = {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-record-details-"));
const load = (relative) => {
    const target = path.join(dir, relative.replace(/[\\/]/g, "_"));
    fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.join(root, "src", relative), "utf8"), {compilerOptions}).outputText);
    return require(target);
};
const details = load("features/record-details.ts");

const BASE = {id: "e1", itemId: "item-1", source: "manual", unit: "分钟"};
const rowByLabel = (projection, labelKey) => projection.rows.find((row) => row.labelKey === labelKey);

/* —— 1. 同日 20/15 分钟两条：数值与时刻互不混淆。 —— */
{
    const first = details.buildRecordDetails({...BASE, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27", value: 20}, {revision: {effectiveDate: "2026-09-01", kind: "number", target: 30, unit: "分钟"}, itemName: "拉伸"});
    const second = details.buildRecordDetails({...BASE, id: "e2", occurredAt: "2026-09-27T03:30:00.000Z", localDate: "2026-09-27", value: 15}, {revision: {effectiveDate: "2026-09-01", kind: "number", target: 30, unit: "分钟"}, itemName: "拉伸"});
    assert.equal(rowByLabel(first, "review.detailsRow.value").text, "20 分钟");
    assert.equal(rowByLabel(second, "review.detailsRow.value").text, "15 分钟");
    assert.notEqual(rowByLabel(first, "review.detailsRow.time").text, rowByLabel(second, "review.detailsRow.time").text);
    assert.ok(!rowByLabel(first, "review.detailsRow.revision").unknown);
    assert.equal(rowByLabel(first, "review.detailsRow.attribution").text, "拉伸");
}

/* —— 2. 计量方式：只按登记前缀/来源确证；未知来源如实未知。 —— */
{
    const metering = (event, context) => rowByLabel(details.buildRecordDetails(event, context), "review.detailsRow.metering");
    assert.equal(metering({...BASE, source: "weread", externalRef: "weread:item-1:2026-09-26", value: 32, occurredAt: BASE.clock || "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.wereadDaily", "official daily summary keeps day-summary semantics");
    assert.equal(metering({...BASE, source: "weread", externalRef: "weread:finish:b1:2026-09-26", value: 1, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.wereadFinish");
    assert.equal(metering({...BASE, source: "api", externalRef: "health:item-1:steps:2026-09-27", value: 6000, unit: "步", occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.healthSteps");
    assert.equal(metering({...BASE, source: "api", externalRef: "notequery:item-1:b1:2026-09-27", value: 1, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.noteQuery");
    assert.equal(metering({...BASE, source: "sireader", value: 20, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.focusSegment");
    assert.equal(metering({...BASE, source: "manual", value: 1, unit: "次", occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.manual");
    assert.equal(metering({...BASE, source: "import", value: 5, unit: "次", occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}).text, "review.detailsMetering.import");
    const unknown = metering({...BASE, source: "api", externalRef: "my-plugin:session-1", value: 9, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"});
    assert.equal(unknown.text, "review.detailsValue.unknown", "unregistered api identity stays unknown");
    assert.equal(unknown.unknown, true);
    /* 敏感外部身份不进投影。 */
    const all = JSON.stringify(details.buildRecordDetails({...BASE, externalRef: "weread:finish:secret-book:2026-09-26", value: 1, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27"}));
    assert.ok(!all.includes("secret-book"), "externalRef never enters the projection");
}

/* —— 3. 历史规则缺失：项目已删除/修订缺失如实未知，不反推。 —— */
{
    const projection = details.buildRecordDetails({...BASE, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27", value: 20}, {});
    const revisionRow = rowByLabel(projection, "review.detailsRow.revision");
    const attributionRow = rowByLabel(projection, "review.detailsRow.attribution");
    assert.equal(revisionRow.unknown, true, "missing revision history is unknown");
    assert.equal(revisionRow.text, "review.detailsValue.unknown");
    assert.equal(attributionRow.text, "review.detailsValue.itemGone");
    /* 确定性：相同输入输出一致。 */
    assert.deepEqual(projection, details.buildRecordDetails({...BASE, occurredAt: "2026-09-27T01:00:00.000Z", localDate: "2026-09-27", value: 20}, {}));
}

/* —— 4. 跨日事件：localDate（记录日）与 occurredAt（时刻）分离呈现。 —— */
{
    /* 2026-09-26T16:30Z = 本地 2026-09-27 00:30（UTC+8），记录日为 09-27。 */
    const projection = details.buildRecordDetails({...BASE, occurredAt: "2026-09-26T16:30:00.000Z", localDate: "2026-09-27", value: 20}, {});
    assert.equal(rowByLabel(projection, "review.detailsRow.date").text, "2026-09-27");
    assert.equal(rowByLabel(projection, "review.detailsRow.time").text, "2026-09-26T16:30:00.000Z");
}

/* —— 5. 宿主接线与双语。 —— */
const reviewSource = fs.readFileSync(path.join(root, "src", "render", "review.ts"), "utf8");
assert.match(reviewSource, /data-record-details="/, "history rows expose a details toggle");
assert.match(reviewSource, /data-record-details-panel=/, "expanded rows render the details panel");
assert.match(reviewSource, /buildRecordDetails\(event, \{/, "panel consumes the pure projection");
assert.match(reviewSource, /isSkipEvent\(event\) \? "" : `<button class="lc-checkin__text-button" type="button" data-record-details=/, "skip rows hide the details toggle");
assert.match(reviewSource, /recordDetailsExpanded\?\./, "expanded set is optional for old stubs");
const bindingsSource = fs.readFileSync(path.join(root, "src", "render", "bind-page-navigation.ts"), "utf8");
assert.match(bindingsSource, /"\[data-record-details\]"/, "details toggle is bound");
assert.match(bindingsSource, /renderReviewPreservingView\(`\[data-record-details="/, "re-render preserves focus and scroll position");
assert.match(bindingsSource, /expanded\.size >= 50/, "expanded set is bounded");
const indexSource = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
assert.match(indexSource, /private recordDetailsExpanded = new Set<string>\(\)/, "host holds the session expanded set");
assert.match(indexSource, /recordDetailsExpanded: this\.recordDetailsExpanded/, "host passes the expanded set into review ctx");
const scss = fs.readFileSync(path.join(root, "src", "ui", "components.scss"), "utf8");
assert.match(scss, /\.lc-checkin__record-details \{/, "details panel styles exist");
assert.match(scss, /\.lc-checkin__record-details-row > \.is-unknown \{/, "unknown state is styled");
const i18nSource = fs.readFileSync(path.join(root, "src", "i18n.ts"), "utf8");
for (const key of ["review.detailsAction", "review.detailsActionAria", "review.detailsPanelAria", "review.detailsRow.date", "review.detailsRow.time", "review.detailsRow.value", "review.detailsRow.metering", "review.detailsRow.revision", "review.detailsRow.attribution", "review.detailsValue.unknown", "review.detailsValue.skip", "review.detailsValue.revision", "review.detailsValue.itemGone", "review.detailsMetering.wereadDaily", "review.detailsMetering.wereadFinish", "review.detailsMetering.healthSteps", "review.detailsMetering.manual"]) {
    const count = i18nSource.split(`"${key}"`).length - 1;
    assert.ok(count >= 2, `${key} must exist in both locales (${count})`);
}

console.log("record details gates passed: pure fact projection, metering evidence rules, unknown-over-invention, cross-day fixtures, zero-write wiring and bilingual copy.");
