# T-1625 附件摄取与动态内容渲染验收

本切片完成附件摄取规则评估与本地敌意输入守门。生产改动在 `model.ts`、`model-helpers.ts`、`shared.ts`、`render/bind-today.ts`、`render/review.ts` 和 `render/journal-dialog.ts`；不修改主代理负责的入口、导航或根台账，不提交、不推送、不发版。

## 两层边界

持久化事件的 `attachment` 是本地图片 data URL，不是任意外链。`normalizeAttachmentDataUrl` 只接受 PNG、JPEG/JPG、WebP、GIF 的完整 base64 data URL，要求非空、长度为四的倍数、字符与末尾 padding 合法，总长度不超过既有 700000 字符限额。拒绝 SVG、HTML、其他 MIME、非 base64、控制字符、引号属性注入和超长值。它检查 URL 语法，不解码图片，不证明实际二进制内容与 MIME 一致。

JSON 恢复、快照恢复、`normalizeStore` 和 `makeEventValue` 共用该校验。非法可选附件被移除，原记录的项目、数值与身份保留。普通 CSV 不序列化或摄取附件；公开 API 的 `recordEvent`/`recordEventsBatch` 参数没有附件字段，宿主公开写入路径也没有透传它。没有新增 API 附件能力。

本地 FileReader 仍使用 500 KiB 文件限制，读取完成后先经过同一校验再设置待录附件和成功反馈；读取失败、格式不符或过大均不呈现成功。图片选择器已有 PNG/JPEG/WebP/GIF 的 `accept`，它只是选择提示，真正的验证在读取后执行。

`safeAttachmentUrl` 是渲染防线。有效栅格 data URL 与 `blob:`、明确的 HTTP/HTTPS、无协议本地相对路径可进入属性；HTTP/HTTPS 需要非空有效主机，拒绝畸形地址。拒绝 `//host` 网络路径引用、反斜杠、控制字符及其他协议，避免浏览器把相对路径重新解释为外部主机。`blob:` 保留原有渲染兼容，不代表它可存入事件或已验证内容。

通过 URL 验证后才 `escapeHtml`，保留原值；HTML 转义不会被当成协议校验。`t()` 始终产生纯文本，用户参数经它组合后进入 HTML 文本、属性或 ARIA 时仍须整体转义。Today 已有两处缩略图门禁，Review 历史缩略图现复用同一安全门。Journal Dialog 标题包含用户问卷名，现对整个标题转义，避免宿主标题 HTML 槽解析用户内容。

## 定向验收

```powershell
pnpm run check
node tests/render-boundary.test.cjs
node tests/attachment-ingestion.cjs
node tests/render-hostile-content.cjs
```

上述检查均 EXIT=0。附件测试直接运行生产归一化、事件构造、JSON/快照/CSV 路径，并经 AST 提取执行实际 FileReader 绑定。协议矩阵包含大小写、混淆脚本协议、属性注入、SVG/HTML、畸形主机、网络路径引用及合法本地路径。主测试链保留无浏览器的 `render-boundary` 与附件摄取守门；浏览器矩阵独立运行，不给普通 `pnpm test` 新增浏览器安装要求。

浏览器矩阵执行实际生产源码，经隔离的思源宿主 stub 建立 UI，不连接真实内核，不访问网络。192 个场景包括 Today、Review、Archive、Editor、Occasions、Insights、Settings、Quick Dialog、Journal Dialog 九个表面，以及 Today 上下文菜单、Archive 搜索空态和个人模板三种附加状态；组合桌面/移动 frontend、中文/英文、亮/暗选择、320/980px。存在 `data-appearance` 的根验证实际主题值；没有该属性的宿主弹窗不额外冒称已证明真实宿主主题继承。

含引号、尖括号、脚本标签、换行、中文和长文本的名称、单位、分组、备注、模板、查询与问卷进入真实 DOM。验证没有新增 canary、script/style/iframe/object/embed、事件属性、非法图片协议或脚本执行；要求敌意内容仍作为文本或字段值存在。额外精确校验模板 `title`/ARIA/data 值、原生取消确认文案、完整搜索空态和问卷标题；单行输入按浏览器原生规则去除换行，textarea 保留完整草稿。

本地矩阵不证明真实宿主 API、CSP、触摸设备、读屏播报、屏幕布局无溢出或每一条动态执行路径都已覆盖。真实思源、移动真机与读屏验收继续归主代理的 T-1608/宿主台账，不能据此关闭外部或现场条件项。
