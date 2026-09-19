# 小飞驴打卡 v12.0.0

12.0.0 是面向分析、提醒和生态协作的稳定版本。它继续坚持本地优先：统计从插件自己的事件事实推导，外部插件通过能力协商接入，智能体写入必须经过用户确认。

## 亮点

- 回顾页统一日、周、月、自定义范围，补齐趋势、年度热力图、项目汇总、成就、日志和提醒中心的折叠与密度策略。
- 分析快照与 `analytics.read` 只读能力稳定下来，带版本化信封、载荷上限、非法值校验和跨窗口单调合并。
- 日期事项覆盖生日、纪念日、节日、定期支出、会员续费、体检和车辆年检等模板，并支持公历/农历与多种重复规则。
- 延期、跳过、恢复和逾期历史继续与原始打卡事实分离，提醒动作可审计、可追溯。
- 桌面页签、dock、快速弹窗和移动端收敛到同一套容器响应式布局；窄屏操作区、底栏、模板和设置模块减少错位与内容截断。
- 保留恢复点、迁移预检、冲突检测、幂等去重、JSON/CSV 导出和智能体建议的确认/撤销闭环。

## 安装

从 [GitHub Releases](https://github.com/ai68298100/siyuan-checkin/releases) 下载 `package.zip`，在思源“设置 → 集市 → 下载安装包”中安装。最低支持思源 **v3.4.2**。升级前建议在设置页导出 JSON。

## 兼容性说明

插件清单提供桌面、浏览器桌面、桌面窗口、移动和浏览器移动入口。自动化浏览器检查覆盖双主题、多宽度和主要表面；但是，**真实思源桌面端、原生页签、dock、移动端、软键盘、旋转、安全区以及番茄钟双窗口仍需用户在目标环境实际复核**。自动化结果不等同于集市兼容性认证，现场证据收集完成前请不要据此宣称“所有客户端已验收”。

智能体能力只有在宿主公开 `addAgentCapability` 时才注册；番茄钟联动需要第三方适配器或 `source: "tomato"` 的外部事件。两者缺失时，手动打卡、统计、导出、提醒和恢复照常可用。

## 验证清单

发布提交应重新运行并保存输出：

```text
pnpm run test:quality
pnpm run check:stability
pnpm run test:cross-surface
pnpm run test:backup
pnpm run test:analytics-snapshot
node tests/ui-sweep.cjs
node tests/visual-qa.cjs
CHECKIN_QA_THEME=dark node tests/visual-qa.cjs
node tests/width-walkthrough.cjs
pnpm audit --prod
```

真实思源客户端验收请另附桌面、页签、dock、移动和番茄钟截图/操作记录；不能用浏览器 harness 代替。

## 产物校验

- 文件：`package.zip`
- 版本：`v12.0.0`
- SHA-256：`4b4dd41976f8a5828005005fd98296025c3531b5965108e5ccd721a5b2364703`

该摘要对应本次构建生成的 `package.zip`；上传后请在 GitHub Release 页面再次核对资产摘要，并确认 `package.json`、`plugin.json`、`dist/plugin.json` 与标签版本一致。

## 回滚

如发现阻断问题，先在 GitHub Release 标记该资产，保留审计和导出文件，再按 [docs/release-rollback.md](docs/release-rollback.md) 发布新的修复版本。不要复用已经公开的版本号或标签。
