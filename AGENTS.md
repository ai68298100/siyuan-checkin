# 自主开发协议

- 目标：持续推进 TODO。
- 每轮：读 TODO/PROGRESS/BLOCKERS/DECISIONS → 选任务 → 计划 → 实现 → 验证 → 更新文件 → 下一个。
- 提交：不频繁 commit，不 push；每阶段/里程碑或 3-5 个相关任务本地 commit 一次。
- 阻塞：小歧义自决并记 DECISIONS；大阻塞记 BLOCKERS，能跳过就跳过。
- 停止：只有所有可做任务都阻塞或必须我决策时才停。
- 汇报：任务ID | 状态 | 证据 | 下一步。
- 续跑：上下文将满先落盘并输出续跑口令。

## 项目上下文

- 思源笔记打卡插件「小驴打卡」，仓库 `D:\AI\Codex\siyuan-checkin`
- 构建：`pnpm run build` → dist/
- 类型检查：`pnpm run check`
- 测试链：`pnpm test` / `test:ui` / `test:mobile` / `test:ecosystem` / `test:perf` / `check:release`
- 视觉 harness：`node tests/visual-qa.cjs`（需 CHECKIN_BROWSER）+ `CHECKIN_QA_THEME=dark`
- 宽度走查：`node tests/width-walkthrough.cjs`
- 版本：9.0.0+，ESM + TypeScript + Webpack + SCSS
- 设计语言：淡紫蓝画布 + 白卡 + 紫罗兰主色 + 独立双主题（不跟思源色）

## 禁止

- 编造测试结果
- 跳过验收
- 改无关代码
- 删除未完成任务
- 自动 push
- 修改思源本体
- 臆造思源 API
