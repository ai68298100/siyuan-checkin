# 思源兼容矩阵

| 思源版本 | 桌面端 | 移动端 | 关键检查 |
| --- | --- | --- | --- |
| 3.8.4 | **声明最低版本**(`plugin.json.minAppVersion`) | 同左 | 实测通过基线即声明下限;低于该版本时内核判定不兼容并自动禁用已装插件(T-1271/D-238) |
| 3.8.3 | 未承诺 | 未承诺 | 未完成完整真实客户端回归 |
| 3.8.x 后续版本 | 持续验证 | 持续验证 | 发布前运行完整测试和生产构建 |

`minAppVersion` 必须写成三段式合法语义化版本，否则内核的 `semver` 比较形同虚设；内核不满足阈值时会把已装插件置为禁用，而不是提示降级运行。

## 公开接口与内部 DOM 的边界

公开接口面：`Plugin` 生命周期（`onload`/`onLayoutReady`/`onDataChanged`/`onunload`）、`Dialog`、`addDock`、`addTab`、`addCommand`、`addTopBar`、`saveData`/`loadData`、`showMessage`、`getFrontend`、`eventBus`。业务数据只保存在插件自己的 `data/storage/petal/siyuan-checkin/` 下，不写思源的 `.sy` 结构（渲染块配置块除外）。

锚点编辑器的「新建文档」只使用思源 API 文档列出的 `POST /api/notebook/lsNotebooks` 与 `POST /api/filetree/createDocWithMd`；锚点选择仍只投影插件已经保存的绑定。日记设置页在用户输入搜索词时，可选调用思源 v3.8.4 已有的 `POST /api/filetree/searchDocs` 路由；这属于宿主路由兼容增强，不改变插件公开 API，也不作为低于 3.8.4 的承诺。

日记搜索的兼容边界固定为：请求 `{k, flashcard: false, excludeIDs: []}`，v3.8.4 成功响应的 `data` 数组只投影其中的 `id`、`hPath`、`content`，界面最多显示前 50 条；实现同时容忍旧宿主把数组包在 `data.blocks` 中。该路由受思源内核认证保护，插件经宿主的 `kernelPost` 通道调用。响应失败、请求异常或宿主没有该路由时保留手填文档 ID，并提示 `msg.diarySearchFailed`。新建文档仍按 `lsNotebooks → 选择 closed=false → createDocWithMd` 的公开 API 链路执行。v3.8.4 的路由注册见 [router.go](https://github.com/siyuan-note/siyuan/blob/v3.8.4/kernel/api/router.go)，文件树实现见 [file.go](https://github.com/siyuan-note/siyuan/blob/v3.8.4/kernel/model/file.go)；这两份源码证据用于兼容性登记，不能替代真实思源桌面端、移动端和只读/发布服务验收。未把 `/api/search/fullTextSearchBlock` 或 SQL 路由当作跨版本公共依赖。

以下三处确实依赖思源内部 DOM，改动宿主结构时只会降级为「不显示」，不会损坏数据，但必须如实登记：

- 渲染块的代码块识别：`src/render/block-renderer.ts` 的 `isCheckinCodeBlock` 依次尝试 `data-subtype`、`.language-checkin` 类、`.protyle-action__language` 标签文本。
- 渲染块的配置文本读取：依次尝试 `.hljs [contenteditable='true']`、`.hljs`、`pre`、`code`，取第一个非空结果。
- 移动端顶栏入口：`src/render/quick-dialog.ts` 向 `#mobileTopBar`/`#toolbar` 注入按钮，取不到容器时按 800ms 有限重试后放弃。

插件 API 通过 `window.siyuanCheckin` 暴露，不依赖思源内部接口；该对象只在同一个页面文档内可见，独立桌面窗口、移动端和第二个浏览器标签各自持有一份插件实例。

## 生命周期约束

- 思源把同一插件实例的 `onload`、`onLayoutReady`、`onDataChanged`、`onunload`、`uninstall` 放进同一份拆除预算（当前为 5 秒），超时强制销毁。`src/teardown.ts` 自计 3.6 秒排空写队列、900 毫秒补写主存储，排不进去时提示用户重新打开面板确认。
- 思源不会代插件清理 `setInterval`/`setTimeout`/`window` 监听，卸载路径必须自己收尾；专注计时的心跳与庆祝延时在 `onunload` 入口即停。
- 专注进行中收到卸载：先按正常路径把已投入分钟数入账，再关闭操作入口，避免整段专注丢失。
- 每个插件持有私有 `eventBus`，`eventBus.emit()` 不会广播给其它插件；合法事件名以思源 `app/src/types/index.d.ts` 的 `TEventBus` 为准，渲染块只监听 `loaded-protyle-static` 与 `loaded-protyle-dynamic`。
- 只读模式和发布服务下 `saveData`/`removeData` 直接以 403 失败；连远端内核（`?remote=1`）时插件整体不加载，此时 `window.siyuanCheckin` 恒不存在，接入方必须按「未安装」降级。

## 智能体能力

在支持 `addAgentCapability` 的思源版本（3.8.0 起）注册 11 项能力：只读 7 项 `checkin-action-suggestions`、`checkin-summary-context`、`checkin-list-items`、`checkin-item-insights`、`checkin-list-occasions`、`checkin-list-upcoming`、`checkin-weekly-report`；声明本地写入的 4 项 `checkin-record-event`、`checkin-complete-occasion`、`checkin-create-item`、`checkin-create-occasion`。只读项仅声明 `localRead`，写入项额外声明 `localWrite`，由思源智能体据此执行权限确认；能力输出为结构化 JSON。插件沿用思源已配置的模型与密钥，不直接调用未公开的 `/api/ai/agent/chat` 端点。较旧版本没有该方法时，核心打卡、公开 API 与第三方总结适配器保持可用。

注册与存储读取解耦：即使数据读取失败，能力入口仍会注册（读能力自行返回「数据尚未准备好」，写能力由 `canRecord()` 拦截），设置页分别显示「宿主不支持 / 正在初始化 / 注册中断（附原因）/ 已注册 N 项能力」四种状态，不再统一显示「未检测到」。

宿主侧核对方法（真实登记，而不是插件自述）：在思源的开发者工具控制台执行

```js
const p = window.siyuan.ws.app.plugins.find(x => x.name === "siyuan-checkin");
[typeof p?.addAgentCapability, p?.agentCapabilities?.length, p?.agentCapabilities?.map(c => c.id)];
```

- 第二项为 `11` 即宿主已登记；能力 id 形如 `plugin/frontend/siyuan-checkin/checkin-summary-context`。
- 若已登记但智能体不调用，去 设置 - 人工智能 - 能力 面板核对策略：分组为「前端 · 插件 · 小驴打卡」，被拒绝（deny）的能力对模型不可见；默认策略为允许。
- 注册发生在插件 `onLayoutReady` 末尾：改完插件需重载界面或重新启用插件才会重新登记；智能体对话进行中请新开会话，避免沿用上一轮不可变的能力快照。

智能体行动建议 `checkin-action-suggestions` 仅返回只读建议与结构化 `changes`，所有变更均标记为需要用户确认；建议状态可追踪，插件不会静默修改项目或记录。

## 公开 API 版本

`window.siyuanCheckin.version` 当前为 **5**。版本 2 新增 `getCustomSummaryContext`，版本 3 新增 `summarizeCustom`，版本 4 新增日期事项读取与处理接口（`getOccasions`、`getTodayOccasions`、`completeOccasion`），版本 5 增加范围事件读取、幂等批量写入、统一项目投影和指标门面；调用方应先检查版本，再使用这些能力。建议工作流接口不提供任何写入或令牌创建入口，v4 能力继续兼容。

## 发布前检查

- 桌面端验证侧边栏、页签和快速弹窗三种入口。
- 移动端验证软键盘、旋转、安全区、触控按钮和窄宽度卡片。
- 双窗口验证一次打卡后另一窗口的 `onDataChanged` 合并结果，以及窗口关闭时末次打卡是否落盘。
- 在真实宿主里核对智能体登记：`tests/e2e/agent-capabilities.spec.mjs` 断言宿主侧 `agentCapabilities` 恰为 11 项、id 前缀正确、4 项写入型，且能力策略未拒绝。
- 验证 `package.zip` 内包含 `plugin.json`、`index.js`、`index.css`、图标、预览、README 和 LICENSE。
- 验证 `plugin.json.version` 与 `package.json.version` 一致，并与 Release tag 一致。
- 确认 `plugin.json.name` 与解压目录名一致，否则思源会整包静默不加载。
