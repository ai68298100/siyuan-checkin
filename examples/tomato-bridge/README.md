# 番茄钟桥接示例插件

演示如何在 10 分钟内把一个外部"番茄钟"插件接到小驴打卡：
等待数据就绪 → 检查能力 → 把一个番茄会话写成一条打卡事件。

## 接入五步

1. **等待就绪**：`await window.siyuanCheckin.whenReady()`
2. **能力检查**：`hasCapability("events.record")`，不支持则降级（不要报错）
3. **选项目**：`getItems()` 挑一个非归档项目，记住 `itemId`
4. **写记录**：`recordEvent({itemId, value, unit, source: "tomato", externalRef})`
5. **去重**：`externalRef` 必须稳定（会话 ID），重放安全

完整可运行代码见 [plugin.js](./plugin.js)。
