# 仓库布局与整理规则

本仓库同时承载插件源码、发布门禁、生态示例和长期开发记录。目录按“运行时 / 验证 / 文档 / 发布”分层，避免把历史材料和可发布入口混在根目录。

## 根目录保留项

- `src/`：插件运行时代码；`tests/`：自动化测试与真实例 E2E；`scripts/`：构建、发布和环境工具。
- `i18n/`、`examples/`：随包资源和公开生态示例，不能按“非核心源码”删除。
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.json`、`webpack.config.js`：安装、类型检查和构建入口。
- `plugin.json`、`icon.png`、`preview.png`、`LICENSE`、`README.md`：思源插件清单、发布资源和用户入口。
- `AGENTS.md`、`TODO.md`、`PROGRESS.md`、`BLOCKERS.md`、`DECISIONS.md`：自主开发协议要求的工作记录，必须留在根目录供每轮恢复上下文。
- `playwright.e2e*.config.mjs`：真实例和只读真实例的 Playwright 配置。

## 发布材料

所有版本的 GitHub 发布说明统一放在 [`docs/releases/`](releases/)：

```text
docs/releases/release-notes-<semver>.md
```

`scripts/release.cjs` 和 `tests/release-assets.test.cjs` 都以这个目录为默认来源。发布脚本仍接受第四个参数覆盖说明文件路径，便于复用外部草稿；新版本不应再把 `release-notes-*.md` 放回根目录。

版本变更记录（`docs/vX.Y.Z-change-log.md`）保留在 `docs/` 顶层，因为它们是面向开发和兼容性的长期文档；GitHub 发布说明则是发布产物元数据，两者用途不同。

## 本地生成物

`dist/`、`package.zip`、`.artifacts/` 和 `node_modules/` 是构建、测试或安装产生的本地内容，已由 `.gitignore` 排除，不属于 GitHub 仓库整理范围。不要把它们手工加入版本控制。

## 已核对的资源

- `icon.png` 和 `preview.png` 被 `plugin.json`、webpack 和发布资源门禁明确引用，必须保留。
- `icon.svg` 当前没有运行时、构建或发布引用，是未使用的候选源稿；本轮保留以避免破坏外部 raw 链接，若后续确认没有设计资产用途再单独删除。
