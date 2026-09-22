/** SiYuan v3.8.4 desktop dock compatibility adapter.
 * Verified against app/src/layout/dock/index.ts (toggleModel(type, show)) and
 * layout/tabUtil.ts. This is a guarded host UI integration, not a chat API.
 * Do not access the composer/session internals or send the copied prompt.
 */
interface AgentDock {
    data?: Record<string, unknown>;
    toggleModel?: (type: string, show: boolean) => void;
}
export function openSiYuanAgent(host: unknown = window, doc: Document = document): boolean {
    const layout = (host as {siyuan?: {layout?: Record<string, AgentDock>}})?.siyuan?.layout;
    if (!layout) return false;
    for (const position of ["leftDock", "rightDock", "bottomDock"]) {
        const dock = layout[position];
        if (!dock?.data?.agentChat || typeof dock.toggleModel !== "function") continue;
        try {
            // Explicit show=true is idempotent, even if the panel is already open.
            dock.toggleModel("agentChat", true);
            const panel = doc.querySelector<HTMLElement>(".sy__agentChat");
            if (!panel?.isConnected || !panel.getClientRects().length) return false;
            const bounds = panel.getBoundingClientRect();
            return bounds.width > 0 && bounds.height > 0;
        } catch { return false; }
    }
    return false;
}
