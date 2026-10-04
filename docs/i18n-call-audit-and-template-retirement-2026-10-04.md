# T-1623 调用点检查与模板原型退役

本切片完成卫生测试、未接线原型与样式的联动退役；随后按主代理分工修复 `plugin-ops.ts` 与 `journal-dialog.ts` 两个运行调用。根台账由主代理统一更新；不提交、不推送、不发版。主代理负责 `index.ts` 与 `bind-page-navigation.ts` 的调用修复，计时切片负责新增双语键；完成整合复测前不单独关闭 T-1623。

## 调用点门禁

`tests/i18n-call-audit.cjs` 通过 TypeScript AST 和符号解析识别实际引用 `src/i18n.ts` 导出 `t` 的调用。直接导入、导入别名、命名空间成员和转导出均覆盖；同名局部函数、无关对象的 `t` 方法、注释和字符串示例不会误报。字典也由 AST 读取，字符串中的 Unicode 转义按实际值检查。

静态字符串、无插值模板字符串、括号/类型断言与两边均为静态键的条件表达式接受完整检查。参数支持内联对象、简写属性、静态计算属性与内联对象展开。对每个候选键分别检查两种语言的键是否存在、缺少哪些占位符参数、提供了哪些多余参数；重复占位符按参数名去重。

动态键、变量/返回值形式的参数、未知对象展开和动态计算属性保留明确边界：不把无法证明完整的参数形状算作通过。未知参数仍检查已知键的存在性与明确出现的多余属性；不因某个动态表达式豁免整行。参数值是否在运行时有效、跨函数数据流、函数的本地赋值别名、默认导出别名、`call`/`apply` 包装不在本轮完整证明范围内。

`tests/i18n-call-audit-fixtures.cjs` 用有效 TypeScript 构造 20 个真实翻译调用，检查正确调用、符号身份、缺参、多余参、双语缺键、条件键和未知边界；另有同名函数/对象/字符串的反例。该夹具和生产审计均已接入现有 `i18n-hygiene.test.cjs`，随 `test:ui` 执行，无需新增套餐或退休测试白名单。

2026-10-04 最近一次定向门禁快照：2496 个直接调用、2343 个键和参数形状完全可判定调用、153 个边界调用、0 个问题；147 个包含动态键、12 个包含未知参数，两类允许重叠。并行开发会改变数量，完整可定位清单可用以下命令重生成：

```powershell
node tests/i18n-call-audit.cjs --json
node tests/i18n-call-audit-fixtures.cjs
node tests/i18n-hygiene.test.cjs
```

## 主代理需要同步修复的调用

以下是定向扫描时的源码快照，不使用缺陷白名单掩盖门禁。行号可能随后续并行修改移动，可用键名定位。

| 调用位置 | 已确认问题 | 推荐处理 |
| --- | --- | --- |
| `src/index.ts:5572`，`insights.archivedViewAria` | 提供了字典没有使用的 `name` | 移除多余参数，保持既有归档提示文案 |
| `src/plugin-ops.ts:172`，`msg.exportSensitiveAudit` | 提供了字典没有使用的 `avatar` | 按实际主档导出边界移除多余参数；若确有头像导出需求，另核实数据面与双语披露 |
| `src/render/bind-page-navigation.ts:797/835`，`review.batchNoop` | 条件键的无动作分支收到无效 `n` | 在调用外分支：有结果时 `t("review.batchDone", {n: count})`，无结果时 `t("review.batchNoop")` |
| `src/render/journal-dialog.ts:330`，`journal.writeFailed` | 缺少 `reason`，会留下字面占位符 | 此分支只有失败布尔值，没有可信具体原因；推荐用既有 `journal.resultDocPending` 文案，与页内结果一致，不能编造原因 |
| `src/render/focus-timer.ts:85/86/330` | 本轮并行计时切片引用 `focus.saving`、`focus.saveFailed`、`focus.presetResetConfirm`，扫描时双语键尚未存在 | 由计时切片补齐对应双语键后重跑；本切片不改 `focus-timer.ts` 或 `i18n.ts` |

## 原型退役与验收迁移

退役前已核对全仓生产源码、scripts 与 contracts：`template-manager` 没有生产导入、转导出或调用，其五个导出只由原型自身/对应测试使用。现行个人模板由 `features/templates.ts`、`render/editor.ts` 与 `render/bind-editor.ts` 承载。生产入口不需要迁移，也不需要给死代码补双语。

已删除原型模块。保留原先在主链注册的 `tests/template-manager.test.cjs` 文件名，将其验收改为现行实现：双语标题与动作 ARIA、用户名称/备注转义、稳定 ID 与创建时间、重复保存幂等、不变快照、缺失 ID 删除、番茄计量模式、空用户库与删除后重绘。真实删除绑定语句经 AST 提取并执行，验证取消/缺失目标不写、保存前不改集合、成功反馈并重绘、失败恢复原集合并反馈。保存链另保留失败回滚接线检查。

旧原型专属的内联编辑表单、固定 DOM ID 和内联确认/取消按钮不再作为产品契约：现行编辑器沿自己的表单和 `window.confirm` 路径验收。搜索/空结果/清除/计数播报验证现行内置模板浏览器，不冒称当前个人模板已经支持原型的独立搜索功能。未进行真实浏览器布局或真机读屏验证。

`legacy-style-audit` 与 `ui-theme` 已改为阻止旧选择器回流，并继续检查现行模板控件的基础/窄屏尺寸和焦点样式。不能把这两项测试删除，也不能给 `css-hygiene` 添加死类豁免。

按主代理后续授权，已从 `src/ui/components.scss` 清理 `.lc-template-manager*`、`.lc-template-card*`、`.lc-template-form*` 的基础、560px 容器、焦点、对比度、forced colors 与触摸规则，保留共享选择器中的 `.lc-checkin` 分支，并删除原型专属容器和对应迁移标记。`pnpm run build:check` 重建后 `legacy-style-audit`、`ui-theme`、`css-hygiene` 均通过：734 个类、0 死类、631727 字节、重复约 5023 字节。清理前以下 8 个死类已消除：

```text
lc-template-card
lc-template-card__actions
lc-template-card__icon
lc-template-form
lc-template-manager
lc-template-manager__count
lc-template-manager__list
lc-template-manager__search
```

## 验证与下一切片

- 已通过：AST 20 调用夹具、现行模板退役验收、`templates`、`template-gallery`、`pnpm run check`、测试套餐覆盖（222 文件、0 退休白名单）、本切片 `git diff --check`、`build:check` 与三项样式门禁。构建只有既有 webpack 体积警告。
- 原型清理的样式红项已消除。`i18n-hygiene`/独立生产调用审计的早期失败如实保留为上表发现证据；其中 `plugin-ops` 的多余 `avatar` 已移除，日记失败布尔分支已改用已有 `journal.resultDocPending` 提示，避免编造原因。其余由主代理和并行计时切片同步；整合后需复测，不能沿用早期通过数宣称全链通过。
- 推荐顺序：合入主代理运行调用修复与并行计时双语键；重跑 `i18n-hygiene`、`i18n-parity` 和完整 UI 链。原型模块、测试入口、现行控件样式验收已同步。
- 整合复核：主代理调用与计时双语键已同步，`i18n-hygiene`、`i18n-parity`（2534 对键）、`template-manager`、`css-hygiene`、`legacy-style-audit`、`ui-theme` 全部 EXIT=0，旧选择器清理没有剩余中间红项。完整套餐由主代理继续验收。
- 后续动态键以生产映射/投影输出的明确契约逐族补验收，优先 `trust.reasonKey + reasonParams`、来源状态/诊断、问卷类型和星期编号；未知参数先在产生方约束形状。不要为追求百分比把未知情况改为静态通过，也不要给未接线原型恢复接线。
