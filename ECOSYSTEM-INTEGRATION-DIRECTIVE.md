# 【小驴生态中枢统领指令】小驴打卡 (siyuan-checkin) 全方位升级与跨插件协同执行手册

> **统领下发方**：小驴快门中枢（`siyuan-quickgate`）
> **执行接收方**：小驴打卡（`siyuan-checkin`）开发 Agent
> **架构基线**：Epoch 6 联邦规范 · 零强依赖优雅降级 · 经典长春花紫 Bento 美学 · 历史排雷防线

---

## 一、 核心定位与视觉资产状态
- **生态角色**：**【行为落地中枢（Action Settlement Hub）】**——承接考试、闪卡、拾遗、人脉、管家产生的正向用户行为事实沉淀。
- **专属主题色**：**经典长春花紫（Periwinkle Violet `#6366F1`）＋ 阳光蜜桃橙（`#FB8C00`）**。
- **根目录 `icon.png`**：**已由快门中枢完成 256×256 殿堂级经典长春花紫高清头像替换，请勿覆盖回退！**
- **本地已就绪 SDK**：`src/ecosystem-bridge-kit.ts`（零外部依赖，可直接 `import`）。

---

## 二、 必做任务 1：跨插件联邦联动（Epoch 6 标准）

### 1. 四别名挂载与安全注销 (`src/index.ts` & `src/integrations.ts`)
- 定义四别名：`const CHECKIN_API_ALIASES = ["siyuanCheckin", "LvCheckin", "lvCheckin", "xiaolvCheckin"];`
- 在 `onload` 挂载阶段实行 **首实例独占（First-Instance-Wins）**：
  ```ts
  const w = window as any;
  this.mountedAliases = [];
  for (const alias of CHECKIN_API_ALIASES) {
      if (!w[alias]) {
          w[alias] = this.api;
          this.mountedAliases.push(alias);
      }
  }
  ```
- 在 `onunload` 卸载阶段实行 **身份核验安全卸载**（严禁无条件 delete 误杀新实例）：
  ```ts
  const w = window as any;
  for (const alias of this.mountedAliases) {
      if (w[alias] === this.api) delete w[alias];
  }
  this.mountedAliases = [];
  ```

### 2. 正式收录全生态 externalRef 命名空间 (`docs/identity-and-merge.md`)
在外部引用规范中正式收录兄弟插件前缀，并在 `recordEventsBatch` 中确保同前缀同日幂等去重：
- `exam:<itemId>:<localDate>`（来自小驴考试刷题结算）
- `cards:<itemId>:<localDate>`（来自小驴闪卡复习完成）
- `glean:<docId>:<localDate>`（来自小驴拾遗文章已读）
- `contacts:<personDocId>:<localDate>:<seq>`（来自小驴人脉互动跟进）
- `home:<module>:<rowId>:<localDate>`（来自小驴管家事务办理）

### 3. 向小驴雷切注册小组件 (`src/index.ts`)
在 `onLayoutReady` 阶段调用 `src/ecosystem-bridge-kit.ts` 的 `registerRaikiriModuleSafely` 注册 `checkin-daily-streaks` 小组件（未安装雷切时自动静默跳过，0 报错）。

---

## 三、 必做任务 2：顶栏与侧栏单色图标升级 (`src/index.ts`)

将 `this.addIcons(...)` 中的 `iconLvCheckin` 替换为与新版 Logo 1:1 映射的 32×32 单色矢量图标（摒弃原有的碎花边徽章，改用圆角便签卡 + 饱满对勾 + 勋章点）：
```xml
<symbol id="iconLvCheckin" viewBox="0 0 32 32">
  <path d="M13 5h8c2.2 0 4 1.8 4 4v9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-opacity="0.4"/>
  <rect x="5" y="9" width="18" height="18" rx="4.5" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="m9.5 18 3.5 3.5 7-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="23" cy="9" r="3" fill="currentColor"/>
</symbol>
```

---

## 四、 必做任务 3：UI 轻量统一与参考图 Bento 软性美学升级 (`src/index.scss`)

1. **注入专属品牌色与圆角阶梯**：
   ```scss
   --lv-brand: #6366F1; /* 经典长春花紫 */
   --lv-brand-soft: color-mix(in srgb, var(--lv-brand) 12%, transparent);
   --lv-accent-orange: #FB8C00; /* 阳光蜜桃橙跳色 */
   --lv-r-sm: 6px;
   --lv-r-md: 12px;
   --lv-r-lg: 20px;
   --lv-r-pill: 9999px;
   ```
2. **还原最初参考图核心神韵**：
   - 连续打卡大卡片（Streak Card）采用暖橙渐变（`#FFA726` ➔ `#FB8C00`）并衬以半透明同心圆水波纹底纹；
   - 顶部天数导航采用 `Day 1 / Day 2 / Today` 药丸胶囊排布，`Today` 采用长春花紫高亮呼吸态；
   - 分类筛选条全量采用 `9999px` 饱满药丸胶囊；
   - 按钮挂载物理按压微触感：`:active:not(:disabled) { transform: translateY(1.5px) scale(0.985); }`。
3. **弹窗标题栏统一家族门面**：
   Dialog 标题统一包含 `<span class="lv-dialog-title-icon">`（22×22 紫底白标）+ 主标题 + 版本号胶囊。

---

## 五、 必做任务 4：深层工程规范与历史排雷加固

1. **`plugin.json` 对齐**：
   - 增加 `"settingsWindow": true`（开启思源 3.8.8+ 独立桌面设置大窗）；
   - `minAppVersion` 保持 `"3.8.4"`；
   - `keywords` 确保前置包含 `["小驴", "小驴打卡", "xiaolv", "lv", ...]`；
   - `displayName` 保持中文 `"小驴打卡"`，英文 `"Lv Check-in"`。
2. **自定义块属性命名空间纠偏**：
   - 排查代码中写入的 `custom-icon-library` 等裸属性，统一规范为 `custom-lv-checkin-*`，防与其他插件冲突。
3. **控制台日志与 Toast 提示规范**：
   - 控制台日志统一前缀 `[LvCheckin]`；
   - `showMessage` 提示统一前缀 `[小驴打卡]`，报错信息展示时长设为 `6000ms`。
4. **历史排雷防线自查**：
   - 输入框 `keydown` 必须拦截中文输入法组字态（`if (e.isComposing || e.keyCode === 229) return;`）；
   - 二级确认弹窗按 `Escape` 必须 `e.stopPropagation()`，防击穿关闭底层主面板；
   - 补齐根目录 `CHANGELOG.md` 与 `.github/workflows/release.yml`。

---

## 六、 验收标准
执行完毕后，在根目录运行：
```bash
pnpm check && pnpm test
```
确保所有单测与类型检查 100% 全绿通过！
