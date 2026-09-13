# 阻塞
- [ ] B-001 真实设备测试 | 影响 T-023 | 需要用户在思源桌面/手机端实际操作 | 暂跳过
- 验收入口：按 `docs/integration-smoke-checklist.md` 执行手机、页签、dock 与番茄钟双窗口场景；回传设备尺寸、焦点/滚动结果和异常截图后即可继续修复。
- [x] B-002 宽度走查浏览器环境 | 影响 T-032 的 `width-walkthrough` 证据 | 初始 Playwright Chromium 缺失 | 已改用系统 Chrome 重跑，width walkthrough 与无障碍审计均通过

- B-003 migration audit persistence deferred while restore mutation path is being isolated; preview/version reporting is complete and no data mutation was changed.

B-003 resolved: migration audit persistence is now isolated after successful store persistence; audit-save failure follows existing restore error handling.

- B-004 audit readability formatting deferred after a failed encoding-safe edit; raw audit JSON remains intact and no functional behavior changed.

- [x] B-005 CSS 体积预算超标 | 影响 `test:ui` 尾部与 `check:release`（`tests/release-assets.test.cjs:27`）| 未发布的 dock 宽度打磨提交使 dist CSS 增至 294502 字节，超出 283000 预算（T-109 基线 262270 + 8%）；同工具链下 v9.6.1 实测 264920 字节，+29582（+11.2%）全部来自未发布工作，非环境差异 | 已处置（2026-09-14）
- 处置记录：全量类名核查（419 个 class 全部在源码有引用）确认无 D-051 意义上的死样式，按选项②上调预算至 318000（新基线 294502 + 8% 余量），T-109 注释同步；四档样式合并精简立项为 15.0-A，完成后下修基线。`pnpm run test:quality` 已于 2026-09-14 全链复绿（exit 0）。

- [x] B-006 真机截图核对（T-023 首批）| 用户提供 4 张手机端截图 | 逐项复现于 scripts/visual-probe.cjs 并修复 7 类布局问题 + 1 项文案门控；守门入 mobile-release-quality | 已修复（2026-09-14）
- 备注：截图中右下紫色悬浮钮为思源移动端自带侧栏钮（宿主 UI），插件侧以列表底部避让空间处理；打卡主按钮较 v9.6.1 略窄是为给操作图标让位的取舍。
