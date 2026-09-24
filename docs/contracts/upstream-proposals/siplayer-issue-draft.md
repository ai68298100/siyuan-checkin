# 思播 issue 成稿（待授权后原样提交至 mm-o/siyuan-media-player）

<!-- 提交方式：GitHub New issue；以下「标题」填入 Title，「正文」填入 Body。
     本文件是小驴打卡仓库内的待发成稿（T-1438），未获用户授权不得提交。 -->

## 标题

提案：公开「播放状态事件 + 有效观看时长」集成 API v1 草案——供打卡类插件统一口径消费

## 正文

你好！我是思源打卡插件「小驴打卡」（siyuan-checkin）的作者。小驴正在通过思媒播放器实现「有效观看分钟 → 每日打卡」联动，本帖提议把这个集成面**版本化、契约化**，让双方协作长期稳定。

### 现状（以 v2.0.4 发布包为准，commit `8bd4997`）

- 播放器 controller（`window.siyuanMediaPlayer.controller`）公开了 `getCurrentMedia / getCurrentTime / getDuration / isPlaying`；小驴以**有界采样轮询**这些字段近似「正在播放的墙上时间」，达标后为绑定项目幂等记一次打卡。
- 三个痛点：① controller 无版本化稳定性承诺，字段升级可能静默断链；② 更新日志 v0.6.9 提到「第三方集成 API」，但当前包未随附事件或文档；③ 采样拿不到媒体身份，也无法与官方口径核对。

### 提案的最小 API 面（v1 草案）

```ts
// 1) 能力发现（只读）
window.siyuanMediaPlayer.integration = {
    protocol: "siplayer-integration",
    version: 1,
    capabilities: ["playback.events", "playback.query"],
};

// 2) 播放状态事件（window CustomEvent，冻结 payload）
//    siplayer:play | siplayer:pause | siplayer:ended | siplayer:progress
//    detail: { mediaId: string; at: number; isPlaying: boolean }
//    mediaId 取公开稳定身份：ref / refKey / source / sourcePath 或稳定 URL；
//    不建议用 DOM 标题、私有数据库路径、历史列表内部结构做身份。

// 3) 可选能力：有效观看时长查询（由思播按同一口径自行计算）
siplayer.getEffectivePlayback({localDate}: {localDate: string}): {playingMs: number};
```

### 「有效时长」口径红线（建议冻结）

- 有效时长 = 播放器处于播放状态 **且** 宿主窗口可观察期间的墙上时间；暂停、结束、切媒体、窗口隐藏不计入；
- **禁止把 `currentTime` 差值直接当观看时长**——seek、循环、变速、切集都会失真；「内容秒数」口径将来单独版本化，不与有效时长混用；
- 跨日按本地日历日切分；多实例独立结算。

### 小驴侧的消费承诺

- 写入身份：`source: "siplayer"`，`externalRef: siplayer:<itemId>:<localDate>`，每日一次幂等写入；用户删除后当日永不重写；
- 联动保持 **opt-in 默认关**；上游契约发布并通过真实宿主验收后，canonical source 才切上游口径，本地采样降级为诊断比对——两路永不双重累计；
- 隐私边界：不要求暴露 ArtPlayer 私有对象或内部存储；媒体标题/路径不进打卡事件。

### 验收建议

双方契约测试；桌面 / 独立窗口 / Android；暂停、seek、循环、变速、切集、跨日矩阵。

---

如果方向可行，事件名、字段、能力命名都可以按思播的习惯调整；需要的话我愿意以 PR 形式协助补契约文档与消费端测试。谢谢！
