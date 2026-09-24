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
    recordStep?: number;
    schedule: CheckinSchedule;
    group: string;
    priority: CheckinPriority;
    timeSlot?: CheckinTimeSlot;
    completionSource?: CompletionSource;
    tomatoMode?: TomatoValueMode;
    /** T-1239：戒除类模板（at-most 语义，仅 daily）。 */
    direction?: "atMost";
    note: string;
}

export const ICON_GROUPS: readonly IconGroup[] = [
    {
        id: "general",
        name: "通用",
        keywords: ["常用", "完成", "打卡", "标记", "星星", "形状"],
        icons: ["✓", "✔", "✕", "★", "☆", "✦", "✧", "✩", "❖", "◆", "◇", "●", "○", "◎", "◉", "※", "➜", "➤", "＋", "－", "☑", "☒", "❗", "❓"],
    },
    {
        id: "health",
        name: "健康",
        keywords: ["身体", "医疗", "养生", "保健"],
        icons: ["♥", "♡", "❤", "⚕", "✚", "☀", "☼", "☾", "☽", "♨", "💧", "🍎", "🥗", "🥛", "🫀", "🫁", "🩺", "🧴", "🧘‍♀️", "🌡️", "🦷", "👁️"],
    },
    {
        id: "sport",
        name: "运动",
        keywords: ["健身", "锻炼", "训练", "球类", "户外"],
        icons: ["🏃", "🚶", "🚴", "🏊", "🧘", "💪", "⚽", "🏀", "🏋", "🤸", "⛹", "🤾", "🧗", "🎾", "🏸", "🥊", "🏌️", "🚵", "🛹", "⛷️", "🥋", "🏹"],
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
    {name: "任务打卡", icon: "✅", kind: "count", target: 3, unit: "个", schedule: daily, group: "工作", priority: "high", timeSlot: "any", note: "由任务管理器按当天完成任务数写入，目标数量可按需调整。"},
    {name: "番茄钟", icon: "🍅", kind: "count", target: 4, unit: "个", schedule: workdays, group: "工作", priority: "medium", timeSlot: "any", completionSource: "tomato", tomatoMode: "sessions", note: "每完成一个专注周期记录一次；可在设置中绑定 Dock Tomato 或使用内置计时器。"},
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
    {name: "晨间补水", icon: "🥛", kind: "quantity", target: 300, unit: "毫升", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "起床后先喝一杯温水。"},
    {name: "维生素", icon: "💊", kind: "count", target: 1, unit: "次", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "随餐或早餐后服用。"},
    {name: "眼保健操", icon: "👀", kind: "count", target: 1, unit: "次", schedule: workdays, group: "健康", priority: "medium", timeSlot: "afternoon", note: "长时间用眼后给眼睛放个假。"},
    {name: "早睡", icon: "🌙", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "medium", timeSlot: "evening", note: "比昨天早一点上床就算赢。"},
    {name: "散步", icon: "🚶", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "运动", priority: "low", timeSlot: "evening", note: "饭后慢走，不用追求配速。"},
    {name: "力量训练", icon: "🏋️", kind: "duration", target: 30, unit: "分钟", schedule: workdays, group: "运动", priority: "high", timeSlot: "any", note: "力量或自重训练均可计入。"},
    {name: "朗读", icon: "🗣️", kind: "duration", target: 15, unit: "分钟", schedule: daily, group: "学习", priority: "low", timeSlot: "morning", note: "出声朗读，保持语感和表达。"},
    {name: "不刷手机", icon: "📵", kind: "binary", target: 1, unit: "次", schedule: daily, group: "专注", priority: "medium", timeSlot: "evening", note: "睡前一段时间远离屏幕。"},
    {name: "喝茶", icon: "🍵", kind: "count", target: 2, unit: "杯", schedule: daily, group: "生活", priority: "low", timeSlot: "any", note: "淡茶为宜，下午四点后少喝。"},
    {name: "陪家人", icon: "👨‍👩‍👧", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "生活", priority: "high", timeSlot: "any", note: "放下手机，专心陪伴。"},
    {name: "八段锦", icon: "🤸", kind: "count", target: 1, unit: "套", schedule: daily, group: "运动", priority: "low", timeSlot: "morning", note: "完整练一遍八段锦或等效体操。"},
    {name: "泡脚", icon: "🛀", kind: "binary", target: 1, unit: "次", schedule: daily, group: "生活", priority: "low", timeSlot: "evening", note: "睡前泡脚 10-15 分钟有助放松。"},
    {name: "早餐", icon: "🍞", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "medium", timeSlot: "morning", note: "按时吃早餐，开启稳定的一天。"},
    {name: "午休", icon: "😴", kind: "duration", target: 20, unit: "分钟", schedule: workdays, group: "健康", priority: "low", timeSlot: "any", note: "午间小憩，20 分钟左右即可。"},
    {name: "颈部放松", icon: "🙆", kind: "duration", target: 5, unit: "分钟", schedule: workdays, group: "健康", priority: "low", timeSlot: "afternoon", note: "每小时起身活动，缓解颈肩僵硬。"},
    {name: "戒烟", icon: "🚭", kind: "binary", target: 1, unit: "次", schedule: daily, group: "戒除", priority: "high", timeSlot: "any", direction: "atMost", note: "没记录就是胜利；破戒日如实记下，连续记录会重新开始。"},
    {name: "戒奶茶", icon: "🧋", kind: "binary", target: 1, unit: "次", schedule: daily, group: "戒除", priority: "medium", timeSlot: "any", direction: "atMost", note: "想喝的时候先喝一杯水，再看还要不要。"},
    {name: "限制咖啡", icon: "☕", kind: "count", target: 2, unit: "杯", schedule: daily, group: "戒除", priority: "low", timeSlot: "any", direction: "atMost", note: "每天不超过 2 杯；记录的每一杯都是在数上限。"},
    {name: "不熬夜刷手机", icon: "📵", kind: "binary", target: 1, unit: "次", schedule: daily, group: "戒除", priority: "medium", timeSlot: "evening", direction: "atMost", note: "睡前半小时放下手机；跳过日不断链。"},
    {name: "戒糖饮料", icon: "🥤", kind: "count", target: 1, unit: "杯", schedule: daily, group: "戒除", priority: "low", timeSlot: "any", direction: "atMost", note: "含糖饮料每天至多 1 杯，白水无限制。"},
    /* T-1356 模板二期（v19）：参考 Habitify/Loop/Streaks 预置目录扩充，按八类逐批合入。 */
    {name: "记录体重", icon: "⚖", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "low", timeSlot: "morning", note: "每天早上上秤记一次，习惯本身比数字更重要。"},
    {name: "防晒", icon: "🧴", kind: "binary", target: 1, unit: "次", schedule: daily, group: "健康", priority: "low", timeSlot: "morning", note: "出门前涂好防晒，皮肤会感谢你。"},
    {name: "听播客", icon: "🎧", kind: "duration", target: 20, unit: "分钟", schedule: daily, group: "学习", priority: "low", timeSlot: "any", note: "通勤或散步时听一集有营养的播客。"},
    {name: "刷题", icon: "🧮", kind: "count", target: 10, unit: "题", schedule: daily, group: "学习", priority: "medium", timeSlot: "evening", note: "整理当天做错的题，弄懂一道算一道。"},
    {name: "跑步", icon: "🏃", kind: "quantity", target: 3, unit: "公里", schedule: daily, group: "运动", priority: "high", timeSlot: "any", note: "慢跑即可，距离到了就算达标。"},
    {name: "俯卧撑", icon: "💪", kind: "count", target: 20, unit: "个", schedule: daily, group: "运动", priority: "medium", timeSlot: "any", note: "分组完成，一组十个也行。"},
    {name: "单事专注", icon: "🎯", kind: "binary", target: 1, unit: "次", schedule: workdays, group: "工作", priority: "medium", timeSlot: "morning", note: "选定一件事做完再切换，减少来回跳。"},
    {name: "遛狗", icon: "🐾", kind: "count", target: 1, unit: "次", schedule: daily, group: "生活", priority: "low", timeSlot: "any", note: "毛孩子的健康也靠坚持。"},
    {name: "洗碗", icon: "🧽", kind: "binary", target: 1, unit: "次", schedule: daily, group: "生活", priority: "low", timeSlot: "evening", note: "当天碗当天洗，厨房常清爽。"},
    {name: "存钱", icon: "💰", kind: "quantity", target: 20, unit: "元", schedule: daily, group: "生活", priority: "medium", timeSlot: "any", note: "每天存一点，攒下安全感。"},
    {name: "不刷短视频", icon: "📱", kind: "count", target: 3, unit: "次", schedule: daily, group: "戒除", priority: "medium", timeSlot: "any", direction: "atMost", note: "短视频每天至多打开 3 次，记录的每一次都在数上限。"},
    {name: "戒酒", icon: "🍷", kind: "binary", target: 1, unit: "次", schedule: daily, group: "戒除", priority: "medium", timeSlot: "any", direction: "atMost", note: "今天没碰酒就是赢；应酬破戒如实记下。"},
    {name: "感恩记录", icon: "🫶", kind: "count", target: 3, unit: "件", schedule: daily, group: "专注", priority: "low", timeSlot: "evening", note: "写下三件值得感谢的小事，再普通也算。"},
    {name: "深呼吸", icon: "🍃", kind: "duration", target: 5, unit: "分钟", schedule: daily, group: "专注", priority: "low", timeSlot: "any", note: "紧张时来一组深呼吸，五分钟就够。"},
    {name: "情绪自评", icon: "🌤", kind: "custom", target: 5, unit: "分", recordStep: 1, schedule: daily, group: "专注", priority: "low", timeSlot: "evening", note: "睡前给今天的心情打个分（1~5 分），连续记录更有参考价值。"},
    {name: "写作", icon: "✒", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "创作", priority: "medium", timeSlot: "any", note: "散文、小说或笔记，持续写下去就算数。"},
    /* T-1440 · R-A12 来源联动模板——创建正确形状的项目后，在设置页开启对应联动即可自动记录。 */
    {name: "思阅阅读", icon: "📕", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "联动", priority: "medium", timeSlot: "any", note: "配合思阅插件使用：在设置 → 连接与能力中开启思阅联动后自动累计有效阅读时长。"},
    {name: "思播观看", icon: "▶", kind: "duration", target: 30, unit: "分钟", schedule: daily, group: "联动", priority: "low", timeSlot: "any", note: "配合思播插件使用（实验）：在设置 → 连接与能力中开启思播联动后自动累计有效观看时长。"},
    {name: "健康步数", icon: "👟", kind: "quantity", target: 6000, unit: "步", schedule: daily, group: "联动", priority: "low", timeSlot: "any", note: "配合健康收件箱使用：在设置 → 连接与能力中绑定步数项目和收件箱文档。"},
] as const;

/** T-1357 精选推荐位：无最近使用时展示这些跨类别模板（zh 名为锚点）。 */
export const RECOMMENDED_TEMPLATES: readonly string[] = ["喝水", "运动", "阅读", "深度工作", "记账", "冥想", "戒烟", "拍照记录"];

/** T-1454 · 方向 11 场景组合包（habit stacks v1）：可预览的生活场景模板组。
    纯内容资产：按模板名引用 CHECKIN_TEMPLATES，名字随语言由 i18n 解析；
    组合包不做批量创建（应用仍逐条走既有表单确认），预览承担「包含哪些项目、
    排期、默认值」的展示。 */
export interface CheckinTemplatePack {
    id: string;
    icon: string;
    nameKey: string;
    templates: readonly string[];
}

export const TEMPLATE_PACKS: readonly CheckinTemplatePack[] = Object.freeze([
    Object.freeze({id: "morning", icon: "☀", nameKey: "pack.morning", templates: ["晨间补水", "早餐", "拉伸", "深呼吸", "每日计划"]}),
    Object.freeze({id: "study", icon: "📖", nameKey: "pack.study", templates: ["阅读", "背单词", "朗读", "听播客", "写日记"]}),
    Object.freeze({id: "sport", icon: "🏃", nameKey: "pack.sport", templates: ["运动", "力量训练", "跑步", "步数", "八段锦"]}),
    Object.freeze({id: "winddown", icon: "🌙", nameKey: "pack.winddown", templates: ["早睡", "泡脚", "不刷手机", "情绪记录", "感恩记录"]}),
    Object.freeze({id: "creative", icon: "✒", nameKey: "pack.creative", templates: ["写作", "绘画练习", "拍照记录", "练习乐器"]}),
]);

export function templatePackName(pack: CheckinTemplatePack): string {
    return t(pack.nameKey);
}

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
    "任务打卡": "tpl.taskCheckin",
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
    "晨间补水": "tpl.morningWater",
    "维生素": "tpl.vitamins",
    "眼保健操": "tpl.eyeExercise",
    "早睡": "tpl.earlyBed",
    "散步": "tpl.stroll",
    "力量训练": "tpl.strength",
    "朗读": "tpl.readAloud",
    "不刷手机": "tpl.noPhone",
    "喝茶": "tpl.tea",
    "陪家人": "tpl.familyTime",
    "八段锦": "tpl.baduanjin",
    "泡脚": "tpl.footSoak",
    "早餐": "tpl.breakfast",
    "午休": "tpl.nap",
    "颈部放松": "tpl.neckRelease",
    "戒烟": "tpl.quitSmoking",
    "戒奶茶": "tpl.quitMilkTea",
    "限制咖啡": "tpl.coffeeCap",
    "不熬夜刷手机": "tpl.noLatePhone",
    "戒糖饮料": "tpl.sugaryDrinkCap",
    "记录体重": "tpl.weighIn",
    "防晒": "tpl.sunscreen",
    "听播客": "tpl.podcast",
    "刷题": "tpl.problemSets",
    "跑步": "tpl.running",
    "俯卧撑": "tpl.pushups",
    "单事专注": "tpl.singleTask",
    "遛狗": "tpl.dogWalk",
    "洗碗": "tpl.dishes",
    "存钱": "tpl.savings",
    "不刷短视频": "tpl.shortVideoCap",
    "戒酒": "tpl.quitAlcohol",
    "感恩记录": "tpl.gratitude",
    "深呼吸": "tpl.deepBreaths",
    "情绪自评": "tpl.emotionScale",
    "写作": "tpl.writing",
    "思阅阅读": "tpl.sireader",
    "思播观看": "tpl.siplayer",
    "健康步数": "tpl.healthSteps",
};

const TEMPLATE_GROUP_KEYS: Record<string, string> = {
    "健康": "tplGroup.health",
    "运动": "tplGroup.sport",
    "学习": "tplGroup.learning",
    "工作": "tplGroup.work",
    "生活": "tplGroup.life",
    "创作": "tplGroup.creative",
    "专注": "tplGroup.mindfulness",
    "戒除": "tplGroup.quitting",
    "联动": "tplGroup.integration",
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

