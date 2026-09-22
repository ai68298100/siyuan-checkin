# v18.0.1 发版后改动审计（2026-09-22）

结论：现有测试通过，但 UI 和功能尚未达到完整验收。此前把无横向溢出、类型检查通过等同于截图问题已修复的结论不充分。本页保留发版时的缺陷记录；后续本地修复状态见文末，真实思源桌面端、Android、只读/发布服务仍需现场验收。

## 范围与验证方式

- 发布基线：v18.0.1，dd94e3ce67391443abd2062e05b042403efa6355。
- 审计 HEAD：a60f58a；共 27 个提交、17 个文件，256 行新增、28 行删除。
- 改动覆盖：移动回顾滚动、桌面回顾布局、头像与图标、日记文档选择/新建、今日筛选与中文输入、设置页测试依赖。
- 在内存执行 production webpack 编译：移除 PackageZipPlugin，shouldEmit 返回 false。JS/CSS 与当前 dist 的 SHA-256 完全一致，确保浏览器实测对应当前源码。
- 浏览器使用系统 Chrome、模拟思源宿主和隔离样本数据；没有操作用户真实笔记本。
- 项目只读权限下，仅经批准运行测试和生成审计证据。功能代码保持不变。

## 已确认缺陷

| 编号 | 问题与影响 | 证据与原因 |
| --- | --- | --- |
| R01 / P2 | 统计周期仍与内容错位 | 2000px dock 样本下比面板左边缘偏左 52px。src/index.ts:1767 将内容包入 lc-checkin__layout；src/ui/review-workspace.scss:135 的直接子元素选择器未命中真实 DOM。overview、records、analysis 均复现。 |
| R02 / P2 | 记录数值仍未与右侧操作框垂直居中 | 2000/1180/720px 样本中数值中心高 9.75px。src/ui/components.scss:6248 的 align-self:start 仍生效；先前修改较早的列宽和水平居中规则未消除该覆盖。窄屏操作另起一行属于另一布局，不用相同中心差判错。 |
| R03 / P2 | 图表仍不随可用宽度展开，窄屏字体过小 | 2000px 下趋势 SVG 外框 1126x190，viewBox 320x120 按 meet 等比缩放后内容仅宽 506.67px；习惯强度图仍被 review-detail.scss:96 限制到 380px。280px 下趋势坐标文字实际约 6.75px。review-workspace.scss:1045 的固定高度与 charts.ts:256 的 preserveAspectRatio 组合限制了内容宽度，width:100% 只扩大外框。 |
| R04 / P2 | 中文输入法仍可能中断 | src/render/bind-today.ts:120–126：compositionstart 未清除既有 120ms 定时器，回调也没有组合状态/节点连接检查。浏览器复现：普通 input 后立即开始 composition，180ms 后原输入节点被替换（isConnected=false）、旧查询被写回。独立内存测试也复现了连续输入两段拼音的同一问题。 |
| R05 / P2 | 新建文档失败提示不准确 | src/index.ts:2015–2029 对无打开笔记本、创建失败和偏好保存失败统一提示文档 ID 格式不正确；空标题静默返回。成功创建路径通过内存接口桩验证，但这不代表真实宿主端到端验收。默认选择首个打开笔记本，也未提供目标位置选择。 |

截图（当前源码内存构建）：

- [统计周期与按日达成](../.artifacts/post-release-audit-20260922/overview-2000.png)
- [记录数值与操作框](../.artifacts/post-release-audit-20260922/records-2000.png)
- [趋势图留白](../.artifacts/post-release-audit-20260922/analysis-2000.png)

## 尚未完成的用户需求

- R06：头像裁剪、移动取景区域与缩放编辑。index.ts:2083 仍直接 FileReader 读取保存，CSS object-fit:cover 只做展示裁切，不是编辑器。
- R07：全库文档搜索筛选。settings.ts:99 仍由 collectAnchorChoices(ctx.store.items) 生成选项，只覆盖已有打卡项的绑定；没有全库搜索输入。
- R08：复制并跳转思源智能体。review.ts:434 仍只有 copy-review-prompt，bind-page-navigation.ts 的处理器只复制并提示手动粘贴，没有打开智能体。
- 插件已有本地规则总结，但扩展 AI 总结默认没有提供者，仍展示开发者注册说明；不能把本地总结视为 AI 接入已经完成。

头像预设字形映射和项目卡按日达成的右对齐已存在。照片优先于预设/文字符合 D-244 的已记录设计：用户必须先清除照片才能看到所选预设，应与尚未提供裁剪编辑区别记录。头像偏好归一化仍使用 slice 截断超长 data URL（view-preferences.ts:212），上传入口的大小拒绝并没有覆盖导入/读取路径。

## 测试结果与局限

以下命令对应的进程均已等到结束，退出码为 0：

- 类型检查；初次审计脚本直接调用 tsc 时缺少 node_modules/.bin，属于启动环境错误，改用本地 TypeScript 可执行文件后通过。保留首轮失败日志和重试结果，没有将其静默覆盖。
- pnpm test、test:ui、test:mobile、test:ecosystem、test:extended、test:perf。
- test:legacy-style、test:cross-surface。
- 完整宽度走查：49 页面场景、32 交互状态、8 对比度场景、10 混合习惯布局、16 长内容场景。
- 回顾专项：59 布局场景，覆盖筛选、分页、笔记编辑、自定义日期与复制提问等。
- visual-qa 明暗主题各一轮，pageErrors 均为空。

证据：
[测试退出码](../.artifacts/post-release-audit-20260922/test-results.json)；
[浏览器退出码](../.artifacts/post-release-audit-20260922/browser-results.json)；
[源码与构建摘要](../.artifacts/post-release-audit-20260922/build-verification.json)。
完整日志保存在同目录。

现有测试没有断言 R01–R04 的真实几何/事件时序，因此通过不能覆盖这些缺陷。此前 IME 测试只验证源码中出现 compositionstart/end，未测试计时器竞态。

本轮未运行真实思源内核 E2E、真实移动端软键盘/安全区/双窗口验证，B-007 保持开放。check:release 未作为本轮通过项：根目录 package.zip 当前不存在，且用户要求不生成包。既有 local-market ZIP（2026-09-21 23:34:41）保持不变，不包含后来全部源码修改。

## 后续本地修复状态（2026-09-22）

| 编号 | 本地处理 | 当前证据边界 |
| --- | --- | --- |
| R01 | 已修正周期选择器与内容区的布局约束，并加入布局回归守门 | 测试使用隔离 DOM/几何桩，真实思源宿主仍待验收 |
| R02 | 已修正记录数值与操作区的垂直对齐规则，并加入多宽度守门 | 同上 |
| R03 | 已改为按可用尺寸绘制图表，补 ResizeObserver 生命周期和窄宽度字体守门 | 同上 |
| R04 | 已清理组合输入旧计时器，并检查组合状态、当前节点和页面生命周期 | 专项时序测试通过，真实 Android IME 仍待验收 |
| R05 | 已提供打开笔记本选择、独立失败提示和手填文档 ID 回退 | 内存接口桩验证通过，真实权限/只读模式仍待验收 |
| R06 | 已增加头像裁剪取景、拖动、键盘微调、缩放、重置和取消 | 浏览器组件测试通过，真实移动端文件选择仍待验收 |
| R07 | 已保留设置页全库搜索；兼容边界、前 50 条上限和失败回退写入 `docs/siyuan-compatibility.md` | v3.8.4 路由源码已核对；真实宿主调用和低版本降级仍待验收 |
| R08 | 已增加复制提示并通过宿主对象守卫打开智能体面板 | fake DOM 测试通过，真实思源智能体面板仍待验收 |

本地验证：`pnpm run check`、`pnpm run build:check`、`pnpm run test:ui` 与 R05/R06/R07/R08 专项测试均通过；未生成发布包，未更新集市包，未推送。

## 建议收口顺序

先修 R01–R05，并以真实 DOM 几何与输入事件时序验证；再完成 R06–R08 并补交互验收；最后在用户明确要求生成包时做打包、摘要和安装包验收。不要再用宽度无溢出替代对齐、字号或功能完整性验收。
