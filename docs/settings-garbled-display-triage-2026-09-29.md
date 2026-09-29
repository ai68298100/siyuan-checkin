# 设置页「乱码/字符竖排/字段碎裂」排查结论（T-1615，2026-09-29）

口径：本稿是 T-1615 的排查产出，**只登记不开发**（D-312 边界）；实施需另行排期。排查方法 = i18n 语料脚本扫描 + 计算样式量测 + 定向渲染探针（420/560/760/900/1180 五档宽度，复用 visual-qa harness 同款内核装载），全部证据可复现。

## 结论一：语料无 mojibake——「乱码」主体是布局挤压的伪乱码 + 少量真实键名泄漏

脚本全量扫描 `src/i18n.ts`（2504 对双语键值）：U+FFFD 替换符 0、UTF-8→GBK 典型 mojibake 字符 0（唯一命中「稿」为常用字误报）、控制字符 0、值形似原始键名的条目 0。**不存在编码层面的真乱码**。

用户所见「乱码感」来自两类真实缺陷：

### A（主因·布局）：文档目标卡在 ≥720px 容器被塞进 240px 窄列，文字逐字竖排

- **标记**：三类目标卡复用行类名——`<div class="lc-checkin__settings-row lc-checkin__document-target-card">`（日记/摘要/健康，`src/render/settings.ts:549` 等）与 `journal-target-card`/`notebook-target-card` 同构；卡内全部内容包在第二个子元素 `lc-checkin__document-target-body` 里。
- **样式断层**：三卡的专属整卡样式（单列栅格/字段布局）**整体只写在 `@container lc5 (max-width: 719px)` 档**（`src/ui/components.scss:10705-10800` 附近）。容器 ≥720px 后无任何专属规则命中，只剩通用 `.lc-checkin__settings-row` 行栅格：
  - `src/ui/maintenance-responsive.scss:14`：**无条件**（无容器守卫）`.lc-checkin.lc-checkin--settings .lc-checkin__settings-row { grid-template-columns: minmax(0,1fr) minmax(120px,240px) }`，特异性 (0,3,0) 压过卡片自有 (0,2,0) 规则；
  - `src/ui/components.scss:779`（720px+，`minmax(0,1fr) 260px`）与 `:4202`（820px+，`minmax(180px,260px)`）同向。
- **结果**：heading 占第 1 列，**整个卡体被塞进第 2 列的 240~260px**；卡体内嵌套的「当前目标」摘要行（`data-target-summary`，`settings.ts:291 targetSummaryRow`）再分 [label | inline] 两列，label 列实测 **0~14px**，`overflow-wrap: anywhere` 下长摘要「名称 · 路径 · 20240819162954-gplczlx」**每行一个字符**——即截图中的「逐字竖排」；搜索框、ID 输入、保存/新建按钮、读写范围全部挤压错位（「文档 ID/按钮/状态行被挤压或错位」）。
- **实测证据**（探针 + computed style，760px 容器）：`data-target-summary` 行 grid 解析为 `0px 228px`；label/small 宽 0~14px；按钮列 228px。截图：760 与 1180 两档均复现竖排，420 档（≤719 有专属样式）完全正常。三类卡同构受影响。
- **附随风险**：`components.scss:529`（≤340px）与 `:890`（≤600px）两档是**视口** media 条件，其余档位是**容器**条件——dock/页签（容器远小于视口）下存在错档叠加风险，走查时需单列。

### B（次因·真实缺陷）：5 个 i18n 键缺失，6 处调用把原始键名渲染进界面

`t()` 缺键回退返回键名本身（`src/i18n.ts:5035` 的 `?? key`）；`i18n-parity` 只校验词典内部双语一致，**不校验代码引用是否存在于词典**。全 src 扫描 `t("字面量")` 对照词典发现：

| 缺失键 | 调用点 | 用户可见形态 |
| --- | --- | --- |
| `bind.feature.noteQuery` | `src/index.ts:4122` | 笔记推导绑定的撤销/来源名 |
| `blockPreset.noEditor` | `src/index.ts:5143` | showMessage 消息 |
| `blockPreset.inserted` | `src/index.ts:5149` | showMessage 消息 |
| `editor.clear` | `src/render/editor.ts:187,220` | 模板/图标搜索清除按钮 title |
| `common.clearFilter` | `src/render/fragments.ts:514` | 今日搜索激活时清除按钮的**可见文本** |

键族旁证：`bind.feature.*` 六键齐全唯独缺 noteQuery（改名遗留）；`blockPreset.*` 与 `common.clear*` 整族不存在。英文键名混入中文界面，同样被读作「乱码」。

## 治理方向（供实施轮评审，本轮不动代码）

1. **目标卡样式提档**：把三卡专属规则从 ≤719 档提升为全档位（或 720+ 档补齐同构规则）；更彻底的方案是让卡片退役 `lc-checkin__settings-row` 复用类、独立命名，从根上脱离行栅格级联（与 T-1616 重构合并实施可一次收口）。两列行栅格需排除目标卡形态。
2. **补齐 5 键或改接既有键**：noteQuery 建议补 `bind.feature.noteQuery`（键族内对齐）；blockPreset 两键按文案补双语；`editor.clear` 复用 `editor.clearTemplateSearch` 语义不合适，宜补短键；`common.clearFilter` 补键或在 T-1623 文案轮统一。
3. **长 ID 呈现统一**（任务验收项）：摘要行超长时截断中段 + `title` 全值 + 复制动作，禁止逐字竖排；ID 输入框已有 placeholder 示例，只差显示策略。
4. **守门补缺**：①新增「代码引用键 ∈ 词典」扫描入 i18n 卫生链（本排查脚本已验证可行，一次性扫全 src 仅毫秒级）；②visual-qa 补 720~1180 档的设置文档卡特写（种入长 docId + 展开目标卡，现有 26 张矩阵在该区间对设置页是盲区）；③`document-target-card` 在 720+ 档的存在性断言。
5. **视口/容器混档**：走查清单把 dock/页签（容器 < 视口）单列，覆盖 `components.scss:529/890` 两条视口条件档。

## 复现与证据索引

- 探针脚本：`.artifacts/settings-probe.cjs`（调查工具，未入库；装载方式与 `tests/visual-qa.cjs` 同源）。
- 截图：`.artifacts/probe-{420,560,760,900,1180}-{diary,summary,health,full}.png`（760/1180 可见竖排；420 正常对照）。
- 量测记录：760px 展开态 `row.gridTemplateColumns === "0px 228px"`、`small.width === 14px`；卡片宽 718px（卡未被压窄，是内部两列错配）。
