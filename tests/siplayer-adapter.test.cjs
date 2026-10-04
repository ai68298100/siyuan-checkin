/* T-1385 思播适配器守门：采样状态机（在播累计/暂停断段/断档丢弃/重载丢弃）、
   写入身份、偏好归一（opt-in 默认关）、结算组合幂等、source 枚举全套触点、
   facade 防伪、注册表、设置结构、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-siplayer-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/features/weekly-review.ts", "src/view-preferences.ts", "src/features/note-query.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts", "src/features/health-inbox.ts", "src/features/weread-adapter.ts", "src/features/yeguif-adapter.ts", "src/features/siplayer-adapter.ts"].forEach(transpile);
const adapter = require(path.join(outputRoot, "src/features/siplayer-adapter.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {normalizeSourceGovernance, settleSegmentsToDays} = require(path.join(outputRoot, "src/features/source-framework.js"));

const MIN = 60_000;
const DAY1 = Date.UTC(2026, 8, 24);
const DAY2 = DAY1 + 24 * 60 * MIN;
const toLocalDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const nextMidnight = (ms) => {
    const at = new Date(ms);
    return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
};
/* 采样周期 15 分钟（测试口径），断档阈值 = 3 倍 = 45 分钟。 */
const makeTracker = () => new adapter.SiplayerPlaybackTracker({toLocalDate, nextMidnight, sampleIntervalMs: 15 * MIN});

/* 采样状态机：在播采样对累计墙上时间；暂停结段。 */
const tracker = makeTracker();
assert.deepEqual(tracker.sample(true, DAY1 + 10 * MIN), [], "playing start produces no segments yet");
assert.deepEqual(tracker.sample(true, DAY1 + 25 * MIN), [], "a continuing playback does not create a partial record");
assert.deepEqual(tracker.sample(false, DAY1 + 55 * MIN), [{localDate: "2026-09-24", minutes: 45, startedAtMs: DAY1 + 10 * MIN}], "pause writes one full playback session");
assert.equal(tracker.dayTotal("2026-09-24"), 45, "15 + 30 minutes accumulate across intervals");

/* 断档：采样间隔超 3 倍周期（45 分钟），区间丢弃并重新锚定；随后有界段正常累计。 */
assert.deepEqual(tracker.sample(true, DAY1 + 300 * MIN), [], "playing resumes after a long gap (re-anchor only)");
assert.deepEqual(tracker.sample(false, DAY1 + 380 * MIN), [], "80-minute sampling gap exceeds the bound and is discarded");
assert.deepEqual(tracker.sample(true, DAY1 + 385 * MIN), [], "playing re-anchors after the discard");
assert.deepEqual(tracker.sample(false, DAY1 + 390 * MIN), [{localDate: "2026-09-24", minutes: 5, startedAtMs: DAY1 + 385 * MIN}], "after re-anchor only five new minutes are emitted");

/* absent 状态（controller 缺失/抛错）与暂停同义：结段不累计。 */
tracker.sample(true, DAY1 + 400 * MIN);
assert.deepEqual(tracker.sample(false, DAY1 + 430 * MIN), [{localDate: "2026-09-24", minutes: 30, startedAtMs: DAY1 + 400 * MIN}], "newly observed minutes are not cumulative event values");

/* 跨午夜切分：在播期间每 30 分钟一次采样（≤3 倍周期），23:30 起播、次日 00:30 暂停。 */
tracker.sample(true, DAY2 + 23 * 60 * MIN + 30 * MIN);
const midSample = tracker.sample(true, DAY2 + 24 * 60 * MIN);
const split = [...midSample, ...tracker.sample(false, DAY2 + 24 * 60 * MIN + 30 * MIN)];
assert.deepEqual(split, [{localDate: "2026-09-25", minutes: 30, startedAtMs: DAY2 + 23 * 60 * MIN + 30 * MIN}, {localDate: "2026-09-26", minutes: 30, startedAtMs: DAY2 + 23 * 60 * MIN + 30 * MIN}], "midnight span splits per local date");

/* 重载丢弃。 */
tracker.sample(true, DAY2 + 10 * MIN);
tracker.discardInFlight();
assert.equal(tracker.playing, false);
assert.deepEqual(tracker.sample(false, DAY2 + 60 * MIN), [], "discarded in-flight focus must not accumulate");

/* 回归锚（生产节奏）：15 秒采样周期下毫秒累计仍能晋升分钟——
   旧实现按段向下取整，15 秒段永远为 0 分钟，适配器在生产节奏下完全失效。 */
const FAST = 15_000;
const fastTracker = new adapter.SiplayerPlaybackTracker({toLocalDate, nextMidnight, sampleIntervalMs: FAST});
fastTracker.sample(true, DAY1 + 100 * MIN);
let promoted = [];
for (let at = DAY1 + 100 * MIN + FAST; at <= DAY1 + 100 * MIN + 75_000; at += FAST) {
    promoted.push(...fastTracker.sample(true, at));
}
assert.equal(fastTracker.dayTotal("2026-09-24"), 1, "five 15-second samples promote to 1 minute");
assert.deepEqual(promoted, [], "the whole playback session is written only when it ends");
assert.deepEqual(fastTracker.sample(false, DAY1 + 100 * MIN + 90_000), [{localDate: "2026-09-24", minutes: 1, startedAtMs: DAY1 + 100 * MIN}]);
const twoSessions = makeTracker();
twoSessions.sample(true, DAY1 + 10 * MIN);
const first = twoSessions.sample(false, DAY1 + 30 * MIN);
twoSessions.sample(true, DAY1 + 40 * MIN);
const second = twoSessions.sample(false, DAY1 + 55 * MIN);
assert.deepEqual(first.map((segment) => segment.minutes), [20]);
assert.deepEqual(second.map((segment) => segment.minutes), [15]);
const model = require(path.join(outputRoot, "src/model.js"));
const playbackItem = {id: "watch", name: "观看", kind: "duration", target: 30, unit: "分钟", schedule: {type: "daily"}, createdAt: "2026-09-01T00:00:00Z", createdDate: "2026-09-01"};
const playbackEvent = (id, segment) => ({id, itemId: "watch", occurredAt: new Date(DAY1 + 55 * MIN).toISOString(), localDate: segment.localDate, value: segment.minutes, unit: "分钟", source: "siplayer", externalRef: adapter.buildSiplayerExternalRef("watch", segment.localDate, segment.startedAtMs), kind: "checkin"});
const playbackStore = model.appendEvents(model.normalizeStore({version: 3, items: [playbackItem], events: []}), [playbackEvent("play-20", first[0]), playbackEvent("play-15", second[0])]);
assert.deepEqual(playbackStore.events.map((event) => event.value).sort((a, b) => a - b), [15, 20], "two playback sessions create two same-day events");
assert.equal(model.appendEvents(playbackStore, [playbackEvent("replay", first[0])]).events.length, 2, "replaying a playback session is idempotent");
const removedPlayback = model.removeEvents(playbackStore, [playbackStore.events.find((event) => event.id === "play-20")], "2026-09-25T00:00:00Z");
assert.equal(model.appendEvents(removedPlayback, [playbackEvent("resurrect", first[0])]).events.length, 1, "playback tombstone protects only its session");

/* 写入身份与偏好归一。 */
assert.equal(adapter.buildSiplayerExternalRef("watch", "2026-09-24"), "siplayer:watch:2026-09-24");
assert.equal(adapter.buildSiplayerExternalRef("watch", "2026-09-24", DAY1 + 25 * MIN), `siplayer:watch:${DAY1 + 25 * MIN}:2026-09-24`);
assert.equal(adapter.buildSiplayerExternalRef("", "2026-09-24"), "");
assert.equal(adapter.buildSiplayerExternalRef("watch", "bad"), "");
assert.deepEqual(normalizeViewPreferences({}).siplayerIntegration, {enabled: false, itemId: "", thresholdMinutes: 30});
assert.equal(normalizeViewPreferences({siplayerIntegration: {enabled: true, itemId: ""}}).siplayerIntegration.enabled, false);
assert.equal(normalizeViewPreferences({siplayerIntegration: {enabled: true, itemId: "drama", thresholdMinutes: 9999}}).siplayerIntegration.thresholdMinutes, 1440);

/* Distinct starts within one minute remain independent. */
assert.notEqual(adapter.buildSiplayerExternalRef("drama", "2026-09-24", DAY1 + 25 * MIN + 15_000), adapter.buildSiplayerExternalRef("drama", "2026-09-24", DAY1 + 25 * MIN + 40_000));
assert.notEqual(adapter.buildSiplayerExternalRef("drama", "2026-09-24", DAY1 + 25 * MIN), adapter.buildSiplayerExternalRef("drama", "2026-09-24", DAY1 + 26 * MIN));

/* 全套触点断言。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.match(indexSource, /source: "siplayer", externalRef/, "write path stamps the siplayer source");
assert.match(indexSource, /event\.source === "siplayer" && event\.externalRef === externalRef/, "minute write guarded by identity");
const apiSource = fs.readFileSync(path.join(__dirname, "..", "src/api.ts"), "utf8");
assert.match(apiSource, /input\.source === "siplayer" \|\| input\.source === "weread" \|\| input\.source === "yeguif" \? \{source: "api"/, "facade must strip siplayer/weread/yeguif from external input");
const ecosystemSource = fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8");
assert.match(ecosystemSource, /prefix: "siplayer", label: "SiPlayer"/, "siplayer prefix registered");
const modelSource = fs.readFileSync(path.join(__dirname, "..", "src/model.ts"), "utf8");
assert.match(modelSource, /value\.source === "siplayer"/, "normalization accepts siplayer");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
for (const hook of ["data-siplayer-integration", "data-siplayer-toggle", "data-siplayer-item"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}
assert.match(settingsSource, /siplayerControllerAvailable/, "settings context must expose the host capability state");
assert.match(settingsSource, /data-siplayer-host-state/, "settings markup must show the host capability state separately from local enablement");
assert.match(indexSource, /detectSiplayerController\(window\)/, "settings render must probe the public SiPlayer controller");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["set.siplayerTitle", "set.siplayerHint", "set.siplayerToggle", "set.siplayerItem", "set.siplayerItemHint", "set.siplayerItemChoose", "set.siplayerThreshold", "set.siplayerThresholdHint", "set.siplayerSave", "set.siplayerHostAvailable", "set.siplayerHostMissing", "set.siplayerHostUnknown", "msg.siplayerNeedItem", "msg.siplayerSaved", "source.siplayer"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}

console.log("siplayer adapter gates passed: sampler states, bounded gaps, discard, midnight split, identity, preferences, settlement composition, full touchpoints, anti-spoof, registry, i18n parity");
