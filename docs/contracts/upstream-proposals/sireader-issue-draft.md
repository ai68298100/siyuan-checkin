# 思阅 issue 成稿（待授权后原样提交至 mm-o/siyuan-sireader）

<!-- 提交方式：GitHub New issue；以下「标题」填入 Title，「正文」填入 Body。
     本文件是小驴打卡仓库内的待发成稿（T-1438），未获用户授权不得提交。 -->

## 标题

提案：公开「阅读生命周期集成 API」v1 草案——让打卡类插件按统一口径消费有效阅读时长

## 正文

你好！我是思源打卡插件「小驴打卡」（siyuan-checkin）的作者。小驴已经在通过思阅实现「有效阅读分钟 → 每日打卡」的联动，本帖想正式提议把这个集成面**版本化、契约化**，方便双方长期稳定协作。

### 现状（以 v2.2.8 源码为准，commit `73c003d`）

- 思阅内部派发 `window` 级 CustomEvent：`reader:open / reader:focus / reader:blur / reader:close`；小驴监听这四个事件，按「阅读器持有文档焦点」的墙上时间累计，跨午夜按本地日切分，达标后为绑定项目幂等记一次打卡。
- 两个痛点：① 事件没有版本化承诺与 payload 文档，思阅重构时联动会静默断链；② 小驴侧拿不到思阅自己的有效时长口径，无法做诊断核对。

### 提案的最小 API 面（v1 草案）

```ts
// 1) 能力发现（只读）
window.sireader.integration = {
    protocol: "sireader-integration",
    version: 1,                                    // 破坏性变更升 major
    capabilities: ["lifecycle.events", "session.query"],
};

// 2) 冻结现有 4 个生命周期事件的 payload（事件名不变）
//    detail: { at: number }   // epoch 毫秒
//    语义：open=进入阅读器；focus/blur=文档焦点变化；close=离开
//    （窗口隐藏/切页签归入 blur；移动端关闭归入 close）

// 3) 可选能力：结算查询（供消费方诊断比对，不做双写来源）
sireader.getSessionFocus({localDate}: {localDate: string}): {focusMs: number};
```

### 建议冻结的「有效时长」口径

- 有效时长 = 阅读器持有文档焦点 **且** 宿主窗口可见的墙上时间；
- blur / 切页签 / 窗口隐藏 / 移动端关闭时结算当前片段，回到阅读器开始新片段；
- 跨日按本地日历日切分；多实例、多窗口各自独立结算。

### 小驴侧的消费承诺

- 写入身份：`source: "sireader"`，`externalRef: sireader:<itemId>:<localDate>`，每日一次幂等写入；用户删除（墓碑）后当日永不重写；
- 联动保持 **opt-in 默认关**；上游契约发布并通过真实宿主验收后，canonical source 才切换为上游口径，小驴本地计时降级为诊断比对——两路**永不双重累计**；
- 隐私边界：不要求暴露 `reader_stats` / `daily.json` / 内部数据库；书名、URL 不进打卡事件。

### 验收建议

双方各留契约测试；桌面页签 / dock / 独立窗口 / Android；两插件同时重载、跨日与时区用例。

---

如果方向可行，命名、字段、事件名都可以按思阅的习惯调整，小驴侧跟进适配；需要的话我也愿意以 PR 形式协助补充契约文档与测试。完整草案（机器可读 JSON + 消费方实现说明）可以在此贴的后续评论中补充。谢谢！
