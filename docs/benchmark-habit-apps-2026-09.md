# 打卡/习惯应用竞品对标分析（2026-09）

> 调研方式：三路并行——① GitHub 开源项目源码深读（Loop Habit Tracker / Table Habit / Habitica 等）；② 应用商店商业竞品（Habitify / Streaks / Forest / 滴答清单 / 小日常 / 时光序 / Atoms 等）；③ 笔记生态同类插件（思源集市 / Obsidian / Logseq / Notion 模板）。本文件是结论沉淀，为后续版本开发提供依据。

> **证据口径说明（2026-09-22）**：本文早期段落保留历史调研上下文，其中星数、价格、下载量和“维护停滞/已弃维护”等判断没有统一的时间戳，不能作为当前状态或选型依据。本次增量只把固定 commit/tag、仓库内许可证、实际源码/CHANGELOG 和可访问的 release 页面作为证据；没有核验的效果、用户规模、商业定价和因果关系均降级为待核查线索。新结论不继承旧段落的“标杆/最好/最成功”等强断言。

> **增量研究口径（2026-09-22）**：本文件新增的复核只采用公开 README、源码、官方文档、发行页或 issue 可复现的事实；不把当前星数、价格或营销描述当作能力契约。版本/提交以访问当天能确认的页面为准，未实测的宿主行为标为待验收。

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

**历史观察（非本轮验证）**：

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

## 八、2026-09-22 一手资料复核（T-1377）

本节只记录本轮实际访问的仓库、固定提交/tag、仓库许可证、源码/CHANGELOG 证据和公开 release 页面。仓库的最新提交或 release 只能证明该时间点可观察到的状态，不能推出长期维护质量、用户规模、效果或未来兼容性；下列“采用/延后/不做”是对小驴的适配判断。

### 1. 习惯算法与迁移

| 项目 | 固定证据与源码观察 | 可吸收能力 | 对小驴的适配代价与验证方法 | 结论 |
| --- | --- | --- | --- | --- |
| [Loop Habit Tracker](https://github.com/iSoron/uhabits/tree/7e993e17b2b674d4b5b1291ebd18677b74810df2) | `uhabits` HEAD `7e993e17b2b674d4b5b1291ebd18677b74810df2`（2026-07-21，可从 `git log` 复核）；`LICENSE.txt` 为 GPL-3.0；[v2.3.1 release](https://github.com/iSoron/uhabits/releases/tag/v2.3.1) 可访问。`Score.kt` 使用频率、前值和当日值计算指数衰减；`HabitsCSVExporter.kt` 输出 `Habits.csv`、每项 `Scores.csv/Checkmarks.csv`，记录 `Date,Value,Notes`。 | 将“频率 + 跳过/未知 + 分数投影”作为可解释的只读统计；把 Loop ZIP/CSV 当迁移输入，并保留 Notes。 | GPL-3.0 与本插件代码/分发边界需由发布者复核；CSV 的数值/频率、未知/跳过和历史日期需映射到现有事件，不能把 Loop score 当小驴复习调度。验证：固定样本导入后逐日比对事件数、日期、值、备注和重复导入幂等。 | **采用**：CSV 迁移和统计口径可作为独立适配层；算法不直接移植为新调度。 |
| [Table Habit / mhabit](https://github.com/FriesI23/mhabit/tree/1f532849b3ea5d43aecf948dbc1d206aa42f2d36) | HEAD `1f532849b3ea5d43aecf948dbc1d206aa42f2d36`（2026-09-21）；仓库 Apache-2.0；[v1.27.9+198 release](https://github.com/FriesI23/mhabit/releases/tag/v1.27.9%2B198) 可访问。`lib/models/loop_import.dart` 解析 Loop 的 name/type/frequency/target/archived 和日期记录；`record.dart` 保存 record UUID、parent UUID、reason；`change_record_status_action.dart` 明确 `unknown → done → skip → deleted` 状态链。 | 导入时保留原始频率、归档、记录原因和稳定外部身份；把“未知/跳过/删除”分开，而不是把缺失当失败。 | 其存储是本地数据库而非小驴 JSON；Apache-2.0 允许性需与具体依赖/分发一起复核。验证：Loop CSV 迁入→导出→再迁入，检查状态链、reason、UUID 映射和删除墓碑。 | **采用**：作为迁移字段和状态测试参考；不复制数据库或 Flutter UI。 |

### 2. 笔记内声明式追踪与断签容忍

| 项目 | 固定证据与源码观察 | 可吸收能力 | 对小驴的适配代价与验证方法 | 结论 |
| --- | --- | --- | --- | --- |
| [Obsidian Tracker](https://github.com/pyrochlore/obsidian-tracker/tree/933fa7537580fe79ecf567e83d5cb45ba18139e0) | HEAD `933fa7537580fe79e83d5cb45ba18139e0`（2026-03-02）；`LICENSE` 为 MIT；`manifest.json/package.json` 为 1.19.0；[1.19.0 release](https://github.com/pyrochlore/obsidian-tracker/releases/tag/1.19.0) 可访问。`docs/Expressions.md` 列出 `dataset()`、`sum()`、`maxStreak()`、`currentStreak()` 等白名单函数，并记录 1.9.0 起模板变量迁移到表达式。 | 继续扩展渲染块时，可吸收“声明式数据集 + 白名单纯函数 + 月历/趋势输出”三件套；表达式结果可复算且不需要复制正文。 | 思源块查询和小驴事件模型不同，不能开放任意 JS 或照搬 Obsidian frontmatter；需要限制数据集数量、函数和运行时间。验证：同一 JSON 快照在桌面/Android、明暗主题下输出一致；非法函数、超量数据和循环表达式必须拒绝。 | **采用**：只吸收白名单表达式和数据集设计；不移植其存储/运行时。 |
| [Habit Tracker 21](https://github.com/zincplusplus/habit-tracker/tree/8303d6091ab26a19f6b83d32cbac701d705b6223) | HEAD `8303d6091ab26a19f6b83d32cbac701d705b6223`（2026-05-24）；仓库 `LICENSE` 为 GPL-3.0；`manifest.json` 当前版本字段为 2.4.1；[2.4.2 release](https://github.com/zincplusplus/habit-tracker/releases/tag/2.4.2) 可访问。`Habit.svelte` 从 Markdown frontmatter 的 `entries` 读取/写入日期数组；`maxGap` 只影响连续展示和计数；设置可点击日期打开 Daily Notes/Periodic Notes。 | 将“缺勤日淡化、真实完成日计数、日期格跳转”作为渲染交互参考；frontmatter `entries` 可作为低优先级迁入样本。 | 一习惯一文件与小驴集中 store 不同；GPL-3.0 兼容和写入 frontmatter 的并发/人工编辑语义需隔离。验证：读取 test-vault 中空 entries、无 frontmatter、跨月和 DST 样本；确认不自动创建或覆盖用户文档。 | **延后**：只在渲染块/迁移专项需要时吸收；不新增 per-file 数据模型。 |

### 3. 思源任务、习惯和日记插件

| 项目 | 固定证据与源码观察 | 可吸收能力 | 对小驴的适配代价与验证方法 | 结论 |
| --- | --- | --- | --- | --- |
| [Task Note Management](https://github.com/Achuan-2/siyuan-plugin-task-note-management/tree/04fb9491ae2dc160805005d50f351b9958623a7b) | HEAD `04fb9491ae2dc160805005d50f351b9958623a7b`（2026-09-16）；`LICENSE` 为 AGPL-3.0；`plugin.json` 版本 7.1.1；[v7.1.1 release](https://github.com/Achuan-2/siyuan-plugin-task-note-management/releases/tag/v7.1.1) 可访问。`habitUtils.ts` 有 daily/weekly/monthly/yearly/custom/ebbinghaus 频率、番茄自动打卡和 `habitMemoBlockId`；`habitMemoBlockSync.ts` 使用 `appendBlock`/`insertBlock`/`updateBlock`/`setBlockAttrs`，并为同步条目生成 `memoSyncKey`。CHANGELOG 的 v7.1.1（2026-09-15）还记录思源 3.8.4 适配。 | “打卡模式与文档回写模式分离”、稳定同步键、番茄完成来源、Ebbinghaus 只作为用户选择的排期入口，均可作为需求对照。 | AGPL-3.0、私有数据结构和同步块清理语义不能直接复制；小驴已有 noteAnchor/日记报告，需避免第二套绑定字段和正文自动复制。验证：真实思源桌面/Android 上用公开 API 测试绑定、移动、删除、只读块、重复写入和撤销；浏览器模拟不算宿主验收。 | **采用**：吸收“绑定/回写分离 + 幂等键”原则；不复制其实现。旧文“转付费后停滞”已由本轮提交证据纠正。 |
| [Bullet Journal](https://github.com/MoonBottle/siyuan-plugin-bullet-journal/tree/9ec42221333786fd05adfdb9cdfb968b5211af36) | HEAD `9ec42221333786fd05adfdb9cdfb968b5211af36`（2026-07-07）；`LICENSE` 为 AGPL-3.0；源码 `src/kernel/habitSchedule.ts` 支持 daily/weekly/n_per_week/every_n_days/weekly_days/**ebbinghaus** 等频率，`useHabitWorkspace.ts` 按 blockId/docId 打开并可对已归档习惯禁用打卡；`api.ts` 封装 `insertBlock/appendBlock/setBlockAttrs/query/sql`。`plugin.json` 版本 0.14.2；[v0.14.2 release](https://github.com/MoonBottle/siyuan-plugin-bullet-journal/releases/tag/v0.14.2) 可访问，tag 解引用 commit 为 `bc4afe2e5cd798bd222ed02fbec35831ce2ba0b7`。 | 习惯实体与块 ID 绑定、归档后禁止操作、统一 API 封装和自然语言/日记场景的入口可作为联动设计参考。 | AGPL-3.0 与小驴许可边界需单独复核；其 Ebbinghaus 规则是固定 `[1,2,4,7,15]`/完成次数推导，不能当普适科学或替换现有 interval；API SQL/写入依赖真实宿主。验证：固定 commit 的单测 + 真实思源多窗口/Android 复核，检查块移动/删除和重复日期。 | **延后**：只借鉴块 ID/归档降级和研究样例；不直接复制 Ebbinghaus 或 API 层。 |
| [Diary Calendar](https://github.com/xushuo97/diary-calendar/tree/98c818a69b1041cf98d85a0103b27eb230b08685) | HEAD/tag `98c818a69b1041cf98d85a0103b27eb230b08685`（v0.1.8，2026-08-29）；`LICENSE` 为 MIT；`plugin.json` 版本 0.1.8，桌面前端声明；源码 `api.ts` 以 `/日记日历/<年>/<月>/<YYYY-MM-DD>` 建立日记文档，查询 `hpath`，写入采用删除子块再 `insertBlock`，并提供周/月文档。`theme.ts` 使用 MutationObserver 和 3 秒定时同步主题。 | 日记路径、按 hpath 定位、批量按月份查询、日/周/月分层可作为 T-1376 路由对照；“先找文档再创建”比按标题猜测更可靠。 | 其写入会清空并重建子块，不能作为小驴只追加报告的默认语义；SQL 依赖宿主；主题轮询不应带入小驴。验证：真实宿主检查未建日记、多个笔记本、历史补记、手工内容和多窗口；确认失败不创建空文档且不覆盖正文。 | **采用**：只吸收 hpath/幂等定位和日记层级证据；**不做**清空重写与常驻主题轮询。 |

### 4. 采用/延后/不做矩阵（本轮推荐）

| 借鉴点 | 用户收益 | 适配代价 | 验证方法 | 推荐 |
| --- | --- | --- | --- | --- |
| Loop/mhabit CSV 导入 | 用户可带着历史记录迁入，降低数据锁定 | 字段、状态、备注、频率和许可证边界映射 | 固定 CSV fixture、导入/导出往返、重复导入/异常行 | **采用**，独立迁移任务 |
| 白名单数据集/表达式 | 在思源文档内看趋势，减少重复抄写 | 查询上限、函数语义、Android 性能和安全沙箱 | 纯函数快照、恶意表达式拒绝、桌面/Android | **采用**，沿现有渲染块路线 |
| 缺勤淡化和日期跳转 | 减少断签内疚，回到当日日记更快 | 日期/时区、宿主打开能力、主题一致性 | 真实日记路径和 DST/移动端走查 | **采用**，只做展示与跳转 |
| 绑定/回写分离、同步键 | 降低重复写入和误删，用户能控制文档 | 需要现有 noteAnchor 与日记报告共存 | 多窗口、移动/删除、撤销和只读宿主验收 | **采用**，不新增第二绑定体系 |
| 固定 Ebbinghaus/FSRS/SM-2 调度 | 可能改善知识复习的提醒 | 反馈字段、迁移、算法版本和调度所有权 | T-1374 回放矩阵；与闪卡宿主隔离 | **延后**，普通习惯不启用 |
| 复制竞品私有 DB、SQL 或整篇正文重写 | 短期减少开发 | 破坏可迁移性、权限、用户内容和宿主兼容 | 无法证明公开稳定契约 | **不做** |
| 账号/云同步、社交/RPG、后台常驻轮询 | 可能增加留存或跨端便利 | 超出本地优先、隐私和维护边界 | 需要另立项和用户授权 | **不做** |

**本轮边界**：上述仓库均为源码/文档复核，不等于在思源真实桌面或 Android 中运行了第三方插件；版本、许可证和宿主兼容性在实现前仍需重新核对。T-1377 的结论只提供候选输入，最终范围由 T-1378 结合 T-1374～T-1379 决定。

## 八、T-1377 增量复核与吸收边界（2026-09-22）

本节只记录本轮能由公开页面复核的增量。`版本/提交` 是访问当天页面可见的标识；没有固定版本或可复现测试的内容不进入实现契约。星数、价格和商店宣传不作为立项依据。

| 来源（公开证据） | 复核事实（截至 2026-09-22） | 可吸收 | 延后 | 不做 |
| --- | --- | --- | --- | --- |
| [Loop Habit Tracker](https://github.com/iSoron/uhabits)；[跳过/CSV 讨论](https://github.com/iSoron/uhabits/discussions/689) | 公开仓库与讨论可复核五态记录、频率和导出线索；跳过不是失败，频率与导出是用户可迁移的边界。 | 保持 SKIP 中性、公开 CSV/JSON 迁移的可解释身份；继续用现有事件模型。 | 重新设计强度/频率公式，需离线回放和迁移样本。 | 复制 Android 专属后台提醒、服务或数据库格式。 |
| [Table Habit README](https://github.com/FriesI23/mhabit) 与 [User Guide](https://github.com/FriesI23/mhabit/wiki/User-Guide)；公开 release 页面显示 `v1.24.2+156` | 支持正/负习惯、日/周/月/滚动窗口目标、人类可读 JSON 导入导出、WebDAV；导入数据被当作新习惯，不能当同步。 | 借鉴导出/导入的“来源 + 新身份 + 可回退”说明，保留本地优先。 | 更复杂的成长曲线、WebDAV 和跨设备同步。 | 把导入数据静默合并，或把 WebDAV 变成插件必需服务。 |
| [Obsidian Tracker Concepts](https://github.com/pyrochlore/obsidian-tracker/blob/master/docs/Concepts.md)、[InputParameters](https://github.com/pyrochlore/obsidian-tracker/blob/master/docs/InputParameters.md)（master，访问日） | 声明式代码块从标签/frontmatter/任务等来源读取，并提供 `summary`、`month`、`maxStreak()` 等纯展示能力。 | 继续坚持白名单数据集、纯函数求值、月历日期点击跳转和只读降级。 | 任意表达式、跨库文件扫描、用户自定义脚本。 | 开放任意 JavaScript、隐式复制笔记正文。 |
| [Achuan-2 task-note-management](https://github.com/Achuan-2/siyuan-plugin-task-note-management)（公开仓库，访问日） | README 明确把任务、文档/块提醒、日历、番茄和习惯组合在一起；公开首页不能证明每条同步实现的错误/迁移语义。 | 借鉴“业务对象显式指向笔记”的入口和来源标识，沿用本插件的 `noteAnchor`/失败隔离。 | 任务、番茄、习惯的全家桶联动，先逐条核对公开 API 和权限。 | 复制私有存储、后台提醒或未公开内核调用。 |
| [Obsidian Spaced Repetition](https://github.com/st3v3nmw/obsidian-spaced-repetition)（README，访问日） | 同时提供卡片、整篇笔记、当前笔记和强化练习入口，说明“材料入口”和“卡片调度”可以分层。 | 将指定文档作为人工打开/复习材料入口；调度仍归宿主或独立 review 模式。 | 源笔记移动/重命名、调度元数据与思源块 ID 的迁移验证。 | 把文件标签模型直接当作思源绑定模型，或同时维护两套 due。 |
| [SiYuan v3.8.4 API 文档](https://github.com/siyuan-note/siyuan/blob/v3.8.4/docs/API.md) 与 [router.go](https://github.com/siyuan-note/siyuan/blob/v3.8.4/kernel/api/router.go) | 文档列出 `appendBlock`、块属性和文档创建等公开专节；源码还注册日记/Riff 路由，但源码路由不自动获得公开稳定性。 | 以 API 文档专节作为兼容准入；源码只用于研究和版本锁定。 | 日记 source-only 路由、Riff due 查询、复习事件需真实宿主验证。 | DOM/SQL 逆向、后台轮询、把源码路由写进长期插件契约。 |

**统一吸收规则。** 低风险借鉴必须能映射到现有事件模型、`localDate`、本地存储和已有测试：SKIP 中性、确定性导入身份、白名单只读聚合、明确来源链接可以进入候选实现；表达式引擎、跨插件自动打卡、提醒和复习联动需要独立 API/权限/失败证据；账号、云同步、RPG 惩罚、传感器和后台常驻不进入本地优先路线。竞品有某功能本身不是需求证据，只有用户收益、适配代价、公开接口和回退方法同时清楚时，才可拆成后续 TODO。

## 九、MarkNow 增量调研（2026-09-22，用户推荐）

同名排查：推荐对象为 iOS 习惯打卡应用 [MarkNow](https://marknow.app)（[App Store](https://apps.apple.com/cn/app/marknow-habit-daily-tracker/id6739256038)，XYM Studio，iOS/iPadOS 14.0+，闭源免费+订阅）；另有 [leongao/marknow-release](https://github.com/leongao/marknow-release)（macOS AI Markdown 编辑器，闭源二进制）与本语境无关，无借鉴点。主候选证据全部来自官方页面（官网/App Store/隐私政策），闭源无源码，活跃（v1.14.x，2026-06～08 多次更新）。

| 复核事实（官方页面，截至 2026-09-22） | 可吸收 | 延后 | 不做 |
| --- | --- | --- | --- |
| 事项级自定义字段（8 类：文本/数字/开关/评分/单选/多选/图片/日期时间）+ 灵活分组，模板按场景组织（36 个，含血压/心情/睡眠/宠物/经期等长尾场景）。 | 「模板广度 + 场景分类」与本插件模板体系（T-1348～T-1350/T-1356）方向一致，佐证既有路线；长尾场景候选可进入 T-1400 调研循环的模板扩充清单。 | 自定义字段表单 schema（用户收益真实，但触数据模型，适配代价中等；先按 T-1400 流程评估 2～3 种字段的最小切片，如数字/评分/开关）。 | 图片字段与附件类存储（与本地优先体积纪律冲突，需独立评估）。 |
| 统计视图：热力图（显示记录次数）、日历、时间线、饼图占比、跨事项关联分析（如睡眠×心情）。 | 热力图/日历/时间线已有等价物或路线内；「跨事项关联分析」记为远期差异化候选（只读计算层聚合，符合 D-215）。 | 跨事项关联分析（需真实使用反馈证明需求，且要防止相关性误读文案）。 | 饼图/频率统计等常规图形的重复实现。 |
| 快捷记录：主屏/锁屏小组件、灵动岛、iOS 快捷指令、提醒。 | 「快捷指令」路径与来源统筹框架 C 类（外部自动化经公开 API push）直接对齐——MarkNow 用户习惯迁移场景可写接入示例文档。 | 顶栏/斜杠命令快捷打卡入口（UI 快捷路径，按 T-1373 结论属低优先）。 | 小组件/灵动岛等宿主原生能力（插件模型不可移植）。 |
| 隐私模型：本地优先 + Pro iCloud/WebDAV 备份 + 导出；隐私政策披露接入支付宝 SDK、Sentry、Mixpanel。 | 本地优先 + 可选备份叙事与本插件一致；其三方 SDK 接入作为反面参照，本插件保持零遥测。 | — | 云备份/同步服务（D-243 已决策不立项）。 |

结论：MarkNow 无直接可搬的能力（闭源且平台形态不同），价值在三处佐证与两处候选——佐证模板场景库、本地优先叙事、快捷指令即来源；候选是自定义字段最小切片与跨事项关联分析，均按 T-1400 生态调研循环流程排队，不插队现有批次。

## 十、T-1400 生态调研循环·第一轮（2026-09-23）

三路并行增量扫描（GitHub topic 扫描 / Obsidian+Logseq+Notion 插件生态 / 思源集市 plugins.txt + 独立应用 changelog），对照既有已评估清单只看增量；取证日 2026-09-22。本轮候选 13 项，评估如下（吸收上限 3 项，按 D-256 流程自动采用）。

### 采纳（3 项，拆批次开发）

| 候选 | 来源（证据等级） | 吸收点 | 用户收益 / 代价 | 批次 |
| --- | --- | --- | --- | --- |
| **容错连续计数（maxGap）** | Habit Tracker 21 `maxGap`（README 证据） | 缺口天数低透明度显示且不打断连续；只计完成日。与 SKIP（显式请假）互补——覆盖"漏打但未断签"的隐性容错 | 高（缓解断签焦虑，契合反内疚设计）/ 中（streak 纯函数 + 编辑器 per-item opt-in 开关） | T-1409 |
| **热力图四级色阶自适应** | TCOTC/heatmap（README） | 按百分位（或绝对值）自适应 4 级色阶，替代固定阈值；数值型习惯颜色强度随值缩放 | 中（数值习惯的日际差异可见）/ 小（charts 层） | T-1410 |
| **完成庆祝动效（尊重 reducedMotion）** | Loop v2.3.0 release notes | 完成打卡时的轻量庆祝反馈 | 中（正反馈循环）/ 小（CSS 动效，reducedMotion/偏好关闭时禁用） | T-1410 顺带 |

### 延后（4 项，记录触发条件）

- **滑块式数值记录**（Obsidian Habitify 六类型中的 slider）：数值项配 min/max 后记录 UI 升级为滑块。等数值类用户反馈出现再排。
- **洞察统计增补**（中位数、30 天周期汇总，Obsidian Habitify 统计面板）：有价值的统计集扩充，等洞察页改版窗口顺带。
- **重复项编辑三选语义**（schedule-block 的「仅此次/此次及以后/全部」）：修订系统已有数据基础，纯交互增强，等编辑器改版窗口。
- **fractured 热图（一日多次每格细分）**（Neohabit）：等热力图改版窗口与高频习惯用户反馈。

### 不做（3 项，边界依据）

- **积分经济/愿望兑换/境界等级**（修仙打卡 siyuan-points-reward，同生态直系竞品）：完整激励闭环属「明确不做」的 RPG 化边界；其注记允许的"可选轻量积分默认关"为边界最外沿，如需推进必须用户显式拍板，不自动吸收。记录其设计事实：打卡得积分→积分兑换愿望→等级进阶→修炼日历，纯本地可实现。
- **外部消息推送**（time-block-calendar 的 PushPlus/飞书 Webhook）：依赖第三方在线服务，违背本地优先与零遥测纪律（本插件"不做系统级后台通知"边界的延伸）。
- **AI 自然语言建块/打卡**（time-block-calendar 等）：本插件已有受控智能体建议流（确认令牌/审计/撤销），自然语言直建不增设入口。

### 佐证（不产生任务）

- Habi AI/MCP、Beaver 的开放 API 周边（CalDAV/Home Assistant/Stream Deck/iOS 快捷指令）：佐证「公开 API 为唯一扩展面」路线（本插件 C 类通道已覆盖快捷指令场景）。
- Habo 的 skip 语义与零知识 E2EE：skip 已有；E2EE 属同步议题，D-243 已决策不立项。
- Obsidian #habit-tracking 标签 20 个插件、#heatmap 11 个：赛道活跃佐证。
- Thomas Frank "no streaks" 极简模板：反压力设计佐证（与反内疚方向一致），无具体可搬实现。
- Anytype 无打卡能力仅 feature request：生态空白佐证。
第一轮小结：13 项候选 → 采纳 3（T-1409/T-1410）、延后 4、不做 3、佐证 3；全部结论已按评估卡格式登记，吸收项进入常规批次开发，二轮扫描建议优先补 obsidian-easy-tracker（模块化打卡块）与修仙打卡的愿望单交互实测。

## 十一、T-1400 生态调研循环·第二轮（2026-09-23）

三路并行：easy-tracker 源码深挖、修仙打卡发布包静态分析（v0.9.6 index.js 475KB）、轻量增量扫描（对照第一轮清单只看新面孔）。取证日 2026-09-22/23。

### 采纳（1 项）

| 候选 | 来源（证据等级） | 吸收点 | 用户收益 / 代价 | 批次 |
| --- | --- | --- | --- | --- |
| **极简「今日视图」渲染块** | obsidian-easy-tracker（源码证据：main.ts/daily-overview.ts） | 三格概览（今日状态/streak/最近漏卡日）+ 一键打卡按钮（完成后祝贺态）+ `label\|value` 行内声明与节流；我们补上它没有的多项目寻址（块参数 itemIds） | 高（日记/仪表盘嵌入刚需，109★ 验证过的需求；复用现有渲染块框架与写回路径）/ 低-中（一个视图渲染器 + 按钮 handler） | T-1412 |

要点：easy-tracker 的「一笔记一习惯」全局数据流是反面教材（本插件 groups 多项目模型更优）；纯文本数据嵌正文的存储方式不迁移，仅取其手改容错理念；阅读模式不能打卡是其硬伤，我们的实现不得复现。

### 深挖结论：修仙打卡轻量积分 —— 不做，维持边界（登记用户拍板条件）

v0.9.6 发布包静态分析确认：积分层与打卡核心事件解耦、防刷完整（去重+标记+排队回放+max 合并），但**负面机制是经济闭环的必要组成部分**——手动惩罚按钮、悬赏失败按难度放大扣分、灵石不足从累计修为扣（掉境界）、补签收费。剥离重机制（14 级境界/转世/悬赏/惩罚）后剩余的「加分+换愿望」与现有打卡激励重叠度高，做出来是无张力的一半功能。若用户未来显式提出积分/兑换需求，唯一可接受形态为：单轨积分（无双轨制，架构上杜绝掉分/掉级）+ 流水 + 简单愿望兑换，排除境界/转世/悬赏/惩罚/补签收费/每日挑战，验收必须含「无扣分至负、无等级回退」用例——登记为条件批次 **T-1413**，不排期。

### 延后（3 项）

- **HabitHeat 统计维度**（星期模式/时段趋势/月度量，官方站点 v2.11）：统计页改版窗口。
- **月条带可视化**（obsidian-monthly-tracker，每行一习惯×一月色码条带）：可视化窗口（与年方格热力图互补的低密度形态）。
- **OpenHabitTracker**（Jinjinov，285★，Blazor 全平台，第一轮遗漏）：下轮补评。

### 对照参考（不产生任务）

- schedule-block 的重复事件「仅此次/此次及以后/全部」三选编辑（第一轮已延后，本轮补充源码观察：Esc 真回滚、Ctrl+Z 数据撤销值得对照）。
- task-horizon 四象限视图与番茄钟联动组合（合作方插件，交互对照）。
- easy-tracker 的 workspace 事件总线全块重渲（本插件渲染块已有等价刷新体系，无需改动）。

第二轮小结：深挖 2 + 增量 4 → 采纳 1（T-1412 今日视图渲染块）、深挖结论不做 1（轻量积分，条件 T-1413）、延后 3。第一轮采纳三项已全部落地（T-1409/T-1410/T-1411），本轮采纳项进入常规批次。

### 第二轮收尾补评：OpenHabitTracker（2026-09-23）

Jinjinov/OpenHabitTracker（285★，~2324 commits，2026-09 活跃，GPL-3.0）：C#/.NET 10 + Blazor 全平台独立自托管应用，本地优先（数据仅在设备、仅同步自建服务器）。结论：**不做**——独立 App 与思源内嵌插件可比性低，GPL-3.0 排除代码级移植（仅可借鉴设计思路，自行实现）；其按星期几/特定日期排期、负向 at-most、SKIP、成就均缺位，本插件覆盖更全。留两个低-中参考点：①「逾期率评分」（按逾期程度而非连击计量，与容错连续/强度分互补，可作展示层备选指标）；②保存的筛选器用「相对天数」防失效（可反哺渲染块配置设计）。该对象调研关闭。

## 十二、T-1400 生态调研循环·第三轮（2026-09-23）

四路并行增量扫描（GitHub topic 扫描 / Obsidian+Logseq+其他笔记生态 / 思源集市 plugins.json 全量+官方需求面 / 独立应用+量化自我），对照第一、二轮清单只看增量；取证日 2026-09-23。本轮候选约 30 项，深评如下（吸收上限 3 项，按 D-256 流程自动采用 2 项）。

### 直接竞品警报：Pinch 深评列为第四轮优先

royc01/pinch（思源集市，v2.7.1 @2026-09-18，30 个 release，repo 2026-01 建库，21★）：习惯打卡+任务收集+番茄钟+**心情打卡**+目标系统（逾期提醒）+**奖励兑换商店**+多维统计复盘。此前仅作为战略调研表一行来源，从未深评；本轮集市全量复扫确认其与小驴打卡功能覆盖面几乎重合且迭代活跃。第四轮首位任务：发布包静态分析（数据结构、统计口径、奖励系统边界）+ 用户迁移通道评估（参照第二轮修仙打卡深评方法）。就「打卡数据枢纽」定位而言，其威胁面大于所有 Obsidian 侧插件。

### 采纳（2 项，拆批次开发）

| 候选 | 来源（证据等级） | 吸收点 | 用户收益 / 代价 | 批次 |
| --- | --- | --- | --- | --- |
| **戒断里程碑投影** | Quitter（里程碑表+戒断锚点，README）；Streak（avoid 类型+relapse 独立事件，README）；HabitKit 1.17（quit habits 干净天数即连击，官方 changelog） | at-most 项目增加「戒断里程碑」只读投影：当前戒断天数（现有 streak 口径）对照固定阶梯（1/3/7/14/30/60/90/180/365）自动点亮最近达成级与下一级；破戒历史列表（现有事件可回放）。复发记录详情、抵扣、换算等不进第一版 | 中-高（戒除类用户「第 N 天」是核心情绪价值，现有连击数字无阶段感）/ 低（纯投影，零存储变更；洞察/渲染块/API 复用单一实现） | T-1415 |
| **渲染块一键插入预设** | obsidian-easy-tracker（一键插入模块套件，源码证据）；vran-dev/obsidian-contribution-graph（声明式 query+配置块，README/文档） | 斜杠/命令面板提供 4~6 个预设渲染块模板（今日块、月历、热力图、分组汇总、今日行动台摘要），插入后光标落在可编辑参数上；参数缺失继续 fail-closed。不改变块语法本身 | 高（onboarding 是笔记内嵌打卡赛道的公认门槛，两源交叉印证；配合 R-10.5 首次成功路径）/ 低-中（命令入口+模板字符串+结构测试，不触渲染管线） | T-1416 |

### 延后（6 项，记录触发条件）

- **破戒意图确认+抵制成功计数**（one sec，PNAS 2023 研究+商店页）：破戒标记前插入一步意图输入、把「抵制住没破」记为正向事件。等戒除类真实用户反馈；涉及新事件语义，先做迁移评估。
- **情境标签×打卡交叉统计**（Daylio 官网页面证据；Pinch 心情打卡）：对应战略方向 7（情境化记录），随 R-A3 context normalization 顺带评估，不单独立项。
- **habit stacks 序列化+每步计时**（Routinery 官网）：对应战略方向 11（模板组合），序列执行器超出当前范围，等模板组合交付后评估。
- **跨应用导入框架枚举页**（Daily You，README）：对应方向 13，等导入预览中间模型（R-30.4）落地后把「导入来源选择页」纳入。
- **entries 追加式社区格式兼容**（folder-routines 与 Habit Tracker 21 共享格式，README）：低优先迁入通道，Loop CSV 之后再说。
- **cellStyleRules 阈值着色规则**（contribution-graph，文档）：热力图自定义规则，等热力图改版窗口；T-1410 百分位色阶已覆盖主需求。

### 不做（3 项，边界依据）

- **积分连击乘数**（dessalines/habit-maker，README）：连击乘数是激励经济闭环的前厅，与「无 RPG 化」边界冲突；轻量积分若用户拍板（T-1413）也不吸收乘数。
- **社交挑战/排行榜**（jofoerster/habitsync，README）：账号与社交体系均为「明确不做」。
- **「数据住笔记里」哲学转向**（obsidian-habits、process-tracker、folder-routines 等 2026 新插件趋同宣传）：不可变事件+集中存储是本插件工程语义根基，不因赛道话术动摇；其「删除插件历史仍在」的用户诉求由导出/快照能力回应。

### 佐证与信号（不产生任务）

- **宿主 3.8.5 数据库原生日历视图 + 3.8.6 持续加码**（siyuan-note/siyuan releases，2026-09-22/23）：可视化护城河被宿主稀释，差异化必须压在习惯算法内核、统计口径与事件语义上——与 R-A3/R-A7 优先级互证。
- **3.9.0 milestone = 闪卡重构批次**（#10471/#11207/#19365 插件自定义复习顺序）：未来「打卡×复习」联动将有官方插件接口入口，归 T-1374 研究支线观察。
- **ActivityWatch watcher→server→vis 分层**（官方文档+源码）：外部时长来源架构参照，与思阅/思播适配器五段框架互证；其 categories 归属规则引擎是「笔记→习惯归属」的远期参照。
- **指数衰减强度分成新一代标配**（Kadō 明确以 Loop EMA 为卖点；3-Obsi-Uhabits-Fork 同源）：本插件 habit-score 已覆盖，佐证既有口径，无需改动。
- **性能与零配置是存量方案最常被诟病点**（practicalpkm 2026-04 对 Obsidian Tracker 的评论；Obsidian #habit-tracking 40+ 插件趋同「数据在笔记里」）：佐证性能基线（R-A6）与一键插入（T-1416）的优先级。
- **类型切换保留历史**（HabitKit 1.18，官方 changelog）：六类记录类型已在数据模型层面兼容；「已有项目切换记录类型」属编辑器增强候选，等编辑器改版窗口。

第四轮扫描建议（触发条件照旧）：① Pinch 发布包静态分析深评（首位）；② 思源 3.9.0 闪卡重构落地后评估复习联动接口；③ ActivityWatch 桥接可行性（若用户提出自动时长来源需求）。

## 十三、T-1417 Pinch 发布包深评（T-1400 第四轮首位，2026-09-24）

对象：royc01/pinch（片趣-习惯打卡&任务管理）v2.7.1（2026-09-18 发布，package.zip 1,417,173 字节，爱发电赞助）。方法：发布包静态分析（plugin.json/i18n 词表 1322 键/README 36K 中文/打包 JS 与 kernel.js 逐维 grep）+ 用户迁移通道评估。全部结论基于发布包可证事实。

### 静态分析事实

- **元数据**：minAppVersion 3.7.0（低于本插件 3.8.4，兼容更老宿主）；kernels/backends/frontends = all（全端含移动）；`disabledInPublish: true` 标记。
- **功能矩阵**（i18n 键分组实测）：任务管理 251 键（看板/甘特/表格/周视图、文档任务自动收集、重复任务、分组）、个人统计 163 键、专注计时 103 键（白噪音/悬浮胶囊）、习惯打卡 101 键、打卡备注 79 键（备注导出 markdown/同步文档/删除回收站）、任务范围 75 键、重复任务 74 键、奖励仓库 61 键 + 奖励面板 37 键、目标系统 22+17 键、心情打卡 20 键（心情统计/趋势图）。
- **奖励经济闭环（实锤）**：趣币（rewardCoins/availableCoins）→ 奖励商店（自建+默认奖励项如零食）→ 兑换确认/兑换记录 → 徽章等级体系（奖励等级 5/10/15 级）。与修仙打卡 v0.9.6 深评结论同型：经济闭环含等级体系。
- **数据形态**：saveData/loadData 仅约 6 处；主体数据住思源块属性（custom-task-* 属性 55+ 处，getBlockDOM/getBlockAttrs）+ 文档（createDocWithMd/createDailyNote/query sql），即「数据住块属性与文档」模式，与本插件集中式不可变事件存储相反。
- **权限/通道**：/api/block/insertBlock 系（getBlockDOM/transactions/flushTransaction）、attr、filetree、query sql、notification pushMsg——全部公开内核通道，未见私有存储读取。

### 结论评估卡

| 维度 | 结论 | 依据 |
| --- | --- | --- |
| 代码吸收 | **不做** | 可吸收点（心情上下文、任务联动、备注同步）均已在既有路线（方向 7/R-30.2/record-notes）内，无新增可搬能力；其全家桶形态与轻量边界相悖 |
| 迁移通道 | **延后（登记导入来源候选）** | 数据住块属性可经 SQL 公开解析，习惯完成记录可映射为二值打卡；但事件粒度/身份模型差异大，工程量中等且无用户需求信号；有请求时按 R-30.4 预览模型排批 |
| 竞争面 | **确认威胁但不构成架构威胁** | 功能覆盖面宽（习惯+任务+目标+心情+奖励全家桶）但分散；本插件差异化 = 习惯算法内核（SKIP/maxGap/at-most/quota/里程碑）+ 不可变事件 + 公开 API v5 + 零惩罚低压力，Pinch 奖励经济（趣币/等级）反而固化了我们要守住的「无惩罚」边界 |
| 佐证 | 3 条 | ① 其 checkinNotes 备注同步文档与导出回收站 = 与本插件 record-notes/锚点路线互证；② minAppVersion 3.7.0 提示老宿主存量用户面；③ 奖励等级体系再次确认 T-1413 轻量积分边界（单轨/无等级）的必要性 |

第四轮小结：首位任务 Pinch 深评完成（无代码采纳、迁移通道延后、竞争面确认）；第四轮继续滚动——剩余扫描面按 D-256 触发条件执行，工程队列（A8 命名视图等真实反馈切片）优先于新扫描。

## 十四、T-1400 生态调研循环·第五轮（2026-09-24，M2 收口触发）

触发：R-20.3 四张回顾行动卡完成（T-1436/T-1439/T-1450/T-1448），M2「可解释统计」实质收口，按路线「里程碑结束 → 增量调研」执行。本轮方法=延后项触发条件核查 + 定向外部取证（距第三轮全网扫描仅一日，不做全量重扫）。

### 触发条件核查（第三轮延后 6 项）

| 延后项 | 触发条件 | 本轮结论 |
| --- | --- | --- |
| 情境标签×打卡交叉统计（Daylio/Pinch） | R-A3 context normalization 交付 | **触发已满足 → 采纳 T-1452 并当场落地**（见下） |
| 跨应用导入框架枚举页（Daily You） | 导入预览模型（T-1427）落地 | **触发已满足但评估为延后维持**——枚举页属帮助性 UX，当前各来源入口已可达且无用户反馈「找不到入口」；触发条件收紧为「用户反馈导入入口分散或新增 ≥2 导入来源时」 |
| entries 追加式社区格式兼容 | Loop CSV 之后再说 | Loop CSV 已在，仍无用户需求信号 → 延后维持 |
| 破戒意图确认+抵制成功计数（one sec） | 戒除类真实用户反馈 | 未触发（保持） |
| habit stacks 序列化（Routinery） | 模板组合交付 | 未触发（模板组合未立项） |
| cellStyleRules 阈值着色 | 热力图改版窗口 | 未触发（T-1410 已覆盖主需求） |

### 定向外部取证

- **思源 3.9.0 闪卡重构**（T-1374 观察点）：FLASHCARD.md 设计文档已出现在 feature/flashcard 分支（2026-09-11），重构为底层数据结构变更、尚未发版 → 维持观察不立项；信号强化点=官方 issue 明确「趁重构由思源原生实现，插件不追赶」，印证本插件不投入闪卡相邻功能的判断。
- **外部应用扫描**（Streak/HabitKit/Loop 近一周 release 检索）：无第三轮之后的新能力信号；Streak 仍为 GitHub 式网格+极简路线（第三轮已佐证）。

### 采纳（1 项，当场落地）

- **T-1452 情境词元×星期交叉统计**：context-normalization 新增 crossTabulateContextWeekdays 纯函数——回答「这个跳过原因常发生在星期几」。口径：仅对总命中 ≥3（复用 CONTEXT_MIN_SAMPLE）且最高星期**严格过半**（count > total/2 且 ≥2）的词元给模式，宁缺毋滥；报告情境节内追加至多 3 行模式（样本不足守卫沿用）。零存储变更、零依赖、无时钟。tests/context-normalization.test.cjs 扩充集中/分散/门槛/纯度用例。

### 第五轮小结

延后项触发核查 6 项：采纳 1（当场落地）、延后维持 2、未触发 3；外部取证无新增采纳。M2 收口后的技术面结论不变：差异化继续压在习惯算法内核与统计口径，可视化层跟随宿主数据库视图演进保持克制。第六轮触发条件：M3（笔记与迁移）或 M4（生态契约）任一收口，或用户点名竞品/工具深评。

## 十五、T-1400 生态调研循环·第六轮（2026-09-25，用户点名触发）

触发：用户 2026-09-25 要求「再次生态调研，尽量多扩充参考内容，并完善插件定位、UI、交互、功能与总规划」。此时 v18.5.0 已发布（设置页与外部联动重构），R-A0～A12 泳道本地部分收口。本轮是六轮中扫描面最宽的一次：四路并行（①独立应用与行为科学 ②GitHub 开源增量 ③笔记生态与思源集市 ④UI/交互设计专项），合计 100+ 次检索与抓取，取证日 2026-09-25。部分时段搜索服务限流，相关取证降级为 GitHub API / raw 清单 / 官方注册表直读；证据等级与弱信号在各条目内标注。

### 扫描覆盖

- 独立应用：Finch、Tiimo、goblin.tools、Rise、HabitNow、Fabulous、Structured、Couch、Bloom、Acta、WaterMinder、Medisafe 类药盒、HabitKit（2026-08/09 更新）、Habitify（mood 弱信号）、Grow 2026、Tangerine、Summer Arc 趋势；已评应用近三月 release 复核（Loop 止于 v2.3.1 无新信号）。
- 行为科学：Duolingo streak freeze/repair 机制及其 dark pattern 批判研究、66 天习惯自动性研究口径更新（中位数 59-66 天、个体 18-254 天）、实施意图 if-then（Divine 2025 / JMIR 2024 DBTI）、诱惑捆绑（Milkman→Acta 产品化）、 calm/反焦虑 UX、ADHD 友好设计。
- GitHub 开源（全程 GitHub API 通道）：InlitX/streak v1.4→v2.0.0（2026-08～09 八周 7 版）、mhabit v1.27.9（2026-09-20）、ximing/vital、Vsein/Neohabit、enjo2/PixelHabits、FrequeNCy144/Frequent-Habits、Lethe044/hermes-life-os、chongjie-6/OpenHabits、MCP for habits 生态（56 结果群体观察）、kb019/sprout 等 CLI 面；topic:habit-tracker 2026 年新建 1056 仓、quantified-self 新建 342 仓的增量扫描。
- 笔记生态：思源集市 520 插件全量 diff（2026-09-19 后 47 条更新逐一核对）、Obsidian 官方注册表 8038 条解析（habit 相关 112 款）、TaskNotes（2165★）、Bases Heatmap View、Logseq DB 版后生态、Tana/Capacities/Heptabase/AppFlowy、Notion Life OS 模板趋势、思源宿主 v3.8.5/3.8.6-alpha releases、pinch 确认无 v2.8。
- UI/交互专项：streak freeze 交互解剖、双日规则文案、Streaks 大按钮+长按、NN/g undo 与渐进式披露、热力图色盲安全色阶（viridis/cividis 共识）、环/链/网格分工、Apple 活动圆环、大数字+sparkline、Daylio 色彩心理临床反例、内嵌 tracker 触控约束、Apple HIG 44pt / Material 48dp / WCAG 2.2 触控规范、reduced-motion 三通道冗余、里程碑分级庆祝、bento grid、周开始日。

### 竞品警报（1 项）

**Workbench 工作台**（IAliceBobI/sy-workbench-plugin，sy-tomato 作者，集市 2026-09-25 上架 v1.0.2）：每晚 3 分钟「晚备弹」AI 对账、白天时间轴自动留痕，主打「**不用打卡、不用补记——计划即账本**」；四池任务库（含带上下限配额+最低频率的「维持炉火」池——习惯邻接机制）、不想做清单、块属性唯一事实源、内核侧 MCP 外脑、飞书日历推送。评估：**叙事层威胁**——以「反打卡」切入自我管理心智，且作者为思源插件圈最高产者、宣发势能强；**机制层不构成威胁**——其最低频率配额恰证明频次约束是刚需（连最反追踪的作者也做配额），而小驴在习惯算法内核（SKIP/maxGap/quota/at-most/里程碑）、不可变事件、统计口径、渲染块与 API v5 上全面领先。应对：①文案层明确区隔「**低压力记录 ≠ 零记录**」——不记录就没有可回看、可解释、可调整的长期数据，小驴的答案是把记录成本压到两次点击以内而非取消记录（归 T-1461 落地）；②不跟进其项目管理/全家桶形态；③持续观察其迭代与用户反馈。

### 采纳（3 项，登记 T-1461/T-1462/T-1463，拆批次开发）

| 候选 | 来源（证据等级） | 吸收点 | 用户收益 / 代价 | 批次 |
| --- | --- | --- | --- | --- |
| **低压力呈现与包容性设计规范** | NN/g undo 与渐进式披露（权威共识）；viridis/cividis 色盲安全色阶（科学可视化共识）；PMC 红绿配色负面情绪临床证据；双日规则（goalsandprogress，行为科学背景）；Apple HIG 44pt/Material 48dp/WCAG 2.2（平台权威）；reduced-motion 三通道冗余（设计社区共识）；Duolingo streak freeze 学术批判（反例红线） | ①热力图/状态色复核为紫罗兰单色亮度阶梯+数字/tooltip 冗余编码，禁红绿对举、低完成度不上警示红；②「断一天是数据，连断两天才是信号」双日规则文案与失速卡无罪化改写，全局 calm 文案禁则（禁「你落后了」式措辞）；③完成态颜色+图标+文字三通道静态可辨（动效只是增量）入 ui-state-ledger 守门；④44/48px 触控目标全量审查（底栏/渲染块按钮/周条格子）入视觉 harness；⑤低风险操作 undo 优先于确认弹窗审查 | 高（把「低压力」从口号落成可验收规范；无障碍与移动触控直接受益）/ 低-中（零 schema 变更，纯呈现/文案/守门） | **T-1461** |
| **数值快捷记录预设增量** | WaterMinder「Log Cup」范式（商店文案+2026 横评：预设量一键 +1 杯/+250ml 是饮水类标配） | 数值型项目 per-item 可配预设步长集合（如 +1/+250/+500），记录对话框与 today 渲染块按钮组呈现 chips，一次点击=一条追加式增量事件；事件不可变语义不变，无配置时行为不变 | 中-高（数值/计数类记录从「点开输入」降到「一键」，含饮水/页数/次数场景）/ 低（纯 UI 增强，走既有 recordEvent value 通道） | **T-1462** |
| **迁移健壮性与边界用例** | streak v2.0「跨午夜专注会话两天都计数」（release 页）；mhabit WebDAV「同步保留未知字段」（release 页）；PixelHabits 三段式合并语义（README：每日打卡取并集、元数据 updated_at LWW、事件按 id 幂等去重） | ①跨午夜来源/会话按 localDate 预切分与双日归账的边界断言（本模型 T-1385 已预切分，本项是证据补强非行为变更）；②导入预览「未识别列/字段原文保留到审计与预览、不静默丢弃」原则化+测试，导出文档注明向前兼容承诺；③PixelHabits 合并语义写入导出/同步设计文档作未来多端参考（不实现同步） | 中（防止未来格式升级破坏旧数据；跨午夜口径有可复跑证据）/ 低（文档+测试为主） | **T-1463** |

### 延后（13 项，触发条件）

- **if-then 情境提示字段**（Divine 2025/JMIR DBTI，学术证据）：项目元数据可选「触发情境+行动句子」，记录页展示。触发：项目 schema 演进窗口。
- **今日完成度环**（Apple 活动圆环 wrap-around，trophy.so 分析+swdevnotes 实现）：行动台摘要条升级 SVG 环+dock 常驻小环。触发：今日行动台下一轮视觉迭代。
- **大数字+sparkline 报告卡**（oviond/graphed 共识）：报告统计值配 7/30 日 sparkline 压缩移动端卡高。触发：回顾/洞察改版窗口。
- **时段分组多次记录视图**（Medisafe 药盒范式+Tangerine，第三方评测）：一日多次项目按早/午/晚分组渲染。触发：一日多次项目用户反馈。
- **超额日着色**（streak v1.9，release 页）：quota 超额的正向渲染。触发：渲染块 quota 表达迭代。
- **fractured/sparse 热图**（Neohabit，README；维持第三轮延后）：fractured 触发=高频次数据规模；sparse（月/45 天低频投影）与 maxGap 组合评估触发=热力图改版窗口。
- **确定性相关性洞察**（hermes-life-os，README+源码结构）：最小样本纪律（重叠≥4 天且 |r|≥0.4 才输出）+滞后相关，不依赖 LLM。触发：洞察改版窗口。
- **Story Mode 渐进解锁**（Frequent-Habits v2.3.4，README/F-Droid）：初始 1 个习惯、30 天且成功率≥85% 解锁下一槽位。触发：用户明确提出「帮我控制只养少数习惯」类需求。
- **分享图片导出**（OpenHabits，README）：整年格子渲染成含 streak/完成率的可分享 canvas 图。触发：渲染块导出窗口。
- **MCP descriptor 层**（habitica-mcp/anneal-mcp 等 56 结果群体观察）：API v5 之上加 MCP 描述符让本地 LLM 代理读写。触发：API v5 真实消费方≥2；写操作确认门控与「提案不静默改数据」（vital）为前提护栏。
- **CalDAV 外部来源**（bonebearHsu/siyuan-plugin-caldav-sync v0.2.12，README）：日历周期事项作为打卡信号源。触发：用户呼声；登记外部来源候选池第 8 位。
- **streak freeze/护盾**（Duolingo 范式+学术批判）：若未来做「漏卡宽限」必须是自动宽限窗口而非付费修复（dark pattern 红线）；与已有 maxGap 容错重叠，默认不做。
- **周开始日开关／quiz 式建档引导／bento 网格重排／66 天成熟度进度条／90 天弧**：低优先观察；前两者等数据聚合与新手反馈确认，bento 等内容层稳定，成熟度进度条（66 天参考刻度，数据已齐）与 90 天弧（趋势性）等投影模型低成本扩展窗口。

### 不做（8 项，边界依据）

- **社区挑战/Live Challenge**（Fabulous v23.0/HabitNow）：账号与社区体系边界，local-first 不兼容。
- **宠物养成主体**（Finch Adventures）：与笔记工具定位和极简设计语言冲突；「照护式无罪化」叙事可借鉴进文案，不做宠物系统。
- **定位/运动情境触发提醒**（Grow 2026 三重情境提醒）：桌面宿主形态+传感器后台禁区。
- **诱惑捆绑奖赏**（Acta/Milkman 产品化）：与低压力、无诱导设计语言冲突。
- **付费 streak repair**（Duolingo 式）：dark pattern；连击修复走已有 maxGap 容错与补记能力。
- **情绪日志独立模块**（Habitify mood/Zapier 触发器，弱信号）：T-1433 情境备注归一化已覆盖轻量需求，独立情绪追踪超出打卡边界。
- **Workbench 式项目管理/四池任务库/MCP 外脑/飞书推送**：不跟进全家桶形态；以「低压力记录」文案区隔其「零记录」叙事（见警报）。
- **MeiDay 式云端三端 OSS 存储**（CongSec/siyuan-plugin-meiday v1.1.0）：数据全走作者 OSS 与本地优先相悖；「Web 只读报表端」等其有用户声量再评。

### 佐证与信号（不产生任务）

- **「低压力」机制化成为 2026 社区显学**：streak 的 streak-optional/track-only 习惯（v2.0）、vital「Calm Productivity——无红点徽章无焦虑指标」、Bloom「Habit Tracking That Doesn't Punish You」、Couch「温和连击——漏卡不指责」自称 ADHD-friendly、Finch 无罪化照护、Duolingo streak freeze 被学术列为潜在 exit dark pattern——本插件「零惩罚低压力」定位获多源外部印证，且社区给出了可落地的具体机制（T-1461 吸收）。
- **66 天是中位数不是规则**（59-66 天中位、18-254 天个体区间、单日中断影响有限）：反内疚文案与「成熟度刻度」候选的学术依据；「连击归零」式呈现缺乏依据。
- **AI 护栏三件套收敛**（vital：提案永不静默修改数据+每功能模型路由+每日调用预算；habitica-mcp：写操作确认门控；hermes：确定性洞察优先、LLM 可选本地）：ai-integration-plan 未来扩展的现成护栏模板。
- **合并语义取代同步协议**（PixelHabits 三段式、mhabit 未知字段保留、BeaverHabits snapshot 导出端点）：通用习惯数据格式三轮定向搜索 0 结果——社区正用「导出端点+宽容读取」替代正式标准；导入导出的向前兼容是正确投资。
- **通用视图被宿主收编的三方证据**：思源 3.8.5 把数据库日历/列表视图收为原生（3.8.6-alpha 继续加码 ISO 周/无日期排期）、Obsidian Bases 生态出现热力图渲染插件、思源列表视图插件 itayvak/siyuan-database-list-view 上架即被原生覆盖——插件生存位在垂直场景（习惯算法内核、不可变事件账本、统计口径），通用视图渲染不值得再投入。架构判断再证。
- **频次约束刚需再证**：Workbench「维持炉火」池带上下限配额+最低频率、streak v1.9 周目标超额着色、Frequent-Habits Story Mode 成功率门槛——quota/at-most 内核是各家趋同方向，小驴已有口径优势。
- **竞品节奏稳定**：pinch 停在 v2.7.1（9 月曾 2-3 天一版）、Loop 止于 v2.3.1、HabitKit 2.0 放弃全量重写转功能路线图——窗口在叙事与真机体验，不在功能军备。
- **TaskNotes（Obsidian，2165★，2026-09-23 活跃）**：任务+时间追踪+日历一体的事实标准插件，跨生态校准视图矩阵完备性的参照系；Bases Heatmap View 佐证「官方数据库+插件渲染垂直场景」收敛模式。
- **Notion/模板生态**：Life OS 全家桶仪表盘与「AI 辅助习惯追踪」主题词流行；Ultimate Brain 未见 2026 具体更新公告（如实注明）。多视图聚合首页方向佐证。

### 工程注意项与清单修正

- **宿主 3.8.6 正式版回归**：alpha 四连发期间数据库视图 API 变动，正式发版后跑渲染块真实内核回归——登记 **T-1464**（local-auto，e2e 隔离内核）。
- **幽灵目标清理**：第三轮来源提及的 vegvisir、habit-charts、simple-habit-tracker 经 Obsidian 官方注册表 8038 条核实**不存在**，移出后续扫描名单；后续扫描以官方 registry 为准。
- 集市 520 插件中 2026-09-19 后与打卡/时间/习惯相关的实质增量仅四个：Workbench（警报）、CalDAV 同步（延后候选）、MeiDay（观察）、QingTrail（叶归系可视化，佐证）；正面战场无新打卡插件。

### 第六轮小结

四路扫描 100+ 次取证 → 竞品警报 1（Workbench，叙事层）、采纳 3（T-1461 低压力呈现规范/T-1462 数值快捷增量/T-1463 迁移健壮性）、延后 13、不做 8、佐证 9、工程注意项 2。本轮最重要的战略结论：**竞争压力从功能转向叙事**——「反打卡/零记录」营销正在兴起，小驴的应对不是跟随去记录化，而是把「低压力记录」做成可验收的呈现规范（T-1461）并讲清「不记录就没有可回看的数据」；差异化锚点继续压在习惯算法内核、不可变事件账本与统计口径，呈现层与宿主通用视图保持克制分工。

## 十九、T-1400 生态调研循环·第九轮（2026-09-26，设置与记录体验里程碑收口）

触发：T-1472～T-1476 完成本地提交 `68c5c1b`，用户继续开发。沿用第十七节的轻量轮方法：核查正式版/上游/竞品，定向读第八轮之后的注册表增量；不把版本未变等同于全网没有需求。本轮没有改动插件代码或发布资产。

| 核查面 | 证据与结论 |
| --- | --- |
| [思源 releases](https://github.com/siyuan-note/siyuan/releases) | GitHub API latest 仍为正式版 v3.8.5；最新预发布 v3.8.6-alpha.6，2026-09-26 03:20:49 UTC 发布。T-1464 要求正式版，因此未触发。 |
| [alpha.6 发布说明](https://github.com/siyuan-note/siyuan/releases/tag/v3.8.6-alpha.6) | 定向查看移动编辑器命令入口、嵌入块导出/工具栏、插件资源选择与发布资源目录声明等条目。它们是候选版本累计说明，不能据此断言全部是 alpha.5→alpha.6 新增，也不替代本插件真实渲染块回归。待正式版按 T-1464 执行。 |
| [思阅 #55](https://github.com/mm-o/siyuan-sireader/issues/55)、[思播 #180](https://github.com/mm-o/siyuan-media-player/issues/180) | 均 open、0 评论，updated_at 仍为 09-25；没有维护者回应触发接口调整，不追加无实质内容的外部评论。 |
| [Workbench](https://github.com/IAliceBobI/sy-workbench-plugin)、[Pinch](https://github.com/royc01/pinch) | 最新 Release 分别 v1.0.4 / v2.7.1；pushed_at 分别 09-25 16:25:37 UTC / 09-18 00:09:12 UTC，较第八轮未推进。 |
| [思源集市 plugins.txt](https://github.com/siyuan-note/bazaar/blob/main/plugins.txt) | commits API 对该路径查询 since=2026-09-26T00:00:00Z 返回空。本结论只覆盖这个文件和查询窗口，不推断所有插件都没有更新。 |
| [Obsidian 注册表最新增量 a71a376](https://github.com/obsidianmd/obsidian-releases/commit/a71a376c7a76fa9865150b49c48b2c4722159234) | 09-26 03:31:18 UTC，新加 Search and replace helper、Local Linker，另修改 Excel Lite / TaskNotes AI Reporter 简介。直接审阅 community-plugins.json diff；新增是查找替换/本地插件开发辅助，未发现需要本插件跟进的习惯或问卷机制。前一条 081bfc6 已在第八轮审阅，不重复宣称新增发现。 |
| [Zenith](https://github.com/saifun0/obsidian-zenith) | latest 0.2.5，pushed_at 09-25 18:48:31 UTC，无新版本；保留第八轮设备遮挡诊断观察，不在没有设备反馈时加入手调边距。 |

本轮直接采纳 0，新增开发任务 0。可做队列已经完成，不主动解除积分、隐藏集 UI、bento 和热图设计窗口的条件，也不因一次“继续”再次发布。下一步：宿主正式版、上游回应、明确功能/设计选择或真机问题反馈到来时开对应任务；新里程碑再触发下一轮轻量调研。

## 十八、T-1400 生态调研循环·第八轮（2026-09-26，v18.7.0 收口轻量轮）

触发：T-1470/T-1471 随 v18.7.0 发布。方法沿用第十七节：距上轮不足一天，核查触发器并定向审阅增量，不声称全网全量覆盖。来源为 GitHub API 与上游官方文档；竞品文档只证明其声明，不等同实测。

| 核查面 | 本轮证据与结论 |
| --- | --- |
| [思源 releases](https://github.com/siyuan-note/siyuan/releases) | 最新预发布 3.8.6-alpha.5；latest 正式版 3.8.5（09-22）。T-1464 未触发。 |
| [思阅 #55](https://github.com/mm-o/siyuan-sireader/issues/55)、[思播 #180](https://github.com/mm-o/siyuan-media-player/issues/180) | 均 open、0 评论、最后更新 09-25。R-REL-CHECK 无需追加；Task Horizon/Dock Tomato 草案仍未提交。 |
| [Workbench](https://github.com/IAliceBobI/sy-workbench-plugin/releases/tag/v1.0.4)、[Pinch](https://github.com/royc01/pinch/releases/tag/v2.7.1) | 版本及 pushed_at 均未推进：Workbench 最后推送 09-25 16:25 UTC，Pinch 09-18。Workbench 帮助中心/演示投入结论不变。 |
| 思源集市 plugins.txt 自 09-25 的变更 | 仅 mindmap 与已知 Workbench 上架；[Workbench 注册提交](https://github.com/siyuan-note/bazaar/commit/63c7199f3c64e3d0e169b6e0b4a1c2faa8620fb0) 可复核，无新增习惯竞品。 |
| [Loop](https://github.com/iSoron/uhabits/releases/latest)、[Table Habit](https://github.com/FriesI23/mhabit/releases/latest)、[Streak](https://github.com/InlitX/streak/releases/latest) | 分别保持 v2.3.1、v1.27.9+198、v2.0.0。Table Habit 的表单状态保持、导入逐项失败提示与未知字段保留佐证既有方向，无新版本触发。 |
| Obsidian 注册表 | 查询 09-25 以来 16 条提交摘要，定向读最新两条 diff（081bfc6、34a8b40）；新增多为文档/AI/手写工具。发现邻近的 Zenith 条目后追加读其官方日记/移动文档，见下。其余 diff 未逐条展开，不推断全表无新增。 |

### 新观察对象：Zenith（不直接立项）

[Zenith](https://github.com/saifun0/obsidian-zenith) 最新 0.2.5（09-25），查阅时 HEAD `772df0837bad21490d5d3467506e53aa87c69e9e`。[日记说明](https://github.com/saifun0/obsidian-zenith/blob/772df0837bad21490d5d3467506e53aa87c69e9e/docs/en/journal.md) 描述日记 frontmatter 中的 checkbox/scale/number、周配额、目标修订、晨晚复盘和每日问题；[移动说明](https://github.com/saifun0/obsidian-zenith/blob/772df0837bad21490d5d3467506e53aa87c69e9e/docs/en/mobile.md) 描述安全区与宿主覆盖高度测量、当前读数和设备本地手动覆盖。

- **佐证**：日记和打卡组合、按修订保留历史目标、记录与统计入口分工，与既有方向一致。先前“生态内无先例”应收窄为“此前扫描未发现完全相同闭环”，不能继续作为排他性产品结论；Zenith 文档未证明与小驴问卷幂等写入完全同构。
- **延后观察**：把设备遮挡测量值纳入诊断值得在下一次安全区/软键盘真机反馈时评估。当前缺少小驴实际设备测量需求，不引入用户手调边距或宿主私有 DOM 依赖。
- **不采纳**：其“戒除只算已记录日”与本插件 at-most 既有统计口径不同，不因竞品文档而改写历史语义；其 frontmatter 账本与全家桶模块不替代本插件事件库。

本轮结论：直接采纳 0、新增观察对象 1（Zenith）、无新的可执行开发任务。T-1464、设计窗口、用户决策、上游回应和真机反馈继续按触发条件等待；下一轮由新里程碑/新版本/用户点名触发。

## 十七、T-1400 生态调研循环·第七轮（2026-09-26，轻量轮）

触发口径：v18.6.0 发布当日，按「里程碑结束 → 增量调研」执行轻量轮（方法=触发条件核查 + 定向取证，距第六轮全量扫描仅一日，不做全量重扫）。

### 触发条件核查

| 触发器 | 结论 |
| --- | --- |
| 宿主 3.8.6 正式版（T-1464 触发条件） | **未触发**——截至 2026-09-26 仅 alpha.1~alpha.5（09-23~09-25），无正式版；T-1464 维持等待 |
| Workbench 竞品迭代（D-271 警报跟踪） | **活跃但无新机制**——v1.0.2→v1.0.4 一天三版，内容均为帮助中心扩充（13 篇）、实拍配图与交接会「现场演绎」演示段：重心在新手引导与内容营销，能力面无扩展。与我方 v18.6.0 功能交付并行，差异化格局不变 |
| 上游 sireader#55 / siplayer#180（R-REL-CHECK 同窗口） | 均 open、0 评论、更新于 2026-09-25——无回应、无契约变化，无需更新原帖 |
| Task Horizon 反向提案 / Dock Tomato PR 草案 | 仍未提交，无外部动作可核查 |

### 定向取证

- **感恩日记主题持续渗透习惯应用**（证据等级 B，App Store/Google Play 列表）："Habit — Daily Tracker" 新增 Grateful 感恩日记功能；Habit Book 以感恩日记/每日反思为卖点——佐证 T-1465 问卷日记（感恩三问预设）踩中行业方向，且小驴形态（打卡×问卷×写入日记×统计联动）在生态内仍无先例。
- 其余扫描面（GitHub topic 增量、Obsidian 注册表、新应用）：距第六轮全量扫描仅一日，无新面孔信号。

### 第七轮小结

轻量轮无采纳、无新警报。两点记录：① Workbench 的内容投入节奏（一天三版全投引导）确认其「叙事+新手」路线，小驴的对应阵地是功能深度与真实内核证据；② T-1464 触发条件（宿主 3.8.6 正式版）与延后池各触发器均未满足。下一轮触发：宿主 3.8.6 正式版 / 下一个里程碑收口 / 用户点名。

## 十六、专项调研：九宫格日记/感恩日记与问卷式日记打卡联动（2026-09-26，用户想法）

用户想法：点击【感恩日记】类打卡项目 → 弹出问卷式表单（按模板问题列表填写）→ 完成后把完整内容写入每日日记或指定文档（目标可选、模板可自设+预设），同时完成打卡。两路并行取证（方法论与应用 / 笔记生态插件实现），证据等级 A=官方页面直读、B=多来源交叉、C=单源未核实。

### 方法论与模板资产（可直接抄）

- **感恩日记/五分钟日记**（Intelligent Change 官方问题页，证据 A）：早 3 问（我感恩…×3 / 什么能让今天很棒×3 / 我是……肯定语）+ 晚 2 问（今日 3 件精彩之事 / 今天若重来如何更好）。研究依据：Emmons & McCullough 2003（JPSP）RCT——感恩组幸福感/乐观/睡眠更优；注意每日记录易流于套路，提示词按周轮换可缓解（Positive Psychology 综述，证据 A，含 20+ 扩展提示词）。
- **九宫格晨间日记**（佐藤传《晨间日记的奇迹》+曼陀罗九宫格，证据 B）：中央格=日期/天气/心情（可自动生成），周围 8 格=工作/财富/健康/人际四支柱+开心的事/进步/待改进/今日愿望；「填满格子的欲望」降低写作门槛。
- **复盘类**：KPT 复盘法（Keep/Problem/Try）与中文「每日复盘三问」（收获/反思/明日计划）同构；Notion 官方深度复盘模板=感恩+活动纪录+问题总结+下一步目标，证明「感恩×复盘」组合是主流形态（证据 B）。

### 应用与插件先例

- **格志日记 Grid Diary**（最直接对标，官网直读，证据 A）：网格=问题列表，官方模板库+提示词库、问题可完全自设，答案按问题分节拼装成篇；痛点=导出走 Premium、无打卡统计联动、数据在 app 内。
- **Obsidian Daily Prompt**（Erl-koenig/obsidian-dailyPrompt，README 直读，证据 A）：设置定义问题集（text/textarea/checkbox/slider/嵌入块）→ 命令弹 modal 逐题作答 → 写入当日 daily note 独立 section（唯一标题定位+行前缀，日不存在可创建）；**重复填写行为未文档化**（幂等空白点=小驴超越位）。QuickAdd capture 范式（定位插入+运行时变量）同构佐证。
- **day-memo**（zhouhao，思源集市，证据 A）：Daily Note 路径模板变量（sprig 日期）+正则归一化+一键追加；**教训**：无防重、来源引用块污染被 issue #34 诟病——审计与幂等是差异化点。
- **dailynote-today**（frostime，证据 A）：思源日记定位栈事实——SQL `custom-dailynote-yyyymmdd` 属性（宿主 2.11.1+ 自动加）→ renderSprig(dailyNoteSavePath) → createDocWithMd（官方明文同 path 重复调用不覆盖，天然幂等）。
- **Workbench 晚备弹**（证据 A）：AI 对话式「条件化问卷」先例（有证据的不问、只问缺失项）；写入按月一篇按日分组。
- **反例面**：思源/Obsidian 打卡类插件（Habit Tracker 21、diary-calendar、bullet-journal 等）普遍止步于「跳转日记」或行内标记，**无人做「打卡×问卷×写入日记」闭环**；Logseq/Notion 靠模板预铺（非弹窗），答案结构化靠 frontmatter/数据库属性。

### 可行性结论：高可行（五块拼图全部在位）

| 拼图 | 既有资产 |
| --- | --- |
| 问卷引擎 | 新纯模块（问题集定义/归一化 fail-closed/答案→markdown 渲染），模式同 template-packs/view-scope |
| 弹窗表单 | 既有 dialog/sheet 模式（quick-dialog、记录对话框），双主题/焦点/移动端纪律现成 |
| 写入通道 | summary-resident（ASCII 标记幂等+只追加+审计+尽力而为旁路）+ note-anchor appendBlock + diary-report 绑定文档通道 |
| 目标定位 | createDocWithMd 已在用（bind-editor/note-anchor-picker）；diary-search 按 hpath 查询；dailynote-today 验证的定位栈直接采用 |
| 打卡联动 | recordEvent note 通道+修订/审计既有；完成判定/连击/洞察/API 同口径自动生效 |

### 设计草案（T-1465，第一版边界）

- **入口**：打卡项目可选绑定问卷模板（项目编辑器新增绑定行）——该项目在今日页/today 渲染块的打卡动作变为「填问卷」；未绑定项目行为不变。
- **预设 5 个内置模板**（只读内容资产，双语）：① 感恩三问；② 五分钟日记早晚版（按时段取半区）；③ 九宫格晨间日记（九格 markdown 表格渲染，中央格自动填日期/星期，天气/心情留填）；④ KPT 每日复盘；⑤ 深度复盘周记（联动周统计）。用户可自建问题集：text/textarea 起步，slider(1-5) 可选；第一版不做图片/评分字段落库。
- **流程**：提交 → recordEvent 先落盘（事实层，note=答案一行摘要截断）→ 模板渲染 markdown（`## 🙏 模板名 YYYY-MM-DD`+逐题分节，九宫格为表格）→ appendBlock 到目标（显式指定文档 > SQL custom-dailynote-yyyymmdd > renderSprig(dailyNoteSavePath)+createDocWithMd，不硬编码 /diary/）。写入失败**不阻断打卡**，审计+toast 重试（同 summary-resident 旁路纪律）。
- **幂等**：写入块带结构化标记（同 `lv-checkin-summary` 惯例）——同日同模板已写入 → 提示「查看/重新填写」；重填=更新插件自写块（updateBlock+lockType 类型保护）+事件修订路径；**绝不改写用户已有内容，只管自己写的块**。
- **隐私**：答案正文只进目标文档；事件 note 只存截断摘要；进 privacy-scope 敏感字段审计既有口径；导出审计照常披露。

### 小结

独立 App 的两个结构性痛点——数据锁定（格志 Premium 导出、五分钟日记零导出）与日记×打卡统计割裂（格志无统计、Daylio 无长文）——正是本插件差异化位：**写感恩日记即完成打卡，内容归思源本地文档，连击/报告/渲染块/API 同口径联动**，生态内无先例。登记 **T-1465**（local-auto，实现含隔离内核 e2e；真机触控与真实日记文档现场归 host-pending），等开工指令；建议排期在第 2 批（R-A16）之后、第 3 批前。

## 二十、T-1400 生态调研循环·第十轮（2026-09-26，用户点名触发，宽覆盖全量轮）

触发：用户 2026-09-26 要求「再次进行新的调研，更加全面，范围更广，内容涉及到目前已有的各类功能及未来的开发规划」。距第六轮全量扫描仅一日，但本轮按用户要求升级为**宽覆盖全量轮**：七路并行（①独立应用 ②GitHub 开源 ③笔记生态 ④宿主与集市 ⑤行为科学 ⑥AI/智能体 ⑦可穿戴与呈现），约 20 次检索与抓取，取证日 2026-09-26。部分搜索请求限流失败，相关面以可复现来源补齐或如实标注缺口；证据等级 A=官方页面/API 直读、B=多来源交叉、C=单源未复核。

### 核查面（触发器状态）

| 核查面 | 证据与结论 |
| --- | --- |
| [思源 releases](https://github.com/siyuan-note/siyuan/releases) | latest 正式版仍 **v3.8.5**（09-22，证据 A，直读发布说明全文）。T-1464（等 3.8.6 正式版跑渲染块回归）**未触发**。**新增工程信号**：3.8.5 Development 节含三条插件相关修复——#19599 全局快捷键注册可打断插件 onload 启动、#19651 dock 图标配置变更后不更新、#19652 只读模式下插件编辑器命令快捷键不触发。三者分别落在本插件快捷入口描述符注册链（T-1423）、dock 宿主、命令面板路径上，记入工程注意项。 |
| [Pinch](https://github.com/royc01/pinch/releases) | 最新仍 **v2.7.1**（09-18），发布列表无新版本（证据 A）。竞品停滞结论维持。 |
| [Workbench](https://github.com/IAliceBobI/sy-workbench-plugin/releases) | 最新仍 **v1.0.4**，5 个 release 全部集中在 09-25 一天，v1.0.4 内容=帮助中心第 13 篇《飞书日历同步与对账》+交接会「现场演绎」演示段+11 处实拍配图（证据 A）。**能力面无扩展**，确认其「内容营销+新手引导」路线；差异化格局不变。 |
| [思源集市 plugins.txt](https://github.com/siyuan-note/bazaar/commits) 提交增量 | 09-25 14:08 UTC 之后 3 条：Fly1018/siyuan-live-date（#2275）、Fly1018/siyuan-click-counter（#2274）、wmy2981/some-settings-siyuan（#2273）（证据 A，commits API）。均为工具小插件，无打卡/习惯竞品。click-counter（计数器）为邻近品类，登记观察不立项。 |
| sireader#55 / siplayer#180 | 沿用第九轮（09-26 当日）证据：均 open、0 评论、updated_at 09-25；本轮未重复请求，无理由预期当日变化。 |
| Loop / Table Habit | Loop 止于 v2.3.1 无新信号；[Table Habit](https://f-droid.org/packages/io.github.friesi23.mhabit/) 8~9 月密集迭代 v1.26.5→v1.27.6（09-11，证据 A）：habit-count 排序、自然语言整理排序、**可调宽侧导航**、批量状态变更、自适应界面全量迁移。宽屏自适应与批量操作佐证 T-1483/归档批删方向。 |

### 独立应用增量（证据 A=App Store/官方 changelog 直读）

- **Habitify v32.0.0→v34.0.0**（2026-01~03 版本线）：①**Pause & Reflect 正念停顿**——跳过或失败时引导做一次短暂反思、写下原因，「减少内耗，放下负罪感」——与低压力基线（T-1461 双日规则）和问卷日记（T-1465）同向，是商业竞品对我方「无罪化复盘」路线的正面追随；②**Add vs Set 两种记录模式**——增量累加与设定精确值并存，佐证 T-1462 快捷增量 + 既有精确记录的组合完整性；③自定义时段块（Night Shift/Gym After Work）佐证时段分组（R-17.3）；④Bad habits 独立页签；⑤Apple Health 双向同步、Challenges 社交竞赛（维持不做边界）；⑥**官方 ChatGPT 集成**上线。
- **TickTick**（2026-09-26 在架 8.2.12）：①**MCP 支持**（AI agent 经 MCP 直接管理任务）+语音 AI 建任务+录音转写——通用效率工具全面接入智能体协议，强佐证 MCP descriptor 延后项的战略方向；②**「Unachieved」打卡**——允许显式把习惯标记为「未达成」并留下原因供日后复盘，官方文案「完全 OK to fail，反思才是前进」——与 SKIP/跳过语义对照，佐证失败显式化+无罪化的产品语言；③年视图带热力图（佐证热图方向）；④Siri AI 建任务、Extra Focus 时长追加（佐证番茄联动）。
- **HabitKit**（官方 changelog 直读）：**周开始日设置**（Sunday start，General 区）——直接佐证 R-18.3b 周开始日开关延后项存在真实用户需求；**DST 前后网格与连击数漂移一天修复**——佐证 date-keys DST 契约（T-1419）的前瞻价值；iOS 桌面小组件 + 小组件直接打卡（佐证渲染块/今日块路线）。
- **Streaks**：Apple Watch 端成为主界面、表盘 complication 实时连击、Health 自动完成（多来源交叉，证据 B）。宿主无手表端——不做；「glanceable 一眼可见」价值佐证 dock 常驻小环延后项。

### 笔记生态增量（Obsidian 官方社区页/仓库直读，证据 A）

- **Habits**（jamescliffordspratt，2026-07-03 上架新面孔）：轮盘式记录台+侧栏面板；**「暂停习惯但保留连击」**（pause without losing streaks）；**导出可打印 PDF 报告**（chart.js+jspdf）。pause 语义与 SKIP（显式请假）不同：SKIP 记事件可统计，pause 是挂起不参与排期——登记延后候选；PDF 打印导出登记新导出通道候选。
- **Daily Journal Plus**（wesswart77345，新面孔）：心情 1-5 分+习惯勾选+连击+**「3 个轮换反思提示词」**（gratitude/challenge/intention rotating prompts）+侧栏周视图（本周心情 emoji+完成率）。轮换提示词直接呼应第十六节「每日记录易流于套路，提示词按周轮换可缓解（Positive Psychology 综述）」的方法论结论——**本轮唯一直接采纳项的来源**（见下）。
- **Daily Habit**（fengshuzi/daily-habit 1.0.4，2026-08）：标签式打卡（日记里写 `#reading #exercise` 即记）+最近 7 天圆点+关键词映射配置——佐证「低摩擦记录」多形态；其 30 秒缓存+文件监听的性能处理是常见工程位。
- **Habit Tracker Dashboard**（社区页直读）：①完成口径三态 **At least(≥)/At most(≤)/Exactly(=)**——前两者与 at-least/at-most 对应，**Exactly（精确达标才算完成）是本插件五类型未覆盖的边接口径**（quota 接近但按周期不按单日），登记延后评估；②**Grace Days**（连续漏 N 天后连击才重置）——与 maxGap「缺口 <N 桥接」语义相近但不同（容忍计数 vs 桥接计数），佐证 maxGap 语义选择需在文档中写清差异；③**Minimum streak length**（连击历史仅显示 ≥N 天的连击）——低成本 UX 小候选；④数值超额外环（+2 呈现）佐证 T-1467 超额日着色。
- **Habit Tracker 21** 2.4.1：midnight reload 修复（佐证跨午夜口径）；其 maxGap 容忍为既有采纳来源，无新机制。

### 行为科学增量（证据 B=多来源交叉，含 2026 指南与综述引用链）

- **「Design for the miss」主流化**：2026 年行为科学指南普遍把 **"Never miss twice"** 列为核心原则、「允许漏卡的用户坚持最久、追求完美连击的用户退出最快」为显式行为发现——双日规则（T-1461）获得又一轮独立外部印证。
- **适应性目标（HRV/状态调整）**：2026 框架开始用 HRV 等生理指标把当日目标降为「mini 版本」——本插件无传感器数据源；但「低配日」概念可映射为 at-least 项目的**最低门槛显示**（目标与最低可接受值的分层呈现），登记延后观察，触发=用户提出「今天只想完成最低量」类需求。
- **视觉追踪优于数字计数**（pattern completion > score chasing）、自我监测元分析 +27%（Harkin 2016，19000+ 被试）、问责机制 2.8x——前两者佐证热图/环/连击呈现投入；问责属社会机制，维持不做边界。
- 66 天口径（2025 replication，中位 59-66 天、个体 18-254 天）——与 T-1469 成熟度刻度一致，无新修正。

### AI/智能体方向（证据 B）

- **「AI 教练」范式已主流化**：check-in 对话（固定三问）+周报提示词+跨周模式识别（「这是第三个周一你没散步了」）成为公开教程的标准三件套；Habitify 官方 ChatGPT 集成、TickTick MCP、ChatGPT 官方 GPT「Habit Coach」三线并进。
- **批判面同样成型**：AI「by design 迎合」使其难以承担问责硬角色（coaching 行业评述）；第三方管道教程（Zapier→Sheets→GPT→Gmail 周报）暴露时区错位、限流静默失败、未聚合先喂 LLM 得到空洞鸡汤等工程陷阱——**确定性洞察优先、LLM 可选、提案不静默改数据**的既有护栏（ai-integration-plan）再获印证。
- **预测式温和提示**：AI 应用宣传「在你断链前标记 at-risk habit」——本插件已有漏卡星期/时段聚合（T-1439 数据面），可做「明天容易漏卡的时段」前瞻提示；必须过 calm 禁则（不得变成焦虑推送），登记延后。

### 采纳（1 项，登记 T-1484，local-auto）

| 候选 | 来源（证据等级） | 吸收点 | 用户收益 / 代价 | 批次 |
| --- | --- | --- | --- | --- |
| **问卷日记提示词轮换** | Daily Journal Plus rotating prompts（Obsidian 社区页，A）+ Positive Psychology 综述「提示词按周轮换防套路化」（第十六节既有方法论结论，A）+ Habitify Pause & Reflect 同向印证（A） | 内置问卷模板（感恩三问/五分钟日记等）的可选「提示词池」：每题可配多个候选提示词，按周（或按 ISO 周 hash）确定性轮换展示；自建模板同样可用；未配置池的题目行为不变；轮换只影响呈现不影响事件结构与幂等标记 | 中-高（直接缓解「每日同题越写越套路」——问卷日记上线后的第一使用衰减点）/ 低（journal-templates 纯函数扩展+弹窗取词+双语+守门，零 schema 迁移） | **T-1484** |

### 延后（5 项，触发条件）

- **暂停挂起语义（pause）**：项目级「暂停」状态——不参与今日排期与连击统计、恢复后连击可选接续。与 SKIP（显式请假、有统计口径）正交。触发：用户提出「我要休个长假但不想项目天天出现在今日」类需求。
- **连击历史最小长度过滤**：连击历史列表仅显示 ≥N 天的连击。触发：洞察改版窗口顺手项。
- **打印友好 PDF 报告**：周/月报告的 print CSS 或 PDF 导出通道（Habits 插件 jspdf 先例；思源宿主环境打印能力需真机验证）。触发：导出通道迭代窗口。
- **Exactly 精确达标口径**：单日值必须等于目标才算完成（Habit Tracker Dashboard 三口径之三）。与 quota（周期配额）不同。触发：用户真实场景需求（如「精确吃 2000 卡」类），当前五类型可由 at-least+自律覆盖。
- **失速前瞻提示**：基于 T-1439 漏卡星期/时段聚合，在今日页温和提示「明天是容易漏卡的日子」（可选开关）。触发：calm 禁则审查通过且用户点名；默认关。

### 不做（边界维持，本轮新证据不改变）

Challenges/排行榜/社交竞赛（Habitify 32.0 主体新功能——账号与社区边界）；Apple Health 双向同步（宿主无健康平台直连，健康收件箱单向已覆盖需求）；AI 教练对话主体（受控智能体+确定性洞察优先路线不变）；Apple Watch/表盘 complication（宿主形态决定）；「AI 替代打卡」叙事（Workbench 零记录叙事同型，区隔不变）。

### 工程注意项（2 条）

- **宿主 3.8.5 三条插件修复与本地链路对照**：#19599 全局快捷键打断插件 onload——快捷对话框全局热键（QUICK_DIALOG_HOTKEY）注册在 onload 早期，升级基线到 3.8.5+ 后真机留意首启时序；#19651 dock 图标配置变更不更新——dock 入口图标变更后需重载验证；#19652 只读模式命令快捷键不触发——命令面板入口在只读文档页的可用性留意。三者均登记为下一次真机验收检查项，不单开任务。
- **DST 漂移是竞品真实事故**（HabitKit 修复说明）：date-keys 契约（T-1419）的 DST 用例（Asia/Shanghai、America/New_York 含 EDT/EST 边界）继续作为不可回退守门。

### 第十轮小结

七路扫描约 20 次取证 → 竞品警报 0（Workbench 停在内容营销、Pinch 停滞、集市无新竞品）、采纳 1（T-1484 问卷提示词轮换）、延后 5（pause/连击过滤/PDF/Exactly/前瞻提示）、不做 5（边界维持）、佐证 10+、工程注意项 2。本轮最重要的战略确认：**「无罪化复盘+低摩擦记录」已被商业头部分正面追随**（Habitify 正念停顿、TickTick Unachieved 文案），我方 18.6.0 押注的问卷日记与低压力基线踩在行业收敛方向上；**AI 智能体接入（MCP）从可选变为行业标配**（TickTick/Habitify/宿主 3.8.5 Agent 三线），MCP descriptor 延后项的战略权重上升，触发条件（API v5 真实消费方≥2）不变。差异化位仍稳固：习惯算法内核（maxGap/quota/at-most/SKIP 口径完整性、DST 契约）、不可变事件账本、问卷×打卡×日记写入闭环（生态内仍无先例）。

## 二十一、T-1400 生态调研循环·第十一轮（2026-09-27，用户点名触发：联动自动化×新建模板×事项页×UI/性能全面优化）

触发：用户要求「再次开启一轮调研，看还有哪里值得进一步优化和开发，尤其是联动后可以自动完成的内容；UI、性能、功能、交互再进行一轮优化；最终列出不低于 10 项可开发任务入清单」，并点名三个专项——①外部联动内容专门优化新建打卡模板 ②新建打卡设置更方便 ③强化事项页（专项调研同类软件）。方法：四路并行深评（①事项/倒数日赛道 ②联动自动化与零摩擦记录 ③新建模板库与表单 UX ④快速录入与 UI/交互/性能趋势），约 25 次检索与官方源直抓；证据等级 A=官方页面/API 直读、B=官方间接或权威转述、C=单源未复核。

### A 路·事项/倒数日赛道深评（13 候选）

一手版本证据：倒数日 Days Matter v5.3.1（2026-09-17）、时间规划局 v5.2.1（2026-09-18）、AtoDays v4.0.0（2026-09-24）、滴答清单 v8.2.12（2026-09-19）、Anniversary Tracker v3.29（2026-09-22）、Countdown Star v3.0.10（2026-09-21）、Memories/Love Days v1.9.29、Age Counter v7.0.4、Countdown@ v3.61（均 iTunes API 直读，证据 A）。

- **里程碑派生**：Anniversary Tracker「内置每月纪念日与 100 天里程碑」、Memories「自定义里程碑」——纪念日从单一日期变正反馈序列（证据 A）。→ 采纳 T-1491。
- **时间多单位**：Memories/Age Counter「年+月+天 / 周+天」、Countdown 灵活单位——「2 岁 3 个月 14 天」远比「832 天」可读（证据 A）。→ 采纳 T-1492（合并）。
- **周期进度可视化**：时间规划局「百分比呈现+精度可调」；目标梯度效应（Kivetz 2006、Temporal Motivation Theory，PMC5891720，证据 B）——动机随终点临近加速，进度条比纯数字更有行动张力。→ 采纳 T-1492（合并）。
- **「X 年前的今天」**：倒数日/倒数 Air 官方描述「历史上的今天与明天」——情感型回访动机，叠加思源日记跳转可成独有差异（证据 A）。→ 采纳 T-1493。
- **循环实例编辑作用域**：滴答清单 v8.2.12「重复日程修改可选仅此周期/当前及未来周期」——循环事项最高频真实痛点（证据 A）。→ 采纳 T-1494（合并）。
- **错过/过期显式处理**：Motion「Do Date ≠ Due Date」风险预警+自动重排；简化为「错过状态+一键顺延」，不抄 AI 排程（证据 A/B）。→ 采纳 T-1494（合并）。
- **提醒降噪聚合**：临床提醒疲劳研究（PMC10983371、Backman 2017 综述，证据 B）——特异性+聚合显著影响依从性；Guardian 2025 报道日推 50 条致用户整体关通知（证据 C）。→ 采纳 T-1495。
- **事件关联思源块/时间轴**：Countdown@「每个倒数事件内时间轴（日记与笔记）」（证据 A）——低成本第一步是块链接字段。→ 延后（需求验证后）。
- **ICS 导出**：timeanddate Countdown 时区/DST 自动调整（证据 A）；单向导出可行，农历/复杂重复映射 RRULE 需取舍。→ 延后（导出窗口）。
- **系统日历自动导入**：AtoDays「一键从日历导入」（证据 A）——思源宿主无系统日历桥。→ 不做（边界外）。
- **事件图标/封面、时空徽章（倒数日 34 徽章，2026-09 新动作）**：视觉留存手段。→ 延后（等里程碑上线并入成就评估）。
- **计数暂停（恋爱天数暂停键）**：场景弱+日期口径复杂度。→ 不做。
- 定义层唯一明显缺口：AtoDays「每 3 天/月末+节假日顺延」——节假日顺延依赖节假日数据源，登记观察不立项。

### B 路·联动自动化与零摩擦记录（14 候选）

- **Streaks HealthKit 自动完成**（streaksapp.com，证据 A）：习惯绑定 Health 指标阈值自动勾选——与我方「阈值自动结算」同构，是行业标杆形态。→ 采纳 T-1486（预接线）+T-1490（信任层）。
- **Streaks 8「建议任务」（从已有 Health 数据推荐习惯）**（证据 C）：→ 延后（先有聚合数据面）。
- **Habitify Shortcuts 自动化**（证据 C/B）：快捷指令调「Check in habit」动作是 iOS 标配；我方健康收件箱管道已有，缺官方配方文档。→ 采纳 T-1501。
- **Exist.io 多源聚合**（exist.io/apps-data-syncing/，证据 A）：18 服务自动同步+手动项并列+跨指标相关性——聚合视图是被动追踪的呈现归宿。→ 佐证 T-1490 信任层呈现。
- **WakaTime 心跳模型**（wakatime.com/faq，证据 A）：活跃才计时、空闲超时即断、离线补传——外部时长联动的推荐语义。→ 延后（联动协议 v2 窗口）。
- **RescueTime 后台分类、Toggl autotracker、Health Connect**（证据 A/B）：后台静默记录/全局钩子/系统聚合层——均触碰「不做传感器后台/宿主形态」边界。→ 不做。
- **GitHub 绿格 commit 即打卡**（GitHub docs，证据 A）：零操作连续性记录原型；导入链路受众窄。→ 延后。
- **Obsidian Tracker 从日记字段推导打卡**（pyrochlore/obsidian-tracker README，证据 A）：checkbox/frontmatter/inline 字段→热图与 streak，支持阈值；Logseq query `between -7d today` 同型（证据 B/C）——「内容即打卡」的笔记侧成熟形态，思源 SQL 只读能力等价且更强。→ 采纳 T-1500。
- **Notion formula 自动 streak**（thomasjfrank 实测刻意不做公式 streak，证据 B/C）：→ 延后观察。
- **IFTTT Webhooks**（ifttt.com/maker_webhooks，证据 B/C）：等于万能写入口。→ 不做（红线）。
- **失败语义（GitHub 贡献不显示排查文档+自追踪信任研究，证据 A/B）**：自动计数必须有可解释规则、可见来源、修正路径——「失败可解释是被动追踪产品的生死线」。→ 采纳 T-1490 作为全部自动结算的硬验收口径。

### C 路·新建模板库与表单 UX（10 候选）

竞品事实（证据 A 除注明外）：Habitify「秒建+自动记录（Health/Screen Time/RescueTime 联动，Pro 档）」；Streaks 官方站示例即「预接线任务」（步行 5000 步/血压自动追踪）+建议任务列表；Loop v2+ 无建议清单仅占位符引导（源码 strings.xml）；HabitKit「三步创建，没有别的要填」；Awesome Habits「模板+端侧 AI 点子+自建」三轨；Habitica 预置 Sample Habits 按 8 大类；TickTick 无习惯模板库文档；NN/g 渐进披露（≤2 层、按频率分层）；Baymard 结账表单 8 字段基准（字段数比步骤数更影响流失）；默认效应（Johnson & Goldstein 2003，证据 B）。

- **模板携带数据源预接线**：Streaks/Habitify/Exist 三家把「创建即自动接数据源」做成核心卖点；我方模板不携带数据源、健康绑定全局单项且藏设置页——真实差距①。→ 采纳 T-1486。
- **名称智能默认推断**：Baymard 8 字段基准下把「字段多」对冲成「默认值好」是最低成本路径——真实差距②。→ 采纳 T-1487。
- **互补/查漏动态推荐**（Awesome Habits 点子层同型，纯规则可实现）：→ 采纳 T-1489。
- **空状态一键装填+保存并继续**（Habitica Sample Habits+quick-add 惯例）：→ 采纳 T-1488。
- 用户模板导出/导入分享：→ 延后。模板点子轻量层：→ 延后（65 条全套模板粒度已高于全部竞品，边际收益小）。旅程式渐进组合包（Fabulous 型）：→ 延后（内容生产重）。组合包附带视图预设：→ 延后。AI 习惯点子：→ 不做（无端侧模型）。

### D 路·快速录入与 UI/交互/性能趋势（13 候选）

- **Todoist NLP 解析+高亮取消契约**（todoist help，证据 A）：解析结果就地高亮、点击取消误判、日期按远近分级着色。**TickTick 智能识别符号语法**（`~日期` `!优先级`，证据 B/C）。**Habitify 2026-03 MCP「自然语言记录打卡」**（feedback.habitify.me changelog 全文，证据 A）——习惯类 NLP 记录已是正式先例。→ 采纳 T-1496。
- **Habitify v40~48**（官方 changelog，证据 A）：v48 Journal 长按多选批量操作、v40 Progress 热力图改版+坏习惯独立 tab。**Table Habit v1.27.6~9**（GitHub release 全文，证据 A）：批量打卡+跳过一等状态+自适应对话框。→ 采纳 T-1497（我方 SKIP 语义已有，收窄为批量多选补记/跳过）。
- **HabitKit 1.16~1.18**（官网 changelog，证据 A）：三类习惯统一状态机、圆环刻度线、性能重构——圆环/刻度/渲染块打卡我方已有等价物。→ 佐证现状，不立项。
- **长任务与 INP**（web.dev optimize-long-tasks，证据 A）：>50ms 同步任务应可让出（scheduler.yield/setTimeout 兜底）。**content-visibility: auto**（MDN，证据 B）：零 JS 长列表兜底。→ 采纳 T-1498。
- **WCAG 2.2 SC 2.5.8 目标尺寸最小值**（W3C 官方全文，证据 A）：24×24+间距豁免+等效控件豁免；与 44px 基线分层不冲突。→ 采纳 T-1499。
- **暗色/触控 2026 基线**（Material/HIG 聚合，证据 B）：暗底非纯黑、品牌色暗底降饱和、8dp 间距——我方双主题已有，核对即可。→ 并入 T-1499。
- Amazing Marvin 符号 DSL+type-ahead 下拉、Raycast 参数化命令：→ 延后（NLP 落地后按反馈）。Motion/Sunsama AI 排程：→ 不做（形态不符）。iOS 26 Liquid Glass/交互小组件：→ 不做（平台不符）。手写虚拟滚动：→ 不做（无场景证据前是过度工程，content-visibility 预埋已覆盖）。

### 采纳（16 项，登记 T-1486～T-1501，批次与验收见 TODO 第十一轮节）

| 批次 | 任务 | 一句话 | 主要来源（证据） |
| --- | --- | --- | --- |
| 一·新建 | T-1486 | 联动预接线模板+健康按项目绑定 | Streaks/Habitify/Exist（A） |
| 一·新建 | T-1487 | 名称智能默认推断 | Baymard+默认效应（A/B） |
| 一·新建 | T-1488 | 空状态一键装填+保存并继续 | Habitica+quick-add 惯例（A/C） |
| 一·新建 | T-1489 | 互补习惯动态推荐 | Awesome Habits 同型（A） |
| 二·事项 | T-1491 | 纪念日里程碑派生 | Anniversary Tracker/Memories（A） |
| 二·事项 | T-1492 | 时间多单位+周期进度 | 时间规划局/Memories+目标梯度（A/B） |
| 二·事项 | T-1493 | 「X 年前的今天」回顾 | 倒数日/倒数 Air（A） |
| 二·事项 | T-1494 | 循环实例覆盖+错过处理 | TickTick v8.2.12+Motion（A） |
| 二·事项 | T-1495 | 提醒降噪聚合 | 提醒疲劳研究（B） |
| 三·自动化 | T-1490 | 自动记录信任层（来源/原因/撤销） | Exist+GitHub 文档+信任研究（A/B） |
| 三·自动化 | T-1501 | 快捷指令配方文档 | Habitify/Streaks Shortcuts（B/C） |
| 三·自动化 | T-1500 | 笔记推导打卡查询模板 | obsidian-tracker/Logseq（A/B） |
| 四·优化 | T-1496 | NLP 快速录入解析 | Todoist 契约+Habitify MCP（A/B） |
| 四·优化 | T-1497 | 低压力批量补卡 | Table Habit+Habitify v48（A） |
| 四·优化 | T-1498 | 长任务门禁+content-visibility | web.dev+MDN（A/B） |
| 四·优化 | T-1499 | WCAG 2.2 目标尺寸与暗色触控核对 | W3C（A） |

### 第十一轮小结

四路并行约 25 次取证 → 竞品警报 0（Pinch 停滞、Workbench 无能力扩展延续第十轮；Habitify v40~48 的 MCP/NLP/批量操作是趋势确认而非直接威胁）。采纳 16、延后 9、不做 7。三个战略确认：①**「创建即自动接数据源」已成追踪类产品核心卖点**（Streaks/Habitify/Exist 三家），我方联动管道齐备但模板不携带数据源——T-1486 是本轮性价比最高项；②**被动追踪的生死线是「失败可解释」**——来源徽标+结算原因+一键撤销（T-1490）成本几乎只是 UI，且应成为全部自动结算的硬验收口径；③**事项页在事件定义层已达赛道平均以上，差距集中在时间表达、事件生命周期与回顾情感三层**，前四项（里程碑/多单位/进度/历史上的今天）均为低成本高感知的纯本地计算。本轮明确不做清单新增：AI 排程/AI 点子、系统日历导入、后台分类、万能 webhook、事项计数暂停。开发节奏按 D-256 拆批推进，登记不等于即时开工。

## 二十二、专项调研：源时记 siyuan-time-spent（2026-09-28，用户点名：调研吸收经验，列入待办先不开发）

对象：[famotime/siyuan-time-spent「源时记」](https://github.com/famotime/siyuan-time-spent)（2026-09 新上架，思源内自动时间量化与复盘插件）。证据等级 A（官方 README 直读）；未做源码审计。定位判断：**联动面大于竞争面**——源时记做「被动时间量化」，小驴做「主动行动打卡与习惯复盘」，数据互补；且其数据落盘形态（data/storage/petal/ 下 JSON，随思源同步）与叶归本地读取同构，天然是小驴来源框架（登记→接入→结算→身份→治理）的潜在下一租户。

### 官方能力清单（README 直读，证据 A）

1. **全自动无感追踪**：监听文档切换/激活自动累计各文档投入时长，无需开始/停止；监听键盘/鼠标/滚轮/触摸，闲置超阈值自动扣除「挂机水时长」，出「净专注时长」。
2. **专注目标设定**：日/周/月目标宣言（如「攻克第 4 章，专注 4 小时」）+ 智能场景推荐候选 + Hero 卡展示 + 作为 AI 复盘基线。
3. **日/周/月全景看板**：日视图 24h 纵向时间块（实时红线进度）+ 会话清单；周视图 7 日热力列可下钻；月视图日历热力矩阵 + 每日 top 文档标签 + 趋势。
4. **五大 KPI**：净专注时长、日均/峰值、会话次数与平均时长、闲置扣除时长、最高投入文档及占比；环形图文档分布 + 趋势图。
5. **看板↔文档双向直达**：任意时间块/清单项/热力标签点击打开对应文档。
6. **AI 深度复盘**：OpenAI 兼容 API 流式报告 + API 旋钮共享；另备**免 API 复制模式**——复制结构化数据与调优提示词到任意外部 AI。
7. **本地优先**：JSON 落 data/storage/petal/，随思源同步；监听节流。

### 对照小驴既有能力

| 源时记能力 | 小驴现状 | 判定 |
| --- | --- | --- |
| 被动文档专注追踪+闲置扣除 | 时长项目靠手动/专注计时；思阅/思播是第三方自动时长但限各自场景 | 有条件吸收（T-1540 观察项） |
| 内置计时闲置暂停（净时长口径） | 专注计时/番茄为墙钟口径，挂机不扣 | 直接吸收候选（T-1538 排队） |
| 免 API「复制提示词」AI 复盘 | 周复盘向导已确定性导出事实 Markdown；智能体默认只读、无模型不阻塞 | 直接吸收候选（T-1539 排队） |
| 周期目标宣言+Hero 目标卡 | 项目级量化目标已有；周复盘已有「下周一项调整」字段 | 不立项（与低压力口径有张力，自由文本目标已被周复盘覆盖） |
| 24h 时间轴/文档投入分布 | 热图/趋势/渲染块覆盖日历维度；无日内时间轴 | 观察（依赖被动追踪数据面，先有数据再谈呈现） |
| 看板↔文档双向直达 | 渲染块定位回顾、分母芯片跳记录、笔记锚点跳日记 | 不吸收（等价能力已有） |
| 内置流式 AI/API 旋钮 | 智能体走宿主公开 API、默认只读 | 不吸收（本地优先与智能体边界，第十一轮红线延续） |

### 登记待办（先不开发，见 TODO 对应条目）

- **T-1539 AI 复盘「复制提示词」免 API 模式**：周复盘向导新增一键复制——确定性纯函数把本地统计事实+用户草稿组装成结构化分析提示词，粘贴到任意外部 AI；零网络、零模型依赖、不写事件。低成本高感知，下一批开工时优先。
- **T-1538 内置专注计时闲置暂停与净时长口径**（条件批次，用户拍板）：专注/番茄计时监听输入闲置超阈值自动暂停累计，呈现区分「净时长/闲置扣除」；opt-in、阈值显式、呈现透明。前置：WebView 输入事件可用性真机验证 + 产品口径确认（番茄承诺制 vs 净时长的张力）。
- **T-1540 源时记数据源适配评估**（观察项，登记不开发）：若上游提供导出/API，按叶归本地读取模式接入为「文档专注时长」来源（需解决跨窗口会话归属，与 T-1508 同款边界，单采集窗口+失效接管设计前置）；不自建被动追踪（第十一轮「不做后台钩子」红线延续）。

### 结论

源时记与第二梯队结论一致：时间量化赛道在思源内的出现验证了「复盘资料库」方向的用户真实需求，且与小驴互为数据供需方而非对手。三条吸收候选全部不触碰红线：T-1539 是纯本地低压力增强，T-1538 把「闲置扣除」语义引入内置计时（口径待用户拍板），T-1540 优先走生态接入而非自建。本轮直接开发 0，登记 3（全部带触发条件）。

