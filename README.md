# 小驴打卡

小驴打卡是一个面向思源笔记的轻量打卡工作台。它负责可靠地记录目标在某一天发生的行动，并把统计、历史和跨插件协作建立在同一套事件数据上。

## 当前能力

- 今日页：一键完成二值项目，或输入次数、时长、数量和自定义值。
- 今日快捷记录：数量、时长、按数量和自定义项目可直接按推荐步长记录，精确输入按需展开；最近一条记录可撤销，误点数量项目图标不会补满目标。
- 今日筛选与空态：可按名称或分组快速筛选；首次使用、今天无安排和全部归档分别提供对应入口。
- 今日分组：按自定义分组、晨间/午后/晚间或重要性查看；未完成项优先展示，已完成项统一收进底部的“已完成打卡项”。
- 项目设置：名称、128 个内置图标、目标、单位、分组、重要性、时间段，以及每天、工作日、每周指定日和自定义日频率。
- 类型化目标：按次数、按时长、按数量和自定义值提供对应的目标步进、单位快捷选项和记录输入。
- 常用模板：新建项目时可直接选择阅读、喝水、运动、深度工作、冥想等 24 个预设，再按自己的计划调整。
- 编辑器体验：模板支持搜索和分组筛选，128 个图标支持关键词检索；安排、分组和频率等高级设置按需展开，长表单保存操作固定在底部。
- 原生页签：桌面端可从今日页入口或命令面板打开完整页签；侧栏、弹窗和页签共享实时数据与所有页面。
- 快速窗口：顶栏按钮和命令面板默认打开可重复开关的原生弹窗，快捷键为 `Alt+Shift+C`；弹窗内可完成今日打卡、历史、总结、洞察、归档和新建，页签继续作为大屏整理入口保留。
- 历史页：用月历查看完成趋势，选择日期查看明细，并导出 JSON/CSV。
- 历史明细：按时间查看当天的每条记录，支持单条撤销，误删时保留删除标记以避免旧客户端恢复。
- 总结页：查看日、周、月完成情况；有总结适配器时可生成智能总结。
- 习惯复盘：从今日项目进入只读复盘页，查看完成率、连续记录、84 天热力图和每周趋势。
- 手机端导航：窄屏下提供今日、历史、总结、归档和新建的底部导航，并适配安全区和触控尺寸。
- 归档与恢复：暂时隐藏不使用的项目，之后可以从历史页恢复。
- 本地持久化：数据以原子 `CheckinEvent` 保存，统计结果都可以追溯到原始记录；同一前端中的并行写入会串行保存，保持在线的多个窗口或客户端会在收到数据变更通知后重新加载并合并。

## 数据模型

打卡项描述“要做什么”，打卡事件描述“什么时候发生了什么”。事件包含 `itemId`、时间、数值、单位、来源、备注和外部引用。

```ts
interface CheckinEvent {
    id: string;
    itemId: string;
    occurredAt: string;
    localDate: string;
    value: number;
    unit: string;
    source: "manual" | "tomato" | "import" | "api";
    note?: string;
    externalRef?: string;
}
```

打卡项还包含 `group`、`priority`、`sortOrder` 和 `timeSlot`，用于组织今日清单；旧数据中的 `category`、`order` 和常见优先级写法会在读取时自动规范化。

`occurredAt` 保留精确时刻，`localDate` 固定打卡发生地的日历日期；打卡项也保存稳定的 `createdDate`。因此之后切换设备时区不会让历史记录跨天移动，也不会把创建前的日期算进完成率。这种模型可以统一表达一次阅读、三次喝水、二十五分钟运动或五百毫升饮水，也能承接外部番茄钟、任务和自动数据源。

存储使用可合并的第 2 版结构：事件按 ID 汇合，相同外部引用会确定性去重，撤销操作会留下删除标记，避免离线或较旧客户端把记录重新带回；打卡项发生并发修改时，以较新的 `updatedAt` 为准。插件通过思源 3.4.2 起提供的数据变更回调自动重新加载并收敛状态。

当前思源插件存储接口没有服务端的条件写入或事务。两个彼此独立的客户端如果从同一个旧状态同时保存，并且被覆盖的一方在收到后续数据变更通知前立即退出，仍可能丢失其中一次写入；彻底消除这个窗口需要存储端提供 CAS 或事务能力。

## 跨插件 API

插件加载后提供 `window.siyuanCheckin`，当前 API 版本为 `1`：

```js
const checkin = window.siyuanCheckin;
await checkin.whenReady();
checkin.getItems();
checkin.getEvents();
checkin.getSummaryContext("week");
await checkin.recordEvent({
    itemId: "item-id",
    value: 25,
    unit: "分钟",
    source: "tomato",
    externalRef: "tomato-session-id",
});
```

可用能力包括：

- `isReady()` 和 `whenReady()`，供其他插件等待本地数据完成加载；
- `getStore()`、`getItems()`、`getArchivedItems()`、`getEvents()`；
- `recordEvent()`，数值必须是有限且不小于零的数字；
- 带有相同 `itemId`、`source` 和 `externalRef` 的外部记录会自动去重；
- `setItemArchived(itemId, archived)`；
- `getSummaryContext("day" | "week" | "month")`；
- `exportJson()`、`exportCsv()`；
- `startFocus(itemId)`、`stopFocus()` 和 `registerFocusAdapter(adapter)`；
- `registerSummaryProvider(provider)`，总结输入同时包含过滤后的事件和聚合上下文；
- `subscribe(listener)`，监听 `checkin:item-created`、`checkin:item-updated`、`checkin:event-recorded` 和 `checkin:event-deleted`。删除事件会通过 `deletedEvents` 提供具体记录。

适配器不存在时，核心打卡仍可完全离线手动使用。插件不读取其他插件的私有存储。

## 开发与构建

在仓库根目录执行：

```bash
corepack pnpm install
corepack pnpm run check
corepack pnpm run test
corepack pnpm run build
```

生产文件写入 `dist/`，安装包为根目录的 `package.zip`。这些生成文件已加入 Git 忽略规则。

## 设计边界

小驴打卡不内置完整番茄钟、任务管理器、社交、排行榜或强制积分系统。番茄钟、任务视图、日历和智能体都是可插拔的外部能力；小驴打卡只维护自己的记录事实和稳定的数据协议。
