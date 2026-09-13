# 大版本开发路线（2026-09-12）

## 当前状态

- `v9.5.1` 已发布并是 GitHub Latest。
- 自动化基线已通过：主测试、移动端、生态、性能、构建、宽度走查、双主题无障碍审计。
- 唯一未完成验收是 T-023：需要真实思源桌面端和移动端操作。

## 环境能力

- 可用：Node、pnpm、TypeScript、Webpack、Git、GitHub CLI、系统 Chrome。
- 浏览器测试：使用 `CHECKIN_BROWSER` 指向系统 Chrome；不依赖 Playwright 默认缓存。
- 不可用：当前没有真实思源客户端，因此不编造 T-023 结果。

## 后续大版本顺序

### 9.x 稳定维护

1. 等待并处理 T-023 真机反馈。
2. 只修复真实反馈和自动化回归，不继续堆叠孤立 UI 功能。
3. 保持发布资源、版本元数据和测试证据一致。

### 10.0 数据安全与迁移

1. 将快照、恢复、冲突和审计能力整理为统一迁移服务。
2. 增加迁移前预检、迁移后校验和失败回滚报告。
3. 覆盖旧版本数据、非法字段、重复事件和多窗口写入冲突。

### 10.0 智能体协作增量

1. `checkin-summary-context` 与 `checkin-action-suggestions` 仅提供结构化只读上下文。
2. 回顾页展示截止日期、亮点、薄弱项目和本地行动建议；智能体分析失败时离线降级。
3. 任何项目设置或记录变更必须先展示差异、影响范围和撤销方式，再由用户确认执行。
4. 建议执行写入统一进入审计与可回滚队列，不允许智能体静默修改数据。

当前实现进度：只读上下文、行动建议能力、建议状态机、变更白名单、差异预览、分析缓存、历史版本浏览与正文对比已完成；确认写入、审计和回滚仍待后续阶段实现。

### 11.0 计划与提醒平台

1. 统一计划、日期事项、提醒和完成历史的数据语义。
2. 增加提醒中心、延期/跳过和跨日边界处理。
3. 为桌面、移动端和外部入口提供一致的事件协议。

### 12.0 分析与生态

1. 扩展日/周/月/自定义范围分析和报告导出。
2. 稳定第三方插件能力发现、来源追踪和去重协议。
3. 在核心离线能力稳定后再扩大 AI 协作和自动化写入。

## 每个大版本的完成条件

- 代码、数据迁移、测试和文档形成可审查提交。
- `pnpm test`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run test:ecosystem`、`pnpm run test:perf` 和生产构建通过。
- 浏览器自动化使用显式可用的 Chrome；真实客户端验证单独记录，不用自动化结果替代。
- 不 push，不在未确认版本策略前修改远程 Release。

## Current checkpoint

- The automated 10.0 recovery foundation is complete; see `docs/v10-recovery-acceptance.md`.
- T-023 real-device verification remains independent and blocked on a real SiYuan client.
- The next automated milestone is the 11.0 reminder projection model; see `docs/v11-planning-reminders.md`.
