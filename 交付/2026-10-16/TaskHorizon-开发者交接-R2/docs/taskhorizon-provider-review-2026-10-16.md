# Task Horizon 来件十项处理清单 R2

核查日期：2026-10-16。代码基线：小驴打卡 v18.17.6，commit `97d8ae94065f1bc16a343a4f6d4ce865dcc96548`。R2 为材料修订，未修改该版本生产代码。

主入口：[开发者合作说明](taskhorizon-developer-handoff-2026-10-16.md)。本表对照原始来件，不将计划或基础 API 能力写成合作已交付。

## 原始文件处理

- 对方 2026-10-12 来件 `checkin-provider-fix-guidance.zh-CN.md` 原件保留且未修改，已有[逐字节归档副本](contracts/incoming/checkin-provider-fix-guidance-2026-10-12.zh-CN.md)。无需重新发送。
- 原件与归档副本 SHA-256：`656c79e3f6a7d85ae85bcd2d28739c9d382e00a9953a1517149261fbf0965599`；归档文件禁用 Git 文本行尾转换。
- 原件核查基线是我方 18.17.3，其 `index.js` SHA-256 为 `f6d386f2032210579682bc9d22c5af7a4b0bbcd4c1454cda475862bad94b3931`。这不是 18.17.6 的源码或安装包摘要。
- 旧合作设计、Issue 草案、v4 manifest、bridge 各有历史用途。本次不把它们整体当作新合作生产方案，精简包以 R2 主说明为准。

## 十项对账

源码与测试可在 [v18.17.6 固定检出](https://github.com/ai68298100/siyuan-checkin/tree/v18.17.6) 核对；下列路径均相对此代码基线。R2 新修文档以本附件为准。

| ID | 当前结论 | 证据与缺口 | 后续动作 |
| --- | --- | --- | --- |
| C-01 远端 Store 合并通知 | 待开发 | `src/index.ts` 的 `enqueueMutation/reconcileStore` 会失效摘要和重绘，但远端合并变化未广播 `analytics-updated` | 变化恰一次、无变化零次；覆盖写前合并、只读协调、后续业务失败；卸载后不通知 |
| C-02 API 生命周期 | 部分底座已有，新增契约未交付 | `src/api.ts` 有 ready/failed、重试；卸载保护全局引用；无 window `checkin:api-state-changed`；`isReady()` 不保证仍为当前全局引用 | 补 loading/ready/failed/unavailable；两个加载顺序、失败重试、热重载、旧实例迟到卸载；消费者 await 后复验当前 API 与 true 就绪 |
| C-03 日历兼容语义 | 说明已纠正，增量字段待开发 | `src/features/calendar-projection.ts` 保留六状态；配额日 complete 仅当日有贡献；quotaRate 为实际投影末日所属周期累计量；point 无 scheduleType，顶层无 asOfDate | 补日期有效类型、本地 as-of 与历史修订 fixture；未来 atMost 空日不显示为已达成；保留数值兼容 |
| C-04 范围与截断 | 实现已有，18.17.6 已补验收 | `tests/calendar-projection.test.cjs` 覆盖非法/空/反向拒绝，超过 366 天或 200 项截断并设 truncated | 超限时 endDateExclusive 仍为请求上界；消费端须按实际 points 与 truncated 提示覆盖边界 |
| W-01 batch/single 身份一致 | 18.17.6 已修复 | `src/features/api-v5.ts` 复用 isTaskHorizonExternalRef；`tests/api-v5.test.cjs` 覆盖合法/非法身份、重复与未知前缀兼容 | 不将 Task Horizon 身份限制扩大至其它来源 |
| W-02 历史方向修订 | 18.17.6 已修复 | batch 使用 getItemDirectionForDate；测试覆盖两个方向历史切换及历史单位 | 按落账日期有效修订判定，保留通用非排期 logged |
| W-03 合作专用新事实限制 | 待开发 | 未强制 count+daily+atLeast、显式时间/单位/value=1、身份日一致、非未来、SKIP；现 not-scheduled 仅创建/归档可用期；重复检查先于墓碑；Date.parse 可将非法月日/24:00 滚日 | 固定“格式→墓碑→已存/批内重复→新事实业务校验”；严格日期时间不滚日。新规则不能覆盖既有 duplicate，墓碑不得重放 |
| W-04 宿主失败与逐项回执 | 18.17.6 已修复并补行为测试 | `src/index.ts` 的公开 batch 在队列未执行、刷新失败、回执非数组/长度异常时 reject；测试覆盖排队卸载、写失败、落盘后确认/反馈失败及原身份重试 | **宿主级 Promise 拒绝**表示未取得可靠批量回执，可能已有事实落盘；逐项 rejected 不作此解释。正常数组输入 1:1，recorded/duplicate 带 eventId |
| W-05 调用时输入快照 | 18.17.6 已修复 | 公开 batch 入队前捕获数组和标量对象；行为测试覆盖排队期间改字段、替换输入与长度变化 | 消费端传普通数据对象；改写原输入不能取消已提交意图 |
| W-06 重试归属与入口 | batch 底座已有，合作迁移未收口 | batch 写失败回滚并拒绝，不调用 single 的 pending 恢复；旧 bridge 仍用 single，不能当新合作生产参考 | 单条也必须 v5 batch；消费端持久化队列；补 batch 失败→重载→无 single pending 自动补写及参考消费层验收 |

## 本次复核新增的实际问题

纯生产规划器复现 `2026-02-30T10:00:00+08:00`、`2026-04-31T10:00:00+08:00` 和 `2026-02-28T24:00:00+08:00` 被接受并归一化。仅运行 `planBatchRecord`，无宿主写入或用户数据；详见 [验证记录](taskhorizon-validation-2026-10-16.md)。此问题并入 W-03，尚未修复。

R2 同时修正旧材料中的接线歧义：新合作必须 batch；基础能力探测不代表合作就绪；不把 `not-scheduled` 解释为星期排期校验；不把同步投影描述为可中断；不把所有失败都说成“可能已落盘”。

## 分工及完成条件

当前 `describe()` 不提供两个合作标记。由我方先补 C-01～C-03 和日历 fixture，全部通过后发布拟议 `taskHorizonCalendar: 1`；再补 W-03/W-06、batch 消费参考与重载 fixture，全部通过后发布拟议 `taskHorizonCompletion: 1`。对方可先评审范围和准备 UI，正式接入待对应候选版与契约对齐。

对方负责图层及消费端接线、用户设置、固定目标映射、持久化队列与原身份重试；我方负责 provider、统一业务计算、去重、墓碑与回执。双方现场验证两种加载顺序、重载、多窗口、移动端、跨午夜与时区、历史修订、失败重试。mock/provider 测试不等于双插件现场通过。

我方掌握的对方源码仅到 2026-10-10 的 v3.1.8 快照 `58ec06f23627962d0e83794611826ba4cfebb832`；不据此推断对方当前版本和实现进度。内部循环的取消、撤回及双向对账另立契约。

验证、复现命令及发布资产摘要见 [验证记录](taskhorizon-validation-2026-10-16.md)。可转发文字见 [回复稿](taskhorizon-reply-2026-10-16.md)。
