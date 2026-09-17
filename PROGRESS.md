# 进度
当前任务：9.7.0 GitHub Release 已发布；T-023/T-129 真实客户端验收仍待用户现场完成
上次检查点：v9.5.1 发布（tag v9.5.1、release Latest、package.zip 302921B、SHA-256 0cd3601e…7ff5）
已完成：T-001~T-004、T-010~T-014、T-020~T-022、T-024~T-030、T-090~T-101、T-032
未提交变更：发布状态回写（待本地提交后推送）
上次提交：feat(api): advertise suggestion read capability（本地里程碑）
下一步：按 `docs/integration-smoke-checklist.md` 复测 T-023/T-129；集市审核与 15.0 工作待真实客户端证据。统一质量门禁使用 `pnpm run test:quality`，大版本路线见 `docs/development-roadmap.md`。
上下文备注：v9.7.0 GitHub Release 已发布（https://github.com/ai68298100/siyuan-checkin/releases/tag/v9.7.0），发布包 SHA-256 为 `17DA1F5192D9046855618D517E18E12768E41006E19C8235245B1504B70A6E14`；集市审核暂缓。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

2026-09-16 T-925~T-927 CSS 发布体积护栏受控放宽：应用户明确授权，将原 380KB 硬阻断调整为 420KB 告警、450KB 硬阻断，保留 318KB 历史软线并新增阈值递增断言；`test:quality` 同步改为先生产构建、后发布资源检查，避免读取旧 `dist`。当前生产 `dist/index.css` 为 404,587 bytes，位于告警区；完整质量链、宽度走查、70 张 UI 截图扫描及浅/深色视觉探针均通过。

2026-09-15 T-105 legacy 样式退役第三十批（32 项）：迁移历史事件基础块与移动入场关键帧，清理 3 个空窄容器块；历史事件改用插件 surface/text/muted token，保留备注链接、值列和空态语义。同步更新移动发版测试，将 360px 容器断言切换至组件层。legacy SCSS 减少 32 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链已启动并修正归属断言，下一轮补跑视觉双主题。

2026-09-15 T-105 legacy 样式退役第二十九批（52 项）：迁移第十三组响应式规则，包括横屏导航/底栏/Today/历史/洞察密度、移动弹窗圆角与滚动条、页面安全区底部留白、编辑器 padding 和底栏边框，以及 360px 超窄布局。颜色全部映射为插件语义 token，并新增第十三段窄屏归属守门。`index.scss` 减少 52 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链已启动但受旧归属断言中断，断言已修正，下一轮补跑全链和双主题视觉。

2026-09-15 T-105 legacy 样式退役第二十八批（52 项）：迁移第十二组窄屏规则，包括长文本换行、深色移动导航/完成态对比、历史筛选结果、洞察空态、Today 顶线布局与操作区、移动弹窗模糊降级和卡片 contain；全部宿主颜色映射为插件语义 token。同步修正移动弹窗测试读取组件层样式。legacy SCSS 减少 52 行，生产 CSS 304094B。验证：`pnpm run check`、`test:mobile`、`ui-theme`、release-assets、diff 检查通过；完整质量链曾因测试变量归属断言中断，已修正后专项复核通过，下一批补跑完整链及双主题视觉。

2026-09-15 T-105 legacy 样式退役第二十七批（52 项）：迁移第十一组窄屏规则，包括洞察教练/图例、历史事件栅格与归档行、移动弹窗入场动画及减弱动态、编辑器滚动留白与输入焦点、Today 进度/计数/操作区、底栏文字和选中态。同步将稳定性测试的安全区断言迁移到组件层。宿主颜色全部映射为插件语义 token。legacy SCSS 减少 52 行，生产 CSS 304008B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 27ms、overflow 0px；专项移动测试通过；后续 Chrome 宽度走查和双主题 visual QA 待下一批复核。

2026-09-15 T-105 legacy 样式退役第二十六批（52 项）：迁移第十组窄屏规则，包括移动弹窗吸顶层级、Today 分组分隔与完成态、事项日期状态、日历标记、触控目标与焦点反馈、深色边框/文字和减弱动态；宿主颜色全部映射为插件语义 token。新增第十段窄容器唯一归属守门。legacy SCSS 净减少 52 行，生产 CSS 304008B。验证：类型检查、UI/移动专项、release-assets 与 diff 检查通过；此前完整质量链在该批前置迁移状态通过，需下一轮重新执行完整链确认。

2026-09-15 T-105 legacy 样式退役第二十五批（32 项）：迁移第九组窄屏规则，包括空态/同步提示、编辑器与事项头部控件、事项字段触控尺寸、模板/图标/类型网格、洞察教练与图例布局；颜色依赖全部替换为插件语义 token。更新 UI 主题守门锁定第九段组件层归属。legacy SCSS 净减少 32 行，生产 CSS 303982B（构建后 303982B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 31ms、overflow 0px；专项移动测试、宽度走查和 Chrome 浅/深主题 visual QA 均通过，pageErrors 为空；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十四批（38 项）：迁移第八组窄屏规则，包括移动底栏高度与选中态、浮动新建按钮、安全区定位、移动圆角层级、完成态边框、Today/历史卡片 hover 反馈及移动字号层级；颜色全部映射为插件语义 token。新增第八段窄容器唯一归属守门。legacy SCSS 净减少 38 行，生产 CSS 从 303953B 变为 303982B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 28ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十三批（70 项）：迁移第六组 600px 核心布局，包括 Today 卡片两行网格与分组间距、移动页头和操作按钮、组织筛选双列布局、历史日历/筛选/事件、洞察统计与教练卡、编辑器滚动区/面板/固定操作区、事项表单单列布局，以及设置卡片与深色说明文字；编辑器操作区和深色说明颜色全部映射为插件语义 token。新增第七段窄容器唯一归属守门。legacy SCSS 净减少 76 行，生产 CSS 从 303938B 变为 303953B（语义 token 名展开增加 15B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 48ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-15 T-105 legacy 样式退役第二十二批（50 项）：迁移第五组窄屏规则，包括 Today 分组布局隔离与间距、浅深主题画布/卡片表面、完成态、桌面深色表面变体、Today 操作区网格、优先级胶囊、移动底栏/编辑器操作区背景，以及 620px 以下紧凑高度档和完成脉冲关键帧；宿主颜色全部映射为插件语义 token。新增第六段窄容器唯一归属守门，并将移动编辑器底部避让测试改锁现行组件层真值。legacy SCSS 净减少 60 行，生产 CSS 从 303985B 降至 303938B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 33ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第二十一批（80 项）：迁移第四组 600px 窄容器规则，包括页面/底栏/卡片主题动效与减弱动态、安全区底部避让、键盘焦点、移动标题阴影、通用宽度约束、Today 卡片图标与文字对齐、历史工具间距、洞察状态图例、设置选项字重、进度完成动效、标题/搜索防溢出、编辑器首屏字段、教练卡片与设置说明截断；宿主颜色全部映射为插件语义 token。新增第五段窄容器唯一归属守门。legacy SCSS 净减少 90 行，生产 CSS 从 303957B 变为 303985B（语义 token 名展开增加 28B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 29ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第二十批（75 项）：迁移第三组 600px 窄容器规则，包括移动弹窗模糊/阴影与减弱动态、Today 卡片操作细节、历史月份导航与统计截断、设置卡片间距、悬浮新建按钮、分隔线、完成动画、通用控件防溢出、保存/同步反馈、事项列表吸顶与滚动、历史备注编辑、Today 分组标题及编辑器高级区；宿主颜色全部映射为插件语义 token。新增第四段窄容器唯一归属守门。legacy SCSS 净减少 91 行，生产 CSS 从 303886B 变为 303957B（语义 token 名展开增加 71B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 152ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第十九批（39 项）：迁移第二组 600px 窄容器规则，包括编辑器类型/高级选项紧凑态、移动底栏左右安全区、导航内容防溢出、Today 新建按钮避让、关闭/返回触控反馈、页面段落间距、事项/模板滚动容器与细滚动条、完成区切换反馈及 Today 空态；宿主颜色全部映射为插件语义 token。新增第三段窄容器唯一归属守门。legacy SCSS 净减少 46 行，生产 CSS 从 303872B 变为 303886B（语义 token 名展开增加 14B）。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 63ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 与 release-assets 通过。

2026-09-14 T-105 legacy 样式退役第十七批（42 项）：迁移首组 600px 窄容器规则，包括历史详情限高/滚动、历史筛选吸顶、四页面平滑滚动与减弱动态回退、焦点轮廓、Today/历史标题截断、移动弹窗遮罩与层级、Today 卡片元信息/进度/操作、编辑器模板区与操作区、设置页字段和按钮紧凑布局；宿主颜色全部映射为插件语义 token。新增窄容器唯一归属守门。legacy SCSS 净减少 59 行，生产 CSS 从 303844B 降至 303837B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 32ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十六批（63 项）：将历史页基础容器/列表、日期行、月份导航、七列日历、四档热度/今日/选中/禁用状态、选中日期区、模板删除危险态、配额提示、字段动作、历史搜索/筛选/结果以及通用焦点层级与禁用态迁入 `src/ui/components.scss`；全部宿主色替换为插件语义 token，模板删除背景以 danger token 与 surface 混合生成。新增历史基础层归属守门。legacy SCSS 净减少 292 行；生产 CSS 由 303838B 变为 303844B（语义危险色混合增加 6B），仍低于 318000B 预算。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 36ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十五批（37 项）：将编辑器组织字段、搜索字段嵌套尺寸、高级设置容器/摘要/展开态、单位与分组选项、图标按钮、星期选择器，以及保存/归档主动作从 `src/index.scss` 迁入 `src/ui/components.scss`；全部宿主颜色按 D-088 映射为插件语义 token，保留键盘焦点、选中态和触屏反馈。同步更新移动端保存与归档测试及组件层归属守门。legacy SCSS 净减少 204 行，生产 CSS 从 303943B 降至 303838B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 30ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十四批（62 项）：将编辑器第一屏的专注入口、通用空状态、表单滚动区/固定操作区、模板标题与三列网格、模板/图标搜索筛选、结果与无结果状态、无障碍隐藏文本、模板卡、图标结果面板、通用字段、双列表单以及类型选择器整体迁入 `src/ui/components.scss`；颜色依赖全部按 D-088 改为插件语义 token，并为窄屏空状态补充 `overflow-wrap:anywhere`。同步修正 10 个移动端结构测试的样式归属，以及已拆分到 `render/editor.ts` / `render/fragments.ts` 的 DOM 结构归属。legacy SCSS 净减少 497 行，生产 CSS 从 304039B 降至 303943B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 33ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 无溢出；浅色/深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 T-105 legacy 样式退役第十三批（55 项）：将 Today 卡片本体/完成态、图标、保存与同步反馈、名称/标签/元信息、焦点与校验状态、进度条、数量输入、记录/快捷/更多按钮及精确录入区域从 `src/index.scss` 迁入 `src/ui/components.scss`；迁移过程按 D-088 将全部宿主颜色映射为插件语义 token，并把 6 处移动端/响应式测试的样式归属断言同步到组件层。legacy SCSS 净减少 329 行，生产 CSS 由 304123B 降至 304039B。验证：`pnpm run test:quality` 全链通过；10k 事件完整渲染 32ms、overflow 0px；系统 Chrome 宽度走查覆盖 2000/1600/1180/640/360px 均无溢出；浅色与深色 `visual-qa` 均 pageErrors 为空，320/360/390/430px 移动矩阵 scrollWidth 等于 clientWidth；`git diff --check` 通过。

2026-09-14 分析历史对比批次（T-199~T-218）：历史弹窗不再把快照元数据塞入 DOM dataset，而是直接读取已通过 `normalizeAnalysisSnapshots` 的独立缓存；新增相邻版本默认选择、交换、单版本禁用、非法索引/同版本保护、方向与元信息展示；实际正文对比接入逐行差异模型与安全 HTML 渲染。差异摘要、空态、历史标题/控件/状态/错误全部补齐中英文 i18n，状态区加入 `aria-live`，新增 `tests/analysis-history.test.cjs` 并接入 `test`/`test:ui`。验证：`pnpm run check`、`pnpm run test:ui`、生产构建通过；CSS 298042B，处于 318000 发布预算内。

2026-09-14 离线本地总结批次（T-219~T-238）：新增 `src/features/local-summary.ts`，从真实 `SummaryContext` 推导空数据/起步/稳步/高完成四档语气、完成率、周期范围、最佳项目和待关注项目；排序使用完成率→记录数→名称的确定性规则，单项目不重复提示。回顾页无智能体或暂无智能体正文时自动展示本地总结，智能体正文存在时保持优先；本地总结带离线标识和虚线卡片样式。中英文文案全部进入 i18n，新增 `tests/local-summary.test.cjs` 并接入 `test`/`test:ui`。验证：`pnpm run check`、`pnpm run test:ui` 通过。

2026-09-14 今日页优先提醒批次（T-239~T-258）：新增 `src/features/priority-reminder.ts`，只读筛选现有提醒投影中的逾期/今日条目，按状态→天数→名称→ID 确定性排序并输出首条摘要。今日页新增低干扰优先提醒横幅，显示来源、名称和状态；打卡来源点击后滚动到对应卡片并聚焦主操作，事项来源进入事项页；接入延期/跳过后的用户动作投影，补齐 CSS.escape、aria-live、双语文案与窄容器样式。增强折叠队列语义：section 标题 aria-label、首条提醒专用操作文案、其余列表最多展示 5 条且摘要数量与实际一致。新增并扩展 `tests/priority-reminder.test.cjs`，覆盖模型、渲染标记、折叠上限、绑定行为、样式与 i18n，并接入 `test`/`test:ui`。验证：`pnpm run test:quality` 全链通过（check、主测试、UI、mobile、ecosystem、perf、release、build）；构建 CSS 299506 bytes，仍在 318000 bytes 预算内。

2026-09-14 桌面事项页布局批次：桌面顶栏从滚动的 `.lc-checkin__layout` 提升到宿主 flex 层，并与内容列共用 1320px 最大宽度，切换事项/回顾/今日时保持同一水平基线；事项管理行拆分展示类型、重复规则、下次日期、倒计时和备注，桌面列表列宽提升至 380–480px，仍与 Today 打卡卡片保持独立语义。扩展 `tests/desktop-dialog.test.cjs` 守门。验证：`pnpm run check`、`pnpm test`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build`、`git diff --check` 通过；未执行真实客户端截图，待 T-023/T-129 现场复测。

远端核对：`git fetch --prune` 与 `git ls-remote` 受 GitHub HTTPS 重置影响未完成；改用 GitHub commits Atom 与 raw 主分支探测，得到远端 main 最新提交 `5b98be33fda28ba248abf4e5993854bd244a95e3`，与本地 `HEAD` 及缓存 `origin/main` 完全一致，无需更新本地仓库。

2026-09-14 设置页恢复点/同步审计折叠批次：恢复点列表与同步审计均改为最新一条直显，其余记录收进可展开的 `details`，新增中英文“展开其余 N 条”文案和紧凑样式，保留每条恢复/导出/清空操作。扩展 `tests/desktop-dialog.test.cjs` 结构守门。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`git diff --check` 通过；生产构建同步通过，CSS 308579 bytes。

2026-09-14 桌面 Today UI 细节批次：将任务卡左侧状态色条由高对比 3px 改为 2px 柔和混合色，降低视觉抢占；宽屏（≥1500px）收紧卡片网格间距与列表间距，减少两列布局的空旷感，同时保持 380px 最小卡宽与操作轨道可读性。验证：类型检查、桌面结构守门与 diff 检查通过。

2026-09-14 大版本路线复盘：结合桌面/移动端现场反馈，修订 `docs/development-roadmap.md`。新增 9.8.x 稳定化窗口，明确 T-023/T-129、番茄钟双窗口和 CI/产物证据完成前不扩展功能；将 10.0/11.0 标记为恢复兼容维护与提醒跨端契约阶段；确认/取消/撤销及审计工作流已从 13.0“待实现”更正为“基础闭环完成，进入真实宿主试点”；15.0 保留为 UI 系统整合，但依赖前述现场验收完成。

2026-09-14 9.8 稳定化首批：新增 `tests/stability-9_8.test.cjs`，把桌面顶栏宿主层级、设置页历史折叠、Today 柔和状态线和“先验收后扩展”路线文档固化为结构守门，并接入 `test:ui`。同时将 TODO 中已实际完成的 T-132~T-134（本地总结、建议确认、分析缓存）状态同步为 done。验证：`pnpm run check`、`pnpm run test:ui`、`git diff --check` 通过。

2026-09-14 9.8 稳定化第二批（T-819~T-848）：新增 30 项稳定化验收条目，覆盖顶栏/底栏宿主结构、Toast 单实例、滚动与焦点恢复、恢复点/同步审计折叠与操作入口、事项页四类动作及元数据、桌面卡片状态线与宽屏间距、i18n 和 test:ui 接线。实现集中在 `tests/stability-9_8.test.cjs`，作为 UI 结构回归门禁。验证：`pnpm run check`、`node tests/stability-9_8.test.cjs`、`pnpm run test:ui`、`git diff --check` 全部通过。

2026-09-14 回顾智能总结刷新批次（T-259~T-278）：回顾页总结上下文新增刷新状态，智能体生成期间按钮显示进行中并禁用，成功/失败/跨天/离开页面均清理悬挂状态，防止并发请求；截止日期、更新时间、历史数量、自定义范围字段全部迁移 i18n；新增 `tests/review-summary-refresh.test.cjs` 并通过 agent-suggestions 测试链执行。验证：类型检查通过；随后执行完整 `pnpm run test:quality`。

2026-09-14 智能体建议确认批次（T-279~T-298）：建议状态、影响摘要和字段变更摘要统一迁移 i18n；新增 `canConfirmSuggestion` 与 `applyConfirmedSuggestion` 纯函数，仅允许 confirmed 建议按 before 基线应用，冲突字段跳过并返回 applied/skipped/conflicts 结果，不触发持久化；建议预览文案同步 i18n，新增 `tests/suggestion-apply.test.cjs` 并接入 agent-suggestions 主测试链。验证：类型检查与定向模型测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议信封防护批次（T-299~T-318）：新增建议信封规范化、序列化与安全解析，限制 ID/标题/原因长度，校验状态、确认标志、创建时间与 confirmedAt，复用字段白名单和数量上限；应用边界再次拒绝未知字段，防止原型污染。扩展建议确认测试覆盖 malformed JSON、时间和长度边界。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议审计轨迹批次（T-319~T-338）：新增建议审计动作/记录模型、版本化序列化与安全解析，统一校验建议 ID、动作、时间、应用计数、冲突字段和拒绝原因；追加函数复用 50 条保留上限，统计摘要按动作返回稳定计数，未知版本或 malformed JSON 安全回退为空。扩展 `tests/suggestion-apply.test.cjs` 与 agent-suggestions 结构守门。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议确认令牌批次（T-339~T-358）：新增版本化确认/取消决策令牌，绑定建议 ID、动作、时间和 nonce，默认 10 分钟 TTL 并拒绝错误版本、过期、未来时间及跨建议令牌；新增可撤销应用纯函数，仅回滚仍保持建议值的字段，用户后续修改保留并返回冲突结果。扩展建议运行时和结构守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议令牌消费批次（T-359~T-378）：新增令牌消费结果模型与最近 100 条重放防护，区分 invalid/replayed/wrong-decision 原因；新增带令牌的确认/取消状态迁移入口，并提供应用、撤销及决策审计转换函数，保持纯函数和显式持久化边界。扩展建议运行时与结构守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流门面批次（T-379~T-398）：新增 `src/features/suggestion-workflow.ts`，统一封装令牌消费、确认/取消迁移、已确认建议应用、撤销及审计追加，并提供动作统计摘要；工作流状态复制变更和令牌列表，保持纯函数、不直接持久化。新增 `tests/suggestion-workflow.test.cjs` 覆盖确认、取消、重放、应用、撤销和审计链路。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 结构化智能体输出批次（T-439~T-458）：SummaryProvider 兼容纯文本与 `{text, suggestions}` 结构化返回值；新增结果/单条建议规范化，限制文本长度、建议数量和变更白名单；index 消费规范化结果并创建 pending workflow，API 继续只返回安全文本，回顾页按可选状态展示工作流面板，范围/日期切换清理旧建议。新增结构化输出与面板接线守门测试。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流恢复批次（T-399~T-418）：新增工作流状态规范化、版本化序列化/解析、已消费令牌上限、可撤销资格判断和状态摘要；恢复流程复用建议信封与审计规范化边界，未知版本或损坏 JSON 安全回退，撤销资格按最新应用审计避免重复撤销。扩展工作流测试覆盖恢复、摘要和重复撤销保护。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流面板批次（T-419~T-438）：新增 `src/render/suggestion-workflow.ts`，展示建议标题、状态、原因、审计统计和字段变更；pending 状态提供确认/取消按钮，其他状态提供按资格禁用的撤销按钮，所有操作补齐 aria-label；新增响应式面板样式与结构守门测试，并接入 agent-suggestions 测试链。验证：类型检查与定向测试通过，随后执行完整 `pnpm run test:quality`。

2026-09-14 建议工作流确认闭环批次（T-459~T-478）：建议面板确认/取消/撤销按钮全部绑定到宿主 workflow；每次动作生成短时决策令牌并消费，确认后按基线安全应用建议，撤销仅回滚仍匹配的字段；确认与撤销持久化失败恢复旧 store，取消不修改主 store，无变更与不可撤销场景显示双语提示。新增绑定与宿主接线结构守门测试，更新 agent-suggestions 主测试链。已通过 `pnpm run check`、定向建议测试与完整 `pnpm run test:quality`（QUALITY_EXIT=0）；构建 CSS 302043 bytes，仍在 318000 bytes 预算内。

2026-09-14 建议工作流恢复与持久化批次（T-479~T-498）：工作流状态使用独立存储键和版本化序列化格式，启动及数据变化时按当前条目安全恢复，不覆盖主 store；确认、取消、应用拒绝、撤销和新建议生成均写回工作流快照，范围切换与无建议场景清理旧快照；写入串入保存队列，失败仅提示且不阻断主 store。新增恢复/持久化结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `c719eeb`，未 push。

2026-09-14 建议工作流生命周期防护批次（T-499~T-518）：新增待确认建议 24 小时恢复时限，启动和数据变化恢复均校验创建时间、未来时间及当前条目；过期或损坏快照自动清理，已确认建议仍保留撤销能力。扩展运行时与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `e2f1de5`，未 push。

2026-09-14 建议面板反馈与无障碍批次（T-519~T-538）：工作流状态加入 aria-live 与可读标签，操作区明确语义；变更列表最多展示 8 条并提示隐藏数量；确认/取消/撤销按钮在异步处理期间禁用并标记 aria-busy，完成后安全恢复，兼容宿主同步抛错与按钮脱离 DOM。新增结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302043 bytes；已提交本地里程碑 `c1c375a`，未 push。

2026-09-14 建议审计信息增强批次（T-539~T-558）：工作流新增最新审计查询并返回防御性副本；面板展示最近更新时间（无审计时回退创建时间），时间字段统一转义并补齐中英文文案与样式。扩展运行时及渲染守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302228 bytes；已提交本地里程碑 `254bf07`，未 push。

2026-09-14 建议操作并发与异常边界批次（T-559~T-578）：建议确认/取消/撤销按钮增加 WeakSet 忙碌集合，阻止重复触发；同步宿主抛错统一转为异步 Promise，完成后安全清理 aria-busy/disabled，按钮脱离 DOM 时不再操作；统一吞吐异常避免未处理拒绝。新增并发与异常结构断言。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `0b5664c`，未 push。

2026-09-14 建议操作能力门面批次（T-579~T-598）：新增纯函数 `workflowActions` 统一计算确认/取消/撤销可用性，面板复用该结果，pending 无变更时确认按钮自动禁用，应用与撤销状态按审计资格保持一致；扩展运行时和渲染测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `f01623a`，未 push。

2026-09-14 建议工作流跨窗口一致性批次（T-599~T-618）：新增工作流更新时间推导和新旧比较，数据变化恢复仅在远端状态更新时覆盖本地，旧或同时间快照不会覆盖未完成操作；过期/损坏远端状态仍按生命周期策略清理，有效本地状态保持不变。扩展运行时和结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `8923941`，未 push。

2026-09-14 建议操作成功反馈批次（T-619~T-638）：确认、取消、撤销完成后分别显示明确双语提示，持久化失败、应用冲突和不可撤销等失败分支继续使用原有错误文案。扩展 index 与 i18n 结构守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `b6dc498`，未 push。

2026-09-14 建议操作焦点连续性批次（T-639~T-658）：成功提示包含建议标题；确认/取消/撤销后的重渲染会尝试将焦点恢复到更新后的可用撤销按钮，且不会聚焦禁用或已脱离 DOM 的控件。扩展绑定与文案结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `2cc11ad`，未 push。

2026-09-14 建议审计明细面板批次（T-659~T-678）：工作流面板新增可展开审计明细，按最新优先展示最近 10 条动作、时间与拒绝原因；撤销动作使用独立文案，所有字段统一转义，空审计不渲染明细。补齐双语文案、窄屏样式与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302302 bytes；已提交本地里程碑 `961a691`，未 push。

2026-09-14 建议工作流 API 只读投影批次（T-679~T-698）：CheckinApi 新增 `getSuggestionWorkflow`，仅返回建议信封、变更、消费令牌和审计的防御性副本；空状态返回 undefined，不暴露持久化或决策写入口，不共享内部 store 引用。新增 API 结构守门测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `847f12d`，未 push。

2026-09-14 建议工作流摘要 API 批次（T-699~T-718）：CheckinApi 新增 `getSuggestionWorkflowSummary`，提供状态、可应用/撤销标志、消费令牌与审计计数及更新时间；空状态返回 undefined，摘要为新对象且保持主 API 版本兼容。更新生态文档和结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `d045c3b`，未 push。

2026-09-14 工作流快照克隆边界批次（T-719~T-738）：新增 `cloneSuggestionWorkflow` 统一克隆信封、变更、消费令牌、审计及冲突数组，创建工作流和 API 只读快照复用该函数，防止跨层引用泄漏。扩展运行时与 API 结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `95e1046`，未 push。

2026-09-14 建议工作流事件广播批次（T-739~T-758）：新增 `checkin:suggestion-workflow-updated` 事件契约，确认、取消、应用、撤销及新建议生成后广播建议 ID 与状态；保持现有订阅 API 和事件兼容，仅增加只读通知。扩展契约与结构测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `e0d358a`，未 push。

2026-09-14 建议事件 payload 安全批次（T-759~T-778）：集成层新增 `cloneIntegrationEvent`，对建议事件校验 ID/状态并限制长度，对事项、记录和删除事件做嵌套防御性克隆；`emitIntegrationEvent` 统一在派发前安全过滤。新增运行时事件测试并接入 ecosystem 测试链。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `1221eed`，未 push。

2026-09-14 建议事件类型守卫批次（T-779~T-798）：新增 `SuggestionWorkflowIntegrationEvent` 类型别名和 `isSuggestionWorkflowEvent` 守卫，统一校验事件对象、建议 ID 长度和固定状态枚举；payload 克隆与事件派发复用同一边界。扩展运行时、契约和生态文档测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `064f2c8`，未 push。

2026-09-14 建议只读能力协商批次（T-799~T-818）：新增 `suggestions.read` capability，标记为 `effect: read` 且 `localOnly: true`，用于协商 `getSuggestionWorkflow` 与摘要接口；保持 API 版本 4 和既有写能力不变。更新生态文档与契约测试。验证：`pnpm run test:quality` 通过（QUALITY_EXIT=0），构建 CSS 302873 bytes；已提交本地里程碑 `d177dd5`，未 push。

T-122 complete: mobile topbar and bottom navigation now inherit the resolved independent light/dark palette from the surface even though they live outside the scrolling `.lc-checkin` element. Host datasets and fixed token synchronization prevent fallback to Siyuan global colors; topbar exposes `data-appearance` for deterministic styling. Verification: `pnpm run check`, `pnpm run test:mobile`, `pnpm run test:ui`, and `pnpm run build` passed (CSS 262 KiB, existing webpack size warnings only).

T-135 complete: `tests/agent-suggestions.test.cjs` is now part of the main `pnpm test` chain. Verification: `pnpm test` passed, including Agent suggestion safety structure checks.

T-136 complete: added deterministic line diff and escaped HTML renderer for saved analysis comparison, with compact scrollable styles and regression assertions. Verification: `pnpm run check` and agent-suggestions safety checks passed.

T-137 complete: added strict analysis snapshot normalization, including range/source validation, generated timestamp presence, 200k text bound, and 20-entry retention.

T-137 follow-up: wired normalization into `loadAnalysisSnapshots`, so persisted cache data now always passes the same validation boundary before entering UI state.

T-140 complete: `saveAnalysisSnapshot` now normalizes, deduplicates, and bounds history before persistence, keeping read/write cache invariants aligned. Verification: type check and agent-suggestions checks passed.

T-190 complete: sidebar dock responsive layout batch consolidated across ultra-narrow, narrow, medium, and wide containers. Card actions, headers, forms, lists, calendar, navigation, focus, overflow, and scroll boundaries now have dedicated constraints. Automated type/mobile checks pass; real-client validation remains separate.

T-131 status corrected to complete: review secondary navigation is implemented with jump targets, auto-expansion, sticky navigation, and persisted fold state; covered by UI/mobile regression checks.

10.0 checkpoint: T-036 migration report foundation implemented and backup tests expanded. Next: connect report to JSON restore preview; T-023 real-device validation remains blocked.

T-037 complete: JSON restore flow now builds migration report against current store and includes source-to-target version in confirmation preview.

T-038 complete: successful JSON restores now append migration audit entries and persist the audit ledger.

Correction: T-038 audit persistence is deferred; restore preview integration remains limited to migration report generation until audit write path is added safely.

T-038 completed: successful JSON restore now persists a migration audit entry with source/target versions, repair state, warning count, and summary delta.

T-039 complete: migration report tests now verify exact zero deltas, BOM/missing version, and malformed JSON rejection.

T-039 complete: migration report tests now verify exact zero deltas, BOM/missing version, and malformed JSON rejection.

T-040 complete: local snapshot rollback writes a restore audit entry after successful persistence; full test chain remains green.

T-041 complete: settings audit list formats migration and restore records into readable summaries while retaining raw JSON for other event types.

T-042 complete: added restore-audit.test.cjs and included it in test:backup/main test chain.

Quality checkpoint: pnpm run test:quality passed after T-042, including environment, type, main, UI/mobile/ecosystem/perf/release checks, and build.

T-044 complete: added assessJsonMigration with review reasons for warnings, normalization repairs, and negative restore deltas.

T-045 complete: assessJsonMigration is connected to JSON restore confirmation; warnings, repairs, and destructive deltas are shown for review.

T-046 complete: validateJsonMigrationReport added with version/store/summary consistency checks and backup coverage.

T-047 complete: restore flow validates migration report consistency and aborts safely on invalid target/store/summary data.

T-048 complete: validation failures are recorded as rejected migration audit entries before restore aborts.

T-049 complete: restore audit guard now verifies persistence failure rollback path remains intact.

T-050 quality checkpoint: test:quality passed after migration validation and rejected-restore audit changes.

T-051 complete: serializeJsonMigrationReport added for portable migration diagnostics and future support bundles.

T-052 complete: plugin operations now expose downloadMigrationReportFor for future restore/support UI integration.

T-053 complete: restore-audit guard now covers migration report download operation.

T-054 complete: migration diagnostic serialization is now committed and verified.

T-055 complete: review JSON export now responds to click; backup recommendation removed from Today and remains a Review concern.

T-056 complete: desktop topnav no longer sticks over content; default auto dialog shows more content with expanded width/height ratios.

Dock Tomato 联动研究完成：公开契约与未来 PR 边界已记录于 docs/docktomato-integration-plan.md；当前不启用联动、不创建 PR。

T-057 complete: Archived is now a Review sub-entry, reducing primary navigation while preserving direct access.

T-057 verification checkpoint: pnpm run check, pnpm test, and pnpm run test:ui pass after nesting Archived under Review.

T-059~T-062 complete: mobile group labels no longer stick, cards are denser, the editor retains an escape route and bounded scrolling, Add is centered in the bottom navigation, today occasions move above the list, and the default ungrouped preference is guarded. Verification: pnpm run check, pnpm run test:mobile, pnpm test, pnpm run test:ui, and system-Chrome width walkthrough passed.

Next: continue 10.0 data-safety work with migration audit retention/export management; T-023 remains pending real-device feedback.

T-063~T-064 complete: audit storage now rejects malformed entries and Settings exports a versioned normalized audit JSON file. Main, backup, UI, and type checks pass; final quality gate pending.

Quality checkpoint: pnpm run test:quality passed after T-063~T-064. T-065 then unified all four audit writers; pnpm run check, pnpm run test:backup, and pnpm test passed.

Next: design audit filtering/detail expansion or proceed to the next 10.0 recovery-platform slice; T-023 remains pending real-device feedback.

T-066 complete: local snapshot restore cannot silently normalize a malformed snapshot into destructive data. Validation failures are rejected and audited; repairs and negative deltas are surfaced before confirmation. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Roadmap audit: duplicate event IDs and externalRef identities are already normalized deterministically in normalizeStore/mergeStores and covered in model tests; no duplicate implementation added.

Next: extract a reusable recovery preflight result for JSON and snapshot restore, then reduce duplicated restore orchestration.

T-067 complete: preflightJsonRecovery now owns migration report construction, risk assessment, and consistency validation for both restore entry points. A v1-to-v2 normalization is intentionally review-worthy even when counts do not decrease. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Uncommitted checkpoint: T-066~T-067 are complete and verified. Accumulate one more related recovery task before the next local commit; do not push.

T-068 complete: buildRecoveryAuditDetails provides one audit payload contract for accepted/rejected JSON imports and local snapshots. Verification: pnpm run test:backup and pnpm test passed.

Milestone ready: T-066~T-068 form the shared recovery preflight/audit slice and may be committed together.

T-069~T-071 complete: recovery data persistence and diagnostic persistence now have separate transaction boundaries. Failed data writes roll back and attempt a persist-failed audit; failed audit writes never roll back successful data or leak an unhandled rejection. Verification before quality gate: pnpm run check, pnpm run test:backup, and pnpm test passed.

Quality checkpoint: pnpm run test:quality passed after T-069~T-071, including production build. Existing size warnings remain: index.js 355 KiB, index.css 289 KiB, package.zip 297 KiB.

Next: continue recovery-platform work with snapshot metadata/history rather than a single opaque rolling backup.

T-072~T-074 complete: rolling backups now use a versioned snapshot envelope with capturedAt; legacy raw-store snapshots remain restorable. Confirmation shows capture time and all snapshot audit outcomes retain capture/legacy metadata. Verification: pnpm run check, pnpm run test:backup, and pnpm test passed.

Next: extend the single rolling envelope into a small bounded snapshot history while preserving the current restore-latest behavior.

T-075~T-078 complete: backup storage is now a bounded three-entry snapshot history with compatibility for history, single-envelope, and legacy raw formats. The latest restore flow selects the newest snapshot. Fixed a pre-existing target bug where persist(current) wrote the old store instead of the selected backup. Verification before quality gate: pnpm run check, pnpm run test:backup, and pnpm test passed.

Quality checkpoint: pnpm run test:quality passed after T-075~T-078, including production build. Existing size warnings: index.js 356 KiB, index.css 289 KiB, package.zip 298 KiB.

Next: expose bounded snapshot history in Settings so users can inspect and choose a restore point; keep latest as the quick default.

T-079~T-081 complete: Settings loads and renders bounded snapshot history, shows capture time plus item/event counts, and lets users restore a selected entry through the shared preflight flow. Responsive list styling covers narrow surfaces. Verification before quality gate: pnpm run check, pnpm test, pnpm run test:ui, and pnpm run test:mobile passed.

Quality checkpoint: pnpm run test:quality passed after T-079~T-081, including production build. Existing size warnings: index.js 358 KiB, index.css 289 KiB, package.zip 298 KiB.

Next: add snapshot-history export/clear management and test restore-point index bounds.

T-082~T-084 complete: snapshot history can be exported and explicitly cleared from Settings; current data is unaffected. Selected-index bounds are guarded before preflight. Verification: pnpm run check, pnpm run test:backup, pnpm test, and pnpm run test:ui passed.

Next: add import validation for exported snapshot-history bundles, then allow restoring those bundles without replacing current data until a concrete restore point is selected.

T-085~T-087 complete: exported snapshot bundles can be imported through strict format validation. Import confirmation explicitly replaces only restore points; current check-in data remains untouched until a selected restore runs through preflight. Verification before quality gate: pnpm run check, pnpm run test:backup, pnpm test, and pnpm run test:ui passed.

Quality checkpoint: pnpm run test:quality passed after T-085~T-087, including production build. Existing size warnings: index.js 362 KiB, index.css 289 KiB, package.zip 299 KiB.

Next: review 10.0 migration/recovery acceptance criteria and identify remaining automated work; T-023 remains the only real-device blocker.

T-088~T-090 complete: snapshot history read paths enforce the three-entry bound, imported snapshot stores require the complete persisted shape, and invalid capture times are rejected. Verification: pnpm run check, pnpm test, and pnpm run test:backup passed.

Next: close the 10.0 automated acceptance checklist and move remaining non-device work to the 11.0 planning/reminder platform.

T-091~T-092 complete: the new pure reminder projection merges visible occasions with scheduled check-in opportunities, derives today/upcoming/completed status, and applies stable urgency/name/id ordering without mutating either store. Verification: pnpm run check and pnpm test passed.

T-093 complete: Review now includes a compact reminder center backed by the projection model; completed entries remain visible but visually secondary, while narrow layouts collapse timing below the title. Verification: pnpm run check and pnpm run test:ui passed.

Next: add reminder-center filtering and explicit overdue representation in the 11.0 model/UI slice; keep snooze/skip semantics deferred until the storage contract is designed. T-023 remains pending real-device feedback.

T-094 complete: reminder entries now support a non-mutating status filter while preserving deterministic ordering and stable identities. Verification: pnpm run check, pnpm test, and pnpm run test:quality passed before this filter addition; targeted type/test verification follows.

Next: connect the filter to Review controls and define overdue semantics without changing persisted data. T-023 remains pending real-device feedback.

T-095 complete: Review now exposes an all/today/upcoming/completed reminder filter backed by the non-mutating projection. Verification: pnpm run check and pnpm run test:ui passed.

Next: model overdue reminders as a separate date projection, then add focused boundary tests before changing visible occasion semantics.

T-096 complete: migration report parsing now emits a stable JSON parse error before normalization, preserving explicit rejection for malformed imports. Verification: pnpm run check and pnpm run test:backup passed.

Next: design overdue reminder projection separately from current visible occasion semantics; document date and recurrence edge cases before implementation.

T-097 complete: added a conservative overdue occasion projection for uncompleted one-off dates; recurring and lunar occurrences remain excluded until a recurrence history contract is specified. Verification: pnpm run check, pnpm test, and occasion tests passed.

Next: add overdue entries to the reminder center behind an explicit filter, with copy that distinguishes overdue from upcoming.

T-098 complete: overdue is now a first-class reminder status ranked ahead of today and upcoming entries; existing filter types remain backward-compatible for all prior states. Verification: pnpm run check and occasion tests passed.

T-099 complete: Review reminder center now exposes overdue filtering and dedicated overdue copy, while preserving compact responsive rendering. Verification: pnpm run check, pnpm run test:ui, and occasion tests passed.

Next: run full quality gate, then design recurring overdue history as a separate model task.

T-102 complete: GitHub Actions CI added (.github/workflows/ci.yml) running check/build/test/test:mobile/check:release on push and PR. Browser walkthroughs stay local until Playwright provisioning is reliable.

T-103 complete: retired 21 dead `@container lc-checkin` blocks (927 lines) plus the overridden `container-name: lc-checkin` longhand from index.scss. Proof of safety: tokens.scss declares `container: lc5 / inline-size` on `.lc-checkin` after index.scss, so the lc-checkin container name never existed and none of those queries could ever match; walkthrough screenshots confirm pixel-identical pages. dist/index.css shrank 301555→262270 bytes (-13%). Four test files that locked the dead blocks (ui-theme, mobile-preview-overflow, mobile-rotation-layout, mobile-visual-regression) were re-pointed at the live lc5 rules in components.scss; one assertion was locking a dead 16px radius token while the live tokens value is 20px.

Next: T-104 viewport @media residue cleanup (requires runtime comparison), then phase-3 migration of unconditional legacy rules toward full index.scss retirement.

T-107 complete: desktop page keyboard flow (j/k or arrows move focus across visible cards onto their primary action button, space/enter checks in natively, e opens the editor). Opening the desktop dialog now focuses the page container so keys cannot leak into the document editor underneath; verified on the live desktop.

T-112 complete: per-surface page scroll memory. renderInto captures the outgoing scroll position under the old page key and restores the incoming page's remembered position after binding, so check-ins and filter edits no longer jump the viewport and page switches resume where the user left off. Storage is a WeakMap keyed by surface root, released with the surface.

Next: T-104 viewport @media residue cleanup, then T-105 unconditional legacy rule migration toward full index.scss retirement; T-110 catch-up undo toast from the idea pool.

T-110/T-113/T-114 complete: catch-up undo snackbar (6s, rolls back the occasion mark), Escape closes the quick dialog (bound only on the dialog surface with a re-render guard), and post-record focus restore (the card acted on regains focus after re-render so the keyboard flow continues). All verified by the structure suite; desktop build redeployed and reloaded.

T-111 complete: the contrast audit already existed inside the T-021 accessibility audit (WCAG 4.5:1 / 3:1 large-text, both themes, all main pages); this round added the archived and insights pages to the audit walk (0 violations across 7 pages × 2 themes) and moved the browser audit into CI as a dedicated browser-audit job (playwright 1.63 added to devDependencies, Chromium installed on the runner).

T-115 complete (visual-qa crash root-caused and fixed): the double-submit editor step raced the async mutation queue — the wait selector matched the bottom-nav button that renders on every page, so the assertion ran before the save landed. The step now polls for the persisted item, the harness carries a queue trace probe (enqueue/start/end/settled per mutation), and a stale-form marker (form.dataset.submitBound) aids future diagnosis. Visual-qa exits 0 with zero page errors and is now part of the CI browser-audit job.

T-119 complete: post-check-in feedback is now a compact window-level toast hoisted to the dialog/tab/dock host after the Today list, avoiding the mobile top content flow and staying bounded by the active plugin window. It uses a subtle 120ms fade/2px lift, dismisses after 2.6s, leaves the undo action available, and disables animation for reduced-motion users. Verification: `pnpm run check`, `node tests/checkin-toast.test.cjs`, `pnpm run test:ui`, `pnpm test`, `pnpm run build`, and the Edge-backed mobile visual harness passed. Build retains the existing size warnings (index.js 377 KiB, index.css 259 KiB, package.zip 300 KiB).

T-120 complete (番茄钟快照): 联动待同步队列新增带 revision 的磁盘合并写入。新增 `mergePendingCheckinToDisk`，每次写入前重读设置文件，仅替换队列与 `tomatoCheckinPendingRevision`，按 `itemId + sessionKey` 去重合并；新增/重试/删除/清空路径统一接入，同一插件实例内写入串行化，旧数组格式继续可读。验证：`npx tsc --noEmit`、`npm test -- --run`（19/19）及 `npm run build` 通过。

下一步：补充真实双窗口 smoke，验证思源多前端并发 saveData 下 revision 与队列合并的最终行为；继续保留 T-023 真机验证阻塞记录。

T-121 complete: 手机端顶栏改为紧凑的画布融合样式。顶栏总高固定为 `38px + safe-area-inset-top` 并使用 `border-box`，避免安全区 padding 与 min-height 叠加；背景统一为插件画布色，关闭按钮与今日进度改为低对比度细边框/胶囊，减少突兀感和内容占比。新增移动端发布结构断言。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile` 全部通过。
T-104 首批迁移完成：将 `index.scss` 中编辑器双栏布局、设置页三栏选项、历史页桌面增强三组安全规则从视口 `@media (min-width: 900px)` 改为 `@container lc5`，使弹窗、页签、侧栏按自身容器宽度决定布局。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 全部通过；剩余弹窗宿主与可访问性媒体规则保留待分批走查。

T-109 complete: 发布资源检查已包含 `dist/index.css` 体积预算（283000 bytes），当前构建约 267KB，样式增长超过预算会在 `check:release` 阶段阻断。验证：`pnpm run test:ui` 中 release-assets 守门通过。

T-104 第二批迁移完成：将 `index.scss` 中多组仅作用于 `.lc-checkin` 内容的窄屏规则（原 `max-width: 600px` 的滚动行为、历史/设置/今日紧凑布局、空态、触控文本换行、今日卡片视觉层）改为等价的 `@container lc5 (max-width: 600px)`，使窄弹窗与侧栏按容器宽度一致响应。保留弹窗外框、横竖屏/高度、安全区、无障碍、打印及 380px 模板触控断点等视口媒体规则，避免改变宿主级行为。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 全部通过。

T-104 第三批迁移完成：编辑器模板管理器的 `max-width: 560px` 子树规则改为 `@container lc5`，让模板卡片在窄弹窗/侧栏按实际容器宽度收敛；直接作用于 `.lc-checkin` 自身的 360px 规则仍保留视口媒体，遵循容器查询不能匹配容器元素自身的限制。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile` 通过。

质量门禁：`pnpm run test:quality` 全部通过（环境、类型、主测试、UI、移动端、生态、性能、发布资源、构建）；性能基准 10k events 渲染 44ms，CSS 产物 267679 bytes，构建仅保留既有体积警告。

T-106 complete: 手机打卡成功后的轻振动反馈已接入统一记录路径，设置页提供开关（中英文文案），默认开启；仅移动端且 `navigator.vibrate` 可用时调用 10ms，桌面或受限 WebView 静默跳过。现有 view-preferences 与结构测试已覆盖该行为。

T-123 complete: `index.scss` 中 ≤380px 与 ≤360px 的内容密度规则已迁移为 `@container lc5`，窄 dock 与窄弹窗按实际 surface 宽度共享卡片、编辑器和历史布局；容器自身 padding 及标题 viewport 上限保留为宿主级回退。新增移动端发布断言。验证：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build` 通过，构建仅保留既有 webpack 体积警告。

下一步：T-124 继续评估剩余视口媒体规则，先处理纯内容布局，保留设备能力、方向、高度、无障碍、打印和宿主级弹窗尺寸规则，迁移前补运行时走查。

T-124 complete: 桌面弹窗/页签的内容级顶部间距与控制按钮位置已从视口 `@media (min-width: 900px)` 拆到 `lc-dialog`/`lc5` 容器查询；外层弹窗圆角仍保留视口规则，避免改变宿主窗口行为。新增 desktop-dialog 结构断言。验证：`pnpm run check`、`node tests/desktop-dialog.test.cjs`、`pnpm run test:ui` 通过。

下一步：T-125 继续审计剩余视口媒体查询，优先确认是否存在可迁移的纯内容布局；设备能力、方向、高度、无障碍、打印及宿主级尺寸规则保持谨慎处理。

T-126 complete: 窗口主题 token 同步增加按宿主缓存的 appearance/palette 签名；同一主题下的打卡重渲染跳过重复 `getComputedStyle` 读取，主题切换或调色板改变时仍会完整同步。验证：`pnpm run check`、移动端发布守门、`pnpm run test:perf`（10k events 渲染约 51ms，横向溢出 0px）通过。

下一步：继续 T-125 的剩余媒体查询审计；若无安全纯布局规则，则转向 T-108 打卡局部重渲染或真实双窗口联动 smoke 设计。

T-127 complete: 修复 Today 视图重复渲染打卡提示的问题。提示现在只在列表之后生成一次，再由 `renderInto` 提升到窗口宿主，撤销入口不会残留在滚动正文顶部或出现双份。新增单实例结构断言；`pnpm run check`、`pnpm run test:ui` 通过。

下一步：继续评估 T-108 局部重渲染，优先从单卡片 DOM 更新与事件委托边界设计入手；同时保留真实双窗口番茄钟 smoke 作为联动验收项。

T-128 complete: 为 Today 建立保守的单卡片局部刷新路径。数值记录在卡片仍处于同一筛选/完成态/结构时，仅更新派生 meta、进度宽度和连续徽章；完成态变化、卡片不可见或结构变化自动回退完整渲染。窗口级 toast 抽出为 `renderRecentRecordView`，局部路径可同步新增/替换/移除 toast。覆盖 dock、页签和快速窗口，新增结构守门。验证：`pnpm run check`、`pnpm run test:ui` 通过。

下一步：T-108 继续做真实设备与交互验证，重点检查局部更新后的焦点、滚动记忆、撤销及番茄钟联动；必要时再扩展到更多可安全局部更新的事件路径。

T-129 queued: 局部刷新自动化边界已明确，真机验收单独记录为手机/页签/dock 三表面场景，避免把结构测试替代真实交互证据。

T-130 complete: 番茄钟独立联动设置页已有复制诊断、导出待同步、重试/删除/清空入口；诊断快照新增 pendingStatus 分类计数（retryable/blocked/duplicate），并保持默认静默，仅用户主动复制诊断时输出。番茄钟单测 19/19 通过。

下一步：T-129 真实手机/页签/dock 交互验收，以及真实双窗口联动 smoke；当前仍需用户设备环境提供证据。

T-125 本轮审计：复核 `src/index.scss` 剩余视口媒体查询。当前残余均属于宿主级弹窗尺寸、设备能力/方向/高度、无障碍/强制颜色、减少动效、触控指针或打印语义；没有可在未走查前安全迁移的纯内容布局规则，保持现状以避免改变真实客户端行为。验证：`pnpm run test:ui` 全部通过。

性能回归：`pnpm run test:perf` 通过，10k events 全量渲染 42ms，横向溢出 0px；局部刷新与主题同步缓存未造成可观测退化。

新增 `docs/integration-smoke-checklist.md`，将 T-129 与番茄钟双窗口联动的人工验收步骤、通过标准和记录格式固化；待用户提供真实客户端环境后执行并回填证据。

移动端/发布回归：`pnpm run test:mobile` 与 `pnpm run check:release` 均通过；320/360/390/430px 触控、键盘、模板、旋转和溢出检查全绿，CSS 产物 268155 bytes。

工作区质量检查：`git diff --check` 无代码空白错误（仅保留 Git 的换行格式提示），`pnpm run check` 类型检查通过。

远端同步检查：已执行 `git fetch origin --prune`；当前 `main` 与 `origin/main` 同步（无领先/落后提交），远端最新提交为 `c0a01b6 fix(release): Windows-safe release notes path`。工作区未提交改动均为本轮持续开发内容。

生产构建复核：`pnpm run build` 通过（Webpack 约 2.1s，`dist/index.css` 262 KiB、`dist/index.js` 382 KiB、`package.zip` 301 KiB）；仅有既有体积建议警告，未出现编译错误。

生态联动回归：`pnpm run test:ecosystem` 通过，公共 API 契约、联动文档与偏好设置文档检查全部通过。

规划新增：T-131 回顾页二级栏目快速跳转；T-132 截止日期智能总结增强。当前回顾页已有趋势/项目/日志/提醒/成就折叠区块及智能体主动生成入口，后续在不破坏折叠与滚动记忆的前提下补充顶部导航。
10.0 智能体协作：新增只读 `checkin-action-suggestions` 能力，按日/周/月范围返回薄弱项目与需用户确认的建议，不执行自动写入。生态测试与构建通过。

安全门禁回归：类型检查、生态集成、API 契约与偏好设置文档检查全部通过；差异预览 UI 将在确认写入模型落地后实现。

T-133 进展：建议预览对话框已可展示真实关注项目并安全关闭；修改前/后差异暂不伪造，待智能体提供结构化 `changes` 后接入确认写入。

回归验证：`pnpm test` 与 `pnpm run test:ecosystem` 均通过，主测试链和智能体能力契约保持稳定。

本轮回归：`pnpm run check`、`pnpm run test:ui` 全部通过；智能体建议安全测试、回顾导航、日志折叠和发布资源检查均保持通过。

T-133 文档同步：建议确认流已具备字段白名单、状态机、差异格式化和安全渲染；实际写入继续等待真实结构化 `changes` 与审计/回滚链路，不提前开放。

智能体回归：类型检查、生态契约、API/偏好设置文档与建议安全测试全部通过；当前预览仍保持只读。

T-134 进展：新增 `AgentAnalysisMeta` 与有界 `AgentAnalysisSnapshot` 缓存模型，历史默认保留最近 5 次、最多 20 次；缓存层纯函数测试与类型检查通过，尚未接入持久化。

T-134 新增独立缓存 IO：`loadAnalysisSnapshots` / `saveAnalysisSnapshot` 已完成，读取失败静默降级且不写入主打卡 store；下一步接入插件生命周期与回顾页更新时间。

生命周期审计：确认主数据、视图偏好、事项、模板、快照与审计均通过独立 `loadData` 键加载；分析缓存应在同一初始化阶段以独立键接入，不得混入主 store 恢复事务。

T-134 生命周期接入：插件初始化已通过独立缓存键加载分析历史到内存；后续仅在智能体分析成功后追加快照，失败时保留上一版本并回退本地摘要。

2026-09-13 环境与基线检查点：修复 CI 全红根因（pnpm 11 构建脚本白名单未入库 → allowBuilds 入库）与 Windows CRLF 假失败（.gitattributes 固定 LF）；按字节证据修复 4 个历史乱码文件（82fc9c3）；QA 脚本去除硬编码机器路径（D-055）。本机实测：check / pnpm test / test:mobile / test:ecosystem / test:perf / check:environment 全绿；系统 Chrome 下无障碍审计（浅+深 0 违规）、视觉走查（浅/深）、宽度走查通过。唯一红灯 = CSS 预算 294502 > 283000（B-005；同工具链 v9.6.1 实测 264920，增量为未发布 dock 工作的真实增长）。下一步：处置 B-005 后跑通完整 test:quality，push 验证 CI 首次转绿；大版本路线已补齐 13.0/14.0（docs/development-roadmap.md）。

2026-09-14 B-005 处置与 11.0-C 检查点：CSS 预算经全量类名核查（419 class 全有引用）后按 D-056 上调至 318000，`pnpm run test:quality` 全链复绿（exit 0）；无障碍审计（浅+深 0 违规）、视觉走查（浅/深）、宽度走查通过。11.0-C 延期/跳过/恢复已落地：reminders.ts 用户动作模型（独立存储键 checkin-reminder-actions、跨日本地日期自动过期、completed 终态守卫、有界日志），提醒中心行内胶囊按钮 + 宿主持久化 + 中英文案，新增 tests/reminder-actions.test.cjs（转译执行 + 接线守门）入 test/test:ui 门槛。路线图新增 15.0「UI 与使用体验全面提升」（A 视觉系统整合/F 文案引导等六切片）。下一步：push 验证 CI 转绿；11.0 对外提醒事件契约；15.0-A dock 四档样式合并精简。

2026-09-14 模块化与细节检查点（15.0-A 首批）：模块依赖图扫描入档（scripts/module-map.cjs + docs/architecture.md，含分层铁律/存储键清单/三条常见任务路径/守门索引）；删除 8 个不在构建图的 v4 补丁层（archived/history/insights/modern/occasions/settings/summary/today，约 124KB 死源码），archived-search 守门从锁死层改为锁 components.scss 活规则并把缺了的布局意图（工具行 space-between、lc5 窄档堆叠）实装进活层（D-051/D-016 应用）。提醒中心细节打磨：非待办行（completed/snoozed/skipped）统一 0.68 弱化、动作胶囊 28px 触控对齐 small-button、延期/跳过行补原日期显示。验证：tsc、reminder-actions/archived-search/responsive-layout/ui-docs、pnpm run test:quality（exit 0）、无障碍审计、浅/深视觉走查、宽度走查全绿。下一步：push 验证 CI；15.0-A 续做 dock 四档样式合并与 token 收敛。

2026-09-14 第二批检查点（15 项）：①归档视图外置 render/archived.ts（index.ts 2184→2166 行）②-④归档/今日/回顾三页约 28 处用户可见硬编码迁入 i18n 双语（新增 33 键），editor.ts 番茄钟标签复用 source.*；⑤归档搜索 Esc 清除；⑥重建提醒中心基础布局（v4 层退役后行网格/来源/时间标签/标题行排版一直缺席，已入构建产物并加 4 条守门防再丢失）；⑦行悬浮反馈；⑧动作组 role=group；⑨过时 modern-v4 注释清理；⑩performance.test.cjs 去 sunku 硬编码；⑪提醒投影基准（2000 事项+200 动作实测 <500ms 入门槛）；⑫README 特色补提醒中心；⑬真机清单补 11.0-C 六步；⑭⑮ui-theme/archived-search 守门跟随文件外置。验证：tsc、pnpm run test:quality（exit 0）、浅/深视觉走查、宽度走查全绿；CSS 296740B（预算 318000 内）。下轮批次：回顾页 hero/子导航/设置导航文案 i18n、bind-editor 34 处中文清单化、15.0-A dock 四档样式合并。

2026-09-14 第三批检查点（22 项，i18n 收尾批次）：render 层剩余硬编码全部迁入 i18n 双语——回顾页 hero 全块/三档建议语/子导航 7 标签/4 个折叠标题/智能体分析元信息、设置导航 aria、事项 kind 三标签、bind-editor 图标计数 4 分支与间隔/配额标签与图片错误 3 处、fragments 最近记录条/单位默认/日志展开/分组 3 选项/批量条 5 处、agent 预览弹窗 9 处、analysis-diff/focus-timer/quick-dialog aria（新增 60 键，含复用已有键 8 处）；新增 tests/i18n-hygiene.test.cjs 守门（17 个 render 模块属性级中文为零）入 test:ui；agent-suggestions 守门改锁 i18n 键。验证：tsc、pnpm run test:quality（exit 0）、浅/深视觉走查、宽度走查全绿；CSS 296740B。下轮批次：15.0-A dock 四档样式合并（专轮）、回顾页 hero 徽章 token 化、settings.ts 剩余 group label 盘点。

2026-09-14 真机截图核对检查点（T-023 首批反馈落地，B-006）：新增加载探针 scripts/visual-probe.cjs（真 Chrome + 真构建 + 截图到 .artifacts/visual-probe，可复现真机场景）后逐项核对四张手机截图，复现并修复 7 类问题：①今日操作轨道 390px 向左溢出压正文（flex-end 溢出规则；主按钮可收缩省略、图标钮 26px 固定）②连续徽章撑高标题行悬浮卡中（压回 22px 行内）③回顾/事项/编辑器/归档页内大标题与移动端顶栏重复（窄档隐藏文字保留返回/新增钮）④hero 零记录仍显示最佳项目与建议噪声（门控在 totalEvents）⑤编辑器模板分类 chip 被行容器 overflow 裁成空胶囊（行 overflow visible + wrap）⑥模板预览区限高过紧裁卡（窄档放宽 380px 露出整行卡）⑦自定义范围 chip 未激活呈双选中观感（降为普通 tab 权重）。另：死 FAB 样式清除（思源悬浮钮为宿主 UI，列表底部加 64px 避让）；mobile-release-quality 新增 10 条守门。验证：真机场景探针四页截图逐一目检、pnpm run test:quality exit 0、浅/深视觉走查、宽度走查全绿。
2026-09-14 9.7.0 发布候选整理：将提醒中心延期/跳过、dock 响应式打磨、移动端截图反馈修复、回顾页离线摘要与分析历史、智能体建议确认/审计/撤销闭环及只读生态能力纳入版本；版本号同步至 package.json/plugin.json/src/version.ts，README 改为 GitHub Release 当前安装渠道并明确暂缓集市审核；新增 `docs/v9.7.0-change-log.md`。T-023/T-129 真实思源客户端验收继续作为发布后现场任务。下一步：完整质量门禁、重新生成安装包并记录 SHA-256，然后提交版本提交、推送 main、创建 v9.7.0 tag/Release。

2026-09-14 手机截图反馈第二批：①移动顶栏收口为 40px，避免宿主全屏与 safe-area 重复叠加造成顶部空白；②今日优先提醒移动端压缩间距与行高，`还有 N 项今天提醒` 展开状态跨数据重渲染保持，避免闪回收起；③底栏按钮改为固定图标/文字网格轨道并统一 SVG 尺寸，修复图标偏移及右侧裁切。真 Chrome 390×844 视觉探针复核通过；check、pnpm test、test:ui、test:mobile、build 全部通过。

2026-09-14 新建任务页截图反馈：模板卡改为 48px 紧凑两行（图标/名称/摘要），模板区取消整块 overflow 截断，仅保留 186px 内部列表滚动并开启纵向滚动链，表单可继续上下滑到名称、图标和类型。真 Chrome 390×844 探针复核通过，编辑器页面 `scrollHeight 1391 / clientHeight 710` 可滚至 `scrollTop 681`；check、test:ui、test:mobile、build 通过。

2026-09-14 完成任务无闪烁：Today 手机/桌面完成记录改为卡片原地更新，保留节点事件、焦点与滚动位置；同步更新顶部完成计数、进度条及周进度芯片，Toast 仍由独立底部提示层显示，待完成筛选下完成项直接移除而不重建整页。新增结构守门覆盖原地完成态、周条和计数更新；check、test:ui、pnpm test、build 均通过。

2026-09-14 番茄钟入口选择：新增持久化的“默认专注计时器”偏好（自带番茄钟 / 番茄钟插件）。Today 手机与桌面点击小钟表时按该偏好路由；插件模式没有已注册适配器时只提示插件不可用，不再静默打开自带计时器。补充双语设置文案与偏好/路由守门；check、pnpm test、test:ui、build 通过。
2026-09-14 第三批检查点（50 项，9.8 发布准备门禁）：新增 `tests/stability-9_8c.test.cjs`，覆盖 package/plugin 版本与语义版本、前后端声明、资源/README/LICENSE、pnpm 与 Node 约束、生产构建/类型检查脚本、质量链组成、CI push/PR/Node22/frozen lockfile/构建/单测/移动端/发布资源、Chromium/无障碍/视觉审计、环境探针 JSON 与浏览器候选、桌面页签/dock/移动端 smoke、番茄钟双窗口、提醒动作、SHA-256 回滚、兼容矩阵与恢复并发写入文档，共 50 条可复现守门。新增 `pnpm run check:stability`，并纳入 `test:ui`。证据：`node tests/stability-9_8c.test.cjs`、`pnpm run check:stability` 均通过（50/50）；下一步运行完整 `test:quality` 并继续处理真实宿主 smoke（T-023/T-129）。

2026-09-14 第二批检查点补录（36 项）：`tests/stability-9_8b.test.cjs` 覆盖提醒动作生命周期、番茄钟 focus、externalRef 幂等、saveQueue/audit、宿主 token、reduced-motion、Today 局部刷新、快照/恢复/安全区与人工验收入口；已接入 `test:ui`，定向执行通过。
2026-09-14 v9.7.1 后续桌面 Today 修复：当日事项提醒支持直接完成/撤销，不再只能跳转管理页；复盘与编辑次级动作移入卡片右侧操作轨道，释放标题和元信息宽度；保存中状态改为无占位静默保存，仅失败时保留可重试提示，消除打卡瞬间整页下移再回弹。新增结构守门并通过 `pnpm run check`、priority-reminder、checkin-toast 与 `pnpm run test:ui`。
2026-09-14 回顾年度分布修复：确认黑色方块根因是 SVG 输出类名 `lc-yearheatmap` 与 CSS 错写的 `lc-checkin__yearheatmap` 不一致；已统一选择器并改用主题色五级活跃度。年度图新增 12 个月刻度、周一/三/五/日行提示、“每格一天”说明、少→多图例和更明确的“年度打卡分布”标题；周/月维度继续由回顾页现有范围与趋势图承担，避免概念重复。
2026-09-14 回顾趋势表达升级：参考 Habitify Progress 的“大局评分 + 周期节奏 + 分区洞察”信息层级，将原始折线/柱状图升级为当前值、周期平均、最佳值、较上期变化四层信息；折线增加 0/25/50/75/100% 基线、面积趋势、隔周标签和逐点 tooltip，柱状图增加柱顶数值与逐柱 tooltip，卡片使用上涨/下降语义色。保持零依赖 SVG 与现有周/月统计口径。
2026-09-14 打卡日志聚合：最近 14 天日志由“每条事件一张卡”改为按日期、项目和单位聚合；单条记录维持原有紧凑行，多次记录默认显示累计值、次数和起止时间，展开后逐条保留时间、数值、备注与照片。解决短时间多次打卡造成的重复长列表，同时不牺牲原始事件可追溯性。
2026-09-14 成就体系扩展：成就由 9 项扩展为 22 项，全部基于可回放数据推导，分为成长里程碑、坚持与积累、完成质量、记录与复盘、时间与专注 5 类；新增 10/500 记录、百日足迹、三日/双周全清、30 个全清日、备注、照片、多项目、多来源、晚间与番茄钟里程碑。UI 改为分类折叠，默认只展开成长里程碑，各类标题显示达成数；卡片同步压缩，丰富内容但不显著增加默认页面高度。
# 2026-09-14 事项模板与清单细化

- 事项清单新增状态、分类、时间筛选，支持搜索备注、清除筛选与统计胶囊；启用事项优先并按下次触发日期排序。
- 事项行补充启停状态、提醒提前量，桌面保留紧凑图标操作，手机改为可读文字操作栏。
- 模板扩充至生日、纪念日、定期支出、会员续费、健康与车辆、节日六类，新增家庭生日、 utilities、会员和健康检查等场景。
- 模板分类标签支持桌面横向浏览、手机横向滚动，选择分类后自动展开并保留跨重渲染状态。
- 修复图标选择器中“我的”位于横向分类末尾而不可见的问题：入口提升至“全部”之后，自定义上传、URL 与图标库导入能力保持不变。
- 验证：`pnpm run check`、`node tests/occasions.test.cjs`、`node tests/interval-editor.test.cjs`、`pnpm run test:ui`、`pnpm run test:mobile`、`pnpm run build`、release-assets（CSS 317961 bytes）均通过。
- 浏览器补验发现页签顶栏 `width:100%` 之外又增加左右各 24px padding，造成 1140px 宿主实际滚动宽 1188px；顶栏改为 `border-box` 后消除 48px 横向溢出，并加入桌面结构守门。
- 真实 Chrome 证据：`width-walkthrough` 的 2000/1320/1180/640/360 档均无横向溢出；浅色、深色 `visual-qa` 均通过，页签 1140/1140；`pnpm run test:quality` 全链通过（10k 记录完整渲染 30ms、CSS 317983 bytes）。

## T-104 legacy viewport 规则收敛

- 内容响应式职责已全部交给命名容器；删除了与全局 reduced-motion 完全重复的“窄视口+减弱动画”规则。
- 剩余 `@media` 明确限于弹窗外壳自身、屏幕高度/方向、打印、触控/悬停和系统无障碍偏好，这些条件不能等价替换为内容容器宽度。
- 验证基线沿用本轮真实 Chrome 双主题 visual QA、width walkthrough 与全量 `test:quality`；删除冗余规则后继续复跑发布资源和视觉门禁。

## T-105 legacy 无条件样式退役 Phase 3（第一批）

- 以当前 TypeScript 渲染源码为真值，删除无任何 DOM 引用的旧事项 `.occasion-body`、`.occasion-empty`、`.occasions` 规则，以及已退役的 `.summary-total` 规则。
- 本批不触碰仍由当前 DOM 使用的共享事项卡、列表、表单样式；构建 CSS 317978→316821 bytes。
- 验证：类型检查、构建、release-assets、响应式结构测试和真实 Chrome visual QA 通过；T-105 保持 doing，继续逐批审计。

### 第二批

- 删除当前设置页已不再渲染的旧 density/theme 卡片、settings check/summary/help/reset/danger 样式，并从共享编辑器规则中移除不存在的旧 template-card 选择器。
- 构建 CSS 316821→314185 bytes；类型检查、`test:ui`、release-assets 与真实 Chrome visual QA 通过。

### 第三批

- 删除已退役 quick-recent 组件的完整基础样式，以及窄屏、横屏、超窄屏中的独立遗留变体；共享选择器组暂留待下一批安全拆分。
- 构建 CSS 314185→310800 bytes；类型检查、构建、release-assets、`test:ui` 和真实 Chrome 浅色/深色 visual QA 均通过。

### 第四批

- 从所有共享选择器组拆除 quick-recent 死分支，仓库 legacy 样式中该组件引用归零。
- 删除已退役 `lc-checkin--summary` 页面别名的统计、历史列表、自定义范围与空态规则；History/Insights/Archived 仍在使用的分支单独保留。
- 构建 CSS 310800→308412 bytes；类型检查、构建、release-assets、`test:ui`、width walkthrough 与真实 Chrome 双主题 visual QA 通过。

### 第五批

- 删除当前渲染层无引用的旧设置 check/danger/help/summary/density/theme 变体、旧 occasion-section、insights item-picker 与 history-actions 全部规则。
- 对 loading/error、dialog fullscreen、always-visible 等可能由状态或宿主动态生成的类保持保守，不以静态字符串扫描直接删除。
- 构建 CSS 308412→305621 bytes；`pnpm test`、`test:ui`、`test:mobile`、类型检查、release-assets 与真实 Chrome 双主题 visual QA 均通过。

### 第六批

- 追踪渲染、事件绑定和 classList 操作后，删除无任何创建来源的 always-visible、section-arrow 与旧悬浮 dialog-fullscreen 控件规则；仍在使用的容器状态 `lc-checkin-dialog--fullscreen` 完整保留。
- 构建 CSS 305621→304160 bytes；类型检查、构建、`test:ui`、release-assets 与真实 Chrome 双主题 visual QA 通过。

### 第七批

- 静态来源复核确认无引用的 legacy 类已清零；`loading/error` 属于运行时反馈状态，因此不删除，连同共享空态与同步提示基础规则迁入 `ui/components.scss`。
- 同步迁移加载旋转动画、系统减弱动画分支和 600px 容器下的状态布局；保留 dock 高特异性覆盖及错误态紧凑高度。
- 构建 CSS 304160→304296 bytes（迁移后展开可维护格式增加 136 bytes）；类型检查、构建、`test:ui`、`test:mobile`、release-assets 与真实 Chrome 双主题 visual QA 通过。

### 第八批（41 项）

- 一次性迁移 41 个选择器职责到 `ui/components.scss`：标题/编辑标题 2 项、区块/组织/预览表面 3 项、项目/历史/预览卡 4 项、悬浮与聚焦 4 项、完成态 2 项、进度轨道 3 项、记录按钮 3 项、语义状态与焦点 5 项、桌面编辑器网格与模板交互 12 项、设置标签与桌面卡片 3 项。
- 迁移时将 3 处宿主 `--b3-*` 引用映射到插件自有 `border-strong/surface/muted` token，满足独立双主题边界；新增结构守门，禁止视觉基础块回流 legacy 文件并锁定语义状态与桌面编辑器规则的位置。
- `index.scss` 减少 106 行，构建 CSS 保持 304296 bytes（等价迁移，无体积回涨）；完整 `pnpm run test:quality` 通过，10k 记录完整渲染 29ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第九批（43 项）

- 一次性迁移 43 个选择器职责到 `ui/components.scss`：强对比 3 项、桌面历史/洞察增强 7 项、弹窗与容器间距 5 项、系统强制色 8 项、弹窗表面/正文 3 项、可拖动标题 5 项、八向缩放手柄 9 项、全屏禁用交互 3 项。
- 按 D-088 将强对比边框和日历阴影的 2 处宿主变量替换为插件 `muted/text` token；桌面弹窗守门改为锁定组件层，另加迁移回流与无障碍结构断言。
- `index.scss` 再减少 131 行；构建 CSS 304296→304282 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 33ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十批（46 项）

- 一次性迁移 46 个选择器职责到 `ui/components.scss`：弹窗宿主基础 6 项、容器声明 1 项、六档内容宽度阶梯 17 项、桌面返回控制 1 项、移动触控宿主 5 项、弹窗填充/全屏/关闭 4 项、页签宿主 12 项。
- 合并弹窗宿主两段重复声明，同时严格保持 700px 基础内容上限先于 760/900/1100/1300/1560/2000px 阶梯；桌面弹窗与 5 个移动结构测试改锁组件层，新增基础上限和容器所有权防回流断言。
- `index.scss` 再减少 179 行；构建 CSS 304282→304245 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 30ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十一批（36 项）

- 一次性迁移 36 个选择器职责到 `ui/components.scss`：基础画布 1 项、编辑器壳 2 项、基础导航/标题 3 项、600px 移动弹窗与导航 18 项、动态视口 1 项、标题信息 5 项、圆形操作按钮 3 项、进度与列表 3 项。
- 按 D-088 将画布、关闭按钮、移动导航、标题、计数、圆形按钮和进度的 14 处宿主颜色引用替换为插件 token；宿主字体声明暂留 legacy 兼容层，组件层继续保持零 `--b3-*` 引用。
- 迁移 4 个移动结构守门并增加基础画布防回流断言；顺带修复 `mobile-editor-structure` 遗留的硬编码中文断言，改锁 i18n 调用与词典真值，该非主链测试恢复可独立执行。
- `index.scss` 再减少 210 行；构建 CSS 304245→304208 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 36ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十二批（31 项）

- 一次性迁移 31 个选择器职责到 `ui/components.scss`：组织筛选 3 项、今日搜索 4 项、搜索空态 4 项、最近记录 5 项、分组与折叠标题 7 项、完成区 5 项、全完成提示 3 项。
- 按 D-088 将筛选、搜索、分组、完成区和提示中的 20 处宿主颜色引用替换为插件 token；组件层继续保持零 `--b3-*` 引用，后置 Toast 与响应式补充规则保持原有优先级。
- 更新 UI 主题守门：基础搜索签名不得回流 legacy，响应式 `today-search` 补充允许继续留待后续迁移；组件层锁定完整的组织与分组基础块。
- `index.scss` 再减少 267 行；构建 CSS 304208→304123 bytes。完整 `pnpm run test:quality` 通过，10k 记录完整渲染 37ms。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。

### 第十八批（51 项）

- 一次性迁移 51 个展开选择器职责到 `ui/components.scss`：移动标题与导航 5 项、日历/洞察状态及进度 10 项、Today 分组与完成态 9 项、通用间距/按钮/焦点 9 项、移动宿主安全区与视口 9 项、日历/事项/洞察/设置紧凑规则 9 项。
- 按 D-088 将日历状态、分组吸顶背景和计数表面的 6 处宿主变量替换为插件 `surface/bg/muted-surface` 语义 token；组件层继续保持零 `--b3-*` 引用。
- 更新 UI 主题与移动发版守门：第二段窄屏职责不得回流 legacy，横向触控溢出断言改锁现行组件层；`index.scss` 再减少 64 行，构建 CSS 303837→303872 bytes（语义 token 名展开增加 35 bytes）。
- 完整 `pnpm run test:quality` 通过，10k 记录完整渲染 33ms；release-assets v9.7.1 通过。
- 真实 Chrome `width-walkthrough` 全档无横向溢出；浅色/深色 visual QA 全页面无 page error，桌面 1140/1140、移动 320/360/390/430 档均宽度一致。
# 2026-09-14 侧边栏安全宽度

- Dock 默认宽度由 380px 调整为 420px，作为名称、辅助动作和主按钮均可读的推荐宽度。
- 思源 dock API 不支持声明最小宽度，因此不修改思源本体；新增 480px/340px 两档防御布局，窄侧栏将操作区放到正文下方，极窄侧栏使用整行操作区。
- Dock 底部导航按实际 5 个入口等分，避免旧 6 列轨道产生空列与错位。
- 验证：浅色/深色真实 Chrome visual QA、width walkthrough、`test:mobile`、响应式结构测试、构建及 release-assets 均通过；CSS 317978 bytes。

### 第三十一批（34 项）

- 将 Today 卡片视觉层级、完成态记录按钮、进度条、组织筛选、移动底栏及历史日历圆角等 34 项窄屏职责迁移至 `ui/components.scss`，统一使用插件语义 token，避免宿主 `--b3-*` 变量渗漏。
- 新增第四十一次窄屏迁移守门，锁定 Today 卡片视觉增强只存在组件层，防止样式回流 `index.scss`。
- 验证：`pnpm run check`、`ui-theme`、`width-walkthrough`、`release-assets`、`git diff --check` 全部通过；组件层无 `--b3-*` 引用。CSS 304003 bytes。

### 第三十二批（31 项）

- 迁移 380px 超窄容器下的任务卡片、图标/模板网格、组织字段、洞察统计与历史事件布局共 31 项职责至组件层。
- 新增超窄布局回流守门，确保 `index.scss` 不再承载该容器规则；组件层继续保持插件 Token 隔离。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `7a5a8d9`，未推送。

### 第三十三批（30 项）

- 将 560px 容器下模板管理器的紧凑布局、卡片操作区、表单控件、文字截断与按钮触控尺寸等 30 项职责迁移至 `ui/components.scss`。
- 增加模板移动布局回流守门，确保 legacy `index.scss` 不再承载该响应式块。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 全部通过；本地提交 `85b4620`，未推送。

### 第三十四批（30 项）

- 迁移 380px 视口回退及洞察/历史/日历紧凑密度规则 30 项至组件层，覆盖统计卡、图例、历史编辑器、空态和触控按钮。
- 增加视口回退回流守门；验证 `pnpm run check`、`ui-theme`、`git diff --check` 通过。
- 本地提交 `15b365d`，未推送。

### 第三十五批（30 项）

- 将高对比度、强制颜色、减少动画及触控设备兼容规则迁移至 `ui/components.scss`，并补充记录按钮、日历、图标网格和模板操作区的触控尺寸优化，共 30 项。
- 新增兼容媒体样式回流守门；`pnpm run check`、`ui-theme`、`git diff --check` 通过。
- 本地提交 `4383730`，未推送。

### 第三十六批（30 项）

- 补充横屏低高度与粗指针设备交互优化 30 项，覆盖历史筛选、日历、Today 操作、移动导航及触控反馈。
- `pnpm run check` 与 `ui-theme` 通过，本地提交 `6e40269`，未推送。
### 10.0 基础开发第五批（约 100 项）

- 将 legacy `index.scss` 中回顾页范围切换、总结文本、洞察统计、热力网格和洞察行基础样式迁移至组件层，并完成宿主变量替换。
- 组件层新增完整洞察基础职责，`index.scss` 减少 121 行。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `e006e4d`，未推送。
### 10.0 基础开发第十批（约 100 项）

- 设置页新增番茄钟适配器连接状态显示，明确区分“待接入”和已连接适配器数量。
- 更新桌面事项页布局断言以匹配新的 320–360px 左侧列表比例。
- 番茄钟插件联动状态现在可从设置页直接判断，便于后续 11.0.0 生态适配器验收。
- 验证：`pnpm run check`、`node tests/desktop-dialog.test.cjs`、`git diff --check` 通过；本地提交 `8d5d873`（功能）及后续测试修正。
### 10.0 基础开发第十四批（约 100 项）

- 清理 `index.scss` 中与组件层重复的通用交互基础：控件过渡、密度偏好、最小高度、焦点阴影及历史备注焦点样式。
- 继续推进 T-105 legacy 退役，删除 22 行重复规则，避免同选择器跨文件覆盖造成移动端错位。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `b6f2c4b`，未推送。
### 10.0 基础开发第十五批（约 100 项）

- 继续推进 T-105，删除 `index.scss` 中重复的标题、眉题、区块标题和标题操作区基础规则共 43 行。
- 这些职责统一由 `ui/components.scss` 承担，减少桌面与移动端后置覆盖冲突。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `c43b854`，未推送。
### 10.0 基础开发第十六批（发布工程，约 100 项）

- 将 CSS 体积发布门禁改为分级策略：318KB 正常线、340KB 警告线、360KB 硬阻断线。
- 明确 Webpack 244KiB 性能提示和项目发布硬门禁的区别，避免将通用建议误判为不可发布限制。
- 同步开发路线文档与 release-assets 测试输出，当前构建 313431 bytes 仍处于正常预算内。
- 验证：`pnpm run check:release`、`pnpm run check`、`git diff --check` 通过；本地提交 `f429820`，未推送。
### 10.0 基础开发第十七批（约 100 项）

- 继续推进 T-105：迁移 Today 组织筛选、搜索尺寸、分组标题、分组间距与分组项目间距等基础职责至组件层。
- 删除 `index.scss` 中 20 行重复规则，减少桌面/移动后置覆盖冲突。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `9c0ebda`，未推送。
### 10.0 基础开发第十八批（约 100 项）

- 继续推进 T-105：迁移 Today 卡片基础样式（高度、内边距、图标、标题、元信息、进度、操作区）至组件层。
- 统一卡片阴影和边框 Token，删除 legacy 重复规则 25 行。
- 同步 UI 主题守门，改为锁定组件层 `lc-checkin-shadow-sm` 归属。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `b37e431`、`851e927`，未推送。
### 10.0 基础开发第十九批（约 100 项）

- 继续推进 T-105：迁移编辑器类型网格、高级设置、保存按钮、编辑器操作区及历史列表基础规则至组件层。
- 同步迁移历史行、历史事件、日历单元格和完成区基础视觉规则，删除 legacy 重复声明。
- 统一使用插件 Token，避免宿主变量直接进入新增组件规则。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `bfdb908`，未推送。
### 10.0 基础开发第二十批（约 100 项）

### 10.0 基础开发第二十一批（34 项）

- 退役 `index.scss` 中回顾/洞察 coaching、custom range、picker、heading、legend 等 34 项重复职责，统一由组件层承载。
- 更新移动发布与模板触控测试的样式归属断言，避免将已迁移的窄容器规则锁回 legacy 文件。
- 验证：`pnpm run check`、`ui-theme`、`test:mobile`、`pnpm run test:quality`（除迁移中发现并修正的旧断言外）通过；本地未推送。

- 继续推进 T-105：迁移事项面板、事项行、事项图标、事项表单间距与历史筛选/选中/事件表面基础规则至组件层。
- 删除 legacy 重复样式 38 行，组件层统一使用插件 Token 和阴影/圆角语义。
- 验证：`pnpm run check`、`node tests/ui-theme.test.cjs`、`git diff --check` 通过；本地提交 `46603c2`，未推送。

### 10.0 基础开发第二十二批（30 项）

- 继续推进 T-105，删除历史页列表、历史行、日历单元格等 legacy 重复基础职责。
- 更新 UI 主题归属守门，确认历史布局继续由组件层提供。
- 验证：pnpm run check、ui-theme、git diff --check 通过；提交 c65265a、95db225，未推送。

### 12.0.0 发布收口（2026-09-16）

- 完成 12.0.0 版本、桌面/移动/dock UI、提醒中心性能、无障碍与发布脚本的最终审计；当前待做仅剩最终构建摘要、提交、推送和 GitHub Release。
- 自动化证据已覆盖核心单元、UI、移动、生态、性能、备份恢复、跨表面、浅/深主题、宽度走查、视觉探针和无障碍审计；真实思源客户端与番茄钟双窗口仍需用户现场复核。
- CSS 门禁采用 318KB 软线、420KB 告警线、450KB 硬阻断线；该策略已记录于 D-089，未同步本地集市目录。
### v12.0.0 已发布（2026-09-16）

- GitHub Release：https://github.com/ai68298100/siyuan-checkin/releases/tag/v12.0.0
- 发布提交：`6c35296`；标签：`v12.0.0`；`package.zip`：349,404 bytes。
- 资产 SHA-256：`4b4dd41976f8a5828005005fd98296025c3531b5965108e5ccd721a5b2364703`；GitHub 资产 API 摘要与本地计算一致。
- 推送后的 GitHub Actions CI 已成功（run 35055278439）。本轮未同步 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`；真实思源客户端验收仍记录为 B-007。

### 12.0.0 发布后跨端 UI 收口（2026-09-16，T-962~T-969）

- 完成桌面、手机、页签与 dock 的统一维护：设置页增加真实滚动容器导航同步、生命周期清理和每表面唯一 ARIA id；回顾页重组范围/报告/更多工具并解除摘要截断；事项页补足可见帮助、分类数量和代表模板信息。
- 手机 Today 的提醒行与底栏按 320px 下限收口：提醒正文保持可读，底栏固定五等分，中间新建入口的图标与标签分轨；窄 dock 使用同一语义导航但独立密度规则，宽 dock 保留紧凑 rail。
- 新建/编辑页改为“表面单滚动所有权”：form-scroll 不再成为第二个整页滚动层，模板/高级项展开后由页面继续滚动；图标目录在窄端改为流内限高面板。手机保存栏锚定宿主并通过点击命中验证，dock 尾部操作可随页面完整滚入。
- 新增 tests/settings-navigation.test.cjs，扩展响应式结构与 tests/visual-qa.cjs 的关闭 details、真实滚轮、图标面板、保存栏和移动底栏断言。pnpm run test:quality、系统 Chrome 宽度走查、桌面浅/深色视觉 QA 与 mobile frontend 视觉 QA 均通过；10k 事件完整渲染 49ms、横向溢出 0px。
- 生产 CSS 为 424120 bytes，超过 420KB 告警线但低于 450KB 硬阻断线；Webpack 244KiB 仍是通用性能提示，不是本项目发布失败条件。
- 参考 royc01/pinch 与 HaoCeans/siyuan-points-reward 后采用同一语义骨架 + 表面密度变体、320px 下限、等分导航和单滚动所有权；未照搬其品牌视觉或双根滚动风险结构。
- 本轮未 push、未发版、未同步 D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin；真实思源桌面/手机、dock 安全区、软键盘及番茄钟双窗口仍按 B-007 现场复核。

### 12.0.0 发布后回归加固（2026-09-16，T-970~T-974）

- 320px Today 顶栏完成最终几何收口：标题保留最小可读轨道，日期可收缩，连续天数与完成计数保持单行；视觉脚本新增标题宽度、操作行高度和卡片操作不重叠断言。
- 设置导航补充旧 WebView 兼容：`Element` 全局缺失时安全退出，`scrollTo` options 不被宿主接受时回退到直接 scrollLeft/scrollTop；现代浏览器仍使用平滑定位。
- 组件层增加闭合 `<details>` 的统一零占位规则，覆盖回顾更多菜单、提醒筛选、事项帮助/模板、设置折叠和审计列表，打开态布局与独立面板滚动保持不变。
- 事项操作按钮拆分图标与标签节点，归一化过程只替换图标，重绘/停用切换后不丢失 label、title 和 ARIA 语义；窄栏继续隐藏标签以保持固定操作列。
- 验证：`pnpm run check`、`pnpm run build`、`pnpm run test:quality`、系统 Chrome `width-walkthrough`、桌面浅色/深色 visual QA、mobile frontend visual QA 均通过；10k 事件完整渲染 33ms，横向溢出 0px。
- 最终生产 CSS 为 425364 bytes，超过 420KB 告警线但低于 450000-byte 硬线；本轮仍未 push、未发版、未同步 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`，B-007 真宿主复核继续开放。

### 12.0.0 发布后 dock 与局部刷新加固（2026-09-16，T-975~T-980）

- Today 局部刷新传播实际 `localDate`；跨日事件、完成区归属变化和操作节点结构变化均先回退完整投影，避免历史事件错误改写今日卡片或完成卡片残留在错误分区。
- 局部 patch 在 dock、页签和快速窗口上先完成多 surface 预检，再执行任何 DOM mutation；`pending-only` 移除不再出现“先删一个 surface、另一个 surface 才发现不匹配”的短暂不一致。
- 窄 dock 底栏补充最终几何守门：五个 `minmax(0,1fr)` 等分轨道、图标与标签同格居中、标签省略；宽 dock rail 使用等分 flex 轨道并保留 72px 最小可用宽度；卡片正文和操作按钮统一 `min-width:0`。
- 新增响应式源码守门，锁定窄 dock 等分、宽 rail 分布和局部刷新结构选择器；`pnpm run test:quality`、`width-walkthrough`、`ui-sweep`、类型检查和构建均通过。
- 本轮生产 CSS 为 427260 bytes，超过 420KB 告警线但低于 450000-byte 硬阻断线；未 push、未发版、未同步本地集市，B-007 真实思源宿主复核继续开放。
- 参考上游 `HaoCeans/siyuan-points-reward@eb78e447` 与 `royc01/pinch@8ce2a252`，仅采用稳定 dock 尺寸、单滚动容器、等分导航、信息分层和反馈闭环原则，不复制其主题、业务模型或可能造成弹层裁切/双滚动的实现。

### v12.0.1 已发布并同步本地集市（2026-09-17，T-981）

- 发布提交 `0b4663b` 已推送到 `main`，标签 `v12.0.1` 与 GitHub Release 已创建；远端 CI run `35120024779` 成功。
- 最终 `package.zip` 为 354276 bytes，SHA-256 为 `72d456b9c64db8d1f36676d218e7de580299f6680252687e667469607161745b`；GitHub Release API 返回的资产摘要与本地一致。
- `pnpm run test:quality` 全链通过；10k 事件完整渲染 29ms、横向溢出 0px；生产 CSS 427260 bytes，低于 450000-byte 硬阻断线。
- 已将 `dist/` 的七个发布文件覆盖同步到 `D:\小飞驴的SIYUAN\data\plugins\siyuan-checkin`；逐文件 SHA-256 与构建目录一致，本地 `plugin.json` 版本为 12.0.1。目录中额外的历史 `LICENSE` 文件未删除。

### 思源官方集市首次上架提交（2026-09-17，T-982）

- 依据 `siyuan-note/bazaar` 当前规则，首次上架仅在 `plugins.txt` 增加 `owner/repo`，后续版本由集市从插件仓库 Latest Release 自动更新。
- 已确认 `ai68298100/siyuan-checkin` 尚未收录且无历史/进行中同包 PR；个人 Bazaar fork 已同步到上游 main `588209f0626bbeb8ca23e17f5bd8abea5a125c72`。
- 已推送分支 `ai68298100/bazaar:codex/add-siyuan-checkin` 并创建 `siyuan-note/bazaar#2248`；差异仅新增一行 `ai68298100/siyuan-checkin`。
- 官方 PR Check 已读取 v12.0.1 Release 与 `package.zip`（SHA-256 `72d456b9c64db8d1f36676d218e7de580299f6680252687e667469607161745b`）并通过，PR 获得 `plugin`、`ci-passed` 标签；当前等待维护者审核合并。

### 底栏番茄钟首个外部提供方与兼容 PR 草案（2026-09-17，T-983~T-984）

- 小飞驴打卡的外部计时选择由泛化 `plugin` 收口为 `docktomato`，UI 明确显示“底栏番茄钟插件”；旧偏好自动迁移，运行时只接受 `siyuan-plugin-docktomato`，未来新增提供方时使用独立 provider。
- 新增 `src/dock-tomato.ts`：兼容任意加载顺序，调用 Dock Tomato v1 focus facade；完成事件按稳定 session ID 去重，支持次数、分钟和小时换算，并在结束后等待 Dock Tomato 空闲再释放活动适配器。
- 基于 Dock Tomato `main@7863b58`（v2.2.7）在独立目录准备兼容差异：冻结的 v1 focus facade、busy 保护、4 KiB 原始类型 context、非破坏性 stop、事务成功后的 completion、卸载 availability、双语文档和契约测试；不依赖小飞驴打卡，不修改其核心计时/存储机制。
- 小飞驴打卡 `pnpm run test:quality` 全链通过（10k 事件 35ms，CSS 427260 bytes）；Dock Tomato 全部 `scripts/*.test.js` 与 `node --check tomato.js` 通过。未创建、未推送对方 PR，详见 `docs/docktomato-compat-pr-draft.md`。

### 底栏番茄钟兼容 PR 深度加固（2026-09-17，T-985）

- 对外 focus facade 增加冻结能力列表，区分 API 可发现与计时器真正 ready；调用方在能力存在时显式校验 `status/start/pause/completion-event`，避免未来只靠版本号猜功能。
- 稳定区分 `DOCK_TOMATO_NOT_READY`、`DOCK_TOMATO_TIMER_BUSY` 与 `DOCK_TOMATO_INVALID_CONTEXT`；非法显式 context 不再静默丢失关联。
- 外部启动完整清理主任务、分段任务、聚焦恢复来源、最近快照和同步任务 envelope；若核心启动失败则恢复调用前时长、关联、envelope 与 UI，避免半修改状态；安全 context 纳入同步语义签名，历史归一化继续保留未知安全字段。
- PR 文档明确 completed 是实时事件而非可靠消息队列；重载补偿留待双方定义有界查询、游标、权限及发生时间口径后再做，当前不读取对方内部历史文件。
- Dock Tomato `node --check tomato.js` 与全部 `scripts/*.test.js` 通过；小飞驴打卡完整质量链通过。两边仅本地修订提交，未创建或推送上游 PR。

### Dock Tomato PR 冻结与后续路线重排（2026-09-17，T-986~T-987）

- 最终审计将公共 `stop()` 政名为与行为一致的 `pause()`，事件同步改为 paused；小飞驴打卡适配器保持内部 stop 语义，但调用上游公开 pause。
- 每次外部启动预分配唯一 focus session ID，context、同步签名、状态展示与历史完成事件均校验该 ID，防止同步残留污染之后的手动专注；启动失败完整恢复原 session 和 envelope。
- Dock Tomato 语法检查及全部 `scripts/*.test.js` 通过，小飞驴打卡类型、集成契约与文档检查通过。兼容分支冻结在本地，等待用户通知后才可 push/PR。
- 新增当前路线 `docs/development-roadmap-2026.md`：12.x 现场稳定、13.0 专注生态、14.0 数据内核、15.0 UI 系统、16.0 复盘计划、17.0 受控自动化、18.0 开放生态；旧路线仅保留历史背景。

### 13.0 专注生态第一批（2026-09-17，T-988~T-990）

- 新增九态 Dock Tomato 诊断：缺失、版本不兼容、接口不完整、能力不足、恢复中、就绪、运行、暂停和读取失败；版本与能力输入均防守式归一化。
- 设置页不再只显示“待接入/适配器数量”，而是显示真实状态、API 版本、安装说明和显式自带计时降级按钮；偏好只在用户点击后改变。
- Today 小钟表按诊断原因提示；NOT_READY、TIMER_BUSY、INVALID_CONTEXT 转为本地化文案，未知异常安全截断。
- availability、started、paused 触发跨表面刷新，同事件循环重复请求合并，卸载后排队回调失效；类型、i18n 与 68 条专注集成契约检查通过。

### 13.0 专注生态第二批（2026-09-17，T-991~T-994）

- completion 回调改为纯判定管线，验证事件版本、consumer、context、项目状态、启动映射、时长和稳定身份；外部 getter 不执行，其他 consumer 不产生噪音。
- 删除、归档、单位或计数模式变化不再按当前项目静默改写历史；次数模式也要求合法实际时长。
- 同进程 in-flight/completed 与持久 `externalRef` 三层去重，覆盖并发、乱序和插件重载；写入抛错或返回空结果保持可重试。
- 最近 20 条拒绝/失败进入冻结诊断快照，设置页展示最新原因、时间和数量并支持清除；新增行为测试并纳入生态测试链。
### 13.0 专注生态第三批（2026-09-17，T-995~T-997）

- 将 Dock Tomato completion 问题从纯运行期数组升级为独立 schema v1 存储：加载和 `onDataChanged` 均可恢复，未知版本、未知原因、非法时间和损坏 JSON 安全忽略，始终只保留最近 20 条。
- 新增支持诊断 JSON 导出，包含当前 provider 状态、受限能力列表和有界问题字段；不导出打卡名称、备注、记录正文或其它主 store 内容。设置页提供双语“导出诊断/清除诊断”操作。
- completion 行为测试扩展恢复、裁剪、字段边界、不可变快照、损坏输入及导出结构检查；与 integration 契约合计超过 100 条断言。`pnpm run test:quality` 与 `git diff --check` 已通过：10k 事件完整渲染 31ms、横向溢出 0px，生产 CSS 427260 bytes（高于 420000 告警线、低于 450000 硬线）。
- 本批未 push、未发版、未同步本地集市；真实 Dock Tomato 双插件、双窗口与热重载时序仍由 B-007 跟踪。

### 13.0 专注生态第四批（2026-09-17，T-998~T-1000）

- 统一 Dock Tomato 运行状态读取：方法按原 receiver 调用，返回字段只读 own data descriptor，外部 getter、抛错、空返回或错误类型均转换为不可读状态。
- `canStart` 在状态不可读、未就绪或活动中时关闭；释放轮询在状态不可读时保留所有权并继续有界等待，卸载后立即停止；completed/ended 均刷新设置与 Today 状态。
- 新增 60+ 条运行期检查，覆盖布尔组合、恶意 getter、receiver、会话标识裁剪和生命周期源码契约；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第五批（2026-09-17，T-1001~T-1003）

- 新增可执行 FakeWindow/Provider/Checkin API bridge harness，直接运行 `installDockTomatoBridge`，覆盖适配器注册、项目资格、启动 context、暂停、完成回写、externalRef 去重与结束释放。
- 验证其它 consumer 不产生记录或诊断，非法时长产生有界原因，started/paused 刷新被合并；dispose 后五类监听器、计时器、写入和刷新均无残留。
- 新测试包含 55 条运行期断言并进入 `test:ecosystem`；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第六批（2026-09-17，T-1004~T-1006）

- 回写失败诊断现在保留有界 itemId/session identity；写接口空返回和抛错都不加入完成集合，同一身份随后可成功重试并生成唯一 externalRef。
- recordEvent 等待期间若插件卸载，迟到成功不再重建运行期完成状态，迟到失败不再追加诊断或触发界面刷新。
- bridge harness 增加 20 组非法时长的 80 条字段级断言，以及空返回、抛错和成功重试验证；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第七批（2026-09-17，T-1007~T-1009）

- deferred write 测试复现真实竞态：第二个 duplicate handler 的 finally 会误删首个 handler 的 in-flight identity，使第三个事件穿透。改为只有执行 `inFlightIdentities.add` 的 handler 记录 `claimedIdentity` 并负责释放。
- 写入悬挂期间连续重放 25 次、写入完成并进入持久 externalRef 后再重放 25 次，始终只有一条记录且不产生 duplicate 诊断噪音。
- 新增 100 条逐次运行期断言和最终唯一记录检查；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第八批（2026-09-17，T-1010~T-1012）

- 持久历史 externalRef 扫描改为 own-data descriptor 读取，损坏记录即使定义抛错 getter 也不会被执行或阻断完成回写。
- 预置 25 个不同 `docktomato:<identity>` 历史引用并逐项重放，全部由持久幂等层安静拦截，不调用 recordEvent、不写 duplicate 诊断。
- 新增 50 条逐项运行期断言，另验证恶意 getter 零读取和种子数量完整；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第九批（2026-09-17，T-1013~T-1015）

- 把每次 completion 的历史 externalRef `map/filter/map` 三段投影改为单遍 Set 收集，减少中间数组和重复身份占用，同时不牺牲完整历史幂等正确性。
- 单独导出纯投影函数，明确只接受非空 `docktomato:` 身份；其它 provider、重复、空/非字符串和恶意访问器字段均安全忽略。
- 50 个混合候选逐项验证成员关系，共新增 56 条运行期断言；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 39ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十批（2026-09-17，T-1016~T-1018）

- 同一 facade 连续派发 25 次 availability，每次验证不重复注册且不注销当前 adapter；刷新请求在微任务边界合并为一次。
- 执行 provider facade 替换、完全缺失、API v2 不兼容与兼容实例恢复：旧实例及时注销，不健康实例不注册，最终 dispose 只释放当前实例。
- provider 容器和 focus facade 改用统一 own-data 发现函数，`__dockTomato`/`focus` 抛错 getter 均零执行；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 75ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十一批（2026-09-17，T-1019~T-1021）

- provider 在 ended 后持续 active 时执行有界释放轮询：250ms 间隔最多20次，每轮不提前调用 stopFocus，也不触发额外 UI 刷新。
- 轮询耗尽分支显式清空 releaseTimer 标识，避免逻辑上残留已失效 timer；之后 provider 变 idle 并再次 ended 时仍能立即释放。
- 新增60条逐轮运行期断言，另覆盖初始 timer、耗尽归零及恢复释放；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 33ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十二批（2026-09-17，T-1022~T-1024）

- 成功重试现在会精确清除同一 provider identity 的 write-failed 诊断，避免已恢复故障继续占据设置页；其它原因和其它 session 不受影响。
- 诊断解决发生在 recordEvent 返回真实记录且 bridge 仍存活之后，不会把空返回、抛错或卸载后的迟到结果误标为恢复。
- 20个独立 session 先失败后逐个成功重试，新增100条逐会话运行期断言及最终空诊断检查；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十三批（2026-09-17，T-1025~T-1027）

- 诊断恢复从“按输入尾部裁剪”改为先归一化、按时间升序稳定排序、再保留最近20条；跨窗口或同步导致的乱序不再让设置页把旧问题显示成最新。
- 相同时间戳使用原输入 index 作为次级排序键，裁剪结果确定且不会跨重载随机变化。
- 30条逆序记录逐项核对恢复后的时间、itemId 和 identity，新增60条运行期断言，另覆盖长度与25条同时间稳定裁剪；最终 `pnpm run test:quality` 与差异检查通过，10k 事件完整渲染 58ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十四批（2026-09-17，T-1028~T-1030）

- 相同 reason/itemId/identity 的运行期问题不再占满20行诊断窗口，而是合并为一行、更新时间并累计 count；不同会话或原因保持隔离，计数封顶9999。
- 设置页问题数量改为所有折叠行的 count 总和；schema v1 旧记录缺少或含非法 count 时按1恢复，合法值保留，过大值裁剪。
- 同一非法 session 连续25次产生50条逐次断言，另覆盖零写入、关联身份和 count 兼容边界；定向 bridge/completion/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 35ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十五批（2026-09-17，T-1031~T-1033）

- 恢复诊断文件时按 reason/itemId/identity 完整键归并旧版或多窗口遗留的重复行，count 求和且封顶9999，继续兼容 schema v1。
- 恢复过程先稳定排序、再以最后一次出现更新键的插入位置，最后按20个唯一问题键裁剪；最新时间、原因隔离和诊断容量语义保持一致。
- 25条同键持久记录新增50条逐项关联断言，另覆盖次数合计、最新顺序、不同原因、计数封顶和独立身份容量；定向 completion/integration、bridge、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十六批（2026-09-17，T-1034~T-1036）

- 诊断导出改为 own-data 防御读取，九种 provider 状态使用白名单，未知状态降级 error，Symbol 等异常版本值不会中断序列化。
- 非法 exportedAt 自动生成有效 ISO 时间；能力数组最多扫描128项、输出32项且单项80字符，数组索引访问器不会执行。
- 25组 hostile provider 新增75条逐项断言，另覆盖能力 getter、稀疏数组、Symbol 版本和未知状态；定向 completion/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 30ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十七批（2026-09-17，T-1037~T-1039）

- 外部专注启动新增可往返上下文构造器，itemId/unit 必须非空、无首尾空白且不超过 completion 侧160/80字符边界，避免完成后无法匹配项目。
- canStart 提前关闭非法入口，start 再次守门并返回既有 DOCK_TOMATO_INVALID_CONTEXT，绕过资格检查也不会调用外部 provider。
- 25组异常项目新增50条逐项断言，另覆盖合法最大边界、直接 start 拒绝和零 provider 调用；定向 bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 55ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十八批（2026-09-17，T-1040~T-1042）

- completion 的 sessionId/recordId 改为无损身份校验，禁止首尾空白和超过240字符的值被 trim/slice 后进入 externalRef，消除不同长身份截断碰撞。
- 持久历史只投影总长不超过251字符且拆分身份不超过240字符的原样 `docktomato:` 引用，与运行期判定共享边界。
- 25组异常 completion 身份与25组异常历史引用共新增100条逐项断言，另覆盖合法最大边界和 recordId 回退；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第十九批（2026-09-17，T-1043~T-1045）

- 实时 provider 检测不再直接 Number 转换版本或 filter 能力数组；新增安全有限数值与有界能力投影，并与诊断导出复用。
- Symbol 版本安全降级，能力索引 getter 零执行；最多扫描128项、输出32项、单项截断80字符，百万长度稀疏数组不会被完整遍历。
- 25组污染 provider 新增50条逐项断言，另覆盖稀疏数组边界及缺少必要能力状态；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 59ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十批（2026-09-17，T-1046~T-1048）

- runtime status 的 sessionId 改为无损读取，非法身份仅被省略，不降低 ready/active 等其它状态的可读性；合法240字符身份保持原样。
- 运行期诊断追加、持久诊断恢复及 completion 失败采集统一对 itemId/identity 使用 exactBoundedText，不再以截断伪键折叠不同故障。
- 25组异常运行状态与25组异常持久诊断共新增100条逐项断言，容量用例改用合法唯一身份；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 31ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十一批（2026-09-17，T-1049~T-1051）

- 诊断恢复不再通过 map 直接读取数组索引，改为 ownDataValue 逐项读取，污染索引 getter 不会执行或中断恢复。
- 损坏输入最多扫描最后512项，百万长度稀疏数组不会被完整遍历；Symbol 等异常 count 通过 finiteNumber 安全降级为1。
- 25组 hostile 数组新增50条逐项断言，另覆盖百万稀疏尾项、身份保留和异常计数；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 86ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十二批（2026-09-17，T-1052~T-1054）

- 诊断字符串恢复在 JSON.parse 前增加512KiB字符上限，超限数据直接返回冻结空快照，避免损坏文件触发高成本解析。
- 恰好512KiB的合法 JSON 仍可恢复，超过一个字符即拒绝；对象输入继续使用上一批的512项尾窗扫描。
- 25个不同超限长度新增50条逐项断言，另覆盖精确边界长度和合法 identity 恢复；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 28ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十三批（2026-09-17，T-1055~T-1057）

- completion 项目匹配新增 `findCompletionItem`，使用 ownDataValue 读取数组位置和项目 id，污染 getter 不执行且稳定返回 missing-item。
- archived、unit、tomatoMode 以及分钟/小时/次数换算改为自有数据读取，损坏字段不会进入第三方代码或被误报成写入失败。
- 25组污染数组与25组污染项目新增100条逐项断言，另覆盖匹配项目字段 getter；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 36ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十四批（2026-09-17，T-1058~T-1060）

- completion 的 itemId/itemUnit/tomatoMode 改为无损文本校验，带空白或超长字段不再经 trim/slice 后匹配本地项目。
- durationMinutes 仅接受有限 number，不再执行 Number 隐式转换；Symbol、字符串及恶意 valueOf 对象稳定返回 invalid-duration。
- 25组异常上下文与25组异常时长共新增100条逐项断言，另覆盖数值字符串和零 coercion 调用；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 42ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十五批（2026-09-17，T-1061~T-1063）

- 持久 externalRef 扫描从 for-of 改为普通索引循环，数组元素通过 ownDataValue 读取，不再触发索引 getter 或自定义 Symbol.iterator。
- 扫描仍覆盖完整 events.length，不用固定窗口牺牲旧 session 幂等；10,000项稀疏数组的尾部合法身份可正常识别。
- 25组污染数组新增75条逐项断言，另覆盖大型稀疏历史完整性；定向 completion/bridge/integration、类型检查及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 37ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### 13.0 专注生态第二十六批（2026-09-17，T-1064~T-1066）

- Dock Tomato 空闲释放新增在途 Promise 单飞，重复 completed/ended 不再并发调用 stopFocus，也不会建立空闲状态下的多余计时器。
- 释放结算只清理对应 operation，随后可处理未来新会话；插件卸载后迟到结算不再触发 provider UI 刷新。
- 25次结束风暴新增50条逐项断言，另覆盖首发、结算和再次释放；定向验证及完整 `pnpm run test:quality` 通过，10k 事件完整渲染 32ms、横向溢出 0px，CSS 427260 bytes（低于 450000 硬线）。

### T-105 legacy 样式退役第三十一批（2026-09-17，135项）

- 将 coarse-pointer 触控目标、安全区、编辑器控件、tap highlight，以及 reduced-motion 和 print 职责统一迁入组件层；删除 legacy 中对应135行。
- 更新7组移动/发布验收的样式归属，并增加触控、减弱动态和打印规则不得回流 legacy 的静态守门；`index.scss` 从416行降至281行。
- 类型检查、构建、移动矩阵、主题、legacy audit、宽度走查和完整 `pnpm run test:quality` 通过；10k 事件完整渲染 40ms、横向溢出 0px，生产 CSS 426185 bytes（较本批前减少1075 bytes）。

### T-105 legacy 样式退役第三十二批（2026-09-17，254项）

- 删除109行旧 root token/基础控件规则和145行回顾、事项、编辑器、移动导航重复规则；缺失的3个几何 token 归入 tokens 层。
- 最后25行模板管理器规则迁入组件层并替换宿主色引用；`index.scss` 从281行缩为一行退役说明，生产入口移除 legacy import，T-105 完成。
- UI、移动矩阵、模板管理器、legacy audit、宽度走查和完整 `pnpm run test:quality` 通过；10k 事件完整渲染 30ms、横向溢出 0px，生产 CSS 419910 bytes，已回到420000 bytes 告警线以内。

### 13.0 移动质量门禁（2026-09-17，T-1067~T-1069）

- 修正孤立的移动编辑器结构测试，将底部留白断言从过期12px更新为当前单一64px操作栏高度。
- 将 `mobile-editor-structure.test.cjs` 纳入标准 `test:mobile`，320/360/390/430px 的模板、图标、滚动、安全区与操作栏约束进入完整质量链。
- `pnpm run test:mobile` 与完整 `pnpm run test:quality` 通过；10k 事件完整渲染 74ms、横向溢出 0px，CSS 419910 bytes。

### 13.0 测试资产治理（2026-09-17，T-1070~T-1076）

- 审计后测试资产增至73个 `.test.cjs`（含覆盖守门本身），发现13个原本未接入脚本的测试；现已统一加入 `test:extended` 和完整质量链。
- 将记录/历史、Today、6.0效率、8.3平台四组旧单体断言迁移到当前 fragments、review、bind、focus timer 与 occasions 模块。
- 新增逐文件覆盖守门：73项测试资产均必须由 package scripts 执行；当前显式退役数为0，后续新增孤立测试会直接失败。
- `pnpm run test:extended` 通过，覆盖辅助功能、历史结构、建议工作流、模板模型、Today查询、效率功能、洞察和平台能力。
- 完整 `pnpm run test:quality` 通过：类型检查、生产构建、主/UI/移动端/生态/扩展测试、性能和发布资源检查全绿；10k事件完整渲染37ms、横向溢出0px，CSS 419910 bytes（低于420000提示线）。

### 14.0 数据内核第一批（2026-09-17，T-1077~T-1079）

- 扩展 `getStoreIndex`，一次遍历同时构建 `byItemDate`、`byDate`、`byId`，新增日期和ID查询接口并保持 WeakMap 随不可变 store 自动失效。
- 回顾月历/日期明细、历史撤销/备注编辑和最近记录撤销接入索引，移除页面级日期 Map 与4处重复线性事件查找。
- 新增数据索引测试：25组ID查询与25组日期查询共50条逐项断言，另覆盖缓存、失效、空结果、项目日期兼容和重复ID首项语义；测试资产增至74项且零退役。
- 完整 `pnpm run test:quality` 通过：类型、构建、主/UI/移动端/生态/扩展、性能和发布资源检查全绿；10k事件完整渲染50ms、横向溢出0px，CSS保持419910 bytes。

### 14.0 数据内核第二批（2026-09-17，T-1080~T-1082）

- 新增半开日期范围查询：排序投影二分定位开始/结束边界，命中结果按原 ordinal 恢复持久顺序。
- 标准日/周/月与自定义分析范围统一接入索引，移除两处逐事件全量 filter；范围排序投影按需构建，不增加未使用范围查询页面的启动排序成本。
- 新增25组半开范围与25组对象身份逐项断言，共50项；另覆盖空/逆序/范围外、原顺序、首次构建和后续缓存复用，测试资产增至75项且零退役。
- 完整 `pnpm run test:quality` 通过：类型、生产构建、主/UI/移动端/生态/扩展、性能与发布资源检查全绿；按需索引下10k事件完整渲染39ms、横向溢出0px，CSS保持419910 bytes。

### 14.0 数据内核第三批与12.0.2准备（2026-09-17，T-1083~T-1087）

- 项目ID与启用状态进入store级WeakMap索引；Today、回顾、历史操作、内置专注和外部适配器的高频路径接入索引。
- 25组启用项与25组归档项各执行原始/启用查询，共100条逐项断言；另覆盖缺失值、缓存复用、store替换和重复ID首项语义。
- README、12.0.2变更记录、Release notes和三个版本真值已更新；Dock Tomato PR草案同步到上游v2.2.8基线，明确正式PR前必须重放兼容分支。
- 修复发布资源守门对12.0.1的硬编码，改为从package版本动态校验源码、manifest、dist、README、变更记录和发布说明。
- 完整 `pnpm run test:quality` 通过；10k事件完整渲染145ms、横向溢出0px，CSS 419910 bytes；最终 `package.zip` SHA-256 为 `e02f3388eab9a81fea0af0d2761cf627886cb044216f31380b6890c63377d9b9`。

### 12.0.2 现场反馈修复（2026-09-17，T-1088~T-1090）

- 已完成项折叠改为当前表面原地更新 hidden、箭头和 aria-expanded，移除对整页 render 的依赖，避免手机端点击无效和列表跳动。
- 新建/编辑非二元任务新增“每次打卡”数值；配置贯穿任务与日期修订、用户模板、实时预览、Today 快捷记录和智能体默认记录，分钟/小时切换会同步换算。
- 旧任务无该字段时保持原有默认（分钟5、毫升250等）；零值、负值和非有限值不会进入规范化存储。
- `pnpm run test:quality` 全链通过：76项测试资产零退役，10k事件完整渲染29ms、横向溢出0px，CSS 419910 bytes（低于420000提示线）。

### 14.0 数据内核第四批（2026-09-17，T-1091~T-1093）

- 抽离无依赖的记录增量边界模块，编辑保存、用户模板和存储导入统一执行正数、两位精度与十亿上限规范化；二元任务始终忽略该字段。
- 快捷增量拥有独立输入精度：次数为1，其余类型为0.01，不再被目标值的粗步长误拦截；分钟/小时切换仍同步换算。
- Today、智能体默认记录和专注项目克隆严格读取目标日期修订，不用当前任务增量污染旧日期；新增12组规范化矩阵及结构守门。

### 14.0 数据内核第五批（2026-09-17，T-1094~T-1096）

- 新增三方写前对账模块，把基线、本地和远端规范化、冲突检测、确定性合并及双向收敛决策从插件实例中抽离。
- mutation 在排他存储锁内读取远端并完成必要回写后才执行用户操作；成功主存储写入始终推进 lastPersistedStore，不再受临时 UI 保存状态影响。
- 25组双窗口独立事件执行100条逐项断言，另验证 externalRef 跨窗口幂等、无变更零写入和较新项目版本胜出；测试资产增至77项且零退役。

### 14.0 数据内核第六批（2026-09-17，T-1097~T-1099）

- 主存储写入升级为“保存→回读→确定性合并校验”，只有回读结果包含期望快照才视为成功；最终确认的快照同时推进内存 store 与冲突基线。
- 若首写被非协作窗口覆盖，将期望值与观察值合并后执行一次有界修复；观察值已是超集则不重复写，连续两次无法收敛会抛出 `store-write-verification-failed`。
- 25组首写丢失执行100条逐项断言，另覆盖远端超集一次接受和持续丢失失败；完整质量链仍作为阶段门槛。

### 14.0 数据内核第七批（2026-09-17，T-1100~T-1102）

- 日期范围索引加入100,000条事件压力基准，首次查询按需建立排序投影并校验精确半开区间。
- 25组月范围查询各验证结果、单次耗时、投影对象复用和日期边界，共100条断言；避免在每次回顾范围切换时重复十万级排序。

### 14.0 数据内核第八批（2026-09-17，T-1103~T-1105）

- 删除入口在仅持有事件ID且事件已被另一窗口暂时移走时，仍创建ID墓碑；空白ID被明确忽略，避免无意义持久化。
- 同ID旧事件会被追加和合并双路径阻断；外部记录继续使用 itemId/source/externalRef 身份墓碑，事件ID变化也不会复活。
- 新增25组删除与陈旧重放交错，执行125条矩阵断言，并覆盖无关事件保留、交换律、幂等及外部身份边界。

### 14.0 数据内核第九批（2026-09-17，T-1106~T-1108）

- store 规范化与双窗口合并先构建墓碑ID集和外部身份集，再以常数时间过滤候选事件，消除事件数乘墓碑数的平方级扫描。
- 单事件追加继续复用相同查询语义；存储协议、墓碑排序和 externalRef 身份边界均未改变。
- 新增25组/100条双键等价断言；50,000事件与25,000墓碑规范化压力在当前环境约251ms完成，门槛为5秒。

### 14.0 数据内核第十批（2026-09-17，T-1109~T-1111）

- store 事件索引扩展 external identity 集与墓碑查询集，appendEvent 统一通过同一个 WeakMap 投影判断事件ID、外部身份和删除凭据。
- 已渲染/查询过的长历史在再次打卡时不再重复扫描全部事件和墓碑；新增记录仍创建新 store，保持不可变更新边界。
- 25组四类幂等拒绝路径执行100条断言；已预热的100,000事件历史追加在当前环境约1ms完成，门槛为250ms。

### 14.0 数据内核第十一批（2026-09-17，T-1112~T-1114）

- store 事件投影新增首项序号 Map，日志备注保存直接定位目标数组槽位，取消长历史尾部事件的 findIndex 全量扫描。
- 裁剪后的备注没有语义变化时返回原 store；真实修改仅复制事件数组与目标事件，保持原 store 和所有无关事件对象不变。
- 25组不可变/短路矩阵执行100条断言；已预热的100,000事件尾部备注更新在当前环境约0.2ms完成，门槛为250ms。

### 14.0 数据内核第十二批（2026-09-17，T-1115~T-1117）

- 事件 WeakMap 投影新增 byItem 分桶；配额型 getProgress 不再为每个项目把完整历史交给规则层，只传递目标项目的有序事件。
- 规则层仍独立执行单位、周/月周期、按值/按日期和日期修订判断；索引只缩小候选集，不改变业务计算口径。
- 25组多项目隔离矩阵执行100条断言；100个项目共100,000事件中连续25次配额查询在当前环境约35ms完成，门槛为500ms。

### 14.0 数据内核第十三批（2026-09-17，T-1118~T-1120）

- 新增 evaluateItemRule store级入口，Today 卡片剩余量和批量完成统一复用项目事件投影，不再把全库历史传给单项目规则。
- 习惯洞察的日期分桶与配额窗口同样只遍历目标项目事件，墓碑过滤、日期修订、报告克隆和纯 rules API 语义保持不变。
- 25组完整规则矩阵执行100条断言；100个项目共100,000事件中连续50次规则计算在当前环境约89ms完成，门槛为1秒。

### 14.0 数据内核第十四批（2026-09-17，T-1121~T-1123）

- 修复历史自定义回顾区间仍按 asOf 当天选择事件的问题；汇总现直接使用已裁剪 bounds 的半开日期范围，所选日期与统计事件重新一致。
- 区间事件在汇总入口一次按 itemId 分桶，项目摘要不再各自 filter 同一事件数组；普通日/周/月仍共享相同边界路径。
- 25组历史区间执行100条 asOf 隔离与汇总断言；100项目共100,000事件的自定义汇总在当前环境约331ms完成，门槛为5秒。

### 14.0 数据内核第十五批（2026-09-17，T-1124~T-1126）

- 写事务拆分严格 unknown 边界与内部 normalized 快路径；主插件只规范化远端 loadData，当前 store、冲突基线和待写快照不再在同一锁内反复清洗排序。
- 不可变 store 指纹按身份缓存；无变化对账在合并前短路，正常写后读回在修复合并前短路，真实冲突仍执行原确定性赢家、墓碑和 externalRef 语义。
- 25组三方快/守卫路径执行100条断言；使用独立对象模拟真实 loadData 后，100,000事件无变化对账约127ms、已规范化写后确认约470ms，门槛均为3秒。

### 14.0 数据内核第十六批（2026-09-17，T-1127~T-1129）

- store 事件投影在既有单次遍历中新增每项目自然日 Set；同日多条记录自动去重，Today 多表面共享同一不可变 store 时复用该投影。
- 连续记录核心迁入 model 并接受显式 asOf，保持今天优先、今天缺席从昨天续算、自然日倒推、项目隔离和归档项目归零语义。
- 25组连续记录矩阵执行100条断言；100项目共100,000条历史的已预热连续记录投影在本次完整质量链约0.1ms，门槛为250ms，测试资产增至86项且零退役。

### 14.0 数据内核第十七批（2026-09-17，T-1130~T-1132）

- 回顾页由单一 AnalyticsSnapshot 同时提供徽标、近12周完成率和近6月记录趋势，移除视图层对 weekly/monthly 的重复计算，并统一同一截止日。
- 快照提升到一次 render 周期，在 dock、页签和快速弹窗之间共享；只做瞬时透传，不增加可能跨日陈旧的长期缓存，年度热力图基准年也跟随快照日期。
- 25组趋势等价矩阵执行100条断言；100,000事件快照在完整质量链约427ms、复用读取约0ms，门槛分别为5秒和250ms，测试资产增至87项且零退役。

### 14.0 数据内核第十八批（2026-09-17，T-1133~T-1135）

- 回顾视图从 AnalyticsSnapshot.asOf 解析一次本地中午，日历今天态、当前月、摘要、成就、提醒、逾期和热力图共享该截止日，消除跨午夜的区块漂移。
- 成就引擎新增显式 asOf 入口，历史回放的完美日窗口不再依赖 Date.now；未传参数时仍默认当前日期，保持既有调用兼容。
- 25组固定日期执行100条摘要与成就隔离断言，并增加回顾视图无独立无参 new Date 的结构门禁；完整质量链通过，测试资产增至88项且零退役。

### 14.0 数据内核第十九批（2026-09-17，T-1136~T-1138）

- 成就上下文把活跃日、使用项目、记录来源、早晚完成、备注、附件和番茄钟统计合并到同一次事件遍历，取消同一历史上的多次 filter/map。
- 构建一次 itemId Map 完成事件所属时段分类，移除“每条事件 find 全部项目”的乘法级热点；完美日、规则判定、归档与缺失项目语义保持原样。
- 25组事件统计矩阵执行100条断言；100个项目共100,000条记录的成就投影在完整质量链中约178.2ms，门槛为2秒；89项测试资产零退役，10k完整渲染26ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十批（2026-09-17，T-1139~T-1141）

- 完美日投影利用日期循环本身已经单调递增的事实，在当天计划统计完成后立即累计完美日、当前连续值和最佳连续值，移除中间 Map、键数组及重复排序。
- 无安排日继续跳过且不打断连续全清；有安排但未全清时归零当前连续值。项目可用性、计划规则、完成阈值、归档和日期修订仍由既有模型层判断。
- 25组每日/间隔计划矩阵执行100条断言；100项目、365天、36,500事件的年度投影在完整质量链中约204.8ms，门槛为3秒；90项测试资产零退役，10k完整渲染24ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十一批（2026-09-17，T-1142~T-1144）

- getItemRevisionForDate 按 revisions 数组身份缓存有序投影；规范化任务已排序时直接复用原数组，兼容原始无序输入时仅首次复制排序，不改变调用方顺序。
- 目标日期从线性 filter + sort + 取末项改为上界二分；日期修订、单位、计划和旧任务回退语义保持不变，任务修订数组不可变替换时缓存自然失效。
- 25组修订矩阵执行100条断言；1,000条修订上的100,000次缓存查询在完整质量链中约37.4ms，门槛为1.5秒；年度完美日投影约196.4ms，91项测试资产零退役，10k完整渲染27ms、横向溢出0px，发布资源检查通过。

### 14.0 数据内核第二十二批（2026-09-17，T-1145~T-1147）

- 日期修订索引迁入无模型依赖的 rules 核心，model继续原名重新导出，既有 UI、分析、智能体和番茄钟调用无需迁移，也避免新增运行时模块破坏独立转译测试边界。
- evaluateRule 一次取得有效修订并传给内部状态判断，同一份计划、目标和单位驱动周期、进度与完成态；移除 getRuleStatus/evaluateRule 各自排序查找修订的重复实现。
- 25组共享规则修订矩阵执行100条断言；1,000条修订上的100,000次规则评估在完整质量链中约68.4ms，门槛为2秒；模型修订查询约38.7ms，年度完美日投影约169.9ms，92项测试资产零退役，10k完整渲染28ms、横向溢出0px，发布资源检查通过。

### 13.0.0 发布收口（2026-09-17，T-1148~T-1150）

- 版本真值同步 13.0.0（package.json / plugin.json / src/version.ts / dist / README / docs/v13.0.0-change-log.md / release-notes-13.0.0.md）；完整质量链 test:quality exit 0（92 项测试资产零退役，a11y 双主题 0 违规，10k 渲染 34ms/溢出 0px，发布资源检查通过，CSS 419,910 bytes 告警区但低于 450,000 硬线）。
- scripts/release.cjs 执行构建、测试链、提交、推送、标签与 GitHub Release（package.zip）；远端资产与发布说明 SHA-256 一致，仓库内发布说明回填最终摘要（webpack 产物 zip 元数据非字节确定，摘要以流水线上传时计算值为准）。
- 路线图基线更新：官方集市 PR #2248 已合并；13.0 专注生态消费端与 14.0 数据内核可自动化范围已随 12.0.x/13.0.0 落地；主线下一步 15.0 UI 系统（版本决策 D-156：semver 连续递增，工作流标签不等于发布版本号）。

### 13.0.1 修复版准备（2026-09-17，T-1151~T-1152）

- 定位 v13.0.0 发布后 CI browser-audit 失败的两类问题：① visual-qa 对"阅读"模板 targetStep 期望过时（T-1091 步长分离后目标输入统一 0.01）；② 真实产品缺陷——写后校验指纹对"缺省 archived"与"物化 false"不等价，编辑器新建条目保存被误判并发覆盖、重试后回滚（14.0 第六批引入，真实宿主同样复现）。
- 修复：save-form 构造条目物化 archived 缺省值 + cloneItemValue 快照防御性物化（D-157）；QA 宿主存储按名分槽并克隆失败 reject；双击提交等待卡片渲染后再点击。
- 证据：完整质量链 test:quality exit 0；Edge 浏览器 visual-qa 全链通过（results.json 输出完整、pageErrors 为空）。
