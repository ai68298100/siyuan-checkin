# 进度
当前任务：T-022 index.ts 拆分——仅剩 bindEditor(500行,最大单体)。用 BindEditorHost 模式（仿 bind-occasions.ts），内含局部闭包 updateEditorPreview/updateAdvancedSummary/applyTemplateFilter/syncBlocks 随体迁移
上次检查点：bindOccasions 外置（a6f5928）；index.ts 4684→3205
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 大部
未提交变更：无
上次提交：a6f5928 refactor(T-022): extract bindOccasions
下一步：bindEditor 外置后 <2700 行；若继续 bindPageNavigation/bindQuickKeyboard 等小方法可达 <2000 出 9.4.0；T-023 阻塞于用户
上下文备注：bind 模式宿主接口含可变字段（editingOccasionId 等）；bind-occasions 内 syncBlocks/saveButtons 用局部闭包+host 回调混合。类型：Occasion/OccasionStore from ../occasions，formatLunar/solarToLunar from ../lunar，showMessage from siyuan。验证九项。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。
