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
