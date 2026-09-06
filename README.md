# 小驴打卡

小驴打卡是一个面向思源笔记的极简打卡插件。它负责可靠地记录目标在某一天发生的行动，并把统计、历史和跨插件协作建立在同一套事件数据上。

## 当前能力

- 今日页：一键完成二值项目，或输入次数、时长、数量和自定义值。
- 项目设置：名称、图标、目标、单位，以及每天、工作日、每周指定日和自定义日频率。
- 历史页：用月历查看完成趋势，选择日期查看明细，并导出 JSON/CSV。
- 总结页：查看日、周、月完成情况；有总结适配器时可生成智能总结。
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
