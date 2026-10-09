# 双机开发与发布协议

> 2026-10-08 双机合并窗口已完成。本文件从“合并前冻结协议”更新为“合并后统一基线协议”，避免后续 agent 继续执行已经过期的禁止事项。

## 当前唯一基线

- GitHub `main`、本机 `main` 和其他机器应统一跟随同一个提交。
- 当前版本为 `18.17.1`，版本四元组为 `package.json`、`plugin.json`、`src/version.ts` 和构建产物中的 `dist/plugin.json`。
- `dev/thispc-1002` 保留为本次双机合并记录和后续开发分支；它可以暂时与 `main` 同步，但稳定安装、发布和新机器初始化都以 `main` 为准。
- 旧的 v18.17.0 及更早版本说明是历史记录，不回写历史发布文档。

## 日常开发

1. 开始工作前：

   ```powershell
   git fetch origin
   git switch main
   git pull --ff-only origin main
   ```

2. 新功能在 `dev/thispc-1002` 或短期特性分支完成；提交前运行 `pnpm run check`、相关测试和 `pnpm run build`。
3. 需要让另一台机器接手时，先提交并推送当前开发分支，再在目标机器以 `main` 为基线同步，禁止用 reset、force push、rebase 丢弃内容。
4. 合并到 `main` 前必须检查工作区干净、版本号意图明确、冲突逐处裁决，并运行发布前质量链。

## 发布

- 版本号只在确认要发布时统一修改 `package.json`、`plugin.json`、`src/version.ts`、README 当前版本入口、变更记录和发布说明。
- 发布 tag 与 GitHub Release 只从 `main` 创建，不复用已有 tag，不从开发分支或旧工作树创建安装包。
- `dist/`、`package.zip`、`.artifacts/` 是构建生成物，除非发布流程明确上传，否则不手工加入 Git。
- 真实思源宿主、Android、外部来源账号和集市发布属于额外验收边界，不能用本地类型检查或结构测试冒充。

## 本次合并记录

- 合并提交：`135ff336`（`merge: integrate main computer progress`）。
- 主线上传提交：`38843cd1`（另一台电脑的 53 个本地提交）。
- 最终同步提交：`1babd179`（版本与 README 更新规范已同步到两条远端分支）。GitHub 默认分支已是 `main`；`dev/thispc-1002` 不删除，作为开发历史保留。
