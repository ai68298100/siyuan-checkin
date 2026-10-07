# 工具链兼容性

这份说明约束的是开发、构建和测试环境，不改变插件在思源中的运行时支持范围。当前发布基线仍为 v18.16.0。

## 当前基线

| 项目 | 要求 | 来源 |
| --- | --- | --- |
| Node.js | **20.19.0 或更高** | `package.json` 的 `engines.node`，同时满足当前解析到的 Sass 版本 |
| pnpm | **12.5.1** | `package.json` 的 `packageManager` |
| CI Node.js | 22 | `.github/workflows/ci.yml` |
| 安装方式 | `corepack pnpm install --frozen-lockfile` | 锁文件与贡献指南 |

Node 18 曾是项目早期的宽松声明。现在的开发依赖已经收紧：Playwright 1.63 要求 Node ≥20，copy-webpack-plugin 14 要求 ≥20.9，当前 Sass 1.104 要求 ≥20.19。继续声明 Node 18 会让安装阶段出现“项目允许、依赖拒绝”的误导，因此工具链最低线按当前直接依赖的最高下限执行。

## 检查方式

```bash
corepack pnpm run check:environment
```

环境探针会输出实际 Node/pnpm、项目声明、直接依赖的 `engines.node`、推导出的最低 Node 版本和是否满足。Node 或 pnpm 不满足时命令以非零状态结束；未安装依赖时会保留可读的未解析条目，先完成 frozen install 再重跑即可。

完整开发验证：

```bash
corepack pnpm run check
corepack pnpm test
corepack pnpm run test:ui
corepack pnpm run build:check
```

## 运行时边界

Node/pnpm 只用于构建、测试和发布工具。插件通过思源前端加载，`plugin.json` 的 `minAppVersion` 与前端支持矩阵仍是用户运行时兼容性的来源；升级开发工具链不会自动提高思源最低版本。

如果要降低 Node 最低版本，必须先在干净 frozen install 中验证所有直接依赖的 engines、类型检查、构建、主测试和浏览器链，不能只修改 `package.json` 的数字。
