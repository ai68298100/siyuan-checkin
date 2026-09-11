# 决策
- D-001 独立双主题（不跟思源色） | 用户要求固定最好看的配色 | 所有 --b3-* 在插件作用域内重定义
- D-002 五项导航 | 用户要求精简（归档入回顾） | today/review/occasions/settings
- D-003 默认不分组 | 用户要求平铺列表放更多打卡内容 | TodayGroupMode 默认 "none"
- D-004 弹窗默认 90% | 用户实测反馈 80% 偏小 | dialogScale 默认 90
- D-005 手机端全屏 | 用户要求像原生 App | 100vw × 100dvh + 去除弹窗外观
- D-006 事件索引用 WeakMap | 按店对象自动缓存/失效，无泄漏 | model.ts getStoreIndex()
- D-007 保留 legacy index.scss 作底层地板 | 未全量覆盖前保底 | P6 退役
- D-008 版本号 8.8 在 9.0 后 | 功能完整性优先于语义版本 | 后续用 9.x 递增
