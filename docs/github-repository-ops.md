# GitHub 仓库运维说明

这份说明把 GitHub 页面上的分支、发布、自动化和反馈入口与仓库当前开发协议对齐，避免把开发快照误认为稳定版本。

## 分支与发布来源

| 用途 | 分支 / 引用 | 说明 |
| --- | --- | --- |
| 稳定安装包 | `main` + 发布 tag | Release、`package.zip` 和用户安装说明以这里为准。当前版本为 v18.17.1。 |
| 当前开发 | `dev/thispc-1002` | 双机合并记录与后续开发分支；稳定安装和其他机器同步以 `main` 为准。 |
| 用户入口 | GitHub Releases | 页面上的“最新版本”只指已发布 tag，不指向开发分支。 |

2026-10-08 双机合并窗口与 v18.17.0 发布已完成：`main` 已统一包含两台电脑的代码，发布提交为 `af9caf9b`，GitHub 默认分支为 `main`，正式 Release 地址为 https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.17.0。后续新功能继续在开发分支或短期特性分支进行，完成验证后再合入 `main`；发布 tag 和 Release 只从 `main` 创建。

2026-10-09 全插件复核补丁 v18.17.1 已发布：提交 `ef4c1c312ef07354f6f354ec83395e39c7f10bb6` 已推送到 `main`，tag 与正式 Release 地址为 https://github.com/ai68298100/siyuan-checkin/releases/tag/v18.17.1，`package.zip` SHA-256 为 `5d3a3d3ceeb9272f2797b9719672b505473ccafea092c9116cbd9f2068d1a213`。真实宿主/设备现场和第三方账号仍按兼容矩阵单独验收。

## 自动化

`.github/workflows/ci.yml` 对 `main` 和开发分支 push、所有 Pull Request 运行类型检查、构建、主测试、移动结构测试、发布资产检查和浏览器可访问性/视觉走查。Actions 使用最小 `contents: read` 权限，并按分支和提交取消过期运行，避免旧提交占用队列。

Dependabot 每月检查 pnpm 依赖和 GitHub Actions，更新目标为 `main`，由维护者审阅后再进入发布分支。

## Issue、贡献与安全

- 缺陷和功能建议使用 `.github/ISSUE_TEMPLATE/`，反馈时只提供脱敏的最小复现材料。
- Pull Request 先读 [贡献指南](../CONTRIBUTING.md)，写清用户影响、测试证据和发布影响。
- 可能泄露凭据或用户数据的问题按 [安全报告说明](../SECURITY.md) 处理，不在公开 Issue 中披露细节。

## 发布前检查

1. 确认工作树、分支、版本号、tag 和 `package.zip` 来自同一提交。
2. 运行 `pnpm run test:quality` 与 `pnpm run check:release`。
3. 回读 Release 资产与 SHA-256，确认 README、发布说明和插件清单版本一致。
4. 发布后只在 GitHub Release 页面引导用户下载，不把开发分支压缩包当作安装包。
