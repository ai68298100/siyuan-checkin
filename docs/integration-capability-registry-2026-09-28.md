# 三组联动能力专项视图（T-1545，2026-09-28）

## 定位

- 从 [唯一注册表 §10/§13-16](capability-registry-2026-09-28.md) 派生的联动专项视图；三组划分沿用 [联动体验研究稿](integration-experience-design-2026-09-28.md)：**A 行为自动打卡**（产生事件）、**B 结果写入笔记**（产生文档输出）、**C 供其他工具使用**（对外契约）。
- 每卡九字段：用户目的 / 前置依赖 / 数据方向 / 触发 / 项目绑定·单位 / 最终产出 / 失败·停用·换绑 / UI 入口 / 证据。登记的是代码实况，不新造语义；与 [设置字段注册表](settings-field-registry-2026-09-28.md) 的 external/documents 组逐字段对应。

## 归属核对结论（先纠偏，卡片以本节为准）

- **问卷、笔记锚点属于 B 输出组**——它们在打卡动作发生时写文档，不产生事件；编辑器里的绑定入口（editor-field-registry #10/#19）是 B 组的配置面。
- **笔记推导（notequery）属于 A 组**——它读文档行但产出**打卡事件**（不是文档输出）；「读文档」不等于「写入组」。
- **Dock Tomato 是双向关系**：小驴作为**消费方**吃对方完成事件（docktomato: 身份）；同时小驴公开 `registerFocusAdapter` 让**其他插件**注册为专注提供方（api.ts:254-278）。设置页「默认专注提供方」只选择消费谁，不改变两方向的归属。
- **Task Horizon 双向**：写方向=对方经 API 写任务完成事件（source="api"、`taskhorizon:<blockId>:<localDate>` 幂等，ecosystem.ts:54-60）；读方向=小驴提供 calendar 只读投影（buildCalendarProjection）。能力协商参考层已备（contracts/siyuan-checkin-contract/calendar-consumer.mjs），**真实互置外部待验**。
- **API 写面的防伪造**：外部调用者声明 sireader/siplayer/weread/yeguif 来源一律回落 source="api"（api.ts:238-239）——五个内部来源身份只有插件内部适配器能写。

## A 组：行为自动打卡（产生事件）

| 卡 | 用户目的 | 前置依赖 | 数据方向 | 触发 | 绑定·单位 | 最终产出 | 失败·停用·换绑 | UI 入口·证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 手动记录 | 打卡事实本体 | 无 | 本地 | 点卡片/精确录入/NLP 速记/右键跳过 | 项目自身 kind/unit | 事件（source=manual） | persist 失败回滚+重试条；撤销走墓碑 | 今日卡（registry §1）；model 单一实现 |
| A2 思阅 sireader | 阅读时长自动入账 | 思阅插件在运行（window 事件） | 宿主→小驴（监听） | reader:focus/blur 生命周期（index.ts:1066-1075） | 单项目绑定，**须分钟单位**（3886-3943） | 片段事件 `sireader:<itemId>:<startUnixMs>:<localDate>` | 断开保留事件（planSourceDisconnect:3902）；persist 失败入待处理箱；**跨窗口会话身份外部待验（T-1508）** | 设置 external/sireader 面板；sireader-adapter.test |
| A3 思播 siplayer | 视频观看时长自动入账 | 思播 controller 特征（siplayer-adapter.ts:125-128） | 宿主→小驴（15s 轮询） | 采样到有效整分钟 | 单项目绑定，分钟单位 | 片段事件（精确开始毫秒身份） | 断档>3x 周期丢弃（57-65）；其余同 A2 | 设置 external/siplayer 面板 |
| A4 微信读书 weread | 阅读时长/完读/笔记自动入账 | weread API Key（仅本地存储） | 出站拉取（官方日汇总） | 手动拉取 + 启动/定时 | 三项目绑定（时长/完读/笔记）；日汇总口径，**不伪造片段** | 日汇总事件（三种 ref 形态） | Key 留空保留；失败整体回滚（4108-4128）；前缀级墓碑（1315） | 设置 external/weread 面板；weread-adapter.test |
| A5 健康 health | 步数/体重自动入账 | 内核 SQL + 绑定收件箱文档 | 文档摄取（读） | 5 分钟轮询（index.ts:1891） | **多指标映射**（metric→项目），单位不符强制停用 | 日事件 `health:<itemId>:<metric>:<date>` | 无 docId/映射/单位拒启（3944-3974）；换绑保留历史 | 设置 external/health 面板+试算台 |
| A6 笔记推导 notequery | 按文档字段/标签自动打卡 | 目标笔记本/文档 | 文档摄取（读） | 轮询 | 单项目+字段/值/标签匹配 | 事件（source=api 内部写入） | 非法字段 fail-closed 关摄取（DECISIONS D-290 区段）；显式保存未入变更清单（T-1561 缺口） | 设置 external/notequery 面板+试算台 |
| A7 叶归 yeguif | LifeLog 时间记录转打卡 | 叶归插件写标记文档 | 文档摄取（读） | 5 分钟轮询，上限 200 块（index.ts:1904） | **多映射**（项目名→目标，未命中跳过）；分钟单位 | 区间结算事件（blockId+日期幂等） | 笔记本失效自动停用（4196-4202）；映射改写保留旧事件 | 设置 external/yeguif 面板；yeguif-adapter.test |
| A8 Dock Tomato（消费方） | 用番茄插件的专注入账 | Dock Tomato 插件（9 态探测，dock-tomato.ts:103） | 宿主→小驴（完成事件） | 对方 start/pause/completion | 项目 completionSource=tomato + tomatoMode | 事件 `docktomato:<sessionId>`；15 类拒绝 reason（:125） | 未就绪降级提示（今日 9 态文案键）；完成问题进收件箱（容量 200）；幂等+墓碑（553） | 今日专注按钮+设置 host 组；dock-tomato-* 测试 |
| A9 内置专注计时 | 无番茄插件时计时入账 | 无 | 本地 | 手动开始/结束 | 项目 completionSource=manual | 事件（≥1 分钟入账） | atMost 项目禁用；重载不恢复（T-1596 缺口） | 今日专注按钮；focus-timer.ts |
| A10 公开 API 写入 | 第三方工具记打卡 | 宿主注册 API | 第三方→小驴 | 调用 recordEvent/recordEventsBatch | 调用方指定 itemId（存在+未归档+非 atMost 校验） | 事件 source=api，`itemId\0api\0externalRef` 幂等 | blocked 五原因明示（api-v5.ts:201-221）；墓碑拒复活 | docs/contracts/checkin-api-v5.json；api-v5.test |
| A11 Agent 记录/建项 | AI 助手代办打卡 | 宿主 Agent API | AI→本地 | 会话动作 | checkin-record-event/create-item（单位校验、同名拒绝） | 事件/项目 + 审计 | 冲突报错；审计导出 | agent-capabilities.ts:160/277 |

## B 组：结果写入笔记（产生文档输出）

| 卡 | 用户目的 | 前置依赖 | 数据方向 | 触发 | 目标 | 最终产出 | 失败·停用·换绑 | UI 入口·证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B1 日记报告 diary | 把当天打卡汇总进日记 | 文档目标（docId 校验保存） | 小驴→文档 | **手动**「立即写入」（开关是执行门槛 → T-1552 核对） | 指定文档 | 追加报告块 | 无 docId 拒启；写入失败不影响事实 | 设置 documents/diary；writeJournalEntry 同族 |
| B2 摘要驻留 summary | 目标文档常驻最新摘要 | 文档目标 | 小驴→文档 | 打卡后自动（常驻语义） | 指定文档 | 更新驻留块 | 失败保留事实；开关无 docId 拒启 | 设置 documents/summary |
| B3 问卷答案 journal | 答题内容留存笔记 | 问卷模板 + 目标（daily/doc） | 小驴→文档 | 打卡动作=填问卷时 | 当日日记或指定文档 | `lv-checkin-journal:<模板>:<日期>` 定位块 | **事实先落盘、文档失败不回滚**；幂等查重（SQL）；重填不重复记事实（index.ts:899-923） | 今日问卷弹窗；journal-experience.test |
| B4 笔记锚点 noteAnchor | 项目状态回写到指定块 | 块 ID（非法显式拒绝） | 小驴→文档块 | 打卡/撤销后回写 | 指定块（可追加备注） | 更新插件自写块 | 挂起告警（anchorSuspended）；失败不影响事实 | 编辑器锚点区；note-anchor*.test |

**B 组共同边界**：全部经 T-1552 五段式待重构（写入内容/触发/目标与块所有权/预览/最近结果）；文档写入失败**永不回滚打卡事实**；块所有权=只更新插件自写块，不改用户正文。

## C 组：供其他工具使用（对外契约）

| 卡 | 用户目的 | 方向 | 能力面 | 状态 | 证据 |
| --- | --- | --- | --- | --- | --- |
| C1 公开 API v5 读面 | 第三方查询打卡数据 | 出（只读） | store/items/events/range/streaks/calendar/strength/export；限额 366d/5000、投影服务端过滤 | **已交付**；真实消费方 host-pending（T-1366） | api.ts:142-233 |
| C2 公开 API v5 写/注册面 | 第三方记事件、注册提供方 | 入 | recordEvent/batch、completeOccasion、setItemArchived（指纹锁）、registerFocusAdapter/SummaryProvider、subscribe 8 事件 | **已交付** | api.ts:235-318 |
| C3 Task Horizon | 任务完成事件入账 + 对方读日历 | 入+出 | 写：taskhorizon: 前缀幂等；读：calendar projection（at-most 专用状态）；协商参考层就绪 | **外部待验**：对方未实现，设置页恒 waiting（settings.ts:465） | ecosystem.ts:11-94；contracts/siyuan-checkin-contract/ |
| C4 Agent 能力 | AI 会话内查询/记录 | 入（读 7+写 4） | 每项声明 effects；未就绪统一报错；审计留存 | **已交付**（旧宿主降级） | agent-capabilities.ts:40-335 |
| C5 Dock Tomato 提供方协商 | 让别的专注插件为我服务 | 入 | registerFocusAdapter（注销不模拟用户停止）；业务指纹含方向/计值 | **已交付** | api.ts:254-278；focus-adapter.ts |

## 失败与状态通用规则（A/B/C 共用，登记一次）

- 事件写入失败：persist 回滚 → **外部来源失败进待处理箱**（仅 persist 失败，五闸重试决策，满员显式拒绝；external-pending.ts:44-200）→ 设置页可见 retry/discard。
- 文档写入失败：**不回滚事件**；问卷场景页内 retryHint，重试幂等。
- 停用来源：保留既有事件（planSourceDisconnect/失效自动停用各卡已注）；换绑/映射改写不重算历史。
- 状态呈现：配置状态（enabled/ready/setup）与运行状态（unprobed/available/missing）分开——**「已启用」不冒充「已产生记录」**；未探测不显示已连接（T-1549 收口对象）。
- 触发条件未满足的外部项（Task Horizon 互置、思阅/思播跨窗口身份、真实第三方消费）一律 `host-pending`，不混入本地里程碑。
