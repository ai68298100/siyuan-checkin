# 建议标题：Task Horizon 日历增加「小驴打卡」只读图层，并支持可选的任务完成回写

你好！我是思源插件「小驴打卡」（`siyuan-checkin`）作者。希望和 Task Horizon 合作增加小驴打卡日历图层，并在双方确认语义后提供可选的普通任务完成回写。本文只针对 Task Horizon × 小驴打卡：对方依据是 2026-10-10 核对的 v3.1.8 源码快照（commit `58ec06f23627962d0e83794611826ba4cfebb832`），不代表当前最新版本；我方本次验收版本为 v18.17.6（本次验收基线，正式发布状态见 GitHub Release）。建议先完成提供端缺口、确认范围和规则，再由 Task Horizon 仓库实现消费端 PR。

## 结论先行

小驴打卡已公开以下能力：

- `window.siyuanCheckin`，协议名 `siyuan-checkin`，当前 API 版本 5；
- v5 `calendar.read` / `getCalendarProjection(range)`：项目 × 日期的只读投影，服务端过滤归档项目和关闭了 Task Horizon 日历显示的项目；
- v4 `events.record` / `recordEvent(input)`：兼容的单条幂等写入；`undefined` 仅表示没有成功回执，可能已进入小驴待处理箱并随后自动恢复；
- v5 `events.record.batch` / `recordEventsBatch(inputs)`：新合作优先使用，显式保存源 `occurredAt` 并检查逐条结果；合作专用的新事实校验仍待 W-03 补齐。

上述 v3.1.8 快照没有消费 `window.siyuanCheckin`、`calendar.read` 或 `getCalendarProjection`，也没有面向小驴的项目 ID 绑定、`externalRef` 幂等约定和写入失败处理契约。我方既有通用 API 不代表合作专项完整就绪：2026-10-12 来件的 C-01（远端合并变化通知）、C-02（API 生命周期通知）、C-03（日期级排期与读取本地日）和 W-03（Task Horizon 新事实专用限制）尚未完整落实，当前不提供 `integrationContracts` 就绪声明。先补齐提供端并冻结契约，再由 Task Horizon 仓库实现消费端；小驴侧继续维护 API、契约夹具和兼容测试。

## 对 v3.1.8 源码的核对结果

### 已有、可以作为实现入口的能力

1. Task Horizon 有自己的原生任务完成入口。旧积分广播位于统一完成变更路径，并过滤部分后台 checkbox 同步来源；新集成应挂在确认“普通任务由用户完成”的同一业务入口，不要靠旧积分事件猜测用户动作。
2. Task Horizon 已有跨插件能力探测、异步查询超时、`AbortSignal`、单飞和降级等实现经验。不过小驴 `getCalendarProjection(range)` 是**同步、有界的只读方法**，不能向它传 `AbortSignal`，也不能用 `Promise.race` 中断正在执行的同步调用。消费端应合并事件突发、校验查询范围、在卸载后丢弃后续 UI 更新；只有真正异步的操作才需要超时/取消。
3. Task Horizon 有内部“打卡循环”：`repeatRule.trigger === "checkin"`，状态写入 `repeatState.checkinHistory`，支持今日打卡、补录、额外打卡和取消；内部日历事件形如 `checkin:<taskId>:<localDate>`。

### 不能直接当作公共契约的能力

1. 「启用凡人修仙传:打卡插件联动」是旧积分路径。它广播 `task-horizon:task-completed`，并使用 `siyuan-points-reward-*` 事件；当前 payload 确实含有 `taskId`、`source`、`completedAt` 和 `idempotencyKey` 等字段，但没有小驴 `itemId`，也没有版本化的日期归属、外部写入回执、失败原因和重放兼容承诺。字段存在不等于公开跨插件契约，不建议把该积分事件作为小驴写入入口。
2. `tm-checkin-updated` 当前会携带 `taskId`、`scheduledDate`、`checked` 和来源，但它仍是 Task Horizon 内部实现事件，没有版本化的外部身份、撤销/冲销语义和多窗口对账承诺。不能让小驴读取 `repeatState`、私有存储或日历 DOM。
3. Task Horizon 内部打卡循环可撤销，而小驴 `recordEvent()` 是追加事实，没有公开的“按外部身份撤回”方法。因此它不能与普通复选框完成回写共用同一项目，也不能直接套用 `taskhorizon:<blockId>:<localDate>` 身份。

## 推荐分三阶段

### 阶段 1：只读的「小驴打卡」日历图层

在 Task Horizon 日历中增加一个用户可关闭的「小驴打卡」图层。图层是投影展示，不创建 Task Horizon 原生任务、不修改任务状态。

#### 能力协商

```js
const api = window.siyuanCheckin;
const descriptor = api?.describe?.();
const canReadCalendar = descriptor?.protocol === "siyuan-checkin"
  && Number(descriptor.version) >= 5
  && api?.hasCapability?.("calendar.read") === true
  && typeof api?.getCalendarProjection === "function";
```

先等待 `api.whenReady()` 返回 true，并确认当前全局 API 引用与 `isReady()`；捕获 `describe()`、能力探测和读取异常。缺少插件/方法、未就绪、协议/能力不兼容时，图层进入可区分原因的 `unavailable/degraded`，保留自己的错误/重试入口，不影响 Task Horizon 和小驴打卡的其它功能。现有 API 没有独立“未授权”状态，用户启用开关属于消费端设置。`getCalendarProjection()` 是同步调用，调用方应使用合法的半开日期范围；不要把它当作可取消的 Promise，也不要把单飞/超时当成 provider API 的保证。

#### 读取和显示

```js
const projection = api.getCalendarProjection({
  startDate: "2026-10-01",
  endDateExclusive: "2026-11-01",
});
```

返回结构是：

```ts
{
  startDate: string;
  endDateExclusive: string;
  items: Array<{
    itemId: string;
    name: string;
    icon: string;
    kind: string;
    direction?: "atMost";
    unit: string;
    scheduleType: string;
    points: Array<{
      date: string;
      status: "complete" | "pending" | "logged" | "skipped" | "at-most-safe" | "at-most-breach";
      value: number;
      target: number;
      unit: string;
      progress?: number;
    }>;
    quotaRate?: number; // 兼容字段：实际投影末日所在周期的累计量，不是 0～1 比例
  }>;
  totalItems: number;
  truncated: boolean;
}
```

小驴侧已经计算排期、配额、修订生效日、SKIP、`atMost` 和本地日期。Task Horizon 只呈现这些状态，不重新计算完成率或把 `at-most-breach` 当作普通习惯的“未完成”。`skipped` 是中性状态；`logged` 是非排期日的真实记录。配额日的 `complete` 仅表示该日有正值记录，应展示“已记录”，不代表周期达标；`quotaRate` 是周期累计量，不能当作比例。顶层 `scheduleType` 只取实际投影末日修订，无法解释所有历史 point；C-03 拟增加 `point.scheduleType` 和顶层 `asOfDate`，两字段目前未提供。未来 `at-most-safe` 也不能宣称已经达成。`truncated === true` 时必须显示范围/项目不完整的状态，不能静默当作完整日历。

投影最多 366 天、200 个可见项目：合法范围超出 366 天时保留前 366 天，项目超出 200 个时保留前 200 个，并置 `truncated: true`；不是因超限直接拒绝。返回 `endDateExclusive` 仍回显请求上界；发生日期截断时，`quotaRate` 与顶层 `scheduleType` 对应的实际投影末日是起始日起第 366 天，不能按请求上界解释。投影不包含备注、附件和 `externalRef`。日期统一按 `YYYY-MM-DD` 本地日解释，不能从 UTC 字符串截取日期。事件处理可用 microtask/debounce 合并一帧内的多个刷新通知，并校验 `[startDate, endDateExclusive)`；卸载后不再渲染，但不声称能中断已开始的同步计算。

#### 刷新、缓存和生命周期

投影变化不只来自新增事件。应合并、单飞并重新读取以下 7 个数据事件：

- `checkin:item-created`
- `checkin:item-updated`
- `checkin:item-deleted`
- `checkin:item-archived`
- `checkin:event-recorded`
- `checkin:event-deleted`
- `checkin:analytics-updated`

`checkin:suggestion-workflow-updated` 不影响此图层。若用 `api.subscribe(listener)`，`listener` 收到的 `event.type` 是不带 `checkin:` 前缀的类型（如 `event-recorded`）；只有直接监听 `window` CustomEvent 时名称才是 `checkin:event-recorded`。事件只表示“数据已变化”，消费端必须重读 API，不能依赖 payload 完整。事件突发期间合并当前范围读取；刷新代次变化后旧结果不得覆盖新结果。

缓存必须与当前范围、当前 API 会话绑定。读取异常、插件卸载、能力变化或重载时应清空旧投影并隐藏图层，不能继续显示可能包含已隐藏/已删除项目的缓存；恢复后再重读。该方法同步且有界，因此不要求 provider 侧 timeout/Abort；禁止高频轮询。

上述生命周期与跨窗刷新是合作验收要求。C-01 尚未完整补齐远端 Store 合并后的 `analytics-updated`；C-02 拟增加 window `checkin:api-state-changed`（`loading/ready/failed/unavailable`），当前尚未提供。旧引用能读到投影不等于会话有效；消费端应以当前 `window.siyuanCheckin`、`isReady()` 和 `whenReady()` 返回 true 共同确认。当前可提供用户主动重试并重新探测；服务恢复后的自动重探测与刷新须待 C-02 及消费端接线完成，不能宣称现有通知已覆盖加载顺序、热重载与所有跨窗变化。

旧 v4 只能读取日期聚合摘要，不能宣称项目级隐藏能力。若保留 legacy fallback，应把它标成日期汇总且不得冒充项目图层；不能保证按项目隐藏时，应关闭项目级展示，不要让旧缓存继续显示此前读取到的明细。

### 阶段 2：普通任务完成回写小驴

这一阶段针对**普通原生任务复选框**，不包含 Task Horizon 内部打卡循环。目标为每日次数、正向累计项目 `count + daily + atLeast`，每日目标 N；不使用周/月 `schedule.quota`。配额项目仅由阶段 1 的只读图层展示。

#### 目标项目与用户启用设置

Task Horizon 设置中由用户明确选择目标小驴项目，并持久化 `itemId`。不能按名称自动猜测“任务打卡”，不能在映射变化后把旧队列改投新项目。设置页至少展示目标的项目名、类型、单位和方向，并在以下情况阻止写入：项目 ID 不存在、项目已归档/删除、目标为 `atMost`、单位不匹配、当前日期不在项目排期内。

新合作首次范围拟固定为 `count + daily + atLeast`。W-03 要求提供端对新 Task Horizon 身份验证显式 `occurredAt`、显式 `unit`、`value: 1`、身份日期与落账本地日相同且非未来、创建日与归档区间、SKIP 等条件；这些专用限制目前尚未完整就绪。通用 API 仍可记录其它来源的非排期事实，不能把通用接受行为当作 Task Horizon 已通过合作校验。

读日历和写回完成是两个独立的消费端开关，默认不因打开其中一个而自动打开另一个；提供端 API 没有相应的授权状态或权限管理接口。项目的“在 Task Horizon 日历中显示”只控制阶段 1 的投影，不控制阶段 2 的写入启用。小驴 `getItems()` 只列出未归档项目；要把目标失效明确区分为“已归档”或“已删除/不存在”，v4 消费方还要查 `getArchivedItems()`，v5 可使用 `queryItems({includeArchived: true})`。项目方向应按写入日期的有效修订读取，不能只看顶层 `direction`；历史修订单位变化也要在设置与待处理项重试前重新校验。

#### 触发边界

只在统一完成入口确认“用户真实完成了普通任务”后调用。后台同步、重放、批量恢复、初始化扫描、其它窗口镜像和撤销动作不能再次产生完成写入。不要监听 `task-horizon:task-completed` 或旧积分事件作为新契约。

#### 新合作优先使用 v5 批量回执

即使一次只写一条，新合作也优先协商 `events.record.batch`，保留源完成时刻后调用：

```js
const [result] = await api.recordEventsBatch([{
  itemId: selectedItemId,
  value: 1,
  unit: selectedUnit,
  source: "api",
  occurredAt: sourceCompletionInstant, // 带 Z 或 ±HH:MM，重试始终保留
  externalRef: `taskhorizon:${blockId}:${localDate}`,
}]);
```

这使用既有 v5 批量能力；W-03 专用限制和其它提供端缺口通过后才能作为稳定合作主路径。不得把消费方示例当成已发布的合作就绪声明。

#### 兼容参考：当天完成的 v4 写入

对刚刚发生的**当前本地日**完成，可以使用：

```js
const result = await api.recordEvent({
  itemId: selectedItemId,
  value: 1,
  unit: selectedUnit,       // 从已绑定项目快照读取，不要硬编码后忽略单位
  source: "api",
  externalRef: `taskhorizon:${blockId}:${localDate}`,
});
```

`externalRef` 的日期只参与身份去重，**不会强制小驴把事件写入那一天**。单条 `recordEvent()` 内部按调用时刻捕获 `occurredAt/localDate`。因此不能用单条 API 补录历史日期，也不能只改 externalRef 的日期来补救。

#### 历史补录和批量对账

`recordEvent()` 按**实际调用时刻**捕获 `occurredAt/localDate`；`externalRef` 中的日期只用于去重，不决定落账日。若一次写入失败后跨过午夜，继续用 v4 单条 API 重试会把原始日期身份写到新的一天。凡是延迟队列、跨午夜重试、历史补录或对账，都必须保留源完成时刻，并走 v5 `recordEventsBatch()`，为每条记录提供带 `Z` 或 `±HH:MM` 的显式 `occurredAt`，让小驴按宿主本地时区推导 `localDate`。日期-only 或无时区时间会被拒绝。若只有 v4 能力且待处理项已跨日，应保留为待处理并提示用户，不得自动改写成今天。

批量结果与输入严格一一对应：

- `recorded`：新事实已写入；
- `duplicate`：幂等命中，使用返回的 `eventId` 对账；
- `discarded`：命中小驴墓碑，不得继续重放；
- `blocked`：项目失效、归档、`atMost`、未排期或单位/修订变化；
- `rejected`：输入格式未通过校验。

#### 单条失败和重试

单条 v4 `recordEvent()` 返回事件表示新写入或幂等命中；返回 `undefined` 仅表示“没有成功回执”，无法区分目标失效、归档、排期/单位不符、身份错误、版本变化和存储失败，也不能证明事实不存在。存储失败可能进入小驴待处理箱，启动恢复后自动补写。消费端必须保留当时的 `itemId`、`source`、`externalRef`、值和日期，显示待核验状态；重试必须复用同一 `externalRef`，不能随机生成新身份，也不能静默换绑新项目。跨午夜时不能直接重试 v4 单条写入；legacy 参考桥会保留 `date-not-current` 待处理项，不调用写接口。

如果用户明确丢弃消费方待处理项，应记录该决定并停止消费方重试；这既不等于小驴生成了“已撤销”事件，也不会取消小驴自身待处理箱。批量 API 的明确 `kind/reason` 可用于区分逐条拒绝与成功。v5 宿主级 Promise 拒绝（未就绪/持久化失败）表示没有获得成功回执，不能保证远端一定没有写入；需要保留整批原输入和同一身份供对账/重试，不能把 Promise reject 伪装成逐条 `rejected` 回执。新合作优先批量路径，避免把 legacy 单条待处理箱的恢复误当成消费方已经取消的操作。

#### 撤销语义必须先选定

Task Horizon 普通任务可能允许用户取消刚才的完成，而小驴记录是追加事实。阶段 2 必须在 UI 和文档中明确采用以下一种语义：

1. **单向事实（推荐 MVP）**：完成写入成功后，Task Horizon 的撤销只撤销 Task Horizon 状态，不自动删除小驴事实；界面明确提示“外部打卡记录需要单独处理”。
2. **可逆联动（后续阶段）**：双方新增版本化的撤回/冲销契约，定义外部身份、墓碑、多窗口和恢复规则后再实现。

在双方没有可逆契约前，不能把普通完成和可撤销的内部打卡循环都写入同一小驴项目，否则会出现重复或无法对账。

### 阶段 3：内部“打卡循环”融合（另立契约）

Task Horizon 的内部打卡循环从产品语义上更接近小驴习惯项目。未来可以由用户明确选择一个目标小驴项目，再定义独立的、版本化的状态对账契约；不能直接读取私有 `repeatState/checkinHistory`、DOM 或 `tm-checkin-updated`，也不得自行扩展现有 `taskhorizon:<blockId>:<localDate>` 身份格式。

该阶段至少需要冻结：

- 稳定的 Task Horizon 任务/循环身份和事件来源；
- `scheduledDate` 的本地日期解释、今日/补录/额外打卡规则；
- 用户点击、后台同步、取消、恢复和多窗口重放的边界；
- 小驴侧 upsert/retract 或冲销能力，以及墓碑优先级；
- 解除映射、目标删除/归档、迁移和历史对账方式；
- 普通复选框完成与内部循环二选一的唯一 canonical source。

未来可以由用户明确选择一个目标小驴项目，但在该契约发布前不能直接同步。两种写入模式必须互斥选择唯一 canonical source，不能让同一次习惯完成被普通复选框和内部循环重复累计。

## 建议验收清单

### 阶段 1

- [ ] C-01/C-02/C-03 提供端缺口补齐并通过契约测试：远端合并变化通知、API 生命周期事件、日期级排期与 `asOfDate`；不能以现有通用 API 代替此项就绪证据。
- [ ] 未安装、未加载、版本不足、能力缺失、超时、异常、卸载和热重载都可诊断并隐藏图层；小驴本地功能不受影响。
- [ ] 日历投影使用 `[startDate, endDateExclusive)`，正确处理闰年、跨月、跨年、夏令时和本地日期。
- [ ] 新建、编辑可见性、归档、删除、恢复、记录新增和事件删除都会在桌面页签、Dock、独立窗口和 Android 触发合并重读。
- [ ] 隐藏项目不会从旧缓存或 v4 fallback 重新出现；`truncated` 不会被静默忽略。
- [ ] 六种状态展示与小驴投影一致，`skipped` 和 `atMost` 不被套用错误颜色/百分比语义。

### 阶段 2

- [ ] W-03 的新身份专用校验完成并冻结；新合作使用 v5 批量回执与显式源时刻，legacy 单条 `undefined` 不被宣称为“确定没有事实”。
- [ ] 设置保存的是明确 `itemId`，目标不存在、归档、删除、`atMost`、单位/排期变化都有禁用原因和恢复入口。
- [ ] 只有用户真实完成普通任务才写入；后台同步、重复回调、跨窗口重放和重载不重复记账。
- [ ] 同一 `itemId + source + externalRef` 返回同一事实；待处理项重试不换身份、不改投新项目。
- [ ] 当天写入不会把 externalRef 日期误当作落账日期；历史补录只走显式 `occurredAt` 的 v5 批量契约，或明确保持未同步。
- [ ] `undefined`、批量 `blocked/rejected/discarded`、网络/宿主异常和用户丢弃均有不同的可见状态；没有“失败却显示成功”。
- [ ] Task Horizon 撤销与小驴追加事实的差异在 UI 和文档中明确，不会声称两边已自动回滚。

### 阶段 3

- [ ] 内部循环和普通完成不会双写同一项目；取消、补录、多窗口和删除后的旧回调均可对账。
- [ ] 双方各自拥有 contract fixture，并完成真实思源宿主、桌面/移动端和热重载验收后再标记为稳定。

## 维护者需要先确认的问题

1. 阶段 1 的图层放在主日历、日历侧栏还是独立分组？是否需要按项目选择显示？
2. 是否同意所有目标项目均由用户按 ID 选择，禁止按名称自动匹配？
3. 阶段 2 MVP 是否采用“单向事实”语义，撤销 Task Horizon 不自动删除小驴记录？
4. 历史补录是否纳入第一版；若纳入，是否统一要求 v5 `recordEventsBatch + occurredAt`？
5. 内部打卡循环是否明确留到阶段 3，另行设计可撤回/对账契约？
6. 由 Task Horizon 仓库提交实现 PR，小驴仓库提供 API 文档、manifest、参考 bridge 和 fixture，是否按这个分工推进？

## 推荐协作方式

请先在本 Issue 确认上述问题和阶段范围。确认后由 Task Horizon 侧提交实现 PR，并在 PR 中附：能力协商、显式目标绑定、事件刷新、缓存失效、失败状态、重试、多窗口和撤销语义的测试。小驴侧会根据双方冻结的字段维护契约夹具和兼容测试。

已发布 API 参考：

- [小驴打卡 API v5 文档](https://github.com/ai68298100/siyuan-checkin/blob/main/docs/api-v5.md)
- [小驴打卡项目仓库](https://github.com/ai68298100/siyuan-checkin)
- [Task Horizon v3.1.8 源码快照](https://github.com/5kyfkr/siyuan-plugin-task-horizon/tree/58ec06f23627962d0e83794611826ba4cfebb832)

实现建议：先在 Task Horizon 仓库完成只读图层；普通任务回写作为独立 opt-in 后续 PR；内部打卡循环另立契约。若维护者更希望由小驴侧先准备参考实现，也欢迎告知双方认可的分工。
