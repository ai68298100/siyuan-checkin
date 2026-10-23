# 【小驴生态中枢统领指令】小驴打卡 (siyuan-checkin) 专项排查与全方位升级执行手册

> **统领下发方**：小驴快门中枢（`siyuan-quickgate`）
> **执行接收方**：小驴打卡（`siyuan-checkin`）开发 Agent
> **当前状态**：底座测试全绿 · 规范评分 80% ➔ 目标 100%
> **核心原则**：零强依赖 · 经典长春花紫 Bento 美学 · 严禁私有存储穿透

---

## 一、 核心资产状态确认
1. **根目录 `icon.png`**：**已由中枢完成 256×256 殿堂级经典长春花紫（`#6366F1`）高清头像替换，请严格保留勿覆盖！**
2. **本地就绪 SDK**：`src/ecosystem-bridge-kit.ts`（零外部依赖，直接 import 使用）。

---

## 二、 当前排查出的本插件专项缺陷与必修任务清单

### 【P0 级：集市获客与设置窗口升级】
1. **`plugin.json` 补齐品牌关键词（严重影响集市获客！）**：
   - 当前 `keywords` 为 `["打卡","习惯","目标","小驴打卡","check-in","habit"]`；
   - **必修修改**：必须前置补齐 `"小驴"`, `"xiaolv"`, `"lv"`，确保用户在思源集市搜索“小驴”时能直接搜出打卡！
2. **开启独立桌面设置大窗（`settingsWindow: true`）**：
   - 在 `plugin.json` 根级增加 `"settingsWindow": true`，解锁思源 3.8.8+ 独立大窗口设置体验。

---

### 【P1 级：跨插件联邦与顶栏图标升级】
3. **四别名挂载与安全卸载 (`src/index.ts` & `src/integrations.ts`)**：
   - 挂载 `window.siyuanCheckin` 时，同步挂载 `LvCheckin`、`lvCheckin`、`xiaolvCheckin`（First-Instance-Wins）；
   - 卸载时核验身份：`if (w[alias] === this.api) delete w[alias]`。
4. **收录全生态 externalRef 命名空间 (`docs/identity-and-merge.md`)**：
   - 正式收录兄弟插件前缀，保证同日同前缀幂等去重：
     - `exam:<itemId>:<localDate>`（小驴考试刷题）
     - `cards:<itemId>:<localDate>`（小驴闪卡复习）
     - `glean:<docId>:<localDate>`（小驴拾遗阅读）
     - `contacts:<personDocId>:<localDate>:<seq>`（小驴人脉跟进）
     - `home:<module>:<rowId>:<localDate>`（小驴管家事务）
5. **向小驴雷切注册小组件 (`src/index.ts`)**：
   - 调用 `src/ecosystem-bridge-kit.ts` 的 `registerRaikiriModuleSafely` 注册 `checkin-daily-streaks` 组件。
6. **顶栏单色矢量图标升级 (`src/index.ts`)**：
   - 将 `this.addIcons(...)` 中的 `iconLvCheckin` 替换为圆角便签卡 + 饱满对勾 + 勋章点的标准 32×32 SVG：
   ```xml
   <symbol id="iconLvCheckin" viewBox="0 0 32 32">
     <path d="M13 5h8c2.2 0 4 1.8 4 4v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.4"/>
     <rect x="5" y="9" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="m9.5 18 3.5 3.5 7-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
     <circle cx="23" cy="9" r="3" fill="currentColor"/>
   </symbol>
   ```

---

### 【P2 级：自定义块属性防冲突与 UI 微动效】
7. **自定义块属性命名空间纠偏**：
   - 检查代码中写入的 `custom-icon-library` 等裸词，统一加上前缀改为 `custom-lv-checkin-*`，防与其他第三方插件冲突。
8. **UI 微触感与经典长春花紫 Bento 注入 (`src/index.scss`)**：
   - 注入变量 `--lv-brand: #6366F1;` 与 `--lv-accent-orange: #FB8C00;`；
   - 按钮增加物理按压微触感：`:active:not(:disabled) { transform: translateY(1.5px) scale(0.985); }`；
   - 弹窗标题栏统一使用 `.lv-dialog-title-wrap`。

---

## 三、 验收指令
修改完成后，在根目录执行：
```bash
pnpm check && pnpm test
```
确保全量单测与门禁 100% 全绿通过！
