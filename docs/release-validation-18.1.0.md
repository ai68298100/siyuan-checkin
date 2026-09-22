# v18.1.0 本地发布验收

日期：2026-09-23。状态：本地发布门槛通过；待用户确认后 push 提交与标签，GitHub Release 单独发布。

## 范围

外部数据来源正式接入打卡体系：来源统筹框架（T-1383/D-258）、思阅阅读联动适配器（T-1384/D-260）、健康数据收件箱（T-1403/D-262）；Task Horizon 日历可见性本地侧（T-1390/T-1391/T-1393/D-259）；每日摘要驻留（T-1353/D-257）；容错连续 maxGap 与热力图色阶自适应（T-1400 第一轮采纳，T-1409/T-1410）；锚点跳转重解析与缓存一致性（v18.1.x，T-1404/T-1405）；写入路径可信性加固（T-1387/D-261）；发布证据链升级（T-1398）。公开 API v5 新增 `calendar.read`（共 20 项）。主存储 v3、契约 storeVersion 2、minAppVersion 3.8.4 不变，无迁移脚本，可从 18.0.x 直接升级。

## 验证结果

- `pnpm run test:quality` exit 0（154 个测试文件）：环境检查、类型检查、生产构建、digest 同步、主测试、UI（63 文件含新增 summary-resident/calendar-projection/source-framework/sireader-adapter/health-inbox/streak-tolerance 六个守门）、legacy-style、移动端结构（320~430px + 横屏）、生态契约（含 task-horizon contract/bridge）、扩展（含 100k 性能基线）、对比度/无障碍、review-comparison、perf、`check:release` 三段（资产清单 → 回滚演练 → 发布资源校验）。
- 版本四方一致：`package.json`、`plugin.json`、`src/version.ts`、`dist/plugin.json` 及 README 均为 18.1.0。
- 生产 `package.zip` 693030 字节（**以 v18.1.0 标签树构建**，与发布资产字节一致），SHA-256 `f40fa1d46c1edd986c7bd1b6efee95c9bdeb7b061f4daf6bc7fc8d6e48cc03ab`，与发布说明及 `.artifacts/release-manifest.json` 逐文件哈希核对方式一致；资产与标签源码严格对应（T-1411/T-1412 在标签之后提交，随下一版本发布）。
- 回滚演练：预发布快照 → 坏版本漂移检测（版本复用 + 未知文件）→ 回滚 → 逐文件完整性复核，4 步通过。
- 本地真内核验证（3.8.5-beta.5 主工作区）：摘要驻留幂等 SQL 同日精确命中/相似行不干扰/跨日不误报；验证用临时笔记本已清理。
- **真实内核 E2E（2026-09-23 补录）**：以本机 SiYuan-Kernel（3.8.5-beta.5）+ 独立工作区装入 v18.1.0 生产包，`test:e2e` 16/16 通过（API v5 真实可用、批量写落盘与重载幂等、Dock Tomato 完成入账/幂等/跳过留痕、双窗口对等同步、移动端 bundle 打卡、插件禁用/重启数据完整、渲染块真实渲染、建议确认与撤销），`test:e2e:readonly` 1/1 通过（只读实例不落盘不崩溃）。此为真实内核自动化证据，不替代手动真机触控/安全区验收。

## 验收边界

新增的外部来源联动（思阅/健康收件箱/摘要驻留/Task Horizon 可见性）均 opt-in 默认关，浏览器自动化与本仓库测试链不构成真实宿主证据：思源桌面/页签/dock/Android 现场验收（T-1344/T-1388/T-1406/T-1408）、Task Horizon 消费端联调（T-1392/T-1394）、微信读书 Key 实测（T-1402 前置）继续开放。完成庆祝动效（T-1411）按 D-263 留待收尾。

按 AGENTS.md 不自动 push：本地提交与标签 `v18.1.0` 完成后，远端推送（含此前积压提交）与 GitHub Release 需用户单独确认。
