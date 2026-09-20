# 小驴打卡公开 API v5 参考（稳定文档）

> 状态：**稳定**。本文是 `window.siyuanCheckin` 公开 API 的正式参考；`api-v5-design.md` 保留为设计过程记录，冲突处以本文为准。
> 机器可读契约清单：[contracts/checkin-api-v5.json](contracts/checkin-api-v5.json)，由 `tests/api-v5-docs.test.cjs` 与 `src/api-contract.ts` 交叉核对——三者不一致时以源码为准并视为文档缺陷。

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

## 3. 能力清单（18 项）

| 能力 | 自版本 | effect | localOnly | 主要方法 |
| --- | --- | --- | --- | --- |
| `items.read` | 4 | read | 是 | `getItems()` |
| `items.query` | 5 | read | 是 | `queryItems(options?)` |
| `events.read` | 4 | read | 是 | `getEvents()` |
| `events.range.read` | 5 | read | 是 | `getEventsInRange(range, options?)` |
| `events.record` | 4 | write | 是 | `recordEvent(input)` |
| `events.record.batch` | 5 | write | 是 | `recordEventsBatch(inputs)` |
| `occasions.read` | 4 | read | 是 | `getOccasions()` / `getVisibleOccasions()` |
| `occasions.complete` | 4 | write | 是 | `completeOccasion(id, date)` |
| `summary.read` | 4 | read | 是 | `getSummary()` |
| `summary.custom` | 4 | read | 是 | `getCustomSummary(range)` |
| `analytics.read` | 4 | read | 是 | `getAnalyticsSnapshot()` / `getAnalyticsSummary()` / `getStrengthSummary(options?)` |
| `metrics.read` | 5 | read | 是 | `getStreaks(itemIds?)` |
| `summary.providers` | 4 | register | **否** | `registerSummaryProvider(provider)` |
| `suggestions.read` | 4 | read | 是 | `getSuggestionWorkflow()` / `getSuggestionWorkflowSummary()` |
| `focus.adapters` | 4 | register | 是 | `registerFocusAdapter(adapter)` |
| `integrations.events` | 4 | read | 是 | 事件订阅（见 §7） |
| `export.json` | 4 | export | 是 | JSON 备份导出 |
| `export.csv` | 4 | export | 是 | CSV 记录导出 |

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
        source?: CheckinEvent["source"];
        includeSkips?: boolean;    // 默认 true；false 排除 kind==="skip"
        limit?: number;            // 默认 1000，上限 5000
    }
): {events: CheckinEvent[]; truncated: boolean};
```

`truncated === true` 表示达到 limit 被截断，调用方应缩小区间或提高过滤精度，而不是假设拿到了全量。区间跨度超过 366 天时拒绝并返回空结果（与摘要 API 同一保护语义）。

### events.record.batch → `recordEventsBatch(inputs)`

```ts
recordEventsBatch(inputs: Array<{
    itemId: string;
    value?: number;
    unit?: string;
    source: "api";
    externalRef?: string;
    note?: string;
    occurredAt?: string;         // ISO；缺省回退调用时刻
}>): Promise<Array<{
    kind: "recorded" | "duplicate" | "discarded" | "blocked" | "rejected";
    eventId?: string;
    reason?: string;
    usedFallbackTime?: boolean;
}>>;
```

- **一次入队、一次持久化**；结果与输入一一对应（同序同长）。
- 判定顺序固定：幂等身份（`duplicate`）→ 墓碑（`discarded`）→ 项目可用性/映射/跳过日/at-most（`blocked`，`reason` 说明）→ 写入（`recorded`）；`rejected` 仅表示输入未过结构校验，不进入持久化。
- `occurredAt` 缺省回退调用时刻是唯一允许的缺省，且结果以 `usedFallbackTime: true` 标注供审计。
- 单批上限 200；单条 `recordEvent()` 行为完全不变（兼容承诺），其返回语义：新事件返回事件副本、重复返回已有事件副本、非法/拒绝返回 `undefined`——`undefined` 一律表示「未写入」，需以原始 `externalRef` 重试。

### metrics.read → `getStreaks(itemIds?)`

```ts
getStreaks(itemIds?: string[]): Array<{itemId: string; current: number; longest: number}>;
```

连续计算走插件单一实现（`computeEventStreaks`/`computeLongestStreaks`）；**禁止消费端自算 streak**，避免口径漂移。跳过日中性、AUTO 桥接等语义与回顾页展示完全一致。

## 5. 输入上限速查

| 接口 | 上限 |
| --- | --- |
| `getEventsInRange` 区间跨度 | ≤ 366 天 |
| `getEventsInRange` itemIds | ≤ 200 个 |
| `getEventsInRange` limit | 默认 1000 / ≤ 5000 |
| `recordEventsBatch` 单批 | ≤ 200 条 |
| `queryItems` limit | 默认 200 / ≤ 1000 |
| `getEventRangeSummary`（v4） | 366 天 / 366 点 / 5000 事件 |
| 分析快照 JSON | ≤ 512 KiB，趋势窗口 周 52/月 24/日 366/年 10 |

超限行为：截断（附 `truncated`）或拒绝（返回空/undefined，不抛异常）；调用方不得依赖异常控制流。

## 6. externalRef 幂等身份

- 同一外部事件**永远**使用相同 `source + externalRef`；重复写入返回已有事件副本，不产生重复记录。
- 前缀登记处：`docktomato:<sessionId>`、`taskhorizon:<blockId>:<localDate>`、`obsidian21:<filename>:<localDate>`；新生态来源按 [identity-and-merge.md](identity-and-merge.md) 规则登记前缀，禁止使用已登记前缀伪装他方事件，禁止伪装 `source: "manual"`。
- 同步失败时保留原始引用重试，不要生成新的随机引用。

## 7. 集成事件

固定 8 个：`checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded`、`checkin:event-deleted`、`checkin:item-deleted`、`checkin:item-archived`、`checkin:suggestion-workflow-updated`、`checkin:analytics-updated`。

- `item-archived` 仅在**自动归档**成功后广播（携带归档项目快照）；手动归档走 `item-updated`。
- 删除事件通过 `deletedEvents` 提供具体记录。
- 建议事件仅含规范化建议 ID 与状态，不含令牌或完整变更；消费端对未知状态直接忽略。
- 事件只表示「数据已变化」，消费方应重读 API，不假设事件 payload 完整。

## 8. 降级与诊断纪律

- 宿主异常、超时、能力缺失一律降级为可诊断状态，不抛裸异常进入消费方控制流。
- 写入失败的补救在**消费方**：保留原 `externalRef`、稍后重试；插件侧不替外部来源补写。
- `summary.providers` 的 `localOnly: false` 表示提供方内容会展示给用户并可能进入模型上下文；提供方必须对内容长度与格式自律。

## 9. 宿主兼容矩阵与接入清单

见 [ecosystem-integration.md](ecosystem-integration.md)（快速开始、专注联动、智能体、第三方接入检查清单）。本文与其冲突时：能力/限制以本文与契约清单为准，接入指引以 ecosystem 文档为准。

## 变更记录

- v5（2026-09）：新增 `items.query`、`events.range.read`、`events.record.batch`、`metrics.read` 与 `capabilitiesSince` 协商补强；externalRef 登记处新增 `obsidian21`。
- v4（冻结）：14 项能力与 8 个集成事件。
