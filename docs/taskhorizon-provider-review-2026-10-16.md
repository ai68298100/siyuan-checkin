# Task Horizon 来件处理与当前验收清单

核查日期：2026-10-16。提供端验收版本：小驴打卡 18.17.6。此清单以当前源码和测试为依据，正式发布状态见对应 GitHub Release。

## 原始文件如何处理

- 对方原件：`checkin-provider-fix-guidance.zh-CN.md`，2026-10-12 来件，原文件仍保留，未修改。
- 仓库逐字节归档：[原件](contracts/incoming/checkin-provider-fix-guidance-2026-10-12.zh-CN.md)。SHA-256：`656c79e3f6a7d85ae85bcd2d28739c9d382e00a9953a1517149261fbf0965599`。
- 原件核查的是我方 18.17.3 发布包；其 `index.js` SHA-256 为 `f6d386f2032210579682bc9d22c5af7a4b0bbcd4c1454cda475862bad94b3931`，不能把它当成本次源码或发布包的摘要。
- 既有材料已形成合作设计、Issue 草案、契约夹具与 v4 参考 bridge，但此前未建立完整的十项处理台账。本次归档原件、逐项复核、修复有证据的问题，并提供独立回复稿与文件包。
- 本清单按当前源码重新验收，不以旧说明代替可复核的实现与测试证据。

## 十项对账

| ID | 当前结论 | 代码与测试证据 | 后续动作 |
| --- | --- | --- | --- |
| C-01 远端 Store 合并通知 | 待开发 | `src/index.ts` 的 `enqueueMutation/reconcileStore` 会失效摘要和重绘，但未在远端合并有变化时广播 `analytics-updated`；刷新阶段早退亦需覆盖 | 有变化恰一次、无变化零次；覆盖写前合并、只读协调和后续业务失败，卸载后不通知 |
| C-02 API 生命周期 | 部分底座已有，新增契约未交付 | 已有 ready/failed、重试、卸载时全局引用身份保护；没有 window `checkin:api-state-changed` | 补 loading/ready/failed/unavailable；两种加载顺序、失败重试及热重载；旧实例卸载不得误报新实例失效 |
| C-03 日历兼容语义 | 文档纠正，增量字段待开发 | `calendar-projection.ts` 仍用六状态；quota 日 `complete` 表示当日有贡献，`quotaRate` 为实际投影末日所属周期累计量；point 无 `scheduleType`，顶层无 `asOfDate` | 保留数值兼容，补逐日有效类型和本地 as-of；未来 atMost 空日不能直接展示为已达成；冻结配额和历史修订夹具 |
| C-04 范围与截断 | 实现已有，本轮补验收 | `tests/calendar-projection.test.cjs` 核对非法/空/反向拒绝，超过 366 天或 200 项截断并返回 `truncated` | 超限时 `endDateExclusive` 仍保留请求上界，不能据此认为完整覆盖；消费端必须显示截断提示 |
| W-01 batch/single 身份校验一致 | 本轮修复 | `api-v5.ts` 复用 `isTaskHorizonExternalRef`；`api-v5.test.cjs` 覆盖合法/非法身份、重复与未知前缀兼容 | 新限制只针对 `taskhorizon:` 身份，不扩大到其它来源 |
| W-02 历史方向修订 | 本轮修复 | batch 改用 `getItemDirectionForDate`；测试覆盖两个方向的历史切换及历史单位 | 继续按落账日期修订判定，保留通用非排期 `logged` |
| W-03 合作专用新事实限制 | 待开发 | 当前不强制 `count+daily+atLeast`、显式 `occurredAt/unit/value=1`、身份日期一致、非未来及 SKIP；已有创建/归档可用期检查不等于完整合作校验 | 仅对 Task Horizon 新事实校验；先识别墓碑/已有事实/批内重复，再校验新事实。测试改规则后既有事实仍 duplicate、墓碑不可重放 |
| W-04 主机失败与逐项回执 | 本轮修复并补行为测试 | batch 将队列未执行、刷新失败或回执非数组/长度异常映射为 reject；测试覆盖排队期间卸载、写失败、落盘后确认/反馈失败，以及原身份重试 | reject 只表示未取得可靠成功回执，可能已有 durable 事实；按原身份重试确认，正常数组与输入 1:1 |
| W-05 调用时输入快照 | 本轮修复 | 公开 batch 在入队前捕获数组和标量对象；行为测试在排队期间改写字段、替换输入并改变长度 | 消费端仍应传普通数据对象，禁止依赖稍后改写输入来撤销已提交意图 |
| W-06 重试归属与入口 | 源码底座已有，合作迁移未收口 | batch 写失败回滚并拒绝，不走 single 的 pending 自动恢复；legacy bridge 仍用 single，本轮只补日期守门 | 新合作即使一条也使用 v5 batch；消费端负责持久化队列与重试，补“batch 失败→重载→无 single pending 自动补写”验收后再宣告完成 |

当前 `describe()` 没有 `integrationContracts.taskHorizonCalendar` / `taskHorizonCompletion` 标记；两批均未声明 v1 就绪。现有 v4 manifest 和日历 draft fixture 保留各自用途，不升级名称冒充已验收新契约。

## 我方已有内容及边界

已提供只读项目、摘要、事件与日历投影，支持日期半开区间、隐藏项目过滤及截断；已提供外部身份幂等写入、墓碑防重放、v5 批量逐项回执，以及本地契约和 mock consumer 测试。数据通过思源 `saveData/loadData` 保存在独立插件数据中，不依赖笔记块作为事实源。

对方源码核对仍是 **2026-10-10** 的 Task Horizon v3.1.8 快照 `58ec06f23627962d0e83794611826ba4cfebb832`。其内部打卡循环、`tm-checkin-updated` 和旧积分联动不等于小驴公开消费端；本轮未刷新对方 Latest，也没有对方仓库接入或双插件现场成功证据。

legacy bridge 只适合 v4 当日参考验证。其 `undefined` 表示本次无成功回执，可能已进我方待处理箱并在启动时自动恢复；消费方丢弃内存队列不能取消我方 pending，更不能撤回已落账事实。本轮跨日守门仅防止后续错误调用，不提供撤回能力。新合作生产接线应使用 v5 batch。

## 下一步顺序与完成条件

1. **先完成日历批 C-01～C-04。** 补远端变化通知、API 生命周期与投影字段，更新 fixture、消费端降级与重连逻辑；全部通过后才声明 `taskHorizonCalendar: 1`。此时即可由对方实现只读图层，无需等待回写。
2. **再完成普通任务回写批 W-01～W-06。** W-03 限制、batch 参考消费端及重载失败测试收口后，由对方按明确项目 ID 映射普通复选框任务；即使单条也使用 batch。全部通过后才声明 `taskHorizonCompletion: 1`。
3. **双插件现场联调。** 覆盖两个加载顺序、关闭/重载、跨午夜、历史补记、归档/改规则、重复/删除墓碑、持久化失败和多窗口。provider 与 mock 测试不能替代这一步。
4. **另立内部循环/撤回契约。** 对方内部打卡循环可取消，而我方记录为追加事实；先约定 canonical source、取消和对账，不从私有事件推导双向同步。

请对方先确认日历图层位置、截断/配额显示、生命周期重连方式，以及是否接受两批分别验收；普通回写还需确认目标项目限制、显式时间和队列所有权。无需再次索取已收到的原始指导文件。

## 验证与交付

本轮定向检查：API v5、方向修订、Task Horizon 契约、bridge、mock consumer、日历投影、calendar consumer kit、upstream proposals 与架构边界。最终完整质量链与 Chrome 视觉均通过，详见 [验证记录](taskhorizon-validation-2026-10-16.md)（文件包同时提供 `VALIDATION.md`）；发布结果见[仓库 PROGRESS](https://github.com/ai68298100/siyuan-checkin/blob/main/PROGRESS.md)。

配套：[可直接转发回复稿](taskhorizon-reply-2026-10-16.md)、[合作设计](checkin-taskhorizon-cooperation.md)、[API v5](api-v5.md)、[Issue 草案](contracts/upstream-proposals/taskhorizon-issue-draft.md)。这些材料尚未自动发送给对方。
