import {t} from "../i18n";
import {showMessage} from "siyuan";

type ActionLock = {
    buttons: Set<HTMLElement>;
    boundaries: Set<HTMLElement>;
    controls: Map<HTMLButtonElement, boolean>;
};

const activeActionKeys = new Map<string, ActionLock>();

function attachActionSurface(lock: ActionLock, button: HTMLElement, boundary: HTMLElement | null, controlsSelector: string): void {
    lock.buttons.add(button);
    button.dataset.actionBusy = "true";
    button.setAttribute("aria-busy", "true");
    if (boundary) {
        lock.boundaries.add(boundary);
        boundary.dataset.actionBusy = "true";
        boundary.setAttribute("aria-busy", "true");
    }
    const controls = boundary
        ? [...boundary.querySelectorAll<HTMLButtonElement>(controlsSelector)]
        : [button as HTMLButtonElement];
    if (!controls.includes(button as HTMLButtonElement)) controls.unshift(button as HTMLButtonElement);
    controls.forEach((control) => {
        if (!lock.controls.has(control)) lock.controls.set(control, control.disabled);
        control.disabled = true;
    });
}

export function runExclusiveAction(
    button: HTMLElement | null,
    operation: () => Promise<unknown> | unknown,
    scope?: HTMLElement | null,
    controlsSelector = "button",
    key?: string,
): void {
    if (!button || (button as HTMLButtonElement).disabled || button.dataset.actionBusy === "true") return;
    const toolbar = scope ? null : button.closest<HTMLElement>("[data-bulk-toolbar]");
    const boundary = scope || toolbar;
    const resolvedKey = key || (boundary?.dataset.itemId ? `item:${boundary.dataset.itemId}` : boundary?.dataset.occasionId ? `occasion:${boundary.dataset.occasionId}` : button.dataset.itemId ? `item:${button.dataset.itemId}` : button.dataset.occasionId ? `occasion:${button.dataset.occasionId}` : undefined);
    const existingLock = resolvedKey ? activeActionKeys.get(resolvedKey) : undefined;
    if (existingLock) {
        attachActionSurface(existingLock, button, boundary, controlsSelector);
        return;
    }
    if (boundary?.dataset.actionBusy === "true") return;
    const lock: ActionLock = {buttons: new Set(), boundaries: new Set(), controls: new Map()};
    attachActionSurface(lock, button, boundary, controlsSelector);
    if (resolvedKey) activeActionKeys.set(resolvedKey, lock);
    let result: Promise<unknown> | unknown;
    try {
        result = operation();
    } catch {
        showMessage(t("msg.saveFailedShort"));
        result = undefined;
    }
    void Promise.resolve(result).catch(() => {
        showMessage(t("msg.saveFailedShort"));
    }).finally(() => {
        for (const activeButton of lock.buttons) {
            delete activeButton.dataset.actionBusy;
            activeButton.removeAttribute("aria-busy");
        }
        for (const activeBoundary of lock.boundaries) {
            delete activeBoundary.dataset.actionBusy;
            activeBoundary.removeAttribute("aria-busy");
        }
        if (resolvedKey && activeActionKeys.get(resolvedKey) === lock) activeActionKeys.delete(resolvedKey);
        for (const [control, disabled] of lock.controls) if (control.isConnected) control.disabled = disabled;
    });
}
