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
    "today.filter": "筛选",
    "today.filterActive": "筛选 · 已启用",
    "today.bulk": "多选",
    "today.group": "分组",
    "today.groupMode": "分组方式",
    "today.sortMode": "排序方式",
    "today.completed": "已完成打卡项",
    "today.emptyActiveTitle": "当前没有进行中的打卡项",
    "today.emptyActiveDesc": "已归档的项目不会出现在今天。恢复一个项目，或新建一个新的打卡项。",
    "today.emptyOnboardTitle": "从一个小目标开始",
    "today.emptyOnboardDesc": "三步建立你的第一个打卡习惯。",
    "today.step1Title": "选模板",
    "today.step1Desc": "新建时从常用模板挑选，或完全自定义。",
    "today.step2Title": "命名",
    "today.step2Desc": "给习惯起个名字，再配一个喜欢的图标。",
    "today.step3Title": "打卡",
    "today.step3Desc": "回到今日页点一下图标，连续记录就开始了。",
    "today.addFirst": "新建第一个打卡项",
    "today.emptyScheduledTitle": "今天没有安排",
    "today.emptyScheduledDesc": "现有项目都不在今天的计划里。可以查看历史，或添加新的打卡项。",
    "today.searchEmpty": "没有匹配的打卡项",
    "today.searchEmptyHint": "试试项目名称或分组关键词",
    "today.allDone": "今天的计划已完成",
    "today.viewHistory": "查看历史",
    "today.viewArchived": "查看已归档",
    "today.occasionTitle": "日期提醒",
    "today.occasionEmpty": "未来提醒会在这里出现。",
    "review.title": "回顾",
    "review.eyebrow": "数据回顾",
    "occasions.title": "日期事项",
    "occasions.eyebrow": "提醒与计划",
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
    "today.filter": "Filter",
    "today.filterActive": "Filter · on",
    "today.bulk": "Select",
    "today.group": "Group",
    "today.groupMode": "Group mode",
    "today.sortMode": "Sort mode",
    "today.completed": "Completed",
    "today.emptyActiveTitle": "No active check-ins",
    "today.emptyActiveDesc": "Archived items don't appear today. Restore one, or create a new check-in.",
    "today.emptyOnboardTitle": "Start with one small goal",
    "today.emptyOnboardDesc": "Three steps to your first habit.",
    "today.step1Title": "Pick a template",
    "today.step1Desc": "Choose from common templates or start from scratch.",
    "today.step2Title": "Name it",
    "today.step2Desc": "Give it a name and an icon you like.",
    "today.step3Title": "Check in",
    "today.step3Desc": "Tap its icon on Today and your streak begins.",
    "today.addFirst": "Create your first check-in",
    "today.emptyScheduledTitle": "Nothing scheduled today",
    "today.emptyScheduledDesc": "None of your items are planned for today. Browse history or add a new one.",
    "today.searchEmpty": "No matching check-ins",
    "today.searchEmptyHint": "Try a name or group keyword",
    "today.allDone": "Today's plan is complete",
    "today.viewHistory": "View history",
    "today.viewArchived": "View archive",
    "today.occasionTitle": "Date reminders",
    "today.occasionEmpty": "Upcoming reminders will appear here.",
    "review.title": "Review",
    "review.eyebrow": "Records",
    "occasions.title": "Date Events",
    "occasions.eyebrow": "Reminders",
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
