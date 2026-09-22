# 发布与回滚说明

## 发布前

1. 在主分支确认工作区干净，更新 `package.json` 与 `plugin.json` 的版本号。
2. 执行 `pnpm test`、`pnpm run build` 和 `pnpm run check:release`。
3. 核对 `package.zip` 的 SHA-256，并在 GitHub Release 中附上校验值。
4. 先推送提交和版本标签，再上传 `package.zip`；Release 标题与标签保持一致。

## 回滚

1. 在 GitHub Releases 中标记当前版本为预发布或撤回，保留原资产以便审计。
2. 将主分支恢复到上一个通过完整验证的版本标签，重新执行全部检查。
3. 创建新的修复版本号并发布，不重用已经公开的版本号或标签。
4. 在 Release 描述中说明受影响功能、修复范围和升级路径。

插件存储采用向后读取策略；回滚代码版本不会主动删除用户数据。涉及存储结构变更时，必须先增加迁移回归测试，再决定是否发布。

## 演练与资产清单（T-1398，可复跑脚本）

- `pnpm run release:manifest`：生成 `.artifacts/release-manifest.json`——dist/ 逐文件与 package.zip 的字节数 + SHA-256，含版本、git 提交与生成时间。`check:release` 每次运行都会重新生成并逐条核对（清单漂移即失败），发布说明中的 ZIP SHA-256 应与清单中 `package.zip` 条目一致。
- `pnpm run release:rehearsal`：回滚演练——在临时目录演练「预发布快照 → 坏版本发布（版本复用 + 未知文件） → 漂移检测 → 回滚 → 逐文件完整性复核」，产出 `.artifacts/rollback-rehearsal.json` 证据；任何一步失败即非零退出。已并入 `check:release`，每次质量链都会重演一遍回滚流程。
