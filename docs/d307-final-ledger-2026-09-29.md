# D-307 统一页面体验改造 · 收官对账台账（T-1608，2026-09-29）

定位：D-307（consolidated-experience-plan-2026-09-28）收官索引。六阶段对账以「任务ID | 提交 | 守门 | 台账节」登记；证据分栏遵守总纲——自动浏览器 / 隔离内核 / 真实宿主 / 真实第三方与真机，host-pending 不核销。计划原文明确「各页可小批次交付，不要求 64 条任务在同一版本完成」，本收官口径如实分列「已交付 49 项 / 未排期增量 5 项 / 候选与观察 7 项」。基线 = commit 554f8a9（v18.9.0 工作树，本地领先 origin 56 提交，协议不 push）。

## 1. 六阶段对账表

### 阶段 0 · 真值与正确性（3 提交）

| 任务 | 提交 | 守门 | 台账 |
| --- | --- | --- | --- |
| T-1575 能力/入口/状态注册表 | 4541f50 | ecosystem 注册表守门 | registry §各节 |
| T-1561 设置字段登记 | c2cfe15 | settings-migration | phase4 台账 |
| T-1545/1568 联动视图/编辑器字段矩阵 | eb5bf55 | 同上 | 同上 |
| T-1609/1610 完成公式/行动台口径 P0 修复 | 233ca53 | model.test（evaluateDayCompletion 唯一公式） | PROGRESS 2026-09-28 |

### 阶段 1 · 原型与共享契约（5 提交）

| 任务 | 提交 | 守门 | 台账 |
| --- | --- | --- | --- |
| T-1603/1604 路由契约+异步状态契约（代码落地） | 13d7fef | cross-page-consistency、kernel-regression（契约 4 重载矩阵） | docs/surface-routing-contract-2026-09-28.md |
| T-1554 联动状态/空态矩阵 | 3397c34 | integration-status-matrix | 文档 |
| T-1556 目标选择器规范 | 1c99199 | target-selector 相关守门 | 文档 |
| T-1569 类型驱动编辑器原型 | 95c0bcc | editor-sections | 文档 |
| T-1546 新用户任务式入口原型 | 9378ed8 | ui-docs | 文档 |

### 阶段 2 · 联动纵向切片（7 提交）

| 任务 | 提交 | 守门 | 台账 |
| --- | --- | --- | --- |
| T-1553 来源卡动作动统一 | f60dc8f | source-framework 等 | phase4 台账（T-1584 九批对账） |
| T-1557/1558 文档目标卡五动作 | ec6d3c8 | settings-migration | 同上 |
| T-1551/1549 宿主组拆分 | f68a706 | 同上 | 同上 |
| T-1552 五段写入卡 | 4e648b1 | 同上 | 同上 |
| T-1547 来源→项目闭环 | d9072cc | diary-report/summary-resident | 同上 |
| T-1548 零写入内容预览 | f4c30cd | 同上 | 同上 |

### 阶段 3 · 设置与编辑器迁移（13 提交）

| 任务 | 提交 | 守门 |
| --- | --- | --- |
| T-1559/1560 绑定健康中心+读写范围七点 | 602af00/733288a | settings-migration |
| T-1562~1566 设置总览/字段搜索/四段合并/数据组 | 3f16581/af97d7c/91be7c2/ef9cd9d/e6107ab | settings-navigation、settings-migration（5 检） |
| T-1567 设置迁移切片验收（收官） | aeea9e0 | settings-migration 新增 |
| T-1570~1574 编辑器批次（主流程提升/高级分区/模板徽章/共享计算/兼容验收） | 77c4fd2/9ce05eb/3e2d5f3/bffe69a/868c400 | editor-sections（13 断言）、cross-page-consistency |

### 阶段 4 · 日常页面与辅助工作区（13 提交）

| 任务 | 提交 | 守门 |
| --- | --- | --- |
| T-1577 行动条收束 | 27033be | today-dashboard、stats-visuals 退役守门 |
| T-1578 比较器全候选搜索 | 29757dd | review-compare 相关 |
| T-1579 洞察可行动化 | 4787867 | insight-a11y |
| T-1580/1592/1593 事项 agenda/抽屉/转入确认 | 581bedc | occasions.test |
| T-1581/1594/1595 归档详情/恢复预览/危险区 | dd91b29 | archived-search |
| T-1585/1586 今日横幅到期日 | 883a828 | reminder 相关 |
| T-1587/1588 问卷抽屉化/双结果面板 | d5a360a | journal-experience、kernel-regression |
| T-1589 构建器边界注记 | 8ac4529 | journal-templates |
| T-1583/1584 跨页规范+阶段 4 台账（收官） | 04163e5 | cross-page-consistency（7 checks） | docs/acceptance-ledger-phase4-2026-09-29.md |

### 阶段 5 · 多表面与质量收口（11 提交，T-1596~1608）

| 任务 | 提交 | 守门 | 台账节 |
| --- | --- | --- | --- |
| T-1596 专注跨页生命周期 | 8bdc97f | focus-lifecycle | phase5 §1（走查表） |
| T-1597 快速弹窗会话 | 8e1a845 | desktop-dialog/mobile-dialog | 同上 |
| T-1598 渲染块生命周期守门 | ca86a51 | block-dom-compat（8 断言） | 同上 |
| T-1599 编辑器单级返回栈 | 7d2949b | cross-page-consistency T-1599 块 | 同上 |
| T-1576 统一页面壳（P0） | 743c64a | cross-page-consistency T-1576 块（20 断言） | 同上 |
| T-1600 无障碍/IME/响应式走查 | 02cba6e | accessibility-audit（三遍+触控遍+遮挡守门） | phase5 §1~3 |
| T-1601 隔离内核回归 | f194f31 | kernel-regression（双结果+契约 4） | phase5 §0 覆盖矩阵 |
| T-1602 宿主现场与发布台账 | 2a0e515 | 引用核实 | host 台账 §1~8（H1~H8） |
| T-1605 响应式宿主壳与安全区 | 6127831 | walkthrough 四组合+遮挡守门 | host 台账 §10 |
| T-1606 键盘/IME/读屏/触控基线 | a01d42c | cross-page-consistency T-1606 块+audit 行为检查 | host 台账 §11 |
| T-1607 渲染性能与长数据分层 | 554f8a9 | kernel-regression 250ms 灾难守门 | host 台账 §12 |

## 2. 最终全表面回归记录（2026-09-29，554f8a9 工作树）

| 链 | 结果 |
| --- | --- |
| pnpm run check（tsc） | EXIT=0 |
| test:quality 全链（check+build+test+ui+legacy+mobile+ecosystem+extended+review-comparison+perf+digest+release） | EXIT=0（CSS 631568 / 预算 640KB） |
| accessibility-audit（亮/暗/空三遍+320px 触控遍+底栏遮挡+键盘行为） | EXIT=0（0 名称缺失/0 tabindex/0 键盘不可达/0 对比度违规/1204 对文本） |
| visual-qa 亮/暗双主题 | 双 EXIT=0（pageErrors 空） |
| width-walkthrough dock×桌面/移动 + tab×桌面 + dialog×桌面/移动 | 五组合全 EXIT=0 |
| kernel-regression（问卷双结果+契约 4 重载矩阵+渲染性能守门） | EXIT=0 |

## 3. 遗留缺口清单（如实登记，不宣称完成）

**未排期 P1 增量（D-307 范围内，5 项）**：
- T-1550 三组联动可用性切片验收——部分证据已散布（phase4 台账九批、kernel-regression 闭环），系统化逐项走查未做。
- T-1555 设置内容去重与分层走查——设置迁移已交付（T-1562~1567），内容级去重走查未做。
- T-1582 快速弹窗/专注/嵌入表面一致性——部分由 T-1596/1597/1598/1605 承接（会话/生命周期/宿主壳），「复用今日页记录内核」的系统性对账未做。
- T-1590 单项洞察范围与项目选择（28/84/365/自定义+可搜索选择器）——未实施。
- T-1591 单项洞察钻取与行动建议（图表日期格键盘/触屏跳转、口径说明、教练 CTA）——未实施；T-1606 已登记为键盘路径缺口。

**候选与观察（7 项，有触发条件）**：T-1538（闲置暂停，用户拍板+真机验证）、T-1539（AI 复盘复制提示词，下批优先候选）、T-1540（源时记，上游确认）、T-1541（LifeLog 时间轴，下批候选）、T-1542（LifeLog 聚合，前置口径）、T-1543（日历徽标，观察）、T-1544（叶归修订检测，纪律敏感，用户反馈触发）。

**实施边界（已交付任务的注记，非遗漏）**：多 root 各自 SurfaceContext 独立（T-1576 契约验收门 1，宿主字段仍共享）；日期/范围/滚动/焦点的全量 params 序列化（T-1599 边界）；insightsReturnPage 单级返回。

## 4. Host-pending（H1~H8，维持不核销）

见 docs/host-acceptance-ledger-2026-09-29.md §8。真实思源宿主/真机/第三方现场证据待条件具备（真机×2、真实 Key、真实番茄插件、集市上架 T-1366、Task Horizon 对方排期）后按 §9 记录格式回填；**模拟通过不冒充现场实测**。

## 5. 收官状态

D-307 六阶段 49 项任务交付完成（含 T-1608 本项），4 份台账就绪（phase4/phase5/host/本索引），最终全表面回归全绿。遗留项见 §3/§4，后续按候选触发条件或用户拍板排期。
