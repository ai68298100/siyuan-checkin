/* T-1402 微信读书适配器（official-pull 渠道首租户，框架文档 §五）——接入层纯核心。
   契约依据官方 skill 包（Tencent/WeChatReading，Apache-2.0）skills/SKILL.md 与
   skills/readdata.md（2026-09-24 核对 main 分支）：
   - 统一入口 POST https://i.weread.qq.com/api/agent/gateway，Bearer wrk- Key；
   - 请求体扁平：api_name + skill_version + 业务参数同一层，禁止 params 包裹；
   - skill_version 取官方 SKILL.md 顶部 version（当前 1.0.4）；upgrade_info 见到即停；
   - 阅读时长字段单位均为秒；/readdata/detail 默认 mode=monthly 按天分桶——
     `readTimes` 为日桶明细（key=分桶起始 unix 秒，value=秒），`dailyReadTimes`
     为年度模式日明细；单日超过 24h 的桶视为口径异常丢弃。
   宿主经思源内核公开转发接口 /api/network/forwardProxy 出站拉取（复用内核既有
   出站通道，移动端同架构可用）；断网/失败静默降级（本地优先不受影响），Key 仅存
   本地偏好、不入库不入导出。
   与思阅按「载体归属」互斥：微信读书时长只写入用户绑定的专用项目（itemId），
   思源内文档阅读归思阅——不同项目天然不重叠，无需时间窗互斥。
   纪律：零依赖、无时钟（unix 日期换算与今天由调用方注入）、fail-closed 少记不多记。 */

export const WEREAD_GATEWAY_URL = "https://i.weread.qq.com/api/agent/gateway";
/** 官方 skill 包版本（每次请求必带；取官方仓库 skills/SKILL.md 顶部 version 字段，
    当前 1.0.4；网关经 upgrade_info 提示升级时由宿主上报用户，核对新版后再改此常量）。 */
export const WEREAD_SKILL_VERSION = "1.0.4";
/** 有界轮询：微信读书统计按日粒度更新，30 分钟足够；失败静默，不打扰本地使用。 */
export const WEREAD_INGEST_INTERVAL_MS = 1_800_000;
/** 官方 readdata.md：mode 默认 monthly（本月按日分桶）。月度桶足够每日打卡幂等；
    更早历史不经接口补拉（有界，宁少记）。 */
export const WEREAD_READDETAIL_MODE = "monthly";

export interface WereadIntegrationPreference {
    enabled: boolean;
    itemId: string;
    thresholdMinutes: number;
    apiKey: string;
}

export function normalizeWereadIntegration(source: unknown): WereadIntegrationPreference {
    const raw = (source && typeof source === "object" ? source : {}) as Record<string, unknown>;
    const itemId = typeof raw.itemId === "string" ? raw.itemId.trim().slice(0, 160) : "";
    const apiKey = typeof raw.apiKey === "string" ? raw.apiKey.trim().slice(0, 200) : "";
    const thresholdRaw = typeof raw.thresholdMinutes === "number" && Number.isFinite(raw.thresholdMinutes) ? raw.thresholdMinutes : 30;
    const thresholdMinutes = Math.min(1440, Math.max(1, Math.round(thresholdRaw)));
    /* enabled 要求三项齐备：拉取通道缺 Key 或缺绑定项目时治理面呈现为关闭。 */
    const enabled = raw.enabled === true && Boolean(itemId) && Boolean(apiKey);
    return {enabled, itemId, thresholdMinutes, apiKey};
}

/** 网关请求体：扁平信封（api_name + skill_version + 业务参数同层，官方 SKILL.md §请求格式）。
    mode=monthly 显式声明（官方 readdata.md 默认值），取本月按日分桶明细。 */
export function buildWereadReadDetailRequest(skillVersion: string = WEREAD_SKILL_VERSION): Record<string, unknown> {
    const version = typeof skillVersion === "string" && skillVersion.trim() ? skillVersion.trim().slice(0, 40) : WEREAD_SKILL_VERSION;
    return {api_name: "/readdata/detail", skill_version: version, mode: WEREAD_READDETAIL_MODE};
}

export interface WereadDailyReading {
    localDate: string;
    minutes: number;
}

export interface WereadGatewayOutcome {
    ok: boolean;
    /** errcode 非零时的可读信息（不含 Key，不含笔记内容）。 */
    message?: string;
    /** 官方升级提示原样上报（skill 文档要求见到即停并转达）。 */
    upgrade?: string;
    days: WereadDailyReading[];
}

const DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const UNIX_KEY_PATTERN = /^[0-9]+$/;
/** 单日上限 24h（秒）：readdata.md 明确周/月桶按天分桶，但防御其他 mode 下
    读到月/年大桶——一天阅读时长不可能超过 86400 秒，超限直接丢弃（fail-closed）。 */
const MAX_DAY_SECONDS = 86_400;

/** /readdata/detail 响应 → 每日阅读分钟（官方 readdata.md 契约优先）：
    - 信封：errcode 非零 → ok:false；upgrade_info.message 原样带出；data 包裹则解包；
    - 按日明细：`readTimes`（周/月模式按天分桶：key=分桶起始 unix 时间戳，value=秒）为主，
      `dailyReadTimes`（年度模式日明细，key=日期 unix 时间戳）合并；key 亦兼容
      "YYYY-MM-DD" 字符串；数组行形式作为容错兜底；
    - 单位秒向下取整为分钟，单日超 24h 丢弃，未来行（相对注入的 today）丢弃，
      至多保留 62 行。unix 时间戳换算 localDate 由调用方注入（无隐式时钟）。 */
export function ingestWereadReadDetail(
    payload: unknown,
    options: {toLocalDateFromUnix?: (seconds: number) => string; today?: string} = {},
): WereadGatewayOutcome {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return {ok: false, message: "unexpected gateway payload", days: []};
    }
    const root = payload as Record<string, unknown>;
    const errcode = typeof root.errcode === "number" ? root.errcode : undefined;
    if (errcode !== undefined && errcode !== 0) {
        const errmsg = typeof root.errmsg === "string" ? ` ${root.errmsg}`.slice(0, 200) : "";
        return {ok: false, message: `errcode ${errcode}${errmsg}`, days: []};
    }
    const upgradeInfo = root.upgrade_info;
    const upgrade = upgradeInfo && typeof upgradeInfo === "object" && typeof (upgradeInfo as Record<string, unknown>).message === "string"
        ? (upgradeInfo as {message: string}).message.slice(0, 300)
        : undefined;
    const body = root.data && typeof root.data === "object" && !Array.isArray(root.data) ? root.data as Record<string, unknown> : root;
    const byDate = new Map<string, number>();
    const accept = (localDate: string, seconds: unknown): void => {
        if (!DATE_PATTERN.test(localDate)) return;
        if (options.today && DATE_PATTERN.test(options.today) && localDate > options.today) return;
        if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0 || seconds > MAX_DAY_SECONDS) return;
        const minutes = Math.floor(seconds / 60);
        if (minutes <= 0) return;
        byDate.set(localDate, Math.max(byDate.get(localDate) || 0, minutes));
    };
    const resolveKey = (key: string): string => {
        const trimmed = key.trim();
        if (DATE_PATTERN.test(trimmed)) return trimmed;
        if (UNIX_KEY_PATTERN.test(trimmed) && options.toLocalDateFromUnix) return options.toLocalDateFromUnix(Number(trimmed));
        return "";
    };
    /* 官方两处按日明细：readTimes（月/周模式日桶）+ dailyReadTimes（年度模式日明细）。 */
    for (const field of ["readTimes", "dailyReadTimes"] as const) {
        const raw = body[field];
        if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            for (const [key, seconds] of Object.entries(raw as Record<string, unknown>)) {
                const localDate = resolveKey(key);
                if (localDate) accept(localDate, seconds);
            }
        } else if (Array.isArray(raw)) {
            for (const row of raw) {
                if (!row || typeof row !== "object") continue;
                const entry = row as Record<string, unknown>;
                const dateValue = entry.readDate ?? entry.date ?? entry.day;
                if (typeof dateValue === "string") accept(dateValue.trim(), entry.readTime ?? entry.time ?? entry.duration ?? entry.value);
                else if (typeof dateValue === "number" && Number.isFinite(dateValue) && options.toLocalDateFromUnix) {
                    accept(options.toLocalDateFromUnix(dateValue), entry.readTime ?? entry.time ?? entry.duration ?? entry.value);
                }
            }
        }
    }
    const days = [...byDate.entries()]
        .sort((left, right) => left[0].localeCompare(right[0]))
        .slice(-62)
        .map(([localDate, minutes]) => ({localDate, minutes}));
    return {ok: true, ...(upgrade ? {upgrade} : {}), days};
}

/** 写入身份：`weread:<itemId>:<localDate>`（每日一次，幂等键；与注册表格式一致）。 */
export function buildWereadExternalRef(itemId: string, localDate: string): string {
    const safeItem = typeof itemId === "string" ? itemId.trim().slice(0, 160) : "";
    return safeItem && DATE_PATTERN.test(localDate) ? `weread:${safeItem}:${localDate}` : "";
}
