# 进度
当前任务：T-022 index.ts 拆分——剩余 bindToday(200行)/bindOccasions/bindEditor(500行)。bind 系列用 deps 回调或 "this as unknown as Host" 双转换模式（api.ts 先例）
上次检查点：createApi 外置（2eef66e）；index.ts 4684→3481；新增 api.ts（205 行，CheckinApi 接口迁入 + CheckinApiHost）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 大部
未提交变更：无
上次提交：2eef66e refactor(T-022): extract createApi
下一步：bind 系列继续外置（每外置一个跑全链）；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：agent-capabilities.ts 用 deps 回调模式（addCapability/getStore/getOccasionStore/getSummaryContext/getCustomSummaryContext/canRecord/cloneItem/revisionFingerprint/enqueueMutation/recordEvent/setOccasionCompleted/createItem/createOccasion）；api.ts 用 CheckinApiHost 结构化接口 + index.ts `this as unknown as CheckinApiHost` 双转换绕开 private（编译期擦除）。entry-capabilities 断言已分裂到 apiSource/agentSource/fragmentsSource。index.ts SUMMARY_TIMEOUT_MS/withTimeout 仍被 generateSummary 使用（保留）。bindEditor 的 deps 可仿 AgentCapabilityDeps。性能 15-19ms。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
