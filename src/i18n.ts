/* 8.0 P3 i18n 基础设施：字典 + t() 查询。默认 zh-CN；en-US 随迁移逐步补全。
   语言来源：设置项 pluginLanguage（zh-CN 默认 / en-US / follow 思源）。 */

export type PluginLanguage = "zh-CN" | "en-US";

type Dict = Record<string, string>;

const zhCN: Dict = {
    "nav.today": "今日",
    "nav.review": "回顾",
    "nav.occasions": "事项",
    "nav.archived": "归档",
    "nav.settings": "设置",
    "nav.add": "新建打卡项",
    "today.title": "今天",
    "today.filterPlaceholder": "筛选打卡项",
    "today.bulk": "多选",
    "today.filter": "筛选",
    "today.filterActive": "筛选 · 已启用",
    "review.title": "回顾",
    "review.eyebrow": "数据回顾",
    "occasions.title": "日期事项",
    "archived.title": "已归档",
    "settings.title": "设置",
    "editor.create": "新建打卡项",
    "editor.edit": "设置打卡项",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.delete": "删除",
    "common.manage": "管理",
    "bulk.selected": "已选 {n}",
    "focus.minutes": "专注 {n} 分钟",
};

const enUS: Dict = {
    "nav.today": "Today",
    "nav.review": "Review",
    "nav.occasions": "Events",
    "nav.archived": "Archive",
    "nav.settings": "Settings",
    "nav.add": "New check-in",
    "today.title": "Today",
    "today.filterPlaceholder": "Filter check-ins",
    "today.bulk": "Select",
    "today.filter": "Filter",
    "today.filterActive": "Filter · on",
    "review.title": "Review",
    "review.eyebrow": "Records",
    "occasions.title": "Date Events",
    "archived.title": "Archived",
    "settings.title": "Settings",
    "editor.create": "New Check-in",
    "editor.edit": "Edit Check-in",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.manage": "Manage",
    "bulk.selected": "{n} selected",
    "focus.minutes": "Focused {n} min",
};

const DICTS: Record<PluginLanguage, Dict> = {"zh-CN": zhCN, "en-US": enUS};

let current: PluginLanguage = "zh-CN";

export function setPluginLanguage(language: PluginLanguage): void {
    current = DICTS[language] ? language : "zh-CN";
}

export function t(key: string, params?: Record<string, string | number>): string {
    const dict = DICTS[current] || zhCN;
    let text = dict[key] ?? zhCN[key] ?? key;
    if (params) {
        for (const [name, value] of Object.entries(params)) text = text.replace(`{${name}}`, String(value));
    }
    return text;
}
