# T-1613 事项页新建入口纵向位移定位文档

## 现象

用户报告：事项页点击右上角「+」后页面发生纵向位移。

## 根因分析

### 触发链

1. 用户点击页面壳头部「+」（`data-action='new-occasion'`）
2. `bind-occasions.ts:44` → `host.editingOccasionId = undefined; host.render(); revealOccasionForm();`
3. `host.render()` 遍历全部 root 重绘整个事项页（内容替换导致滚动重置）
4. `revealOccasionForm()` 展开 `data-occasion-form-drawer` 并调 `scrollIntoView({block:'start', behavior: smooth})`

### 位移根因

**`revealOccasionForm` 的 `scrollIntoView({block:'start', behavior: smooth})` 在移动端引发明显纵向跳变。** 移动端 CSS 通过 `order` 交换使列表在前、表单抽屉在后；用户在浏览列表时点「+」后页面从列表位置跳到表单位置。`render()` 的整页重绘本身就可能重置滚动，加上 smooth 滚动动画产生可感知位移。

### 为什么不是其他原因

- **不是 CSS 回流**：表单抽屉使用 `<details>` + `open` 属性，展开不触发布局重排（只展开已有内容）
- **不是渲染竞态**：`render()` 和 `revealOccasionForm()` 在同一调用栈内顺序执行
- **不是滚动容器问题**：`scrollIntoView` 的目标是 `.lc-checkin__occasion-form-panel`，该元素存在且可达

## 修复方案

### 方案 A（推荐）：条件滚动 + instant

仅移动端（列表在前、表单在后）需要滚动到表单；桌面端表单常驻可见无需滚动。改为 `behavior: "instant"` 消除动画感知，并仅在移动端（`isMobileFrontend`）才执行 `scrollIntoView`。

```ts
// bind-occasions.ts:43 改为：
const revealOccasionForm = () => {
    const drawer = root.querySelector<HTMLDetailsElement>("[data-occasion-form-drawer]");
    if (drawer) drawer.open = true;
    if (host.isMobileFrontend) {
        root.querySelector<HTMLElement>(".lc-checkin__occasion-form-panel")?.scrollIntoView({block: "start", behavior: "instant"});
    }
};
```

### 方案 B（备选）：不移除 smooth，但延迟到渲染完成后

在 `render()` 完成后（`requestAnimationFrame` 或 `setTimeout(0)`）再执行 `scrollIntoView`，避免渲染过程中滚动被覆盖。仍保留 smooth 但减少视觉突兀。

### 推荐 A，理由

- 桌面端表单常驻可见，`scrollIntoView` 本身是无害空操作（代码注释已确认），移除后无副作用
- 移动端 `instant` 替代 `smooth` 消除动画感知，直接定位到表单，更符合「点击 + → 看到表单」的交互预期
- 改动量最小（1~2 行），风险最低

## 修复后验证要点

1. 移动端（≤719px）：点击「+」后无纵向跳动，表单直接可见
2. 桌面端（≥720px）：点击「+」后无滚动，表单已在视口
3. reduced-motion：行为不变
4. 编辑已有事项：点击编辑按钮后同样定位到表单
