# 阻塞
- [ ] B-001 真实设备测试 | 影响 T-023 | 需要用户在思源桌面/手机端实际操作 | 暂跳过
- [x] B-002 宽度走查浏览器环境 | 影响 T-032 的 `width-walkthrough` 证据 | 初始 Playwright Chromium 缺失 | 已改用系统 Chrome 重跑，width walkthrough 与无障碍审计均通过

- B-003 migration audit persistence deferred while restore mutation path is being isolated; preview/version reporting is complete and no data mutation was changed.

B-003 resolved: migration audit persistence is now isolated after successful store persistence; audit-save failure follows existing restore error handling.

- B-004 audit readability formatting deferred after a failed encoding-safe edit; raw audit JSON remains intact and no functional behavior changed.
