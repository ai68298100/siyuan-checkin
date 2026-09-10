/* 最小小驴打卡桥接示例：把每个完成的番茄会话写入一次打卡记录。
   放到任意思源插件的 onload 中调用 setupTomatoBridge() 即可。 */
async function setupTomatoBridge() {
    const checkin = window.siyuanCheckin;
    if (!checkin) return;

    // 1. 等待本地数据加载完成
    await checkin.whenReady();

    // 2. 能力协商：不支持写入时静默降级
    if (!checkin.hasCapability("events.record")) return;

    // 3. 选择目标项目（示例：第一个非归档的按时长项目）
    const item = checkin.getItems().find((candidate) => !candidate.archived && candidate.kind === "duration");
    if (!item) return;

    // 4. 订阅事件示例：每次有记录时打一条日志
    const unsubscribe = checkin.subscribe((event) => {
        if (event.type === "checkin:event-recorded") console.log("[tomato-bridge] 检测到新记录", event.detail);
    });

    // 5. 写入一个番茄会话（25 分钟）。externalRef 用会话 ID，重复推送会自动去重。
    window.pushTomatoSession = async (sessionId, minutes = 25) => {
        try {
            const event = await checkin.recordEvent({
                itemId: item.id,
                value: minutes,
                unit: "分钟",
                source: "tomato",
                externalRef: sessionId,
                note: "番茄会话完成",
            });
            console.log("[tomato-bridge] 已记录", event);
        } catch (error) {
            // 同步失败：保留会话 ID，稍后用同一个 ID 重试
            console.warn("[tomato-bridge] 记录失败，稍后重试", sessionId, error);
        }
    };

    return unsubscribe;
}
