# 模块地图与使用指南

> 目标：不读实现也能知道每个模块管什么、被谁用、改动时要动哪些地方。
> 依赖图与体量用 `node scripts/module-map.cjs` 重新生成；文中的行数和目录数量属于历史快照，不是接口契约，当前版本以脚本和源码为准。

## 分层总览

```
思源宿主
  └─ src/index.ts  插件类：生命周期 / 存储读写 / 渲染编排 / 页面切换
       ├─ render/  页面视图（纯函数出 HTML）+ 事件绑定（接到宿主方法）
       ├─ 领域层   model / rules / quota / analytics / occasions / reminders / features/*（纯函数，无 DOM 无 IO）
       ├─ 集成层   api / api-contract / ecosystem / integrations / agent-capabilities / agent-suggestions
       └─ 基础设施 shared / i18n / catalog / lunar / view-preferences / charts / types / ui/*
```

铁律：依赖方向只能从上往下；领域层不 import render/ 与 index.ts；render/ 不直接 loadData/saveData（一律走宿主方法）。

## 模块清单

### 入口与编排

| 模块 | 职责 | 使用须知 |
| --- | --- | --- |
| `src/index.ts` | 插件类：onload/onunload、全部存储键的读写与保存队列、render() 编排、页面切换、宿主方法实现 | 所有持久化键都从这里加载；新增存储键必须在这里初始化并给出降级默认值 |

### 页面渲染（render/）

视图函数是纯函数：接受显式 Context、返回 HTML 字符串、不做 IO；绑定函数把 DOM 事件委托给宿主接口（接口显式声明在文件顶部）。

| 模块 | 职责 |
| --- | --- |
| `render/fragments.ts` | 今日页碎片：事项横幅、项目卡、打卡日志、近期记录 |
| `render/review.ts` | 回顾页（历史+总结+复盘+提醒中心+逾期历史） |
| `render/archived.ts` | 归档页视图（15.0-A 外置：搜索、结果计数、恢复行） |
| `render/editor.ts` / `save-form.ts` / `bind-editor.ts` | 新建/编辑表单的视图、校验保存与事件绑定 |
| `render/occasions.ts` / `bind-occasions.ts` | 日期事项页 |
| `render/settings.ts` | 设置页 |
| `render/bind-today.ts` / `today-bindings.ts` | 今日页事件：记录、批量、拖拽、页键盘流（j/k/e） |
| `render/bind-page-navigation.ts` | 回顾页/导航级事件：折叠、筛选、提醒动作、补记、跳转 |
| `render/quick-dialog.ts` | 快速弹窗生命周期、尺寸偏好、速切动作 |
| `render/focus-timer.ts` / `focus-adapter.ts` | 内置专注计时与外部番茄钟适配 |
| `render/agent-preview.ts` / `analysis-diff.ts` | 智能体建议预览与历史版本差异（只读） |
| `navigation.ts` | 页面切换的纯路由函数（showToday/showReview/…） |

### 领域模型（纯函数，可独立测试）

| 模块 | 职责 |
| --- | --- |
| `model.ts` | CheckinStore 的规范化、合并、冲突检测、事件/审计/快照历史；撤销=删除标记 |
| `rules.ts` / `quota.ts` | 打卡机会与周期配额的调度谓词（"今天有没有机会、完成了没有"） |
| `analytics.ts` | 日/周/月/自定义范围统计上下文（总结页与智能体共用） |
| `occasions.ts` | 日期事项：农历/重复规则/完成标记，`checkin-occasions` 独立存储 |
| `reminders.ts` | 提醒中心投影（occasion+checkin 双来源）与 11.0-C 用户动作（延期/跳过/恢复） |
| `features/reminder-projection.ts` | 11.0 五态提醒的纯投影模型（ID/排序/迁移/确认令牌），供后续跨端协议使用 |
| `features/insights.ts` / `coaching.ts` | 完成率/连续/趋势洞察与本地行动建议（无 AI 也可用） |
| `features/achievements.ts` / `history-filter.ts` / `record-notes.ts` / `insight-records.ts` / `templates.ts` / `template-manager.ts` / `report.ts` | 成就墙、历史筛选、打卡备注链接净化、洞察记录、模板目录管理、报告构建 |
| `charts.ts` | 纯函数 SVG 图表（热力图/折线/柱状），空数据安全 |

### 集成与对外契约

| 模块 | 职责 |
| --- | --- |
| `api.ts` / `api-contract.ts` | `window.siyuanCheckin`（协议 v5，兼容 v4）：能力协商、recordEvent 去重、describe |
| `ecosystem.ts` | 智能体能力注册（`addAgentCapability`）与事件订阅 |
| `integrations.ts` | 事件名常量、来源白名单、外部事件的单位/版本校验 |
| `agent-capabilities.ts` / `agent-suggestions.ts` | 只读查询能力声明与行动建议/分析缓存（独立键存储，失败降级本地） |

### 基础设施

| 模块 | 职责 |
| --- | --- |
| `shared.ts` | 跨页工具：escapeHtml、数字/日期格式化、备注渲染 |
| `i18n.ts` | 中英双字典；文案一律走 `t(key)`，不允许写死在视图里 |
| `catalog.ts` / `ui/labels.ts` / `ui/icons.ts` | 内置模板目录（数量以 catalog.ts 当前源码为准）、类型/时段/排序标签、图标库 |
| `view-preferences.ts` | 显示偏好（主题/分组/排序/弹窗尺寸…）的规范化与默认值 |
| `lunar.ts` | 农历换算 |
| `export.ts` | JSON/CSV 导出、CSV 导入解析、快照恢复预检（公式注入净化） |
| `ui/tokens.scss` | 全部设计 token（颜色角色/圆角/阴影/动效时长）——新样式禁止写死颜色与时长 |
| `ui/components.scss` | v5 共享组件层（按钮/输入/卡片/容器查询布局） |
| `ui/workbench.scss` | 今日工作台、桌面导航与编辑表面的最终组合布局；含多项目紧凑模式 |
| `ui/content-responsive.scss` / `ui/maintenance-responsive.scss` | 回顾/复盘/编辑与事项/设置的响应布局；沿用同一设计 token |

## 样式架构

构建内的活层按序加载：`ui/tokens.scss` → `ui/components.scss` → `ui/workbench.scss` → `ui/content-responsive.scss` → `ui/maintenance-responsive.scss`。`index.scss` 已退出生产导入；后面三层按页面职责组合布局，不复制基础控件实现。

- 宽度决策只认 `@container lc5`（inline-size 容器），禁止 `@media`（D-016）；dock 面板另有 `lc-dialog`/`lc-dock` 容器。
- 基础移动宿主布局位于 components.scss 末尾；今日页的紧凑排列由 workbench.scss 收口（D-242），使用独立主题 token，不引入宿主颜色。
- 8 个 4.0 时代的 `*-v4.scss` 补丁层已确认不在构建图并于 2026-09-14 删除；守门断言一律改锁活规则（D-051），禁止再引入补丁层。

## 存储键清单（全部经 index.ts 读写）

| 键 | 内容 |
| --- | --- |
| `checkin-store` / `checkin-store-backup` / `checkin-store-audit` | 主打卡存储 / 快照历史 / 审计日志 |
| `checkin-occasions` | 日期事项 |
| `checkin-view-preferences` | 显示偏好 |
| `checkin-user-templates` | 我的模板 |
| `checkin-custom-icon-library` | 自定义图标库 |
| `checkin-reminder-actions` | 提醒延期/跳过用户动作（11.0-C，独立于打卡与事项数据） |
| `agent-analysis-history.json` | 智能体分析缓存（失败静默降级） |

## 三个常见任务的操作路径

1. **加一个界面元素**：`render/*.ts` 出标记 → `bind-*.ts` 接事件（宿主接口同步加方法）→ `index.ts` 实现宿主方法 → `ui/components.scss` 对应分区加样式（token 化，宽度用 `@container lc5`）→ 对应守门测试加断言 → i18n 双语补键。
2. **扩展提醒中心**（参考 11.0-C）：`reminders.ts` 改投影/动作模型 → `render/review.ts` 行渲染 → `bind-page-navigation.ts` 绑定 → `index.ts` 持久化与反馈 → `tests/reminder-actions.test.cjs` 加执行断言。投影只读，用户动作进独立键。
3. **加一条文案**：`i18n.ts` 中英两份字典同步加键；测试里用"键出现两次"的断言防单语漏配。

## 守门测试索引（部分）

| 测试 | 锁什么 |
| --- | --- |
| `tests/responsive-layout.test.cjs` | 样式分层加载顺序、lc5 容器纪律、页头不 sticky、提醒中心结构 |
| `tests/reminder-actions.test.cjs` | 11.0-C 模型语义（转译执行）+ 存储序列化 + 界面接线 |
| `tests/reminder-projection.test.cjs` | 11.0 纯投影模型全量守门 |
| `tests/release-assets.test.cjs` | 版本一致性、CSS 体积预算（T-109/D-056）、7 个 surface 存在 |
| `tests/archived-search.test.cjs` | 归档搜索/恢复 + 工具行活规则（桌面 space-between、窄容器堆叠） |
| `tests/api-contract.test.cjs` / `ecosystem.test.cjs` | 对外协议与能力协商 |
| `tests/backup.test.cjs` / `conflict.test.cjs` / `restore-audit.test.cjs` | 10.0 数据安全 |
| `tests/accessibility-audit.test.cjs` / `visual-qa.cjs` / `width-walkthrough.cjs` | 真浏览器无障碍、双主题视觉、多宽度溢出（需 `CHECKIN_BROWSER`） |
