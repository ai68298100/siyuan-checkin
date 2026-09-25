/* T-1402 微信读书适配器守门：网关请求信封（扁平 api_name/skill_version）、
   响应解析容错与 fail-closed（errcode/upgrade_info/data 解包/数组行/别名/unix 日期/
   对象映射/未来日丢弃/封顶 62）、写入身份、偏好归一（Key 门控）、结算组合幂等、
   privacy 控制面、source 枚举全套触点、防伪造、注册表、设置结构、i18n 双语。 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lc-weread-"));
const transpile = (relative) => {
    const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
    const target = path.join(outputRoot, relative.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText);
};
["src/i18n.ts", "src/types.ts", "src/ecosystem.ts", "src/api-contract.ts", "src/rules.ts", "src/model.ts", "src/shared.ts", "src/record-step.ts", "src/lunar.ts", "src/catalog.ts", "src/quota.ts", "src/features/reminder-preferences.ts", "src/features/first-success.ts", "src/date-keys.ts", "src/features/view-scope.ts", "src/view-preferences.ts", "src/features/note-anchor.ts", "src/features/summary-resident.ts", "src/features/source-framework.ts", "src/features/sireader-adapter.ts", "src/features/health-inbox.ts", "src/features/siplayer-adapter.ts", "src/features/weread-adapter.ts", "src/features/privacy-scope.ts"].forEach(transpile);
const adapter = require(path.join(outputRoot, "src/features/weread-adapter.js"));
const {normalizeViewPreferences} = require(path.join(outputRoot, "src/view-preferences.js"));
const {normalizeSourceGovernance, settleSegmentsToDays} = require(path.join(outputRoot, "src/features/source-framework.js"));
const {parseExternalRef} = require(path.join(outputRoot, "src/ecosystem.js"));
const {summarizePrivacyControlPlane} = require(path.join(outputRoot, "src/features/privacy-scope.js"));

/* 网关请求信封：扁平 api_name + skill_version + mode 同层，无 params 包裹。 */
assert.equal(adapter.WEREAD_SKILL_VERSION, "1.0.4", "skill_version pinned to official SKILL.md version");
assert.deepEqual(adapter.buildWereadReadDetailRequest(), {api_name: "/readdata/detail", skill_version: "1.0.4", mode: "monthly"}, "default request is the flat gateway envelope with monthly mode");
assert.deepEqual(adapter.buildWereadReadDetailRequest(" 1.0.6 "), {api_name: "/readdata/detail", skill_version: "1.0.6", mode: "monthly"}, "skill version trimmed");
assert.equal(adapter.WEREAD_GATEWAY_URL, "https://i.weread.qq.com/api/agent/gateway", "official gateway endpoint");

/* 响应解析：非对象/错误码/升级提示。 */
assert.equal(adapter.ingestWereadReadDetail(null).ok, false, "non-object payload fails closed");
assert.equal(adapter.ingestWereadReadDetail([1, 2]).ok, false, "array payload fails closed");
const errOutcome = adapter.ingestWereadReadDetail({errcode: -2010, errmsg: "auth"});
assert.equal(errOutcome.ok, false, "non-zero errcode fails");
assert.match(errOutcome.message, /-2010/, "errcode surfaced for user-visible failure");
assert.match(errOutcome.message, /auth/, "errmsg surfaced");
const upgradeOutcome = adapter.ingestWereadReadDetail({errcode: 0, upgrade_info: {message: "please upgrade skill"}, data: {dailyReadTimes: []}});
assert.equal(upgradeOutcome.upgrade, "please upgrade skill", "official upgrade hint relayed verbatim");

/* 每日明细：数组行 + 秒 → 分钟向下取整 + 别名 + data 解包。 */
const readDetail = adapter.ingestWereadReadDetail({
    errcode: 0,
    data: {totalReadTime: 7200, readDays: 2, dailyReadTimes: [
        {readDate: "2026-09-23", readTime: 3600},
        {date: "2026-09-24", time: 1500},
        {day: "2026-09-22", duration: 61},
    ]},
}, {today: "2026-09-24"});
assert.ok(readDetail.ok, "documented shape parses");
assert.deepEqual(readDetail.days, [
    {localDate: "2026-09-22", minutes: 1},
    {localDate: "2026-09-23", minutes: 60},
    {localDate: "2026-09-24", minutes: 25},
], "seconds floored to minutes, aliases accepted, dates sorted");

/* 官方契约主用例（readdata.md）：readTimes 月度日桶，key=分桶起始 unix 秒字符串。
   unix 秒日期：换算器注入才可用；缺失换算器时该行丢弃（fail-closed）。 */
const unixParser = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
const officialMonthly = adapter.ingestWereadReadDetail({
    errcode: 0,
    baseTime: 1789000000,
    totalReadTime: 5100,
    readDays: 2,
    readTimes: {"1790179200": 3600, "1790265600": 1500},
}, {toLocalDateFromUnix: unixParser, today: "2026-09-24"});
assert.ok(officialMonthly.ok, "official monthly payload parses");
assert.deepEqual(officialMonthly.days, [
    {localDate: "2026-09-23", minutes: 60},
    {localDate: "2026-09-24", minutes: 25},
], "readTimes day buckets resolved via unix keys");
const withoutConverter = adapter.ingestWereadReadDetail({readTimes: {"1790179200": 3600}}, {});
assert.deepEqual(withoutConverter.days, [], "unix keys without converter dropped");
/* 年度模式日明细 dailyReadTimes（key 同为 unix 秒）与 readTimes 合并去重取最大。 */
const annual = adapter.ingestWereadReadDetail({
    readTimes: {"1790179200": 3600},
    dailyReadTimes: {"1790179200": 4200, "1790265600": 60},
}, {toLocalDateFromUnix: unixParser, today: "2026-09-24"});
assert.deepEqual(annual.days, [
    {localDate: "2026-09-23", minutes: 70},
    {localDate: "2026-09-24", minutes: 1},
], "day detail from both fields merges with max");
/* 月/年大桶防误读：单桶超过 24h 直接丢弃。 */
const oversized = adapter.ingestWereadReadDetail({readTimes: {"1790179200": 90000}}, {toLocalDateFromUnix: unixParser});
assert.deepEqual(oversized.days, [], "bucket exceeding one day is dropped, never misread as daily minutes");
const unixOutcome = adapter.ingestWereadReadDetail({dailyReadTimes: [{readDate: 1790179200, readTime: 120}, {readDate: 1790265600, readTime: 60}]}, {toLocalDateFromUnix: unixParser, today: "2026-09-24"});
assert.deepEqual(unixOutcome.days, [{localDate: "2026-09-23", minutes: 2}, {localDate: "2026-09-24", minutes: 1}], "unix-second dates converted via injected converter");
assert.deepEqual(adapter.ingestWereadReadDetail({dailyReadTimes: [{readDate: 1790179200, readTime: 120}]}, {}).days, [], "unix dates without converter dropped");

/* 对象映射；非法行（坏日期/非正秒数）丢弃；未来日相对注入的 today 丢弃；同日取最大；封顶 62。 */
const mapOutcome = adapter.ingestWereadReadDetail({dailyReadTimes: {"2026-09-23": 600, "bad": 60, "2026-09-24": 0, "2026-09-25": 3600, "2026-09-22": -5}}, {today: "2026-09-24"});
assert.deepEqual(mapOutcome.days, [{localDate: "2026-09-23", minutes: 10}], "object map accepted, invalid and future rows dropped");
const dedupeOutcome = adapter.ingestWereadReadDetail({dailyReadTimes: [{readDate: "2026-09-23", readTime: 60}, {readDate: "2026-09-23", readTime: 600}]}, {today: "2026-09-24"});
assert.deepEqual(dedupeOutcome.days, [{localDate: "2026-09-23", minutes: 10}], "same-day duplicates keep the max");
const capped = adapter.ingestWereadReadDetail({dailyReadTimes: Array.from({length: 100}, (_, i) => ({readDate: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), readTime: 60 + i}))}, {});
assert.equal(capped.days.length, 62, "daily rows capped at 62");
assert.deepEqual(adapter.ingestWereadReadDetail({totalReadTime: 0}).days, [], "summary-only payload parses as empty");

/* 写入身份与偏好归一（Key 缺失不物化；阈值钳制；Key 去空白；完读绑定可选）。 */
assert.equal(adapter.buildWereadExternalRef("read", "2026-09-24"), "weread:read:2026-09-24");
assert.equal(adapter.buildWereadExternalRef("", "2026-09-24"), "");
assert.equal(adapter.buildWereadExternalRef("read", "09-24"), "");
assert.deepEqual(normalizeViewPreferences({}).wereadIntegration, {enabled: false, itemId: "", thresholdMinutes: 30, apiKey: "", finishItemId: "", notesItemId: ""});
assert.equal(normalizeViewPreferences({wereadIntegration: {enabled: true, itemId: "read"}}).wereadIntegration.enabled, false, "enabled without key stays off");
assert.equal(normalizeViewPreferences({wereadIntegration: {enabled: true, itemId: "read", apiKey: " wrk-x "}}).wereadIntegration.enabled, true, "enabled with item and trimmed key");
assert.equal(normalizeViewPreferences({wereadIntegration: {enabled: true, itemId: "read", apiKey: "wrk-x", thresholdMinutes: 9999}}).wereadIntegration.thresholdMinutes, 1440);
assert.equal(normalizeViewPreferences({wereadIntegration: {enabled: true, itemId: "read", apiKey: "wrk-x", thresholdMinutes: 0.4}}).wereadIntegration.thresholdMinutes, 1);
assert.equal(normalizeViewPreferences({wereadIntegration: {itemId: "read", apiKey: "wrk-x", finishItemId: " books "}}).wereadIntegration.finishItemId, "books", "finish binding trimmed; empty stays off");
assert.equal(normalizeViewPreferences({wereadIntegration: {itemId: "read", apiKey: "wrk-x", notesItemId: " lines "}}).wereadIntegration.notesItemId, "lines", "notes binding trimmed; empty stays off");

/* —— T-1402 第三批次：划线计数 —— */
/* 请求体：notebooks 游标分页（官方明令禁止 offset/limit），bookmarklist 按 bookId。 */
assert.deepEqual(adapter.buildWereadNotebooksRequest(100), {api_name: "/user/notebooks", skill_version: "1.0.4", count: 100}, "notebooks first page is flat");
assert.deepEqual(adapter.buildWereadNotebooksRequest(100, 1778312777), {api_name: "/user/notebooks", skill_version: "1.0.4", count: 100, lastSort: 1778312777}, "cursor pagination uses lastSort");
assert.deepEqual(adapter.buildWereadNotebooksRequest(999), {api_name: "/user/notebooks", skill_version: "1.0.4", count: 100}, "count clamped to official page bounds");
assert.deepEqual(adapter.buildWereadBookmarkListRequest(" bk9 "), {api_name: "/book/bookmarklist", skill_version: "1.0.4", bookId: "bk9"}, "bookmarklist request carries trimmed bookId");

/* 概览解析：bookId+sort 双校验；hasMore=1 才翻页；errcode 失败 closed。 */
const notebookPage = adapter.parseWereadNotebookPage({
    totalBookCount: 3, totalNoteCount: 9, hasMore: 1,
    books: [
        {bookId: "bk1", sort: 1790179200, reviewCount: 1, noteCount: 2, bookmarkCount: 0},
        {bookId: "bk2", sort: 0},
        {sort: 1790179200},
        "garbage",
    ],
});
assert.deepEqual(notebookPage.books, [{bookId: "bk1", recentSort: 1790179200}], "only valid entries kept");
assert.equal(notebookPage.hasMore, true, "hasMore=1 signals more pages");
assert.deepEqual(adapter.parseWereadNotebookPage({errcode: -1}), {books: [], hasMore: false}, "gateway error fails closed");
assert.deepEqual(adapter.parseWereadNotebookPage(null).books, [], "null payload fails closed");

/* 划线按日统计：createTime（unix 秒）落到本地日；未来日丢弃；errcode closed。 */
const unixParser3 = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
const tally = adapter.parseWereadHighlightTally({
    updated: [
        {bookmarkId: "m1", createTime: 1790179200},
        {bookmarkId: "m2", createTime: 1790179200},
        {bookmarkId: "m3", createTime: 1790092800},
        {bookmarkId: "m4", createTime: 1790352000},
        {createTime: 1790179200},
        "garbage",
    ],
}, {toLocalDateFromUnix: unixParser3, today: "2026-09-24"});
assert.equal(tally.byDate.get("2026-09-23"), 3, "same-day highlights accumulate");
assert.equal(tally.byDate.get("2026-09-22"), 1, "previous day counted separately");
assert.equal(tally.byDate.get("2026-09-25"), undefined, "future day dropped");
assert.deepEqual(adapter.parseWereadHighlightTally({errcode: -1}, {toLocalDateFromUnix: unixParser3}).byDate.size, 0, "gateway error fails closed");

/* 划线计数身份。 */
assert.equal(adapter.buildWereadNotesRef("lines", "2026-09-23"), "weread:lines:notes:2026-09-23");
assert.deepEqual(parseExternalRef(adapter.buildWereadNotesRef("lines", "2026-09-23")), {prefix: "weread", identity: "lines:notes", date: "2026-09-23"}, "notes ref parses against the registry");

/* —— T-1402 收尾：想法/点评计数（/review/list/mine，官方字段 bookid 全小写）。 —— */
assert.deepEqual(adapter.buildWereadReviewListRequest(" bk7 ", undefined, 50), {api_name: "/review/list/mine", skill_version: "1.0.4", bookid: "bk7", count: 50}, "review list request uses official bookid field");
assert.deepEqual(adapter.buildWereadReviewListRequest("bk7", 88, 50), {api_name: "/review/list/mine", skill_version: "1.0.4", bookid: "bk7", count: 50, synckey: 88}, "cursor pagination via synckey");
assert.deepEqual(adapter.buildWereadReviewListRequest(""), {}, "empty bookId produces no request");
const reviewTally = adapter.parseWereadReviewTally({
    totalCount: 3, hasMore: 1, synckey: 42,
    reviews: [
        {review: {reviewId: "r1", createTime: 1790179200}},
        {review: {reviewId: "r2", createTime: 1790092800}},
        {review: {reviewId: "r3", createTime: 1790352000}},
        {review: {}},
        "garbage",
    ],
}, {toLocalDateFromUnix: unixParser3, today: "2026-09-24"});
assert.equal(reviewTally.byDate.get("2026-09-23"), 1, "same-day review counted");
assert.equal(reviewTally.byDate.get("2026-09-22"), 1, "previous day counted separately");
assert.equal(reviewTally.byDate.get("2026-09-25"), undefined, "future day dropped");
assert.equal(reviewTally.hasMore, true, "hasMore relayed for cursor pagination");
assert.equal(reviewTally.nextSynckey, 42, "next cursor relayed");
assert.deepEqual(adapter.parseWereadReviewTally({errcode: -1}, {toLocalDateFromUnix: unixParser3}).byDate.size, 0, "gateway error fails closed");

/* —— T-1402 第二批次：完读事件 —— */
/* 请求体：书架与进度接口均为扁平信封。 */
assert.deepEqual(adapter.buildWereadShelfRequest(), {api_name: "/shelf/sync", skill_version: "1.0.4"}, "shelf request is flat");
assert.deepEqual(adapter.buildWereadBookProgressRequest(" bk1 "), {api_name: "/book/getprogress", skill_version: "1.0.4", bookId: "bk1"}, "progress request carries trimmed bookId");
assert.deepEqual(adapter.buildWereadBookProgressRequest(""), {}, "empty bookId produces no request");

/* 书架解析：只取 finishReading===1 的电子书；albums 系列完结不纳入；封顶 200。 */
const shelfBooks = adapter.parseWereadFinishedBooks({
    books: [
        {bookId: "bk1", title: "三体", finishReading: 1},
        {bookId: "bk2", title: "未读完", finishReading: 0},
        {bookId: "bk3", finishReading: 1},
        {title: "无ID", finishReading: 1},
        {bookId: "bk4", title: "隐私书", finishReading: 1, secret: 1},
        "garbage",
    ],
    albums: [{albumInfo: {albumId: "al1", finish: 1, finishStatus: "已完结"}}],
});
assert.deepEqual(shelfBooks, [
    {bookId: "bk1", title: "三体"},
    {bookId: "bk4", title: "隐私书"},
], "only finished e-books with id+title; secret kept; albums never counted");
assert.deepEqual(adapter.parseWereadFinishedBooks(null), [], "null shelf fails closed");

/* 进度核实：只有 progress=100 且带合法 finishTime 才算读完；未来日丢弃。 */
const unixParser2 = (seconds) => new Date(seconds * 1000).toISOString().slice(0, 10);
assert.deepEqual(adapter.parseWereadBookProgress({book: {progress: 100, finishTime: 1790179200}}, {toLocalDateFromUnix: unixParser2, today: "2026-09-24"}), {finished: true, localDate: "2026-09-23"}, "progress 100 with finishTime reads as finished");
assert.equal(adapter.parseWereadBookProgress({book: {progress: 99, finishTime: 1790179200}}, {toLocalDateFromUnix: unixParser2}).finished, false, "progress 99 is not finished (official rule)");
assert.equal(adapter.parseWereadBookProgress({book: {progress: 100}}, {toLocalDateFromUnix: unixParser2}).finished, false, "missing finishTime fails closed");
assert.equal(adapter.parseWereadBookProgress({book: {progress: 100, finishTime: 1790352000}}, {toLocalDateFromUnix: unixParser2, today: "2026-09-24"}).finished, false, "future finish date dropped");
assert.equal(adapter.parseWereadBookProgress({errcode: -1}, {toLocalDateFromUnix: unixParser2}).finished, false, "gateway error fails closed");

/* 完读身份：identity 含冒号，与 parseExternalRef 首尾切分兼容。 */
assert.equal(adapter.buildWereadFinishRef("books", "bk1", "2026-09-23"), "weread:books:finish:bk1:2026-09-23");
assert.deepEqual(parseExternalRef(adapter.buildWereadFinishRef("books", "bk1", "2026-09-23")), {prefix: "weread", identity: "books:finish:bk1", date: "2026-09-23"}, "finish ref parses against the registry");
assert.equal(adapter.wereadFinishRefPrefix("books", "bk1"), "weread:books:finish:bk1:", "existence-check prefix per book");

/* 结算组合：当日累计分钟过阈值才算资格日 + 幂等门槛（与宿主 ingestWeread 同逻辑）。 */
const governance = normalizeSourceGovernance({enabled: true, thresholdValue: 30, itemIds: ["read"]});
const refFor = (localDate) => adapter.buildWereadExternalRef("read", localDate);
const written = new Set([refFor("2026-09-23")]);
const settlement = settleSegmentsToDays(
    [{localDate: "2026-09-23", value: 45}, {localDate: "2026-09-24", value: 12}].map((day) => ({externalRef: refFor(day.localDate), ...day})),
    governance,
    [...written],
);
const writable = settlement.days.filter((day) => day.qualifies && !written.has(refFor(day.localDate)));
assert.deepEqual(writable.map((day) => day.localDate), [], "below-threshold and already-written days are not writable");

/* privacy 控制面：weread 通道可见，遥测常量不变。 */
const controlPlane = summarizePrivacyControlPlane({wereadIntegration: {enabled: true}});
assert.deepEqual(controlPlane.entries.filter((entry) => entry.channel === "weread"), [{channel: "weread", kind: "external-source", enabled: true}], "weread listed in the privacy control plane");
assert.equal(controlPlane.telemetry, "none");

/* 全套触点断言。 */
const indexSource = fs.readFileSync(path.join(__dirname, "..", "src/index.ts"), "utf8");
assert.match(indexSource, /source: "weread", externalRef/, "write path stamps the weread source");
assert.match(indexSource, /event\.source === "weread" && event\.externalRef === ref/, "daily write guarded by identity");
assert.match(indexSource, /tombstone\.source === "weread"/, "tombstoned days never rewritten");
assert.match(indexSource, /\/api\/network\/forwardProxy/, "outbound pull goes through the kernel forward proxy");
assert.match(indexSource, /WEREAD_GATEWAY_URL/, "gateway URL from the adapter module");
assert.match(indexSource, /\/api\/network\/forwardProxy[\s\S]{0,400}WEREAD_GATEWAY_URL/, "all weread pulls share the forwardProxy channel");
assert.match(indexSource, /buildWereadShelfRequest\(\)/, "finished-book ingest pulls the shelf");
assert.match(indexSource, /buildWereadBookProgressRequest\(/, "finish verified via getprogress");
assert.match(indexSource, /wereadFinishRefPrefix\(/, "per-book existence check before writing");
assert.match(indexSource, /tombstone\.externalRef\.startsWith\(prefix\)/, "tombstoned books never rewritten");
assert.match(indexSource, /buildWereadNotebooksRequest\(/, "notes ingest pages the notebook overview");
assert.match(indexSource, /buildWereadBookmarkListRequest\(/, "highlight tally pulls per-book bookmarklist");
assert.match(indexSource, /buildWereadNotesRef\(/, "daily notes identity");
assert.match(indexSource, /buildWereadReviewListRequest\(/, "ideas/reviews tallied via review list");
assert.match(indexSource, /parseWereadReviewTally\(/, "review tally parser wired");
assert.match(indexSource, /"sireader", "siplayer", "weread"/, "report scope validation covers weread");
const apiSource = fs.readFileSync(path.join(__dirname, "..", "src/api.ts"), "utf8");
assert.match(apiSource, /input\.source === "weread" \|\| input\.source === "yeguif" \? \{source: "api"/, "facade must strip weread (and yeguif) from external input");
const ecosystemSource = fs.readFileSync(path.join(__dirname, "..", "src/ecosystem.ts"), "utf8");
assert.match(ecosystemSource, /prefix: "weread", label: "WeRead"/, "weread prefix registered");
const modelSource = fs.readFileSync(path.join(__dirname, "..", "src/model.ts"), "utf8");
assert.match(modelSource, /value\.source === "weread"/, "normalization accepts weread");
const settingsSource = fs.readFileSync(path.join(__dirname, "..", "src/render/settings.ts"), "utf8");
for (const hook of ["data-weread-integration", "data-weread-toggle", "data-weread-item", "data-weread-finish-item", "data-weread-notes-item", "data-weread-key", "data-weread-threshold", "save-weread", "weread-pull"]) {
    assert.ok(settingsSource.includes(hook), `settings markup must include ${hook}`);
}
assert.ok(!settingsSource.includes("apiKey"), "settings render must never embed the raw key");
const reviewSource = fs.readFileSync(path.join(__dirname, "..", "src/render/review.ts"), "utf8");
assert.match(reviewSource, /\["weread", "source\.weread"\]/, "review report source filter offers weread");
const typesSource = fs.readFileSync(path.join(__dirname, "..", "src/types.ts"), "utf8");
assert.match(typesSource, /"siplayer" \| "weread"/, "event source union includes weread");
const frameworkSource = fs.readFileSync(path.join(__dirname, "..", "src/features/source-framework.ts"), "utf8");
assert.match(frameworkSource, /"official-pull"/, "source channel enum extended with official-pull");
const privacySource = fs.readFileSync(path.join(__dirname, "..", "src/features/privacy-scope.ts"), "utf8");
assert.match(privacySource, /external\("weread", source\.wereadIntegration\)/, "privacy control plane wired");
const i18nSource = fs.readFileSync(path.join(__dirname, "..", "src/i18n.ts"), "utf8");
for (const key of ["source.weread", "set.wereadIntegration", "set.wereadTitle", "set.wereadHint", "set.wereadToday", "set.wereadToggle", "set.wereadItem", "set.wereadItemHint", "set.wereadItemChoose", "set.wereadFinishItem", "set.wereadFinishItemHint", "set.wereadFinishItemChoose", "set.wereadNotesItem", "set.wereadNotesItemHint", "set.wereadNotesItemChoose", "set.wereadKey", "set.wereadKeyHint", "set.wereadKeySaved", "set.wereadClearKey", "set.wereadThreshold", "set.wereadThresholdHint", "set.wereadSave", "set.wereadPull", "set.wereadPullIdle", "set.wereadPullOk", "set.wereadPullFail", "msg.wereadNeedConfig", "msg.wereadSaved", "msg.wereadClearKeyConfirm", "msg.wereadClearKeyDone", "msg.wereadPullDone", "msg.wereadPullFail"]) {
    assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both zh and en`);
}
assert.match(indexSource, /data-action='clear-weread-key'|data-action="clear-weread-key"/, "WeRead settings must wire the local Key clear action");

console.log("weread adapter gates passed: gateway envelope, tolerant parsing, identity, key governance, settlement composition, privacy plane, full touchpoints, anti-spoof, registry, settings structure, i18n parity");
