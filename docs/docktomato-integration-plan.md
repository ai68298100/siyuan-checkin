# Dock Tomato 联动准备

Dock Tomato 公开提供 `window.__dockTomatoStatsFacade`（同时挂载到 `window.__dockTomato.stats`），门面包含 `listSessions`、`queryFocus`、`queryRoutine` 等只读查询，并广播 `tomato:stats-availability-changed`。标准化 session 包含阶段、开始/结束时间、`sessionKey`、`isCompleted`、计划时长和任务块 ID。

联动应采用可选适配器：能力探测通过后按日期范围查询完成 session；以 `isCompleted === true` 和有效结束时间为准；通过用户把任务块 ID 映射到打卡项目；写入 `source: "docktomato"`、`externalRef: "docktomato:<sessionKey>"`，使用现有 externalRef 去重；结束时间作为记录时间，value 默认 1。没有映射、被放弃或未完成的 session 不自动写入。

当前已准备兼容 PR 草案：由 Dock Tomato 增加版本化、消费方无关的 focus facade 和持久化后完成事件，小驴打卡负责适配器注册及幂等写入。完整范围、失败策略、测试矩阵和后续合作空间见 [docktomato-compat-pr-draft.md](docktomato-compat-pr-draft.md)。用户确认前不创建或推送对方仓库 PR。

## PR #5 评审后的消费端契约（2026-09-19 定稿，D-235~D-237）

按 `checkin-docktomato-fix-plan.zh-CN.md` 的评审结论，小驴侧已完成修复；对 Dock Tomato（提供方）的对应要求如下：

**启动与会话**

- `focus.start()` 的返回值必须携带最终 `focusSessionId`（同一个启动事务内持久化的身份），消费方拿到空/缺失 sessionId 会报 `DOCK_TOMATO_START_UNCONFIRMED`，不接管、不暂停。
- 建议在 focus v1 中新增能力 `pause-session` 与 `pause({sessionId})` 原子调用：提供方在同一串行边界内校验「联动开启 + 当前为 focus 阶段 + focusSessionId 匹配」后才暂停；不匹配抛 `DOCK_TOMATO_SESSION_MISMATCH`，联动关闭抛 `DOCK_TOMATO_INTEGRATION_DISABLED`。消费方仅在 capabilities 含 `pause-session` 时携带参数调用。
- 无 `pause-session` 时消费方以 getStatus 守门（active + sessionId 匹配 + mode ∈ countdown/stopwatch）后调用旧 `pause()`，只能缩小误暂停窗口，不能提供跨会话保证。
- 休息阶段可能沿用父专注的 sessionId；消费方对非 focus 阶段一律只释放归属、不暂停。

**生命周期**

- `tomato:focus-api-availability-changed` 事件应携带 `{available: boolean}` detail。`available:false` 时消费方立即解绑并短期失效该 facade 对象；`available:true` 是同一对象恢复注册的唯一途径。无 detail 的旧事件保持兼容。
- 状态判定优先级：对象存在 → 版本/方法/能力 → status 可读 → `ready` → running/paused。`ready:false` 时即使 active/paused 为真也不视为可调用。
- 注销/替换/卸载均为纯解绑（消费方内部以 `{stopActive:false}` 注销），不模拟用户停止；已启动的计时继续运行。

**完成回写**

- `tomato:focus-session-completed` 的 detail 必须包含有效 `completedAt`（ISO 时间戳）与整个会话的实际累计 `durationMinutes`（不是计划时长、不含暂停、不得从提交后的累计状态重复加片段）。缺失/无效 completedAt 会被消费方以 `invalid-completion-time` 拒绝，不回退为接收时间。
- 消费侧写入顺序：已入账（duplicate）→ 用户已撤销（user-removed，永不补回）→ 项目可用性/映射（blocked：missing-item / archived-item / not-scheduled / mapping-changed / at-most-item / skipped-day）→ 写入。归档项目的既有记录按 duplicate 处理，不再误报 missing-item。
- 戒除类（`direction: "atMost"`）目标不参与自动专注打卡；完成日已有跳过（skip）时通知置 blocked，由用户决定，不静默删除跳过。
- 消费方在私有存储 `checkin-docktomato-inbox` 中持久化已接收未入账的通知，按 1s/5s/30s 重试暂时性失败；跨窗口经存储锁合并。**该收件箱只覆盖「已接收」的通知**，不能弥补提供方进程崩溃导致的事件未送达；提供方仍须保证完成事件只在持久化成功后产生一次。


## 交付清单（定稿，2026-09-20,按修复方案第十节要求）

**修改源文件列表**（消费端,自 17.1.0 基线 `7efdc63` 起 5 个提交）：

- `src/render/focus-adapter.ts` — 启动后校验拆分、`focusMappingFingerprint`（修订+direction+tomatoMode）、`releaseFocusAdapterFor` 纯清理、错误码翻译（6 个）。
- `src/dock-tomato.ts` — 会话归属（ownedFocus）、守门停止与 `pause-session` 能力协商、available:false 即时解绑与失效登记、诊断优先级 ready 前置、完成判定重排（结构→duplicate/user-removed→项目可用性,含归档项目参与判定）、宿主回写通道。
- `src/features/docktomato-inbox.ts`（新增）— completedAt 严格时钟、载荷规范化、收件箱存储模型（容量/合并/冲突/重试节奏）、完成值单一边界。
- `src/index.ts` — 卸载纯解绑（跨插件计时器不暂停）、收件箱存取与「先缓冲再处理」、宿主内部写入器（存储锁内、显式五类结果、按完成日期修订校验、atMost/skip/墓碑/自动归档/锚点旁路）、墓碑投影、恢复入口与重试唤醒。
- `src/api.ts` — `registerFocusAdapter` 注销回调支持 `{stopActive:false}` 纯解绑（默认行为不变,兼容第三方）。
- `src/render/bind-today.ts` — 戒除类（atMost）专注入口禁用并说明原因。
- `src/render/settings.ts` + `src/i18n.ts` — 5 个新诊断理由与全部新增文案（中英,字典 1097 键对等）。
- 测试:新增 `tests/focus-adapter.test.cjs`、`tests/docktomato-inbox.test.cjs`;重写/扩展 `tests/dock-tomato-bridge.test.cjs`、`tests/dock-tomato-completion.test.cjs`、`tests/dock-tomato-integration.test.cjs`。

**接口能力与错误码**：消费。REQUIRED: `status/start/pause/completion-event`（不变）;可选: `pause-session`（存在则 `pause({sessionId})` 原子按会话暂停）。新增错误码：`DOCK_TOMATO_START_UNCONFIRMED`（启动返回缺 sessionId,不接管）、`DOCK_TOMATO_SESSION_MISMATCH`、`DOCK_TOMATO_INTEGRATION_DISABLED`（预留,提供方抛出后分别解释）。`tomato:focus-api-availability-changed` 约定携带 `{available:boolean}` detail;`tomato:focus-session-completed` 必须含有效 ISO `completedAt` 与会话实际累计 `durationMinutes`。

**存储 schema 与迁移**：新增私有存储 `checkin-docktomato-inbox`,外层 `{schemaVersion:1, items:PendingCompletion[]}`,单条字段 identity/externalRef/itemId/itemUnit/tomatoMode/durationMinutes/occurredAt/localDate/state(pending|blocked)/attempts/nextAttemptAt/lastError/receivedAt/updatedAt;容量 200 条,满员显式拒绝。主存储结构不变（仍为 v3）,无需迁移;旧版本插件不读取该存储,升级/回滚均无副作用。

**运行测试结果**：`pnpm run check` 通过;`test:quality` 全链 exit 0（129 个测试文件、0 退役）,其中消费端专项 5 个测试文件覆盖：启动后误暂停复现、会话归属与五重守门、available 风暴、迟到启动归属、休息阶段、完成判定矩阵（completedAt/墓碑/归档/atMost/skip）、收件箱合并冲突与重试节奏、宿主通道 undefined 防误判。生产包 SHA-256 `7c00aefb…`（发布说明逐字核对）。

**真实客户端验收结果**：自动化不能替代真实宿主。开始→暂停→继续→完成→打卡全流程、关闭/重开联动、双窗口与移动端行为,仍待与修订后的底栏番茄钟在真实思源桌面端/移动端联调验收（B-007 跟踪）；在完成前,本交付不宣称所有宿主场景不受影响。
