# 小驴打卡公开 API v5 参考（稳定文档）

> 状态：**稳定**。本文是 `window.siyuanCheckin` 公开 API 的正式参考；`api-v5-design.md` 保留为设计过程记录，冲突处以本文为准。
> 机器可读契约清单：[contracts/checkin-api-v5.json](contracts/checkin-api-v5.json)，由 `tests/api-v5-docs.test.cjs` 与 `src/api-contract.ts` 交叉核对——三者不一致时以源码为准并视为文档缺陷。
> 本次文档核对版本：v18.17.6（拟发布，尚未发布）。既有 API v5 稳定面与 Task Horizon 合作专项就绪状态分开记录；当前没有 `integrationContracts` 合作就绪声明。

## 1. 版本与语义

| 项 | 值 | 说明 |
| --- | --- | --- |
| 全局对象 | `window.siyuanCheckin` | 名称不变 |
| 协议标识 | `siyuan-checkin`（`CHECKIN_API_PROTOCOL`） | 不变 |
| API 版本 | `5`（`CHECKIN_API_VERSION`） | v4 能力面冻结兼容，只增不删不改签名 |
| `storeVersion` | `2` | **公共契约版本**。与内部 `CheckinStore` 存储版本（当前 v3）是两个编号：公共 descriptor 的 `storeVersion` 只表示对外契约演化，与用户数据内部迁移无关。任一数字调整必须先补决策记录、迁移说明与契约测试，第三方不得把私有存储版本当作公开 API 版本 |

兼容承诺：新增能力一律走「能力协商 + 只增不删」；v4 消费方在 v5 宿主上无需改动。弃用周期（预告字段、移除窗口）自 v5 起承诺为：能力移除前**至少一个完整大版本**在 `describe()` 中以废弃标记预告，且期间行为不变。

## 2. 接入流程

```js
const checkin = window.siyuanCheckin;
if (!checkin || checkin.protocol !== "siyuan-checkin") return; // 1. 探测
await checkin.whenReady();                                      // 2. 就绪（数据加载完成）
if (!checkin.hasCapability("events.record")) return;            // 3. 能力协商
// 4. 调用；能力不存在时保留你自己的离线流程
```

- `isReady()` / `whenReady()`：就绪探测；`whenReady` 在未就绪时返回 Promise，就绪后立即 resolve。
- `describe()`：返回 `{name, protocol, version, storeVersion, capabilities, capabilitiesSince, events}` 快照（全部冻结）。
- `getCapabilityInfo(name?)`：返回每项能力的 `{available, localOnly, effect}`。**写能力（`effect: "write"`）必须在用户明确要求后调用**；`localOnly: true` 表示数据不出本机。
- `capabilitiesSince`：每项能力首次出现的协议版本，供 v4 消费方在 v5 宿主上探测「这条能力在我的版本里有没有」。
- `describe().deprecated`：已宣布弃用的能力数组（当前为空）。弃用流程：进入该数组 ≥ 一个大版本 → 提供迁移说明 → 下一大版本才可移除；期间行为与签名保持不变。

## 3. 能力清单（20 项）

| 能力 | 自版本 | effect | localOnly | 主要方法 |
| --- | --- | --- | --- | --- |
| `items.read` | 4 | read | 是 | `getItems()` |
| `items.query` | 5 | read | 是 | `queryItems(options?)` |
| `events.read` | 4 | read | 是 | `getEvents()` |
| `events.range.read` | 5 | read | 是 | `getEventsInRange(range, options?)` |
| `events.record` | 4 | write | 是 | `recordEvent(input)` |
| `events.record.batch` | 5 | write | 是 | `recordEventsBatch(inputs)` |
| `occasions.read` | 4 | read | 是 | `getOccasions()` / `getTodayOccasions()` |
| `occasions.complete` | 4 | write | 是 | `completeOccasion(id, occurrenceDate, completed)` |
| `summary.read` | 4 | read | 是 | `getSummary()` |
| `summary.custom` | 4 | read | 是 | `getCustomSummary(range)` |
| `analytics.read` | 4 | read | 是 | `getAnalyticsSnapshot()` / `getAnalyticsSummary()` / `getStrengthSummary(options?)` |
| `metrics.read` | 5 | read | 是 | `getStreaks(itemIds?)` |
| `diagnostics.read` | 5 | read | 是 | `getDiagnostics()` |
| `summary.providers` | 4 | register | **否** | `registerSummaryProvider(provider)` |
| `suggestions.read` | 4 | read | 是 | `getSuggestionWorkflow()` / `getSuggestionWorkflowSummary()` |
| `focus.adapters` | 4 | register | 是 | `registerFocusAdapter(adapter)` |
| `integrations.events` | 4 | read | 是 | 事件订阅（见 §7） |
| `export.json` | 4 | export | 是 | JSON 备份导出 |
| `export.csv` | 4 | export | 是 | CSV 记录导出 |
| `calendar.read` | 5 | read | 是 | `getCalendarProjection(range)` |

返回值一律为**受校验的防御性副本**（冻结/克隆），外部修改不会影响插件内部状态，也不得依赖内部对象引用。

## 4. v5 能力详细签名

### items.query → `queryItems(options?)`

```ts
queryItems(options?: {
    includeArchived?: boolean;   // 默认 false（等价 getItems）
    archivedOnly?: boolean;      // 互斥；true 时仅归档
    kinds?: CheckinKind[];       // binary/count/duration/quantity/custom
    limit?: number;              // 默认 200，上限 1000
}): CheckinItem[];
```

消除 `getItems`/`getArchivedItems` 二分。`archivedOnly` 与 `includeArchived` 同时提供时以 `archivedOnly` 优先（文档声明，避免布尔陷阱）。

### events.range.read → `getEventsInRange(range, options?)`

```ts
getEventsInRange(
    range: {startDate: string; endDateExclusive: string},   // 半开区间 [start, end)，本地日期 YYYY-MM-DD
    options?: {
        itemIds?: string[];        // ≤ 200 个
        source?: CheckinEvent["source"];  // 八种持久化来源之一：manual / tomato / import / api / sireader / siplayer / weread / yeguif（T-1631：读取可过滤全部来源；写入仍仅接受 "api"）
        includeSkips?: boolean;    // 默认 true；false 排除 kind==="skip"
        limit?: number;            // 默认 1000，上限 5000
    }
): {events: CheckinEvent[]; truncated: boolean};
```

`truncated === true` 表示达到 limit 被截断，调用方应缩小区间或提高过滤精度，而不是假设拿到了全量。该读取方法接受任意合法的本地日期半开区间；`limit`（默认 1000、上限 5000）是事件返回的硬边界。366 天上限仅适用于 `getEventRangeSummary`、`getCalendarProjection` 等按日点位投影，不套用到此事件明细读取，避免把跨年查询误读为“空结果”。

### events.record.batch → `recordEventsBatch(inputs)`

```ts
recordEventsBatch(inputs: Array<{
    itemId: string;
    value?: number;
    unit?: string;
    source: "api";
    externalRef?: string;
    note?: string;
    occurredAt?: string;         // RFC3339/ISO instant，必须带 Z 或 ±HH:MM；缺省回退批次执行时刻
}>): Promise<Array<{
    kind: "recorded" | "duplicate" | "discarded" | "blocked" | "rejected";
    eventId?: string;
    reason?: string;
    usedFallbackTime?: boolean;
}>>;
```

- **一次入队、一次持久化**；结果与输入一一对应（同序同长）。同一批内重复 `externalRef` 的后续输入返回 `duplicate`，并携带与首条 `recorded` 输入相同的 `eventId`，便于调用方逐项对账。
- 判定顺序固定：幂等身份（`duplicate`）→ 墓碑（`discarded`）→ 项目可用期/单位映射/落账日 at-most（`blocked`，`reason` 说明）→ 写入（`recorded`）；`rejected` 仅表示输入未过结构校验，不进入持久化。Task Horizon 专用 SKIP 等限制仍待 W-03。
- 调用入口在入队前捕获数组与标量对象快照；后续改写调用方输入不会改变批次。队列未执行、远端刷新或持久化失败会 reject；正常结果数组与捕获输入同序同长。reject 可能发生在事实已经落盘之后，消费端须保持原身份核验或重试。
- `occurredAt` 必须是带显式时区的 ISO/RFC3339 时刻（如 `2026-09-20T08:00:00+08:00` 或 `...Z`）；日期-only 与无时区时间会以 `invalid-occurred-at` 拒绝，避免不同宿主地区把同一输入归到不同业务日。缺省回退批次执行时的宿主时刻，结果以 `usedFallbackTime: true` 标注供审计。`localDate` 按插件宿主本地日历推导；要保留排队前的源业务日，必须显式传时间。
- 单批上限 200；单条 `recordEvent()` 保持兼容签名与行为：新事件返回事件副本、重复返回已有事件副本；`undefined` 仅表示没有成功回执，不能据此证明事实不存在。存储失败可能进入小驴待处理箱，并在启动恢复时自动补写。保留原始身份供核验，详见 §5.2。
- 新的 Task Horizon 普通任务合作优先使用本批量接口，即使一次只有一条，也保存带时区的源 `occurredAt`、显式单位和同一 `itemId + source + externalRef`。合作拟限定新事实为 `count + daily + atLeast`、`value: 1`、身份日与落账本地日相同且非未来，并拒绝创建前/归档区间/SKIP 等条件；W-03 专用校验当前尚未完整就绪，不是通用批量接口已承诺的完整合作限制。

### metrics.read → `getStreaks(itemIds?)`

```ts
getStreaks(itemIds?: string[]): Array<{itemId: string; current: number; longest: number; milestones?: {achieved: number; next?: number; progressPct: number}}>;
```

连续计算走插件单一实现（`computeEventStreaks`/`computeLongestStreaks`）；**禁止消费端自算 streak**，避免口径漂移。跳过日中性、AUTO 桥接等语义与回顾页展示完全一致。

**T-1415 戒断里程碑（v5 增量，可选字段）**：at-most（戒除类）项目额外携带 `milestones`——`achieved`（已达成最高阶梯，1/3/7/14/30/60/90/180/365）、`next`（下一阶梯，登顶后缺省）、`progressPct`（通往下一级进度 0–100）。与今日卡片、summary 渲染块同一口径；非 at-most 项目无该字段。

### diagnostics.read → `getDiagnostics()`

```ts
getDiagnostics(): readonly CheckinDiagnostic[];
// CheckinDiagnostic = {code, at, detail?};code ∈ save-failed / load-failed /
// version-conflict / migration-rejected / lock-contended;容量 20,会话态。
```

机器可读失败原因码（T-1361）：普通界面据码展示恢复操作；智能体只解释原因与建议顺序，不代为执行。`recoverable=false` 的码（load-failed）应引导用户导出诊断并求助。

### calendar.read → `getCalendarProjection(range)`

```ts
getCalendarProjection(range: {startDate: string; endDateExclusive: string}): CalendarProjection;
// CalendarProjection = {startDate, endDateExclusive, items, totalItems, truncated}
// CalendarProjectionItem = {itemId, name, icon, kind, direction?, unit, scheduleType,
//   points, quotaRate?}
// CalendarProjectionPoint = {date, status, value, target, unit, progress?}
// status ∈ complete / pending / skipped / at-most-safe / at-most-breach / logged
```

T-1391：有界「项目 × 日期」只读日历投影，面向日历类消费方（如 Task Horizon 的「打卡」图层）。语义纪律：

- **服务端过滤**：仅返回 `taskHorizonCalendarVisible !== false` 且未归档的项目；消费方不得读全量后自行过滤。项目级隐藏在编辑器高级区设置，只影响本投影，不删除本地数据、不复用归档、不影响 `recordEvent` 任务回写。
- **状态单一路径**：排期、配额、SKIP、atMost、修订生效日与日期归属（只用 `localDate` 与本地排期，不从 UTC 反推）全部由小驴侧计算；消费方只呈现，不自算完成率。
- **localDate 契约**（T-1419/R-A7）：日期键为 `YYYY-MM-DD`，按用户本地日解释；日期运算走插件内单一纯函数实现 `src/date-keys.ts`（UTC 日序号，不受夏令时影响），跨午夜来源在来源侧按 localDate 预切段。每个投影/报告的统计截止时间就是请求的当前 localDate 与区间端点，消费方应原样回显所用范围，不得自行换算时区。
- **状态语义**：`skipped` 为中性跳过（不渲染为失败）；`at-most-safe/at-most-breach` 为负向习惯专用（不套至少型百分比）；quota 项目只有真实贡献日生成点，日 `complete` 表示有正值记录，应展示“已记录”，不代表周期达标。`quotaRate` 是兼容字段名，保存实际投影末日所在周期的累计量（贡献天数或数值），不是 0～1 比例；例如目标 10、累计 1 时该字段为 1，不能渲染为 100%。`logged` 为非排期日的真实记录（无排期日不伪造计划项）。
- **有界**：区间 ≤ 366 天、项目 ≤ 200；合法范围超限时只计算前 366 天/返回前 200 个可见项目，并置 `truncated`，不会仅因超过上限直接拒绝。范围字段仍回显请求端点；超过 366 天时，实际投影末日是起始日起第 366 天，`quotaRate` 的周期与顶层 `scheduleType` 的修订均据该日确定，不能用请求的 `endDateExclusive` 推断。`totalItems` 为截断前可见项目总数；非法日期、空范围或逆序范围会拒绝。
- **同步调用**：该方法同步、有界，不接受 `AbortSignal`；timeout、`Promise.race` 或 Abort 不能中断已开始的计算。消费端可合并刷新并丢弃过时 UI 更新。
- **合作缺口**：C-03 拟新增 `point.scheduleType`（按该日有效修订）和顶层 `asOfDate`（读取时的宿主本地日），当前两字段尚未提供；现有顶层 `scheduleType` 取实际投影末日，不能解释所有历史 point，也不能将未来 `at-most-safe` 宣传为已达成。C-01 远端 Store 合并后的数据变化通知、C-02 window `checkin:api-state-changed` 生命周期通知尚未完整就绪。消费方必须核对当前全局 API 与就绪状态，不能把仍可读取的旧引用当作有效会话；详见 [合作设计](checkin-taskhorizon-cooperation.md)。
- **不含隐私字段**：投影不含备注、附件、externalRef 或内部身份；只读、无副作用、不注册事件。

## 5. 输入上限速查

| 接口 | 上限 |
| --- | --- |
| `getEventsInRange` 区间跨度 | 任意合法本地日期半开区间 |
| `getEventsInRange` itemIds | ≤ 200 个 |
| `getEventsInRange` limit | 默认 1000 / ≤ 5000 |
| `recordEventsBatch` 单批 | ≤ 200 条 |
| `queryItems` limit | 默认 200 / ≤ 1000 |
| `getCalendarProjection` 区间 / 项目 | ≤ 366 天 / ≤ 200 项目 |
| `getEventRangeSummary`（v4） | 366 天 / 366 点 / 5000 事件 |
| 分析快照 JSON | ≤ 512 KiB，趋势窗口 周 52/月 24/日 366/年 10 |

超限行为按接口区分：合法日历范围超限会截断并附 `truncated`；批量写入超过 200 条会拒绝 Promise。非法日期或逆序范围可抛 `TypeError`，消费方应先校验输入并捕获异常，不能把无结果当作完整空日历。

### 5.1 错误与诊断码（T-1365 标准化，稳定枚举）

**错误模型三原则**：读接口对合法请求有界返回（截断标注/空结果）；批量写接口在正常返回时提供逐条显式结果（`kind` + `reason`），主机级失败拒绝 Promise；结构校验异常与无结果分别处理，消费方应捕获 `TypeError`/`RangeError` 等错误并展示可诊断状态。

**批量写入结果**（`recordEventsBatch`，逐条）：

| kind | 含义 |
| --- | --- |
| `recorded` | 新事件已写入 |
| `duplicate` | 幂等命中，返回已有事件（`eventId` 可用） |
| `discarded` | 命中墓碑（用户已撤销的记录不复活） |
| `blocked` | 项目侧拦截，`reason` ∈ `missing-item` / `archived-item` / `at-most-item` / `not-scheduled` / `mapping-changed` |
| `rejected` | 输入未过结构校验（不进入持久化），`reason` ∈ `invalid-input` / `invalid-item-id` / `invalid-source` / `invalid-value` / `invalid-unit` / `invalid-external-ref` |

**会话诊断码**（`getDiagnostics()`，环形容量 20）：

| code | recoverable | 说明 |
| --- | --- | --- |
| `save-failed` | 是 | 主存储写入失败；重试，连续失败导出诊断求助 |
| `load-failed` | 否 | 读取失败；带诊断导出与恢复点求助，勿反复重试写入 |
| `version-conflict` | 是 | 多窗口版本冲突；存储锁已自动合并 |
| `migration-rejected` | 是 | 备份导入被拒；检查文件版本与完整性后重试 |
| `lock-contended` | 是 | 写锁竞争；操作已自动排队，无需处理 |

诊断码与恢复文案的映射在插件内（`features/diagnostics.ts` 注册表）与机器清单（`manifest.json` 的 `diagnosticCodes`）同步维护；新增码必须过 `tests/diagnostics.test.cjs` 与 `tests/api-v5-docs.test.cjs` 双门禁。

### 5.2 单条 recordEvent 兼容语义（v4 起不变）

新事件 → 事件副本；幂等命中 → 已有事件副本。`undefined` 仅表示本次没有成功回执，可能来自校验拒绝、版本/存储失败或队列未执行，不能保证远端没有事实。具有 `externalRef` 的存储失败还可能进入小驴待处理箱，启动后自动恢复；消费方丢弃自己的待处理队列不会撤销小驴待处理箱或已存事实。核验和重试必须保留原 `itemId + source + externalRef`，不可换身份或换项目重投。

legacy 单条接口按调用时刻捕获 `occurredAt/localDate`，externalRef 的日期只用于身份，不指定落账日；跨午夜直接重试可能改变落账日。参考 bridge 因而只允许当前本地日写入，跨日保留 `date-not-current` 待处理项。新的 Task Horizon 合作优先采用 v5 batch 与显式源 `occurredAt`，并以逐条回执对账；宿主级 Promise 拒绝同样只表示没有成功回执，仍应复用原身份。

## 6. externalRef 幂等身份

当前思阅和思播的新记录按完整片段生成身份：`sireader:<itemId>:<startUnixMs>:<localDate>`、`siplayer:<itemId>:<startUnixMs>:<localDate>`。下方旧的每日格式及此前短暂使用的分钟桶格式仅描述已写入历史，继续可读取但不再用于新片段。

- 同一外部事件**永远**使用相同 `source + externalRef`；重复写入返回已有事件副本，不产生重复记录。
- 前缀登记处：`docktomato:<sessionId>`、`taskhorizon:<blockId>:<localDate>`、`obsidian21:<filename>:<localDate>`、`sireader:<itemId>:<localDate>`、`siplayer:<itemId>:<localDate>`、`health:<itemId>:<metric>:<localDate>`、`notequery:<itemId>:<blockId>:<localDate>`（笔记查询推导；事件仍走 `source: "api"`）、`weread:<itemId>:<localDate>`（时长；完读 `weread:<itemId>:finish:<bookId>:<localDate>`、笔记计数 `weread:<itemId>:notes:<localDate>`）、`yeguif:<blockId>:<localDate>`（叶归 LifeLog，与来源框架治理注册表一致）；新生态来源按 [identity-and-merge.md](identity-and-merge.md) 规则登记前缀，禁止使用已登记前缀伪装他方事件，禁止伪装 `source: "manual"`。
- `notequery:` 只允许由 [笔记推导接入指南](note-query-integration.md) 的固定只读模板生成；查询必须显式 opt-in 且绑定单一文档/笔记本与单一项目，不能把任意 SQL、自然语言或未登记字段写入事件。
- 同步失败时保留原始引用重试，不要生成新的随机引用。

## 7. 集成事件

固定 8 个：`checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded`、`checkin:event-deleted`、`checkin:item-deleted`、`checkin:item-archived`、`checkin:suggestion-workflow-updated`、`checkin:analytics-updated`。

- `item-archived` 仅在**自动归档**成功后广播（携带归档项目快照）；手动归档走 `item-updated`。
- 删除事件通过 `deletedEvents` 提供具体记录。
- 建议事件仅含规范化建议 ID 与状态，不含令牌或完整变更；消费端对未知状态直接忽略。
- 事件只表示「数据已变化」，消费方应重读 API，不假设事件 payload 完整。

## 8. 降级与诊断纪律

- 消费方应捕获宿主异常并将异步超时、能力缺失转为可诊断状态；各接口的异常/回执边界见 §5。同步日历读取不能靠 timeout/Abort 中断。
- 写入失败后，消费方保留原身份并核验结果；legacy 单条路径可能由小驴待处理箱在启动恢复时自动补写，不能宣称全部重试只由消费方负责。新的 Task Horizon 合作优先使用 v5 batch 明确回执，并在无成功回执时以同身份对账/重试。
- `summary.providers` 的 `localOnly: false` 表示提供方内容会展示给用户并可能进入模型上下文；提供方必须对内容长度与格式自律。

## 9. 宿主兼容矩阵与接入清单

见 [ecosystem-integration.md](ecosystem-integration.md)（快速开始、专注联动、智能体、第三方接入检查清单）。本文与其冲突时：能力/限制以本文与契约清单为准，接入指引以 ecosystem 文档为准。

## 变更记录

- v5（2026-09）：新增 `items.query`、`events.range.read`、`events.record.batch`、`metrics.read` 与 `capabilitiesSince` 协商补强；externalRef 登记处新增 `obsidian21`；同月新增 `calendar.read` 日历投影能力（T-1391）。
- v4（冻结）：14 项能力与 8 个集成事件。
