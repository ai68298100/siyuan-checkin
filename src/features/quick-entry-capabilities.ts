/* T-1423 · R-A12 快捷入口能力矩阵——显示/执行/图标/能力四者分离的纯函数面。
   纪律（docs/implementation-roadmap-product-strategy-2026-09.md §R-10.4/R-A12）：
   - 每个入口建模为描述符：commandId、langKey、图标、hotkey、可执行 surface、
     移动安全等级、执行器键；「关闭某 surface 的展示只改变显示，不删除执行器」
     ——可见性状态独立存储，恢复配置只是从隐藏集移除，不触碰注册表；
   - 未知第三方入口的移动安全等级一律 unverified，绝不默认 mobile-safe；
     unverified 入口仍保留可执行判定（显示降级说明，不剥夺执行能力）；
   - 图标解析与 fallback 独立成纯函数：未知图标名回落 fallback，不抛错、
     不猜近形；已知图标集由调用方注入（本模块零依赖、无时钟、无宿主）；
   - 消费方：index.ts onload 的命令注册（描述符驱动，langKey 与 dist i18n
     契约不变）；surface 级展示过滤与隐藏管理 UI 待截图门解除后接入。 */

export type QuickSurface = "desktop" | "tab" | "dock" | "mobile";
/** mobile-safe=触控/窄宽已验证；desktop-only=依赖桌面宿主能力；unverified=第三方/未验证，不默认安全。 */
export type QuickMobility = "mobile-safe" | "desktop-only" | "unverified";

export interface QuickEntryDescriptor {
    commandId: string;
    /** 思源命令 langKey；dist i18n 契约键，不得新增或改名。 */
    langKey: string;
    icon: string;
    hotkey?: string;
    /** 可执行 surface 集（注册与执行的资格面）。 */
    surfaces: readonly QuickSurface[];
    mobility: QuickMobility;
    /** 执行器键——宿主持有 键→回调 映射；本模块不承载任何闭包。 */
    executor: string;
    /** 是否注册全局回调（宿主级快捷面板可见）。 */
    globalCallback: boolean;
    /** 依赖能力键（如 "custom-tab"）；由运行时能力表裁决。 */
    capabilities?: readonly string[];
}

/** 运行时事实：宿主在注册/查询时给出，本模块不探测宿主。 */
export interface QuickEntryRuntime {
    availableSurfaces: readonly QuickSurface[];
    capabilities: readonly string[];
    /** 用户隐藏的 commandId 集（仅影响展示，不影响执行资格）。 */
    hidden: readonly string[];
}

export interface QuickEntryEvaluation {
    commandId: string;
    /** surface 交集非空。 */
    surfaceSupported: boolean;
    capabilitiesMet: boolean;
    /** 执行资格：surface + 能力。与用户隐藏、移动安全正交（显示/执行分离）。 */
    executable: boolean;
    /** 展示资格：可执行 且 未被用户隐藏。 */
    displayable: boolean;
    /** 该入口在本运行时是否可注册（宿主 addCommand 的准入判定）。 */
    registrable: boolean;
    mobility: QuickMobility;
    unverified: boolean;
    hiddenByUser: boolean;
}

/** 未知图标名的回落图标（quick-entry 语境下的中性「更多」图标）。 */
export const QUICK_ENTRY_FALLBACK_ICON = "more";

/** 图标解析：命中已知集原样返回；未知（第三方/拼写）回落 fallback 并标记
    iconResolved=false——展示层可据此呈现「未验证」角标，执行能力不受影响。 */
export function resolveQuickEntryIcon(icon: string, knownIcons: readonly string[]): {name: string; resolved: boolean} {
    return knownIcons.includes(icon) ? {name: icon, resolved: true} : {name: QUICK_ENTRY_FALLBACK_ICON, resolved: false};
}

/** 单入口评估。纯函数：同一描述符与运行时得到同一结论。 */
export function evaluateQuickEntry(descriptor: QuickEntryDescriptor, runtime: QuickEntryRuntime): QuickEntryEvaluation {
    const surfaceSupported = descriptor.surfaces.some((surface) => runtime.availableSurfaces.includes(surface));
    const capabilitiesMet = (descriptor.capabilities ?? []).every((capability) => runtime.capabilities.includes(capability));
    const executable = surfaceSupported && capabilitiesMet;
    const hiddenByUser = runtime.hidden.includes(descriptor.commandId);
    return {
        commandId: descriptor.commandId,
        surfaceSupported,
        capabilitiesMet,
        executable,
        displayable: executable && !hiddenByUser,
        registrable: executable,
        mobility: descriptor.mobility,
        unverified: descriptor.mobility === "unverified",
        hiddenByUser,
    };
}

/** 展示过滤：确定性排序（title→commandId 语义由调用方补充；此处按 commandId 稳定序），
    分为可见/隐藏/不可执行三段。不可执行项不进入展示列表，但绝不从注册表删除。 */
export function filterQuickEntriesForDisplay(descriptors: readonly QuickEntryDescriptor[], runtime: QuickEntryRuntime): {
    visible: readonly QuickEntryDescriptor[];
    hiddenByUser: readonly QuickEntryDescriptor[];
    notExecutable: readonly QuickEntryDescriptor[];
} {
    const visible: QuickEntryDescriptor[] = [];
    const hiddenByUser: QuickEntryDescriptor[] = [];
    const notExecutable: QuickEntryDescriptor[] = [];
    for (const descriptor of [...descriptors].sort((left, right) => left.commandId.localeCompare(right.commandId))) {
        const evaluation = evaluateQuickEntry(descriptor, runtime);
        if (!evaluation.executable) notExecutable.push(descriptor);
        else if (evaluation.hiddenByUser) hiddenByUser.push(descriptor);
        else visible.push(descriptor);
    }
    return {visible, hiddenByUser, notExecutable};
}

/** 移动端可执行判定：unverified 绝不默认安全；desktop-only 明确排除。 */
export function isMobileExecutable(descriptor: QuickEntryDescriptor): boolean {
    return descriptor.mobility === "mobile-safe" && descriptor.surfaces.includes("mobile");
}

/** 恢复配置：从隐藏集移除一个 commandId，返回新集（不改写入参）。 */
export function restoreQuickEntryVisibility(hidden: readonly string[], commandId: string): readonly string[] {
    return hidden.filter((id) => id !== commandId);
}

/** 本插件自有入口描述符（单一事实源；langKey 与 dist i18n 契约键一致，
    由 release-assets 守门）。新入口在此登记，executor 由宿主映射到回调。 */
export const QUICK_ENTRY_DESCRIPTORS: readonly QuickEntryDescriptor[] = [
    {
        commandId: "openCheckin",
        langKey: "openCheckin",
        icon: "check",
        hotkey: "⌥⇧C",
        surfaces: ["desktop", "tab", "dock", "mobile"],
        mobility: "mobile-safe",
        executor: "quick-dialog",
        globalCallback: true,
    },
    {
        commandId: "openCheckinTab",
        langKey: "openCheckinTab",
        icon: "external",
        surfaces: ["desktop"],
        mobility: "desktop-only",
        executor: "open-tab",
        globalCallback: true,
    },
];
