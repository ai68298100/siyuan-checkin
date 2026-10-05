# 真实内核 smoke / E2E 开发约定

写型验收必须指向独立思源靶场：独立 workspace、独立端口、仅安装小驴打卡。本轮实现只有 mock 验收，没有启动、写入或清扫任何真实内核；后续真实 E2E 是单独验收步骤。

手动开第二个思源实例时，端口通常顺延为 6807；必须核实实际端口，不能把 6806 主工作区当测试目标。每个项目准备自己的独立 workspace，只安装该项目被测插件。各靶场的 token 不同，从该靶场的「设置 → 关于」获取，不能借用主工作区 token。同一实例上的写型 smoke / E2E 串行运行；只读任务可以并发，写型运行期间避免其他写入者。

共享模块为 `scripts/lib/smoke-kernel.mjs`，真实宿主生命周期为 `scripts/e2e/lib.mjs`。新脚本通过 `resolveTarget({baseArg, tokenArg})` 统一解析目标，参数优先于 `SIYUAN_BASE_URL` / `SIYUAN_TOKEN`，缺少明确目标或非空 token 必须非零退出。不得内置 token，不得在错误日志打印 token。目标限本机回环 HTTP(S)，不可带路径、用户名、密码、query 或 fragment。

## 自管内核

运行 `pnpm run test:e2e` 前，必须显式设置 `CHECKIN_E2E_WORKSPACE` 为独立靶场的绝对路径。自管第二实例默认使用 `CHECKIN_E2E_PORT=6807`，只读实例顺延为 6808；也可用 `SIYUAN_BASE_URL` 指定本机 HTTP 目标。新建 workspace 有 `checkin-e2e.json` 身份标记，并为该新靶场生成随机非空访问码；复用靶场必须显式供应匹配该靶场配置的 `SIYUAN_TOKEN`，脚本不会覆盖已有访问码。

安装 dist / 修改配置前，先验证工作区身份、保护标记、目录和笔记本名称、其他插件；目标端口已被占用则拒绝继续。脚本只结束自己实际启动的 child；附着模式不会停止用户已启动的内核。只读配置仍验证工作区身份和端口，但不受写型笔记本隔离守卫影响，原有 putFile 拒写负例保留。

## 附着已运行内核

使用 `playwright.e2e.running.config.mjs` 时，先提供 `.artifacts/e2e/target.json` 中明确的 `baseURL`、`token`、`workspace`，或者设置 `SIYUAN_BASE_URL`、`SIYUAN_TOKEN`、`CHECKIN_E2E_WORKSPACE` 覆盖它们。附着全局前置同样验证工作区和目标内核的隔离状态，不能通过跳过 globalSetup 直接写入。

默认发现任何非本项目临时笔记本即拒跑。只有精确 `SIYUAN_E2E_ALLOW_SHARED=1` 才豁免笔记本隔离判定；`0`、`true` 不生效。该开关不豁免目标/token、工作区身份、其他插件、端口、AI 或进程归属边界。

## 清扫与 AI

新测试笔记本必须以 `lv-checkin-smoke-` 开头。先 `guardScratch` 后 `sweepOrphans`，清扫前再次读取并守卫完整列表；默认共享拒绝时零删除，包括本项目残留临时库。显式共享模式也只删除本项目前缀，绝不认领 `E2E nb`、`Journal E2E` 等旧通用名称或其他插件前缀。清扫 API 非零返回应停止后续写入，不能把失败当成功。

AI 内核路由默认禁用：Node API 调用在 fetch 前拒绝，浏览器在导航前安装路由拦截。只有精确 `SIYUAN_E2E_AI=1` 才启用。能力注册、本地建议和本地预览仍能测试；不需要实际模型请求的用例不能打开该开关。

## 验收命令与后续

`node tests/smoke-kernel-safety.cjs` 是 mock-only 验收，覆盖目标/token优先级、缺参退出码、共享拒绝零写入、两个开关仅 `1` 生效、前缀清扫、失败返回、工作区身份、既有 token 不覆写、占用端口和只停止自己 child。已接入现有 `node tests/portable-paths.test.cjs`，无需更改 package scripts。

真实 E2E 后续在明确的独立靶场记录内核版本、目标、用例和日志证据；本轮 mock 结果不能替代真实宿主验收。复用旧测试工作区中通用前缀笔记本时，不扩大自动清扫白名单；核实并手动处理，或准备新的独立靶场。
