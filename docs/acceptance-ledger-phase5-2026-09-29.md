# 阶段 5 验收台账 —— T-1600 页面级无障碍、IME 与响应式走查（2026-09-29）

定位：T-1608 统一验收台账的阶段 5 切片证据之一。分栏遵守 D-307 总纲：**自动浏览器证据**与**思源真实宿主/真机证据**分开登记，模拟通过不冒充实测。本轮走查基线 = commit 743c64a 构建包（v18.9.0 工作树）。

## 1. 走查范围与结论总表

| 走查项 | 结论 | 证据（自动浏览器） | 宿主/真机栏 |
| --- | --- | --- | --- |
| 键盘可达性（click 钩子落点） | **零违规**（已固化守门） | accessibility-audit 新增 #4 检查：7 表面 × 双主题 × 满空两态，`data-action`/`data-mobile-nav` 全部落在原生可聚焦元素；探针先验证后固化（探针 NO keyboard-unreachable click hooks found） | 桌面键盘=自动覆盖；真机外接键盘 host-pending |
| 交互元素可访问名称 | **零违规**（既有守门保持） | accessibility-audit missing-name=0 / 1204 对 | 同上 |
| 正向 tabindex | **零违规**（既有守门保持） | positive-tabindex=0 | 同上 |
| 文本对比度 ≥4.5:1 | **零违规**（预算 0 严格模式） | contrast=0 / 1204 对（亮+暗+空三遍） | 双主题色板=插件独立主题，不依赖宿主 |
| 24px 触控下限（WCAG 2.5.8 AA） | **零违规**（既有守门保持） | target-size=0 | — |
| 44px 触控准则（窄容器） | **修复 8 项（16~36px → 44px）+ 守门固化；8 项致密列表控件实测 28~42px 记录为偏差** | 见 §2；tap-target audit：0 guarded below 44px | 真机触感（惯性滚动/误触率）host-pending |
| 空态/无数据路径 | **零违规**（已固化守门） | accessibility-audit 第三遍 empty store（items/events 全空）全表面走查：missing-name/keyboard/contrast/small 全 0 | 文档目标权限缺失态=T-1573 设置侧已交付，真机权限拒绝 host-pending |
| IME 中文输入法 | **四搜索面组合态守卫在位（既有守门）** | cross-page-consistency：today/settings/history/compare 四面 compositionstart 断言；today-search-ime.test.cjs 浏览器级用例 | 真实 WebView IME（硬件键盘/手写）host-pending |
| 过期异步响应 | **既有机制核实** | summaryRequestId 过期丢弃（index.ts renderSummary 链，T-1604 异步状态契约已登记）；settingsBusy 重入防护（runSettingsAction aria-busy） | 弱网真机 host-pending |
| 失败保留草稿 | **既有机制核实** | journal.retryHint（问卷失败答案保留）、retry-save（编辑器保存失败草稿保留）、设置草稿≠已保存清单（T-1521） | 真机进程被杀场景 host-pending |
| 撤销路径 | **既有守门保持** | width-walkthrough record/undo 交互态；checkin-toast 撤销；归档批量删除影响确认（archived-search 守门） | — |
| reduced-motion | **既有守门保持** | cross-page-consistency：设置/导航/事项/今日绑定四模块断言 | — |
| 320px / 宽 dock / 双主题 | **全绿** | width-walkthrough desktop EXIT=0（49 表面+32 交互态）；CHECKIN_QA_FRONTEND=mobile EXIT=0；visual-qa 亮/暗 EXIT=0 pageErrors 空 | 真机安全区遮拦=T-1605 范畴 |

## 2. 44px 触控目标：修复明细与实测偏差

**修复（窄容器 `@container lc5 (max-width: 719px)`，桌面不动）**：

| 表面 | 控件 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 归档 | 详情与恢复预览折叠头（`__archived-details > summary`） | 16px | 44px |
| 事项 | 新建事项抽屉头（`__occasion-form-drawer > summary`） | 21px | 44px |
| 设置 | 逐项配置文档写入组头（`__settings-group > summary`） | 33px | 44px |
| 设置 | 笔记联动总览面板头（`__source-panel-head`） | 34px | 44px |
| 设置 | 来源沙盒折叠头（`__sandbox > summary`） | 33px | 44px |
| 设置 | 总览「新建项目」入口（`__external-overview` 内 text-button） | 30px | 44px |
| 设置 | 头像自定义文本/文件输入 | 40px | 44px |
| 今日/编辑器 | 未来七天负荷 / 未来 30 天排期预演折叠头 | 36px | 44px |

守门：accessibility-audit 新增 320px mobile 前端遍，上述八类逐项断言 ≥44px（tapShortfalls 零违规强制），防回归。

**实测偏差记录（不拦截，24px AA 下限已强制）**：今日项目名按钮 28px、连击徽标 28px、已完成折叠头 40px、事项横幅「管理」34px 高（宽 44）、归档搜索框 42px、洞察「查看记录」30px、编辑器保存/保存并继续/存为模板 40px。判定：致密列表内的行内文本按钮，符合 WCAG 2.5.8 行内间距豁免形态；44px 为 AAA/厂商准则（HIG 44pt / Material 48dp），全量抬升会显著膨胀列表密度并与宽度走查布局预算冲突。后续若真机反馈误触再逐项抬升。

## 3. 固化守门清单（本轮新增/扩展）

1. `tests/accessibility-audit.test.cjs`（test:extended 链）：
   - #4 键盘可达性检查（零违规强制）——click 语义钩子必须落在 button/a/input/select/textarea/label/summary/option 或 role+tabindex="0" 补偿元素；
   - 三遍走查（亮/暗/空态）——空态遍以 items/events 全空夹具全表面跑同套检查（名称/键盘/对比度/小目标）；
   - 320px mobile 前端触控遍——八类修复项 ≥44px 强制 + 致密列表实测报告输出；
   - 启动器重构为 bootHost（desktop/mobile 共用，store 参数化）。
2. `src/ui/content-responsive.scss` / `maintenance-responsive.scss`：窄容器 44px 触控目标规则（§2 修复表）。

## 4. Host-pending 归集（不阻塞本地里程碑）

- 真机读屏（VoiceOver/TalkBack）逐页走查——自动浏览器只能守名称/角色/状态标记的静态正确性，读屏导航顺序需真机。
- 真实思源移动 WebView 的 IME 硬件键盘、手写输入、惯性滚动下的组合态行为。
- 真机触控误触率与触觉反馈（hapticFeedback 设置项）实测。
- 弱网/进程被杀场景的草稿与撤销恢复实测。

以上已在 T-1602（宿主现场与发布验收台账）任务范围内归集，届时按同一分栏登记。
