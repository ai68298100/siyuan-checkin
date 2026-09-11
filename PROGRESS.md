# 进度
当前任务：T-022 index.ts 拆分——剩余：bindToday(200行)/bindOccasions/bindEditor(500行)/createApi(127行)。bind 系列同 agent 模式（deps 回调：enqueueMutation/persist/render/recordEvent 等已由 AgentCapabilityDeps 先例）
上次检查点：registerSiYuanAgentCapability 外置（5c1ba1c）；index.ts 4684→3602；新增 agent-capabilities.ts（309 行，AgentCapabilityDeps 11 个回调）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 大部
未提交变更：无
上次提交：5c1ba1c refactor(T-022): extract agent capability registration
下一步：createApi(127行) 或 bind 系列继续外置；达到 <2000 行后出 9.4.0；T-023 阻塞于用户
上下文备注：agent-capabilities.ts 用 deps 回调模式（addCapability/getStore/getOccasionStore/getSummaryContext/getCustomSummaryContext/canRecord/cloneItem/revisionFingerprint/enqueueMutation/recordEvent/setOccasionCompleted/createItem/createOccasion）；entry-capabilities 测试断言已全部迁至 agentSource。render/ 五页 + agent-capabilities + shared + ui/icons + ui/labels + version 共外置约 1600 行。shell 内 api 守卫后可用 this.api!。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。








