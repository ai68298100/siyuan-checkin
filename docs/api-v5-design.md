# 小驴打卡 API v5 设计稿（2026-09-20,T-1274 草案；v5-1 已实施——T-1275）

> 状态:**草案**——仅供评审与下一版本排期,未实现、未承诺发布窗口。
> 输入:v4 契约(`src/api-contract.ts`,14 项能力)与本文件撰写时点已完成的消费端实践(docktomato 桥/D-227、Task Horizon bridge、externalRef 前缀注册 D-211)。
> 边界:本稿不含「每日摘要写驻留文档」等需隐私评估的事项;不含任何网络/同步能力。

## 一、v4 现状与动机

v4 能力面(`items.read / events.read / events.record / occasions.* / summary.* / analytics.read / summary.providers / suggestions.read / focus.adapters / integrations.events / export.*`)在 13.x~17.x 的生态实践中暴露出四个缺口:

1. **范围读缺失**:`getEvents()` 返回全量事件;Task Horizon 日历图层(T-1228)与未来的时间类集成需要「按日期区间的有界事件读」,现在只能全量拉取后自行过滤(我们的 docktomato 收件箱判定也是全量扫描)。
2. **单条写入、结果语义含糊**:公开 `recordEvent()` 一次一条,且用 `undefined` 表达「拒绝/失败/未就绪」多种含义(D-227 评审确认的误判源);批量外部记账(Todoist 同步类集成)只能逐条调用。
3. **项目列表二分**:`getItems()` 过滤归档、`getArchivedItems()` 单列——消费端必须拼接两个调用才能做「归档也参与」的判定(docktomato 归档误报的教训)。
4. **派生指标无独立门面**:强度分(getStrengthSummary)、streak 等挂靠在 `analytics.read` 下,外部无法单独协商只读派生指标。

## 二、目标与非目标

**目标**:以上四个缺口以「有界、纯数据、显式结果、去重前置」(D-211/D-227 沉淀的原则)给出一等 API;纯增量,v4 消费方零破坏。

**非目标**:摘要写驻留文档(隐私评估挂起)、跨设备同步、实时事件流游标(现有 `subscribe` + 广播事件够用)、渲染块配置面(渲染块非 API 面)。

## 三、提案

### P1 `events.range.read`——有界范围事件读

```ts
getEventsInRange(range: {startDate: string; endDateExclusive: string}, options?: {
    itemIds?: string[];        // 可选过滤,≤200 个
    source?: CheckinEvent["source"];
    includeSkips?: boolean;    // 默认 true;false 时排除 kind==="skip"
    limit?: number;            // 默认 1000,上限 5000
}): {events: CheckinEvent[]; truncated: boolean};
```

- 半开区间(与 `getEventRangeSummary` 同语义);`truncated=true` 表示达到 limit 被截断,调用方应缩小区间。
- 复用 14.0 数据内核的日期范围索引,性能门禁沿用 review-performance-baseline(100k 事件范围查询不回退)。
- 服务对象:T-1228 日历图层、worklog/时间块类集成的只读需求。

### P2 `events.record.batch`——幂等批量写入 + 显式结果

```ts
recordEventsBatch(inputs: Array<{
    itemId: string; value?: number; unit?: string; source: "api";
    externalRef?: string; note?: string;
    occurredAt?: string;       // ISO;缺省按调用时刻(与单条一致)
}>): Promise<Array<{
    kind: "recorded" | "duplicate" | "discarded" | "blocked" | "rejected";
    eventId?: string; reason?: string;
}>>;
```

- **一次 `enqueueMutation`、一次持久化**,结果逐条返回;判定顺序固定:幂等身份(duplicate)→ 墓碑(discarded)→ 项目/映射(blocked)→ 写入(recorded);`rejected` 仅表示输入未过结构校验(不进入持久化)。
- `occurredAt` 显式注入沿用 D-227 的 completionClock 纪律:严格 ISO 校验,缺失回退为调用时刻是**唯一**允许的缺省,但必须在结果里以 `usedFallbackTime: true` 标注,供消费端审计。
- 上限单批 200 条;`atMost` 项目照旧 blocked(与番茄桥同一拒绝语义,不特判)。
- 直接复用 `recordDockTomatoCompletionUnlocked` 的分类骨架,抽为通用 `classifyExternalCompletion`-式内部边界——**单条 `recordEvent()` 的现有行为不变**(兼容承诺)。

### P3 `items.query`——统一项目投影

```ts
queryItems(options?: {
    includeArchived?: boolean;   // 默认 false(等价现 getItems)
    archivedOnly?: boolean;      // 互斥;true 时仅归档
    kinds?: CheckinKind[];       // 可选过滤
    limit?: number;              // 默认 200
}): CheckinItem[];
```

- 消除 getItems/getArchivedItems 二分;`archivedOnly` 与 `includeArchived` 同时提供时以 `archivedOnly` 优先并在文档声明(避免布尔陷阱)。
- 输出沿用现有 cloneItem 快照纪律(防 getter 逃逸)。

### P4 `metrics.read`——派生指标独立门面

```ts
getStrengthSummary(options?)   // 自 analytics.read 迁出/共享实现
getStreaks(itemIds?: string[]): Array<{itemId: string; current: number; longest: number}>
```

- 新能力名 `metrics.read`;旧路径(analytics.read)保留一期并行(D-219「分数只新增不替换」同一原则),用户反馈后再定去留。
- streak 数字走 `computeEventStreaks` 单一实现,禁止消费端自算(计分单一代码路径,方案第一节原则)。

### P5 版本协商补强(不动能力清单)

- `describe()` 增 `capabilitiesSince: Record<capability, 4 | 5>`,让 v4 消费方在 v5 宿主上仍可安全探测「这条能力在不在我的版本里就有」。
- `window.siyuanCheckin.version` 语义不变;协议名 `CHECKIN_API_PROTOCOL` 不变。

## 四、兼容与迁移

- `CHECKIN_API_VERSION` 4→5 一次性递增;v4 全部能力原样保留,**只增不删不改签名**。
- 内部消费方(docktomato 桥、渲染块、建议工作流)不强制迁移;桥在 v5 宿主上继续走 v4 面,待上游 PR 修订完成后再评估是否切 `events.range.read`(可消掉桥内全量扫描)。
- 契约测试:`api-contract` 能力清单、`ecosystem` 快照、`block-dom-compat` 的 11 能力清单同步扩为 15+3;新增能力各配边界测试(上限截断/互斥参数/时区纪律)。

## 五、实施切分建议

| 批次 | 内容 | 依赖 |
| --- | --- | --- |
| v5-1 | P1 范围读 + P3 项目投影(纯读,风险最低)——**已实施**:`features/api-v5.ts` 纯过滤 + `getEventsInRange`/`queryItems` 接线,契约测试与 tests/api-v5.test.cjs 守门 | 无 |
| v5-2 | P2 批量写(抽取分类骨架,含结果测试矩阵) | v5-1 的索引复用 |
| v5-3 | P4 指标门面 + P5 协商补强 | 无硬依赖 |

每批过既有门槛:`test:quality` 全绿、性能基线不回退、契约测试与文档交叉核对(export-identity-docs 模式)。
