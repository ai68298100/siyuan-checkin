# 合作插件公开 API 协同提案（T-1395 草案）

更新时间：2026-09-23
状态：**全部草案（draft）**。本文只在本仓库准备，未创建、未提交任何外部 issue/PR；未经用户明确授权不得向外部仓库提交。机器可读草案夹具见 `docs/contracts/upstream-proposals/*.json`（`status: "draft"`）。

## 〇、双轨纪律（D-255，适用于全部三份提案）

1. **草案不是契约**：夹具中的 API 名称、事件名、字段在对方正式发布前随时可能调整；本地代码不得引用草案名称作为稳定依赖。
2. **三重门槛**：上游 API「合并 → 发布 → 真实思源宿主验收」全部满足前，本地 fallback 只能保持 opt-in 实验/仅观察路径，不得升级为默认自动写入。
3. **唯一 canonical source**：上游契约与本地的 fallback 并存时必须指定唯一写入方；同一阅读/播放/任务指标只能写入一次，另一方最多做诊断比对，以 `source + externalRef` 幂等，禁止两路数据相加造成重复完成。
4. **不臆造**：不臆造对方仓库、接口名称或合并状态；无维护者入口时只保留本地草案与测试夹具。
5. **隐私红线**（三份共同）：不读取对方私有统计文件/内部数据库/DOM 私有对象；书名、URL、媒体路径等不进入打卡事件正文，只允许有界匿名身份。

## 一、思阅（SiReader）：公开阅读生命周期与结算 API

### 现状与缺口盘点（证据：v2.2.8 源码 `73c003d`）

| 能力 | 现状 | 缺口 |
| --- | --- | --- |
| 生命周期事件 | 内部派发 `reader:open/focus/blur/close`（`useStats.ts` 消费） | 无版本化契约、无 payload 文档、无能力发现 |
| 统计读取 | 仅插件内部 `reader_stats` 存储（60 秒落盘） | `window.sireader` 只有挂载/打开/页面脚本 API，无 stats getter |
| 累计口径 | 插件自有「本次/今日/累计」展示 | 未公开冻结「有效时长」定义（焦点 + 可见） |

### 提案 API 面（v1 草案）

```ts
// 1) 能力发现：window.sireader 增加只读集成描述
interface SireaderIntegration {
    protocol: "sireader-integration";
    version: 1;                                  // 破坏性变更升 major
    capabilities: ["lifecycle.events", "session.query"];
}

// 2) 生命周期事件：沿用现有 4 个事件名，冻结 CustomEvent payload
// detail: { at: number }            — 事件发生的 epoch 毫秒（重放/测试可注入）
// 事件语义：open=进入阅读器，focus/blur=文档焦点变化，close=离开
// （窗口隐藏/切页签归入 blur；移动端关闭归入 close）

// 3) 结算查询（可选能力）：供消费方做诊断比对，不是双写来源
sireader.getSessionFocus({localDate}: {localDate: string}): {focusMs: number};
```

### 冻结的时序口径

- **有效时长 = 阅读器持有文档焦点且宿主窗口可见的墙上时间**；不等同翻页数，也不得用思阅私有累计值替代。
- blur、切页签、窗口隐藏、移动端关闭时结算当前片段；回到阅读器开始新片段。
- 跨日按本地日历日切分（午夜边界把片段拆进两日）。
- 同一窗口多个阅读器实例各自独立结算；多窗口不共享会话。

### 消费方（本插件）承诺

- 写入身份：`source: "sireader"`，`externalRef: sireader:<itemId>:<localDate>`（已登记于 `EXTERNAL_REF_PREFIX_REGISTRY`）。
- 每日一次幂等写入：达到阈值当日只写一条；用户删除（墓碑）后当日永不重写。
- 上游契约发布前，本插件 `SireaderFocusTracker`（监听同一 4 个事件）保持 **opt-in 默认关** 的实验 fallback；上游发布并通过真实宿主验收后，canonical source 切换为上游契约，fallback 降级为诊断比对，两路永不双重累计。

### 验收与 issue 要点

- 双方 contract test（以夹具为准）、桌面页签/dock、独立窗口、Android、两插件同时重载、跨日与时区矩阵。
- issue 只要求上述最小面（能力发现 + 4 事件 payload 冻结 + 可选查询），**不要求暴露 `reader_stats`/`daily.json` 或内部数据库**。

## 二、思播（SiPlayer）：公开播放状态事件与有效时长能力

### 现状与缺口盘点（证据：v2.0.4 发布包 `8bd4997`；更新日志 v0.6.9 声明）

| 能力 | 现状 | 缺口 |
| --- | --- | --- |
| 播放状态查询 | `window.siyuanMediaPlayer.controller` 有 `getCurrentMedia/getCurrentTime/getDuration/isPlaying` | controller 未承诺版本化稳定，字段无契约文档 |
| 状态事件 | 内部消费 `play/pause/ended/timeupdate` | 无对外事件清单；v0.6.9「第三方集成 API」声明未随当前包兑现 |
| 累计口径 | 无 | 无有效观看时长定义；`currentTime` 差值会把 seek/循环/变速误当观看时长 |

### 提案 API 面（v1 草案）

```ts
// 1) 能力发现
interface SiplayerIntegration {
    protocol: "siplayer-integration";
    version: 1;
    capabilities: ["playback.events", "playback.query"];
}

// 2) 播放状态事件（window CustomEvent，冻结 payload）
// siplayer:play | siplayer:pause | siplayer:ended | siplayer:progress
// detail: { mediaId: string; at: number; isPlaying: boolean }
// mediaId 优先取公开的 ref/refKey/source/sourcePath 或稳定 URL；
// 禁止 DOM 标题、私有数据库路径、历史列表内部结构作为身份。

// 3) 有效时长查询（可选能力，由思播按同一口径自行计算）
siplayer.getEffectivePlayback({localDate}: {localDate: string}): {playingMs: number};
```

### 冻结的时序口径（红线）

- **有效时长 = 播放器处于播放状态且宿主窗口可观察期间的墙上时间**；暂停、结束、切换媒体、窗口隐藏不计入。
- **禁止把 `currentTime` 差值直接当观看时长**（seek、循环、变速、切集都会失真）；「内容秒数」口径将来必须单独版本化，不与有效时长混用。
- 跨日按本地日历日切分；多实例/多窗口独立结算。

### 消费方（本插件）承诺

- 写入身份：`source: "siplayer"`，`externalRef: siplayer:<itemId>:<localDate>`（已登记）。
- 现阶段 `SiplayerPlaybackTracker`（有界采样 controller 轮询）保持 **opt-in 默认关**；上游事件契约发布前不升级，上游发布并通过真实宿主验收后切换 canonical source，禁止双计。

### 验收与 issue 要点

- 双方 contract test；桌面/独立窗口/Android；暂停、seek、循环、变速、切集、跨日矩阵。
- issue 只要求最小面：能力发现 + 4 个状态事件 + 可选有效时长查询；**不要求暴露 ArtPlayer 私有对象或内部存储**。

## 三、Task Horizon：日历投影消费端图层（方向相反的提案）

前两份是「请对方暴露」；这份是「我方 API 已稳定，请对方消费」——小驴侧 `calendar.read`（since 5）与 `getCalendarProjection` 已随 API v5 发布（366 天/200 项目上限、`truncated` 显式、六态 `complete/pending/logged/skipped/at-most-safe/at-most-breach`、隐藏与归档项目服务端过滤），缺口在 Task Horizon 侧没有消费图层。

### 提案消费层行为（v1 草案，对齐其 dockTomato 接入惯例）

1. **探测与协商**：`window.siyuanCheckin.protocol === "siyuan-checkin"`、`version >= 5`、`capabilities` 含 `calendar.read`，才启用打卡图层。
2. **读取**：`getCalendarProjection({startDate, endDateExclusive}, {signal})` 风格——能力检测、超时、AbortSignal 取消、单飞（并发请求合并），与 `__dockTomato.stats.queryFocus` 同款纪律。
3. **刷新**：只订阅 `checkin:event-recorded`、`checkin:analytics-updated`、`checkin:item-archived`、`checkin:item-updated` 四个事件触发重查；其余事件（含 `item-created/item-deleted`）不触发日历重查。
4. **降级**：插件缺失、未加载、能力不足、超时或错误 → 隐藏打卡图层（与番茄专注模块同款策略），服务恢复自动刷新；错误可诊断（控制台/诊断信息），不静默。
5. **旧版兼容**：仅协商到 v4 的旧消费方不得假装支持项目级隐藏——保留 legacy 聚合图层或整体隐藏细粒度图层，不能让用户已关闭「Task Horizon 日历显示」的项目因旧缓存继续出现。
6. **只读边界**：投影为纯数据快照（无备注/附件/externalRef），只用于日历展示；不得从投影反向写回任务状态，任务完成回写仍走 L2 `recordEvent` 契约（`taskhorizon:<blockId>:<localDate>`），与显示开关解耦。

### 验收要点

- 双方 contract fixture（本仓夹具 + 对方消费端测试）；桌面页签/dock、独立窗口、Android；开关切换即时消失/恢复；隐藏项目不出现在任何旧消费路径；Task Horizon 缺失/重载/升级期间小驴侧零影响。

## 四、最小消费示例（我方视角，供对方评审参考）

```ts
/* 消费 calendar.read 的参考实现骨架：协商 → 单飞读取 → 事件刷新 → 降级。 */
async function loadCalendarLayer(signal?: AbortSignal) {
    const api = globalThis.window?.siyuanCheckin;
    if (api?.protocol !== "siyuan-checkin" || api.version < 5
        || !api.capabilities?.includes("calendar.read")) return null;   // 降级：隐藏图层
    const end = new Date(); end.setDate(end.getDate() + 1);
    const start = new Date(); start.setDate(start.getDate() - 29);      // 30 天窗口
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const projection = api.getCalendarProjection(
        {startDate: iso(start), endDateExclusive: iso(end)});
    return projection.truncated ? {…projection, note: "truncated"} : projection;  // 有界消费
}
// 刷新：仅 checkin:event-recorded / analytics-updated / item-archived / item-updated 触发重查；
// 并发重查合并（单飞），查询携带 AbortSignal，插件不可用即隐藏图层。
```

## 五、交付物与下一步

| 交付物 | 状态 |
| --- | --- |
| `docs/contracts/upstream-proposals/sireader-lifecycle-api-v1.json` | 本轮完成（draft） |
| `docs/contracts/upstream-proposals/siplayer-playback-api-v1.json` | 本轮完成（draft） |
| `docs/contracts/upstream-proposals/taskhorizon-calendar-consumer-v1.json` | 本轮完成（draft） |
| 提案正文（本文档） | 本轮完成 |
| 守门测试 `tests/upstream-proposals.test.cjs`（夹具↔文档↔代码三方同步） | 本轮完成 |
| 外部 issue/PR 提交 | **等待用户授权**，且每次提交前向用户确认目标仓库与内容 |
| 上游合并后的切换 | 合并 → 发布 → 真实宿主验收三关全过后，按双轨纪律切换 canonical source |

维护入口现状：思阅/思播均为开源仓库（`mm-o/siyuan-sireader`、`mm-o/siyuan-media-player`，有 issue 入口）；Task Horizon 维护入口以其既有跨插件协同渠道为准。所有对外动作均需用户逐步授权。
