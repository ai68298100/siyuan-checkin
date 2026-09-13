# 阻塞
- [ ] B-001 真实设备测试 | 影响 T-023 | 需要用户在思源桌面/手机端实际操作 | 暂跳过
- 验收入口：按 `docs/integration-smoke-checklist.md` 执行手机、页签、dock 与番茄钟双窗口场景；回传设备尺寸、焦点/滚动结果和异常截图后即可继续修复。
- [x] B-002 宽度走查浏览器环境 | 影响 T-032 的 `width-walkthrough` 证据 | 初始 Playwright Chromium 缺失 | 已改用系统 Chrome 重跑，width walkthrough 与无障碍审计均通过

- B-003 migration audit persistence deferred while restore mutation path is being isolated; preview/version reporting is complete and no data mutation was changed.

B-003 resolved: migration audit persistence is now isolated after successful store persistence; audit-save failure follows existing restore error handling.

- B-004 audit readability formatting deferred after a failed encoding-safe edit; raw audit JSON remains intact and no functional behavior changed.

- [ ] B-005 CSS 体积预算超标 | 影响 `test:ui` 尾部与 `check:release`（`tests/release-assets.test.cjs:27`）| 未发布的 dock 宽度打磨提交使 dist CSS 增至 294502 字节，超出 283000 预算（T-109 基线 262270 + 8%）；同工具链下 v9.6.1 实测 264920 字节，+29582（+11.2%）全部来自未发布工作，非环境差异 | 暂跳过
- 处置选项：① 按 D-051 可证明性原则清理死样式，压回 283000 内；② 有依据地上调预算并同步 T-109 注释基线。处置后需重跑完整 `pnpm run test:quality` 留证。
