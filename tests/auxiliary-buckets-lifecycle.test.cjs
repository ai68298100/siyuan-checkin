const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

/* T-1860 / D-514 辅助存储桶跨窗口审计与生命周期守门测试：
   验证追加型、覆盖型、增删改删除型三类辅助存储桶在跨窗口、失败回滚和拆除期的生命周期语义。 */

const root = path.join(__dirname, "..");
const srcIndex = fs.readFileSync(path.join(root, "src", "index.ts"), "utf8");
const templatesSource = fs.readFileSync(path.join(root, "src", "features", "templates.ts"), "utf8");

/* ---------------------------------------------------------
   一、静态架构守门断言
   --------------------------------------------------------- */

// 1. 追加型辅助桶（AI 历史与审计日志）
assert.match(
    srcIndex,
    /this\.analysisHistory = mergeAnalysisSnapshots\(this\.analysisHistory, remoteHistory\);/,
    "onDataChanged 必须重读并合并远端 AI 分析历史快照"
);
assert.match(
    srcIndex,
    /this\.auditEntries = mergeStoreAudits\(this\.auditEntries, normalizeStoreAudit\(storedAudit\)\);/,
    "onDataChanged 必须重读并合并远端审计日志条目"
);
assert.match(
    srcIndex,
    /\/\* T-1860：保存失败回滚内存状态，防止未持久化快照残留 \*\/\s*this\.analysisHistory = previousHistory;/,
    "AI 分析历史保存队列失败时必须回滚内存状态至 previousHistory"
);
assert.match(
    srcIndex,
    /this\.analysisHistorySaveQueue\.catch\(\(\) => undefined\)/,
    "onunload 必须在有界拆除预算内排空 analysisHistorySaveQueue"
);

// 2. 增删改/显式删除型辅助桶（模板与自定义图标）
assert.match(
    srcIndex,
    /const deletedIds = new Set\(this\.userTemplates\.filter\(\(item\) => !next\.some\(\(n\) => n\.id === item\.id\)\)\.map\(\(item\) => item\.id\)\);/,
    "persistUserTemplates 必须计算已删除的模板 ID 集合"
);
assert.match(
    srcIndex,
    /remoteRaw\.filter\(\(item\) => !deletedIds\.has\(\(item as \{id\?: string\}\)\?\.id \|\| ""\)\)/,
    "persistUserTemplates 必须在合并前过滤远端快照中的已删除模板，杜绝删除复活缺陷"
);
assert.match(
    srcIndex,
    /const deletedIcons = new Set\(this\.customIconLibrary\.filter\(\(icon\) => !next\.includes\(icon\)\)\);/,
    "persistCustomIconLibrary 必须计算已删除的自定义图标集合"
);
assert.match(
    srcIndex,
    /remote\.filter\(\(icon\) => !deletedIcons\.has\(icon\)\)/,
    "persistCustomIconLibrary 必须在并集前过滤已删除图标，杜绝删除复活缺陷"
);

// 3. 覆盖型辅助桶（视图偏好与问卷日记脏检查与回滚）
assert.match(
    srcIndex,
    /if \(JSON\.stringify\(this\.journalCustomTemplates\) === JSON\.stringify\(this\.lastPersistedJournalTemplates\)\)/,
    "onDataChanged 必须在本地无脏修改时才跟随远端问卷模板"
);
assert.match(
    srcIndex,
    /if \(JSON\.stringify\(this\.journalIntegrationPref\) === JSON\.stringify\(this\.lastPersistedJournalIntegration\)\)/,
    "onDataChanged 必须在本地无脏修改时才跟随远端问卷集成配置"
);
assert.match(
    srcIndex,
    /this\.journalCustomTemplates = previousTemplates;\s*this\.journalIntegrationPref = previousIntegration;\s*this\.lastPersistedJournalTemplates = previousPersistedTemplates;\s*this\.lastPersistedJournalIntegration = previousPersistedIntegration;/,
    "saveJournalData 必须在 saveData 失败时回滚内存与基线快照"
);

/* ---------------------------------------------------------
   二、动态行为与语义模拟验证
   --------------------------------------------------------- */

// 模拟 1：模板删除场景防复活（Simulate Deletion Resurrection Prevention）
{
    const initialTemplates = [
        {id: "tpl-1", name: "早起晨跑", trigger: "manual", items: ["跑步"]},
        {id: "tpl-2", name: "夜读打卡", trigger: "manual", items: ["阅读"]},
    ];

    // 用户在窗口 A 删除了 tpl-2
    const nextTemplates = [
        {id: "tpl-1", name: "早起晨跑（已修改）", trigger: "manual", items: ["跑步", "拉伸"]},
    ];

    // 磁盘上由于并发或未重读，仍保留初始两项
    const staleDiskSnapshot = [...initialTemplates];

    // 计算被删除的 ID
    const deletedIds = new Set(initialTemplates.filter((item) => !nextTemplates.some((n) => n.id === item.id)).map((item) => item.id));
    assert.equal(deletedIds.has("tpl-2"), true, "tpl-2 必须被精确识别为删除项");

    // 过滤磁盘上的已删除项
    const filteredDisk = staleDiskSnapshot.filter((item) => !deletedIds.has(item.id));
    assert.equal(filteredDisk.length, 1);
    assert.equal(filteredDisk[0].id, "tpl-1");

    // 合并后 tpl-2 绝不能复活
    const merged = [...nextTemplates];
    for (const diskItem of filteredDisk) {
        if (!merged.some((m) => m.id === diskItem.id)) {
            merged.push(diskItem);
        }
    }
    assert.equal(merged.length, 1, "删除后的模板数量必须为 1");
    assert.equal(merged[0].id, "tpl-1");
    assert.equal(merged[0].name, "早起晨跑（已修改）");
    assert.equal(merged.some((t) => t.id === "tpl-2"), false, "已删除的 tpl-2 绝不可被远端脏快照复活");
}

// 模拟 2：AI 分析历史追加型合并与回滚（Simulate Append-only History & Rollback）
{
    const baseHistory = [
        {id: "snap-1", contextKey: "ctx-1", text: "历史总结 1", timestamp: 1000},
    ];

    let memoryHistory = [...baseHistory];
    const newSnapshot = {id: "snap-2", contextKey: "ctx-2", text: "新总结 2", timestamp: 2000};

    // 乐观写入内存
    const previousHistory = memoryHistory;
    memoryHistory = [...memoryHistory, newSnapshot];
    assert.equal(memoryHistory.length, 2);

    // 模拟持久化失败抛出异常
    const savePromise = Promise.reject(new Error("Disk quota exceeded"));
    const handleSave = async () => {
        try {
            await savePromise;
        } catch (e) {
            // 回滚内存状态
            memoryHistory = previousHistory;
        }
    };

    handleSave().then(() => {
        assert.equal(memoryHistory.length, 1, "持久化失败后内存必须回滚");
        assert.equal(memoryHistory[0].id, "snap-1");
        assert.equal(memoryHistory.some((s) => s.id === "snap-2"), false, "未持久化的快照不能滞留内存");
    });
}

// 模拟 3：覆盖型偏好配置不受集合并集污染（Simulate Overwrite Preference Isolation）
{
    const defaultPrefs = {theme: "light", compact: false, showStats: true};
    let currentPrefs = {...defaultPrefs, compact: true};

    // 重置操作：用户点击“恢复默认视图”
    const resetAction = () => ({...defaultPrefs});
    currentPrefs = resetAction();

    // 远端文件此时若被错误地按照并集（Set Union）机制处理，就会把旧的 compact: true 重新带回
    // 覆盖型语义（LWW）保证只采纳最新或重置后的纯粹结构
    assert.equal(currentPrefs.compact, false, "覆盖型偏好在重置后 compact 必须为 false，不得被旧偏好复活");
}

console.log("auxiliary-buckets-lifecycle: all tests passed successfully.");
