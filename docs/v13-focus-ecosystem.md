# 13.0 专注生态实施计划

## 目标

建立可发现、可诊断、可降级、可验证的外部专注提供方机制。首个提供方仅为底栏番茄钟；在第二个真实插件及稳定契约出现前，不增加空选项。

## 第一批：提供方诊断与恢复（已完成）

- 将提供方状态收敛为 missing、incompatible-version、incomplete-api、missing-capabilities、not-ready、ready、running、paused、error 九种。
- 对外部版本、capabilities、方法形状和 `getStatus()` 异常做防守式检查。
- capabilities 只接收字符串并限制为 32 项，避免异常外部数据进入设置页。
- 只有 ready/running/paused 状态才注册适配器；缺失或不兼容状态不伪装为“已连接”。
- 设置页显示明确状态、接口版本、安装建议和无障碍 status 语义。
- 用户选择 Dock Tomato 但当前不可用时，提供显式“改用自带番茄钟”恢复动作；不静默改偏好。
- Today 点击小钟表时按实际原因提示缺失、版本不兼容、接口不完整、能力不足、恢复中、运行中、暂停中或读取失败。
- 将 NOT_READY、TIMER_BUSY、INVALID_CONTEXT 转为可读提示；未知错误限制为 240 字符并防御异常 getter/toString。
- started、paused、availability 生命周期刷新可见表面；同一事件循环内合并重绘，卸载后不执行排队回调。
- 中英文文案、类型检查、i18n 卫生和 68 条专注集成源码契约均已通过。

## 第二批：完成回写故障隔离（已完成）

- 完成事件先进入纯判定管线，再决定是否写入；监听器不直接信任跨插件 payload。
- 使用 own data descriptor 读取外部字段，不执行 payload 自定义 getter。
- 严格检查 API 版本、consumer、itemId、启动单位、启动计数模式、时长和 session/record ID。
- 其它 consumer 的事件安静忽略，不产生错误噪音。
- 项目删除、项目归档、单位变化和 sessions/minutes 模式变化分别拒绝，并留下明确诊断。
- 次数模式同样要求实际完成时长为正且不超过 24 小时，不能用异常事件凭空加一次。
- session ID 优先、record ID 回退；两者均缺失时拒绝，保证 externalRef 可去重。
- 同一进程使用 in-flight 与 completed 集合阻止并发、乱序重复写入，最多保留 500 个近期身份。
- 插件重载后通过既有打卡事件的 `docktomato:<identity>` externalRef 继续去重。
- 写接口抛错或返回空结果均记为 write-failed，不加入完成集合，保留重试机会。
- 诊断只保留最近 20 条并返回冻结副本；设置页显示最近原因、数量、时间且允许清除。
- 新增真实判定行为测试，覆盖分钟、小时、次数、recordId 回退、拒绝矩阵、getter 防护和不可变快照，并纳入 `test:ecosystem`。

## 后续切片

1. 上游发布兼容版本后补真实安装/升级检测与版本展示。
2. 增加真实宿主双窗口、热重载、暂停恢复、放弃和完成回写清单。
3. 与上游共同定义有界补偿查询；没有明确权限、游标和发生时间前不实现。
4. 第二个 provider 必须先有真实目标、公开契约和维护者确认，再进入设置选项。

## 非目标

- 不模拟 DOM 点击。
- 不读取 Dock Tomato 私有文件或可变状态。
- 不自动覆盖已有计时。
- 不把实时事件描述为可靠消息队列。
- 不因外部插件不可用而静默改变用户偏好。
