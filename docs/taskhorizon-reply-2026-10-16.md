# Task Horizon 合作回复稿

下面正文可直接转发；对应版本为小驴打卡 18.17.6，发布及测试证据见随附清单。

---

你好，你之前发来的 `checkin-provider-fix-guidance.zh-CN.md` 已收到并保留原件。我们这次按其中 C-01～C-04、W-01～W-06 十项重新核对了当前代码，整理了逐项处理清单和下一批验收条件。

本轮已修复 batch 与 single 的 Task Horizon 身份校验不一致、历史方向修订判定、主机失败时的批量回执，以及调用后改写输入影响排队批次这四项，并补充行为测试。日期范围上限按“超过 366 天或 200 项时截断并标记”处理；配额说明也已纠正：quota 日的 complete 只表示当日有贡献，quotaRate 保留实际投影末日所属周期累计量语义。

日历远端变化通知、API 生命周期事件、point.scheduleType/asOfDate，以及普通任务回写的 count+daily+atLeast、显式时间/单位/value=1 等专用限制仍需补齐，因此目前不声明两个 integrationContracts 已就绪。

建议按你提出的顺序分两批验收：先补齐 C-01～C-04，提供日历夹具并联调只读图层；再收口 W-01～W-06，接普通原生复选框任务回写。新合作统一采用 v5 recordEventsBatch，单条也走 batch，由消费端维护持久化队列并以原 itemId/source/externalRef 重试。失败回执可能发生在事实已落盘之后，不能据此生成新身份重写。

现有 v4 bridge 仅保留为当日参考示例，本轮加了跨日保护。single 的 undefined 表示未取得成功回执，可能进入提供端自动恢复队列；消费端丢弃自己的待处理项不等于取消提供端 pending。后续生产接入会以 batch 的明确队列归属为准。

附件包含原始指导文件、逐项处理清单、合作设计、API 说明及参考夹具。请先确认日历图层位置、配额和截断显示、生命周期重连方式及两批验收安排。内部打卡循环的取消、补录和双向对账，我们建议另立契约，避免与普通任务完成回写混用。

---

附件优先阅读：`taskhorizon-provider-review-2026-10-16.md`。既有 `task-horizon-v1.json` 是 v4 兼容契约，日历 consumer fixture 仍是 draft；二者均不表示新合作已完成现场验收。
