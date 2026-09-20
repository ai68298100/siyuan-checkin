# 全页 UI 内容审查记录（2026-09-20）

本轮审查针对用户提出的“从头到尾检查 UI、尤其回顾页内层细节”执行。审查使用生产构建、真实有记录 fixture（90 天、6 个项目、长名称/单位/备注、自定义图片图标、二值/数量/时长/配额/归档）和 7 个页面：今日、回顾、新建、复盘、归档、设置、事项。

## 统一规则

- 页面正文 13–14px；辅助说明、单位、筛选和状态 12px；标题 14px 以上；主操作触控区至少 44px。
- 图表轴、日期和日历角标属于微标签，按图表局部缩放审查；普通可见文本不采用整体缩放掩盖问题。
- 今日卡片：当天排期超过 12 项切紧凑；容器宽度不超过 719px 强制紧凑；紧凑宽屏（至少 1500px）使用三列。搜索不会改变密度口径，长名称/单位自然换行。
- 全年热图保持 7 行 × 12 列，窄屏只在热图局部横向滚动，不让整个页面横溢。

## 本轮修正

- 回顾：趋势轴按实际单位绘制，日活跃趋势明确“每日有记录为 1 天，无记录为 0 天”；历史三项动作同排且保持 44px；日志按月/周/日层级调整，长备注、长单位和项目名称完整换行；回顾项目/日志图片图标使用真实图片；建议、报告、提醒和成就层级统一。
- 编辑/复盘/归档：自定义图片不再显示 URI 或字面 `<img>`，模板删除动作独立成 44px 行；目标与单位输入顶部对齐；复盘热图日期与网格同步；归档图片固定 24px。
- 设置/事项：番茄钟收件箱按单位换算（30 分钟显示 0.5 小时）；月度/每周事项保存使用当前可见星期字段，不再被隐藏字段覆盖；月度和年度第 N 个星期共用一个序数字段；表单字体、筛选、模板、快照、审计长文本和控件触控统一。
- 导航：移动底栏文字提升到 12px，桌面/页签/弹窗导航保持同一层级；今日分组标题和计数不再回落到旧的 11px 规则。

## 验收证据

- `tests/ui-content-audit.cjs`：7 页 × 5 尺寸（1180、640、360、320、844×350）共 35 个真实数据页面；检查 computed 字号、长内容边界、回顾历史动作、SVG 图表实际缩放、7×12 热图几何、图片图标和无横溢。
- 最终内容走查：`.artifacts/ui-full-content-mobile-light-final5.log`、`.artifacts/ui-full-content-tab-dark-final7.log`、`.artifacts/ui-full-content-dialog-light-final7.log` 均记录 `Content audit: 35/35 populated page layouts; 0 issues.`。
- 双色视觉：`.artifacts/ui-full-visual-light-final2.log`、`.artifacts/ui-full-visual-dark-final2.log` 均 exit 0。
- 设置/事项实际展开与保存证据见 `.artifacts/maintenance-font-desktop-final2.log`、`.artifacts/maintenance-font-mobile-final2.log`；自定义模板和图片图标见 `.artifacts/content-audit-final-light.log`、`.artifacts/content-audit-final-dark.log`。

## 边界

图表轴/日期是局部 SVG 微标签，窄卡有效字号约 8–11px；普通 DOM 文本不低于 12px。浏览器假宿主结果不替代真实思源 WebView、系统键盘/安全区和底栏番茄钟双插件联调，后者继续保留现场验收任务。
