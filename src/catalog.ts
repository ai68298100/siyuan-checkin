import type {CheckinKind, CheckinPriority, CheckinSchedule, CheckinTimeSlot, CompletionSource, TomatoValueMode} from "./types";
import {t} from "./i18n";

/** A themed collection of icons that can be used by the item editor. */
export interface IconGroup {
    id: string;
    name: string;
    keywords: readonly string[];
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
    completionSource?: CompletionSource;
    tomatoMode?: TomatoValueMode;
    note: string;
}

export const ICON_GROUPS: readonly IconGroup[] = [
    {
        id: "general",
        name: "通用",
        keywords: ["常用", "完成", "打卡", "标记", "星星", "形状"],
        icons: ["✓", "✔", "✕", "★", "☆", "✦", "✧", "✩", "❖", "◆", "◇", "●", "○", "◎", "◉", "※"],
    },
    {
        id: "health",
        name: "健康",
        keywords: ["身体", "医疗", "养生", "保健"],
        icons: ["♥", "♡", "❤", "⚕", "✚", "☀", "☼", "☾", "☽", "♨", "💧", "🍎", "🥗", "🥛", "🫀", "🫁"],
    },
    {
        id: "sport",
        name: "运动",
        keywords: ["健身", "锻炼", "训练", "球类", "户外"],
        icons: ["🏃", "🚶", "🚴", "🏊", "🧘", "💪", "⚽", "🏀", "🏋", "🤸", "⛹", "🤾", "🧗", "🎾", "🏸", "🥊"],
    },
    {
        id: "learning",
        name: "学习",
        keywords: ["知识", "教育", "课程", "学业", "考试"],
        icons: ["📖", "📚", "📕", "📗", "📘", "📙", "✍", "✎", "📝", "🔖", "🎓", "🧠", "💡", "🔬", "🧮", "⌘"],
    },
    {
        id: "work",
        name: "工作",
        keywords: ["办公", "效率", "任务", "职场", "工具"],
        icons: ["💻", "🖥", "⌨", "🖱", "📊", "📈", "📋", "📌", "📎", "🗂", "🗃", "⏱", "⌛", "⚙", "🔧", "🍅"],
    },
    {
        id: "life",
        name: "生活",
        keywords: ["日常", "家务", "居家", "出行"],
        icons: ["🏠", "🛏", "🧹", "🧺", "🚿", "🛒", "🍳", "☕", "🍵", "🌱", "🌿", "🐾", "🚗", "🚌", "✈", "🔑"],
    },
    {
        id: "creative",
        name: "创作",
        keywords: ["艺术", "兴趣", "作品", "爱好"],
        icons: ["🎨", "🖌", "🖍", "✒", "🎵", "♫", "🎧", "🎹", "🎸", "📷", "🎬", "🎭", "🧩", "🧶", "🪴", "✨"],
    },
    {
        id: "goals",
        name: "目标与奖励",
        keywords: ["目标", "成就", "奖励", "提醒", "里程碑", "坚持"],
        icons: ["🎯", "🏆", "🎖️", "🥇", "🥈", "🏅", "🎁", "🚩", "📅", "🗓️", "🔔", "🔥", "💎", "🌟", "🪄", "🛎️"],
    },
    {
        id: "mindfulness",
        name: "专注与心情",
        keywords: ["正念", "情绪", "休息", "放松", "状态"],
        icons: ["🧘", "🌙", "🌈", "🌤", "🌧", "🍃", "🕯", "☮", "☯", "☺", "🙂", "😌", "😴", "🫶", "🧭", "🎯"],
    },
] as const;

/** Search aliases for the icon picker. Group names and group keywords are also indexed. */
export const ICON_SEARCH_KEYWORDS: Readonly<Record<string, string>> = {
    "✓": "完成 打卡 勾选 正确", "✔": "完成 打卡 对号", "✕": "取消 错误 戒掉", "★": "星星 收藏 重点",
    "☆": "星星 收藏 空心", "✦": "闪光 灵感 亮点", "✧": "闪光 装饰", "✩": "星标 目标",
    "❖": "菱形 标记", "◆": "菱形 实心", "◇": "菱形 空心", "●": "圆点 实心",
    "○": "圆圈 空心", "◎": "圆环 靶心", "◉": "圆环 记录", "※": "备注 提醒",
    "♥": "爱心 心脏 健康", "♡": "爱心 心情", "❤": "爱心 喜爱", "⚕": "医疗 医生",
    "✚": "急救 医疗 加号", "☀": "太阳 早起 晴天", "☼": "阳光 晒太阳", "☾": "月亮 睡眠 晚安",
    "☽": "月亮 夜晚", "♨": "温泉 热水 洗澡", "💧": "水滴 喝水 补水", "🍎": "苹果 水果 饮食",
    "🥗": "沙拉 蔬菜 轻食", "🥛": "牛奶 饮品", "🫀": "心脏 心率", "🫁": "肺 呼吸",
    "🏃": "跑步 跑者 慢跑", "🚶": "走路 步行 步数 散步", "🚴": "骑车 单车 自行车", "🏊": "游泳 泳池",
    "🧘": "瑜伽 冥想 拉伸 静坐", "💪": "力量 肌肉 健身", "⚽": "足球 踢球", "🏀": "篮球 投篮",
    "🏋": "举重 力量训练", "🤸": "体操 拉伸", "⛹": "球类 运球", "🤾": "手球 投掷",
    "🧗": "攀岩 登山", "🎾": "网球", "🏸": "羽毛球", "🥊": "拳击 搏击",
    "📖": "阅读 看书 读书", "📚": "书籍 阅读 学习", "📕": "红书 课本", "📗": "绿书 课本",
    "📘": "蓝书 课本", "📙": "橙书 课本", "✍": "写作 日记 书写", "✎": "铅笔 写字",
    "📝": "笔记 单词 清单", "🔖": "书签 标记", "🎓": "毕业 课程 学业", "🧠": "大脑 思考 记忆",
    "💡": "灵感 想法 灯泡", "🔬": "科学 研究 实验", "🧮": "数学 计算", "⌘": "快捷键 编程",
    "💻": "电脑 编程 深度工作", "🖥": "显示器 办公", "⌨": "键盘 打字", "🖱": "鼠标 电脑",
    "📊": "统计 数据 记账", "📈": "增长 趋势 业绩", "📋": "清单 任务 收件箱", "📌": "图钉 计划 重点",
    "📎": "附件 回形针", "🗂": "分类 文件夹 整理", "🗃": "归档 文件", "⏱": "计时 秒表 专注",
    "⌛": "沙漏 时间", "⚙": "设置 齿轮", "🔧": "工具 维修", "🍅": "番茄钟 专注",
    "🏠": "家 居家 房子", "🛏": "床 睡觉 睡眠", "🧹": "扫地 清洁 整理房间", "🧺": "洗衣 收纳",
    "🚿": "淋浴 洗澡", "🛒": "购物 买菜", "🍳": "做饭 烹饪 早餐", "☕": "咖啡 休息",
    "🍵": "茶 喝茶", "🌱": "植物 浇水 成长", "🌿": "绿植 自然", "🐾": "宠物 遛狗",
    "🚗": "汽车 开车 通勤", "🚌": "公交 通勤", "✈": "飞机 旅行", "🔑": "钥匙 门锁",
    "🎨": "绘画 画画 调色盘", "🖌": "画笔 绘画", "🖍": "蜡笔 涂色", "✒": "钢笔 写作",
    "🎵": "音乐 歌曲", "♫": "音符 音乐", "🎧": "耳机 听歌 播客", "🎹": "钢琴 键盘",
    "🎸": "吉他 乐器", "📷": "相机 摄影 拍照", "🎬": "电影 视频 剪辑", "🎭": "戏剧 表演",
    "🧩": "拼图 游戏", "🧶": "编织 手工", "🪴": "盆栽 植物", "✨": "闪耀 灵感",
    "🌙": "月亮 晚间 睡觉", "🌈": "彩虹 心情", "🌤": "晴间多云 天气", "🌧": "下雨 雨天",
    "🍃": "叶子 呼吸 自然", "🕯": "蜡烛 冥想 安静", "☮": "和平 放松", "☯": "平衡 太极",
    "☺": "开心 微笑", "🙂": "微笑 心情", "😌": "放松 情绪 平静", "😴": "睡觉 困倦 休息",
    "🫶": "关爱 感恩", "🧭": "指南针 复盘 方向", "🎯": "目标 靶心 专注",
};

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
    {name: "喝水", icon: "💧", kind: "quantity", target: 2000, unit: "毫升", schedule: daily, group: "健康", priority: "high", timeSlot: "any", note: "把全天饮水分散到各个时段。"},
    {name: "早睡早起", icon: "☀", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "记录是否在计划时间起床。"},
    {name: "睡眠时长", icon: "🛏", kind: "duration", target: 8, unit: "小时", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "按实际睡眠总时长填写。"},
    {name: "运动", icon: "🏃", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "运动", priority: "high", timeSlot: "any", note: "任何中等强度以上的活动都可以计入。"},
    {name: "步数", icon: "🚶", kind: "quantity", target: 8000, unit: "步", schedule: daily, group: "运动", priority: "medium", timeSlot: "evening", note: "可从手机或手表读取当天步数。"},
    {name: "拉伸", icon: "🧘", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "运动", priority: "low", timeSlot: "any", note: "训练前后或久坐间隙完成。"},
    {name: "阅读", icon: "📖", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "学习", priority: "high", timeSlot: "evening", note: "纸书、电子书和专业资料均可。"},
    {name: "背单词", icon: "📝", kind: "count", target: 20, unit: "个", schedule: daily, group: "学习", priority: "medium", timeSlot: "morning", note: "按当天新复习的词数记录。"},
    {name: "写日记", icon: "✍", kind: "binary", target: 1, unit: "次", schedule: daily, group: "学习", priority: "low", timeSlot: "evening", note: "写下当天最重要的一件事。"},
    {name: "在线课程", icon: "🎓", kind: "duration", target: 25, unit: "分钟", schedule: workdays, group: "学习", priority: "low", timeSlot: "any", note: "适用于工作日的固定学习计划。"},
    {name: "深度工作", icon: "💻", kind: "duration", target: 90, unit: "分钟", schedule: workdays, group: "工作", priority: "high", timeSlot: "morning", note: "关闭通知，完成一段完整专注时间。"},
    {name: "整理收件箱", icon: "📋", kind: "binary", target: 1, unit: "次", schedule: workdays, group: "工作", priority: "low", timeSlot: "afternoon", note: "将待处理邮件归档或转成任务。"},
    {name: "每日计划", icon: "📌", kind: "binary", target: 1, unit: "次", schedule: workdays, group: "工作", priority: "medium", timeSlot: "morning", note: "开始工作前明确三件最重要的事。"},
    {name: "番茄钟", icon: "🍅", kind: "count", target: 4, unit: "个", schedule: workdays, group: "工作", priority: "medium", timeSlot: "any", note: "每完成一个专注周期记录一次。"},
    {name: "整理房间", icon: "🧹", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "生活", priority: "low", timeSlot: "evening", note: "只整理一个小区域也算完成。"},
    {name: "做饭", icon: "🍳", kind: "count", target: 1, unit: "餐", schedule: daily, group: "生活", priority: "low", timeSlot: "any", note: "记录自己准备的早餐、午餐或晚餐。"},
    {name: "记账", icon: "📊", kind: "binary", target: 1, unit: "次", schedule: daily, group: "生活", priority: "medium", timeSlot: "evening", note: "当天消费当天记录，保持账目清晰。"},
    {name: "植物浇水", icon: "🌱", kind: "binary", target: 1, unit: "次", schedule: weekend, group: "生活", priority: "low", timeSlot: "any", note: "根据植物状态调整频率。"},
    {name: "练习乐器", icon: "🎸", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "创作", priority: "low", timeSlot: "evening", note: "音阶、曲目和即兴练习都可以计入。"},
    {name: "绘画练习", icon: "🎨", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "创作", priority: "low", timeSlot: "any", note: "完成一张速写或一组观察练习。"},
    {name: "拍照记录", icon: "📷", kind: "count", target: 3, unit: "张", schedule: daily, group: "创作", priority: "low", timeSlot: "any", note: "记录三张当天值得留意的照片。"},
    {name: "冥想", icon: "🕯", kind: "duration", target: 10, unit: "分钟", schedule: daily, group: "专注", priority: "medium", timeSlot: "morning", note: "安静坐下，关注呼吸和身体感受。"},
    {name: "情绪记录", icon: "😌", kind: "binary", target: 1, unit: "次", schedule: daily, group: "专注", priority: "low", timeSlot: "evening", note: "写下一句当下感受和一个触发因素。"},
    {name: "周复盘", icon: "🧭", kind: "duration", target: 30, unit: "分钟", schedule: monday, group: "专注", priority: "low", timeSlot: "morning", note: "回顾上周进展并确定本周重点。"},
] as const;

/* 模板显示名/备注的字典键映射：zh 名作为数据锚点，渲染与套用时经 t() 翻译。 */
const TEMPLATE_NAME_KEYS: Record<string, string> = {
    "喝水": "tpl.water",
    "早睡早起": "tpl.earlyRise",
    "睡眠时长": "tpl.sleep",
    "运动": "tpl.workout",
    "步数": "tpl.steps",
    "拉伸": "tpl.stretch",
    "阅读": "tpl.reading",
    "背单词": "tpl.vocab",
    "写日记": "tpl.journal",
    "在线课程": "tpl.onlineCourse",
    "深度工作": "tpl.deepWork",
    "整理收件箱": "tpl.inbox",
    "每日计划": "tpl.dailyPlan",
    "番茄钟": "tpl.pomodoro",
    "整理房间": "tpl.tidyRoom",
    "做饭": "tpl.cook",
    "记账": "tpl.expenseLog",
    "植物浇水": "tpl.waterPlant",
    "练习乐器": "tpl.instrument",
    "绘画练习": "tpl.sketch",
    "拍照记录": "tpl.photoLog",
    "冥想": "tpl.meditate",
    "情绪记录": "tpl.moodLog",
    "周复盘": "tpl.weeklyReview",
};

const TEMPLATE_GROUP_KEYS: Record<string, string> = {
    "健康": "tplGroup.health",
    "运动": "tplGroup.sport",
    "学习": "tplGroup.learning",
    "工作": "tplGroup.work",
    "生活": "tplGroup.life",
    "创作": "tplGroup.creative",
    "专注": "tplGroup.mindfulness",
};

export function templateName(template: {name: string}): string {
    const key = TEMPLATE_NAME_KEYS[template.name];
    return key ? t(key) : template.name;
}

export function templateNote(template: {name: string; note: string}): string {
    const key = TEMPLATE_NAME_KEYS[template.name];
    return key ? t(`tplNote.${key.slice(4)}`) : template.note;
}

export function templateGroupLabel(group: string): string {
    const key = TEMPLATE_GROUP_KEYS[group];
    return key ? t(key) : group;
}

