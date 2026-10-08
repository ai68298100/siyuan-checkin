# 小驴打卡全插件功能与 UI 复核

日期：2026-10-09。基线：本机 `main`、v18.17.0。范围覆盖主要页面、记录入口、来源/API、跨表面路由、双主题和 280–2000px 响应式场景。

## 结论

核心功能的本地自动化证据完整，类型检查、生产构建、主测试链、UI/移动端/生态/扩展/perf 链均通过。无障碍静态审计没有缺名、正向 tabindex、键盘不可达或对比度违规。真实思源宿主、第三方账号、Android/TalkBack、缩放和保存面板现场仍未验收。

本轮修复了两处可复现缺陷：

- 日历投影、排期预演和周负荷统一使用 `date-keys.ts:isValidDateKey`，不再接受 `2026-02-30`、`2026-02-31` 并被 `Date` 归一到下月；对应 T-1793/T-1811 已回写完成。
- 设置页窄屏分类点击不再在平滑滚动首帧被旧几何覆盖 `aria-current`；滚动事件和观察器继续负责最终同步。

## 页面与能力

| 区域 | 本地结果 | 证据边界 |
| --- | --- | --- |
| Today | 空态/首成、手动/精确/快捷记录、跳过/撤销、提醒、专注、搜索、多 root 和混合记录通过 | 真实宿主记录写入仍需现场复测 |
| Review | 概览、记录、分析、折叠、筛选、批量、长内容和比较入口通过 | 真实宿主多窗口仍属开放项 |
| Insights | 日历/热图、日期钻取、方向键、roving tabindex、atMost 相关守门通过 | Android/TalkBack 仍开放 |
| Editor | 预览、记录方式、保存栏、模板、导入冲突、草稿和移动结构通过 | 长表单真实缩放仍开放 |
| Occasions | 新建、编辑、改期、完成、搜索、日历、历史、关联和提醒状态通过 | 真实事项数据现场仍开放 |
| Archived | 搜索、恢复和危险操作结构通过 | 真实宿主文件/存储面板仍开放 |
| Settings | 总览、搜索、来源卡、导入冲突、审计/恢复点动作、导航通过；本轮修复窄屏导航竞态 | 原生异步保存失败仍需宿主验证 |
| 来源/API/生态 | 适配器、来源沙箱、API v5、Task Horizon/Dock Tomato 相关本地契约通过 | 第三方真实账号和上游生命周期仍开放 |
| quick/dock/tab/dialog/渲染块 | root、键盘、模板包、日期格、焦点与生命周期结构守门通过 | 多表面真实宿主同屏仍开放 |

## 验证记录

- `pnpm run check`、`pnpm run build`、`pnpm test`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run test:ecosystem`、`pnpm run test:extended`、`pnpm run test:perf`、`pnpm run check:environment`：通过。
- `node tests/ui-sweep.cjs`：69 张截图生成完成。
- `node tests/accessibility-audit.test.cjs`：0 缺名、0 正向 tabindex、0 键盘不可达、0 对比度违规；10 个密集列表控件低于 44px，但满足 24px 下限与包围标签规则。
- `responsive-layout`、`ui-theme`、`mobile-release-quality`、`css-hygiene`：通过。CSS 655,090 bytes，高于 620KB 软线、低于 640KiB 硬线；Webpack 保留既有体积提示。
- `node tests/cross-surface-matrix.test.cjs`：12.1–12.6 全部通过；同步修正了一个落后于 root-aware 实现的静态断言。

## 未闭合的视觉证据

- `node tests/visual-qa.cjs` 在 draft conflict submit 等待阶段失败，错误为 `draft conflict submit did not finish`，因此不能宣称全量视觉通过。
- `node tests/width-walkthrough.cjs` 仍有 6 个失败：Ocean/Sunset 浅深主题共 4 个 action-colors 场景在 exact-entry 控件被异步重绘隐藏后定位超时；30 项 Today 在 640px 首卡 top=483，超过 475px 首屏预算 8px。其余宽度、长内容、短高 dock、混合记录和交互场景通过。
- CSS 软线、T-1778/T-1788 视觉状态矩阵及 T-1813～T-1829 视觉系统治理继续保留，不能用静态通过替代真实宿主验收。
