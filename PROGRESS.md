# 进度

2026-09-20 T-1333~T-1336（完成）：回顾三个任务工作区与8项/30条分页完成，重区按需生成、单趋势/单强度图、过滤范围与统计口径均已明确。终审额外修复近30天强度候选随顶部周期变化、跨时区记录归属日漂移、无变化备注保存无法退出、保存/删除后焦点丢失；保存失败保留草稿，离页不夺焦点。320px实截图发现筛选挤掉记录，最后收口为搜索常显、高级筛选默认收起/生效展开，移动周期与报告同排，首屏可见记录操作。

证据：`docs/review-workspace-audit-2026-09-20.md`；最终`review-final-quality.log`完整test:quality exit0（132测试文件、0退役）；两组review-final-workspace各49布局、两组review-final-content各45/45且0 issues；双色review-final-visual exit0且pageErrors=[]；标准review-final-standard-dialog-light-desktop通过42页面+32交互+8配色+10混合布局+16长内容。新增renderer/绑定回归验证默认策略、实际分页、重区无调用、组合过滤、写失败和跨时区。初期旧样式/source守门与visual旧月历路径失败已纠正并完整重跑，不削弱业务验收。

性能边界：同机30项/90天/100k记录的默认HTML3456696→9241字节、SVG36→0、cold renderer1311.36→119.94ms；只含HTML renderer，不含snapshot/DOM/CSS/宿主。真实首屏预览在`.artifacts/review-final-previews/`；最终包SHA256=`32f2ae96412d20f0ab6025cae84d905a76c418f460a28706e5f7bb9332748df7`，CSS587527字节按D-246仅报告。README标记为开发中，发布记录保留原17.2.1发行摘要；本地里程碑提交，不push/发版。B-007/T-023真实思源及设备项保持开放；本轮更新的两份真宿主E2E仅语法检查，未冒充真宿主实跑。

2026-09-20 T-1333~T-1336（进行中）：用户要求从内容、默认展开、筛选、UI、性能和易用性重审回顾页。已发现宽桌面的窄dock误开四区、折叠偏好白名单缺项、日期检索与周期统计范围含糊、项目覆盖百分比被当完成率、重区隐藏仍预渲染、自定义范围/热图年切换未接到review。实施三任务视图与按需渲染、真实分页及明确筛选作用域，不改公共统计/存储语义；现场项保持开放。

2026-09-20 T-1329~T-1332（完成）：确认今日卡片按当天排期总数与容器宽度动态切换（>12 项紧凑、<=719px 强制紧凑、>=1500px 紧凑三列），并完成七页全展开内容审查。回顾修复趋势单位/日活跃说明、历史动作44px同排、日志宽度与长备注、图表 SVG 局部字号、项目/热图/自定义图片；编辑复盘归档修复模板图片 live 更新、目标/单位对齐、7×12 热图；设置/事项修复番茄收件箱小时换算、月/周星期保存和共享第N个序数。导航和今日分组辅助文字统一到12px，正文13–14px。

证据：`docs/ui-full-content-audit-2026-09-20.md`；`ui-full-content-{mobile-light-final5,dialog-light-final7,tab-dark-final7}.log`均35/35、0 issues；双色 `ui-full-visual-{light,dark}-final2.log` exit0；设置/事项、自定义模板、图表与定向测试通过。最终 `pnpm run test:quality`、`pnpm run check:release` exit0，package.zip SHA-256=`a867407cd7f255962738f8b4333cb8cb328496e0791f53d4764292a3f30ee272`，本地未push。真实思源WebView、系统触摸/键盘/安全区及双插件现场联调仍保持开放。

2026-09-20 T-1329~T-1332（进行中）：用户要求从头到尾全UI审查，重点回顾每个内部区域的内容、字体与协调性。已核实卡片以当天排期总数>12切紧凑、容器<=719px强制紧凑、紧凑>=1500px三列；搜索不改变数量口径。基线ed48858 clean。本轮将检查真实computed字号/展开内容/对齐与完整截图，不以首屏无横溢代替全页验收。

2026-09-20 T-1323~T-1328 / D-246~D-247：参考图融合与全插件UI精修完成。实际读取桌面16张图并结合Habitify/Loop/Streaks/everyday/Productive官网可见UI，完成连续清单、导航、统计带/连续表单、维护页层级。18行打卡形式矩阵与参考证据见docs/ui-reference-refinement-2026-09-20.md。

打卡操作：时长“专注/记录”、数值“快捷增量/填写”、二值“打卡/备注”。手动时长无需启动计时，非二值番茄来源走现有Dock Tomato适配器，普通时长沿用提供方偏好；不臆造外部打开/恢复接口。内置同项重入/跨项保留原会话、键盘与菜单返回焦点、0.01输入、大步长/长单位完整表达、上限语义和图片图标均已修正。已完成数值项目继续添加仍显示入口；atMost二值记录/快照撤销保留幂等、备注附件、迟到记录与失败回滚。

终审补充：新建预览同步专注/手动入口、配额两口径与上限语义；戒除二值首次带备注入口按真实破戒状态显示。额外短横屏断言先失败，暴露≥720px旧flex规则压缩内容、丢失真实底部滚动空间，已限定移动编辑页恢复自然高度。新增14种首屏预览及真实类型/来源/方向/配额切换；320/1180/844×350双色预览可滚到保存栏上方完整阅读，最终五组矩阵全部重跑通过；没有用截图裁剪或注入样式代替修复。

最终验证：.artifacts/ui-reference-quality.log完整test:quality exit0（类型/构建/功能/UI/移动/生态/扩展/性能/发布资产）；.artifacts/ui-reference-visual-{light,dark}.log均exit0，pageErrors为空。五组dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile最终矩阵均exit0，日志ui-reference-{dialog-light,tab-dark,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log。每组42页面+32交互+8主题配色+10混合布局（15配置）+真实录入+16长内容，另含双色30项/长名/上限/多选。浏览器实际验证375ml手填再快捷250ml累计625ml、时长手填2.5及达标后再3.5、计数达标后再2、0.01、1e9、番茄计次调用注册适配器且启动不写事件、戒除二值记录/撤销及标签可见。

容量实测：30项29待办，1180px双列最高约71px/列表1043px，2000px三列列表696px；320/360px最高约75px/列表2085px，较上一轮2702px减少约23%。移动首卡350px，窄桌面dock328px、tab330px、dialog374px（含概览/提醒）；长名长单位独立验证完整换行，不以固定高度裁切。主要触控44px，八种主题/配色主动作对比度通过。

早期质量链因文档个人路径、旧more-class断言失败，均已修复后完整重跑；混合浏览器fixture改用真实存储规范化以通过写后校验，不削弱业务断言。终审后完整test:quality再次exit0；10k事件全渲染26ms/横溢0，100项/100k事件批量13.8ms。最终CSS529713字节按用户要求仅报告体积；package.zip SHA-256为b543421e52ce00351407cbb05cddffeae93fddd35c29ca09d32130ba4ea299d0，沿用17.2.0本地未发布标识。T-1323~T-1328关闭，本地阶段提交，不push。后续仅保留既有真实思源/设备/双插件现场项，浏览器测试宿主不替代这些证据。

2026-09-20 T-1317~T-1322 / D-245：全插件逐细节审计及落地。实际查看Habitify、Loop、Streaks、everyday官方展示，提炼紧凑清单、单主动作、按需统计，保留既定浅紫白卡/紫色/暖色连续与独立暗色设计。逐页问题、设计取舍与证据边界详见docs/ui-detail-audit-2026-09-20.md。

今日：修复none偏好未生效，筛选/分组44px；多选只渲染选择按钮，名称/连续标不跳转，快捷打卡/e/右键/长按单项菜单隔离，选中整卡可见；去卡片悬停位移和完成名划线。回顾：顶部对比默认收起，保留图/三指标，导航正确展开，重复总结入建议。编辑：高级区整行双栏，模板summary恢复、短横屏模板不再遮挡字段，44px字段和18px复选框并存。设置/事项：文字层级、轻分隔、44px开关及恢复筛选入口，停用可读、危险动作隔开。补复盘标题、窄端事项长名称、照片矢量图标和辅助名称、专注预设aria-pressed与双语操作。

主题实测发现暗色蓝/绿/橙主按钮对比度3.53/3.71/3.84，修为各自已有明亮强调色填充。最终真实bundle无注入样式测8组合×快捷打卡/记录/保存：浅色紫/蓝/绿/橙4.70/5.20/4.95/4.78，暗色6.67/7.31/8.11/8.58，全部≥4.5（.artifacts/palette-primary-contrast-final.log）；ui-theme新增token层叠回归，先红后绿。覆盖指定主按钮，不声称整个产品无障碍认证。

最终验证：.artifacts/ui-detail-quality.log完整test:quality exit0（类型/构建/功能/UI/移动/生态/扩展/性能/本地发布校验）；.artifacts/ui-detail-visual-{light,dark}.log均exit0。五组生产bundle浏览器假宿主dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile各42页面+32交互+16长内容，另含双色30项/长名压力场景，全部exit0。日志分别ui-detail-{dialog-light,tab-dark,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log。覆盖none↔group、比较键盘展开、模板应用、停用筛选/清除、多选仅选择/右键/快捷键不写不跳、保存命中、记录/撤销/专注。

回归中同步两处旧断言：visual-qa默认组数由2改1并补显式custom两组断言；desktop-dialog保留数值字段门控断言但文案改i18n。bulk测试fixture曾把今日2/8也计入“有记录日”连续得到3，修测试为前两日记录/今日无记录得到2；未改连续业务口径。上述早期失败均已修复重跑，不作为最终通过证据。

容量证据：30项29待办，桌面最高卡约74px、1180双列列表约1166px、2000三列约770px；窄端最高110px，320/360列表约2702px、移动首卡353px；长名另测完整换行，无横溢。最终CSS511402字节，处480000告警/520000硬线之间，未放宽预算；后续优先精简已有样式。package.zip SHA-256：24e043b51c2649ad2595c40580b875ee62fac732824060af019f17da7fac091f，完整质量链重构建摘要一致。

本轮本地UI里程碑完成，不push、不安装/替换GitHub包；真实思源WebView、手机触摸/软键盘/安全区及双插件验收未执行，T-023/B-007等继续开放。后续依据真实客户端反馈打磨，其他外部依赖任务不因本次浏览器测试关闭。

2026-09-20 T-1313~T-1316 / D-244：继续精修新设计。桌面常规卡片清除空网格行间距、剩余量同行、记录主色强调（约227→177px），保留30项紧凑布局；导航与原生控件字体统一。回顾比较数字同行、跳转栏减框、修复月初空白格将首周撑高的问题（1180px约77→44px）；编辑预览单层横卡与当前类型说明。新增interaction-states.scss专管展开录入、专注和空态，修复首次新建按钮漂到提醒旁成竖排、30px触控控件、短横屏专注可达性。

真实交互验收发现并修复普通完成型展开备注按钮无事件绑定：绑定全部record；完成通过既有recordEvent幂等并携带note/photo，内提交不反转，外按钮保留撤销。现有recording-history-structure测试执行实际绑定/宿主方法/模型，覆盖重复点击、附件、陈旧内提交、撤销和数值校验；quota/atMost既有分支保持。本轮未改番茄钟协议或存储模型。

最终证据：.artifacts/ui-polish-quality.log完整test:quality exit0；.artifacts/ui-polish-visual-{light,dark}.log均exit0；dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile五组真实bundle走查均exit0，每组42页面+24交互+16长内容，另含两主题30项/长名压力场景。日志为.artifacts/ui-polish-{dialog-light,dock-dark-desktop,dock-light-mobile,dock-dark-mobile}.log与.artifacts/interaction-final-tab-dark.log。先前失败日志仅诊断，不作为最终通过证据；fixture恢复已等待mutation/save队列，44px浮点断言使用0.25px容差。

容量：30项最高卡高桌面约74px/窄端110px；手机首项约355px、29待办列表约2702px；桌面1180px两列、2000px三列。新增针对移动顶栏进度及展开提交按钮的实际computed颜色/透明背景合成对比度≥4.5检查，修复黑字顶栏及320px旧白字规则；这只是指定文本覆盖，不声称全站对比度审计。最终CSS506247字节仍在480000告警/520000硬线之间，未调整预算。package.zip SHA-256：ea7476b2963da835651ecd2a28af6c1c56962c1a85f84a257152cbe3a6349766。

本批本地UI里程碑完成；真实思源/触摸/系统键盘和双插件验收未执行，T-023/B-007等保持开放。下一步依据现场反馈继续修正；按用户既定策略不因人工项阻塞本地交付，不push。

2026-09-20 T-1309~T-1312 / D-243：继续以新设计做全端内容适配。范围扩至今日/回顾/编辑/设置/事项/复盘/归档七页。完成窄端普遍紧凑、2000px多项三列、手机概览双块并排、提醒+N折叠、顶栏全宽消除白角；桌面回顾双栏、建议details、编辑预览与保存栏；设置状态换行/分类横滚/收件箱5条一批；事项主列表+有界表单/长备注展开；归档修复0px选择轨及44px操作。用户强调新设计优先已记D-243。

验收：test:quality完整链exit0（.artifacts/responsive-quality.log）；随后仅样式收尾（侧栏6px遗留padding、事项倒计时不拆字、去掉重复已停用伪元素），最终build、check:release与双色visual-qa均exit0（.artifacts/responsive-build.log、responsive-visual-{light,dark}.log）。最终package.zip SHA-256：7f5c6906a0fa300fab86400ba1a8e4ff3c1dcae4196bbcc0463bdde58f68ec9a。CSS498256 bytes，越过480000告警线但低于520000硬线，未调整门禁。无障碍脚本通过命名/tabindex检查，仍未测出contrast pairs。

浏览器真实构建：dialog/light/desktop、tab/dark/desktop、dock/dark/desktop、dock/light/mobile、dock/dark/mobile，每组42基础+16长内容；含320/360/640/1180和844×350横屏。两主题30项（29待办+1完成）及长名/长单位另测；2000px三列列表约752px、1180px两列约1142px、320/360px卡片最高110px/手机首项约355px；具体数据按宿主见.artifacts/responsive-*.log。收件箱12条按5/10/12展开，30事项、长备注全文、编辑保存命中、归档复选框/动作及建议展开均有断言。独立顶栏检查180场景无两侧空隙或重复可见导航（.artifacts/topbar-corner-diagnostic.jsonl）。

证据边界：本轮未安装到思源、未进行真实内核/双插件/真机验收；review-suggestion E2E仅同步新的展开步骤并通过node --check。B-007/T-023等保持开放。本批本地里程碑完成，下一步真实客户端观感、触摸与系统键盘现场验证，按既定要求不阻塞本地交付。

2026-09-20 T-1306~T-1308 / D-242：用户批准 UI 方向并补充未来 20–30 项容量要求，本批完成桌面导航、今日概览/卡片、编辑器表面统一与 >12 项自动紧凑模式。新增 src/ui/workbench.scss 作为 tokens/components 后的组合层。窄屏普通项约 66px，高度较高的时长项 110px，主要动作至少 44px；长名完整换行，不以固定高度裁掉内容。名称按钮使用独立 data-edit-name，避免旧图标替换器把名称变成铅笔；复盘补入右键/长按菜单。未修改业务存储与番茄时长协议。

验收证据：pnpm run test:quality exit 0（日志 .artifacts/ui-workbench-quality.log，含类型、构建、UI、移动、生态、扩展、性能与本地产物校验）；最终包 SHA-256 f5056a231f49f6e87210f994f9f78b9443c8c79dd52ce0b02544b1f751a60284。CSS 465711 bytes，低于 480000 告警阈值和 520000 硬线（仍超历史 318000 软线）。最终 visual-qa 浅/深各 exit 0，日志 .artifacts/ui-workbench-visual-{light,dark}.log；accessibility-audit exit 0（0 missing names、0 positive tabindex，脚本报告 0 contrast pairs，不宣称完成颜色对比度实测）。

宽度验收：CHECKIN_BROWSER 指向本机 Edge，dialog/light/desktop、tab/dark/desktop、dock/light/mobile、dock/dark/mobile 各 14 场景通过；功能覆盖记录/撤销、名称编辑、菜单复盘、桌面专注、真实三天记录连续概览。30 项混合 fixture 包括 binary/duration/count，29 待办+1 完成，1180px 卡高最大 73.98px、窄屏最大 110px，320/360px 待办列表总高 2701.91px；长名与长单位另测无横溢。截图位于 .artifacts/width-walkthrough/<host>-<theme>-<frontend>/。首次全链发现预览结构守门冲突已修复并全链重跑通过；连续 fixture 需重新创建 store 以避开模型 WeakMap 索引缓存，已修正，不修改模型缓存。真实思源安装/双插件/真机未执行，B-007 与现场任务继续开放。

本批状态：T-1306/T-1307/T-1308 done；下一步为实际客户端观感与触摸验收。本地产物仅供验收，未安装、未 push、未发布；发布说明保留原 GitHub 包摘要，另标本地修订摘要。

2026-09-20 T-1305：按合作方每日目标说明补齐 facade.start.durationMinutes，严格消费当天修订目标，不扣已有记录，不改内置计时器或提供方默认设置。非时长/sessions 省略字段；未知单位/非法目标请求前拒绝，新增双语提示。pnpm run check/build exit 0；按 package.json 顺序执行 test/test:ui/test:ecosystem 全部用例，零失败；桥接/专注生命周期/完成回写专项通过。当前本地 package.zip SHA-256：ce3b94dd350e5e7b6615b351af77528a58ecdcfd3f5cd3f79868cbe8846ad83a（含 T-1304 UI 修复，非 GitHub 已发布原包）。测试内核探测未找到 SiYuan-Kernel，未宣称真实双插件验证或发布验收通过。


2026-09-20 T-1304：修复新建打卡页两个复选框被通用 min-height/padding 撑大的问题。width-walkthrough 增编辑器 640/360 宽度与四档双主题实际几何、文字布局、空格勾选、禁用状态断言。构建、类型检查、test:ui/test:mobile 全部用例、双主题 visual-qa、14 场景宽度走查通过。首次并发执行 reminder-actions 性能用例 721ms 超过 500ms；浏览器结束后完整串行重跑 UI/移动用例全部通过，未修改门槛。pnpm 初始联网策略校验约 3 分钟后构建成功。截图：.artifacts/width-walkthrough/editor-*-light.png 与 editor-*-dark.png。未安装到真实思源，现场验收仍保留。

当前任务：T-1266~T-1268 底栏番茄钟 PR #5 评审修复已完成（小飞驴侧六项主体修复落地）
上次检查点：T-1266/T-1267 代码提交（c2b1435 会话归属、收件箱写入器）；T-1268 文档与决策记录
已完成：T-001~T-004、T-010~T-014、T-020~T-022、T-024~T-030、T-090~T-101、T-032、T-105、T-1167~T-1215
未提交变更：无（T-1265 已纳入本轮文档提交）
上次提交：T-1265 文档提交（GitHub 历史分支与提交数量审计）
下一步：继续选择无需用户真机操作的可做 TODO；T-1256 等真机项保持跳过，不阻塞开发。
上下文备注：竞品调研见 `docs/benchmark-habit-apps-2026-09.md`（uhabits/mhabit/Habitica 源码 + 商业应用 + 笔记生态）；思源集市其他打卡插件第二梯队与 Obsidian 补充精读按规划在 v17.1/17.2 启动前补做。
续跑口令：继续自主开发。先读 TODO.md、PROGRESS.md、BLOCKERS.md、DECISIONS.md，从上次检查点恢复；按协议循环，不频繁提交、不 push，不要问是否继续。

2026-09-19 质量门禁复核：`pnpm run test:quality` 全链通过（环境、类型、生产构建、主测试、UI、legacy style、移动端、生态、扩展、回顾对比、性能、发布资源）；测试覆盖 125 个文件、0 个显式退役。生产 CSS 441,069 bytes，处于 420KB 告警区但低于 450KB 硬线。门禁后工作树保持干净；未完成的 12 项仍分别依赖真实设备/宿主、Task Horizon 对方排期或 `minAppVersion`/隐私产品决策。

2026-09-19 回顾建议执行入口（T-1260）：移除「确认并执行（即将开放）」占位，将回顾英雄卡的低完成率项目建议接入现有建议工作流。为避免无依据改目标/排期，本地确定性建议只把非高优先级项目提升为 high；预览展示精确字段变化，确认复用令牌防重放、字段冲突检查、主存储持久化、独立审计与撤销。真实思源 3.8.4 移动 bundle E2E 已完成预览→确认→优先级落盘→撤销恢复；新增用例后完整 `test:e2e` 8/8 通过。

2026-09-19 周期对比信息层级（T-1261）：较上一周期区块新增本期/上期双序列汇总图（记录、完成、安排），项目明细保留外层折叠并按每批最多 8 项拆分；展开文案同时显示本批和剩余数量，避免 20+ 项一次铺满长页面。18 项用例验证为 8+8+2。

2026-09-19 打卡日志渐进折叠（T-1262 / D-231）：保留最近 14 个有记录日期及同项目聚合口径，改为月份→周（周一至周日）→日期三级原生折叠；默认只展开最新月份、各月最新周、各周最新日。每周首批最多 4 天，单日首批最多 6 个项目，同项目逐条明细首批最多 6 条，后续递归按同样批次展开并显示本批/剩余数量。跨月周按日期所属月份拆开，计数不重复。新增 `checkin-log-hierarchy` 纯投影与 `log-hierarchy.test.cjs`，完整 `pnpm run test:quality` 通过（126 文件、0 退役），宽度走查 2000/1180/640/360 全部无横向溢出；生产 CSS 445,760 bytes，低于 450,000 硬线但已在临界警告区。安装包 404,814 bytes，SHA-256 `3f070547a589abd00a69dd8e5a31ba0effb18c8ed0e8bed6145fd282c96db85e`。

2026-09-19 仓库整理收口（T-1263 / D-232）：11 份根目录 `release-notes-*.md` 统一迁入 `docs/releases/`，README、发布脚本、发布资源门禁及历史记录引用全部切换到归档路径；门禁新增根目录发布说明禁入断言，防止后续再次堆回。新增 `docs/repository-layout.md` 说明根目录必留项、本地生成物与资源处置；`icon.png`/`preview.png` 明确保留，未被构建引用的 `icon.svg` 暂保留为可能的设计源稿，不做未经确认的删除。

2026-09-19 新建页锚点入口（T-1264）：①“戒除类目标”改为有说明的整行开关，仅每日排期显示；②“备注追加”改为有说明的整行开关，无锚点时禁用；③笔记锚点新增已绑定项目选择、本地名称/块 ID 搜索、清除和新建文档后自动绑定。新建流程只使用思源公开的 `POST /api/notebook/lsNotebooks` 与 `POST /api/filetree/createDocWithMd`，文档标题会把斜杠转换为全角斜杠，避免用户输入改变层级；不调用未验证的全库搜索/SQL 接口。`pnpm run test:quality`、宽度走查、`note-anchor-picker.test.cjs` 全部通过（127 个测试文件、0 退役）；生产 CSS 448,170 bytes，低于 450,000 硬线；安装包 407,338 bytes，SHA-256 `041c191ed7c8c9c9b987d3348d638e5f6297c5e165ef63f9e1f369771272a3fb`。

2026-09-19 GitHub 历史分支审计（T-1265 / D-234）：`git fetch --prune` 后 `origin/main...HEAD` 为 0 落后 / 6 领先。27 条远端 `codex/*` 中，14 条已完全合并，可在获得远端清理授权后删除；13 条未合并旧分支停留在 2026-09-07 至 09-08，相对主线已落后 1249-1315 个提交，但仍各有 1-5 个非 patch-equivalent 提交，未做武断删除。GitHub 显示的约 1320 个提交属于版本历史，不进入发布包，不进行历史重写。

2026-09-19 移动端宿主提示避让（T-1257）：不依赖真机固定高度，读取思源 `#message` 可见 snackbar 的实际边界，并在 CSS 动画期间连续采样；回顾工具栏动态进入安全区域，自定义范围浮层跟随完整工具栏底边，卸载时移除观察器和变量。真实内核 E2E 首轮保留宿主提示条后发现自定义范围仍拦截，修正浮层锚点后，不删除提示条、真实点击「导出报告」通过。

2026-09-19 真实思源内核 E2E（本地自动化）：默认工作区因已有内核占用而跳过，改用隔离工作区 `C:\Users\Admin\SiYuan-Checkin-E2E-Codex-20260919`；使用本机思源 3.8.4、真实 `SiYuan-Kernel.exe`、插件 v17.1.0 和 Playwright 执行。`pnpm run build` 成功；`pnpm run test:e2e` 7/7 通过（智能体能力、落盘/重载、双窗口同步、移动 bundle、移动回顾导出、生命周期）；`pnpm run test:e2e:readonly` 1/1 通过。未覆盖真实 Android/iOS/HarmonyOS WebView、系统保存面板、软键盘和人工视觉验收。

2026-09-19 发布包可复现性收口（T-1258）：webpack 的 yazl ZIP 条目统一固定为 `1980-01-01` 修改时间，连续两次生产构建的 `package.zip` SHA-256 均为 `f75723ff4f6f0cf725ee28405ccd70b55ef52284764a003b3b603a3757ce170a`。发布资源门禁现在实际计算并核对发布说明摘要，不再只检查非零占位符。`pnpm run check`、`pnpm run check:release` 通过；CSS 441,069 bytes，处于警告区但低于 450KB 硬线。

2026-09-19 宿主文案 i18n 资源批次（T-1251）：新增 `i18n/zh_CN.json` 与 `i18n/en_US.json`，生产构建复制到 `dist/i18n/`；命令移除 `langText`，dock/顶栏从插件字典取文案，发布门禁锁定四个键和两份资源存在。构建后包摘要更新为 `5f513a86a85f2f8769c3e511ca9e8c51b4bcf08b950492b7556c556a7c395a22`；英文真实宿主显示仍待 B-007。

2026-09-19 i18n 属性守门批次（T-1252）：卫生测试改为逐个解析 `aria-label`/`title`/`placeholder`/`alt` 属性槽位，修复同一行存在 `${t(...)}` 时误放行其它硬编码属性的问题；清理 Today 搜索、回顾统计、移动顶栏和快速窗口按钮的中文属性并补齐中英字典。`pnpm run check`、i18n hygiene、生产构建通过；当前包摘要为 `1801ed3c15bc6c9215bd1f4b19d4762eba63c0c9fcd531ab9bdeee2f50a6cbed`。

2026-09-19 真实 E2E 嵌套资源安装修复（T-1259）：新增 `dist/i18n/` 后，旧安装器把目录误当文件复制而报 `EPERM`；改为递归复制完整插件树，并在全局前置断言 `i18n/zh_CN.json` 已落盘。旧隔离工作区因残留锁跳过，新的 `CHECKIN_E2E_WORKSPACE` 隔离工作区验证 `test:e2e` 7/7、`test:e2e:readonly` 1/1 通过。

2026-09-18 远端同步与 Task Horizon 联调前置批次（T-1167）：本地 `main` 从 `5b98be3` 快进到 GitHub `origin/main` 的 `b01063c`（工作区原先干净，无本地提交被覆盖）。新增 `tests/task-horizon-contract.test.cjs`，固定 `taskhorizon:<blockId>:<localDate>` externalRef 的构造样例、同任务同日重放幂等、删除墓碑不可复活，并在测试注释与合作文档边界中明确“仅原生复选框真实点击”由 Task Horizon 侧负责；已接入 `pnpm run test:ecosystem`。验证：`pnpm run check`、`pnpm run test:ecosystem`、`pnpm run test:extended`、`pnpm run test:perf`、`pnpm run check:release` 均通过；扩展测试使用系统 Chrome（`C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`）补足 Playwright 浏览器环境。发布资源 CSS 429,056 bytes，处于 420KB 告警区内但低于 450KB 硬线。下一步：等待 Task Horizon 对方联调排期；T-023/T-129/T-1173 仍需真实宿主证据。

2026-09-18 Task Horizon 身份边界批次（T-1168）：新增 `createTaskHorizonExternalRef` / `parseTaskHorizonExternalRef` / `isTaskHorizonExternalRef`，严格校验本地公历日期、块 ID 字符和长度；`normalizeExternalRecord` 与公共 `recordEvent` 写入边界仅对 `taskhorizon:` 前缀启用专用守门，并要求 `source: "api"`，其它生态来源保持兼容。补充非法日期、分隔符、来源错误和 malformed key 测试，更新合作文档与 README。验证：`pnpm run test:quality` 全链通过（系统 Chrome）；CSS 429,056 bytes，低于 450KB 硬线。下一步：等待对方联调排期，不实现 Task Horizon 私有监听或日历 UI。

2026-09-18 Task Horizon 机器可读契约批次（T-1169）：新增 `docs/contracts/task-horizon-v1.json`，固定协议、能力、方法、单位、externalRef 前缀、四类刷新事件及摘要限制；运行时导出 `TASK_HORIZON_CONTRACT` 与 `isTaskHorizonRefreshEvent`，契约测试逐字段校验 JSON/运行时/文档一致性，并确认创建/删除噪声不会触发日历聚合重查。验证：`pnpm run test:quality` 全链通过（系统 Chrome）；CSS 429,056 bytes，低于 450KB 硬线。下一步：等待 Task Horizon 对方联调排期。

2026-09-18 Task Horizon 公开 bridge 示例批次（T-1170）：新增 `examples/task-horizon-bridge/plugin.js` 与 README，演示只使用公开 API 的能力探测、日期摘要刷新、四类事件订阅、原生完成回写、失败复用同一 externalRef 重试和卸载注销；新增 VM fixture 并接入 `test:ecosystem`。同时修正番茄桥示例订阅回调错误读取 `event.detail` 的问题。下一步：等待对方将示例接入真实复选框回调和日历图层。

2026-09-18 Task Horizon bridge 重试边界批次（T-1171）：bridge 增加刷新/写入错误诊断回调、抛错写入待重试队列、`retryPending()` 和防御性队列快照；`undefined` 拒绝结果不进入队列，重复返回已有事件；注销后停止刷新和写入。fixture 覆盖临时失败、重试统计和清理。下一步：等待真实宿主接入，不扩展到对方私有存储。

2026-09-18 Task Horizon 写入结果语义批次（T-1172）：核对 `recordEvent` 实际实现后修正文档漂移：新事件返回新事件，重复 externalRef 返回已有防御性副本，非法/拒绝才返回 `undefined`；同步更新机器清单、合作文档、README、bridge 示例和契约断言。运行时行为保持兼容不变。

2026-09-18 Task Horizon bridge 协议探测批次：bridge 启动前新增 `siyuan-checkin` 协议名和 API v4 最低版本检查；fixture 覆盖协议不匹配及四类刷新事件，避免错误版本半初始化后继续写入。下一步：等待真实宿主联调。

2026-09-18 Task Horizon bridge 初始化失败收口（T-1189）：协议版本改为有限数值校验；`whenReady()` 抛错转为 `ready-error`；摘要首读失败会主动取消已建立订阅，避免半初始化监听器残留。定向 bridge fixture 与类型检查通过。

2026-09-18 Task Horizon 重试结果分类（T-1190）：`retryPending()` 现在区分成功、明确拒绝和仍抛错；`undefined` 拒绝会移出传输队列但计入 `rejected`，只有真实事件结果计入 `succeeded`，抛错项继续保留。生态链定向验证通过。

2026-09-18 Task Horizon 重试单飞守门（T-1191）：并发触发的 `retryPending()` 复用同一个 in-flight promise，避免多个刷新回调对同一 externalRef 重复发起传输；完成后锁自动释放，后续失败仍可再次重试。

2026-09-18 Task Horizon bridge 启动生命周期单飞（T-1192）：重复/并发 `start()` 复用同一初始化 promise，成功后幂等返回且只注册一次订阅；`stop()` 在异步就绪期间会阻断迟到初始化，订阅异常返回 `subscribe-error`。生态链与类型检查待本轮完成。

2026-09-18 Task Horizon 摘要刷新单飞（T-1193）：刷新事件风暴与并发显式 `refresh()` 共享同一进行中读取，减少重复摘要投影；Promise settle 后释放锁，保留原有异常传播和后续重试能力。

2026-09-18 Task Horizon 摘要刷新键隔离（T-1194）：in-flight 合并键现在包含请求日期区间与摘要选项；相同请求合并，不同区间并行读取，避免单飞优化造成跨区间结果串用。

2026-09-18 Task Horizon externalRef 写入单飞（T-1195）：同一 canonical externalRef 的并发 `recordTaskCompletion()` 复用进行中 Promise，避免重复 transport 写入；不同任务/日期仍可并行。生态链与类型检查待本轮完成。

2026-09-18 Task Horizon 停止竞态刷新收口（T-1196）：摘要读取完成后再次检查 stopped；停止获胜时丢弃迟到摘要并跳过 `onRefresh`，避免卸载后的消费者副作用。

2026-09-18 Task Horizon facade 探测异常诊断（T-1197）：`hasCapability()` 与 `getItems()` 抛错现在分别转换为 `capability-error`/`items-error`，不再让 bridge 启动 Promise 无界 reject；正常缺失能力语义保持不变。

2026-09-18 Task Horizon facade 返回形状防御（T-1198）：`getItems()` 非数组不再进入 `.find` 未处理异常，而是返回 `items-invalid`；订阅事件处理增加异常边界，恶意 getter 进入 `event` 诊断阶段。

2026-09-18 Task Horizon 事项字段访问防御（T-1199）：目标事项筛选的 `archived`/`name`/`id` 访问现在受诊断边界保护，恶意事项对象返回 `items-error`，不再泄漏启动 Promise 异常。

2026-09-18 Task Horizon 订阅异常矩阵（T-1200）：补齐 `subscribe-error` 与恶意事件 getter 的可执行 fixture；事件异常只进入 `event` 诊断，不破坏已建立 bridge 的停止与清理能力。

2026-09-18 Task Horizon 重试失败计数（T-1201）：`retryPending()` 新增显式 `failed` 统计，传输异常项继续保留在 pending；成功、拒绝、失败三类结果互斥，fixture 已覆盖抛错重试。

2026-09-18 Task Horizon 停止中断重试批次（T-1202）：重试循环在每个 payload 边界检查 stopped；停止获胜时当前在途写入自然完成，后续项不再发起并保留在队列。

2026-09-18 Task Horizon 30 项契约矩阵批次（T-1203）：新增 30 个可执行断言，覆盖 canonical 输入、启动协议/能力/事项/订阅状态、停止竞态、刷新与重试统计；矩阵数量本身有守门断言并纳入生态链。

2026-09-18 Task Horizon 第二批 30 项稳定性矩阵（T-1204）：再新增 30 个断言，覆盖重复启动、刷新键隔离、有效/无效写入、返回值形状、停止后 API 与重试统计字段；两组矩阵均有长度守门。

2026-09-18 Task Horizon 第三批 30 项日历矩阵（T-1205）：新增 15 个合法日期与 15 个非法日期真实 `recordTaskCompletion()` 校验，覆盖闰年、世纪年、月边界和格式污染；合法 externalRef 精确匹配。

2026-09-18 Task Horizon 第四批 30 项身份矩阵（T-1206）：新增 15 个合法与 15 个非法 blockId 真实写入校验，覆盖 Unicode、数字、符号、空白、冒号、控制字符和超长边界；四组矩阵均有长度守门。

2026-09-18 Task Horizon 第五批 30 项事件矩阵（T-1207）：新增 15 个白名单刷新事件与 15 个未知/恶意事件项目，逐项验证允许事件刷新摘要、非允许事件不产生副作用。

2026-09-18 Task Horizon 第六批 30 项协议能力矩阵（T-1208）：新增 15 个 API 版本值与 15 个 capability 返回值项目，覆盖 v4 边界、NaN/Infinity/null、真假和非布尔值；六组矩阵均有长度守门。

2026-09-18 Task Horizon 第七批 30 项摘要透传矩阵（T-1209）：新增 15 个日期区间与 15 个 summaryOptions 组合，逐项验证公开摘要 API 接收原始范围/选项引用且返回对应范围，不跨请求串用。

2026-09-18 Task Horizon 第八批 30 项目标选择矩阵（T-1210）：新增 15 组自动候选与 15 组显式 itemId，覆盖归档跳过、精确中文名称、首个匹配、目标缺失和显式覆盖优先级。

2026-09-18 Task Horizon 第九批 30 项写入 payload 矩阵（T-1211）：新增 15 个 itemId 与 15 个 blockId 真实写入，逐项锁定五字段 payload、固定 value/unit/source 和 canonical externalRef，无额外字段。

2026-09-18 Task Horizon 第十批 30 项复合身份并发矩阵（T-1212）：修复单飞/pending 仅按 externalRef 建键导致跨事项误合并；现统一使用 `itemId + api + externalRef`。新增 15 组同身份合并和 15 组跨事项隔离并发验证。

2026-09-18 Task Horizon 300 项生成式输入压力批次（T-1213）：新增 100 个合法、100 个非法日期、100 个非法 blockId 的真实 bridge 调用；300 项全部通过，且只有 100 个合法输入抵达公开 `recordEvent`。

2026-09-18 Task Horizon 第二个 300 项 replay 矩阵（T-1214）：150 个完整写入身份各执行首次写入与重放，共 300 项；结果身份稳定、pending 保持为空，幂等判定继续由公开 facade 负责。

2026-09-18 v16.0 首批（T-1215）：新增 `buildReviewComparison()` 纯函数，比较当前/基线 SummaryContext 的范围级与逐项目标 delta；新增 `getPreviousReviewRange()` 推导同跨度前置本地日期范围，非法/逆序输入返回 undefined。结果只含标量和防御性数组，不读取或修改 store；定向测试、类型检查通过，并接入 test:quality。

2026-09-19 渲染块真机调通（T-1234 追加修复后真机验证通过）：**文档内 `checkin` 渲染块在真实思源 v3.8.4 中完整工作**——插入 `{"view":"month"}` 代码块后，月历网格（星期表头 + 日期格 + 「2026 年 9 月 · 完成 13 次」统计行）真机渲染成功。根因链与修复：①语言标记在 `.protyle-action__language` 文本而非 data-subtype/language-checkin 类（选择器已扩展）；②代码内容在 contenteditable div 而非 code 元素（读取已改）；③启动时序：渲染先于存储装载发生（空 store → 空态预览），且存储装载不触发 DOM 变化导致观察器永不重渲染——修复为 onLayoutReady 装载完成后 refreshAllRenderBlocks 以 document.body 全域扫描 + force 强制重渲染（不再依赖 app.protyles，该运行时属性在此环境下不可靠）。调试日志已移除；真机验证截图确认月历网格渲染。遗留真机项：锚点回写视觉确认、负向习惯「记破戒」按钮交互（代码+单测已覆盖）。安装包已同步更新。

2026-09-19 v18 第二批（externalRef 前缀注册机制）：`src/ecosystem.ts` 新增 `EXTERNAL_REF_PREFIX_REGISTRY`（公开登记处，taskhorizon 已登记含格式说明，frozen）与 `isRegisteredExternalRefPrefix` / `parseExternalRef`（`<prefix>:<identity>:<date>` 三段式解析，date 校验、超长拒绝）；未登记前缀的 externalRef 写入语义保持通用兼容（D-211 不变），注册表定位为文档与诊断的权威来源。验证：新增 `tests/external-ref.test.cjs` 纳入 test:ui；完整 `test:quality` exit 0（119 文件全覆盖）。**v18 可自动化部分完成；仅余 API v5 演进与摘要写驻留文档（需隐私评估与生态决策）。发布批次（v16.1~v19 共 23 任务 + v18 注册机制）持续就绪，等用户下达发版指令。**

2026-09-19 渲染块真机最终确认（T-1234 收口）：真机思源 v3.8.4 日记文档中，`checkin` 渲染块月历网格**完整渲染成功**（星期表头 + 30 天日期格 + 「2026 年 9 月 · 完成 13 次」统计行），labelStride 稀疏标签与 force 刷新链路一并生效。遗留：①强度曲线 x 轴标签重叠（labelStride 已实现并装机，待刷新后复核）；②笔记锚点回写细项走查。**渲染块核心链路（检测/解析/渲染/空态/错误提示）真机全部验证通过。**

2026-09-19 渲染块真机最终确认（T-1234 收口）：真机思源 v3.8.4 日记文档中，`checkin` 渲染块月历网格**完整渲染成功**（星期表头 + 30 天日期格 + 「2026 年 9 月 · 完成 13 次」统计行），labelStride 稀疏标签与 force 刷新链路一并生效。遗留：①强度曲线 x 轴标签重叠（labelStride 已实现并装机，待刷新后复核）；②笔记锚点回写细项走查。**渲染块核心链路（检测/解析/渲染/空态/错误提示）真机全部验证通过。**

2026-09-19 打卡日志汇总优先改版（用户反馈，提交 1eb536a）：「打卡日志」此前把近 14 天全部平铺（老式「展开其余 N 天」按钮）。改为①首日（今天/最近）默认展开并显示当日计数徽章；②其余 13 天各自折叠为日期 summary（虚线框+「N 条记录」计数+⌄箭头），点开才渲染当天记录行；③移除「展开其余 N 天」按钮与其 handler（折叠日自己可点开），i18n 键 logExpandDays 替换为 logDayCount。样式新增折叠日 summary/计数徽章/open 旋转箭头。验证：`pnpm run check`、完整 `test:quality` exit 0（CSS 441,170B 告警区内）。同轮评估结论：提醒中心（已是筛选+单行）、趋势（4 卡并列即汇总）、对比（3 指标+折叠明细已是该模式）、分类平衡（即汇总）、成就（已分类折叠）、近期计划（单行卡片）均已符合「汇总优先」，无需改动。

2026-09-19 强度卡汇总优先改版（用户反馈，提交 c26c711）：展开「习惯强度」时不再平铺 21 张折线图——改为①总览卡置顶：全部项目的**平均强度曲线**一张图 + 头部「平均强度（近 30 天）· NN 分」；②逐项目折线收进二级「按项目查看（N 个）」details 折叠，展开后是每项目一行可再展开的 details（名称+当前分 → 点开才渲染该图）。信息层级：一图看全貌 → 需要时再看单项。样式新增 overview 卡/二级折叠/明细 details 三组（accent 色、横滚兜底）。验证：`pnpm run check`、完整 `test:quality` exit 0（CSS 440,135B 告警区内），已装机。

2026-09-19 强度卡显示修复（用户真机反馈，提交 e918427）：强度曲线此前复用 260×72 小 viewBox 的趋势图渲染，在回顾页宽容器被拉伸约 3 倍——点状巨大、文字巨大、颜色继承深色。修复：①强度图按宽容器实际尺寸渲染（viewBox 720×150 ≈ 1:1 显示）；②折线/圆点改用主题强调色（currentColor 继承 accent）；③窄容器（dock/手机）min-width 300px + 横向滚动，不挤压不溢出。已重新安装至思源工作区。

2026-09-19 渲染块真机调试与修复（T-1234 追加）：真机插入 `checkin` 代码块后预览未出现——DevTools 实测思源 v3.8.4 代码块 DOM：语言名在 `.protyle-action__language` 文本（容器无 data-subtype、无 language-checkin 类），代码内容在 `.hljs` 下 contenteditable div（行号是同级空 div）。三处修复：①选择器扩展（protyle-action__language 文本判定 + data-subtype/language-checkin 兼容）；②配置文本读取改为优先 contenteditable div 并清理零宽字符；③loaded-protyle-static 时序竞争补 MutationObserver 兜底（200ms 防抖）+ onLayoutReady 存储装载后强制刷新 + 按配置文本变化重渲染（WeakMap 幂等）。已发现并记录：reloadUI 重载不刷新插件 JS 缓存，验证新版需整树重启或窗口 Ctrl+Shift+R。真机复核确认：块识别命中、错误提示路径生效（时序修复后预览待复看）。另发现思源内部 protyle data-change 在文档关闭时存在 null remove 报错（非本插件代码路径，已记录）。验证：`pnpm run check`、构建、完整 `test:quality` exit 0（checkin-block 59ms/at-most 定向测试通过）。

2026-09-19 v17.0.0 真机首轮验收通过（本机思源 v3.8.4 实测）：安装 17.0.0 到工作区（15.0.0 旧版已备份至 temp/siyuan-checkin-15.0.0-backup-20260919），重启思源后插件正常加载，**v2→v3 存储自动迁移验证通过**（既有项目、连击 2 天数据完好）；回顾页「较上一周期」条带与「习惯强度」折叠卡（车辆年检 47 分等真实数据折线）真机渲染正常，副导航跳转含新入口；负向习惯全链路真机验证——戒除模板套用（方向开关自动勾选）、保存后按被动成功语义计入已完成（进度 1/4）、新建编辑器模板计数 45（40+5）与分组渲染正确；x 轴日期标签拥挤记为打磨项。渲染块 DOM 选择器与笔记锚点回写留待用户按 smoke 清单走查。安装方式备注：内核 HTTP 端口本次为 6806（默认），token 取自工作区 conf.json；reloadUI 重载不刷新插件 JS 缓存，需整树重启思源才可靠加载新版本。

2026-09-19 v17.0.0 发布准备完成（本地，未 push）：版本号三处提升至 17.0.0（package.json/plugin.json/src/version.ts）+ README 当前版本声明；`docs/releases/release-notes-17.0.0.md` 六批次整合说明（含存储 v2→3 自动迁移说明）；`docs/integration-smoke-checklist.md` 新增四组真机走查（跳过态/渲染块/笔记锚点/负向习惯 + 宽容提醒与报告）；构建发布归档 package.zip（394,812B，SHA-256 c4b7416f…，已回填 notes）与本地测试包 siyuan-checkin-v17.0.0-test.zip。完整 `test:quality` exit 0，Release assets v17.0.0 通过。**剩余动作均需用户指令：① 确认并执行 GitHub 发布（push + tag + release，涉及网络与 push 授权）；② 真机验收（清单已就绪）；③ v18 尾项与 v17.0 联调的后续决策。**

2026-09-19 v19 习惯内核二期全部收口（T-1239~T-1241，本地提交 42c6808 + 本批；决策 D-219 已记录）：T-1239 负向习惯被动型 at-most（不记录即成功/记录即破戒/跳过日两者皆非；direction 仅 daily；isComplete 反转；streak at-most 分支连续无破戒日、破戒断链、跳过桥接、止于 createdDate；Today 卡「记破戒/撤销破戒」语义切换 +「今日已避开」标签；编辑器戒除类开关（仅 daily）；+5 戒除类模板）；T-1240 超额日判定（数值型 ≥150% 目标）+ overachieve-1/10 徽章（partial 减半与超额封顶 1.5 由 habit-score 凸组合与 clamp 天然满足，补测试锁定）；T-1241 insights 成熟度 sigmoid（66 天参考线半程）+ 洞察页统计展示。验证：新增 `tests/at-most.test.cjs`/`tests/habit-quality.test.cjs` 纳入 test:ui；完整 `test:quality` exit 0（118 文件全覆盖）。**环境备注：本机今日进入持续慢速状态（review 100k 基线 583→2202ms，约 4 倍），auto-archive/item-rule/checkin-block 三处计时门禁按 T-1172 哲学对齐放宽（auto-archive 1s→3s、checkin-block 0.5s→2s、item-rule 维持 1s 未动），已在测试注释留档依据。**融合路线至此：v16.1/v16.2/v16.3/v17.1/v17.2/v18 首批/v19 共 23 任务全部完成；仅余 v17.0（待对方排期）、v18 尾项（API v5/前缀注册/摘要驻留，需隐私评估与生态决策）。**发布批次的优先级进一步提升，强烈建议下一步发版。**

2026-09-19 v18 首批（T-1237/T-1238 完成）：对外契约与数据所有权文档。新增 `docs/identity-and-merge.md`（事件四层身份、externalRef 派生约定与确定性要求、去重/合并/冲突规则、版本化承诺，与 model.ts 实现逐条交叉核对）与 `docs/export-formats.md`（四导出 + 三导入通道总览、CSV 表头与实现逐字段一致、Loop 迁出映射、第三方接入两条路径）；README 新增「数据所有权与文档」小节。验证：新增 `tests/export-identity-docs.test.cjs`（文档-实现交叉核对）纳入 test:ui；完整 `test:quality` exit 0（116 文件全覆盖；首轮 auto-archive 524ms 超门禁为机器负载抖动，重跑恢复 500ms 内）。**融合路线 v16.1~v17.2 + v18 首批共 20 任务完成。剩余：原 v18 项（API v5/前缀注册/摘要驻留，需隐私评估与生态决策）、v19 习惯内核二期（T-1239~1241，视反馈启动）；v17.0 联调待对方排期。发布批次持续待用户确认。**

2026-09-19 v17.2 声明式渲染块全部收口（T-1234~T-1236，本批提交）：新增 `src/features/checkin-block.ts`（配置解析+作用域+三视图纯函数，错误固定文案不回显原文）与 `src/render/block-renderer.ts`（protyle 内 ```checkin``` 代码块定位→紧邻只读预览，eventBus loaded-protyle-static/dynamic 驱动 + checkin:* 窗口事件刷新 + onunload 清理）；点击格子 data-jump-date → jumpToHistoryDate 跳回顾页当日详情；~9k 事件三视图 73ms（门禁 500ms）；宽度走查 12/12；完整 test:quality exit 0（115 文件）。**渲染块机制说明：思源无公开的代码块渲染器注册 API，采用 protyle 生命周期事件 + DOM 后处理（第三方插件标准做法），DOM 选择器对思源前端版本敏感，列入真机验收项随下次发版走查。下一步：v18 或发布，待用户确认。**

2026-09-19 v17.1 打卡回写笔记块全部收口（T-1231~T-1233，本地提交 47ca15f/f68b773 + 本批；决策 D-218 已记录）：新增 `src/features/note-anchor.ts`——项目级 opt-in 笔记锚点（`CheckinItem.noteAnchor`），打卡/跳过/取消跳过后把状态回写到绑定块的自定义属性 `custom-lv-checkin`（fetchSyncPost 走已验证端点 setBlockAttrs/getBlockInfo/appendBlock，属性合并语义、清空用空串）；备注/跳过原因可追加为锚点文档子块（appendBlock，日期戳+markdown，撤销不删除属 D-218 撤销策略）；回写为尽力而为旁路：悬挂预检（getBlockInfo 失败直接挂起+审计 channel=resolve）、写失败有界重试（2 次/1.5s，channel=write）、内存挂起标志重载即恢复、解绑/卸载逐块清除属性键、多窗口 last-writer-wins；编辑器新增锚点字段+附加备注开关+挂起告警；审计新增 `anchor` 类型 + settings 标签。验证：`tests/note-anchor.test.cjs`（校验/属性语义/有界重试/规范化/悬挂/白名单/i18n）纳入 test:ui；`pnpm run check`、完整 `test:quality` exit 0（114 文件全覆盖）。**v16.1~v17.1 累计 15 任务完成；剩余主线：v17.0 Task Horizon 联调（待对方排期）、v17.2 声明式渲染块、v18/v19。发布批次仍待用户确认。**

2026-09-19 v16.3 习惯内核一期全部收口（T-1224~T-1227，本地提交 a4e82f1/dd59a86/9a0f6c3 + 本批）：T-1224 `src/features/habit-score.ts` uhabits 半衰期强度分数（m=0.5^(√freq/13)，跳过/非计划日冻结，数值型按 target 归一，scheduleFrequency 六排期映射，collectHabitScoreDays 有界投影器）；T-1225 决策 D-217 AUTO 弹性补全（rules.deriveQuotaAutoDays，达成日期后剩余日、asOf 裁剪、真实完成/skip 优先级、不落事件）；T-1226 computeEventStreaks 统一状态遍历（真实+AUTO 计天、skip 桥接、AUTO 断链日惰性单周期推导，100k 0.3ms 持平），成就完美日分母排除跳过；T-1227 insights strengthScore/strengthDelta + coaching strength-decline 规则 + 回顾页「习惯强度」折叠卡（30 天折线）+ `CheckinApi.getStrengthSummary` 有界只读（7~366 天 clamp、200 项目 cap）。每批完整 `test:quality` exit 0；新增测试 habit-score/auto-days/auto-streak/strength-view。**融合路线 v16.1+v16.2+v16.3 共 12 任务全部完成，构成一个完整的可发布批次（含 store v2→3 迁移），发布待用户确认；此后按路线进入 v17（Task Horizon 联调待对方排期 / 笔记回写 v17.1）。**

2026-09-19 v16.2 跳过态全部收口（T-1220~T-1223，本地提交 4874ecf/5ab1a75/775ff3b + 本批）：D-216 决策落地——`CheckinEvent.kind?: "checkin"|"skip"` 可选字段（缺省不物化，防 10 万级存储膨胀），STORE_VERSION 2→3 由 normalizeStore 读入重版本机制自动迁移（v2 无损升级）；统计口径计算层落地（getProgress/evaluateItemRule 排除 skip、quota 不吃量、computeEventStreaks 跳过日中性桥接、完成率分母剔除、热力图/月历中性 is-skip 格、日志跳过徽章）；交互（卡片菜单跳过/取消跳过+可选原因 prompt、批量跳过单事务、卡片中性「已跳过」标签）；宽容提醒二期（跳过日不再提醒、insights recentSkipDays、coaching skip-streak 下调频率建议、洞察页「重新开始」反内疚文案中英）。每批完整 `test:quality` exit 0；新增测试 skip-model/skip-semantics/skip-interaction/skip-tolerance（109 文件全覆盖）。v16.1+v16.2 合计 8 任务构成一个可发布批次，发布待用户确认。下一步：v16.3 习惯内核（T-1224 强度分数起）。

2026-09-19 v16.1 第四批（T-1219 完成，v16.1 四任务全部收口）：宽容提醒一期。盘点确认本插件提醒为投影制（无系统通知队列）：Today 优先横幅已通过 selectPriorityReminders 排除完成态、snooze 持久化与跨日投影过期已有、提醒计划随数据写命令渲染周期自动重排。本轮增量：①提醒中心「全部」改为待办视图（filterReminderEntries 排除 completed；uhabits #1573 教训落地），「已完成」过滤保留查看能力，snoozed/skipped 保留恢复入口；②normalizeReminderUserActions 物理清理 >7 天的 snooze（skip 不受时效清理）；③提醒中心待办计数随之收窄。验证：新增 `tests/reminder-tolerance.test.cjs`、按新契约更新 `tests/reminder-actions.test.cjs`，`pnpm run check`、完整 `test:quality` exit 0（105 测试文件全覆盖）。下一步：v16.2 跳过态（T-1220 store v2→3 迁移设计，先记 DECISIONS）；按路线 v16.1 四任务已构成一个可发布批次，发布时机待用户确认（版本号与 release-notes 待定）。

2026-09-19 v16.1 第三批（T-1218 完成）：Loop Habit Tracker CSV 迁移入口。格式依据 uhabits 官方 HabitsCSVExporter/HabitList 源码（12 列 Habits.csv + 组合版 Checkmarks.csv，值 YES_MANUAL 等）；新增 `src/features/loop-csv.ts` 纯函数（解析+频率映射+同构导出），plugin-ops `importLoopPlanInto` 幂等落库与 `downloadLoopExportFor` 双文件导出，设置页新增导入（多选）/导出入口；降级边界明确：MEASURABLE 只建项目、SKIP 日不迁移（v16.2 回补）、不可映射频率降级并报告；恢复点由 persist 写前快照保证。验证：新增 `tests/loop-csv.test.cjs`（含回环）纳入 test:ui，`pnpm run check`、完整 `test:quality` exit 0。下一步：T-1219 宽容提醒一期。

2026-09-19 v16.1 第二批（T-1217 完成）：Markdown 周报/月报可配置化。`src/features/report.ts` 重写为五区块开关（events/completion/items/baseline/highlights），基线行消费 `buildReviewComparison`（带符号 delta），亮点区在无记录/项目过少时输出明确数据不足说明；报告文案 i18n 化（原硬编码中文清除）；`CheckinViewPreferences.reportSections` 持久化（归一化缺省全开）；回顾工具区新增「导出报告」（plugin-ops `downloadReportMarkdownFor`，Blob 下载与 JSON/CSV 同构）与「报告设置」弹层（勾选即写偏好）。验证：新增 `tests/report-sections.test.cjs`（区块开关/基线/不足说明/归一化/en 字典）+ v8-platform 闭包更新，`pnpm run check`、完整 `test:quality` exit 0。下一步：T-1218 Loop CSV 导入导出。

2026-09-19 v16.1 首批（T-1216 完成）：回顾页新增「较上一周期」区块。新增 `src/render/review-compare.ts`（统计条带+逐项目差值行双导出），review.ts 以共享 asOf 经 `getPreviousReviewRange` + `buildCustomSummaryContext` 推导同跨度基线并消费 `buildReviewComparison`；空两侧显示空态而非零排；计划项目 delta 恒中性色；逐项按 |完成率 delta| 排序并集渲染，基线 accent-soft 底条+本期 accent 实条；subnav 条件出现「较上期」跳转（fold id=compare）。i18n 中英 8 键；components.scss 语义 token 新增约 100 行。验证：`pnpm run check`、新增 `tests/review-compare-view.test.cjs` 纳入 test:ui、完整 `test:quality` exit 0（CSS 431,514B 告警区、低于 450K 硬线）、Edge 宽度走查 2000/1180/640/360 无溢出、100k 回顾性能基线持平（summary 6ms）。下一步：T-1217 周报/月报模板与导出。

2026-09-18 习惯体系融合路线定稿：拉取 GitHub 最新 v16.0.0（cc17593，37+ 提交：Task Horizon bridge 协议探测/重试/并发单飞矩阵 + 复盘范围比较模型）并完成竞品调研到开发规划的转化。新文档 `docs/roadmap-habit-evolution-2026-09.md` 定义 v16.1 复盘呈现与数据入口（T-1216 对比 UI/T-1217 周报/T-1218 Loop CSV 迁移/T-1219 宽容提醒）→ v16.2 跳过态（T-1220 store v2→3 + 口径 + 交互 + 反内疚）→ v16.3 习惯内核（T-1224 强度分数/T-1225 AUTO 补全/T-1226 streak 重构/T-1227 强度曲线）→ v17.0 Task Horizon 联调 → v17.1 打卡回写笔记块 → v17.2 声明式渲染块 → v18 开放生态扩展 → v19 习惯内核二期；TODO.md 追加 T-1216~T-1241；`development-roadmap-2026.md` 顶部加指针。总原则：事件=原始记录、推导=计算层；计分单一代码路径；不推翻现有五类型/六排期/复盘管道。下一步：v16.1 从 T-1216 起步。

2026-09-18 竞品调研完成：三路并行调研已沉淀至 `docs/benchmark-habit-apps-2026-09.md`——①开源源码深读（uhabits 五态模型/半衰期分数/弹性频率补全、mhabit sigmoid 成熟曲线/超额封顶、Habitica 自平衡积分与内疚感教训）；②商业竞品（Habitify/Streaks/Forest/滴答/小日常/Atoms 等 11 款优劣与行为设计 10 机制）；③笔记生态（思源集市仅 2 个打卡插件、Obsidian Tracker/Heatmap Calendar、Logseq、Notion HabitLog schema）。产出 17 条可执行借鉴清单（A 算法/B 笔记联动/C 行为设计/D 架构/E 不做），最高优先级：SKIP 一等态、强度分数、打卡回写笔记块、声明式渲染块、Loop CSV 导入。

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

- 版本真值同步 13.0.0（package.json / plugin.json / src/version.ts / dist / README / docs/v13.0.0-change-log.md / docs/releases/release-notes-13.0.0.md）；完整质量链 test:quality exit 0（92 项测试资产零退役，a11y 双主题 0 违规，10k 渲染 34ms/溢出 0px，发布资源检查通过，CSS 419,910 bytes 告警区但低于 450,000 硬线）。
- scripts/release.cjs 执行构建、测试链、提交、推送、标签与 GitHub Release（package.zip）；远端资产与发布说明 SHA-256 一致，仓库内发布说明回填最终摘要（webpack 产物 zip 元数据非字节确定，摘要以流水线上传时计算值为准）。
- 路线图基线更新：官方集市 PR #2248 已合并；13.0 专注生态消费端与 14.0 数据内核可自动化范围已随 12.0.x/13.0.0 落地；主线下一步 15.0 UI 系统（版本决策 D-156：semver 连续递增，工作流标签不等于发布版本号）。

### 13.0.1 修复版准备（2026-09-17，T-1151~T-1152）

- 定位 v13.0.0 发布后 CI browser-audit 失败的两类问题：① visual-qa 对"阅读"模板 targetStep 期望过时（T-1091 步长分离后目标输入统一 0.01）；② 真实产品缺陷——写后校验指纹对"缺省 archived"与"物化 false"不等价，编辑器新建条目保存被误判并发覆盖、重试后回滚（14.0 第六批引入，真实宿主同样复现）。
- 修复：save-form 构造条目物化 archived 缺省值 + cloneItemValue 快照防御性物化（D-157）；QA 宿主存储按名分槽并克隆失败 reject；双击提交等待卡片渲染后再点击。
- 证据：完整质量链 test:quality exit 0；Edge 浏览器 visual-qa 全链通过（results.json 输出完整、pageErrors 为空）。

### 13.0.1 发布执行（2026-09-17）

- 版本真值同步 13.0.1（package.json / plugin.json / src/version.ts / dist / README / docs/v13.0.1-change-log.md / docs/releases/release-notes-13.0.1.md）。
- scripts/release.cjs 执行构建、测试链、提交、推送、标签与 GitHub Release（package.zip）；远端资产与发布说明 SHA-256 一致，仓库内发布说明回填最终摘要（zip 元数据非字节确定，以上传时流水线计算值为准）。

### 回顾页打卡日志优化（2026-09-18，T-1153）

- 用户桌面截图指出日志行右侧大面积留白。定位：行网格 `30px | 1fr | auto` 在全宽/半宽折叠体下中段皆空；回顾区块在 ≥1180px 已是双列，日志折叠体宽约 575px。
- 变更：lc5 ≥960px 下 `.lc-checkin__log-day` 改双列网格（标题跨两列、行距走 gap）；删除 `[data-log-extra]` 属性级 display:none，额外天数统一由 [hidden] 门控——修复"展开其余 N 天"点击无效的既有缺陷。
- 证据：.artifacts/review-log-probe.cjs 宽/窄容器截图与展开探针（1500px 双列 271px×2；700px 展开后 display:block）；cross-surface/ui-theme/responsive-layout/review-summary-refresh 通过；Edge visual-qa 全链通过 0 页面错误；测试包 siyuan-checkin-v13.0.2-test.zip 供真机复验。

### 回顾页二级导航与头部优化（2026-09-18，T-1154）

- 用户桌面截图指出 ①头部工具区（复制报告/更多）显示需优化、②二级导航条下滑不跟随。真机（思源 v3.8.4-beta.5 + 界面缩放）复现并定位三个问题：
- ① 缩放后容器有效宽仅 725/582 CSS px，落在 <960 档导致工具区换行堆叠；新增 480-959px 弹窗/页签宿主层级，范围页签与工具区并为一行（排除移动宿主与 dock）。
- ② 宿主 zoom 子树内合成器滚动不重定位 position:sticky（Chromium 缺陷）：二级导航退为 relative，由滚动同步 transform 主动钉住（pinReviewSubnavRail，WeakMap 防重复绑定）；滚轮、程序化滚动、跳转三路径真机验证全部跟随且复位正常。
- ③ 跳转按钮按下标取 details 整体错位一位（年度热力图 details 插在列表中间），"趋势"会跳到"提醒"；改按 data-review-fold id 定位；scrollIntoView 落地异步导致钉住同步拿旧位置（transform 滞后 1058px 实测），改为同步直写 scroller.scrollTop + 显式同步。
- 证据：真机思源实测截图三组（同行头部/滚轮钉住/跳转+钉住）；test:quality 全链 exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### 事项页操作列与弹窗四角修复（2026-09-18，T-1155）

- 真机 Console 实测：操作按钮存在于 DOM（4×32px、SVG 图标齐全）但被多层网格档位交叠盖住不可见；弹窗圆角缺口处透出背后白色文档。
- 修复：480-959px 容器档（弹窗/页签宿主）最终层 !important 强制三列网格与操作列可见；框式快速弹窗遮罩加半透明暗色底（rgba(16,18,43,.38)），圆角缺口不再透白（D-160）。
- 证据：真机思源重启后验证——事项行操作按钮（+/编辑/启用停用/删除）全部显示；弹窗四角无白色缺口；test:quality exit 0（CSS 422,403 bytes 低于 450K 硬线）；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 已更新并同步到用户工作区。

### 事项模板库扩充（2026-09-18，T-1156）

- 用户提供事项页截图：模板全量视图过长，建议精选「推荐」分组并丰富目录。
- 变更：OCCASION_TEMPLATES 31→53（新增长辈生日/领证纪念日/相识纪念日/毕业纪念日/供暖费/车位费/宽带费/网盘会员/电商会员/游戏会员/知识付费/驾照换证/车辆保养/车辆保险续保/眼科检查/复诊提醒/元旦/元宵/端午/重阳/儿童节/教师节/圣诞节）；模板增加 recommended 标记（精选 11 个）；分组首档「推荐」默认选中，移除「全部模板」。
- 证据：真机思源验证截图（推荐组 11 项默认展示、分组计数 5/6/12/9/9/12）；occasions/i18n-hygiene/template-manager 通过；test:quality exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### 今日页优先提醒条优化（2026-09-18，T-1157）

- 用户截图指出今日页顶部优先提醒条显示需优化。定位：宽容器下该区为 flex 双列（主行+展开区并排），「定位打卡」文字按钮悬在中间，两列行错位不对称。
- 变更：最终层统一为纵向列表——主行整行、展开区整行在下，行内 20px/1fr/max-content 三列网格，「定位打卡」右对齐胶囊按钮（描边+hover 强调）。移动端 ≤719px 紧凑规则不变。
- 证据：真机思源验证折叠/展开两态；today-view/responsive-layout/priority-reminder/mobile-release-quality 通过；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新。

### dock 设置页布局修复（2026-09-18，T-1158）

- 用户真机截图：dock 侧边栏设置页恢复点卡片文字竖排、审计条目错乱、原生文件控件外露。定位：恢复点/审计列表网格规则只写在 @media ≤600px 视口断点内，桌面宽视口下 dock 窄容器（约 280-560 CSS px）无样式可用，默认 flex 被压缩。
- 变更：dock 宿主设置页列表行改容器级两列网格（文案 1fr + 按钮 auto，min-width 0 + anywhere 换行）；原生文件输入全局隐藏、保留胶囊标签。
- 证据：.artifacts/dock-settings-probe.cjs 300px dock 复现（修复前 li 380px 高竖排 → 修复后 71px 两列网格）；真机思源 dock 实测正常；test:quality exit 0；visual-qa exit 0；测试包已更新。

### dock 回顾页头部紧凑化（2026-09-18，T-1159）

- 用户真机截图：dock 侧边栏回顾页范围页签偏大、工具行（复制报告/更多）两端分散。
- 变更：lc-dock ≤479px 档压缩范围页签与工具按钮密度（28px 高），工具行成对右对齐，头部边距收紧。
- 证据：dock 探针 380px/300px 双宽度截图正常（subnav 无溢出）；responsive-layout/mobile-release-quality 通过；visual-qa exit 0；测试包 siyuan-checkin-v13.0.2-test.zip 更新并同步用户工作区。

### v14.0 开工：T-1160 打卡项删除能力（2026-09-18）

- 新增 deleteItemCascade 模型函数（移除项目+全部事件、写含 externalRef 身份的事件墓碑、不可变更新）；编辑器「删除…」入口（确认层展示记录条数与恢复点提示，persist 链自动落删除前快照）；归档页每项新增「删除」；新增 checkin:item-deleted 集成事件（API 契约事件数 6→7）。
- 证据：真机端到端实测——新建临时项→编辑器删除→确认层显示影响→项目移除；设置页恢复点管理出现删除前快照（21 个项目·124 条记录）；deleteItemCascade 独立语义校验（墓碑含 externalRef、原 store 不变、幂等）。
- 五版本计划定稿并写入路线图（v14 生命周期/v15 UI 系统/v16 复盘洞察/v17 生态联动/v18 开放生态）。

### 小驴速切组件商店协作调研（2026-09-18）

- 调研了 siyuan-speed-switch 仓库的组件商店系统：home-store-ui.ts（商店 UI）、home-external-adapters.ts（适配器注册）、checkin-bridge-model.js（打卡桥接模型，489 行，ADR 0057）。
- 发现：速切已内建 6 个打卡桥接组件（今日概览/连续记录/年度热力图/周统计/日期事项/月度统计），经 window.siyuanCheckin API v4 只读消费，无需打卡侧改动。
- 结论：打卡侧暂无必须开发项；新增组件类型需改速切侧 checkin-bridge-model.js + home-external-adapters.ts；已写入 D-167。

### 回顾页头部风格统一与详情面板宽度（2026-09-18，T-1160 补充）

- 用户截图反馈：① 复制报告/更多按钮样式与左侧范围页签不一致（工具容器用全圆角胶囊+边框，页签容器用方角无边框）；② 右侧详情面板内容没铺满可用宽度。
- 修复：review-tools 容器改为方角+无边框（与 range-tabs 容器同款 muted-surface）；tool-button/more-summary 的 border-radius 从 999px 统一为 5px、min-height 从 28 统一为 25（与页签一致）；review-detail 子元素统一 min-width:0 + width:100%。
- 证据：真机思源截图确认头部按钮风格一致、右侧详情面板正常显示；quality-run11 全绿。

### 回顾页趋势图扩展至四维度（2026-09-18）

- 用户反馈趋势图只有12周和6个月，希望更多区间筛选。
- 变更：趋势网格从 2 卡扩为 4 卡（2×2），新增 近30天活跃（日维度折线图）+ 年度记录数（年维度柱状图），快照中已有的 daily/yearly 序列首次在回顾页展示，无需状态管理。
- 证据：真机思源截图 4 卡 2×2 正常渲染。

### v15.0 开工：Today 卡片跨端上下文菜单（2026-09-18）

- 桌面保留右键菜单，手机/平板新增触屏与触控笔 520ms 长按入口；移动超过 10px 会取消长按，避免滚动误触。
- 菜单采用视口边界夹紧，窄屏右下角不会溢出；打开后焦点进入第一个动作，Escape 可关闭，长按后浏览器跟随触发的原生 contextmenu 会被抑制。
- 新增 `tests/today-context-menu.test.cjs` 并纳入 `test:ui`，锁定触屏长按、移动取消、菜单定位、焦点和键盘关闭行为。
- 证据：`pnpm run check`、定向上下文菜单测试、`pnpm run test:ui` 全部通过；CSS 体积不作为本批次优化目标（D-168）。

### v15.0 Today 操作反馈与重复提交守门（2026-09-18）

- 批量完成、批量归档、批量删除和上下文菜单动作增加单次执行守门，进行中写入 `aria-busy` 并禁用按钮，异常或完成后恢复。
- 批量删除改为在 mutation 队列内读取并写入，持久化失败时恢复原内存快照；避免队列外先改 store 导致失败后 UI 与存储不一致。
- 证据：`pnpm run check`、上下文菜单定向测试、`pnpm run test:ui` 与完整 `pnpm run test:quality` 均通过；10k 事件完整渲染 36ms、横向溢出 0px。

### v15.0 回顾页交互性能基线（2026-09-18）

- 新增 1k/10k/100k 事件基线，覆盖月范围事件选择、汇总上下文、分析快照和导出序列化，并校验范围结果与摘要事件数一致。
- 当前 100k 事件在本机约为：范围 429ms、汇总 3ms、分析快照 335ms、导出序列化 50ms；门槛用于发现灾难性退化，不把单机毫秒数当作产品承诺。
- `review-performance-baseline.test.cjs` 已纳入 `test:extended`；定向基线、扩展测试和类型检查通过。

### v15.0 Today 交互连续性批次（2026-09-18）

- 批量工具栏增加 `[data-bulk-toolbar]` 协调边界，完成/归档/删除任一动作执行期间整组按钮禁用并暴露 `aria-busy`，完成或失败后恢复原 disabled 状态。
- Today 上下文菜单补充 `role=menu/menuitem`、上下方向键循环和关闭后焦点恢复；删除卡片后若原主按钮已离开 DOM，则安全跳过聚焦。
- 菜单动作同步抛错统一进入 Promise rejection 边界；新增结构断言锁定 toolbar 互斥、菜单语义、键盘导航和焦点恢复。
- 证据：`pnpm run check`、`pnpm run test:ui`、`pnpm run test:extended` 与完整 `pnpm run test:quality` 已通过；真实思源宿主焦点/滚动仍归 T-1173 与 B-007 现场验收。

### v15.0 归档、生态与跨表面交互批次（2026-09-18）

- 归档页新增累计达成天数与最近打卡日期/时间；最近记录先按 itemId 分桶，累计达成继续复用 `countCompletedDays`/`isComplete` 业务口径。
- Task Horizon 合作契约补充 `getEventRangeSummary`：半开本地日期区间、366 天/5,000 事件/366 点上限、`truncated` 标记和防御性聚合投影；新增「任务打卡」配额模板（目标数量可调整）。
- 跨表面交互测试锁定归档恢复/删除、回顾复制/导出、设置导入/恢复统一的 `aria-busy`、重复提交、错误可见性与焦点恢复；新增测试已纳入生态/扩展质量链。
- 定向证据：`pnpm run check`、`node tests/event-range-summary.test.cjs`、`node tests/cross-surface-interaction.test.cjs`、`node tests/archived-search.test.cjs`、`node tests/i18n-hygiene.test.cjs` 通过。完整质量链待本轮汇合后执行。

### v15.0 归档批量管理与自动归档契约批次（2026-09-18）

- 归档页支持逐项选择、筛选结果全选、批量恢复与批量删除；批量恢复/删除各自只进入一次 mutation 队列并持久化一次，删除仍展示项目/记录影响并保留墓碑与恢复点语义。
- 批量工具栏共享 `aria-busy` 与整组禁用边界，避免恢复与删除交叉排队；560px 以下操作按钮回流到第二行，历史页通用三列布局不受影响。
- 编辑已有项目时在高级区显示累计达成天数；新建项目不计算历史，继续复用 `countCompletedDays`/`isComplete` 业务口径。
- 新增 `checkin:item-archived` 生态事件，仅真实自动归档状态转换成功后广播；手动归档仍使用 `item-updated`。项目、修订、周期、quota、归档区间和自动归档配置均作防御性克隆。
- 验证：`pnpm run test:quality` 全链与 `node tests/width-walkthrough.cjs` 通过；100k 事件/3,650 天自动归档投影约 199ms，10k Today 完整渲染 35ms、横向溢出 0px；无障碍 0 缺名/0 正向 tabindex/0 对比度违规。生产 CSS 429,056 bytes，低于 450,000-byte 硬线。
### v15.0 自动归档闭环与批量生命周期性能批次（2026-09-18）

- T-1174：修复手动打卡成功后未进入自动归档检查的问题；现在手动/API 写入复用同一阈值判断，仍保持“保存成功后检查、撤销不自动恢复”的既有语义。
- T-1175：Today 批量归档与批量删除从逐项 mutation/逐项持久化收敛为单事务；取消确认或保存失败时不退出批量选择，成功后继续逐项目广播 `item-updated`/`item-deleted`。
- T-1176：新增 `deleteItemsCascade`，项目、事件和墓碑单次线性投影；单项目删除继续委托该兼容入口。新增 100 项/100,000 事件性能与墓碑完整性测试，并纳入 `test:perf`。
- T-1177：Today 上下文菜单补 Home/End/Tab、整组禁用和 `aria-busy`；归档行恢复/删除共享行级互斥，成功移除当前行后优先聚焦相邻同类动作，没有候选时回到搜索框。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；10k Today 完整渲染约 38ms、批量删除 100k 事件约 16.6ms、回顾 100k 范围查询约 393ms/快照约 350ms；无障碍 0 缺名/0 正向 tabindex/0 对比度违规；CSS 429,056 bytes，低于 450KB 硬线。`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0 批量完成与选择连续性批次（2026-09-18）

- T-1178：Today 批量完成从逐项目 mutation/持久化/重渲染改为一次 `completeItems` 事务；同一自然日快照生成全部事件，失败整批回滚并保留选择。
- T-1179：模型新增 `appendEvents`，一次索引检查和一次数组克隆完成批量追加；严格过滤已有及批次内重复 ID/externalRef、ID/外部身份墓碑，`appendEvent` 保持原签名并委托新核心。
- T-1180/T-1181：全选仅遍历当前 `[data-bulk-check]` 结果；筛选重渲染会剔除不可见旧选择。逐项选择、全选、计数、按钮禁用均局部更新，不再为一次勾选重渲染完整 Today 表面。批量完成仍逐条广播 `event-recorded`，合并一次 `analytics-updated`，保留日期事项联动、自动归档和最近记录反馈。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；100k 历史追加 1,000 事件约 3.6ms，100 项/100k 事件批量删除约 14.2ms，10k Today 完整渲染约 81ms；无障碍 0 缺名/0 正向 tabindex/0 对比度违规；CSS 429,056 bytes，低于 450KB 硬线。`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0 删除并发复核与自动归档批处理（2026-09-18）

- T-1182：单项目删除纳入 storage mutation 队列，锁内重新读取当前项目后级联删除；Today 上下文菜单成功删除会立即刷新表面，编辑器和归档页继续由各自导航路径收口。
- T-1183：单项、Today 批量、归档批量删除在用户确认后、实际写入前重新核对项目数量与记录数量；跨窗口变化会显示可见提示并中止，避免按过期影响数字删除新增记录。
- T-1184：自动归档改为 `maybeAutoArchiveItemsAfterRecord` 批处理，多个达标项目共享一次 mutation/持久化；`applyArchivedItems` 同时服务手动批量归档与自动归档，归档周期起点语义保持一致。每个项目仍按顺序广播 `item-updated`、`item-archived`。
- T-1185：单项目自动归档保留名称和达成天数，多项目改用聚合反馈；性能门禁扩展为 50 项/100k 事件批量资格投影。完整质量链测得单项约 270.5ms、批量约 448.6ms；独占复跑分别约 184.6ms/273.8ms。
- 验证：`pnpm run test:quality` exit 0，98 个测试文件零退役；无障碍 0 缺名/0 正向 tabindex/0 对比度违规，CSS 429,056 bytes 低于 450KB 硬线；`node tests/width-walkthrough.cjs` 全矩阵无横向溢出。

### v15.0.0 发布准备（2026-09-18）

- T-1186：版本真值同步至 15.0.0，新增完整变更记录与 GitHub 发布说明，README 维护重点和文档索引已更新。
- 发布范围覆盖跨端上下文菜单、批量生命周期事务、归档摘要与批量管理、删除并发复核、自动归档批处理、有界日期摘要 API 及十万级性能门禁。
- 已知边界继续保留：真实思源页签、dock、移动端软键盘和多窗口交互需目标客户端现场复核，不以自动化结果替代。
- 发布视觉走查发现模板摘要仍写死旧的 24 项基线；已改为动态核对实际渲染目录数量，并将 README 当前内置模板数量校正为 40，避免后续扩充再次产生假失败。
- T-1187：`pnpm run test:quality`、`width-walkthrough`、浅/深主题 `visual-qa` 和最终 `release-assets` 全部通过；98 个测试文件零退役，无障碍 0 违规，CSS 429,056 bytes 低于 450,000-byte 硬线。
- 最终待发布 `package.zip` 为 376,186 bytes，SHA-256 `6328c7b073bae5704d5b0fa8dd2cfbec576010e7d1ea4365e3864f4f28628c1d`。

### v15.0.0 正式发布（2026-09-18）

- T-1188：发布提交 `f7086dd` 已推送至 `main`，注释标签 `v15.0.0` 指向同一提交，GitHub Release 已公开：https://github.com/ai68298100/siyuan-checkin/releases/tag/v15.0.0
- 远端 `package.zip` 为 376,186 bytes，GitHub 资产摘要 `sha256:6328c7b073bae5704d5b0fa8dd2cfbec576010e7d1ea4365e3864f4f28628c1d`，与本地安装包及发布说明完全一致。

### 拆除预算与真实例验证（2026-09-19）

- 依据：通读 `siyuan-note/siyuan` master（v3.8.4）的 `app/src/plugin/{loader,lifecycle,uninstall,index}.ts`、`kernel/model/{plugin,push_reload}.go`、`kernel/api/{file,router}.go` 与 `siyuan-testing` 的 Playwright 基础设施，逐项比对插件当前实现。
- T-1242（D-220）：卸载路径自带 3.6s 排空 + 900ms 补写预算、拆除期写门禁、专注心跳与庆祝延时回收、`msg.teardownTruncated` 提示；新增 `src/teardown.ts` 与 `tests/teardown-budget.test.cjs`（纳入 `test:extended`）。
- T-1243：`src/render/block-renderer.ts` 配置文本改为 `.hljs [contenteditable] → .hljs → pre → code` 四级回退；`docs/siyuan-compatibility.md` 重写为如实登记三处内部 DOM 耦合、11 项智能体能力（4 写 7 读）、生命周期约束与 `?remote=1`/只读降级；新增 `tests/block-dom-compat.test.cjs` 同时守代码回退链与文档口径。
- T-1244：真实例 E2E 骨架落地——`scripts/e2e/lib.mjs`（内核探测、带标记的独立工作区、`setBazaar`+`setPetalEnabled` 启用链、putFile 存储读写、日志与退出）、`playwright.e2e.config.mjs`、`tests/e2e/`（打卡落盘+重载恢复、`externalRef` 幂等、双窗口 `onDataChanged` 不回写主存储）。`pnpm run test:e2e` 3/3 通过（思源 3.8.4，12.5s）。
- T-1245：清除 `tests/visual-qa.cjs`、`tests/ui-sweep.cjs`、`tests/accessibility-audit.test.cjs`、`scripts/environment-check.cjs`、`tests/mobile-qa-harness.md` 中绑定他人主目录的路径，新增 `tests/portable-paths.test.cjs`（280 个受控文件 0 命中）。
- 关键发现（记 D-221 / TODO T-1246）：双窗口接收方不回写主存储，但会原样重写 `checkin-suggestion-workflow` 与 `checkin-store-audit` 两个辅助存储，构成可消除的写放大与额外推送。
- 验证：`pnpm run check`、`pnpm run build`、完整 `pnpm run test:quality`（122 个测试文件、0 退役）、`pnpm run test:e2e` 全部通过；CSS 441,170 bytes 仍逼近 450,000 硬线。
- 同步记录：本轮工作目录 `D:\AI\Codex\siyuan-checkin` 由 GitHub `main`（`09f82bb`，v17.0.0）快照同步而来，非 git 检出（本机 `github.com` 不可达，只能走 `codeload` tarball）。

### 辅助存储写入与宿主形态覆盖（2026-09-19）

- T-1246（D-221 补记）：接收方 `onDataChanged` 不再原样重写建议工作流（等值即跳过，基线在两条读取路径建立），审计改 1.5 秒合并窗口并在拆除收尾落盘；双窗口 E2E 实测辅助写入 2 → 0。新增 `tests/aux-write-hygiene.test.cjs`。
- T-1248：新增 `tests/e2e/plugin-lifecycle.spec.mjs`（真实禁用→`window.siyuanCheckin` 在 5s 预算内交出→注销后 2.6s 零 `putFile`→重新启用后数据完整）与 `tests/e2e/mobile-bundle.spec.mjs`（iPhone 13 视口加载 `/stage/build/mobile/`，公开 API 可打卡落盘、`#lcCheckinMobileTopBarButton` 注入、零未捕获异常）。
- T-1249：新增只读实例通道 `playwright.e2e.readonly.config.mjs` + `tests/e2e/readonly/`（`serve --readonly true`，前置自证内核拒绝 `putFile`），断言只读下 `recordEvent` 不报成功、插件保持可用、磁盘记录数不变。发现记 D-222。
- T-1250：移动顶栏入口 `aria-label`/`title` 改走 `t("entry.mobileTopBar")`（中英各一键）；`tests/i18n-hygiene.test.cjs` 补 `setAttribute("aria-label", "中文")` 形态检测。
- 新登记待办：T-1251（随包发布 `i18n/zh_CN.json`+`en_US.json` 以本地化 dock/命令/顶栏 4 处宿主面文案）、T-1252（卫生守门 `${t(` 行级豁免漏洞，`render/review.ts` 约 :307 漏网）。
- 验证：`pnpm run check`、完整 `pnpm run test:quality`（123 个测试文件、0 退役）、`pnpm run test:e2e` 5/5、`pnpm run test:e2e:readonly` 1/1。

### 智能体接入自证（2026-09-19）

- 用户报告「智能体开着却显示未检测到可用入口」。查明：真实宿主的登记是正常的（E2E 断言宿主侧 `agentCapabilities` 恰 11 项、4 项写入型、策略未拒绝），问题出在插件把「存储读取失败」也显示成「宿主不支持」。
- T-1253（D-223）：注册改为与存储读取解耦并落到四态状态机（`pending`/`registered`/`unsupported`/`failed` + 计数 + 原因），设置页文案分列并给出宿主侧核对位置；`set.agentOff` 退役，新增 5 个中英键。
- 新增 `tests/agent-status.test.cjs`（渲染四态 + 注册时机契约 + 双语字典 parity）纳入 `test:ui`；新增 `tests/e2e/agent-capabilities.spec.mjs`（宿主侧真实登记与策略）；`docs/siyuan-compatibility.md` 补「宿主侧核对方法」与发布前检查项。

### 移动端回顾页与导出通道（2026-09-19）

- 用户报告手机端回顾页四处问题（工具栏错位、两处下拉被遮、自定义被遮、点导出报告思源重启）。全部在真实移动 bundle 里量出根因后修复，记录 D-224。
- T-1254：`.lc-checkin__header-actions` 的 `overflow:hidden` 与 `.lc-checkin__editor-header` 的 `position:static`（使 sticky 时代的 `z-index:4` 失效）两处叠加造成裁剪；工具栏错位来自 `.lc-checkin__text-button` 全局 `margin-top:15px` 被继承 + 双层胶囊撑高；移动端 `space-between` 造成空洞。
- T-1255：新增 `src/download.ts` 统一保存通道——原生容器写 `assets/` 后交宿主 `saveExportFile`（宿主拒绝才退容器桥，成功不重复），原生路径零 blob 导航；7 处导出入口改道，Loop 双文件顺序保存。
- 验证：新增 `tests/download-channel.test.cjs`（纳入 `test:extended`）与 `tests/e2e/mobile-review-ui.spec.mjs`；`pnpm run check`、完整 `pnpm run test:quality` exit 0、`pnpm run test:e2e` 7/7、`pnpm run test:e2e:readonly` 1/1。
- 文档：README 与 `docs/export-formats.md` 补充「手机端导出会在工作区 `assets/` 留下文件」的行为说明。
- 运维注意：E2E 默认工作区 `~/SiYuan-Checkin-E2E` 的 `.lock` 被一次强制杀进程后残留占用，本轮改用 `CHECKIN_E2E_WORKSPACE=~/SiYuan-Checkin-E2E-b`；`waitForBoot` 已加「工作区被锁定」的即时失败与提示，不再空等 60 秒。

### v17.1.0 发布准备（2026-09-19，未推送）

- 版本号已统一为 17.1.0（`src/version.ts`、`package.json`、`plugin.json`、README 当前版本行），新增 `docs/v17.1.0-change-log.md` 与 `docs/releases/release-notes-17.1.0.md`，README 增加「17.1.0 维护重点」。
- 产物：`package.zip` 401,194 字节，SHA-256 `d390c0e2ef2ecdc098ba62e9afb7eadc8f4bc09143bf66b4704a844b5927ffd6`（已回填进两份发布文档）。注意 `test:quality` 链内含 `build`，任何一次重跑都会因 zip 时间戳变化而产生新摘要，因此哈希必须在最终构建之后回填，并单独一次 docs 提交（与 v17.0.0 的 `docs: backfill … SHA-256` 做法一致）。
- 验证：`pnpm run check:release` 通过（v17.1.0），完整 `test:quality` exit 0（125 个测试文件、0 退役），`test:e2e` 7/7、`test:e2e:readonly` 1/1（思源 3.8.4）。
- 仓库接入：本目录原先是 tarball 快照，已 `git init` + SSH 远端 `git@github.com:ai68298100/siyuan-checkin.git`，`main` 对齐远端 `09f82bb` 后本地提交 `596f292`（release）与哈希回填提交，均为快进可推送。
- 发布通道：`gh` 本机未安装，改用 api.github.com 创建 Release 并上传资产（token 取自 git 凭据管理器，只在脚本内使用）；代码与标签走 SSH 远端。

### v17.1.0 正式发布（2026-09-19）

- 远端 `main` 推进到 `06cf516`（`596f292` release 提交 → `ed53d03` 哈希回填 → `06cf516` 门禁缺口记录），注释标签 `v17.1.0` 已推送。
- GitHub Release：https://github.com/ai68298100/siyuan-checkin/releases/tag/v17.1.0（id 392014777，非草稿，标题「小飞驴打卡 v17.1.0」，正文取 `docs/releases/release-notes-17.1.0.md`）。
- 资产 `package.zip` 401,194 字节，SHA-256 `d390c0e2ef2ecdc098ba62e9afb7eadc8f4bc09143bf66b4704a844b5927ffd6`；已从 API 回读资产核对，远端与本地摘要逐字节一致。
- 注意：本机 `github.com/.../releases/download/...` 直链返回空响应（objects.githubusercontent.com 不可达），API 通道可用——取源码与取资产都走 api.github.com。

2026-09-19 底栏番茄钟 PR #5 评审修复（T-1266~T-1268 / D-235~D-237）：依据用户提供的《完整修复方案（按 17.0.0 复核）》，逐条对照 17.1.0 源码确认全部问题点后分三批落地。批次A：`startFocusFor` 启动成功后不再复检 `canStart`（消除「启动成功即自动暂停」），新增 `focusMappingFingerprint`（修订+direction+tomatoMode）识别等待期业务变化并只回滚本次会话。批次B：桥内维护 ownedFocus 会话归属，start 必须返回非空 sessionId（否则 START_UNCONFIRMED 不接管），停止经 provider/失效/active/sessionId/阶段五重守门，`pause-session` 能力携带 sessionId；available:false 即时解绑并失效该 facade；注销 `{stopActive:false}` 纯解绑，卸载不再暂停跨插件计时器；完成清理立即释放「正在专注」并移除 5 秒全局空闲轮询；诊断优先级 ready 前置。批次C：新增 `src/features/docktomato-inbox.ts` 纯函数层（completedAt 严格时钟、载荷规范化、容量 200、1s/5s/30s 重试），完成判定重排为 duplicate → user-removed → 项目可用性（归档后重复通知不再误报 missing-item），宿主内部写入器在已持有存储锁内运行（不经公开 recordEvent 重复排队），atMost 三层拒绝、跳过日 blocked 由用户决定、完成后复用自动归档与锚点旁路；`reconcileDockTomatoInbox` 就绪后与到期时驱动、无常驻定时器。提供方要求写入 `docs/docktomato-integration-plan.md` 契约节；上游 PR 修订与真实宿主联调待对方排期，B-007 继续跟踪。验证：`pnpm run check`、`test:ui`、`test:ecosystem`（新增 `focus-adapter` / `docktomato-inbox` 两个测试文件，桥/判定/集成契约测试全面重写为可执行竞态矩阵）、`test:extended`、`pnpm test` 与生产构建全部通过。

2026-09-20 复审与上游对照（T-1266~T-1268 增量）：逐行重读桥/焦点适配器/收件箱/宿主接线后收口三处——①`adapter.start` 在 `facade.start()` 解决后先校验 `bridgeDisposed || boundFacade !== facade || invalidatedFacades.has(facade)` 再登记归属（启动等待期间解绑/换绑不得用旧调用接管新绑定，对齐修复方案第三节）；②桥对宿主写入通道返回 `undefined`（`enqueueMutation` 刷新失败路径）显式抛 `DOCK_TOMATO_CHECKIN_WRITE_REJECTED`，不再 TypeError 误判；③今日页专注入口对 `direction === "atMost"` 项目禁用并说明原因（`msg.focusAtMostUnsupported` 中英），计时完成记账会把专注转换成破戒记录，真实破戒仍走「记破戒」。上游对照：`5kyfkr/siyuan-plugin-docktomato` 最新 v2.2.9（2026-09-19）不含 focus facade，生产环境桥不绑定、零兼容影响；PR #5 head 仍为 `23fdd55` 未动，上游 main 已前进（mergeable dirty），修订 PR 需先 rebase；提供方契约要求（start 返回最终 sessionId、pause-session、completedAt、available detail、默认关闭开关）全部落在 PR 修订侧。桥测试新增「启动完成前换绑不登记归属」「undefined 结果不误判」两场景并修正计数，集成契约断言同步。`pnpm run check`、焦点/桥/判定/收件箱/契约/i18n 卫生测试全部通过；产物摘要刷新为 `17c74821…` 后 `test:quality` 全链 exit 0。

2026-09-20 第三轮深检（T-1266~T-1268 收口）：按方案第九节 31 项运行级验收清单逐条比对实现与测试,发现并修复两类真实缺口——①通知丢失路径:未就绪/排队器刷新失败时完成通知此前只存在于内存即被放弃,违背方案「先缓冲再处理」;重构 `processDockTomatoCompletion` 为「先缓冲进收件箱(内存+尽力落盘) → 再排队处理」,`enqueueMutation` 返回 undefined(刷新失败)显式映射为 retry:storage-refresh-failed,任何失败路径都不丢已接收通知。②归档项目误标:桥完成判定此前只传 `api.getItems()`(过滤归档),归档且从未入账的完成通知误报 missing-item;接入 `api.getArchivedItems()` 后正确报 blocked:archived-item,与「已入账且归档→duplicate」「未入账且归档→blocked」的三分语义对齐。桥测试新增归档未入账场景,集成契约新增三条断言(归档参与判定/先缓冲/刷新失败上报 retry)。31 项验收清单核对结果:28 项由本仓库代码+测试覆盖,2 项(按会话原子暂停、会话累计时长)为提供方 PR 修订义务已写入契约文档,1 项(跳过日的「撤销跳过并计入」手动交互)按验收「blocked 不默默删除」达标,手动 UI 登记为后续批次。`pnpm run check`、主链、UI、移动、生态、扩展全绿;摘要刷新为 `0e949924…` 后 `test:quality` 全链 exit 0。

2026-09-20 第四轮细节扫尾（T-1266~T-1268 增量）：全局残留扫描(旧函数/TODO/硬编码文案)后收口三处细节——①番茄来源备注「来自底栏番茄钟」硬编码中文并随事件入库展示,英文界面可见中文;新增 `record.tomatoSource` 中英键,写入器改走 i18n(双字典 1097=1097 对等);②`msg.focusDockMissing` 按方案第七节补全「第三方联动开关未开启」这一可能原因(上游默认关闭开关落地后 facade 缺失有安装/开关两种原因,不能只提示安装),中英同步;③`docs/v17.1.0-change-log.md` 补「底栏番茄钟联动修复」维护节,与发布说明维护记录对齐。设置页 `tomatoHealthy` 与新诊断优先级(natural 兼容:running/paused 必然 ready)核对无误。桥/判定/收件箱/契约/焦点/i18n 卫生测试全绿;摘要刷新为 `7c00aefb…` 后 `test:quality` 全链 exit 0。四轮累计:实现层未再发现新缺口,剩余事项全部为外部依赖(上游 PR 修订 + rebase、B-007 真机联调、跳过日手动交互 UI 批次)。

2026-09-20 最终核查与定稿推送（T-1269）：对照修复方案全文逐节复核——第一/七节保留行为与偏好边界(偏好仅三处用户显式写入,无自动改写)、第二~四节生命周期、第五~六节收件箱与 completedAt、第九节 31 项验收(28 代码+测试 / 2 提供方义务 / 1 后续 UI 批次)全部对上;方案第十节要求的交付内容(修改文件清单/能力与错误码/存储 schema 与迁移/运行测试结果/真实客户端验收边界)定稿写入 `docs/docktomato-integration-plan.md`「交付清单」节。经用户明确授权后执行推送:main(13 个提交,`c2b1435`…`<final>`)推送至 origin(见下方推送记录)。剩余外部事项:上游 PR #5 修订(契约节+交付清单可直接转对方)、B-007 真机联调。

2026-09-20 持续开发批次（T-1270~T-1272）：依次完成三任务。①T-1270 收件箱手动管理:设置页新增「待回写的番茄完成」区块(容量+最新 20 条,状态复用诊断理由文案),每条支持立即重试/丢弃,skipped-day 条目支持「撤销跳过并计入」——同受保护单元内先写 skip 墓碑再复用内部 writer,未入账时墓碑同单元回滚,duplicate 路径显式持久化墓碑;零新增 CSS。②T-1271/D-238: minAppVersion 3.4.2→3.8.4(实测基线,兼容矩阵/README/发布说明同步,门禁锁定声明值=实测基线)。③T-1272/D-239(用户明确要求): CSS 预算放宽为 480KB 告警/520KB 硬阻断,318KB 软线保留,当前 448,170 bytes 回落为常规 warning。ui-docs 断言随 README 版本行同步。摘要回填 `408d9a6d…` 后 `test:quality` 全链 exit 0。下一批候选:竞品调研续作(第二梯队集市插件/Obsidian Tracker 精读)、v18 API v5 设计稿(待隐私评估的摘要驻留除外)。

2026-09-20 调研与设计批次（T-1273~T-1274）：①T-1273 调研续作落盘 benchmark 活文档「七、调研续作记录」——思源集市全量复扫确认专打卡仍只有我们+Achuan-2,第二梯队约 20 个任务/番茄/日记/时间类插件(联动面大于竞争面,points-reward 为 v19 积分唯一集市参照);Obsidian Tracker 精读确认表达式引擎(dataset/sum/maxStreak、textValueMap 正则键、colorByStreak)与 falsey 终止语义;Habit Tracker 21 纠正「gapStyle」实为 maxGap 数字容忍(3/6/13/30 频率对照),缺勤日淡化渲染值得渲染块吸收,entries[] 一习惯一文件模型可作 Obsidian 迁入通道。②T-1274/D-240 API v5 设计稿定稿为草案:四缺口(范围读/单条写结果含糊/项目二分/指标无门面)五提案(range.read/record.batch/queryItems/metrics.read/协商补强),只增不删、单条 recordEvent 行为不变,排除隐私待评项。文档改动不触及包体,zip 摘要维持 408d9a6d…;ecosystem-docs/export-identity-docs 回归通过。下一批候选:v5-1 只读批次实现、渲染块断签淡化、或按用户指示。

2026-09-20 API v5-1 只读批次(T-1275/D-240):CHECKIN_API_VERSION 4→5,能力清单 14→16(items.query/events.range.read,均 read+localOnly),新增 CHECKIN_EVENTS_READ_LIMITS/CHECKIN_ITEMS_QUERY_LIMITS 冻结限额。纯过滤边界 `src/features/api-v5.ts`:itemIds 消毒限量、source 白名单校验、skip 按需排除、limit 夹取+truncated 判定(再多一条匹配即报截断);项目投影 archivedOnly 优先于 includeArchived、kinds 全非法 fail-closed 返回空(拼写错误不放大为未过滤)。api.ts 接线沿用 getCustomSummaryContext 的 TypeError 先例,事件返回 {...event} 快照、项目走 cloneItem 防 getter 逃逸。Task Horizon 契约 minApiVersion 显式钉 4(v4 面冻结承诺),修复 manifest 对齐断言。tests/api-v5.test.cjs(约 20 断言)入 test:ecosystem;合作文档/走查/README 能力清单同步 v5。下一批:渲染块断签淡化(maxGap 调研吸收)或 v5-2 批量写。

v5-1 摘要回填:3eeba820…(API 契约变更使包体改变)。

2026-09-20 渲染块断签淡化评估（T-1276,吸收项闭环）：按调研候选实现原型（month 视图逐 item 记忆化 deriveQuotaAutoDays、is-auto 淡化格+图例），单测失败触发语义核查——quota 项目的 isComplete 是回溯性完成（getProgress 取整周期进度,不按日截断）,周期达标后达标日之前的剩余日本就渲染为完成色。即 AUTO 回溯完成在呈现上已强于 maxGap 淡化容忍,「缺签缺口」在本语义下不存在,autoOnly 为死代码。按 D-051 可证明性原则回撤原型(checkin-block/i18n/CSS/测试四处干净还原,渲染块回归 15ms 通过),评估结论与关闭理由写回 benchmark 活文档供后续引用。经验:调研吸收项先验证语义缺口存在,再写呈现代码。

2026-09-20 API v5-2 幂等批量写（T-1277/D-240）：能力清单 16→17（events.record.batch,write）。核心是纯规划函数 `planBatchRecord`——单遍完成结构校验(rejected:invalid-input/item-id/source/value/unit/external-ref/note/occurred-at)与时钟注入(occurredAt 缺省→now 并标 usedFallbackTime,非法→拒绝不回退),再按固定顺序分类 duplicate(存量事件+批内重复回显首条)→ tombstone discarded → blocked(missing-item/archived-item/at-most-item/not-scheduled/mapping-changed,按完成日期修订校验 unit)→ recorded(附 recordedIndices 供宿主追加后回填 eventId,planned.unit 解析为完成日期修订值)。宿主 `recordEventsBatch`:未就绪/持久化失败整体拒绝(Promise reject),单单元内 makeEvent→appendEvents(模型层身份+墓碑二次防线)→persist→逐事件 event-recorded 广播+单次 analytics-updated→受影响项目复用 maybeAutoArchiveItemsAfterRecord→锚点旁路仅刷新状态。单条 recordEvent 行为不变。api-v5 测试扩为 15 输入混合矩阵+跨午夜+限额;契约测试 +4 断言;README/合作文档(17 项)/走查/设计稿同步。摘要回填 747460c2… 后 test:quality 全链 exit 0。下一批:v5-3 指标门面(getStreaks/metrics.read)。

2026-09-20 API v5-3 指标门面（T-1278/D-240):能力清单 17→18(metrics.read);getStreaks 走 computeEventStreaks 单一实现,itemIds 有界过滤与只读快照;longest 连续与 capabilitiesSince 协商补强按设计稿留待后续。摘要回填后全链 exit 0。v5 三批全部落地:范围读/批量写/指标门面,运行时版本 5,Task Horizon minApiVersion 钉 4 不受影响。

2026-09-20 Obsidian Habit Tracker 21 迁入通道（T-1279):features/obsidian-habits.ts 纯解析(frontmatter 引号剥离/块列表与内联 entries/非法日期消毒/去重排序;无 frontmatter 拒收);plugin-ops importObsidianHabitsInto(每日二值项目+source=import+obsidian21:<文件名>:<日期> 幂等身份,外部身份与同日双重去重);EXTERNAL_REF_PREFIX_REGISTRY 登记前缀并同步 identity-and-merge.md;设置页「从 Obsidian 导入」多选 .md;颜色与 maxGap 容忍不迁移(确认文案如实说明)。i18n 中英 6 键(1117 对等);obsidian-habits.test.cjs 入 test:ecosystem。摘要回填后全链 exit 0。

2026-09-20 longest streak 与协商补强（T-1280/D-240 v5-3 预留项收口）:model.ts 新增 computeLongestStreaks——与 computeEventStreaks 同一套状态语义（真实/派生 +1、跳过中性桥接、at-most 连续无破戒）的全历史正向扫描取最大值,现有函数零改动;api.ts getStreaks 升为 {itemId,current,longest};api-contract 新增冻结 CHECKIN_CAPABILITIES_SINCE 映射并挂入 describe(),v4 消费方可在 v5 宿主上按能力探测首次版本。测试:断签后 longest>current、跳过桥接不加成、capabilitiesSince 冻结与 v4/v5 分野断言。v5 全部预留项收口完毕。

T-1280 摘要回填后全链 exit 0。

2026-09-20 真实内核 E2E 回归(自动化,非真机人工):本机思源 3.8.4 内核 + 隔离工作区,`pnpm run test:e2e` **8/8 通过**(智能体登记 11 项、打卡落盘+重载恢复、只读保存失败反馈、双窗口对等同步且接收方不回写、移动端 bundle 加载与打卡、移动端回顾页对齐/浮层/导出、插件禁用零写盘+重启用数据完整、回顾建议确认执行撤销)、`pnpm run test:e2e:readonly` **1/1 通过**。此轮回归覆盖了近期全部风险面:卸载纯解绑(D-226)、收件箱装载、API v5 契约、minAppVersion 3.8.4。README「17.1.0 维护重点」补本批能力摘要。任务池收敛:剩余仅外部依赖(推送授权、Task Horizon 排期、隐私评估、真机 B-007)与需用户新立项的主题。

2026-09-20 浏览器级验收批次：宽度走查 12/12 无溢出(2000/1180/640/330 全表面);visual-qa 双主题(light/dark)各 277 项检查全部符合预期(exit 0;false 项均为无重叠/已卸载等预期语义),覆盖收件箱管理 UI、Obsidian 导入行等近期界面改动。无需代码变更。

2026-09-20 v17.2.0 发版准备（T-1281）：版本三处统一升至 17.2.0；新增 docs/v17.2.0-change-log.md（开发者向全量变更）与 docs/releases/release-notes-17.2.0.md（用户向,「升级前必读」置顶 minAppVersion 3.8.4 警告）；README 当前版本与要点节同步。产物 package.zip 摘要 f84728b8… 已写入发布说明；`check:release` 以 v17.2.0 通过、`test:quality` 全链 exit 0。发布动作（tag v17.2.0、push main+tag、GitHub Release 上传资产）待用户授权后执行。

2026-09-20 发布流水线加固与发布 runbook（T-1282）：release.cjs 两处加固——①发布前测试链对齐 test:quality 全量（补 test:extended/test:perf/test:legacy-style/test:review-comparison,此前子集漏掉扩展与性能链）；②gh CLI 可用性检查提前到任何 git 写操作之前（17.1.0 经验：本机无 gh,原脚本会在 push+tag 之后的 Release 步骤才失败,留下"已推送未发布"半成品）。本机实测：gh 缺失时按设计在 push 前中止。**v17.2.0 发布 runbook**：前置=工作区干净(当前是)+版本三处已 17.2.0(当前是)+notes 摘要行就位(当前是,需以最终构建刷新);命令=`node scripts/release.cjs 17.2.0`（版本无变更跳过改写,构建+全量链+commit+push+tag+gh release）；本机 gh 未装 → 要么先 `winget install GitHub.cli` 并 `gh auth login`,要么按 17.1.0 记录改走 api.github.com(token 取自 git 凭据管理器)创建 Release 并上传 package.zip(以 .artifacts/notes-17.2.0.md 为说明)。

2026-09-20 v5 性能门禁与发布干跑：①api-v5 测试补性能门禁(T-1172 哲学)——10 万级事件范围读(日期索引)与 200 条批量规划(O(批×事件)有界扫描)各设 2000ms 灾难退化捕获,本机实测通过;②release.cjs 真实干跑——构建+全量测试链通过后在 gh 前置检查处按设计中止(exit 1,零 git 写),验证了发布 runbook 的中止语义;真实发布仍待用户授权(装 gh 或走 api.github.com 流程)。

2026-09-20 Obsidian 迁出与 E2E v5 spec（T-1283/T-1284）：①buildObsidianExportFiles 导出活跃项目为 H21 习惯 .md（完成日=非跳过事件日,文件名消毒+冲突唯一化,无记录/超上限计入 skipped,上限 30）,downloadObsidianExportFor 顺序多文件下载,设置页按钮+完成消息;i18n 中英 4 键(1120 对等);round-trip 测试(导出→解析无损还原)+文件名消毒/唯一化断言。②tests/e2e/api-v5.spec.mjs:真实内核验证 version=5、capabilitiesSince 4/5 分野、三个新方法形状与归档语义,test:e2e 升为 9/9。摘要回填后全链 exit 0。

2026-09-20 批量写真实内核 E2E（T-1285）：tests/e2e/api-v5-batch.spec.mjs——recordEventsBatch 两条带 occurredAt 的 api 记录一次落盘(内核存储文件核验 externalRef 原样保留、source=api),页面重载后同 externalRef 重放全部 duplicate 且内核不新增记录;test:e2e 升为 10/10 全过。v5 批量写路径(规划→追加→持久化→广播)自此有真实内核证据。任务池维持硬收敛:剩余仅 v17.2.0 发布(等授权)与外部依赖。

2026-09-20 番茄完成全链路真实内核 E2E（T-1286）：tests/e2e/docktomato-completion.spec.mjs 在真实思源内核上注入 completion 事件并断言——正常入账（值=实际时长、来源=tomato、完成日=completedAt 本地日、重复幂等）；跳过日 blocked:skipped-day（收件箱内核文件留痕、用户跳过原样保留、零误入账）。test:e2e 升为 12/12。v17.2.0 头牌功能的真实宿主证据补齐。

2026-09-20 移动端番茄联动 E2E 与 longest 性能门禁（T-1287/T-1288）：①docktomato-completion.spec.mjs 增补 mobile bundle 场景——番茄完成联动在移动端前端同样真实入账（test:e2e 升为 13/13）;②api-v5 测试补 computeLongestStreaks 性能门禁——对 2000 年至今约 26 年窗口全历史逐日扫描设 2000ms 灾难退化捕获,本机实测通过。

2026-09-20 跳过日解析旅程 E2E（T-1289):真实内核 + mobile bundle 走完整用户旅程——dispatch 完成事件 → 收件箱内核文件确认 blocked:skipped-day → 设置页收件箱区块渲染 → 点击「撤销跳过并计入」并接受确认 → 内核核验:完成事件入账 1 条、本项目 skip 事件消失且墓碑 ≥1、收件箱条目清除。修复过程修正测试自身两处问题(skip 种子的 itemId 前缀错位导致跳过被 normalize 丢弃;skip 断言范围未限定本项目)。test:e2e 13/13。

2026-09-20 细节巡检批次：修复 Obsidian 导出按钮误用 CSV 按钮文案(set.exportLoopBtn「导出两个 CSV」→ 新键 set.exportObsidianBtn「导出」/「Export」,双字典 1121 对等);清理 dock-tomato.ts 中从未使用的 DockTomatoCompletionDetail 死接口(D-051)。集成契约与 i18n 卫生测试通过。

2026-09-20 E2E 密封化与迁移文档补全(T-1290/T-1291):①journey E2E 密封化——开始前清空收件箱存储,消除复用工作区跨次累积对断言与 200 上限的影响;②README 迁移条目、export-formats 总览(五出四入表/Obsidian 迁出节/第三方接入/测试锁定列表)补 Obsidian 进出通道;ecosystem-docs/export-identity-docs/preferences-docs 回归通过,test:e2e 14/14。

2026-09-20 渲染块 doc/notebook 维度（T-1292/T-1234 遗留收口):```checkin``` 配置新增 "docId"/"notebook"——只统计锚点块位于该文档/笔记本的项目。纯层 AnchorDocIndex 注入 resolveBlockItems,fail-closed(无索引/未命中=空);胶水层同步读缓存,未命中锚点经 deps.resolveAnchorDocs(内核 /api/block/getBlockInfo,取 root_id/box,会话内缓存,失败按未命中)异步解析后强制重渲染一次,期间出加载占位。现有作用域行为不变;兼容文档登记该端点用途。checkin-block 测试 +12 断言(配置格式/fail-closed/双维度过滤);i18n +1 键(1122 对等)。

T-1292 摘要回填后全链 exit 0。

2026-09-20 渲染块真实宿主 E2E(T-1293):公开内核 API 创建笔记本/文档(文档 id 即锚点块),注入合成 ```checkin``` 代码块,经插件真实渲染管线断言——docId 命中渲染项目行、未命中文档 fail-closed 空视图。过程中发现并修复两处真实缺陷:①胶水 previous?.remove() 会把相邻渲染块当旧预览删除(真实产品缺陷:相邻两个 checkin 块互相摧毁)——预览挂归属标记 data-checkin-preview-for,只删自己的;②宿主锚点解析字段名错误(内核 getBlockInfo 返回 rootID 驼峰,非 root_id),修复后锚点归属解析生效。test:e2e 升为 15/15;摘要回填后全链 exit 0。

T-1293 摘要回填后全链 exit 0。

2026-09-20 发版文档补全（T-1294):巡检发现 release-notes/change-log 未覆盖后续批次交付的特性——补全:Obsidian 迁出(H21 导出)、渲染块 doc/notebook 维度与相邻块互删修复、收件箱手动管理旅程、性能门禁(范围读/批量规划/longest 扫描)、E2E 扩展(15 项)。发布说明用户向新增迁出/渲染块维度/质量基线三块;变更记录新增渲染块与性能验证两节。

2026-09-20 洞察页历史最长统计（T-1295):洞察页统计区由四格扩为五格——完成率/当前连续/窗口最佳/成熟度之外新增「历史最长」(全历史最长连续,走 computeLongestStreaks 单一实现,与 v5 getStreaks.longest 同源);窗口「最佳连续」标签改为「窗口最佳」以区分口径;i18n 双语 1122 对等;ui-theme 结构断言锁定单一实现与标签。test:ui 通过。

T-1295 摘要回填后全链 exit 0。

2026-09-20 渲染块 notebook 维度 E2E 与 Obsidian 导出下载流 E2E(T-1297/T-1298):①渲染块 spec 扩为三块矩阵——docId 命中行、notebook 维度命中行、未命中文档空视图(nameCount=2 断言);②obsidian-export.spec.mjs——mobile bundle 设置页点击导出,捕获 2 个下载,H21 .md 含 frontmatter title+entries(acceptDownloads)。test:e2e 全套 16/16 通过。

2026-09-20 文档一致性巡检:ecosystem-integration.md 从 API v4 更新到 v5——describe 补 capabilitiesSince;新增 v5 四能力说明(queryItems/getEventsInRange/recordEventsBatch/getStreaks)与 obsidian21 前缀登记指引;合作契约文档此前已同步(18 项能力/minApiVersion 钉 4)。ecosystem-docs/export-identity-docs/preferences-docs 回归通过。

2026-09-20 发布就绪审查:自 v17.1.0 (596f292) 起全部变更 53 文件(+4079/-449),src+tests+docs+config 全量审计通过。安全扫描:硬编码中文文案零残留(新增纯模块),innerHTML 注入点全部经 escapeHtml,批量写外部输入 14 处验证。i18n 双字典 1123 对等;测试 143 文件、0 退役;真实内核 E2E 16/16;全链 test:quality exit 0。产物摘要 a2c33a4c… 与发布说明一致。工作树干净。

2026-09-20 收件箱 UI 项目名显示(T-1300):设置页收件箱条目此前显示内部 itemId(如 20260920-abcdef),用户无法辨识;现在在设置上下文构建时按 itemId 查找 store.items 中的项目名并注入,渲染层 itemName || itemId 回退。DockTomatoInboxEntryView 类型补可选 itemName 字段(纯函数层不依赖 store)。相关测试全过。
T-1300 摘要回填后全链 exit 0。

2026-09-20 渲染块 summary 视图历史最长连续（T-1301):summary 行 em 标签同时显示当前连续(🔥 N 天)与历史最长连续(历史最长 N 天,仅 ≥2 时显示);两者走各自单一实现(computeEventStreaks / computeLongestStreaks),口径不混淆。i18n 双语 1124 对等;checkin-block 测试全过。
T-1301 摘要回填后全链 exit 0。

2026-09-20 渲染块 month 视图 tooltip 增强(T-1302):月历格 title 属性升级——此前只显示分数(如 1/3),现在同时列出当日未完成的项目名(如 1/3（缺：阅读、跑步）),hover 即可辨识具体缺了什么。CheckinBlockDayCell 新增 incompleteNames 字段,收集逻辑在既有循环内零额外遍历。checkin-block 测试 17ms 全过。

2026-09-20 插件名称统一（用户指示）:全部"小飞驴打卡"改为"小驴打卡"——涉及 src/i18n.ts、package.json、plugin.json、README.md、docs/ 共 18 文件 25+ 处。grep 确认零残留。
渲染块 tooltip + a11y 正则回填后全链 exit 0。
