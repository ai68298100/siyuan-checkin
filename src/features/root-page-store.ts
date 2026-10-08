/* T-1621 步骤一：多 root 独立页面存储（docs/multi-root-page-design-2026-09-30.md）。
   纯模块零宿主依赖——dock/页签/快速弹窗各自持有独立 RootContext，互不覆盖；
   宿主 currentPage 以「最后活跃 root」为读写代理（读=最后活跃页，写=全局同步
   全部 root，与既有单字段行为兼容）。 */
export type CheckinPageId = "today" | "editor" | "review" | "archived" | "insights" | "occasions" | "settings";

export interface RootPageContext {
    page: CheckinPageId;
    /* 契约 1 其余字段（returnTo/date/range 等）按设计稿步骤二渐进迁入。 */
}

export interface RootPageStore {
    /** 注册并返回 root 上下文（不存在则继承孤儿页创建——启动参数写入早于首个 root 注册）。 */
    ensure(root: HTMLElement): RootPageContext;
    /** 只读：root 当前页（未注册回落孤儿页，不创建条目）。 */
    pageOf(root: HTMLElement): CheckinPageId;
    /** 导航落点：显式 root 只改该表面并标记为最后活跃；无 root 的全局导航同步全部表面与孤儿页。 */
    navigate(root: HTMLElement | undefined, page: CheckinPageId): void;
    /** 宿主 currentPage 代理读：最后活跃 root 的页面；无任何活跃 root 时为孤儿页。 */
    activePage(): CheckinPageId;
    lastActiveRoot(): HTMLElement | null;
    setActiveRoot(root: HTMLElement | null): void;
    /** root 销毁（弹窗关闭/页签与 dock 卸载）释放上下文；释放最后活跃 root 后由调用方指定回落。 */
    release(root: HTMLElement): void;
    /** 仅测试与守门使用：当前已注册 root 数。 */
    size(): number;
}

export function createRootPageStore(): RootPageStore {
    const contexts = new Map<HTMLElement, RootPageContext>();
    const orphan: RootPageContext = {page: "today"};
    let lastActive: HTMLElement | null = null;
    const activeContext = (): RootPageContext => (lastActive ? contexts.get(lastActive) : undefined) ?? orphan;
    return {
        ensure(root) {
            let context = contexts.get(root);
            if (!context) {
                context = {page: orphan.page};
                contexts.set(root, context);
            }
            return context;
        },
        pageOf(root) {
            return contexts.get(root)?.page ?? orphan.page;
        },
        navigate(root, page) {
            if (root) {
                this.ensure(root).page = page;
                lastActive = root;
                return;
            }
            for (const context of contexts.values()) context.page = page;
            orphan.page = page;
        },
        activePage() {
            return activeContext().page;
        },
        lastActiveRoot() {
            return lastActive;
        },
        setActiveRoot(root) {
            lastActive = root;
        },
        release(root) {
            contexts.delete(root);
            if (lastActive === root) lastActive = null;
        },
        size() {
            return contexts.size;
        },
    };
}
