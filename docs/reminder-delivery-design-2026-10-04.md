# 每日提醒与提醒入口设计

T-1618 保留默认开启；无自定义时刻每天首次检查提醒一次，配置时刻后以本地日期、时刻和工作区上下文判定已发送。启动时多个已到点时刻合并成一条摘要；零待办、安静时段和关闭状态不消费时刻。通知记录和今日免打扰放入独立插件存储，读取、判断、写入和呈现经过同一存储锁，避免同工作区窗口重复发送。

思源原生消息接口不能承载插件自定义按钮，本次使用插件自己的非模态通知，保留关闭、今日不再提醒和查看提醒中心。关闭只收起当前通知；每日发送记录仍有效，可从今日页重新进入提醒中心。今日免打扰在工作区共享，次日自动失效；全局关闭和安静时段沿用现有设置，不改变事项、打卡事实或提醒动作。

先完成通知 DOM 的离屏准备，再持久记录发送身份，最后挂载通知。挂载失败在锁内撤销本次身份；持久化失败不呈现成功，不消费尚未保存的时刻。失败采用一分钟、五分钟、十五分钟的重试间隔，当日只首次显示故障提示。发送身份保留最近七个本地日期，避免无界增长。

T-1611 把查看全部提醒放入优先提醒首行的动作组，避免独立占用一行。进入同表面的回顾分析工作区，展开并定位、聚焦提醒中心；返回今日页使用该表面的现有导航，不复制提醒数据。入口遵循提醒中心当前实际归属，不依赖已退役的概览位置。

T-1612 在宽容器中将来源、标题、日期和动作组收束到同一行，备注另占一行。窄容器中动作组改为横排并允许整组换行，保持每个按钮至少 44px 高，禁止单字竖排。所有操作继续使用现有提醒实例身份和动作处理器。

今日优先卡采用普通可读区域；单独保留一个不随页面重绘替换的读屏播报节点，只在摘要或状态变化且提醒可播报时更新。关闭通知、全局关闭、安静时段和今日免打扰分别按其作用范围处理，避免每次筛选、保存和页面重绘都重复朗读提醒。通知使用独立 aside 和主题 token，不复用页面根 .lc-checkin 的结构或最小高度。

验收分为确定性行为与浏览器布局：默认与多时刻、重载、两个窗口并发、跨日、发送失败与免打扰写入失败；宽度 320/360/720/1180、两种主题、两种语言、键盘和按钮范围说明。未执行的验证不记为通过。

2026-10-04 本地验收：`node tests/reminder-delivery.test.cjs` 的 16 项行为测试通过，执行真实提醒投影和存储调度；两个独立模块实例共享存储锁，覆盖重复启动、多时刻合并、跨日、空事实、安静时段、通知挂载回滚、写入重试、免打扰失败保留、稳定播报节点和卸载。该测试已纳入主 `test` 脚本，也可单跑 `pnpm run test:reminder-delivery`。

`node tests/reminder-delivery-browser.cjs` 的 18 个真实构建场景通过：四种宽度乘以双主题、双语，共 16 场景；另有 320/1180px 的 dock/页签并存场景。验证通知和卡片按钮至少 44px、无通知横向溢出、通知不匹配页面根、入口与首行共用动作区、宽卡片动作横排、键盘进入实际提醒中心并聚焦标题、免打扰失败可重试、重绘不重复修改 aria-live 节点，以及卸载清理。截图保存在 `output/playwright/reminder-delivery/`，可单跑 `pnpm run test:reminder-delivery-browser`。

本地检查：`pnpm run check`、`pnpm run build:check`、i18n hygiene/parity、提醒 quiet/digest/priority、主题与 kernel-regression 定向通过。浏览器使用真实 dist 构建和模拟宿主存储；没有把实际思源客户端、多设备同步或真实读屏器操作记为通过。完整质量链和根台账由主代理统一收口。

交付文件：提醒新增 `src/features/reminder-delivery.ts`、`src/render/reminder-delivery.ts`、`src/ui/reminder-delivery.scss`、`tests/reminder-delivery.test.cjs`、`tests/reminder-delivery-browser.cjs` 和本文。共享窄补丁涉及 `src/index.ts` 的提醒初始化/同步/卸载、提醒设置、今日绑定和 `showReminderCenter`/`maybeSendDailyReminder`；`src/i18n.ts` 的提醒键；`src/render/fragments.ts` 的优先卡语义与摘要属性；`src/render/bind-today.ts` 的提醒中心点击处理；`src/ui/tokens.scss` 的通知 token 选择器；`src/ui/reminder-density.scss` 的首行动作 margin；`tests/reminder-quiet.test.cjs` 与 `tests/reminder-digest.test.cjs` 的投递接线守门；`package.json` 的两个独立提醒脚本及主测试入口。没有新增待集成的提醒调用点。

T-1626/T-1582 的共享树实现文件为 `src/focus-clock.ts`、`src/render/focus-timer.ts`、`tests/focus-lifecycle.test.cjs`、`tests/focus-adapter.test.cjs`、`tests/v6-efficiency.test.cjs` 和 `src/i18n.ts` 的专注键。29 项专注生命周期测试、适配器、效率守门及 D-331 修正后的构建通过；有效时间排除不可见、休眠/锁屏信号和异常双时钟间隔，恢复不自动继续，保存确认才庆祝，失败保持可重试会话。

共享树的最后一次 architecture-boundaries 检查仍失败于另一并行任务的 `src/navigation.ts` 对 `render/page-shell` 的 type import；早先该守门通过，本次不能把最新共享树记作全绿。该文件和守门由主代理处理，提醒与专注交付未改导航、page-shell、Editor 或根台账。
