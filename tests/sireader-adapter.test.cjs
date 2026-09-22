/* T-1384 思阅适配器守门：焦点状态机（open/focus/blur/close 配对、忽略与倒流守卫）、
   跨日预切分、分钟取整、重载丢弃、写入身份格式、偏好归一（opt-in 默认关）、
   框架结算组合幂等、宿主/设置/防伪接线与 i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-sireader-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/health-inbox.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts"].forEach(transpile);
const {SireaderFocusTracker, buildSireaderExternalRef} = require(path.join(outputRoot, "src/features/sireader-adapter.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {normalizeSourceGovernance, settleSegmentsToDays} = require(path.join(outputRoot, "src/features/source-framework.js"));

/* 确定性时钟：以 UTC 日期为本地日，次日零点为切分边界。 */
const MIN = 60_000;
const DAY1 = Date.UTC(2026, 8, 22);
const DAY2 = Date.UTC(2026, 8, 23);
const toLocalDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const nextMidnight = (ms) => {
    const at = new Date(ms);
    return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
};
const makeTracker = () => new SireaderFocusTracker({toLocalDate, nextMidnight});

/* 生命周期：open 开始、blur 结束、分钟向下取整。 */
const tracker = makeTracker();
assert.deepEqual(tracker.handle("open", DAY1 + 10 * MIN), []);
assert.equal(tracker.focusing, true);
assert.deepEqual(tracker.handle("blur", DAY1 + 45 * MIN + 20_000), [{localDate: "2026-09-22", minutes: 35}], "10min to 45m20s floors to 35 minutes");
assert.equal(tracker.focusing, false);
assert.equal(tracker.dayTotal("2026-09-22"), 35);

/* 忽略语义：重复 focus、空闲 blur、时间倒流。 */
tracker.handle("focus", DAY1 + 50 * MIN);
tracker.handle("focus", DAY1 + 51 * MIN);
assert.deepEqual(tracker.handle("blur", DAY1 + 80 * MIN), [{localDate: "2026-09-22", minutes: 30}], "duplicate focus must not restart the clock");
assert.deepEqual(tracker.handle("blur", DAY1 + 90 * MIN), [], "blur while idle is ignored");
tracker.handle("focus", DAY1 + 100 * MIN);
assert.deepEqual(tracker.handle("blur", DAY1 + 90 * MIN), [], "time reversal is ignored");
assert.equal(tracker.focusing, false, "reversed interval must not leave focus dangling");

/* close 结算；跨日切分为两段（各日取整）：23:00 → 次日 01:30:59 = 23 日 60 分 + 24 日 90 分。 */
tracker.handle("open", DAY2 + 23 * 60 * MIN);
const split = tracker.handle("close", DAY2 + 25 * 60 * MIN + 30 * MIN + 59_000);
assert.deepEqual(split, [{localDate: "2026-09-23", minutes: 60}, {localDate: "2026-09-24", minutes: 90}], "midnight span splits per local date with per-day flooring");
assert.equal(tracker.dayTotal("2026-09-23"), 60);

/* 重载恢复：在飞区间丢弃（少记不多记）。 */
tracker.handle("focus", DAY2 + 10 * MIN);
tracker.discardInFlight();
assert.equal(tracker.focusing, false);
assert.deepEqual(tracker.handle("blur", DAY2 + 60 * MIN), [], "discarded in-flight focus must not accumulate");

/* 子分钟区间不产出片段。 */
tracker.handle("focus", DAY2 + 500 * MIN);
assert.deepEqual(tracker.handle("blur", DAY2 + 500 * MIN + 30_000), []);

/* 写入身份：sireader:<itemId>:<localDate>；非法输入空串。 */
assert.equal(buildSireaderExternalRef("read-item", "2026-09-22"), "sireader:read-item:2026-09-22");
assert.equal(buildSireaderExternalRef("", "2026-09-22"), "");
assert.equal(buildSireaderExternalRef("read-item", "2026/09/22"), "");

/* 偏好归一：默认关；无 itemId 不物化 enabled；阈值钳制 1~1440 缺省 30。 */
assert.deepEqual(normalizeViewPreferences({}).sireaderIntegration, {enabled: false, itemId: "", thresholdMinutes: 30});
assert.equal(normalizeViewPreferences({sireaderIntegration: {enabled: true, itemId: ""}}).sireaderIntegration.enabled, false);
assert.equal(normalizeViewPreferences({sireaderIntegration: {enabled: true, itemId: "read"}}).sireaderIntegration.thresholdMinutes, 30);
assert.equal(normalizeViewPreferences({sireaderIntegration: {enabled: true, itemId: "read", thresholdMinutes: 9999}}).sireaderIntegration.thresholdMinutes, 1440);
assert.deepEqual(normalizeViewPreferences({sireaderIntegration: "on"}).sireaderIntegration.itemId, "");

/* 组合：计时器片段 → 按日累计结算 → 只写未写过的资格日（T-1387 宿主同逻辑）。 */
const governance = normalizeSourceGovernance({enabled: true, thresholdValue: 30, itemIds: ["read"]});
const refFor = (localDate) => buildSireaderExternalRef("read", localDate);

/* 累计结算：20 分与 20 分两段各自不到阈值，按日累计 40 才达标（D-261 修复的回归锚）。 */
const tracker2 = makeTracker();
const settleForHost = (localDates) => settleSegmentsToDays(
    localDates.map((localDate) => ({externalRef: refFor(localDate), localDate, value: tracker2.dayTotal(localDate)})),
    governance,
    localDates.map(refFor).filter((ref) => writtenRefs.has(ref)),
);
const writtenRefs = new Set();
tracker2.handle("focus", DAY1 + 10 * MIN);
tracker2.handle("blur", DAY1 + 30 * MIN);
tracker2.handle("focus", DAY1 + 40 * MIN);
tracker2.handle("blur", DAY1 + 60 * MIN);
assert.equal(tracker2.dayTotal("2026-09-22"), 40, "two 20-minute sessions accumulate 40 minutes on the tracker");
const firstSettlement = settleForHost(["2026-09-22"]);
assert.equal(firstSettlement.days[0].qualifies, true, "cumulative 40 crosses the 30 threshold even though each session is below");
assert.equal(firstSettlement.days[0].countedValue, 40, "write value carries the cumulative minutes");

/* 已写当日再结算必须跳过（每日一次幂等）。 */
writtenRefs.add(refFor("2026-09-22"));
const secondSettlement = settleForHost(["2026-09-22"]);
const secondWritable = secondSettlement.days.filter((day) => day.qualifies && !writtenRefs.has(refFor(day.localDate)));
assert.equal(secondWritable.length, 0, "written day never rewrites");

/* T-1387 验收：删除不复活（墓碑身份在 appendEvents 被拒）。 */
const model = require(path.join(outputRoot, "src/model.js"));
const makeEvent = (overrides = {}) => ({id: `e-${Math.random().toString(36).slice(2, 8)}`, itemId: "read", occurredAt: "2026-09-22T08:00:00Z", localDate: "2026-09-22", value: 35, unit: "分钟", source: "sireader", externalRef: refFor("2026-09-22"), kind: "checkin", ...overrides});
const storeWithTombstone = model.normalizeStore({
    version: 3,
    items: [{id: "read", name: "阅读", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01"}],
    events: [],
    eventTombstones: [{eventId: "e-deleted", deletedAt: "2026-09-23T00:00:00Z", itemId: "read", source: "sireader", externalRef: refFor("2026-09-22")}],
});
const resurrected = model.appendEvents(storeWithTombstone, [makeEvent()]);
assert.equal(resurrected.events.length, 0, "a tombstoned sireader identity must never resurrect after user deletion");

/* T-1387 验收：跨窗口并发——两个窗口各自写入同身份事件，合并后收敛为一条。 */
const readItem = {id: "read", name: "阅读", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01"};
const windowA = model.normalizeStore({version: 3, items: [readItem], events: [makeEvent({id: "win-a"})]});
const windowB = model.normalizeStore({version: 3, items: [readItem], events: [makeEvent({id: "win-b"})]});
const merged = model.mergeNormalizedStores(windowA, windowB);
const sireaderEvents = merged.events.filter((event) => event.source === "sireader");
assert.equal(sireaderEvents.length, 1, "duplicate sireader identities from two windows converge to one event");
assert.ok(sireaderEvents[0].externalRef === refFor("2026-09-22"));

/* T-1387 验收：失败自愈——写入失败后同输入重复结算仍给出资格日（宿主下次事件自动重试）。 */
const retrySettlement = settleSegmentsToDays(
    [{externalRef: refFor("2026-09-24"), localDate: "2026-09-24", value: 40}],
    governance,
    [],
);
assert.equal(retrySettlement.days[0].qualifies, true, "unwritten qualifying day stays eligible until the write succeeds");
const retryAgain = settleSegmentsToDays(
    [{externalRef: refFor("2026-09-24"), localDate: "2026-09-24", value: 40}],
    governance,
    [],
);
assert.equal(JSON.stringify(retryAgain), JSON.stringify(retrySettlement), "settlement determinism makes retry self-healing");


/* 接线断言：监听绑定/拆除、结算→写入路径、每日一次守卫、facade 防伪、注册表、设置结构。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.ok(indexSource.includes("this.bindSireaderListeners();") && indexSource.includes("this.unbindSireaderListeners();"), "sireader listeners must be bound at startup and unbound at teardown");
assert.ok(indexSource.includes('source: "sireader", externalRef'), "write path must stamp the sireader source and externalRef");
assert.ok(indexSource.includes('event.source === "sireader" && event.externalRef === ref'), "daily write must be guarded by the existing identity");
assert.ok(indexSource.includes("this.store.eventTombstones.some"), "deleted (tombstoned) sireader days must be pre-checked before writing");
assert.ok(indexSource.includes('["manual", "tomato", "api", "import", "sireader", "siplayer"]'), "summary resident source counts must include sireader and siplayer");
const apiSource = fs.readFileSync(path.join(__dirname, "..", "src/api.ts"), "utf8");
assert.match(apiSource, /"sireader" \|\| input\.source === "siplayer" \? \{source: "api"/, "public API input must not be able to mint sireader or siplayer events");
const ecosystemSource = fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8");
assert.match(ecosystemSource, /prefix: "sireader", label: "SiReader", format: "sireader:<itemId>:<localDate>"/, "sireader prefix must be registered in the identity registry");
const modelSource = fs.readFileSync(path.join(__dirname, "..", "src/model.ts"), "utf8");
assert.match(modelSource, /value\.source === "sireader"/, "event normalization must accept sireader so multi-window merge keeps provenance");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
for (const hook of ["data-sireader-integration", "data-sireader-toggle", "data-sireader-item", "data-sireader-threshold", "save-sireader"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}

/* i18n 双语。 */
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["set.sireaderTitle", "set.sireaderHint", "set.sireaderToggle", "set.sireaderItem", "set.sireaderItemHint", "set.sireaderItemChoose", "set.sireaderThreshold", "set.sireaderThresholdHint", "set.sireaderSave", "msg.sireaderNeedItem", "msg.sireaderSaved", "source.sireader"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

console.log("sireader adapter gates passed: lifecycle pairing, midnight split, minute flooring, reload discard, identity, governance opt-in, settlement composition, wiring, anti-spoof, registry, i18n parity");
