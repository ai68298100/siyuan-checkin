# 三组设置状态与空态设计矩阵（T-1554，2026-09-28）

## 定位

- 落实 [联动研究稿「三组都应把目标、动作、状态、问题分开」] 的状态层设计；状态机语义遵循 [T-1604 异步状态契约](async-status-contract-2026-09-28.md)，字段现状依据 [设置字段注册表](settings-field-registry-2026-09-28.md) external/documents/host 组。
- 本稿是设计基线：实施（T-1565/T-1567 切片）按矩阵加 i18n 键与跳转，不改变事件/写入语义。现有渲染锚点：`sourceState` 三态（settings.ts:247）、运行态 `projectIntegrationStatus`（settings.ts:39-53：unprobed/available/missing）、问题态（none/last-read-failed/last-write-failed）、摄取报告 `sourceReportLine` outcome 键（284-288）、`integrationStatus(state, count, controllerAvailable, readOk, writeFailed)` 汇总函数。

## 契约：六类信息分离（每卡固定槽位）

| 槽位 | 内容 | 现状对应 | 禁止 |
| --- | --- | --- | --- |
| 目标 | 写入/读取哪个项目、文档、笔记本（多指标逐项列） | sireader-item、health 映射行、yeguif mappings | 单个「已绑定」徽标概括多指标 |
| 动作 | 该卡真实可执行的操作（按来源类型固定词表） | preview/refresh/pull/load-notebooks | 监听型出现「立即同步」；含义模糊的「立即刷新」 |
| 配置状态 | 未配置 / 已配置未启用 / 已启用 | sourceState: setup / ready / enabled | 与运行状态合并成一个徽标 |
| 运行状态 | 宿主/依赖在场的探测结果 | projectIntegrationStatus: unprobed / available / missing | **未探测显示为已连接**；provider ready 冒充消费端已连接 |
| 活动结果 | 最近一次真实读取/写入的事实 | sourceReportLine outcome 键 + 今日计数（sourceToday） | 用「已同步」替代具体结果 |
| 问题状态 | 需要处理的事 + 修复入口 | problem 三态 + 待处理箱 + completionIssueRow | 无问题时显示空警示区 |

## 状态场景矩阵（每卡逐场景）

六场景对三组所有卡成立；`—` 表示该卡不可能出现此场景（须在实现中穷举核对）：

| 场景 | 判定条件 | 文案要点（zh） | 下一步动作（跳转目标） |
| --- | --- | --- | --- |
| 未配置 | 缺必填前置（无项目/文档/Key/笔记本） | 「{来源}还没有配置{缺失物}」 | 跳到缺失物的具体控件：项目→项目编辑器（带单位要求）；文档→本卡目标选择器；Key→本卡 Key 输入；笔记本→「加载笔记本」 |
| 已配置未启用 | 前置齐、enabled=false | 「{来源}已就绪，尚未启用」+影响面一句话 | 启用开关（就地）；查看边界 |
| 已启用无数据 | enabled=true 且最近结果为空 | 「{来源}已启用，还没有产生记录」+原因分类（等待片段/今日无数据/窗口内无匹配） | 监听型：「等待一个可观察片段」+宿主探测；拉取型：「立即拉取」；摄取型：「预览匹配」；试算台 |
| 最近成功 | 最近 outcome=ok | 「今天已记录 {n} 分钟 · 上次读取 {时间}」 | 查看：回顾记录（带来源筛选跳转） |
| 最近失败 | outcome=read-failed/write-failed | 「上次{读取\|写入}失败：{具体原因}」 | 重试动作 + 待处理箱（写入失败）+ 诊断导出 |
| 宿主未探测/缺失 | controller/provider 探测未完成或缺失 | 「还没有检测到{宿主}」/「{宿主}不可用」 | 宿主探测动作；或回退方案（use-builtin-focus 既有动作） |

- 每卡同一时刻**并行呈现**六槽位（配置+运行+活动+问题各自独立一行/徽标），禁止汇总成一个状态词。
- 失败文案必含具体原因（outcome 键已有 set.sourceReportOutcome.* 粒度）；写入失败必须带待处理箱回链（retry/discard）。

## 逐卡场景可行性（穷举基准）

**A 来源组（5 卡）**：sireader/siplayer（监听）：无「立即拉取」，空数据=等待片段；siplayer 多宿主探测维（siplayerHostState）。weread（拉取）：Key 未配置=未配置场景；门槛字段 enabled+itemId+apiKey+storageReady（index.ts:1249）。health/notequery/yeguif（摄取）：文档/笔记本/映射缺失各有未配置细分；yeguif 笔记本失效自动停用后呈「已配置未启用+原因」。
**B 文档组（4 卡）**：diary：无启用开关语义待 T-1552 核对（手动报告=动作非开关）；summary：docId 缺失拒启=未配置；journal：目标 mode daily/doc 两分支；anchor：块失效=问题态（挂起告警已有）。
**C 宿主组（3+ 卡）**：focus-timer：provider 选择 + 9 态运行 + 回退动作；API/Agent：只有提供状态（provided/registered/4 态），无启用开关；Task Horizon：**恒 waiting**（外部待验），只显示「对方未接入」+契约说明，永不显示已连接。

## 空态跳转规则（全卡统一）

1. 每个空态/未配置态的按钮**直接落到缺失物的控件**并聚焦（设置页内锚点滚动 + 输入聚焦），不做「前往设置页」一级跳转。
2. 跨页跳转（项目编辑器、回顾记录）遵守 T-1603 returnTo 契约：返回原卡并保留展开态。
3. 「列表为空」不等于「没有笔记本」：笔记本加载失败/全部关闭/查询失败各有文案（研究稿绑定专项节）。

## 双语文案模板（实施时按槽位实例化，键名建议 `set.state.*`）

- 状态短语（六场景各一条模板，`{source}`/`{target}`/`{n}` 槽位化）：NotConfigured「{source}还没有配置{missing}」/ ReadyDisabled「{source}已就绪，尚未启用」/ EnabledNoData「{source}已启用，还没有产生记录」/ LastSuccess「上次读取成功 · 今天已记录 {n}」/ LastFailure「上次{op}失败：{reason}」/ HostMissing「还没有检测到{host}」。
- 动作词表（按来源类型固定，T-1553 骨架对齐）：宿主探测 / 立即拉取 / 立即读取 / 预览匹配 / 加载笔记本 / 重新检查 / 查看记录 / 导出诊断。
- 英文句式与 zh 一一对应（i18n-parity 守门核对数量）；禁用词表：「已连接」「已同步」不作为卡级状态词，仅在描述单次成功结果时可出现于活动结果句。

## 验收清单（实施切片对账）

1. 三组每卡六槽位齐备，同一时刻并行呈现；对照本矩阵穷举场景（含 `—` 场景确实不渲染）。
2. 每个空态按钮实测落到缺失控件并聚焦（双主题 + 320px + 键盘）。
3. 未探测/未接入卡（Task Horizon、未装宿主）输出「未探测」而非已连接（T-1549 联合验收）。
4. 失败态四要素（T-1604 契约 4）逐卡核对；写入失败带待处理箱回链。
5. 新增 `set.state.*` 键入 i18n-parity；动作词与 T-1553 卡片骨架词表一致。
