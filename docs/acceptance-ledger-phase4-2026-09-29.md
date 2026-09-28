# 阶段 4 验收台账（T-1584，2026-09-29，T-1608 格式）

## 范围与证据分层

阶段 4「日常页面与辅助工作区」九批（T-1577~1579、T-1580+1592+1593、T-1581+1594+1595、T-1585+1586、T-1587+1588、T-1589、T-1583、T-1584）全部交付。每批证据分级：
- **自动守门**：tests/ 主链 + 定向守门（历轮 test:quality EXIT=0，逐批记录于 PROGRESS）；
- **浏览器走查**：双主题 visual-qa + width-walkthrough（320/360/640/844x350/1180/2000 + editor 预览断言）；
- **host-pending（现场）**：真实思源内核 E2E（test:e2e 需 CHECKIN_E2E_KERNEL）、真实第三方来源、真机——归 T-1602/T-1608 现场验收，不以自动证据冒充。

## 逐批验收对账

| 批次 | 提交 | 核心增量 | 定向守门 | 边界 |
| --- | --- | --- | --- | --- |
| T-1577 今日行动台收束 | 27033be | 行动条收束（环+总数退役，进度唯一归 overview）；环视觉件全链退役（charts/scss/键） | stats-visuals（退役守门 10 断言）+ today-dashboard（+3） | 提醒/事项横幅视觉重排随 T-1585/1586 |
| T-1578 比较器可搜索 | 29757dd | 全量候选+IME 防抖搜索+已选恒显示；归档排除守门固化 | item-trend-compare（+11） | 钻取归 T-1591 |
| T-1579 洞察行动化 | 4787867 | 段序重排+查看记录/编辑规则 CTA（insightsReturnPage 保持）+分母/配额/跳过解释 | insights（+13） | 范围/项目选择器归 T-1590 |
| T-1580+1592+1593 事项三件套 | 581bedc | 表单抽屉（editing 时展开）+agenda 五组+转打卡 confirm 预览 | occasions（+12） | 提醒口径=既有单一实现 |
| T-1581+1594+1595 归档三件套 | dd91b29 | 详情折叠（buildArchivedItemDetails 纯函数）+恢复预览确认+危险区隔离 | archived-search（+15，含纯函数桩映射测试） | 原因字段未存=既有事实 |
| T-1585+1586 提醒中心 | 883a828 | 横幅 dueDate+查看全部（窄宽隐藏保首卡预算）+回顾四动作作用域 title | priority-reminder（+11） | 批量处理归 T-1586 后续评估 |
| T-1587+1588 问卷两件 | d5a360a | 目标配置抽屉+答案预览+双结果并列+幂等补写按钮 | journal-experience（既有全过） | 步进条归 T-1589 后续 |
| T-1589 构建器 | 8ac4529 | 边界说明+模板摘要（题数/必答） | journal-templates（+7） | 分步交互=既有三段结构 |

## T-1583 跨页一致性专项（本轮）

- **危险区三页统一标记**：editor `data-editor-section="danger"` / archived `data-archived-danger` / settings `data-data-section="reset"`（cross-page-consistency 检 1）。
- **IME 守卫四搜索面**：today / settings-navigation / review（history+compare `compareComposing`）组合态均不打断过滤（检 2）。
- **reduced-motion 缺口修复**：occasions 抽屉滚动补 `host.reducedMotion ? "instant" : "smooth"`（宿主接口声明 + 结构化透传，检 3）——本轮唯一代码修复。
- **会话恢复模式在位**：设置搜索 WeakMap 会话（T-1563）、回顾 renderReviewPreservingView、洞察 insightsReturnPage（检 4）。
- **导航单一路径**：五个 showXxxFor 集中 navigation.ts（检 5）。
- 颜色/文字冗余、对比度、触控目标：accessibility-audit + ui-theme + visual-qa 既有守门承载（历轮全绿）。

## T-1588 双结果语义确认

提交失败路径：事实先落盘（isComplete 分流防重记）→ 文档写入失败不回滚 → 页内并列「✓ 事实已保存 / ✗ 文档未完成」+ 幂等补写按钮（重调 onSubmit：isComplete 分流只更新文档）。取消零写入、alreadyWritten/目标失效/日期变化各有独立状态=既有。

## host-pending 清单（现场验收归 T-1602/T-1608）

- 真实思源内核 E2E（test:e2e，含文档目标/来源卡/恢复/重载场景）；
- 真实第三方来源联调（思阅/思播/微信读书/叶归——T-1508 会话身份上游依赖）；
- 真机（Android/WebView）触控与安全区；
- Task Horizon 消费端联调（对方未实现，恒 waiting）。

## 统计

- 阶段 4 九批 14 任务全部交付；CSS 630659 bytes（预算内）；i18n parity 2464 对；test-suite-coverage 211 文件。
- 每批历轮验证：check / 主链 / build / test:ui / test:quality / 双主题 visual-qa / 宽度走查全 EXIT=0。
