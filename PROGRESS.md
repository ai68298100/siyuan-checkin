# 进度
当前任务：T-022 index.ts 拆分——剩余 bind 系列（bindToday 200行/bindOccasions/bindEditor 500行/registerSiYuanAgentCapability 300行/createApi 127行）。bind 系列深度依赖 this（enqueueMutation/persist/render 等 ~12 成员），直接外置需 deps 接口 + 大量闭包管道，建议：a) 保留类内+段落注释分块，或 b) agent-capabilities 用 deps:{api,store,enqueueMutation,...} 接口外置（registerAgent 早退守卫用 api 存在性）
上次检查点：全链九项通过 + v9.3.0 测试包刷新（含 T-022 全部重构）；index.ts 4684→3866
已完成：T-001~T-004、T-010~T-014、T-020、T-021；T-022 大部（render 五页+shared+icons+labels+version 均外置）
未提交变更：无
上次提交：docs/f1627d5 系列（renderEditor 外置后）
下一步：T-022 bind 系列按上述策略继续（每个外置跑全链）；<2000 行可 derby；T-023 阻塞于用户
上下文备注：render/ 五模块=fragments(今日碎片)/review/occasions/settings/editor；src/version.ts 存 PLUGIN_VERSION（release.cjs 已同步双位置替换）；字面量断言迁移共涉及 10+ 测试文件，新断言失败一律改读对应模块。LINE COUNTS：index 3866 / fragments 340 / review 191 / occasions 150 / settings 107 / editor 168 / shared 191。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。







