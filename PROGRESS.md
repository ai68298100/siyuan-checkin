# 进度
当前任务：T-022 index.ts 拆分——剩余 bindOccasions/bindEditor(500行)。均用 BindTodayHost 同款模式（宿主接口 + this as unknown as Host 双转换）
上次检查点：bindToday 外置（7ee463c）；index.ts 4684→3286；render/bind-today.ts（BindTodayHost 33 成员）
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 大部
未提交变更：无
上次提交：7ee463c refactor(T-022): extract bindToday
下一步：bindOccasions → bindEditor 外置（注意 bindEditor 内 updateEditorPreview/updateAdvancedSummary 等局部闭包随体迁移即可）；达 <2000 行出 9.4.0；T-023 阻塞于用户
上下文备注：bind 模式=宿主接口含可变字段（todayQuery 等）与依赖方法（enqueueMutation/recordEvent/persistViewPreferences/render/showXxx）；类型来源 CheckinEvent 用 type from ../types（model 不再导出）。抽取后跑九项验证。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

