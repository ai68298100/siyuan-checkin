# 打卡/习惯应用竞品对标分析（2026-09）

> 调研方式：三路并行——① GitHub 开源项目源码深读（Loop Habit Tracker / Table Habit / Habitica 等）；② 应用商店商业竞品（Habitify / Streaks / Forest / 滴答清单 / 小日常 / 时光序 / Atoms 等）；③ 笔记生态同类插件（思源集市 / Obsidian / Logseq / Notion 模板）。本文件是结论沉淀，为后续版本开发提供依据。

---

## 一、开源项目源码精华

### 1. Loop Habit Tracker（iSoron/uhabits，10.2k★，Kotlin，GPL-3.0）

Android 端标杆，算法最严谨。核心业务全部在 `uhabits-core`（纯 Kotlin，平台无关），Android 只做壳。

**五态打卡模型**（`models/Entry.kt`）——这是最值得抄的抽象：

```
YES_MANUAL = 2   手动完成
YES_AUTO   = 1   按频率推断"免检通过"（弹性频率达标后周期内剩余日自动补全）
NO         = 0   应做未做
SKIP       = 3   显式跳过（当天不适用）
UNKNOWN    = -1  无数据
```

- toggle 循环：`YES_MANUAL → SKIP → NO → UNKNOWN → YES_MANUAL`
- 数值习惯分 `AT_LEAST / AT_MOST`（至少/至多目标），数值以千分之一整数存储避免浮点误差
- 频率 = `Frequency(num, den)`（3 次/7 天这种任意区间），不做"固定星期几"假设

**强度分数：半衰期指数滑动平均**（`models/Score.kt`）——全项目最经典的 5 行：

```kotlin
fun compute(frequency: Double, previousScore: Double, checkmarkValue: Double): Double {
    val multiplier = 0.5.pow(sqrt(frequency) / 13.0)
    var score = previousScore * multiplier
    score += checkmarkValue * (1 - multiplier)
    return score
}
```

物理含义：`multiplier` 是单日半衰衰减因子，频率越高遗忘越快（开方压平曲线，13 是可调常数）；新分数 = 旧分衰减后与当天表现（0~1）的凸组合。逐日 O(n) 滚动即得 0~100 平滑曲线。**SKIP 日冻结衰减**（既不加也不减）。

**弹性频率自动补全**（`models/EntryList.kt`）：`snapIntervalsTogether` 把凑满次数的区间整体前移消除空隙，中间空档全标 `YES_AUTO`——"每周 3 次"不必盯着固定日子，链条不断。SKIP 在合成时优先级最高，不吃 YES_AUTO 配额。

**连续天数**（`StreakList.kt`）只看 `value > 0`：SKIP 不算成功也**不断链**。

**提醒系统**（`reminders/ReminderScheduler.kt`）：snooze 持久化、past snooze 丢弃、实现 CommandRunner.Listener 在任何数据命令后 `scheduleAll()` 重排（排除打卡/改色命令防抖动）。教训（issue #1573）：已打卡后通知仍弹出——提醒前必须检查当天是否已录入。

**导入导出**：`HabitsCSVExporter` 是事实上的行业交换格式；mhabit 等竞品都做了 Loop CSV 导入器——迁移入口是刚需。

弱点：无 iOS/Web、无同步、AT_MOST+周频组合 bug 高发（#2212）、无习惯分组（#2020）。

### 2. Table Habit（FriesI23/mhabit，1.6k★，Flutter，Apache-2.0，当日仍在更新）

数值目标 + 成长曲线做得最好。

**Sigmoid 习惯成熟曲线**（`lib/common/math.dart`）：分数上限不是线性 100 天，而是逻辑斯蒂曲线 `y = 1/(1+exp(-0.4*x))`，x 映射 (0..targetDays)→(0..100)——前期涨得慢、中期加速、接近目标天数饱和，可视化"习惯正在扎根"。

**等级化完成判定 + 超额封顶**（`lib/models/_score/calculator.dart`）：

- 正习惯完成度分级 `zero / ok / goodjob`（超额）；负习惯在底线与目标间线性插值，恰在目标处得分最高
- 部分完成衰减减半：`prtPartial = -100/targetDays/2`
- **超量完成奖励封顶 1.5 天**——多劳有奖但防刷
- SKIP 无惩罚（不衰减也不加分）

**确定性记录 UUID**：`recordUUID = f(habitUUID, date)` 派生，天然幂等，利于多端合并。另有 WebDAV 同步 + `loop_import.dart` 从 Loop 迁移。

弱点：WebDAV 边角 bug 多、分数>100 不降（#609）、一天只允许一条记录、补录历史不方便。

### 3. Habitica（HabitRPG/habitica，14.2k★，Node+Vue）

游戏化鼻祖。关键启示是三条数学设计（`website/common/script/ops/scoreTask.js`）：

```js
// 任务价值随完成次数指数衰减——防"为打卡而打卡"
let nextDelta = (0.9747 ** currVal) * (dir === 'down' ? -1 : 1);
// 难度乘数贯穿收益与惩罚：trivial 0.1 / easy 1 / medium 1.5 / hard 2
// 连击加成：streakBonus = currStreak/100 + 1（100 天连击翻倍）
```

- 清单子任务按比例计损益（漏做的 daily 完成 2/3 子项，伤害乘 1/3）
- 确定性随机 `predictableRandom`：同一操作重放结果一致，服务端可无锁验证
- `sleep` 官方请假机制、`rebirth` 重生继承成就

**头号教训：内疚感是流失主因**——积压的 dailies + 队友连带伤害（boss 战全队挨打）让用户弃坑（Reddit 流失讨论）。游戏化只对部分人格生效。

### 4. 其他亮点

- **HabitTrove**（681★，TS/Next.js，增速快）：JSON 文件即数据库（git 可管理）、结算器独立模块与录入解耦
- **BeaverHabits**（1.8k★，FastAPI）：产品哲学即答案——"不需要 Goals，只需要标记今天"，极简反 KPI 化
- **Habo**（1.5k★，Flutter）：端到端加密同步——跨设备同步走"加密后经任意通道"比自建服务更贴合思源生态
- **dijo**（2.9k★，Rust TUI）：命令行动词即打卡——"打卡 API 化"的极端形态，与我们的智能体 API 方向暗合

---

## 二、商业竞品优劣

| 应用 | 定位 | 最被称赞 | 最常见抱怨 | 定价 |
|---|---|---|---|---|
| Habitify | 数据仪表盘标杆 | 界面干净、跨端同步稳、周报仪式感 | 免费 5 个习惯、CSV 导出在付费墙后、不支持导入 | $40/年 或 $96 买断 |
| Streaks | Apple 设计奖、链条心理 | 一眼可读的链条、Watch/锁屏零摩擦、买断 | 仅 Apple、统计弱 | 一次性 $6 |
| Forest | 番茄+种树沉没成本 | 枯死负反馈够疼、真树环保意义 | 转订阅"背刺"、免费版限制多 | 付费+Plus 订阅 |
| Flora | Forest 免费社交版 | 组队专注自习室氛围 | Premium 贵、双端不对齐 | 免费+$12/月 |
| 滴答清单 | 习惯寄生待办主流程 | 任务+习惯同屏、年度热力图 | 习惯是 Premium 功能 | ¥179/年 |
| 小日常 | 国产极简 | 极简零负担、**数据本地存储** | 无统计、无激励 | 免费 |
| 时光序 | 全家桶仪表盘 | 15 工具互相印证 | 自动续费激进、隐私存疑 | 免费+会员 |
| Productive | 引导式网红款 | 上手即用、Routine 化 | **限额逼订阅**是高频差评 | $60/年 |
| Atoms | 《掌控习惯》官方 | 身份认同式打卡（"完成阅读=我是读者"）、习惯栈 | 贵、免费 1 个习惯 | $10/月 |
| Way of Life | 三色月历链 | 绿/红/黄跳过标记、一眼可读 | 高级功能仍简陋 | 买断 |

**"让人坚持下来"的行为设计机制汇总**：

1. 链条/连续天数——损失厌恶是第一驱动力（Streaks/Way of Life）
2. **宽容机制是刚需**：skip/rest day/freeze，「外部原因不该断链」被反复验证；跳过≠失败，防 what-the-hell 破罐破摔（Loop「–」、Way of Life 黄格）
3. 强度衰减而非清零——中断后重启心理成本低（Loop score 曲线）
4. 自动打卡——HealthKit 数据自动完成，「能自动的别让用户动手」（Streaks）
5. 周报/年度热力图——固定反思节点 + 长期价值证据（Habitify/TickTick）
6. 视觉资产+真实意义——树的积累、真树捐赠比纯金币耐久（Forest/Flora）
7. 同伴压力——「看见别人打卡自己不想落下」约束>奖励（Flora/小计划）
8. 身份认同——打卡绑定「我是谁」而非机械勾选（Atoms）
9. 零摩擦入口——小组件/锁屏/快捷指令；Habitify 差评证明入口摩擦=「defeats the purpose」
10. 反面教材：限额逼订阅（Productive/Atoms/Habitify）与转订阅背刺（Forest）直接写进差评；买断/本地优先口碑显著更好

---

## 三、笔记生态插件（最相近场景）

### 思源集市

- 全量扫描 bazaar `plugins.txt`：**专门打卡插件只有 2 个**——我们和 Achuan-2。市场空间明确。
- **Achuan-2/siyuan-plugin-task-note-management**（219★，AGPL，2026-02 起转付费）：任务+习惯一体，习惯绑定笔记、任务完成自动打卡、番茄时长归集习惯、移动端后台提醒。存储是"插件私有为主 + `habitMemoBlockSync.ts` 把打卡状态回写笔记块（appendBlock/setBlockAttrs）"的混合模式。弱点：功能庞大难维护、转付费后停滞。
- 番茄钟类：sy-tomato（状态栏启动，14 万+ 下载，市场最成功的计时类）、docktomato（块绑定+属性视图联动，与 Task Horizon 互通）。
- **syh19/task-list**（53★）：插件零存储、读原生任务列表块做聚合，点击跳文档+滚动+闪烁高亮——"读笔记原生数据做聚合视图"的最简范本。
- **frostime/sy-time-logger**：反面教材——纯插件私有存储导致数据孤岛，用户数据难迁移，已弃维护。

### Obsidian

- **Habit Tracker 21**（3.4 万下载）：习惯数据分散在笔记里，插件扫目录渲染 ```habittracker``` 代码块；**gapStyle 断签容忍**（断一天显示淡化而非清零）；点击日期跳当天日记。
- **Tracker**（1.9k★）：零自有存储，声明式代码块查询 frontmatter/标签/内联字段/表格，表达式引擎算 `maxStreak()`；月圆圈日历支持 `circleColorByStreak`（连击越长颜色越深）。
- **Heatmap Calendar**（960★）：一个极小 API `renderHeatmapCalendar(container, {date, intensity, content}[])`；intensity 线性映射 clamp 到色阶数组、`data-date` 属性、today 环。**弱点：单元格无点击事件**——我们必须做点击跳转。

### Logseq

- **habit-tracker**（119★）：扫日记页 `#habit` 标签块，支持计次、`3/d` `4/2w` 周期语法、**At Most 上限型目标**（戒断类）。

### Notion 模板（数据模型参考）

规范化 schema 即标准关系模型：`Habits` 表（一行一个习惯：id/名称/emoji/颜色/目标/周期规则）+ `HabitLog` 表（一行=习惯×天：habitId/date/值/来源/备注）；Day Score 公式算当日完成率。

---

## 四、共性设计模式（嵌入笔记型工具收敛出的结论）

1. **数据层光谱四位置**：①注释即数据（笔记原生但靠用户纪律）→ ②代码块自包含（可移植）→ ③插件私有存储（功能强但成数据孤岛，sy-time-logger 因此死掉）→ ④**混合式胜出**：私有存储为 source of truth + 回写块属性/memo 让笔记可见可搜索（Achuan-2、docktomato）。
2. **UI 挂点分工**：状态栏=计时器、dock=聚合统计、文档内代码块=声明式渲染视图、对话框=深度统计、块菜单/事件=快捷打卡。
3. **渲染公式收敛**：月网格 + intensity→色阶 + streak（带断签容忍）+ today 环 + 点击格子跳当日日记。
4. **联动三件套**：跳转定位（打开+滚动+高亮）、事件触发（完成任务=打卡、番茄归集）、周期提醒（含移动端系统通知）。
5. **周期语义统一**：`N/天`、`N/周`、`N天/周`、周目标数、At Most 上限型。

---

## 五、对「小驴打卡」的可执行借鉴清单（按性价比排序）

我们已有：四种记录类型、计划排期、回顾页趋势/热力图/成就/建议、66 模板、提醒、归档、批量操作、智能体 API、备份/审计。对照竞品，差距与机会如下。

### A. 算法层（成本低、收益最大）

1. **SKIP 跳过态升级为一等记录态**（借 uhabits 五态模型）：跳过不断链、不衰减、不内疚；热力图用中性色区分（uhabits PR #1736）。这是所有调研中一致性最高的需求。
2. **引入强度分数**：`score = prev * 0.5^(sqrt(freq)/13) + done * (1 - 0.5^(sqrt(freq)/13))`，逐日滚动，SKIP 冻结衰减；作为"习惯强度"指标反哺回顾页建议与排序。可选叠加 mhabit 的 sigmoid 成熟曲线（targetDays 饱和感）。
3. **弹性频率自动补全**：周/月 x 次的排期达标后，周期内剩余日自动置 AUTO 态（mhabit 滑动窗口法更好实现）；streak 基于 manual+auto 合并序列计算。
4. **完成度分级 + 超额封顶**：`ok/goodjob` 分级、超额奖励封顶 1.5 倍；数值型负习惯用底线-目标插值。成就系统可加「超额日」「连续超量」徽章。
5. **（可选）轻量自平衡积分**：借 Habitica 三件套——收益递减 `0.9747^v`、难度乘数、`streakBonus = streak/100+1`。不做 RPG，只防"机械化打卡"。

### B. 笔记联动层（差异化王牌，独立 App 做不到）

6. **打卡回写笔记块**（借 Achuan-2 `habitMemoBlockSync` 思路）：打卡状态/理由写进绑定块属性或 memo 块，让思源搜索与反链能命中；插件存储保持 source of truth。
7. **打卡即笔记**：打卡备注/反思锚定到日记文档，沉淀为可检索笔记——对标 Atoms 的动机包装，但用用户自己的文字，形成"打卡-回顾-写作"闭环。
8. **声明式渲染块**（借 Obsidian Tracker/Heatmap Calendar）：提供代码块/渲染块按笔记本/文档/标签聚合打卡数据进笔记正文，支持多 dataset 与 `maxStreak()` 类表达式；月网格必须带点击跳转（打开当日日记+滚动+高亮，借 task-list 交互）。
9. **任务完成自动打卡**：与思源任务列表块/番茄钟联动（块菜单加"打卡"入口），番茄时长可归集到习惯。
10. **迁移入口**：实现 Loop Habit Tracker CSV 导入（行业事实标准，mhabit 也验证了这是刚需）；CSV/JSON 导出兼作备份——「数据所有权」本身就是本地优先插件的卖点。

### C. 行为设计层

11. **宽容提醒**：打卡后撤销当日剩余提醒（uhabits #1573 教训）；snooze 持久化；数据写操作后重排提醒（命令监听模式）；错过当天不打扰、放到「明日补卡」。
12. **反内疚设计**：连续未达时由「建议」主动下调排期强度；streak 断裂表述为「重置」而非「归零」；默认不渲染红色惩罚视觉。
13. **周报仪式感**：固定周回顾视图（Habitify 周报/TickTick 年度热力图已验证需求）；回顾页卡片可独立隐藏对齐 uhabits 卡片拆分。
14. **轻量激励**：里程碑徽章（7/30/100 天）+ 有积累感的视觉隐喻（树/成长曲线，可借 mhabit sigmoid）；奖励与真实意义挂钩，不做空洞金币。

### D. 架构层

15. **记录确定性派生**（mhabit）：未来多端同步/导入合并天然幂等。
16. **计分逻辑单一代码路径**（Habitica common/script 模式）：同一函数服务 UI、智能体 API、批量操作，防实现漂移。
17. **数据模型对齐 HabitLog 标准关系模型**：习惯定义与打卡日志分离（我们已接近，检查字段含来源 source 可补齐自动/手动溯源）。

### E. 明确不做

- RPG 化（宠物/血量/职业）——内疚感流失教训 + 维护成本，只取其数学不取其皮。
- 账号体系/社区——本地优先定位，社交做「可见性」（导出分享卡片/热力图贴进共享文档）即可。
- 自建同步服务——如需跨设备走思源同步/WebDAV/E2EE（Habo 思路）。

---

## 六、来源索引

- 开源：https://github.com/iSoron/uhabits ｜ https://github.com/FriesI23/mhabit ｜ https://github.com/HabitRPG/habitica ｜ https://github.com/dohsimpson/HabitTrove ｜ https://github.com/daya0576/beaverhabits ｜ https://github.com/xpavle00/Habo ｜ https://github.com/shub39/Grit ｜ https://github.com/oppiliappan/dijo
- 商业：habitify.me/pricing ｜ MacStories Streaks 评测 ｜ thesweetsetup.com ｜ zapier.com/blog/best-habit-tracker-app ｜ help.ticktick.com ｜ sspai.com（Loop 推荐）｜ flora.appfinca.com ｜ App Store / Google Play 各页面
- 笔记生态：https://github.com/siyuan-note/bazaar ｜ https://github.com/Achuan-2/siyuan-plugin-task-note-management ｜ https://github.com/IAliceIAliceBobI/sy-tomato-plugin（sy-tomato-plugin）｜ https://github.com/5kyfkr/siyuan-plugin-docktomato ｜ https://github.com/syh19/siyuan-plugin-task-list ｜ https://github.com/zincplusplus/habit-tracker ｜ https://github.com/pyrochlore/obsidian-tracker（docs/Expressions.md、InputParameters.md）｜ https://github.com/richardsl/heatmap-calendar-obsidian ｜ https://github.com/c6p/logseq-habit-tracker ｜ thomasjfrank.com/5-ways-to-build-a-habit-tracker-in-notion
- 关键源码文件：uhabits `uhabits-core/.../models/{Entry,Score,ScoreList,EntryList,StreakList}.kt` + `reminders/ReminderScheduler.kt`；mhabit `lib/models/habit_summary.dart` + `lib/models/_score/{score,calculator}.dart` + `lib/common/math.dart`；Habitica `website/common/script/ops/scoreTask.js` + `fns/crit.js`

---

## 七、调研续作记录（2026-09-20,T-1273）

### 思源集市第二梯队复扫（全量 plugins.txt）

- 专打卡赛道结论不变：**专门打卡插件仍只有 2 个**（我们 + Achuan-2），无新增玩家。
- 任务/番茄/日记/时间类第二梯队约 20 个，与打卡潜在联动或竞争的关键新面孔：
  - `zxhd863943427/siyuan-plugin-pomodoro`：第三个番茄钟入场（sy-tomato、docktomato 之外），计时赛道拥挤化；
  - `LunaNorth/siyuan-timetrail`、`khnsojina-arch/siyuan-time-block-calendar`、`vjomikakero/siyuan-worklog-calendar`：时间轨迹/时间块/工作日志日历——时间维度聚合的三个不同切片；
  - `zhouhao/siyuan-plugin-day-memo`、`MoonBottle/siyuan-plugin-bullet-journal`、`xushuo97/diary-calendar`：日记侧，与「打卡即笔记」（v17.1 锚点）场景相邻；
  - `Genwaygenway/siyuan-todo-plus` + `siyuan-calendar-plus`、`Macavity/siyuan-tasks`、`Kaede221/siyuan-easy-tasks`、`gnakilgnoh/siyuan-task-planner`、`LeonZ1998/siyuan-plugin-taskmap`、`zhouhao/siyuan-plugin-kanban`：任务管理密集，验证「任务×打卡」联动（Task Horizon 模式）有面可铺；
  - `c00llin/siyuan-todoist-sync`：外部服务双向同步有用户基础——但本地优先定位不变，仅作范式参考；
  - `HaoCeans/siyuan-points-reward`：纯积分奖励——v19 轻量积分若重启，这是集市内唯一参照物；
  - `5kyfkr/siyuan-plugin-task-horizon`：契约合作方本体。
- 结论：联动面（任务/日记/日历）远大于竞争面；渲染块 + 开放 API 是占住「打卡数据枢纽」位置的关键——第二梯队没有谁做了习惯算法内核。

### Obsidian Tracker 表达式引擎精读

- v1.9.0 起 `{{sum}}` 类模板变量废弃，改为真表达式：运算符 `+ - * / %`，函数 `dataset()` / `sum()` / `maxStreak()` 等；`dataset(N)` 引用第 N 个查询集（迁移示例 `{{sum(1)}}` → `{{sum(dataset(1))}}`）；v1.15.0 增 `first()` / `last()`。
- 数据源矩阵：frontmatter 键（含 `frontmatter.exists` 存在性 v1.19.0、列表值 v1.18.0）、inline dataview 字段（含 emoji 值 v1.13.0）、Obsidian 1.4 复选框属性（v1.11.0）、标签；文件范围 `file` / `specifiedFilesOnly` / `fileContainsLinkedFiles` / `fileMultiplierAfterLink`（v1.10.0）；`textValueMap` 文本→数值映射支持正则键（v1.10.4）。
- 视图参数：month（注释模式 v1.10.0、`colorByStreak` v1.17.0、`thresholdType` v1.16.0、`initMonth` 相对日期、`fitPanelWidth`）、line/bar（轴刻度间隔/格式、堆叠柱 v1.14.0、`aspectRatio` v1.12.0）、pie。
- streak 语义：v1.13.2 起 streak 以 falsey（而非 null）终止——与我们「真实完成 +1、跳过中性桥接、AUTO 视同完成」的状态遍历同构。
- 对我们的映射：渲染块（v17.2）已交付 month/heatmap/summary 三视图；表达式引擎是可选后续——`maxStreak`/强度分已有单一实现（streak-index/habit-score），若做表达式须走白名单函数 + 纯数据求值，不开放任意 JS。

### Habit Tracker 21 断签容忍精读（纠正 + 补充）

- 仓库 `zincplusplus/habit-tracker`；数据模型＝一习惯一文件，frontmatter `{title, color, maxGap, entries[]}`——`entries` 是 YYYY-MM-DD 完成日数组，点格自动维护（每文件即独立数据孤岛，与我们集中式 store 相反；迁移可批量读其 frontmatter）。
- 断签容忍真名是 `maxGap`（数字，默认 0，非 gapStyle）：允许连续 N 天缺勤不断签——缺勤日以**降低不透明度**渲染，计数只算真实打勾日；频率对照表：每周 3 次→3、每周→6、双周→13、每月→30。
- 网格：`daysToShow` 默认 21（名字由来）、`firstDisplayedDate` / `lastDisplayedDate`、`color`、`showStreaks`、`matchLineLength`；点击日期跳日记（Daily Notes / Periodic Notes）。
- 对我们的映射：AUTO 弹性补全（v16.3）在语义上强于 maxGap（按配额周期推导而非固定容忍 N 天）；但「缺勤日淡化渲染 + 计数只算真实完成」的呈现值得渲染块月历吸收——跳过中性色已有，~~断签淡化列入 v18 渲染块迭代候选~~——**2026-09-20 评估后关闭（T-1276）**：核查发现我们的 quota 完成口径是回溯性的（周期达标后,达标日之前的期内剩余日经 isComplete 也已全部渲染为完成色），即 AUTO 回溯完成在呈现上强于 maxGap 的淡化容忍，「缺签缺口」在本语义下不存在；按 D-051 可证明性原则不引入死代码。其 frontmatter entries 格式仍可作 Obsidian 迁入通道（优先级低于 Loop CSV）。
