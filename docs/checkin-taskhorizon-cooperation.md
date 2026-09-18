# 小飞驴打卡 × Task Horizon 合作设计

> 目标：把「当天打卡内容」接入 Task Horizon 的日历等视图，并把「任务完成」接入打卡的记录体系，形成任务↔习惯的闭环。
> 状态：打卡侧 P0 v1 已落地（2026-09-18），可供双方评审。日期摘要 API 与预设模板已就绪，Task Horizon 侧需新增消费层。

## 一、双方现状

### Task Horizon（思源任务管理器）
- 任务 = 原生复选框块 + 受管属性（状态/日期/重要性/循环/番茄等），跨文档汇总。
- 视图：清单/表格/时间轴/看板/日历/白板/主页总览；支持 ICS 订阅与 AI 能力注册。
- 跨插件经验：与底栏番茄钟联动——经 `globalThis.__dockTomato.stats.queryFocus(options, {signal})` 查询专注统计（能力检测 + 超时 + AbortSignal 取消 + 契约测试 `scripts/focus-statistics-service-contract.test.js` 等）；并有「积分联动奖励」，仅在用户点击原生复选框完成任务时触发。

### 小飞驴打卡（本插件）
- 公共 API：`window.siyuanCheckin`，协议 `siyuan-checkin`，版本 4，能力协商（14 项能力，含 items.read / events.read / events.record / occasions.* / summary.* / analytics.read / integrations.events / export.* / focus.adapters）。
- 集成事件（window 广播）：`checkin:item-created|item-updated|item-deleted|item-archived|event-recorded|event-deleted|analytics-updated|suggestion-workflow-updated`。其中 `item-archived` 仅在自动归档成功后广播，携带项目快照；手动归档保持 `item-updated` 兼容行为。
- 记录写入：`recordEvent({itemId, value, unit, source:"api", note, externalRef})`——**externalRef 幂等**，重复投递返回 undefined，多窗口/重放安全。
- 项目模型：配额型项目（按记录数或按达成天数，目标 N），当天达到目标即"完成"；另有农历、提醒、成就、统计和已落地的自动归档（T-1161）。

## 二、合作空间（三层）

### L1 显示合作：当天打卡进 Task Horizon 日历
- Task Horizon 日历新增「打卡」图层：经 `window.siyuanCheckin` 协商后，用 `analytics.read`（按日聚合快照，含点数上限）或 `events.read`（半开区间明细）读取指定日期范围的完成情况，在日历格渲染徽章/进度。
- 刷新：订阅 `checkin:analytics-updated` / `checkin:event-recorded` 两个 window 事件即触发重查，无需轮询。
- 降级：未安装、未加载、未授权或协议不兼容时隐藏图层（与番茄钟未安装时隐藏专注模块同款策略），服务恢复自动刷新。

### L2 写入合作：任务完成 → 打卡（"完成 N 个任务 = 打卡完成"）
- 打卡侧建一个配额型项目（如「任务打卡」，按记录数目标 N=设定任务数）。
- Task Horizon 在**原生复选框完成回调**（与积分联动同一触发纪律：仅用户真实点击，后台同步/重放不触发）调用：
  `recordEvent({itemId, value: 1, unit: "个", source: "api", externalRef: "taskhorizon:<blockId>:<localDate>"})`
- 幂等键含任务块 id 与本地日期：同一任务重复勾选/同步重放只记 1 次；当天累计 N 条即达成目标。
- 可与自动归档组合（如"完成 30 天后自动归档"），闭环不再需要手动管理。

### L3 生态位：通用任务源与外部软件
- recordEvent 契约即"外部完成源"通用入口：Task Horizon 之外，未来 GitHub Issue、桌面自动化、手机快捷指令皆可经同一路径写入（externalRef 前缀区分来源，如 `taskhorizon:` / `shortcuts:`）。
- 插件数据为本地存储不经内核；外部软件短期走导出 JSON/CSV；中期可评估「每日摘要写入驻留文档」，外部工具经思源内核 API 读取（需隐私评估，另行立项）。

## 三、契约要点（打卡侧承诺）

- 探测：`window.siyuanCheckin` 存在且 `protocol === "siyuan-checkin"`、`version >= 4`，按 `capabilities` 确认所需能力可用。
- 读：`analytics.read` 快照（含日期范围与点数上限，localOnly）；`events.read` 半开日期区间、保持原持久顺序。为日历等轻量图层提供 `siyuanCheckin.getEventRangeSummary({startDate, endDateExclusive}, {maxEvents?, maxPoints?})`：仅按本地日期返回 `{localDate,eventCount,totalValue,totalsByUnit}` 点，默认最多 366 天/5,000 条事件/366 个点，超出时返回 `truncated: true`；输入范围超过 366 天或非法直接拒绝。返回值为防御性投影，不含 store、附件或私有事件对象。
- 写：`events.record`（见 L2）；返回 `undefined` 视为重复或拒绝，不应重试提示。
- 事件：`checkin:analytics-updated`（聚合变化）、`checkin:event-recorded`（新记录）和 `checkin:item-archived`（自动归档成功）用于增量刷新；手动归档继续监听 `checkin:item-updated`。
- 风格：与 `__dockTomato.stats.queryFocus` 同款——能力检测、超时、AbortSignal、不可用即降级隐藏。
- 稳定性：API 版本化；破坏性变更升 major 并给过渡期。

## 四、分期

- **P0（打卡侧，自研可完成）**：本契约文档定稿；评估补一个「按日期区间的事件摘要」便捷读法；新增「任务打卡」预设模板（配额按记录数）。
- **P1（Task Horizon 侧）**：日历「打卡」图层；原生复选框完成回写桥接与设置项（选择目标打卡项）。
- **P2（双方）**：真机多窗口/多端联调；把契约固化为双方仓库的 contract test（对齐彼此既有做法）。
- **P3（远期）**：每日摘要写块（外部软件通道）、Today 页任务概览反嵌、第二任务源。

## 五、验证与边界

- 自动化：契约测试（假宿主）+ 双方 CI；真机：桌面/移动、双插件加载顺序、热重载、多窗口重复回调不重复记账（沿用 B-007 验收口径）。
- 安全与隐私：默认只读能力需用户授权开启；写入仅限用户明确选择的目标项目；不读取对方私有文件，一切经公共 API。
