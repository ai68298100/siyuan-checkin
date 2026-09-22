# v18.0.2 本地发布验收

日期：2026-09-22。状态：本地发布门槛通过，本地里程碑提交与标签已完成。

## 范围

以 v18.0.1 为发布基线，收口其后头像、日记文档、回顾布局、IME 与快捷入口修复，并登记闪卡联动研究。版本统一到 18.0.2；研究条目保持开放，不将计划作为已实现功能。

## 已完成的本地验证

- `pnpm run check` 通过；完整 `pnpm run test:quality` 通过，包含生产构建、摘要同步、主测试、UI、移动、生态、扩展、性能与 `check:release`。
- `node tests/width-walkthrough.cjs` 通过：49 个表面场景、32 个交互状态、8 个主题/配色场景、10 个混合习惯布局、16 个长内容场景及录入表单交互均通过；宽度无溢出。
- `node tests/visual-qa.cjs` 通过浅色和深色两轮，`pageErrors=[]`；该证据属于本地生产包浏览器检查。
- `node tests/diary-report.test.cjs`、`node tests/entry-capabilities.test.cjs`、`node tests/avatar-editor-browser.cjs` 通过，覆盖日记搜索错误/过期响应、快捷注册和头像编辑。
- 生产 `package.zip` 大小 684334 字节，SHA-256 为 `2efea515cb51881345390165367ebb9bcbd72224e3d8486b6310d96da8b4806d`；`dist/plugin.json`、源版本、README 与发布说明一致。

## 仍待现场验收

- 压缩包内容、版本、摘要已由 `check:release` 核验；本地标签与工作树最终差异已复核。

## 现场验收边界

本轮使用隔离数据的本地自动化测试；未操作真实笔记本。真实思源桌面/Android、只读/发布服务、智能体面板与 B-007 双插件联调仍保持开放。

按 AGENTS.md 不自动 push。本轮交付本地发布包、发布说明、验证记录与本地版本标签；GitHub Release 尚未创建，远端发布状态单独记录。
