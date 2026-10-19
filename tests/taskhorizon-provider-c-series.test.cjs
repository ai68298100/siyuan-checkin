const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

/* Task Horizon 提供端协议缺口 C-01、C-02、C-03 守门测试（D-375）。
   C-01: 远端 Store 合并使本地产生真实变化后广播 analytics-updated，无变化零次，卸载不广播；
   C-02: 全局 CustomEvent "checkin:api-state-changed"（loading/ready/failed/unavailable），
         isReady/whenReady 复验自身全局实例与未卸载状态；
   C-03: 日历投影每个 point 增补 scheduleType，顶层增补本地 asOfDate。 */

const sourceRoot = path.join(__dirname, "..", "src");
const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), "siyuan-checkin-c-series-"));

for (const filename of [
    "date-keys.ts",
    "model.ts",
    "record-step.ts",
    "quota.ts",
    "rules.ts",
    "features/calendar-projection.ts",
]) {
    const source = fs.readFileSync(path.join(sourceRoot, filename), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
    }).outputText;
    const destination = path.join(outputRoot, filename.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, output, "utf8");
}

const {buildCalendarProjection} = require(path.join(outputRoot, "features", "calendar-projection.js"));

/* ====== 断言 C-01：远端 Store 合并广播与卸载保护 ====== */
const indexSource = fs.readFileSync(path.join(sourceRoot, "index.ts"), "utf8");

assert.match(
    indexSource,
    /refreshed && !this\.disposed && !this\.disposing[\s\S]*?analytics-updated/,
    "C-01: enqueueMutation finally broadcasts analytics-updated only when store refreshed and not disposed",
);

/* ====== 断言 C-02：API 生命周期全局事件与 isReady 增强 ====== */
assert.match(
    indexSource,
    /checkin:api-state-changed/,
    "C-02: index.ts dispatches checkin:api-state-changed custom event",
);
assert.match(indexSource, /notifyApiStateChanged\("loading"\)/, "C-02: dispatches loading state");
assert.match(indexSource, /notifyApiStateChanged\("ready"\)/, "C-02: dispatches ready state");
assert.match(indexSource, /notifyApiStateChanged\("failed"\)/, "C-02: dispatches failed state");
assert.match(indexSource, /notifyApiStateChanged\("unavailable"\)/, "C-02: dispatches unavailable state");

const apiSource = fs.readFileSync(path.join(sourceRoot, "api.ts"), "utf8");
assert.match(
    apiSource,
    /isReady: \(\) =>[\s\S]*?siyuanCheckin[\s\S]*?=== api/,
    "C-02: isReady ensures the instance is still the active global window.siyuanCheckin",
);
assert.match(
    apiSource,
    /whenReady: \(\) =>[\s\S]*?siyuanCheckin[\s\S]*?=== api/,
    "C-02: whenReady ensures the instance is still the active global window.siyuanCheckin",
);

/* ====== 断言 C-03：日历投影 point 增补 scheduleType，顶层增补 asOfDate ====== */
const testStore = {
    version: 3,
    profile: {name: "Test", avatar: "", bio: ""},
    items: [
        {
            id: "daily-item",
            name: "每日晨读",
            icon: "📖",
            kind: "duration",
            target: 30,
            unit: "分钟",
            direction: "atLeast",
            schedule: {type: "daily"},
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
            createdDate: "2026-10-01",
            revisions: [{
                effectiveDate: "2026-10-01",
                kind: "duration",
                target: 30,
                unit: "分钟",
                direction: "atLeast",
                schedule: {type: "daily"},
            }],
            archivePeriods: [],
            taskHorizonCalendarVisible: true,
        },
        {
            id: "quota-item",
            name: "游泳",
            icon: "🏊",
            kind: "binary",
            target: 1,
            unit: "次",
            direction: "atLeast",
            schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}},
            createdAt: "2026-10-01T00:00:00.000Z",
            updatedAt: "2026-10-01T00:00:00.000Z",
            createdDate: "2026-10-01",
            revisions: [{
                effectiveDate: "2026-10-01",
                kind: "binary",
                target: 1,
                unit: "次",
                direction: "atLeast",
                schedule: {type: "quota", quota: {period: "week", amount: 3, countMode: "dates"}},
            }],
            archivePeriods: [],
            taskHorizonCalendarVisible: true,
        },
    ],
    events: [
        {
            id: "ev1",
            itemId: "quota-item",
            value: 1,
            unit: "次",
            localDate: "2026-10-15",
            occurredAt: "2026-10-15T10:00:00.000Z",
            source: "manual",
        },
    ],
    eventTombstones: [],
};

const projection = buildCalendarProjection(testStore, {startDate: "2026-10-15", endDateExclusive: "2026-10-17"});

// 顶层 asOfDate 存在且格式符合 YYYY-MM-DD
assert.ok(typeof projection.asOfDate === "string", "projection carries asOfDate");
assert.match(projection.asOfDate, /^\d{4}-\d{2}-\d{2}$/, "asOfDate is a valid date key");

// 查找每日项目
const dailyProj = projection.items.find((item) => item.itemId === "daily-item");
assert.ok(dailyProj, "daily item projected");
assert.equal(dailyProj.points[0].scheduleType, "daily", "daily point has scheduleType: daily");

// 查找配额项目贡献日
const quotaProj = projection.items.find((item) => item.itemId === "quota-item");
assert.ok(quotaProj, "quota item projected");
const quotaPoint = quotaProj.points.find((p) => p.date === "2026-10-15");
assert.ok(quotaPoint, "quota contribution point exists");
assert.equal(quotaPoint.scheduleType, "quota", "quota point has scheduleType: quota");
assert.equal(quotaPoint.status, "complete", "quota contribution day status is complete");

console.log("taskhorizon-provider-c-series: all assertions passed");
