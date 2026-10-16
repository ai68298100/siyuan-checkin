# 小驴打卡 × Task Horizon 合作设计

> 目标：把「当天打卡内容」接入 Task Horizon 的日历等视图，并把「任务完成」接入打卡的记录体系，形成任务↔习惯的闭环。
> 状态（2026-10-16）：本次验收版本为小驴打卡 v18.17.6（本次验收基线，正式发布状态见 GitHub Release）；既有 API v5 的 `calendar.read` 投影和 legacy 参考 bridge 已落地，合作专项尚未完整就绪。对方取证基线仅为 2026-10-10 核对的 Task Horizon v3.1.8 源码快照（commit `58ec06f23627962d0e83794611826ba4cfebb832`），不代表对方当前最新版本。该快照尚未消费 `window.siyuanCheckin`。本文是两个插件的专门合作设计；基础 v1 机器契约保持兼容，历史研究过程见 [日历可见性规划](roadmap-task-horizon-calendar-visibility-2026-09.md)。

机器可读契约清单：[docs/contracts/task-horizon-v1.json](contracts/task-horizon-v1.json)。该文件与运行时 `TASK_HORIZON_CONTRACT` 及契约测试保持一致，供对方生成消费层常量和 CI fixture。

## 一、双方现状

### Task Horizon（思源任务管理器）
- 任务 = 原生复选框块 + 受管属性（状态/日期/重要性/循环/番茄等），跨文档汇总。
- 视图：清单/表格/时间轴/看板/日历/白板/主页总览；支持 ICS 订阅与 AI 能力注册。
- 原生“打卡循环”是 Task Horizon 自己的任务类型：按日期保存 `checkinHistory`，支持今日打卡、补打卡、额外打卡、取消和未来计划预览；日历事件使用内部 `checkin:<taskId>:<localDate>` 形态。这些数据和入口目前没有公开的跨插件 API，不能当作小驴项目或小驴事件直接读取。
- 跨插件经验：与底栏番茄钟联动——经 `globalThis.__dockTomato.stats.queryFocus(options, {signal})` 查询专注统计（能力检测 + 超时 + AbortSignal 取消 + 契约测试 `scripts/focus-statistics-service-contract.test.js` 等）。另有旧的“凡人修仙传:打卡插件”积分联动：任务完成时广播 `task-horizon:task-completed`，payload 含 `taskId/source/completedAt/idempotencyKey` 等积分路径字段，并通过 `siyuan-points-reward-*` 事件处理奖励；它没有版本化的小驴项目绑定、日期归属和写入回执契约。
- 2026-10-10 核对的源码快照（v3.1.8，commit `58ec06f23627962d0e83794611826ba4cfebb832`）未发现 `window.siyuanCheckin`、`siyuan-checkin`、`calendar.read` 或 `getCalendarProjection` 消费代码；也没有针对小驴打卡的项目 ID 选择、幂等 externalRef 或失败重试语义。后续版本须另行核对。

### 小驴打卡（本插件）
- 公共 API：`window.siyuanCheckin`，协议 `siyuan-checkin`，当前 API 版本 5（v4 面冻结兼容），能力协商共 **20 项**。legacy 单条回写最低要求 v4；新合作回写优先 v5 的 `events.record.batch`，日历投影需要 v5 的 `calendar.read`。
- 集成事件（window 广播）：`checkin:item-created|item-updated|item-deleted|item-archived|event-recorded|event-deleted|analytics-updated|suggestion-workflow-updated`。其中 `item-archived` 仅在自动归档成功后广播，携带项目快照；手动归档保持 `item-updated` 兼容行为。
- 记录写入：`recordEvent({itemId, value, unit, source:"api", note, externalRef})` 保留 legacy 单条接口；返回事件表示新写入或幂等命中。`undefined` 表示本次没有成功回执，不能证明没有事实：存储失败可能进入小驴待处理箱，并在启动恢复时自动补写。新合作优先协商 v5 `events.record.batch`，逐条检查结果并保存原身份；两种路径都不能把无回执当成可换身份重投的依据。
- 项目模型：每日次数项目与周/月配额项目是不同排期。普通任务新合作回写目标为 `count + daily + atLeast`（每日目标 N，非 `schedule.quota`）；周/月配额仅在 L1 只读日历中按贡献日和周期累计量呈现，不作为本轮 L2 回写目标。另有农历、提醒、成就、统计和已落地的自动归档（T-1161）。

## 二、合作空间（三层）

### L1 显示合作：当天打卡进 Task Horizon 日历
- Task Horizon 日历新增「小驴打卡」只读图层：只有在 `window.siyuanCheckin` 协商到 v5 `calendar.read` 后，才调用 `getCalendarProjection({startDate, endDateExclusive})`。投影已由小驴侧按项目/日期计算状态，并过滤隐藏和归档项目；Task Horizon 只呈现，不复制成原生任务。
- 基础 v4 消费方仍可使用 `analytics.read/getEventRangeSummary` 做兼容摘要，但不得宣称支持项目级隐藏；不能用旧聚合缓存重新显示已关闭的项目。
- 刷新：使用 `api.subscribe(listener)` 时按 `event.type` 匹配无前缀的七种类型（`item-created`、`item-updated`、`item-deleted`、`item-archived`、`event-recorded`、`event-deleted`、`analytics-updated`）；只有直接监听 `window` CustomEvent 时才使用 `checkin:` 前缀。事件后合并重查，无需轮询；仅建议工作流事件不影响投影。
- 降级：API 缺失、未加载、未就绪（`whenReady()` 为 false 或 `isReady()` 为 false）、协议/能力不兼容或读取异常时隐藏图层，清理旧缓存并展示可诊断状态。现有 API 没有独立“未授权”状态；图层是否启用由消费端设置控制。缺失/未就绪与 v4 兼容摘要降级应分别显示。服务恢复后可由用户重试重新探测；自动重新探测与刷新须待 C-02 生命周期通知及消费端接线完成，不能作为当前已有能力。

### L1.1 项目级日历可见性（T-1389～T-1394，打卡侧已落地/Task Horizon 侧待消费）
- 新建项目默认显示；项目可在编辑器高级设置中单独关闭 Task Horizon 日历展示。旧项目缺少字段时同样按显示处理。
- 关闭只影响 Task Horizon 的只读日历投影，不删除小驴项目/事件/统计/导出，不复用归档，也不自动禁止 L2 任务完成回写。
- 当前 `getCalendarProjection()` 已在小驴 API v5 发布；`task-horizon-v1.json` 仍描述兼容的 v4 摘要/写入面，不应把 v5 投影能力倒填进旧 manifest。Task Horizon 需要单独消费 `taskhorizon-calendar-consumer-v1.json` 草案并在自身仓库固化测试。
- 旧 v1 消费方未协商新能力时不得假装支持隐藏项目；应保留 legacy 聚合状态或隐藏细粒度图层，不能让已关闭项目因旧缓存继续出现。

### L2 写入合作：任务完成 → 打卡（"完成 N 个任务 = 打卡完成"）
- 打卡侧选择或创建一个每日次数、正向累计项目（`count + daily + atLeast`，如「任务打卡」，每日目标 N=设定任务数）；不是周/月 `schedule.quota` 项目。
- 对普通任务，Task Horizon 在**原生复选框完成回调**（仅用户真实点击，后台同步/重放不触发）保存源完成时刻，并优先调用：
  `recordEventsBatch([{itemId, value: 1, unit, source: "api", occurredAt, externalRef: "taskhorizon:<blockId>:<localDate>"}])`
- 新合作拟固定为 `count + daily + atLeast`，显式提供 `unit` 和带时区的 `occurredAt`；身份日期须等于宿主推导的落账本地日且不得为未来日。创建前、归档区间和 SKIP 日等专用拦截归 W-03，当前尚未完整实现，不应把上述提案写成现有提供端保证。旧 v4 `recordEvent` 参考桥仅支持当日写入，跨日待处理保持原身份并停止调用；它不实现 v5 批量补录。
- 幂等键含任务块 id 与本地日期：同一任务重复勾选/同步重放只记 1 次；当天累计 N 条即达成目标。
- 可与自动归档组合（如"完成 30 天后自动归档"），闭环不再需要手动管理。

### L2.1 Task Horizon “打卡循环”与小驴项目的匹配边界
- Task Horizon 的 `tm-checkin-updated`（`detail: {taskId, scheduledDate, checked, source}`）只表示其内部 `checkinHistory` 的变更；它覆盖今日、补录、额外打卡和取消，**不能直接套用普通任务的 `taskhorizon:<blockId>:<localDate>` 回写**。
- 从产品语义看，这个内部循环比“普通任务完成”更接近小驴的习惯项目：两边都有按日计划与每日完成状态。融合后的合理形态是让用户把一个 Task Horizon 打卡循环明确映射到一个小驴项目，由 Task Horizon 管计划和打卡操作、小驴管记录与统计；日历仍分别标注两个来源，不能把两套历史默认为同一份数据。
- 但当前状态是可修改的：Task Horizon 取消打卡会从 `checkinHistory` 移除该日记录，而小驴公开 `recordEvent()` 是追加事实，当前公开 API 没有按外部身份撤回/修订事件的方法。因此即使 `checked: true` 可写入，取消也无法安全镜像；仅订阅事件会造成两边历史不一致。
- 若要把“打卡循环的一次完成”同步到小驴，应由 Task Horizon 先提供版本化的公开事件/能力，至少冻结 `taskId`、本地 `scheduledDate`、`checked`、用户触发边界、来源和稳定幂等身份；取消语义也必须先解决。当前小驴 `recordEvent` 是追加事实，不能用取消勾选简单删除或冲销旧事件。
- 在该契约发布前，不建议小驴监听 `tm-checkin-updated`、读取 `repeatState/checkinHistory` 或日历 DOM；也不建议同时把内部打卡循环和普通原生复选框都写入同一个小驴项目，避免重复累计。未来契约还要定义撤销/补录、多窗口重放、源删除/解除映射和迟到事件；若要让取消保持一致，需要版本化的“按来源身份对账/撤回”能力，不能把普通 `recordEvent()` 伪装成可逆操作。
- 推荐顺序：先完成只读日历投影，再接入语义单向且可幂等的普通任务完成回写；Task Horizon 内部打卡循环与小驴项目的双向/可撤销融合另立阶段，待双方确认事件所有权和撤销能力后再实现。两种写入模式必须互斥选择唯一 canonical source，不能让同一次习惯完成被普通复选框和内部循环重复累计。

### L3 生态位：通用任务源与外部软件
- recordEvent 契约即"外部完成源"通用入口：Task Horizon 之外，未来 GitHub Issue、桌面自动化、手机快捷指令皆可经同一路径写入（externalRef 前缀区分来源，如 `taskhorizon:` / `shortcuts:`）。
- 插件通过思源 `saveData/loadData` 经内核读写独立插件数据，不依赖文档块存储；外部软件短期走导出 JSON/CSV；中期可评估「每日摘要写入驻留文档」，外部工具经思源内核 API 读取（需隐私评估，另行立项）。

## 三、契约要点（打卡侧承诺）

- 探测：基础回写要求 `window.siyuanCheckin` 存在且 `protocol === "siyuan-checkin"`、`version >= 4`，按 `capabilities` 确认 `events.record`；日历投影必须另外确认 `version >= 5`、`calendar.read` 和 `getCalendarProjection`。
- 读：v4 兼容层提供 `analytics.read` 快照、`events.read` 明细和 `getEventRangeSummary({startDate, endDateExclusive}, {maxEvents?, maxPoints?})`；它只按本地日期聚合 `{localDate,eventCount,totalValue,totalsByUnit}`，默认最多 366 天/5,000 条事件/366 个点，超出时返回 `truncated: true`。v5 日历图层优先使用 `calendar.read/getCalendarProjection({startDate, endDateExclusive})`；合法范围超过 366 天时只计算前 366 天，可见项目超过 200 个时只返回前 200 个，两者均置 `truncated: true`，不会仅因超限直接拒绝。非法日期或逆序/空范围会拒绝；返回值不含 store、附件、备注或私有 `externalRef`。
- 配额：`quotaRate` 是兼容字段名，值为实际投影末日所在周期的累计量，不是 0～1 比例；配额日的 `complete` 仅表示该日有正值记录，应展示“已记录”。超过 366 天时，实际投影末日是起始日起第 366 天，返回 `endDateExclusive` 仍回显请求上界，不能用该上界推断累计量所属周期。顶层 `scheduleType` 同样取实际投影末日修订，不能解释全部历史点；C-03 拟补日期级 `point.scheduleType` 与顶层 `asOfDate`，当前尚未提供。
- 写：新合作优先 `events.record.batch`（见 L2），显式保存源 `occurredAt` 并检查每条 `kind/reason`。单条 v4 `undefined` 是“没有成功回执”，不区分目标失效、单位/排期不符、版本冲突和存储失败，也不能排除小驴待处理箱后续自动恢复。消费方必须保留原始 `itemId + source + externalRef`，重新校验、对账或以同身份重试；在消费方丢弃本地队列不等于撤销小驴待处理箱。任何路径都不能用 externalRef 日期伪造落账日期。
- 身份校验：打卡侧对 `taskhorizon:` 前缀执行严格解析；块 ID 不得含冒号/控制字符，日期必须是有效本地日历日期，且来源必须为 `api`。其它来源前缀继续按通用 `externalRef` 规则处理，不被 Task Horizon 约束影响。
- 事件：项目创建/更新/删除/归档和记录新增/删除都可能改变投影；`analytics-updated` 表示派生数据已刷新。`api.subscribe()` 回调中的 `event.type` 不带 `checkin:` 前缀，window CustomEvent 名才带此前缀。订阅回调只表示“数据已变化”，消费方必须重新读取，不应依赖 payload 完整性。
- 刷新事件白名单：处理 `checkin:item-created`、`checkin:item-updated`、`checkin:item-deleted`、`checkin:item-archived`、`checkin:event-recorded`、`checkin:event-deleted`、`checkin:analytics-updated`；忽略 `checkin:suggestion-workflow-updated`。
- 生命周期：沿用能力检测、不可用即降级隐藏、事件刷新和卸载清理。注意 `getCalendarProjection()` 是同步、有界 API，不支持 AbortSignal；合并事件突发即可，不要宣称能通过超时中断该同步读取。对方其他异步 API 的 timeout/Abort 经验不能直接套到此方法。
- 稳定性：API 版本化；破坏性变更升 major 并给过渡期。

## 四、分期

- **P0（打卡侧，既有基础）**：日期摘要/日历投影、`任务打卡` 预设模板、基础幂等写入已提供；legacy 参考 bridge 本次增加当日边界守门。既有能力与本次待验变更不等于合作专项全部完成。
- **P1（Task Horizon 侧，待对方实现）**：日历「小驴打卡」图层；普通任务原生复选框完成回写桥接与设置项（按项目 ID 选择目标打卡项）。
- **P1.1（双方另行评审）**：Task Horizon 内部“打卡循环”事件公开化及其与小驴事件的撤销/补录/多窗口语义；不与 P1 普通任务回写混做。
- **P2（双方）**：真机多窗口/多端联调；把契约固化为双方仓库的 contract test（对齐彼此既有做法）。
- **P3（远期）**：每日摘要写块（外部软件通道）、Today 页任务概览反嵌、第二任务源。

项目级可见性字段与 v5 投影已交付；T-1392/T-1394 继续跟踪消费端与双方现场验收。2026-10-12 来件指出的 C-01/C-02/C-03/W-03 尚未完整就绪：

| 来件项 | 当前缺口 |
| --- | --- |
| C-01 | 远端 Store 合并发生变化后，现有 `analytics-updated` 刷新通知尚未完整覆盖 |
| C-02 | 拟新增的 window `checkin:api-state-changed`（`loading/ready/failed/unavailable`）尚未提供，旧 API 引用仍可能返回旧投影 |
| C-03 | 拟新增的日期级 `point.scheduleType`、顶层 `asOfDate` 尚未提供；当前仅修正配额累计量与日状态的说明 |
| W-03 | 新 Task Horizon 身份的每日次数/正向、显式时刻与单位、值为 1、日期一致且非未来、创建/归档/SKIP 约束尚未形成完整专用校验 |

上表不是能力声明；当前 descriptor 没有发布 `integrationContracts` 合作就绪标记。来件修复、契约冻结和真实宿主验收完成前，不宣称 Task Horizon 已可稳定接入。

## 五、验证与边界

- 自动化：契约测试（假宿主）+ 双方 CI；真机：桌面/移动、双插件加载顺序、热重载、多窗口重复回调不重复记账（沿用 B-007 验收口径）。
- 安全与隐私：消费端由用户决定是否开启只读图层和完成回写，并明确选择写入目标项目；这是消费端启用设置，不是提供端 API 已有的授权状态或权限管理接口。不读取对方私有文件，一切经公共 API。
