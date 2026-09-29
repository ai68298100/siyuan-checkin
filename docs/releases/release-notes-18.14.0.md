# 小驴打卡 v18.14.0

「代码健康」微批：CSV 导入截断警告与类型安全清理。主存储与公开 API 不变，最低思源 3.8.4 不变，可直接从 18.13.0 升级。

## 更新内容

### CSV 截断警告

- 导入超 20000 行上限的文件时，确认弹窗前显示双语截断警告，用户在决策前即知数据不完整，不再静默丢弃。

### 类型安全

- `reminder-projection` 的 `normalizeReminderTransitions` 与 `normalizeReminderTokenAudits` 中最后两处 `as any` 断言替换为 `Record<string, unknown>` 类型安全断言。

## 本地开发说明

下方摘要由质量链同步为当前工作树构建包，并非已上传的发布包。

- SHA-256：`1264d17b3527d5656e621a108874135aaa7df8ee484b105888d70bb48ef75f04`
