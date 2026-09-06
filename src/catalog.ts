import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot} from "./types";

/** A themed collection of icons that can be used by the item editor. */
export interface IconGroup {
    id: string;
    name: string;
    icons: readonly string[];
}

/** Metadata used to render controls for each check-in value type. */
export interface KindOption {
    kind: CheckinKind;
    name: string;
    label: string;
    description: string;
    defaultUnit: string;
    units: readonly string[];
    step: number;
    inputMode: "checkbox" | "number" | "text";
}

/** A ready-to-use item definition for the new-item flow. */
export interface CheckinTemplate {
    name: string;
    icon: string;
    kind: CheckinKind;
    target: number;
    unit: string;
    schedule: CheckinSchedule;
    group: string;
    priority: CheckinPriority;
    timeSlot?: CheckinTimeSlot;
    note: string;
}

export const ICON_GROUPS: readonly IconGroup[] = [
    {
        id: "general",
        name: "通用",
        icons: ["✓", "✔", "✕", "★", "☆", "✦", "✧", "✩", "❖", "◆", "◇", "●", "○", "◎", "◉", "※"],
    },
    {
        id: "health",
        name: "健康",
        icons: ["♥", "♡", "❤", "⚕", "✚", "☀", "☼", "☾", "☽", "♨", "💧", "🍎", "🥗", "🥛", "🫀", "🫁"],
    },
    {
        id: "sport",
        name: "运动",
        icons: ["🏃", "🚶", "🚴", "🏊", "🧘", "💪", "⚽", "🏀", "🏋", "🤸", "⛹", "🤾", "🧗", "🎾", "🏸", "🥊"],
    },
    {
        id: "learning",
        name: "学习",
        icons: ["📖", "📚", "📕", "📗", "📘", "📙", "✍", "✎", "📝", "🔖", "🎓", "🧠", "💡", "🔬", "🧮", "⌘"],
    },
    {
        id: "work",
        name: "工作",
        icons: ["💻", "🖥", "⌨", "🖱", "📊", "📈", "📋", "📌", "📎", "🗂", "🗃", "⏱", "⌛", "⚙", "🔧", "☎"],
    },
    {
        id: "life",
        name: "生活",
        icons: ["🏠", "🛏", "🧹", "🧺", "🚿", "🛒", "🍳", "☕", "🍵", "🌱", "🌿", "🐾", "🚗", "🚌", "✈", "🔑"],
    },
    {
        id: "creative",
        name: "创作",
        icons: ["🎨", "🖌", "🖍", "✒", "🎵", "♫", "🎧", "🎹", "🎸", "📷", "🎬", "🎭", "🧩", "🧶", "🪴", "✨"],
    },
    {
        id: "mindfulness",
        name: "专注与心情",
        icons: ["🧘", "🌙", "🌈", "🌤", "🌧", "🍃", "🕯", "☮", "☯", "☺", "🙂", "😌", "😴", "🫶", "🧭", "🎯"],
    },
] as const;

export const KIND_OPTIONS: readonly KindOption[] = [
    {
        kind: "binary",
        name: "完成一次",
        label: "完成一次",
        description: "只记录今天是否完成，点击即可打卡。",
        defaultUnit: "次",
        units: ["次"],
        step: 1,
        inputMode: "checkbox",
    },
    {
        kind: "count",
        name: "按次数",
        label: "按次数",
        description: "记录重复行为的次数，例如俯卧撑或背单词。",
        defaultUnit: "次",
        units: ["次", "组", "回", "个", "项", "页"],
        step: 1,
        inputMode: "number",
    },
    {
        kind: "duration",
        name: "按时长",
        label: "按时长",
        description: "记录投入的时间，适合阅读、运动和专注。",
        defaultUnit: "分钟",
        units: ["分钟", "小时"],
        step: 5,
        inputMode: "number",
    },
    {
        kind: "quantity",
        name: "按数量",
        label: "按数量",
        description: "记录可度量的数量，例如饮水毫升数或步数。",
        defaultUnit: "个",
        units: ["个", "毫升", "升", "克", "千克", "公里", "步", "页", "元"],
        step: 1,
        inputMode: "number",
    },
    {
        kind: "custom",
        name: "自定义",
        label: "自定义",
        description: "使用自定义单位记录任意数值。",
        defaultUnit: "单位",
        units: ["单位", "分", "点", "项"],
        step: 0.1,
        inputMode: "number",
    },
] as const;

const daily: CheckinSchedule = {type: "daily"};
const workdays: CheckinSchedule = {type: "workdays"};
const monday: CheckinSchedule = {type: "weekly", weekdays: [1]};
const weekend: CheckinSchedule = {type: "weekly", weekdays: [0, 6]};

export const CHECKIN_TEMPLATES: readonly CheckinTemplate[] = [
    {name: "喝水", icon: "💧", kind: "quantity", target: 2000, unit: "毫升", schedule: daily, group: "健康", priority: "high", note: "把全天饮水分散到各个时段。"},
    {name: "早睡早起", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "记录是否在计划时间起床。"},
    {name: "睡眠时长", icon: "🛏", kind: "duration", target: 8, unit: "小时", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "按实际睡眠总时长填写。"},
    {name: "运动", icon: "🏃", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "运动", priority: "high", note: "任何中等强度以上的活动都可以计入。"},
    {name: "步数", icon: "🚶", kind: "quantity", target: 8000, unit: "步", schedule: daily, group: "运动", priority: "medium", timeSlot: "evening", note: "可从手机或手表读取当天步数。"},
    {name: "拉伸", icon: "🧘", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "运动", priority: "low", note: "训练前后或久坐间隙完成。"},
    {name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "学习", priority: "high", timeSlot: "evening", note: "纸书、电子书和专业资料均可。"},
    {name: "背单词", icon: "📝", kind: "count", target: 20, unit: "个", schedule: daily, group: "学习", priority: "medium", timeSlot: "morning", note: "按当天新复习的词数记录。"},
    {name: "写日记", icon: "✍", kind: "binary", target: 1, unit: "次", schedule: daily, group: "学习", priority: "low", timeSlot: "evening", note: "写下当天最重要的一件事。"},
    {name: "在线课程", icon: "🎓", kind: "duration", target: 25, unit: "分钟", schedule: workdays, group: "学习", priority: "low", note: "适用于工作日的固定学习计划。"},
    {name: "深度工作", icon: "💻", kind: "duration", target: 90, unit: "分钟", schedule: workdays, group: "工作", priority: "high", timeSlot: "morning", note: "关闭通知，完成一段完整专注时间。"},
    {name: "整理收件箱", icon: "📋", kind: "binary", target: 1, unit: "次", schedule: workdays, group: "工作", priority: "low", timeSlot: "afternoon", note: "将待处理邮件归档或转成任务。"},
    {name: "每日计划", icon: "📌", kind: "binary", target: 1, unit: "次", schedule: workdays, group: "工作", priority: "medium", timeSlot: "morning", note: "开始工作前明确三件最重要的事。"},
    {name: "番茄钟", icon: "🍅", kind: "count", target: 4, unit: "个", schedule: workdays, group: "工作", priority: "medium", note: "每完成一个专注周期记录一次。"},
    {name: "整理房间", icon: "🧹", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "生活", priority: "low", timeSlot: "evening", note: "只整理一个小区域也算完成。"},
    {name: "做饭", icon: "🍳", kind: "count", target: 1, unit: "餐", schedule: daily, group: "生活", priority: "low", note: "记录自己准备的早餐、午餐或晚餐。"},
    {name: "记账", icon: "📊", kind: "binary", target: 1, unit: "次", schedule: daily, group: "生活", priority: "medium", timeSlot: "evening", note: "当天消费当天记录，保持账目清晰。"},
    {name: "植物浇水", icon: "🌱", kind: "binary", target: 1, unit: "次", schedule: weekend, group: "生活", priority: "low", note: "根据植物状态调整频率。"},
    {name: "练习乐器", icon: "🎸", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "创作", priority: "low", timeSlot: "evening", note: "音阶、曲目和即兴练习都可以计入。"},
    {name: "绘画练习", icon: "🎨", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "创作", priority: "low", note: "完成一张速写或一组观察练习。"},
    {name: "拍照记录", icon: "📷", kind: "count", target: 3, unit: "张", schedule: daily, group: "创作", priority: "low", note: "记录三张当天值得留意的照片。"},
    {name: "冥想", icon: "🕯", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "专注", priority: "medium", timeSlot: "morning", note: "安静坐下，关注呼吸和身体感受。"},
    {name: "情绪记录", icon: "😌", kind: "binary", target: 1, unit: "次", schedule: daily, group: "专注", priority: "low", timeSlot: "evening", note: "写下一句当下感受和一个触发因素。"},
    {name: "周复盘", icon: "🧭", kind: "duration", target: 30, unit: "分钟", schedule: monday, group: "专注", priority: "low", timeSlot: "morning", note: "回顾上周进展并确定本周重点。"},
] as const;

