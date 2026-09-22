# v18.0.3 本地发布验收

日期：2026-09-22。状态：本地发布门槛通过。

## 范围

收口 T-1374～T-1379 的研究结论，形成间隔调度、文档绑定、日记联动、竞品借鉴和思源闪卡联动的采用/延后/不做边界与后续小版本候选。本版本不改变插件运行行为、主存储 v3、公开 API v5、契约 storeVersion 2 或最低思源版本 3.8.4。

## 验证结果

- `pnpm run test:quality` 明确以 exit 0 结束，覆盖环境检查、类型检查、生产构建、主测试、UI、移动端结构、生态契约、扩展、性能和发布资源检查。
- `check:release` 确认 `package.json`、`plugin.json`、`src/version.ts`、`dist/plugin.json`、README、变更记录和发布说明均为 18.0.3。
- 生产 `package.zip` 大小 684657 字节，SHA-256 为 `69a882c840f4ef500d03e46f9a2c63971cfd7aff766a4f0ba6d6f33083a8fd13`。
- ZIP 包含 `index.js`、`index.css`、`plugin.json`、README、LICENSE、图标、预览图和中英文入口字典；没有新增运行时依赖或迁移脚本。

## 验收边界

本版本只有文档、路线和版本元数据变化，因此沿用 18.0.2 已完成的生产 UI 走查，不重复把浏览器截图当作真实宿主验收。真实思源桌面、Android、只读/发布服务、智能体面板与 B-007 双插件联调继续保持开放。

按 AGENTS.md 不自动 push。本地安装包、提交与标签完成后，远端 GitHub Release 仍需单独发布。
