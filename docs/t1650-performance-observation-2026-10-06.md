# T-1650 性能观测记录（2026-10-06）

本轮新增 `scripts/t1650-browser-benchmark.cjs`，使用已构建的生产 `dist`、内存版思源宿主和 Chromium/Edge headless，默认覆盖 10,000 条事件、366 天洞察日格、Review 和两个 root 同时渲染。脚本不访问真实内核，不产生笔记本或文档写入；默认只输出 `.artifacts/t1650-browser-benchmark.json`，也可用 `T1650_OUTPUT` 指定报告路径。需要观察长数据时可显式放大 fixture，例如 `T1650_EVENT_COUNT=100000 node scripts/t1650-browser-benchmark.cjs`；事件数上限为 250,000，异常输入回落到默认 10,000。

PowerShell 示例：

```powershell
$env:T1650_EVENT_COUNT = "100000"
node scripts/t1650-browser-benchmark.cjs
Remove-Item Env:T1650_EVENT_COUNT
```

每个场景先等待两帧，再同步调用生产 `render` 五次；报告保存每次同步 render、两帧完成时间、long task 和 page error。该切片只用于找热点，不把浏览器调度和本机性能波动误写成稳定预算，也不改变现有门禁。

本机 Edge 152、1280×900、10,000 events 的三次独立样本如下（单位 ms，中位数）：

| 场景 | 样本 A | 样本 B | 样本 C |
| --- | ---: | ---: | ---: |
| Insights 366 日格 | 64.4 | 31.6 | 51.3 |
| Review 10k | 227.0 | 91.4 | 169.2 |
| 双 root | 287.6 | 103.0 | 218.4 |

三次报告均保持 366 个洞察日期格、Review root 数量正确且无 page error。报告现在同时记录 fixture 事件数、JS/CSS 字节数、每个场景的五次样本、long task 和 page error；`tests/t1650-report-contract.test.cjs` 只做 schema 守门，不自动启动浏览器。差异足以说明当前结果受机器调度、浏览器缓存和宿主负载影响；下一步应先固定硬件/浏览器/预热协议并积累多轮样本，再决定是否拆渲染或优化投影。当前没有证据支持盲目改动核心计算或放宽阈值。

### 可选 100k 观测（单次，不作基线）

在本机 Node 24.15.0 / Edge 152 / 1280×900 的一次 100,000 事件样本中，JS/CSS 分别为 1,460,416 / 655,355 bytes；Insights 366 日格中位 399ms，Review 100k 中位 2,981ms，双 root 中位 3,507ms。五次样本完整保存在本地忽略产物 `.artifacts/t1650-browser-benchmark-100k.json`，page error 为 0；long task 最高分别为 427/3,139/3,849ms。这只证明 100k fixture 能跑通并暴露长任务，不代表跨机器性能承诺，也不替代真实 Android 测量。CSS 产物接近现有 655,360-byte 硬线，后续若变更样式必须继续按现行门禁收敛，不以调整报告阈值绕过。

真实 Android 低端设备、宿主 I/O 和长会话内存趋势仍需分栏验收，不能由本脚本替代。
