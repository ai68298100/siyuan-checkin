import {t} from "../i18n";

export const AVATAR_UPLOAD_BYTES = 10 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 256;
export const AVATAR_DATA_URL_LIMIT = 1_000_000;

export interface AvatarCropState {zoom: number; centerX: number; centerY: number}

/** Work in source-image coordinates: resizing the dialog never changes the crop. */
export function getAvatarCrop(width: number, height: number, state: AvatarCropState): {x: number; y: number; size: number} {
    const zoom = Math.max(1, Math.min(4, Number.isFinite(state.zoom) ? state.zoom : 1));
    const size = Math.min(width, height) / zoom;
    const cx = Number.isFinite(state.centerX) ? state.centerX : 0.5;
    const cy = Number.isFinite(state.centerY) ? state.centerY : 0.5;
    return {x: Math.max(0, Math.min(width - size, cx * width - size / 2)), y: Math.max(0, Math.min(height - size, cy * height - size / 2)), size};
}

/** Only the explicit save action writes data. Closing, failed decoding and cancellation are read-only. */
export function openAvatarEditor(source: File | string, themeRoot: HTMLElement, save: (image: string) => Promise<void>): () => void {
    const doc = themeRoot.ownerDocument;
    const win = doc.defaultView!;
    const previousFocus = doc.activeElement as HTMLElement | null;
    const dialog = doc.createElement("dialog");
    dialog.className = "lc-checkin lc-checkin__avatar-editor";
    dialog.setAttribute("aria-label", t("set.avatarEditorTitle"));
    dialog.innerHTML = `<h2>${t("set.avatarEditorTitle")}</h2>
        <p>${t("set.avatarEditorHint")}</p>
        <canvas data-avatar-crop width="${AVATAR_OUTPUT_SIZE}" height="${AVATAR_OUTPUT_SIZE}" tabindex="0" role="img" aria-label="${t("set.avatarEditorCanvas")}"></canvas>
        <div class="lc-checkin__avatar-editor-tools">
            <label>${t("set.avatarEditorZoom")} <output data-avatar-zoom-value>100%</output><input data-avatar-zoom type="range" min="1" max="4" step="0.01" value="1" disabled /></label>
            <canvas data-avatar-preview width="64" height="64" role="img" aria-label="${t("set.avatarEditorPreview")}"></canvas>
        </div>
        <p data-avatar-status role="status" aria-live="polite">${t("set.avatarEditorLoading")}</p>
        <div class="lc-checkin__avatar-editor-actions"><button class="lc-checkin__text-button" type="button" data-avatar-reset disabled>${t("set.avatarEditorReset")}</button><button class="lc-checkin__text-button" type="button" data-avatar-cancel>${t("set.avatarEditorCancel")}</button><button class="lc-checkin__primary-button" type="button" data-avatar-save disabled>${t("set.avatarEditorSave")}</button></div>`;
    const computed = win.getComputedStyle(themeRoot);
    for (let index = 0; index < computed.length; index++) {
        const property = computed.item(index);
        if (property.startsWith("--lc-checkin-")) dialog.style.setProperty(property, computed.getPropertyValue(property));
    }
    const canvas = dialog.querySelector<HTMLCanvasElement>("[data-avatar-crop]")!;
    const preview = dialog.querySelector<HTMLCanvasElement>("[data-avatar-preview]")!;
    const slider = dialog.querySelector<HTMLInputElement>("[data-avatar-zoom]")!;
    const zoomValue = dialog.querySelector<HTMLOutputElement>("[data-avatar-zoom-value]")!;
    const status = dialog.querySelector<HTMLElement>("[data-avatar-status]")!;
    const reset = dialog.querySelector<HTMLButtonElement>("[data-avatar-reset]")!;
    const confirm = dialog.querySelector<HTMLButtonElement>("[data-avatar-save]")!;
    const cancel = dialog.querySelector<HTMLButtonElement>("[data-avatar-cancel]")!;
    const image = doc.createElement("img");
    let objectUrl: string | undefined;
    let closed = false;
    let ready = false;
    let saving = false;
    let pointer: {id: number; x: number; y: number} | undefined;
    let state: AvatarCropState = {zoom: 1, centerX: 0.5, centerY: 0.5};
    const close = () => {
        if (closed) return;
        closed = true;
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        dialog.close();
        dialog.remove();
        if (previousFocus?.isConnected) previousFocus.focus();
    };
    const paint = () => {
        const crop = getAvatarCrop(image.naturalWidth, image.naturalHeight, state);
        state.centerX = (crop.x + crop.size / 2) / image.naturalWidth;
        state.centerY = (crop.y + crop.size / 2) / image.naturalHeight;
        for (const target of [canvas, preview]) {
            const ctx = target.getContext("2d");
            if (!ctx) throw new Error("canvas-unavailable");
            ctx.clearRect(0, 0, target.width, target.height);
            ctx.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, target.width, target.height);
        }
        slider.value = String(state.zoom);
        zoomValue.value = `${Math.round(state.zoom * 100)}%`;
    };
    slider.addEventListener("input", () => {if (ready && !saving) {state.zoom = Number(slider.value); paint();}});
    reset.addEventListener("click", () => {if (ready && !saving) {state = {zoom: 1, centerX: 0.5, centerY: 0.5}; paint();}});
    canvas.addEventListener("pointerdown", (event) => {
        if (!ready || saving || event.button !== 0) return;
        pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
        canvas.setPointerCapture(event.pointerId);
        canvas.focus();
        event.preventDefault();
    });
    canvas.addEventListener("pointermove", (event) => {
        if (!pointer || pointer.id !== event.pointerId || saving) return;
        const crop = getAvatarCrop(image.naturalWidth, image.naturalHeight, state);
        const rect = canvas.getBoundingClientRect();
        state.centerX -= (event.clientX - pointer.x) * crop.size / rect.width / image.naturalWidth;
        state.centerY -= (event.clientY - pointer.y) * crop.size / rect.height / image.naturalHeight;
        pointer.x = event.clientX; pointer.y = event.clientY;
        paint();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(type, () => {pointer = undefined;});
    canvas.addEventListener("keydown", (event) => {
        if (!ready || saving) return;
        const step = getAvatarCrop(image.naturalWidth, image.naturalHeight, state).size * (event.shiftKey ? 0.1 : 0.02);
        if (event.key === "ArrowLeft") state.centerX += step / image.naturalWidth;
        else if (event.key === "ArrowRight") state.centerX -= step / image.naturalWidth;
        else if (event.key === "ArrowUp") state.centerY += step / image.naturalHeight;
        else if (event.key === "ArrowDown") state.centerY -= step / image.naturalHeight;
        else return;
        event.preventDefault();
        paint();
    });
    cancel.addEventListener("click", () => {if (!saving) close();});
    dialog.addEventListener("cancel", (event) => {event.preventDefault(); if (!saving) close();});
    dialog.addEventListener("close", close);
    confirm.addEventListener("click", async () => {
        if (!ready || saving) return;
        saving = true;
        for (const control of [confirm, cancel, reset, slider]) control.disabled = true;
        status.textContent = t("set.avatarEditorSaving");
        try {
            const dataUrl = canvas.toDataURL("image/png");
            if (!dataUrl.startsWith("data:image/png;base64,") || dataUrl.length > AVATAR_DATA_URL_LIMIT) throw new Error("avatar-encode-failed");
            await save(dataUrl);
            close();
        } catch {
            if (!closed) status.textContent = t("set.avatarEditorSaveFailed");
        } finally {
            saving = false;
            if (!closed) for (const control of [confirm, cancel, reset, slider]) control.disabled = false;
        }
    });
    doc.body.appendChild(dialog);
    dialog.showModal();
    void (async () => {
        try {
            if (typeof source === "string") image.src = source;
            else {
                if (source.size > AVATAR_UPLOAD_BYTES) {status.textContent = t("set.avatarTooLarge"); return;}
                if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(source.type)) throw new Error("unsupported-avatar-type");
                objectUrl = URL.createObjectURL(source);
                image.src = objectUrl;
            }
            await image.decode();
            if (closed) return;
            if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error("invalid-avatar-dimensions");
            paint();
            ready = true;
            for (const control of [confirm, reset, slider]) control.disabled = false;
            status.textContent = "";
            canvas.focus();
        } catch {
            if (!closed) status.textContent = t("set.avatarEditorLoadFailed");
        }
    })();
    return close;
}
