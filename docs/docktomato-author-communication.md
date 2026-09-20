# 致底栏番茄钟作者：PR #5 修订请求与合作说明

> 以下内容可直接复制发给 5kyfkr（底栏番茄钟作者）。中文撰写，GitHub PR 评论或 QQ 群均可。

---

你好！我在小驴打卡（siyuan-checkin）侧完成了对你 focus API 的全部消费端实现和测试。你之前反馈的问题我都已落实，现将需要你在 PR 中配合修改的要点整理如下。

## 需要修改的 6 点

### 1. `focus.start()` 返回值必须携带最终 `focusSessionId`

当前 PR 中 `recordStartTime()` 会清空预分配的 `currentSessionId`，导致返回的 sessionId 为空或与实际不符。请在**同一个启动事务**内将外部 context 及最终 `focusSessionId` 持久化，并在返回值中携带。消费方拿到空 sessionId 会报 `DOCK_TOMATO_START_UNCONFIRMED` 并放弃接管（不会误暂停你的计时器）。不要在 `await startTimer()` 之后再修正内存字段。

### 2. 新增 `pause-session` 能力 + `pause({sessionId})` 原子按会话暂停

在 capabilities 中新增 `"pause-session"`。`pause` 方法接受 `{sessionId}` 参数，在控制计时状态的同一串行边界内校验：
- 联动仍开启（否则抛 `DOCK_TOMATO_INTEGRATION_DISABLED`）
- 当前阶段为 focus（非 break/rest）
- 当前 `focusSessionId` 等于请求的 `sessionId`（否则抛 `DOCK_TOMATO_SESSION_MISMATCH`）

校验通过后才执行暂停。当前无活动会话时返回当前状态作为幂等无操作。消费方仅在 capabilities 包含 `pause-session` 时才携带参数调用。

### 3. `tomato:focus-api-availability-changed` 事件携带 `{available: boolean}` detail

`available: false` 时消费方立即解绑并短期失效该 facade；`available: true` 是恢复注册的唯一途径。请确保关闭联动开关时发出 `available:false`，开启时发出 `available:true`。

### 4. `tomato:focus-session-completed` 事件必须携带有效 `completedAt` 和实际累计 `durationMinutes`

- `completedAt`：ISO 8601 格式的完成时间（不是接收时间）。消费方以此入账，缺失或无效会被拒绝。
- `durationMinutes`：整个会话的**实际累计投入分钟数**（accumulatedMs + 未结算片段），不是计划时长；暂停时间不计入；不要从已更新过 `accumulatedMs` 的提交后状态重复计算。

### 5. 新增第三方联动开关（默认关闭）

新增一个设置项控制是否发布 focus API 和完成事件，默认 `false`。关闭时不发事件、不写适配 context。开启和关闭本身不暂停/重置当前计时。统计（`__dockTomato.stats`）和任务管理联动不受此开关影响。

### 6. 并发启动互斥

在共享状态修改之前进入串行启动边界；两个 start 同时到达只允许一个成功。不要在音频初始化 await 之后再检查是否有现有会话。

## 消费端已就绪的部分

小驴打卡侧已完成以下工作（代码已在 GitHub `ai68298100/siyuan-checkin` main 分支）：

- 会话归属：start 必须返回非空 sessionId 才接管；停止按会话守门（provider/失效/active/sessionId/阶段五重校验）
- `available:false` 即时解绑 + 卸载/替换纯解绑（不暂停外部计时器）
- 完成回写：持久收件箱 + 幂等重试（1s/5s/30s）；跳过日保护；atMost 戒除类保护；自动归档兼容
- 锚点回写、批量写、范围读、指标门面等配套能力

### 测试证据

消费端通过完整质量链（143 个测试文件全绿）+ 真实思源 3.8.4 内核 E2E（16 项场景全过），包括番茄完成入账/重复幂等/跳过日 blocked/收件箱手动管理/移动端。详见 `docs/docktomato-integration-plan.md` 的交付清单节。

## 其他

- 上游 main 已前进到 v2.2.9，PR 需先 rebase
- 消费端在小驴打卡 v17.2.0 中已就绪，等你的 focus API 版本发布后即可联调
- 完整协议与交付清单见：`docs/docktomato-integration-plan.md`（siyuan-checkin 仓库）

---

## 操作步骤总结

| 步骤 | 操作 | 说明 |
|---|---|---|
| 1 | 发版小驴打卡 v17.2.0 | push main + tag + GitHub Release（含 package.zip） |
| 2 | 修改 PR #5 代码 | 按上述 6 点修改底栏番茄钟仓库的 `codex/checkin-focus-api` 分支 |
| 3 | Rebase | 上游 main 已到 v2.2.9，先 rebase 再推 |
| 4 | 通知对方 | 将本文档内容发给 5kyfkr |
