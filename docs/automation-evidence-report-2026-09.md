# A6 自动化证据汇总报告（R-50 质量收口）

更新时间：2026-09-24  
范围：v18.2.1 发布后自主开发主线（D-264 泳道 R-A0～R-A12）的全部自动化证据汇总，及未关闭 host-pending 项清单。本报告是 A6 质量收口的交付物之一：所有泳道的自动化证据集中可查，并明确哪些项没有被自动化关闭。

## 一、总体结论

- 六条泳道全部开工并有自动化证据：R-A0（路线真值）、R-A1（架构边界守门）、R-A7（日期契约）、R-A2（今日行动台+提醒注意力）、R-A11（UI 台账）、R-A12（快捷入口+新手路径）、R-A8（可保存视图）、R-A3（节奏/恢复投影）、R-A4（渲染块/导入预览）、R-A5（mock consumer）、R-A9（生命周期治理）、R-A10（隐私控制面）、R-A6（本报告+证据复跑）。
- 完整质量链 `pnpm run test:quality`（check:environment → check → build → sync:digest → test → test:ui → test:legacy-style → test:mobile → test:ecosystem → test:extended → test:review-comparison → test:perf → check:release）多轮全绿，最新一轮 EXIT=0。
- 测试套件 172 个守门文件，0 个显式退役（test-suite-coverage 守门）；主链新增 date-keys / architecture-boundaries / ui-state-ledger / today-dashboard / reminder-quiet / quick-entry-capabilities / first-success / view-scope / pace-projection / block-presets / import-preview / task-horizon-mock-consumer 十二个守门套件。
- 架构边界守门：105 个 TS 模块依赖方向/宿主准入/时钟纪律/事件写路径/来源登记全绿（T-1402 weread-adapter 进入 CLOCK_FREE 与 SOURCE_MANIFEST 双清单）。
- e2e 真实内核自动化：agent-capabilities spec 在用户运行中的 e2e 实例（内核 3.8.5 @ 127.0.0.1:6806，已接入思源智能体）通过——宿主登记插件 11 项智能体能力、能力策略放行（附着运行实例模式：playwright.e2e.running.config.mjs + 手写 target.json）。

## 二、性能与预算证据（最新全链实测）

| 项 | 结果 | 门禁 |
| --- | --- | --- |
| 渲染块 1k/10k/100k | 21/34/241ms（含 base 38ms） | 预算内 |
| 回顾渲染器 100k 事件 | 596.9ms，overview 13,926 字节，0 SVG | 预算内 |
| 提醒投影 2000 事项+200 动作 | 98.1ms / 233.0ms（两轮） | 预算内 |
| 10k 事件全量渲染 | 35ms，溢出 0px | 预算内 |
| 100k 规则索引 | 50 条规则 103.5ms | 预算内 |
| 生产 CSS | 607,940 字节 | 620KB 告警 / 640KB 硬线内 |
| rollback rehearsal | 4 步 9 资产通过 | 通过 |

## 三、各泳道交付与证据

| 泳道 | 交付 | 测试证据 | 提交 |
| --- | --- | --- | --- |
| R-A0 路线真值 | D-264 泳道/证据分类、战略+实施两文档、任务分类 | 文档门禁 4 项 | 7b9727c |
| R-A1 架构守门 | tests/architecture-boundaries.test.cjs（依赖方向/宿主准入/无时钟/写路径/来源登记） | 103 模块全绿 | 6e7147f |
| R-A7 日期契约 | src/date-keys.ts + 五文件毫秒差替换零漂移 + DST 双时区矩阵 | 10 加载器同步、等价回放全绿 | 6e7147f |
| R-A2 今日行动台 | features/today-dashboard.ts + 摘要条；安静时段/防抖（reminder-preferences.ts、defer 按钮） | 12 组+8 组验收入主链 | d4e0f86, ee1d4f9 |
| R-A11 UI 台账 | tests/ui-state-ledger.test.cjs 八状态族；统一禁用基线；错误类收编 | 八族四维断言 | 4ce83a6 |
| R-A12 快捷入口+新手 | features/quick-entry-capabilities.ts 描述符注册；features/first-success.ts 旅程状态机+跳过引导 | 9 组+8 组验证 | ddb51c1, 2f62f6c |
| R-A8 可保存视图 | features/view-scope.ts v1 归一化/解析/缺失条件；报告范围行 | 消费守门+双语 | 140d37e |
| R-A3 节奏投影 | features/pace-projection.ts 三口径（backlogRate/quota/at-most）+ 戒断里程碑阶梯（T-1415） | 今日卡里程碑标签 | 10a74bf |
| R-A4 渲染块/导入 | features/block-presets.ts 4 预设+插入通道；features/import-preview.ts 统一预览 | 往返一致经真实解析器 | 3ea3292, 2f00f6d |
| R-A5 来源契约 | 桥消费者升级（calendar.read 发现/单飞/缓存失效/超时/Abort/降级） | tests/task-horizon-mock-consumer.test.cjs | 91ded34 |
| R-A9 数据治理 | features/lifecycle-projection.ts 三动作影响预览 | 删除确认接线 | 921917f |
| R-A3+（9-24 追加）| 目标负荷解读卡（T-1450，回顾 2.0「目标是否过高」）：interpretTargetLoad 样本门槛+固定阈值+确定性排序 | pace-projection 守门扩充 | 576b496 |
| R-A5+（9-24 追加）| 微信读书适配器全套（T-1402 official-pull 渠道首租户）：时长/完读/划线+笔记计数三链路，官方 skill 五文档逐条核对 | tests/weread-adapter.test.cjs + SOURCE_MANIFEST/CLOCK_FREE 登记 | 08b1158, c434ffc, 96d536a, 5351801, 47e3075 |
| R-A2+（9-24 追加）| 每日提醒调度（T-1451）：多时刻槽+每槽每日幂等+启动补发合并 | reminder-quiet 守门扩充 | 1b4831a |
| R-A10 隐私控制面 | features/privacy-scope.ts 导出审计/断开保留/控制面汇总 | 导出+三开关接线 | 2ce5675 |
| R-A6 质量收口 | 本报告 + e2e 真实内核证据复跑 | agent-capabilities 通过 | 本批 |

## 四、明确未关闭的 host-pending 清单

以下项保持开放，不以自动化结果关闭（D-264 口径）：

1. 思源桌面/页签/dock/Android WebView 的触摸、键盘、安全区、重载与真实文档读写（T-1344/T-023/T-033/T-129/T-1256/T-1173 系列，B-007）。
2. 思阅/思播/健康/Task Horizon/Dock Tomato 真实双插件联调与时序证据（T-1388/T-1392/T-1394 等）。
3. 新手引导的首次真实使用反馈（T-1424 消费侧已备）。
4. 快捷入口截图 backlog 的视觉实现（等截图齐全+明确开始信号）。
5. 微信读书真机首拉验证（T-1402 本地完成，等用户在设置页填 Key 后首拉并回传状态行结果）；积分兑换（T-1413）、自建同步等产品决策项。
6. 真实模型端到端对话走查：智能体能力登记+策略已在本环境验证，宿主 AI 面板发起的完整对话属宿主 UI 驱动，建议在已接入智能体的 e2e 实例上手动走查一次「回顾助手复制提问 → 智能体调用插件能力」并留证。
7. 上游 issue/PR 提交与 push/发版（T-1395/T-1417 Pinch 深评等，需用户授权或排期）。
8. 每日提醒推送的真机弹窗形态与多时刻槽体验（T-1443/T-1451：pushMsg 走公开 API 已实现并守门，真实弹窗与到点节奏留真机确认）；思阅/思播提案成稿已备（docs/contracts/upstream-proposals/*-issue-draft.md），提交动作等用户授权。

## 五、证据口径

- 「自动化证据已通过」= 本地代码与模拟/隔离环境满足验收；真实宿主现场验收单独保留开放。
- e2e 隔离内核使用仓库自建带 `checkin-e2e.json` 标记的临时工作区；附着运行实例模式（running config）只跑只读 spec，写入类 spec 需用户知情。
- 本报告随批次滚动更新；下一轮生态调研（T-1400 第四轮，首位 T-1417 Pinch 深评）触发条件不变。
