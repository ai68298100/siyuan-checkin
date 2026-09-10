<div align="center">

<img src="icon.png" width="96" alt="小驴打卡图标" />

# 小驴打卡

**思源笔记 · 打卡与习惯工作台**

记录每一次行动，统计、复盘和跨插件协作都建立在同一套事件数据之上。

</div>

---

小驴打卡负责可靠地记录目标在某一天发生的行动：一键打卡、按次数、按时长、按数量或自定义值，配合月历历史、完成率统计、连续记录和本地行动建议。没有 AI、不联网、不依赖其他插件时，全部核心功能照常可用。

## 安装

- **思源集市**：在集市搜索“小驴打卡”一键安装。
- **手动安装**：从 [Releases](https://github.com/ai68298100/siyuan-checkin/releases) 下载 `package.zip`，在思源“设置 → 集市 → 下载安装包”中选择安装。
- 需要**思源 v3.4.2** 及以上版本；桌面端和移动端均已适配。

打开方式：顶栏按钮、命令面板、手机端入口，或快捷键 <kbd>Alt+Shift+C</kbd> 呼出快速弹窗；桌面端还可以把今日页固定为原生页签。

## 七个界面，各司其职

| 界面 | 适合做什么 |
| --- | --- |
| **今日** | 当天安排、分组筛选、快速记录与撤销，进度一目了然 |
| **历史** | 月历看趋势，按日查明细，导出 JSON / CSV |
| **总结** | 日 / 周 / 月完成率、连续记录与项目汇总，可自定义日期范围 |
| **复盘** | 单个项目的完成率、84 天热力图和每周趋势 |
| **日期事项** | 生日、纪念日、定时事项与提前提醒 |
| **归档** | 暂时隐藏不用的项目，随时搜索恢复 |
| **设置** | 界面密度、主题（跟随思源/浅色/深色）、减少动效与显示偏好重置 |

桌面端以双栏工作台呈现，移动端为单列 + 底部导航，均适配安全区与触控尺寸。

## 记录类型与频率

- **完成一次**：阅读、冥想、服药等二值事项。
- **按次数**：俯卧撑、喝水等重复动作，推荐步长快速 +1，精确输入按需展开。
- **按时长**：运动、专注、学习等时间目标，支持分钟 / 小时换算。
- **按数量 / 自定义**：公里数、毫升数、页数等带单位数值。

频率支持每天、工作日、每周指定日、自定义星期、间隔天数和周期配额；未完成项优先展示，已完成项收入今日页底部。新建时可从 24 个内置模板（阅读、喝水、运动、深度工作、冥想等）出发，也可以把常用配置保存为“我的模板”。

## 特色

- **自定义图标**：内置 9 组 100+ 图标，支持关键词检索；可以上传图片、把 HTTPS 图片下载到插件本地数据、逐行或 JSON 导入图标库，并提供 [阿里 Iconfont](https://www.iconfont.cn/) 入口。保存前会提示预计占用的存储空间。
- **本地行动建议**：根据完成率、连续记录、趋势和当天进度生成带依据的建议，无需配置 AI。
- **番茄钟预留**：项目可声明“按累计分钟 / 番茄钟次数计入”，兼容的番茄钟插件通过开放 API 写入记录即可联动。
- **思源智能体**：在支持的思源版本上自动注册只读查询与受控写入能力，可以直接问“总结我本周的打卡情况”，或在确认后让智能体代记一次打卡。
- **原生页签与弹窗**：桌面端页签适合大屏整理，弹窗适合快速操作，两侧共享实时数据。

## 数据模型与可靠性

打卡项描述“要做什么”，打卡事件描述“什么时候发生了什么”：

```ts
interface CheckinEvent {
    id: string;
    itemId: string;
    occurredAt: string;   // 精确时刻
    localDate: string;    // 打卡发生地的日历日期，切换时区不漂移
    value: number;
    unit: string;
    source: "manual" | "tomato" | "import" | "api";
    note?: string;
    externalRef?: string; // 外部引用，相同引用确定性去重
}
```

- 统计结果全部可以追溯到原始记录；撤销会留下删除标记，离线或旧客户端不会把已撤销的记录带回来。
- 存储采用可合并的第 2 版结构：事件按 ID 汇合，打卡项并发修改以较新的 `updatedAt` 为准，并通过思源的数据变更回调自动重新加载。
- 多窗口 / 多客户端写入会串行持久化；插件不读取其他插件的私有存储。

## 跨插件 API

插件加载后提供 `window.siyuanCheckin`（当前 API 版本 `4`），支持能力协商：

```js
const checkin = window.siyuanCheckin;
await checkin.whenReady();
checkin.hasCapability("events.record");   // 调用前检查能力
await checkin.recordEvent({
    itemId: "item-id",
    value: 25,
    unit: "分钟",
    source: "tomato",
    externalRef: "tomato-session-id",
});
```

常用接口：`getItems()` / `getEvents()` / `setItemArchived()` / `getSummaryContext()` / `summarizeCustom()` / `exportJson()` / `exportCsv()` / `startFocus()` / `registerFocusAdapter()` / `registerSummaryProvider()` / `subscribe()`。完整约定见 [生态集成文档](docs/ecosystem-integration.md)。

## 开发与构建

```bash
corepack pnpm install
corepack pnpm run check     # TypeScript 类型检查
corepack pnpm test          # 全量测试
corepack pnpm run test:ui   # UI 结构与文档一致性检查
corepack pnpm run build     # 生产构建，产物在 dist/，安装包为 package.zip
```

视觉验收可用 `node tests/visual-qa.cjs`（需设置 `CHECKIN_BROWSER` 指向本机 Chromium/Edge），深色验证加 `CHECKIN_QA_THEME=dark`。

## 设计边界

小驴打卡不内置完整番茄钟、任务管理器、社交、排行榜或强制积分系统。番茄钟、任务视图、日历和智能体都是可插拔的外部能力；小驴打卡只维护自己的记录事实和稳定的数据协议。

## 文档索引

- [4.0 UI 变更记录](docs/v4.0-ui-change-log.md) · [UI 产品路线](docs/ui-product-roadmap.md)
- [生态集成与 API](docs/ecosystem-integration.md) · [AI 集成计划](docs/ai-integration-plan.md)
- [2.0 迁移说明](docs/v2.0-migration-notes.md) · [2.0 变更记录](docs/v2.0-change-log.md) · [UI 重构范围](docs/ui-redesign-roadmap.md)
- [发布与回滚](docs/release-rollback.md)

## License

[MIT](LICENSE)
