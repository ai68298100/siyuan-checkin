# v18.2.0 本地发布验收

日期：2026-09-23。状态：本地发布门槛通过。

## 范围

生态调研循环（T-1400/D-256）第一轮采纳项全部落地：容错连续 maxGap（T-1409）、热力图色阶自适应（T-1410）、完成庆祝动效（T-1411，D-263 克制原则）；思播观看联动实验适配器（T-1385）；极简「今日视图」渲染块（T-1412）。主存储 v3、契约 storeVersion 2、minAppVersion 3.8.4 不变；无迁移脚本，可从 18.1.x 直接升级。

## 验证结果

- `pnpm run test:quality` exit 0（155 个测试文件）：环境检查、类型检查、生产构建、digest 同步、主测试、UI（65 文件含新增 siplayer-adapter/streak-tolerance 守门）、legacy-style、移动端结构、生态契约、扩展、性能、`check:release` 三段（资产清单 → 回滚演练 → 发布资源校验，18.2.0 口径）。
- 版本四方一致：`package.json`、`plugin.json`、`src/version.ts`、`dist/plugin.json` 及 README 均为 18.2.0。
- 生产 `package.zip` 695073 字节，SHA-256 `5bf8f27819b1e3e0fd214a16010e3ad8811a7d726fafc8e6d544bda709f1db9f`，与发布说明及 `.artifacts/release-manifest.json`（10 资产逐文件哈希）一致。
- 回滚演练：预发布快照 → 坏版本漂移检测 → 回滚 → 逐文件完整性复核，4 步通过。

## 验收边界

- 思播联动为实验路径（上游无版本化契约），默认关；真实宿主验收（含思阅/思播同装、seek/循环/变速矩阵）归 T-1388。
- 完成庆祝动效已按 D-263 克制原则实现（纯 transform、双闸禁用），移动端真机触控与安全区复核归 T-1344/T-1388。
- Task Horizon 消费端（T-1392/T-1394）、微信读书 Key 实测（T-1402 前置）、轻量积分拍板（T-1413）继续开放。

按 AGENTS.md 不自动 push：本地提交与标签 `v18.2.0` 完成后，远端推送与 GitHub Release 随发布流程执行。
